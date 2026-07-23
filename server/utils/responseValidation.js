/**
 * Response validation helpers
 *
 * Pure helpers for server-side payload validation and pruning.
 */

const OTHER_TEXT_SUFFIX = "_other_text";

export const isOtherTextKey = (key = "") =>
  typeof key === "string" && key.endsWith(OTHER_TEXT_SUFFIX);

export const getParentQuestionIdForOtherKey = (key = "") =>
  isOtherTextKey(key) ? key.slice(0, -OTHER_TEXT_SUFFIX.length) : null;

export const supportsOtherText = (question = {}) =>
  question?.allowOther &&
  ["single_choice", "dropdown", "multiple_choice"].includes(question?.type);

export const isOtherSelectionActive = (question = {}, answer) => {
  if (!supportsOtherText(question)) return false;
  if (question.type === "multiple_choice") {
    return Array.isArray(answer) && answer.includes("Other");
  }
  return answer === "Other";
};

export const getAllowedAnswerKeySet = (questions = []) => {
  const keys = new Set();
  const questionIdSet = new Set((questions || []).map((question) => question.id));
  for (const question of questions) {
    keys.add(question.id);
    if (supportsOtherText(question)) {
      keys.add(`${question.id}${OTHER_TEXT_SUFFIX}`);
    }
  }
  // Allow stale/legacy companion keys when the parent question exists.
  // Applicability is still enforced by getNonApplicableAnswerKeys.
  for (const questionId of questionIdSet) {
    keys.add(`${questionId}${OTHER_TEXT_SUFFIX}`);
  }
  return keys;
};

export const getNonApplicableAnswerKeys = (
  answers = {},
  effectiveAnswerableQuestionIds = new Set(),
  questionById = new Map()
) => {
  const nonApplicableKeys = [];

  for (const [answerKey] of Object.entries(answers || {})) {
    if (isOtherTextKey(answerKey)) {
      const parentQuestionId = getParentQuestionIdForOtherKey(answerKey);
      const parentQuestion = questionById.get(parentQuestionId);
      const parentAnswer = answers[parentQuestionId];
      const otherAllowed =
        !!parentQuestion &&
        effectiveAnswerableQuestionIds.has(parentQuestionId) &&
        isOtherSelectionActive(parentQuestion, parentAnswer);

      if (!otherAllowed) {
        nonApplicableKeys.push(answerKey);
      }
      continue;
    }

    if (!effectiveAnswerableQuestionIds.has(answerKey)) {
      nonApplicableKeys.push(answerKey);
    }
  }

  return nonApplicableKeys;
};

export const pruneAnswersToEffectiveScope = (
  answers = {},
  effectiveAnswerableQuestionIds = new Set(),
  questionById = new Map()
) => {
  const cleanedAnswers = {};
  const nonApplicableKeys = new Set(
    getNonApplicableAnswerKeys(
      answers,
      effectiveAnswerableQuestionIds,
      questionById
    )
  );

  for (const [answerKey, answerValue] of Object.entries(answers || {})) {
    if (!nonApplicableKeys.has(answerKey)) {
      cleanedAnswers[answerKey] = answerValue;
    }
  }

  return cleanedAnswers;
};
