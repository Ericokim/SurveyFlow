const ALREADY_COMPLETED_PATTERN = /already completed/i;
const CLOSED_SURVEY_PATTERN =
  /survey is closed|no longer accepting responses/i;

export const ALREADY_COMPLETED_MESSAGE =
  "You have already completed this survey.";

export const CLOSED_SURVEY_DESCRIPTION =
  "This survey is no longer accepting responses.";

export const isAlreadyCompletedMessage = (message = "") =>
  ALREADY_COMPLETED_PATTERN.test(message);

export const isClosedSurveyMessage = (message = "") =>
  CLOSED_SURVEY_PATTERN.test(message);

export const isHandledRespondentStateMessage = (message = "") =>
  isAlreadyCompletedMessage(message) || isClosedSurveyMessage(message);

export const isPublicRespondentRequest = (url = "") =>
  typeof url === "string" && url.startsWith("/r/");
