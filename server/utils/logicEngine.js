/**
 * Survey Logic Engine - Pure Functions for Conditional Logic
 *
 * Evaluates visibility rules, navigation rules, and conditional logic
 * for multi-step surveys with non-linear branching.
 *
 * DESIGN PRINCIPLES:
 * - Pure functions (no side effects)
 * - Shared between backend and frontend (copy to client/src/lib/utils/)
 * - Single source of truth for logic evaluation
 * - Performance-optimized with memoization hints
 *
 * @fileoverview Logic engine for survey conditional logic
 * @author SurveyFlow Team
 */

/**
 * Evaluate a single condition against response data
 *
 * @param {Object} condition - Condition to evaluate
 * @param {string} condition.questionId - Question ID to check
 * @param {string} condition.operator - Comparison operator
 * @param {*} condition.value - Value to compare against
 * @param {Map|Object} answers - Response answers (Map or plain object)
 * @returns {boolean} True if condition is met
 */
export function evaluateCondition(condition, answers) {
  if (typeof condition === "boolean") {
    return condition;
  }

  if (!condition || typeof condition !== "object") {
    return false;
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((entry) => evaluateCondition(entry, answers));
  }

  if (Array.isArray(condition.any)) {
    return condition.any.some((entry) => evaluateCondition(entry, answers));
  }

  if (condition.not) {
    return !evaluateCondition(condition.not, answers);
  }

  if (Array.isArray(condition.conditions)) {
    const combinator = String(
      condition.logic || condition.combinator || condition.operator || "and"
    ).toLowerCase();

    if (combinator === "or") {
      return condition.conditions.some((entry) =>
        evaluateCondition(entry, answers)
      );
    }

    if (combinator === "not") {
      return !condition.conditions.every((entry) =>
        evaluateCondition(entry, answers)
      );
    }

    return condition.conditions.every((entry) => evaluateCondition(entry, answers));
  }

  if (!condition.questionId || !condition.operator) {
    return false;
  }

  // Get answer value (support both Map and plain object)
  const answerValue =
    answers instanceof Map
      ? answers.get(condition.questionId)
      : answers[condition.questionId];

  const { operator, value: expectedValue } = condition;

  // Handle "exists" operator (checks if answer exists and is not empty)
  if (operator === "exists") {
    if (answerValue === undefined || answerValue === null) return false;
    if (typeof answerValue === "string" && answerValue.trim() === "")
      return false;
    if (Array.isArray(answerValue) && answerValue.length === 0) return false;
    return true;
  }

  // For other operators, return false if answer doesn't exist
  if (answerValue === undefined || answerValue === null) {
    return false;
  }

  // Operator evaluation
  switch (operator) {
    case "equals":
      if (Array.isArray(answerValue)) {
        return answerValue.includes(expectedValue);
      }
      return answerValue === expectedValue;

    case "not_equals":
      if (Array.isArray(answerValue)) {
        return !answerValue.includes(expectedValue);
      }
      return answerValue !== expectedValue;

    case "in":
      if (!Array.isArray(expectedValue)) return false;
      // Handle array answers (multiple_choice)
      if (Array.isArray(answerValue)) {
        return answerValue.some((v) => expectedValue.includes(v));
      }
      return expectedValue.includes(answerValue);

    case "not_in":
      if (!Array.isArray(expectedValue)) return false;
      if (Array.isArray(answerValue)) {
        return !answerValue.some((v) => expectedValue.includes(v));
      }
      return !expectedValue.includes(answerValue);

    case "gt":
      return Number(answerValue) > Number(expectedValue);

    case "lt":
      return Number(answerValue) < Number(expectedValue);

    case "gte":
      return Number(answerValue) >= Number(expectedValue);

    case "lte":
      return Number(answerValue) <= Number(expectedValue);

    case "contains":
      if (typeof answerValue !== "string") return false;
      return answerValue
        .toLowerCase()
        .includes(String(expectedValue).toLowerCase());

    default:
      return false;
  }
}

function compareRulesByPriorityAndKey(a, b) {
  const priorityDiff = (b?.priority || 0) - (a?.priority || 0);
  if (priorityDiff !== 0) return priorityDiff;
  const aKey = String(a?.id || "");
  const bKey = String(b?.id || "");
  if (aKey !== bKey) return aKey.localeCompare(bKey);
  return JSON.stringify(a || {}).localeCompare(JSON.stringify(b || {}));
}

function isAlwaysCondition(condition) {
  if (condition === true) return true;
  if (!condition || typeof condition !== "object") return false;
  if (condition.always === true) return true;
  return String(condition.type || "").toLowerCase() === "always";
}

