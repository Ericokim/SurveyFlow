/**
 * Analytics Routes
 *
 * Defines routes for survey analytics, metrics, and data export functionality.
 * Uses middleware for authentication, validation, and error handling.
 *
 * @fileoverview Analytics routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import {
  getSurveyAnalytics,
  exportResponses,
  exportRecipients,
  exportRespondents,
  getQuestionAnalytics,
} from "../controllers/analytics.controllers.js";
import { checkObjectId } from "../middleware/utilityMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router({ mergeParams: true }); // mergeParams to access :surveyId from parent route

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

// Apply auth middleware to all routes
router.use(requireAuth);

// @desc    Get survey analytics dashboard data
// @route   GET /api/surveys/:id/analytics
// @access  Private
router.get("/", getSurveyAnalytics);

// @desc    Get question-level analytics
// @route   GET /api/surveys/:id/analytics/questions
// @access  Private
router.get("/questions", getQuestionAnalytics);

// @desc    Export survey responses as CSV
// @route   POST /api/surveys/:id/analytics/export/responses
// @access  Private
router.post("/export/responses", exportResponses);

// @desc    Export survey recipients as CSV
// @route   POST /api/surveys/:id/analytics/export/recipients
// @access  Private
router.post("/export/recipients", exportRecipients);

// @desc    Export survey respondents metadata as CSV
// @route   POST /api/surveys/:id/analytics/export/respondents
// @access  Private
router.post("/export/respondents", exportRespondents);

export default router;
