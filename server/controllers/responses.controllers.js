/**
 * Response Controllers
 *
 * Handles survey response validation, submission, and retrieval.
 * Follows KISS + DRY principles with standardized responses and pagination.
 *
 * @fileoverview Response controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import crypto from "crypto";
import mongoose from "mongoose";
import { UAParser } from "ua-parser-js";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse, sendCreated } from "../utils/response.js";
import { executePagedQuery } from "../utils/pagination.utils.js";
import Response from "../models/response.models.js";
import Survey from "../models/survey.models.js";
import SurveyVersion from "../models/survey_version.models.js";
import Recipient from "../models/recipient.models.js";
import Company from "../models/company.models.js";
import { getEffectiveBrandingSettings } from "../services/branding.service.js";
import {
  getAnswerableQuestionIds,
  getQuestionIdsInSections,
  getVisibleQuestionIds,
  getVisibleSectionIds,
  getRequiredValidationSet,
  computeVisibleQuestionsInSection,
} from "../utils/logicEngine.js";
import {
  getAllowedAnswerKeySet,
  getNonApplicableAnswerKeys,
  isOtherTextKey,
  pruneAnswersToEffectiveScope,
} from "../utils/responseValidation.js";

const CLOSED_SURVEY_MESSAGE =
  "This survey is closed and no longer accepting responses.";

const normalizePresentationSettings = (settings = {}, sections = []) => ({
  presentationMode:
    Array.isArray(sections) && sections.length > 1
      ? "multi_step"
      : settings?.presentationMode || "single_page",
  autoAdvanceThreshold: settings?.autoAdvanceThreshold ?? null,
});

const resolveCompanyScope = (req) => {
  const companyId = req.user?.companyId;
  const isScoped = !!companyId;
  return { companyId, isScoped };
};

const normalizeStoredAnswers = (answers) => {
  if (!answers) return {};
  if (answers instanceof Map) return Object.fromEntries(answers);
  if (typeof answers === "object") return answers;
  return {};
};

const normalizeNavigationState = (navigation = {}) => ({
  currentSectionIndex: Number.isFinite(navigation?.currentSectionIndex)
    ? Math.max(0, navigation.currentSectionIndex)
    : 0,
  history: Array.isArray(navigation?.history)
    ? navigation.history.filter((value) => typeof value === "string" && value)
    : [],
  jumpChain: Array.isArray(navigation?.jumpChain)
    ? navigation.jumpChain.filter(
        (value) => typeof value === "string" && value
      )
    : [],
  currentQuestionId:
    typeof navigation?.currentQuestionId === "string" &&
    navigation.currentQuestionId.trim()
      ? navigation.currentQuestionId.trim()
      : null,
  questionFlowHistory: Array.isArray(navigation?.questionFlowHistory)
    ? navigation.questionFlowHistory.filter(
        (value) => typeof value === "string" && value
      )
    : [],
  sectionEntryQuestionId:
    typeof navigation?.sectionEntryQuestionId === "string" &&
    navigation.sectionEntryQuestionId.trim()
      ? navigation.sectionEntryQuestionId.trim()
      : null,
});

const buildLiveResponseLookup = ({
  surveyId,
  surveyVersion,
  recipientId,
  respondentIdentifier,
  mode = "live",
}) => {
  const query = {
    surveyId,
    surveyVersion,
    mode,
  };

  if (recipientId) {
    query.recipientId = recipientId;
  } else if (respondentIdentifier) {
    query.respondentIdentifier = respondentIdentifier;
  }

  return query;
};

const findPublicSurvey = (publicId) =>
  Survey.findOne({
    publicId,
    status: { $in: ["published", "closed"] },
  });

const ensureSurveyAcceptsResponses = (survey, res) => {
  if (!survey) {
    res.status(404);
    throw new Error("Survey not found or not available");
  }

  if (survey.status === "closed") {
    res.status(409);
    throw new Error(CLOSED_SURVEY_MESSAGE);
  }
};

const computeProgressSummary = ({
  surveyVersion,
  answers = {},
  visitedSectionIds,
}) => {
  const normalizedAnswers = normalizeStoredAnswers(answers);
  const visibleQuestionIds = getVisibleQuestionIds(
    surveyVersion.questions,
    surveyVersion.visibilityRules || [],
    normalizedAnswers
  );
  const visibleSectionIds = getVisibleSectionIds(
    surveyVersion.sections || [],
    surveyVersion.visibilityRules || [],
    normalizedAnswers
  );
  const answerableQuestionIds = getAnswerableQuestionIds(
    surveyVersion.questions,
    surveyVersion.sections || [],
    visibleQuestionIds,
    visibleSectionIds
  );
  const effectiveAnswerableQuestionIds = computeEffectiveAnswerableIds(
    surveyVersion.questions,
    surveyVersion.sections || [],
    surveyVersion.navigationRules || [],
    answerableQuestionIds,
    visibleSectionIds,
    normalizedAnswers,
    visitedSectionIds
  );
  const totalQuestions = effectiveAnswerableQuestionIds.size;
  const answeredCount = [...effectiveAnswerableQuestionIds].filter((questionId) =>
    isAnswerProvided(normalizedAnswers[questionId])
  ).length;
  const percentComplete =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return {
    answeredCount,
    totalQuestions,
    percentComplete,
  };
};

const buildJourneySummary = (response = null) => {
  if (!response) return null;

  const progress = response.progress || {};
  const answeredCount = Number(progress.answeredCount || 0);
  const totalQuestions = Number(progress.totalQuestions || 0);
  const percentComplete = Number(progress.percentComplete || 0);

  return {
    percentComplete,
    answeredCount,
    totalQuestions,
    label: `${percentComplete}% complete`,
    answeredLabel: `${answeredCount}/${totalQuestions} answered`,
    lastSavedAt: response.lastSavedAt || response.updatedAt || null,
  };
};

const isCompletedResponse = (response = null) => {
  if (!response) return false;
  return (response.responseStatus || "completed") === "completed";
};

const serializeResumeResponse = (response = null) => {
  if (!response) return null;

  return {
    responseId: response._id,
    responseStatus: response.responseStatus || "completed",
    answers: normalizeStoredAnswers(response.answers),
    navigation: normalizeNavigationState(response.navigation || {}),
    progress: response.progress || {
      answeredCount: 0,
      totalQuestions: 0,
      percentComplete: 0,
    },
    journey: buildJourneySummary(response),
    startedAt: response.startedAt || null,
    lastSavedAt: response.lastSavedAt || response.updatedAt || null,
    submittedAt: response.submittedAt || null,
  };
};

const buildResponsePayload = ({
  survey,
  surveyVersion,
  recipient,
  respondentIdentifier,
  answers,
  responseStatus,
  metadata = {},
  completionTime = null,
  device,
  mode,
  startedAt,
  navigation,
  progress,
  savedAt,
}) => {
  const payload = {
    surveyId: survey._id,
    surveyVersion: survey.publishedVersion,
    companyId: survey.companyId,
    recipientName: recipient?.name || null,
    recipientPhone: recipient?.phone || null,
    recipientEmail: recipient?.email || null,
    answers: new Map(Object.entries(answers)),
    metadata,
    completionTime,
    device,
    mode,
    startedAt,
    responseStatus,
    lastSavedAt: savedAt,
    progress,
    navigation,
    submittedAt: responseStatus === "completed" ? savedAt : null,
  };

  if (recipient?._id) {
    payload.recipientId = recipient._id;
  }
  if (respondentIdentifier) {
    payload.respondentIdentifier = respondentIdentifier;
  }

  return payload;
};

/**
 * Generate hashed identifier for respondent
 * @param {string} identifier - Phone or email
 * @returns {string} Hashed identifier
 */
