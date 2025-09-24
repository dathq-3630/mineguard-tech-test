import Anthropic from "@anthropic-ai/sdk";
import { config, getModelPrice } from "../config/index.ts";
import { logger } from "../utils/logger.ts";
import { AIServiceError } from "../utils/errors.ts";

const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
  maxRetries: 3,
});

export type AIUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const price = getModelPrice(model);
  if (!price) {
    logger.warn("Unknown model pricing", { model });
    return null;
  }

  const cost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  return Math.round(cost * 10000) / 10000;
}

// ---- Utility functions for cost-aware processing ----
async function countTokensForText(text: string): Promise<number> {
  if (config.MOCK_AI) {
    // Heuristic in mock mode
    return Math.ceil(text.length / 4);
  }

  try {
    const resp = await anthropic.messages.countTokens({
      model: config.AI_SYNTHESIS_MODEL,
      messages: [
        {
          role: "user",
          content: text.slice(0, 200000), // Limit to prevent excessive token usage
        },
      ],
    });
    return resp.input_tokens ?? 0;
  } catch (error) {
    logger.error(
      "Failed to count tokens",
      { textLength: text.length },
      error as Error
    );
    // Fallback to heuristic
    return Math.ceil(text.length / 4);
  }
}

function splitIntoSections(
  text: string
): Array<{ title: string; body: string }> {
  const lines = text.split(/\r?\n/);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "Introduction";
  let currentBody: string[] = [];
  const headerRegex =
    /^(\d+\.|[A-Z][A-Z\s]{2,}|#{1,6}\s+|Section\s+\d+|Policy|Procedure|Scope|Purpose|PPE|Safety|Hazard|Risk|Responsibilities?)/i;
  for (const line of lines) {
    if (headerRegex.test(line.trim())) {
      if (currentBody.length)
        sections.push({ title: currentTitle, body: currentBody.join("\n") });
      currentTitle = line
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .slice(0, 120);
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentBody.length)
    sections.push({ title: currentTitle, body: currentBody.join("\n") });
  return sections.filter((s) => s.body.trim().length > 0);
}

function scoreSectionForCompliance(section: {
  title: string;
  body: string;
}): number {
  const t = `${section.title}\n${section.body}`.toLowerCase();
  const keywords = [
    "policy",
    "procedure",
    "ppe",
    "personal protective equipment",
    "safety",
    "hazard",
    "risk",
    "control",
    "responsibilities",
    "training",
    "inspection",
    "maintenance",
    "isolation",
    "lockout",
    "permit",
  ];
  let score = 0;
  for (const k of keywords) if (t.includes(k)) score += 2;
  return score;
}

async function selectRelevantText(
  text: string,
  maxTokens: number = config.MAX_DOCUMENT_TOKENS
): Promise<string> {
  try {
    const sections = splitIntoSections(text);

    // Batch token counting for better performance
    const sectionTexts = sections.map((s) => `=== ${s.title} ===\n${s.body}`);
    const tokenCounts = await Promise.all(
      sectionTexts.map((secText) => countTokensForText(secText))
    );

    const scored = sections.map((s, index) => ({
      s,
      kw: scoreSectionForCompliance(s),
      tokens: tokenCounts[index],
    }));

    const ranked = scored.sort((a, b) => {
      const aScore = a.kw + Math.max(0, 1000 - a.tokens) / 1000;
      const bScore = b.kw + Math.max(0, 1000 - b.tokens) / 1000;
      return bScore - aScore;
    });

    const picked: string[] = [];
    let used = 0;

    for (const r of ranked) {
      const secText = `\n\n=== ${r.s.title} ===\n${r.s.body}`;
      if (used + r.tokens > maxTokens) continue;
      picked.push(secText);
      used += r.tokens;
      if (used >= maxTokens) break;
    }

    if (picked.length === 0) {
      logger.warn("No sections fit within token budget, using fallback", {
        maxTokens,
        sectionsCount: sections.length,
      });

      // Fallback: fit the head of the document into the token budget using binary search
      let low = 0;
      let high = Math.min(text.length, maxTokens * 8);
      let best = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = text.slice(0, mid);
        const tokens = await countTokensForText(candidate);

        if (tokens <= maxTokens) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      return text.slice(0, best || Math.min(text.length, maxTokens * 4));
    }

    logger.debug("Selected relevant text", {
      sectionsSelected: picked.length,
      tokensUsed: used,
      maxTokens,
    });

    return picked.join("");
  } catch (error) {
    logger.error(
      "Failed to select relevant text",
      { textLength: text.length },
      error as Error
    );
    throw new AIServiceError("Failed to process document text", error as Error);
  }
}

async function chunkByTokens(
  text: string,
  maxTokensPerChunk: number = config.MAX_CHUNK_TOKENS,
  overlapTokens: number = config.OVERLAP_TOKENS
): Promise<string[]> {
  if (!text.trim()) return [];

  try {
    const approxCharsPerToken = 4; // only used to seed bounds; we verify with countTokens
    const chunks: string[] = [];
    let startChar = 0;
    let lastEndChar = 0;

    while (startChar < text.length) {
      // optimistic end bound by chars
      let low = startChar + 1;
      let high = Math.min(
        text.length,
        startChar + maxTokensPerChunk * approxCharsPerToken * 2
      );
      let bestEnd = low;

      // binary search largest end <= token budget
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = text.slice(startChar, mid);
        const tokens = await countTokensForText(candidate);

        if (tokens <= maxTokensPerChunk) {
          bestEnd = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // try to end at a sentence boundary within last ~400 chars
      let endChar = bestEnd;
      const searchWindow = text.slice(
        Math.max(startChar, endChar - 400),
        endChar
      );
      const lastStop = Math.max(
        searchWindow.lastIndexOf(".\n"),
        searchWindow.lastIndexOf(". "),
        searchWindow.lastIndexOf("\n\n")
      );

      if (lastStop > 40) {
        endChar = Math.max(
          startChar + 1,
          endChar - (searchWindow.length - lastStop - 1)
        );
      }

      chunks.push(text.slice(startChar, endChar));
      lastEndChar = endChar;
      if (endChar >= text.length) break;

      // step forward with overlap
      const overlapChars = Math.max(0, overlapTokens * approxCharsPerToken);
      startChar = Math.max(0, endChar - overlapChars);
      // ensure progress
      if (startChar <= lastEndChar - 10) startChar = lastEndChar;
    }

    logger.debug("Text chunked successfully", {
      originalLength: text.length,
      chunksCount: chunks.length,
      maxTokensPerChunk,
      overlapTokens,
    });

    return chunks;
  } catch (error) {
    logger.error(
      "Failed to chunk text",
      { textLength: text.length },
      error as Error
    );
    throw new AIServiceError(
      "Failed to chunk text for processing",
      error as Error
    );
  }
}

export async function generateSummaryAndKeyPoints(
  text: string
): Promise<{ summary: string; keyPoints: string[] }> {
  if (!text.trim()) {
    throw new AIServiceError("Empty text provided for summarization");
  }

  try {
    logger.info("Starting document summarization", { textLength: text.length });

    // Stage 1: select only the most relevant sections to control cost
    const relevant = await selectRelevantText(text, config.MAX_DOCUMENT_TOKENS);
    const chunks = await chunkByTokens(
      relevant,
      config.MAX_CHUNK_TOKENS,
      config.OVERLAP_TOKENS
    );

    if (chunks.length === 0) {
      throw new AIServiceError("No content chunks generated from document");
    }

    logger.debug("Processing document chunks", { chunksCount: chunks.length });

    // Summarize chunks individually (cheaper model), then synthesize (stronger model)
    const chunkSummaries: string[] = [];

    if (config.MOCK_AI) {
      for (const chunk of chunks) {
        const words = chunk.split(/\s+/).filter(Boolean).slice(0, 120);
        const summary = words.join(" ");
        const keyPoints = splitIntoSections(chunk)
          .slice(0, 5)
          .map((s) => s.title)
          .filter(Boolean);
        chunkSummaries.push(
          `Summary: ${summary}\nKey Points: ${keyPoints.join("; ")}`
        );
      }
    } else {
      // Process chunks in parallel for better performance
      const chunkPromises = chunks.map(async (chunk, index) => {
        try {
          const resp = await anthropic.messages.create({
            model: config.AI_SUMMARY_MODEL,
            max_tokens: 400,
            temperature: 0.1,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Summarize the following compliance document passage in 80-120 words and extract 3-5 compliance-focused bullet key points. Respond strictly in JSON with keys summary and keyPoints (array of strings).",
                  },
                  {
                    type: "text",
                    text: chunk,
                    cache_control: { type: "ephemeral" },
                  },
                ],
              },
            ],
          });

          const first = resp.content?.[0];
          const content =
            (first && first.type === "text" ? first.text : "") || "{}";

          try {
            const json = JSON.parse(content);
            const summary = String(json.summary ?? "");
            const keyPointsArr = Array.isArray(json.keyPoints)
              ? json.keyPoints.map(String)
              : [];
            return `Summary: ${summary}\nKey Points: ${keyPointsArr.join(
              "; "
            )}`;
          } catch (parseError) {
            logger.warn("Failed to parse chunk summary JSON", {
              chunkIndex: index,
              error: parseError,
            });
            return content.trim();
          }
        } catch (error) {
          logger.error(
            "Failed to summarize chunk",
            { chunkIndex: index },
            error as Error
          );
          throw new AIServiceError(
            `Failed to summarize chunk ${index + 1}`,
            error as Error
          );
        }
      });

      chunkSummaries.push(...(await Promise.all(chunkPromises)));
    }

    // Synthesize into a final concise summary and consolidated key points
    const synthesisPrompt = `You are a compliance assistant. You will receive multiple partial summaries with key points.\nProduce: (1) one consolidated summary (120-180 words) and (2) 5-8 bullet key points focusing on compliance requirements, mandatory PPE, roles/responsibilities, permits, critical steps.\nReturn strictly JSON: {\"summary\": string, \"keyPoints\": string[]}.\n\nPARTIALS:\n${chunkSummaries
      .map((s, i) => `Part ${i + 1}: ${s}`)
      .join("\n\n")}`;

    if (config.MOCK_AI) {
      const combined = chunkSummaries.join(" \n ");
      const words = combined.split(/\s+/).filter(Boolean);
      const summary = words.slice(0, 160).join(" ");
      const keyPoints = Array.from(
        new Set(
          chunkSummaries
            .flatMap((s) => s.split("Key Points:")[1]?.split(";") || [])
            .map((s) => (s || "").trim())
            .filter(Boolean)
        )
      ).slice(0, 8);

      logger.info("Document summarization completed (mock mode)", {
        summaryLength: summary.length,
        keyPointsCount: keyPoints.length,
      });

      return { summary, keyPoints };
    } else {
      const resp2 = await anthropic.messages.create({
        model: config.AI_SYNTHESIS_MODEL,
        max_tokens: 700,
        temperature: 0.2,
        messages: [{ role: "user", content: synthesisPrompt }],
      });

      const first2 = resp2.content?.[0];
      const content2 =
        (first2 && first2.type === "text" ? first2.text : "") || "{}";

      try {
        const json = JSON.parse(content2);
        const result = {
          summary: String(json.summary ?? ""),
          keyPoints: Array.isArray(json.keyPoints)
            ? json.keyPoints.map(String)
            : [],
        };

        logger.info("Document summarization completed", {
          summaryLength: result.summary.length,
          keyPointsCount: result.keyPoints.length,
        });

        return result;
      } catch (parseError) {
        logger.error("Failed to parse synthesis JSON", {}, parseError as Error);
        return { summary: content2.trim(), keyPoints: [] };
      }
    }
  } catch (error) {
    logger.error(
      "Failed to generate summary and key points",
      { textLength: text.length },
      error as Error
    );
    if (error instanceof AIServiceError) {
      throw error;
    }
    throw new AIServiceError(
      "Failed to generate document summary",
      error as Error
    );
  }
}

