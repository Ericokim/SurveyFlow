import type { HydratedDocument, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { baseSchemaOptions } from "./_shared";

/**
 * A Company is the tenant itself. It is not "tenant-owned" — it has no
 * `companyId` — so the isolation boundary treats it as a special case.
 *
 * `slug` addresses the workspace in the URL (`/app/:workspaceSlug/…`) and is
 * therefore the entry point for tenant resolution. It must stay unique and
 * URL-safe.
 */
export interface CompanyAttrs {
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  defaultFont: "Inter" | "Roboto" | "Arial";
  thankYouMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanyDocument = HydratedDocument<CompanyAttrs>;

const companySchema = new Schema<CompanyAttrs>(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Company slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
        "Slug must be lowercase alphanumeric with single hyphens",
      ],
      maxlength: [60, "Slug cannot exceed 60 characters"],
    },
    logo: { type: String, default: "" },
    // Branding defaults. A survey may override these; null means inherit.
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
  baseSchemaOptions,
);

export const Company: Model<CompanyAttrs> =
  (mongoose.models.Company as Model<CompanyAttrs> | undefined) ??
  mongoose.model<CompanyAttrs>("Company", companySchema);
