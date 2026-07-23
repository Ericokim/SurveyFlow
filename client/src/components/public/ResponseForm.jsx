import { useMemo, useState, useEffect, useRef } from "react";
import { QuestionRenderer } from "../renderer/QuestionRenderer";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription } from "../ui/alert";
import { RichTextContent } from "../shared/RichTextContent";
import { Eye, Info, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAnswerableQuestionIds,
  getNextSectionId,
  getVisibleQuestionIds,
  getVisibleSectionIds,
  getRequiredValidationSet,
  getPreviousSectionId,
  evaluateNavigationAction,
  computeVisibleQuestionsInSection,
  computeVisibleQuestionsForQuestionFlow,
  getOrphanedAnswerKeys,
} from "../../lib/utils/logicEngine";
import { shouldAutoSubmitEmptySection } from "../../lib/utils/responseNavigation";
import { stableShuffle } from "../../lib/utils/randomization";

const BUILT_IN_TEXT_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  url: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[^\s]*)?$/i,
  numeric: /^\d+(\.\d+)?$/,
  number: /^\d+(\.\d+)?$/,
  integer: /^\d+$/,
  alphanumeric: /^[a-z0-9 ]+$/i,
};

function getTextPatternValidation(question = {}) {
  const predefined = question?.validation?.predefinedPattern;
  const pattern = question?.validation?.pattern;
  const configured = predefined || pattern;

  if (!configured || typeof configured !== "string") return null;

  const normalized = configured.trim().toLowerCase();
  if (BUILT_IN_TEXT_PATTERNS[normalized]) {
    const label = normalized === "number" ? "numeric" : normalized;
    return { regex: BUILT_IN_TEXT_PATTERNS[normalized], label };
  }

  if (!predefined && pattern) {
    try {
      return { regex: new RegExp(pattern), label: "required format" };
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeAnswerForPattern(answer, label) {
  if (typeof answer !== "string") return "";
  const trimmed = answer.trim();
  if (label === "phone") {
    // Allow user-friendly separators while validating against E.164 shape.
    return trimmed.replace(/[\s()-]/g, "");
  }
  return trimmed;
}

function normalizeSavedNavigationState(navigation = {}) {
  const currentSectionIndex = Number.isFinite(navigation?.currentSectionIndex)
    ? navigation.currentSectionIndex
    : Number.isFinite(navigation?.index)
      ? navigation.index
      : 0;

  return {
    currentSectionIndex: Math.max(0, currentSectionIndex),
    history: Array.isArray(navigation?.history)
      ? navigation.history.filter(
          (value) => typeof value === "string" && value.trim()
        )
      : [],
    jumpChain: Array.isArray(navigation?.jumpChain)
      ? navigation.jumpChain.filter(
          (value) => typeof value === "string" && value.trim()
        )
      : [],
    currentQuestionId:
      typeof navigation?.currentQuestionId === "string" &&
      navigation.currentQuestionId.trim()
        ? navigation.currentQuestionId.trim()
        : null,
    questionFlowHistory: Array.isArray(navigation?.questionFlowHistory)
      ? navigation.questionFlowHistory.filter(
          (value) => typeof value === "string" && value.trim()
        )
      : [],
    sectionEntryQuestionId:
      typeof navigation?.sectionEntryQuestionId === "string" &&
      navigation.sectionEntryQuestionId.trim()
        ? navigation.sectionEntryQuestionId.trim()
        : null,
  };
}

/**
 * Response Form
 * Survey form with QuestionRenderer integration
 */

export function ResponseForm({
  survey,
  onSubmit,
  onSaveProgress,
  isSubmitting,
  mode = "live",
  storageScope = "anon",
  initialDraft = null,
}) {
  const buildNavigationRuleKey = (rule = {}) => {
    const fromSectionId = rule.fromSectionId ?? "__no_section__";
    const questionId = rule.when?.questionId || "__no_question__";
    const operator = rule.when?.operator || "__no_operator__";
    const valueToken = JSON.stringify(rule.when?.value ?? null);
    return `${fromSectionId}::${questionId}::${operator}::${valueToken}`;
  };

  const brandColor =
    typeof survey.themeColor === "string" && survey.themeColor.trim()
      ? survey.themeColor.trim()
      : null;
  const normalizeLogoUrl = (value) => {
    if (!value) return "";
    const normalized =
      value.startsWith("http") ||
      value.startsWith("/") ||
      value.startsWith("data:") ||
      value.startsWith("blob:")
        ? value
        : `/${value}`;
    return normalized;
  };
  const surveyVersionToken = useMemo(() => {
    const runtimeVersion = Number(survey?.version);
    if (Number.isFinite(runtimeVersion) && runtimeVersion >= 0) {
      return `v${runtimeVersion}`;
    }

    const publishedVersion = Number(survey?.publishedVersion);
    if (Number.isFinite(publishedVersion) && publishedVersion >= 0) {
      return `v${publishedVersion}`;
    }

    const currentVersion = Number(survey?.currentVersion);
    if (Number.isFinite(currentVersion) && currentVersion >= 0) {
      return `v${currentVersion}`;
    }

    return "v0";
  }, [survey?.version, survey?.publishedVersion, survey?.currentVersion]);
  const shouldResetLiveState = useMemo(() => {
    if (mode !== "live" || typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset") === "1" || params.get("view") === "1";
  }, [mode]);

  // Load saved answers from localStorage on mount
  const draftKey = `survey_draft_${survey.publicId}_${surveyVersionToken}_${storageScope}`;
  const navigationKey = `${draftKey}_nav`;
  const getSavedNavigation = () => {
    if (mode !== "live" || shouldResetLiveState) return null;
    try {
      const saved = localStorage.getItem(navigationKey);
      return saved ? normalizeSavedNavigationState(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  };
  const hasMeaningfulDraftAnswers = (draft = {}) =>
    Object.values(draft || {}).some((value) => isAnswerProvided(value));
  const serverDraftAnswers =
    initialDraft && typeof initialDraft.answers === "object"
      ? initialDraft.answers
      : {};
  const serverNavigation = normalizeSavedNavigationState(
    initialDraft?.navigation || {}
  );
  const hasServerResume = Boolean(initialDraft?.responseId);
  const [answers, setAnswers] = useState(() => {
    if (mode === "live") {
      if (shouldResetLiveState) return {};
      if (hasServerResume) return serverDraftAnswers;
      try {
        const saved = localStorage.getItem(draftKey);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [errors, setErrors] = useState({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(() => {
    if (mode !== "live") return 0;
    if (shouldResetLiveState) return 0;
    if (hasServerResume) {
      return serverNavigation.currentSectionIndex;
    }
    let savedDraft = {};
    try {
      const rawDraft = localStorage.getItem(draftKey);
      savedDraft = rawDraft ? JSON.parse(rawDraft) : {};
    } catch {
      savedDraft = {};
    }
    if (!hasMeaningfulDraftAnswers(savedDraft)) return 0;
    const saved = getSavedNavigation();
    return Number.isFinite(saved?.currentSectionIndex)
      ? saved.currentSectionIndex
      : 0;
  });
  const [navigationHistory, setNavigationHistory] = useState(() => {
    if (mode !== "live") return [];
    if (shouldResetLiveState) return [];
    if (hasServerResume) {
      return serverNavigation.history;
    }
    let savedDraft = {};
    try {
      const rawDraft = localStorage.getItem(draftKey);
      savedDraft = rawDraft ? JSON.parse(rawDraft) : {};
    } catch {
      savedDraft = {};
    }
    if (!hasMeaningfulDraftAnswers(savedDraft)) return [];
    const saved = getSavedNavigation();
    return Array.isArray(saved?.history) ? saved.history : [];
  });
  const [jumpChain, setJumpChain] = useState(() => {
    if (mode !== "live") return [];
    if (shouldResetLiveState) return [];
    if (hasServerResume) {
      return serverNavigation.jumpChain;
    }
    let savedDraft = {};
    try {
      const rawDraft = localStorage.getItem(draftKey);
      savedDraft = rawDraft ? JSON.parse(rawDraft) : {};
    } catch {
      savedDraft = {};
    }
    if (!hasMeaningfulDraftAnswers(savedDraft)) return [];
    const saved = getSavedNavigation();
    return Array.isArray(saved?.jumpChain) ? saved.jumpChain : [];
  }); // Track section IDs in current jump sequence
  const [questionFlowHistory, setQuestionFlowHistory] = useState(() =>
    hasServerResume ? serverNavigation.questionFlowHistory : []
  );
  const [currentQuestionId, setCurrentQuestionId] = useState(() =>
    hasServerResume ? serverNavigation.currentQuestionId : null
  );
  const [pendingJumpQuestionId, setPendingJumpQuestionId] = useState(null);
  const [sectionEntryQuestionId, setSectionEntryQuestionId] = useState(() =>
    hasServerResume ? serverNavigation.sectionEntryQuestionId : null
  );
  const [previousVisibleQuestions, setPreviousVisibleQuestions] = useState([]);
  const [displayProgress, setDisplayProgress] = useState(0);
  const answersRef = useRef(answers);
  const hasInitializedEmptyDraftResetRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const MotionDiv = motion.div;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (mode !== "live" || !shouldResetLiveState) return;
    localStorage.removeItem(draftKey);
    localStorage.removeItem(navigationKey);
  }, [mode, shouldResetLiveState, draftKey, navigationKey]);

  const clearDraft = () => {
    if (mode === "live") {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(navigationKey);
    }
  };

  // Auto-save to localStorage when answers change
  useEffect(() => {
    if (mode === "live" && Object.keys(answers).length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    }
  }, [answers, mode, draftKey]);

  useEffect(() => {
    hasInitializedEmptyDraftResetRef.current = false;
  }, [navigationKey]);

  useEffect(() => {
    if (mode === "live") {
      localStorage.setItem(
        navigationKey,
        JSON.stringify({
          currentSectionIndex,
          history: navigationHistory,
          jumpChain,
          currentQuestionId,
          questionFlowHistory,
          sectionEntryQuestionId,
        })
      );
    }
  }, [
    mode,
    navigationKey,
    currentSectionIndex,
    navigationHistory,
    jumpChain,
    currentQuestionId,
    questionFlowHistory,
    sectionEntryQuestionId,
  ]);

  // If there are no meaningful draft answers, always start from section 1.
  useEffect(() => {
    if (mode !== "live") return;
    if (hasInitializedEmptyDraftResetRef.current) return;
    hasInitializedEmptyDraftResetRef.current = true;
    const hasDraftAnswers = hasMeaningfulDraftAnswers(answers);
    if (hasDraftAnswers) return;
    if (
      currentSectionIndex !== 0 ||
      navigationHistory.length > 0 ||
      jumpChain.length > 0
    ) {
      setCurrentSectionIndex(0);
      setNavigationHistory([]);
      setJumpChain([]);
      localStorage.removeItem(navigationKey);
    }
  }, [
    mode,
    answers,
    currentSectionIndex,
    navigationHistory.length,
    jumpChain.length,
    navigationKey,
  ]);

  // Determine presentation mode
  const sections = useMemo(() => survey.sections || [], [survey.sections]);
  const hasPageBreak = sections.some((section) => section.pageBreak);
  const presentationMode = survey.settings?.presentationMode;
  const isPreviewMode = mode === "preview";

  // Check if survey is explicitly sectional (fallback to section count for backward compatibility)
  const isSectional = survey.settings?.isSectional ?? sections.length > 1;

  // Only activate multi-step if survey is sectional
  const isMultiStep =
    isSectional &&
    (presentationMode
      ? presentationMode === "multi_step" ||
        (isPreviewMode && sections.length > 1)
      : hasPageBreak || sections.length > 1);

  const questions = useMemo(() => {
    const qs = survey.questions || [];
    return qs;
  }, [survey.questions]);
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );
  const visibilityRules = useMemo(
    () => survey.visibilityRules || [],
    [survey.visibilityRules]
  );
  const navigationRules = useMemo(() => {
    const questionIdSet = new Set(
      questions
        .map((question) => question?.id)
        .filter((questionId) => typeof questionId === "string" && questionId)
    );
    const questionIdLowerMap = new Map(
      [...questionIdSet].map((questionId) => [
        questionId.toLowerCase(),
        questionId,
      ])
    );
    const orderedQuestions = (() => {
      const questionById = new Map(
        questions
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
      const remaining = questions
        .filter((question) => question?.id && !included.has(question.id))
        .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
      return [...ordered, ...remaining];
    })();
    const orderTokenMap = new Map();
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
    });
    const questionByLabel = new Map();
    for (const question of questions) {
      const labelCandidates = [
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
      for (const label of labelCandidates) {
        if (!questionByLabel.has(label)) {
          questionByLabel.set(label, question.id);
        }
      }
    }

    const resolveQuestionReference = (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (!trimmed) return value;
      if (questionIdSet.has(trimmed)) return trimmed;
      const lower = trimmed.toLowerCase();
      if (questionIdLowerMap.has(lower)) return questionIdLowerMap.get(lower);
      if (orderTokenMap.has(lower)) return orderTokenMap.get(lower);
      if (orderTokenMap.has(trimmed)) return orderTokenMap.get(trimmed);
      const byLabel = questionByLabel.get(lower);
      return byLabel || value;
    };

    const normalizeRuleQuestionReferences = (rule) => {
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
    };

    const surveyRules = survey.navigationRules || [];

    // Also extract rules from question options (common pattern)
    const questionOptionRules = [];
    questions.forEach((question) => {
      if (question.options) {
        question.options.forEach((option) => {
          if (option.logic && option.logic.action) {
            const isMultipleChoice = question.type === "multiple_choice";
            questionOptionRules.push({
              id: `${question.id}_${option.text}`,
              fromSectionId: question.sectionId || null,
              when: {
                questionId: question.id,
                operator: isMultipleChoice ? "in" : "equals",
                value: isMultipleChoice ? [option.text] : option.text,
              },
              action: option.logic.action,
              priority: option.logic.priority || 0,
            });
          }
        });
      }
    });

    // Merge by condition key, keeping navigationRules as canonical and only
    // allowing option-level rules to override stale survey-level copies
    // for the same condition.
    const mergedByCondition = new Map();
    for (const rule of surveyRules) {
      const normalizedRule = normalizeRuleQuestionReferences(rule);
      mergedByCondition.set(
        buildNavigationRuleKey(normalizedRule),
        normalizedRule
      );
    }
    for (const rule of questionOptionRules) {
      const normalizedRule = normalizeRuleQuestionReferences(rule);
      const conditionKey = buildNavigationRuleKey(normalizedRule);
      mergedByCondition.set(conditionKey, normalizedRule);
    }

    return [...mergedByCondition.values()];
  }, [survey.navigationRules, questions, sections]);

  const isQuestionFlow =
    !isSectional && !isMultiStep && navigationRules.length > 0;

  // Calculate visible questions and sections based on current answers
  const visibleQuestionIds = useMemo(
    () => getVisibleQuestionIds(questions, visibilityRules, answers, mode),
    [questions, visibilityRules, answers, mode]
  );

  const visibleSectionIds = useMemo(
    () => getVisibleSectionIds(sections, visibilityRules, answers),
    [sections, visibilityRules, answers]
  );
  const answerableQuestionIds = useMemo(
    () =>
      getAnswerableQuestionIds(
        questions,
        sections,
        visibleQuestionIds,
        visibleSectionIds
      ),
    [questions, sections, visibleQuestionIds, visibleSectionIds]
  );

  const orderedVisibleQuestions = useMemo(() => {
    const sectionOrder = [...sections].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    const authoredQuestionIds = [];
    const authoredQuestionIdSet = new Set();

    for (const section of sectionOrder) {
      for (const questionId of section.questionIds || []) {
        if (!authoredQuestionIdSet.has(questionId)) {
          authoredQuestionIdSet.add(questionId);
          authoredQuestionIds.push(questionId);
        }
      }
    }

    const remainingQuestions = questions
      .filter((q) => !authoredQuestionIdSet.has(q.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q) => q.id);

    const runtimeOrder = [...authoredQuestionIds, ...remainingQuestions];
    const orderMap = new Map(runtimeOrder.map((id, index) => [id, index]));

    let sortedQuestions = questions
      .filter((q) => answerableQuestionIds.has(q.id))
      .sort((a, b) => {
        const aIndex = orderMap.has(a.id)
          ? orderMap.get(a.id)
          : Number.MAX_SAFE_INTEGER;
        const bIndex = orderMap.has(b.id)
          ? orderMap.get(b.id)
          : Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return (a.order || 0) - (b.order || 0);
      });

    if (isQuestionFlow && navigationRules.length > 0) {
      sortedQuestions = computeVisibleQuestionsForQuestionFlow(
        sortedQuestions,
        navigationRules,
        answers
      );
    }

    return sortedQuestions;
  }, [
    questions,
    sections,
    answerableQuestionIds,
    isQuestionFlow,
    navigationRules,
    answers,
  ]);
  const orderedVisibleQuestionIndexMap = useMemo(
    () =>
      new Map(
        orderedVisibleQuestions.map((question, index) => [question.id, index])
      ),
    [orderedVisibleQuestions]
  );

  // Get visible sections array (ordered)
  const visibleSections = useMemo(() => {
    return sections
      .filter((s) => visibleSectionIds.has(s.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [sections, visibleSectionIds]);
  const activeSectionIndex = useMemo(() => {
    if (!isMultiStep || visibleSections.length === 0) return 0;
    return Math.min(
      currentSectionIndex,
      Math.max(0, visibleSections.length - 1)
    );
  }, [isMultiStep, visibleSections.length, currentSectionIndex]);

  // Current section (for multi-step mode)
  const currentSection =
    isMultiStep && visibleSections.length > 0
      ? visibleSections[activeSectionIndex]
      : null;
  const hasBack = isMultiStep && activeSectionIndex > 0;

  // Get questions for current view
  const currentQuestions = useMemo(() => {
    if (isQuestionFlow) {
      const activeQuestion =
        orderedVisibleQuestions.find((q) => q.id === currentQuestionId) ||
        orderedVisibleQuestions[0];
      return activeQuestion ? [activeQuestion] : [];
    }

    let questionsToShow = orderedVisibleQuestions;

    // In preview mode, multi-step should respect section boundaries but still
    // run through the same pruning/ordering pipeline as live mode.
    if (isPreviewMode && isMultiStep && currentSection) {
      questionsToShow = questions.filter(
        (q) =>
          currentSection.questionIds?.includes(q.id) ||
          q.sectionId === currentSection.id
      );
    }

    // In preview mode, single-page: show all questions only if not multi-step
    if (isPreviewMode && !isMultiStep && !isQuestionFlow) {
      questionsToShow = questions
        .filter((q) => answerableQuestionIds.has(q.id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Apply jump logic filtering even in single-section preview mode
      if (navigationRules.length > 0) {
        questionsToShow = computeVisibleQuestionsInSection(
          questionsToShow,
          navigationRules,
          answers,
          null, // No specific section ID for single-section surveys
          questions
        );
      }
    }

    if (isMultiStep && currentSection) {
      // Filter by current section
      questionsToShow = questionsToShow.filter(
        (q) =>
          currentSection.questionIds?.includes(q.id) ||
          q.sectionId === currentSection.id
      );

      // Apply dynamic question filtering for intra-section jumps
      if (navigationRules.length > 0) {
        questionsToShow = computeVisibleQuestionsInSection(
          questionsToShow,
          navigationRules,
          answers,
          currentSection.id,
          questions
        );
      }

      // For cross-section jump-to-question, hide earlier siblings in target
      // section so respondents land directly at the selected question.
      if (sectionEntryQuestionId) {
        const entryIndex = questionsToShow.findIndex(
          (question) => question.id === sectionEntryQuestionId
        );
        if (entryIndex !== -1) {
          questionsToShow = questionsToShow.slice(entryIndex);
        }
      }
    }

    const ordered = [...questionsToShow].sort((a, b) => {
      const aIdx = orderedVisibleQuestionIndexMap.get(a.id);
      const bIdx = orderedVisibleQuestionIndexMap.get(b.id);
      if (Number.isFinite(aIdx) && Number.isFinite(bIdx)) {
        return aIdx - bIdx;
      }
      return (a.order || 0) - (b.order || 0);
    });

    if (currentSection?.randomizeQuestions) {
      return stableShuffle(ordered, currentSection.id);
    }

    return ordered;
  }, [
    orderedVisibleQuestions,
    isQuestionFlow,
    currentQuestionId,
    isMultiStep,
    currentSection,
    isPreviewMode,
    questions,
    answers,
    navigationRules,
    answerableQuestionIds,
    orderedVisibleQuestionIndexMap,
    sectionEntryQuestionId,
  ]);

  useEffect(() => {
    if (!isQuestionFlow) return;
    if (orderedVisibleQuestions.length === 0) {
      setCurrentQuestionId(null);
      setQuestionFlowHistory([]);
      return;
    }

    const visibleIdSet = new Set(orderedVisibleQuestions.map((q) => q.id));
    if (!currentQuestionId || !visibleIdSet.has(currentQuestionId)) {
      setCurrentQuestionId(orderedVisibleQuestions[0].id);
    }

    setQuestionFlowHistory((prev) =>
      prev.filter((questionId) => visibleIdSet.has(questionId))
    );
  }, [isQuestionFlow, orderedVisibleQuestions, currentQuestionId]);

  // Handle orphaned answer removal when question visibility changes.
  // Snapshot must include branch-pruned visibility (not only base visibility),
  // otherwise answers from hidden sibling branches can persist.
  const visibilitySnapshotQuestions = useMemo(() => {
    if (isQuestionFlow) {
      return orderedVisibleQuestions;
    }

    if (isMultiStep) {
      const questionBySectionId = new Map();
      for (const section of visibleSections) {
        questionBySectionId.set(
          section.id,
          orderedVisibleQuestions.filter(
            (question) =>
              section.questionIds?.includes(question.id) ||
              question.sectionId === section.id
          )
        );
      }

      const prunedQuestionIds = new Set();
      for (const section of visibleSections) {
        const sectionQuestions = questionBySectionId.get(section.id) || [];
        const prunedSectionQuestions = computeVisibleQuestionsInSection(
          sectionQuestions,
          navigationRules,
          answers,
          section.id,
          questions
        );
        for (const question of prunedSectionQuestions) {
          prunedQuestionIds.add(question.id);
        }
      }

      return orderedVisibleQuestions.filter((question) =>
        prunedQuestionIds.has(question.id)
      );
    }

    if (navigationRules.length > 0) {
      return computeVisibleQuestionsInSection(
        orderedVisibleQuestions,
        navigationRules,
        answers,
        null,
        questions
      );
    }

    return orderedVisibleQuestions;
  }, [
    isQuestionFlow,
    isMultiStep,
    orderedVisibleQuestions,
    visibleSections,
    navigationRules,
    answers,
    questions,
  ]);

  useEffect(() => {
    if (previousVisibleQuestions.length === 0) {
      // Initialize previous visible questions on first render
      setPreviousVisibleQuestions(visibilitySnapshotQuestions);
      return;
    }

    // Check for orphaned answers when questions change visibility
    const orphanedKeys = getOrphanedAnswerKeys(
      previousVisibleQuestions,
      visibilitySnapshotQuestions,
      answers
    );

    if (orphanedKeys.length > 0) {
      setAnswers((prevAnswers) => {
        const cleanedAnswers = { ...prevAnswers };
        orphanedKeys.forEach((key) => {
          delete cleanedAnswers[key];
        });
        // Keep ref in sync to avoid submitting stale hidden answers.
        answersRef.current = cleanedAnswers;
        return cleanedAnswers;
      });
    }

    // Update previous visible questions
    setPreviousVisibleQuestions(visibilitySnapshotQuestions);
  }, [visibilitySnapshotQuestions, answers, previousVisibleQuestions]);

  const handleAnswerChange = (questionId, value) => {
    hasUserInteractedRef.current = true;
    const question = questionById.get(questionId);
    const supportsOther = !!question?.allowOther;
    const isOtherStillSelected = Array.isArray(value)
      ? value.includes("Other")
      : value === "Other";
    const shouldClearOtherText = supportsOther && !isOtherStillSelected;
    const otherTextKey = `${questionId}_other_text`;

    answersRef.current = {
      ...answersRef.current,
      [questionId]: value,
    };
    if (shouldClearOtherText) {
      delete answersRef.current[otherTextKey];
    }

    setAnswers((prev) => {
      const nextAnswers = {
        ...prev,
        [questionId]: value,
      };
      if (shouldClearOtherText) {
        delete nextAnswers[otherTextKey];
      }
      return nextAnswers;
    });

    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }

    // Intentionally do not evaluate navigation logic on change.
    // Logic is evaluated only in explicit navigation actions (Next/Submit).
  };

  const handleOtherTextChange = (questionId, otherText) => {
    hasUserInteractedRef.current = true;
    answersRef.current = {
      ...answersRef.current,
      [`${questionId}_other_text`]: otherText,
    };
    setAnswers((prev) => ({
      ...prev,
      [`${questionId}_other_text`]: otherText,
    }));
  };

  const computeRuntimeAnswerableQuestionIds = (runtimeAnswers = {}) => {
    const runtimeVisibleQuestionIds = getVisibleQuestionIds(
      questions,
      visibilityRules,
      runtimeAnswers
    );
    const runtimeVisibleSectionIds = getVisibleSectionIds(
      sections,
      visibilityRules,
      runtimeAnswers
    );
    const baseAnswerableIds = getAnswerableQuestionIds(
      questions,
      sections,
      runtimeVisibleQuestionIds,
      runtimeVisibleSectionIds
    );

    let runtimeOrderedVisibleQuestions = questions
      .filter((question) => baseAnswerableIds.has(question.id))
      .sort((a, b) => {
        const aSection =
          sections.find((section) => section.questionIds?.includes(a.id))
            ?.order ?? Number.MAX_SAFE_INTEGER;
        const bSection =
          sections.find((section) => section.questionIds?.includes(b.id))
            ?.order ?? Number.MAX_SAFE_INTEGER;
        if (aSection !== bSection) return aSection - bSection;
        return (a.order || 0) - (b.order || 0);
      });

    if (isQuestionFlow && navigationRules.length > 0) {
      runtimeOrderedVisibleQuestions = computeVisibleQuestionsForQuestionFlow(
        runtimeOrderedVisibleQuestions,
        navigationRules,
        runtimeAnswers
      );
    } else if (navigationRules.length > 0) {
      if (isMultiStep) {
        const runtimeVisibleSections = sections
          .filter((section) => runtimeVisibleSectionIds.has(section.id))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        const prunedIds = new Set();
        for (const section of runtimeVisibleSections) {
          const sectionQuestions = runtimeOrderedVisibleQuestions.filter(
            (question) =>
              section.questionIds?.includes(question.id) ||
              question.sectionId === section.id
          );
          const prunedSectionQuestions = computeVisibleQuestionsInSection(
            sectionQuestions,
            navigationRules,
            runtimeAnswers,
            section.id,
            questions
          );
          for (const question of prunedSectionQuestions) {
            prunedIds.add(question.id);
          }
        }

        runtimeOrderedVisibleQuestions = runtimeOrderedVisibleQuestions.filter(
          (question) => prunedIds.has(question.id)
        );
      } else {
        runtimeOrderedVisibleQuestions = computeVisibleQuestionsInSection(
          runtimeOrderedVisibleQuestions,
          navigationRules,
          runtimeAnswers,
          null,
          questions
        );
      }
    }

    return new Set(runtimeOrderedVisibleQuestions.map((question) => question.id));
  };

  const sanitizeSubmissionAnswers = (sourceAnswers = {}) => {
    const nextAnswers = { ...(sourceAnswers || {}) };
    const runtimeAnswerableQuestionIds =
      computeRuntimeAnswerableQuestionIds(nextAnswers);

    for (const answerKey of Object.keys(nextAnswers)) {
      if (answerKey.endsWith("_other_text")) continue;
      if (!questionById.has(answerKey)) {
        delete nextAnswers[answerKey];
        continue;
      }
      if (!runtimeAnswerableQuestionIds.has(answerKey)) {
        delete nextAnswers[answerKey];
      }
    }

    for (const answerKey of Object.keys(nextAnswers)) {
      if (!answerKey.endsWith("_other_text")) continue;
      const questionId = answerKey.slice(0, -"_other_text".length);
      const question = questionById.get(questionId);
      const answerValue = nextAnswers[questionId];
      const isOtherSelectedForQuestion =
        !!question?.allowOther &&
        (Array.isArray(answerValue)
          ? answerValue.includes("Other")
          : answerValue === "Other");

      if (
        !runtimeAnswerableQuestionIds.has(questionId) ||
        !isOtherSelectedForQuestion
      ) {
        delete nextAnswers[answerKey];
      }
    }

    return nextAnswers;
  };

  const submitSurvey = (sourceAnswers = {}) => {
    const sanitizedAnswers = sanitizeSubmissionAnswers(sourceAnswers);
    clearDraft();
    const progressPayload = buildProgressPayload(sanitizedAnswers);

    onSubmit(sanitizedAnswers, {
      visitedSectionIds: progressPayload.visitedSectionIds,
      visitedQuestionIds: progressPayload.visitedQuestionIds,
      navigation: progressPayload.navigation,
    });
  };

  const saveProgressSnapshot = (sourceAnswers = answersRef.current) => {
    if (mode !== "live" || typeof onSaveProgress !== "function") return;
    if (!hasUserInteractedRef.current) return;

    const sanitizedAnswers = sanitizeSubmissionAnswers(sourceAnswers);
    const hasProgress =
      hasMeaningfulDraftAnswers(sanitizedAnswers) ||
      currentSectionIndex > 0 ||
      navigationHistory.length > 0 ||
      jumpChain.length > 0 ||
      questionFlowHistory.length > 0 ||
      Boolean(currentQuestionId) ||
      Boolean(sectionEntryQuestionId);

    if (!hasProgress) return;

    const progressPayload = buildProgressPayload(sanitizedAnswers);
    onSaveProgress(sanitizedAnswers, progressPayload);
  };

  const buildProgressPayload = (runtimeAnswers = answersRef.current) => {
    const visitedSectionSet = new Set();
    const visitedQuestionSet = new Set();

    if (isQuestionFlow) {
      for (const questionId of questionFlowHistory) {
        if (questionId) visitedQuestionSet.add(questionId);
      }
      if (currentQuestionId) visitedQuestionSet.add(currentQuestionId);

      for (const questionId of visitedQuestionSet) {
        const sectionId =
          sections.find((section) => section.questionIds?.includes(questionId))
            ?.id ||
          questionById.get(questionId)?.sectionId ||
          null;
        if (sectionId) visitedSectionSet.add(sectionId);
      }
    } else if (isMultiStep) {
      for (const sectionId of navigationHistory) {
        if (sectionId) visitedSectionSet.add(sectionId);
      }
      if (currentSection?.id) visitedSectionSet.add(currentSection.id);
    }

    return {
      answers: runtimeAnswers,
      visitedSectionIds:
        visitedSectionSet.size > 0 ? [...visitedSectionSet] : undefined,
      visitedQuestionIds:
        visitedQuestionSet.size > 0 ? [...visitedQuestionSet] : undefined,
      navigation: {
        currentSectionIndex,
        history: navigationHistory,
        jumpChain,
        currentQuestionId,
        questionFlowHistory,
        sectionEntryQuestionId,
      },
    };
  };

  // Auto-advance past sections with no visible questions (e.g., empty "sdus" or "submit" sections)
  useEffect(() => {
    if (!isMultiStep || !currentSection || currentQuestions.length > 0) return;

    const nextIndex = activeSectionIndex + 1;
    if (nextIndex < visibleSections.length) {
      setNavigationHistory((prev) =>
        [...prev, currentSection.id].filter(Boolean)
      );
      setCurrentSectionIndex(nextIndex);
    } else {
      if (
        shouldAutoSubmitEmptySection({
          isMultiStep,
          hasCurrentSection: !!currentSection,
          currentQuestionsLength: currentQuestions.length,
          activeSectionIndex,
          visibleSectionsLength: visibleSections.length,
          isPreviewMode,
        })
      ) {
        // Last section is empty — submit the survey (non-preview only)
        submitSurvey(answers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMultiStep,
    currentSection,
    currentQuestions.length,
    activeSectionIndex,
    visibleSections.length,
    isPreviewMode,
    answers,
  ]);

  const validateForm = (
    questionIdsToValidate = null,
    runtimeAnswers = answers
  ) => {
    const newErrors = {};
    const validationQuestionSet =
      questionIdsToValidate instanceof Set
        ? questionIdsToValidate
        : questionIdsToValidate
          ? new Set(questionIdsToValidate)
          : new Set(currentQuestions.map((question) => question.id));
    const requiredQuestionIds = currentQuestions
      .filter(
        (question) =>
          question.required && validationQuestionSet.has(question.id)
      )
      .map((question) => question.id);
    const answeredQuestionIds = currentQuestions
      .filter(
        (question) =>
          validationQuestionSet.has(question.id) &&
          isAnswerProvided(runtimeAnswers[question.id])
      )
      .map((question) => question.id);
    const visibleIdsInView = new Set(
      currentQuestions
        .map((q) => q.id)
        .filter((questionId) => validationQuestionSet.has(questionId))
    );
    const { missingRequiredQuestionIds } = getRequiredValidationSet({
      requiredQuestionIds,
      visibleQuestionIds: visibleIdsInView,
      answeredQuestionIds,
    });

    for (const questionId of missingRequiredQuestionIds) {
      newErrors[questionId] = "This question is required.";
    }

    for (const question of currentQuestions) {
      if (!validationQuestionSet.has(question.id)) continue;
      const answer = runtimeAnswers[question.id];

      if (question.type === "multiple_choice") {
        const selections = Array.isArray(answer) ? answer : [];
        const { minSelections, maxSelections } = question.validation || {};
        if (isAnswerProvided(answer)) {
          if (
            minSelections &&
            selections.length < minSelections &&
            !newErrors[question.id]
          ) {
            newErrors[question.id] = `Select at least ${minSelections} options`;
          }
          if (
            maxSelections &&
            selections.length > maxSelections &&
            !newErrors[question.id]
          ) {
            newErrors[question.id] =
              `Select no more than ${maxSelections} options`;
          }
          if (
            selections.includes("None") &&
            selections.length > 1 &&
            !newErrors[question.id]
          ) {
            newErrors[question.id] =
              '"None" cannot be combined with other options';
          }
        }

        if (
          question.allowOther &&
          selections.includes("Other") &&
          !newErrors[question.id]
        ) {
          const otherText = runtimeAnswers[`${question.id}_other_text`];
          if (!otherText || otherText.trim() === "") {
            newErrors[question.id] = 'Please specify "Other"';
          }
        }
      }

      if (
        question.allowOther &&
        ["single_choice", "dropdown"].includes(question.type) &&
        answer === "Other" &&
        !newErrors[question.id]
      ) {
        const otherText = runtimeAnswers[`${question.id}_other_text`];
        if (!otherText || otherText.trim() === "") {
          newErrors[question.id] = 'Please specify "Other"';
        }
      }

      if (["short_text", "long_text"].includes(question.type)) {
        if (!isAnswerProvided(answer)) continue;

        if (typeof answer !== "string" && !newErrors[question.id]) {
          newErrors[question.id] = "Answer must be text";
          continue;
        }

        const trimmedAnswer = answer.trim();
        const minLength = question.validation?.minLength;
        const maxLength = question.validation?.maxLength;

        if (
          minLength &&
          trimmedAnswer.length < minLength &&
          !newErrors[question.id]
        ) {
          newErrors[question.id] = `Minimum length is ${minLength} characters`;
        }

        if (
          maxLength &&
          trimmedAnswer.length > maxLength &&
          !newErrors[question.id]
        ) {
          newErrors[question.id] = `Maximum length is ${maxLength} characters`;
        }

        const patternValidation = getTextPatternValidation(question);
        if (
          patternValidation &&
          trimmedAnswer &&
          !patternValidation.regex.test(
            normalizeAnswerForPattern(trimmedAnswer, patternValidation.label)
          ) &&
          !newErrors[question.id]
        ) {
          newErrors[question.id] =
            question.validation?.customMessage ||
            question.validationMessage ||
            `Please enter a valid ${patternValidation.label} value`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    hasUserInteractedRef.current = true;
    const runtimeAnswers = answersRef.current;

    if (isQuestionFlow) {
      if (!validateForm(null, runtimeAnswers)) {
        return;
      }

      const currentQuestion = currentQuestions[0];
      if (!currentQuestion) {
        submitSurvey(runtimeAnswers);
        return;
      }

      const currentQuestionSectionId =
        sections.find((section) =>
          section.questionIds?.includes(currentQuestion.id)
        )?.id || null;

      const action = evaluateNavigationAction(
        currentQuestionSectionId,
        sections,
        questions,
        navigationRules,
        runtimeAnswers,
        visibleSectionIds,
        answerableQuestionIds,
        currentQuestion.id,
        new Set([currentQuestion.id]),
        true
      );

      if (action?.type === "terminate") {
        submitSurvey(runtimeAnswers);
        return;
      }

      if (action?.type === "jump_question" && action.targetQuestionId) {
        if (answerableQuestionIds.has(action.targetQuestionId)) {
          saveProgressSnapshot(runtimeAnswers);
          setQuestionFlowHistory((prev) => [...prev, currentQuestion.id]);
          setCurrentQuestionId(action.targetQuestionId);
          setErrors({});
          scrollToQuestion(action.targetQuestionId, 80);
          return;
        }
      }

      const currentIndex = orderedVisibleQuestions.findIndex(
        (q) => q.id === currentQuestion.id
      );
      const nextQuestion = orderedVisibleQuestions[currentIndex + 1];
      if (!nextQuestion) {
        submitSurvey(runtimeAnswers);
        return;
      }

      saveProgressSnapshot(runtimeAnswers);
      setQuestionFlowHistory((prev) => [...prev, currentQuestion.id]);
      setCurrentQuestionId(nextQuestion.id);
      setErrors({});
      scrollToQuestion(nextQuestion.id, 80);
      return;
    }

    if (!isMultiStep || !currentSection) {
      if (!validateForm(null, runtimeAnswers)) {
        return;
      }
      // Single-page mode: submit
      submitSurvey(runtimeAnswers);
      return;
    }

    const currentSectionQuestionIds = new Set(
      currentQuestions.map((question) => question.id)
    );
    const action = evaluateNavigationAction(
      currentSection.id,
      visibleSections,
      questions,
      navigationRules,
      runtimeAnswers,
      visibleSectionIds,
      answerableQuestionIds,
      null,
      currentSectionQuestionIds
    );

    const sectionValidationQuestionIds = new Set(
      currentQuestions.map((question) => question.id)
    );

    if (
      action?.type === "jump_question" &&
      action.targetQuestionId &&
      action.targetSectionId === currentSection.id &&
      action.sourceQuestionId
    ) {
      const sourceIndex = currentQuestions.findIndex(
        (question) => question.id === action.sourceQuestionId
      );
      const targetIndex = currentQuestions.findIndex(
        (question) => question.id === action.targetQuestionId
      );

      if (
        sourceIndex !== -1 &&
        targetIndex !== -1 &&
        targetIndex > sourceIndex
      ) {
        for (let index = sourceIndex + 1; index < targetIndex; index += 1) {
          sectionValidationQuestionIds.delete(currentQuestions[index].id);
        }
      }
    }

    if (!validateForm(sectionValidationQuestionIds, runtimeAnswers)) {
      return;
    }

    // Same-section jump_to_question is already reflected by visibility pruning.
    // At section submit-time, treat it as a local branch decision and continue normally.
    const runtimeAction =
      action?.type === "jump_question" &&
      action.targetSectionId === currentSection.id
        ? null
        : action?.type === "skip"
          ? null
          : action;

    // Build potential jump chain if this is a jump action
    const isJumpAction =
      runtimeAction &&
      (runtimeAction.type === "jump_section" ||
        runtimeAction.type === "jump_question");
    const potentialChain = isJumpAction
      ? [...jumpChain, currentSection.id]
      : [];

    const actionApplied = applyNavigationAction(
      runtimeAction,
      answerableQuestionIds,
      visibleSectionIds,
      runtimeAnswers,
      potentialChain,
      isJumpAction
    );
    if (runtimeAction && runtimeAction.type !== "terminate") {
      saveProgressSnapshot(runtimeAnswers);
    }
    if (actionApplied) {
      return;
    }

    const fallbackNextSectionId =
      isMultiStep && currentSection
        ? getNextSectionId(
            currentSection.id,
            visibleSections,
            navigationRules,
            runtimeAnswers,
            visibleSectionIds
          )
        : null;

    if (
      fallbackNextSectionId &&
      (!currentSection || fallbackNextSectionId !== currentSection.id)
    ) {
      saveProgressSnapshot(runtimeAnswers);
      moveToSection(fallbackNextSectionId, potentialChain, true);
      return;
    }

    // Linear navigation - reset jump chain
    setJumpChain([]);
    const nextSection = visibleSections[activeSectionIndex + 1];
    if (!nextSection) {
      submitSurvey(runtimeAnswers);
      return;
    }

    saveProgressSnapshot(runtimeAnswers);
    moveToSection(nextSection.id, [], false);
  };

  const handleBack = () => {
    hasUserInteractedRef.current = true;
    if (isQuestionFlow) {
      if (questionFlowHistory.length === 0) return;
      const previousQuestionId =
        questionFlowHistory[questionFlowHistory.length - 1];
      setCurrentQuestionId(previousQuestionId);
      setQuestionFlowHistory((prev) => prev.slice(0, -1));
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!isMultiStep || activeSectionIndex === 0) return;

    // Reset jump chain on back navigation
    setJumpChain([]);

    const prevSectionId = getPreviousSectionId(
      currentSection.id,
      visibleSections,
      navigationHistory,
      visibleSectionIds
    );

    if (prevSectionId) {
      const prevIndex = visibleSections.findIndex(
        (s) => s.id === prevSectionId
      );
      if (prevIndex !== -1) {
        setSectionEntryQuestionId(null);
        setCurrentSectionIndex(prevIndex);
        setNavigationHistory((prev) => prev.slice(0, -1));
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // Fallback: go to previous section linearly
      if (activeSectionIndex > 0) {
        setSectionEntryQuestionId(null);
        setCurrentSectionIndex(activeSectionIndex - 1);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleNext(); // Use unified navigation logic
  };

  const moveToSection = (sectionId, potentialChain = [], isJump = false) => {
    hasUserInteractedRef.current = true;
    const nextIndex = visibleSections.findIndex((s) => s.id === sectionId);
    if (nextIndex === -1) return false;

    // Check for circular jumps using the potential chain
    if (isJump && potentialChain.includes(sectionId)) {
      console.error(
        `[Navigation Error] Circular jump detected: ${[...potentialChain, sectionId].join(" → ")}`
      );
      console.warn(
        "[Navigation] Auto-submitting survey to prevent infinite loop"
      );
      // Break the loop by submitting the survey
      submitSurvey(answers);
      return true;
    }

    // Update jump chain after check passes
    if (isJump) {
      setJumpChain(potentialChain);
    } else {
      setJumpChain([]);
      setSectionEntryQuestionId(null);
    }

    setNavigationHistory((prev) =>
      [...prev, currentSection?.id].filter(Boolean)
    );
    setCurrentSectionIndex(nextIndex);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  };

  const applyNavigationAction = (
    action,
    runtimeVisibleQuestionIds,
    runtimeVisibleSectionIds,
    runtimeAnswers,
    potentialChain = [],
    isJump = false
  ) => {
    if (!action) return false;

    if (action.type === "terminate") {
      submitSurvey(runtimeAnswers);
      return true;
    }

    if (action.type === "jump_section" && action.targetSectionId) {
      return moveToSection(action.targetSectionId, potentialChain, isJump);
    }

    if (
      action.type === "jump_question" &&
      action.targetSectionId &&
      action.targetQuestionId
    ) {
      if (
        action.targetSectionId === currentSection?.id &&
        isAnswerProvided(runtimeAnswers[action.targetQuestionId])
      ) {
        return false;
      }
      const moved = moveToSection(
        action.targetSectionId,
        potentialChain,
        isJump
      );
      if (moved) {
        setSectionEntryQuestionId(action.targetQuestionId);
        setPendingJumpQuestionId(action.targetQuestionId);
      } else {
        scrollToQuestion(action.targetQuestionId, 0);
      }
      return moved || true;
    }

    if (action.type === "skip") {
      const sectionQuestions = questions
        .filter(
          (q) =>
            (currentSection?.questionIds?.includes(q.id) ||
              q.sectionId === currentSection?.id) &&
            runtimeVisibleQuestionIds.has(q.id)
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const sourceIdx = sectionQuestions.findIndex(
        (q) => q.id === action.sourceQuestionId
      );
      if (sourceIdx === -1) return false;

      const targetIdx = sourceIdx + action.skipCount + 1;
      const targetQuestion = sectionQuestions[targetIdx];
      if (targetQuestion) {
        scrollToQuestion(targetQuestion.id);
        return true;
      }

      const fallbackSection = visibleSections[activeSectionIndex + 1];
      if (fallbackSection && runtimeVisibleSectionIds.has(fallbackSection.id)) {
        return moveToSection(fallbackSection.id, [], false);
      }
      submitSurvey(runtimeAnswers);
      return true;
    }

    return false;
  };

  const scrollToQuestion = (questionId, delay = 0) => {
    window.setTimeout(() => {
      const target = document.querySelector(
        `[data-question-id="${questionId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, delay);
  };

  // For cross-section jump-to-question, anchor after the destination section mounts.
  useEffect(() => {
    if (!pendingJumpQuestionId) return;
    const isRendered = currentQuestions.some(
      (question) => question.id === pendingJumpQuestionId
    );
    if (!isRendered) return;
    scrollToQuestion(pendingJumpQuestionId, 0);
    setPendingJumpQuestionId(null);
  }, [pendingJumpQuestionId, currentQuestions]);

  // Calculate progress (based on visible sections and questions)
  const progressQuestionIds = useMemo(
    () => visibilitySnapshotQuestions.map((question) => question.id),
    [visibilitySnapshotQuestions]
  );
  const totalQuestions = progressQuestionIds.length; // used by render guards (empty-state, back button)
  const sectionProgressLabel = useMemo(() => {
    if (!isMultiStep) {
      return "Survey progress";
    }

    const sectionName = currentSection?.title?.trim() || "Untitled Section";
    return `Section: ${sectionName}`;
  }, [isMultiStep, currentSection?.title]);

  const isOtherSelected = (question) => {
    const answer = answers[question.id];
    if (question.type === "multiple_choice") {
      return Array.isArray(answer) && answer.includes("Other");
    }
    return answer === "Other";
  };

  const currentNavigationAction = useMemo(() => {
    if (isQuestionFlow) {
      const currentQuestion = currentQuestions[0];
      if (!currentQuestion) return null;

      const currentQuestionSectionId =
        sections.find((section) =>
          section.questionIds?.includes(currentQuestion.id)
        )?.id || null;

      return evaluateNavigationAction(
        currentQuestionSectionId,
        sections,
        questions,
        navigationRules,
        answers,
        visibleSectionIds,
        answerableQuestionIds,
        currentQuestion.id,
        new Set([currentQuestion.id]),
        true
      );
    }

    if (!isMultiStep || !currentSection) {
      return null;
    }

    const currentSectionQuestionIds = new Set(
      currentQuestions.map((question) => question.id)
    );
    return evaluateNavigationAction(
      currentSection.id,
      visibleSections,
      questions,
      navigationRules,
      answers,
      visibleSectionIds,
      answerableQuestionIds,
      null,
      currentSectionQuestionIds
    );
  }, [
    isQuestionFlow,
    currentQuestions,
    sections,
    questions,
    navigationRules,
    answers,
    visibleSectionIds,
    answerableQuestionIds,
    isMultiStep,
    currentSection,
    visibleSections,
  ]);

  const hasTerminateAction = currentNavigationAction?.type === "terminate";

  // Progress computation — logic-path-aware:
  //   Denominator = questions on the respondent's reachable path:
  //     • Multi-step: visited sections + current section + future sections (at/after
  //       current index). Sections before current that were never visited are
  //       definitively skipped by jump logic and excluded.
  //     • Question-flow + terminate: only traversed questions (history + current).
  //     • Everything else: full logic-pruned visible pool.
  const rawProgress = useMemo(() => {
    let pathQuestions;

    if (isQuestionFlow && hasTerminateAction) {
      // Terminate fired: future questions unreachable — only count traversed + current.
      const traversedIds = new Set([
        ...questionFlowHistory,
        ...(currentQuestionId ? [currentQuestionId] : []),
      ]);
      pathQuestions = visibilitySnapshotQuestions.filter((q) =>
        traversedIds.has(q.id)
      );
    } else if (isMultiStep) {
      // Build the reachable section set:
      //   - Sections already visited (navigationHistory + current) → always include.
      //   - Sections at/after current index in visibleSections → future, include.
      //   - Sections before current that are NOT in history → jumped over, exclude.
      const currentIdx = currentSection
        ? visibleSections.findIndex((s) => s.id === currentSection.id)
        : -1;
      const visitedSectionIds = new Set(
        [...navigationHistory, currentSection?.id].filter(Boolean)
      );
      // Index lookup to avoid repeated find() inside the filter.
      const sectionIdxById = new Map(
        visibleSections.map((s, idx) => [s.id, idx])
      );
      pathQuestions = visibilitySnapshotQuestions.filter((q) => {
        const qSectionId =
          q.sectionId ||
          sections.find((s) => s.questionIds?.includes(q.id))?.id;
        if (visitedSectionIds.has(qSectionId)) return true;
        const idx = sectionIdxById.get(qSectionId) ?? -1;
        return idx >= currentIdx; // at or after current → future section, keep
      });
    } else {
      // Single-page or question-flow without terminate: full pruned pool.
      pathQuestions = visibilitySnapshotQuestions;
    }

    const total = pathQuestions.length;
    if (total === 0) return 0;
    const answered = pathQuestions.filter((q) =>
      isAnswerProvided(answers[q.id])
    ).length;
    return (answered / total) * 100;
  }, [
    isQuestionFlow,
    hasTerminateAction,
    questionFlowHistory,
    currentQuestionId,
    isMultiStep,
    currentSection,
    visibleSections,
    navigationHistory,
    sections,
    visibilitySnapshotQuestions,
    answers,
  ]);

  const sectionRawProgress = useMemo(() => {
    if (!isMultiStep) return rawProgress;

    const totalInCurrentSection = currentQuestions.length;
    if (totalInCurrentSection === 0) return 0;

    const answeredInCurrentSection = currentQuestions.filter((question) =>
      isAnswerProvided(answers[question.id])
    ).length;

    return (answeredInCurrentSection / totalInCurrentSection) * 100;
  }, [isMultiStep, rawProgress, currentQuestions, answers]);

  const showProgress = !!survey.showProgress;
  const shouldShowSubmitCta = useMemo(() => {
    if (hasTerminateAction) return true;

    if (isQuestionFlow) {
      const currentQuestion = currentQuestions[0];
      if (!currentQuestion) return true;
      return (
        orderedVisibleQuestions.findIndex((q) => q.id === currentQuestionId) ===
        orderedVisibleQuestions.length - 1
      );
    }

    if (!isMultiStep || !currentSection) return true;

    if (currentNavigationAction) {
      if (currentNavigationAction.type === "jump_section") return false;
      if (currentNavigationAction.type === "skip") return false;
      if (
        currentNavigationAction.type === "jump_question" &&
        currentNavigationAction.targetSectionId &&
        currentNavigationAction.targetSectionId !== currentSection.id
      ) {
        return false;
      }
    }

    const nextSectionId = getNextSectionId(
      currentSection.id,
      visibleSections,
      navigationRules,
      answers,
      visibleSectionIds
    );
    if (nextSectionId && nextSectionId !== currentSection.id) return false;

    return activeSectionIndex === visibleSections.length - 1;
  }, [
    hasTerminateAction,
    isQuestionFlow,
    currentQuestionId,
    orderedVisibleQuestions,
    isMultiStep,
    currentSection,
    currentQuestions,
    visibleSections,
    activeSectionIndex,
    currentNavigationAction,
    navigationRules,
    answers,
    visibleSectionIds,
  ]);

  useEffect(() => {
    let progress = Math.min(
      100,
      Math.max(0, isMultiStep ? sectionRawProgress : rawProgress)
    );

    // Context-aware final-screen cap:
    // When the submit button is visible (logic says this is the last step) AND
    // every question currently on-screen is answered, the user has completed all
    // questions logic allows — clamp to 100.
    // (Any unanswered questions still in the global snapshot denominator are from
    // branches the respondent never entered and can never reach.)
    if (shouldShowSubmitCta && currentQuestions.length > 0) {
      const allCurrentAnswered = currentQuestions.every((q) =>
        isAnswerProvided(answers[q.id])
      );
      if (allCurrentAnswered) progress = 100;
    }

    setDisplayProgress(progress);
  }, [
    rawProgress,
    sectionRawProgress,
    isMultiStep,
    shouldShowSubmitCta,
    currentQuestions,
    answers,
  ]);

  return (
    <div
      className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100"
      style={{
        fontFamily: survey.fontFamily || "Inter",
        ...(brandColor
          ? {
              "--primary": brandColor,
              "--ring": brandColor,
            }
          : {}),
      }}
    >
      {/* Test Mode Banner */}
      {mode === "test" && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <Alert className="border-green-300 bg-green-50">
              <Eye className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Test Mode:</strong> This is a test submission. It will
                be saved but excluded from analytics.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="text-white py-4 sm:py-5 px-4"
        style={brandColor ? { backgroundColor: brandColor } : undefined}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {survey.logo && (
              <div className="shrink-0 bg-white rounded-lg p-2.5">
                <img
                  src={normalizeLogoUrl(survey.logo)}
                  alt="Logo"
                  className="h-12 sm:h-14 max-w-55 sm:max-w-65 object-contain"
                  onError={(e) => {
                    e.currentTarget.parentElement.style.display = "none";
                  }}
                />
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-bold leading-tight">
              {survey.title}
            </h1>
          </div>
          {survey.description && (
            <RichTextContent
              className="markdown-editor-content mt-1 text-sm leading-relaxed text-white/90 [&_a]:text-white [&_a]:underline [&_blockquote]:border-white/30 [&_blockquote]:text-white/90 [&_strong]:text-white"
              value={survey.description}
            />
          )}
          {mode === "preview" && (
            <div className="mt-2 flex items-center gap-2 text-white/90 bg-white/10 rounded-md px-3 py-1.5">
              <Info className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                <strong>Preview Mode:</strong> Responses will not be saved.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="max-w-6xl mx-auto px-2 sm:px-4 pt-5 pb-1">
          <div className="flex items-center text-xs sm:text-sm text-slate-500 mb-2">
            <span>{sectionProgressLabel}</span>
          </div>
          <Progress value={displayProgress} className="h-2" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-2 sm:px-2 py-5 sm:py-8">
        <form onSubmit={handleSubmit} noValidate>
          {/* Questions */}
          {currentQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-base">
                {isPreviewMode && totalQuestions === 0
                  ? "This survey has no questions to preview yet."
                  : "This section has no questions."}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <MotionDiv
                key={
                  isMultiStep
                    ? activeSectionIndex
                    : isQuestionFlow
                      ? currentQuestionId || "question-flow"
                      : "single-page"
                }
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-6"
              >
                {/* Section Header for Multi-Step Mode - Only show if explicitly sectional */}
                {isMultiStep && currentSection && isSectional && (
                  <div className="mb-4 pb-3 border-b border-slate-100">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                      {currentSection.title}
                    </h2>
                    {currentSection.description && (
                      <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">
                        {currentSection.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Current Question(s) */}
                <div className="space-y-4 sm:space-y-5">
                  {currentQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      data-question-id={question.id}
                      className={index > 0 ? "pt-2" : ""}
                    >
                      <div className="mb-3">
                        <div className="grid grid-cols-[1.2rem_1fr] sm:grid-cols-[1.35rem_1fr] items-start gap-x-2">
                          <span className="pt-[0.29rem] text-[1rem] sm:text-base font-semibold text-slate-500 text-right leading-none">
                            {isQuestionFlow
                              ? Math.max(
                                  1,
                                  orderedVisibleQuestions.findIndex(
                                    (q) => q.id === question.id
                                  ) + 1
                                )
                              : index + 1}
                          </span>
                          <h3 className="text-[1.1rem] sm:text-[1.2rem] !font-medium text-slate-900 leading-snug">
                            {question.text || question.title}
                            {question.required && (
                              <span className="text-red-500 align-top">*</span>
                            )}
                          </h3>
                        </div>
                        {question.description && (
                          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                            {question.description}
                          </p>
                        )}
                      </div>

                      <div className="w-full pl-6 sm:pl-7">
                        <QuestionRenderer
                          question={question}
                          value={answers[question.id]}
                          onChange={(value) =>
                            handleAnswerChange(question.id, value)
                          }
                          onOtherTextChange={(otherText) =>
                            handleOtherTextChange(question.id, otherText)
                          }
                          otherText={answers[`${question.id}_other_text`] || ""}
                          error={errors[question.id]}
                          brandColor={brandColor}
                        />

                        {question.allowOther &&
                          [
                            "single_choice",
                            "multiple_choice",
                            "dropdown",
                          ].includes(question.type) &&
                          isOtherSelected(question) &&
                          !answers[`${question.id}_other_text`]?.trim() && (
                            <p className="mt-2 text-xs text-slate-500">
                              Please specify "Other" above.
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            </AnimatePresence>
          )}

          {/* Navigation Buttons */}
          <div
            className={
              currentQuestions.length > 0 && (!isMultiStep || !hasBack)
                ? "flex flex-wrap justify-center items-center mt-6 gap-3"
                : "flex flex-wrap justify-between items-center mt-6 gap-3"
            }
          >
            {currentQuestions.length > 0 ? (
              <>
                {(
                  isQuestionFlow
                    ? questionFlowHistory.length > 0
                    : isMultiStep && hasBack
                ) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="min-w-0 sm:min-w-25"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  style={
                    brandColor ? { backgroundColor: brandColor } : undefined
                  }
                  className="text-white min-w-0 sm:min-w-30"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : shouldShowSubmitCta ? (
                    "Submit Survey"
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {isMultiStep && hasBack && totalQuestions > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="min-w-0 sm:min-w-25"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {/* Error Display */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium">
                Please answer all required questions before{" "}
                {(isQuestionFlow &&
                  orderedVisibleQuestions.findIndex(
                    (q) => q.id === currentQuestionId
                  ) <
                    orderedVisibleQuestions.length - 1 &&
                  !shouldShowSubmitCta) ||
                (!isQuestionFlow && !shouldShowSubmitCta)
                  ? "continuing"
                  : "submitting"}
                .
              </p>
            </div>
          )}

          {/* Security Notice */}
          <p className="mt-6 text-xs text-slate-400 text-center">
            Your responses are secure and will be processed confidentially.
          </p>
        </form>
      </div>
    </div>
  );
}

function isAnswerProvided(answer) {
  return !(
    answer === undefined ||
    answer === null ||
    (typeof answer === "string" && answer.trim() === "") ||
    (Array.isArray(answer) && answer.length === 0)
  );
}
