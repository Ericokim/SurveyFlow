/**
 * Logic analytics event derivation
 *
 * Pure helpers that convert runtime visibility/navigation decisions
 * into deterministic analytics events.
 */

export function buildLogicAnalyticsEvents({
  previousVisibleQuestionIds = [],
  currentVisibleQuestionIds = [],
  navigationDecision = null,
  pathId = null,
} = {}) {
  const events = [];
  const previousSet = new Set(previousVisibleQuestionIds || []);
  const currentSet = new Set(currentVisibleQuestionIds || []);

  for (const questionId of currentSet) {
    if (!previousSet.has(questionId)) {
      events.push({ type: "question_shown", questionId });
    }
  }

  for (const questionId of previousSet) {
    if (!currentSet.has(questionId)) {
      events.push({ type: "question_hidden", questionId });
    }
  }

  if (navigationDecision?.ruleId) {
    events.push({
      type: "branch_taken",
      ruleId: navigationDecision.ruleId,
      destination:
        navigationDecision.targetQuestionId ||
        navigationDecision.targetSectionId ||
        navigationDecision.type ||
        null,
    });
    events.push({
      type: "rule_triggered",
      ruleId: navigationDecision.ruleId,
    });
  } else if (navigationDecision?.type === "fallback") {
    events.push({
      type: "rule_fallback",
      destination:
        navigationDecision.targetQuestionId ||
        navigationDecision.targetSectionId ||
        null,
    });
  }

  if (pathId) {
    events.push({ type: "path_id", pathId });
  }

  return events;
}

