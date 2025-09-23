import { db, type DocumentRecord, type QAMessageRecord } from "../db.ts";

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
  return Number(info.lastInsertRowid);
}

export function listDocuments(): Array<
  Pick<
    DocumentRecord,
    | "id"
    | "original_name"
    | "mime_type"
    | "size_bytes"
    | "summary"
    | "created_at"
  >
> {
  const rows = db
    .prepare(
      `SELECT id, original_name, mime_type, size_bytes, summary, created_at FROM documents ORDER BY created_at DESC`
    )
    .all();
  return rows as any;
}

export function getDocumentById(id: number): DocumentRecord | undefined {
  const row = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
  if (!row) return undefined;
  if (row.key_points) {
    try {
      row.key_points = JSON.parse(row.key_points);
    } catch {
      /* keep as string */
    }
  }
  return row as any;
}

export function updateDocumentAnalysis(
  id: number,
  summary: string,
  keyPoints: string[]
): void {
  db.prepare(
    `UPDATE documents SET summary = ?, key_points = ? WHERE id = ?`
  ).run(summary, JSON.stringify(keyPoints), id);
}

export function saveQAMessage(
  documentId: number,
  question: string,
  answer: string
): number {
  const info = db
    .prepare(
      `INSERT INTO qa_messages (document_id, question, answer) VALUES (?, ?, ?)`
    )
    .run(documentId, question, answer);
  return Number(info.lastInsertRowid);
}

export function listQAMessages(documentId: number): QAMessageRecord[] {
  return db
    .prepare(
      `SELECT * FROM qa_messages WHERE document_id = ? ORDER BY created_at ASC`
    )
    .all(documentId) as any;
}
