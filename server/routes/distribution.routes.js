/**
 * Distribution Routes
 *
 * Defines routes for SMS distribution and communication tracking.
 * Uses middleware for authentication, validation, and error handling.
 *
 * @fileoverview Distribution routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import Joi from "joi";
import {
  sendSMSInvitations,
  getSMSStats,
  getSMSLogs,
} from "../controllers/distribution.controllers.js";
import { validate } from "../middleware/validationMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true }); // mergeParams to access :surveyId from parent route

// Apply auth middleware to all routes
router.use(protect);

const sendSchema = Joi.object({
  recipientIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
  message: Joi.string().min(1).max(320).optional(),
});

// @desc    Send SMS invitations to recipients
// @route   POST /api/surveys/:id/sms/send
// @access  Private
router.post("/send", validate(sendSchema), sendSMSInvitations);

// @desc    Get SMS sending statistics
// @route   GET /api/surveys/:id/sms/stats
// @access  Private
router.get("/stats", getSMSStats);

// @desc    Get SMS delivery logs with pagination
// @route   GET /api/surveys/:id/sms/logs
// @access  Private
router.get("/logs", getSMSLogs);

export default router;
