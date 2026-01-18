import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  UnexpectedError,
  isAppError,
  isValidationError,
  isAuthenticationError,
  isNetworkError,
  isUnexpectedError,
} from '../../src/domain/errors/AppErrors';

describe('AppError', () => {
  it('should create an AppError with message, code, and recoverable flag', () => {
    const error = new AppError('Operation failed', 'OP_FAILED', true);
    
    expect(error.message).toBe('Operation failed');
    expect(error.code).toBe('OP_FAILED');
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('AppError');
  });

  it('should default recoverable to true', () => {
    const error = new AppError('Test error', 'TEST_ERROR');
    
    expect(error.recoverable).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new AppError('Test error', 'TEST_ERROR');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('ValidationError', () => {
  it('should create a ValidationError with message and optional field', () => {
    const error = new ValidationError('Invalid email', 'email');
    
    expect(error.message).toBe('Invalid email');
    expect(error.field).toBe('email');
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.recoverable).toBe(true);
  });

  it('should work without field parameter', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBeUndefined();
  });

  it('should be an instance of AppError', () => {
    const error = new ValidationError('Test');
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('should create an AuthenticationError with custom message', () => {
    const error = new AuthenticationError('Invalid credentials');
    
    expect(error.message).toBe('Invalid credentials');
    expect(error.name).toBe('AuthenticationError');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.recoverable).toBe(true);
  });

  it('should use default message when not provided', () => {
    const error = new AuthenticationError();
    
    expect(error.message).toBe('Authentication required');
  });

  it('should be an instance of AppError', () => {
    const error = new AuthenticationError();
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof AuthenticationError).toBe(true);
  });
});

describe('NetworkError', () => {
  it('should create a NetworkError with message and optional status code', () => {
    const error = new NetworkError('Request timeout', 408);
    
    expect(error.message).toBe('Request timeout');
    expect(error.statusCode).toBe(408);
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.recoverable).toBe(true);
  });

  it('should work without status code', () => {
    const error = new NetworkError('Connection failed');
    
    expect(error.message).toBe('Connection failed');
    expect(error.statusCode).toBeUndefined();
  });

  it('should be an instance of AppError', () => {
    const error = new NetworkError('Test');
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof NetworkError).toBe(true);
  });
});

describe('UnexpectedError', () => {
  it('should create an UnexpectedError with custom message', () => {
    const error = new UnexpectedError('Something went wrong');
    
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('UnexpectedError');
    expect(error.code).toBe('UNEXPECTED_ERROR');
    expect(error.recoverable).toBe(false);
  });

  it('should use default message when not provided', () => {
    const error = new UnexpectedError();
    
    expect(error.message).toBe('An unexpected error occurred');
  });

  it('should be marked as non-recoverable', () => {
    const error = new UnexpectedError('Critical failure');
    
    expect(error.recoverable).toBe(false);
  });

  it('should be an instance of AppError', () => {
    const error = new UnexpectedError();
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof UnexpectedError).toBe(true);
  });
});

describe('Type Guards', () => {
  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test', 'TEST');
      expect(isAppError(error)).toBe(true);
    });

    it('should return true for subclass instances', () => {
      expect(isAppError(new ValidationError('Test'))).toBe(true);
      expect(isAppError(new AuthenticationError())).toBe(true);
      expect(isAppError(new NetworkError('Test'))).toBe(true);
      expect(isAppError(new UnexpectedError())).toBe(true);
    });

    it('should return false for non-AppError instances', () => {
      expect(isAppError(new Error('Test'))).toBe(false);
      expect(isAppError('not an error')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError instances', () => {
      const error = new ValidationError('Invalid');
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isValidationError(new AppError('Test', 'TEST'))).toBe(false);
      expect(isValidationError(new AuthenticationError())).toBe(false);
      expect(isValidationError(new NetworkError('Test'))).toBe(false);
      expect(isValidationError(new UnexpectedError())).toBe(false);
      expect(isValidationError(new Error('Test'))).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should return true for AuthenticationError instances', () => {
      const error = new AuthenticationError();
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isAuthenticationError(new AppError('Test', 'TEST'))).toBe(false);
      expect(isAuthenticationError(new ValidationError('Test'))).toBe(false);
      expect(isAuthenticationError(new NetworkError('Test'))).toBe(false);
      expect(isAuthenticationError(new UnexpectedError())).toBe(false);
      expect(isAuthenticationError(new Error('Test'))).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for NetworkError instances', () => {
      const error = new NetworkError('Failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isNetworkError(new AppError('Test', 'TEST'))).toBe(false);
      expect(isNetworkError(new ValidationError('Test'))).toBe(false);
      expect(isNetworkError(new AuthenticationError())).toBe(false);
      expect(isNetworkError(new UnexpectedError())).toBe(false);
      expect(isNetworkError(new Error('Test'))).toBe(false);
    });
  });

  describe('isUnexpectedError', () => {
    it('should return true for UnexpectedError instances', () => {
      const error = new UnexpectedError();
      expect(isUnexpectedError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isUnexpectedError(new AppError('Test', 'TEST'))).toBe(false);
      expect(isUnexpectedError(new ValidationError('Test'))).toBe(false);
      expect(isUnexpectedError(new AuthenticationError())).toBe(false);
      expect(isUnexpectedError(new NetworkError('Test'))).toBe(false);
      expect(isUnexpectedError(new Error('Test'))).toBe(false);
    });
  });
});

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance for ValidationError', () => {
    const error = new ValidationError('Test');
    
    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for AuthenticationError', () => {
    const error = new AuthenticationError();
    
    expect(error instanceof AuthenticationError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for NetworkError', () => {
    const error = new NetworkError('Test');
    
    expect(error instanceof NetworkError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for UnexpectedError', () => {
    const error = new UnexpectedError();
    
    expect(error instanceof UnexpectedError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});