const hashIdentifier = (identifier) => {
  return crypto
    .createHash("sha256")
    .update(identifier.toLowerCase())
    .digest("hex");
};

/**
 * Detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Device type
 */
const detectDevice = (userAgent) => {
  const parser = new UAParser(userAgent);
  const deviceType = parser.getDevice().type;

  if (deviceType === "mobile") return "Mobile";
  if (deviceType === "tablet") return "Tablet";
  return "Desktop";
};

const isAnswerProvided = (answer) =>
  !(
    answer === undefined ||
    answer === null ||
    (typeof answer === "string" && answer.trim() === "") ||
    (Array.isArray(answer) && answer.length === 0)
  );

const BUILT_IN_TEXT_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  url: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[^\s]*)?$/i,
  numeric: /^\d+(\.\d+)?$/,
  number: /^\d+(\.\d+)?$/,
  integer: /^\d+$/,
  alphanumeric: /^[a-z0-9 ]+$/i,
};

const getTextPatternValidation = (question = {}) => {
  const predefined = question?.validation?.predefinedPattern;
  const pattern = question?.validation?.pattern;
  const configured = predefined || pattern;

  if (!configured || typeof configured !== "string") return null;

  const normalized = configured.trim().toLowerCase();
  if (BUILT_IN_TEXT_PATTERNS[normalized]) {
    const label = normalized === "number" ? "numeric" : normalized;
    return {
      regex: BUILT_IN_TEXT_PATTERNS[normalized],
      label,
    };
  }

  // Treat unknown validation.pattern as a custom regex string.
  if (!predefined && pattern) {
    try {
      return {
        regex: new RegExp(pattern),
        label: "required format",
      };
    } catch {
      return null;
    }
  }

  return null;
};

const normalizeAnswerForPattern = (answer, label) => {
  if (typeof answer !== "string") return "";
  const trimmed = answer.trim();
  if (label === "phone") {
    // Allow user-friendly separators while validating against E.164 shape.
    return trimmed.replace(/[\s()-]/g, "");
  }
  return trimmed;
};

const inferVisitedSectionIdsFromAnswers = (
  questions = [],
  sections = [],
  answers = {}
) => {
  const sectionByQuestionId = new Map();

  for (const question of questions || []) {
    if (question?.id && question?.sectionId) {
      sectionByQuestionId.set(question.id, question.sectionId);
    }
  }

  for (const section of sections || []) {
    for (const questionId of section.questionIds || []) {
      if (!sectionByQuestionId.has(questionId)) {
        sectionByQuestionId.set(questionId, section.id);
      }
    }
  }

  const visited = new Set();
  for (const [answerKey, answerValue] of Object.entries(answers || {})) {
    if (!isAnswerProvided(answerValue)) continue;
    const sectionId = sectionByQuestionId.get(answerKey);
    if (sectionId) visited.add(sectionId);
  }

  return [...visited];
};

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const normalizePhone = (value = "") =>
  String(value)
    .trim()
    .replace(/[^\d+]/g, "");

const normalizeIdentifier = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (isValidEmail(trimmed)) return trimmed.toLowerCase();
  return normalizePhone(trimmed);
};

const buildPhoneRegex = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  // Match optional leading plus and tolerate separators/spaces in stored values.
  const pattern = `^\\+?${digits.split("").join("\\D*")}$`;
  return new RegExp(pattern);
};

const buildNavigationRuleKey = (rule = {}) => {
  const fromSectionId = rule.fromSectionId ?? "__no_section__";
  const questionId = rule.when?.questionId || "__no_question__";
  const operator = rule.when?.operator || "__no_operator__";
  const valueToken = JSON.stringify(rule.when?.value ?? null);
  return `${fromSectionId}::${questionId}::${operator}::${valueToken}`;
};

/**
 * Extract navigation rules from survey-level rules + question option-level logic.
 * Mirrors frontend ResponseForm.jsx option rule extraction.
 */
