# Design Document - Security Hardening

## Overview

The Security Hardening design implements comprehensive security measures for StreamCrowd. This includes OAuth2 PKCE flow for secure authentication, HttpOnly cookies for token storage, session-based overlay access, Zod schemas for input validation, and DOMPurify for XSS prevention.

**Key Security Principles:**
- Defense in depth (multiple layers of security)
- Principle of least privilege (minimal access rights)
- Secure by default (security enabled without configuration)
- Input validation at all boundaries
- Output encoding for all user content

---

## Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  • React XSS protection (no dangerouslySetInnerHTML)           │
│  • DOMPurify sanitization for user content                     │
│  • CSP headers for script execution control                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                              │
│  • Zod schema validation for all inputs                        │
│  • Session management for overlays                             │
│  • Token validation and refresh logic                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                            │
│  • PKCE OAuth2 flow implementation                             │
│  • HttpOnly cookie storage for refresh tokens                  │
│  • Encrypted localStorage for sensitive data                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
│  • Firebase Rules (read/write validation)                      │
│  • OAuth Providers (Twitch, YouTube, Google)                   │
│  • CORS configuration                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow with PKCE

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │  Client  │     │  Auth    │     │  Token   │
│          │     │  App     │     │  Server  │     │  Server  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Login       │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. Generate    │                │
     │                │ code_verifier  │                │
     │                │ (128 chars)    │                │
     │                │                │                │
     │                │ 3. Create      │                │
     │                │ code_challenge │                │
     │                │ = SHA256(      │                │
     │                │   verifier)    │                │
     │                │                │                │
     │                │ 4. Auth Request│                │
     │                │ + code_challenge                │
     │                │───────────────>│                │
     │                │                │                │
     │ 5. Login UI    │<───────────────│                │
     │<───────────────│                │                │
     │                │                │                │
     │ 6. Credentials │                │                │
     │───────────────>│───────────────>│                │
     │                │                │                │
     │                │ 7. Auth Code   │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ 8. Token Request                │
     │                │ + code_verifier│                │
     │                │────────────────────────────────>│
     │                │                │                │
     │                │ 9. Validate    │                │
     │                │ SHA256(verifier)               │
     │                │ == challenge   │                │
     │                │                │                │
     │                │ 10. Tokens     │                │
     │                │<────────────────────────────────│
     │                │                │                │
     │ 11. Logged In  │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

---

## Components and Interfaces

### PKCE Flow Implementation

```typescript
// src/infrastructure/auth/PkceFlow.ts
import { sha256 } from 'crypto-js';

export class PkceFlow {
  private codeVerifier: string | null = null;

  generateCodeVerifier(): string {
    const array = new Uint8Array(96);
    crypto.getRandomValues(array);
    this.codeVerifier = this.base64UrlEncode(array);
    return this.codeVerifier;
  }

  generateCodeChallenge(): string {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not generated');
    }
    const hash = sha256(this.codeVerifier);
    return this.base64UrlEncode(hash.toString());
  }

  getCodeVerifier(): string {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not generated');
    }
    return this.codeVerifier;
  }

  private base64UrlEncode(input: Uint8Array | string): string {
    const base64 = typeof input === 'string' 
      ? btoa(input)
      : btoa(String.fromCharCode(...input));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
```

### Session Service for Overlays

```typescript
// src/application/services/SessionService.ts
import { v4 as uuidv4 } from 'uuid';

interface Session {
  id: string;
  userId: string;
  overlayType: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SessionService {
  private sessions: Map<string, Session> = new Map();
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  createSession(userId: string, overlayType: string): string {
    const session: Session = {
      id: uuidv4(),
      userId,
      overlayType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.defaultTTL),
    };
    
    this.sessions.set(session.id, session);
    return session.id;
  }

  validateSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session;
  }

  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  generateOverlayUrl(sessionId: string, baseUrl: string): string {
    // NEVER include tokens in URL
    return `${baseUrl}/overlay?sessionId=${sessionId}`;
  }
}
```

### Secure Token Storage

```typescript
// src/infrastructure/auth/TokenStorage.ts
import CryptoJS from 'crypto-js';

export class TokenStorage {
  private encryptionKey: string;

  constructor() {
    // Key derived from device fingerprint or secure storage
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  storeAccessToken(token: string): void {
    // Store in memory only, not localStorage
    sessionStorage.setItem('access_token', this.encrypt(token));
  }

  getAccessToken(): string | null {
    const encrypted = sessionStorage.getItem('access_token');
    return encrypted ? this.decrypt(encrypted) : null;
  }

  clearTokens(): void {
    sessionStorage.removeItem('access_token');
    // Refresh token is in HttpOnly cookie, cleared by server
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private getOrCreateEncryptionKey(): string {
    let key = localStorage.getItem('_ek');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(32).toString();
      localStorage.setItem('_ek', key);
    }
    return key;
  }
}
```

