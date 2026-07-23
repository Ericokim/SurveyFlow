import test from "node:test";
import assert from "node:assert/strict";

import { buildValidatedResponseContext } from "../../controllers/responses.controllers.js";

const surveyVersionFixture = {
  questions: [
    { id: "q1", title: "Q1", type: "single_choice", required: true },
    { id: "q2", title: "Q2", type: "short_text", required: false },
  ],
  sections: [{ id: "s1", order: 0, questionIds: ["q1", "q2"] }],
  visibilityRules: [
    {
      id: "vr_hide_q2",
      targetType: "question",
      targetId: "q2",
      effect: "hide",
      when: {
        questionId: "q1",
        operator: "equals",
        value: "hide",
      },
      priority: 0,
    },
  ],
  navigationRules: [],
};

test("progress-save validation prunes hidden stale answers", () => {
  const context = buildValidatedResponseContext({
    surveyVersion: surveyVersionFixture,
    answers: {
      q1: "hide",
      q2: "stale hidden answer",
    },
    visitedSectionIds: ["s1"],
    invalidKeyStatusCode: 422,
    nonApplicableStatusCode: 422,
    allowNonApplicableAnswers: true,
  });

  assert.deepEqual(context.cleanedAnswers, { q1: "hide" });
});

test("submit validation still rejects hidden stale answers", () => {
  assert.throws(
    () =>
      buildValidatedResponseContext({
        surveyVersion: surveyVersionFixture,
        answers: {
          q1: "hide",
          q2: "stale hidden answer",
        },
        visitedSectionIds: ["s1"],
        invalidKeyStatusCode: 422,
        nonApplicableStatusCode: 422,
        allowNonApplicableAnswers: false,
      }),
    /Answers include non-applicable questions/
  );
});
