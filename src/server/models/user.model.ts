import type { HydratedDocument, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { baseSchemaOptions } from "./_shared";

/**
 * A User is a person, not a tenant member.
 *
 * Unlike the MERN reference, this schema carries **no `companyId` and no
 * `role`** — a user belongs to many workspaces with a different role in each,
 * expressed by the `Membership` collection. See
 * docs/specs/2026-07-23-multitenant-foundation.md (Decision 1).
 */
export interface UserAttrs {
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  preferences: { theme: "light" | "dark" | "system" };
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerificationToken?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserAttrs>;

const userSchema = new Schema<UserAttrs>(
  {
    name: {
      type: String,
      required: [true, "Please enter your full name"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    // Never returned unless a query explicitly selects it.
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
    },
    lastLoginAt: Date,
    lastActiveAt: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    isEmailVerified: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const User: Model<UserAttrs> =
  (mongoose.models.User as Model<UserAttrs> | undefined) ??
  mongoose.model<UserAttrs>("User", userSchema);
