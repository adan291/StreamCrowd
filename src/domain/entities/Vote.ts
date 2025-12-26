/**
 * Vote Entity - Modelo de dominio para votos y moderación
 * 
 * Contiene la lógica de validación de votos, pesos y moderación.
 */

export type RejectionReason =
  | 'ACCOUNT_TOO_YOUNG'
  | 'COOLDOWN_ACTIVE'
  | 'VOTE_CHANGE_DISABLED'
  | 'INVALID_OPTION'
  | 'NOT_WHITELISTED'
  | 'BLACKLISTED';

export interface ModerationConfig {
  minAccountAgeDays: number;
  voteChangeEnabled: boolean;
  voteChangeCooldownSeconds: number;
  weights: {
    subscriber: number;
    follower: number;
    regular: number;
  };
  whitelist: {
    enabled: boolean;
    usernames: string[];
  };
  blacklist: {
    enabled: boolean;
    usernames: string[];
  };
}

export interface VoteValidationInput {
  username: string;
  oderId: string;
  optionId: number;
  accountAgeDays: number;
  hasVoted: boolean;
  lastVoteTime: number;
  currentTime: number;
  isSubscriber: boolean;
  isFollower: boolean;
}

export interface VoteValidationResult {
  isValid: boolean;
  rejectionReason?: RejectionReason;
  weight: number;
  isVoteChange: boolean;
  previousOptionId?: number;
  previousWeight?: number;
}

export interface UserVoteState {
  optionId: number;
  timestamp: number;
  weight: number;
  canChangeAt?: number;
}

export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  minAccountAgeDays: 0,
  voteChangeEnabled: true,
  voteChangeCooldownSeconds: 0,
  weights: {
    subscriber: 1,
    follower: 1,
    regular: 1,
  },
  whitelist: {
    enabled: false,
    usernames: [],
  },
  blacklist: {
    enabled: false,
    usernames: [],
  },
};

/**
 * Funciones puras de validación de votos
 */

export function validateAccountAge(accountAgeDays: number, minAge: number): boolean {
  if (minAge === 0) return true;
  return accountAgeDays >= minAge;
}

export function validateCooldown(
  lastVoteTime: number,
  cooldownSeconds: number,
  currentTime: number
): boolean {
  if (lastVoteTime === 0) return true;
  const elapsedSeconds = (currentTime - lastVoteTime) / 1000;
  return elapsedSeconds >= cooldownSeconds;
}

export function canChangeVote(hasVoted: boolean, voteChangeEnabled: boolean): boolean {
  if (!hasVoted) return true;
  return voteChangeEnabled;
}

export function calculateWeight(
  isSubscriber: boolean,
  isFollower: boolean,
  config: ModerationConfig
): number {
  if (isSubscriber) return config.weights.subscriber;
  if (isFollower) return config.weights.follower;
  return config.weights.regular;
}

export function isUserBlacklisted(username: string, config: ModerationConfig): boolean {
  if (!config.blacklist.enabled || config.blacklist.usernames.length === 0) {
    return false;
  }
  const normalized = username.toLowerCase();
  return config.blacklist.usernames.some(name => name.toLowerCase() === normalized);
}

export function isUserWhitelisted(username: string, config: ModerationConfig): boolean {
  if (!config.whitelist.enabled || config.whitelist.usernames.length === 0) {
    return true; // If whitelist is disabled, everyone is "whitelisted"
  }
  const normalized = username.toLowerCase();
  return config.whitelist.usernames.some(name => name.toLowerCase() === normalized);
}

export function validateVote(
  input: VoteValidationInput,
  config: ModerationConfig,
  validOptionIds: number[],
  existingVoteState?: UserVoteState
): VoteValidationResult {
  // Check blacklist first
  if (isUserBlacklisted(input.username, config)) {
    return { isValid: false, rejectionReason: 'BLACKLISTED', weight: 0, isVoteChange: false };
  }
  
  // Check whitelist
  if (!isUserWhitelisted(input.username, config)) {
    return { isValid: false, rejectionReason: 'NOT_WHITELISTED', weight: 0, isVoteChange: false };
  }
  
  // Check valid option
  if (!validOptionIds.includes(input.optionId)) {
    return { isValid: false, rejectionReason: 'INVALID_OPTION', weight: 0, isVoteChange: false };
  }
  
  // Check account age
  if (!validateAccountAge(input.accountAgeDays, config.minAccountAgeDays)) {
    return { isValid: false, rejectionReason: 'ACCOUNT_TOO_YOUNG', weight: 0, isVoteChange: false };
  }
  
  // Check vote change permission
  if (!canChangeVote(input.hasVoted, config.voteChangeEnabled)) {
    return { isValid: false, rejectionReason: 'VOTE_CHANGE_DISABLED', weight: 0, isVoteChange: false };
  }
  
  // Check cooldown
  if (input.hasVoted && !validateCooldown(input.lastVoteTime, config.voteChangeCooldownSeconds, input.currentTime)) {
    return { isValid: false, rejectionReason: 'COOLDOWN_ACTIVE', weight: 0, isVoteChange: false };
  }
  
  // Calculate weight
  const weight = calculateWeight(input.isSubscriber, input.isFollower, config);
  
  // Determine if this is a vote change
  const isVoteChange = input.hasVoted && existingVoteState !== undefined;
  
  return {
    isValid: true,
    weight,
    isVoteChange,
    previousOptionId: isVoteChange ? existingVoteState?.optionId : undefined,
    previousWeight: isVoteChange ? existingVoteState?.weight : undefined,
  };
}