function isUnconditionalSectionFallbackRule(rule) {
  if (!rule || typeof rule !== "object") return false;
  const actionType = getRuleActionType(rule.action);
  if (actionType !== "jump" && actionType !== "terminate") {
    return false;
  }
  if (typeof rule.fromSectionId !== "string" || !rule.fromSectionId) {
    return false;
  }
  if (!isAlwaysCondition(rule.when)) return false;
  const questionId = rule.when?.questionId;
  return !questionId;
}

function compareNavigationRulesForRuntime(a, b) {
  const aIsFallback = isUnconditionalSectionFallbackRule(a);
  const bIsFallback = isUnconditionalSectionFallbackRule(b);
  if (aIsFallback !== bIsFallback) {
    return aIsFallback ? 1 : -1;
  }
  return compareRulesByPriorityAndKey(a, b);
}

function getRuleActionType(action) {
  if (!action) return null;
  const rawType = typeof action === "string" ? action : action.type || action.action;
  const normalizedType = normalizeNavigationActionType(rawType);

  if (
    (normalizedType === "jump" || !normalizedType) &&
    typeof action === "object" &&
    typeof action.targetQuestionId === "string" &&
    action.targetQuestionId.trim().length > 0
  ) {
    return "jump_to_question";
  }

  return normalizedType;
}

function buildCanonicalQuestionOrder(questions = [], sections = []) {
  const questionById = new Map(
    (questions || [])
      .filter((question) => question?.id)
      .map((question) => [question.id, question])
  );
  const ordered = [];
  const included = new Set();

  for (const section of [...(sections || [])].sort(
    (a, b) => (a?.order ?? 0) - (b?.order ?? 0)
  )) {
    for (const questionId of section?.questionIds || []) {
      const question = questionById.get(questionId);
      if (question && !included.has(question.id)) {
        included.add(question.id);
        ordered.push(question);
      }
    }
  }

  const remaining = (questions || [])
    .filter((question) => question?.id && !included.has(question.id))
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  return [...ordered, ...remaining];
}

