import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional().or(z.literal(""))
);

const optionalTrimmedName = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().max(100).optional().or(z.literal(""))
);

/**
 * Add Recipient Schema
 *
 * For POST /api/admin/surveys/:surveyId/recipients
 * At least one contact method (phone or email) is required
 */
export const addRecipientSchema = z
  .object({
    name: optionalTrimmedName,
    phone: optionalTrimmedString.refine(
      (value) => {
        if (!value) return true;
        return isValidPhoneNumber(value);
      },
      { message: "Invalid phone number" }
    ),
    email: optionalTrimmedString.refine(
      (value) => {
        if (!value) return true;
        return z.string().email().safeParse(value).success;
      },
      { message: "Invalid email address" }
    ),
  })
  .refine(
    (data) => {
      // At least one contact method must be provided
      const hasPhone = data.phone && data.phone.trim().length > 0;
      const hasEmail = data.email && data.email.trim().length > 0;
      return hasPhone || hasEmail;
    },
    {
      message: "Please provide at least a phone number or email address",
      path: ["phone"], // Show error on phone field
    }
  );
