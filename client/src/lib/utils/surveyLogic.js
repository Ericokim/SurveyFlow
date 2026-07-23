/**
 * Survey Logic Utilities
 *
 * Helper functions to convert between simple per-answer logic UI
 * and the existing visibilityRules/navigationRules format.
 *
 * This maintains backward compatibility while adding a simpler UX layer.
 */

/**
 * Data Structure Reference:
 *
 * SECTIONS:
 * {
 *   id: string (UUID),
 *   title: string,
 *   description: string,
 *   questionIds: string[] (question IDs in this section)
 * }
 *
 * QUESTIONS:
 * {
 *   id: string,
 *   type: 'single_choice' | 'multiple_choice' | 'rating' | ...,
 *   title: string,
 *   options: string[] | { id, text, value }[],
 *   // NEW: Simple navigation per option (optional)
 *   navigation?: {
 *     [optionId]: {
 *       action: 'continue' | 'jump_to_section' | 'skip' | 'end_survey',
 *       targetSectionId?: string,
 *       skipCount?: number
 *     }
 *   }
 * }
 *
 * VISIBILITY RULES (existing format):
 * {
 *   id: string,
 *   targetType: 'question' | 'section',
 *   targetId: string,
 *   effect: 'show' | 'hide',
 *   when: {
 *     questionId: string,
 *     operator: 'equals' | 'not_equals' | ...,
 *     value: any
 *   }
 * }
 *
 * NAVIGATION RULES (existing format):
 * {
 *   id: string,
 *   fromSectionId: string,
 *   when: {
 *     questionId: string,
 *     operator: string,
 *     value: any
 *   },
 *   action: 'jump_to_section' | 'end_survey',
 *   targetSectionId?: string
 * }
 */

/**
 * Convert simple per-option navigation to navigation rules
 * @param {string} questionId - Question ID
 * @param {string} optionId - Option ID or value
 * @param {object} navigation - { action, targetSectionId?, skipCount? }
 * @param {string} currentSectionId - Section containing the question
 * @returns {object} Navigation rule in existing format
 */
export function createNavigationRuleFromSimpleLogic(
  questionId,
  optionId,
  navigation,
  currentSectionId
) {
  const { action, targetSectionId, skipCount } = navigation;

  const rule = {
    id: `nav_${questionId}_${optionId}`,
    fromSectionId: currentSectionId,
    when: {
      questionId,
      operator: "equals",
      value: optionId,
    },
  };

  switch (action) {
    case "jump_to_section":
      return {
        ...rule,
        action: "jump_to_section",
        targetSectionId,
      };

    case "skip":
      // Skip is handled by jumping to a calculated section
      return {
        ...rule,
        action: "skip",
        skipCount: skipCount || 1,
      };

    case "end_survey":
      return {
        ...rule,
        action: "end_survey",
      };

    case "continue":
    default:
      // No rule needed for continue (default behavior)
      return null;
  }
}

/**
 * Convert simple visibility condition to visibility rule
 * @param {string} targetQuestionId - Question to show/hide
 * @param {string} sourceQuestionId - Question to check
 * @param {string} operator - Comparison operator
 * @param {any} value - Value to compare against
 * @returns {object} Visibility rule
 */
export function createVisibilityRuleFromSimpleCondition(
  targetQuestionId,
  sourceQuestionId,
  operator,
  value
) {
  return {
    id: `vis_${targetQuestionId}_${sourceQuestionId}`,
    targetType: "question",
    targetId: targetQuestionId,
    effect: "show",
    when: {
      questionId: sourceQuestionId,
      operator: operator || "equals",
      value,
    },
    priority: 0,
  };
}

/**
 * Get simple navigation for an option from existing navigation rules
 * @param {string} questionId - Question ID
 * @param {string} optionId - Option ID or value
 * @param {array} navigationRules - Existing navigation rules
 * @returns {object|null} Simple navigation object or null
 */
export function getSimpleNavigationForOption(
  questionId,
  optionId,
  navigationRules = []
) {
  const rule = navigationRules.find(
    (r) =>
      r.when?.questionId === questionId &&
      r.when?.operator === "equals" &&
      r.when?.value === optionId
  );

  if (!rule) return null;

  switch (rule.action) {
    case "jump_to_section":
      return {
        action: "jump_to_section",
        targetSectionId: rule.targetSectionId,
      };

    case "skip":
      return {
        action: "skip",
        skipCount: rule.skipCount || 1,
      };

    case "end_survey":
      return {
        action: "end_survey",
      };

    default:
      return null;
  }
}

/**
 * Get simple visibility condition for a question from existing visibility rules
 * @param {string} questionId - Question ID to check
 * @param {array} visibilityRules - Existing visibility rules
 * @returns {object|null} Simple condition or null
 */
export function getSimpleVisibilityForQuestion(
  questionId,
  visibilityRules = []
) {
  const rule = visibilityRules.find(
    (r) =>
      r.targetType === "question" &&
      r.targetId === questionId &&
      r.effect === "show"
  );

  if (!rule || !rule.when) return null;

  return {
    sourceQuestionId: rule.when.questionId,
    operator: rule.when.operator,
    value: rule.when.value,
  };
}