function extractRelevantSnippets(
  text: string,
  question: string,
  targetTokens: number = config.MAX_QA_TOKENS,
  options?: { topK?: number; overlapRatio?: number }
): string {
  try {
    // Overlapping sliding windows scored by keyword frequency
    const lowerQ = question.toLowerCase();
    const keywords = Array.from(
      new Set(lowerQ.split(/[^a-z0-9]+/).filter((w) => w.length > 2))
    );

    if (keywords.length === 0) {
      logger.warn("No keywords extracted from question", { question });
      return text.slice(0, Math.min(text.length, targetTokens * 4));
    }

    const windowChars = targetTokens * 4;
    const overlapRatio = Math.min(
      Math.max(options?.overlapRatio ?? 0.5, 0.1),
      0.9
    );
    const stride = Math.max(1, Math.floor(windowChars * (1 - overlapRatio)));
    const candidates: Array<{ s: string; score: number }> = [];

    for (let start = 0; start < text.length; start += stride) {
      const end = Math.min(text.length, start + windowChars);
      const slice = text.slice(start, end);
      const l = slice.toLowerCase();
      let score = 0;

      for (const k of keywords) {
        const occurrences = l.split(k).length - 1;
        if (occurrences > 0) score += Math.min(occurrences * 2, 10);
      }

      candidates.push({ s: slice, score });
      if (end >= text.length) break;
    }

    const topK = Math.max(1, options?.topK ?? 3);
    const top = candidates.sort((a, b) => b.score - a.score).slice(0, topK);

    if (top.length === 0) {
      logger.warn("No relevant snippets found", {
        question,
        textLength: text.length,
      });
      return text.slice(0, Math.min(text.length, windowChars));
    }

    logger.debug("Extracted relevant snippets", {
      question,
      snippetsCount: top.length,
      totalScore: top.reduce((sum, t) => sum + t.score, 0),
    });

    return top.map((x) => x.s).join("\n\n---\n\n");
  } catch (error) {
    logger.error(
      "Failed to extract relevant snippets",
      { question, textLength: text.length },
      error as Error
    );
    // Fallback to beginning of text
    return text.slice(0, Math.min(text.length, targetTokens * 4));
  }
}

