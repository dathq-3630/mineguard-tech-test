import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { config } from "./config/index.ts";
import { logger } from "./utils/logger.ts";

const dbPath = path.resolve(config.DATABASE_PATH);
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info("Database directory created", { dataDir });
}

export const db = new Database(dbPath);
logger.info("Database initialized", { dbPath });

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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
