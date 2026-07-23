import apiClient from "./client";

/**
 * Recipients API
 *
 * Endpoints:
 * - GET /surveys/:id/recipients
 * - POST /surveys/:id/recipients
 * - POST /surveys/:id/recipients/bulk
 * - GET /surveys/:id/recipients/stats
 */

export const recipientsApi = {
  /**
   * Get recipients for a survey (paginated)
   * @param {string} surveyId - Survey ID
   * @param {Object} params - { page, limit, status, search }
   * @returns {Promise} { recipients, totalRecipients, currentPage, totalPages }
   */
  getRecipients: async (surveyId, params = {}) => {
    const response = await apiClient.get(`/surveys/${surveyId}/recipients`, {
      params: {
        page: params.page || 1,
        pageSize: params.limit || 20,
        status: params.status,
        search: params.search,
      },
    });
    const items = response.normalizedData?.items ?? response.data.data;
    const paging = response.normalizedData?.paging ?? response.data.paging;
    return {
      recipients: items,
      totalRecipients: paging?.total || 0,
      currentPage: paging?.page || 1,
      totalPages: paging?.pages || 1,
    };
  },

  /**
   * Get recipient statistics for survey
   * @param {string} surveyId - Survey ID
   * @returns {Promise} Stats object { total, pending, invited, completed, failed }
   */
  getRecipientStats: async (surveyId) => {
    const response = await apiClient.get(
      `/surveys/${surveyId}/recipients/stats`
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Create single recipient
   * @param {string} surveyId - Survey ID
   * @param {Object} data - { name, phone, email }
   * @returns {Promise} { data: recipient, message: string }
   */
  createRecipient: async (surveyId, data) => {
    const response = await apiClient.post(
      `/surveys/${surveyId}/recipients`,
      data
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Upload recipients via CSV
   * @param {string} surveyId - Survey ID
   * @param {File} file - CSV file
   * @returns {Promise} Upload summary
   */
  uploadRecipientsCsv: async (surveyId, file) => {
    const formData = new FormData();
    formData.append("csvFile", file);

    const response = await apiClient.post(
      `/surveys/${surveyId}/recipients/bulk`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Update recipient status
   * @param {string} surveyId - Survey ID
   * @param {string} recipientId - Recipient ID
   * @param {string} status - New status (pending, invited, completed, failed)
   * @returns {Promise} Updated recipient
   */
  updateRecipientStatus: async (surveyId, recipientId, status) => {
    const response = await apiClient.patch(
      `/surveys/${surveyId}/recipients/${recipientId}`,
      { status }
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Toggle recipient blacklist status
   * @param {string} surveyId - Survey ID
   * @param {string} recipientId - Recipient ID
   * @returns {Promise} Updated recipient
   */
  toggleBlacklist: async (surveyId, recipientId) => {
    const response = await apiClient.patch(
      `/surveys/${surveyId}/recipients/${recipientId}/blacklist`
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Delete a recipient
   * @param {string} surveyId - Survey ID
   * @param {string} recipientId - Recipient ID
   * @returns {Promise} Deleted recipient ID
   */
  deleteRecipient: async (surveyId, recipientId) => {
    const response = await apiClient.delete(
      `/surveys/${surveyId}/recipients/${recipientId}`
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Delete multiple recipients
   * @param {string} surveyId - Survey ID
   * @param {string[]} recipientIds - Array of recipient IDs
   * @returns {Promise} Delete result
   */
  deleteRecipients: async (surveyId, recipientIds) => {
    const response = await apiClient.post(
      `/surveys/${surveyId}/recipients/bulk-delete`,
      { recipientIds }
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Send invite to a recipient
   * @param {string} surveyId - Survey ID
   * @param {string} recipientId - Recipient ID
   * @returns {Promise} Invite result
   */
  sendInvite: async (surveyId, recipientId, message) => {
    const response = await apiClient.post(
      `/surveys/${surveyId}/recipients/${recipientId}/invite`,
      message ? { message } : undefined
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Send invites to multiple recipients
   * @param {string} surveyId - Survey ID
   * @param {string[]} recipientIds - Array of recipient IDs
   * @returns {Promise} Bulk invite result
   */
  sendBulkInvites: async (surveyId, recipientIds) => {
    const response = await apiClient.post(
      `/surveys/${surveyId}/recipients/bulk-invite`,
      { recipientIds }
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Get a recipient's response details for a survey
   * @param {string} surveyId - Survey ID
   * @param {string} recipientId - Recipient ID
   * @returns {Promise} Response detail payload
   */
  getRecipientResponses: async (surveyId, recipientId) => {
    const response = await apiClient.get(
      `/surveys/${surveyId}/recipients/${recipientId}/responses`
    );
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },
};
