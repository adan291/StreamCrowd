# Security Error Types

This document describes the security-specific error types used in StreamCrowd for handling authentication, session management, validation, and XSS detection errors.

## Overview

Security errors are defined in `src/domain/errors/SecurityErrors.ts` and extend the base `AppError` class to maintain consistency with the application's error handling strategy. All security errors are marked as **recoverable**, meaning the application can handle them gracefully without crashing.

## Error Types

### 1. AuthenticationError

**Purpose:** Thrown when authentication fails during OAuth flows, token validation, or credential verification.

**Properties:**
- `message`: Custom error message describing the authentication failure
- `code`: Error code for specific authentication failure types
- `recoverable`: Always `true`

**Usage Examples:**

```typescript
import { AuthenticationError } from '@/domain/errors/SecurityErrors';

// OAuth token exchange failure
throw new AuthenticationError('OAuth token exchange failed', 'OAUTH_EXCHANGE_FAILED');

// PKCE verification failure
throw new AuthenticationError('PKCE code verifier mismatch', 'PKCE_VERIFICATION_FAILED');

// Invalid credentials
throw new AuthenticationError('Invalid username or password', 'INVALID_CREDENTIALS');

// Token expired
throw new AuthenticationError('Access token has expired', 'TOKEN_EXPIRED');
```

**Common Error Codes:**
- `OAUTH_EXCHANGE_FAILED`: OAuth token exchange failed
- `PKCE_VERIFICATION_FAILED`: PKCE code verifier mismatch
- `INVALID_CREDENTIALS`: Invalid username or password
- `TOKEN_EXPIRED`: Access token has expired
- `AUTH_REQUIRED`: Authentication required to access resource

---

### 2. SessionExpiredError

**Purpose:** Thrown when a user session or overlay session has expired.

**Properties:**
- `message`: "Session has expired"
- `code`: "SESSION_EXPIRED"
- `recoverable`: Always `true`

**Usage Examples:**

```typescript
import { SessionExpiredError } from '@/domain/errors/SecurityErrors';

// Overlay session expired
const session = sessionService.validateSession(sessionId);
if (!session) {
  throw new SessionExpiredError();
}

// User session timeout
if (Date.now() > session.expiresAt.getTime()) {
  throw new SessionExpiredError();
}
```

**Error Handling:**
- Display error message to user
- Prompt to refresh overlay URL (for overlays)
- Redirect to login (for user sessions)

---

### 3. InvalidTokenError

**Purpose:** Thrown when a token is invalid, malformed, or fails validation.

**Properties:**
- `message`: "Invalid or malformed token"
- `code`: "INVALID_TOKEN"
- `recoverable`: Always `true`

**Usage Examples:**

```typescript
import { InvalidTokenError } from '@/domain/errors/SecurityErrors';

// JWT validation failure
try {
  const decoded = jwt.verify(token, secret);
} catch (error) {
  throw new InvalidTokenError();
}

// Malformed token
if (!token || token.split('.').length !== 3) {
  throw new InvalidTokenError();
}

// Token signature verification failed
if (!verifySignature(token)) {
  throw new InvalidTokenError();
}
```

**Error Handling:**
- Clear stored tokens
- Attempt token refresh
- Redirect to login if refresh fails

---

### 4. ValidationError

**Purpose:** Thrown when input validation fails using Zod schemas or other validation logic.

**Properties:**
- `message`: Custom error message describing the validation failure
- `field`: (Optional) The specific field that failed validation
- `code`: "VALIDATION_ERROR"
- `recoverable`: Always `true`

**Usage Examples:**

```typescript
import { ValidationError } from '@/domain/errors/SecurityErrors';

// Zod schema validation failure
const result = schema.safeParse(data);
if (!result.success) {
  throw new ValidationError('Email must be a valid email address', 'email');
}

// Custom validation
if (password.length < 8) {
  throw new ValidationError('Password must be at least 8 characters', 'password');
}

// General validation error
if (!isValid(input)) {
  throw new ValidationError('Invalid input provided');
}
```

**Error Handling:**
- Display field-specific error messages
- Highlight invalid fields in forms
- Prevent form submission until validation passes

---

### 5. XSSDetectedError

**Purpose:** Thrown when potentially malicious content (XSS attacks) is detected in user input.

**Properties:**
- `message`: "Potentially malicious content detected"
- `content`: The malicious content that was detected
- `code`: "XSS_DETECTED"
- `recoverable`: Always `true`