export async function handleChatbotMessage(
  message: string,
  documentContext?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ response: string; usage: AIUsage; costUsd: number | null }> {
  if (!message.trim()) {
    throw new AIServiceError("Empty message provided");
  }

  try {
    logger.info("Processing chatbot message", {
      message: message.slice(0, 100),
      hasDocumentContext: !!documentContext,
      historyLength: conversationHistory?.length || 0,
    });

    const systemPrompt = documentContext
      ? "You are a helpful assistant specialized in document analysis and compliance. Use the provided document context to answer questions accurately. If the answer isn't in the document, say so clearly."
      : "You are a helpful assistant. Answer questions clearly and concisely.";

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-10)); // Keep last 10 messages for context
    }

    // Add document context if provided
    if (documentContext) {
      messages.push({
        role: "user",
        content: `Document context:\n${documentContext}\n\nUser question: ${message}`,
      });
    } else {
      messages.push({
        role: "user",
        content: message,
      });
    }

    if (config.MOCK_AI) {
      const inputTokens = await countTokensForText(JSON.stringify(messages));
      const outputTokens = 150;
      const model = config.AI_QA_MODEL;

      return {
        response:
          "MOCK RESPONSE: This is a simulated chatbot response. In real mode, Claude would provide contextual answers.",
        usage: { model, inputTokens, outputTokens },
        costUsd: estimateCostUsd(model, inputTokens, outputTokens),
      };
    }

    const resp = await anthropic.messages.create({
      model: config.AI_QA_MODEL,
      max_tokens: 800,
      temperature: 0.3,
      messages: messages.slice(1), // Remove system message for Anthropic API
      system: systemPrompt,
    });

    const first = resp.content?.[0];
    const response = (first && first.type === "text" ? first.text : "").trim();
    const usage: AIUsage = {
      model: config.AI_QA_MODEL,
      inputTokens: (resp as any).usage?.input_tokens ?? 0,
      outputTokens: (resp as any).usage?.output_tokens ?? 0,
    };

    logger.info("Chatbot message processed", {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    return {
      response,
      usage,
      costUsd: estimateCostUsd(
        usage.model,
        usage.inputTokens,
        usage.outputTokens
      ),
    };
  } catch (error) {
    logger.error(
      "Failed to process chatbot message",
      { message: message.slice(0, 100) },
      error as Error
    );
    if (error instanceof AIServiceError) {
      throw error;
    }
    throw new AIServiceError(
      "Failed to process chatbot message",
      error as Error
    );
  }
}

