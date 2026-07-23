/**
 * Survey Model - Core survey template with versioning support
 *
 * Represents the mutable survey metadata and configuration.
 * Actual question content is stored in SurveyVersion documents.
 *
 * @fileoverview Survey model for MERN SurveyFlow
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Survey schema representing a survey template with draft/published lifecycle
 *
 * @typedef {Object} Survey
 * @property {ObjectId} companyId - Company that owns this survey (required)
 * @property {string} title - Survey title, max 200 characters (required)
 * @property {string} description - Survey description, max 5000 characters
 * @property {string} status - Survey status: 'draft' | 'published' | 'closed'
 * @property {string} publicId - Unique public identifier for survey access
 * @property {string} logo - Survey-specific logo URL (overrides company logo)
 * @property {string} themeColor - Survey-specific theme color (hex format)
 * @property {string} thankYouMessage - Message shown after completion
 * @property {boolean} isWhitelistEnabled - Whether to restrict access to recipients
 * @property {number} currentVersion - Current version number for editing
 * @property {number} publishedVersion - Version number that was published
 * @property {boolean} captureMetadata - Whether to capture IP/UserAgent data
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - When survey was soft deleted
 * @property {ObjectId} createdBy - User who created this survey
 * @property {Date} publishedAt - When survey was published
 * @property {Date} closedAt - When survey was closed
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const surveySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Survey title is required"],
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },

    publicId: {
      type: String,
      unique: true,
      index: true,
      validate: {
        validator: function (v) {
          // Allow UUID or URL-safe slug format
          return !v || /^[a-zA-Z0-9]([a-zA-Z0-9\-_]*[a-zA-Z0-9])?$/.test(v);
        },
        message: "publicId must be a valid URL-safe identifier",
      },
    },

    logo: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v || v === "") return true; // Allow empty string
          // Check for basic URL format or relative path
          const urlPattern = /^(https?:\/\/|\/)/;
          const relativePathPattern =
            /^[a-zA-Z0-9._\-\/]+\.(jpg|jpeg|png|gif|svg|webp)$/i;
          return urlPattern.test(v) || relativePathPattern.test(v);
        },
        message: "Logo must be a valid URL or file path",
      },
    },
    themeColor: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v || v === "") return true; // Allow empty string for fallback
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: "Theme color must be a valid hex color format (#rrggbb)",
      },
    },
    thankYouMessage: {
      type: String,
      default: "Thank you for your response!",
      maxlength: [2000, "Thank you message cannot exceed 2000 characters"],
    },

    isWhitelistEnabled: { type: Boolean, default: false },
    showProgress: { type: Boolean, default: true },
    oneResponsePerRecipient: { type: Boolean, default: true },

    // versioning
    currentVersion: { type: Number, default: 1 },
    publishedVersion: { type: Number, default: null },

    // Concurrent edit protection
    isUpdated: { type: Boolean, default: false },

    // metadata capture flags
    captureMetadata: {
      type: Boolean,
      default: false, // opt-in per survey; when true, store IP/UA/geo in responses
    },

    // soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

// Performance indexes for dashboard queries
surveySchema.index({ companyId: 1, status: 1, updatedAt: -1 });
surveySchema.index({ companyId: 1, publicId: 1 }); // For public survey access
surveySchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 }); // For listing active surveys

// Text search index for survey search functionality
surveySchema.index(
  {
    title: "text",
    description: "text",
  },
  {
    weights: { title: 10, description: 5 },
    name: "survey_text_search",
  }
);

export default mongoose.model("Survey", surveySchema);
