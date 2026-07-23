import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveysApi } from "../../api/surveys";
import { queryKeys } from "../queryKeys";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiMessages";

/**
 * Survey Query Hooks
 */

// Get all surveys (paginated)
export const useSurveys = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.surveys.list(filters),
    queryFn: () => surveysApi.getSurveys(filters),
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    keepPreviousData: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// Get single survey
export const useSurvey = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id),
    queryFn: () => surveysApi.getSurvey(id),
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (survey not found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    ...options,
  });
};

// Create survey mutation
export const useCreateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: surveysApi.createSurvey,
    onSuccess: (result) => {
      // Add the new survey optimistically to all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.surveys.all() },
        (oldData) => {
          if (!oldData?.data) return oldData;

          const newSurvey = result?.data;
          if (!newSurvey || !newSurvey._id) return oldData;

          // Check if survey already exists in the list
          const existingIndex = oldData.data.findIndex(s => s._id === newSurvey._id);
          if (existingIndex >= 0) {
            // Update existing survey
            const updatedData = [...oldData.data];
            updatedData[existingIndex] = newSurvey;
            return {
              ...oldData,
              data: updatedData,
            };
          }

          // Add to the beginning of the list (newest first)
          return {
            ...oldData,
            data: [newSurvey, ...oldData.data],
            pagination: {
              ...oldData.pagination,
              total: (oldData.pagination?.total || 0) + 1,
            },
          };
        }
      );

      // Invalidate only list queries to avoid 404 errors on detail queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey[0] === 'surveys' && queryKey[1] === 'list';
        },
        refetchType: 'active'
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create survey"));
    },
  });
};

// Update survey mutation
export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => surveysApi.updateSurvey(id, data),
    onSuccess: (result, variables) => {
      const updatedSurvey = result?.data;

      // Update survey in detail cache
      if (updatedSurvey) {
        queryClient.setQueryData(
          queryKeys.surveys.detail(variables.id),
          updatedSurvey
        );
      }

      // Update survey in list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.surveys.all() },
        (oldData) => {
          if (!oldData?.data || !updatedSurvey) return oldData;

          return {
            ...oldData,
            data: oldData.data.map((survey) =>
              survey._id === variables.id ? updatedSurvey : survey
            ),
          };
        }
      );

      // Invalidate only list queries to avoid 404 errors on detail queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey[0] === 'surveys' && queryKey[1] === 'list';
        },
        refetchType: 'active'
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update survey"));
    },
  });
};

// Publish survey mutation
export const usePublishSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: surveysApi.publishSurvey,
    onSuccess: (result, id) => {
      const publishedSurvey = result?.data;

      if (publishedSurvey?._id) {
        queryClient.setQueryData(
          queryKeys.surveys.detail(id),
          publishedSurvey
        );

        queryClient.setQueriesData(
          { queryKey: queryKeys.surveys.all() },
          (oldData) => {
            if (!oldData?.data) return oldData;
            return {
              ...oldData,
              data: oldData.data.map((survey) =>
                survey._id === publishedSurvey._id
                  ? { ...survey, ...publishedSurvey }
                  : survey
              ),
            };
          }
        );
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.detail(id),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.all(),
        refetchType: "all",
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to publish survey"));
    },
  });
};

// Close survey mutation
export const useCloseSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: surveysApi.closeSurvey,
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to close survey"));
    },
  });
};

// Duplicate survey mutation
export const useDuplicateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: surveysApi.duplicateSurvey,
    onSuccess: (result) => {
      const duplicatedSurvey = result?.data;

      queryClient.setQueriesData(
        { queryKey: queryKeys.surveys.all() },
        (oldData) => {
          if (!oldData?.data || !duplicatedSurvey) return oldData;

          const alreadyExists = oldData.data.some(
            (survey) => survey?._id === duplicatedSurvey?._id
          );
          if (alreadyExists) {
            return {
              ...oldData,
              data: oldData.data.map((survey) =>
                survey?._id === duplicatedSurvey?._id ? duplicatedSurvey : survey
              ),
            };
          }

          return {
            ...oldData,
            data: [duplicatedSurvey, ...oldData.data],
          };
        }
      );

      if (duplicatedSurvey?._id) {
        queryClient.setQueryData(
          queryKeys.surveys.detail(duplicatedSurvey._id),
          duplicatedSurvey
        );
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to duplicate survey"));
    },
  });
};

// Delete survey mutation (optimistic update)
export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => surveysApi.deleteSurvey(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.surveys.all() });

      // Snapshot previous value
      const previousSurveys = queryClient.getQueryData(
        queryKeys.surveys.list()
      );

      // Optimistically update
      queryClient.setQueryData(queryKeys.surveys.list(), (old) => ({
        ...old,
        data: old?.data?.filter((survey) => survey._id !== id) || [],
      }));

      return { previousSurveys };
    },
    onError: (error, _, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.surveys.list(),
        context.previousSurveys
      );
      toast.error(getApiErrorMessage(error, "Failed to delete survey"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
};

// Get effective branding settings
export const useEffectiveSettings = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.surveys.effectiveSettings(id),
    queryFn: () => surveysApi.getEffectiveSettings(id),
    enabled: !!id,
    ...options,
  });
};

// Upload survey logo mutation
export const useUploadSurveyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file, onUploadProgress }) =>
      surveysApi.uploadSurveyLogo(id, file, onUploadProgress),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.effectiveSettings(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to upload logo"));
    },
  });
};

// Delete survey logo mutation
export const useDeleteSurveyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => surveysApi.deleteSurveyLogo(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveys.effectiveSettings(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete logo"));
    },
  });
};
