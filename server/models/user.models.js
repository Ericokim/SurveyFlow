/**
 * User Model - Application users with role-based access control
 *
 * @fileoverview User model with authentication and company scoping
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * User schema representing application users
 * @typedef {Object} User
 * @property {ObjectId} companyId - Company this user belongs to (required)
 * @property {string} name - Full name, max 80 characters (required)
 * @property {string} email - Email address, unique and lowercase (required)
 * @property {string} passwordHash - Bcrypt hashed password (required)
 * @property {string} role - User role: 'admin' | 'viewer' (default: admin)
 * @property {boolean} isActive - Whether user account is active (default: true)
 * @property {Object} preferences - User preferences
 * @property {string} preferences.theme - UI theme: 'light' | 'dark' | 'system'
 * @property {Date} lastLoginAt - Last login timestamp
 * @property {Date} lastActiveAt - Last activity timestamp for tracking inactive users
 * @property {string} resetPasswordToken - SHA256 hashed password reset token
 * @property {Date} resetPasswordExpire - Password reset token expiration date
 * @property {string} emailVerificationToken - SHA256 hashed email verification token
 * @property {boolean} isEmailVerified - Whether user's email is verified (default: false)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Please enter your full name"],
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
    passwordHash: {
      type: String,
      required: [true, "Please enter your password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "viewer"],
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "light",
      },
    },
    lastLoginAt: Date,
    lastActiveAt: Date, // For tracking inactive users
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  return verificationToken;
};

// Update last login timestamp
userSchema.methods.updateLastLogin = function () {
  this.lastLoginAt = new Date();
  this.lastActiveAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  return user;
};

// Index for fast lookups (email already indexed via unique: true)
userSchema.index({ companyId: 1, role: 1 });

// Additional performance indexes for common queries
userSchema.index({ name: 1 }); // For user search and filtering by name
userSchema.index({ isActive: 1 }); // For filtering active/inactive users
userSchema.index({ createdAt: -1 }); // For sorting users by registration date

export default mongoose.model("User", userSchema);
