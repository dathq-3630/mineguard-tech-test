import { Request, Response, NextFunction } from "express";
import {
  errorHandler,
  notFoundHandler,
} from "../../src/middleware/errorHandler";
import {
  ValidationError,
  DatabaseError,
  AppError,
  NotFoundError,
} from "../../src/utils/errors";

describe("Error Handler Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: "GET",
      url: "/test",
      headers: {},
      get: jest.fn().mockReturnValue("Mozilla/5.0 (Test Browser)"),
      ip: "127.0.0.1",
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("errorHandler", () => {
    it("should handle ValidationError with 400 status", () => {
      const error = new ValidationError("Invalid input data");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid input data",
      });
    });

    it("should handle DatabaseError with 500 status", () => {
      const originalError = new Error("Database connection failed");
      const error = new DatabaseError(
        "Database operation failed",
        originalError
      );

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Database Error: Database operation failed",
      });
    });

    it("should handle NotFoundError with 404 status", () => {
      const error = new NotFoundError("Resource not found");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Resource not found",
      });
    });

    it("should handle generic AppError with 500 status", () => {
      const error = new AppError("Something went wrong", 500);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Something went wrong",
      });
    });

    it("should handle generic Error with 500 status", () => {
      const error = new Error("Unexpected error");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
      });
    });

    it("should handle unknown error types", () => {
      const error = "String error" as any;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
      });
    });

    it("should handle errors without message", () => {
      const error = new Error();

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
      });
    });

    it("should include request information in development", () => {
      const error = new ValidationError("Test error");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Test error",
      });
    });

    it("should not include stack trace in production", () => {
      process.env.NODE_ENV = "production";
      const error = new ValidationError("Test error");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it("should handle errors with custom status codes", () => {
      const error = new AppError("Custom error", 422);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Custom error",
      });
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 for any request", () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Route not found",
        method: "GET",
        path: undefined,
      });
    });

    it("should include request information in development", () => {
      process.env.NODE_ENV = "development";

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Route not found",
          method: "GET",
          path: undefined,
        })
      );
    });

    it("should not include request information in production", () => {
      process.env.NODE_ENV = "production";

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          request: expect.any(Object),
        })
      );
    });
  });

  describe("Error inheritance", () => {
    it("should handle ValidationError as AppError", () => {
      const error = new ValidationError("Test validation error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
      expect(error.name).toBe("Error");
    });

    it("should handle DatabaseError as AppError", () => {
      const originalError = new Error("Original error");
      const error = new DatabaseError("Test database error", originalError);

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof DatabaseError).toBe(true);
      expect(error.name).toBe("Error");
    });

    it("should handle NotFoundError as AppError", () => {
      const error = new NotFoundError("Test not found error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
      expect(error.name).toBe("Error");
    });
  });

  describe("Error message formatting", () => {
    it("should preserve original error message", () => {
      const error = new ValidationError("Custom validation message");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Custom validation message",
        })
      );
    });

    it("should handle errors with empty messages", () => {
      const error = new Error("");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal Server Error",
        })
      );
    });

    it("should handle errors with null messages", () => {
      const error = new Error();
      error.message = null as any;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal Server Error",
        })
      );
    });
  });
});
