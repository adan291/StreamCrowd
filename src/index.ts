/**
 * Hexagonal Architecture - Main Exports
 * 
 * Estructura:
 * - domain/    → Lógica de negocio pura (entities + ports)
 * - infrastructure/ → Implementaciones concretas (adapters)
 * - application/    → Servicios, hooks y juegos
 */

// Domain - Entities
export * from './domain/entities/Poll';
export { 
  validateVote,
  validateAccountAge,
  validateCooldown,
  canChangeVote,
  calculateWeight,
  isUserBlacklisted,
  isUserWhitelisted
} from './domain/entities/Vote';
export type { 
  RejectionReason,
  VoteValidationInput,
  VoteValidationResult,
  UserVoteState
} from './domain/entities/Vote';

// Domain - Ports (explicit exports to avoid duplicates)
export type { 
  ConnectionStatus,
  MessageCallback,
  StatusCallback,
  ChatMessage,
  StreamEvent,
  IChatProvider
} from './domain/ports/IChatProvider';
export * from './domain/ports/IOverlaySync';
export * from './domain/ports/IStorage';

// Infrastructure
export * from './infrastructure/factories/ProviderFactory';

// Application
export * from './application';
