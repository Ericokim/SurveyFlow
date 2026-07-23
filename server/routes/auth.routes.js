import express from "express";
import Joi from "joi";
import {
  register,
  login,
  getMe,
  updatePreferences,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controllers.js";
import { validate } from "../middleware/validationMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required(),
  companyName: Joi.string().trim().min(2).max(200).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(1).required(),
});

const updatePreferencesSchema = Joi.object({
  theme: Joi.string().valid("light", "dark", "system").optional(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
    }),
});

// @desc    Register new user and company
// @route   POST /api/auth/register
// @access  Public
router.post("/register", validate(registerSchema), register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", validate(loginSchema), login);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, getMe);

// @desc    Update current user preferences
// @route   PATCH /api/auth/preferences
// @access  Private
router.patch(
  "/preferences",
  protect,
  validate(updatePreferencesSchema),
  updatePreferences
);

// @desc    Send password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// @desc    Reset password via emailed link token
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
router.post(
  "/reset-password/:resetToken",
  validate(resetPasswordSchema),
  resetPassword
);

export default router;
