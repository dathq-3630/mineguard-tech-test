import type { Request, Response, NextFunction } from "express";
import { z, ZodError, type ZodIssue, type ZodTypeAny } from "zod";
import { ValidationError } from "../utils/errors.ts";

export function validateBody<T>(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err: ZodIssue) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        next(new ValidationError(`Validation failed: ${errorMessages}`));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams<T>(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      (req as any).params = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err: ZodIssue) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        next(
          new ValidationError(`Parameter validation failed: ${errorMessages}`)
        );
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      (req as any).query = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err: ZodIssue) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        next(new ValidationError(`Query validation failed: ${errorMessages}`));
      } else {
        next(error);
      }
    }
  };
}
