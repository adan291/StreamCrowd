/**
 * Retry Logic Infrastructure
 * 
 * Centralized exports for all retry wrappers and utilities.
 * Provides retry logic for API calls, Firebase, Twitch API, and OBS WebSocket.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Firebase calls, Twitch API calls, OBS WebSocket
 */

// Retryable API Client
export {
  RetryableAPIClient,
  type RetryableAPIClientConfig,
  getRetryableAPIClient,
  resetRetryableAPIClient,
} from '../api/RetryableAPIClient';

// Firebase Retry Wrapper
export {
  FirebaseRetryWrapper,
  type FirebaseRetryConfig,
  getFirebaseRetryWrapper,
  resetFirebaseRetryWrapper,
} from '../firebase/FirebaseRetryWrapper';

// OBS Retry Wrapper
export {
  OBSRetryWrapper,
  type OBSRetryConfig,
  getOBSRetryWrapper,
  resetOBSRetryWrapper,
} from '../obs/OBSRetryWrapper';

// Twitch API Retry Wrapper
export {
  TwitchAPIRetryWrapper,
  type TwitchAPIRetryConfig,
  getTwitchAPIRetryWrapper,
  resetTwitchAPIRetryWrapper,
} from '../adapters/TwitchAPIRetryWrapper';

// Core retry logic
export {
  withRetry,
  useRetry,
  calculateBackoffDelay,
  DEFAULT_RETRY_OPTIONS,
  type RetryOptions,
  type UseRetryState,
} from '../../application/utils/retryLogic';
