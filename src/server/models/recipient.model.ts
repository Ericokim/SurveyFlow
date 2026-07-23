import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * Someone invited to answer one survey.
 *
 * `token` is the magic link: it resolves to exactly one recipient, so a
 * whitelisted survey can identify them without asking for their email or phone
 * again, and without putting either in the URL. Manual identification against
 * the whitelist stays as the fallback for a lost or forwarded link.
 */
export interface RecipientAttrs {
  companyId: Types.ObjectId;
  surveyId: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  token: string;
  tokenExpiresAt?: Date;
  status: "pending" | "invited" | "in_progress" | "completed" | "failed";
  isBlacklisted: boolean;
  createdBy: Types.ObjectId;
  invitedAt?: Date;
  completedAt?: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RecipientDocument = HydratedDocument<RecipientAttrs>;

const recipientSchema = new Schema<RecipientAttrs>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    name: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+[1-9]\d{1,14}$/, "Phone must be E.164 (+1234567890)"],
    },
    token: { type: String, required: true, unique: true },
    tokenExpiresAt: Date,
    status: {
      type: String,
      enum: ["pending", "invited", "in_progress", "completed", "failed"],
      default: "pending",
      index: true,
    },
    isBlacklisted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invitedAt: Date,
    completedAt: Date,
    deletedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

// One entry per person per survey. Partial so recipients identified only by
// phone do not collide on a missing email, and vice versa.
recipientSchema.index(
  { surveyId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
recipientSchema.index(
  { surveyId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);

/** Recipient list filtered by status. */
recipientSchema.index({ surveyId: 1, status: 1, createdAt: -1 });

recipientSchema.plugin(tenantScopePlugin, { softDelete: true });

export const Recipient: Model<RecipientAttrs> =
  (mongoose.models.Recipient as Model<RecipientAttrs> | undefined) ??
  mongoose.model<RecipientAttrs>("Recipient", recipientSchema);
