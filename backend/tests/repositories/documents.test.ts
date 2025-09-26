import { Database } from "better-sqlite3";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocumentStatus,
  updateDocumentAnalysis,
  createConversation,
  saveConversationMessage,
  getConversationHistory,
  listConversations,
  softDeleteDocument,
  type CreateDocumentInput,
} from "../../src/repositories/documents";
import { ValidationError, DatabaseError } from "../../src/utils/errors";

// Mock the database
jest.mock("../../src/db", () => {
  const mockDb = {
    prepare: jest.fn(),
    exec: jest.fn(),
  };

  return {
    db: mockDb,
  };
});

import { db } from "../../src/db";

describe("Document Repository", () => {
  let mockStmt: any;
  let mockInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInfo = {
      lastInsertRowid: 1,
      changes: 1,
    };

    mockStmt = {
      run: jest.fn().mockReturnValue(mockInfo),
      get: jest.fn(),
      all: jest.fn(),
    };

    (db.prepare as jest.Mock).mockReturnValue(mockStmt);
  });

  describe("createDocument", () => {
    const validInput: CreateDocumentInput = {
      filename: "test.pdf",
      original_name: "Test Document.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      text_content: "Test content",
      summary: "Test summary",
      key_points: ["Point 1", "Point 2"],
    };

    it("should create a document with valid input", () => {
      const result = createDocument(validInput);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO documents")
      );
      expect(mockStmt.run).toHaveBeenCalledWith({
        filename: validInput.filename,
        original_name: validInput.original_name,
        mime_type: validInput.mime_type,
        size_bytes: validInput.size_bytes,
        text_content: validInput.text_content,
        summary: validInput.summary,
        key_points: JSON.stringify(validInput.key_points),
      });
      expect(result).toBe(1);
    });

    it("should throw ValidationError for missing filename", () => {
      const invalidInput = { ...validInput, filename: "" };

      expect(() => createDocument(invalidInput)).toThrow(ValidationError);
      expect(() => createDocument(invalidInput)).toThrow(
        "Filename is required"
      );
    });

    it("should throw ValidationError for missing original_name", () => {
      const invalidInput = { ...validInput, original_name: "" };

      expect(() => createDocument(invalidInput)).toThrow(ValidationError);
      expect(() => createDocument(invalidInput)).toThrow(
        "Original name is required"
      );
    });

    it("should throw ValidationError for missing mime_type", () => {
      const invalidInput = { ...validInput, mime_type: "" };

      expect(() => createDocument(invalidInput)).toThrow(ValidationError);
      expect(() => createDocument(invalidInput)).toThrow(
        "MIME type is required"
      );
    });

    it("should throw ValidationError for invalid size_bytes", () => {
      const invalidInput = { ...validInput, size_bytes: -1 };

      expect(() => createDocument(invalidInput)).toThrow(ValidationError);
      expect(() => createDocument(invalidInput)).toThrow(
        "Valid size in bytes is required"
      );
    });

    it("should handle null values correctly", () => {
      const inputWithNulls = {
        ...validInput,
        text_content: null,
        summary: null,
        key_points: null,
      };

      createDocument(inputWithNulls);

      expect(mockStmt.run).toHaveBeenCalledWith({
        filename: validInput.filename,
        original_name: validInput.original_name,
        mime_type: validInput.mime_type,
        size_bytes: validInput.size_bytes,
        text_content: null,
        summary: null,
        key_points: null,
      });
    });

    it("should throw DatabaseError on database failure", () => {
      const dbError = new Error("Database connection failed");
      mockStmt.run.mockImplementation(() => {
        throw dbError;
      });

      expect(() => createDocument(validInput)).toThrow(DatabaseError);
    });
  });

  describe("listDocuments", () => {
    it("should return list of documents", () => {
      const mockDocuments = [
        {
          id: 1,
          original_name: "Document 1.pdf",
          mime_type: "application/pdf",
          size_bytes: 1024,
          summary: "Summary 1",
          processing_status: "completed",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          original_name: "Document 2.pdf",
          mime_type: "application/pdf",
          size_bytes: 2048,
          summary: "Summary 2",
          processing_status: "processing",
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockStmt.all.mockReturnValue(mockDocuments);

      const result = listDocuments();

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT id, original_name, mime_type, size_bytes, summary, processing_status, created_at"
        )
      );
      expect(result).toEqual(mockDocuments);
    });

    it("should throw DatabaseError on database failure", () => {
      const dbError = new Error("Database query failed");
      mockStmt.all.mockImplementation(() => {
        throw dbError;
      });

      expect(() => listDocuments()).toThrow(DatabaseError);
    });
  });

  describe("getDocumentById", () => {
    it("should return document for valid ID", () => {
      const mockDocument = {
        id: 1,
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
        summary: "Test summary",
        key_points: '["Point 1", "Point 2"]',
        processing_status: "completed",
        created_at: "2024-01-01T00:00:00Z",
        deleted_at: null,
      };

      mockStmt.get.mockReturnValue(mockDocument);

      const result = getDocumentById(1);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL"
        )
      );
      expect(mockStmt.get).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        ...mockDocument,
        key_points: ["Point 1", "Point 2"],
      });
    });

    it("should return undefined for non-existent document", () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = getDocumentById(999);

      expect(result).toBeUndefined();
    });

    it("should throw ValidationError for invalid ID", () => {
      expect(() => getDocumentById(0)).toThrow(ValidationError);
      expect(() => getDocumentById(-1)).toThrow(ValidationError);
      expect(() => getDocumentById(1.5)).toThrow(ValidationError);
    });

    it("should handle invalid JSON in key_points", () => {
      const mockDocument = {
        id: 1,
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
        summary: "Test summary",
        key_points: "invalid json",
        processing_status: "completed",
        created_at: "2024-01-01T00:00:00Z",
        deleted_at: null,
      };

      mockStmt.get.mockReturnValue(mockDocument);

      const result = getDocumentById(1);

      expect(result?.key_points).toBe("invalid json");
    });

    it("should throw DatabaseError on database failure", () => {
      const dbError = new Error("Database query failed");
      mockStmt.get.mockImplementation(() => {
        throw dbError;
      });

      expect(() => getDocumentById(1)).toThrow(DatabaseError);
    });
  });

  describe("updateDocumentStatus", () => {
    it("should update document status successfully", () => {
      updateDocumentStatus(1, "processing");

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE documents SET processing_status = ? WHERE id = ?"
        )
      );
      expect(mockStmt.run).toHaveBeenCalledWith("processing", 1);
    });

    it("should throw ValidationError for invalid ID", () => {
      expect(() => updateDocumentStatus(0, "processing")).toThrow(
        ValidationError
      );
      expect(() => updateDocumentStatus(-1, "processing")).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError when no document is updated", () => {
      mockInfo.changes = 0;

      expect(() => updateDocumentStatus(999, "processing")).toThrow(
        ValidationError
      );
      expect(() => updateDocumentStatus(999, "processing")).toThrow(
        "Document not found"
      );
    });

    it("should throw DatabaseError on database failure", () => {
      const dbError = new Error("Database update failed");
      mockStmt.run.mockImplementation(() => {
        throw dbError;
      });

      expect(() => updateDocumentStatus(1, "processing")).toThrow(
        DatabaseError
      );
    });
  });

  describe("updateDocumentAnalysis", () => {
    it("should update document analysis successfully", () => {
      const summary = "Test summary";
      const keyPoints = ["Point 1", "Point 2"];

      updateDocumentAnalysis(1, summary, keyPoints);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE documents SET summary = ?, key_points = ?, processing_status = 'completed' WHERE id = ?"
        )
      );
      expect(mockStmt.run).toHaveBeenCalledWith(
        summary,
        JSON.stringify(keyPoints),
        1
      );
    });

    it("should throw ValidationError for invalid ID", () => {
      expect(() => updateDocumentAnalysis(0, "summary", ["point"])).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for empty summary", () => {
      expect(() => updateDocumentAnalysis(1, "", ["point"])).toThrow(
        ValidationError
      );
      expect(() => updateDocumentAnalysis(1, "   ", ["point"])).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for non-array key points", () => {
      expect(() =>
        updateDocumentAnalysis(1, "summary", "not an array" as any)
      ).toThrow(ValidationError);
    });

    it("should throw ValidationError when no document is updated", () => {
      mockInfo.changes = 0;

      expect(() => updateDocumentAnalysis(999, "summary", ["point"])).toThrow(
        ValidationError
      );
    });
  });

  describe("createConversation", () => {
    it("should create conversation successfully", () => {
      createConversation("conv-123", 1);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO conversations")
      );
      expect(mockStmt.run).toHaveBeenCalledWith("conv-123", 1);
    });

    it("should create conversation without document ID", () => {
      createConversation("conv-123");

      expect(mockStmt.run).toHaveBeenCalledWith("conv-123", null);
    });

    it("should throw ValidationError for empty conversation ID", () => {
      expect(() => createConversation("")).toThrow(ValidationError);
      expect(() => createConversation("   ")).toThrow(ValidationError);
    });
  });

  describe("saveConversationMessage", () => {
    it("should save conversation message successfully", () => {
      const result = saveConversationMessage("conv-123", "user", "Hello");

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO conversation_messages")
      );
      expect(mockStmt.run).toHaveBeenCalledWith("conv-123", "user", "Hello");
      expect(result).toBe(1);
    });

    it("should throw ValidationError for empty conversation ID", () => {
      expect(() => saveConversationMessage("", "user", "Hello")).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for invalid role", () => {
      expect(() =>
        saveConversationMessage("conv-123", "invalid" as any, "Hello")
      ).toThrow(ValidationError);
    });

    it("should throw ValidationError for empty content", () => {
      expect(() => saveConversationMessage("conv-123", "user", "")).toThrow(
        ValidationError
      );
    });
  });

  describe("getConversationHistory", () => {
    it("should return conversation history", () => {
      const mockMessages = [
        { role: "user", content: "Hello", created_at: "2024-01-01T00:00:00Z" },
        {
          role: "assistant",
          content: "Hi there",
          created_at: "2024-01-01T00:01:00Z",
        },
      ];

      mockStmt.all.mockReturnValue(mockMessages);

      const result = getConversationHistory("conv-123", 50);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT role, content, created_at")
      );
      expect(mockStmt.all).toHaveBeenCalledWith("conv-123", 50);
      expect(result).toEqual(mockMessages);
    });

    it("should use default limit when not provided", () => {
      mockStmt.all.mockReturnValue([]);

      getConversationHistory("conv-123");

      expect(mockStmt.all).toHaveBeenCalledWith("conv-123", 50);
    });

    it("should throw ValidationError for empty conversation ID", () => {
      expect(() => getConversationHistory("")).toThrow(ValidationError);
    });
  });

  describe("listConversations", () => {
    it("should return conversations without document filter", () => {
      const mockConversations = [
        {
          conversation_id: "conv-123",
          document_id: 1,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:01:00Z",
          message_count: 5,
        },
      ];

      mockStmt.all.mockReturnValue(mockConversations);

      const result = listConversations();

      expect(result).toEqual(mockConversations);
    });

    it("should return conversations with document filter", () => {
      const mockConversations = [
        {
          conversation_id: "conv-123",
          document_id: 1,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:01:00Z",
          message_count: 3,
        },
      ];

      mockStmt.all.mockReturnValue(mockConversations);

      const result = listConversations(1, 20);

      expect(result).toEqual(mockConversations);
    });
  });

  describe("softDeleteDocument", () => {
    it("should soft delete document successfully", () => {
      softDeleteDocument(1);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE documents SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
        )
      );
      expect(mockStmt.run).toHaveBeenCalledWith(1);
    });

    it("should throw ValidationError for invalid ID", () => {
      expect(() => softDeleteDocument(0)).toThrow(ValidationError);
      expect(() => softDeleteDocument(-1)).toThrow(ValidationError);
    });

    it("should throw ValidationError when no document is updated", () => {
      mockInfo.changes = 0;

      expect(() => softDeleteDocument(999)).toThrow(ValidationError);
      expect(() => softDeleteDocument(999)).toThrow(
        "Document not found or already deleted"
      );
    });
  });
});
