const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');

/**
 * Verifies the bearer token and loads the live user record.
 *
 * The old version trusted the JWT payload alone, so a user whose roles or
 * department were changed - or who was deactivated - kept their old access
 * until the token expired. Loading the user makes revocation immediate.
 */
const authenticateToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    throw ApiError.unauthorized('Access token is required');
  }

  const decoded = jwt.verify(token, config.jwtSecret);

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw ApiError.unauthorized('The account for this token no longer exists');
  }
  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden('This account is not active. Please contact your administrator.');
  }

  req.userDoc = user;
  req.user = {
    userId: String(user._id),
    tenantId: user.tenantId,
    roles: user.roles,
    department: user.department,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  };

  // The tenant is derived from the verified token, never from a client header.
  req.tenantId = user.tenantId;

  next();
});

/** Passes through unauthenticated requests but populates req.user when a valid token is present. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    await authenticateToken(req, _res, next);
  } catch {
    next();
  }
});

const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());

  const permitted = req.user.roles.some((role) => allowedRoles.includes(role));
  if (!permitted) {
    return next(
      ApiError.forbidden(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`
      )
    );
  }
  next();
};

module.exports = { authenticateToken, optionalAuth, authorizeRoles };
