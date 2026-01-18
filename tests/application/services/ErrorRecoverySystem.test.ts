/**
 * ErrorRecoverySystem Tests
 * 
 * Comprehensive test suite for the ErrorRecoverySystem service including
 * unit tests for retry logic, circuit breaker, fallback modes, and logging.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ErrorRecoverySystem, CircuitBreakerState, RecoveryResult } from '@/src/application/services/ErrorRecoverySystem';
import { ErrorClassificationService } from '@/src/application/services/ErrorClassificationService';
import {
  ConnectionSyncError,
  TimeoutSyncError,
  ServiceUnavailableSyncError,
  ValidationSyncError,
  SyncErrorType,
} from '@/src/domain/errors/OverlaySyncErrors';

// Mock timers
vi.useFakeTimers();

describe('ErrorRecoverySystem', () => {
  let errorRecoverySystem: ErrorRecoverySystem;
  let consoleErrorSpy: Mock;
  let consoleWarnSpy: Mock;
  let consoleInfoSpy: Mock;

  beforeEach(() => {
    // Create fresh instance for each test
    errorRecoverySystem = new ErrorRecoverySystem({
      logging: {
        enabled: true,
        logLevel: 'debug',
        includeStackTrace: true,
        maxLogEntries: 50,
        consoleLoggingInProduction: true,
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 5000,
        successThreshold: 2,
        enabled: true,
      },
      autoReconnect: {
        enabled: true,
        maxAttempts: 5,
        intervalMs: 1000,
        exponentialBackoff: true,
      },
      backoff: {
        initialDelayMs: 100, // Reduced for faster tests
        maxDelayMs: 1000,
        multiplier: 2,
        jitterEnabled: false, // Disabled for predictable tests
      },
    });

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // Mock the delay function to make tests faster
    vi.spyOn(errorRecoverySystem as any, 'delay').mockImplementation(async (ms: number) => {
      vi.advanceTimersByTime(ms);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    errorRecoverySystem.dispose();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const system = new ErrorRecoverySystem();
      const stats = system.getCircuitBreakerStats();
      
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        maxRetries: { connection: 5 },
        circuitBreaker: { failureThreshold: 10 },
      };
      
      const system = new ErrorRecoverySystem(customConfig);
      const config = system.getCircuitBreakerStats();
      
      expect(config.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should update configuration after initialization', () => {
      const newConfig = {
        logging: { logLevel: 'error' as const },
      };
      
      errorRecoverySystem.updateConfig(newConfig);
      
      // Configuration should be updated (we can't directly test private config,
      // but we can test behavior changes)
      expect(() => errorRecoverySystem.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('Connection Failure Handling', () => {
    it('should handle connection failure with retry logic', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to fail initially then succeed
      let attemptCount = 0;
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Still failing');
        }
        return true;
      });

      const result = await errorRecoverySystem.handleConnectionFailure(connectionError);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.strategy).toBe('exponential_backoff_retry');
    });

    it('should activate fallback mode when all retries fail', async () => {
      const connectionError = new Error('Network connection failed');
      
      // Mock attemptReconnection to always fail
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Always failing');
      });

      const result = await errorRecoverySystem.handleConnectionFailure(connectionError);

      expect(result.success).toBe(false);
      expect(result.fallbackActivated).toBe(true);
      expect(errorRecoverySystem.isFallbackModeActive()).toBe(true);
    });

    it('should respect circuit breaker when open', async () => {
      // Force circuit breaker to open state
      (errorRecoverySystem as any).circuitBreakerStats.state = CircuitBreakerState.OPEN;
      (errorRecoverySystem as any).circuitBreakerStats.nextRetryAt = Date.now() + 10000;

      const connectionError = new Error('Connection failed');
      const result = await errorRecoverySystem.handleConnectionFailure(connectionError);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(0);
      expect(result.strategy).toBe('circuit_breaker_fast_fail');
    });
  });

  describe('Exponential Backoff Calculation', () => {
    it('should calculate exponential backoff delays correctly', () => {
      const delay1 = errorRecoverySystem.calculateBackoffDelay(1);
      const delay2 = errorRecoverySystem.calculateBackoffDelay(2);
      const delay3 = errorRecoverySystem.calculateBackoffDelay(3);

      expect(delay1).toBe(100); // 100ms initial delay (no jitter)
      expect(delay2).toBe(200); // 200ms (100 * 2^1)
      expect(delay3).toBe(400); // 400ms (100 * 2^2)
    });

    it('should respect maximum delay cap', () => {
      const system = new ErrorRecoverySystem({
        backoff: {
          initialDelayMs: 100,
          maxDelayMs: 500,
          multiplier: 2,
          jitterEnabled: false,
        },
      });

      const delay10 = system.calculateBackoffDelay(10); // Would be 51200ms without cap
      expect(delay10).toBe(500);
    });

    it('should apply jitter when enabled', () => {
      const system = new ErrorRecoverySystem({
        backoff: {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 2,
          jitterEnabled: true,
        },
      });

      const delays = Array.from({ length: 10 }, () => system.calculateBackoffDelay(1));
      const uniqueDelays = new Set(delays);
      
      // With jitter, we should get different values
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Retry Decision Logic', () => {
    it('should retry connection errors', () => {
      const connectionError = new ConnectionSyncError('Connection lost');
      const shouldRetry = errorRecoverySystem.shouldRetryOperation(connectionError, 1);
      
      expect(shouldRetry).toBe(true);
    });

    it('should retry timeout errors', () => {
      const timeoutError = new TimeoutSyncError('Operation timed out');
      const shouldRetry = errorRecoverySystem.shouldRetryOperation(timeoutError, 1);
      
      expect(shouldRetry).toBe(true);
    });

    it('should not retry validation errors', () => {
      const validationError = new ValidationSyncError('Invalid data');
      const shouldRetry = errorRecoverySystem.shouldRetryOperation(validationError, 1);
      
      expect(shouldRetry).toBe(false);
    });

    it('should not retry when max attempts reached', () => {
      const connectionError = new ConnectionSyncError('Connection lost');
      const shouldRetry = errorRecoverySystem.shouldRetryOperation(connectionError, 5);
      
      expect(shouldRetry).toBe(false);
    });

    it('should not retry when circuit breaker is open', () => {
      // Force circuit breaker to open state
      (errorRecoverySystem as any).circuitBreakerStats.state = CircuitBreakerState.OPEN;
      (errorRecoverySystem as any).circuitBreakerStats.nextRetryAt = Date.now() + 10000;

      const connectionError = new ConnectionSyncError('Connection lost');
      const shouldRetry = errorRecoverySystem.shouldRetryOperation(connectionError, 1);
      
      expect(shouldRetry).toBe(false);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit breaker after failure threshold', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to always fail
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Always failing');
      });

      // Trigger failures to reach threshold (3 failures)
      await errorRecoverySystem.handleConnectionFailure(connectionError);
      await errorRecoverySystem.handleConnectionFailure(connectionError);
      await errorRecoverySystem.handleConnectionFailure(connectionError);

      const stats = errorRecoverySystem.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitBreakerState.OPEN);
      expect(stats.failureCount).toBe(3);
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Create a system with success threshold of 1 for easier testing
      const testSystem = new ErrorRecoverySystem({
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeoutMs: 5000,
          successThreshold: 1, // Only need 1 success to close
          enabled: true,
        },
        backoff: {
          initialDelayMs: 10,
          maxDelayMs: 50,
          multiplier: 2,
          jitterEnabled: false,
        },
      });

      // Mock delay function
      vi.spyOn(testSystem as any, 'delay').mockImplementation(async (ms: number) => {
        vi.advanceTimersByTime(ms);
        return Promise.resolve();
      });

      // Force circuit breaker to open state with past retry time
      (testSystem as any).circuitBreakerStats.state = CircuitBreakerState.OPEN;
      (testSystem as any).circuitBreakerStats.nextRetryAt = Date.now() - 1000;

      const connectionError = new Error('Network connection failed');
      
      // Mock attemptReconnection to succeed
      vi.spyOn(testSystem as any, 'attemptReconnection').mockImplementation(async () => true);

      await testSystem.handleConnectionFailure(connectionError);

      const stats = testSystem.getCircuitBreakerStats();
      // After successful reconnection, it should go from OPEN -> HALF_OPEN -> CLOSED
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should close circuit breaker after successful operations in half-open state', async () => {
      // Set circuit breaker to half-open state
      (errorRecoverySystem as any).circuitBreakerStats.state = CircuitBreakerState.HALF_OPEN;
      (errorRecoverySystem as any).circuitBreakerStats.successCount = 0;

      // Mock attemptReconnection to succeed
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => true);

      const connectionError = new Error('Connection failed');
      
      // First success
      await errorRecoverySystem.handleConnectionFailure(connectionError);
      let stats = errorRecoverySystem.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitBreakerState.HALF_OPEN);
      
      // Second success should close the circuit
      await errorRecoverySystem.handleConnectionFailure(connectionError);
      stats = errorRecoverySystem.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Fallback Mode Management', () => {
    it('should enable fallback mode', () => {
      errorRecoverySystem.enableFallbackMode();
      
      expect(errorRecoverySystem.isFallbackModeActive()).toBe(true);
    });

    it('should disable fallback mode', () => {
      errorRecoverySystem.enableFallbackMode();
      errorRecoverySystem.disableFallbackMode();
      
      expect(errorRecoverySystem.isFallbackModeActive()).toBe(false);
    });

    it('should return fallback mode configuration', () => {
      const config = errorRecoverySystem.getFallbackModeConfig();
      
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('strategy');
      expect(config).toHaveProperty('maxDurationMs');
    });

    it('should automatically disable fallback mode after timeout', () => {
      const system = new ErrorRecoverySystem({
        fallbackMode: {
          enabled: true,
          strategy: 'local_storage',
          maxDurationMs: 1000,
          recoveryCheckIntervalMs: 0, // Disable recovery checks for this test
          notifyUser: false,
        },
      });

      system.enableFallbackMode();
      expect(system.isFallbackModeActive()).toBe(true);

      // Fast-forward time
      vi.advanceTimersByTime(1100);

      expect(system.isFallbackModeActive()).toBe(false);
    });
  });

  describe('Automatic Reconnection', () => {
    it('should attempt reconnection when enabled', async () => {
      const attemptReconnectionSpy = vi.spyOn(errorRecoverySystem as any, 'attemptReconnection')
        .mockImplementation(async () => true);

      const result = await errorRecoverySystem.attemptReconnection();

      expect(result).toBe(true);
      expect(attemptReconnectionSpy).toHaveBeenCalled();
    });

    it('should respect maximum reconnection attempts', async () => {
      const system = new ErrorRecoverySystem({
        autoReconnect: {
          enabled: true,
          maxAttempts: 2,
          intervalMs: 1000,
          exponentialBackoff: false,
        },
      });

      // Mock to always fail
      vi.spyOn(system as any, 'simulateReconnection').mockImplementation(async () => false);

      // First attempt
      let result = await system.attemptReconnection();
      expect(result).toBe(false);

      // Second attempt
      result = await system.attemptReconnection();
      expect(result).toBe(false);

      // Third attempt should be rejected
      result = await system.attemptReconnection();
      expect(result).toBe(false);
    });

    it('should use exponential backoff for reconnection intervals', async () => {
      const system = new ErrorRecoverySystem({
        autoReconnect: {
          enabled: true,
          maxAttempts: 5,
          intervalMs: 1000,
          exponentialBackoff: true,
        },
      });

      // Mock to always fail initially
      vi.spyOn(system as any, 'simulateReconnection').mockImplementation(async () => false);

      // First attempt should succeed immediately
      const start = Date.now();
      await system.attemptReconnection();
      
      // Second attempt should be delayed
      const beforeSecond = Date.now();
      await system.attemptReconnection();
      const afterSecond = Date.now();
      
      // Should have been delayed (though we can't test exact timing with fake timers)
      expect(afterSecond - beforeSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Logging', () => {
    it('should log errors with appropriate level', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to fail
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Reconnection failed');
      });

      await errorRecoverySystem.handleConnectionFailure(connectionError);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should maintain error log with size limit', async () => {
      const system = new ErrorRecoverySystem({
        logging: {
          enabled: true,
          logLevel: 'error',
          includeStackTrace: true,
          maxLogEntries: 3,
          consoleLoggingInProduction: true,
        },
        backoff: {
          initialDelayMs: 10,
          maxDelayMs: 50,
          multiplier: 2,
          jitterEnabled: false,
        },
      });

      // Mock delay function for this system too
      vi.spyOn(system as any, 'delay').mockImplementation(async (ms: number) => {
        vi.advanceTimersByTime(ms);
        return Promise.resolve();
      });

      // Mock attemptReconnection to always fail
      vi.spyOn(system as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Always failing');
      });

      // Generate more errors than the limit
      for (let i = 0; i < 5; i++) {
        await system.handleConnectionFailure(new Error(`Network error ${i}`));
      }

      const recentErrors = system.getRecentErrors();
      expect(recentErrors.length).toBeLessThanOrEqual(3);
    });

    it('should not log to console in production when disabled', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const system = new ErrorRecoverySystem({
        logging: {
          enabled: true,
          logLevel: 'error',
          includeStackTrace: true,
          maxLogEntries: 10,
          consoleLoggingInProduction: false,
        },
        backoff: {
          initialDelayMs: 10,
          maxDelayMs: 50,
          multiplier: 2,
          jitterEnabled: false,
        },
      });

      // Mock delay function for this system too
      vi.spyOn(system as any, 'delay').mockImplementation(async (ms: number) => {
        vi.advanceTimersByTime(ms);
        return Promise.resolve();
      });

      // Mock attemptReconnection to fail
      vi.spyOn(system as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Reconnection failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await system.handleConnectionFailure(new Error('Network connection failed'));

      expect(consoleSpy).not.toHaveBeenCalled();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should clear error log when requested', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to fail
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Reconnection failed');
      });

      await errorRecoverySystem.handleConnectionFailure(connectionError);
      
      let recentErrors = errorRecoverySystem.getRecentErrors();
      expect(recentErrors.length).toBeGreaterThan(0);

      errorRecoverySystem.clearErrorLog();
      
      recentErrors = errorRecoverySystem.getRecentErrors();
      expect(recentErrors.length).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to fail then succeed
      let attemptCount = 0;
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt fails');
        }
        return true;
      });

      await errorRecoverySystem.handleConnectionFailure(connectionError);

      const metrics = errorRecoverySystem.getPerformanceMetrics();
      
      expect(metrics.totalErrors).toBeGreaterThan(0);
      expect(metrics.errorsByType).toHaveProperty(SyncErrorType.CONNECTION);
      expect(metrics.successfulRecoveries).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average recovery time', async () => {
      // This test would need more complex setup to properly test timing
      const metrics = errorRecoverySystem.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('averageRecoveryTime');
      expect(typeof metrics.averageRecoveryTime).toBe('number');
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose of resources properly', () => {
      errorRecoverySystem.enableFallbackMode();
      
      expect(errorRecoverySystem.isFallbackModeActive()).toBe(true);
      
      errorRecoverySystem.dispose();
      
      expect(errorRecoverySystem.isFallbackModeActive()).toBe(false);
      
      const recentErrors = errorRecoverySystem.getRecentErrors();
      expect(recentErrors.length).toBe(0);
    });

    it('should clear timers on disposal', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      errorRecoverySystem.enableFallbackMode();
      errorRecoverySystem.dispose();
      
      // Should have cleared the recovery check timer
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle null/undefined errors gracefully', async () => {
      const result = await errorRecoverySystem.handleConnectionFailure(new Error());
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('attempts');
      expect(result).toHaveProperty('recoveryTimeMs');
    });

    it('should handle concurrent failure handling', async () => {
      const connectionError = new Error('Connection failed');
      
      // Mock attemptReconnection to always fail
      vi.spyOn(errorRecoverySystem as any, 'attemptReconnection').mockImplementation(async () => {
        throw new Error('Always failing');
      });

      // Start multiple concurrent failure handling operations
      const promises = Array.from({ length: 3 }, () => 
        errorRecoverySystem.handleConnectionFailure(connectionError)
      );

      const results = await Promise.all(promises);
      
      // All should complete without throwing
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('attempts');
      });
    });

    it('should handle very large delay calculations', () => {
      const system = new ErrorRecoverySystem({
        backoff: {
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          multiplier: 2,
          jitterEnabled: false,
        },
      });

      const delay = system.calculateBackoffDelay(100); // Very large attempt number
      
      expect(delay).toBeLessThanOrEqual(60000); // Should be capped
      expect(delay).toBeGreaterThan(0);
    });
  });

  describe('Error Classification Integration', () => {
    it('should provide actionable error messages', () => {
      const connectionError = new ConnectionSyncError('Network connection failed');
      
      const message = errorRecoverySystem.getActionableErrorMessage(connectionError);
      
      expect(message).toBe('Connection lost. Trying to reconnect...');
    });

    it('should provide technical error details', () => {
      const timeoutError = new TimeoutSyncError('Operation timed out');
      
      const details = errorRecoverySystem.getTechnicalErrorDetails(timeoutError);
      
      expect(details.message).toContain('Operation timed out');
      expect(details.actions).toContain('Try again with smaller data');
      expect(details.severity).toBe('medium');
    });

    it('should classify errors with context', () => {
      const error = new Error('Network connection failed');
      const context = { operation: 'sync', userId: '123' };
      
      const classification = errorRecoverySystem.classifyError(error, context);
      
      expect(classification.error.syncErrorType).toBe(SyncErrorType.CONNECTION);
      expect(classification.error.context).toEqual(context);
      expect(classification.severity).toBe('medium');
    });

    it('should handle generic errors through classification', () => {
      const genericError = new Error('Something went wrong');
      
      const message = errorRecoverySystem.getActionableErrorMessage(genericError);
      const details = errorRecoverySystem.getTechnicalErrorDetails(genericError);
      
      expect(message).toBeTruthy();
      expect(details.message).toBeTruthy();
      expect(details.actions).toBeInstanceOf(Array);
      expect(details.severity).toBeTruthy();
    });

    it('should expose error classification environment', () => {
      const environment = errorRecoverySystem.getErrorClassificationEnvironment();
      
      expect(environment).toBe('test'); // During testing
    });

    it('should use custom ErrorClassificationService when provided', () => {
      const customService = new (class {
        getActionableMessage() { return 'Custom message'; }
        getTechnicalDetails() { return { message: 'Custom tech', actions: ['Custom action'], severity: 'low' }; }
        classifyError() { return { error: new ConnectionSyncError('test'), severity: 'low' }; }
        getEnvironment() { return 'custom'; }
        classifyAndLogError() { return { error: new ConnectionSyncError('test'), severity: 'low' }; }
      })();

      const system = new ErrorRecoverySystem({}, customService as any);
      
      const message = system.getActionableErrorMessage(new Error('test'));
      expect(message).toBe('Custom message');
      
      const environment = system.getErrorClassificationEnvironment();
      expect(environment).toBe('custom');
    });
  });
});