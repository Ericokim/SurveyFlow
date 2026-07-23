import { randomUUID } from "crypto";

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {}).join(", ");
    message = fields
      ? `Duplicate value for: ${fields}`
      : "Duplicate value detected";
  }

  // NOTE: checking for invalid ObjectId moved to it's own middleware
  // See README for further info.

  // Use standardized response format matching response.js utilities
  const errorId = req?.id || randomUUID();

  res.status(statusCode).json({
    status: {
      code: statusCode,
      message: message,
    },
    data: null,
    paging: null,
    errorId,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

export { notFound, errorHandler };
