import { useQuery, useMutation } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analytics";
import { queryKeys } from "../queryKeys";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiMessages";

/**
 * Analytics Query Hooks
 */

// Get survey analytics
export const useSurveyAnalytics = (surveyId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.survey(surveyId),
    queryFn: () => analyticsApi.getSurveyAnalytics(surveyId),
    enabled: !!surveyId,
    ...options,
  });
};

// Get question analytics
export const useQuestionAnalytics = (
  surveyId,
  params = {},
  options = {}
) => {
  return useQuery({
    queryKey: queryKeys.analytics.questions(surveyId, params),
    queryFn: () => analyticsApi.getQuestionAnalytics(surveyId, params),
    enabled: !!surveyId,
    ...options,
  });
};

// Export responses mutation
export const useExportResponses = () => {
  return useMutation({
    mutationFn: analyticsApi.exportResponses,
    onSuccess: (payload) => {
      const blob =
        payload?.blob instanceof Blob
          ? payload.blob
          : new Blob([payload?.blob ?? ""], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = payload?.filename || `survey-responses-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Responses exported successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to export responses"));
    },
  });
};

// Export recipients mutation
export const useExportRecipients = () => {
  return useMutation({
    mutationFn: analyticsApi.exportRecipients,
    onSuccess: (payload) => {
      const blob =
        payload?.blob instanceof Blob
          ? payload.blob
          : new Blob([payload?.blob ?? ""], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = payload?.filename || `survey-recipients-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Recipients exported successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to export recipients"));
    },
  });
};

// Export respondents metadata mutation
export const useExportRespondents = () => {
  return useMutation({
    mutationFn: analyticsApi.exportRespondents,
    onSuccess: (payload) => {
      const blob =
        payload?.blob instanceof Blob
          ? payload.blob
          : new Blob([payload?.blob ?? ""], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = payload?.filename || `survey-respondents-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Respondents exported successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to export respondents"));
    },
  });
};
