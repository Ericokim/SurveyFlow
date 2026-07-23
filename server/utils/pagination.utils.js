/**
 * Pagination Utilities
 *
 * Provides consistent pagination logic across all controllers following KISS + DRY principles.
 * Handles query parameter parsing, validation, and metadata calculation.
 *
 * @fileoverview Pagination utilities for SurveyFlow API
 * @author SurveyFlow Team
 */

/**
 * Parse and validate pagination parameters from request query
 *
 * @param {Object} query - Express req.query object
 * @param {Object} [options] - Pagination options
 * @param {number} [options.defaultPageSize=10] - Default items per page
 * @param {number} [options.maxPageSize=100] - Maximum items per page
 * @returns {Object} Parsed pagination parameters
 * @returns {number} returns.page - Page number (1-based)
 * @returns {number} returns.pageSize - Items per page
 * @returns {number} returns.skip - Documents to skip for MongoDB
 * @returns {number} returns.limit - Documents to return for MongoDB
 */
export const parsePaginationQuery = (query, options = {}) => {
  const { defaultPageSize = 10, maxPageSize = 100 } = options;

  // Parse page (default to 1, ensure positive integer)
  let page = parseInt(query.page, 10);
  if (!page || page < 1) {
    page = 1;
  }

  // Parse pageSize (default to defaultPageSize, ensure within bounds)
  let pageSize = parseInt(query.pageSize, 10);
  if (!pageSize || pageSize < 1) {
    pageSize = defaultPageSize;
  }
  if (pageSize > maxPageSize) {
    pageSize = maxPageSize;
  }

  // Calculate MongoDB skip and limit
  const skip = (page - 1) * pageSize;
  const limit = pageSize;

  return {
    page,
    pageSize,
    skip,
    limit,
  };
};

/**
 * Create pagination metadata for API response
 *
 * @param {number} page - Current page number
 * @param {number} pageSize - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 * @returns {number} returns.page - Current page number
 * @returns {number} returns.pageSize - Items per page
 * @returns {number} returns.total - Total number of items
 * @returns {number} returns.pages - Total number of pages
 */
export const createPaginationMeta = (page, pageSize, total) => {
  const pages = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    pages,
  };
};

/**
 * Execute paginated MongoDB query and return results with metadata
 *
 * @param {Object} model - Mongoose model
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.pageSize - Items per page
 * @param {Object} [options.sort={}] - Sort criteria
 * @param {Object|string} [options.select] - Fields to select
 * @param {Object|string} [options.populate] - Fields to populate
 * @returns {Promise<Object>} Paginated results
 * @returns {Array} returns.data - Array of documents
 * @returns {Object} returns.paging - Pagination metadata
 */
export const executePagedQuery = async (model, filter, options) => {
  const { page, pageSize, sort = {}, select, populate } = options;

  const pagination = parsePaginationQuery({ page, pageSize });

  // Execute count and find queries in parallel for performance
  const [total, documents] = await Promise.all([
    model.countDocuments(filter),
    model
      .find(filter)
      .select(select)
      .populate(populate)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean()
  ]);

  const paging = createPaginationMeta(pagination.page, pagination.pageSize, total);

  return {
    data: documents,
    paging,
  };
};