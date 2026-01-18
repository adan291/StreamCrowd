/**
 * Retryable API Client
 * 
 * Wraps HTTP requests with automatic retry logic and exponential backoff.
 * Provides a centralized way to make API calls with consistent retry behavior.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Firebase calls, Twitch API calls, OBS WebSocket
 */

import { withRetry, RetryOptions } from '../../application/utils/retryLogic';
import { logService } from '../logging/LogService';
import { NetworkError } from '../../domain/errors/AppErrors';

/**
 * Configuration for retryable API client
 */
export interface RetryableAPIClientConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to retry on specific status codes (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Whether to log retry attempts (default: true) */
  logRetries?: boolean;
}

/**
 * Default configuration for retryable API client
 */
const DEFAULT_CONFIG: Required<RetryableAPIClientConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  logRetries: true,
};

/**
 * Retryable API Client
 * 
 * Provides methods for making HTTP requests with automatic retry logic.
 * Handles both fetch-based requests and custom async operations.
 */
export class RetryableAPIClient {
  private config: Required<RetryableAPIClientConfig>;

  constructor(config: RetryableAPIClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.config.retryableStatusCodes.includes(status);
  }

  /**
   * Make a GET request with retry logic
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response data
   * @throws NetworkError if all retries fail
   * 
   * @requirements 4.1 - Retry up to 3 times with exponential backoff
   * @requirements 4.5 - Add retry to API calls
   */
  async get<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.fetchWithRetry<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request with retry logic
   * 
   * @param url - URL to fetch
   * @param body - Request body
   * @param options - Fetch options
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async post<T>(
    url: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    return this.fetchWithRetry<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Make a PUT request with retry logic
   * 
   * @param url - URL to fetch
   * @param body - Request body
   * @param options - Fetch options
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async put<T>(
    url: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    return this.fetchWithRetry<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Make a DELETE request with retry logic
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async delete<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.fetchWithRetry<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Execute an async operation with retry logic
   * 
   * Useful for non-HTTP operations that need retry logic.
   * 
   * @param operation - Async function to execute
   * @param operationName - Name for logging
   * @returns Result of operation
   * @throws Last error if all retries fail
   * 
   * @requirements 4.1 - Retry up to 3 times with exponential backoff
   * @requirements 4.5 - Add retry to Firebase calls, OBS WebSocket
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    return withRetry(operation, {
      maxAttempts: this.config.maxAttempts,
      initialDelayMs: this.config.initialDelayMs,
      maxDelayMs: this.config.maxDelayMs,
      backoffMultiplier: this.config.backoffMultiplier,
      onRetry: (attempt, error) => {
        if (this.config.logRetries) {
          logService.warn(`Retrying ${operationName} (attempt ${attempt}): ${error.message}`);
        }
      },
    });
  }

  /**
   * Internal method to fetch with retry logic
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          // Non-retryable error - throw immediately without retrying
          if (!this.isRetryableStatus(response.status)) {
            const errorText = await response.text();
            throw new NetworkError(
              `HTTP ${response.status}: ${errorText}`,
              response.status
            );
          }

          // Retryable error - throw to trigger retry
          throw new NetworkError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        try {
          return await response.json() as T;
        } catch (error) {
          throw new NetworkError(
            `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } catch (error) {
        lastError = error as Error;

        // Check if this is a retryable error
        const isRetryable = error instanceof NetworkError && 
          this.isRetryableStatus(error.statusCode || 0);

        // If this was the last attempt or error is not retryable, throw the error
        if (attempt === this.config.maxAttempts || !isRetryable) {
          throw lastError;
        }

        // Calculate delay for next attempt
        const delayMs = Math.min(
          this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelayMs
        );

        // Log retry if enabled
        if (this.config.logRetries) {
          logService.warn(
            `Retrying ${options.method || 'GET'} ${url} (attempt ${attempt}): ${lastError.message}`
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError!;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryableAPIClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<RetryableAPIClientConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance of RetryableAPIClient
 */
let instance: RetryableAPIClient | null = null;

/**
 * Get or create the singleton RetryableAPIClient instance
 */
export function getRetryableAPIClient(
  config?: RetryableAPIClientConfig
): RetryableAPIClient {
  if (!instance) {
    instance = new RetryableAPIClient(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRetryableAPIClient(): void {
  instance = null;
}
