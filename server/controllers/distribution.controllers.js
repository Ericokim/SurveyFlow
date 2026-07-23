/**
 * Distribution Controllers
 *
 * Handles SMS distribution for survey invitations with status tracking.
 * Follows KISS + DRY principles with standardized responses.
 *
 * @fileoverview Distribution controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";
import AfricasTalking from "africastalking";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse } from "../utils/response.js";
import { executePagedQuery } from "../utils/pagination.utils.js";
import Survey from "../models/survey.models.js";
import Recipient from "../models/recipient.models.js";
import CommunicationLog from "../models/communication.models.js";

// Initialize Africa's Talking
let africasTalkingService = null;

if (process.env.SMS_API_KEY && process.env.SMS_USERNAME) {
  const africasTalking = AfricasTalking({
    apiKey: process.env.SMS_API_KEY,
    username: process.env.SMS_USERNAME,
  });
  africasTalkingService = africasTalking.SMS;
}

/**
 * Generate SMS message with survey link
 * @param {Object} survey - Survey object
 * @param {Object} recipient - Recipient object
 * @returns {string} SMS message
 */
const generateSMSMessage = (survey, recipient) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const surveyUrl = `${baseUrl}/survey/${survey.publicId}`;

  // Basic message template
  let message = `Hi ${recipient.name}, you've been invited to participate in "${survey.title}".`;

  if (survey.isWhitelistEnabled) {
    message += ` Please use your phone number ${recipient.phone} to access the survey.`;
  }

  message += ` Take the survey: ${surveyUrl}`;

  // Ensure message is within SMS limits (160 chars for single SMS)
  if (message.length > 160) {
    // Truncate title if needed
    const maxTitleLength = 160 - 100; // Reserve 100 chars for the rest
    const truncatedTitle =
      survey.title.length > maxTitleLength
        ? survey.title.substring(0, maxTitleLength) + "..."
        : survey.title;

    message = `Hi ${recipient.name}, you've been invited to "${truncatedTitle}". Take the survey: ${surveyUrl}`;
  }

  return message;
};

/**
 * Send single SMS using Africa's Talking
 * @param {string} phone - Phone number in E.164 format
 * @param {string} message - SMS message
 * @returns {Promise<Object>} SMS result
 */
const sendSMS = async (phone, message) => {
  if (!africasTalkingService) {
    throw new Error(
      "SMS service not configured. Please set SMS_API_KEY and SMS_USERNAME environment variables."
    );
  }

  try {
    const options = {
      to: [phone],
      message,
      from: process.env.SMS_SENDER_ID || "SurveyFlow",
    };

    const result = await africasTalkingService.send(options);

    // Check if SMS was accepted
    if (result.SMSMessageData && result.SMSMessageData.Recipients) {
      const recipient = result.SMSMessageData.Recipients[0];
      return {
        success: recipient.status === "Success",
        externalId: recipient.messageId,
        status: recipient.status,
        cost: recipient.cost,
        errorMessage:
          recipient.status !== "Success"
            ? `SMS failed: ${recipient.status}`
            : null,
      };
    }

    return {
      success: false,
      errorMessage: "Unexpected response format from SMS service",
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error.message,
    };
  }
};

