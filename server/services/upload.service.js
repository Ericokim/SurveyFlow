/**
 * Upload Service - Handle file uploads for logos using AWS S3
 *
 * Simplified to use AWS S3 SDK for all uploads.
 * Multer still used for initial file handling, then uploaded to S3.
 *
 * @fileoverview Upload service for SurveyFlow
 * @author SurveyFlow Team
 */
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import {
  uploadToS3,
  deleteFromS3,
} from "../utils/s3.js";

/**
 * Create multer storage configuration for temporary file storage
 * Files are temporarily stored locally, then uploaded to S3
 */
const tempStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "temp");

    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for image uploads
 */
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image files (JPEG, PNG, GIF, SVG, WebP) are allowed"),
      false
    );
  }
};

/**
 * Create multer upload configuration for surveys
 */
export const createSurveyUpload = () => {
  return multer({
    storage: tempStorage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 1,
    },
  });
};

/**
 * Delete a logo from S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteLogo = async (key) => {
  if (!key) return false;

  try {
    await deleteFromS3(key);
    return true;
  } catch (error) {
    console.log(`Failed to delete logo: ${key}`, error.message);
    return false;
  }
};

/**
 * Validate file before processing
 */
export const validateUploadFile = (file) => {
  const errors = [];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!file) {
    errors.push({
      field: "file",
      message: "No file provided",
    });
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push({
      field: "file",
      message: `File size too large. Maximum size is 5MB`,
    });
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push({
      field: "file",
      message:
        "Invalid file type. Only JPEG, PNG, GIF, SVG, and WebP images are allowed",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Removed unused legacy functions (logoExists, generateLogoUrl, createLogoStorage)
// All uploads now go through AWS S3
