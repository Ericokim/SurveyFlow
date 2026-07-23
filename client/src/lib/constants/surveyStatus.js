/**
 * Survey Status Constants
 */

export const SURVEY_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
};

export const SURVEY_STATUS_LABELS = {
  [SURVEY_STATUS.DRAFT]: "Draft",
  [SURVEY_STATUS.PUBLISHED]: "Published",
  [SURVEY_STATUS.CLOSED]: "Closed",
};

export const SURVEY_STATUS_COLORS = {
  [SURVEY_STATUS.DRAFT]: "gray",
  [SURVEY_STATUS.PUBLISHED]: "green",
  [SURVEY_STATUS.CLOSED]: "red",
};