// @desc    Send SMS invitations to recipients
// @route   POST /api/surveys/:id/sms/send
// @access  Private
export const sendSMSInvitations = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const { recipientIds, message: customMessage } = req.body;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Survey must be published to send invitations
  if (survey.status !== "published") {
    res.status(400);
    throw new Error("Only published surveys can send invitations");
  }

  // Get recipients to send to
  let recipientsQuery = { surveyId, phone: { $exists: true, $ne: null } };

  // If specific recipients provided, filter by those IDs
  if (recipientIds && recipientIds.length > 0) {
    recipientsQuery._id = { $in: recipientIds };
  }

  const recipients = await Recipient.find(recipientsQuery);

  if (recipients.length === 0) {
    res.status(400);
    throw new Error("No recipients with phone numbers found");
  }

  // Filter out recipients who were already invited recently (within 24 hours)
  const recentInvites = await CommunicationLog.find({
    surveyId,
    recipientId: { $in: recipients.map((r) => r._id) },
    channel: "sms",
    status: { $in: ["sent", "delivered"] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  const recentRecipientIds = new Set(
    recentInvites.map((log) => log.recipientId.toString())
  );
  const eligibleRecipients = recipients.filter(
    (r) => !recentRecipientIds.has(r._id.toString())
  );

  if (eligibleRecipients.length === 0) {
    res.status(400);
    throw new Error(
      "All recipients were already invited within the last 24 hours"
    );
  }

  // Process SMS sending with rate limiting (5 per second to avoid overwhelming the service)
  const results = {
    sent: 0,
    failed: 0,
    total: eligibleRecipients.length,
    details: [],
  };

  const BATCH_SIZE = 5;
  const DELAY_MS = 1000; // 1 second delay between batches

  for (let i = 0; i < eligibleRecipients.length; i += BATCH_SIZE) {
    const batch = eligibleRecipients.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchPromises = batch.map(async (recipient) => {
      try {
        const message = customMessage || generateSMSMessage(survey, recipient);
        const smsResult = await sendSMS(recipient.phone, message);

        // Create communication log
        const logData = {
          surveyId,
          recipientId: recipient._id,
          channel: "sms",
          message,
          status: smsResult.success ? "sent" : "failed",
          externalId: smsResult.externalId,
          errorMessage: smsResult.errorMessage,
        };

        await CommunicationLog.create(logData);

        // Update recipient status
        if (smsResult.success) {
          await Recipient.findByIdAndUpdate(recipient._id, {
            status: "invited",
            invitedAt: new Date(),
          });
          results.sent++;
        } else {
          results.failed++;
        }

        results.details.push({
          recipientId: recipient._id,
          name: recipient.name,
          phone: recipient.phone,
          status: smsResult.success ? "sent" : "failed",
          error: smsResult.errorMessage,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          recipientId: recipient._id,
          name: recipient.name,
          phone: recipient.phone,
          status: "failed",
          error: error.message,
        });
      }
    });

    await Promise.all(batchPromises);

    // Add delay between batches (except for the last batch)
    if (i + BATCH_SIZE < eligibleRecipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  sendResponse(res, {
    data: results,
    message: `SMS invitations processed. ${results.sent} sent, ${results.failed} failed.`,
  });
});

// @desc    Get SMS sending statistics for survey
// @route   GET /api/surveys/:id/sms/stats
// @access  Private
export const getSMSStats = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get SMS communication statistics
  const stats = await CommunicationLog.aggregate([
    {
      $match: {
        surveyId: new mongoose.Types.ObjectId(surveyId),
        channel: "sms",
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    summary[stat._id] = stat.count;
    summary.total += stat.count;
  });

  // Get recent activity (last 7 days)
  const recentActivity = await CommunicationLog.find({
    surveyId,
    channel: "sms",
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  })
    .populate("recipientId", "name phone")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  sendResponse(res, {
    data: {
      summary,
      recentActivity,
    },
    message: "SMS statistics retrieved successfully",
  });
});

// @desc    Get SMS delivery logs for survey
// @route   GET /api/surveys/:id/sms/logs
// @access  Private
export const getSMSLogs = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const status = req.query.status;

  // Build filter
  const filter = { surveyId, channel: "sms" };
  if (status && ["pending", "sent", "delivered", "failed"].includes(status)) {
    filter.status = status;
  }

  // Execute paginated query
  const result = await executePagedQuery(CommunicationLog, filter, {
    page,
    pageSize,
    sort: { createdAt: -1 },
    populate: "recipientId",
    select: "recipientId message status externalId errorMessage createdAt",
  });

  sendResponse(res, {
    data: result.data,
    paging: result.paging,
    message: "SMS logs retrieved successfully",
  });
});
