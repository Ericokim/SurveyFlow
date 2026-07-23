import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * One attempt to reach a recipient by email or SMS.
 *
 * Delivery is asynchronous, so this row is the record of what was sent and
 * what the provider said about it. Provider callbacks update `status` and
 * `error` — see the Twilio webhook in `docs/api/openapi.yaml`.
 */
export interface CommunicationAttrs {
  companyId: Types.ObjectId;
  surveyId?: Types.ObjectId;
  recipientId?: Types.ObjectId;
  channel: "email" | "sms";
  to: string;
  status: "queued" | "sent" | "delivered" | "failed";
  providerMessageId?: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunicationDocument = HydratedDocument<CommunicationAttrs>;

const communicationSchema = new Schema<CommunicationAttrs>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    surveyId: { type: Schema.Types.ObjectId, ref: "Survey", index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "Recipient", index: true },
    channel: { type: String, enum: ["email", "sms"], required: true },
    /** Email address or E.164 phone number the message went to. */
    to: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed"],
      default: "queued",
      index: true,
    },
    /** Provider's id, used to match delivery callbacks back to this row. */
    providerMessageId: { type: String, index: true },
    error: String,
    sentAt: Date,
  },
  baseSchemaOptions,
);

communicationSchema.plugin(tenantScopePlugin);

export const Communication: Model<CommunicationAttrs> =
  (mongoose.models.Communication as Model<CommunicationAttrs> | undefined) ??
  mongoose.model<CommunicationAttrs>("Communication", communicationSchema);
