import { z } from "zod";

/**
 * Question Schema
 *
 * Mirrors backend SurveyVersion.questionSchema exactly.
 * This is the single source of truth for question structure on the frontend.
 */
export const questionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "short_text",
    "long_text",
    "single_choice",
    "multiple_choice",
    "dropdown",
    "rating",
    "date",
  ]),
  title: z.string().min(1, "Question title is required"),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number(),
  sectionId: z.string().optional(),

  // For choice types (single_choice, multiple_choice, dropdown)
  options: z.array(z.string()).optional(),
  allowOther: z.boolean().optional(),

  // For rating type
  ratingScale: z.union([z.literal(5), z.literal(10)]).optional(),

  // Validation rules
  validation: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      minSelections: z.number().optional(),
      maxSelections: z.number().optional(),
      pattern: z.string().optional(),
      predefinedPattern: z
        .enum([
          "email",
          "phone",
          "url",
          "numeric",
          "integer",
          "alphanumeric",
        ])
        .nullable()
        .optional(),
      customMessage: z.string().max(200).optional(),
    })
    .optional(),

  // Conditional logic
  logic: z
    .object({
      visibleIf: z.object({
        questionId: z.string(),
        operator: z.enum([
          "equals",
          "not_equals",
          "in",
          "not_in",
          "gt",
          "lt",
          "gte",
          "lte",
          "contains",
          "exists",
        ]),
        value: z.any(),
      }),
    })
    .optional(),
});

/**
 * Section Schema
 *
 * Optional grouping for questions.
 */
export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  required: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
  pageBreak: z.boolean().optional(),
});

/**
 * Survey Schema
 *
 * Mirrors backend Survey + SurveyVersion structure.
 */
export const surveySchema = z.object({
  _id: z.string(),
  title: z.string().min(1, "Survey title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "closed"]),
  publicId: z.string(),
  logo: z.string().optional(),
  themeColor: z.string().optional(),
  thankYouMessage: z.string().optional(),
  isWhitelistEnabled: z.boolean().default(false),
  currentVersion: z.number(),
  publishedVersion: z.number().nullable(),
  sections: z.array(sectionSchema).optional(),
  visibilityRules: z.array(z.any()).optional(),
  navigationRules: z.array(z.any()).optional(),
  settings: z
    .object({
      presentationMode: z.enum(["single_page", "multi_step"]).optional(),
      autoAdvanceThreshold: z.number().nullable().optional(),
    })
    .optional(),
  scenarios: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        steps: z.any(),
        expectedPath: z.array(z.string()).optional(),
      })
    )
    .optional(),
  questions: z.array(questionSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Create Survey Input Schema
 *
 * For POST /api/surveys
 */
export const createSurveySchema = z.object({
  title: z.string().min(1, "Survey title is required").max(200),
  description: z.string().max(5000).optional(),
  questions: z.array(questionSchema).optional(),
});

/**
 * Update Survey Input Schema
 *
 * For PATCH /api/surveys/:id
 */
export const updateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  logo: z.string().optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  thankYouMessage: z.string().max(2000).optional(),
  isWhitelistEnabled: z.boolean().optional(),
  questions: z.array(questionSchema).optional(),
});

/**
 * Question Types Definition
 *
 * Frontend UI dropdowns use constants in lib/constants/questionTypes.js.
 */

/**
 * Get default question structure
 */
export const getDefaultQuestion = (type) => ({
  id: crypto.randomUUID(),
  type,
  title: "",
  required: false,
  order: 0,
  options: ["single_choice", "multiple_choice", "dropdown"].includes(type)
    ? ["Option 1", "Option 2"]
    : undefined,
  ratingScale: type === "rating" ? 5 : undefined,
});
