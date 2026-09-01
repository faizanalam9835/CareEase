const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const config = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { sendMail, sendMailAsync } = require('../utils/mailer');
const templates = require('../utils/emailTemplates');
const { generateTemporaryPassword } = require('../utils/generateToken');
const { logActivity } = require('../utils/activityLog');

/** Tenant ids look like TA1B2C3D - short, readable and easy to type at sign-in. */
const buildTenantId = () => `T${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/** POST /api/hospitals/register */
const registerHospital = asyncHandler(async (req, res) => {
  const { name, address, city, state, contactNumber, adminEmail, licenseNumber, website, bedCapacity } =
    req.body;

  if (!name || !address || !contactNumber || !adminEmail || !licenseNumber) {
    throw ApiError.badRequest(
      'Hospital name, address, contact number, administrator e-mail and licence number are required'
    );
  }

  const email = String(adminEmail).toLowerCase().trim();
  const licence = String(licenseNumber).trim();

  const existing = await Hospital.findOne({
    $or: [{ licenseNumber: licence }, { adminEmail: email }]
  });
  if (existing) {
    throw ApiError.conflict(
      existing.adminEmail === email
        ? 'A hospital is already registered with this administrator e-mail'
        : 'A hospital is already registered with this licence number'
    );
  }

  // A tenant id collision is astronomically unlikely, but retrying costs nothing.
  let tenantId = buildTenantId();
  // eslint-disable-next-line no-await-in-loop
  while (await Hospital.exists({ tenantId })) tenantId = buildTenantId();

  const verificationToken = uuidv4();
  const hospital = await Hospital.create({
    name,
    address,
    city,
    state,
    contactNumber,
    adminEmail: email,
    licenseNumber: licence,
    website,
    bedCapacity: bedCapacity || 50,
    tenantId,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'PENDING'
  });

  const verificationLink = `${config.clientUrl}/verify/${verificationToken}`;

  // Responding first keeps registration instant even when SMTP is slow.
  res.status(201).json({
    success: true,
    message: 'Hospital registered. Check your inbox to verify and activate the workspace.',
    tenantId,
    hospitalId: hospital._id,
    status: hospital.status,
    // Surfaced so the demo can be completed without a working mailbox.
    verificationToken,
    verificationLink
  });

  const mail = templates.hospitalVerification({
    hospitalName: name,
    tenantId,
    verificationLink,
    token: verificationToken
  });
  sendMailAsync({ to: email, ...mail });
});

/**
 * GET /api/hospitals/verify/:token
 *
 * Activates the workspace and creates the first administrator. Re-running it
 * for an already-verified hospital is a no-op rather than a 500 - the old code
 * threw a duplicate-key error if the link was opened twice.
 */
const verifyHospital = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const hospital = await Hospital.findOne({ verificationToken: token }).select(
    '+verificationToken +verificationTokenExpiry'
  );

  if (!hospital) {
    const alreadyActive = await Hospital.findOne({ status: 'ACTIVE', verifiedAt: { $ne: null } })
      .sort({ verifiedAt: -1 })
      .limit(1);
    throw ApiError.badRequest(
      alreadyActive
        ? 'This verification link has already been used. Try signing in instead.'
        : 'This verification link is not valid.'
    );
  }

  if (hospital.verificationTokenExpiry && hospital.verificationTokenExpiry < new Date()) {
    throw ApiError.badRequest('This verification link has expired. Please register again.');
  }

  const existingAdmin = await User.findOne({
    tenantId: hospital.tenantId,
    email: hospital.adminEmail
  });

  let temporaryPassword = null;
  let adminUser = existingAdmin;

  if (!existingAdmin) {
    temporaryPassword = generateTemporaryPassword();
    adminUser = await User.create({
      firstName: 'Hospital',
      lastName: 'Administrator',
      email: hospital.adminEmail,
      professionalEmail: hospital.adminEmail,
      phone: hospital.contactNumber,
      password: temporaryPassword,
      department: 'Administration',
      designation: 'Administrator',
      roles: ['HOSPITAL_ADMIN'],
      tenantId: hospital.tenantId,
      status: 'ACTIVE',
      mustChangePassword: true
    });
  }

  hospital.status = 'ACTIVE';
  hospital.verifiedAt = hospital.verifiedAt || new Date();
  hospital.verificationToken = undefined;
  hospital.verificationTokenExpiry = undefined;
  await hospital.save();

  if (temporaryPassword) {
    const mail = templates.hospitalActivated({
      hospitalName: hospital.name,
      tenantId: hospital.tenantId,
      adminEmail: hospital.adminEmail,
      temporaryPassword
    });
    await sendMail({ to: hospital.adminEmail, ...mail });
  }

  res.json({
    success: true,
    message: 'Hospital verified. Your administrator account is ready.',
    hospital: {
      id: hospital._id,
      name: hospital.name,
      tenantId: hospital.tenantId,
      status: hospital.status
    },
    adminUser: {
      id: adminUser._id,
      email: adminUser.email,
      roles: adminUser.roles,
      // Only present the first time; afterwards the admin must use their own password.
      temporaryPassword
    }
  });
});

/** GET /api/hospitals/me - profile of the signed-in user's own hospital. */
const getMyHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  if (!hospital) throw ApiError.notFound('Hospital profile not found');

  const [staffCount, patientCount, appointmentCount] = await Promise.all([
    User.countDocuments({ tenantId: req.user.tenantId }),
    Patient.countDocuments({ tenantId: req.user.tenantId }),
    Appointment.countDocuments({ tenantId: req.user.tenantId })
  ]);

  res.json({
    success: true,
    hospital,
    summary: { staffCount, patientCount, appointmentCount }
  });
});

/** PUT /api/hospitals/me - admin edits the hospital profile. */
const updateMyHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  if (!hospital) throw ApiError.notFound('Hospital profile not found');

  const editable = ['name', 'address', 'city', 'state', 'contactNumber', 'website', 'bedCapacity'];
  for (const field of editable) {
    if (req.body[field] !== undefined) hospital[field] = req.body[field];
  }
  await hospital.save();

  logActivity({
    user: req.user,
    action: 'HOSPITAL_UPDATED',
    entityType: 'HOSPITAL',
    entityId: hospital._id,
    description: `Hospital profile updated`
  });

  res.json({ success: true, message: 'Hospital profile updated', hospital });
});

/** GET /api/hospitals/check-license/:licenseNumber - live availability check for the signup form. */
const checkLicense = asyncHandler(async (req, res) => {
  const taken = await Hospital.exists({ licenseNumber: String(req.params.licenseNumber).trim() });
  res.json({ success: true, available: !taken });
});

module.exports = {
  registerHospital,
  verifyHospital,
  getMyHospital,
  updateMyHospital,
  checkLicense
};
