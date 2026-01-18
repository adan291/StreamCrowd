/**
 * User Validation Schemas
 * 
 * Zod validation schemas for user-related data types.
 * These schemas provide type-safe validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/userSchema
 * @requirements 4.2 - Zod schema validation
 */

import { z } from 'zod';

// ============================================================================
// Username Schema
// ============================================================================

/**
 * Schema for validating usernames
 * - Must be 1-25 characters
 * - Alphanumeric with underscores allowed (Twitch format)
 */
export const UsernameSchema = z
  .string()
  .min(1, 'Username is required')
  .max(25, 'Username must be 25 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// ============================================================================
// User Role Schema
// ============================================================================

/**
 * Schema for user roles
 */
export const UserRoleSchema = z.enum(['viewer', 'follower', 'subscriber', 'vip', 'moderator', 'broadcaster']);

// ============================================================================
// User Schema
// ============================================================================

/**
 * Schema for basic user data
 */
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  username: UsernameSchema,
  displayName: z.string().max(50, 'Display name must be 50 characters or less').optional(),
  isSubscriber: z.boolean().default(false),
  isFollower: z.boolean().default(false),
  isModerator: z.boolean().default(false),
  isVip: z.boolean().default(false),
  isBroadcaster: z.boolean().default(false),
});

/**
 * Schema for extended user data with additional metadata
 */
export const ExtendedUserSchema = UserSchema.extend({
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  badges: z.array(z.string()).optional(),
  accountCreatedAt: z.number().int().positive().optional(),
  followedAt: z.number().int().positive().optional(),
  subscribedAt: z.number().int().positive().optional(),
  subscriptionTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('prime')]).optional(),
  subscriptionMonths: z.number().int().nonnegative().optional(),
});

// ============================================================================
// User State Schema
// ============================================================================

/**
 * Schema for user vote state (used in moderation)
 */
export const UserVoteStateSchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  hasVoted: z.boolean(),
  lastVoteTime: z.number().int().nonnegative(),
  currentOptionId: z.number().int().positive().optional(),
  voteWeight: z.number().int().min(1).max(5).default(1),
});

// ============================================================================
// Viewer Schema
// ============================================================================

/**
 * Schema for viewer data (chat participant)
 */
export const ViewerSchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  username: UsernameSchema,
  displayName: z.string().max(50).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  badges: z.array(z.string()).default([]),
  isSubscriber: z.boolean().default(false),
  isFollower: z.boolean().default(false),
  isModerator: z.boolean().default(false),
  isVip: z.boolean().default(false),
  firstSeenAt: z.number().int().positive(),
  lastSeenAt: z.number().int().positive(),
  messageCount: z.number().int().nonnegative().default(0),
});

// ============================================================================
// Judge Schema (for Judge Panel)
// ============================================================================

/**
 * Schema for judge data
 */
export const JudgeSchema = z.object({
  id: z.string().min(1, 'Judge ID is required'),
  username: UsernameSchema,
  channelName: z.string().min(1).max(25),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  isHost: z.boolean().default(false),
});

// ============================================================================
// Contestant Schema (for Judge Panel)
// ============================================================================

/**
 * Schema for contestant data
 */
export const ContestantSchema = z.object({
  id: z.string().min(1, 'Contestant ID is required'),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  image: z.string().max(50000).optional(), // Base64 or URL
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  voteKey: z.string().max(25).optional(),
});

// ============================================================================
// Blacklist/Whitelist Schema
// ============================================================================

/**
 * Schema for user list configuration (blacklist/whitelist)
 */
export const UserListConfigSchema = z.object({
  enabled: z.boolean().default(false),
  usernames: z.array(UsernameSchema).default([]),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Username = z.infer<typeof UsernameSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type ExtendedUser = z.infer<typeof ExtendedUserSchema>;
export type UserVoteState = z.infer<typeof UserVoteStateSchema>;
export type Viewer = z.infer<typeof ViewerSchema>;
export type Judge = z.infer<typeof JudgeSchema>;
export type Contestant = z.infer<typeof ContestantSchema>;
export type UserListConfig = z.infer<typeof UserListConfigSchema>;
