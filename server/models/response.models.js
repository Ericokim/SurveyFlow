/**
 * Response Model - Survey responses with versioning and metadata
 *
 * @fileoverview Response model for storing survey submissions
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Response schema for survey submissions
 * @typedef {Object} Response
 * @property {ObjectId} surveyId - Survey this response belongs to (required)
 * @property {number} surveyVersion - Version of survey when response was submitted (required)
 * @property {ObjectId} companyId - Company that owns this response (required)
 * @property {ObjectId} recipientId - Recipient who submitted (null for anonymous)
 * @property {string} respondentIdentifier - Hashed identifier for whitelisted surveys
 * @property {Object} metadata - Optional metadata (IP, UserAgent, etc.)
 * @property {string} recipientName - Denormalized recipient name for queries
 * @property {string} recipientPhone - Denormalized recipient phone for queries
 * @property {string} recipientEmail - Denormalized recipient email for queries
 * @property {Map} answers - Question answers as Map(questionId -> answer)
 * @property {Date} submittedAt - When response was submitted (default: now)
 * @property {number} completionTime - Time to complete in seconds
 * @property {string} device - Device type: 'Mobile'|'Desktop'|'Tablet'
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const responseSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    surveyVersion: {
      type: Number,
      required: true,
      min: 1,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipient",
      index: true,
    },

    respondentIdentifier: {
      type: String, // Hashed phone/email for whitelisted surveys
      index: true,
    },
    metadata: {
      ip: { type: String },
      userAgent: { type: String },
      locale: { type: String },
      geo: {
        country: String,
        city: String,
      },
      consented: { type: Boolean, default: false }, // set when metadata capture is enabled and user consent is obtained
    },

    // denormalized search fields
    recipientName: String,
    recipientPhone: String,
    recipientEmail: String,

    answers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // questionId: answer value
      required: true,
    },

    responseStatus: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "completed",
      index: true,
    },
    lastSavedAt: {
      type: Date,
      index: true,
    },
    progress: {
      answeredCount: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      percentComplete: { type: Number, default: 0 },
    },
    navigation: {
      currentSectionIndex: { type: Number, default: 0 },
      history: { type: [String], default: [] },
      jumpChain: { type: [String], default: [] },
      currentQuestionId: { type: String, default: null },
      questionFlowHistory: { type: [String], default: [] },
      sectionEntryQuestionId: { type: String, default: null },
    },

    startedAt: Date, // When respondent first opened the survey
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completionTime: Number,
    device: {
      type: String,
      enum: ["Mobile", "Desktop", "Tablet"],
    },
    mode: {
      type: String,
      enum: ["test", "live"],
      default: "live",
      index: true,
    },
  },
  { timestamps: true }
);

// A recipient (or identifier) should only submit once per survey version.
responseSchema.index(
  { surveyId: 1, surveyVersion: 1, recipientId: 1 },
  {
    unique: true,
    partialFilterExpression: { recipientId: { $exists: true, $ne: null } },
  }
);
responseSchema.index(
  { surveyId: 1, surveyVersion: 1, respondentIdentifier: 1 },
  {
    unique: true,
    partialFilterExpression: {
      respondentIdentifier: { $exists: true, $ne: null },
    },
  }
);

// Performance indexes for analytics and reporting queries
responseSchema.index({
  companyId: 1,
  surveyId: 1,
  surveyVersion: 1,
  submittedAt: -1,
});
responseSchema.index({ companyId: 1, submittedAt: -1 }); // For company-wide analytics
responseSchema.index({ surveyId: 1, surveyVersion: 1, submittedAt: -1 }); // For survey analytics
responseSchema.index({ surveyId: 1, surveyVersion: 1, device: 1 }); // For device analytics

export default mongoose.model("Response", responseSchema);
