import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedAnswerKeySet,
  getNonApplicableAnswerKeys,
  pruneAnswersToEffectiveScope,
} from "../../utils/responseValidation.js";

test("getAllowedAnswerKeySet includes question ids and valid other companion keys", () => {
  const questions = [
    { id: "q1", type: "short_text", allowOther: false },
    { id: "q2", type: "single_choice", allowOther: true },
    { id: "q3", type: "multiple_choice", allowOther: true },
  ];

  const keySet = getAllowedAnswerKeySet(questions);

  assert.equal(keySet.has("q1"), true);
  assert.equal(keySet.has("q2"), true);
  assert.equal(keySet.has("q3"), true);
  assert.equal(keySet.has("q2_other_text"), true);
  assert.equal(keySet.has("q3_other_text"), true);
  assert.equal(keySet.has("q1_other_text"), true);
});

test("getNonApplicableAnswerKeys flags hidden question answers and invalid other companion values", () => {
  const questionById = new Map([
    ["q1", { id: "q1", type: "single_choice", allowOther: true }],
    ["q2", { id: "q2", type: "short_text", allowOther: false }],
  ]);

  const answers = {
    q1: "A",
    q1_other_text: "stale",
    q2: "hidden-answer",
  };

  const effectiveAnswerableQuestionIds = new Set(["q1"]);
  const invalidKeys = getNonApplicableAnswerKeys(
    answers,
    effectiveAnswerableQuestionIds,
    questionById
  );

  assert.deepEqual(invalidKeys.sort(), ["q1_other_text", "q2"]);
});

test("pruneAnswersToEffectiveScope keeps only applicable answers and active other companion text", () => {
  const questionById = new Map([
    ["q1", { id: "q1", type: "multiple_choice", allowOther: true }],
    ["q2", { id: "q2", type: "short_text", allowOther: false }],
  ]);

  const answers = {
    q1: ["A", "Other"],
    q1_other_text: "custom",
    q2: "hidden-answer",
  };

  const cleaned = pruneAnswersToEffectiveScope(
    answers,
    new Set(["q1"]),
    questionById
  );

  assert.deepEqual(cleaned, {
    q1: ["A", "Other"],
    q1_other_text: "custom",
  });
});
