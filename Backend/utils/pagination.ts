export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Normalises `page`/`limit` query params into safe skip/limit values. */
const getPagination = (query: Record<string, unknown> = {}): Pagination => {
  // String() is what parseInt does to its argument anyway; it just makes the type explicit.
  const page = Math.max(parseInt(String(query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(query.limit), 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (total: number, page: number, limit: number): PaginationMeta => ({
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
const escapeRegex = (value: unknown = ''): string => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export { getPagination, buildMeta, escapeRegex };
