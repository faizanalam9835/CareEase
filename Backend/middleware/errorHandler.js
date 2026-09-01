const config = require('../config/env');
const { ApiError } = require('../utils/apiError');

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} does not exist on this API`
  });
};

// eslint-disable-next-line no-unused-vars -- Express identifies the error handler by arity.
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  // Mongoose validation -> 400 with per-field messages the UI can render.
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, error]) => [field, error.message])
    );
  }

  // Bad ObjectId in the URL -> 400, not a 500.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Duplicate key -> 409 naming the field that clashed.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {}).filter((k) => k !== 'tenantId')[0];
    message = field ? `A record with this ${field} already exists` : 'Duplicate record';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired, please sign in again';
  }

  if (statusCode >= 500) {
    console.error('[error]', req.method, req.originalUrl, '-', err.stack || err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details ? { details } : {}),
    ...(config.isProduction || statusCode < 500 ? {} : { stack: err.stack })
  });
};

module.exports = { notFoundHandler, errorHandler, ApiError };
