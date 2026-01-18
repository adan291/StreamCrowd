/**
 * useRetry Hook - Presentation Layer
 * 
 * React hook for executing async functions with automatic retry logic.
 * Wraps the application-layer withRetry function for component integration.
 * 
 * @requirements 4.3 - Add isRetrying state
 * @requirements 4.4 - Add attempt counter
 */

export {
  useRetry,
  type UseRetryState,
  type RetryOptions,
} from '@/src/application/utils/retryLogic';
