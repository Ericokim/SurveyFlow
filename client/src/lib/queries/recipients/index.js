import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipientsApi } from "../../api/recipients";
import { queryKeys } from "../queryKeys";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiMessages";
import { buildRecipientUploadToast } from "../../utils/recipientUploadSummary";
import { formatRecipientForList } from "../../utils/recipientPresentation";

/**
 * Recipient Query Hooks
 */

// Get recipients for survey (paginated)
export const useRecipients = (surveyId, filters = {}) => {
  return useQuery({
    queryKey: queryKeys.recipients.list(surveyId, filters),
    queryFn: () => recipientsApi.getRecipients(surveyId, filters),
    enabled: !!surveyId,
    keepPreviousData: true,
    select: (data) => ({
      ...data,
      recipients: (data?.recipients || []).map(formatRecipientForList),
    }),
  });
};

// Get recipient statistics
export const useRecipientStats = (surveyId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipients.stats(surveyId),
    queryFn: () => recipientsApi.getRecipientStats(surveyId),
    enabled: !!surveyId,
    ...options,
  });
};

// Get a specific recipient's responses for a survey
export const useRecipientResponses = (surveyId, recipientId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipients.responses(surveyId, recipientId),
    queryFn: () => recipientsApi.getRecipientResponses(surveyId, recipientId),
    enabled: !!surveyId && !!recipientId,
    ...options,
  });
};

// Create single recipient mutation
export const useCreateRecipient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, data }) =>
      recipientsApi.createRecipient(surveyId, data),
    onSuccess: (result, variables) => {
      const newRecipient = formatRecipientForList(result?.data);
      if (newRecipient) {
        queryClient.setQueriesData(
          { queryKey: ["recipients", "list", variables.surveyId] },
          (old) => {
            if (!old || !old.recipients) return old;

            const exists = old.recipients.some(
              (recipient) => recipient._id === newRecipient._id
            );
            if (exists) return old;

            const recipients =
              old.currentPage === 1
                ? [newRecipient, ...old.recipients]
                : old.recipients;

            return {
              ...old,
              recipients,
              totalRecipients: (old.totalRecipients || 0) + 1,
            };
          }
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      toast.success(result.message || "Recipient added successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to add recipient"));
    },
  });
};

// Upload recipients CSV mutation
export const useUploadRecipientsCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, file }) =>
      recipientsApi.uploadRecipientsCsv(surveyId, file),
    onSuccess: async (data, variables) => {
      const recipientListKey = ["recipients", "list", variables.surveyId];

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: recipientListKey,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.recipients.stats(variables.surveyId),
        }),
        queryClient.refetchQueries({
          queryKey: recipientListKey,
          type: "active",
        }),
      ]);

      const uploadToast = buildRecipientUploadToast(data);
      toast[uploadToast.level](uploadToast.message);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to upload recipients"));
    },
  });
};

// Update recipient status mutation
export const useUpdateRecipientStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientId, status }) =>
      recipientsApi.updateRecipientStatus(surveyId, recipientId, status),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      toast.success(result.message || "Recipient status updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update status"));
    },
  });
};

// Toggle recipient blacklist mutation
export const useToggleRecipientBlacklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientId }) =>
      recipientsApi.toggleBlacklist(surveyId, recipientId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      toast.success(result.message || "Recipient blacklist updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update blacklist"));
    },
  });
};

// Delete recipient mutation
export const useDeleteRecipient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientId }) =>
      recipientsApi.deleteRecipient(surveyId, recipientId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      toast.success(result.message || "Recipient deleted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete recipient"));
    },
  });
};

// Delete multiple recipients mutation
export const useDeleteRecipients = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientIds }) =>
      recipientsApi.deleteRecipients(surveyId, recipientIds),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      // Use API message or construct from data
      const count = result.data?.deleted || variables.recipientIds.length;
      const fallback = `${count} recipient${count > 1 ? "s" : ""} deleted`;
      toast.success(result.message || fallback);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete recipients"));
    },
  });
};

// Send invite to recipient mutation
export const useSendInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientId, message }) =>
      recipientsApi.sendInvite(surveyId, recipientId, message),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipients", "list", variables.surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      toast.success(result.message || "Invite sent successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send invite"));
    },
  });
};

// Send bulk invites mutation
export const useSendBulkInvites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipientIds }) =>
      recipientsApi.sendBulkInvites(surveyId, recipientIds),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.list(variables.surveyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients.stats(variables.surveyId),
      });
      // Use API message or construct from data
      const count = result.data?.sent || variables.recipientIds.length;
      const fallback = `${count} invite${count > 1 ? "s" : ""} sent successfully`;
      toast.success(result.message || fallback);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send invites"));
    },
  });
};
