import { z } from "zod";

/**
 * Login Schema
 *
 * For POST /api/auth/login
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Register Schema
 *
 * For POST /api/auth/register
 */
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(200),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Forgot Password Schema
 *
 * For POST /api/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Reset Password Schema
 *
 * For POST /api/auth/reset-password/:token
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * User Schema (from backend)
 */
export const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]),
  companyId: z.string(),
  company: z.object({
    _id: z.string(),
    name: z.string(),
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    defaultFont: z.string().optional(),
  }),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
    })
    .optional(),
  lastLoginAt: z.string().optional(),
  isActive: z.boolean(),
});
