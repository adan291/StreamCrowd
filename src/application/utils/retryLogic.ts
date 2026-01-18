/**
 * Retry Logic with Exponential Backoff
 * 
 * Provides utilities for retrying failed operations with exponential backoff.
 * Includes both async function wrapper and React hook for component integration.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.2 - Delay increases: 1s, 2s, 4s (exponential)
 * @requirements 4.6 - Maximum delay cap at 30 seconds
 */

import { useState, useCallback } from 'react';

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Callback invoked on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration
 * - 3 attempts total
 * - Starting at 1 second delay
 * - Doubling each time (1s, 2s, 4s)
 * - Capped at 30 seconds
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  onRetry: () => {}, // No-op by default
};

/**
 * Helper function to delay execution
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay for a given attempt
 * 
 * Formula: initialDelay * (multiplier ^ (attempt - 1))
 * Capped at maxDelay
 * 
 * @param attempt - Current attempt number (1-indexed)
 * @param options - Retry configuration
 * @returns Delay in milliseconds
 * 
 * @example
 * // With defaults: 1000ms initial, 2x multiplier, 30000ms max
 * calculateBackoffDelay(1, options) // 1000ms
 * calculateBackoffDelay(2, options) // 2000ms
 * calculateBackoffDelay(3, options) // 4000ms
 * calculateBackoffDelay(10, options) // 30000ms (capped)
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const exponentialDelay = options.initialDelayMs * 
    Math.pow(options.backoffMultiplier, attempt - 1);
  
  return Math.min(exponentialDelay, options.maxDelayMs);
}

/**
 * Execute an async function with automatic retry and exponential backoff
 * 
 * Retries the function up to maxAttempts times with exponential backoff delay.
 * Each retry delay is calculated as: initialDelay * (multiplier ^ (attempt - 1))
 * The delay is capped at maxDelayMs.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function if successful
 * @throws Last error if all attempts fail
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.2 - Delay increases: 1s, 2s, 4s (exponential)
 * @requirements 4.6 - Maximum delay cap at 30 seconds
 * 
 * @example
 * // Basic usage with defaults
 * const data = await withRetry(() => fetchData());
 * 
 * @example
 * // Custom configuration
 * const data = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this was the last attempt, throw the error
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay for next attempt
      const delayMs = calculateBackoffDelay(attempt, config);

      // Invoke callback if provided
      config.onRetry(attempt, lastError);

      // Wait before retrying
      await delay(delayMs);
    }
  }

  throw lastError!;
}

/**
 * State returned by useRetry hook
 */
export interface UseRetryState<T> {
  /** Whether a retry operation is currently in progress */
  isRetrying: boolean;
  /** Current attempt number (0 if not retrying) */
  attempt: number;
  /** Last error encountered, or null if no error */
  error: Error | null;
  /** Result of successful execution, or undefined */
  result?: T;
}

/**
 * React hook for executing async functions with retry logic
 * 
 * Provides a convenient way to use retry logic in React components.
 * Manages retry state and provides an execute function.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Object with execute function and state
 * 
 * @requirements 4.3 - Add isRetrying state
 * @requirements 4.4 - Add attempt counter
 * 
 * @example
 * function MyComponent() {
 *   const { execute, isRetrying, attempt, error } = useRetry(
 *     () => fetchData(),
 *     { maxAttempts: 3 }
 *   );
 * 
 *   return (
 *     <div>
 *       <button onClick={() => execute()} disabled={isRetrying}>
 *         {isRetrying ? `Retrying (${attempt})...` : 'Fetch Data'}
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | undefined>(undefined);

  const execute = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    setAttempt(0);
    setResult(undefined);

    try {
      const data = await withRetry(fn, {
        ...options,
        onRetry: (att, err) => {
          setAttempt(att);
          options.onRetry?.(att, err);
        },
      });
      
      setResult(data);
      setIsRetrying(false);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setIsRetrying(false);
      throw error;
    }
  }, [fn, options]);

  return { execute, isRetrying, attempt, error, result };
}
