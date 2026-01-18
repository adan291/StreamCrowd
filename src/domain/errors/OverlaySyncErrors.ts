/**
 * Overlay Sync Error Types - Domain-specific error classification
 * 
 * This module defines error types and classification for overlay synchronization
 * operations, providing structured error handling and recovery strategies.
 * 
 * All error types extend the base AppError class and follow domain-driven design principles.
 */

import { AppError } from './AppErrors';

/**
 * Enumeration of sync error types for classification
 */
export enum SyncErrorType {
  /** Network connectivity issues */
  CONNECTION = 'connection',
  
  /** Authentication and authorization failures */
  PERMISSION = 'permission',
  
  /** Data validation failures */
  VALIDATION = 'validation',
  
  /** Rate limiting and quota exceeded */
  RATE_LIMIT = 'rate_limit',
  
  /** Schema version mismatches */
  SCHEMA_MISMATCH = 'schema_mismatch',
  
  /** Operation timeout */
  TIMEOUT = 'timeout',
  
  /** Serialization/deserialization errors */
  SERIALIZATION = 'serialization',
  
  /** Resource conflicts (concurrent modifications) */
  CONFLICT = 'conflict',
  
  /** Service unavailable */
  SERVICE_UNAVAILABLE = 'service_unavailable',
  
  /** Unknown or unexpected errors */
  UNKNOWN = 'unknown'
}

/**
 * Error handling strategy configuration
 */
export interface ErrorHandlingStrategy {
  /** Whether the error is retryable */
  isRetryable: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Backoff strategy for retries */
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  
  /** Fallback action when retries are exhausted */
  fallbackAction: 'local_storage' | 'cache' | 'disable_feature' | 'user_notification';
  
  /** Whether to notify the user about this error */
  userNotification: boolean;
  
  /** Whether this error requires re-authentication */
  requiresReauth: boolean;
}

/**
 * Sync error interface with comprehensive context
 */
export interface SyncError {
  /** Error type classification */
  type: SyncErrorType;
  
  /** Specific error code */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Whether this error can be retried */
  isRetryable: boolean;
  
  /** Whether this error requires re-authentication */
  requiresReauth: boolean;
  
  /** Additional error context */
  context?: Record<string, unknown>;
  
  /** Timestamp when the error occurred */
  timestamp: number;
  
  /** Original error that caused this sync error */
  originalError?: Error;
}

/**
 * Base class for all overlay sync errors
 */
export class OverlaySyncError extends AppError {
  public readonly syncErrorType: SyncErrorType;
  public readonly isRetryable: boolean;
  public readonly requiresReauth: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: number;
  public readonly originalError?: Error;

  constructor(
    type: SyncErrorType,
    message: string,
    code: string,
    options: {
      isRetryable?: boolean;
      requiresReauth?: boolean;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(message, code, options.isRetryable ?? true);
    
    this.name = 'OverlaySyncError';
    this.syncErrorType = type;
    this.isRetryable = options.isRetryable ?? true;
    this.requiresReauth = options.requiresReauth ?? false;
    this.context = options.context ?? {};
    this.timestamp = Date.now();
    this.originalError = options.originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OverlaySyncError);
    }
  }

  /**
   * Creates a SyncError interface from this error
   */
  toSyncError(): SyncError {
    return {
      type: this.syncErrorType,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      requiresReauth: this.requiresReauth,
      context: this.context,
      timestamp: this.timestamp,
      originalError: this.originalError,
    };
  }
}

/**
 * Connection-related sync errors
 */
export class ConnectionSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'CONNECTION_ERROR',
    options: {
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.CONNECTION, message, code, {
      isRetryable: true,
      requiresReauth: false,
      ...options,
    });
    
    this.name = 'ConnectionSyncError';
  }
}

/**
 * Permission-related sync errors
 */
export class PermissionSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'PERMISSION_ERROR',
    options: {
      requiresReauth?: boolean;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.PERMISSION, message, code, {
      isRetryable: options.requiresReauth ?? false,
      requiresReauth: options.requiresReauth ?? true,
      ...options,
    });
    
    this.name = 'PermissionSyncError';
  }
}

/**
 * Validation-related sync errors
 */
export class ValidationSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    options: {
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.VALIDATION, message, code, {
      isRetryable: false,
      requiresReauth: false,
      ...options,
    });
    
    this.name = 'ValidationSyncError';
  }
}