/**
 * Update navigation rules when simple logic changes
 * @param {array} existingRules - Current navigation rules
 * @param {string} questionId - Question being updated
 * @param {string} optionId - Option being updated
 * @param {object|null} navigation - New navigation or null to remove
 * @param {string} currentSectionId - Section containing question
 * @returns {array} Updated navigation rules
 */
export function updateNavigationRulesWithSimpleLogic(
  existingRules,
  questionId,
  optionId,
  navigation,
  currentSectionId
) {
  // Remove existing rule for this question/option
  const filteredRules = existingRules.filter(
    (r) =>
      !(
        r.when?.questionId === questionId &&
        r.when?.operator === "equals" &&
        r.when?.value === optionId
      )
  );

  // Add new rule if navigation is provided
  if (navigation && navigation.action !== "continue") {
    const newRule = createNavigationRuleFromSimpleLogic(
      questionId,
      optionId,
      navigation,
      currentSectionId
    );
    if (newRule) {
      filteredRules.push(newRule);
    }
  }

  return filteredRules;
}

/**
 * Update visibility rules when simple condition changes
 * @param {array} existingRules - Current visibility rules
 * @param {string} targetQuestionId - Question to show/hide
 * @param {object|null} condition - New condition or null to remove
 * @returns {array} Updated visibility rules
 */
export function updateVisibilityRulesWithSimpleCondition(
  existingRules,
  targetQuestionId,
  condition
) {
  // Remove existing rules for this target question
  const filteredRules = existingRules.filter(
    (r) => !(r.targetType === "question" && r.targetId === targetQuestionId)
  );

  // Add new rule if condition is provided
  if (condition) {
    const newRule = createVisibilityRuleFromSimpleCondition(
      targetQuestionId,
      condition.sourceQuestionId,
      condition.operator,
      condition.value
    );
    filteredRules.push(newRule);
  }

  return filteredRules;
}

/**
 * Get all navigation rules as plain English descriptions
 * @param {array} navigationRules - Navigation rules
 * @param {array} questions - All questions
 * @param {array} sections - All sections
 * @returns {array} Array of { text, questionId, ruleId }
 */
export function getNavigationRuleSummary(navigationRules, questions, sections) {
  return navigationRules.map((rule) => {
    const question = questions.find((q) => q.id === rule.when?.questionId);
    const questionTitle = question?.title || "Unknown Question";
    const optionValue = rule.when?.value || "";

    let actionText = "";
    switch (rule.action) {
      case "jump_to_section":
        const targetSection = sections.find(
          (s) => s.id === rule.targetSectionId
        );
        actionText = `Jump to "${targetSection?.title || "Unknown Section"}"`;
        break;
      case "skip":
        actionText = `Skip next ${rule.skipCount || 1} question(s)`;
        break;
      case "end_survey":
        actionText = "End survey";
        break;
      default:
        actionText = "Continue";
    }

    return {
      text: `If "${questionTitle}" = "${optionValue}" → ${actionText}`,
      questionId: rule.when?.questionId,
      ruleId: rule.id,
    };
  });
}

/**
 * Get all visibility rules as plain English descriptions
 * @param {array} visibilityRules - Visibility rules
 * @param {array} questions - All questions
 * @returns {array} Array of { text, questionId, ruleId }
 */
export function getVisibilityRuleSummary(visibilityRules, questions) {
  return visibilityRules
    .filter((r) => r.targetType === "question")
    .map((rule) => {
      const targetQuestion = questions.find((q) => q.id === rule.targetId);
      const sourceQuestion = questions.find(
        (q) => q.id === rule.when?.questionId
      );

      const targetTitle = targetQuestion?.title || "Unknown Question";
      const sourceTitle = sourceQuestion?.title || "Unknown Question";
      const operator =
        rule.when?.operator === "equals" ? "=" : rule.when?.operator;
      const value = rule.when?.value || "";

      return {
        text: `"${targetTitle}" only shows if "${sourceTitle}" ${operator} "${value}"`,
        questionId: rule.targetId,
        ruleId: rule.id,
      };
    });
}

/**
 * Validate navigation rules for loops and unreachable sections
 * @param {array} navigationRules - Navigation rules to validate
 * @param {array} sections - All sections
 * @returns {object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateNavigationRules(navigationRules, sections) {
  const errors = [];
  const warnings = [];

  // Check for backward jumps (potential loops)
  navigationRules.forEach((rule) => {
    if (rule.action === "jump_to_section") {
      const fromIndex = sections.findIndex((s) => s.id === rule.fromSectionId);
      const toIndex = sections.findIndex((s) => s.id === rule.targetSectionId);

      if (fromIndex !== -1 && toIndex !== -1 && toIndex <= fromIndex) {
        warnings.push(
          `Rule jumps backward from section ${fromIndex + 1} to ${toIndex + 1}. This could create a loop.`
        );
      }
    }
  });

  // Check for unreachable sections (sections that are always skipped)
  // This is a simplified check - a full check would require graph traversal
  const reachableSections = new Set([sections[0]?.id]); // First section is always reachable
  navigationRules.forEach((rule) => {
    if (rule.action === "jump_to_section") {
      reachableSections.add(rule.targetSectionId);
    }
  });

  sections.forEach((section, index) => {
    if (index > 0 && !reachableSections.has(section.id)) {
      warnings.push(
        `Section "${section.title}" may be unreachable. No logic rules lead to it.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
