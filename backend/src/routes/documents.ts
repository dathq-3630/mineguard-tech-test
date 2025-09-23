import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import pdf from "pdf-parse-new";
import { z } from "zod";
import {
  createDocument,
  getDocumentById,
  listDocuments,
  updateDocumentAnalysis,
  listQAMessages,
  saveQAMessage,
} from "../repositories/documents.ts";
import { generateSummaryAndKeyPoints, answerQuestion } from "../services/ai.ts";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

export const documentsRouter = Router();

documentsRouter.get("/", (_req, res) => {
  return res.json({ items: listDocuments() });
});

documentsRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const doc = getDocumentById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  return res.json(doc);
});

documentsRouter.get("/:id/qa", (req, res) => {
  const id = Number(req.params.id);
  const doc = getDocumentById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  return res.json({ messages: listQAMessages(id) });
});

documentsRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    if (!req.file.mimetype.includes("pdf"))
      return res.status(400).json({ error: "Only PDF supported" });
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdf(buffer);
    const text = String(parsed.text || "").trim();

    const docId = createDocument({
      filename: path.basename(req.file.path),
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      text_content: text,
    });

    (async () => {
      try {
        if (text) {
          const { summary, keyPoints } = await generateSummaryAndKeyPoints(
            text
          );
          updateDocumentAnalysis(docId, summary, keyPoints);
        }
      } catch {}
    })();

    return res.json({ id: docId });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Upload failed", detail: err?.message });
  }
});

const askSchema = z.object({ question: z.string().min(3) });
documentsRouter.post("/:id/ask", async (req, res) => {
  const id = Number(req.params.id);
  const parse = askSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid body" });
  const doc = getDocumentById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  const text = doc.text_content ?? "";
  try {
    const answer = await answerQuestion(text, parse.data.question);
    saveQAMessage(id, parse.data.question, answer);
    return res.json({ answer });
  } catch (err: any) {
    return res.status(500).json({ error: "QA failed", detail: err?.message });
  }
});
