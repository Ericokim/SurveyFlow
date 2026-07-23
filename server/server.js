import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import colors from "colors";
import http from "http";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { createRequestIdMiddleware } from "./middleware/utilityMiddleware.js";
import { logger } from "./utils/logger.js";
import apiRoutes from "./routes/index.js";
import { apiReference } from "@scalar/express-api-reference";
import { openapiSpec } from "./docs/openapi.js";

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ quiet: true });
}

const port = process.env.PORT || 5001;
const nodeEnv = process.env.NODE_ENV || "development";

// Optional SMS configuration warning
if (!process.env.SMS_API_KEY || !process.env.SMS_USERNAME) {
  logger.warn(
    "SMS configuration not found. SMS functionality will be disabled.",
  );
}

const app = express();

// Trust first proxy
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Compression middleware
app.use(compression());

// Request logging
if (nodeEnv === "development") {
  app.use(morgan("dev", { stream: logger.stream }));
} else {
  app.use(morgan("combined", { stream: logger.stream }));
}

// Request ID middleware for traceability
app.use(createRequestIdMiddleware());

// CORS configuration
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// // Rate limiting - General API protection
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
//   legacyHeaders: false, // Disable `X-RateLimit-*` headers
//   message: "Too many requests from this IP, please try again later.",
// });

// // Apply general rate limiting to all routes
// app.use(generalLimiter);

// The Scalar reference is rendered client-side from a CDN bundle plus an inline
// bootstrap script, both of which the global helmet CSP would block. Relax the
// policy for the documentation routes only — the API itself keeps the defaults.
const docsSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Machine-readable contract.
app.get("/openapi.json", docsSecurity, (req, res) => {
  res.json(openapiSpec);
});

// Human-readable reference at the API root.
// Registered with `app.get` rather than `app.use` — the Scalar handler answers
// every request it receives, so mounting it as middleware would swallow /api.
app.get(
  "/",
  docsSecurity,
  apiReference({
    url: "/openapi.json",
    pageTitle: "SurveyFlow API Reference",
  })
);

// Use centralized API routes
app.use("/api", apiRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Handle server errors
server.on("error", (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  switch (error.code) {
    case "EACCES":
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed.");
    logger.info("Graceful shutdown completed.".green.bold);
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:".red.bold, promise);
  logger.error("Reason:", reason);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:".red.bold, error);
  process.exit(1);
});

// Start the server
server.listen(port, () => {
  logger.info(`Server running in ${nodeEnv} mode on port ${port}`.green.bold);

  // Connect to database
  connectDB();
});
