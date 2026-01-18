/**
 * Sentry Integration Module
 * 
 * Provides optional integration with Sentry for error tracking and aggregation.
 * This module handles initialization, configuration, and error reporting to Sentry.
 * 
 * Requirements: 3.4, 8.1, 8.2
 */

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  dsn: string;
  environment: 'development' | 'production' | 'staging';
  tracesSampleRate?: number;
  debug?: boolean;
  maxBreadcrumbs?: number;
  attachStacktrace?: boolean;
}

/**
 * Error aggregation data
 */
export interface ErrorAggregation {
  errorCode: string;
  count: number;
  lastOccurrence: string;
  features: string[];
  messages: string[];
}

/**
 * SentryIntegration - Manages Sentry error tracking
 * 
 * Features:
 * - Optional Sentry initialization for production
 * - Error aggregation and reporting
 * - Breadcrumb tracking
 * - User context management
 * - Error filtering and sampling
 * 
 * @example
 * const sentry = new SentryIntegration();
 * sentry.initialize({ dsn: 'https://...@sentry.io/...', environment: 'production' });
 * sentry.captureException(error, { feature: 'polls' });
 */
class SentryIntegration {
  private isInitialized = false;
  private config: SentryConfig | null = null;
  private errorAggregation: Map<string, ErrorAggregation> = new Map();
  private readonly maxAggregatedErrors = 100;

  /**
   * Initialize Sentry with configuration
   * Only initializes if DSN is provided and running in production
   */
  initialize(config: SentryConfig): void {
    // Only initialize in production or if explicitly enabled
    if (!this.isProduction() && !config.debug) {
      console.log('[Sentry] Skipping initialization - not in production');
      return;
    }

    this.config = config;

    // Check if Sentry is available globally
    if (typeof window === 'undefined' || !(window as any).Sentry) {
      console.warn('[Sentry] Sentry SDK not loaded. Please include Sentry script tag.');
      return;
    }

    try {
      const Sentry = (window as any).Sentry;

      // Initialize Sentry
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate ?? 0.1,
        debug: config.debug ?? false,
        maxBreadcrumbs: config.maxBreadcrumbs ?? 100,
        attachStacktrace: config.attachStacktrace ?? true,
        // Filter out certain errors
        beforeSend: (event: any) => {
          // Don't send errors from browser extensions
          if (event.exception) {
            const error = event.exception.values?.[0];
            if (error?.value?.includes('chrome-extension')) {
              return null;
            }
          }
          return event;
        },
      });

      this.isInitialized = true;
      console.log('[Sentry] Initialized successfully');
    } catch (error) {
      console.error('[Sentry] Initialization failed:', error);
    }
  }

  /**
   * Capture an exception and send to Sentry
   */
  captureException(
    error: Error | string,
    context?: {
      feature?: string;
      userId?: string;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    }
  ): void {
    // Always aggregate errors
    this.aggregateError(error, context?.feature);

    if (!this.isInitialized) {
      return;
    }

    try {
      const Sentry = (window as any).Sentry;

      // Set user context if provided
      if (context?.userId) {
        Sentry.setUser({ id: context.userId });
      }

      // Add tags
      const tags = {
        feature: context?.feature || 'unknown',
        ...context?.tags,
      };

      // Capture the exception
      Sentry.captureException(error, {
        tags,
        extra: context?.extra,
      });
    } catch (err) {
      console.error('[Sentry] Failed to capture exception:', err);
    }
  }

  /**
   * Capture a message and send to Sentry
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: {
      feature?: string;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    }
  ): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const Sentry = (window as any).Sentry;

      const tags = {
        feature: context?.feature || 'unknown',
        ...context?.tags,
      };

      Sentry.captureMessage(message, {
        level,
        tags,
        extra: context?.extra,
      });
    } catch (err) {
      console.error('[Sentry] Failed to capture message:', err);
    }
  }

  /**
   * Add a breadcrumb for tracking user actions
   */
  addBreadcrumb(
    message: string,
    data?: {
      category?: string;
      level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
      extra?: Record<string, unknown>;
    }
  ): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const Sentry = (window as any).Sentry;

      Sentry.addBreadcrumb({
        message,
        category: data?.category || 'user-action',
        level: data?.level || 'info',
        data: data?.extra,
        timestamp: Date.now() / 1000,
      });
    } catch (err) {
      console.error('[Sentry] Failed to add breadcrumb:', err);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string, username?: string): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const Sentry = (window as any).Sentry;

      Sentry.setUser({
        id: userId,
        email,
        username,
      });
    } catch (err) {
      console.error('[Sentry] Failed to set user:', err);
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const Sentry = (window as any).Sentry;
      Sentry.setUser(null);
    } catch (err) {
      console.error('[Sentry] Failed to clear user:', err);
    }
  }

  /**
   * Aggregate errors for reporting
   */
  private aggregateError(error: Error | string, feature?: string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = this.generateErrorCode(errorMessage);

    let aggregation = this.errorAggregation.get(errorCode);

    if (!aggregation) {
      aggregation = {
        errorCode,
        count: 0,
        lastOccurrence: new Date().toISOString(),
        features: [],
        messages: [],
      };
    }

    aggregation.count++;
    aggregation.lastOccurrence = new Date().toISOString();

    if (feature && !aggregation.features.includes(feature)) {
      aggregation.features.push(feature);
    }

    if (!aggregation.messages.includes(errorMessage)) {
      aggregation.messages.push(errorMessage);
    }

    this.errorAggregation.set(errorCode, aggregation);

    // Maintain max size
    if (this.errorAggregation.size > this.maxAggregatedErrors) {
      const firstKey = this.errorAggregation.keys().next().value;
      this.errorAggregation.delete(firstKey);
    }
  }

  /**
   * Generate a unique error code from error message
   */
  private generateErrorCode(message: string): string {
    // Simple hash function for error code
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `ERR_${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  /**
   * Get aggregated error statistics
   */
  getErrorAggregation(): ErrorAggregation[] {
    return Array.from(this.errorAggregation.values()).sort(
      (a, b) => b.count - a.count
    );
  }

  /**
   * Get error aggregation for a specific feature
   */
  getFeatureErrors(feature: string): ErrorAggregation[] {
    return Array.from(this.errorAggregation.values())
      .filter(agg => agg.features.includes(feature))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear error aggregation
   */
  clearAggregation(): void {
    this.errorAggregation.clear();
  }

  /**
   * Check if Sentry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): SentryConfig | null {
    return this.config;
  }

  /**
   * Check if running in production
   */
  private isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

/**
 * Singleton instance of SentryIntegration
 */
export const sentryIntegration = new SentryIntegration();
