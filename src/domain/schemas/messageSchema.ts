/**
 * Message Validation Schemas
 * 
 * Zod validation schemas for message-related data types.
 * These schemas provide type-safe validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/messageSchema
 * @requirements 4.2 - Zod schema validation
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';
import { UsernameSchema } from './userSchema';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtmlMessage = (html: string): string => {
  return DOMPurify.sanitize(html) as string;
};

/**
 * Creates a Zod string schema that sanitizes HTML
 */
export const sanitizedMessageString = () =>
  z.string().transform((val) => sanitizeHtmlMessage(val));

// ============================================================================
// Chat Message Schema
// ============================================================================

/**
 * Schema for chat message data
 */
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  username: UsernameSchema,
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message must be 500 characters or less'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  userId: z.string().optional(),
  isSubscriber: z.boolean().default(false),
  timestamp: z.number().int().positive().optional(),
  sourceChannel: z.string().max(25).optional(), // For collaboration mode
});

/**
 * Schema for Twitch message (extended chat message)
 */
export const TwitchMessageSchema = ChatMessageSchema.extend({
  badges: z.array(z.string()).optional(),
  emotes: z.record(z.string(), z.array(z.string())).optional(),
  isFirstMessage: z.boolean().optional(),
  isModerator: z.boolean().optional(),
  isVip: z.boolean().optional(),
  isBroadcaster: z.boolean().optional(),
});

// ============================================================================
// Simple Message Schema
// ============================================================================

/**
 * Schema for simple message validation (used in validation.ts)
 */
export const SimpleMessageSchema = z.object({
  username: UsernameSchema,
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message must be 500 characters or less'),
  timestamp: z.date(),
});

// ============================================================================
// Command Message Schema
// ============================================================================

/**
 * Schema for command message data
 */
export const CommandMessageSchema = z.object({
  command: z.string().min(1, 'Command is required').max(50, 'Command must be 50 characters or less'),
  args: z.array(z.string()).default([]),
  username: UsernameSchema,
  userId: z.string().min(1),
  timestamp: z.number().int().positive(),
  isSubscriber: z.boolean().default(false),
  isModerator: z.boolean().default(false),
});

// ============================================================================
// Vote Message Schema
// ============================================================================

/**
 * Schema for vote message data
 */
export const VoteMessageSchema = z.object({
  username: UsernameSchema,
  userId: z.string().min(1, 'User ID is required'),
  voteText: z.string().min(1, 'Vote text is required').max(50),
  timestamp: z.number().int().positive(),
  isSubscriber: z.boolean().default(false),
  isFollower: z.boolean().default(false),
});

// ============================================================================
// Moderation Log Entry Schema
// ============================================================================

/**
 * Schema for moderation action types
 */
export const ModerationActionSchema = z.enum(['REJECTED', 'ACCEPTED', 'VOTE_CHANGED']);

/**
 * Schema for rejection reasons
 */
export const RejectionReasonSchema = z.enum([
  'ACCOUNT_TOO_YOUNG',
  'COOLDOWN_ACTIVE',
  'VOTE_CHANGE_DISABLED',
  'INVALID_OPTION',
  'NOT_WHITELISTED',
  'BLACKLISTED',
]);

/**
 * Schema for moderation log entry
 */
export const ModerationLogEntrySchema = z.object({
  timestamp: z.number().int().positive(),
  username: UsernameSchema,
  oderId: z.string().min(1),
  action: ModerationActionSchema,
  reason: RejectionReasonSchema.optional(),
  optionId: z.number().int().positive(),
  weight: z.number().int().min(1).max(5),
});

// ============================================================================
// Notification Message Schema
// ============================================================================

/**
 * Schema for notification types
 */
export const NotificationTypeSchema = z.enum(['info', 'success', 'warning', 'error']);

/**
 * Schema for notification message
 */
export const NotificationMessageSchema = z.object({
  id: z.string().min(1),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(100),
  message: z.string().max(500),
  timestamp: z.number().int().positive(),
  duration: z.number().int().min(1000).max(60000).default(5000), // milliseconds
  dismissible: z.boolean().default(true),
});

// ============================================================================
// System Event Schema
// ============================================================================

/**
 * Schema for system event types
 */
export const SystemEventTypeSchema = z.enum([
  'poll_created',
  'poll_started',
  'poll_ended',
  'giveaway_created',
  'giveaway_started',
  'giveaway_winner',
  'game_started',
  'game_ended',
  'user_joined',
  'user_left',
  'connection_established',
  'connection_lost',
  'error',
]);

/**
 * Schema for system event
 */
export const SystemEventSchema = z.object({
  id: z.string().min(1),
  type: SystemEventTypeSchema,
  message: z.string().max(500),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type TwitchMessage = z.infer<typeof TwitchMessageSchema>;
export type SimpleMessage = z.infer<typeof SimpleMessageSchema>;
export type CommandMessage = z.infer<typeof CommandMessageSchema>;
export type VoteMessage = z.infer<typeof VoteMessageSchema>;
export type ModerationAction = z.infer<typeof ModerationActionSchema>;
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;
export type ModerationLogEntry = z.infer<typeof ModerationLogEntrySchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>;
export type SystemEventType = z.infer<typeof SystemEventTypeSchema>;
export type SystemEvent = z.infer<typeof SystemEventSchema>;
