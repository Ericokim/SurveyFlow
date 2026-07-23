import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyApi } from "../api/company";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { getApiErrorMessage } from "../utils/apiMessages";
import { useAuthStore } from "../../stores/authStore";

/**
 * Company/Workspace React Query Hooks
 */

/**
 * Fetch company profile
 */
export const useCompany = () => {
  const token = useAuthStore((state) => state.token);
  const companyId = useAuthStore((state) => state.user?.companyId);
  return useQuery({
    queryKey: queryKeys.company.profile(companyId),
    queryFn: companyApi.getProfile,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Update company settings mutation
 */
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.user?.companyId);

  return useMutation({
    mutationFn: companyApi.updateSettings,
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.company.profile(companyId),
        result.data
      );
      toast.success(result.message || "Workspace settings updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update settings"));
    },
  });
};

/**
 * Upload logo mutation
 */
export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.user?.companyId);

  return useMutation({
    mutationFn: companyApi.uploadLogo,
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.company.profile(companyId),
        result.data
      );
      toast.success(result.message || "Logo uploaded successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to upload logo"));
    },
  });
};

/**
 * Delete logo mutation
 */
export const useDeleteLogo = () => {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.user?.companyId);

  return useMutation({
    mutationFn: companyApi.deleteLogo,
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.company.profile(companyId),
        result.data
      );
      toast.success(result.message || "Logo removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to remove logo"));
    },
  });
};
