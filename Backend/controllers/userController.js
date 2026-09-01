const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Appointment = require('../models/Appointment');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { generateTemporaryPassword, isStrongPassword, PASSWORD_POLICY } = require('../utils/generateToken');
const { sendMailAsync } = require('../utils/mailer');
const templates = require('../utils/emailTemplates');
const { logActivity } = require('../utils/activityLog');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { ROLES, DEPARTMENTS } = require('../config/constants');

/** POST /api/users - hospital admin creates a staff account. */
const createUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    professionalEmail,
    phone,
    password,
    department,
    designation,
    specialization,
    consultationFee,
    roles
  } = req.body;

  if (!firstName || !lastName || !email || !phone || !department || !roles?.length) {
    throw ApiError.badRequest(
      'First name, last name, e-mail, phone, department and at least one role are required'
    );
  }

  const roleList = Array.isArray(roles) ? roles : [roles];
  const invalidRole = roleList.find((role) => !ROLES.includes(role));
  if (invalidRole) throw ApiError.badRequest(`"${invalidRole}" is not a valid role`);
  if (!DEPARTMENTS.includes(department)) {
    throw ApiError.badRequest(`"${department}" is not a valid department`);
  }

  const normalisedEmail = String(email).toLowerCase().trim();

  // The original code queried for a duplicate and then ignored the result,
  // so the request died later with a raw Mongo E11000 error.
  const duplicate = await User.findOne({ email: normalisedEmail, tenantId: req.user.tenantId });
  if (duplicate) {
    throw ApiError.conflict('Someone at this hospital already uses that e-mail address');
  }

  if (password && !isStrongPassword(password)) {
    throw ApiError.badRequest(PASSWORD_POLICY);
  }

  const temporaryPassword = password || generateTemporaryPassword();

  const user = await User.create({
    firstName,
    lastName,
    email: normalisedEmail,
    professionalEmail: professionalEmail ? String(professionalEmail).toLowerCase().trim() : normalisedEmail,
    phone,
    password: temporaryPassword,
    department,
    designation,
    specialization,
    consultationFee: roleList.includes('DOCTOR') ? consultationFee ?? 500 : 0,
    roles: roleList,
    tenantId: req.user.tenantId,
    status: 'ACTIVE',
    // Generated passwords must be replaced; an admin-chosen one need not be.
    mustChangePassword: !password
  });

  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  const mail = templates.staffWelcome({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    department: user.department,
    roles: user.roles,
    hospitalName: hospital?.name || 'CareEase Hospital',
    tenantId: user.tenantId,
    temporaryPassword
  });
  sendMailAsync({ to: user.professionalEmail || user.email, ...mail });

  logActivity({
    user: req.user,
    action: 'USER_CREATED',
    entityType: 'USER',
    entityId: user._id,
    description: `Created ${roleList.join(', ')} account for ${user.firstName} ${user.lastName}`
  });

  res.status(201).json({
    success: true,
    message: 'Staff account created. Sign-in details have been e-mailed.',
    user,
    // Shown once in the UI so the admin can pass it on if e-mail is not configured.
    temporaryPassword: password ? undefined : temporaryPassword
  });
});

/** GET /api/users - staff directory for the caller's hospital. */
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, department, status } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { firstName: pattern },
      { lastName: pattern },
      { email: pattern },
      { phone: pattern },
      { specialization: pattern }
    ];
  }
  if (role) filter.roles = role;
  if (department) filter.department = department;
  if (status) filter.status = status;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    // `count` and `users` are kept for the existing frontend callers.
    count: users.length,
    users,
    meta: buildMeta(total, page, limit)
  });
});

/**
 * GET /api/users/doctors
 * Convenience list used by the appointment booking form - previously the client
 * downloaded every user and filtered by role in the browser.
 */
const getDoctors = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, roles: 'DOCTOR', status: 'ACTIVE' };
  if (req.query.department) filter.department = req.query.department;

  const doctors = await User.find(filter)
    .select('firstName lastName department specialization designation consultationFee availableDays availableFrom availableTo email phone')
    .sort({ firstName: 1 });

  res.json({ success: true, count: doctors.length, doctors });
});

/** GET /api/users/:id */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) throw ApiError.notFound('Staff member not found');

  let upcomingAppointments = 0;
  if (user.roles.includes('DOCTOR')) {
    upcomingAppointments = await Appointment.countDocuments({
      tenantId: req.user.tenantId,
      doctorId: user._id,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    });
  }

  res.json({ success: true, user, stats: { upcomingAppointments } });
});