const getEffectiveNavigationRules = (questions, surveyNavigationRules = []) => {
  const questionIdSet = new Set(
    (questions || [])
      .map((question) => question?.id)
      .filter((questionId) => typeof questionId === "string" && questionId)
  );
  const questionByLabel = new Map();
  const orderedQuestions = [...(questions || [])].sort(
    (a, b) => (a?.order ?? 0) - (b?.order ?? 0)
  );
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

  for (const question of questions || []) {
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
    if (orderTokenMap.has(lower)) return orderTokenMap.get(lower);
    if (orderTokenMap.has(trimmed)) return orderTokenMap.get(trimmed);
    return questionByLabel.get(lower) || value;
  };

  const normalizeRuleQuestionReferences = (rule = {}) => ({
    ...rule,
    when: rule.when
      ? {
          ...rule.when,
          questionId: resolveQuestionReference(rule.when.questionId),
        }
      : rule.when,
    action: rule.action
      ? {
          ...rule.action,
          targetQuestionId: resolveQuestionReference(
            rule.action.targetQuestionId
          ),
        }
      : rule.action,
  });

  const optionRules = [];
  for (const question of questions) {
    if (!question.options) continue;
    for (const option of question.options) {
      if (option.logic?.action) {
        optionRules.push({
          id: `${question.id}_${option.text}`,
          fromSectionId: question.sectionId || null,
          when: {
            questionId: question.id,
            operator: "equals",
            value: option.text,
          },
          action: option.logic.action,
          priority: option.logic.priority || 0,
        });
      }
    }
  }
  const mergedByCondition = new Map();
  for (const rule of surveyNavigationRules) {
    const normalizedRule = normalizeRuleQuestionReferences(rule);
    mergedByCondition.set(
      buildNavigationRuleKey(normalizedRule),
      normalizedRule
    );
  }
  for (const rule of optionRules) {
    const normalizedRule = normalizeRuleQuestionReferences(rule);
    const conditionKey = buildNavigationRuleKey(normalizedRule);
    mergedByCondition.set(conditionKey, normalizedRule);
  }
  return [...mergedByCondition.values()];
};

/**
 * Compute the effective answerable question IDs after applying jump logic filtering.
 * Replaces client-trusted visitedQuestionIds with server-computed scope.
 */
