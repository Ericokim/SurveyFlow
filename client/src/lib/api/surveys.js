import apiClient from "./client";

/**
 * Surveys API
 *
 * Endpoints:
 * - GET /surveys
 * - POST /surveys
 * - GET /surveys/:id
 * - PATCH /surveys/:id
 * - POST /surveys/:id/publish
 * - POST /surveys/:id/close
 * - GET /surveys/:id/effective-settings
 * - POST /surveys/:id/logo (file upload - backend handles Cloudinary)
 * - DELETE /surveys/:id/logo
 */

export const surveysApi = {
  /**
   * Get all surveys (paginated)
   * @param {Object} params - { page, pageSize, status }
   * @returns {Promise} { data, paging }
   */
  getSurveys: async (params = {}) => {
    const response = await apiClient.get("/surveys", { params });
    return {
      data: response.normalizedData?.items ?? response.data.data,
      paging: response.normalizedData?.paging ?? response.data.paging,
    };
  },

  /**
   * Get single survey by ID
   * @param {string} id - Survey ID
   * @returns {Promise} Survey object with questions
   */
  getSurvey: async (id) => {
    const response = await apiClient.get(`/surveys/${id}`);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Create new survey
   * @param {Object} data - { title, description, questions }
   * @returns {Promise} { data: survey, message: string }
   */
  createSurvey: async (data) => {
    const response = await apiClient.post("/surveys", data);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Update survey
   * @param {string} id - Survey ID
   * @param {Object} data - Update payload
   * @returns {Promise} { data: survey, message: string }
   */
  updateSurvey: async (id, data) => {
    const response = await apiClient.patch(`/surveys/${id}`, data);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Publish survey
   * @param {string} id - Survey ID
   * @returns {Promise} { data: survey, message: string }
   */
  publishSurvey: async (id) => {
    const response = await apiClient.post(`/surveys/${id}/publish`);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Close survey
   * @param {string} id - Survey ID
   * @returns {Promise} { data: survey, message: string }
   */
  closeSurvey: async (id) => {
    const response = await apiClient.post(`/surveys/${id}/close`);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Duplicate survey
   * @param {string} id - Survey ID
   * @returns {Promise} { data: survey, message: string }
   */
  duplicateSurvey: async (id) => {
    const response = await apiClient.post(`/surveys/${id}/duplicate`);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Delete survey
   * @param {string} id - Survey ID
   * @returns {Promise} { data: survey, message: string }
   */
  deleteSurvey: async (id) => {
    const response = await apiClient.delete(`/surveys/${id}`);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Get effective branding settings with inheritance information
   * @param {string} id - Survey ID
   * @returns {Promise} Settings object with inheritance flags
   */
  getEffectiveSettings: async (id) => {
    const response = await apiClient.get(`/surveys/${id}/effective-settings`);
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Upload survey logo (backend handles Cloudinary upload)
   * @param {string} id - Survey ID
   * @param {File} file - Logo file
   * @param {Function} onUploadProgress - Progress callback
   * @returns {Promise} { data: {logo, publicId}, message: string }
   */
  uploadSurveyLogo: async (id, file, onUploadProgress) => {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append("logo", file);

    // Upload to backend (which handles Cloudinary upload)
    const response = await apiClient.post(`/surveys/${id}/logo`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...(onUploadProgress && { onUploadProgress }),
    });

    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message || "Logo uploaded successfully",
    };
  },

  /**
   * Delete survey logo
   * @param {string} id - Survey ID
   * @returns {Promise} { data: survey, message: string }
   */
  deleteSurveyLogo: async (id) => {
    const response = await apiClient.delete(`/surveys/${id}/logo`);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },
};
