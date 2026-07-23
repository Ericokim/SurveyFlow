/**
 * AWS S3 Utility
 * Server-side S3 integration using AWS SDK v3
 *
 * Optional S3 configuration - gracefully handles missing credentials
 * Falls back to local storage or error messages when S3 is not configured
 *
 * @fileoverview S3 upload utility for SurveyFlow backend
 * @author SurveyFlow Team
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import { logger } from "./logger.js";

const getS3PublicBaseUrl = () => {
  const customBase = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (customBase && customBase.trim() !== "") {
    return customBase.replace(/\/+$/, "");
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  // Shorter host for us-east-1 while remaining publicly readable.
  if (region === "us-east-1") {
    return `https://${bucket}.s3.amazonaws.com`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

const getFileExtension = (contentType = "") => {
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  };

  return map[String(contentType).toLowerCase()] || "";
};

/**
 * Check if S3 is properly configured
 * @returns {boolean} True if minimum S3 configuration is present
 */
const isS3Configured = () => {
  // At minimum, we need region and bucket name
  // Credentials can come from env vars OR AWS default profile
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET_NAME;

  return (
    region &&
    region.trim() !== "" &&
    !region.includes("your-") &&
    bucket &&
    bucket.trim() !== "" &&
    !bucket.includes("your-")
  );
};

/**
 * Check if explicit credentials are provided
 * @returns {boolean} True if both access key and secret are set
 */
const hasExplicitCredentials = () => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  return (
    accessKey &&
    accessKey.trim() !== "" &&
    !accessKey.includes("your-") &&
    secretKey &&
    secretKey.trim() !== "" &&
    !secretKey.includes("your-")
  );
};

// Only create S3 client if properly configured
let s3Client = null;

if (isS3Configured()) {
  try {
    const clientConfig = {
      region: process.env.AWS_REGION,
    };

    // Only add explicit credentials if provided
    // Otherwise, SDK will use default AWS profile or IAM role
    if (hasExplicitCredentials()) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
      logger.info(
        "[S3] Using explicit AWS credentials from environment variables"
      );
    } else {
      logger.info(
        "[S3] Using default AWS credential provider chain (profile, IAM role, etc.)"
      );
    }

    s3Client = new S3Client(clientConfig);
    logger.info("[S3] AWS S3 configured successfully");
  } catch (error) {
    logger.warn(`[S3] Failed to initialize S3 client: ${error.message}`);
    s3Client = null;
  }
} else {
  logger.warn("[S3] AWS S3 not configured. File uploads will be disabled.");
  logger.warn(
    "Required: AWS_REGION and AWS_S3_BUCKET_NAME. Optional: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (will use default AWS profile if not set)"
  );
}

/**
 * Upload file to S3
 *
 * @param {Buffer|string} file - File buffer or file path
 * @param {Object} options - Upload options
 * @param {string} options.folder - S3 folder path (default: 'survey-app/logos')
 * @param {string} options.publicId - Custom file name
 * @param {string} options.contentType - MIME type
 * @returns {Promise<{url: string, key: string, bucket: string}>}
 * @throws {Error} If upload fails
 */
export async function uploadToS3(file, options = {}) {
  // Check if S3 is configured
  if (!s3Client) {
    throw new Error(
      "AWS S3 is not configured. Please set up AWS credentials and bucket name in environment variables."
    );
  }

  const {
    folder = "survey-app/logos",
    publicId,
    contentType = "image/jpeg",
  } = options;

  const extension = getFileExtension(contentType);
  const normalizedPublicId =
    publicId && extension && !String(publicId).includes(".")
      ? `${publicId}${extension}`
      : publicId;

  const key = publicId
    ? `${folder}/${normalizedPublicId}`
    : `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const fileBody =
    typeof file === "string" ? await fs.readFile(file) : file;

  try {
    logger.info(`[S3] Starting upload to key: ${key}`);

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBody,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const url = `${getS3PublicBaseUrl()}/${key}`;

    logger.info(
      `[S3] Upload successful: ${JSON.stringify({
        key,
        url,
        bucket: process.env.AWS_S3_BUCKET_NAME,
      })}`
    );

    return {
      url,
      key,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      publicId: key, // For backward compatibility
    };
  } catch (error) {
    logger.error(
      `S3 upload error: ${JSON.stringify({
        message: error.message,
        code: error.code,
      })}`
    );
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
 *
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails
 */
export async function deleteFromS3(key) {
  if (!key) {
    logger.warn("[S3] No key provided for deletion");
    return;
  }

  // Check if S3 is configured
  if (!s3Client) {
    logger.warn("[S3] AWS S3 not configured, skipping deletion");
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const result = await s3Client.send(command);

    logger.info(`[S3] Deletion successful: ${JSON.stringify({ key })}`);
    return result;
  } catch (error) {
    logger.error(`S3 deletion error: ${error.message}`);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
}

/**
 * Generate S3 URL for a given key
 *
 * @param {string} key - S3 object key
 * @returns {string} S3 URL
 */
export function getS3Url(key) {
  if (!key) {
    throw new Error("S3 key is required to generate URL");
  }

  return `${getS3PublicBaseUrl()}/${key}`;
}

/**
 * Check if S3 is available and configured
 * @returns {boolean} True if S3 is ready for use
 */
export function isS3Available() {
  return s3Client !== null;
}

/**
 * Get S3 configuration status for debugging
 * @returns {object} Configuration status information
 */
export function getS3Status() {
  const configured = isS3Configured();
  const available = isS3Available();
  const explicitCreds = hasExplicitCredentials();

  return {
    configured,
    available,
    region: configured ? process.env.AWS_REGION : null,
    bucket: configured ? process.env.AWS_S3_BUCKET_NAME : null,
    credentialSource: configured
      ? explicitCreds
        ? "Environment variables"
        : "AWS default profile/IAM role"
      : null,
    message: configured
      ? available
        ? "S3 is ready"
        : "S3 configuration error"
      : "S3 not configured - file uploads disabled",
  };
}

// For backward compatibility, alias the main upload function
export const uploadToCloudinary = uploadToS3;
export const deleteFromCloudinary = deleteFromS3;
export const getOptimizedImageUrl = getS3Url;

export default s3Client;