/** PUT /api/users/:id */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) throw ApiError.notFound('Staff member not found');

  const {
    firstName, lastName, phone, professionalEmail, department, designation,
    specialization, consultationFee, roles, status, availableDays, availableFrom, availableTo
  } = req.body;

  const isSelf = String(user._id) === req.user.userId;

  // An admin must not be able to lock themselves out or drop their own admin role.
  if (isSelf && status && status !== 'ACTIVE') {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  if (isSelf && roles && !roles.includes('HOSPITAL_ADMIN')) {
    throw ApiError.badRequest('You cannot remove your own administrator role');
  }

  if (roles) {
    const roleList = Array.isArray(roles) ? roles : [roles];
    const invalid = roleList.find((role) => !ROLES.includes(role));
    if (invalid) throw ApiError.badRequest(`"${invalid}" is not a valid role`);

    // Never leave a hospital without an administrator.
    if (user.roles.includes('HOSPITAL_ADMIN') && !roleList.includes('HOSPITAL_ADMIN')) {
      const admins = await User.countDocuments({
        tenantId: req.user.tenantId,
        roles: 'HOSPITAL_ADMIN',
        status: 'ACTIVE'
      });
      if (admins <= 1) throw ApiError.badRequest('This is the last administrator account');
    }
    user.roles = roleList;
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (professionalEmail !== undefined) user.professionalEmail = professionalEmail;
  if (department) user.department = department;
  if (designation !== undefined) user.designation = designation;
  if (specialization !== undefined) user.specialization = specialization;
  if (consultationFee !== undefined) user.consultationFee = consultationFee;
  if (status) user.status = status;
  if (availableDays) user.availableDays = availableDays;
  if (availableFrom) user.availableFrom = availableFrom;
  if (availableTo) user.availableTo = availableTo;

  await user.save();

  logActivity({
    user: req.user,
    action: 'USER_UPDATED',
    entityType: 'USER',
    entityId: user._id,
    description: `Updated staff record for ${user.firstName} ${user.lastName}`
  });

  res.json({ success: true, message: 'Staff member updated', user });
});

/** POST /api/users/:id/reset-password */
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).select('+password');
  if (!user) throw ApiError.notFound('Staff member not found');

  const temporaryPassword = generateTemporaryPassword();
  user.password = temporaryPassword;
  user.mustChangePassword = true;
  await user.save();

  const mail = templates.passwordReset({
    firstName: user.firstName,
    temporaryPassword,
    tenantId: user.tenantId
  });
  sendMailAsync({ to: user.professionalEmail || user.email, ...mail });

  logActivity({
    user: req.user,
    action: 'PASSWORD_RESET',
    entityType: 'USER',
    entityId: user._id,
    description: `Reset password for ${user.firstName} ${user.lastName}`
  });

  res.json({
    success: true,
    message: 'Password reset. The new password has been e-mailed.',
    temporaryPassword
  });
});

/** DELETE /api/users/:id */
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.userId) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) throw ApiError.notFound('Staff member not found');

  if (user.roles.includes('HOSPITAL_ADMIN')) {
    const admins = await User.countDocuments({ tenantId: req.user.tenantId, roles: 'HOSPITAL_ADMIN' });
    if (admins <= 1) throw ApiError.badRequest('This is the last administrator account');
  }

  // A doctor with future appointments is deactivated rather than deleted, so
  // the appointment history keeps a valid reference.
  const upcoming = await Appointment.countDocuments({
    tenantId: req.user.tenantId,
    doctorId: user._id,
    appointmentDate: { $gte: new Date() },
    status: { $in: ['Scheduled', 'Confirmed', 'In Progress'] }
  });

  if (upcoming > 0) {
    user.status = 'INACTIVE';
    await user.save();
    return res.json({
      success: true,
      deactivated: true,
      message: `${user.firstName} has ${upcoming} upcoming appointment(s), so the account was deactivated instead of deleted.`
    });
  }

  await user.deleteOne();

  logActivity({
    user: req.user,
    action: 'USER_DELETED',
    entityType: 'USER',
    entityId: user._id,
    description: `Removed staff account for ${user.firstName} ${user.lastName}`
  });

  res.json({ success: true, message: 'Staff member removed' });
});

module.exports = {
  createUser,
  getAllUsers,
  getDoctors,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser
};
