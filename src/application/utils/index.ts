/**
 * Application utilities barrel export
 */

export {
  groupEvents,
  isGroupableType,
  getGroupDisplayText,
  mergeAdjacentGroups,
  DEFAULT_GROUPING_CONFIG,
  DEFAULT_GROUPABLE_TYPES,
} from './eventGrouping';

export type {
  EventGroupingConfig,
  EventGroup,
  ActivityEventType,
  ActivityStreamEvent,
} from './eventGrouping';

// Time formatting utilities
export {
  formatRelativeTime,
  formatShortTime,
  formatFullTime,
  formatDuration,
  isValidTimestamp,
} from './timeFormat';

// UI color utilities
export {
  EVENT_COLORS,
  UI_STATE_COLORS,
  TIER_COLORS,
  getEventColor,
  getEventTint,
  getTierColor,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  getContrastingTextColor,
} from './uiColors';

export type { EventColorType } from './uiColors';

// Scope verification utilities
export {
  TWITCH_SCOPES,
  FEATURE_SCOPES,
  registerReauthPrompt,
  hasScope,
  hasAllScopes,
  hasAnyScope,
  verifyScopes,
  verifyScopesForFeature,
  canUsePredictions,
  canUseChannelPoints,
  getScopeDescription,
  getScopeDescriptions,
  createScopeChecker,
  withScopeCheck,
} from './scopeVerification';

export type {
  ScopeVerificationResult,
  ScopeVerificationOptions,
  ReauthPromptCallback,
} from './scopeVerification';

// Error handling utilities
export {
  ERROR_CODES,
  DEFAULT_RATE_LIMIT_CONFIG,
  parseApiError,
  isTwitchApiError,
  getErrorMessage,
  withRateLimit,
  withRetry,
  validateNonEmptyString,
  validateNumberRange,
  validateArrayLength,
  combineValidations,
  validateBeforeApiCall,
  formatErrorForDisplay,
  requiresUserAction,
  shouldAutoRetry,
} from './errorHandling';

export type {
  TwitchErrorContext,
  RateLimitConfig,
  RateLimitResult,
  ErrorCode,
} from './errorHandling';

// Encryption utilities
export {
  encryptSensitiveData,
  decryptSensitiveData,
  isEncrypted,
  encryptFields,
  decryptFields,
  generateChecksum,
  verifyChecksum,
} from './encryption';

// Vote processing utilities
export {
  VOTE_PATTERN,
  ALTERNATIVE_VOTE_PATTERNS,
  parseVote,
  parseVoteExtended,
  isVote,
  createVoteFromMessage,
  aggregateVotes,
  addVoteToAggregation,
  getTotalVotes,
  getVotesByPlatform,
  getWinningOptions,
  filterVotesByPlatform,
  filterVotesByTimeRange,
  filterVotesByOption,
  getUniqueVoters,
  deduplicateVotes,
  getPlatformDisplayName,
  getPlatformColor,
  formatVoteBreakdown,
} from './voteProcessing';
