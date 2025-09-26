import {
  estimateCostUsd,
  generateSummaryAndKeyPoints,
  handleChatbotMessage,
  compareDocuments,
  answerQuestion,
} from "../../src/services/ai";
import { AIServiceError } from "../../src/utils/errors";

// Mock the config
jest.mock("../../src/config", () => ({
  config: {
    MOCK_AI: true,
    MAX_DOCUMENT_TOKENS: 6000,
    MAX_CHUNK_TOKENS: 2800,
    OVERLAP_TOKENS: 300,
    MAX_QA_TOKENS: 1800,
    AI_SUMMARY_MODEL: "claude-3-haiku-20240307",
    AI_QA_MODEL: "claude-3-haiku-20240307",
    AI_SYNTHESIS_MODEL: "claude-3-5-sonnet-latest",
  },
  getModelPrice: jest.fn(),
}));

// Mock Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: "text", text: "Mock AI response" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

import { getModelPrice } from "../../src/config";

describe("AI Services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("estimateCostUsd", () => {
    it("should calculate cost correctly", () => {
      (getModelPrice as jest.Mock).mockReturnValue({
        input: 0.25,
        output: 1.25,
      });

      const cost = estimateCostUsd("claude-3-haiku-20240307", 1000, 500);

      // (1000/1M) * 0.25 + (500/1M) * 1.25 = 0.00025 + 0.000625 = 0.000875
      expect(cost).toBeCloseTo(0.0009, 4);
    });

    it("should return null for unknown model", () => {
      (getModelPrice as jest.Mock).mockReturnValue(null);

      const cost = estimateCostUsd("unknown-model", 1000, 500);

      expect(cost).toBeNull();
    });
  });

  describe("generateSummaryAndKeyPoints", () => {
    const sampleText = `
      Safety Policy Document
      
      This document outlines the safety procedures for mining operations.
      
      Section 1: Personal Protective Equipment
      All workers must wear hard hats, safety glasses, and steel-toed boots.
      
      Section 2: Hazard Identification
      Workers must identify and report hazards immediately.
      
      Section 3: Emergency Procedures
      In case of emergency, follow the evacuation plan.
    `;

    it("should generate summary and key points in mock mode", async () => {
      const result = await generateSummaryAndKeyPoints(sampleText);

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("keyPoints");
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should throw error for empty text", async () => {
      await expect(generateSummaryAndKeyPoints("")).rejects.toThrow(
        AIServiceError
      );
      await expect(generateSummaryAndKeyPoints("   ")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should handle very long text by chunking", async () => {
      const longText = "A".repeat(50000); // Very long text

      const result = await generateSummaryAndKeyPoints(longText);

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("keyPoints");
    });
  });

  describe("handleChatbotMessage", () => {
    it("should handle message without context", async () => {
      const result = await handleChatbotMessage("Hello, how are you?");

      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
      expect(typeof result.response).toBe("string");
      expect(result.usage).toHaveProperty("model");
      expect(result.usage).toHaveProperty("inputTokens");
      expect(result.usage).toHaveProperty("outputTokens");
    });

    it("should handle message with document context", async () => {
      const documentContext =
        "This is a safety document about mining procedures.";
      const result = await handleChatbotMessage(
        "What are the safety requirements?",
        documentContext
      );

      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
    });

    it("should handle message with conversation history", async () => {
      const conversationHistory = [
        { role: "user" as const, content: "What is safety?" },
        { role: "assistant" as const, content: "Safety is important." },
      ];

      const result = await handleChatbotMessage(
        "Tell me more",
        undefined,
        conversationHistory
      );

      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("usage");
    });

    it("should throw error for empty message", async () => {
      await expect(handleChatbotMessage("")).rejects.toThrow(AIServiceError);
      await expect(handleChatbotMessage("   ")).rejects.toThrow(AIServiceError);
    });
  });

  describe("compareDocuments", () => {
    const doc1Text = `
      Safety Policy Document A
      
      This document outlines safety procedures for mining operations.
      All workers must wear PPE including hard hats and safety glasses.
    `;

    const doc2Text = `
      Safety Policy Document B
      
      This document outlines safety procedures for mining operations.
      All workers must wear PPE including hard hats, safety glasses, and steel-toed boots.
      Additional requirement: high-visibility vests.
    `;

    it("should compare documents with gap analysis", async () => {
      const result = await compareDocuments(doc1Text, doc2Text, "gap_analysis");

      expect(result).toHaveProperty("comparison");
      expect(result).toHaveProperty("keyFindings");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
      expect(Array.isArray(result.keyFindings)).toBe(true);
    });

    it("should compare documents with similarity analysis", async () => {
      const result = await compareDocuments(doc1Text, doc2Text, "similarity");

      expect(result).toHaveProperty("comparison");
      expect(result).toHaveProperty("keyFindings");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
      expect(typeof result.score).toBe("number");
    });

    it("should compare documents with differences analysis", async () => {
      const result = await compareDocuments(doc1Text, doc2Text, "differences");

      expect(result).toHaveProperty("comparison");
      expect(result).toHaveProperty("keyFindings");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
    });

    it("should throw error for empty documents", async () => {
      await expect(compareDocuments("", doc2Text)).rejects.toThrow(
        AIServiceError
      );
      await expect(compareDocuments(doc1Text, "")).rejects.toThrow(
        AIServiceError
      );
      await expect(compareDocuments("   ", doc2Text)).rejects.toThrow(
        AIServiceError
      );
    });

    it("should handle very long documents by truncation", async () => {
      const longDoc1 = "A".repeat(100000);
      const longDoc2 = "B".repeat(100000);

      const result = await compareDocuments(longDoc1, longDoc2);

      expect(result).toHaveProperty("comparison");
      expect(result).toHaveProperty("keyFindings");
    });
  });

  describe("answerQuestion", () => {
    const documentText = `
      Safety Policy Document
      
      Section 1: Personal Protective Equipment
      All workers must wear hard hats, safety glasses, and steel-toed boots.
      
      Section 2: Hazard Identification
      Workers must identify and report hazards immediately to their supervisor.
      
      Section 3: Emergency Procedures
      In case of emergency, follow the evacuation plan posted in each area.
    `;

    it("should answer question about document content", async () => {
      const result = await answerQuestion(
        documentText,
        "What PPE is required?"
      );

      expect(result).toHaveProperty("answer");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
      expect(typeof result.answer).toBe("string");
      expect(result.answer.length).toBeGreaterThan(0);
    });

    it("should handle questions with no clear answer", async () => {
      const result = await answerQuestion(
        documentText,
        "What is the capital of France?"
      );

      expect(result).toHaveProperty("answer");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
    });

    it("should throw error for empty text", async () => {
      await expect(answerQuestion("", "What is safety?")).rejects.toThrow(
        AIServiceError
      );
      await expect(answerQuestion("   ", "What is safety?")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should throw error for empty question", async () => {
      await expect(answerQuestion(documentText, "")).rejects.toThrow(
        AIServiceError
      );
      await expect(answerQuestion(documentText, "   ")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should handle very long documents", async () => {
      const longText = "A".repeat(50000);

      const result = await answerQuestion(longText, "What is this about?");

      expect(result).toHaveProperty("answer");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("costUsd");
    });
  });

  describe("Mock AI Mode", () => {
    beforeEach(() => {
      // Ensure we're in mock mode
      jest.doMock("../../src/config", () => ({
        config: {
          MOCK_AI: true,
          MAX_DOCUMENT_TOKENS: 6000,
          MAX_CHUNK_TOKENS: 2800,
          OVERLAP_TOKENS: 300,
          MAX_QA_TOKENS: 1800,
          AI_SUMMARY_MODEL: "claude-3-haiku-20240307",
          AI_QA_MODEL: "claude-3-haiku-20240307",
          AI_SYNTHESIS_MODEL: "claude-3-5-sonnet-latest",
        },
        getModelPrice: jest.fn(),
      }));
    });

    it("should return mock responses in mock mode", async () => {
      const result = await handleChatbotMessage("Test message");

      expect(result.response).toContain("MOCK RESPONSE");
    });

    it("should return mock comparison in mock mode", async () => {
      const result = await compareDocuments("Doc 1", "Doc 2");

      expect(result.comparison).toContain("MOCK COMPARISON");
    });

    it("should return mock answer in mock mode", async () => {
      const result = await answerQuestion("Document text", "Test question");

      expect(result.answer).toContain("MOCK ANSWER");
    });
  });
});
