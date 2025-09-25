import { config } from "../config/index";

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel =
      config.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, meta, error } = entry;
    let logString = `[${timestamp}] ${level}: ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      logString += ` | ${JSON.stringify(meta)}`;
    }

    if (error) {
      logString += `\n${error.stack}`;
    }

    return logString;
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    meta?: Record<string, any>,
    error?: Error
  ): void {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      meta,
      error,
    };

    const formatted = this.formatLog(entry);

    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  error(message: string, meta?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, "ERROR", message, meta, error);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, "WARN", message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, "INFO", message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, "DEBUG", message, meta);
  }
}

export const logger = new Logger();
