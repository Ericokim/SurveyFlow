/**
 * Survey Controllers
 *
 * Handles survey CRUD operations including create, read, update, publish, and close.
 * Follows KISS + DRY principles with standardized responses and pagination.
 *
 * @fileoverview Survey controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse, sendCreated, sendUpdated } from "../utils/response.js";
import { executePagedQuery } from "../utils/pagination.utils.js";
import Survey from "../models/survey.models.js";
import SurveyVersion from "../models/survey_version.models.js";
import Response from "../models/response.models.js";
import Recipient from "../models/recipient.models.js";
import {
  getEffectiveBrandingSettings,
  validateBrandingFields,
  getCompanyBranding,
  sanitizeBrandingFields,
} from "../services/branding.service.js";
import {
  createSurveyUpload,
  deleteLogo,
  validateUploadFile,
} from "../services/upload.service.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";
import { logger } from "../utils/logger.js";
import {
  buildDuplicateTitle,
  remapVersionPayload,
} from "../utils/surveyClone.js";
import { normalizeQuestionValidation } from "../utils/questionValidation.js";
import mongoose from "mongoose";
import fs from "fs/promises";

const normalizePresentationSettings = (settings = {}, sections = []) => {
  const isSectional = settings?.isSectional ?? false;
  return {
    presentationMode:
      Array.isArray(sections) && sections.length > 1
        ? "multi_step"
        : isSectional
        ? "multi_step"
        : settings?.presentationMode || "single_page",
    autoAdvanceThreshold: settings?.autoAdvanceThreshold ?? null,
    isSectional,
  };
};

const buildFlowCondition = (questionId, rule) => {
  if (!questionId) return null;
  if (rule?.value !== undefined) {
    return {
      questionId,
      operator: "equals",
      value: rule.value,
    };
  }
  if (rule?.valueContains !== undefined) {
    return {
      questionId,
      operator: "in",
      value: [rule.valueContains],
    };
  }
  return null;
};

const buildQuestionOrderIndex = (questions = [], sections = []) => {
  const questionById = new Map((questions || []).map((q) => [q.id, q]));
  const sectionSorted = [...(sections || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const ordered = [];
  for (const section of sectionSorted) {
    for (const questionId of section.questionIds || []) {
      const question = questionById.get(questionId);
      if (question) {
        ordered.push(question);
      }
    }
  }
  const seen = new Set(ordered.map((q) => q.id));
  const remaining = (questions || [])
    .filter((q) => !seen.has(q.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return new Map([...ordered, ...remaining].map((q, index) => [q.id, index]));
};

const normalizeSurveyLogicPayload = ({
  questions = [],
  visibilityRules = [],
  navigationRules = [],
  flowRules = [],
} = {}) => {
  const normalizedVisibilityRules = Array.isArray(visibilityRules)
    ? [...visibilityRules]
    : [];
  const normalizedNavigationRules = Array.isArray(navigationRules)
    ? [...navigationRules]
    : [];

  const normalizedQuestions = Array.isArray(questions)
    ? questions.map((question) => {
        const { visibility, hasOther, scale, ...rest } = question || {};
        const normalizedQuestion = {
          ...rest,
        };

        if (
          normalizedQuestion.allowOther === undefined &&
          hasOther !== undefined
        ) {
          normalizedQuestion.allowOther = hasOther;
        }

        if (
          normalizedQuestion.ratingScale === undefined &&
          scale !== undefined
        ) {
          normalizedQuestion.ratingScale = scale;
        }

        if (!visibility) {
          return normalizedQuestion;
        }
        if (
          visibility?.dependsOn &&
          Array.isArray(visibility.showIf) &&
          visibility.showIf.length > 0
        ) {
          normalizedVisibilityRules.push({
            id: uuidv4(),
            targetType: "question",
            targetId: question.id,
            effect: "show",
            when: {
              questionId: visibility.dependsOn,
              operator: "in",
              value: visibility.showIf,
            },
            priority: 0,
          });
        }

        return normalizedQuestion;
      })
    : questions;

  if (Array.isArray(flowRules)) {
    for (const flowRule of flowRules) {
      const questionId = flowRule?.questionId;
      const rules = Array.isArray(flowRule?.rules) ? flowRule.rules : [];

      for (const rule of rules) {
        const condition = buildFlowCondition(questionId, rule);
        if (!condition) continue;

        if (rule.action === "go_to_section" && rule.target) {
          normalizedNavigationRules.push({
            id: uuidv4(),
            fromSectionId: null,
            when: condition,
            action: {
              type: "jump",
              targetSectionId: rule.target,
            },
            priority: 0,
          });
        }

        if (
          (rule.action === "go_to_question" ||
            rule.action === "jump_to_question") &&
          rule.target
        ) {
          normalizedNavigationRules.push({
            id: uuidv4(),
            fromSectionId: null,
            when: condition,
            action: {
              type: "jump_to_question",
              targetQuestionId: rule.target,
            },
            priority: 0,
          });
        }

        if (rule.action === "end" || rule.action === "terminate") {
          normalizedNavigationRules.push({
            id: uuidv4(),
            fromSectionId: null,
            when: condition,
            action: {
              type: "terminate",
            },
            priority: 0,
          });
        }

        if (rule.action === "show_question" && rule.target) {
          normalizedVisibilityRules.push({
            id: uuidv4(),
            targetType: "question",
            targetId: rule.target,
            effect: "show",
            when: condition,
            priority: 0,
          });
        }

        if (rule.action === "show_section" && rule.target) {
          // Skip if the controlling question is inside the target section
          // (would create circular dependency — section hidden prevents question from being answered)
          const sourceQuestion = normalizedQuestions.find(
            (q) => q.id === questionId
          );
          if (sourceQuestion?.sectionId === rule.target) {
            continue;
          }
          normalizedVisibilityRules.push({
            id: uuidv4(),
            targetType: "section",
            targetId: rule.target,
            effect: "show",
            when: condition,
            priority: 0,
          });
        }
      }
    }
  }

  return {
    questions: normalizedQuestions,
    visibilityRules: normalizedVisibilityRules,
    navigationRules: normalizedNavigationRules,
  };
};

const normalizeVersionQuestionValidations = (versionDoc) => {
  if (!versionDoc || !Array.isArray(versionDoc.questions)) return false;
  let hasChanges = false;

  versionDoc.questions = versionDoc.questions.map((question) => {
    const normalizedValidation = normalizeQuestionValidation(question?.validation);
    const before = question?.validation?.predefinedPattern;
    const after = normalizedValidation?.predefinedPattern;

    if (before !== after) {
      hasChanges = true;
    }

    return {
      ...question,
      validation: normalizedValidation,
    };
  });

  return hasChanges;
};

// Configure multer for survey logo uploads
export const uploadSurveyLogo = createSurveyUpload();

// @desc    Get all surveys for company with pagination
// @route   GET /api/surveys
// @access  Private
export const getSurveys = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // Parse pagination and filters
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const status = req.query.status;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const isWhitelistEnabled = req.query.isWhitelistEnabled;

  // Build filter - in dev mode, allow viewing all surveys if companyId is not properly set
  const filter = { isDeleted: false }; // Exclude soft-deleted surveys
  if (companyId) {
    filter.companyId = companyId;
  }
  if (status && ["draft", "published", "closed"].includes(status)) {
    filter.status = status;
  }
  if (
    isWhitelistEnabled !== undefined &&
    isWhitelistEnabled !== null &&
    isWhitelistEnabled !== ""
  ) {
    filter.isWhitelistEnabled =
      isWhitelistEnabled === "true" || isWhitelistEnabled === true;
  }
  if (startDate || endDate) {
    const createdAt = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!Number.isNaN(parsedStart.getTime())) {
        createdAt.$gte = parsedStart;
      }
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!Number.isNaN(parsedEnd.getTime())) {
        createdAt.$lte = parsedEnd;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      filter.createdAt = createdAt;
    }
  }

  // Execute paginated query
  const result = await executePagedQuery(Survey, filter, {
    page,
    pageSize,
    sort: { updatedAt: -1 },
    select:
      "_id title description status publicId isWhitelistEnabled currentVersion publishedVersion publishedAt closedAt createdAt updatedAt",
  });

  // Batch-load versions and response counts to avoid N+1 queries.
  const surveyIds = result.data.map((survey) => survey._id);
  const versionKeys = result.data
    .filter((survey) => survey.currentVersion > 0)
    .map((survey) => ({
      surveyId: survey._id,
      version: survey.currentVersion,
    }));

  const [versions, responseCounts] = await Promise.all([
    versionKeys.length > 0
      ? SurveyVersion.find({
          $or: versionKeys.map((entry) => ({
            surveyId: entry.surveyId,
            version: entry.version,
          })),
        })
          .select(
            "surveyId version questions.id sections.id settings.isSectional"
          )
          .lean()
      : Promise.resolve([]),
    surveyIds.length > 0
      ? Response.aggregate([
          {
            $match: {
              surveyId: { $in: surveyIds },
              mode: "live",
              $or: [
                { responseStatus: "completed" },
                { responseStatus: { $exists: false } },
              ],
            },
          },
          { $group: { _id: "$surveyId", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const versionBySurveyAndNumber = new Map(
    versions.map((version) => [
      `${String(version.surveyId)}:${version.version}`,
      version,
    ])
  );
  const responseCountBySurvey = new Map(
    responseCounts.map((item) => [String(item._id), item.count || 0])
  );

  const surveysWithQuestionCount = result.data.map((survey) => {
    const version =
      survey.currentVersion > 0
        ? versionBySurveyAndNumber.get(
            `${String(survey._id)}:${survey.currentVersion}`
          )
        : null;

    const inferredIsSectional =
      version?.settings?.isSectional ??
      (Array.isArray(version?.sections) && version.sections.length > 1);
    const normalizedSettings = {
      ...normalizePresentationSettings(
      version?.settings || {},
      version?.sections || []
      ),
      isSectional: Boolean(inferredIsSectional),
    };
    const isSectional = Boolean(inferredIsSectional);

    return {
      ...survey,
      questionCount: Array.isArray(version?.questions)
        ? version.questions.length
        : 0,
      sectionCount: Array.isArray(version?.sections) ? version.sections.length : 0,
      questions: version?.questions || [],
      sections: version?.sections || [],
      settings: normalizedSettings,
      structure: isSectional ? "Sections" : "Questions only",
      responseCount: responseCountBySurvey.get(String(survey._id)) || 0,
    };
  });

  sendResponse(res, {
    data: surveysWithQuestionCount,
    paging: result.paging,
    message: "Surveys retrieved successfully",
  });
});

// @desc    Get single survey by ID
// @route   GET /api/surveys/:id
// @access  Private
export const getSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // Build match - in dev mode, allow viewing all surveys if companyId is not properly set
  const match = { isDeleted: false }; // Exclude soft-deleted surveys
  match._id = req.params.id;
  if (companyId) {
    match.companyId = companyId;
  }

  const survey = await Survey.findOne(match).lean();

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get current version with questions if it exists
  let currentVersion = null;
  if (survey.currentVersion > 0) {
    currentVersion = await SurveyVersion.findOne({
      surveyId: survey._id,
      version: survey.currentVersion,
    }).lean();
  }

  const response = {
    ...survey,
    questions: currentVersion ? currentVersion.questions : [],
    sections: currentVersion ? currentVersion.sections || [] : [],
    visibilityRules: currentVersion ? currentVersion.visibilityRules || [] : [],
    navigationRules: currentVersion ? currentVersion.navigationRules || [] : [],
    settings: currentVersion
      ? normalizePresentationSettings(
          currentVersion.settings,
          currentVersion.sections || []
        )
      : {
          presentationMode: "single_page",
          autoAdvanceThreshold: null,
          isSectional: false,
        },
  };

  sendResponse(res, {
    data: response,
    message: "Survey retrieved successfully",
  });
});

// @desc    Create new survey
// @route   POST /api/surveys
// @access  Private
export const createSurvey = asyncHandler(async (req, res) => {
  const companyIdRaw = req.user?.companyId;
  const rawUserId = req.user?._id || req.user?.id;
  if (!mongoose.Types.ObjectId.isValid(companyIdRaw)) {
    res.status(401);
    throw new Error("Authentication required: missing company scope");
  }
  if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
    res.status(401);
    throw new Error("Authentication required: missing user identity");
  }
  const companyId = new mongoose.Types.ObjectId(companyIdRaw);
  const userId = new mongoose.Types.ObjectId(rawUserId);
  const {
    title,
    description,
    questions = [],
    sections = [],
    visibilityRules = [],
    navigationRules = [],
    flowRules = [],
    settings,
    logo,
    themeColor,
    thankYouMessage,
    isWhitelistEnabled,
    showProgress,
    oneResponsePerRecipient,
  } = req.body;

  const brandingFields = { logo, themeColor, thankYouMessage };
  const brandingValidation = validateBrandingFields(brandingFields);
  if (!brandingValidation.isValid) {
    res.status(400);
    throw new Error(
      `Branding validation failed: ${brandingValidation.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ")}`
    );
  }

  const sanitizedBranding = sanitizeBrandingFields(brandingFields);

  const normalizedLogic = normalizeSurveyLogicPayload({
    questions,
    visibilityRules,
    navigationRules,
    flowRules,
  });
  const normalizedQuestionsInput = normalizedLogic.questions || questions;
  const normalizedVisibilityRulesInput =
    normalizedLogic.visibilityRules || visibilityRules;
  const normalizedNavigationRulesInput =
    normalizedLogic.navigationRules || navigationRules;

  // Create survey
  const survey = await Survey.create({
    companyId,
    title,
    description,
    publicId: uuidv4(),
    createdBy: userId,
    currentVersion:
      normalizedQuestionsInput.length > 0 || sections.length > 0 ? 1 : 0,
    logo: sanitizedBranding.logo,
    themeColor: sanitizedBranding.themeColor,
    thankYouMessage: sanitizedBranding.thankYouMessage,
    isWhitelistEnabled: isWhitelistEnabled ?? false,
    showProgress: showProgress ?? false,
    oneResponsePerRecipient: oneResponsePerRecipient ?? false,
  });

  // Create initial version if questions or sections provided
  if (normalizedQuestionsInput.length > 0 || sections.length > 0) {
    const sanitizedQuestions = normalizedQuestionsInput.map((q, index) => {
      const isChoice = [
        "single_choice",
        "multiple_choice",
        "dropdown",
      ].includes(q.type);
      const isRating = q.type === "rating";
      const cleaned = {
        ...q,
        id: q.id || uuidv4(),
        order: index + 1,
        validation: normalizeQuestionValidation(q.validation),
      };
      if (!isChoice) {
        delete cleaned.options;
        delete cleaned.allowOther;
      }
      if (!isRating) delete cleaned.ratingScale;
      else cleaned.ratingScale = cleaned.ratingScale || 5;
      return cleaned;
    });

    const normalizedSections = Array.isArray(sections)
      ? sections.map((section, index) => ({
          id: section.id || `section_${uuidv4()}`,
          title: section.title || `Section ${index + 1}`,
          description: section.description || "",
          order: section.order ?? index,
          questionIds: Array.isArray(section.questionIds)
            ? section.questionIds
            : [],
          required: section.required || false,
          randomizeQuestions: section.randomizeQuestions || false,
          pageBreak: section.pageBreak || false,
        }))
      : [];

    const sectionsToSave =
      normalizedSections.length === 0
        ? [
            {
              id: `section_${uuidv4()}`,
              title: "Main Questions",
              description: "",
              order: 0,
              questionIds: sanitizedQuestions.map((q) => q.id),
              required: false,
              randomizeQuestions: false,
              pageBreak: false,
            },
          ]
        : normalizedSections;

    await SurveyVersion.create({
      surveyId: survey._id,
      companyId,
      createdBy: userId,
      version: 1,
      questions: sanitizedQuestions,
      sections: sectionsToSave,
      visibilityRules: Array.isArray(normalizedVisibilityRulesInput)
        ? normalizedVisibilityRulesInput
        : [],
      navigationRules: Array.isArray(normalizedNavigationRulesInput)
        ? normalizedNavigationRulesInput
        : [],
      settings: normalizePresentationSettings(settings, sectionsToSave),
    });
  }

  // Return survey with questions
  const surveyWithQuestions = {
    ...survey.toObject(),
    questions: normalizedQuestionsInput,
    sections,
    visibilityRules: normalizedVisibilityRulesInput,
    navigationRules: normalizedNavigationRulesInput,
    settings,
  };

  sendCreated(res, surveyWithQuestions, "Survey created successfully");
});

// @desc    Update survey
// @route   PATCH /api/surveys/:id
// @access  Private
export const updateSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;
  const rawUserId = req.user?._id || req.user?.id;
  if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
    res.status(401);
    throw new Error("Authentication required: missing user identity");
  }
  const userId = new mongoose.Types.ObjectId(rawUserId);
  const {
    title,
    description,
    questions,
    sections,
    visibilityRules,
    navigationRules,
    flowRules,
    settings,
    logo,
    themeColor,
    thankYouMessage,
    isWhitelistEnabled,
    showProgress,
    oneResponsePerRecipient,
  } = req.body;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Can only edit draft and published surveys (closed surveys are locked)
  if (survey.status === "closed") {
    res.status(400);
    throw new Error("Closed surveys cannot be edited");
  }

  // Validate branding fields before updating
  const brandingFields = { logo, themeColor, thankYouMessage };
  const brandingValidation = validateBrandingFields(brandingFields);

  if (!brandingValidation.isValid) {
    res.status(400);
    throw new Error(
      `Branding validation failed: ${brandingValidation.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ")}`
    );
  }

  // Sanitize branding fields for storage
  const sanitizedBranding = sanitizeBrandingFields(brandingFields);

  // NOTE: Soft-lock removed to allow concurrent saves without blocking UX.
  // Update survey metadata
  if (title !== undefined) survey.title = title;
  if (description !== undefined) survey.description = description;

  // Update branding fields with sanitized values
  if (logo !== undefined) survey.logo = sanitizedBranding.logo;
  if (themeColor !== undefined)
    survey.themeColor = sanitizedBranding.themeColor;
  if (thankYouMessage !== undefined)
    survey.thankYouMessage = sanitizedBranding.thankYouMessage;

  // Update other settings
  if (isWhitelistEnabled !== undefined)
    survey.isWhitelistEnabled = isWhitelistEnabled;
  if (showProgress !== undefined) survey.showProgress = showProgress;
  if (oneResponsePerRecipient !== undefined)
    survey.oneResponsePerRecipient = oneResponsePerRecipient;

  // Update questions/sections/rules if any structural changes provided
  const hasStructuralChanges =
    questions !== undefined ||
    sections !== undefined ||
    visibilityRules !== undefined ||
    navigationRules !== undefined ||
    flowRules !== undefined ||
    settings !== undefined;

  if (hasStructuralChanges) {
    const normalizedLogic = normalizeSurveyLogicPayload({
      questions,
      visibilityRules,
      navigationRules,
      flowRules,
    });
    const normalizedQuestionsInput =
      normalizedLogic.questions !== undefined
        ? normalizedLogic.questions
        : questions;
    const normalizedVisibilityRulesInput =
      normalizedLogic.visibilityRules !== undefined
        ? normalizedLogic.visibilityRules
        : visibilityRules;
    const normalizedNavigationRulesInput =
      normalizedLogic.navigationRules !== undefined
        ? normalizedLogic.navigationRules
        : navigationRules;

    const newVersion = survey.currentVersion + 1;

    // Get current version to preserve unchanged fields
    let currentVersionData = {};
    if (survey.currentVersion > 0) {
      const currentVersion = await SurveyVersion.findOne({
        surveyId: survey._id,
        version: survey.currentVersion,
      }).lean();
      if (currentVersion) {
        currentVersionData = {
          questions: currentVersion.questions || [],
          sections: currentVersion.sections || [],
          visibilityRules: currentVersion.visibilityRules || [],
          navigationRules: currentVersion.navigationRules || [],
          settings: currentVersion.settings || {
            presentationMode: "single_page",
            autoAdvanceThreshold: null,
            isSectional: false,
          },
        };
      }
    }

    // Sanitize questions: drop ratingScale for non-rating, drop options for non-choice
    const sanitizedQuestions =
      normalizedQuestionsInput !== undefined
        ? normalizedQuestionsInput.map((q, index) => {
            const isChoice = [
              "single_choice",
              "multiple_choice",
              "dropdown",
            ].includes(q.type);
            const isRating = q.type === "rating";
            const cleaned = {
              ...q,
              id: q.id || uuidv4(),
              order: index + 1,
              validation: normalizeQuestionValidation(q.validation),
            };

            if (!isChoice) {
              delete cleaned.options;
              delete cleaned.allowOther;
            }
            if (!isRating) {
              delete cleaned.ratingScale;
            } else {
              cleaned.ratingScale = cleaned.ratingScale || 5;
            }
            return cleaned;
          })
        : undefined;

    // Normalize navigation actions (UI may send "end") and drop invalid jumps
    const normalizedNavigationRules =
      normalizedNavigationRulesInput !== undefined
        ? normalizedNavigationRulesInput
            .map((rule) => {
              const actionType =
                rule.action?.type === "end" ? "terminate" : rule.action?.type;

              if (!actionType) return null;

              if (actionType === "jump") {
                const targetSectionId =
                  typeof rule.action?.targetSectionId === "string" &&
                  rule.action.targetSectionId.trim().length > 0
                    ? rule.action.targetSectionId
                    : undefined;
                if (!targetSectionId) return null;
                return {
                  ...rule,
                  action: {
                    ...rule.action,
                    type: actionType,
                    targetSectionId,
                  },
                };
              }

              if (actionType === "jump_to_question") {
                const targetQuestionId =
                  typeof rule.action?.targetQuestionId === "string" &&
                  rule.action.targetQuestionId.trim().length > 0
                    ? rule.action.targetQuestionId
                    : undefined;
                if (!targetQuestionId) return null;
                return {
                  ...rule,
                  action: {
                    ...rule.action,
                    type: actionType,
                    targetQuestionId,
                  },
                };
              }

              if (actionType === "skip") {
                const skipCount = Number.isFinite(rule.action?.skipCount)
                  ? Math.max(1, rule.action.skipCount)
                  : 1;
                return {
                  ...rule,
                  action: {
                    ...rule.action,
                    type: actionType,
                    skipCount,
                  },
                };
              }

              return {
                ...rule,
                action: {
                  ...rule.action,
                  type: actionType,
                },
              };
            })
            .filter(Boolean)
        : undefined;

    // Validate navigation rule targets exist (explicit rejection, not silent drop)
    if (normalizedNavigationRules && normalizedNavigationRules.length > 0) {
      const workingSections =
        sections !== undefined ? sections : currentVersionData.sections;
      const workingQuestions =
        sanitizedQuestions !== undefined
          ? sanitizedQuestions
          : currentVersionData.questions;
      const sectionIds = new Set(
        (workingSections || []).map((s) => s.id)
      );
      const questionIds = new Set(
        (workingQuestions || []).map((q) => q.id)
      );
      const questionOrderIndex = buildQuestionOrderIndex(
        workingQuestions,
        workingSections
      );

      const invalidNavigationRules = [];

      for (const rule of normalizedNavigationRules) {
        // Validate jump target section exists
        if (rule.action?.type === "jump") {
          const targetExists = sectionIds.has(rule.action.targetSectionId);
          if (!targetExists) {
            invalidNavigationRules.push({
              ruleId: rule.id,
              issue: `references non-existent section "${rule.action.targetSectionId}"`,
            });
          }
        }

        // Validate jump_to_question target exists
        if (rule.action?.type === "jump_to_question") {
          const targetExists = questionIds.has(rule.action.targetQuestionId);
          if (!targetExists) {
            invalidNavigationRules.push({
              ruleId: rule.id,
              issue: `references non-existent question "${rule.action.targetQuestionId}"`,
            });
          }

          const sourceQuestionId = rule.when?.questionId;
          const targetQuestionId = rule.action?.targetQuestionId;
          if (sourceQuestionId && targetQuestionId) {
            const sourceIndex = questionOrderIndex.get(sourceQuestionId);
            const targetIndex = questionOrderIndex.get(targetQuestionId);
            if (
              Number.isFinite(sourceIndex) &&
              Number.isFinite(targetIndex) &&
              targetIndex <= sourceIndex
            ) {
              invalidNavigationRules.push({
                ruleId: rule.id,
                issue: `references non-forward question jump "${targetQuestionId}" from "${sourceQuestionId}"`,
              });
            }
          }
        }

        // Validate condition question exists
        if (rule.when?.questionId && !questionIds.has(rule.when.questionId)) {
          invalidNavigationRules.push({
            ruleId: rule.id,
            issue: `condition references non-existent question "${rule.when.questionId}"`,
          });
        }
      }

      if (invalidNavigationRules.length > 0) {
        res.status(400);
        throw new Error(
          `Invalid navigation rules: ${invalidNavigationRules
            .map((err) => `"${err.ruleId}" ${err.issue}`)
            .join(", ")}`
        );
      }
    }

    // Validate visibility rule targets exist
    if (
      normalizedVisibilityRulesInput &&
      normalizedVisibilityRulesInput.length > 0
    ) {
      const sectionIds = new Set(
        (sections !== undefined ? sections : currentVersionData.sections).map(
          (s) => s.id
        )
      );
      const questionIds = new Set(
        (sanitizedQuestions !== undefined
          ? sanitizedQuestions
          : currentVersionData.questions
        ).map((q) => q.id)
      );

      const invalidVisibilityRules = [];

      for (const rule of normalizedVisibilityRulesInput) {
        // Validate target exists
        if (rule.targetType === "section" && !sectionIds.has(rule.targetId)) {
          invalidVisibilityRules.push({
            ruleId: rule.id,
            issue: `targets non-existent section "${rule.targetId}"`,
          });
        }
        if (rule.targetType === "question" && !questionIds.has(rule.targetId)) {
          invalidVisibilityRules.push({
            ruleId: rule.id,
            issue: `targets non-existent question "${rule.targetId}"`,
          });
        }

        // Validate condition question exists
        if (rule.when?.questionId && !questionIds.has(rule.when.questionId)) {
          invalidVisibilityRules.push({
            ruleId: rule.id,
            issue: `condition references non-existent question "${rule.when.questionId}"`,
          });
        }
      }

      if (invalidVisibilityRules.length > 0) {
        res.status(400);
        throw new Error(
          `Invalid visibility rules: ${invalidVisibilityRules
            .map((err) => `"${err.ruleId}" ${err.issue}`)
            .join(", ")}`
        );
      }
    }

    await SurveyVersion.create({
      surveyId: survey._id,
      companyId,
      createdBy: userId,
      version: newVersion,
      questions:
        sanitizedQuestions !== undefined
          ? sanitizedQuestions
          : currentVersionData.questions,
      sections: sections !== undefined ? sections : currentVersionData.sections,
      visibilityRules:
        normalizedVisibilityRulesInput !== undefined
          ? normalizedVisibilityRulesInput
          : currentVersionData.visibilityRules,
      navigationRules:
        normalizedNavigationRulesInput !== undefined
          ? normalizedNavigationRulesInput
          : currentVersionData.navigationRules,
      settings: normalizePresentationSettings(
        settings !== undefined ? settings : currentVersionData.settings,
        sections !== undefined ? sections : currentVersionData.sections
      ),
    });

    survey.currentVersion = newVersion;
  }

  await survey.save();

  // Get current version for response
  let currentVersionData = {
    questions: [],
    sections: [],
    visibilityRules: [],
    navigationRules: [],
    settings: {},
  };
  if (survey.currentVersion > 0) {
    const currentVersion = await SurveyVersion.findOne({
      surveyId: survey._id,
      version: survey.currentVersion,
    }).lean();
    if (currentVersion) {
      currentVersionData = {
        questions: currentVersion.questions || [],
        sections: currentVersion.sections || [],
        visibilityRules: currentVersion.visibilityRules || [],
        navigationRules: currentVersion.navigationRules || [],
        settings: currentVersion.settings || {},
      };
    }
  }

  const updatedSurvey = {
    ...survey.toObject(),
    ...currentVersionData,
  };

  sendUpdated(res, updatedSurvey, "Survey updated successfully");
});

// @desc    Publish survey
// @route   POST /api/surveys/:id/publish
// @access  Private
export const publishSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Can publish draft surveys OR republish published surveys with unpublished changes
  const isRepublish =
    survey.status === "published" &&
    survey.currentVersion > survey.publishedVersion;
  const canPublish = survey.status === "draft" || isRepublish;

  if (!canPublish) {
    if (survey.status === "closed") {
      res.status(400);
      throw new Error(
        "Cannot publish closed surveys. Reopen the survey first."
      );
    }
    if (
      survey.status === "published" &&
      survey.currentVersion === survey.publishedVersion
    ) {
      res.status(400);
      throw new Error("No unpublished changes to publish. Make changes first.");
    }
    res.status(400);
    throw new Error("Survey cannot be published in its current state");
  }

  // Must have questions to publish
  if (survey.currentVersion === 0) {
    res.status(400);
    throw new Error("Cannot publish survey without questions");
  }

  // Validate survey has at least one question
  const currentVersion = await SurveyVersion.findOne({
    surveyId: survey._id,
    version: survey.currentVersion,
  });

  if (
    !currentVersion ||
    !currentVersion.questions ||
    currentVersion.questions.length === 0
  ) {
    res.status(400);
    throw new Error("Cannot publish survey without questions");
  }

  const hasNormalizedQuestionValidation =
    normalizeVersionQuestionValidations(currentVersion);
  if (hasNormalizedQuestionValidation) {
    await currentVersion.save();
  }

  // Clean up and validate visibility rules reference valid questions/sections
  if (
    currentVersion.visibilityRules &&
    currentVersion.visibilityRules.length > 0
  ) {
    const questionIds = new Set(currentVersion.questions.map((q) => q.id));
    const sectionIds = new Set(
      (currentVersion.sections || []).map((s) => s.id)
    );

    // Filter out invalid visibility rules instead of throwing errors
    const validVisibilityRules = currentVersion.visibilityRules.filter(
      (rule) => {
        // Check if target exists
        if (rule.targetType === "question" && !questionIds.has(rule.targetId)) {
          return false;
        }
        if (rule.targetType === "section" && !sectionIds.has(rule.targetId)) {
          return false;
        }
        // Check if condition question exists
        if (rule.when?.questionId && !questionIds.has(rule.when.questionId)) {
          return false;
        }
        return true;
      }
    );

    // Update the visibility rules to only include valid ones
    if (validVisibilityRules.length !== currentVersion.visibilityRules.length) {
      currentVersion.visibilityRules = validVisibilityRules;
      await currentVersion.save();
    }
  }

  // Clean up and validate navigation rules reference valid sections
  if (
    currentVersion.navigationRules &&
    currentVersion.navigationRules.length > 0
  ) {
    const questionOrderIndex = buildQuestionOrderIndex(
      currentVersion.questions || [],
      currentVersion.sections || []
    );
    const questionIds = new Set(currentVersion.questions.map((q) => q.id));
    const sectionIds = new Set(
      (currentVersion.sections || []).map((s) => s.id)
    );

    // Filter out invalid navigation rules instead of throwing errors
    const validNavigationRules = currentVersion.navigationRules.filter(
      (rule) => {
        // Check if fromSectionId exists (if not null)
        if (rule.fromSectionId && !sectionIds.has(rule.fromSectionId)) {
          return false;
        }
        // Check if targetSectionId exists (for jump actions)
        if (
          rule.action?.type === "jump" &&
          rule.action?.targetSectionId &&
          !sectionIds.has(rule.action.targetSectionId)
        ) {
          return false;
        }
        // Reject backward/self jump_to_question during publish cleanup
        if (rule.action?.type === "jump_to_question") {
          if (!questionIds.has(rule.action?.targetQuestionId)) {
            return false;
          }
          const sourceQuestionId = rule.when?.questionId;
          const targetQuestionId = rule.action?.targetQuestionId;
          if (sourceQuestionId && targetQuestionId) {
            const sourceIndex = questionOrderIndex.get(sourceQuestionId);
            const targetIndex = questionOrderIndex.get(targetQuestionId);
            if (
              Number.isFinite(sourceIndex) &&
              Number.isFinite(targetIndex) &&
              targetIndex <= sourceIndex
            ) {
              return false;
            }
          }
        }
        // Check if condition question exists
        if (rule.when?.questionId && !questionIds.has(rule.when.questionId)) {
          return false;
        }
        return true;
      }
    );

    // Update the navigation rules to only include valid ones
    if (validNavigationRules.length !== currentVersion.navigationRules.length) {
      currentVersion.navigationRules = validNavigationRules;
      await currentVersion.save();
    }
  }

  // Update survey status
  const wasAlreadyPublished = survey.status === "published";
  survey.status = "published";
  survey.publishedVersion = survey.currentVersion;
  survey.publishedAt = new Date();
  await survey.save();

  sendResponse(res, {
    data: survey,
    message: wasAlreadyPublished
      ? "Survey changes published successfully"
      : "Survey published successfully",
  });
});

// @desc    Close survey
// @route   POST /api/surveys/:id/close
// @access  Private
// @note    Closed surveys: No new responses allowed, but existing responses remain accessible.
//          Public link stays active but shows "Survey is closed" message.
//          Survey can be reopened by changing status back to "published" if needed.
export const closeSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Can only close published surveys
  if (survey.status !== "published") {
    res.status(400);
    throw new Error("Only published surveys can be closed");
  }

  // Update survey status
  survey.status = "closed";
  survey.closedAt = new Date();
  await survey.save();

  sendResponse(res, {
    data: survey,
    message: "Survey closed successfully. No new responses will be accepted.",
  });
});

// @desc    Duplicate survey
// @route   POST /api/surveys/:id/duplicate
// @access  Private
export const duplicateSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;
  const rawUserId = req.user?._id || req.user?.id;

  if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
    res.status(401);
    throw new Error("Authentication required: missing user identity");
  }

  const userId = new mongoose.Types.ObjectId(rawUserId);

  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id, isDeleted: false }
    : companyId
      ? { _id: req.params.id, companyId, isDeleted: false }
      : { _id: req.params.id, isDeleted: false };

  const sourceSurvey = await Survey.findOne(match).lean();
  if (!sourceSurvey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const sourceVersion =
    sourceSurvey.currentVersion > 0
      ? await SurveyVersion.findOne({
          surveyId: sourceSurvey._id,
          version: sourceSurvey.currentVersion,
        }).lean()
      : null;

  const clonedVersionPayload = sourceVersion
    ? remapVersionPayload(sourceVersion)
    : null;

  const session = await mongoose.startSession();
  let clonedSurvey = null;

  try {
    await session.withTransaction(async () => {
      const surveyDocs = await Survey.create(
        [
          {
            companyId: sourceSurvey.companyId,
            title: buildDuplicateTitle(sourceSurvey.title),
            description: sourceSurvey.description || "",
            status: "draft",
            publicId: uuidv4(),
            logo: sourceSurvey.logo || "",
            themeColor: sourceSurvey.themeColor || "",
            thankYouMessage: sourceSurvey.thankYouMessage || "",
            isWhitelistEnabled: Boolean(sourceSurvey.isWhitelistEnabled),
            showProgress: Boolean(sourceSurvey.showProgress),
            oneResponsePerRecipient: Boolean(sourceSurvey.oneResponsePerRecipient),
            captureMetadata: Boolean(sourceSurvey.captureMetadata),
            currentVersion: clonedVersionPayload ? 1 : 0,
            publishedVersion: null,
            isUpdated: false,
            createdBy: userId,
            publishedAt: null,
            closedAt: null,
          },
        ],
        { session }
      );

      clonedSurvey = surveyDocs[0];

      if (clonedVersionPayload) {
        await SurveyVersion.create(
          [
            {
              surveyId: clonedSurvey._id,
              companyId: sourceSurvey.companyId,
              createdBy: userId,
              version: 1,
              ...clonedVersionPayload,
              settings: normalizePresentationSettings(
                clonedVersionPayload.settings,
                clonedVersionPayload.sections
              ),
            },
          ],
          { session }
        );
      }

    });
  } finally {
    await session.endSession();
  }

  if (!clonedSurvey) {
    res.status(500);
    throw new Error("Failed to duplicate survey");
  }

  sendCreated(
    res,
    {
      ...clonedSurvey.toObject(),
      // Responses are intentionally not duplicated.
      responseCount: 0,
      questions: clonedVersionPayload?.questions || [],
      sections: clonedVersionPayload?.sections || [],
      visibilityRules: clonedVersionPayload?.visibilityRules || [],
      navigationRules: clonedVersionPayload?.navigationRules || [],
      settings: clonedVersionPayload
        ? normalizePresentationSettings(
            clonedVersionPayload.settings,
            clonedVersionPayload.sections
          )
        : {
            presentationMode: "single_page",
            autoAdvanceThreshold: null,
            isSectional: false,
          },
    },
    "Survey duplicated successfully"
  );
});

// @desc    Delete survey (soft delete)
// @route   DELETE /api/surveys/:id
// @access  Private
export const deleteSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id, isDeleted: false }
    : companyId
    ? { _id: req.params.id, companyId, isDeleted: false }
    : { _id: req.params.id, isDeleted: false };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found or already deleted");
  }

  // Only check for responses if survey is published or closed
  // Draft surveys can be deleted regardless of response count
  if (survey.status !== "draft") {
    const Response = mongoose.model("Response");
    const responseCount = await Response.countDocuments({
      surveyId: req.params.id,
    });

    if (responseCount > 0) {
      res.status(400);
      throw new Error(
        `Cannot delete ${survey.status} survey with ${responseCount} response${
          responseCount > 1 ? "s" : ""
        }. Only draft surveys can be deleted.`
      );
    }
  }

  // Soft delete the survey
  survey.isDeleted = true;
  survey.deletedAt = new Date();
  await survey.save();

  sendResponse(res, {
    data: survey,
    message: "Survey moved to trash successfully",
  });
});

// @desc    Restore soft-deleted survey
// @route   POST /api/surveys/:id/restore
// @access  Private
export const restoreSurvey = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id, isDeleted: true }
    : companyId
    ? { _id: req.params.id, companyId, isDeleted: true }
    : { _id: req.params.id, isDeleted: true };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Deleted survey not found");
  }

  // Restore the survey
  survey.isDeleted = false;
  survey.deletedAt = undefined;
  await survey.save();

  sendResponse(res, {
    data: survey,
    message: "Survey restored successfully",
  });
});

// @desc    Get effective branding settings for survey with company fallbacks
// @route   GET /api/surveys/:id/effective-settings
// @access  Private
export const getEffectiveSettings = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match)
    .select("logo themeColor thankYouMessage companyId")
    .lean();

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get company branding settings
  const company = await getCompanyBranding(survey.companyId);

  // Calculate effective branding settings with inheritance info
  const effectiveSettings = getEffectiveBrandingSettings(survey, company);

  sendResponse(res, {
    data: effectiveSettings,
    message: "Effective branding settings retrieved successfully",
  });
});

// @desc    Upload survey-specific logo
// @route   POST /api/surveys/:id/logo
// @access  Private
export const uploadSurveyLogoFile = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Can only edit draft and published surveys (closed surveys are locked)
  if (survey.status === "closed") {
    res.status(400);
    throw new Error("Closed surveys cannot have their logo updated");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  try {
    // Delete old logo from S3 if exists
    if (survey.logoPublicId) {
      try {
        await deleteFromS3(survey.logoPublicId);
      } catch (error) {
        logger.warn("Failed to delete old survey logo from S3");
      }
    }

    // Read file buffer from temp file
    const fileBuffer = await fs.readFile(req.file.path);

    // Upload to S3 using backend SDK
    const { url, key } = await uploadToS3(fileBuffer, {
      folder: "survey-app/logos/survey",
      publicId: String(companyId || survey.companyId || "survey"),
      contentType: req.file.mimetype,
    });

    // Delete local temp file after upload
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      logger.warn("Failed to delete temp file after survey logo upload");
    }

    // Update survey with S3 URL
    survey.logo = url;
    survey.logoPublicId = key;
    await survey.save();

    sendResponse(res, {
      data: {
        logo: url,
        publicId: key,
      },
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    // Clean up temp file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.warn("Failed to delete temp file after survey logo upload error");
      }
    }

    // Handle S3 configuration errors gracefully
    if (error.message.includes("AWS S3 is not configured")) {
      res.status(503);
      throw new Error(
        "File upload service is not configured. Please contact administrator."
      );
    }
    throw error;
  }
});

// @desc    Delete survey-specific logo
// @route   DELETE /api/surveys/:id/logo
// @access  Private
export const deleteSurveyLogo = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;

  // In development, skip company filtering to avoid stale DEV_COMPANY_ID issues
  const isDevelopment = process.env.NODE_ENV !== "production";
  const match = isDevelopment
    ? { _id: req.params.id }
    : companyId
    ? { _id: req.params.id, companyId }
    : { _id: req.params.id };

  const survey = await Survey.findOne(match);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Can only edit draft and published surveys (closed surveys are locked)
  if (survey.status === "closed") {
    res.status(400);
    throw new Error("Closed surveys cannot have their logo deleted");
  }

  if (!survey.logo || survey.logo.trim() === "") {
    res.status(400);
    throw new Error("Survey has no logo to delete");
  }

  // Delete from S3 if public ID exists
  if (survey.logoPublicId) {
    try {
      await deleteFromS3(survey.logoPublicId);
    } catch (error) {
      logger.warn("Failed to delete survey logo from S3");
    }
  }

  // Clear logo fields
  survey.logo = null;
  survey.logoPublicId = null;
  await survey.save();

  sendResponse(res, {
    data: survey,
    message: "Survey logo deleted successfully",
  });
});
