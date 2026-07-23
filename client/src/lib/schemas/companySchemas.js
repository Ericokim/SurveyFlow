import { z } from "zod";

const allowedFonts = ["Inter", "Roboto", "Arial"];

/**
 * Workspace Settings Schema
 *
 * For PATCH /api/admin/company/settings
 */
export const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
  defaultFont: z.enum(allowedFonts, {
    errorMap: () => ({ message: "Font must be Inter, Roboto, or Arial" }),
  }),
  thankYouMessage: z
    .string()
    .min(1, "Thank you message is required")
    .max(2000, "Thank you message must be less than 2000 characters"),
});

/**
 * Logo Upload Schema (for validation)
 */
export const logoUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      "File must be less than 2MB"
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Only JPG, PNG, and WebP images are allowed"
    ),
});