const computeEffectiveAnswerableIds = (
  questions,
  sections,
  navigationRules,
  answerableQuestionIds,
  visibleSectionIds,
  answers,
  visitedSectionIds
) => {
  const effectiveNavRules = getEffectiveNavigationRules(
    questions,
    navigationRules
  );

  let effectiveIds = answerableQuestionIds;

  // Apply jump logic filtering (server-computed, not client-trusted)
  if (effectiveNavRules.length > 0) {
    const answerableQuestions = questions
      .filter((q) => answerableQuestionIds.has(q.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let jumpVisibleQuestions;
    if (sections.length > 1) {
      jumpVisibleQuestions = [];
      for (const section of sections) {
        if (!visibleSectionIds.has(section.id)) continue;
        const sectionQuestions = answerableQuestions.filter(
          (q) =>
            section.questionIds?.includes(q.id) || q.sectionId === section.id
        );
        jumpVisibleQuestions.push(
          ...computeVisibleQuestionsInSection(
            sectionQuestions,
            effectiveNavRules,
            answers,
            section.id,
            questions
          )
        );
      }
    } else {
      jumpVisibleQuestions = computeVisibleQuestionsInSection(
        answerableQuestions,
        effectiveNavRules,
        answers,
        sections[0]?.id || null,
        questions
      );
    }

    effectiveIds = new Set(jumpVisibleQuestions.map((q) => q.id));
  }

  // Apply section-level scope narrowing for multi-step surveys
  const visitedSectionIdSet = new Set(visitedSectionIds || []);
  if (visitedSectionIdSet.size > 0) {
    const visitedQuestionScope = getQuestionIdsInSections(
      questions,
      sections,
      visitedSectionIdSet
    );
    effectiveIds = new Set(
      [...effectiveIds].filter((id) => visitedQuestionScope.has(id))
    );
  }

  return effectiveIds;
};

/**
 * Build a validated response context for submit/preview flows.
 * Keeps one shared source for key/visibility/scope validation.
 */
export const buildValidatedResponseContext = ({
  surveyVersion,
  answers,
  visitedSectionIds,
  invalidKeyStatusCode,
  nonApplicableStatusCode,
  allowNonApplicableAnswers = false,
}) => {
  if (!answers || typeof answers !== "object") {
    const error = new Error("Answers must be provided as an object");
    error.statusCode = 400;
    throw error;
  }

  const questionById = new Map(surveyVersion.questions.map((q) => [q.id, q]));
  const allowedAnswerKeys = getAllowedAnswerKeySet(surveyVersion.questions);
  const invalidQuestionIds = Object.keys(answers).filter(
    (id) => !allowedAnswerKeys.has(id)
  );

  if (invalidQuestionIds.length > 0) {
    const error = new Error(
      `Invalid question IDs: ${invalidQuestionIds.join(", ")}`
    );
    error.statusCode = invalidKeyStatusCode;
    throw error;
  }

  const visibleQuestionIds = getVisibleQuestionIds(
    surveyVersion.questions,
    surveyVersion.visibilityRules || [],
    answers
  );
  const visibleSectionIds = getVisibleSectionIds(
    surveyVersion.sections || [],
    surveyVersion.visibilityRules || [],
    answers
  );
  const answerableQuestionIds = getAnswerableQuestionIds(
    surveyVersion.questions,
    surveyVersion.sections || [],
    visibleQuestionIds,
    visibleSectionIds
  );

  const effectiveVisitedSectionIds =
    Array.isArray(visitedSectionIds) && visitedSectionIds.length > 0
      ? visitedSectionIds
      : inferVisitedSectionIdsFromAnswers(
          surveyVersion.questions,
          surveyVersion.sections || [],
          answers
        );

  const effectiveAnswerableQuestionIds = computeEffectiveAnswerableIds(
    surveyVersion.questions,
    surveyVersion.sections || [],
    surveyVersion.navigationRules || [],
    answerableQuestionIds,
    visibleSectionIds,
    answers,
    effectiveVisitedSectionIds
  );

  const nonApplicableAnswerKeys = getNonApplicableAnswerKeys(
    answers,
    effectiveAnswerableQuestionIds,
    questionById
  );

  const blockingNonApplicableAnswerKeys = nonApplicableAnswerKeys.filter(
    (answerKey) => !isOtherTextKey(answerKey)
  );

  if (!allowNonApplicableAnswers && blockingNonApplicableAnswerKeys.length > 0) {
    const error = new Error(
      `Answers include non-applicable questions: ${blockingNonApplicableAnswerKeys.join(
        ", "
      )}`
    );
    error.statusCode = nonApplicableStatusCode;
    throw error;
  }

  const cleanedAnswers = pruneAnswersToEffectiveScope(
    answers,
    effectiveAnswerableQuestionIds,
    questionById
  );

  return {
    cleanedAnswers,
    effectiveAnswerableQuestionIds,
  };
};

/**
 * Validate survey access based on whitelist settings
 * @param {Object} survey - Survey object
 * @param {string} identifier - Email or phone identifier
 * @returns {Object} Validation result
 */
const validateAccess = async (
  survey,
  { identifier, recipientId } = {},
  options = {}
) => {
  const mode = options.mode === "test" ? "test" : "live";
  // If whitelist is disabled, allow access
  if (!survey.isWhitelistEnabled) {
    return {
      allowed: true,
      recipient: null,
      respondentIdentifier: null,
      existingResponse: null,
    };
  }

  const surveyVersion = survey.publishedVersion;
  let recipient = null;
  let respondentIdentifier = null;

  if (identifier) {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    if (!normalizedIdentifier) {
      return { allowed: false, recipient: null };
    }

    respondentIdentifier = hashIdentifier(normalizedIdentifier);
    const phoneRegex = buildPhoneRegex(normalizedIdentifier);
    const recipientQuery = isValidEmail(normalizedIdentifier)
      ? {
          surveyId: survey._id,
          email: normalizedIdentifier,
        }
      : {
          surveyId: survey._id,
          $or: [
            { phone: normalizedIdentifier },
            ...(phoneRegex ? [{ phone: { $regex: phoneRegex } }] : []),
          ],
        };

    recipient = await Recipient.findOne(recipientQuery);
  } else if (recipientId) {
    recipient = await Recipient.findOne({
      _id: recipientId,
      surveyId: survey._id,
    });
  } else {
    return { allowed: false, recipient: null };
  }

  if (!recipient) {
    return {
      allowed: false,
      recipient: null,
      message:
        "This email or phone is not on the approved list for this survey.",
    };
  }

  if (recipient.isBlacklisted) {
    return {
      allowed: false,
      recipient: null,
      message: "Access denied. You have been blocked from this survey.",
    };
  }

  if (
    survey.oneResponsePerRecipient &&
    mode === "live" &&
    (recipient.status === "completed" || recipient.completedAt)
  ) {
    return {
      allowed: false,
      recipient: null,
      respondentIdentifier,
      existingResponse: null,
      statusCode: 409,
      message: "You have already completed this survey",
    };
  }

  const existingResponse =
    mode === "live"
      ? await Response.findOne(
          buildLiveResponseLookup({
            surveyId: survey._id,
            surveyVersion,
            recipientId: recipient._id,
            respondentIdentifier,
          })
        )
      : null;

  if (
    survey.oneResponsePerRecipient &&
    mode === "live" &&
    isCompletedResponse(existingResponse)
  ) {
    return {
      allowed: false,
      recipient: null,
      respondentIdentifier,
      existingResponse,
      statusCode: 409,
      message: "You have already completed this survey",
    };
  }

  return {
    allowed: true,
    recipient,
    respondentIdentifier,
    existingResponse,
  };
};

// @desc    Validate access to survey (whitelist check)
// @route   POST /api/surveys/:publicId/validate-access
// @access  Public
export const validateSurveyAccess = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const { identifier, recipientId } = req.body; // email or phone / direct invite link

  // Find survey by public ID
  const survey = await findPublicSurvey(publicId).lean();
  ensureSurveyAcceptsResponses(survey, res);

  // If no identifier provided, check if survey requires whitelist
  if (!identifier && !recipientId) {
    if (survey.isWhitelistEnabled) {
      res.status(400);
      throw new Error("Whitelisted email or phone is required for this survey");
    } else {
      return sendResponse(res, {
        data: {
          surveyId: survey._id,
          title: survey.title,
          description: survey.description,
          requiresIdentifier: false,
          accessGranted: true,
        },
        message: "Access validated successfully",
      });
    }
  }

  // Validate access
  const accessResult = await validateAccess(survey, { identifier, recipientId });

  if (!accessResult.allowed) {
    res.status(accessResult.statusCode || 403);
    throw new Error(
      accessResult.message ||
        "Access denied. You are not authorized to access this survey."
    );
  }

  sendResponse(res, {
    data: {
      surveyId: survey._id,
      title: survey.title,
      description: survey.description,
      requiresIdentifier: survey.isWhitelistEnabled,
      accessGranted: true,
      recipientId: accessResult.recipient?._id || null,
      responseStatus: accessResult.existingResponse
        ? accessResult.existingResponse.responseStatus || "completed"
        : null,
      resume: serializeResumeResponse(accessResult.existingResponse),
    },
    message: "Access validated successfully",
  });
});

