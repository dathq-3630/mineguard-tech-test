import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");
export const db = new Database(dbPath);

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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qa_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
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
  created_at: string;
};

export type QAMessageRecord = {
  id: number;
  document_id: number;
  question: string;
  answer: string;
  created_at: string;
};


