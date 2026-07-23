import apiClient from "./client";

/**
 * Auth API
 *
 * Endpoints:
 * - POST /auth/register
 * - POST /auth/login
 * - GET /auth/me
 * - PATCH /auth/preferences
 */

export const authApi = {
  /**
   * Register new user + company
   * @param {Object} data - { name, email, password, companyName }
   * @returns {Promise} { user, company, token, _message }
   */
  register: async (data) => {
    const response = await apiClient.post("/auth/register", data);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise} { user, company, token, _message }
   */
  login: async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Get current user profile
   * @returns {Promise} User object with company
   */
  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Update current user preferences
   * @param {Object} data - { theme?: 'light' | 'dark' | 'system' }
   * @returns {Promise} Updated user object
   */
  updatePreferences: async (data) => {
    const response = await apiClient.patch("/auth/preferences", data);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Send a password reset link to the user's email
   * @param {Object} data - { email }
   * @returns {Promise} { message }
   */
  forgotPassword: async (data) => {
    const response = await apiClient.post("/auth/forgot-password", data);
    return {
      message: response.normalizedData?.message ?? response.data?.message,
    };
  },

  /**
   * Reset password using the token from the emailed reset link
   * @param {Object} data - { resetToken, newPassword }
   * @returns {Promise} { message }
   */
  resetPassword: async (data) => {
    const { resetToken, newPassword } = data;
    const response = await apiClient.post(
      `/auth/reset-password/${resetToken}`,
      { newPassword }
    );
    return {
      message: response.normalizedData?.message ?? response.data?.message,
    };
  },
};
