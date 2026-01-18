/**
 * Domain Entities - Modelos de datos y lógica de negocio pura
 * 
 * Estas entidades no tienen dependencias externas.
 * Contienen la lógica de negocio del dominio.
 */

export * from './Poll';
// Vote exports (excluding ModerationConfig which is in its own file)
export { 
  validateVote,
  validateAccountAge,
  validateCooldown,
  canChangeVote,
  calculateWeight,
  isUserBlacklisted,
  isUserWhitelisted,
  DEFAULT_MODERATION_CONFIG as VOTE_DEFAULT_MODERATION_CONFIG
} from './Vote';
export type { 
  RejectionReason, 
  VoteValidationInput, 
  VoteValidationResult, 
  UserVoteState 
} from './Vote';
export * from './StreamEvent';
export * from './ModerationConfig';
export * from './ChatMetrics';
export * from './OverlayState';
export * from './OverlayStateValidation';
