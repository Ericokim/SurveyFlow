import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import {
  CONDITION_OPERATORS,
  NAVIGATION_ACTIONS,
  PREDEFINED_PATTERNS,
  QUESTION_TYPES,
} from "@/features/surveys/question-types";
import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * An immutable snapshot of a survey's structure.
 *
 * Once a version is published it is never edited — an edit forks a new version
 * instead. Every `Response` records which version it answered, so old answers
 * keep their meaning forever.
 *
 * This file stores and validates the rules. It does **not** evaluate them; the
 * logic engine is a separate piece of work.
 */

/** One condition: "answer to question X compares to value V". */
const conditionSchema = new Schema(
  {
    questionId: { type: String, required: true },
    operator: { type: String, enum: CONDITION_OPERATORS, required: true },
    value: Schema.Types.Mixed,
  },
  { _id: false },
);

/**
 * A set of conditions and how to combine them.
 *
 * One shape for both visibility and navigation rules. The MERN reference used
 * two different shapes — one typed, one `Mixed` with a hand-written validator —
 * which this deliberately replaces.
 */
const conditionGroupSchema = new Schema(
  {
    match: { type: String, enum: ["all", "any"], default: "all" },
    conditions: { type: [conditionSchema], default: [] },
  },
  { _id: false },
);

const validationSchema = new Schema(
  {
    minLength: { type: Number, min: 0 },
    maxLength: { type: Number, min: 1 },
    minSelections: { type: Number, min: 1 },
    maxSelections: { type: Number, min: 1 },
    pattern: {
      type: String,
      validate: {
        validator: (value: string) => {
          if (!value) return true;
          try {
            new RegExp(value);
            return true;
          } catch {
            return false;
          }
        },
        message: "Invalid regular expression",
      },
    },
    predefinedPattern: { type: String, enum: PREDEFINED_PATTERNS },
    customMessage: { type: String, maxlength: 200 },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 500 },
    helpText: { type: String, maxlength: 300 },
    required: { type: Boolean, default: false },
    sectionId: String,
    order: { type: Number, default: 0 },
    options: { type: [{ type: String, maxlength: 200 }], default: undefined },
    /** Free-text escape hatch; only meaningful on choice questions. */
    allowOther: { type: Boolean, default: false },
    validation: validationSchema,
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    description: String,
    order: { type: Number, default: 0 },
    /** Question ids in display order, for multi-step rendering. */
    questionIds: { type: [String], default: [] },
    randomizeQuestions: { type: Boolean, default: false },
    pageBreak: { type: Boolean, default: false },
  },
  { _id: false },
);

/** Show or hide a section or a question when the condition matches. */
const visibilityRuleSchema = new Schema(
  {
    id: { type: String, required: true },
    targetType: { type: String, enum: ["section", "question"], required: true },
    targetId: { type: String, required: true },
    effect: { type: String, enum: ["show", "hide"], default: "show" },
    when: { type: conditionGroupSchema, required: true },
    priority: { type: Number, default: 0 },
  },
  { _id: false },
);

/** Send the respondent somewhere other than the next section. */
const navigationRuleSchema = new Schema(
  {
    id: { type: String, required: true },
    /** Null means the rule applies from any section. */
    fromSectionId: { type: String, default: null },
    when: { type: conditionGroupSchema, required: true },
    action: {
      type: { type: String, enum: NAVIGATION_ACTIONS, required: true },
      targetSectionId: String,
      targetQuestionId: String,
      skipCount: Number,
    },
    priority: { type: Number, default: 0 },
  },
  { _id: false },
);

export interface SurveyVersionAttrs {
  companyId: Types.ObjectId;
  surveyId: Types.ObjectId;
  version: number;
  sections: unknown[];
  questions: unknown[];
  visibilityRules: unknown[];
  navigationRules: unknown[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SurveyVersionDocument = HydratedDocument<SurveyVersionAttrs>;

const surveyVersionSchema = new Schema<SurveyVersionAttrs>(
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
    version: { type: Number, required: true, min: 1 },

    sections: { type: [sectionSchema], default: [] },
    questions: { type: [questionSchema], default: [] },
    visibilityRules: { type: [visibilityRuleSchema], default: [] },
    navigationRules: { type: [navigationRuleSchema], default: [] },

    /** Set when this version goes live; a set value means never edit it. */
    publishedAt: Date,
  },
  baseSchemaOptions,
);

/** One row per survey per version number. */
surveyVersionSchema.index({ surveyId: 1, version: 1 }, { unique: true });

surveyVersionSchema.plugin(tenantScopePlugin);

export const SurveyVersion: Model<SurveyVersionAttrs> =
  (mongoose.models.SurveyVersion as Model<SurveyVersionAttrs> | undefined) ??
  mongoose.model<SurveyVersionAttrs>("SurveyVersion", surveyVersionSchema);
