import { db, type DocumentRecord } from "../db";
import { logger } from "../utils/logger";
import { DatabaseError, ValidationError } from "../utils/errors";

export type CreateDocumentInput = {
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  text_content?: string | null;
  summary?: string | null;
  key_points?: string[] | null;
};

export function createDocument(input: CreateDocumentInput): number {
  // Validate input
  if (!input.filename?.trim()) {
    throw new ValidationError("Filename is required");
  }
  if (!input.original_name?.trim()) {
    throw new ValidationError("Original name is required");
  }
  if (!input.mime_type?.trim()) {
    throw new ValidationError("MIME type is required");
  }
  if (typeof input.size_bytes !== "number" || input.size_bytes < 0) {
    throw new ValidationError("Valid size in bytes is required");
  }

  try {
    const stmt = db.prepare(
      `INSERT INTO documents (filename, original_name, mime_type, size_bytes, text_content, summary, key_points)
       VALUES (@filename, @original_name, @mime_type, @size_bytes, @text_content, @summary, @key_points)`
    );

    const info = stmt.run({
      filename: input.filename,
      original_name: input.original_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      text_content: input.text_content ?? null,
      summary: input.summary ?? null,
      key_points: input.key_points ? JSON.stringify(input.key_points) : null,
    });

    const documentId = Number(info.lastInsertRowid);

    logger.info("Document created", {
      documentId,
      originalName: input.original_name,
      sizeBytes: input.size_bytes,
    });

    return documentId;
  } catch (error) {
    logger.error("Failed to create document", { input }, error as Error);
    throw new DatabaseError("Failed to create document", error as Error);
  }
}

export function listDocuments(): Array<
  Pick<
    DocumentRecord,
    | "id"
    | "original_name"
    | "mime_type"
    | "size_bytes"
    | "summary"
    | "processing_status"
    | "created_at"
  >
> {
  try {
    const rows = db
      .prepare(
        `SELECT id, original_name, mime_type, size_bytes, summary, processing_status, created_at 
         FROM documents 
         WHERE deleted_at IS NULL 
         ORDER BY created_at DESC`
      )
      .all();

    logger.debug("Documents listed", { count: rows.length });
    return rows as Array<
      Pick<
        DocumentRecord,
        | "id"
        | "original_name"
        | "mime_type"
        | "size_bytes"
        | "summary"
        | "processing_status"
        | "created_at"
      >
    >;
  } catch (error) {
    logger.error("Failed to list documents", {}, error as Error);
    throw new DatabaseError("Failed to list documents", error as Error);
  }
}

export function getDocumentById(id: number): DocumentRecord | undefined {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Valid document ID is required");
  }

  try {
    const row = db
      .prepare(`SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL`)
      .get(id) as any;
    if (!row) {
      logger.debug("Document not found", { id });
      return undefined;
    }

    // Parse key_points if it exists
    if (row.key_points) {
      try {
        row.key_points = JSON.parse(row.key_points);
      } catch (parseError) {
        logger.warn("Failed to parse key_points JSON", {
          id,
          keyPoints: row.key_points,
        });
        // keep as string if parsing fails
      }
    }

    logger.debug("Document retrieved", { id, originalName: row.original_name });
    return row as DocumentRecord;
  } catch (error) {
    logger.error("Failed to get document by ID", { id }, error as Error);
    throw new DatabaseError("Failed to retrieve document", error as Error);
  }
}

export function updateDocumentStatus(
  id: number,
  status: "uploaded" | "processing" | "completed" | "failed"
): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Valid document ID is required");
  }

  try {
    const stmt = db.prepare(
      `UPDATE documents SET processing_status = ? WHERE id = ?`
    );

    const info = stmt.run(status, id);

    if (info.changes === 0) {
      logger.warn("No document updated - ID not found", { id });
      throw new ValidationError("Document not found");
    }

    logger.info("Document status updated", { id, status });
  } catch (error) {
    logger.error(
      "Failed to update document status",
      { id, status },
      error as Error
    );
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update document status", error as Error);
  }
}

export function updateDocumentAnalysis(
  id: number,
  summary: string,
  keyPoints: string[]
): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Valid document ID is required");
  }
  if (!summary?.trim()) {
    throw new ValidationError("Summary is required");
  }
  if (!Array.isArray(keyPoints)) {
    throw new ValidationError("Key points must be an array");
  }

  try {
    const stmt = db.prepare(
      `UPDATE documents SET summary = ?, key_points = ?, processing_status = 'completed' WHERE id = ?`
    );

    const info = stmt.run(summary, JSON.stringify(keyPoints), id);

    if (info.changes === 0) {
      logger.warn("No document updated - ID not found", { id });
      throw new ValidationError("Document not found");
    }

    logger.info("Document analysis updated", {
      id,
      summaryLength: summary.length,
      keyPointsCount: keyPoints.length,
    });
  } catch (error) {
    logger.error(
      "Failed to update document analysis",
      { id, summaryLength: summary.length },
      error as Error
    );
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(
      "Failed to update document analysis",
      error as Error
    );
  }
}

