export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(`AI Service Error: ${message}`, 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(`Database Error: ${message}`, 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string) {
    super(`File Processing Error: ${message}`, 422);
  }
}
