import { describe, it, expect } from 'vitest';
import {
  AuthenticationError,
  SessionExpiredError,
  InvalidTokenError,
  ValidationError,
  XSSDetectedError,
  isAuthenticationError,
  isSessionExpiredError,
  isInvalidTokenError,
  isValidationError,
  isXSSDetectedError,
} from '../../src/domain/errors/SecurityErrors';
import { AppError } from '../../src/domain/errors/AppErrors';

describe('AuthenticationError', () => {
  it('should create an AuthenticationError with message and code', () => {
    const error = new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    
    expect(error.message).toBe('Invalid credentials');
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.name).toBe('AuthenticationError');
    expect(error.recoverable).toBe(true);
  });

  it('should support different error codes', () => {
    const error1 = new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
    const error2 = new AuthenticationError('OAuth failed', 'OAUTH_FAILED');
    
    expect(error1.code).toBe('TOKEN_EXPIRED');
    expect(error2.code).toBe('OAUTH_FAILED');
  });

  it('should be an instance of AppError', () => {
    const error = new AuthenticationError('Test', 'TEST_CODE');
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof AuthenticationError).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new AuthenticationError('Test', 'TEST_CODE');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AuthenticationError');
  });
});

describe('SessionExpiredError', () => {
  it('should create a SessionExpiredError with default message', () => {
    const error = new SessionExpiredError();
    
    expect(error.message).toBe('Session has expired');
    expect(error.code).toBe('SESSION_EXPIRED');
    expect(error.name).toBe('SessionExpiredError');
    expect(error.recoverable).toBe(true);
  });

  it('should be an instance of AppError', () => {
    const error = new SessionExpiredError();
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof SessionExpiredError).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new SessionExpiredError();
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('SessionExpiredError');
  });
});

describe('InvalidTokenError', () => {
  it('should create an InvalidTokenError with default message', () => {
    const error = new InvalidTokenError();
    
    expect(error.message).toBe('Invalid or malformed token');
    expect(error.code).toBe('INVALID_TOKEN');
    expect(error.name).toBe('InvalidTokenError');
    expect(error.recoverable).toBe(true);
  });

  it('should be an instance of AppError', () => {
    const error = new InvalidTokenError();
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof InvalidTokenError).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new InvalidTokenError();
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('InvalidTokenError');
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

  it('should have proper stack trace', () => {
    const error = new ValidationError('Test');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ValidationError');
  });
});

describe('XSSDetectedError', () => {
  it('should create an XSSDetectedError with malicious content', () => {
    const maliciousContent = '<script>alert("xss")</script>';
    const error = new XSSDetectedError(maliciousContent);
    
    expect(error.message).toBe('Potentially malicious content detected');
    expect(error.content).toBe(maliciousContent);
    expect(error.code).toBe('XSS_DETECTED');
    expect(error.name).toBe('XSSDetectedError');
    expect(error.recoverable).toBe(true);
  });

  it('should store different types of malicious content', () => {
    const error1 = new XSSDetectedError('<img onerror="alert(1)" src="x">');
    const error2 = new XSSDetectedError('<a href="javascript:alert(1)">click</a>');
    
    expect(error1.content).toContain('onerror');
    expect(error2.content).toContain('javascript:');
  });

  it('should be an instance of AppError', () => {
    const error = new XSSDetectedError('<script>test</script>');
    
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof XSSDetectedError).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new XSSDetectedError('<script>test</script>');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('XSSDetectedError');
  });
});

