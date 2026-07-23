/**
 * Authentication Controllers
 *
 * Handles user registration, login, and authentication status endpoints.
 * Follows KISS + DRY principles with standardized responses.
 *
 * @fileoverview Authentication controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse, sendCreated } from "../utils/response.js";
import User from "../models/user.models.js";
import Company from "../models/company.models.js";
import { logger } from "../utils/logger.js";
import { sendPasswordResetLinkEmail } from "../services/email.service.js";

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "24h",
  });
};

// @desc    Register new user and company
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, companyName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Check if company name already exists
  const existingCompany = await Company.findOne({ name: companyName });
  if (existingCompany) {
    res.status(400);
    throw new Error("Company name already taken");
  }

  let company = null;
  let user = null;

  try {
    // Create company first
    company = await Company.create({
      name: companyName,
    });

    // Create user with company reference
    user = await User.create({
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      companyId: company._id,
      role: "admin", // First user is always admin
    });
  } catch (error) {
    if (company?._id) {
      await Company.deleteOne({ _id: company._id }).catch(() => {});
    }
    throw error;
  }

  // Update lastLoginAt for new user
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    company: {
      _id: company._id,
      name: company.name,
      logo: company.logo,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      defaultFont: company.defaultFont,
      thankYouMessage: company.thankYouMessage,
    },
    preferences: user.preferences,
    token,
  };

  sendCreated(res, userData, "User registered successfully");
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch only fields needed for authentication and response.
  const user = await User.findOne({ email })
    .select("name email role companyId preferences isActive +passwordHash")
    .lean();

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(401);
    throw new Error("Account is inactive. Please contact your administrator.");
  }

  // Validate password directly to avoid hydrating a mongoose document.
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const [company] = await Promise.all([
    Company.findById(user.companyId)
      .select(
        "name logo primaryColor secondaryColor defaultFont thankYouMessage"
      )
      .lean(),
    User.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), lastActiveAt: new Date() } }
    ).catch((error) => {
      logger.warn(`[AUTH] Failed to update last login: ${error.message}`);
    }),
  ]);

  if (!company) {
    res.status(401);
    throw new Error(
      "Account setup is incomplete. Please contact your administrator."
    );
  }

  const token = generateToken(user._id);

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: company._id,
    company: {
      _id: company._id,
      name: company.name,
      logo: company.logo,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      defaultFont: company.defaultFont,
      thankYouMessage: company.thankYouMessage,
    },
    preferences: user.preferences,
    token,
  };

  sendResponse(res, {
    data: userData,
    message: "Login successful",
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const authUserId = req.user?._id || req.user?.id;
  // req.user is set by auth middleware
  const user = await User.findById(authUserId)
    .populate(
      "companyId",
      "name logo primaryColor secondaryColor defaultFont thankYouMessage"
    )
    .select("-passwordHash");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId._id,
    company: {
      _id: user.companyId._id,
      name: user.companyId.name,
      logo: user.companyId.logo,
      primaryColor: user.companyId.primaryColor,
      secondaryColor: user.companyId.secondaryColor,
      defaultFont: user.companyId.defaultFont,
      thankYouMessage: user.companyId.thankYouMessage,
    },
    preferences: user.preferences,
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive,
  };

  sendResponse(res, {
    data: userData,
    message: "User profile retrieved successfully",
  });
});

// @desc    Send a password-reset link to the user's email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always respond with success to prevent email enumeration attacks.
  if (!user || !user.isActive) {
    return sendResponse(res, {
      message:
        "If that email is registered, a password reset link has been sent.",
    });
  }

  // Use the model method — generates raw token, stores its hash + expiry.
  const rawToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

  try {
    const emailResponse = await sendPasswordResetLinkEmail(
      user.email,
      user.name,
      resetUrl
    );

    const providerBody = emailResponse?.provider?.body;

    return sendResponse(res, {
      message:
        providerBody?.message ||
        emailResponse?.status?.message ||
        "Password reset link queued successfully.",
      data: providerBody?.data ?? emailResponse?.data ?? [],
    });
  } catch (emailError) {
    // Clean up token fields if mail send fails so user isn't stuck.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    logger.error(`[AUTH] Failed to send reset email: ${emailError.message}`);
    res.status(500);
    throw new Error("Email could not be sent. Please try again later.");
  }

  return;
});

// @desc    Reset password using a token from the emailed reset link
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+passwordHash");

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or has expired.");
  }

  // bcrypt hashing is handled by the pre-save hook in the User model.
  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  logger.info(`[AUTH] Password reset completed for user ${user._id}`);

  sendResponse(res, {
    message: "Password reset successfully. You can now log in.",
  });
});

// @desc    Update current user preferences
// @route   PATCH /api/auth/preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req, res) => {
  const { theme } = req.body;
  const authUserId = req.user?._id || req.user?.id;

  const user = await User.findById(authUserId)
    .populate(
      "companyId",
      "name logo primaryColor secondaryColor defaultFont thankYouMessage"
    )
    .select("-passwordHash");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.preferences = {
    ...(user.preferences || {}),
    ...(theme ? { theme } : {}),
  };

  await user.save();

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId._id,
    company: {
      _id: user.companyId._id,
      name: user.companyId.name,
      logo: user.companyId.logo,
      primaryColor: user.companyId.primaryColor,
      secondaryColor: user.companyId.secondaryColor,
      defaultFont: user.companyId.defaultFont,
      thankYouMessage: user.companyId.thankYouMessage,
    },
    preferences: user.preferences,
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive,
  };

  sendResponse(res, {
    data: userData,
    message: "Preferences updated successfully",
  });
});