// saveQAMessage removed - now using conversation system

// findCachedAnswer removed - now using conversation history for caching

// listQAMessages removed - now using listConversations(documentId) and getConversationHistory()

// Conversation Management Functions
export function createConversation(
  conversationId: string,
  documentId?: number
): void {
  if (!conversationId?.trim()) {
    throw new ValidationError("Conversation ID is required");
  }

  try {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO conversations (conversation_id, document_id) VALUES (?, ?)`
    );

    stmt.run(conversationId, documentId || null);

    logger.info("Conversation created", { conversationId, documentId });
  } catch (error) {
    logger.error(
      "Failed to create conversation",
      { conversationId, documentId },
      error as Error
    );
    throw new DatabaseError("Failed to create conversation", error as Error);
  }
}

export function saveConversationMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): number {
  if (!conversationId?.trim()) {
    throw new ValidationError("Conversation ID is required");
  }
  if (!role || !["user", "assistant"].includes(role)) {
    throw new ValidationError("Valid role is required (user or assistant)");
  }
  if (!content?.trim()) {
    throw new ValidationError("Message content is required");
  }

  try {
    const stmt = db.prepare(
      `INSERT INTO conversation_messages (conversation_id, role, content) VALUES (?, ?, ?)`
    );

    const info = stmt.run(conversationId, role, content);
    const messageId = Number(info.lastInsertRowid);

    // Update conversation timestamp
    db.prepare(
      `UPDATE conversations SET updated_at = datetime('now') WHERE conversation_id = ?`
    ).run(conversationId);

    logger.info("Conversation message saved", {
      messageId,
      conversationId,
      role,
      contentLength: content.length,
    });

    return messageId;
  } catch (error) {
    logger.error(
      "Failed to save conversation message",
      {
        conversationId,
        role,
        contentLength: content.length,
      },
      error as Error
    );
    throw new DatabaseError(
      "Failed to save conversation message",
      error as Error
    );
  }
}

export function getConversationHistory(
  conversationId: string,
  limit: number = 50
): Array<{ role: "user" | "assistant"; content: string; created_at: string }> {
  if (!conversationId?.trim()) {
    throw new ValidationError("Conversation ID is required");
  }

  try {
    const messages = db
      .prepare(
        `SELECT role, content, created_at 
         FROM conversation_messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC 
         LIMIT ?`
      )
      .all(conversationId, limit) as Array<{
      role: "user" | "assistant";
      content: string;
      created_at: string;
    }>;

    logger.debug("Conversation history retrieved", {
      conversationId,
      count: messages.length,
    });

    return messages;
  } catch (error) {
    logger.error(
      "Failed to get conversation history",
      { conversationId },
      error as Error
    );
    throw new DatabaseError(
      "Failed to get conversation history",
      error as Error
    );
  }
}

export function listConversations(
  documentId?: number,
  limit: number = 20
): Array<{
  conversation_id: string;
  document_id: number | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}> {
  try {
    const whereClause = documentId ? "WHERE c.document_id = ?" : "";
    const params = documentId ? [documentId, limit] : [limit];

    const conversations = db
      .prepare(
        `SELECT 
           c.conversation_id,
           c.document_id,
           c.created_at,
           c.updated_at,
           COUNT(cm.id) as message_count
         FROM conversations c
         LEFT JOIN conversation_messages cm ON c.conversation_id = cm.conversation_id
         ${whereClause}
         GROUP BY c.conversation_id
         ORDER BY c.updated_at DESC
         LIMIT ?`
      )
      .all(...params) as Array<{
      conversation_id: string;
      document_id: number | null;
      created_at: string;
      updated_at: string;
      message_count: number;
    }>;

    logger.debug("Conversations listed", {
      documentId,
      count: conversations.length,
    });

    return conversations;
  } catch (error) {
    logger.error(
      "Failed to list conversations",
      { documentId },
      error as Error
    );
    throw new DatabaseError("Failed to list conversations", error as Error);
  }
}

export function softDeleteDocument(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Valid document ID is required");
  }

  try {
    const stmt = db.prepare(
      `UPDATE documents SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
    );

    const info = stmt.run(id);

    if (info.changes === 0) {
      logger.warn(
        "No document soft-deleted - ID not found or already deleted",
        { id }
      );
      throw new ValidationError("Document not found or already deleted");
    }

    logger.info("Document soft-deleted", { id });
  } catch (error) {
    logger.error("Failed to soft delete document", { id }, error as Error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to soft delete document", error as Error);
  }
}
