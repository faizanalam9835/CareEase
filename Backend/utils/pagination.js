/** Normalises `page`/`limit` query params into safe skip/limit values. */
const getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1
});

/**
 * Escapes user input before it is interpolated into a RegExp search filter, so
 * a search for "c++" or "(" cannot crash the query or scan pathologically.
 */
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { getPagination, buildMeta, escapeRegex };