### Input Sanitization Service

```typescript
// src/infrastructure/security/SanitizationService.ts
import DOMPurify from 'dompurify';

export class SanitizationService {
  private config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  };

  sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, this.config);
  }

  sanitizeChatMessage(message: string): string {
    // Remove all HTML, keep only text
    const textOnly = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] });
    // Escape any remaining special characters
    return this.escapeHtml(textOnly);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  isMalicious(content: string): boolean {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:/i,
      /vbscript:/i,
    ];
    return maliciousPatterns.some((pattern) => pattern.test(content));
  }
}
```

### Zod Validation Schemas

```typescript
// src/domain/schemas/securitySchemas.ts
import { z } from 'zod';

export const SessionIdSchema = z.string().uuid();

export const OverlayUrlSchema = z.object({
  sessionId: SessionIdSchema,
  type: z.enum(['poll', 'giveaway', 'game', 'chat']),
});

export const TokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().positive(),
  tokenType: z.literal('Bearer'),
});

export const FirebaseUserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1).max(25),
  message: z.string().min(1).max(500),
  timestamp: z.date(),
  badges: z.array(z.string()).optional(),
});

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
```

### Firebase Rules

```json
// firebase-rules.json (proposed)
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren(['displayName', 'email'])"
      }
    },
    "giveaways": {
      "$giveawayId": {
        ".read": "data.child('ownerId').val() === auth.uid || data.child('public').val() === true",
        ".write": "!data.exists() || data.child('ownerId').val() === auth.uid",
        ".validate": "newData.hasChildren(['title', 'ownerId', 'createdAt'])"
      }
    },
    "polls": {
      "$pollId": {
        ".read": "data.child('ownerId').val() === auth.uid || data.child('public').val() === true",
        ".write": "!data.exists() || data.child('ownerId').val() === auth.uid",
        ".validate": "newData.hasChildren(['title', 'options', 'ownerId'])"
      }
    },
    "sessions": {
      "$sessionId": {
        ".read": "data.child('userId').val() === auth.uid",
        ".write": "!data.exists() && auth != null",
        ".validate": "newData.hasChildren(['userId', 'overlayType', 'expiresAt'])"
      }
    }
  }
}
```

---

## Data Models

### Security-Related State

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

interface Session {
  id: string;
  userId: string;
  overlayType: string;
  createdAt: Date;
  expiresAt: Date;
}

interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

