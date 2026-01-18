/**
 * ErrorRecoverySystem - Application service for error handling and recovery
 * 
 * This service manages connection failures, retry logic with exponential backoff,
 * circuit breaker pattern, fallback modes, and environment-appropriate error logging
 * for overlay synchronization operations.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import {
  SyncError,
  SyncErrorType,
  OverlaySyncError,
  ConnectionSyncError,
  TimeoutSyncError,
  ServiceUnavailableSyncError,
  ERROR_HANDLING_STRATEGIES,
  getErrorHandlingStrategy,
  createSyncErrorFromGeneric,
} from '@/src/domain/errors/OverlaySyncErrors';

import { withRetry, RetryOptions, calculateBackoffDelay } from '@/src/application/utils/retryLogic';
import { ErrorClassificationService } from './ErrorClassificationService';

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast, not attempting operations
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

/**
 * Recovery result from error handling operations
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  
  /** Error that occurred during recovery (if any) */
  error?: SyncError;
  
  /** Number of attempts made */
  attempts: number;
  
  /** Total time spent on recovery */
  recoveryTimeMs: number;
  
  /** Whether fallback mode was activated */
  fallbackActivated: boolean;
  
  /** Recovery strategy used */
  strategy: string;
  
  /** Additional context about the recovery */
  context?: Record<string, unknown>;
}

/**
 * Fallback mode configuration
 */
export interface FallbackModeConfig {
  /** Whether fallback mode is enabled */
  enabled: boolean;
  
  /** Fallback strategy to use */
  strategy: 'local_storage' | 'cache' | 'offline_mode' | 'read_only';
  
  /** Maximum time to stay in fallback mode (ms) */
  maxDurationMs: number;
  
  /** Interval to check for service recovery (ms) */
  recoveryCheckIntervalMs: number;
  
  /** Whether to notify users about fallback mode */
  notifyUser: boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  
  /** Time to wait before attempting recovery (ms) */
  recoveryTimeoutMs: number;
  
  /** Number of successful calls needed to close circuit */
  successThreshold: number;
  
  /** Whether circuit breaker is enabled */
  enabled: boolean;
}

/**
 * Error recovery system configuration
 */
export interface ErrorRecoveryConfig {
  /** Maximum retry attempts for different error types */
  maxRetries: {
    connection: number;
    timeout: number;
    serviceUnavailable: number;
    default: number;
  };
  
  /** Exponential backoff configuration */
  backoff: {
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier: number;
    jitterEnabled: boolean;
  };
  
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
  
  /** Fallback mode configuration */
  fallbackMode: FallbackModeConfig;
  
  /** Logging configuration */
  logging: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    includeStackTrace: boolean;
    maxLogEntries: number;
    consoleLoggingInProduction: boolean;
  };
  
  /** Automatic reconnection configuration */
  autoReconnect: {
    enabled: boolean;
    maxAttempts: number;
    intervalMs: number;
    exponentialBackoff: boolean;
  };
}

/**
 * Default error recovery configuration
 */
const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxRetries: {
    connection: 3,
    timeout: 2,
    serviceUnavailable: 3,
    default: 2,
  },
  backoff: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
    jitterEnabled: true,
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000,
    successThreshold: 3,
    enabled: true,
  },
  fallbackMode: {
    enabled: true,
    strategy: 'local_storage',
    maxDurationMs: 300000, // 5 minutes
    recoveryCheckIntervalMs: 30000, // 30 seconds
    notifyUser: true,
  },
  logging: {
    enabled: true,
    logLevel: 'error',
    includeStackTrace: true,
    maxLogEntries: 100,
    consoleLoggingInProduction: false,
  },
  autoReconnect: {
    enabled: true,
    maxAttempts: 10,
    intervalMs: 5000,
    exponentialBackoff: true,
  },
};

/**
 * Log entry for error tracking
 */
interface ErrorLogEntry {
  timestamp: number;
  error: SyncError;
  operation: string;
  recoveryAttempt: number;
  context?: Record<string, unknown>;
}

/**
 * Circuit breaker statistics
 */
interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: number;
  lastSuccessAt?: number;
  nextRetryAt?: number;
}

/**
 * ErrorRecoverySystem service class
 * 
 * Provides comprehensive error handling and recovery capabilities including
 * exponential backoff retry logic, circuit breaker pattern, fallback modes,
 * and environment-appropriate error logging.
 */