// @desc    Save survey progress for identified respondents
// @route   POST /api/r/:publicId/progress
// @access  Public
export const saveResponseProgress = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const {
    answers,
    identifier,
    recipientId,
    startedAt,
    mode,
    visitedSectionIds,
    navigation,
  } = req.body;

  const responseMode = mode === "test" ? "test" : "live";
  if (responseMode !== "live") {
    res.status(400);
    throw new Error("Draft save is only supported for live survey responses");
  }

  const survey = await findPublicSurvey(publicId);
  ensureSurveyAcceptsResponses(survey, res);

  const accessResult = await validateAccess(
    survey,
    { identifier, recipientId },
    { mode: responseMode }
  );

  if (!accessResult.allowed || !accessResult.recipient) {
    res.status(accessResult.statusCode || 403);
    throw new Error(accessResult.message || "Access denied");
  }

  if (
    survey.oneResponsePerRecipient &&
    isCompletedResponse(accessResult.existingResponse)
  ) {
    res.status(409);
    throw new Error("You have already completed this survey");
  }

  const surveyVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.publishedVersion,
  });

  if (!surveyVersion) {
    res.status(404);
    throw new Error("Survey version not found");
  }

  let cleanedAnswers;
  try {
    const context = buildValidatedResponseContext({
      surveyVersion,
      answers,
      visitedSectionIds,
      invalidKeyStatusCode: 422,
      nonApplicableStatusCode: 422,
      allowNonApplicableAnswers: true,
    });
    cleanedAnswers = context.cleanedAnswers;
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || "Invalid response payload");
  }

  const savedAt = new Date();
  const normalizedNavigation = normalizeNavigationState(navigation || {});
  const progress = computeProgressSummary({
    surveyVersion,
    answers: cleanedAnswers,
  });
  const userAgent = req.get("User-Agent") || "";
  const device = detectDevice(userAgent);

  const responsePayload = buildResponsePayload({
    survey,
    surveyVersion,
    recipient: accessResult.recipient,
    respondentIdentifier: accessResult.respondentIdentifier,
    answers: cleanedAnswers,
    responseStatus: "in_progress",
    metadata: {},
    completionTime: accessResult.existingResponse?.completionTime || null,
    device,
    mode: responseMode,
    startedAt: startedAt
      ? new Date(startedAt)
      : accessResult.existingResponse?.startedAt || savedAt,
    navigation: normalizedNavigation,
    progress,
    savedAt,
  });

  const lookup = buildLiveResponseLookup({
    surveyId: survey._id,
    surveyVersion: survey.publishedVersion,
    recipientId: accessResult.recipient._id,
    respondentIdentifier: accessResult.respondentIdentifier,
    mode: responseMode,
  });

  const response = accessResult.existingResponse
    ? await Response.findOneAndUpdate(lookup, responsePayload, {
        new: true,
      })
    : await Response.create(responsePayload);

  await Recipient.findByIdAndUpdate(accessResult.recipient._id, {
    status: "in_progress",
    completedAt: null,
  });

  sendResponse(res, {
    data: {
      responseId: response._id,
      responseStatus: response.responseStatus,
      lastSavedAt: response.lastSavedAt,
      progress: response.progress,
      journey: buildJourneySummary(response),
    },
    message: "Survey progress saved successfully",
  });
});

// @desc    Get survey for respondent (public endpoint)
// @route   GET /api/surveys/:publicId
// @access  Public
export const getPublicSurvey = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  // Find live survey by public ID
  const survey = await findPublicSurvey(publicId).lean();

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found or not available");
  }

  // Get published version with questions
  const surveyVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.publishedVersion,
  }).lean();

  if (!surveyVersion || !surveyVersion.questions) {
    res.status(404);
    throw new Error("Survey content not found");
  }

  const company = survey.companyId
    ? await Company.findById(survey.companyId)
        .select("logo primaryColor secondaryColor defaultFont thankYouMessage")
        .lean()
    : null;
  const effectiveBranding = getEffectiveBrandingSettings(survey, company);

  const surveyData = {
    _id: survey._id,
    publicId: survey.publicId,
    title: survey.title,
    description: survey.description,
    status: survey.status,
    logo: effectiveBranding.logo || null,
    themeColor: effectiveBranding.themeColor || survey.themeColor,
    thankYouMessage: effectiveBranding.thankYouMessage,
    isWhitelistEnabled: survey.isWhitelistEnabled,
    oneResponsePerRecipient: survey.oneResponsePerRecipient,
    showProgress: survey.showProgress,
    questions: surveyVersion.questions,
    sections: surveyVersion.sections || [],
    visibilityRules: surveyVersion.visibilityRules || [],
    navigationRules: surveyVersion.navigationRules || [],
    settings: normalizePresentationSettings(
      surveyVersion.settings,
      surveyVersion.sections || []
    ),
    version: survey.publishedVersion,
  };

  sendResponse(res, {
    data: surveyData,
    message: "Survey retrieved successfully",
  });
});

