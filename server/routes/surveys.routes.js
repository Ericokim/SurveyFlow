/**
 * Survey Routes
 *
 * Defines routes for survey CRUD operations, publishing, and management.
 * Uses middleware for authentication, validation, and error handling.
 *
 * @fileoverview Survey routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import Joi from "joi";
import mongoose from "mongoose";
import {
  getSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  publishSurvey,
  closeSurvey,
  duplicateSurvey,
  deleteSurvey,
  restoreSurvey,
  getEffectiveSettings,
  uploadSurveyLogo,
  uploadSurveyLogoFile,
  deleteSurveyLogo,
} from "../controllers/surveys.controllers.js";
import { checkObjectId } from "../middleware/utilityMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const navigationWhenSchema = Joi.alternatives().try(
  Joi.boolean(),
  Joi.object({
    questionId: Joi.string().required(),
    operator: Joi.string()
      .valid(
        "equals",
        "not_equals",
        "in",
        "not_in",
        "gt",
        "lt",
        "gte",
        "lte",
        "contains",
        "exists"
      )
      .required(),
    value: Joi.any(),
  }),
  Joi.object({
    all: Joi.array().items(Joi.link("#navigationWhenSchema")).min(1),
  }),
  Joi.object({
    any: Joi.array().items(Joi.link("#navigationWhenSchema")).min(1),
  }),
  Joi.object({
    not: Joi.link("#navigationWhenSchema"),
  }),
  Joi.object({
    conditions: Joi.array().items(Joi.link("#navigationWhenSchema")).min(1),
    logic: Joi.string().valid("and", "or", "not"),
    combinator: Joi.string().valid("and", "or", "not"),
    operator: Joi.string().valid("and", "or", "not"),
  }),
  Joi.object({
    always: Joi.boolean().valid(true),
  }),
  Joi.object({
    type: Joi.string().valid("always"),
  })
).id("navigationWhenSchema");
// Dev convenience: bypass auth by default in non-production unless explicitly disabled.
const shouldBypassAuth =
  (process.env.NODE_ENV || "development") !== "production" &&
  process.env.DEV_BYPASS_AUTH !== "false";

const requireAuth = async (req, res, next) => {
  if (!shouldBypassAuth) {
    return protect(req, res, next);
  }

  const hasAuthHeader =
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ");

  if (hasAuthHeader) {
    return protect(req, res, next);
  }

  if (
    !process.env.DEV_USER_ID ||
    !mongoose.Types.ObjectId.isValid(process.env.DEV_USER_ID) ||
    !process.env.DEV_COMPANY_ID ||
    !mongoose.Types.ObjectId.isValid(process.env.DEV_COMPANY_ID)
  ) {
    return res.status(401).json({
      status: {
        code: 401,
        message:
          "Authentication required: set DEV_USER_ID and DEV_COMPANY_ID or provide a Bearer token",
      },
      data: [],
      paging: null,
    });
  }

  const fallbackUserId = new mongoose.Types.ObjectId(process.env.DEV_USER_ID);
  const fallbackCompanyId = new mongoose.Types.ObjectId(
    process.env.DEV_COMPANY_ID
  );

  req.user = req.user || {
    _id: fallbackUserId,
    id: fallbackUserId, // keep both for downstream compatibility
    companyId: fallbackCompanyId,
    role: "admin",
  };
  next();
};

// Apply auth middleware to all routes (bypassable in dev)
router.use(requireAuth);

const questionSchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().trim().min(1).max(500).required(),
  type: Joi.string()
    .valid(
      "short_text",
      "long_text",
      "single_choice",
      "multiple_choice",
      "dropdown",
      "rating",
      "date"
    )
    .required(),
  required: Joi.boolean().optional(),
  helpText: Joi.string().max(300).optional(),
  options: Joi.array().items(Joi.string().max(200)).optional(),
  allowOther: Joi.boolean().optional(),
  ratingScale: Joi.number().valid(5, 10).optional(),
  sectionId: Joi.string().optional(),
  order: Joi.number().integer().optional(),
  validation: Joi.object({
    minLength: Joi.number().min(0),
    maxLength: Joi.number().min(0),
    minSelections: Joi.number().min(0),
    maxSelections: Joi.number().min(0),
    pattern: Joi.string().max(500),
    predefinedPattern: Joi.string()
      .valid(
        "email",
        "phone",
        "url",
        "numeric",
        "number",
        "integer",
        "alphanumeric",
        null
      )
      .allow(null),
    customMessage: Joi.string().max(200),
  }).optional(),
  logic: Joi.object({
    visibleIf: Joi.object({
      questionId: Joi.string().required(),
      operator: Joi.string()
        .valid(
          "equals",
          "not_equals",
          "in",
          "not_in",
          "gt",
          "lt",
          "gte",
          "lte",
          "contains",
          "exists"
        )
        .required(),
      value: Joi.any(),
    }).required(),
  }).optional(),
});

const createSurveySchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(1000).allow("", null),
  questions: Joi.array().items(questionSchema).optional(),
  logo: Joi.string()
    .allow("", null)
    .custom((value, helpers) => {
      if (!value || value.trim() === "") return value;
      const trimmed = value.trim();
      const urlPattern = /^(https?:\/\/|\/)/;
      const relativePathPattern =
        /^[a-zA-Z0-9._\-\/]+\.(jpg|jpeg|png|gif|svg|webp)$/i;

      if (!urlPattern.test(trimmed) && !relativePathPattern.test(trimmed)) {
        return helpers.error("any.invalid", {
          message:
            "Logo must be a valid URL (http/https) or file path ending with image extension",
        });
      }
      return trimmed;
    }),
  themeColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .allow("", null)
    .messages({
      "string.pattern.base":
        "Theme color must be a valid 6-digit hex color (e.g., #3b82f6)",
    }),
  thankYouMessage: Joi.string().trim().max(2000).allow("", null),
  isWhitelistEnabled: Joi.boolean(),
  showProgress: Joi.boolean(),
  oneResponsePerRecipient: Joi.boolean(),
  sections: Joi.array().items(
    Joi.object({
      id: Joi.string().optional(),
      title: Joi.string().allow("").required(),
      description: Joi.string().allow("", null),
      order: Joi.number(),
      questionIds: Joi.array().items(Joi.string()),
      required: Joi.boolean(),
      randomizeQuestions: Joi.boolean(),
      pageBreak: Joi.boolean(),
    })
  ),
  visibilityRules: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      targetType: Joi.string().valid("section", "question").required(),
      targetId: Joi.string().required(),
      effect: Joi.string().valid("show", "hide"),
      when: Joi.object({
        questionId: Joi.string().required(),
        operator: Joi.string()
          .valid(
            "equals",
            "not_equals",
            "in",
            "not_in",
            "gt",
            "lt",
            "gte",
            "lte",
            "contains",
            "exists"
          )
          .required(),
        value: Joi.any(),
      }).required(),
      priority: Joi.number(),
    })
  ),
  navigationRules: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      fromSectionId: Joi.string().allow(null),
      when: navigationWhenSchema.required(),
      action: Joi.object({
        type: Joi.string()
          .valid("jump", "terminate", "end", "skip", "jump_to_question")
          .required(),
        targetSectionId: Joi.string(),
        targetQuestionId: Joi.string(),
        skipCount: Joi.number().integer().min(1),
      }).required(),
      priority: Joi.number(),
    })
  ),
  settings: Joi.object({
    presentationMode: Joi.string().valid("single_page", "multi_step"),
    autoAdvanceThreshold: Joi.number().min(0).allow(null),
    isSectional: Joi.boolean(),
  }).custom((value, helpers) => {
    if (!value) return value;

    // Enforce rule: if not sectional, must be single_page
    if (
      value.isSectional === false &&
      value.presentationMode === "multi_step"
    ) {
      return helpers.error("any.invalid", {
        message:
          'presentationMode must be "single_page" when isSectional is false',
      });
    }
    return value;
  }),
});

const updateSurveySchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().max(1000).allow("", null),
  logo: Joi.string()
    .allow("", null)
    .custom((value, helpers) => {
      if (!value || value.trim() === "") return value;
      const trimmed = value.trim();
      const urlPattern = /^(https?:\/\/|\/)/;
      const relativePathPattern =
        /^[a-zA-Z0-9._\-\/]+\.(jpg|jpeg|png|gif|svg|webp)$/i;

      if (!urlPattern.test(trimmed) && !relativePathPattern.test(trimmed)) {
        return helpers.error("any.invalid", {
          message:
            "Logo must be a valid URL (http/https) or file path ending with image extension",
        });
      }
      return trimmed;
    }),
  themeColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .allow("", null)
    .messages({
      "string.pattern.base":
        "Theme color must be a valid 6-digit hex color (e.g., #3b82f6)",
    }),
  thankYouMessage: Joi.string().trim().max(2000).allow("", null),
  isWhitelistEnabled: Joi.boolean(),
  showProgress: Joi.boolean(),
  oneResponsePerRecipient: Joi.boolean(),
  questions: Joi.array().items(questionSchema),
  sections: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      title: Joi.string().allow("").required(),
      description: Joi.string().allow("", null),
      order: Joi.number(),
      questionIds: Joi.array().items(Joi.string()),
      required: Joi.boolean(),
      randomizeQuestions: Joi.boolean(),
      pageBreak: Joi.boolean(),
    })
  ),
  visibilityRules: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      targetType: Joi.string().valid("section", "question").required(),
      targetId: Joi.string().required(),
      effect: Joi.string().valid("show", "hide"),
      when: Joi.object({
        questionId: Joi.string().required(),
        operator: Joi.string()
          .valid(
            "equals",
            "not_equals",
            "in",
            "not_in",
            "gt",
            "lt",
            "gte",
            "lte",
            "contains",
            "exists"
          )
          .required(),
        value: Joi.any(),
      }).required(),
      priority: Joi.number(),
    })
  ),
  navigationRules: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      fromSectionId: Joi.string().allow(null),
      when: navigationWhenSchema.required(),
      action: Joi.object({
        // allow "end" as UI alias; controller normalizes to "terminate"
        type: Joi.string()
          .valid("jump", "terminate", "end", "skip", "jump_to_question")
          .required(),
        targetSectionId: Joi.string(),
        targetQuestionId: Joi.string(),
        skipCount: Joi.number().integer().min(1),
      }).required(),
      priority: Joi.number(),
    })
  ),
  settings: Joi.object({
    presentationMode: Joi.string().valid("single_page", "multi_step"),
    autoAdvanceThreshold: Joi.number().min(0).allow(null),
    isSectional: Joi.boolean(),
  }),
}).min(1);

// @desc    Get all surveys with pagination
// @route   GET /api/surveys
// @access  Private
router.get("/", getSurveys);

// @desc    Create new survey
// @route   POST /api/surveys
// @access  Private
router.post("/", validate(createSurveySchema), createSurvey);

// @desc    Get single survey by ID
// @route   GET /api/surveys/:id
// @access  Private
router.get("/:id", checkObjectId, getSurvey);

// @desc    Get effective branding settings for survey
// @route   GET /api/surveys/:id/effective-settings
// @access  Private
router.get("/:id/effective-settings", checkObjectId, getEffectiveSettings);

// @desc    Update survey
// @route   PATCH /api/surveys/:id
// @access  Private
router.patch("/:id", checkObjectId, validate(updateSurveySchema), updateSurvey);

// @desc    Upload survey logo (Multer - local file)
// @route   POST /api/surveys/:id/logo
// @access  Private
router.post(
  "/:id/logo",
  checkObjectId,
  uploadSurveyLogo.single("logo"),
  uploadSurveyLogoFile
);

// @desc    Delete survey logo
// @route   DELETE /api/surveys/:id/logo
// @access  Private
router.delete("/:id/logo", checkObjectId, deleteSurveyLogo);

// @desc    Publish survey
// @route   POST /api/surveys/:id/publish
// @access  Private
router.post("/:id/publish", checkObjectId, publishSurvey);

// @desc    Close survey
// @route   POST /api/surveys/:id/close
// @access  Private
router.post("/:id/close", checkObjectId, closeSurvey);

// @desc    Duplicate survey
// @route   POST /api/surveys/:id/duplicate
// @access  Private
router.post("/:id/duplicate", checkObjectId, duplicateSurvey);

// @desc    Delete survey (soft delete)
// @route   DELETE /api/surveys/:id
// @access  Private
router.delete("/:id", checkObjectId, deleteSurvey);

// @desc    Restore soft-deleted survey
// @route   POST /api/surveys/:id/restore
// @access  Private
router.post("/:id/restore", checkObjectId, restoreSurvey);

export default router;
