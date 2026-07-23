import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * One person's answers to one survey.
 *
 * `surveyVersion` is required and never changes: it records the exact survey
 * structure this person was shown, so later edits cannot alter the meaning of
 * these answers.
 *
 * `recipientId` is absent for anonymous surveys — deliberately absent rather
 * than ignored, because a foreign key that exists can always be joined.
 */
export interface ResponseAttrs {
  companyId: Types.ObjectId;
  surveyId: Types.ObjectId;
  surveyVersion: number;
  recipientId?: Types.ObjectId;
  /** Hashed email or phone for whitelisted surveys. Never plaintext. */
  respondentIdentifier?: string;
  answers: Map<string, unknown>;
  responseStatus: "in_progress" | "completed";
  progress: {
    answeredCount: number;
    totalQuestions: number;
    percentComplete: number;
  };
  navigation: {
    currentSectionIndex: number;
    currentQuestionId: string | null;
    history: string[];
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
    locale?: string;
    consented: boolean;
  };
  startedAt?: Date;
  lastSavedAt?: Date;
  submittedAt?: Date;
  completionTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ResponseDocument = HydratedDocument<ResponseAttrs>;

const responseSchema = new Schema<ResponseAttrs>(
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
    surveyVersion: { type: Number, required: true, min: 1 },

    recipientId: { type: Schema.Types.ObjectId, ref: "Recipient", index: true },
    respondentIdentifier: { type: String, index: true },

    // Keyed by question id. Answers are validated against the question's type
    // and validation rules on submission, not by the schema — the shape is
    // per-question and only the survey version knows it.
    answers: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    responseStatus: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      index: true,
    },

    // Lets a respondent leave and come back without losing their place.
    progress: {
      answeredCount: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      percentComplete: { type: Number, default: 0 },
    },
    navigation: {
      currentSectionIndex: { type: Number, default: 0 },
      currentQuestionId: { type: String, default: null },
      history: { type: [String], default: [] },
    },

    metadata: {
      ip: String,
      userAgent: String,
      locale: String,
      consented: { type: Boolean, default: false },
    },

    startedAt: Date,
    lastSavedAt: Date,
    submittedAt: Date,
    completionTime: Number,
  },
  baseSchemaOptions,
);

/** Response list and analytics for one survey. */
responseSchema.index({ surveyId: 1, responseStatus: 1, submittedAt: -1 });

/**
 * One response per recipient per survey, when the survey requires it.
 * Partial so anonymous responses (no recipientId) are never constrained.
 */
responseSchema.index(
  { surveyId: 1, recipientId: 1 },
  {
    unique: true,
    partialFilterExpression: { recipientId: { $type: "objectId" } },
  },
);

responseSchema.plugin(tenantScopePlugin);

export const SurveyResponse: Model<ResponseAttrs> =
  (mongoose.models.Response as Model<ResponseAttrs> | undefined) ??
  mongoose.model<ResponseAttrs>("Response", responseSchema);