// @desc    Submit survey response
// @route   POST /api/surveys/:publicId/responses
// @access  Public
export const submitResponse = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const {
    answers,
    identifier,
    recipientId,
    completionTime,
    startedAt,
    mode,
    visitedSectionIds,
    navigation,
  } = req.body;

  // Find published survey
  const survey = await findPublicSurvey(publicId);
  ensureSurveyAcceptsResponses(survey, res);

  // Validate access if required
  let recipient = null;
  let respondentIdentifier = null;
  const responseMode = mode === "test" ? "test" : "live";

  if (recipientId && !mongoose.Types.ObjectId.isValid(recipientId)) {
    res.status(400);
    throw new Error("Invalid recipient id");
  }

  if (survey.isWhitelistEnabled) {
    if (!identifier && !recipientId) {
      res.status(400);
      throw new Error(
        "Whitelisted email or phone is required, or use a valid recipient link"
      );
    }
    const accessResult = await validateAccess(
      survey,
      { identifier, recipientId },
      { mode: responseMode }
    );
    if (!accessResult.allowed) {
      res.status(accessResult.statusCode || 403);
      throw new Error(accessResult.message || "Access denied");
    }

    recipient = accessResult.recipient;
    respondentIdentifier = accessResult.respondentIdentifier;

    if (
      identifier &&
      recipientId &&
      recipient &&
      recipient._id.toString() !== recipientId.toString()
    ) {
      res.status(403);
      throw new Error("Recipient link does not match the provided identifier");
    }

    if (
      survey.oneResponsePerRecipient &&
      responseMode === "live" &&
      isCompletedResponse(accessResult.existingResponse)
    ) {
      res.status(400);
      throw new Error("You have already completed this survey");
    }
  } else if (recipientId) {
    recipient = await Recipient.findOne({
      _id: recipientId,
      surveyId: survey._id,
    });

    if (!recipient) {
      res.status(404);
      throw new Error("Recipient not found for this survey");
    }

    if (recipient.isBlacklisted) {
      res.status(403);
      throw new Error("Access denied. You have been blocked from this survey.");
    }

    if (survey.oneResponsePerRecipient && responseMode === "live") {
      const existingResponse = await Response.findOne({
        surveyId: survey._id,
        surveyVersion: survey.publishedVersion,
        recipientId: recipient._id,
        mode: "live",
        $or: [
          { responseStatus: "completed" },
          { responseStatus: { $exists: false } },
        ],
      });

      if (existingResponse) {
        res.status(400);
        throw new Error("This recipient has already completed this survey");
      }
    }
  }

  // Get survey version with questions for validation
  const surveyVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.publishedVersion,
  });

  if (!surveyVersion) {
    res.status(404);
    throw new Error("Survey version not found");
  }

  let cleanedAnswers;
  let effectiveAnswerableQuestionIds;
  try {
    const context = buildValidatedResponseContext({
      surveyVersion,
      answers,
      visitedSectionIds,
      invalidKeyStatusCode: 422,
      nonApplicableStatusCode: 422,
      allowNonApplicableAnswers: responseMode === "test",
    });
    cleanedAnswers = context.cleanedAnswers;
    effectiveAnswerableQuestionIds = context.effectiveAnswerableQuestionIds;
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || "Invalid response payload");
  }

  // Validate required questions are answered (only for visible questions)
  const requiredQuestionIds = surveyVersion.questions
    .filter((q) => q.required)
    .map((q) => q.id);
  const answeredQuestionIds = Object.entries(cleanedAnswers)
    .filter(([, value]) => isAnswerProvided(value))
    .map(([questionId]) => questionId);
  const { missingRequiredQuestionIds } = getRequiredValidationSet({
    requiredQuestionIds,
    visibleQuestionIds: effectiveAnswerableQuestionIds,
    answeredQuestionIds,
  });
  const missingAnswers = surveyVersion.questions
    .filter((q) => missingRequiredQuestionIds.has(q.id))
    .map((q) => q.title);

  if (missingAnswers.length > 0) {
    res.status(422);
    throw new Error(`Missing required answers: ${missingAnswers.join(", ")}`);
  }

  // Validate only effective answerable questions
  for (const question of surveyVersion.questions) {
    if (!effectiveAnswerableQuestionIds.has(question.id)) continue;

    const answer = cleanedAnswers[question.id];
    if (!isAnswerProvided(answer)) continue;

    // Validate multiple choice minSelections/maxSelections
    if (question.type === "multiple_choice") {
      if (!Array.isArray(answer)) {
        res.status(422);
        throw new Error(`Answer for "${question.title}" must be an array`);
      }

      const { minSelections, maxSelections } = question.validation || {};
      if (minSelections && answer.length < minSelections) {
        res.status(422);
        throw new Error(
          `${question.title}: Select at least ${minSelections} options`
        );
      }
      if (maxSelections && answer.length > maxSelections) {
        res.status(422);
        throw new Error(
          `${question.title}: Select no more than ${maxSelections} options`
        );
      }
      if (answer.includes("None") && answer.length > 1) {
        res.status(422);
        throw new Error(
          `${question.title}: "None" cannot be combined with other options`
        );
      }

      // Validate option values against allowed options
      if (question.options) {
        const validOptions = question.allowOther
          ? [...question.options, "Other"]
          : question.options;
        const invalidOptions = answer.filter(
          (opt) => !validOptions.includes(opt)
        );
        if (invalidOptions.length > 0) {
          res.status(422);
          throw new Error(
            `${question.title}: Invalid options - ${invalidOptions.join(", ")}`
          );
        }
      }

      if (question.allowOther && answer.includes("Other")) {
        const otherText = cleanedAnswers[`${question.id}_other_text`];
        if (!otherText || otherText.trim() === "") {
          res.status(422);
          throw new Error(`${question.title}: Please specify "Other" answer`);
        }
      }
    }

    // Validate choice options
    if (["single_choice", "dropdown"].includes(question.type)) {
      if (question.options) {
        const validOptions = question.allowOther
          ? [...question.options, "Other"]
          : question.options;
        if (!validOptions.includes(answer)) {
          res.status(422);
          throw new Error(`Invalid option for "${question.title}"`);
        }
      }

      // Validate "Other" text
      if (answer === "Other" && question.allowOther) {
        const otherText = cleanedAnswers[`${question.id}_other_text`];
        if (!otherText || otherText.trim() === "") {
          res.status(422);
          throw new Error(`${question.title}: Please specify "Other" answer`);
        }
      }
    }

    // Validate text inputs
    if (["short_text", "long_text"].includes(question.type)) {
      if (typeof answer !== "string") {
        res.status(422);
        throw new Error(`${question.title}: Answer must be text`);
      }

      const minLength = question.validation?.minLength;
      const maxLength = question.validation?.maxLength;
      if (
        minLength &&
        typeof answer === "string" &&
        answer.length < minLength
      ) {
        res.status(422);
        throw new Error(
          `${question.title}: Minimum length is ${minLength} characters`
        );
      }

      if (
        maxLength &&
        typeof answer === "string" &&
        answer.length > maxLength
      ) {
        res.status(422);
        throw new Error(
          `${question.title}: Maximum length is ${maxLength} characters`
        );
      }

      const patternValidation = getTextPatternValidation(question);
      if (
        patternValidation &&
        typeof answer === "string" &&
        !patternValidation.regex.test(
          normalizeAnswerForPattern(answer, patternValidation.label)
        )
      ) {
        res.status(422);
        throw new Error(
          question.validation?.customMessage ||
            question.validationMessage ||
            `${question.title}: Please enter a valid ${patternValidation.label} value`
        );
      }
    }

    if (question.type === "rating") {
      const scale = Number(question.ratingScale || 5);
      const value = Number(answer);
      if (!Number.isInteger(value) || value < 1 || value > scale) {
        res.status(422);
        throw new Error(
          `${question.title}: Rating must be an integer between 1 and ${scale}`
        );
      }
    }
  }

  // Calculate completion time if not provided
  let calculatedCompletionTime = completionTime || null;
  if (!calculatedCompletionTime && startedAt) {
    const startTime = new Date(startedAt);
    const endTime = new Date();
    const elapsed = Math.round((endTime - startTime) / 1000);
    // Only store if positive — negative means clock skew, 0 means sub-second
    if (elapsed > 0) calculatedCompletionTime = elapsed;
  }

  // Detect device type
  const userAgent = req.get("User-Agent") || "";
  const device = detectDevice(userAgent);

  // Prepare metadata if survey captures it
  let metadata = {};
  if (survey.captureMetadata) {
    metadata = {
      ip: req.ip,
      userAgent: userAgent,
      acceptLanguage: req.get("Accept-Language") || "",
    };
  }

  const savedAt = new Date();
  const progress = computeProgressSummary({
    surveyVersion,
    answers: cleanedAnswers,
    visitedSectionIds,
  });
  progress.percentComplete = 100;

  const responsePayload = buildResponsePayload({
    survey,
    surveyVersion,
    recipient,
    respondentIdentifier,
    answers: cleanedAnswers,
    responseStatus: "completed",
    metadata,
    completionTime: calculatedCompletionTime ?? null,
    device,
    mode: responseMode,
    startedAt: startedAt ? new Date(startedAt) : undefined,
    navigation: normalizeNavigationState(navigation || {}),
    progress,
    savedAt,
  });

  const lookup =
    responseMode === "live" && (recipient?._id || respondentIdentifier)
      ? buildLiveResponseLookup({
          surveyId: survey._id,
          surveyVersion: survey.publishedVersion,
          recipientId: recipient?._id,
          respondentIdentifier,
          mode: responseMode,
        })
      : null;
  const existingResponse = lookup ? await Response.findOne(lookup) : null;
  const response = existingResponse
    ? await Response.findOneAndUpdate(lookup, responsePayload, { new: true })
    : await Response.create(responsePayload);

  // Update recipient status if applicable
  if (recipient && responseMode === "live") {
    await Recipient.findByIdAndUpdate(recipient._id, {
      status: "completed",
      completedAt: new Date(),
    });
  }

  const company = survey.companyId
    ? await Company.findById(survey.companyId)
        .select("logo primaryColor secondaryColor defaultFont thankYouMessage")
        .lean()
    : null;
  const effectiveBranding = getEffectiveBrandingSettings(survey, company);

  sendCreated(
    res,
    {
      responseId: response._id,
      message:
        effectiveBranding.thankYouMessage || "Thank you for your response!",
    },
    "Response submitted successfully"
  );
});

