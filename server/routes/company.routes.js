/**
 * Company Routes
 *
 * Defines routes for company management including settings and logo upload.
 * Includes both admin and public endpoints for branding assets.
 *
 * @fileoverview Company routes for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import Joi from "joi";
import {
  getCompanyProfile,
  updateCompanySettings,
  uploadLogo,
  deleteLogo,
  serveLogo,
  upload,
} from "../controllers/company.controllers.js";
import { validate } from "../middleware/validationMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const updateSettingsSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  primaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  defaultFont: Joi.string()
    .valid("Inter", "Roboto", "Arial")
    .optional(),
  thankYouMessage: Joi.string().trim().max(2000).allow("", null).optional(),
});

// @desc    Get company profile/settings
// @route   GET /api/company/profile
// @access  Private
router.get("/profile", protect, getCompanyProfile);

// @desc    Update company settings
// @route   PATCH /api/company/settings
// @access  Private - Admin only
router.patch(
  "/settings",
  [protect, validate(updateSettingsSchema)],
  updateCompanySettings
);

// @desc    Upload company logo (S3 via backend SDK)
// @route   POST /api/company/logo
// @access  Private - Admin only
router.post("/logo", [protect, upload.single("logo")], uploadLogo);

// @desc    Delete company logo
// @route   DELETE /api/company/logo
// @access  Private - Admin only
router.delete("/logo", protect, deleteLogo);

// @desc    Serve company logo file
// @route   GET /api/company/logo/:filename
// @access  Public
router.get("/logo/:filename", serveLogo);

export default router;
