import { z } from "zod";

/**
 * Shared by the client forms and the server functions.
 *
 * Client-side validation is a convenience, never a guarantee — every server
 * function re-validates with the same schema.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

const password = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(200, "Password is too long.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your full name.")
    .max(80, "Name cannot exceed 80 characters."),
  email,
  password,
  /** Seeds the first workspace. Defaults to the person's name server-side. */
  workspaceName: z
    .string()
    .trim()
    .min(1, "Enter a workspace name.")
    .max(200, "Workspace name cannot exceed 200 characters.")
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
