import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config({ quiet: true });

/**
 * Connect to MongoDB
 * - Fast fail on startup
 * - Runtime visibility for disconnects & errors
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 12000,
    });

    logger.info("Database connected successfully".yellow.bold);
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`.red.bold);
    // Do NOT crash the process here (Render-friendly)
  }
};

/**
 * Runtime MongoDB monitoring
 * These listeners DO NOT change behavior — only visibility
 */

// Fired when Mongoose loses connection
mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

// Fired on runtime MongoDB errors (network issues, auth expiry, etc.)
mongoose.connection.on("error", (err) => {
  logger.error("MongoDB runtime error:", err.message);
});

// Fired when connection is re-established
mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

export default connectDB;
