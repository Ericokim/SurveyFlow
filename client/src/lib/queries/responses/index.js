import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { responsesApi } from "../../api/responses";
import { queryKeys } from "../queryKeys";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiMessages";
import {
  isClosedSurveyMessage,
  isHandledRespondentStateMessage,
} from "../../utils/respondentAccess";

/**
 * Response Query Hooks
 */

// Get public survey (for respondents)
export const usePublicSurvey = (publicId, mode = "live") => {
  return useQuery({
    queryKey: queryKeys.public.survey(publicId, mode),
    queryFn: () =>
      mode === "preview"
        ? responsesApi.getPreviewSurvey(publicId)
        : responsesApi.getPublicSurvey(publicId),
    enabled: !!publicId,
    retry: 1, // Only retry once for public surveys
  });
};

// Validate access to survey (whitelist check) - mutation for form submission
export const useValidateAccess = () => {
  return useMutation({
    mutationFn: ({ publicId, identifier, recipientId }) =>
      responsesApi.validateAccess(publicId, { identifier, recipientId }),
    onError: (error) => {
      const message = getApiErrorMessage(
        error,
        "You are not authorized to access this survey."
      );
      if (isHandledRespondentStateMessage(message)) {
        return;
      }
      toast.error(
        message
      );
    },
  });
};

export const useSaveResponseProgress = () => {
  return useMutation({
    mutationFn: ({ publicId, data }) => responsesApi.saveProgress(publicId, data),
    onError: (error) => {
      const message = getApiErrorMessage(error, "Failed to save progress");
      if (isHandledRespondentStateMessage(message)) {
        return;
      }
      toast.error(message);
    },
  });
};

// Submit response mutation
export const useSubmitResponse = (mode = "live") => {
  return useMutation({
    mutationFn: ({ publicId, data }) =>
      mode === "preview"
        ? responsesApi.simulatePreviewSubmission(publicId, data)
        : responsesApi.submitResponse(publicId, data),
    onSuccess: (result) => {
      const fallback =
        mode === "preview"
          ? "Preview validated successfully!"
          : mode === "test"
            ? "Test response submitted!"
            : "Response submitted successfully!";
      toast.success(result.message || fallback);
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Failed to submit response");
      if (isClosedSurveyMessage(message)) {
        return;
      }
      toast.error(message);
    },
  });
};

// Get responses for survey (admin only)
export const useResponses = (surveyId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.responses.list(surveyId, filters),
    queryFn: () => responsesApi.getResponses(surveyId, filters),
    enabled: !!surveyId,
    keepPreviousData: true,
    ...options,
  });
};

// Alias: shared hook naming for analytics/response surfaces
export const useSurveyResponses = (surveyId, filters = {}, options = {}) => {
  return useResponses(surveyId, filters, options);
};

// Get single response details (admin only)
export const useResponse = (responseId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.responses.detail(responseId),
    queryFn: () => responsesApi.getResponse(responseId),
    enabled: !!responseId,
    ...options,
  });
};
