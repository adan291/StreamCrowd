/**
 * Overlay State Validation - Pure validation functions for overlay states
 * 
 * This module provides comprehensive validation for overlay state entities,
 * including schema versioning and data integrity checks.
 * 
 * All functions are pure and have no external dependencies.
 */

import { 
  OverlayState, 
  BaseOverlayState, 
  PollOverlayState, 
  GiveawayOverlayState, 
  GameOverlayState, 
  PredictionOverlayState
} from './OverlayState';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  
  /** List of validation errors */
  errors: ValidationError[];
  
  /** Warnings that don't prevent usage but should be noted */
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field path where the error occurred */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Error code for programmatic handling */
  code: string;
  
  /** Current value that failed validation */
  value?: unknown;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Field path where the warning occurred */
  field: string;
  
  /** Warning message */
  message: string;
  
  /** Warning code for programmatic handling */
  code: string;
}

/**
 * Schema version information
 */
export interface SchemaVersion {
  /** Current schema version */
  version: number;
  
  /** Migration functions for each version */
  migrations: Record<number, (state: Record<string, unknown>) => Record<string, unknown>>;
  
  /** Minimum supported version */
  minVersion: number;
  
  /** Maximum supported version */
  maxVersion: number;
}

/**
 * Current overlay state schema configuration
 */
export const OVERLAY_STATE_SCHEMA: SchemaVersion = {
  version: 2,
  minVersion: 1,
  maxVersion: 2,
  migrations: {
    1: (state: Record<string, unknown>) => ({
      ...state,
      version: 1,
      updatedAt: state.updatedAt || Date.now(),
    }),
    2: (state: Record<string, unknown>) => ({
      ...state,
      version: 2,
      channelId: state.channelId || 'default',
      updatedAt: state.updatedAt || Date.now(),
    }),
  },
};

/**
 * Validates the base overlay state properties
 */
