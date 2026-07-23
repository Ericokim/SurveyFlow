import { QUESTION_TYPE_IS_CHOICE } from "../constants/questionTypes.js";

/**
 * Normalize question data for preview rendering.
 * Mirrors save-time sanitization for choice options so preview matches editor UX.
 */
export function normalizePreviewQuestions(questions = []) {
  return (questions || []).map((question, index) => {
    const isChoice = QUESTION_TYPE_IS_CHOICE.has(question.type);
    let options = isChoice
      ? (question.options || [])
          .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
          .filter(Boolean)
      : undefined;

    if (isChoice && options.length === 0) {
      options = ["Option 1", "Option 2"];
    }

    return {
      ...question,
      order: question.order ?? index + 1,
      options,
    };
  });
}