export class ErrorRecoverySystem {
  private readonly config: ErrorRecoveryConfig;
  private readonly errorLog: ErrorLogEntry[] = [];
  private readonly circuitBreakerStats: CircuitBreakerStats;
  private readonly errorClassificationService: ErrorClassificationService;
  
  private fallbackModeActive: boolean = false;
  private fallbackModeActivatedAt?: number;
  private recoveryCheckTimer?: NodeJS.Timeout;
  private reconnectionAttempts: number = 0;
  private lastReconnectionAt?: number;

  constructor(
    config: Partial<ErrorRecoveryConfig> = {},
    errorClassificationService?: ErrorClassificationService
  ) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.circuitBreakerStats = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
    };
    
    // Use provided service or create default one based on environment
    this.errorClassificationService = errorClassificationService || 
      new ErrorClassificationService(
        (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'production'
      );
  }

  /**
   * Handles connection failure with retry logic and circuit breaker
   * 
   * @param error - The connection error that occurred
   * @returns Recovery result with success status and metadata
   */
  async handleConnectionFailure(error: Error): Promise<RecoveryResult> {
    const startTime = Date.now();
    const syncError = this.convertToSyncError(error);
    
    this.logError(syncError, 'handleConnectionFailure', 0);

    // Check circuit breaker state
    if (this.isCircuitOpen()) {
      return {
        success: false,
        error: new ConnectionSyncError(
          'Circuit breaker is open - not attempting connection',
          'CIRCUIT_BREAKER_OPEN'
        ).toSyncError(),
        attempts: 0,
        recoveryTimeMs: Date.now() - startTime,
        fallbackActivated: this.activateFallbackIfNeeded(syncError),
        strategy: 'circuit_breaker_fast_fail',
      };
    }

    // Determine retry strategy based on error type
    const strategy = getErrorHandlingStrategy(syncError as OverlaySyncError);
    const maxRetries = this.getMaxRetriesForError(syncError);

    let attempts = 0;
    let lastError = syncError;

    // Attempt recovery with exponential backoff
    for (attempts = 1; attempts <= maxRetries; attempts++) {
      try {
        // Calculate backoff delay with jitter
        const delay = this.calculateBackoffDelay(attempts);
        
        if (delay > 0) {
          await this.delay(delay);
        }

        // Attempt reconnection (this would be implemented by the calling service)
        const reconnectionResult = await this.attemptReconnection();
        
        if (reconnectionResult) {
          // Success - record in circuit breaker and return
          this.recordSuccess();
          this.deactivateFallbackMode();
          
          return {
            success: true,
            attempts,
            recoveryTimeMs: Date.now() - startTime,
            fallbackActivated: false,
            strategy: 'exponential_backoff_retry',
            context: {
              finalDelay: delay,
              circuitBreakerState: this.circuitBreakerStats.state,
            },
          };
        }
      } catch (retryError) {
        lastError = this.convertToSyncError(retryError as Error);
        this.logError(lastError, 'handleConnectionFailure', attempts);
      }
    }

    // All retries failed - record failure and activate fallback
    this.recordFailure();
    const fallbackActivated = this.activateFallbackIfNeeded(lastError);

    return {
      success: false,
      error: lastError,
      attempts,
      recoveryTimeMs: Date.now() - startTime,
      fallbackActivated,
      strategy: 'exponential_backoff_retry_exhausted',
      context: {
        maxRetriesReached: true,
        circuitBreakerState: this.circuitBreakerStats.state,
      },
    };
  }

  /**
   * Attempts automatic reconnection
   * 
   * @returns Promise resolving to true if reconnection successful
   */
  async attemptReconnection(): Promise<boolean> {
    if (!this.config.autoReconnect.enabled) {
      return false;
    }

    const now = Date.now();
    
    // Check if we've exceeded max reconnection attempts
    if (this.reconnectionAttempts >= this.config.autoReconnect.maxAttempts) {
      this.logError(
        new ConnectionSyncError(
          'Maximum reconnection attempts exceeded',
          'MAX_RECONNECTION_ATTEMPTS'
        ).toSyncError(),
        'attemptReconnection',
        this.reconnectionAttempts
      );
      return false;
    }

    // Check if we should wait before attempting reconnection
    if (this.lastReconnectionAt) {
      const timeSinceLastAttempt = now - this.lastReconnectionAt;
      const requiredInterval = this.config.autoReconnect.exponentialBackoff
        ? this.calculateBackoffDelay(this.reconnectionAttempts + 1)
        : this.config.autoReconnect.intervalMs;

      if (timeSinceLastAttempt < requiredInterval) {
        return false;
      }
    }

    this.reconnectionAttempts++;
    this.lastReconnectionAt = now;

    try {
      // This is a placeholder - actual reconnection logic would be implemented
      // by the service that uses this ErrorRecoverySystem
      // For now, we simulate a reconnection attempt
      
      this.logInfo(`Attempting reconnection (attempt ${this.reconnectionAttempts})`);
      
      // Simulate reconnection logic - in real implementation, this would
      // delegate to the sync adapter or connection manager
      const reconnectionSuccessful = await this.simulateReconnection();
      
      if (reconnectionSuccessful) {
        this.reconnectionAttempts = 0;
        this.lastReconnectionAt = undefined;
        this.logInfo('Reconnection successful');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logError(
        this.convertToSyncError(error as Error),
        'attemptReconnection',
        this.reconnectionAttempts
      );
      return false;
    }
  }

  /**
   * Determines if an operation should be retried based on error type and attempt count
   * 
   * @param error - The error that occurred
   * @param attemptCount - Current attempt number
   * @returns True if operation should be retried
   */
  shouldRetryOperation(error: Error, attemptCount: number): boolean {
    const syncError = this.convertToSyncError(error);
    const maxRetries = this.getMaxRetriesForError(syncError);
    
    // Check if we've exceeded max retries
    if (attemptCount >= maxRetries) {
      return false;
    }

    // Check circuit breaker state
    if (this.isCircuitOpen()) {
      return false;
    }

    // Check if error type is retryable
    if (syncError.type === SyncErrorType.VALIDATION || 
        syncError.type === SyncErrorType.SERIALIZATION ||
        syncError.type === SyncErrorType.SCHEMA_MISMATCH) {
      return false;
    }

    return syncError.isRetryable;
  }

  /**
   * Calculates exponential backoff delay with jitter
   * 
   * @param attemptCount - Current attempt number (1-indexed)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attemptCount: number): number {
    const baseDelay = calculateBackoffDelay(attemptCount, {
      maxAttempts: 10, // Not used in calculation
      initialDelayMs: this.config.backoff.initialDelayMs,
      maxDelayMs: this.config.backoff.maxDelayMs,
      backoffMultiplier: this.config.backoff.multiplier,
      onRetry: () => {}, // Not used
    });

    // Add jitter if enabled (±25% random variation)
    if (this.config.backoff.jitterEnabled) {
      const jitterRange = baseDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, Math.floor(baseDelay + jitter));
    }

    return baseDelay;
  }

  /**
   * Enables fallback mode for local operation
   */
  enableFallbackMode(): void {
    if (this.fallbackModeActive) {
      return;
    }

    this.fallbackModeActive = true;
    this.fallbackModeActivatedAt = Date.now();

    this.logInfo(`Fallback mode activated: ${this.config.fallbackMode.strategy}`);

    // Start recovery check timer
    if (this.config.fallbackMode.recoveryCheckIntervalMs > 0) {
      this.startRecoveryCheckTimer();
    }

    // Set timeout to disable fallback mode
    if (this.config.fallbackMode.maxDurationMs > 0) {
      setTimeout(() => {
        this.disableFallbackMode();
      }, this.config.fallbackMode.maxDurationMs);
    }
  }

  /**
   * Disables fallback mode and returns to normal operation
   */
  disableFallbackMode(): void {
    if (!this.fallbackModeActive) {
      return;
    }

    this.fallbackModeActive = false;
    this.fallbackModeActivatedAt = undefined;

    this.logInfo('Fallback mode deactivated');

    // Clear recovery check timer
    this.stopRecoveryCheckTimer();
  }

  /**
   * Checks if fallback mode is currently active
   * 
   * @returns True if fallback mode is active
   */
  isFallbackModeActive(): boolean {
    return this.fallbackModeActive;
  }

  /**
   * Gets current fallback mode configuration
   * 
   * @returns Fallback mode configuration
   */
  getFallbackModeConfig(): FallbackModeConfig {
    return { ...this.config.fallbackMode };
  }

  /**
   * Gets current circuit breaker state and statistics
   * 
   * @returns Circuit breaker statistics
   */
  getCircuitBreakerStats(): CircuitBreakerStats {
    return { ...this.circuitBreakerStats };
  }

  /**
   * Gets recent error log entries
   * 
   * @param limit - Maximum number of entries to return
   * @returns Array of recent error log entries
   */
  getRecentErrors(limit: number = 10): ErrorLogEntry[] {
    return this.errorLog
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clears the error log
   */
  clearErrorLog(): void {
    this.errorLog.length = 0;
  }

  /**
   * Gets performance metrics for the error recovery system
   * 
   * @returns Performance metrics
   */
  getPerformanceMetrics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    averageRecoveryTime: number;
    successfulRecoveries: number;
    fallbackActivations: number;
    circuitBreakerTrips: number;
  } {
    const errorsByType: Record<string, number> = {};
    let totalRecoveryTime = 0;
    let successfulRecoveries = 0;
    let fallbackActivations = 0;

    for (const entry of this.errorLog) {
      const errorType = entry.error.type;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      if (entry.context?.recoverySuccessful) {
        successfulRecoveries++;
        totalRecoveryTime += (entry.context.recoveryTimeMs as number) || 0;
      }

      if (entry.context?.fallbackActivated) {
        fallbackActivations++;
      }
    }

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      averageRecoveryTime: successfulRecoveries > 0 ? totalRecoveryTime / successfulRecoveries : 0,
      successfulRecoveries,
      fallbackActivations,
      circuitBreakerTrips: this.circuitBreakerStats.failureCount,
    };
  }

  /**
   * Updates the error recovery configuration
   * 
   * @param newConfig - Partial configuration to update
   */
  updateConfig(newConfig: Partial<ErrorRecoveryConfig>): void {
    Object.assign(this.config, this.mergeConfig(this.config, newConfig));
  }

  /**
   * Disposes of the error recovery system and cleans up resources
   */
  dispose(): void {
    this.stopRecoveryCheckTimer();
    this.disableFallbackMode();
    this.clearErrorLog();
  }

  // Private helper methods

  /**
   * Merges configuration objects recursively
   */
  private mergeConfig(
    defaultConfig: ErrorRecoveryConfig,
    userConfig: Partial<ErrorRecoveryConfig>
  ): ErrorRecoveryConfig {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[key as keyof ErrorRecoveryConfig] = {
            ...merged[key as keyof ErrorRecoveryConfig],
            ...value,
          } as any;
        } else {
          merged[key as keyof ErrorRecoveryConfig] = value as any;
        }
      }
    }
    
    return merged;
  }

  /**
   * Converts a generic error to a SyncError
   */
  private convertToSyncError(error: Error): SyncError {
    if (error instanceof OverlaySyncError) {
      return error.toSyncError();
    }
    
    return createSyncErrorFromGeneric(error).toSyncError();
  }

  /**
   * Gets maximum retry attempts for a specific error type
   */
  private getMaxRetriesForError(error: SyncError): number {
    switch (error.type) {
      case SyncErrorType.CONNECTION:
        return this.config.maxRetries.connection;
      case SyncErrorType.TIMEOUT:
        return this.config.maxRetries.timeout;
      case SyncErrorType.SERVICE_UNAVAILABLE:
        return this.config.maxRetries.serviceUnavailable;
      default:
        return this.config.maxRetries.default;
    }
  }

  /**
   * Checks if circuit breaker is in open state
   */
  private isCircuitOpen(): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return false;
    }

    if (this.circuitBreakerStats.state === CircuitBreakerState.OPEN) {
      // Check if recovery timeout has passed
      if (this.circuitBreakerStats.nextRetryAt && 
          Date.now() >= this.circuitBreakerStats.nextRetryAt) {
        this.circuitBreakerStats.state = CircuitBreakerState.HALF_OPEN;
        this.circuitBreakerStats.successCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Records a successful operation for circuit breaker
   */
  private recordSuccess(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.circuitBreakerStats.successCount++;
    this.circuitBreakerStats.lastSuccessAt = Date.now();

    if (this.circuitBreakerStats.state === CircuitBreakerState.HALF_OPEN) {
      if (this.circuitBreakerStats.successCount >= this.config.circuitBreaker.successThreshold) {
        this.circuitBreakerStats.state = CircuitBreakerState.CLOSED;
        this.circuitBreakerStats.failureCount = 0;
        this.circuitBreakerStats.nextRetryAt = undefined;
      }
    } else if (this.circuitBreakerStats.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      this.circuitBreakerStats.failureCount = 0;
    }
  }

  /**
   * Records a failed operation for circuit breaker
   */
  private recordFailure(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.circuitBreakerStats.failureCount++;
    this.circuitBreakerStats.lastFailureAt = Date.now();

    if (this.circuitBreakerStats.state === CircuitBreakerState.CLOSED) {
      if (this.circuitBreakerStats.failureCount >= this.config.circuitBreaker.failureThreshold) {
        this.circuitBreakerStats.state = CircuitBreakerState.OPEN;
        this.circuitBreakerStats.nextRetryAt = Date.now() + this.config.circuitBreaker.recoveryTimeoutMs;
        this.logWarn(`Circuit breaker opened after ${this.circuitBreakerStats.failureCount} failures`);
      }
    } else if (this.circuitBreakerStats.state === CircuitBreakerState.HALF_OPEN) {
      // Return to open state on failure during half-open
      this.circuitBreakerStats.state = CircuitBreakerState.OPEN;
      this.circuitBreakerStats.nextRetryAt = Date.now() + this.config.circuitBreaker.recoveryTimeoutMs;
      this.circuitBreakerStats.successCount = 0;
    }
  }

  /**
   * Activates fallback mode if needed based on error type
   */
  private activateFallbackIfNeeded(error: SyncError): boolean {
    if (!this.config.fallbackMode.enabled || this.fallbackModeActive) {
      return false;
    }

    // Activate fallback for connection, timeout, service unavailable, and unknown errors
    if (error.type === SyncErrorType.CONNECTION || 
        error.type === SyncErrorType.TIMEOUT ||
        error.type === SyncErrorType.SERVICE_UNAVAILABLE ||
        error.type === SyncErrorType.UNKNOWN) {
      this.enableFallbackMode();
      return true;
    }

    return false;
  }

  /**
   * Deactivates fallback mode
   */
  private deactivateFallbackMode(): void {
    if (this.fallbackModeActive) {
      this.disableFallbackMode();
    }
  }

  /**
   * Starts the recovery check timer
   */
  private startRecoveryCheckTimer(): void {
    this.stopRecoveryCheckTimer();
    
    this.recoveryCheckTimer = setInterval(() => {
      this.checkForRecovery();
    }, this.config.fallbackMode.recoveryCheckIntervalMs);
  }

  /**
   * Stops the recovery check timer
   */
  private stopRecoveryCheckTimer(): void {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
      this.recoveryCheckTimer = undefined;
    }
  }

  /**
   * Checks if service has recovered and can exit fallback mode
   */
  private async checkForRecovery(): Promise<void> {
    if (!this.fallbackModeActive) {
      return;
    }

    try {
      // Attempt a lightweight health check
      const recovered = await this.attemptReconnection();
      
      if (recovered) {
        this.disableFallbackMode();
        this.logInfo('Service recovered - exiting fallback mode');
      }
    } catch (error) {
      // Recovery check failed - continue in fallback mode
      this.logDebug('Recovery check failed - remaining in fallback mode');
    }
  }

  /**
   * Simulates a reconnection attempt (placeholder for actual implementation)
   */
  private async simulateReconnection(): Promise<boolean> {
    // This is a placeholder - in real implementation, this would
    // delegate to the actual sync adapter or connection manager
    
    // Simulate network delay
    await this.delay(100 + Math.random() * 200);
    
    // Simulate success/failure based on circuit breaker state and random chance
    if (this.circuitBreakerStats.state === CircuitBreakerState.OPEN) {
      return false;
    }
    
    // Higher success rate in half-open state to allow recovery
    const successRate = this.circuitBreakerStats.state === CircuitBreakerState.HALF_OPEN ? 0.7 : 0.5;
    return Math.random() < successRate;
  }

  /**
   * Logs an error with environment-appropriate logging using ErrorClassificationService
   */
  private logError(error: SyncError, operation: string, attempt: number): void {
    const entry: ErrorLogEntry = {
      timestamp: Date.now(),
      error,
      operation,
      recoveryAttempt: attempt,
    };

    this.errorLog.push(entry);

    // Maintain log size limit
    if (this.errorLog.length > this.config.logging.maxLogEntries) {
      this.errorLog.shift();
    }

    // Use ErrorClassificationService for comprehensive error handling
    if (this.config.logging.enabled) {
      const context = {
        operation,
        attempt,
        circuitBreakerState: this.circuitBreakerStats.state,
        fallbackModeActive: this.fallbackModeActive,
      };

      // Classify and log the error using the service
      const classification = this.errorClassificationService.classifyAndLogError(error, context);
      
      // Additional logging for recovery-specific information
      if (this.shouldLogToConsole()) {
        const recoveryMessage = `[ErrorRecovery] ${operation} failed (attempt ${attempt}): ${classification.userMessage}`;
        console.error(recoveryMessage, {
          classification: {
            severity: classification.severity,
            technicalMessage: classification.technicalMessage,
            suggestedActions: classification.suggestedActions,
          },
          context,
        });
      }

      // In production, send to external logging service with classification data
      if (this.isProduction() && classification.severity === 'high' || classification.severity === 'critical') {
        this.sendToExternalLogging({
          ...entry,
          classification,
          context,
        });
      }
    }
  }

  /**
   * Logs a warning message
   */
  private logWarn(message: string): void {
    if (this.config.logging.enabled && this.shouldLogLevel('warn')) {
      if (this.shouldLogToConsole()) {
        console.warn(`[ErrorRecovery] ${message}`);
      }
    }
  }

  /**
   * Logs an info message
   */
  private logInfo(message: string): void {
    if (this.config.logging.enabled && this.shouldLogLevel('info')) {
      if (this.shouldLogToConsole()) {
        console.info(`[ErrorRecovery] ${message}`);
      }
    }
  }

  /**
   * Logs a debug message
   */
  private logDebug(message: string): void {
    if (this.config.logging.enabled && this.shouldLogLevel('debug')) {
      if (this.shouldLogToConsole()) {
        console.debug(`[ErrorRecovery] ${message}`);
      }
    }
  }

  /**
   * Determines if console logging should be used
   */
  private shouldLogToConsole(): boolean {
    return !this.isProduction() || this.config.logging.consoleLoggingInProduction;
  }

  /**
   * Determines if a log level should be logged
   */
  private shouldLogLevel(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const configLevelIndex = levels.indexOf(this.config.logging.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= configLevelIndex;
  }

  /**
   * Checks if running in production environment
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Sends error to external logging service (placeholder)
   */
  private sendToExternalLogging(entry: ErrorLogEntry): void {
    // Placeholder for external logging integration
    // In real implementation, this would send to services like:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - Custom analytics service
    // - Firebase Analytics
    
    // Example structure for external logging:
    // externalLogger.captureException(entry.error.originalError || new Error(entry.error.message), {
    //   tags: {
    //     operation: entry.operation,
    //     errorType: entry.error.type,
    //     recoveryAttempt: entry.recoveryAttempt,
    //   },
    //   extra: {
    //     context: entry.context,
    //     timestamp: entry.timestamp,
    //   },
    // });
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get actionable error message for user display
   * 
   * @param error - The error to get message for
   * @param context - Additional context for error classification
   * @returns User-friendly error message with actionable guidance
   */
  getActionableErrorMessage(error: unknown, context?: Record<string, unknown>): string {
    return this.errorClassificationService.getActionableMessage(error, context);
  }

  /**
   * Get technical error details for developers
   * 
   * @param error - The error to get details for
   * @param context - Additional context for error classification
   * @returns Technical error details with suggested actions
   */
  getTechnicalErrorDetails(error: unknown, context?: Record<string, unknown>): {
    message: string;
    actions: string[];
    severity: string;
  } {
    return this.errorClassificationService.getTechnicalDetails(error, context);
  }

  /**
   * Classify an error and get comprehensive error information
   * 
   * @param error - The error to classify
   * @param context - Additional context for error classification
   * @returns Complete error classification with handling strategy
   */
  classifyError(error: unknown, context?: Record<string, unknown>) {
    return this.errorClassificationService.classifyError(error, context);
  }

  /**
   * Get the current environment of the error classification service
   */
  getErrorClassificationEnvironment(): string {
    return this.errorClassificationService.getEnvironment();
  }
}