export function validateBaseOverlayState(state: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!state || typeof state !== 'object') {
    errors.push({
      field: 'root',
      message: 'State must be an object',
      code: 'INVALID_TYPE',
      value: state,
    });
    return { isValid: false, errors, warnings };
  }

  const baseState = state as Partial<BaseOverlayState>;

  // Validate required fields
  if (!baseState.id || typeof baseState.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'ID must be a non-empty string',
      code: 'MISSING_ID',
      value: baseState.id,
    });
  }

  if (!baseState.type || !['poll', 'giveaway', 'game', 'prediction'].includes(baseState.type)) {
    errors.push({
      field: 'type',
      message: 'Type must be one of: poll, giveaway, game, prediction',
      code: 'INVALID_TYPE',
      value: baseState.type,
    });
  }

  if (typeof baseState.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean',
      code: 'INVALID_TYPE',
      value: baseState.isActive,
    });
  }

  if (!baseState.updatedAt || typeof baseState.updatedAt !== 'number' || baseState.updatedAt <= 0) {
    errors.push({
      field: 'updatedAt',
      message: 'updatedAt must be a positive number (timestamp)',
      code: 'INVALID_TIMESTAMP',
      value: baseState.updatedAt,
    });
  }

  if (!baseState.version || typeof baseState.version !== 'number' || baseState.version < 1) {
    errors.push({
      field: 'version',
      message: 'version must be a positive number',
      code: 'INVALID_VERSION',
      value: baseState.version,
    });
  }

  if (!baseState.channelId || typeof baseState.channelId !== 'string') {
    errors.push({
      field: 'channelId',
      message: 'channelId must be a non-empty string',
      code: 'MISSING_CHANNEL_ID',
      value: baseState.channelId,
    });
  }

  // Check for future timestamps (warning)
  if (baseState.updatedAt && baseState.updatedAt > Date.now() + 60000) { // 1 minute tolerance
    warnings.push({
      field: 'updatedAt',
      message: 'updatedAt is in the future',
      code: 'FUTURE_TIMESTAMP',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates poll overlay state data
 */
export function validatePollOverlayState(state: PollOverlayState): ValidationResult {
  const baseResult = validateBaseOverlayState(state);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  if (!state.data || typeof state.data !== 'object') {
    errors.push({
      field: 'data',
      message: 'Poll data must be an object',
      code: 'MISSING_DATA',
      value: state.data,
    });
    return { isValid: false, errors, warnings };
  }

  const { data } = state;

  // Validate question
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
    errors.push({
      field: 'data.question',
      message: 'Question must be a non-empty string',
      code: 'INVALID_QUESTION',
      value: data.question,
    });
  }

  // Validate options
  if (!Array.isArray(data.options) || data.options.length === 0) {
    errors.push({
      field: 'data.options',
      message: 'Options must be a non-empty array',
      code: 'INVALID_OPTIONS',
      value: data.options,
    });
  } else {
    data.options.forEach((option, index) => {
      if (!option || typeof option !== 'object') {
        errors.push({
          field: `data.options[${index}]`,
          message: 'Option must be an object',
          code: 'INVALID_OPTION',
          value: option,
        });
        return;
      }

      if (typeof option.id !== 'number' || option.id < 1) {
        errors.push({
          field: `data.options[${index}].id`,
          message: 'Option ID must be a positive number',
          code: 'INVALID_OPTION_ID',
          value: option.id,
        });
      }

      if (!option.label || typeof option.label !== 'string' || option.label.trim().length === 0) {
        errors.push({
          field: `data.options[${index}].label`,
          message: 'Option label must be a non-empty string',
          code: 'INVALID_OPTION_LABEL',
          value: option.label,
        });
      }

      if (typeof option.votes !== 'number' || option.votes < 0) {
        errors.push({
          field: `data.options[${index}].votes`,
          message: 'Option votes must be a non-negative number',
          code: 'INVALID_OPTION_VOTES',
          value: option.votes,
        });
      }

      if (!option.color || typeof option.color !== 'string') {
        errors.push({
          field: `data.options[${index}].color`,
          message: 'Option color must be a string',
          code: 'INVALID_OPTION_COLOR',
          value: option.color,
        });
      }
    });

    // Check for duplicate option IDs
    const optionIds = data.options.map(o => o.id);
    const duplicateIds = optionIds.filter((id, index) => optionIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push({
        field: 'data.options',
        message: `Duplicate option IDs found: ${duplicateIds.join(', ')}`,
        code: 'DUPLICATE_OPTION_IDS',
        value: duplicateIds,
      });
    }
  }

  // Validate totalVotes
  if (typeof data.totalVotes !== 'number' || data.totalVotes < 0) {
    errors.push({
      field: 'data.totalVotes',
      message: 'totalVotes must be a non-negative number',
      code: 'INVALID_TOTAL_VOTES',
      value: data.totalVotes,
    });
  }

  // Validate showResults
  if (typeof data.showResults !== 'boolean') {
    errors.push({
      field: 'data.showResults',
      message: 'showResults must be a boolean',
      code: 'INVALID_SHOW_RESULTS',
      value: data.showResults,
    });
  }

  // Validate timestamps
  if (typeof data.startTime !== 'number' || data.startTime <= 0) {
    errors.push({
      field: 'data.startTime',
      message: 'startTime must be a positive number (timestamp)',
      code: 'INVALID_START_TIME',
      value: data.startTime,
    });
  }

  if (data.endTime !== undefined && (typeof data.endTime !== 'number' || data.endTime <= 0)) {
    errors.push({
      field: 'data.endTime',
      message: 'endTime must be a positive number (timestamp) or undefined',
      code: 'INVALID_END_TIME',
      value: data.endTime,
    });
  }

  // Validate optional fields
  if (data.maxVotes !== undefined && (typeof data.maxVotes !== 'number' || data.maxVotes <= 0)) {
    errors.push({
      field: 'data.maxVotes',
      message: 'maxVotes must be a positive number or undefined',
      code: 'INVALID_MAX_VOTES',
      value: data.maxVotes,
    });
  }

  if (data.duration !== undefined && (typeof data.duration !== 'number' || data.duration <= 0)) {
    errors.push({
      field: 'data.duration',
      message: 'duration must be a positive number or undefined',
      code: 'INVALID_DURATION',
      value: data.duration,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates giveaway overlay state data
 */
export function validateGiveawayOverlayState(state: GiveawayOverlayState): ValidationResult {
  const baseResult = validateBaseOverlayState(state);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  if (!state.data || typeof state.data !== 'object') {
    errors.push({
      field: 'data',
      message: 'Giveaway data must be an object',
      code: 'MISSING_DATA',
      value: state.data,
    });
    return { isValid: false, errors, warnings };
  }

  const { data } = state;

  // Validate winner
  if (data.winner !== null && (typeof data.winner !== 'string' || data.winner.trim().length === 0)) {
    errors.push({
      field: 'data.winner',
      message: 'Winner must be null or a non-empty string',
      code: 'INVALID_WINNER',
      value: data.winner,
    });
  }

  // Validate isSpinning
  if (typeof data.isSpinning !== 'boolean') {
    errors.push({
      field: 'data.isSpinning',
      message: 'isSpinning must be a boolean',
      code: 'INVALID_IS_SPINNING',
      value: data.isSpinning,
    });
  }

  // Validate participants
  if (!Array.isArray(data.participants)) {
    errors.push({
      field: 'data.participants',
      message: 'participants must be an array',
      code: 'INVALID_PARTICIPANTS',
      value: data.participants,
    });
  } else {
    data.participants.forEach((participant, index) => {
      if (typeof participant !== 'string' || participant.trim().length === 0) {
        errors.push({
          field: `data.participants[${index}]`,
          message: 'Participant must be a non-empty string',
          code: 'INVALID_PARTICIPANT',
          value: participant,
        });
      }
    });
  }

  // Validate mode
  if (!['viewers', 'keyword', 'subscribers'].includes(data.mode)) {
    errors.push({
      field: 'data.mode',
      message: 'mode must be one of: viewers, keyword, subscribers',
      code: 'INVALID_MODE',
      value: data.mode,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates game overlay state data
 */
export function validateGameOverlayState(state: GameOverlayState): ValidationResult {
  const baseResult = validateBaseOverlayState(state);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  if (!state.data || typeof state.data !== 'object') {
    errors.push({
      field: 'data',
      message: 'Game data must be an object',
      code: 'MISSING_DATA',
      value: state.data,
    });
    return { isValid: false, errors, warnings };
  }

  const { data } = state;

  // Validate gameType
  if (!data.gameType || typeof data.gameType !== 'string' || data.gameType.trim().length === 0) {
    errors.push({
      field: 'data.gameType',
      message: 'gameType must be a non-empty string',
      code: 'INVALID_GAME_TYPE',
      value: data.gameType,
    });
  }

  // Validate state
  if (!data.state || typeof data.state !== 'object') {
    errors.push({
      field: 'data.state',
      message: 'Game state must be an object',
      code: 'INVALID_GAME_STATE',
      value: data.state,
    });
  }

  // Validate players
  if (!Array.isArray(data.players)) {
    errors.push({
      field: 'data.players',
      message: 'players must be an array',
      code: 'INVALID_PLAYERS',
      value: data.players,
    });
  } else {
    data.players.forEach((player, index) => {
      if (typeof player !== 'string' || player.trim().length === 0) {
        errors.push({
          field: `data.players[${index}]`,
          message: 'Player must be a non-empty string',
          code: 'INVALID_PLAYER',
          value: player,
        });
      }
    });
  }

  // Validate isActive
  if (typeof data.isActive !== 'boolean') {
    errors.push({
      field: 'data.isActive',
      message: 'isActive must be a boolean',
      code: 'INVALID_IS_ACTIVE',
      value: data.isActive,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates prediction overlay state data
 */
export function validatePredictionOverlayState(state: PredictionOverlayState): ValidationResult {
  const baseResult = validateBaseOverlayState(state);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  if (!state.data || typeof state.data !== 'object') {
    errors.push({
      field: 'data',
      message: 'Prediction data must be an object',
      code: 'MISSING_DATA',
      value: state.data,
    });
    return { isValid: false, errors, warnings };
  }

  const { data } = state;

  // Validate title
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({
      field: 'data.title',
      message: 'title must be a non-empty string',
      code: 'INVALID_TITLE',
      value: data.title,
    });
  }

  // Validate outcomes
  if (!Array.isArray(data.outcomes) || data.outcomes.length === 0) {
    errors.push({
      field: 'data.outcomes',
      message: 'outcomes must be a non-empty array',
      code: 'INVALID_OUTCOMES',
      value: data.outcomes,
    });
  } else {
    data.outcomes.forEach((outcome, index) => {
      if (!outcome || typeof outcome !== 'object') {
        errors.push({
          field: `data.outcomes[${index}]`,
          message: 'Outcome must be an object',
          code: 'INVALID_OUTCOME',
          value: outcome,
        });
        return;
      }

      if (!outcome.id || typeof outcome.id !== 'string') {
        errors.push({
          field: `data.outcomes[${index}].id`,
          message: 'Outcome ID must be a non-empty string',
          code: 'INVALID_OUTCOME_ID',
          value: outcome.id,
        });
      }

      if (!outcome.title || typeof outcome.title !== 'string') {
        errors.push({
          field: `data.outcomes[${index}].title`,
          message: 'Outcome title must be a non-empty string',
          code: 'INVALID_OUTCOME_TITLE',
          value: outcome.title,
        });
      }

      if (typeof outcome.users !== 'number' || outcome.users < 0) {
        errors.push({
          field: `data.outcomes[${index}].users`,
          message: 'Outcome users must be a non-negative number',
          code: 'INVALID_OUTCOME_USERS',
          value: outcome.users,
        });
      }

      if (typeof outcome.channelPoints !== 'number' || outcome.channelPoints < 0) {
        errors.push({
          field: `data.outcomes[${index}].channelPoints`,
          message: 'Outcome channelPoints must be a non-negative number',
          code: 'INVALID_OUTCOME_POINTS',
          value: outcome.channelPoints,
        });
      }
    });
  }

  // Validate status
  if (!['ACTIVE', 'LOCKED', 'RESOLVED', 'CANCELED'].includes(data.status)) {
    errors.push({
      field: 'data.status',
      message: 'status must be one of: ACTIVE, LOCKED, RESOLVED, CANCELED',
      code: 'INVALID_STATUS',
      value: data.status,
    });
  }

  // Validate timestamps
  if (typeof data.startTime !== 'number' || data.startTime <= 0) {
    errors.push({
      field: 'data.startTime',
      message: 'startTime must be a positive number (timestamp)',
      code: 'INVALID_START_TIME',
      value: data.startTime,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Main validation function that routes to specific validators based on overlay type
 */
export function validateOverlayState(state: OverlayState): ValidationResult {
  switch (state.type) {
    case 'poll':
      return validatePollOverlayState(state as PollOverlayState);
    case 'giveaway':
      return validateGiveawayOverlayState(state as GiveawayOverlayState);
    case 'game':
      return validateGameOverlayState(state as GameOverlayState);
    case 'prediction':
      return validatePredictionOverlayState(state as PredictionOverlayState);
    default:
      return {
        isValid: false,
        errors: [{
          field: 'type',
          message: `Unknown overlay type: ${(state as Record<string, unknown>).type}`,
          code: 'UNKNOWN_TYPE',
          value: (state as Record<string, unknown>).type,
        }],
        warnings: [],
      };
  }
}

/**
 * Validates overlay state schema version and performs migration if needed
 */
export function validateAndMigrateSchema(state: Record<string, unknown>): { state: OverlayState; migrated: boolean } | null {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const version = (state.version as number) || 1;
  
  // Check if version is supported
  if (version < OVERLAY_STATE_SCHEMA.minVersion || version > OVERLAY_STATE_SCHEMA.maxVersion) {
    return null;
  }

  let migratedState = { ...state };
  let migrated = false;

  // Apply migrations if needed
  if (version < OVERLAY_STATE_SCHEMA.version) {
    for (let v = version; v < OVERLAY_STATE_SCHEMA.version; v++) {
      const migration = OVERLAY_STATE_SCHEMA.migrations[v + 1];
      if (migration) {
        migratedState = migration(migratedState);
        migrated = true;
      }
    }
  }

  return { state: migratedState as unknown as OverlayState, migrated };
}

/**
 * Checks if two overlay states are equivalent (deep comparison)
 */
export function areOverlayStatesEqual(state1: OverlayState, state2: OverlayState): boolean {
  // Quick reference check
  if (state1 === state2) return true;
  
  // Type check
  if (state1.type !== state2.type) return false;
  
  // Deep comparison using JSON serialization (simple but effective for pure data)
  try {
    return JSON.stringify(state1) === JSON.stringify(state2);
  } catch {
    return false;
  }
}

/**
 * Creates a sanitized version of overlay state for logging (removes sensitive data)
 */
export function sanitizeOverlayStateForLogging(state: OverlayState): Partial<OverlayState> {
  return {
    id: state.id,
    type: state.type,
    isActive: state.isActive,
    version: state.version,
    channelId: state.channelId.substring(0, 8) + '...', // Truncate for privacy
    updatedAt: state.updatedAt,
  };
}