function createQuestionReferenceResolver(questions = [], sections = []) {
  const orderedQuestions = buildCanonicalQuestionOrder(questions, sections);
  const idSet = new Set(
    orderedQuestions
      .map((question) => question?.id)
      .filter((questionId) => typeof questionId === "string" && questionId)
  );
  const idLowerMap = new Map(
    [...idSet].map((questionId) => [questionId.toLowerCase(), questionId])
  );
  const orderTokenMap = new Map();
  const labelMap = new Map();

  orderedQuestions.forEach((question, index) => {
    const orderToken = String(index + 1);
    if (!orderTokenMap.has(orderToken)) {
      orderTokenMap.set(orderToken, question.id);
      orderTokenMap.set(`q${orderToken}`, question.id);
    }

    const configuredOrder = Number.isFinite(question?.order)
      ? String(question.order)
      : null;
    if (configuredOrder && !orderTokenMap.has(configuredOrder)) {
      orderTokenMap.set(configuredOrder, question.id);
      orderTokenMap.set(`q${configuredOrder}`, question.id);
    }

    const labels = [
      question?.title,
      question?.text,
      question?.question,
      question?.label,
      question?.name,
      question?.prompt,
    ]
      .map((value) =>
        typeof value === "string" ? value.trim().toLowerCase() : ""
      )
      .filter(Boolean);

    for (const label of labels) {
      if (!labelMap.has(label)) {
        labelMap.set(label, question.id);
      }
    }
  });

  return (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (idSet.has(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();
    if (idLowerMap.has(lower)) return idLowerMap.get(lower);
    if (orderTokenMap.has(lower)) return orderTokenMap.get(lower);
    if (orderTokenMap.has(trimmed)) return orderTokenMap.get(trimmed);
    if (labelMap.has(lower)) return labelMap.get(lower);

    return value;
  };
}

function normalizeRuleQuestionReferences(rule, resolveQuestionReference) {
  if (!rule || typeof rule !== "object") return rule;
  const normalizedWhenQuestionId = resolveQuestionReference(
    rule.when?.questionId
  );
  const normalizedTargetQuestionId = resolveQuestionReference(
    rule.action?.targetQuestionId
  );
  const normalizedWhen =
    rule.when && typeof rule.when === "object"
      ? {
          ...rule.when,
          questionId: normalizedWhenQuestionId,
        }
      : rule.when;
  const normalizedAction =
    rule.action && typeof rule.action === "object"
      ? {
          ...rule.action,
          targetQuestionId: normalizedTargetQuestionId,
        }
      : rule.action;

  return {
    ...rule,
    when: normalizedWhen,
    action: normalizedAction,
  };
}

function normalizeNavigationActionType(actionType) {
  if (!actionType || typeof actionType !== "string") return null;
  const normalizedActionType = actionType.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalizedActionType === "end" || normalizedActionType === "end_survey") {
    return "terminate";
  }
  if (normalizedActionType === "jump_to_section") {
    return "jump";
  }
  return normalizedActionType;
}

/**
 * Get visible question IDs based on visibility rules and answers
 *
 * @param {Array} questions - All questions in survey
 * @param {Array} visibilityRules - Visibility rules to evaluate
 * @param {Map|Object} answers - Current response answers
 * @returns {Set} Set of visible question IDs
 */
export function getVisibleQuestionIds(
  questions,
  visibilityRules = [],
  answers = {}
) {
  if (!Array.isArray(questions)) return new Set();

  // Start with all questions visible.
  // Invariant: "show" rules are opt-in; if a question has any show rule,
  // it is hidden by default unless a condition evaluates true.
  const visible = new Set(questions.map((q) => q.id));

  if (Array.isArray(visibilityRules) && visibilityRules.length > 0) {
    // Filter rules that target questions
    const questionRules = visibilityRules
      .filter((rule) => rule.targetType === "question")
      .sort(compareRulesByPriorityAndKey);

    const showTargetIds = new Set(
      questionRules
        .filter((rule) => rule.effect === "show")
        .map((rule) => rule.targetId)
        .filter(Boolean)
    );

    for (const targetId of showTargetIds) {
      visible.delete(targetId);
    }

    // Apply rules
    for (const rule of questionRules) {
      const conditionMet = evaluateCondition(rule.when, answers);

      if (conditionMet) {
        if (rule.effect === "show") {
          visible.add(rule.targetId);
        } else if (rule.effect === "hide") {
          visible.delete(rule.targetId);
        }
      }
    }
  }

  // Apply legacy question-level logic (backward compatibility)
  for (const question of questions) {
    if (question.logic?.visibleIf) {
      const conditionMet = evaluateCondition(question.logic.visibleIf, answers);
      if (!conditionMet) {
        visible.delete(question.id);
      }
    }
  }

  return visible;
}

/**
 * Get visible section IDs based on visibility rules and answers
 *
 * @param {Array} sections - All sections in survey
 * @param {Array} visibilityRules - Visibility rules to evaluate
 * @param {Map|Object} answers - Current response answers
 * @returns {Set} Set of visible section IDs
 */
export function getVisibleSectionIds(
  sections,
  visibilityRules = [],
  answers = {}
) {
  if (!Array.isArray(sections)) return new Set();

  // Start with all sections visible.
  // Invariant: "show" rules are opt-in; if a section has any show rule,
  // it is hidden by default unless a condition evaluates true.
  const visible = new Set(sections.map((s) => s.id));

  if (!Array.isArray(visibilityRules) || visibilityRules.length === 0) {
    return visible;
  }

  // Filter rules that target sections
  const sectionRules = visibilityRules
    .filter((rule) => rule.targetType === "section")
    .sort(compareRulesByPriorityAndKey);

  const showTargetIds = new Set(
    sectionRules
      .filter((rule) => rule.effect === "show")
      .map((rule) => rule.targetId)
      .filter(Boolean)
  );

  for (const targetId of showTargetIds) {
    visible.delete(targetId);
  }

  // Apply rules
  for (const rule of sectionRules) {
    const conditionMet = evaluateCondition(rule.when, answers);

    if (conditionMet) {
      if (rule.effect === "show") {
        visible.add(rule.targetId);
      } else if (rule.effect === "hide") {
        visible.delete(rule.targetId);
      }
    }
  }

  return visible;
}

/**
 * Get answerable question IDs by intersecting question visibility with section visibility.
 * Questions in hidden sections are treated as non-applicable.
 *
 * @param {Array} questions
 * @param {Array} sections
 * @param {Set<string>|Array<string>} visibleQuestionIds
 * @param {Set<string>|Array<string>} visibleSectionIds
 * @returns {Set<string>}
 */
export function getAnswerableQuestionIds(
  questions = [],
  sections = [],
  visibleQuestionIds = new Set(),
  visibleSectionIds = new Set()
) {
  const questionVisibilitySet =
    visibleQuestionIds instanceof Set
      ? visibleQuestionIds
      : new Set(visibleQuestionIds || []);
  const sectionVisibilitySet =
    visibleSectionIds instanceof Set
      ? visibleSectionIds
      : new Set(visibleSectionIds || []);

  const sectionByQuestionId = new Map();
  for (const section of sections || []) {
    for (const questionId of section.questionIds || []) {
      sectionByQuestionId.set(questionId, section.id);
    }
  }

  const answerable = new Set();
  for (const question of questions || []) {
    if (!questionVisibilitySet.has(question.id)) continue;
    const sectionId =
      question.sectionId || sectionByQuestionId.get(question.id);
    if (
      !sectionId ||
      sectionVisibilitySet.size === 0 ||
      sectionVisibilitySet.has(sectionId)
    ) {
      answerable.add(question.id);
    }
  }
  return answerable;
}

/**
 * Get question IDs that belong to a set of section IDs.
 * Useful for visibility-aware validation when navigation skips sections.
 *
 * @param {Array} questions
 * @param {Array} sections
 * @param {Set<string>|Array<string>} sectionIds
 * @returns {Set<string>}
 */
export function getQuestionIdsInSections(
  questions = [],
  sections = [],
  sectionIds = new Set()
) {
  const sectionIdSet =
    sectionIds instanceof Set ? sectionIds : new Set(sectionIds || []);
  const sectionByQuestionId = new Map();

  for (const section of sections || []) {
    for (const questionId of section.questionIds || []) {
      sectionByQuestionId.set(questionId, section.id);
    }
  }

  const questionIds = new Set();
  for (const question of questions || []) {
    const sectionId =
      question.sectionId || sectionByQuestionId.get(question.id);
    if (sectionIdSet.has(sectionId)) {
      questionIds.add(question.id);
    }
  }

  return questionIds;
}

/**
 * Get next section ID based on navigation rules and current position
 * Now with circular jump protection
 *
 * Navigation semantics:
 * - Rules are evaluated in deterministic order (priority desc, then stable key order).
 * - First matching rule wins for the current navigation boundary.
 * - If no rule matches, fallback is next visible section in linear order.
 * - Visibility/show-hide evaluation is separate from navigation jumps.
 * - Forward-only policy is enforced by loop checks and safe early termination.
 *
 * @param {string} currentSectionId - Current section ID
 * @param {Array} sections - All sections in survey (ordered)
 * @param {Array} navigationRules - Navigation rules to evaluate
 * @param {Map|Object} answers - Current response answers
 * @param {Set} visibleSectionIds - Set of currently visible section IDs
 * @param {Set} visitHistory - Set of section IDs visited in this navigation chain (for loop detection)
 * @returns {string|null} Next section ID, or null if survey should end
 */
export function getNextSectionId(
  currentSectionId,
  sections,
  navigationRules = [],
  answers = {},
  visibleSectionIds,
  visitHistory = new Set()
) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  // CIRCULAR JUMP DETECTION
  if (visitHistory.has(currentSectionId)) {
    console.error(
      `[Logic Error] Circular navigation detected: ${[...visitHistory].join(
        " → "
      )} → ${currentSectionId}`
    );
    return null; // End survey instead of looping
  }

  // Add current section to history for this navigation chain
  const newHistory = new Set(visitHistory).add(currentSectionId);

  // Sort rules by priority (higher first)
  const sortedRules = (navigationRules || [])
    .filter((rule) => {
      // Rule applies if fromSectionId matches current or is null (global rule)
      return (
        rule.fromSectionId === currentSectionId || rule.fromSectionId === null
      );
    })
    .sort(compareNavigationRulesForRuntime);

  // Check navigation rules
  for (const rule of sortedRules) {
    const conditionMet = evaluateCondition(rule.when, answers);

    if (conditionMet) {
      const actionType = getRuleActionType(rule.action);
      if (actionType === "terminate") {
        return null; // End survey
      }
      if (actionType === "jump" && rule.action?.targetSectionId) {
        const targetSectionId = rule.action.targetSectionId;

        // Verify target section is visible
        if (!visibleSectionIds || visibleSectionIds.has(targetSectionId)) {
          // Check if jumping to target would create a loop
          if (newHistory.has(targetSectionId)) {
            console.warn(
              `[Logic Warning] Jump to "${targetSectionId}" would create loop, ending survey instead`
            );
            return null;
          }

          return targetSectionId;
        }
      }
    }
  }

  // Default: linear progression (next visible section)
  const currentIndex = sections.findIndex((s) => s.id === currentSectionId);
  if (currentIndex === -1) return null;

  // Find next visible section
  for (let i = currentIndex + 1; i < sections.length; i++) {
    const section = sections[i];
    if (!visibleSectionIds || visibleSectionIds.has(section.id)) {
      return section.id;
    }
  }

  return null; // No more sections
}

