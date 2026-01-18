/**
 * Poll Validation Schemas
 * 
 * Zod validation schemas for poll-related data types.
 * These schemas provide type-safe validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/pollSchema
 * @requirements 4.2 - Zod schema validation
 */

import { z } from 'zod';

// ============================================================================
// Poll Option Schema
// ============================================================================

/**
 * Schema for poll option colors (hex format)
 */
export const HexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format');

/**
 * Schema for poll option data
 */
export const PollOptionSchema = z.object({
  id: z.number().int().positive('Option ID must be a positive integer'),
  label: z.string().min(1, 'Option label is required').max(100, 'Option label must be 100 characters or less'),
  votes: z.number().int().nonnegative('Votes cannot be negative').default(0),
  color: HexColorSchema,
  icon: z.string().max(50).optional(),
  image: z.string().max(10000).optional(), // Base64 or URL
  voteKey: z.string().max(25).optional(),
});

/**
 * Schema for creating a new poll option (without id and votes)
 */
export const PollOptionCreateSchema = z.object({
  label: z.string().min(1, 'Option label is required').max(100, 'Option label must be 100 characters or less'),
  color: HexColorSchema,
  icon: z.string().max(50).optional(),
  image: z.string().max(10000).optional(),
  voteKey: z.string().max(25).optional(),
});

// ============================================================================
// Poll Schema
// ============================================================================

/**
 * Schema for vote match mode
 */
export const VoteMatchModeSchema = z.enum(['exact', 'partial']);

/**
 * Schema for complete poll data
 */
export const PollSchema = z.object({
  id: z.string().min(1, 'Poll ID is required'),
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  question: z.string().min(1, 'Question is required').max(500, 'Question must be 500 characters or less'),
  options: z
    .array(PollOptionSchema)
    .min(2, 'Poll must have at least 2 options')
    .max(10, 'Poll can have at most 10 options'),
  isActive: z.boolean(),
  totalVotes: z.number().int().nonnegative('Total votes cannot be negative'),
  startTime: z.number().int().positive('Start time must be a positive timestamp'),
  endTime: z.number().int().positive().optional(),
  maxVotes: z.number().int().positive('Max votes must be positive').optional(),
  duration: z
    .number()
    .int()
    .min(10, 'Duration must be at least 10 seconds')
    .max(86400, 'Duration must be at most 24 hours')
    .optional(),
  votePrefix: z.string().max(5).default('+'),
  voteMatchMode: VoteMatchModeSchema.default('exact'),
  progressBarColor: HexColorSchema.optional(),
  limitIndicatorColor: HexColorSchema.optional(),
});

/**
 * Schema for creating a new poll
 */
export const PollCreateSchema = z.object({
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  question: z.string().min(1, 'Question is required').max(500, 'Question must be 500 characters or less'),
  options: z
    .array(PollOptionCreateSchema)
    .min(2, 'Poll must have at least 2 options')
    .max(10, 'Poll can have at most 10 options'),
  maxVotes: z.number().int().positive('Max votes must be positive').optional(),
  duration: z
    .number()
    .int()
    .min(10, 'Duration must be at least 10 seconds')
    .max(86400, 'Duration must be at most 24 hours')
    .optional(),
  votePrefix: z.string().max(5).default('+'),
  voteMatchMode: VoteMatchModeSchema.default('exact'),
  progressBarColor: HexColorSchema.optional(),
  limitIndicatorColor: HexColorSchema.optional(),
});

// ============================================================================
// Vote Record Schema
// ============================================================================

/**
 * Schema for vote record data
 */
export const VoteRecordSchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required').max(25, 'Username must be 25 characters or less'),
  optionId: z.number().int().positive('Option ID must be a positive integer'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
  weight: z.number().int().min(1).max(5).default(1),
});

// ============================================================================
// Saved Poll Schema
// ============================================================================

/**
 * Schema for saved poll templates
 */
export const SavedPollSchema = z.object({
  id: z.string().min(1, 'Poll ID is required'),
  title: z.string().max(200).optional(),
  question: z.string().min(1, 'Question is required').max(500),
  options: z.array(
    z.object({
      label: z.string().min(1).max(100),
      color: HexColorSchema,
      icon: z.string().max(50).optional(),
      image: z.string().max(10000).optional(),
    })
  ).min(2).max(10),
  maxVotes: z.number().int().positive().optional(),
  duration: z.number().int().min(10).max(86400).optional(),
  isFavorite: z.boolean().default(false),
  progressBarColor: HexColorSchema.optional(),
  limitIndicatorColor: HexColorSchema.optional(),
  votePrefix: z.string().max(5).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type PollOption = z.infer<typeof PollOptionSchema>;
export type PollOptionCreate = z.infer<typeof PollOptionCreateSchema>;
export type Poll = z.infer<typeof PollSchema>;
export type PollCreate = z.infer<typeof PollCreateSchema>;
export type VoteRecord = z.infer<typeof VoteRecordSchema>;
export type SavedPoll = z.infer<typeof SavedPollSchema>;
export type VoteMatchMode = z.infer<typeof VoteMatchModeSchema>;
