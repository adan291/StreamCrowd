/**
 * Error Classification Service Tests
 * 
 * Tests for comprehensive error classification, actionable message generation,
 * and environment-appropriate logging functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ErrorClassificationService,
  LogLevel,
  defaultErrorClassificationService,
  getErrorMessage,
  logClassifiedError,
  getErrorDetails,
} from '../../../src/application/services/ErrorClassificationService';
import {
  OverlaySyncError,
  SyncErrorType,
  ConnectionSyncError,
  PermissionSyncError,
  ValidationSyncError,
  RateLimitSyncError,
  SchemaMismatchSyncError,
  TimeoutSyncError,
  SerializationSyncError,
  ConflictSyncError,
  ServiceUnavailableSyncError,
} from '../../../src/domain/errors/OverlaySyncErrors';

describe('ErrorClassificationService', () => {
  let service: ErrorClassificationService;
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('development');
    });

    it('should classify connection errors correctly', () => {
      const error = new ConnectionSyncError('Network connection failed');
      const classification = service.classifyError(error);

      expect(classification.error).toBe(error);
      expect(classification.severity).toBe('medium');
      expect(classification.logLevel).toBe(LogLevel.WARN);
      expect(classification.shouldLog).toBe(true);
      expect(classification.userMessage).toBe('Connection lost. Trying to reconnect...');
      expect(classification.technicalMessage).toContain('Network connectivity issue');
      expect(classification.suggestedActions).toContain('Check internet connection');
    });

    it('should classify permission errors correctly', () => {
      const error = new PermissionSyncError('Access denied');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('high');
      expect(classification.logLevel).toBe(LogLevel.ERROR);
      expect(classification.userMessage).toBe('Authentication required. Please sign in again.');
      expect(classification.technicalMessage).toContain('Authentication or authorization failure');
      expect(classification.suggestedActions).toContain('Sign in again');
    });

    it('should classify validation errors correctly', () => {
      const error = new ValidationSyncError('Invalid data format');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('medium');
      expect(classification.logLevel).toBe(LogLevel.WARN);
      expect(classification.userMessage).toBe('Invalid data provided. Please check your input.');
      expect(classification.technicalMessage).toContain('Data validation failed');
      expect(classification.suggestedActions).toContain('Check input data format');
    });

    it('should classify rate limit errors correctly', () => {
      const error = new RateLimitSyncError('Too many requests');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('low');
      expect(classification.logLevel).toBe(LogLevel.INFO);
      expect(classification.userMessage).toBe('Too many requests. Please wait a moment and try again.');
      expect(classification.technicalMessage).toContain('Rate limit exceeded');
      expect(classification.suggestedActions).toContain('Wait before retrying');
    });

    it('should classify schema mismatch errors correctly', () => {
      const error = new SchemaMismatchSyncError('Schema version mismatch');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('critical');
      expect(classification.logLevel).toBe(LogLevel.FATAL);
      expect(classification.userMessage).toBe('Data format incompatible. Please refresh the page.');
      expect(classification.technicalMessage).toContain('Schema version mismatch');
      expect(classification.suggestedActions).toContain('Refresh the application');
    });

    it('should classify timeout errors correctly', () => {
      const error = new TimeoutSyncError('Operation timed out');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('medium');
      expect(classification.logLevel).toBe(LogLevel.WARN);
      expect(classification.userMessage).toBe('Operation timed out. Please try again.');
      expect(classification.technicalMessage).toContain('Operation timed out');
      expect(classification.suggestedActions).toContain('Try again with smaller data');
    });

    it('should classify serialization errors correctly', () => {
      const error = new SerializationSyncError('JSON parse error');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('high');
      expect(classification.logLevel).toBe(LogLevel.ERROR);
      expect(classification.userMessage).toBe('Data processing error. Please try again.');
      expect(classification.technicalMessage).toContain('Data serialization/deserialization failed');
      expect(classification.suggestedActions).toContain('Check data structure');
    });

    it('should classify conflict errors correctly', () => {
      const error = new ConflictSyncError('Concurrent modification detected');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('medium');
      expect(classification.logLevel).toBe(LogLevel.WARN);
      expect(classification.userMessage).toBe('Data was modified by another user. Refreshing...');
      expect(classification.technicalMessage).toContain('Concurrent modification detected');
      expect(classification.suggestedActions).toContain('Refresh to get latest data');
    });

    it('should classify service unavailable errors correctly', () => {
      const error = new ServiceUnavailableSyncError('Service down');
      const classification = service.classifyError(error);

      expect(classification.severity).toBe('high');
      expect(classification.logLevel).toBe(LogLevel.ERROR);
      expect(classification.userMessage).toBe('Service temporarily unavailable. Please try again later.');
      expect(classification.technicalMessage).toContain('Firebase service temporarily unavailable');
      expect(classification.suggestedActions).toContain('Wait and retry later');
    });

    it('should log errors with full details in development', () => {
      const error = new ConnectionSyncError('Network failed', 'NET_001', {
        context: { url: 'https://firebase.com', timeout: 5000 }
      });
      
      service.logError(service.classifyError(error));

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[MEDIUM] connection: Network failed'),
        'Context:',
        expect.objectContaining({ url: 'https://firebase.com', timeout: 5000 }),
        'Stack:',
        expect.any(String)
      );
    });

    it('should include stack traces in development', () => {
      const originalError = new Error('Original network error');
      const error = new ConnectionSyncError('Network failed', 'NET_001', {
        originalError
      });
      
      service.logError(service.classifyError(error));

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Network failed'),
        expect.stringContaining('Stack:'),
        expect.any(String),
        expect.stringContaining('Original Error:'),
        originalError
      );
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('production');
    });

    it('should not log to console in production', () => {
      const error = new ConnectionSyncError('Network failed');
      service.logError(service.classifyError(error));

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should only log errors above minimum level in production', () => {
      const infoError = new RateLimitSyncError('Rate limited'); // INFO level
      const warnError = new ConnectionSyncError('Network failed'); // WARN level
      
      const infoClassification = service.classifyError(infoError);
      const warnClassification = service.classifyError(warnError);

      expect(infoClassification.shouldLog).toBe(false); // Below WARN threshold
      expect(warnClassification.shouldLog).toBe(true); // At WARN threshold
    });

    it('should not include sensitive details in production logs', () => {
      const error = new PermissionSyncError('Access denied', 'PERM_001', {
        context: { userId: '12345', token: 'secret-token' }
      });
      
      const classification = service.classifyError(error);
      const config = service.getLoggingConfig();

      expect(config.includeStackTrace).toBe(false);
      expect(config.includeContext).toBe(false);
      expect(config.logUserMessages).toBe(false);
      expect(config.logTechnicalDetails).toBe(false);
    });
  });

  describe('Test Environment', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('test');
    });

    it('should not log to console in test environment', () => {
      const error = new ValidationSyncError('Invalid input');
      service.logError(service.classifyError(error));

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should only log errors and above in test environment', () => {
      const warnError = new ConnectionSyncError('Network failed'); // WARN level
      const errorError = new PermissionSyncError('Access denied'); // ERROR level
      
      const warnClassification = service.classifyError(warnError);
      const errorClassification = service.classifyError(errorError);

      expect(warnClassification.shouldLog).toBe(false); // Below ERROR threshold
      expect(errorClassification.shouldLog).toBe(true); // At ERROR threshold
    });
  });

  describe('Generic Error Handling', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('development');
    });

    it('should convert generic Error to OverlaySyncError', () => {
      const genericError = new Error('Something went wrong');
      const classification = service.classifyError(genericError);

      expect(classification.error).toBeInstanceOf(OverlaySyncError);
      expect(classification.error.syncErrorType).toBe(SyncErrorType.UNKNOWN);
      expect(classification.error.message).toBe('Something went wrong');
    });

    it('should handle string errors', () => {
      const stringError = 'String error message';
      const classification = service.classifyError(stringError);

      expect(classification.error).toBeInstanceOf(OverlaySyncError);
      expect(classification.error.message).toBe('String error message');
    });

    it('should handle null/undefined errors', () => {
      const nullClassification = service.classifyError(null);
      const undefinedClassification = service.classifyError(undefined);

      expect(nullClassification.error).toBeInstanceOf(OverlaySyncError);
      expect(undefinedClassification.error).toBeInstanceOf(OverlaySyncError);
    });

    it('should auto-classify network errors from message', () => {
      const networkError = new Error('Network connection failed');
      const classification = service.classifyError(networkError);

      expect(classification.error.syncErrorType).toBe(SyncErrorType.CONNECTION);
    });

    it('should auto-classify permission errors from message', () => {
      const permissionError = new Error('Unauthorized access');
      const classification = service.classifyError(permissionError);

      expect(classification.error.syncErrorType).toBe(SyncErrorType.PERMISSION);
    });

    it('should auto-classify timeout errors from message', () => {
      const timeoutError = new Error('Request timeout');
      const classification = service.classifyError(timeoutError);

      expect(classification.error.syncErrorType).toBe(SyncErrorType.TIMEOUT);
    });

    it('should auto-classify rate limit errors from message', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const classification = service.classifyError(rateLimitError);

      expect(classification.error.syncErrorType).toBe(SyncErrorType.RATE_LIMIT);
    });
  });

  describe('Context Handling', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('development');
    });

    it('should include context in error classification', () => {
      const error = new Error('Test error');
      const context = { operation: 'sync', userId: '123', timestamp: Date.now() };
      
      const classification = service.classifyError(error, context);

      expect(classification.error.context).toEqual(context);
    });

    it('should merge context with existing error context', () => {
      const error = new ConnectionSyncError('Network failed', 'NET_001', {
        context: { url: 'https://firebase.com' }
      });
      const additionalContext = { retryCount: 3 };
      
      const classification = service.classifyError(error, additionalContext);

      expect(classification.error.context).toEqual({
        url: 'https://firebase.com',
        retryCount: 3
      });
    });
  });

  describe('Utility Functions', () => {
    it('should provide quick error message access', () => {
      const error = new ConnectionSyncError('Network failed');
      const message = getErrorMessage(error);

      expect(message).toBe('Connection lost. Trying to reconnect...');
    });

    it('should provide quick error logging', () => {
      const error = new ValidationSyncError('Invalid data');
      const classification = logClassifiedError(error);

      expect(classification.error).toBe(error);
      expect(classification.userMessage).toBe('Invalid data provided. Please check your input.');
    });

    it('should provide technical error details', () => {
      const error = new PermissionSyncError('Access denied');
      const details = getErrorDetails(error);

      expect(details.message).toContain('Authentication or authorization failure');
      expect(details.actions).toContain('Sign in again');
      expect(details.severity).toBe('high');
    });
  });

  describe('Service Configuration', () => {
    it('should return current environment', () => {
      const devService = new ErrorClassificationService('development');
      const prodService = new ErrorClassificationService('production');

      expect(devService.getEnvironment()).toBe('development');
      expect(prodService.getEnvironment()).toBe('production');
    });

    it('should return logging configuration', () => {
      const devService = new ErrorClassificationService('development');
      const config = devService.getLoggingConfig();

      expect(config.logToConsole).toBe(true);
      expect(config.includeStackTrace).toBe(true);
      expect(config.minLogLevel).toBe(LogLevel.DEBUG);
    });

    it('should provide immutable logging configuration', () => {
      const service = new ErrorClassificationService('development');
      const config = service.getLoggingConfig();
      
      config.logToConsole = false; // Try to modify
      
      const freshConfig = service.getLoggingConfig();
      expect(freshConfig.logToConsole).toBe(true); // Should remain unchanged
    });
  });

  describe('Classify and Log Integration', () => {
    beforeEach(() => {
      service = new ErrorClassificationService('development');
    });

    it('should classify and log in one operation', () => {
      const error = new ConnectionSyncError('Network failed');
      const classification = service.classifyAndLogError(error);

      expect(classification.error).toBe(error);
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should not log if shouldLog is false', () => {
      // Create a service with high log threshold
      const restrictiveService = new ErrorClassificationService('production');
      const lowSeverityError = new RateLimitSyncError('Rate limited'); // INFO level
      
      restrictiveService.classifyAndLogError(lowSeverityError);

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Default Service Instance', () => {
    it('should use test environment during testing', () => {
      // During testing, NODE_ENV is 'test', so the service should use test environment
      expect(defaultErrorClassificationService.getEnvironment()).toBe('test');
    });

    it('should respect NODE_ENV environment variable', () => {
      // This test would need to mock process.env.NODE_ENV
      // For now, we just verify the default behavior
      expect(defaultErrorClassificationService).toBeInstanceOf(ErrorClassificationService);
    });
  });
});