**Usage Examples:**

```typescript
import { XSSDetectedError } from '@/domain/errors/SecurityErrors';

// Detect malicious script tags
if (sanitizer.isMalicious(content)) {
  throw new XSSDetectedError(content);
}

// Detect event handlers
if (/<\w+\s+on\w+=/i.test(content)) {
  throw new XSSDetectedError(content);
}

// Detect javascript: URLs
if (/javascript:/i.test(content)) {
  throw new XSSDetectedError(content);
}
```

**Error Handling:**
- Log the malicious content attempt
- Sanitize the content with DOMPurify
- Continue rendering with sanitized content
- Optionally notify security team

---

## Type Guards

Each error type has a corresponding type guard function for type-safe error handling:

```typescript
import {
  isAuthenticationError,
  isSessionExpiredError,
  isInvalidTokenError,
  isValidationError,
  isXSSDetectedError,
} from '@/domain/errors/SecurityErrors';

try {
  // Some operation
} catch (error) {
  if (isAuthenticationError(error)) {
    // Handle authentication error
    console.error('Auth failed:', error.code);
  } else if (isSessionExpiredError(error)) {
    // Handle session expiration
    redirectToLogin();
  } else if (isInvalidTokenError(error)) {
    // Handle invalid token
    clearTokens();
  } else if (isValidationError(error)) {
    // Handle validation error
    displayFieldError(error.field, error.message);
  } else if (isXSSDetectedError(error)) {
    // Handle XSS detection
    logSecurityIncident(error.content);
  }
}
```

---

## Error Handling Strategy

### 1. Authentication Errors
- Log the authentication attempt
- Clear stored tokens
- Redirect to login page
- Display user-friendly error message

### 2. Session Errors
- Display error message to user
- For overlays: Prompt to refresh overlay URL
- For user sessions: Redirect to login
- Clean up expired sessions

### 3. Token Errors
- Attempt automatic token refresh
- If refresh fails, clear tokens and redirect to login
- Log token validation failures

### 4. Validation Errors
- Display field-specific error messages
- Highlight invalid fields in UI
- Prevent form submission until validation passes
- Provide clear guidance on how to fix errors

### 5. XSS Detection Errors
- Log the malicious content attempt
- Sanitize the content before rendering
- Continue normal operation with sanitized content
- Optionally alert security team for repeated attempts

---

## Integration with Error Boundary

Security errors can be caught by React Error Boundaries:

```typescript
import { Component, ReactNode } from 'react';
import { isAuthenticationError, isSessionExpiredError } from '@/domain/errors/SecurityErrors';

class SecurityErrorBoundary extends Component {
  componentDidCatch(error: Error) {
    if (isAuthenticationError(error)) {
      // Redirect to login
      window.location.href = '/login';
    } else if (isSessionExpiredError(error)) {
      // Show session expired message
      this.setState({ showSessionExpired: true });
    }
  }

  render() {
    return this.props.children;
  }
}
```

---

## Testing

All security error types have comprehensive unit tests in `tests/domain/SecurityErrors.test.ts`:

- Error creation with correct properties
- Error inheritance chain (AppError → Error)
- Type guard functions
- Stack trace preservation
- Error recoverability
- Real-world usage scenarios

**Run tests:**
```bash
npm test -- tests/domain/SecurityErrors.test.ts
```

---

## Best Practices

1. **Use Specific Error Codes:** Always provide meaningful error codes for AuthenticationError
2. **Include Field Names:** When throwing ValidationError, include the field name for better UX
3. **Log Security Incidents:** Always log XSSDetectedError occurrences for security monitoring
4. **Handle Gracefully:** All security errors are recoverable - handle them without crashing the app
5. **User-Friendly Messages:** Provide clear, actionable error messages to users
6. **Type Guards:** Use type guards for type-safe error handling in catch blocks

---

## Related Documentation

- [Error Handling](./ERROR_HANDLING.md) - General error handling strategy
- [Security Audit](./FIREBASE_SECURITY_AUDIT.md) - Security audit findings
- [Authentication Security](./AUTHENTICATION_SECURITY_CHECKPOINT.md) - Authentication security measures
- [XSS Audit Report](./XSS_AUDIT_REPORT.md) - XSS prevention measures

---

**Last Updated:** Task 20 - Security Hardening Phase 7
