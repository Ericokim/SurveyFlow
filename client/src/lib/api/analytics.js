import apiClient from "./client";

/**
 * Analytics API
 *
 * Endpoints:
 * - GET /surveys/:id/analytics
 * - GET /surveys/:id/analytics/questions
 * - POST /surveys/:id/analytics/export/responses
 * - POST /surveys/:id/analytics/export/recipients
 */

export const analyticsApi = {
  /**
   * Get survey analytics dashboard data
   * @param {string} surveyId - Survey ID
   * @returns {Promise} Analytics object with metrics
   */
  getSurveyAnalytics: async (surveyId) => {
    const response = await apiClient.get(`/surveys/${surveyId}/analytics`);
    const items = response.normalizedData?.items ?? response.data.data;
    const analyticsData = Array.isArray(items) ? items[0] : items;

    // Flatten structure - component expects metrics at top level
    if (analyticsData?.overview) {
      return {
        totalRecipients: analyticsData.overview.totalRecipients,
        totalResponses: analyticsData.overview.totalResponses,
        completionRate: analyticsData.overview.completionRate,
        dropOffRate: analyticsData.overview.dropOffRate,
        avgCompletionTime: analyticsData.overview.avgCompletionTime,
        lastResponseAt: analyticsData.overview.lastResponseAt,
        deviceBreakdown: analyticsData.devices,
        dailyResponseCounts:
          analyticsData.dailyActivity?.map((item) => ({
            date: item.date,
            count: item.responses,
          })) || [],
        ...analyticsData,
      };
    }

    return analyticsData;
  },

  /**
   * Get question-level analytics
   * @param {string} surveyId - Survey ID
   * @returns {Promise} Question analytics array
   */
  getQuestionAnalytics: async (surveyId, params = {}) => {
    const response = await apiClient.get(
      `/surveys/${surveyId}/analytics/questions`,
      { params }
    );
    return response.normalizedData?.items ?? response.data.data;
  },

  /**
   * Export responses as CSV
   * @param {string} surveyId - Survey ID
   * @returns {Promise} CSV file blob
   */
  exportResponses: async (params) => {
    const request =
      typeof params === "string" ? { surveyId: params } : params || {};
    const { surveyId, search } = request;

    const response = await apiClient.post(
      `/surveys/${surveyId}/analytics/export/responses`,
      search ? { search } : {},
      {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      }
    );
    return {
      blob: response.data,
      filename: getFilenameFromDisposition(
        response.headers?.["content-disposition"]
      ),
    };
  },

  /**
   * Export recipients as CSV
   * @param {string} surveyId - Survey ID
   * @returns {Promise} CSV file blob
   */
  exportRecipients: async (surveyId) => {
    const response = await apiClient.post(
      `/surveys/${surveyId}/analytics/export/recipients`,
      {},
      {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      }
    );
    return {
      blob: response.data,
      filename: getFilenameFromDisposition(
        response.headers?.["content-disposition"]
      ),
    };
  },

  /**
   * Export respondents metadata as CSV
   * @param {string} surveyId - Survey ID
   * @returns {Promise} CSV file blob
   */
  exportRespondents: async (params) => {
    const request =
      typeof params === "string" ? { surveyId: params } : params || {};
    const { surveyId, search } = request;

    const response = await apiClient.post(
      `/surveys/${surveyId}/analytics/export/respondents`,
      search ? { search } : {},
      {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      }
    );
    return {
      blob: response.data,
      filename: getFilenameFromDisposition(
        response.headers?.["content-disposition"]
      ),
    };
  },
};

const getFilenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/"/g, "").trim());
  } catch {
    return match[1].replace(/"/g, "").trim();
  }
};