/**
 * Get previous section ID (for back navigation)
 *
 * @param {string} currentSectionId - Current section ID
 * @param {Array} sections - All sections in survey (ordered)
 * @param {Array} navigationHistory - Array of previously visited section IDs
 * @param {Set} visibleSectionIds - Set of currently visible section IDs
 * @returns {string|null} Previous section ID, or null if at start
 */
export function getPreviousSectionId(
  currentSectionId,
  sections,
  navigationHistory = [],
  visibleSectionIds
) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  // Use navigation history if available (handles non-linear flows)
  if (Array.isArray(navigationHistory) && navigationHistory.length > 0) {
    // Find last visited section before current
    for (let i = navigationHistory.length - 1; i >= 0; i--) {
      const sectionId = navigationHistory[i];
      if (sectionId !== currentSectionId) {
        // Verify section is still visible
        if (!visibleSectionIds || visibleSectionIds.has(sectionId)) {
          return sectionId;
        }
      }
    }
  }

  // Fallback: linear backward progression
  const currentIndex = sections.findIndex((s) => s.id === currentSectionId);
  if (currentIndex <= 0) return null;

  // Find previous visible section
  for (let i = currentIndex - 1; i >= 0; i--) {
    const section = sections[i];
    if (!visibleSectionIds || visibleSectionIds.has(section.id)) {
      return section.id;
    }
  }

  return null; // No previous section
}

