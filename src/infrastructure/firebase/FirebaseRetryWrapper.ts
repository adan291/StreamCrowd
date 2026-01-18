/**
 * Firebase Retry Wrapper
 * 
 * Wraps Firebase operations with automatic retry logic and exponential backoff.
 * Handles Firebase-specific errors and provides consistent retry behavior.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Firebase calls
 */

import { withRetry, RetryOptions } from '../../application/utils/retryLogic';
import { logService } from '../logging/LogService';
import { NetworkError } from '../../domain/errors/AppErrors';

/**
 * Configuration for Firebase retry wrapper
 */
export interface FirebaseRetryConfig {
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
}

/**
 * Default configuration for Firebase retry wrapper
 */
const DEFAULT_CONFIG: Required<FirebaseRetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  logRetries: true,
};

/**
 * Firebase Retry Wrapper
 * 
 * Provides a wrapper for Firebase operations with automatic retry logic.
 * Handles Firebase-specific errors like network timeouts and permission errors.
 */
export class FirebaseRetryWrapper {
  private config: Required<FirebaseRetryConfig>;

  constructor(config: FirebaseRetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a Firebase error is retryable
   * 
   * Retryable errors:
   * - Network errors (NETWORK_ERROR)
   * - Service unavailable (SERVICE_UNAVAILABLE)
   * - Timeout errors (TIMEOUT)
   * - Too many requests (TOO_MANY_REQUESTS)
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';

    // Firebase error codes that are retryable
    const retryableCodes = [
      'network_error',
      'service_unavailable',
      'timeout',
      'too_many_requests',
      'permission_denied', // Sometimes transient
      'unavailable',
      'internal',
      'data_loss',
      'unauthenticated', // Token might be refreshed on retry
    ];

    return retryableCodes.some(c => code.includes(c) || message.includes(c));
  }

  /**
   * Execute a Firebase operation with retry logic
   * 
   * @param operation - Async function that performs Firebase operation
   * @param operationName - Name for logging
   * @returns Result of operation
   * @throws Last error if all retries fail
   * 
   * @requirements 4.1 - Retry up to 3 times with exponential backoff
   * @requirements 4.5 - Add retry to Firebase calls
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase operation'
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
              `Retrying Firebase operation: ${operationName} (attempt ${attempt}): ${error.message}`
            );
          } else {
            logService.error({
              message: `Non-retryable Firebase error in ${operationName}`,
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
   * Execute a Firebase read operation (get, query, etc.)
   * 
   * @param operation - Async function that performs read operation
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async read<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase read'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Execute a Firebase write operation (set, update, delete, etc.)
   * 
   * @param operation - Async function that performs write operation
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async write<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase write'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Execute a Firebase transaction
   * 
   * @param operation - Async function that performs transaction
   * @param operationName - Name for logging
   * @returns Result of operation
   */
  async transaction<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase transaction'
  ): Promise<T> {
    return this.executeWithRetry(operation, operationName);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FirebaseRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<FirebaseRetryConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance of FirebaseRetryWrapper
 */
let instance: FirebaseRetryWrapper | null = null;

/**
 * Get or create the singleton FirebaseRetryWrapper instance
 */
export function getFirebaseRetryWrapper(
  config?: FirebaseRetryConfig
): FirebaseRetryWrapper {
  if (!instance) {
    instance = new FirebaseRetryWrapper(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetFirebaseRetryWrapper(): void {
  instance = null;
}
