// Pagination Helper Functions

/**
 * Calculate pagination values
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @param {number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} Pagination values (skip, take, page, limit)
 */
export function calculatePagination(page = 1, limit = 20, maxLimit = 100) {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
  
  const skip = (parsedPage - 1) * parsedLimit;
  const take = parsedLimit;
  
  return {
    skip,
    take,
    page: parsedPage,
    limit: parsedLimit,
  };
}

/**
 * Create pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export function createPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
}

/**
 * Create paginated response
 * @param {Array} data - Array of items
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response object
 */
export function createPaginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: createPaginationMeta(total, page, limit),
  };
}

/**
 * Apply pagination to Prisma query
 * @param {Object} query - Base Prisma query
 * @param {number|string} page - Current page
 * @param {number|string} limit - Items per page
 * @returns {Object} Query with pagination applied
 */
export function applyPagination(query, page, limit) {
  const { skip, take } = calculatePagination(page, limit);
  
  return {
    ...query,
    skip,
    take,
  };
}

export default {
  calculatePagination,
  createPaginationMeta,
  createPaginatedResponse,
  applyPagination,
};