/**
 * Rate limit sync errors
 */
export class RateLimitSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'RATE_LIMIT_ERROR',
    options: {
      retryAfter?: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.RATE_LIMIT, message, code, {
      isRetryable: true,
      requiresReauth: false,
      context: {
        retryAfter: options.retryAfter,
        ...options.context,
      },
      originalError: options.originalError,
    });
    
    this.name = 'RateLimitSyncError';
  }
}

/**
 * Schema mismatch sync errors
 */
export class SchemaMismatchSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'SCHEMA_MISMATCH_ERROR',
    options: {
      expectedVersion?: number;
      actualVersion?: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.SCHEMA_MISMATCH, message, code, {
      isRetryable: false,
      requiresReauth: false,
      context: {
        expectedVersion: options.expectedVersion,
        actualVersion: options.actualVersion,
        ...options.context,
      },
      originalError: options.originalError,
    });
    
    this.name = 'SchemaMismatchSyncError';
  }
}

/**
 * Timeout sync errors
 */
export class TimeoutSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'TIMEOUT_ERROR',
    options: {
      timeoutMs?: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.TIMEOUT, message, code, {
      isRetryable: true,
      requiresReauth: false,
      context: {
        timeoutMs: options.timeoutMs,
        ...options.context,
      },
      originalError: options.originalError,
    });
    
    this.name = 'TimeoutSyncError';
  }
}

/**
 * Serialization sync errors
 */
export class SerializationSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'SERIALIZATION_ERROR',
    options: {
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.SERIALIZATION, message, code, {
      isRetryable: false,
      requiresReauth: false,
      ...options,
    });
    
    this.name = 'SerializationSyncError';
  }
}

/**
 * Conflict sync errors (concurrent modifications)
 */
export class ConflictSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'CONFLICT_ERROR',
    options: {
      conflictingVersion?: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.CONFLICT, message, code, {
      isRetryable: true,
      requiresReauth: false,
      context: {
        conflictingVersion: options.conflictingVersion,
        ...options.context,
      },
      originalError: options.originalError,
    });
    
    this.name = 'ConflictSyncError';
  }
}

/**
 * Service unavailable sync errors
 */
