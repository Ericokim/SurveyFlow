/**
 * Recipient Routes
 *
 * Defines routes for recipient management including CSV upload and listing.
 * Uses middleware for authentication, validation, and file upload.
 *
 * @fileoverview Recipient routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import {
  createRecipient,
  uploadRecipients,
  getRecipients,
  getRecipientStats,
  getRecipientResponses,
  updateRecipientStatus,
  toggleRecipientBlacklist,
  deleteRecipient,
  deleteRecipients,
  sendInvite,
  sendBulkInvites,
} from "../controllers/recipients.controllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true }); // mergeParams to access :surveyId from parent route

// Apply auth middleware to all routes
router.use(protect);

// @desc    Create single recipient
// @route   POST /api/surveys/:id/recipients
// @access  Private
router.post("/", createRecipient);

// @desc    Upload recipients via CSV
// @route   POST /api/surveys/:id/recipients/bulk
// @access  Private
router.post("/bulk", uploadRecipients);

// @desc    Delete multiple recipients
// @route   POST /api/surveys/:id/recipients/bulk-delete
// @access  Private
router.post("/bulk-delete", deleteRecipients);

// @desc    Send invites to multiple recipients
// @route   POST /api/surveys/:id/recipients/bulk-invite
// @access  Private
router.post("/bulk-invite", sendBulkInvites);

// @desc    Get recipient statistics for survey
// @route   GET /api/surveys/:id/recipients/stats
// @access  Private
router.get("/stats", getRecipientStats);

// @desc    Get all recipients with pagination
// @route   GET /api/surveys/:id/recipients
// @access  Private
router.get("/", getRecipients);

// @desc    Get recipient responses
// @route   GET /api/surveys/:id/recipients/:recipientId/responses
// @access  Private
router.get("/:recipientId/responses", getRecipientResponses);

// @desc    Update recipient status
// @route   PATCH /api/surveys/:id/recipients/:recipientId
// @access  Private
router.patch("/:recipientId", updateRecipientStatus);

// @desc    Toggle recipient blacklist status
// @route   PATCH /api/surveys/:id/recipients/:recipientId/blacklist
// @access  Private
router.patch("/:recipientId/blacklist", toggleRecipientBlacklist);

// @desc    Send invite to recipient
// @route   POST /api/surveys/:id/recipients/:recipientId/invite
// @access  Private
router.post("/:recipientId/invite", sendInvite);

// @desc    Delete recipient
// @route   DELETE /api/surveys/:id/recipients/:recipientId
// @access  Private
router.delete("/:recipientId", deleteRecipient);

export default router;
