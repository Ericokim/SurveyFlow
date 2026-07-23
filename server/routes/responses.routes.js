/**
 * Response Routes
 *
 * Defines routes for survey response management including validation, submission, and retrieval.
 * Includes both public (respondent) and private (admin) endpoints.
 *
 * Public routes (mounted at /r):
 * - POST /api/r/:publicId/validate-access
 * - GET /api/r/:publicId
 * - POST /api/r/:publicId/responses
 *
 * Admin routes (mounted at /surveys):
 * - GET /api/surveys/admin/surveys/:id/responses
 * - GET /api/surveys/admin/responses/:id
 * - DELETE /api/surveys/admin/responses/:id
 * - POST /api/surveys/admin/recipients/:id/reset
 *
 * @fileoverview Response routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import Joi from "joi";
import {
  validateSurveyAccess,
  getPublicSurvey,
  saveResponseProgress,
  submitResponse,
  getResponses,
  getResponse,
  deleteResponse,
  resetRecipientStatus,
  getPreviewSurvey,
  simulatePreviewSubmission,
} from "../controllers/responses.controllers.js";
import { checkObjectId } from "../middleware/utilityMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

// Dev convenience: bypass auth in non-production unless explicitly disabled.
const shouldBypassAuth =
  (process.env.NODE_ENV || "development") !== "production" &&
  process.env.DEV_BYPASS_AUTH !== "false";

const requireAuth = (req, res, next) => {
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
    id: fallbackUserId,
    companyId: fallbackCompanyId,
    role: "admin",
  };
  next();
};

const validateAccessSchema = Joi.object({
  identifier: Joi.string().trim().min(1).optional(),
  recipientId: Joi.string().trim().length(24).hex().optional(),
});

const navigationSchema = Joi.object({
  currentSectionIndex: Joi.number().integer().min(0).optional(),
  history: Joi.array().items(Joi.string().trim()).optional(),
  jumpChain: Joi.array().items(Joi.string().trim()).optional(),
  currentQuestionId: Joi.string().trim().optional().allow(null, ""),
  questionFlowHistory: Joi.array().items(Joi.string().trim()).optional(),
  sectionEntryQuestionId: Joi.string().trim().optional().allow(null, ""),
});

const submitResponseSchema = Joi.object({
  answers: Joi.object().required(),
  identifier: Joi.string().trim().min(1).optional(),
  recipientId: Joi.string().trim().length(24).hex().optional(),
  completionTime: Joi.number().optional(),
  startedAt: Joi.date().iso().optional(),
  mode: Joi.string().valid("live", "test", "preview").optional(),
  visitedSectionIds: Joi.array().items(Joi.string().trim()).optional(),
  visitedQuestionIds: Joi.array().items(Joi.string().trim()).optional(),
  navigation: navigationSchema.optional(),
});

const saveProgressSchema = Joi.object({
  answers: Joi.object().required(),
  identifier: Joi.string().trim().min(1).optional(),
  recipientId: Joi.string().trim().length(24).hex().optional(),
  startedAt: Joi.date().iso().optional(),
  mode: Joi.string().valid("live", "test", "preview").optional(),
  visitedSectionIds: Joi.array().items(Joi.string().trim()).optional(),
  visitedQuestionIds: Joi.array().items(Joi.string().trim()).optional(),
  navigation: navigationSchema.optional(),
});

// Public routes for respondents (using publicId)

// @desc    Validate access to survey (whitelist check)
// @route   POST /api/r/:publicId/validate-access
// @access  Public
router.post(
  "/:publicId/validate-access",
  validate(validateAccessSchema),
  validateSurveyAccess
);

// @desc    Get survey for respondent
// @route   GET /api/r/:publicId
// @access  Public
router.get("/:publicId", getPublicSurvey);

// @desc    Save survey progress draft
// @route   POST /api/r/:publicId/progress
// @access  Public
router.post(
  "/:publicId/progress",
  validate(saveProgressSchema),
  saveResponseProgress
);

// @desc    Get survey for preview (no whitelist)
// @route   GET /api/r/:publicId/preview
// @access  Public
router.get("/:publicId/preview", getPreviewSurvey);

// @desc    Simulate preview submission (no save)
// @route   POST /api/r/:publicId/preview/submit
// @access  Public
router.post(
  "/:publicId/preview/submit",
  validate(submitResponseSchema),
  simulatePreviewSubmission
);

// @desc    Submit survey response
// @route   POST /api/r/:publicId/responses
// @access  Public
router.post(
  "/:publicId/responses",
  validate(submitResponseSchema),
  submitResponse
);

// Private routes for admins (using internal ID) - expect to be mounted at /api/admin

// @desc    Get all responses for survey with pagination
// @route   GET /api/admin/surveys/:id/responses
// @access  Private
router.get(
  "/surveys/:id/responses",
  [requireAuth, checkObjectId],
  getResponses
);

// @desc    Get single response details
// @route   GET /api/admin/responses/:id
// @access  Private
router.get("/responses/:id", [requireAuth, checkObjectId], getResponse);

// @desc    Delete response (Admin override)
// @route   DELETE /api/admin/responses/:id
// @access  Private - Admin only
router.delete("/responses/:id", [requireAuth, checkObjectId], deleteResponse);

// @desc    Reset recipient submission status (Admin override)
// @route   POST /api/admin/recipients/:id/reset
// @access  Private - Admin only
router.post(
  "/recipients/:id/reset",
  [requireAuth, checkObjectId],
  resetRecipientStatus
);

export default router;
