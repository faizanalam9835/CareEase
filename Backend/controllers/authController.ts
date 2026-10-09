import User, { type UserDoc } from '../models/User';
import Hospital from '../models/Hospital';
import config from '../config/env';
import { ApiError, asyncHandler } from '../utils/apiError';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  isStrongPassword,
  PASSWORD_POLICY
} from '../utils/generateToken';
import { logActivity } from '../utils/activityLog';
import { DEMO_ACCOUNTS, DEMO_TENANT_ID, DEMO_PLATFORM_ADMIN } from '../seed/demoAccounts';
import { PLATFORM_TENANT_ID } from '../config/constants';

const publicUser = (user: UserDoc, hospital?: { name?: string | null } | null) => ({
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
  hospitalName: hospital?.name ?? (user.tenantId === PLATFORM_TENANT_ID ? 'CareEase Platform' : undefined),
  createdAt: user.createdAt
});

/**
 * POST /api/auth/login
 *
 * Only e-mail and password are needed: the hospital is found from the account.
 * E-mails are unique per hospital, not globally, so when the same e-mail and
 * password open accounts at more than one hospital the response lists them
 * (409 CHOOSE_HOSPITAL) and the client repeats the call with that `tenantId`.
 * The list is only revealed after the password has matched.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, tenantId } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('E-mail and password are both required');
  }

  // `password` is `select: false` on the schema, so ask for it explicitly.
  const candidates = await User.find({
    email: String(email).toLowerCase().trim(),
    ...(tenantId && { tenantId: String(tenantId).trim().toUpperCase() })
  })
    .select('+password')
    .limit(20);

  const matches: UserDoc[] = [];
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await candidate.comparePassword(password)) matches.push(candidate);
  }

  // One generic message for "no such user" and "wrong password" so the endpoint
  // cannot be used to enumerate which e-mail addresses exist.
  if (!matches.length) {
    throw ApiError.unauthorized('Incorrect e-mail or password');
  }

  if (matches.length > 1) {
    const hospitals = await Hospital.find({ tenantId: { $in: matches.map((m) => m.tenantId) } })
      .select('name tenantId')
      .lean();
    return res.status(409).json({
      success: false,
      code: 'CHOOSE_HOSPITAL',
      message: 'This account works at more than one hospital. Choose which one to open.',
      hospitals: matches.map((m) => ({
        tenantId: m.tenantId,
        name: hospitals.find((h) => h.tenantId === m.tenantId)?.name || m.tenantId
      }))
    });
  }

  const user = matches[0];

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      user.status === 'LOCKED'
        ? 'This account is locked. Please contact your administrator.'
        : 'This account is inactive. Please contact your administrator.'
    );
  }

  const hospital = await Hospital.findOne({ tenantId: user.tenantId });
  if (hospital && !['ACTIVE', 'VERIFIED'].includes(hospital.status)) {
    throw ApiError.forbidden(
      hospital.status === 'SUSPENDED'
        ? 'This hospital workspace has been suspended. Please contact CareEase.'
        : 'This hospital workspace is not active yet.'
    );
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
export const getCurrentUser = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  res.json({ success: true, user: publicUser(req.userDoc, hospital) });
});

/** PUT /api/auth/me - update your own profile (not your roles or department). */
export const updateProfile = asyncHandler(async (req, res) => {
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
export const changePassword = asyncHandler(async (req, res) => {
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

  // The caller was just authenticated, so the record exists.
  const user = (await User.findById(req.user.userId).select('+password'))!;
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
export const refresh = asyncHandler(async (req, res) => {
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
export const getDemoCredentials = asyncHandler(async (req, res) => {
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
    accounts: [
      ...DEMO_ACCOUNTS.map((account) => ({
        ...account,
        tenantId: DEMO_TENANT_ID,
        available: existingEmails.has(account.email)
      })),
      {
        ...DEMO_PLATFORM_ADMIN,
        tenantId: PLATFORM_TENANT_ID,
        available: Boolean(
          await User.exists({ tenantId: PLATFORM_TENANT_ID, email: DEMO_PLATFORM_ADMIN.email })
        )
      }
    ]
  });
});
