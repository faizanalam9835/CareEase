import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates `req[source]` against a zod schema and replaces it with the parsed
 * (coerced, stripped) value, so controllers receive clean data.
 */
const validate = (schema: z.ZodType, source: Source = 'body'): RequestHandler => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details: Record<string, string> = {};
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
    // Parsed data replaces the raw input wholesale, so its type is whatever the schema says.
    (req as unknown as Record<string, unknown>)[source] = result.data;
  }
  next();
};

export { validate, z };
