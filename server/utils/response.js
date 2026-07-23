/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all controllers following KISS + DRY principles.
 * All API responses must use these utilities to ensure frontend consistency.
 *
 * @fileoverview Response utilities for SurveyFlow API
 * @author SurveyFlow Team
 */

/**
 * Send standardized API response
 *
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {string} [options.message='Request successful'] - Response message
 * @param {*} [options.data=[]] - Response data (always returned as array)
 * @param {Object|null} [options.paging=null] - Pagination metadata
 * @param {number} [options.httpStatus=200] - HTTP status code
 * @returns {Object} Express response
 */
export const sendResponse = (
  res,
  { message = 'Request successful', data = [], paging = null, httpStatus = 200 }
) => {
  return res.status(httpStatus).json({
    status: {
      code: httpStatus,
      message,
    },
    data: Array.isArray(data) ? data : [data],
    paging,
  });
};

/**
 * Send success response for resource creation
 *
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message='Created successfully'] - Success message
 * @returns {Object} Express response
 */
export const sendCreated = (res, data, message = 'Created successfully') => {
  return sendResponse(res, {
    data,
    message,
    httpStatus: 201,
  });
};

/**
 * Send success response for resource updates
 *
 * @param {Object} res - Express response object
 * @param {*} data - Updated resource data
 * @param {string} [message='Updated successfully'] - Success message
 * @returns {Object} Express response
 */
export const sendUpdated = (res, data, message = 'Updated successfully') => {
  return sendResponse(res, {
    data,
    message,
    httpStatus: 200,
  });
};

/**
 * Send success response for resource deletion
 *
 * @param {Object} res - Express response object
 * @param {string} [message='Deleted successfully'] - Success message
 * @returns {Object} Express response
 */
export const sendDeleted = (res, message = 'Deleted successfully') => {
  return sendResponse(res, {
    data: [],
    message,
    httpStatus: 200,
  });
};

/**
 * Send paginated list response
 *
 * @param {Object} res - Express response object
 * @param {Array} data - Array of resources
 * @param {Object} paging - Pagination metadata
 * @param {string} [message='Request successful'] - Success message
 * @returns {Object} Express response
 */
export const sendPaginated = (res, data, paging, message = 'Request successful') => {
  return sendResponse(res, {
    data,
    paging,
    message,
    httpStatus: 200,
  });
};