export async function compareDocuments(
  doc1Text: string,
  doc2Text: string,
  comparisonType: "gap_analysis" | "similarity" | "differences" = "gap_analysis"
): Promise<{
  comparison: string;
  keyFindings: string[];
  score?: number;
  usage: AIUsage;
  costUsd: number | null;
}> {
  if (!doc1Text.trim() || !doc2Text.trim()) {
    throw new AIServiceError("Both documents must have content for comparison");
  }

  try {
    logger.info("Starting document comparison", {
      doc1Length: doc1Text.length,
      doc2Length: doc2Text.length,
      comparisonType,
    });

    // Truncate documents if they're too long to fit in context
    const maxDocLength = config.MAX_DOCUMENT_TOKENS * 2; // Rough character estimate
    const truncatedDoc1 = doc1Text.slice(0, maxDocLength);
    const truncatedDoc2 = doc2Text.slice(0, maxDocLength);

    let prompt = "";
    switch (comparisonType) {
      case "gap_analysis":
        prompt = `Perform a gap analysis between these two compliance documents. Identify:
1. Requirements in Document 2 that are missing or inadequately addressed in Document 1
2. Areas where Document 1 could be strengthened to meet Document 2's standards
3. Critical compliance gaps that need attention
4. Recommendations for alignment

Provide a detailed analysis and 5-8 key findings as bullet points.
Return strictly JSON: {"comparison": string, "keyFindings": string[]}`;
        break;
      case "similarity":
        prompt = `Compare these two documents for similarities and overlaps. Identify:
1. Common procedures, requirements, or standards
2. Similar safety protocols or compliance measures
3. Overlapping responsibilities or roles
4. Shared terminology and definitions
5. Areas of alignment and consistency

Provide a similarity analysis and rate the overall similarity (0-100%).
Return strictly JSON: {"comparison": string, "keyFindings": string[], "score": number}`;
        break;
      case "differences":
        prompt = `Identify key differences between these two documents. Focus on:
1. Conflicting requirements or procedures
2. Different safety standards or protocols
3. Varying levels of detail or specificity
4. Inconsistent terminology or definitions
5. Contradictory guidance or recommendations

Provide a detailed differences analysis and key differentiators.
Return strictly JSON: {"comparison": string, "keyFindings": string[]}`;
        break;
    }

    if (config.MOCK_AI) {
      const inputTokens = Math.ceil(
        (truncatedDoc1.length + truncatedDoc2.length + prompt.length) / 4
      );
      const outputTokens = 500;
      const model = config.AI_SYNTHESIS_MODEL;

      const mockFindings = [
        "Mock finding 1: Document comparison would identify key differences",
        "Mock finding 2: Gap analysis would highlight missing requirements",
        "Mock finding 3: Similarity analysis would show overlapping content",
      ];

      return {
        comparison: `MOCK COMPARISON: This is a simulated ${comparisonType} between the two documents. In real mode, Claude would provide detailed analysis.`,
        keyFindings: mockFindings,
        score: comparisonType === "similarity" ? 75 : undefined,
        usage: { model, inputTokens, outputTokens },
        costUsd: estimateCostUsd(model, inputTokens, outputTokens),
      };
    }

    const resp = await anthropic.messages.create({
      model: config.AI_SYNTHESIS_MODEL,
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "text", text: `\n\nDocument 1:\n${truncatedDoc1}` },
            { type: "text", text: `\n\nDocument 2:\n${truncatedDoc2}` },
          ],
        },
      ],
    });

    const first = resp.content?.[0];
    const content = (first && first.type === "text" ? first.text : "") || "{}";
    const usage: AIUsage = {
      model: config.AI_SYNTHESIS_MODEL,
      inputTokens: (resp as any).usage?.input_tokens ?? 0,
      outputTokens: (resp as any).usage?.output_tokens ?? 0,
    };

    try {
      const json = JSON.parse(content);
      const result = {
        comparison: String(json.comparison ?? ""),
        keyFindings: Array.isArray(json.keyFindings)
          ? json.keyFindings.map(String)
          : [],
        score: typeof json.score === "number" ? json.score : undefined,
        usage,
        costUsd: estimateCostUsd(
          usage.model,
          usage.inputTokens,
          usage.outputTokens
        ),
      };

      logger.info("Document comparison completed", {
        comparisonType,
        comparisonLength: result.comparison.length,
        keyFindingsCount: result.keyFindings.length,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });

      return result;
    } catch (parseError) {
      logger.error("Failed to parse comparison JSON", {}, parseError as Error);
      return {
        comparison: content.trim(),
        keyFindings: [],
        usage,
        costUsd: estimateCostUsd(
          usage.model,
          usage.inputTokens,
          usage.outputTokens
        ),
      };
    }
  } catch (error) {
    logger.error(
      "Failed to compare documents",
      { comparisonType },
      error as Error
    );
    if (error instanceof AIServiceError) {
      throw error;
    }
    throw new AIServiceError("Failed to compare documents", error as Error);
  }
}

