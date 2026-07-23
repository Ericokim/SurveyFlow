/**
 * Recipient Model - Survey invitation recipients with whitelist support
 *
 * @fileoverview Recipient model for survey access control and distribution
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Recipient schema for survey invitation management
 * @typedef {Object} Recipient
 * @property {ObjectId} surveyId - Survey this recipient belongs to (required)
 * @property {ObjectId} companyId - Company that owns this recipient (required)
 * @property {string} name - Recipient's full name (required)
 * @property {string} phone - Phone number in E.164 format (indexed)
 * @property {string} email - Email address, lowercase (indexed)
 * @property {string} status - Invitation status: 'pending'|'invited'|'in_progress'|'completed'|'failed'
 * @property {Date} invitedAt - When invitation was sent
 * @property {Date} completedAt - When survey was completed
 * @property {ObjectId} createdBy - User who added this recipient
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const recipientSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: { type: String, trim: true },
    phone: {
      type: String, // Normalized E.164 format
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          // E.164 format validation: +[1-9]\d{1,14}
          return !v || /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: "Phone must be in E.164 format (+1234567890)",
      },
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    status: {
      type: String,
      enum: ["pending", "invited", "in_progress", "completed", "failed"],
      default: "pending",
      index: true,
    },

    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true,
    },

    invitedAt: Date,
    completedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

recipientSchema.pre("validate", function () {
  if (!this.phone && !this.email) {
    throw new Error("Recipient must have phone or email");
  }
});

// Unique constraints
recipientSchema.index(
  { surveyId: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string" },
    },
  }
);
recipientSchema.index(
  { surveyId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);

// Performance indexes for recipient management
recipientSchema.index({ surveyId: 1, status: 1, createdAt: -1 }); // For status filtering
recipientSchema.index({ companyId: 1, status: 1 }); // For company-wide recipient stats

export default mongoose.model("Recipient", recipientSchema);
