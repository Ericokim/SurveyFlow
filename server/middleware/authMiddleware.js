/**
 * Authentication Middleware
 *
 * Handles JWT token verification and user authentication.
 *
 * @fileoverview Authentication middleware for SurveyFlow API
 * @author SurveyFlow Team
 */
import jwt from "jsonwebtoken";
import { asyncHandler } from "./utilityMiddleware.js";
import User from "../models/user.models.js";

/**
 * Protect routes - require authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id)
        .select("-passwordHash")
        .populate("companyId", "name");

      if (!user) {
        res.status(401);
        throw new Error("User not found");
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401);
        throw new Error("User account is inactive");
      }

      // Add user to request object
      req.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId._id,
        companyName: user.companyId.name,
      };

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);

      // Handle specific JWT errors
      if (error.name === "JsonWebTokenError") {
        res.status(401);
        throw new Error("Invalid token");
      } else if (error.name === "TokenExpiredError") {
        res.status(401);
        throw new Error("Token expired");
      }

      // Re-throw other errors (including our custom ones)
      throw error;
    }
  } else {
    res.status(401);
    throw new Error("No token provided");
  }
});

/**
 * Authorize user roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Access denied - authentication required");
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Access denied - insufficient permissions");
    }

    next();
  };
};


/**
 * Optional authentication - sets user if token is provided but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id)
        .select("-passwordHash")
        .populate("companyId", "name");

      if (user && user.isActive) {
        // Add user to request object
        req.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId._id,
          companyName: user.companyId.name,
        };
      }
    } catch (error) {
      // Silently ignore authentication errors for optional auth
      console.log("Optional auth failed:", error.message);
    }
  }

  next();
});
