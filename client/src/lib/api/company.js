import apiClient from "./client";

/**
 * Company/Workspace API
 *
 * Endpoints:
 * - GET /company/profile
 * - PATCH /company/settings
 * - POST /company/logo (file upload - backend handles Cloudinary)
 * - DELETE /company/logo
 */

export const companyApi = {
  /**
   * Get company profile/settings
   * @returns {Promise} Company object
   */
  getProfile: async () => {
    const response = await apiClient.get("/company/profile");
    const items = response.normalizedData?.items ?? response.data.data;
    return Array.isArray(items) ? items[0] : items;
  },

  /**
   * Update company settings
   * @param {Object} data - { name, primaryColor, secondaryColor, defaultFont, thankYouMessage }
   * @returns {Promise} { data: company, message: string }
   */
  updateSettings: async (data) => {
    const response = await apiClient.patch("/company/settings", data);
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },

  /**
   * Upload company logo (backend handles Cloudinary upload)
   * @param {File|Object} input - Logo file or {file, onUploadProgress}
   * @returns {Promise} { data: {logo, publicId}, message: string }
   */
  uploadLogo: async (input) => {
    const file = input?.file || input;
    const onUploadProgress = input?.onUploadProgress;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("logo", file);

    // Upload to backend (which handles Cloudinary upload)
    const response = await apiClient.post("/company/logo", formData, {
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
   * Delete company logo
   * @returns {Promise} { data: company, message: string }
   */
  deleteLogo: async () => {
    const response = await apiClient.delete("/company/logo");
    const items = response.normalizedData?.items ?? response.data.data;
    return {
      data: Array.isArray(items) ? items[0] : items,
      message: response.normalizedData?.message,
    };
  },
};
