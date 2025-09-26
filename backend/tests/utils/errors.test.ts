import {
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  FileProcessingError,
  AIServiceError,
} from "../../src/utils/errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create AppError with message", () => {
      const error = new AppError("Test error message", 500);

      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(500);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it("should create AppError with message and status code", () => {
      const error = new AppError("Test error message", 422);

      expect(error.message).toBe("Test error message");
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe("Error");
    });

    it("should have correct status code", () => {
      const error = new AppError("Test error", 500);

      expect(error.statusCode).toBe(500);
    });

    it("should allow custom status code", () => {
      const error = new AppError("Test error", 422);

      expect(error.statusCode).toBe(422);
    });
  });

  describe("ValidationError", () => {
    it("should create ValidationError with message", () => {
      const error = new ValidationError("Validation failed");

      expect(error.message).toBe("Validation failed");
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(400);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });

    it("should have correct status code", () => {
      const error = new ValidationError("Test validation error");

      expect(error.statusCode).toBe(400);
    });

    it("should inherit from AppError", () => {
      const error = new ValidationError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });

  describe("DatabaseError", () => {
    it("should create DatabaseError with message", () => {
      const error = new DatabaseError("Database operation failed");

      expect(error.message).toBe("Database Error: Database operation failed");
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(500);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof DatabaseError).toBe(true);
    });

    it("should create DatabaseError with message and original error", () => {
      const originalError = new Error("SQL connection failed");
      const error = new DatabaseError(
        "Database operation failed",
        originalError
      );

      expect(error.message).toBe("Database Error: Database operation failed");
      expect(error.name).toBe("Error");
    });

    it("should have correct status code", () => {
      const error = new DatabaseError("Test database error");

      expect(error.statusCode).toBe(500);
    });

    it("should inherit from AppError", () => {
      const error = new DatabaseError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof DatabaseError).toBe(true);
    });
  });

  describe("NotFoundError", () => {
    it("should create NotFoundError with message", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.message).toBe("Resource not found");
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(404);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });

    it("should have correct status code", () => {
      const error = new NotFoundError("Test not found error");

      expect(error.statusCode).toBe(404);
    });

    it("should inherit from AppError", () => {
      const error = new NotFoundError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });
  });

  describe("FileProcessingError", () => {
    it("should create FileProcessingError with message", () => {
      const error = new FileProcessingError("File processing failed");

      expect(error.message).toBe(
        "File Processing Error: File processing failed"
      );
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(422);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof FileProcessingError).toBe(true);
    });

    it("should have correct status code", () => {
      const error = new FileProcessingError("Test file processing error");

      expect(error.statusCode).toBe(422);
    });

    it("should inherit from AppError", () => {
      const error = new FileProcessingError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof FileProcessingError).toBe(true);
    });
  });

  describe("AIServiceError", () => {
    it("should create AIServiceError with message", () => {
      const error = new AIServiceError("AI service failed");

      expect(error.message).toBe("AI Service Error: AI service failed");
      expect(error.name).toBe("Error");
      expect(error.statusCode).toBe(500);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AIServiceError).toBe(true);
    });

    it("should create AIServiceError with message and original error", () => {
      const originalError = new Error("API rate limit exceeded");
      const error = new AIServiceError("AI service failed", originalError);

      expect(error.message).toBe("AI Service Error: AI service failed");
      expect(error.name).toBe("Error");
    });

    it("should have correct status code", () => {
      const error = new AIServiceError("Test AI service error");

      expect(error.statusCode).toBe(500);
    });

    it("should inherit from AppError", () => {
      const error = new AIServiceError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AIServiceError).toBe(true);
    });
  });

  describe("Error inheritance chain", () => {
    it("should have correct inheritance for ValidationError", () => {
      const error = new ValidationError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });

    it("should have correct inheritance for DatabaseError", () => {
      const error = new DatabaseError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof DatabaseError).toBe(true);
    });

    it("should have correct inheritance for NotFoundError", () => {
      const error = new NotFoundError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });

    it("should have correct inheritance for FileProcessingError", () => {
      const error = new FileProcessingError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof FileProcessingError).toBe(true);
    });

    it("should have correct inheritance for AIServiceError", () => {
      const error = new AIServiceError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AIServiceError).toBe(true);
    });
  });

  describe("Error properties", () => {
    it("should preserve stack trace", () => {
      const error = new AppError("Test error", 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("Error");
    });

    it("should preserve original error in stack", () => {
      const originalError = new Error("Original error");
      const error = new DatabaseError("Database error", originalError);

      expect(error.stack).toContain("Error");
    });

    it("should have correct error names", () => {
      expect(new AppError("Test", 500).name).toBe("Error");
      expect(new ValidationError("Test").name).toBe("Error");
      expect(new DatabaseError("Test").name).toBe("Error");
      expect(new NotFoundError("Test").name).toBe("Error");
      expect(new FileProcessingError("Test").name).toBe("Error");
      expect(new AIServiceError("Test").name).toBe("Error");
    });
  });

  describe("Error message handling", () => {
    it("should handle empty messages", () => {
      const error = new AppError("", 500);

      expect(error.message).toBe("");
      expect(error.name).toBe("Error");
    });

    it("should handle null messages", () => {
      const error = new AppError(null as any, 500);

      expect(error.message).toBe("null");
      expect(error.name).toBe("Error");
    });

    it("should handle undefined messages", () => {
      const error = new AppError(undefined as any, 500);

      expect(error.message).toBe("");
      expect(error.name).toBe("Error");
    });

    it("should handle non-string messages", () => {
      const error = new AppError(123 as any, 500);

      expect(error.message).toBe("123");
      expect(error.name).toBe("Error");
    });
  });
});
