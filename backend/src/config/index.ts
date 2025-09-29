import { z, ZodError, type ZodIssue } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  // Server Configuration
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database Configuration
  DATABASE_PATH: z.string().default("./data/app.db"),

  // AI Configuration
  ANTHROPIC_API_KEY: z.string().min(1, "Anthropic API key is required"),
  MOCK_AI: z
    .enum(["0", "1"])
    .default("0")
    .transform((val) => val === "1"),

  // AI Model Configuration
  AI_SUMMARY_MODEL: z.string().default("claude-3-haiku-20240307"),
  AI_QA_MODEL: z.string().default("claude-3-haiku-20240307"),
  AI_SYNTHESIS_MODEL: z.string().default("claude-3-5-sonnet-latest"),

  // Token Limits
  MAX_DOCUMENT_TOKENS: z.coerce.number().default(6000),
  MAX_CHUNK_TOKENS: z.coerce.number().default(2800),
  OVERLAP_TOKENS: z.coerce.number().default(300),
  MAX_QA_TOKENS: z.coerce.number().default(1800),

  // File Upload Configuration
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  UPLOAD_DIR: z.string().default("./uploads"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10000),

  // CORS Configuration
  CORS_ORIGIN: z.string().default("*"),
});

type Config = z.infer<typeof configSchema>;

function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      const missingVars = error.issues.map(
        (err: ZodIssue) => `${err.path.join(".")}: ${err.message}`
      );
      throw new Error(
        `Invalid environment configuration:\n${missingVars.join("\n")}`
      );
    }
    throw error;
  }
}

export const config = validateConfig();

// Model pricing per million tokens (update as needed)
export const MODEL_PRICES_PER_MTOK: Record<
  string,
  { input: number; output: number }
> = {
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
};

export function getModelPrice(
  model: string
): { input: number; output: number } | null {
  return MODEL_PRICES_PER_MTOK[model] || null;
}
