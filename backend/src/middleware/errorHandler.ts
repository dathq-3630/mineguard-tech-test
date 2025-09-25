import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { config } from "../config/index";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal Server Error";
  let isOperational = false;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // Log error details
  logger.error(
    "Request error",
    {
      method: req.method,
      url: req.url,
      statusCode,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    },
    error
  );

  // Don't expose internal error details in production
  if (!isOperational && config.NODE_ENV === "production") {
    message = "Something went wrong";
  }

  res.status(statusCode).json({
    error: message,
    ...(config.NODE_ENV === "development" && {
      stack: error.stack,
      details: error.message,
    }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
}
