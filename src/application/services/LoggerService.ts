/**
 * LoggerService - Centralized logging service
 * 
 * Provides environment-aware logging that:
 * - Shows debug/info logs only in development
 * - Always shows warnings and errors
 * - Can be extended for remote logging (Sentry, etc.)
 * 
 * @example
 * import { logger } from './LoggerService';
 * logger.debug('[MyService]', 'Debug message');
 * logger.info('[MyService]', 'Info message');
 * logger.warn('[MyService]', 'Warning message');
 * logger.error('[MyService]', 'Error message', error);
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown[];
}

// In-memory log buffer for debugging (last 100 entries)
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Logger singleton with environment-aware logging
 */
export const logger = {
  /**
   * Debug level - only shown in development
   */
  debug: (prefix: string, ...args: unknown[]): void => {
    if (isDev) {
      const entry: LogEntry = {
        level: 'debug',
        timestamp: formatTimestamp(),
        message: `${prefix} ${args.map(a => String(a)).join(' ')}`,
        data: args,
      };
      addToBuffer(entry);
      console.log(`[DEBUG] ${prefix}`, ...args);
    }
  },

  /**
   * Info level - only shown in development
   */
  info: (prefix: string, ...args: unknown[]): void => {
    if (isDev) {
      const entry: LogEntry = {
        level: 'info',
        timestamp: formatTimestamp(),
        message: `${prefix} ${args.map(a => String(a)).join(' ')}`,
        data: args,
      };
      addToBuffer(entry);
      console.info(`[INFO] ${prefix}`, ...args);
    }
  },

  /**
   * Warning level - always shown
   */
  warn: (prefix: string, ...args: unknown[]): void => {
    const entry: LogEntry = {
      level: 'warn',
      timestamp: formatTimestamp(),
      message: `${prefix} ${args.map(a => String(a)).join(' ')}`,
      data: args,
    };
    addToBuffer(entry);
    console.warn(`[WARN] ${prefix}`, ...args);
  },

  /**
   * Error level - always shown
   */
  error: (prefix: string, ...args: unknown[]): void => {
    const entry: LogEntry = {
      level: 'error',
      timestamp: formatTimestamp(),
      message: `${prefix} ${args.map(a => String(a)).join(' ')}`,
      data: args,
    };
    addToBuffer(entry);
    console.error(`[ERROR] ${prefix}`, ...args);
  },

  /**
   * Get recent log entries (useful for debugging)
   */
  getRecentLogs: (count = 50): LogEntry[] => {
    return logBuffer.slice(-count);
  },

  /**
   * Clear log buffer
   */
  clearLogs: (): void => {
    logBuffer.length = 0;
  },

  /**
   * Check if running in development mode
   */
  isDevelopment: (): boolean => isDev,
};

// Export singleton
export default logger;

// Export types
export type { LogLevel, LogEntry };
