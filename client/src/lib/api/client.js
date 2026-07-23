import axios from "axios";
import { toast } from "sonner";
import { clearStorageData } from "../utils";
import { useAuthStore } from "../../stores/authStore";
import { isPublicRespondentRequest } from "../utils/respondentAccess";

/**
 * API Client - Axios instance with interceptors
 *
 */

// Build base URL: VITE_API_URL (from env) + /api suffix
// Development: http://localhost:5001 + /api = http://localhost:5001/api
// Production: VITE_API_URL from the deployment env + /api
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let lastNetworkToastAt = 0;
const NETWORK_TOAST_COOLDOWN_MS = 3000;

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors and normalize responses
apiClient.interceptors.response.use(
  (response) => {
    // Normalize backend response structure for consistent consumption
    // Backend returns: { status: { code, message }, data: [...], paging }
    // We attach normalized data to response object for easy access
    if (response.data?.data !== undefined) {
      response.normalizedData = {
        items: response.data.data, // Always array or single item
        message: response.data.status?.message,
        paging: response.data.paging,
      };
    }
    return response;
  },
  (error) => {
    const isPublicResponseRequest = isPublicRespondentRequest(error.config?.url);

    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Unauthorized - clear all auth state and redirect to login
        // Skip if we're on a public route (/r/) or already on login page
        const isPublicRoute = window.location.pathname.startsWith("/r/");
        const isLoginRoute = window.location.pathname.startsWith("/login");

        if (!isPublicRoute && !isLoginRoute) {
          // Clear Zustand store
          useAuthStore.getState().logout();

          // Clear localStorage
          clearStorageData();

          // Show notification once
          toast.error("Session expired. Please login again.");

          // Redirect to login
          window.location.replace("/login");
        }
      } else if (isPublicResponseRequest) {
        return Promise.reject(error);
      } else if (status === 403) {
        // Forbidden - access denied
        toast.error(
          "Access denied. You do not have permission to perform this action."
        );
      } else if (status === 500) {
        // Server error
        toast.error("Server error. Please try again later.");
      } else if (error.response.data?.status?.message) {
        // Show backend error message
        toast.error(error.response.data.status.message);
      }
    } else if (error.request) {
      // Network error
      const now = Date.now();
      if (now - lastNetworkToastAt >= NETWORK_TOAST_COOLDOWN_MS) {
        lastNetworkToastAt = now;
        toast.error("Network error. Please check your connection.");
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Generic API request function
 */
export const apiRequest = async (endpoint, options = {}) => {
  const config = {
    url: endpoint,
    method: options.method || "GET",
    ...options,
  };

  if (options.body) {
    config.data =
      typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body;
  }

  const response = await apiClient(config);
  return response.data;
};

export default apiClient;
