import apiClient from "./client";

/**
 * Responses API (Public + Admin)
 *
 * Public endpoints (no auth):
 * - POST /surveys/:publicId/validate-access
 * - GET /surveys/:publicId
 * - POST /surveys/:publicId/responses
 *
 * Admin endpoints (auth required):
 * - GET /surveys/:id/responses
 */

export const responsesApi = {
  /**
   * Validate access to survey (whitelist check)
   * @param {string} publicId - Survey public ID
   * @param {Object} data - { identifier }
   * @returns {Promise} Access validation result
   */
  validateAccess: async (publicId, data = {}) => {
    const response = await apiClient.post(
      `/r/${publicId}/validate-access`,
      data
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  saveProgress: async (publicId, data) => {
    const response = await apiClient.post(`/r/${publicId}/progress`, data);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Get public survey (published version)
   * @param {string} publicId - Survey public ID
   * @returns {Promise} Survey object with questions
   */
  getPublicSurvey: async (publicId) => {
    const response = await apiClient.get(`/r/${publicId}`);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Submit survey response
   * @param {string} publicId - Survey public ID
   * @param {Object} data - { answers, identifier, completionTime, mode }
   * @returns {Promise} Submitted response
   */
  submitResponse: async (publicId, data) => {
    const response = await apiClient.post(`/r/${publicId}/responses`, data);
    const items = response.normalizedData?.items ?? response.data.data;
    const responseData = Array.isArray(items) ? items[0] : items;
    return {
      data: responseData,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Get preview survey (no whitelist enforcement)
   * @param {string} publicId - Survey public ID
   * @returns {Promise} Survey object for preview
   */
  getPreviewSurvey: async (publicId) => {
    const response = await apiClient.get(`/r/${publicId}/preview`);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Simulate preview submission (validates but doesn't save)
   * @param {string} publicId - Survey public ID
   * @param {Object} data - { answers, identifier }
   * @returns {Promise} Validation result
   */
  simulatePreviewSubmission: async (publicId, data) => {
    const response = await apiClient.post(
      `/r/${publicId}/preview/submit`,
      data
    );
    const items = response.normalizedData?.items ?? response.data.data;
    const validationResult = Array.isArray(items) ? items[0] : items;
    return {
      data: validationResult,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Get all responses for survey (admin only)
   * @param {string} surveyId - Survey ID
   * @param {Object} params - { page, pageSize }
   * @returns {Promise} { data, paging }
   */
  getResponses: async (surveyId, params = {}) => {
    const response = await apiClient.get(
      `/admin/surveys/${surveyId}/responses`,
      { params }
    );
    return {
      data: response.normalizedData?.items ?? response.data.data,
      paging: response.normalizedData?.paging ?? response.data.paging,
    };
  },

  /**
   * Get single response details (admin only)
   * @param {string} responseId - Response ID
   * @returns {Promise<Object>} response object
   */
  getResponse: async (responseId) => {
    const response = await apiClient.get(`/admin/responses/${responseId}`);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },
};
