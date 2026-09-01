const { z } = require('zod');
const { ApiError } = require('../utils/apiError');

/**
 * Validates `req[source]` against a zod schema and replaces it with the parsed
 * (coerced, stripped) value, so controllers receive clean data.
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || source;
      if (!details[key]) details[key] = issue.message;
    }
    return next(ApiError.badRequest('Please correct the highlighted fields', details));
  }

  if (source === 'query') {
    // req.query is a getter in Express 5, so mutate rather than reassign.
    Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true });
  } else {
    req[source] = result.data;
  }
  next();
};

module.exports = { validate, z };
