/**
 * Error Classification Service
 * 
 * Provides comprehensive error classification, actionable message generation,
 * and environment-appropriate logging for overlay synchronization errors.
 * 
 * This service implements Requirements 5.2 and 2.5 by categorizing errors
 * and providing appropriate logging based on the environment.
 */

import {
  OverlaySyncError,
  SyncErrorType,
  SyncError,
  ErrorHandlingStrategy,
  ERROR_HANDLING_STRATEGIES,
  createSyncErrorFromGeneric,
  formatErrorForUser,
} from '../../domain/errors/OverlaySyncErrors';

/**
 * Environment types for logging configuration
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  /** The classified error */
  error: OverlaySyncError;
  
  /** Error handling strategy */
  strategy: ErrorHandlingStrategy;
  
  /** User-friendly message */
  userMessage: string;
  
  /** Technical message for developers */
  technicalMessage: string;
  
  /** Suggested actions for resolution */
  suggestedActions: string[];
  
  /** Error severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Whether this error should be logged */
  shouldLog: boolean;
  
  /** Log level for this error */
  logLevel: LogLevel;
}

/**
 * Logging configuration per environment
 */
interface LoggingConfig {
  /** Whether to log to console */
  logToConsole: boolean;
  
  /** Whether to include stack traces */
  includeStackTrace: boolean;
  
  /** Whether to include error context */
  includeContext: boolean;
  
  /** Minimum log level to output */
  minLogLevel: LogLevel;
  
  /** Whether to log user-friendly messages */
  logUserMessages: boolean;
  
  /** Whether to log technical details */
  logTechnicalDetails: boolean;
}

/**
 * Environment-specific logging configurations
 */
const LOGGING_CONFIGS: Record<Environment, LoggingConfig> = {
  development: {
    logToConsole: true,
    includeStackTrace: true,
    includeContext: true,
    minLogLevel: LogLevel.DEBUG,
    logUserMessages: true,
    logTechnicalDetails: true,
  },
  production: {
    logToConsole: false,
    includeStackTrace: false,
    includeContext: false,
    minLogLevel: LogLevel.WARN,
    logUserMessages: false,
    logTechnicalDetails: false,
  },
  test: {
    logToConsole: false,
    includeStackTrace: true,
    includeContext: true,
    minLogLevel: LogLevel.ERROR,
    logUserMessages: false,
    logTechnicalDetails: true,
  },
};

/**
 * Error severity mapping based on error type
 */
const ERROR_SEVERITY_MAP: Record<SyncErrorType, 'low' | 'medium' | 'high' | 'critical'> = {
  [SyncErrorType.CONNECTION]: 'medium',
  [SyncErrorType.PERMISSION]: 'high',
  [SyncErrorType.VALIDATION]: 'medium',
  [SyncErrorType.RATE_LIMIT]: 'low',
  [SyncErrorType.SCHEMA_MISMATCH]: 'critical',
  [SyncErrorType.TIMEOUT]: 'medium',
  [SyncErrorType.SERIALIZATION]: 'high',
  [SyncErrorType.CONFLICT]: 'medium',
  [SyncErrorType.SERVICE_UNAVAILABLE]: 'high',
  [SyncErrorType.UNKNOWN]: 'high',
};

/**
 * Actionable error messages and suggested actions
 */
const ERROR_ACTIONS_MAP: Record<SyncErrorType, {
  technicalMessage: string;
  suggestedActions: string[];
}> = {
  [SyncErrorType.CONNECTION]: {
    technicalMessage: 'Network connectivity issue detected. Firebase connection failed.',
    suggestedActions: [
      'Check internet connection',
      'Verify Firebase configuration',
      'Check firewall settings',
      'Try refreshing the page',
    ],
  },
  [SyncErrorType.PERMISSION]: {
    technicalMessage: 'Authentication or authorization failure. User lacks required permissions.',
    suggestedActions: [
      'Sign in again',
      'Check user permissions',
      'Verify Firebase security rules',
      'Contact administrator if issue persists',
    ],
  },
  [SyncErrorType.VALIDATION]: {
    technicalMessage: 'Data validation failed. Input does not match expected schema.',
    suggestedActions: [
      'Check input data format',
      'Verify required fields are provided',
      'Ensure data types match schema',
      'Review validation rules',
    ],
  },
  [SyncErrorType.RATE_LIMIT]: {
    technicalMessage: 'Rate limit exceeded. Too many requests in short time period.',
    suggestedActions: [
      'Wait before retrying',
      'Reduce request frequency',
      'Implement request batching',
      'Check Firebase quotas',
    ],
  },
  [SyncErrorType.SCHEMA_MISMATCH]: {
    technicalMessage: 'Schema version mismatch detected. Data format incompatible.',
    suggestedActions: [
      'Refresh the application',
      'Clear browser cache',
      'Update to latest version',
      'Contact support for migration assistance',
    ],
  },
  [SyncErrorType.TIMEOUT]: {
    technicalMessage: 'Operation timed out. Request took longer than expected.',
    suggestedActions: [
      'Try again with smaller data',
      'Check network speed',
      'Increase timeout settings',
      'Verify Firebase performance',
    ],
  },
  [SyncErrorType.SERIALIZATION]: {
    technicalMessage: 'Data serialization/deserialization failed. Invalid data format.',
    suggestedActions: [
      'Check data structure',
      'Verify JSON format',
      'Review serialization logic',
      'Clear corrupted cache data',
    ],
  },
  [SyncErrorType.CONFLICT]: {
    technicalMessage: 'Concurrent modification detected. Data was changed by another user.',
    suggestedActions: [
      'Refresh to get latest data',
      'Resolve conflicts manually',
      'Implement optimistic locking',
      'Coordinate with other users',
    ],
  },
  [SyncErrorType.SERVICE_UNAVAILABLE]: {
    technicalMessage: 'Firebase service temporarily unavailable. Server-side issue.',
    suggestedActions: [
      'Wait and retry later',
      'Check Firebase status page',
      'Use offline mode if available',
      'Contact Firebase support',
    ],
  },
  [SyncErrorType.UNKNOWN]: {
    technicalMessage: 'Unknown error occurred. Unexpected system behavior.',
    suggestedActions: [
      'Try refreshing the page',
      'Check browser console for details',
      'Report issue with error details',
      'Use fallback functionality',
    ],
  },
};