export class ServiceUnavailableSyncError extends OverlaySyncError {
  constructor(
    message: string,
    code: string = 'SERVICE_UNAVAILABLE_ERROR',
    options: {
      retryAfter?: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(SyncErrorType.SERVICE_UNAVAILABLE, message, code, {
      isRetryable: true,
      requiresReauth: false,
      context: {
        retryAfter: options.retryAfter,
        ...options.context,
      },
      originalError: options.originalError,
    });
    
    this.name = 'ServiceUnavailableSyncError';
  }
}

/**
 * Error handling strategy configuration for each error type
 */
export const ERROR_HANDLING_STRATEGIES: Record<SyncErrorType, ErrorHandlingStrategy> = {
  [SyncErrorType.CONNECTION]: {
    isRetryable: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    fallbackAction: 'local_storage',
    userNotification: false,
    requiresReauth: false,
  },
  [SyncErrorType.PERMISSION]: {
    isRetryable: false,
    maxRetries: 0,
    backoffStrategy: 'fixed',
    fallbackAction: 'user_notification',
    userNotification: true,
    requiresReauth: true,
  },
  [SyncErrorType.VALIDATION]: {
    isRetryable: false,
    maxRetries: 0,
    backoffStrategy: 'fixed',
    fallbackAction: 'user_notification',
    userNotification: true,
    requiresReauth: false,
  },
  [SyncErrorType.RATE_LIMIT]: {
    isRetryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    fallbackAction: 'cache',
    userNotification: false,
    requiresReauth: false,
  },
  [SyncErrorType.SCHEMA_MISMATCH]: {
    isRetryable: false,
    maxRetries: 0,
    backoffStrategy: 'fixed',
    fallbackAction: 'disable_feature',
    userNotification: true,
    requiresReauth: false,
  },
  [SyncErrorType.TIMEOUT]: {
    isRetryable: true,
    maxRetries: 2,
    backoffStrategy: 'exponential',
    fallbackAction: 'local_storage',
    userNotification: false,
    requiresReauth: false,
  },
  [SyncErrorType.SERIALIZATION]: {
    isRetryable: false,
    maxRetries: 0,
    backoffStrategy: 'fixed',
    fallbackAction: 'user_notification',
    userNotification: true,
    requiresReauth: false,
  },
  [SyncErrorType.CONFLICT]: {
    isRetryable: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    fallbackAction: 'user_notification',
    userNotification: false,
    requiresReauth: false,
  },
  [SyncErrorType.SERVICE_UNAVAILABLE]: {
    isRetryable: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    fallbackAction: 'local_storage',
    userNotification: true,
    requiresReauth: false,
  },
  [SyncErrorType.UNKNOWN]: {
    isRetryable: true,
    maxRetries: 1,
    backoffStrategy: 'fixed',
    fallbackAction: 'user_notification',
    userNotification: true,
    requiresReauth: false,
  },
};

/**
 * Type guards for sync error classification
 */
export function isOverlaySyncError(error: unknown): error is OverlaySyncError {
  return error instanceof OverlaySyncError;
}

export function isConnectionSyncError(error: unknown): error is ConnectionSyncError {
  return error instanceof ConnectionSyncError;
}

export function isPermissionSyncError(error: unknown): error is PermissionSyncError {
  return error instanceof PermissionSyncError;
}

export function isValidationSyncError(error: unknown): error is ValidationSyncError {
  return error instanceof ValidationSyncError;
}

export function isRateLimitSyncError(error: unknown): error is RateLimitSyncError {
  return error instanceof RateLimitSyncError;
}

export function isSchemaMismatchSyncError(error: unknown): error is SchemaMismatchSyncError {
  return error instanceof SchemaMismatchSyncError;
}

export function isTimeoutSyncError(error: unknown): error is TimeoutSyncError {
  return error instanceof TimeoutSyncError;
}

export function isSerializationSyncError(error: unknown): error is SerializationSyncError {
  return error instanceof SerializationSyncError;
}

export function isConflictSyncError(error: unknown): error is ConflictSyncError {
  return error instanceof ConflictSyncError;
}

export function isServiceUnavailableSyncError(error: unknown): error is ServiceUnavailableSyncError {
  return error instanceof ServiceUnavailableSyncError;
}

/**
 * Utility function to get error handling strategy for a sync error
 */
export function getErrorHandlingStrategy(error: OverlaySyncError): ErrorHandlingStrategy {
  return ERROR_HANDLING_STRATEGIES[error.syncErrorType];
}

/**
 * Utility function to create appropriate sync error from generic error
 */
export function createSyncErrorFromGeneric(
  error: Error,
  context?: Record<string, unknown>
): OverlaySyncError {
  const message = error.message || 'Unknown sync error occurred';
  
  // Try to classify the error based on common patterns
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('connection')) {
    return new ConnectionSyncError(message, 'NETWORK_ERROR', { context, originalError: error });
  }
  
  if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('unauthorized')) {
    return new PermissionSyncError(message, 'PERMISSION_DENIED', { context, originalError: error });
  }
  
  if (message.toLowerCase().includes('timeout')) {
    return new TimeoutSyncError(message, 'OPERATION_TIMEOUT', { context, originalError: error });
  }
  
  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('quota')) {
    return new RateLimitSyncError(message, 'RATE_LIMIT_EXCEEDED', { context, originalError: error });
  }
  
  // Default to unknown error type
  return new OverlaySyncError(
    SyncErrorType.UNKNOWN,
    message,
    'UNKNOWN_ERROR',
    {
      isRetryable: true,
      requiresReauth: false,
      context,
      originalError: error,
    }
  );
}

/**
 * Utility function to format error for user display
 */
export function formatErrorForUser(error: OverlaySyncError): string {
  switch (error.syncErrorType) {
    case SyncErrorType.CONNECTION:
      return 'Connection lost. Trying to reconnect...';
    case SyncErrorType.PERMISSION:
      return 'Authentication required. Please sign in again.';
    case SyncErrorType.VALIDATION:
      return 'Invalid data provided. Please check your input.';
    case SyncErrorType.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    case SyncErrorType.SCHEMA_MISMATCH:
      return 'Data format incompatible. Please refresh the page.';
    case SyncErrorType.TIMEOUT:
      return 'Operation timed out. Please try again.';
    case SyncErrorType.SERIALIZATION:
      return 'Data processing error. Please try again.';
    case SyncErrorType.CONFLICT:
      return 'Data was modified by another user. Refreshing...';
    case SyncErrorType.SERVICE_UNAVAILABLE:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}