// @desc    Get survey for preview (no whitelist enforcement)
// @route   GET /api/r/:publicId/preview
// @access  Public
export const getPreviewSurvey = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  // Find published survey
  const survey = await Survey.findOne({
    publicId,
    status: "published",
  }).lean();

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found or not available");
  }

  // Get published version with questions
  const surveyVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.publishedVersion,
  }).lean();

  if (!surveyVersion || !surveyVersion.questions) {
    res.status(404);
    throw new Error("Survey content not found");
  }

  const company = survey.companyId
    ? await Company.findById(survey.companyId)
        .select("logo primaryColor secondaryColor defaultFont thankYouMessage")
        .lean()
    : null;
  const effectiveBranding = getEffectiveBrandingSettings(survey, company);

  const surveyData = {
    _id: survey._id,
    publicId: survey.publicId,
    title: survey.title,
    description: survey.description,
    logo: effectiveBranding.logo || null,
    themeColor: effectiveBranding.themeColor || survey.themeColor,
    thankYouMessage: effectiveBranding.thankYouMessage,
    isWhitelistEnabled: false, // Disable whitelist for preview
    oneResponsePerRecipient: survey.oneResponsePerRecipient,
    showProgress: survey.showProgress,
    questions: surveyVersion.questions,
    sections: surveyVersion.sections || [],
    visibilityRules: surveyVersion.visibilityRules || [],
    navigationRules: surveyVersion.navigationRules || [],
    settings: normalizePresentationSettings(
      surveyVersion.settings,
      surveyVersion.sections || []
    ),
    version: survey.publishedVersion,
    mode: "preview", // Explicitly mark as preview mode
  };

  sendResponse(res, {
    data: surveyData,
    message: "Preview survey retrieved successfully",
  });
});

// @desc    Simulate survey response submission (validation only, no save)
// @route   POST /api/r/:publicId/preview/submit
// @access  Public
export const simulatePreviewSubmission = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const { answers, visitedSectionIds } = req.body;

  // Find published survey
  const survey = await Survey.findOne({
    publicId,
    status: "published",
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found or not available");
  }

  // Get survey version for validation
  const surveyVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.publishedVersion,
  });

  if (!surveyVersion) {
    res.status(404);
    throw new Error("Survey version not found");
  }

  let cleanedAnswers;
  let effectiveAnswerableQuestionIds;
  try {
    const context = buildValidatedResponseContext({
      surveyVersion,
      answers,
      visitedSectionIds,
      invalidKeyStatusCode: 400,
      nonApplicableStatusCode: 400,
      allowNonApplicableAnswers: true,
    });
    cleanedAnswers = context.cleanedAnswers;
    effectiveAnswerableQuestionIds = context.effectiveAnswerableQuestionIds;
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || "Invalid response payload");
  }

  // Validate required questions (soft validation for preview - only visible questions)
  const requiredQuestionIds = surveyVersion.questions
    .filter((q) => q.required)
    .map((q) => q.id);
  const answeredQuestionIds = Object.entries(cleanedAnswers)
    .filter(([, value]) => isAnswerProvided(value))
    .map(([questionId]) => questionId);
  const { missingRequiredQuestionIds } = getRequiredValidationSet({
    requiredQuestionIds,
    visibleQuestionIds: effectiveAnswerableQuestionIds,
    answeredQuestionIds,
  });
  const missingAnswers = surveyVersion.questions
    .filter((q) => missingRequiredQuestionIds.has(q.id))
    .map((q) => q.title);

  if (missingAnswers.length > 0) {
    res.status(400);
    throw new Error(`Missing required answers: ${missingAnswers.join(", ")}`);
  }

  // Return success without saving
  sendResponse(res, {
    data: {
      message: "Preview submission validated successfully. No data was saved.",
      mode: "preview",
    },
    message: "Preview submission successful",
  });
});

