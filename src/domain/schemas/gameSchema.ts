/**
 * Game Validation Schemas
 * 
 * Zod validation schemas for game-related data types.
 * These schemas provide type-safe validation and automatic TypeScript type inference.
 * 
 * @module domain/schemas/gameSchema
 * @requirements 4.2 - Zod schema validation
 */

import { z } from 'zod';

// ============================================================================
// Game Type Schema
// ============================================================================

/**
 * Schema for available game types
 */
export const GameTypeSchema = z.enum([
  'veo-veo',
  'fishing',
  'trivia',
  'ahorcado',
  'battleship',
  'carrera-emotes',
  'casino-roulette',
  'duck-hunt',
  'hot-potato',
  'memoria',
  'party-co',
  'piedra-papel-tijera',
  'pium',
]);

/**
 * Schema for game status
 */
export const GameStatusSchema = z.enum(['idle', 'active', 'paused', 'finished']);

// ============================================================================
// Game Player Schema
// ============================================================================

/**
 * Schema for game player data
 */
export const GamePlayerSchema = z.object({
  oderId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required').max(25, 'Username must be 25 characters or less'),
  score: z.number().int().nonnegative('Score cannot be negative').default(0),
  joinedAt: z.number().int().positive('Join timestamp must be positive'),
  isActive: z.boolean().default(true),
});

// ============================================================================
// Game Configuration Schema
// ============================================================================

/**
 * Schema for game configuration
 */
export const GameConfigSchema = z.object({
  maxPlayers: z.number().int().min(1).max(1000).default(100),
  minPlayers: z.number().int().min(1).max(100).default(1),
  duration: z.number().int().min(10).max(3600).optional(), // seconds
  pointsToWin: z.number().int().min(1).max(10000).optional(),
  allowLateJoin: z.boolean().default(true),
  subscribersOnly: z.boolean().default(false),
  followersOnly: z.boolean().default(false),
});

// ============================================================================
// Game Session Schema
// ============================================================================

/**
 * Schema for game session data
 */
export const GameSessionSchema = z.object({
  id: z.string().min(1, 'Game ID is required'),
  type: GameTypeSchema,
  status: GameStatusSchema,
  players: z.array(GamePlayerSchema),
  config: GameConfigSchema,
  startedAt: z.number().int().positive().optional(),
  endedAt: z.number().int().positive().optional(),
  createdAt: z.number().int().positive('Created timestamp must be positive'),
  winner: GamePlayerSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(), // Game-specific data
});

/**
 * Schema for creating a new game session
 */
export const GameSessionCreateSchema = z.object({
  type: GameTypeSchema,
  config: GameConfigSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Game Score Schema
// ============================================================================

/**
 * Schema for game score entry
 */
export const GameScoreSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  oderId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required').max(25),
  score: z.number().int().nonnegative('Score cannot be negative'),
  timestamp: z.number().int().positive('Timestamp must be positive'),
  gameType: GameTypeSchema,
});

// ============================================================================
// Game Result Schema
// ============================================================================

/**
 * Schema for game result data
 */
export const GameResultSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  gameType: GameTypeSchema,
  winner: GamePlayerSchema.optional(),
  topPlayers: z.array(GamePlayerSchema).max(10),
  totalPlayers: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(), // milliseconds
  endedAt: z.number().int().positive(),
});

// ============================================================================
// Trivia-Specific Schemas
// ============================================================================

/**
 * Schema for trivia question
 */
export const TriviaQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(6),
  correctIndex: z.number().int().nonnegative(),
  category: z.string().max(50).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  timeLimit: z.number().int().min(5).max(120).default(30), // seconds
});

/**
 * Schema for trivia game config
 */
export const TriviaConfigSchema = GameConfigSchema.extend({
  questions: z.array(TriviaQuestionSchema).min(1).max(50),
  pointsPerCorrect: z.number().int().min(1).max(1000).default(10),
  bonusForSpeed: z.boolean().default(true),
});

// ============================================================================
// Fishing-Specific Schemas
// ============================================================================

/**
 * Schema for fish types
 */
export const FishTypeSchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

/**
 * Schema for caught fish
 */
export const CaughtFishSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  type: FishTypeSchema,
  points: z.number().int().positive(),
  caughtBy: z.string().min(1),
  caughtAt: z.number().int().positive(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GameType = z.infer<typeof GameTypeSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type GamePlayer = z.infer<typeof GamePlayerSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type GameSessionCreate = z.infer<typeof GameSessionCreateSchema>;
export type GameScore = z.infer<typeof GameScoreSchema>;
export type GameResult = z.infer<typeof GameResultSchema>;
export type TriviaQuestion = z.infer<typeof TriviaQuestionSchema>;
export type TriviaConfig = z.infer<typeof TriviaConfigSchema>;
export type FishType = z.infer<typeof FishTypeSchema>;
export type CaughtFish = z.infer<typeof CaughtFishSchema>;
