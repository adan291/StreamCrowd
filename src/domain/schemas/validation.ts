/**
 * Common Validation Schemas
 * 
 * This file contains Zod validation schemas for common data types
 * used throughout the application. These schemas provide type-safe
 * validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/validation
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  // DOMPurify.sanitize works in both browser and Node environments
  return DOMPurify.sanitize(html) as string;
};

/**
 * Creates a Zod string schema that sanitizes HTML
 */
export const sanitizedString = () =>
  z.string().transform((val) => sanitizeHtml(val));

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Schema for validating usernames
 * - Must be 1-25 characters
 * - Alphanumeric with underscores allowed
 */
export const UsernameSchema = z
  .string()
  .min(1, 'Username is required')
  .max(25, 'Username must be 25 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Schema for validating chat messages
 */
export const MessageSchema = z.object({
  username: UsernameSchema,
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message must be 500 characters or less'),
  timestamp: z.date(),
});

/**
 * Schema for validating poll data
 */
export const PollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'Poll must have at least 2 options')
    .max(5, 'Poll can have at most 5 options'),
  duration: z
    .number()
    .min(10, 'Duration must be at least 10 seconds')
    .max(3600, 'Duration must be at most 1 hour'),
});

/**
 * Schema for validating giveaway data
 */
export const GiveawaySchema = z.object({
  prize: z.string().min(1, 'Prize is required').max(200, 'Prize must be 200 characters or less'),
  keyword: z.string().min(1, 'Keyword is required').max(50, 'Keyword must be 50 characters or less'),
  duration: z.number().min(30, 'Duration must be at least 30 seconds').max(7200, 'Duration must be at most 2 hours'),
  subscriberOnly: z.boolean().default(false),
  followerOnly: z.boolean().default(false),
});

/**
 * Schema for validating user data
 */
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  username: UsernameSchema,
  displayName: z.string().max(50).optional(),
  isSubscriber: z.boolean().default(false),
  isFollower: z.boolean().default(false),
  isModerator: z.boolean().default(false),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type Message = z.infer<typeof MessageSchema>;
export type Poll = z.infer<typeof PollSchema>;
export type Giveaway = z.infer<typeof GiveawaySchema>;
export type User = z.infer<typeof UserSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates data against a schema and returns the result
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success status and either data or error
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Formats Zod validation errors into a user-friendly message
 * @param error - The Zod error object
 * @returns Formatted error message string
 */
export function formatValidationError(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}
