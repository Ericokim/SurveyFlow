/**
 * Query Keys Factory
 * Centralized query key management for cache invalidation
 */

export const queryKeys = {
  // Auth
  auth: {
    me: () => ["auth", "me"],
  },

  // Surveys
  surveys: {
    all: () => ["surveys"],
    list: (filters) => ["surveys", "list", filters],
    detail: (id) => ["surveys", "detail", id],
    responses: (id) => ["surveys", id, "responses"],
    effectiveSettings: (id) => ["surveys", "effective-settings", id],
  },

  // Recipients
  recipients: {
    all: () => ["recipients"],
    list: (surveyId, filters) => ["recipients", "list", surveyId, filters],
    stats: (surveyId) => ["recipients", "stats", surveyId],
    detail: (id) => ["recipients", "detail", id],
    responses: (surveyId, recipientId) => [
      "recipients",
      "responses",
      surveyId,
      recipientId,
    ],
  },

  // Responses
  responses: {
    all: () => ["responses"],
    list: (surveyId, filters) => ["responses", "list", surveyId, filters],
    detail: (id) => ["responses", "detail", id],
  },

  // Analytics
  analytics: {
    all: () => ["analytics"],
    survey: (surveyId) => ["analytics", "survey", surveyId],
    questions: (surveyId, filters) => [
      "analytics",
      "questions",
      surveyId,
      filters,
    ],
  },

  // Company
  company: {
    all: ["company"],
    profile: (companyId) => ["company", "profile", companyId],
  },

  // Public survey
  public: {
    survey: (publicId, mode = "live") => ["public", "survey", publicId, mode],
    validateAccess: (publicId) => ["public", "validate", publicId],
  },
};