describe('Type Guards', () => {
  describe('isAuthenticationError', () => {
    it('should return true for AuthenticationError instances', () => {
      const error = new AuthenticationError('Test', 'TEST_CODE');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isAuthenticationError(new SessionExpiredError())).toBe(false);
      expect(isAuthenticationError(new InvalidTokenError())).toBe(false);
      expect(isAuthenticationError(new ValidationError('Test'))).toBe(false);
      expect(isAuthenticationError(new XSSDetectedError('Test'))).toBe(false);
      expect(isAuthenticationError(new Error('Test'))).toBe(false);
      expect(isAuthenticationError('not an error')).toBe(false);
      expect(isAuthenticationError(null)).toBe(false);
    });
  });

  describe('isSessionExpiredError', () => {
    it('should return true for SessionExpiredError instances', () => {
      const error = new SessionExpiredError();
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isSessionExpiredError(new AuthenticationError('Test', 'TEST'))).toBe(false);
      expect(isSessionExpiredError(new InvalidTokenError())).toBe(false);
      expect(isSessionExpiredError(new ValidationError('Test'))).toBe(false);
      expect(isSessionExpiredError(new XSSDetectedError('Test'))).toBe(false);
      expect(isSessionExpiredError(new Error('Test'))).toBe(false);
      expect(isSessionExpiredError('not an error')).toBe(false);
    });
  });

  describe('isInvalidTokenError', () => {
    it('should return true for InvalidTokenError instances', () => {
      const error = new InvalidTokenError();
      expect(isInvalidTokenError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isInvalidTokenError(new AuthenticationError('Test', 'TEST'))).toBe(false);
      expect(isInvalidTokenError(new SessionExpiredError())).toBe(false);
      expect(isInvalidTokenError(new ValidationError('Test'))).toBe(false);
      expect(isInvalidTokenError(new XSSDetectedError('Test'))).toBe(false);
      expect(isInvalidTokenError(new Error('Test'))).toBe(false);
      expect(isInvalidTokenError('not an error')).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError instances', () => {
      const error = new ValidationError('Invalid');
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isValidationError(new AuthenticationError('Test', 'TEST'))).toBe(false);
      expect(isValidationError(new SessionExpiredError())).toBe(false);
      expect(isValidationError(new InvalidTokenError())).toBe(false);
      expect(isValidationError(new XSSDetectedError('Test'))).toBe(false);
      expect(isValidationError(new Error('Test'))).toBe(false);
      expect(isValidationError('not an error')).toBe(false);
    });
  });

  describe('isXSSDetectedError', () => {
    it('should return true for XSSDetectedError instances', () => {
      const error = new XSSDetectedError('<script>test</script>');
      expect(isXSSDetectedError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isXSSDetectedError(new AuthenticationError('Test', 'TEST'))).toBe(false);
      expect(isXSSDetectedError(new SessionExpiredError())).toBe(false);
      expect(isXSSDetectedError(new InvalidTokenError())).toBe(false);
      expect(isXSSDetectedError(new ValidationError('Test'))).toBe(false);
      expect(isXSSDetectedError(new Error('Test'))).toBe(false);
      expect(isXSSDetectedError('not an error')).toBe(false);
    });
  });
});

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance for AuthenticationError', () => {
    const error = new AuthenticationError('Test', 'TEST');
    
    expect(error instanceof AuthenticationError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for SessionExpiredError', () => {
    const error = new SessionExpiredError();
    
    expect(error instanceof SessionExpiredError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for InvalidTokenError', () => {
    const error = new InvalidTokenError();
    
    expect(error instanceof InvalidTokenError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for ValidationError', () => {
    const error = new ValidationError('Test');
    
    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain proper inheritance for XSSDetectedError', () => {
    const error = new XSSDetectedError('Test');
    
    expect(error instanceof XSSDetectedError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('Error Usage Scenarios', () => {
  it('should handle OAuth authentication failure', () => {
    const error = new AuthenticationError('OAuth token exchange failed', 'OAUTH_EXCHANGE_FAILED');
    
    expect(error.message).toBe('OAuth token exchange failed');
    expect(error.code).toBe('OAUTH_EXCHANGE_FAILED');
    expect(error.recoverable).toBe(true);
  });

  it('should handle PKCE verification failure', () => {
    const error = new AuthenticationError('PKCE code verifier mismatch', 'PKCE_VERIFICATION_FAILED');
    
    expect(error.message).toBe('PKCE code verifier mismatch');
    expect(error.code).toBe('PKCE_VERIFICATION_FAILED');
  });

  it('should handle overlay session expiration', () => {
    const error = new SessionExpiredError();
    
    expect(error.message).toBe('Session has expired');
    expect(error.code).toBe('SESSION_EXPIRED');
  });

  it('should handle JWT validation failure', () => {
    const error = new InvalidTokenError();
    
    expect(error.message).toBe('Invalid or malformed token');
    expect(error.code).toBe('INVALID_TOKEN');
  });

  it('should handle Zod schema validation failure', () => {
    const error = new ValidationError('Email must be a valid email address', 'email');
    
    expect(error.message).toBe('Email must be a valid email address');
    expect(error.field).toBe('email');
  });

  it('should handle XSS attack detection', () => {
    const maliciousContent = '<script>document.cookie</script>';
    const error = new XSSDetectedError(maliciousContent);
    
    expect(error.message).toBe('Potentially malicious content detected');
    expect(error.content).toBe(maliciousContent);
  });
});

describe('Error Recoverability', () => {
  it('should mark all security errors as recoverable', () => {
    expect(new AuthenticationError('Test', 'TEST').recoverable).toBe(true);
    expect(new SessionExpiredError().recoverable).toBe(true);
    expect(new InvalidTokenError().recoverable).toBe(true);
    expect(new ValidationError('Test').recoverable).toBe(true);
    expect(new XSSDetectedError('Test').recoverable).toBe(true);
  });
});
