/**
 * Giveaway Validation Schemas
 * 
 * Zod validation schemas for giveaway-related data types.
 * These schemas provide type-safe validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/giveawaySchema
 * @requirements 4.2 - Zod schema validation
 */

import { z } from 'zod';

// ============================================================================
// Giveaway Mode Schema
// ============================================================================

/**
 * Schema for giveaway mode types
 */
export const GiveawayModeSchema = z.enum(['keyword', 'subs']);

// ============================================================================
// Participant Schema
// ============================================================================

/**
 * Schema for giveaway participant data
 */
export const GiveawayParticipantSchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required').max(25, 'Username must be 25 characters or less'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
  messageId: z.string().optional(),
});

// ============================================================================
// Subs Giveaway Config Schema
// ============================================================================

/**
 * Schema for subscription-based giveaway configuration
 */
export const SubsGiveawayConfigSchema = z.object({
  // Tier values
  tier1Value: z.number().int().min(1).max(100).default(1),
  tier2Value: z.number().int().min(1).max(100).default(2),
  tier3Value: z.number().int().min(1).max(100).default(5),
  primeValue: z.number().int().min(1).max(100).default(1),
  
  // Resubs
  resubEnabled: z.boolean().default(true),
  resubValue: z.number().int().min(1).max(100).default(1),
  resubBonusPerMonth: z.number().int().min(0).max(10).default(0),
  
  // Gift subs
  giftSubEnabled: z.boolean().default(true),
  giftSubValue: z.number().int().min(1).max(100).default(1),
  
  // Bits
  bitsEnabled: z.boolean().default(false),
  bitsPerEntry: z.number().int().min(1).max(10000).default(100),
  bitsMinimum: z.number().int().min(0).max(100000).default(100),
  
  // Donations
  donationsEnabled: z.boolean().default(false),
  donationPerEntry: z.number().min(0.01).max(1000).default(1),
  donationMinimum: z.number().min(0).max(10000).default(1),
  donationCurrency: z.string().length(3).default('EUR'),
  
  // Channel gifts
  channelGiftsEnabled: z.boolean().default(false),
  channelGiftValue: z.number().int().min(1).max(100).default(1),
});

// ============================================================================
// Giveaway Thread Schema
// ============================================================================

/**
 * Schema for giveaway thread data
 */
export const GiveawayThreadSchema = z.object({
  id: z.string().min(1, 'Giveaway ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  keyword: z.string().min(1, 'Keyword is required').max(50, 'Keyword must be 50 characters or less'),
  isActive: z.boolean(),
  participants: z.array(GiveawayParticipantSchema),
  createdAt: z.number().int().positive('Created timestamp must be positive'),
  closedAt: z.number().int().positive().optional(),
  winner: GiveawayParticipantSchema.optional(),
  
  // Options
  subscribersOnly: z.boolean().default(false),
  allowMultipleEntries: z.boolean().default(false),
  
  // Mode
  mode: GiveawayModeSchema,
  subsConfig: SubsGiveawayConfigSchema.optional(),
  
  // Timing
  startsAt: z.number().int().positive().optional(),
  endsAt: z.number().int().positive().optional(),
  
  // Prize images
  prizeImages: z.array(z.string().max(50000)).max(5).optional(),
});

/**
 * Schema for creating a new giveaway
 */
export const GiveawayCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  keyword: z.string().min(1, 'Keyword is required').max(50, 'Keyword must be 50 characters or less'),
  mode: GiveawayModeSchema.default('keyword'),
  subscribersOnly: z.boolean().default(false),
  allowMultipleEntries: z.boolean().default(false),
  subsConfig: SubsGiveawayConfigSchema.optional(),
  startsAt: z.number().int().positive().optional(),
  endsAt: z.number().int().positive().optional(),
  prizeImages: z.array(z.string().max(50000)).max(5).optional(),
});

// ============================================================================
// Subs Giveaway Entry Schema
// ============================================================================

/**
 * Schema for entry type in subs giveaway
 */
export const SubsEntryTypeSchema = z.enum(['sub', 'resub', 'giftsub', 'bits', 'donation', 'channelgift']);

/**
 * Schema for subscription tier
 */
export const SubsTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('prime')]);

/**
 * Schema for subs giveaway entry
 */
export const SubsGiveawayEntrySchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required').max(25),
  entries: z.number().int().positive('Entries must be positive'),
  type: SubsEntryTypeSchema,
  tier: SubsTierSchema.optional(),
  months: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  timestamp: z.number().int().positive(),
});

// ============================================================================
// Simple Giveaway Schema (for basic validation)
// ============================================================================

/**
 * Schema for simple giveaway data (used in validation.ts)
 */
export const SimpleGiveawaySchema = z.object({
  prize: z.string().min(1, 'Prize is required').max(200, 'Prize must be 200 characters or less'),
  keyword: z.string().min(1, 'Keyword is required').max(50, 'Keyword must be 50 characters or less'),
  duration: z.number().min(30, 'Duration must be at least 30 seconds').max(7200, 'Duration must be at most 2 hours'),
  subscriberOnly: z.boolean().default(false),
  followerOnly: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GiveawayMode = z.infer<typeof GiveawayModeSchema>;
export type GiveawayParticipant = z.infer<typeof GiveawayParticipantSchema>;
export type SubsGiveawayConfig = z.infer<typeof SubsGiveawayConfigSchema>;
export type GiveawayThread = z.infer<typeof GiveawayThreadSchema>;
export type GiveawayCreate = z.infer<typeof GiveawayCreateSchema>;
export type SubsEntryType = z.infer<typeof SubsEntryTypeSchema>;
export type SubsTier = z.infer<typeof SubsTierSchema>;
export type SubsGiveawayEntry = z.infer<typeof SubsGiveawayEntrySchema>;
export type SimpleGiveaway = z.infer<typeof SimpleGiveawaySchema>;
