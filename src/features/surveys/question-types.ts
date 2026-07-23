/**
 * Question vocabulary — the single source of truth for the Mongoose enums and
 * for any UI that renders or edits a question.
 *
 * Pure data and small helpers, no database, so it is directly unit-testable.
 */

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "rating",
  "date",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Types that present a fixed list of options. */
export const CHOICE_QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "dropdown",
] as const;

/** Ready-made validation patterns a question can opt into. */
export const PREDEFINED_PATTERNS = [
  "email",
  "phone",
  "url",
  "numeric",
  "integer",
  "alphanumeric",
] as const;

export type PredefinedPattern = (typeof PREDEFINED_PATTERNS)[number];

/** Operators a visibility or navigation condition can use. */
export const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "in",
  "not_in",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
  "exists",
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/** What a navigation rule does when its condition matches. */
export const NAVIGATION_ACTIONS = [
  "jump",
  "terminate",
  "skip",
  "jump_to_question",
] as const;

export type NavigationAction = (typeof NAVIGATION_ACTIONS)[number];

/** Only choice questions carry an options list. */
export function allowsOptions(type: QuestionType): boolean {
  return (CHOICE_QUESTION_TYPES as readonly string[]).includes(type);
}

/** "Other" is a free-text escape hatch on a choice question. */
export function allowsOtherOption(type: QuestionType): boolean {
  return allowsOptions(type);
}