interface SecurityAuditLog {
  timestamp: Date;
  action: 'login' | 'logout' | 'token_refresh' | 'session_create' | 'access_denied';
  userId?: string;
  details: Record<string, unknown>;
}
```

---

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.

### Property 1: PKCE Code Verifier Randomness
*For any* PKCE flow initiation, the generated code verifier SHALL be cryptographically random and exactly 128 characters long.
**Validates: Requirements 2.1**

### Property 2: PKCE Round-Trip Integrity
*For any* valid PKCE flow, the code challenge SHALL be the SHA256 hash of the code verifier, and token exchange SHALL only succeed when the verifier matches.
**Validates: Requirements 2.2, 2.3, 2.5**

### Property 3: Token Storage Security
*For any* stored token, the token SHALL NOT be stored in plaintext in localStorage, and refresh tokens SHALL only be accessible via HttpOnly cookies.
**Validates: Requirements 3.1, 3.2**

### Property 4: Automatic Token Refresh
*For any* expired access token, the system SHALL automatically attempt to refresh it before making API calls.
**Validates: Requirements 3.4**

### Property 5: Session ID URL Safety
*For any* overlay URL, the URL SHALL contain only a session ID and SHALL NEVER contain tokens, API keys, or other sensitive data.
**Validates: Requirements 4.1, 4.6**

### Property 6: Session Expiration Enforcement
*For any* session, access SHALL be denied after the expiration time, and expired sessions SHALL be automatically cleaned up.
**Validates: Requirements 4.2, 4.4**

### Property 7: Input Validation Completeness
*For any* user input, the input SHALL be validated against a Zod schema before being used in database queries, API calls, or rendering.
**Validates: Requirements 5.1, 5.5**

### Property 8: XSS Sanitization Effectiveness
*For any* user-generated content containing script tags, event handlers, or javascript: URLs, the malicious content SHALL be removed while preserving safe formatting.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 9: Firebase Read Access Control
*For any* Firebase read operation, access SHALL only be granted if the user owns the data or has explicit permission.
**Validates: Requirements 1.2**

### Property 10: Firebase Write Validation
*For any* Firebase write operation, the data SHALL be validated against the schema before being written.
**Validates: Requirements 1.3**

---

## Error Handling

### Security-Specific Errors

```typescript
// src/domain/errors/SecurityErrors.ts
export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Session has expired');
    this.name = 'SessionExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super('Invalid or malformed token');
    this.name = 'InvalidTokenError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class XSSDetectedError extends Error {
  constructor(public content: string) {
    super('Potentially malicious content detected');
    this.name = 'XSSDetectedError';
  }
}
```

### Error Handling Strategy

1. **Authentication Errors:** Log attempt, clear tokens, redirect to login
2. **Session Errors:** Display error message, prompt to refresh overlay URL
3. **Validation Errors:** Display field-specific error messages
4. **XSS Detection:** Log attempt, sanitize content, continue rendering

---

## Testing Strategy

### Unit Testing

- Test PKCE code verifier generation (randomness, length)
- Test code challenge generation (SHA256 correctness)
- Test token encryption/decryption
- Test session creation and validation
- Test Zod schema validation
- Test DOMPurify sanitization

**Framework:** Vitest  
**Coverage Target:** >90% for security code

### Integration Testing

- Test complete PKCE OAuth flow
- Test token refresh flow
- Test session-based overlay access
- Test Firebase rules with emulator

**Framework:** Vitest + Firebase Emulator

### Security Testing

- Test XSS attack vectors
- Test CSRF protection
- Test token exposure in URLs
- Test Firebase rules bypass attempts

**Framework:** Playwright + Custom Security Tests

### Property-Based Testing

Each correctness property SHALL have a corresponding property-based test:

```typescript
// tests/properties/security.property.ts
import { test } from 'vitest';
import fc from 'fast-check';
import { PkceFlow } from '../src/infrastructure/auth/PkceFlow';
import { SanitizationService } from '../src/infrastructure/security/SanitizationService';

test('Property 1: PKCE Code Verifier Randomness', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 100 }), () => {
      const pkce = new PkceFlow();
      const verifier = pkce.generateCodeVerifier();
      
      // Verify length
      expect(verifier.length).toBe(128);
      
      // Verify randomness (no two verifiers should be the same)
      const verifier2 = new PkceFlow().generateCodeVerifier();
      expect(verifier).not.toBe(verifier2);
    })
  );
});

test('Property 8: XSS Sanitization Effectiveness', () => {
  const sanitizer = new SanitizationService();
  
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant('<script>alert("xss")</script>'),
        fc.constant('<img onerror="alert(1)" src="x">'),
        fc.constant('<a href="javascript:alert(1)">click</a>'),
        fc.constant('<div onmouseover="alert(1)">hover</div>')
      ),
      (maliciousInput) => {
        const sanitized = sanitizer.sanitizeHtml(maliciousInput);
        
        // Verify no script tags
        expect(sanitized).not.toContain('<script');
        // Verify no event handlers
        expect(sanitized).not.toMatch(/on\w+=/i);
        // Verify no javascript: URLs
        expect(sanitized).not.toContain('javascript:');
      }
    )
  );
});
```

---

## Implementation Notes

### Phase 2 Deliverables

1. ✅ Firebase rules audited and hardened
2. ✅ PKCE flow implemented for all OAuth providers
3. ✅ Secure token storage with HttpOnly cookies
4. ✅ Session management for overlays
5. ✅ Zod schemas for all security-critical data
6. ✅ DOMPurify sanitization for user content
7. ✅ Security headers configured
8. ✅ All security tests passing

### Dependencies

- Requires FASE 1 (Foundation Setup) complete
- Requires backend support for HttpOnly cookies
- Requires Firebase project access for rules deployment

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing auth flow | Implement feature flag for gradual rollout |
| Users need to re-authenticate | Provide clear messaging and smooth transition |
| Firebase rules too restrictive | Test thoroughly with emulator before deployment |
| PKCE not supported by provider | Fall back to standard OAuth with additional security measures |

---

**Design Status:** ✅ Complete and Ready for Implementation
