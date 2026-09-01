const User = require('../models/User');
const Hospital = require('../models/Hospital');
const config = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/apiError');
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  isStrongPassword,
  PASSWORD_POLICY
} = require('../utils/generateToken');
const { logActivity } = require('../utils/activityLog');
const { DEMO_ACCOUNTS, DEMO_TENANT_ID } = require('../seed/demoAccounts');

const publicUser = (user, hospital) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: `${user.firstName} ${user.lastName}`.trim(),
  email: user.email,
  professionalEmail: user.professionalEmail,
  phone: user.phone,
  department: user.department,
  designation: user.designation,
  specialization: user.specialization,
  roles: user.roles,
  tenantId: user.tenantId,
  status: user.status,
  mustChangePassword: user.mustChangePassword,
  lastLoginAt: user.lastLoginAt,
  hospitalName: hospital?.name,
  createdAt: user.createdAt
});

/**
 * POST /api/auth/login
 *
 * Note this route is intentionally reachable without a tenant header: the
 * client has no way to prove a tenant before it holds a token. The hospital is
 * identified by the `tenantId` field in the body and verified against the user
 * record here.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, tenantId } = req.body;

  if (!email || !password || !tenantId) {
    throw ApiError.badRequest('E-mail, password and Hospital ID are all required');
  }

  const normalisedTenant = String(tenantId).trim().toUpperCase();

  // `password` is `select: false` on the schema, so ask for it explicitly.
  const user = await User.findOne({
    email: String(email).toLowerCase().trim(),
    tenantId: normalisedTenant
  }).select('+password');

  // One generic message for "no such user" and "wrong password" so the endpoint
  // cannot be used to enumerate which e-mail addresses exist.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect e-mail, password or Hospital ID');
  }

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      user.status === 'LOCKED'
        ? 'This account is locked. Please contact your administrator.'
        : 'This account is inactive. Please contact your administrator.'
    );
  }

  const hospital = await Hospital.findOne({ tenantId: user.tenantId });
  if (hospital && !['ACTIVE', 'VERIFIED'].includes(hospital.status)) {
    throw ApiError.forbidden('This hospital workspace is not active yet.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  logActivity({
    user: { ...publicUser(user), userId: user._id, tenantId: user.tenantId, roles: user.roles },
    action: 'USER_LOGIN',
    entityType: 'AUTH',
    entityId: user._id,
    description: `${user.firstName} ${user.lastName} signed in`
  });

  res.json({
    success: true,
    message: 'Signed in successfully',
    token: generateToken(user),
    refreshToken: generateRefreshToken(user),
    user: publicUser(user, hospital),
    expiresIn: config.jwtExpiresIn
  });
});

/** GET /api/auth/me */
const getCurrentUser = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  res.json({ success: true, user: publicUser(req.userDoc, hospital) });
});

/** PUT /api/auth/me - update your own profile (not your roles or department). */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, professionalEmail, designation, specialization } = req.body;
  const user = req.userDoc;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (professionalEmail !== undefined) user.professionalEmail = professionalEmail;
  if (designation !== undefined) user.designation = designation;
  if (specialization !== undefined) user.specialization = specialization;

  await user.save();

  const hospital = await Hospital.findOne({ tenantId: user.tenantId });
  res.json({ success: true, message: 'Profile updated', user: publicUser(user, hospital) });
});

/** POST /api/auth/change-password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Both the current and the new password are required');
  }
  if (!isStrongPassword(newPassword)) {
    throw ApiError.badRequest(PASSWORD_POLICY);
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('The new password must be different from the current one');
  }

  const user = await User.findById(req.user.userId).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Your current password is not correct');
  }

  user.password = newPassword; // hashed by the model's pre-save hook
  user.mustChangePassword = false;
  await user.save();

  logActivity({
    user: req.user,
    action: 'PASSWORD_CHANGED',
    entityType: 'AUTH',
    entityId: user._id,
    description: `${user.firstName} ${user.lastName} changed their password`
  });

  res.json({ success: true, message: 'Password updated successfully' });
});

/** POST /api/auth/refresh */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('A refresh token is required');

  const decoded = verifyToken(refreshToken);
  if (decoded.type !== 'refresh') throw ApiError.unauthorized('Invalid refresh token');

  const user = await User.findById(decoded.userId);
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.unauthorized('This session is no longer valid');
  }

  res.json({
    success: true,
    token: generateToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: config.jwtExpiresIn
  });
});

/**
 * GET /api/auth/demo-credentials
 *
 * Lets the sign-in screen list ready-to-use accounts so a reviewer can try
 * every role without reading the seed script. Only served while DEMO_MODE is on
 * and only for accounts that actually exist in the database.
 */
const getDemoCredentials = asyncHandler(async (req, res) => {
  if (!config.demoMode) {
    return res.json({ success: true, demoMode: false, tenantId: null, accounts: [] });
  }

  const emails = DEMO_ACCOUNTS.map((account) => account.email);
  const existing = await User.find({ tenantId: DEMO_TENANT_ID, email: { $in: emails } })
    .select('email')
    .lean();
  const existingEmails = new Set(existing.map((user) => user.email));

  const hospital = await Hospital.findOne({ tenantId: DEMO_TENANT_ID }).lean();

  res.json({
    success: true,
    demoMode: true,
    seeded: existingEmails.size > 0,
    tenantId: DEMO_TENANT_ID,
    hospitalName: hospital?.name || 'CareEase General Hospital',
    hint: existingEmails.size
      ? 'Pick an account to fill the form.'
      : 'Demo data has not been loaded yet. Run "npm run seed" in the Backend folder.',
    accounts: DEMO_ACCOUNTS.map((account) => ({
      ...account,
      tenantId: DEMO_TENANT_ID,
      available: existingEmails.has(account.email)
    }))
  });
});

module.exports = {
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  refresh,
  getDemoCredentials
};