export async function answerQuestion(
  text: string,
  question: string
): Promise<{ answer: string; usage: AIUsage; costUsd: number | null }> {
  if (!text.trim()) {
    throw new AIServiceError("Empty text provided for question answering");
  }

  if (!question.trim()) {
    throw new AIServiceError("Empty question provided");
  }

  try {
    logger.info("Starting question answering", {
      question: question.slice(0, 100),
      textLength: text.length,
    });

    // Pass 1: concise context using multiple overlapping top snippets
    const snippet = extractRelevantSnippets(
      text,
      question,
      config.MAX_QA_TOKENS,
      {
        topK: 3,
        overlapRatio: 0.5,
      }
    );

    if (config.MOCK_AI) {
      const instruction =
        "Answer the user question using ONLY the provided document excerpt.";
      const [instructionTokens, snippetTokens, questionTokens] =
        await Promise.all([
          countTokensForText(instruction),
          countTokensForText(snippet),
          countTokensForText(`Question: ${question}`),
        ]);

      const inputTokens = instructionTokens + snippetTokens + questionTokens;
      const outputTokens = 180;
      const model = config.AI_QA_MODEL;

      logger.info("Question answered (mock mode)", {
        inputTokens,
        outputTokens,
      });

      return {
        answer:
          "MOCK ANSWER: This is a simulated response based on the provided excerpt. In real mode, Claude would cite exact lines.",
        usage: { model, inputTokens, outputTokens },
        costUsd: estimateCostUsd(model, inputTokens, outputTokens),
      };
    }

    const resp = await anthropic.messages.create({
      model: config.AI_QA_MODEL,
      max_tokens: 600,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Answer the user question using ONLY the provided document excerpt. If the answer is not supported, say you can't find it. Be specific and cite short quotes when possible.",
            },
            {
              type: "text",
              text: `Document excerpt:\n${snippet}`,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: `Question: ${question}` },
          ],
        },
      ],
    });

    const first = resp.content?.[0];
    const firstAnswer = (
      first && first.type === "text" ? first.text : ""
    ).trim();
    const usage1: AIUsage = {
      model: config.AI_QA_MODEL,
      inputTokens: (resp as any).usage?.input_tokens ?? 0,
      outputTokens: (resp as any).usage?.output_tokens ?? 0,
    };

    let totalInput = usage1.inputTokens;
    let totalOutput = usage1.outputTokens;

    // Heuristic low-confidence detection: look for explicit uncertainty cues
    const lowConfidence =
      /can't find|insufficient context|not provided|unclear|unspecified/i.test(
        firstAnswer
      );

    if (!lowConfidence) {
      logger.info("Question answered successfully", {
        inputTokens: usage1.inputTokens,
        outputTokens: usage1.outputTokens,
        passes: 1,
      });

      return {
        answer: firstAnswer,
        usage: usage1,
        costUsd: estimateCostUsd(
          usage1.model,
          usage1.inputTokens,
          usage1.outputTokens
        ),
      };
    }

    logger.debug("Low confidence detected, trying with larger context", {
      firstAnswer: firstAnswer.slice(0, 100),
    });

    // Pass 2: fallback with larger context budget if low confidence
    const largerSnippet = extractRelevantSnippets(text, question, 3500, {
      topK: 4,
      overlapRatio: 0.6,
    });

    const resp2 = await anthropic.messages.create({
      model: config.AI_QA_MODEL,
      max_tokens: 700,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Attempt again with a larger excerpt. Use ONLY the provided text. If still not present, state that clearly and suggest where it might be in the document (section names). Include short quotes where possible.",
            },
            {
              type: "text",
              text: `Document excerpt (extended):\n${largerSnippet}`,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: `Question: ${question}` },
          ],
        },
      ],
    });

    const first2 = resp2.content?.[0];
    const answer2 = (
      first2 && first2.type === "text" ? first2.text : ""
    ).trim();
    const usage2: AIUsage = {
      model: config.AI_QA_MODEL,
      inputTokens: (resp2 as any).usage?.input_tokens ?? 0,
      outputTokens: (resp2 as any).usage?.output_tokens ?? 0,
    };

    totalInput += usage2.inputTokens;
    totalOutput += usage2.outputTokens;

    logger.info("Question answered with extended context", {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      passes: 2,
    });

    return {
      answer: answer2,
      usage: {
        model: usage2.model,
        inputTokens: totalInput,
        outputTokens: totalOutput,
      },
      costUsd: estimateCostUsd(usage2.model, totalInput, totalOutput),
    };
  } catch (error) {
    logger.error(
      "Failed to answer question",
      { question: question.slice(0, 100) },
      error as Error
    );
    if (error instanceof AIServiceError) {
      throw error;
    }
    throw new AIServiceError("Failed to answer question", error as Error);
  }
}
