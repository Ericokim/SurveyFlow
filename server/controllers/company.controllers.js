/**
 * Company Controllers
 *
 * Handles company settings, branding, and logo upload functionality.
 * Follows KISS + DRY principles with standardized responses.
 *
 * @fileoverview Company controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import Company from "../models/company.models.js";
import {
  uploadToS3,
  deleteFromS3,
} from "../utils/s3.js";

const getLogoExtension = (file) => {
  if (file?.originalname) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext) return ext;
  }

  const mimeToExt = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  };

  return mimeToExt[file?.mimetype] || ".png";
};

// Configure multer for logo upload (memory storage; backend uploads to S3)
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// @desc    Get company profile/settings
// @route   GET /api/company/profile
// @access  Private
export const getCompanyProfile = asyncHandler(async (req, res) => {
  const { companyId } = req.user;

  const company = await Company.findById(companyId).lean();

  if (!company) {
    res.status(404);
    throw new Error("Company not found");
  }

  sendResponse(res, {
    data: company,
    message: "Company profile retrieved successfully",
  });
});

// @desc    Update company settings
// @route   PATCH /api/company/settings
// @access  Private - Admin only
export const updateCompanySettings = asyncHandler(async (req, res) => {
  const { companyId, role } = req.user;

  // Only admins can update company settings
  if (role !== "admin") {
    res.status(403);
    throw new Error("Access denied - admin privileges required");
  }

  const { name, primaryColor, secondaryColor, defaultFont, thankYouMessage } =
    req.body;

  // Prepare update object with only provided fields
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
  if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
  if (defaultFont !== undefined) updateData.defaultFont = defaultFont;
  if (thankYouMessage !== undefined)
    updateData.thankYouMessage = thankYouMessage;

  const company = await Company.findByIdAndUpdate(companyId, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!company) {
    res.status(404);
    throw new Error("Company not found");
  }

  sendResponse(res, {
    data: company,
    message: "Company settings updated successfully",
  });
});

// @desc    Upload company logo
// @route   POST /api/company/logo
// @access  Private - Admin only
export const uploadLogo = asyncHandler(async (req, res) => {
  const { companyId, role } = req.user;

  // Only admins can upload logos
  if (role !== "admin") {
    res.status(403);
    throw new Error("Access denied - admin privileges required");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const company = await Company.findById(companyId);

  if (!company) {
    res.status(404);
    throw new Error("Company not found");
  }

  try {
    const previousLogoKey = company.logoPublicId || null;

    // Upload to S3 using backend SDK
    const logoKeyName = `${String(companyId)}${getLogoExtension(req.file)}`;
    const { url, key } = await uploadToS3(req.file.buffer, {
      folder: "survey-app/logos/company",
      publicId: logoKeyName,
      contentType: req.file.mimetype,
    });

    // Update company with S3 URL
    company.logo = url;
    company.logoPublicId = key;
    await company.save();

    // Best-effort cleanup of previous logo after successful replacement.
    if (previousLogoKey && previousLogoKey !== key) {
      try {
        await deleteFromS3(previousLogoKey);
      } catch (error) {
        logger.warn(`[COMPANY] Failed to delete old logo key: ${previousLogoKey}`);
      }
    }

    sendResponse(res, {
      data: {
        logo: url,
        publicId: key,
      },
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    // Preserve explicit status from mapped upload errors.
    if (error?.statusCode) {
      res.status(error.statusCode);
      throw error;
    }

    // Handle S3 configuration errors gracefully
    if (error.message.includes("AWS S3 is not configured")) {
      res.status(503);
      throw new Error(
        "File upload service is not configured. Please contact administrator."
      );
    }
    throw error;
  }
});

// @desc    Delete company logo
// @route   DELETE /api/company/logo
// @access  Private - Admin only
export const deleteLogo = asyncHandler(async (req, res) => {
  const { companyId, role } = req.user;

  // Only admins can delete logos
  if (role !== "admin") {
    res.status(403);
    throw new Error("Access denied - admin privileges required");
  }

  const company = await Company.findById(companyId);

  if (!company) {
    res.status(404);
    throw new Error("Company not found");
  }

  if (!company.logo) {
    res.status(400);
    throw new Error("No logo to delete");
  }

  // Use the same S3 utility path as uploads to avoid config drift.
  if (company.logoPublicId) {
    try {
      await deleteFromS3(company.logoPublicId);
    } catch (error) {
      logger.warn(`[COMPANY] Failed to delete logo key: ${company.logoPublicId}`);
    }
  }

  company.logo = "";
  company.logoPublicId = null;
  await company.save();

  sendResponse(res, {
    data: company,
    message: "Logo deleted successfully",
  });
});

// @desc    Serve company logo file
// @route   GET /api/company/logo/:filename
// @access  Public
export const serveLogo = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const logoPath = path.join(process.cwd(), "uploads", "logos", filename);

  try {
    await fs.access(logoPath);
    res.sendFile(logoPath);
  } catch (error) {
    res.status(404);
    throw new Error("Logo file not found");
  }
});
