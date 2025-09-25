import express from "express";
const { Router } = express;
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
  updateDocumentStatus,
  createConversation,
  saveConversationMessage,
  getConversationHistory,
  listConversations,
  softDeleteDocument,
} from "../repositories/documents.ts";
import {
  generateSummaryAndKeyPoints,
  answerQuestion,
  handleChatbotMessage,
  compareDocuments,
} from "../services/ai.ts";
import { config, getModelPrice } from "../config/index.ts";
import { logger } from "../utils/logger.ts";
import {
  AppError,
  ValidationError,
  FileProcessingError,
  NotFoundError,
} from "../utils/errors.ts";
import { validateBody, validateParams } from "../middleware/validation.ts";

const uploadDir = path.resolve(config.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info("Upload directory created", { uploadDir });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Sanitize filename
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 100); // Limit filename length
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.includes("pdf")) {
      cb(new ValidationError("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Validation schemas
const documentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const askQuestionSchema = z.object({
  question: z.string().min(3).max(1000),
});

const chatbotMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  documentId: z.number().int().positive().optional(),
  conversationId: z.string().optional(),
});

const compareDocumentsSchema = z.object({
  document1Id: z.number().int().positive(),
  document2Id: z.number().int().positive(),
  comparisonType: z
    .enum(["gap_analysis", "similarity", "differences"])
    .default("gap_analysis"),
});

export const documentsRouter = Router();

// Mock upload: bypasses summarization and returns mock token/cost if MOCK_AI=1
documentsRouter.post(
  "/mock-upload",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      logger.info("Processing mock upload", {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      const buffer = fs.readFileSync(req.file.path);
      const parsed = await pdf(buffer);
      const text = String(parsed.text || "").trim();

      if (!text) {
        throw new FileProcessingError(
          "No text content could be extracted from PDF"
        );
      }

      const docId = createDocument({
        filename: path.basename(req.file.path),
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        text_content: text,
      });

      if (config.MOCK_AI) {
        // Rough input token estimate using the same helper in mock mode logic
        const approxCharsPerToken = 4;
        const inputTokens = Math.ceil(text.length / approxCharsPerToken);
        const outputTokens = 500; // pretend summary size
        const model = config.AI_SYNTHESIS_MODEL;

        // Use the config-based pricing
        const price = getModelPrice(model);
        const costUsd = price
          ? Number(
              (
                (inputTokens / 1_000_000) * price.input +
                (outputTokens / 1_000_000) * price.output
              ).toFixed(4)
            )
          : 0;

        logger.info("Mock upload completed", {
          docId,
          inputTokens,
          outputTokens,
          costUsd,
        });

        return res.json({
          id: docId,
          mock: true,
          usage: { model, inputTokens, outputTokens },
          costUsd,
        });
      }

      return res.json({ id: docId, mock: false });
    } catch (error) {
      logger.error("Mock upload failed", {
        originalName: req.file?.originalname,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

documentsRouter.get("/", async (_req, res, next) => {
  try {
    const items = listDocuments();
    logger.debug("Documents listed", { count: items.length });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// List conversations (must come BEFORE parameterized routes)
documentsRouter.get("/conversations", async (req, res, next) => {
  try {
    const documentId = req.query.documentId
      ? parseInt(req.query.documentId as string)
      : undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = listConversations(documentId, limit);

    logger.debug("Conversations listed", {
      documentId,
      count: conversations.length,
    });

    res.json({
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    logger.error("Failed to list conversations", {
      documentId: req.query.documentId,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
});

// Get conversation history
documentsRouter.get(
  "/conversations/:conversationId",
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = getConversationHistory(conversationId, limit);

      logger.debug("Conversation history retrieved", {
        conversationId,
        count: messages.length,
      });

      res.json({
        conversationId,
        messages,
        count: messages.length,
      });
    } catch (error) {
      logger.error("Failed to get conversation history", {
        conversationId: req.params.conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

documentsRouter.get(
  "/:id",
  validateParams(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const doc = getDocumentById(Number(id));

      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      logger.debug("Document retrieved", {
        id,
        originalName: doc.original_name,
      });
      res.json(doc);
    } catch (error) {
      next(error);
    }
  }
);

// Get document processing status
documentsRouter.get(
  "/:id/status",
  validateParams(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const doc = getDocumentById(Number(id));

      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      logger.debug("Document status retrieved", {
        id,
        status: doc.processing_status,
      });

      res.json({
        id: doc.id,
        processing_status: doc.processing_status,
        has_summary: !!doc.summary,
        has_key_points: !!doc.key_points,
        created_at: doc.created_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Server-Sent Events for real-time status updates
documentsRouter.get(
  "/:id/status/stream",
  validateParams(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);

      // Check if document exists
      const doc = getDocumentById(documentId);
      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      // Set up SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Send initial status
      const sendStatus = () => {
        const currentDoc = getDocumentById(documentId);
        if (currentDoc) {
          const statusData = {
            id: currentDoc.id,
            processing_status: currentDoc.processing_status,
            has_summary: !!currentDoc.summary,
            has_key_points: !!currentDoc.key_points,
            timestamp: new Date().toISOString(),
          };
          res.write(`data: ${JSON.stringify(statusData)}\n\n`);

          // If processing is complete, close the connection
          if (
            currentDoc.processing_status === "completed" ||
            currentDoc.processing_status === "failed"
          ) {
            res.end();
          }
        }
      };

      // Send initial status
      sendStatus();

      // Poll for status changes every 2 seconds
      const interval = setInterval(sendStatus, 2000);

      // Clean up on client disconnect
      req.on("close", () => {
        clearInterval(interval);
        res.end();
      });

      // Auto-close after 5 minutes to prevent hanging connections
      setTimeout(() => {
        clearInterval(interval);
        res.end();
      }, 300000);
    } catch (error) {
      next(error);
    }
  }
);

// QA messages are now handled through conversations
// Use GET /conversations?documentId=:id to get all conversations for a document

documentsRouter.post(
  "/upload",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      logger.info("Processing file upload", {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      const buffer = fs.readFileSync(req.file.path);
      const parsed = await pdf(buffer);
      const text = String(parsed.text || "").trim();

      if (!text) {
        throw new FileProcessingError(
          "No text content could be extracted from PDF"
        );
      }

      const docId = createDocument({
        filename: path.basename(req.file.path),
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        text_content: text,
      });

      // Background processing for AI analysis
      if (text && !config.MOCK_AI) {
        setImmediate(async () => {
          try {
            updateDocumentStatus(docId, "processing");
            logger.info("Starting background AI analysis", {
              documentId: docId,
            });
            const { summary, keyPoints } = await generateSummaryAndKeyPoints(
              text
            );
            updateDocumentAnalysis(docId, summary, keyPoints);
            logger.info("Background AI analysis completed", {
              documentId: docId,
            });
          } catch (error) {
            updateDocumentStatus(docId, "failed");
            logger.error(
              "Background AI analysis failed",
              { documentId: docId },
              error as Error
            );
            // Don't fail the upload if AI analysis fails
          }
        });
      }

      logger.info("File upload completed", { documentId: docId });
      res.json({ id: docId });
    } catch (error) {
      logger.error("File upload failed", {
        originalName: req.file?.originalname,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

documentsRouter.post(
  "/:id/ask",
  validateParams(documentIdSchema),
  validateBody(askQuestionSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { question } = req.body;
      const documentId = Number(id);

      logger.info("Processing question", {
        documentId,
        question: question.slice(0, 100),
        questionLength: question.length,
      });

      const doc = getDocumentById(documentId);
      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      const text = doc.text_content ?? "";
      if (!text.trim()) {
        throw new ValidationError("Document has no text content to search");
      }

      // Check for similar questions in existing conversations for this document
      const existingConversations = listConversations(documentId, 50);
      let cachedAnswer: string | undefined;
      let conversationId: string | undefined;

      // Look for exact or similar questions in conversation history
      for (const conv of existingConversations) {
        const messages = getConversationHistory(conv.conversation_id, 100);
        for (let i = 0; i < messages.length - 1; i++) {
          if (
            messages[i].role === "user" &&
            messages[i].content.toLowerCase() === question.toLowerCase()
          ) {
            cachedAnswer = messages[i + 1]?.content;
            conversationId = conv.conversation_id;
            break;
          }
        }
        if (cachedAnswer) break;
      }

      if (cachedAnswer && conversationId) {
        logger.info("Returning cached answer from conversation", {
          documentId,
          conversationId,
          questionLength: question.length,
        });
        return res.json({
          answer: cachedAnswer,
          cached: true,
          conversationId,
        });
      }

      // Generate new answer and create new conversation
      const result = await answerQuestion(text, question);

      // Create a new conversation for this Q&A
      const newConversationId = `qa_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      createConversation(newConversationId, documentId);

      // Save the question and answer as conversation messages
      saveConversationMessage(newConversationId, "user", question);
      saveConversationMessage(newConversationId, "assistant", result.answer);

      logger.info("Question answered and saved as conversation", {
        documentId,
        conversationId: newConversationId,
        questionLength: question.length,
        answerLength: result.answer.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.costUsd,
      });

      res.json({
        answer: result.answer,
        usage: result.usage,
        costUsd: result.costUsd,
        cached: false,
        conversationId: newConversationId,
      });
    } catch (error) {
      logger.error("Question answering failed", {
        documentId: req.params.id,
        question: req.body?.question?.slice(0, 100),
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

// General chatbot endpoint (no document ID required)
documentsRouter.post(
  "/chat",
  validateBody(chatbotMessageSchema),
  async (req, res, next) => {
    try {
      const { message, documentId, conversationId } = req.body;

      logger.info("Processing chatbot message", {
        message: message.slice(0, 100),
        documentId,
        conversationId,
        messageLength: message.length,
      });

      let documentContext: string | undefined;

      // If documentId is provided, get document context
      if (documentId) {
        const doc = getDocumentById(documentId);
        if (!doc) {
          throw new NotFoundError("Document not found");
        }
        documentContext = doc.text_content ?? undefined;
      }

      // Generate conversation ID if not provided
      const finalConversationId =
        conversationId ||
        `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create conversation with document context FIRST (before saving any messages)
      if (documentId) {
        createConversation(finalConversationId, documentId);
      } else {
        createConversation(finalConversationId);
      }

      // Get conversation history
      const conversationHistory = getConversationHistory(
        finalConversationId,
        20
      ).map((msg) => ({ role: msg.role, content: msg.content }));

      // Save user message
      saveConversationMessage(finalConversationId, "user", message);

      const result = await handleChatbotMessage(
        message,
        documentContext,
        conversationHistory
      );

      // Save assistant response
      saveConversationMessage(
        finalConversationId,
        "assistant",
        result.response
      );

      logger.info("Chatbot message processed", {
        documentId,
        conversationId: finalConversationId,
        messageLength: message.length,
        responseLength: result.response.length,
        historyLength: conversationHistory.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.costUsd,
      });

      res.json({
        response: result.response,
        usage: result.usage,
        costUsd: result.costUsd,
        conversationId: finalConversationId,
        historyLength: conversationHistory.length + 2, // +2 for current user message and response
      });
    } catch (error) {
      logger.error("Chatbot message failed", {
        documentId: req.body?.documentId,
        message: req.body?.message?.slice(0, 100),
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

// Document comparison endpoint
documentsRouter.post(
  "/compare",
  validateBody(compareDocumentsSchema),
  async (req, res, next) => {
    try {
      const { document1Id, document2Id, comparisonType } = req.body;

      logger.info("Starting document comparison", {
        document1Id,
        document2Id,
        comparisonType,
      });

      // Get both documents
      const doc1 = getDocumentById(document1Id);
      const doc2 = getDocumentById(document2Id);

      if (!doc1) {
        throw new NotFoundError(`Document ${document1Id} not found`);
      }
      if (!doc2) {
        throw new NotFoundError(`Document ${document2Id} not found`);
      }

      const doc1Text = doc1.text_content ?? "";
      const doc2Text = doc2.text_content ?? "";

      if (!doc1Text.trim()) {
        throw new ValidationError(
          `Document ${document1Id} has no text content`
        );
      }
      if (!doc2Text.trim()) {
        throw new ValidationError(
          `Document ${document2Id} has no text content`
        );
      }

      const result = await compareDocuments(doc1Text, doc2Text, comparisonType);

      logger.info("Document comparison completed", {
        document1Id,
        document2Id,
        comparisonType,
        comparisonLength: result.comparison.length,
        keyFindingsCount: result.keyFindings.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.costUsd,
        score: result.score,
      });

      res.json({
        comparison: result.comparison,
        keyFindings: result.keyFindings,
        score: result.score,
        usage: result.usage,
        costUsd: result.costUsd,
        documents: {
          document1: {
            id: doc1.id,
            name: doc1.original_name,
          },
          document2: {
            id: doc2.id,
            name: doc2.original_name,
          },
        },
        comparisonType,
      });
    } catch (error) {
      logger.error("Document comparison failed", {
        document1Id: req.body?.document1Id,
        document2Id: req.body?.document2Id,
        comparisonType: req.body?.comparisonType,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

// Soft delete document
documentsRouter.delete(
  "/:id",
  validateParams(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);

      logger.info("Soft deleting document", { documentId });

      softDeleteDocument(documentId);

      logger.info("Document soft-deleted successfully", { documentId });
      res.json({
        message: "Document deleted successfully",
        id: documentId,
      });
    } catch (error) {
      logger.error("Failed to soft delete document", {
        documentId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

// Download document file
documentsRouter.get(
  "/:id/download",
  validateParams(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);

      logger.info("Downloading document file", { documentId });

      const doc = getDocumentById(documentId);
      if (!doc) {
        throw new NotFoundError("Document not found");
      }

      const filePath = path.join(uploadDir, doc.filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError("File not found on disk");
      }

      // Set appropriate headers for file download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.original_name}"`
      );
      res.setHeader("Content-Type", doc.mime_type);
      res.setHeader("Content-Length", doc.size_bytes);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      logger.info("Document file downloaded successfully", {
        documentId,
        originalName: doc.original_name,
        sizeBytes: doc.size_bytes,
      });
    } catch (error) {
      logger.error("Failed to download document file", {
        documentId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

// Download conversation as text file
documentsRouter.get(
  "/conversations/:conversationId/download",
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      logger.info("Downloading conversation", { conversationId });

      // Get conversation history
      const messages = getConversationHistory(conversationId, 1000); // Get up to 1000 messages

      if (messages.length === 0) {
        throw new NotFoundError("Conversation not found or has no messages");
      }

      // Format conversation as readable text
      const conversationText = messages
        .map((msg, index) => {
          const timestamp = new Date(msg.created_at).toLocaleString();
          const role = msg.role === "user" ? "User" : "Assistant";
          return `[${timestamp}] ${role}:\n${msg.content}\n`;
        })
        .join("\n---\n\n");

      const fileName = `conversation_${conversationId}_${
        new Date().toISOString().split("T")[0]
      }.txt`;
      const fileContent = `Conversation Export\nConversation ID: ${conversationId}\nExported: ${new Date().toISOString()}\n\n${"=".repeat(
        50
      )}\n\n${conversationText}`;

      // Set headers for text file download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Length", Buffer.byteLength(fileContent, "utf8"));

      res.send(fileContent);

      logger.info("Conversation downloaded successfully", {
        conversationId,
        messageCount: messages.length,
        fileName,
      });
    } catch (error) {
      logger.error("Failed to download conversation", {
        conversationId: req.params.conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);
