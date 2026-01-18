/**
 * OBS WebSocket Retry Wrapper
 * 
 * Wraps OBS WebSocket operations with automatic retry logic and exponential backoff.
 * Handles connection establishment, reconnection, and command execution with retries.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to OBS WebSocket
 */

import { withRetry, RetryOptions } from '../../application/utils/retryLogic';
import { logService } from '../logging/LogService';
import { NetworkError } from '../../domain/errors/AppErrors';

/**
 * Configuration for OBS WebSocket retry wrapper
 */
export interface OBSRetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to log retry attempts (default: true) */
  logRetries?: boolean;
  /** Connection timeout in milliseconds (default: 10000) */
  connectionTimeoutMs?: number;
}

/**
 * Default configuration for OBS WebSocket retry wrapper
 */
const DEFAULT_CONFIG: Required<OBSRetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  logRetries: true,
  connectionTimeoutMs: 10000,
};

/**
 * OBS WebSocket Retry Wrapper
 * 
 * Provides a wrapper for OBS WebSocket operations with automatic retry logic.
 * Handles connection establishment, reconnection, and command execution.
 */
export class OBSRetryWrapper {
  private config: Required<OBSRetryConfig>;

  constructor(config: OBSRetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if an OBS error is retryable
   * 
   * Retryable errors:
   * - Connection refused (network issue)
   * - Timeout
   * - Connection reset
   * - ECONNREFUSED, ECONNRESET, ETIMEDOUT
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';

    // OBS/WebSocket error codes that are retryable
    const retryableCodes = [
      'econnrefused',
      'econnreset',
      'etimedout',
      'ehostunreach',
      'enetunreach',
      'enotfound',
      'timeout',
      'network_error',
      'connection_error',
    ];

    return retryableCodes.some(c => code.includes(c) || message.includes(c));
  }

  /**
   * Execute an OBS operation with retry logic
   * 
   * @param operation - Async function that performs OBS operation
   * @param operationName - Name for logging
   * @returns Result of operation
   * @throws Last error if all retries fail
   * 
   * @requirements 4.1 - Retry up to 3 times with exponential backoff
   * @requirements 4.5 - Add retry to OBS WebSocket
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'OBS operation'
  ): Promise<T> {
    return withRetry(operation, {
      maxAttempts: this.config.maxAttempts,
      initialDelayMs: this.config.initialDelayMs,
      maxDelayMs: this.config.maxDelayMs,
      backoffMultiplier: this.config.backoffMultiplier,
      onRetry: (attempt, error) => {
        if (this.config.logRetries) {
          const isRetryable = this.isRetryableError(error);
          if (isRetryable) {
            logService.warn(
              `Retrying OBS operation: ${operationName} (attempt ${attempt}): ${error.message}`
            );
          } else {
            logService.error({
              message: `Non-retryable OBS error in ${operationName}`,
              stack: error.stack,
              context: { attempt, operationName, errorMessage: error.message },
            });
            throw error; // Don't retry non-retryable errors
          }
        }
      },
    });
  }

  /**
   * Execute an OBS connection operation with retry logic
   * 
   * Connection operations are more critical and may need special handling.
   * 
   * @param operation - Async function that establishes connection
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async connect<T>(
    operation: () => Promise<T>,
    operationName: string = 'OBS connection'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Execute an OBS command with retry logic
   * 
   * Commands are typically idempotent and safe to retry.
   * 
   * @param operation - Async function that executes command
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async command<T>(
    operation: () => Promise<T>,
    operationName: string = 'OBS command'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Execute an OBS query with retry logic
   * 
   * Queries are read-only and safe to retry.
   * 
   * @param operation - Async function that queries OBS
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async query<T>(
    operation: () => Promise<T>,
    operationName: string = 'OBS query'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OBSRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<OBSRetryConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance of OBSRetryWrapper
 */
let instance: OBSRetryWrapper | null = null;

/**
 * Get or create the singleton OBSRetryWrapper instance
 */
export function getOBSRetryWrapper(
  config?: OBSRetryConfig
): OBSRetryWrapper {
  if (!instance) {
    instance = new OBSRetryWrapper(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetOBSRetryWrapper(): void {
  instance = null;
}
