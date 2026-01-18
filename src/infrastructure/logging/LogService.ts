/**
 * Centralized Logging Service
 * 
 * Provides structured logging with support for multiple log levels,
 * console output with colors for development, and structured JSON for production.
 * Logs are stored in memory with a configurable maximum limit.
 * Integrates with Sentry for external error tracking in production.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2
 */

import { sentryIntegration } from './SentryIntegration';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Represents a single log entry with metadata
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  feature?: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
}

/**
 * Color codes for console output in development
 */
const CONSOLE_COLORS = {
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[34m',     // Blue
  warn: '\x1b[33m',     // Yellow
  error: '\x1b[31m',    // Red
  reset: '\x1b[0m',     // Reset
  bold: '\x1b[1m',      // Bold
};

/**
 * LogService - Centralized logging for the application
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Console output with colors for development
 * - Structured JSON output for production
 * - In-memory log storage with configurable limit
 * - Optional external service integration (Sentry)
 * 
 * @example
 * logService.info('User logged in', { userId: '123' });
 * logService.error({ message: 'API call failed', feature: 'polls', stack: error.stack });
 * const logs = logService.getLogs('error');
 * const exported = logService.exportLogs();
 */
class LogService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  /**
   * Internal method to create and store a log entry
   */
  private log(level: LogLevel, data: Omit<LogEntry, 'level' | 'timestamp'>): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output for development
    if (this.isDevelopment()) {
      this.logToConsole(entry);
    }

    // Send to external service for production errors
    if (this.isProduction() && level === 'error') {
      this.sendToExternalService(entry);
    }
  }

  /**
   * Format and output log to console with colors
   */
  private logToConsole(entry: LogEntry): void {
    const color = CONSOLE_COLORS[entry.level];
    const reset = CONSOLE_COLORS.reset;
    const bold = CONSOLE_COLORS.bold;

    const timestamp = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp}`;
    const feature = entry.feature ? ` ${bold}(${entry.feature})${reset}` : '';
    const message = `${entry.message}`;

    console.log(`${timestamp}${feature} ${message}`);

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(`${color}Context:${reset}`, entry.context);
    }

    if (entry.stack) {
      console.log(`${color}Stack:${reset}`, entry.stack);
    }

    if (entry.componentStack) {
      console.log(`${color}Component Stack:${reset}`, entry.componentStack);
    }
  }

  /**
   * Send error to external service (e.g., Sentry)
   */
  private sendToExternalService(entry: LogEntry): void {
    // Always aggregate errors through Sentry integration
    sentryIntegration.captureException(new Error(entry.message), {
      feature: entry.feature,
      extra: {
        ...entry.context,
        componentStack: entry.componentStack,
        stack: entry.stack,
      },
      tags: {
        level: entry.level,
      },
    });
  }

  /**
   * Check if running in development mode
   */
  private isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  /**
   * Check if running in production mode
   */
  private isProduction(): boolean {
    return import.meta.env.PROD;
  }

  /**
   * Log a debug message
   * 
   * @param message - The debug message
   * @param context - Optional context object
   * 
   * @example
   * logService.debug('Component mounted', { componentName: 'PollCreator' });
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', { message, context });
  }

  /**
   * Log an info message
   * 
   * @param message - The info message
   * @param context - Optional context object
   * 
   * @example
   * logService.info('User action completed', { action: 'vote_submitted' });
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', { message, context });
  }

  /**
   * Log a warning message
   * 
   * @param message - The warning message
   * @param context - Optional context object
   * 
   * @example
   * logService.warn('API response slow', { duration: 5000 });
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', { message, context });
  }

  /**
   * Log an error with full details
   * 
   * @param data - Error data including message, feature, stack, etc.
   * 
   * @example
   * logService.error({
   *   message: 'API call failed',
   *   feature: 'polls',
   *   stack: error.stack,
   *   context: { endpoint: '/api/polls' }
   * });
   */
  error(data: Omit<LogEntry, 'level' | 'timestamp'>): void {
    this.log('error', data);
  }

  /**
   * Get all logs or filter by level
   * 
   * @param level - Optional log level to filter by
   * @returns Array of log entries
   * 
   * @example
   * const allLogs = logService.getLogs();
   * const errors = logService.getLogs('error');
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Export all logs as formatted JSON string
   * 
   * @returns JSON string representation of all logs
   * 
   * @example
   * const exported = logService.exportLogs();
   * console.log(exported);
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all stored logs
   * 
   * @example
   * logService.clearLogs();
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get the current number of stored logs
   * 
   * @returns Number of logs currently stored
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Get the maximum number of logs that can be stored
   * 
   * @returns Maximum log limit
   */
  getMaxLogs(): number {
    return this.maxLogs;
  }

  /**
   * Initialize Sentry integration for error tracking
   * 
   * @param dsn - Sentry DSN (Data Source Name)
   * @param environment - Environment (development, staging, production)
   * 
   * @example
   * logService.initializeSentry('https://...@sentry.io/...', 'production');
   */
  initializeSentry(dsn: string, environment: 'development' | 'staging' | 'production' = 'production'): void {
    sentryIntegration.initialize({
      dsn,
      environment,
      tracesSampleRate: 0.1,
      debug: import.meta.env.DEV,
      attachStacktrace: true,
    });
  }

  /**
   * Add a breadcrumb for tracking user actions in Sentry
   * 
   * @param message - Breadcrumb message
   * @param category - Category of the action
   * 
   * @example
   * logService.addBreadcrumb('User clicked submit', 'user-action');
   */
  addBreadcrumb(message: string, category: string = 'user-action'): void {
    sentryIntegration.addBreadcrumb(message, { category });
  }

  /**
   * Set user context for error tracking
   * 
   * @param userId - User ID
   * @param email - User email (optional)
   * @param username - Username (optional)
   * 
   * @example
   * logService.setUser('user123', 'user@example.com', 'username');
   */
  setUser(userId: string, email?: string, username?: string): void {
    sentryIntegration.setUser(userId, email, username);
  }

  /**
   * Clear user context
   * 
   * @example
   * logService.clearUser();
   */
  clearUser(): void {
    sentryIntegration.clearUser();
  }

  /**
   * Get error aggregation statistics
   * 
   * @returns Array of aggregated errors sorted by frequency
   * 
   * @example
   * const stats = logService.getErrorStats();
   */
  getErrorStats() {
    return sentryIntegration.getErrorAggregation();
  }

  /**
   * Get errors for a specific feature
   * 
   * @param feature - Feature name
   * @returns Array of errors for the feature
   * 
   * @example
   * const pollErrors = logService.getFeatureErrors('polls');
   */
  getFeatureErrors(feature: string) {
    return sentryIntegration.getFeatureErrors(feature);
  }

  /**
   * Check if Sentry is initialized
   * 
   * @returns True if Sentry is ready
   */
  isSentryReady(): boolean {
    return sentryIntegration.isReady();
  }
}

/**
 * Singleton instance of LogService
 */
export const logService = new LogService();
