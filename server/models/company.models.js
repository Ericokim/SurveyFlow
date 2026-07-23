/**
 * Company Model - Multi-tenant company/workspace configuration
 *
 * @fileoverview Company model for workspace branding and settings
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Company schema representing tenant workspaces
 * @typedef {Object} Company
 * @property {string} name - Company name, unique, max 200 characters (required)
 * @property {string} logo - Logo file path or URL (default: empty)
 * @property {string} primaryColor - Brand color in hex format (default: #10B981)
 * @property {string} secondaryColor - Secondary brand color in hex format (default: #10B981)
 * @property {string} defaultFont - Default font for surveys
 * @property {string} thankYouMessage - Default thank you message for surveys
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      unique: true,
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    logo: {
      type: String,
      default: "",
    },
    primaryColor: {
      type: String,
      default: "#10B981",
      match: [/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"],
    },
    secondaryColor: {
      type: String,
      default: "#10B981",
      match: [/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"],
    },
    defaultFont: {
      type: String,
      enum: ["Inter", "Roboto", "Arial"],
      default: "Inter",
    },
    thankYouMessage: {
      type: String,
      default: "Thank you for completing this survey!",
      maxlength: [2000, "Thank you message cannot exceed 2000 characters"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