/**
 * Error Classification Service
 * 
 * Provides comprehensive error classification and environment-appropriate logging
 */
export class ErrorClassificationService {
  private readonly environment: Environment;
  private readonly loggingConfig: LoggingConfig;
  private readonly loggers: Map<string, (message: string, ...args: any[]) => void>;

  constructor(environment: Environment = 'production') {
    this.environment = environment;
    this.loggingConfig = LOGGING_CONFIGS[environment];
    this.loggers = new Map();
    
    this.initializeLoggers();
  }

  /**
   * Initialize logging functions based on environment
   */
  private initializeLoggers(): void {
    if (this.loggingConfig.logToConsole) {
      // Development/test environment - use console
      this.loggers.set(LogLevel.DEBUG, console.debug.bind(console));
      this.loggers.set(LogLevel.INFO, console.info.bind(console));
      this.loggers.set(LogLevel.WARN, console.warn.bind(console));
      this.loggers.set(LogLevel.ERROR, console.error.bind(console));
      this.loggers.set(LogLevel.FATAL, console.error.bind(console));
    } else {
      // Production environment - use external logging service or no-op
      const noOp = () => {};
      this.loggers.set(LogLevel.DEBUG, noOp);
      this.loggers.set(LogLevel.INFO, noOp);
      this.loggers.set(LogLevel.WARN, this.logToExternalService.bind(this, LogLevel.WARN));
      this.loggers.set(LogLevel.ERROR, this.logToExternalService.bind(this, LogLevel.ERROR));
      this.loggers.set(LogLevel.FATAL, this.logToExternalService.bind(this, LogLevel.FATAL));
    }
  }

  /**
   * Log to external service (placeholder for production logging)
   */
  private logToExternalService(level: LogLevel, message: string, ...args: any[]): void {
    // In production, this would integrate with services like:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - DataDog for monitoring
    // - Custom analytics service
    
    // For now, we'll use a structured approach that can be easily integrated
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      args: args.length > 0 ? args : undefined,
    };

    // In a real implementation, this would send to external service
    // Example: sendToSentry(logEntry) or sendToDataDog(logEntry)
    
