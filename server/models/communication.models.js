/**
 * Communication Log Model - Track SMS and email delivery
 *
 * @fileoverview CommunicationLog model for tracking survey invitations
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Communication Log schema for tracking message delivery
 * @typedef {Object} CommunicationLog
 * @property {ObjectId} surveyId - Survey this communication belongs to (required)
 * @property {ObjectId} recipientId - Recipient who received the message (required)
 * @property {string} channel - Communication channel: 'sms' (default)
 * @property {string} message - Message content that was sent (required)
 * @property {string} status - Delivery status: 'pending'|'sent'|'failed'
 * @property {string} externalId - External provider message ID
 * @property {string} errorMessage - Error message if delivery failed
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const communicationLogSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipient",
      required: true,
    },
    channel: { type: String, enum: ["sms", "email"], default: "sms" },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
    },
    externalId: String,
    deliveredAt: Date, // When message was confirmed delivered
    errorMessage: String,
  },
  { timestamps: true }
);

// Performance indexes for communication logging
communicationLogSchema.index({ surveyId: 1, createdAt: -1 });
communicationLogSchema.index({ surveyId: 1, status: 1 }); // For delivery status queries
communicationLogSchema.index({ recipientId: 1, status: 1 }); // For recipient communication history

export default mongoose.model("CommunicationLog", communicationLogSchema);
