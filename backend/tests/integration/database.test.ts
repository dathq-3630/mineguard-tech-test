import Database from "better-sqlite3";

// Clear all mocks before importing
jest.clearAllMocks();
jest.resetModules();

// Mock the db module before importing anything that uses it
jest.mock("../../src/db", () => {
  const mockDb = new Database(":memory:");

  // Initialize schema
  mockDb.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      text_content TEXT,
      summary TEXT,
      key_points TEXT,
      processing_status TEXT NOT NULL DEFAULT 'uploaded',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL UNIQUE,
      document_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
    );
  `);

  return {
    db: mockDb,
  };
});

import { db } from "../../src/db";
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

describe("Database Integration Tests", () => {
  beforeEach(() => {
    // Clear all tables before each test
    db.exec("DELETE FROM conversation_messages");
    db.exec("DELETE FROM conversations");
    db.exec("DELETE FROM documents");
  });

  describe("Document Operations", () => {
    it("should create and retrieve document", () => {
      const documentInput: CreateDocumentInput = {
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
        summary: "Test summary",
        key_points: ["Point 1", "Point 2"],
      };

      const documentId = createDocument(documentInput);
      expect(documentId).toBe(1);

      const retrieved = getDocumentById(documentId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.original_name).toBe("Test Document.pdf");
      expect(retrieved?.key_points).toEqual(["Point 1", "Point 2"]);
    });

    it("should list documents excluding deleted ones", () => {
      // Create documents
      const doc1Id = createDocument({
        filename: "doc1.pdf",
        original_name: "Document 1.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Content 1",
      });

      const doc2Id = createDocument({
        filename: "doc2.pdf",
        original_name: "Document 2.pdf",
        mime_type: "application/pdf",
        size_bytes: 2048,
        text_content: "Content 2",
      });

      // Soft delete one document
      softDeleteDocument(doc1Id);

      const documents = listDocuments();
      expect(documents).toHaveLength(1);
      expect(documents[0].original_name).toBe("Document 2.pdf");
    });

    it("should update document status", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      updateDocumentStatus(documentId, "processing");

      const document = getDocumentById(documentId);
      expect(document?.processing_status).toBe("processing");
    });

    it("should update document analysis", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      const summary = "Updated summary";
      const keyPoints = ["Updated point 1", "Updated point 2"];

      updateDocumentAnalysis(documentId, summary, keyPoints);

      const document = getDocumentById(documentId);
      expect(document?.summary).toBe(summary);
      expect(document?.key_points).toEqual(keyPoints);
      expect(document?.processing_status).toBe("completed");
    });

    it("should handle soft delete", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      softDeleteDocument(documentId);

      const document = getDocumentById(documentId);
      expect(document).toBeUndefined();
    });
  });

  describe("Conversation Operations", () => {
    it("should create conversation", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      createConversation("conv-123", documentId);

      const conversations = listConversations(documentId);
      expect(conversations).toHaveLength(1);
      expect(conversations[0].conversation_id).toBe("conv-123");
      expect(conversations[0].document_id).toBe(documentId);
    });

    it("should save and retrieve conversation messages", () => {
      createConversation("conv-123");

      const messageId1 = saveConversationMessage("conv-123", "user", "Hello");
      const messageId2 = saveConversationMessage(
        "conv-123",
        "assistant",
        "Hi there"
      );

      expect(messageId1).toBe(1);
      expect(messageId2).toBe(2);

      const history = getConversationHistory("conv-123");
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        role: "user",
        content: "Hello",
        created_at: expect.any(String),
      });
      expect(history[1]).toEqual({
        role: "assistant",
        content: "Hi there",
        created_at: expect.any(String),
      });
    });

    it("should list conversations with message counts", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      createConversation("conv-1", documentId);
      createConversation("conv-2", documentId);

      saveConversationMessage("conv-1", "user", "Message 1");
      saveConversationMessage("conv-1", "assistant", "Response 1");
      saveConversationMessage("conv-2", "user", "Message 2");

      const conversations = listConversations(documentId);
      expect(conversations).toHaveLength(2);

      const conv1 = conversations.find((c) => c.conversation_id === "conv-1");
      const conv2 = conversations.find((c) => c.conversation_id === "conv-2");

      expect(conv1?.message_count).toBe(2);
      expect(conv2?.message_count).toBe(1);
    });

    it("should handle conversation without document", () => {
      createConversation("conv-standalone");

      const conversations = listConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].conversation_id).toBe("conv-standalone");
      expect(conversations[0].document_id).toBeNull();
    });
  });

  describe("Data Integrity", () => {
    it("should handle foreign key constraints", () => {
      // Create a document first, then create conversation
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      createConversation("conv-orphan", documentId);

      const conversations = listConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].document_id).toBe(documentId);
    });

    it("should handle cascade deletes", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
      });

      createConversation("conv-123", documentId);
      saveConversationMessage("conv-123", "user", "Message 1");
      saveConversationMessage("conv-123", "assistant", "Response 1");

      // Delete conversation should cascade to messages
      db.prepare("DELETE FROM conversations WHERE conversation_id = ?").run(
        "conv-123"
      );

      const history = getConversationHistory("conv-123");
      expect(history).toHaveLength(0);
    });

    it("should handle JSON serialization of key points", () => {
      const keyPoints = ["Point 1", "Point 2", "Point 3"];

      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: "Test content",
        key_points: keyPoints,
      });

      const document = getDocumentById(documentId);
      expect(document?.key_points).toEqual(keyPoints);
    });

    it("should handle null values correctly", () => {
      const documentId = createDocument({
        filename: "test.pdf",
        original_name: "Test Document.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        text_content: null,
        summary: null,
        key_points: null,
      });

      const document = getDocumentById(documentId);
      expect(document?.text_content).toBeNull();
      expect(document?.summary).toBeNull();
      expect(document?.key_points).toBeNull();
    });
  });

  describe("Performance", () => {
    it("should handle multiple documents efficiently", () => {
      const startTime = Date.now();

      // Create 100 documents
      for (let i = 0; i < 100; i++) {
        createDocument({
          filename: `doc${i}.pdf`,
          original_name: `Document ${i}.pdf`,
          mime_type: "application/pdf",
          size_bytes: 1024 + i,
          text_content: `Content ${i}`,
        });
      }

      const documents = listDocuments();
      expect(documents).toHaveLength(100);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should handle multiple conversation messages efficiently", () => {
      createConversation("conv-perf");

      const startTime = Date.now();

      // Create 1000 messages
      for (let i = 0; i < 1000; i++) {
        saveConversationMessage("conv-perf", "user", `Message ${i}`);
      }

      const history = getConversationHistory("conv-perf", 1000);
      expect(history).toHaveLength(1000);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe("Error Handling", () => {
    it("should handle database constraint violations", () => {
      // Try to create conversation with duplicate ID
      createConversation("conv-duplicate");

      // The function uses INSERT OR IGNORE, so it won't throw
      // Instead, let's test that the second call doesn't create a duplicate
      createConversation("conv-duplicate");

      const conversations = listConversations();
      const duplicateConvs = conversations.filter(
        (c) => c.conversation_id === "conv-duplicate"
      );
      expect(duplicateConvs).toHaveLength(1);
    });

    it("should handle invalid data types", () => {
      expect(() => {
        createDocument({
          filename: "test.pdf",
          original_name: "Test Document.pdf",
          mime_type: "application/pdf",
          size_bytes: "invalid" as any,
          text_content: "Test content",
        });
      }).toThrow();
    });

    it("should handle malformed JSON in key_points", () => {
      // Manually insert malformed JSON
      const result = db
        .prepare(
          `
        INSERT INTO documents (filename, original_name, mime_type, size_bytes, key_points)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run("test.pdf", "Test.pdf", "application/pdf", 1024, "invalid json");

      const document = getDocumentById(Number(result.lastInsertRowid));
      expect(document?.key_points).toBe("invalid json");
    });
  });
});
