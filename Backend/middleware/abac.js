const { CROSS_DEPARTMENT_ROLES } = require('../config/constants');
const Patient = require('../models/Patient');
const { ApiError, asyncHandler } = require('../utils/apiError');

const isCrossDepartment = (user) =>
  user.roles.some((role) => CROSS_DEPARTMENT_ROLES.includes(role));

/**
 * Attribute-based access control on the request body's `department`.
 *
 * Clinical staff (doctors, nurses) only act inside their own department;
 * admins, receptionists and pharmacists work hospital-wide.
 */
const departmentAccessControl = (req, _res, next) => {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized());

  if (isCrossDepartment(user)) return next();

  const requested = req.body?.department;

  // No department in the payload: default it to the caller's own rather than
  // silently allowing anything, which is what the old middleware did.
  if (!requested) {
    if (req.body && typeof req.body === 'object') req.body.department = user.department;
    return next();
  }

  if (requested !== user.department) {
    return next(
      ApiError.forbidden(
        `You can only work with records in your own department (${user.department})`
      )
    );
  }

  next();
};

/**
 * ABAC on an existing patient referenced by a route or body parameter.
 * `source` says where to read the patient id from.
 */
const patientDepartmentAccess = (paramName = 'patientId', source = 'params') =>
  asyncHandler(async (req, _res, next) => {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();
    if (isCrossDepartment(user)) return next();

    const patientId = req[source]?.[paramName];
    if (!patientId) return next();

    const patient = await Patient.findOne({ _id: patientId, tenantId: user.tenantId });
    if (!patient) throw ApiError.notFound('Patient not found');

    if (patient.department !== user.department) {
      throw ApiError.forbidden(
        `This patient belongs to ${patient.department}. You can only access ${user.department} patients.`
      );
    }

    req.patient = patient;
    next();
  });

/**
 * Returns the tenant-scoped query filter for the caller, narrowed to their
 * department when they are clinical staff. Controllers build every list query
 * on top of this so department isolation cannot be forgotten.
 */
const scopedFilter = (user, extra = {}) => {
  const filter = { tenantId: user.tenantId, ...extra };
  if (!isCrossDepartment(user)) {
    filter.department = user.department;
  }
  return filter;
};

module.exports = {
  departmentAccessControl,
  patientDepartmentAccess,
  isCrossDepartment,
  scopedFilter
};
