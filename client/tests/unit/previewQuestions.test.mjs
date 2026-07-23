import { test } from "node:test";
import { deepEqual } from "node:assert";
import { normalizePreviewQuestions } from "../../src/lib/utils/previewQuestions.js";

test("normalizePreviewQuestions - handles empty array", () => {
  const result = normalizePreviewQuestions([]);
  deepEqual(result, []);
});

test("normalizePreviewQuestions - filters out empty choice options", () => {
  const questions = [
    {
      id: "1",
      type: "single_choice",
      title: "Test Question",
      options: ["  Option 1  ", "", "   ", "Option 2"],
    },
  ];

  const result = normalizePreviewQuestions(questions);

  deepEqual(result[0].options, ["Option 1", "Option 2"]);
});

test("normalizePreviewQuestions - preserves non-choice questions", () => {
  const questions = [
    {
      id: "1",
      type: "short_text",
      title: "Text Question",
      required: true,
    },
  ];

  const result = normalizePreviewQuestions(questions);
  deepEqual(result, [{ ...questions[0], order: 1, options: undefined }]);
});
