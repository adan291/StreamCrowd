/**
 * Security Schemas Tests
 * 
 * Unit tests for security-related Zod validation schemas.
 * Tests validate that schemas correctly accept valid data and reject invalid data.
 * 
 * @module tests/domain/securitySchemas
 * @requirements 5.3 - Security-related Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  SessionIdSchema,
  OverlayTypeSchema,
  OverlayUrlSchema,
  TokenSchema,
  FirebaseUserSchema,
  ChatMessageSchema,
  validateInput,
  safeValidateInput,
} from '../../src/domain/schemas/securitySchemas';

describe('SecuritySchemas', () => {
  // ============================================================================
  // SessionIdSchema Tests
  // ============================================================================

  describe('SessionIdSchema', () => {
    it('should accept valid UUID v4', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      validUUIDs.forEach((uuid) => {
        expect(() => SessionIdSchema.parse(uuid)).not.toThrow();
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '',
        '550e8400-e29b-41d4-a716', // incomplete
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // invalid characters
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(() => SessionIdSchema.parse(uuid)).toThrow();
      });
    });
  });

  // ============================================================================
  // OverlayTypeSchema Tests
  // ============================================================================

  describe('OverlayTypeSchema', () => {
    it('should accept valid overlay types', () => {
      const validTypes = ['poll', 'giveaway', 'game', 'chat'];

      validTypes.forEach((type) => {
        expect(() => OverlayTypeSchema.parse(type)).not.toThrow();
      });
    });

    it('should reject invalid overlay types', () => {
      const invalidTypes = ['invalid', 'POLL', 'Poll', '', 'overlay', 'widget'];

      invalidTypes.forEach((type) => {
        expect(() => OverlayTypeSchema.parse(type)).toThrow();
      });
    });
  });

  // ============================================================================
  // OverlayUrlSchema Tests
  // ============================================================================

  describe('OverlayUrlSchema', () => {
    it('should accept valid overlay URL data', () => {
      const validData = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'poll' as const,
      };

      expect(() => OverlayUrlSchema.parse(validData)).not.toThrow();
    });

    it('should reject overlay URL with invalid session ID', () => {
      const invalidData = {
        sessionId: 'not-a-uuid',
        type: 'poll' as const,
      };

      expect(() => OverlayUrlSchema.parse(invalidData)).toThrow();
    });

    it('should reject overlay URL with invalid type', () => {
      const invalidData = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'invalid',
      };

      expect(() => OverlayUrlSchema.parse(invalidData)).toThrow();
    });

    it('should reject overlay URL with missing fields', () => {
      expect(() => OverlayUrlSchema.parse({ sessionId: '550e8400-e29b-41d4-a716-446655440000' })).toThrow();
      expect(() => OverlayUrlSchema.parse({ type: 'poll' })).toThrow();
    });
  });

  // ============================================================================
  // TokenSchema Tests
  // ============================================================================

  describe('TokenSchema', () => {
    it('should accept valid token with all fields', () => {
      const validToken = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      };

      expect(() => TokenSchema.parse(validToken)).not.toThrow();
    });

    it('should accept valid token without optional refreshToken', () => {
      const validToken = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      };

      expect(() => TokenSchema.parse(validToken)).not.toThrow();
    });

    it('should reject token with empty accessToken', () => {
      const invalidToken = {
        accessToken: '',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      };

      expect(() => TokenSchema.parse(invalidToken)).toThrow();
    });

    it('should reject token with negative expiresIn', () => {
      const invalidToken = {
        accessToken: 'valid_token',
        expiresIn: -100,
        tokenType: 'Bearer' as const,
      };

      expect(() => TokenSchema.parse(invalidToken)).toThrow();
    });

    it('should reject token with zero expiresIn', () => {
      const invalidToken = {
        accessToken: 'valid_token',
        expiresIn: 0,
        tokenType: 'Bearer' as const,
      };

      expect(() => TokenSchema.parse(invalidToken)).toThrow();
    });

    it('should reject token with invalid tokenType', () => {
      const invalidToken = {
        accessToken: 'valid_token',
        expiresIn: 3600,
        tokenType: 'Basic',
      };

      expect(() => TokenSchema.parse(invalidToken)).toThrow();
    });

    it('should reject token with missing required fields', () => {
      expect(() => TokenSchema.parse({ accessToken: 'token' })).toThrow();
      expect(() => TokenSchema.parse({ expiresIn: 3600 })).toThrow();
      expect(() => TokenSchema.parse({ tokenType: 'Bearer' })).toThrow();
    });
  });

  // ============================================================================
  // FirebaseUserSchema Tests
  // ============================================================================

  describe('FirebaseUserSchema', () => {
    it('should accept valid Firebase user with all fields', () => {
      const validUser = {
        uid: 'firebase_user_123',
        email: 'user@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      expect(() => FirebaseUserSchema.parse(validUser)).not.toThrow();
    });

    it('should accept valid Firebase user with only uid', () => {
      const validUser = {
        uid: 'firebase_user_123',
      };

      expect(() => FirebaseUserSchema.parse(validUser)).not.toThrow();
    });

    it('should reject Firebase user with empty uid', () => {
      const invalidUser = {
        uid: '',
        email: 'user@example.com',
      };

      expect(() => FirebaseUserSchema.parse(invalidUser)).toThrow();
    });

    it('should reject Firebase user with invalid email', () => {
      const invalidUser = {
        uid: 'firebase_user_123',
        email: 'not-an-email',
      };

      expect(() => FirebaseUserSchema.parse(invalidUser)).toThrow();
    });

    it('should reject Firebase user with invalid photoURL', () => {
      const invalidUser = {
        uid: 'firebase_user_123',
        photoURL: 'not-a-url',
      };

      expect(() => FirebaseUserSchema.parse(invalidUser)).toThrow();
    });

    it('should reject Firebase user with missing uid', () => {
      const invalidUser = {
        email: 'user@example.com',
        displayName: 'Test User',
      };

      expect(() => FirebaseUserSchema.parse(invalidUser)).toThrow();
    });
  });

  // ============================================================================
  // ChatMessageSchema Tests
  // ============================================================================

  describe('ChatMessageSchema', () => {
    it('should accept valid chat message with all fields', () => {
      const validMessage = {
        id: 'msg_123',
        username: 'testuser',
        message: 'Hello, world!',
        timestamp: new Date(),
        badges: ['subscriber', 'moderator'],
      };

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should accept valid chat message without optional badges', () => {
      const validMessage = {
        id: 'msg_123',
        username: 'testuser',
        message: 'Hello, world!',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should reject message with empty id', () => {
      const invalidMessage = {
        id: '',
        username: 'testuser',
        message: 'Hello, world!',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject message with invalid username (too long)', () => {
      const invalidMessage = {
        id: 'msg_123',
        username: 'a'.repeat(26), // 26 characters, max is 25
        message: 'Hello, world!',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject message with invalid username (special characters)', () => {
      const invalidMessage = {
        id: 'msg_123',
        username: 'test@user',
        message: 'Hello, world!',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject message with empty message text', () => {
      const invalidMessage = {
        id: 'msg_123',
        username: 'testuser',
        message: '',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject message with too long message text', () => {
      const invalidMessage = {
        id: 'msg_123',
        username: 'testuser',
        message: 'a'.repeat(501), // 501 characters, max is 500
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject message with invalid timestamp', () => {
      const invalidMessage = {
        id: 'msg_123',
        username: 'testuser',
        message: 'Hello, world!',
        timestamp: 'not-a-date',
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should accept username with underscores and numbers', () => {
      const validMessage = {
        id: 'msg_123',
        username: 'test_user_123',
        message: 'Hello, world!',
        timestamp: new Date(),
      };

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });
  });

  // ============================================================================
  // Validation Helper Tests
  // ============================================================================

  describe('validateInput', () => {
    it('should return validated data for valid input', () => {
      const validData = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'poll' as const,
      };

      const result = validateInput(OverlayUrlSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw ZodError for invalid input', () => {
      const invalidData = {
        sessionId: 'not-a-uuid',
        type: 'poll' as const,
      };

      expect(() => validateInput(OverlayUrlSchema, invalidData)).toThrow();
    });
  });

  describe('safeValidateInput', () => {
    it('should return success result for valid input', () => {
      const validData = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'poll' as const,
      };

      const result = safeValidateInput(OverlayUrlSchema, validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error result for invalid input', () => {
      const invalidData = {
        sessionId: 'not-a-uuid',
        type: 'poll' as const,
      };

      const result = safeValidateInput(OverlayUrlSchema, invalidData);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors).toBeDefined();
        expect(result.errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should not throw for invalid input', () => {
      const invalidData = {
        sessionId: 'not-a-uuid',
        type: 'invalid',
      };

      expect(() => safeValidateInput(OverlayUrlSchema, invalidData)).not.toThrow();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should validate complete overlay URL workflow', () => {
      // Simulate creating an overlay URL with session
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const overlayType = 'poll' as const;

      const overlayUrl = {
        sessionId,
        type: overlayType,
      };

      // Validate the overlay URL
      const result = safeValidateInput(OverlayUrlSchema, overlayUrl);
      expect(result.success).toBe(true);

      if (result.success) {
        // Validate individual components
        expect(() => SessionIdSchema.parse(result.data.sessionId)).not.toThrow();
        expect(() => OverlayTypeSchema.parse(result.data.type)).not.toThrow();
      }
    });

    it('should validate complete authentication workflow', () => {
      // Simulate receiving a token from OAuth provider
      const token = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      };

      // Validate the token
      const tokenResult = safeValidateInput(TokenSchema, token);
      expect(tokenResult.success).toBe(true);

      // Simulate Firebase user data
      const firebaseUser = {
        uid: 'firebase_user_123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      // Validate the Firebase user
      const userResult = safeValidateInput(FirebaseUserSchema, firebaseUser);
      expect(userResult.success).toBe(true);
    });

    it('should validate complete chat message workflow', () => {
      // Simulate receiving a chat message
      const chatMessage = {
        id: 'msg_' + Date.now(),
        username: 'testuser',
        message: 'Hello from the chat!',
        timestamp: new Date(),
        badges: ['subscriber'],
      };

      // Validate the message
      const result = safeValidateInput(ChatMessageSchema, chatMessage);
      expect(result.success).toBe(true);

      if (result.success) {
        // Ensure message is within limits
        expect(result.data.message.length).toBeLessThanOrEqual(500);
        expect(result.data.username.length).toBeLessThanOrEqual(25);
      }
    });
  });
});
