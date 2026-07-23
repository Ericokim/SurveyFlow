/**
 * Question Types Constants
 */

export const QUESTION_TYPES = {
  SHORT_TEXT: "short_text",
  LONG_TEXT: "long_text",
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  DROPDOWN: "dropdown",
  RATING: "rating",
  DATE: "date",
};

export const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPES.SHORT_TEXT]: "Short Text",
  [QUESTION_TYPES.LONG_TEXT]: "Long Text",
  [QUESTION_TYPES.SINGLE_CHOICE]: "Single Choice",
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Multiple Choice",
  [QUESTION_TYPES.DROPDOWN]: "Dropdown",
  [QUESTION_TYPES.RATING]: "Rating",
  [QUESTION_TYPES.DATE]: "Date",
};

export const QUESTION_TYPE_OPTIONS = Object.entries(QUESTION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const QUESTION_TYPE_IS_CHOICE = new Set([
  QUESTION_TYPES.SINGLE_CHOICE,
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.DROPDOWN,
]);

export const QUESTION_TYPE_DESCRIPTIONS = {
  [QUESTION_TYPES.SHORT_TEXT]: "Single-line text input for brief responses",
  [QUESTION_TYPES.LONG_TEXT]: "Multi-line text area for detailed answers",
  [QUESTION_TYPES.SINGLE_CHOICE]:
    "Select one option from a list (radio buttons)",
  [QUESTION_TYPES.MULTIPLE_CHOICE]:
    "Select multiple options from a list (checkboxes)",
  [QUESTION_TYPES.DROPDOWN]: "Choose one option from a dropdown menu",
  [QUESTION_TYPES.RATING]: "Rate on a scale (5 or 10 points)",
  [QUESTION_TYPES.DATE]: "Pick a date from a calendar",
};
