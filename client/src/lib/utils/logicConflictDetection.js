/**
 * Builder-side conflict detection helpers
 */

const stableStringify = (value) => JSON.stringify(value || {});

const normalizeActionType = (type) => {
  const normalized = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (
    normalized === "end" ||
    normalized === "end_survey" ||
    normalized === "terminate"
  ) {
    return "terminate";
  }
  if (
    normalized === "jump" ||
    normalized === "jump_section" ||
    normalized === "jump_to_section"
  ) {
    return "jump";
  }
  if (normalized === "jump_question" || normalized === "jump_to_question") {
    return "jump_to_question";
  }
  return normalized;
};

const canonicalizeWhen = (when) => {
  if (when === true) return { type: "always" };
  if (!when || typeof when !== "object") return when || {};
  if (when.always === true) return { type: "always" };
  if (String(when.type || "").toLowerCase() === "always") {
    return { type: "always" };
  }
  return when;
};

const canonicalizeAction = (action) => {
  if (!action || typeof action !== "object") return {};
  const actionType = normalizeActionType(action.type || action.action);

  if (
    actionType === "jump" &&
    typeof action.targetQuestionId === "string" &&
    action.targetQuestionId
  ) {
    return {
      type: "jump_to_question",
      targetQuestionId: action.targetQuestionId,
    };
  }
  if (actionType === "jump") {
    return {
      type: "jump",
      targetSectionId: action.targetSectionId || "",
    };
  }
  if (actionType === "jump_to_question") {
    return {
      type: "jump_to_question",
      targetQuestionId: action.targetQuestionId || "",
    };
  }
  if (actionType === "skip") {
    return {
      type: "skip",
      skipCount: Number.isFinite(action.skipCount) ? action.skipCount : 1,
    };
  }
  if (actionType === "terminate") {
    return { type: "terminate" };
  }
  return { type: actionType };
};

const collectConditionQuestionIds = (condition, accumulator = new Set()) => {
  if (!condition || typeof condition !== "object") return accumulator;
  if (condition.questionId) accumulator.add(condition.questionId);

  for (const key of ["all", "any", "conditions"]) {
    if (Array.isArray(condition[key])) {
      for (const child of condition[key]) {
        collectConditionQuestionIds(child, accumulator);
      }
    }
  }

  if (condition.not) {
    collectConditionQuestionIds(condition.not, accumulator);
  }

  return accumulator;
};

export function detectNavigationConflicts(questions = [], navigationRules = []) {
  const issues = [];
  const indexByQuestionId = new Map(
    (questions || []).map((question, index) => [question.id, index])
  );
  const seenConditionAction = new Map();

  for (const rule of navigationRules || []) {
    const key = `${rule?.fromSectionId || "global"}::${stableStringify(
      canonicalizeWhen(rule?.when)
    )}`;
    const actionKey = stableStringify(canonicalizeAction(rule?.action));

    if (seenConditionAction.has(key)) {
      const existingActionKey = seenConditionAction.get(key);
      if (existingActionKey !== actionKey) {
        issues.push({
          type: "duplicate_condition_conflict",
          ruleId: rule?.id || null,
        });
      }
    } else {
      seenConditionAction.set(key, actionKey);
    }

    const normalizedAction = canonicalizeAction(rule?.action);
    if (normalizedAction.type === "jump_to_question") {
      const sourceId = rule?.when?.questionId;
      const targetId = normalizedAction.targetQuestionId;
      const sourceIndex = indexByQuestionId.get(sourceId);
      const targetIndex = indexByQuestionId.get(targetId);
      if (sourceId && targetId && sourceId === targetId) {
        issues.push({ type: "self_jump", ruleId: rule?.id || null });
      } else if (
        Number.isFinite(sourceIndex) &&
        Number.isFinite(targetIndex) &&
        targetIndex < sourceIndex
      ) {
        issues.push({ type: "backward_jump", ruleId: rule?.id || null });
      }
    }
  }

  return issues;
}

export function detectVisibilityConflicts(visibilityRules = []) {
  const issues = [];
  const showByTarget = new Map();
  const graph = new Map();

  for (const rule of visibilityRules || []) {
    if (rule?.targetType === "question" && rule?.targetId) {
      if (rule?.effect === "show") {
        showByTarget.set(rule.targetId, (showByTarget.get(rule.targetId) || 0) + 1);
      }

      const dependencies = [
        ...collectConditionQuestionIds(rule?.when, new Set()),
      ];
      if (!graph.has(rule.targetId)) {
        graph.set(rule.targetId, new Set());
      }
      for (const dependencyId of dependencies) {
        graph.get(rule.targetId).add(dependencyId);
      }
    }
  }

  for (const [targetId, count] of showByTarget.entries()) {
    if (count > 0) {
      const hasShowOnlyFalse = (visibilityRules || [])
        .filter(
          (rule) =>
            rule?.targetType === "question" &&
            rule?.targetId === targetId &&
            rule?.effect === "show"
        )
        .every((rule) => rule?.when === false);
      if (hasShowOnlyFalse) {
        issues.push({ type: "always_hidden", targetId });
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const dfs = (nodeId) => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const dependencyId of graph.get(nodeId) || []) {
      if (graph.has(dependencyId) && dfs(dependencyId)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of graph.keys()) {
    if (dfs(nodeId)) {
      issues.push({ type: "visibility_cycle", targetId: nodeId });
      break;
    }
  }

  return issues;
}
