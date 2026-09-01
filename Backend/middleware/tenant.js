const { ApiError } = require('../utils/apiError');

const TENANT_ID_PATTERN = /^T[A-Z0-9]{3,}$/i;

/**
 * Multi-tenancy context.
 *
 * The previous middleware rejected *every* request without an `x-tenant-id`
 * header - including `POST /api/auth/login`, which no client can send a tenant
 * header for before it has logged in. Tenant resolution now happens in
 * `authenticateToken` from the signed token, and this middleware only records
 * an optional hint for pre-auth routes and logs the request.
 */
const tenantContext = (req, _res, next) => {
  const hint = req.headers['x-tenant-id'] || req.body?.tenantId;

  if (hint) {
    if (!TENANT_ID_PATTERN.test(String(hint))) {
      return next(
        ApiError.badRequest(
          'Invalid hospital (tenant) ID. It should look like "TDEMO001".'
        )
      );
    }
    req.tenantHint = String(hint).toUpperCase();
  }

  next();
};

/**
 * Guards routes that must never leak across tenants. Any `tenantId` sent by the
 * client is compared with the one on the verified token.
 */
const enforceTenantMatch = (req, _res, next) => {
  const claimed = req.body?.tenantId || req.query?.tenantId;
  if (claimed && req.user && String(claimed).toUpperCase() !== req.user.tenantId) {
    return next(ApiError.forbidden('You cannot access another hospital\'s data'));
  }
  next();
};

module.exports = { tenantContext, enforceTenantMatch, TENANT_ID_PATTERN };
