/**
 * Security Validation Schemas
 * 
 * Zod validation schemas for security-critical data types.
 * These schemas provide type-safe validation for authentication,
 * session management, and security-sensitive operations.
 * 
 * @module domain/schemas/securitySchemas
 * @requirements 5.3 - Security-related Zod schemas
 */

import { z } from 'zod';

// ============================================================================
// Session ID Schema
// ============================================================================

/**
 * Schema for validating session IDs
 * - Must be a valid UUID v4 format
 * - Used for overlay session management
 */
export const SessionIdSchema = z.string().uuid({
  message: 'Session ID must be a valid UUID',
});

// ============================================================================
// Overlay URL Schema
// ============================================================================

/**
 * Schema for overlay types
 */
export const OverlayTypeSchema = z.enum(['poll', 'giveaway', 'game', 'chat'], {
  errorMap: () => ({ message: 'Overlay type must be one of: poll, giveaway, game, chat' }),
});

/**
 * Schema for validating overlay URL parameters
 * - Ensures session ID is valid UUID
 * - Validates overlay type
 * - NEVER includes tokens or sensitive data
 */
export const OverlayUrlSchema = z.object({
  sessionId: SessionIdSchema,
  type: OverlayTypeSchema,
});

// ============================================================================
// Token Schema
// ============================================================================

/**
 * Schema for validating OAuth tokens
 * - Validates token structure and required fields
 * - Ensures token type is Bearer
 * - Validates expiration time
 */
export const TokenSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().positive('Expiration time must be positive'),
  tokenType: z.literal('Bearer', {
    errorMap: () => ({ message: 'Token type must be Bearer' }),
  }),
});

// ============================================================================
// Firebase User Schema
// ============================================================================

/**
 * Schema for validating Firebase user data
 * - Validates user ID (uid)
 * - Optional email, displayName, and photoURL
 * - Ensures photoURL is a valid URL if provided
 */
export const FirebaseUserSchema = z.object({
  uid: z.string().min(1, 'User ID (uid) is required'),
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url('Photo URL must be a valid URL').optional(),
});

// ============================================================================
// Chat Message Schema (Security-focused)
// ============================================================================

/**
 * Schema for validating chat messages with security constraints
 * - Validates message ID
 * - Enforces username length limits (Twitch standard)
 * - Enforces message length limits
 * - Validates timestamp
 * - Optional badges array
 */
export const ChatMessageSchema = z.object({
  id: z.string().min(1, 'Message ID is required'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(25, 'Username must be 25 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be 500 characters or less'),
  timestamp: z.date({
    errorMap: () => ({ message: 'Valid timestamp is required' }),
  }),
  badges: z.array(z.string()).optional(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates input data against a schema and throws on error
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates input data against a schema
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success status and either data or errors
 */
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

// ============================================================================
// Type Exports
// ============================================================================

export type SessionId = z.infer<typeof SessionIdSchema>;
export type OverlayType = z.infer<typeof OverlayTypeSchema>;
export type OverlayUrl = z.infer<typeof OverlayUrlSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type FirebaseUser = z.infer<typeof FirebaseUserSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
