import { config } from "../src/config";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.ANTHROPIC_API_KEY = "test-api-key";
process.env.MOCK_AI = "1";
process.env.DATABASE_PATH = ":memory:";
process.env.UPLOAD_DIR = "./test-uploads";

// Mock logger to avoid console output during tests
jest.mock("../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
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

// Mock pdf-parse-new
jest.mock("pdf-parse-new", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    text: "Mock PDF content for testing",
  }),
}));

// Mock fs operations
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from("mock file content")),
}));

// Global test timeout
jest.setTimeout(10000);

// Mock the config module
jest.mock("../src/config", () => ({
  config: {
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    ANTHROPIC_API_KEY: "mock-api-key",
    MOCK_AI: true,
    AI_SUMMARY_MODEL: "mock-summary-model",
    AI_QA_MODEL: "mock-qa-model",
    AI_SYNTHESIS_MODEL: "mock-synthesis-model",
    MAX_DOCUMENT_TOKENS: 6000,
    MAX_CHUNK_TOKENS: 2800,
    OVERLAP_TOKENS: 300,
    MAX_QA_TOKENS: 1800,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    UPLOAD_DIR: "./uploads-test",
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 10000,
    CORS_ORIGIN: "http://localhost:5173",
    PORT: 3001,
  },
  getModelPrice: jest.fn(() => ({ input: 0.01, output: 0.03 })),
}));

// Mock the database module
jest.mock("../src/db", () => {
  const mockDb = {
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
    get: jest.fn(),
    all: jest.fn().mockReturnValue([]),
    exec: jest.fn(),
    transaction: jest.fn(
      (fn) =>
        (...args: any[]) =>
          fn(...args)
    ),
    close: jest.fn(),
  };
  return {
    db: mockDb,
  };
});
