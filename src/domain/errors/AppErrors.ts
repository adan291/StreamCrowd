/**
 * Application Error Types
 * 
 * Custom error classes for domain-specific error handling.
 * Each error type extends the native Error class with proper inheritance.
 */

/**
 * AppError - Base error class for all application errors
 * 
 * Provides common error handling with error codes and recovery information.
 * 
 * @example
 * throw new AppError('Operation failed', 'OP_FAILED', true);
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * ValidationError - Thrown when input validation fails
 * 
 * @example
 * throw new ValidationError('Invalid email format', 'email');
 */
export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
    
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 * 
 * @example
 * throw new AuthenticationError('Invalid credentials');
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', true);
    this.name = 'AuthenticationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * NetworkError - Thrown when network/API requests fail
 * 
 * @example
 * throw new NetworkError('Request timeout', 408);
 */
export class NetworkError extends AppError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'NETWORK_ERROR', true);
    this.name = 'NetworkError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * UnexpectedError - Thrown for unexpected/unrecoverable errors
 * 
 * @example
 * throw new UnexpectedError('An unexpected error occurred');
 */
export class UnexpectedError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(message, 'UNEXPECTED_ERROR', false);
    this.name = 'UnexpectedError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnexpectedError);
    }
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is an UnexpectedError
 */
export function isUnexpectedError(error: unknown): error is UnexpectedError {
  return error instanceof UnexpectedError;
}
