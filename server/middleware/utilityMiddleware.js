import { v4 as uuidv4 } from 'uuid';
import { isValidObjectId } from 'mongoose';

/**
 * Async handler for wrapping async functions and catching errors
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Middleware for adding unique request ID to each request for traceability
 */
const createRequestIdMiddleware = () => {
  return (req, res, next) => {
    const requestId = uuidv4();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  };
};

/**
 * Checks if the req.params.id is a valid Mongoose ObjectId.
 * If invalid, skips to next matching route (allows public routes to handle UUIDs).
 */
const checkObjectId = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return next('route');
  }
  next();
};

export { asyncHandler, createRequestIdMiddleware, checkObjectId };
