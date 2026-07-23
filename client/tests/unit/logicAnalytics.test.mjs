import { test } from "node:test";
import { deepEqual, equal } from "node:assert";
import { buildLogicAnalyticsEvents } from "../../src/lib/utils/logicAnalytics.js";

test("buildLogicAnalyticsEvents emits shown/hidden diffs deterministically", () => {
  const events = buildLogicAnalyticsEvents({
    previousVisibleQuestionIds: ["q1", "q2"],
    currentVisibleQuestionIds: ["q2", "q3"],
  });

  const shown = events.filter((event) => event.type === "question_shown");
  const hidden = events.filter((event) => event.type === "question_hidden");

  deepEqual(shown, [{ type: "question_shown", questionId: "q3" }]);
  deepEqual(hidden, [{ type: "question_hidden", questionId: "q1" }]);
});

test("buildLogicAnalyticsEvents emits branch and trigger events when rule is used", () => {
  const events = buildLogicAnalyticsEvents({
    previousVisibleQuestionIds: ["q1"],
    currentVisibleQuestionIds: ["q1"],
    navigationDecision: {
      ruleId: "nav-1",
      type: "jump_question",
      targetQuestionId: "q5",
    },
    pathId: "path-123",
  });

  equal(events.some((event) => event.type === "branch_taken"), true);
  equal(events.some((event) => event.type === "rule_triggered"), true);
  equal(events.some((event) => event.type === "path_id"), true);
});

test("buildLogicAnalyticsEvents emits fallback event when no rule matches", () => {
  const events = buildLogicAnalyticsEvents({
    previousVisibleQuestionIds: ["q1"],
    currentVisibleQuestionIds: ["q1"],
    navigationDecision: {
      type: "fallback",
      targetQuestionId: "q2",
    },
  });

  deepEqual(events, [
    {
      type: "rule_fallback",
      destination: "q2",
    },
  ]);
});

