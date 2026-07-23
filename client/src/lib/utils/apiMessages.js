/**
 * API Message Utilities
 *
 * Standardized helper for extracting error messages from API responses.
 * Ensures consistent error handling across the entire application.
 *
 * @fileoverview API message extraction utilities
 */

/**
 * Extract error message from API error
 * Backend error structure: { response: { data: { status: { message } } } }
 *
 * @param {Object} error - Axios error object
 * @param {string} fallback - Fallback message if none found
 * @returns {string} Error message
 */
export const getApiErrorMessage = (error, fallback = "An error occurred") => {
  return (
    error.response?.data?.status?.message ??
    error.response?.data?.message ??
    error.message ??
    fallback
  );
};
