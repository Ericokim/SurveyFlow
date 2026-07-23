import { z } from "zod";

/**
 * Response Submission Schema
 *
 * For POST /api/surveys/:publicId/responses
 */
export const submitResponseSchema = z.object({
  answers: z.record(z.any()), // { questionId: answer }
  identifier: z.string().optional(), // email or phone for whitelisted surveys
  completionTime: z.number().optional(), // in seconds
  startedAt: z.string().optional(), // ISO timestamp
  visitedSectionIds: z.array(z.string()).optional(),
  visitedQuestionIds: z.array(z.string()).optional(),
});

/**
 * Validate Access Schema
 *
 * For POST /api/surveys/:publicId/validate-access
 */
export const validateAccessSchema = z.object({
  identifier: z.string().optional(),
});

/**
 * Response Data Schema (from backend)
 */
export const responseDataSchema = z.object({
  _id: z.string(),
  surveyId: z.string(),
  surveyVersion: z.number(),
  companyId: z.string(),
  recipientId: z.string().optional(),
  respondentIdentifier: z.string().optional(),
  answers: z.record(z.any()),
  submittedAt: z.string(),
  completionTime: z.number().optional(),
  device: z.string().optional(),
  metadata: z.any().optional(),
});