    // For development purposes, we can still log to console with a prefix
    if (this.environment === 'development') {
      console.log(`[EXTERNAL_LOG]`, logEntry);
    }
  }

  /**
   * Classify an error and generate comprehensive error information
   */
  classifyError(error: unknown, context?: Record<string, unknown>): ErrorClassification {
    // Convert to OverlaySyncError if needed
    const syncError = this.ensureOverlaySyncError(error, context);
    
    // Get error handling strategy
    const strategy = ERROR_HANDLING_STRATEGIES[syncError.syncErrorType];
    
    // Get error severity
    const severity = ERROR_SEVERITY_MAP[syncError.syncErrorType];
    
    // Get actionable messages
    const actionInfo = ERROR_ACTIONS_MAP[syncError.syncErrorType];
    
    // Generate user-friendly message
    const userMessage = formatErrorForUser(syncError);
    
    // Determine logging requirements
    const logLevel = this.determineLogLevel(syncError, severity);
    const shouldLog = this.shouldLogError(logLevel);

    return {
      error: syncError,
      strategy,
      userMessage,
      technicalMessage: actionInfo.technicalMessage,
      suggestedActions: actionInfo.suggestedActions,
      severity,
      shouldLog,
      logLevel,
    };
  }

  /**
   * Log an error classification with environment-appropriate details
   */
  logError(classification: ErrorClassification): void {
    if (!classification.shouldLog) {
      return;
    }

    const logger = this.loggers.get(classification.logLevel);
    if (!logger) {
      return;
    }

    const logData = this.buildLogData(classification);
    
    // Log with appropriate level
    logger(logData.message, ...(logData.args || []));
  }

  /**
   * Classify and log an error in one operation
   */
  classifyAndLogError(error: unknown, context?: Record<string, unknown>): ErrorClassification {
    const classification = this.classifyError(error, context);
    this.logError(classification);
    return classification;
  }

  /**
   * Get actionable error message for user display
   */
  getActionableMessage(error: unknown, context?: Record<string, unknown>): string {
    const classification = this.classifyError(error, context);
    return classification.userMessage;
  }

  /**
   * Get technical error details for developers
   */
  getTechnicalDetails(error: unknown, context?: Record<string, unknown>): {
    message: string;
    actions: string[];
    severity: string;
  } {
    const classification = this.classifyError(error, context);
    return {
      message: classification.technicalMessage,
      actions: classification.suggestedActions,
      severity: classification.severity,
    };
  }

  /**
   * Ensure error is an OverlaySyncError
   */
  private ensureOverlaySyncError(error: unknown, context?: Record<string, unknown>): OverlaySyncError {
    if (error instanceof OverlaySyncError) {
      // If additional context is provided, create a new error with merged context
      if (context && Object.keys(context).length > 0) {
        const mergedContext = { ...error.context, ...context };
        return new OverlaySyncError(
          error.syncErrorType,
          error.message,
          error.code,
          {
            isRetryable: error.isRetryable,
            requiresReauth: error.requiresReauth,
            context: mergedContext,
            originalError: error.originalError,
          }
        );
      }
      return error;
    }

    if (error instanceof Error) {
      return createSyncErrorFromGeneric(error, context);
    }

    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return createSyncErrorFromGeneric(new Error(message), context);
  }

  /**
   * Determine appropriate log level based on error and severity
   */
  private determineLogLevel(error: OverlaySyncError, severity: string): LogLevel {
    switch (severity) {
      case 'critical':
        return LogLevel.FATAL;
      case 'high':
        return LogLevel.ERROR;
      case 'medium':
        return LogLevel.WARN;
      case 'low':
        return LogLevel.INFO;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Check if error should be logged based on configuration
   */
  private shouldLogError(logLevel: LogLevel): boolean {
    const logLevelOrder = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4,
    };

    return logLevelOrder[logLevel] >= logLevelOrder[this.loggingConfig.minLogLevel];
  }

  /**
   * Build log data based on environment configuration
   */
  private buildLogData(classification: ErrorClassification): {
    message: string;
    args?: any[];
  } {
    const { error, userMessage, technicalMessage, suggestedActions, severity } = classification;
    
    let message = `[${severity.toUpperCase()}] ${error.syncErrorType}: ${error.message}`;
    const args: any[] = [];

    if (this.loggingConfig.logUserMessages) {
      message += `\nUser Message: ${userMessage}`;
    }

    if (this.loggingConfig.logTechnicalDetails) {
      message += `\nTechnical: ${technicalMessage}`;
      message += `\nSuggested Actions: ${suggestedActions.join(', ')}`;
    }

    if (this.loggingConfig.includeContext && Object.keys(error.context).length > 0) {
      args.push('Context:', error.context);
    }

    if (this.loggingConfig.includeStackTrace && error.stack) {
      args.push('Stack:', error.stack);
    }

    // Add original error if available
    if (error.originalError && this.loggingConfig.includeStackTrace) {
      args.push('Original Error:', error.originalError);
    }

    return { message, args: args.length > 0 ? args : undefined };
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Get current logging configuration
   */
  getLoggingConfig(): LoggingConfig {
    return { ...this.loggingConfig };
  }
}

/**
 * Default error classification service instance
 */
export const defaultErrorClassificationService = new ErrorClassificationService(
  (process.env.NODE_ENV as Environment) || 'production'
);

/**
 * Utility function to quickly classify and get user message
 */
export function getErrorMessage(error: unknown, context?: Record<string, unknown>): string {
  return defaultErrorClassificationService.getActionableMessage(error, context);
}

/**
 * Utility function to quickly classify and log error
 */
export function logClassifiedError(error: unknown, context?: Record<string, unknown>): ErrorClassification {
  return defaultErrorClassificationService.classifyAndLogError(error, context);
}

/**
 * Utility function to get technical error details
 */
export function getErrorDetails(error: unknown, context?: Record<string, unknown>): {
  message: string;
  actions: string[];
  severity: string;
} {
  return defaultErrorClassificationService.getTechnicalDetails(error, context);
}