import { test } from "node:test";
import { deepEqual, equal } from "node:assert";
import {
  detectNavigationConflicts,
  detectVisibilityConflicts,
} from "../../src/lib/utils/logicConflictDetection.js";

test("detectNavigationConflicts flags duplicate-condition conflicting actions", () => {
  const rules = [
    {
      id: "r1",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q2" },
    },
    {
      id: "r2",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q3" },
    },
  ];
  const issues = detectNavigationConflicts([], rules);
  equal(
    issues.some((issue) => issue.type === "duplicate_condition_conflict"),
    true
  );
});

test("detectNavigationConflicts treats alias-equivalent rules as non-conflicting", () => {
  const rules = [
    {
      id: "r1",
      fromSectionId: "s1",
      when: true,
      action: { type: "end" },
    },
    {
      id: "r2",
      fromSectionId: "s1",
      when: { type: "always" },
      action: { type: "terminate" },
    },
    {
      id: "r3",
      fromSectionId: "s2",
      when: { questionId: "q1", operator: "equals", value: "Other" },
      action: { type: "jump_to_section", targetSectionId: "s4" },
    },
    {
      id: "r4",
      fromSectionId: "s2",
      when: { questionId: "q1", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "s4" },
    },
  ];
  const issues = detectNavigationConflicts([], rules);
  equal(
    issues.some((issue) => issue.type === "duplicate_condition_conflict"),
    false
  );
});

test("detectNavigationConflicts flags self and backward jumps", () => {
  const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }];
  const rules = [
    {
      id: "self",
      when: { questionId: "q2", operator: "equals", value: "x" },
      action: { type: "jump_to_question", targetQuestionId: "q2" },
    },
    {
      id: "back",
      when: { questionId: "q3", operator: "equals", value: "x" },
      action: { type: "jump_to_question", targetQuestionId: "q1" },
    },
  ];
  const issues = detectNavigationConflicts(questions, rules);
  equal(issues.some((issue) => issue.type === "self_jump"), true);
  equal(issues.some((issue) => issue.type === "backward_jump"), true);
});

test("detectVisibilityConflicts flags cycle and always-hidden show target", () => {
  const rules = [
    {
      id: "v1",
      targetType: "question",
      targetId: "q1",
      effect: "show",
      when: { questionId: "q2", operator: "equals", value: "A" },
    },
    {
      id: "v2",
      targetType: "question",
      targetId: "q2",
      effect: "show",
      when: { questionId: "q1", operator: "equals", value: "A" },
    },
    {
      id: "v3",
      targetType: "question",
      targetId: "q3",
      effect: "show",
      when: false,
    },
  ];

  const issues = detectVisibilityConflicts(rules);
  deepEqual(issues.some((issue) => issue.type === "visibility_cycle"), true);
  deepEqual(issues.some((issue) => issue.type === "always_hidden"), true);
});