// @desc    Get all responses for survey with pagination (Admin)
// @route   GET /api/surveys/:id/responses
// @access  Private
export const getResponses = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Parse pagination and filters
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const search = req.query.search?.trim();

  const query = {
    surveyId,
    mode: "live",
    $or: [
      { responseStatus: "completed" },
      { responseStatus: { $exists: false } },
    ],
  };
  if (search) {
    const textRegex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    query.$or = [
      { recipientName: textRegex },
      { recipientEmail: textRegex },
      { recipientPhone: textRegex },
    ];
  }

  // Execute paginated query
  const result = await executePagedQuery(Response, query, {
    page,
    pageSize,
    sort: { submittedAt: -1 },
    select:
      "recipientId recipientName recipientPhone recipientEmail submittedAt completionTime device surveyVersion",
  });

  sendResponse(res, {
    data: result.data,
    paging: result.paging,
    message: "Responses retrieved successfully",
  });
});

// @desc    Get single response details (Admin)
// @route   GET /api/responses/:id
// @access  Private
export const getResponse = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);

  const response = await Response.findById(req.params.id)
    .populate("surveyId", "title companyId")
    .lean();

  if (!response) {
    res.status(404);
    throw new Error("Response not found");
  }

  if (!response.surveyId) {
    res.status(404);
    throw new Error("Associated survey not found for this response");
  }

  // Check if response belongs to user's company
  if (
    isScoped &&
    (!response.surveyId.companyId ||
      response.surveyId.companyId.toString() !== companyId.toString())
  ) {
    res.status(403);
    throw new Error("Access denied");
  }

  const normalizeAnswers = (answers) => {
    if (!answers) return {};
    if (answers instanceof Map) return Object.fromEntries(answers);
    if (typeof answers === "object") return answers;
    return {};
  };
  const normalizedAnswers = normalizeAnswers(response.answers);

  let questionMetaById = new Map();
  if (response.surveyId?._id && response.surveyVersion) {
    const surveyVersion = await SurveyVersion.findOne({
      surveyId: response.surveyId._id,
      version: response.surveyVersion,
    })
      .select("questions sections")
      .lean();

    const sectionTitleById = new Map(
      (surveyVersion?.sections || []).map((section) => [
        section.id,
        section.title || null,
      ])
    );

    questionMetaById = new Map(
      (surveyVersion?.questions || []).map((q) => [
        q.id,
        {
          title: q.title || q.id,
          type: q.type || null,
          required: !!q.required,
          sectionTitle: q.sectionId
            ? sectionTitleById.get(q.sectionId) || null
            : null,
        },
      ])
    );
  }

  // Normalize answers for JSON response
  const responseData = {
    ...response,
    answers: normalizedAnswers,
    answersDetailed: Object.entries(normalizedAnswers).map(
      ([questionId, value]) => ({
        questionId,
        questionTitle: questionMetaById.get(questionId)?.title || questionId,
        questionType: questionMetaById.get(questionId)?.type || null,
        required: questionMetaById.get(questionId)?.required || false,
        sectionTitle: questionMetaById.get(questionId)?.sectionTitle || null,
        value,
      })
    ),
  };

  sendResponse(res, {
    data: responseData,
    message: "Response retrieved successfully",
  });
});

// @desc    Delete response (Admin override)
// @route   DELETE /api/responses/:id
// @access  Private - Admin only
export const deleteResponse = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const { role } = req.user;

  // Only admins can delete responses
  if (role !== "admin") {
    res.status(403);
    throw new Error("Access denied - admin privileges required");
  }

  const response = await Response.findById(req.params.id)
    .populate("surveyId", "title companyId")
    .populate("recipientId", "name");

  if (!response) {
    res.status(404);
    throw new Error("Response not found");
  }

  // Check if response belongs to user's company
  if (
    isScoped &&
    response.surveyId.companyId.toString() !== companyId.toString()
  ) {
    res.status(403);
    throw new Error("Access denied");
  }

  // If response has a recipient, update their status back to invited
  if (response.recipientId) {
    await Recipient.findByIdAndUpdate(response.recipientId._id, {
      status: "invited",
      completedAt: null,
    });
  }

  await Response.findByIdAndDelete(req.params.id);

  sendResponse(res, {
    data: { deletedResponseId: req.params.id },
    message: "Response deleted successfully - recipient can now resubmit",
  });
});

// @desc    Reset recipient submission status (Admin override)
// @route   POST /api/recipients/:id/reset
// @access  Private - Admin only
export const resetRecipientStatus = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const { role } = req.user;

  // Only admins can reset recipient status
  if (role !== "admin") {
    res.status(403);
    throw new Error("Access denied - admin privileges required");
  }

  const recipient = await Recipient.findById(req.params.id).populate(
    "surveyId",
    "companyId title"
  );

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  // Check if recipient belongs to user's company survey
  if (
    isScoped &&
    recipient.surveyId.companyId.toString() !== companyId.toString()
  ) {
    res.status(403);
    throw new Error("Access denied");
  }

  // Delete any existing responses for this recipient
  const deletedResponses = await Response.deleteMany({
    surveyId: recipient.surveyId._id,
    recipientId: recipient._id,
  });

  // Reset recipient status
  await Recipient.findByIdAndUpdate(recipient._id, {
    status: "invited",
    completedAt: null,
  });

  sendResponse(res, {
    data: {
      recipientId: recipient._id,
      deletedResponseCount: deletedResponses.deletedCount,
    },
    message: `Recipient status reset - ${deletedResponses.deletedCount} response(s) deleted`,
  });
});
