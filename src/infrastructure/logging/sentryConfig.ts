/**
 * Sentry Configuration
 * 
 * Centralized configuration for Sentry error tracking.
 * This file contains environment-specific settings and initialization logic.
 * 
 * Requirements: 3.4, 8.1, 8.2
 */

import { logService } from './LogService';

/**
 * Initialize Sentry based on environment
 * 
 * In production, Sentry will be initialized with the DSN from environment variables.
 * In development, Sentry can be initialized for testing purposes if DEBUG_SENTRY is set.
 * 
 * @example
 * initializeSentry();
 */
export function initializeSentry(): void {
  // Get Sentry DSN from environment
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const debugSentry = import.meta.env.VITE_DEBUG_SENTRY === 'true';

  // Only initialize if DSN is provided
  if (!sentryDsn) {
    if (debugSentry) {
      console.log('[Sentry] DSN not configured. Set VITE_SENTRY_DSN to enable Sentry.');
    }
    return;
  }

  // Determine environment
  const environment = import.meta.env.PROD ? 'production' : 'development';

  // Initialize Sentry through LogService
  logService.initializeSentry(sentryDsn, environment);

  console.log(`[Sentry] Initialized for ${environment} environment`);
}

/**
 * Set up Sentry user context
 * 
 * Call this after user authentication to track errors by user.
 * 
 * @param userId - User ID
 * @param email - User email (optional)
 * @param username - Username (optional)
 * 
 * @example
 * setSentryUser('user123', 'user@example.com', 'username');
 */
export function setSentryUser(userId: string, email?: string, username?: string): void {
  logService.setUser(userId, email, username);
}

/**
 * Clear Sentry user context
 * 
 * Call this on user logout.
 * 
 * @example
 * clearSentryUser();
 */
export function clearSentryUser(): void {
  logService.clearUser();
}

/**
 * Track user action in Sentry breadcrumbs
 * 
 * @param action - Action description
 * @param category - Action category (default: 'user-action')
 * 
 * @example
 * trackUserAction('Submitted poll', 'poll-action');
 */
export function trackUserAction(action: string, category: string = 'user-action'): void {
  logService.addBreadcrumb(action, category);
}

/**
 * Get error statistics from Sentry
 * 
 * @returns Array of aggregated errors
 * 
 * @example
 * const stats = getErrorStatistics();
 */
export function getErrorStatistics() {
  return logService.getErrorStats();
}

/**
 * Get errors for a specific feature
 * 
 * @param feature - Feature name
 * @returns Array of errors for the feature
 * 
 * @example
 * const pollErrors = getFeatureErrorStatistics('polls');
 */
export function getFeatureErrorStatistics(feature: string) {
  return logService.getFeatureErrors(feature);
}

/**
 * Check if Sentry is ready
 * 
 * @returns True if Sentry is initialized and ready
 * 
 * @example
 * if (isSentryReady()) {
 *   // Sentry is available
 * }
 */
export function isSentryReady(): boolean {
  return logService.isSentryReady();
}
