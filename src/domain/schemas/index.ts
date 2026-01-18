/**
 * Domain Validation Schemas
 * 
 * Contains Zod validation schemas for domain entities:
 * - validation.ts: Common validation utilities
 * - pollSchema.ts: Poll validation
 * - giveawaySchema.ts: Giveaway validation
 * - gameSchema.ts: Game validation
 * - userSchema.ts: User validation
 * - messageSchema.ts: Message validation
 * - securitySchemas.ts: Security validation
 * 
 * @requirements 4.2 - Zod schema validation
 */

// Export validation utilities (excluding types that are redefined in specific schemas)
export {
  sanitizeHtml,
  sanitizedString,
  MessageSchema,
  GiveawaySchema,
  validateData,
  formatValidationError,
  type Message,
  type Giveaway,
} from './validation';

// Export poll schemas (more comprehensive than validation.ts)
export * from './pollSchema';

// Export giveaway schemas
export {
  GiveawayModeSchema,
  GiveawayParticipantSchema,
  SubsGiveawayConfigSchema,
  GiveawayThreadSchema,
  GiveawayCreateSchema,
  SubsEntryTypeSchema,
  SubsTierSchema,
  SubsGiveawayEntrySchema,
  SimpleGiveawaySchema,
  type GiveawayMode,
  type GiveawayParticipant,
  type SubsGiveawayConfig,
  type GiveawayThread,
  type GiveawayCreate,
  type SubsEntryType,
  type SubsTier,
  type SubsGiveawayEntry,
  type SimpleGiveaway,
} from './giveawaySchema';

// Export game schemas
export * from './gameSchema';

// Export user schemas (more comprehensive than validation.ts)
export {
  UserRoleSchema,
  UserSchema,
  ExtendedUserSchema,
  UserVoteStateSchema,
  ViewerSchema,
  JudgeSchema,
  ContestantSchema,
  UserListConfigSchema,
  type Username,
  type UserRole,
  type User,
  type ExtendedUser,
  type UserVoteState,
  type Viewer,
  type Judge,
  type Contestant,
  type UserListConfig,
} from './userSchema';

// Re-export UsernameSchema from userSchema (preferred over validation.ts)
export { UsernameSchema } from './userSchema';

// Export message schemas (excluding duplicates)
export {
  ChatMessageSchema,
  TwitchMessageSchema,
  SimpleMessageSchema,
  CommandMessageSchema,
  VoteMessageSchema,
  ModerationActionSchema,
  RejectionReasonSchema,
  ModerationLogEntrySchema,
  NotificationTypeSchema,
  NotificationMessageSchema,
  SystemEventTypeSchema,
  SystemEventSchema,
  type ChatMessage,
  type TwitchMessage,
  type SimpleMessage,
  type CommandMessage,
  type VoteMessage,
  type ModerationAction,
  type RejectionReason,
  type ModerationLogEntry,
  type NotificationType,
  type NotificationMessage,
  type SystemEventType,
  type SystemEvent,
} from './messageSchema';

// Export security schemas
export {
  SessionIdSchema,
  OverlayTypeSchema,
  OverlayUrlSchema,
  TokenSchema,
  FirebaseUserSchema,
  validateInput,
  safeValidateInput,
  type SessionId,
  type OverlayType,
  type OverlayUrl,
  type Token,
  type FirebaseUser,
} from './securitySchemas';
