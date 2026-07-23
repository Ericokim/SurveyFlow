import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { queryKeys } from "../queryKeys";
import { useAuthStore } from "../../../stores/authStore";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiMessages";
import { clearStorageData } from "../../utils";

/**
 * Auth Query Hooks
 */

// Get current user
export const useMe = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Login mutation
export const useLogin = () => {
  const login = useAuthStore((state) => state.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      if (!result?.data) {
        throw new Error("Login response is empty");
      }
      const { token, ...user } = result.data;

      login(user, token);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all });
      // toast.success(result.message || "Logged in successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Login failed"));
    },
  });
};

// Register mutation
export const useRegister = () => {
  const login = useAuthStore((state) => state.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => {
      if (!result?.data) {
        throw new Error("Register response is empty");
      }
      const { token, ...user } = result.data;

      login(user, token);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all });
      toast.success(result.message || "Registration successful");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Registration failed"));
    },
  });
};

// Logout (no API call needed, just local state)
export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return () => {
    logout();
    clearStorageData(); // Clear localStorage and sessionStorage
    queryClient.clear(); // Clear all queries
  };
};

// Update user preferences (theme, etc.)
export const useUpdatePreferences = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updatePreferences,
    onSuccess: (result) => {
      if (!result?.data) return;
      updateUser(result.data);
      queryClient.setQueryData(queryKeys.auth.me(), result.data);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update preferences"));
    },
  });
};

// Send password-reset OTP to email
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send reset code"));
    },
  });
};

// Reset password with token from emailed link
export const useAuthResetPassword = () => {
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success("Password reset successfully. You can now log in.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to reset password"));
    },
  });
};