/**
 * Get question IDs that should be validated for current section
 * (excludes hidden questions based on conditional logic)
 *
 * @param {string} sectionId - Section ID to get questions for
 * @param {Array} questions - All questions in survey
 * @param {Set} visibleQuestionIds - Set of visible question IDs
 * @returns {Array} Array of question IDs to validate
 */
export function getValidationQuestionIds(
  sectionId,
  questions,
  visibleQuestionIds
) {
  if (!Array.isArray(questions)) return [];

  return questions
    .filter((q) => q.sectionId === sectionId)
    .filter((q) => !visibleQuestionIds || visibleQuestionIds.has(q.id))
    .filter((q) => q.required) // Only required questions need validation
    .map((q) => q.id);
}

/**
 * Prune hidden question answers from response data
 * (removes answers for questions that are not visible)
 *
 * @param {Map|Object} answers - Response answers
 * @param {Set} visibleQuestionIds - Set of visible question IDs
 * @returns {Map|Object} Cleaned answers with only visible questions
 */
export function pruneHiddenAnswers(answers, visibleQuestionIds) {
  if (!visibleQuestionIds) return answers;

  if (answers instanceof Map) {
    const cleaned = new Map();
    for (const [questionId, value] of answers.entries()) {
      if (visibleQuestionIds.has(questionId)) {
        cleaned.set(questionId, value);
      }
    }
    return cleaned;
  }

  // Plain object
  const cleaned = {};
  for (const [questionId, value] of Object.entries(answers)) {
    if (visibleQuestionIds.has(questionId)) {
      cleaned[questionId] = value;
    }
  }
  return cleaned;
}

/**
 * Compute validation scope from required/visible/answered IDs.
 * Hidden or non-applicable required questions are excluded by design.
 *
 * @param {Object} params
 * @param {Array<string>} params.requiredQuestionIds
 * @param {Set<string>|Array<string>} params.visibleQuestionIds
 * @param {Array<string>} params.answeredQuestionIds
 * @returns {{requiredVisibleQuestionIds:Set<string>, missingRequiredQuestionIds:Set<string>}}
 */
export function getRequiredValidationSet({
  requiredQuestionIds = [],
  visibleQuestionIds = new Set(),
  answeredQuestionIds = [],
} = {}) {
  const visibleSet =
    visibleQuestionIds instanceof Set
      ? visibleQuestionIds
      : new Set(visibleQuestionIds || []);
  const answeredSet = new Set(answeredQuestionIds || []);

  const requiredVisibleQuestionIds = new Set(
    (requiredQuestionIds || []).filter((id) => visibleSet.has(id))
  );

  const missingRequiredQuestionIds = new Set(
    [...requiredVisibleQuestionIds].filter((id) => !answeredSet.has(id))
  );

  return { requiredVisibleQuestionIds, missingRequiredQuestionIds };
}

/**
 * Check if survey should auto-terminate based on answers
 *
 * @param {Array} navigationRules - Navigation rules to evaluate
 * @param {Map|Object} answers - Current response answers
 * @returns {boolean} True if survey should terminate early
 */
export function shouldTerminate(navigationRules = [], answers = {}) {
  if (!Array.isArray(navigationRules)) return false;

  // Check global termination rules (fromSectionId = null)
  const terminationRules = navigationRules
    .filter((rule) => {
      const actionType = getRuleActionType(rule.action);
      return actionType === "terminate" && rule.fromSectionId === null;
    })
    .sort(compareRulesByPriorityAndKey);

  for (const rule of terminationRules) {
    if (evaluateCondition(rule.when, answers)) {
      return true;
    }
  }

  return false;
}

function compareRuleEntries(entryA, entryB) {
  return compareRulesByPriorityAndKey(entryA?.rule, entryB?.rule);
}

/**
 * Compute visible questions within a section based on jump logic and current answers.
 * Hides questions skipped by jump_to_question rules when the branch condition is met.
 *
 * @param {Array} sectionQuestions - Questions in the current section
 * @param {Array} navigationRules - Navigation rules to evaluate
 * @param {Map|Object} answers - Current response answers
 * @param {string} currentSectionId - ID of the current section
 * @returns {Array} Array of visible questions (filtered)
 */
