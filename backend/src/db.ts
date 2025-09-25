import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { config } from "./config/index";
import { logger } from "./utils/logger";

const dbPath = path.resolve(config.DATABASE_PATH);
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info("Database directory created", { dataDir });
}

export const db = new Database(dbPath);
logger.info("Database initialized", { dbPath });

// Check if deleted_at column exists and add it if it doesn't
try {
  const columns = db.prepare("PRAGMA table_info(documents)").all() as Array<{
    name: string;
  }>;
  const hasDeletedAt = columns.some((col) => col.name === "deleted_at");

  if (!hasDeletedAt) {
    db.exec("ALTER TABLE documents ADD COLUMN deleted_at TEXT");
    logger.info("Added deleted_at column to documents table");
  }
} catch (error) {
  logger.warn("Failed to check/add deleted_at column", {
    error: error instanceof Error ? error.message : String(error),
  });
}

// Initialize schema if not exists
db.exec(`
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

-- Add deleted_at column if it doesn't exist (for existing databases)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll handle this in the application

-- qa_messages table removed - now using conversation system

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

export type DocumentRecord = {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  text_content: string | null;
  summary: string | null;
  key_points: string | null; // JSON string array
  processing_status: "uploaded" | "processing" | "completed" | "failed";
  created_at: string;
  deleted_at: string | null;
};

// QAMessageRecord type removed - now using conversation system

export type ConversationRecord = {
  id: number;
  conversation_id: string;
  document_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMessageRecord = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
