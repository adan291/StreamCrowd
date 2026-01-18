/**
 * Security Error Types
 * 
 * Custom error classes for security-specific error handling.
 * These errors extend AppError to maintain consistency with the application's error handling strategy.
 */

import { AppError } from './AppErrors';

/**
 * AuthenticationError - Thrown when authentication fails
 * 
 * Used for OAuth failures, token validation errors, and authentication-related issues.
 * 
 * @example
 * throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
 */
export class AuthenticationError extends AppError {
  constructor(message: string, public code: string) {
    super(message, code, true);
    this.name = 'AuthenticationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * SessionExpiredError - Thrown when a session has expired
 * 
 * Used for overlay session expiration and user session timeouts.
 * 
 * @example
 * throw new SessionExpiredError();
 */
export class SessionExpiredError extends AppError {
  constructor() {
    super('Session has expired', 'SESSION_EXPIRED', true);
    this.name = 'SessionExpiredError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SessionExpiredError);
    }
  }
}

/**
 * InvalidTokenError - Thrown when a token is invalid or malformed
 * 
 * Used for JWT validation failures, malformed tokens, and token verification errors.
 * 
 * @example
 * throw new InvalidTokenError();
 */
export class InvalidTokenError extends AppError {
  constructor() {
    super('Invalid or malformed token', 'INVALID_TOKEN', true);
    this.name = 'InvalidTokenError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidTokenError);
    }
  }
}

/**
 * ValidationError - Thrown when input validation fails
 * 
 * Used for Zod schema validation failures and input sanitization errors.
 * 
 * @example
 * throw new ValidationError('Invalid email format', 'email');
 */
export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * XSSDetectedError - Thrown when potentially malicious content is detected
 * 
 * Used for XSS attack detection, malicious script detection, and content sanitization failures.
 * 
 * @example
 * throw new XSSDetectedError('<script>alert("xss")</script>');
 */
export class XSSDetectedError extends AppError {
  constructor(public content: string) {
    super('Potentially malicious content detected', 'XSS_DETECTED', true);
    this.name = 'XSSDetectedError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, XSSDetectedError);
    }
  }
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is a SessionExpiredError
 */
export function isSessionExpiredError(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError;
}

/**
 * Type guard to check if an error is an InvalidTokenError
 */
export function isInvalidTokenError(error: unknown): error is InvalidTokenError {
  return error instanceof InvalidTokenError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an XSSDetectedError
 */
export function isXSSDetectedError(error: unknown): error is XSSDetectedError {
  return error instanceof XSSDetectedError;
}