export function computeVisibleQuestionsInSection(
  sectionQuestions = [],
  navigationRules = [],
  answers = {},
  currentSectionId = null,
  allQuestions = []
) {
  if (!Array.isArray(sectionQuestions) || sectionQuestions.length === 0) {
    return sectionQuestions;
  }

  if (!Array.isArray(navigationRules) || navigationRules.length === 0) {
    return sectionQuestions;
  }

  const orderedQuestions = [...sectionQuestions];
  const resolveQuestionReference = createQuestionReferenceResolver(
    orderedQuestions,
    []
  );
  const normalizedNavigationRules = navigationRules.map((rule) =>
    normalizeRuleQuestionReferences(rule, resolveQuestionReference)
  );

  const indexByQuestionId = new Map(
    orderedQuestions.map((question, index) => [question.id, index])
  );
  const globalQuestionIdSet = new Set(
    (Array.isArray(allQuestions) ? allQuestions : [])
      .map((question) => question?.id)
      .filter((questionId) => typeof questionId === "string" && questionId)
  );

  const hiddenQuestionIds = new Set();

  const getComparableValues = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean);
    }
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized ? [normalized] : [];
  };
  const getQuestionOptionValues = (question) =>
    (question?.options || [])
      .map((option) => {
        if (typeof option === "string") return option;
        if (option && typeof option === "object") {
          return option.text || option.value || option.label || "";
        }
        return "";
      })
      .map((optionValue) => String(optionValue || "").trim().toLowerCase())
      .filter(Boolean);
  const inferSourceQuestionId = (rule) => {
    const sourceQuestionId = rule.when?.questionId;
    if (indexByQuestionId.has(sourceQuestionId)) {
      return sourceQuestionId;
    }

    const operator = String(rule.when?.operator || "").toLowerCase();
    if (operator !== "equals" && operator !== "in") {
      return sourceQuestionId;
    }

    const expectedValues = new Set(getComparableValues(rule.when?.value));
    if (expectedValues.size === 0) return sourceQuestionId;

    const candidates = orderedQuestions.filter((question) => {
      const optionValues = getQuestionOptionValues(question);
      return optionValues.some((optionValue) => expectedValues.has(optionValue));
    });

    return candidates.length === 1 ? candidates[0].id : sourceQuestionId;
  };
  const inferTargetQuestionId = (rule, sourceQuestionId) => {
    const sourceIndex = indexByQuestionId.get(sourceQuestionId);
    if (!Number.isFinite(sourceIndex)) return null;

    const normalizedOperator = String(rule.when?.operator || "").toLowerCase();
    if (!normalizedOperator) return null;
    const expectedValues = new Set(getComparableValues(rule.when?.value));
    if (expectedValues.size === 0) return null;

    const candidates = orderedQuestions.filter((question) => {
      const targetIndex = indexByQuestionId.get(question.id);
      if (!Number.isFinite(targetIndex) || targetIndex <= sourceIndex) {
        return false;
      }

      const visibleIf = question.logic?.visibleIf;
      if (!visibleIf || typeof visibleIf !== "object") return false;

      const visibilitySourceQuestionId = resolveQuestionReference(
        visibleIf.questionId
      );
      if (visibilitySourceQuestionId !== sourceQuestionId) return false;

      const visibilityOperator = String(visibleIf.operator || "").toLowerCase();
      if (!visibilityOperator) return false;

      const visibilityValues = new Set(getComparableValues(visibleIf.value));
      if (visibilityValues.size === 0) return false;

      const sameOperator =
        visibilityOperator === normalizedOperator ||
        (visibilityOperator === "in" && normalizedOperator === "equals") ||
        (visibilityOperator === "equals" && normalizedOperator === "in");
      if (!sameOperator) return false;

      for (const value of expectedValues) {
        if (visibilityValues.has(value)) return true;
      }
      return false;
    });

    return candidates.length === 1 ? candidates[0].id : null;
  };

  const localizedNavigationRules = normalizedNavigationRules.map((rule) => {
    const sourceQuestionId = inferSourceQuestionId(rule);
    let nextAction = rule.action;

    if (getRuleActionType(rule.action) === "jump_to_question") {
      const targetQuestionId = rule.action?.targetQuestionId;
      const hasLocalTarget = Number.isFinite(indexByQuestionId.get(targetQuestionId));

      if (!hasLocalTarget) {
        const inferredTargetQuestionId = inferTargetQuestionId(
          rule,
          sourceQuestionId
        );
        if (inferredTargetQuestionId) {
          nextAction = {
            ...rule.action,
            targetQuestionId: inferredTargetQuestionId,
          };
        }
      }
    }

    return {
      ...rule,
      when: rule.when
        ? {
            ...rule.when,
            questionId: sourceQuestionId,
          }
        : rule.when,
      action: nextAction,
    };
  });

  const relevantRules = localizedNavigationRules
    .filter((rule) => {
      const sourceQuestionId = rule.when?.questionId;
      const sourceInCurrentSection =
        sourceQuestionId !== undefined && indexByQuestionId.has(sourceQuestionId);
      const fromSectionMatches =
        rule.fromSectionId === currentSectionId ||
        rule.fromSectionId === null ||
        sourceInCurrentSection;
      const actionType = getRuleActionType(rule.action);
      const hasValidJumpAction =
        actionType === "jump_to_question" &&
        typeof rule.action?.targetQuestionId === "string";
      const hasValidSectionJumpAction =
        actionType === "jump" &&
        typeof rule.action?.targetSectionId === "string";
      const hasValidSkipAction =
        actionType === "skip" &&
        Number.isFinite(rule.action?.skipCount) &&
        rule.action.skipCount > 0;

      if (!fromSectionMatches) return false;
      return hasValidJumpAction || hasValidSectionJumpAction || hasValidSkipAction;
    })
    .sort(compareRulesByPriorityAndKey);

  const getAnswerValue = (questionId) =>
    answers instanceof Map ? answers.get(questionId) : answers[questionId];
  const hasAnswer = (questionId) => {
    const value = getAnswerValue(questionId);
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const rulesBySource = new Map();
  const skipRulesBySource = new Map();
  const hasExitRuleBySource = new Map();
  const hasExternalQuestionJumpBySource = new Map();
  for (const rule of relevantRules) {
    const actionType = getRuleActionType(rule.action);
    const sourceQuestionId = rule.when?.questionId;
    const sourceIndex = indexByQuestionId.get(sourceQuestionId);
    if (!sourceQuestionId || !Number.isFinite(sourceIndex)) {
      continue;
    }

    if (actionType === "jump") {
      const targetSectionId = rule.action?.targetSectionId;
      if (
        typeof targetSectionId === "string" &&
        targetSectionId &&
        targetSectionId !== currentSectionId
      ) {
        hasExitRuleBySource.set(sourceQuestionId, true);
      }
      continue;
    }

    if (actionType === "skip") {
      const skipCount = Number.isFinite(rule.action?.skipCount)
        ? Math.max(1, rule.action.skipCount)
        : 1;
      if (!skipRulesBySource.has(sourceQuestionId)) {
        skipRulesBySource.set(sourceQuestionId, []);
      }
      skipRulesBySource.get(sourceQuestionId).push({
        rule,
        sourceIndex,
        skipCount,
      });
      continue;
    }

    const targetQuestionId = rule.action?.targetQuestionId;
    const targetIndex = indexByQuestionId.get(targetQuestionId);
    const isExternalQuestionJump =
      typeof targetQuestionId === "string" &&
      targetQuestionId &&
      !Number.isFinite(targetIndex) &&
      globalQuestionIdSet.has(targetQuestionId);

    if (
      !targetQuestionId ||
      (!Number.isFinite(targetIndex) && !isExternalQuestionJump) ||
      (Number.isFinite(targetIndex) && targetIndex <= sourceIndex)
    ) {
      continue;
    }

    if (isExternalQuestionJump) {
      hasExternalQuestionJumpBySource.set(sourceQuestionId, true);
      continue;
    }

    if (!rulesBySource.has(sourceQuestionId)) {
      rulesBySource.set(sourceQuestionId, []);
    }
    rulesBySource.get(sourceQuestionId).push({
      rule,
      sourceIndex,
      targetIndex,
    });
  }

  const jumpSourceIds = new Set([
    ...rulesBySource.keys(),
    ...hasExitRuleBySource.keys(),
    ...hasExternalQuestionJumpBySource.keys(),
  ]);
  const orderedSources = [...jumpSourceIds].sort(
    (a, b) => (indexByQuestionId.get(a) || 0) - (indexByQuestionId.get(b) || 0)
  );

  for (const sourceQuestionId of orderedSources) {
    const sourceIndex = indexByQuestionId.get(sourceQuestionId);
    if (!Number.isFinite(sourceIndex) || hiddenQuestionIds.has(sourceQuestionId)) {
      continue;
    }

    const sourceRules = (rulesBySource.get(sourceQuestionId) || []).sort(
      compareRuleEntries
    );
    // Branch-window hiding is only for in-section question-target branches.
    // Cross-section jumps do not define local branch windows.
    if (sourceRules.length === 0) {
      continue;
    }

    const branchEndIndex =
      sourceRules.length > 0
        ? Math.max(
            sourceIndex + 1,
            ...sourceRules.map((entry) => entry.targetIndex)
          )
        : sourceIndex + 1;

    if (!hasAnswer(sourceQuestionId)) {
      for (
        let questionIndex = sourceIndex + 1;
        questionIndex < orderedQuestions.length;
        questionIndex += 1
      ) {
        const questionToHide = orderedQuestions[questionIndex];
        if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
      }
      continue;
    }

    const matchedRule = sourceRules.find((entry) =>
      evaluateCondition(entry.rule.when, answers)
    );

    if (matchedRule) {
      for (
        let questionIndex = sourceIndex + 1;
        questionIndex < matchedRule.targetIndex;
        questionIndex += 1
      ) {
        const questionToHide = orderedQuestions[questionIndex];
        if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
      }

      let blockFollowing = false;
      for (
        let questionIndex = matchedRule.targetIndex + 1;
        questionIndex <= branchEndIndex;
        questionIndex += 1
      ) {
        if (blockFollowing) {
          const questionToHide = orderedQuestions[questionIndex];
          if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
          continue;
        }

        const previousQuestion = orderedQuestions[questionIndex - 1];
        if (!previousQuestion || !hasAnswer(previousQuestion.id)) {
          const questionToHide = orderedQuestions[questionIndex];
          if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
          blockFollowing = true;
        }
      }
      for (const sourceRule of sourceRules) {
        if (sourceRule.targetIndex !== matchedRule.targetIndex) {
          const siblingTarget = orderedQuestions[sourceRule.targetIndex];
          if (siblingTarget) hiddenQuestionIds.add(siblingTarget.id);
        }
      }
      continue;
    }

    if (
      hasExitRuleBySource.get(sourceQuestionId) ||
      hasExternalQuestionJumpBySource.get(sourceQuestionId)
    ) {
      for (
        let questionIndex = sourceIndex + 1;
        questionIndex < orderedQuestions.length;
        questionIndex += 1
      ) {
        const questionToHide = orderedQuestions[questionIndex];
        if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
      }
      continue;
    }

    for (const sourceRule of sourceRules) {
      const targetQuestion = orderedQuestions[sourceRule.targetIndex];
      if (targetQuestion) hiddenQuestionIds.add(targetQuestion.id);
    }
  }

  const orderedSkipSources = [...skipRulesBySource.keys()].sort(
    (a, b) => (indexByQuestionId.get(a) || 0) - (indexByQuestionId.get(b) || 0)
  );

  for (const sourceQuestionId of orderedSkipSources) {
    const sourceIndex = indexByQuestionId.get(sourceQuestionId);
    if (!Number.isFinite(sourceIndex) || hiddenQuestionIds.has(sourceQuestionId)) {
      continue;
    }
    if (!hasAnswer(sourceQuestionId)) continue;

    const sourceRules = skipRulesBySource
      .get(sourceQuestionId)
      .sort(compareRuleEntries);
    const matchedRule = sourceRules.find((entry) =>
      evaluateCondition(entry.rule.when, answers)
    );
    if (!matchedRule) continue;

    for (
      let questionIndex = sourceIndex + 1;
      questionIndex <= sourceIndex + matchedRule.skipCount;
      questionIndex += 1
    ) {
      const questionToHide = orderedQuestions[questionIndex];
      if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
    }
  }

  const exitRules = relevantRules
    .filter((rule) => {
      const actionType = getRuleActionType(rule.action);
      const sourceQuestionId = rule.when?.questionId;
      const sourceIndex = indexByQuestionId.get(sourceQuestionId);
      if (!sourceQuestionId || !Number.isFinite(sourceIndex)) return false;

      // Cross-section section jumps should not hide local follow-up questions.
      if (actionType === "jump") return false;

      if (actionType === "jump_to_question") {
        const targetQuestionId = rule.action?.targetQuestionId;
        const targetIndex = indexByQuestionId.get(targetQuestionId);
        const isExternalQuestionJump =
          typeof targetQuestionId === "string" &&
          targetQuestionId &&
          !Number.isFinite(targetIndex) &&
          globalQuestionIdSet.has(targetQuestionId);
        return (
          isExternalQuestionJump
        );
      }

      return false;
    })
    .sort(compareRulesByPriorityAndKey);

  for (const rule of exitRules) {
    const sourceQuestionId = rule.when?.questionId;
    const sourceIndex = indexByQuestionId.get(sourceQuestionId);
    if (!Number.isFinite(sourceIndex) || hiddenQuestionIds.has(sourceQuestionId)) {
      continue;
    }
    if (!hasAnswer(sourceQuestionId)) continue;
    if (!evaluateCondition(rule.when, answers)) continue;

    for (
      let questionIndex = sourceIndex + 1;
      questionIndex < orderedQuestions.length;
      questionIndex += 1
    ) {
      const questionToHide = orderedQuestions[questionIndex];
      if (questionToHide) hiddenQuestionIds.add(questionToHide.id);
    }
    break;
  }

  if (hiddenQuestionIds.size === 0) {
    return sectionQuestions;
  }

  return sectionQuestions.filter(
    (question) => !hiddenQuestionIds.has(question.id)
  );
}
