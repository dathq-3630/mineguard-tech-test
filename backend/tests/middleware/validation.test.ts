import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../src/middleware/validation";
import { ValidationError } from "../../src/utils/errors";

describe("Validation Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe("validateBody", () => {
    const userSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive(),
    });

    it("should validate valid body data", () => {
      mockReq.body = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };

      const middleware = validateBody(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      });
    });

    it("should call next with ValidationError for invalid body data", () => {
      mockReq.body = {
        name: "",
        email: "invalid-email",
        age: -5,
      };

      const middleware = validateBody(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Validation failed"),
        })
      );
    });

    it("should handle missing required fields", () => {
      mockReq.body = {
        name: "John Doe",
        // email and age missing
      };

      const middleware = validateBody(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it("should handle extra fields", () => {
      mockReq.body = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
        extraField: "should be ignored",
      };

      const middleware = validateBody(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      });
    });

    it("should handle type coercion", () => {
      const schema = z.object({
        id: z.coerce.number(),
        isActive: z.coerce.boolean(),
      });

      mockReq.body = {
        id: "123", // string that should be coerced to number
        isActive: "true", // string that should be coerced to boolean
      };

      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        id: 123,
        isActive: true,
      });
    });
  });

  describe("validateParams", () => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
      type: z.string().min(1),
    });

    it("should validate valid params", () => {
      mockReq.params = {
        id: "123",
        type: "document",
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).params).toEqual({
        id: 123,
        type: "document",
      });
    });

    it("should call next with ValidationError for invalid params", () => {
      mockReq.params = {
        id: "invalid",
        type: "",
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Parameter validation failed"),
        })
      );
    });

    it("should handle missing required params", () => {
      mockReq.params = {
        id: "123",
        // type missing
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it("should handle negative numbers", () => {
      mockReq.params = {
        id: "-1",
        type: "document",
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe("validateQuery", () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().optional(),
      active: z.coerce.boolean().optional(),
    });

    it("should validate valid query parameters", () => {
      mockReq.query = {
        page: "1",
        limit: "10",
        search: "test",
        active: "true",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).query).toEqual({
        page: 1,
        limit: 10,
        search: "test",
        active: true,
      });
    });

    it("should handle optional parameters", () => {
      mockReq.query = {
        search: "test",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).query).toEqual({
        search: "test",
      });
    });

    it("should call next with ValidationError for invalid query parameters", () => {
      mockReq.query = {
        page: "invalid",
        limit: "1000", // exceeds max
        search: "test",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Query validation failed"),
        })
      );
    });

    it("should handle empty query object", () => {
      mockReq.query = {};

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).query).toEqual({});
    });

    it("should handle boolean coercion", () => {
      mockReq.query = {
        active: "false",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).query).toEqual({
        active: true, // 'false' string is truthy in JavaScript
      });
    });
  });

  describe("Error handling", () => {
    it("should pass through non-ZodError exceptions", () => {
      const schema = z.object({
        name: z.string(),
      });

      // Mock a non-ZodError exception
      const originalParse = schema.parse;
      schema.parse = jest.fn().mockImplementation(() => {
        throw new Error("Non-ZodError exception");
      });

      mockReq.body = { name: "test" };

      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Non-ZodError exception",
        })
      );

      // Restore original method
      schema.parse = originalParse;
    });

    it("should format multiple validation errors correctly", () => {
      const schema = z.object({
        name: z.string().min(5),
        email: z.string().email(),
        age: z.number().min(18),
      });

      mockReq.body = {
        name: "ab", // too short
        email: "invalid", // invalid email
        age: 15, // too young
      };

      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("Validation failed");
      expect(error.message).toContain("name");
      expect(error.message).toContain("email");
      expect(error.message).toContain("age");
    });
  });
});
