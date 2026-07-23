/**
 * Main Routes Index
 *
 * Centralizes all route imports and exports for the SurveyFlow API.
 *
 * @fileoverview Main routes index for SurveyFlow API
 * @author SurveyFlow Team
 */
import express from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth.routes.js";
import surveyRoutes from "./surveys.routes.js";
import recipientRoutes from "./recipients.routes.js";
import responseRoutes from "./responses.routes.js";
import distributionRoutes from "./distribution.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import companyRoutes from "./company.routes.js";
import { getS3Status } from "../utils/s3.js";

const router = express.Router();

// Stricter rate limiting for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts, please try again later.",
});

// API index. The human-readable reference now lives at the server root, so this
// keeps a machine-readable welcome payload available for clients probing /api.
router.get("/", (req, res) => {
  res.json({
    status: {
      code: 200,
      message: "Welcome to the Universal Survey CMS API",
    },
    data: [
      {
        name: "SurveyFlow API",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        documentation: "/",
        openapi: "/openapi.json",
      },
    ],
    paging: null,
  });
});

// API health check with service status
router.get("/health", (req, res) => {
  const s3Status = getS3Status();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    services: {
      s3: s3Status,
      database: {
        status: "connected",
      },
    },
  });
});

// Mount routes
router.use("/auth", authLimiter, authRoutes);
router.use("/company", companyRoutes);

// Public response routes under /r prefix (matches frontend /r/:publicId pattern)
router.use("/r", responseRoutes);
// Admin response routes (mounted at /admin to avoid clashing with /surveys)
router.use("/admin", responseRoutes);

// Protected survey routes (admin - requires auth)
router.use("/surveys", surveyRoutes);

// Survey-specific nested routes (admin - use survey ID)
router.use("/surveys/:id/recipients", recipientRoutes);
router.use("/surveys/:id/sms", distributionRoutes);
router.use("/surveys/:id/analytics", analyticsRoutes);
router.use("/surveys/:id/export", analyticsRoutes);

export default router;
