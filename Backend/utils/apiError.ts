import type { NextFunction, Request, RequestHandler, Response } from 'express';

class ApiError extends Error {
  statusCode: number;
  details?: unknown;
  isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Access denied') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }
}

/**
 * Wraps an async route handler so a rejected promise reaches the Express error
 * handler instead of hanging the request. Every controller used to repeat the
 * same try/catch and several of them swallowed the error.
 */
// Params are typed flat (`req.params.id: string`): none of our routes use
// wildcard segments, which are the only source of `string[]` params.
export type RouteParams = Record<string, string>;

const asyncHandler =
  (fn: (req: Request<RouteParams>, res: Response, next: NextFunction) => unknown): RequestHandler<RouteParams> =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export { ApiError, asyncHandler };
