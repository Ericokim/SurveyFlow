import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * The survey pointer document — identity, settings and which version is live.
 *
 * The questions are NOT here. They live in `SurveyVersion` so that editing a
 * published survey cannot change what past respondents saw. See
 * `src/features/surveys/versioning.ts`.
 */
export interface SurveyAttrs {
  companyId: Types.ObjectId;
  title: string;
  description?: string;
  status: "draft" | "published" | "closed";
  access: "open" | "whitelist";
  publicId: string;
  createdBy: Types.ObjectId;
  logo?: string;
  themeColor?: string;
  thankYouMessage: string;
  showProgress: boolean;
  oneResponsePerRecipient: boolean;
  captureMetadata: boolean;
  currentVersion: number;
  publishedVersion: number | null;
  responseCount: number;
  completedCount: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SurveyDocument = HydratedDocument<SurveyAttrs>;

const surveySchema = new Schema<SurveyAttrs>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
    // Replaces the reference's isWhitelistEnabled boolean; "passcode" was
    // dropped (spec Decision 6).
    access: {
      type: String,
      enum: ["open", "whitelist"],
      default: "open",
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      match: [/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "publicId must be URL-safe"],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Branding. Null means inherit the workspace default from Company.
    logo: String,
    themeColor: {
      type: String,
      match: [/^#[0-9A-Fa-f]{6}$/, "Theme color must be #rrggbb"],
    },
    thankYouMessage: {
      type: String,
      default: "Thank you for your response!",
      maxlength: 2000,
    },

    showProgress: { type: Boolean, default: true },
    oneResponsePerRecipient: { type: Boolean, default: true },
    captureMetadata: { type: Boolean, default: false },

    currentVersion: { type: Number, default: 1, min: 1 },
    publishedVersion: { type: Number, default: null },

    // Denormalised so a survey list never aggregates over every response.
    // Maintained on submission.
    responseCount: { type: Number, default: 0, min: 0 },
    completedCount: { type: Number, default: 0, min: 0 },

    deletedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

/** The main list view: this workspace's surveys, by status, newest first. */
surveySchema.index({ companyId: 1, status: 1, updatedAt: -1 });

surveySchema.plugin(tenantScopePlugin, { softDelete: true });

export const Survey: Model<SurveyAttrs> =
  (mongoose.models.Survey as Model<SurveyAttrs> | undefined) ??
  mongoose.model<SurveyAttrs>("Survey", surveySchema);
