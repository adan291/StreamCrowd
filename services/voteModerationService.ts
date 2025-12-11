/**
 * Vote Moderation Service
 * Provides types and utilities for vote moderation in TwitchVote Live
 */

// Rejection reasons for vote validation
export type RejectionReason =
  | 'ACCOUNT_TOO_YOUNG'
  | 'COOLDOWN_ACTIVE'
  | 'VOTE_CHANGE_DISABLED'
  | 'INVALID_OPTION'
  | 'NOT_WHITELISTED'
  | 'BLACKLISTED';

// Configuration for vote moderation
export interface ModerationConfig {
  minAccountAgeDays: number;           // 0 = no filter
  voteChangeEnabled: boolean;
  voteChangeCooldownSeconds: number;
  weights: {
    subscriber: number;                 // 1-5
    follower: number;                   // 1-5
    regular: number;                    // always 1
  };
  whitelist: {
    enabled: boolean;                   // If true, only whitelisted users can vote
    usernames: string[];                // List of allowed usernames (case-insensitive)
  };
  blacklist: {
    enabled: boolean;                   // If true, blacklisted users cannot vote
    usernames: string[];                // List of blocked usernames (case-insensitive)
  };
}

// Result of vote validation
export interface VoteValidationResult {
  isValid: boolean;
  rejectionReason?: RejectionReason;
  weight: number;
}

// Log entry for moderation actions
export interface ModerationLogEntry {
  timestamp: number;
  username: string;
  userId: string;
  action: 'REJECTED' | 'ACCEPTED' | 'VOTE_CHANGED';
  reason?: RejectionReason;
  optionId: number;
  weight: number;
}

// Real-time moderation statistics
export interface ModerationStats {
  totalAttempts: number;
  acceptedVotes: number;
  rejectedByReason: Record<RejectionReason, number>;
  acceptanceRate: number;              // percentage 0-100
}

// Saved moderation preset
export interface ModerationPreset {
  id: string;
  name: string;
  config: ModerationConfig;
  createdAt: number;
}

// User vote state tracking
export interface UserVoteState {
  optionId: number;
  timestamp: number;
  weight: number;
  canChangeAt?: number;                // timestamp when change is allowed
}

// Default moderation configuration
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

// Default moderation statistics
export const DEFAULT_MODERATION_STATS: ModerationStats = {
  totalAttempts: 0,
  acceptedVotes: 0,
  rejectedByReason: {
    ACCOUNT_TOO_YOUNG: 0,
    COOLDOWN_ACTIVE: 0,
    VOTE_CHANGE_DISABLED: 0,
    INVALID_OPTION: 0,
    NOT_WHITELISTED: 0,
    BLACKLISTED: 0,
  },
  acceptanceRate: 100,
};

// ============================================================================
// Vote Validator Functions
// ============================================================================

/**
 * Validates if an account meets the minimum age requirement.
 * @param accountAgeDays - The age of the account in days
 * @param minAge - The minimum required age in days (0 = allow all)
 * @returns true if the account is old enough to vote, false otherwise
 * 
 * Requirements: 1.2, 1.3
 */
export function validateAccountAge(accountAgeDays: number, minAge: number): boolean {
  // When minAge is 0, allow all accounts regardless of age (Requirement 1.3)
  if (minAge === 0) {
    return true;
  }
  // Account must be >= minAge to be valid (Requirement 1.2)
  return accountAgeDays >= minAge;
}

/**
 * Validates if a user can vote based on cooldown period.
 * @param lastVoteTime - Timestamp of the user's last vote (0 if never voted)
 * @param cooldownSeconds - The cooldown period in seconds
 * @param currentTime - The current timestamp
 * @returns true if the cooldown has expired and user can vote, false otherwise
 * 
 * Requirements: 4.2
 */
export function validateCooldown(
  lastVoteTime: number,
  cooldownSeconds: number,
  currentTime: number
): boolean {
  // If user has never voted (lastVoteTime is 0), they can vote
  if (lastVoteTime === 0) {
    return true;
  }
  // Calculate time elapsed since last vote
  const elapsedSeconds = (currentTime - lastVoteTime) / 1000;
  // User can vote if elapsed time >= cooldown period
  return elapsedSeconds >= cooldownSeconds;
}

/**
 * Validates if a user can change their vote.
 * @param hasVoted - Whether the user has already voted
 * @param voteChangeEnabled - Whether vote changing is enabled for this poll
 * @returns true if the user can change their vote, false otherwise
 * 
 * Requirements: 4.3
 */
export function canChangeVote(hasVoted: boolean, voteChangeEnabled: boolean): boolean {
  // If user hasn't voted yet, they can always vote (this is not a "change")
  if (!hasVoted) {
    return true;
  }
  // If user has voted, they can only change if vote changing is enabled
  return voteChangeEnabled;
}

/**
 * Input parameters for vote validation
 */
export interface VoteValidationInput {
  username?: string;              // For whitelist validation
  accountAgeDays: number;
  hasVoted: boolean;
  lastVoteTime: number;
  currentTime: number;
  isSubscriber: boolean;
  isFollower: boolean;
}

/**
 * Main vote validation function that combines all filters into a single pipeline.
 * Returns a VoteValidationResult with rejection reason if invalid.
 * 
 * @param input - The vote validation input parameters
 * @param config - The moderation configuration
 * @returns VoteValidationResult with isValid, rejectionReason (if invalid), and weight
 * 
 * Requirements: 1.2, 4.2, 4.3
 */
export function validateVote(
  input: VoteValidationInput,
  config: ModerationConfig
): VoteValidationResult {
  const normalizedUsername = input.username?.toLowerCase() || '';

  // Step 0a: Check blacklist first (blocked users)
  if (config.blacklist?.enabled && config.blacklist.usernames.length > 0) {
    const isBlacklisted = config.blacklist.usernames.some(
      (name) => name.toLowerCase() === normalizedUsername
    );
    if (isBlacklisted) {
      return {
        isValid: false,
        rejectionReason: 'BLACKLISTED',
        weight: 0,
      };
    }
  }

  // Step 0b: Check whitelist if enabled
  if (config.whitelist?.enabled && config.whitelist.usernames.length > 0) {
    const isWhitelisted = config.whitelist.usernames.some(
      (name) => name.toLowerCase() === normalizedUsername
    );
    if (!isWhitelisted) {
      return {
        isValid: false,
        rejectionReason: 'NOT_WHITELISTED',
        weight: 0,
      };
    }
  }

  // Step 1: Check account age filter (Requirement 1.2)
  if (!validateAccountAge(input.accountAgeDays, config.minAccountAgeDays)) {
    return {
      isValid: false,
      rejectionReason: 'ACCOUNT_TOO_YOUNG',
      weight: 0,
    };
  }

  // Step 2: Check vote change permission (Requirement 4.3)
  if (!canChangeVote(input.hasVoted, config.voteChangeEnabled)) {
    return {
      isValid: false,
      rejectionReason: 'VOTE_CHANGE_DISABLED',
      weight: 0,
    };
  }

  // Step 3: Check cooldown if user has voted before (Requirement 4.2)
  if (input.hasVoted && !validateCooldown(input.lastVoteTime, config.voteChangeCooldownSeconds, input.currentTime)) {
    return {
      isValid: false,
      rejectionReason: 'COOLDOWN_ACTIVE',
      weight: 0,
    };
  }

  // All validations passed - calculate weight
  let weight = config.weights.regular; // Default weight is 1
  if (input.isSubscriber) {
    weight = config.weights.subscriber;
  } else if (input.isFollower) {
    weight = config.weights.follower;
  }

  return {
    isValid: true,
    weight,
  };
}

// ============================================================================
// Weight Calculator Functions
// ============================================================================

/**
 * Validates if a weight value is within the valid range (1-5).
 * @param weight - The weight value to validate
 * @returns true if the weight is a valid integer between 1 and 5 inclusive, false otherwise
 * 
 * Requirements: 2.1
 */
export function isValidWeight(weight: number): boolean {
  return Number.isInteger(weight) && weight >= 1 && weight <= 5;
}

/**
 * Calculates the vote weight based on user trust level.
 * Subscribers get subscriber weight, followers get follower weight,
 * and regular users always get weight 1.
 * 
 * @param isSubscriber - Whether the user is a subscriber
 * @param isFollower - Whether the user is a follower
 * @param config - The moderation configuration containing weight settings
 * @returns The calculated weight for the user's vote
 * 
 * Requirements: 2.2, 2.3, 2.4
 */
export function calculateWeight(
  isSubscriber: boolean,
  isFollower: boolean,
  config: ModerationConfig
): number {
  // Subscribers get the highest priority (Requirement 2.2)
  if (isSubscriber) {
    return config.weights.subscriber;
  }
  // Followers get follower weight (Requirement 2.3)
  if (isFollower) {
    return config.weights.follower;
  }
  // Non-followers (regular users) always get weight 1 (Requirement 2.4)
  return 1;
}

/**
 * Vote record with weight for weighted total calculation
 */
export interface WeightedVoteRecord {
  userId: string;
  weight: number;
}

/**
 * Calculates the weighted total of votes.
 * @param votes - Array of vote records
 * @param weights - Map of userId to their vote weight
 * @returns The sum of all weighted votes
 * 
 * Requirements: 2.5
 */
export function calculateWeightedTotal(
  votes: { userId: string }[],
  weights: Map<string, number>
): number {
  return votes.reduce((total, vote) => {
    const weight = weights.get(vote.userId) ?? 1;
    return total + weight;
  }, 0);
}

// ============================================================================
// Moderation Logger Functions
// ============================================================================

// In-memory storage for log entries (keyed by pollId)
const logStorage: Map<string, ModerationLogEntry[]> = new Map();

/**
 * Creates a moderation log entry with all required fields.
 * @param username - The username of the voter
 * @param userId - The unique identifier of the voter
 * @param action - The action taken ('REJECTED', 'ACCEPTED', or 'VOTE_CHANGED')
 * @param reason - The rejection reason (optional, required for REJECTED actions)
 * @param optionId - The poll option ID the user voted for
 * @param weight - The weight applied to the vote
 * @returns A complete ModerationLogEntry
 * 
 * Requirements: 3.1
 */
export function createLogEntry(
  username: string,
  userId: string,
  action: 'REJECTED' | 'ACCEPTED' | 'VOTE_CHANGED',
  reason: RejectionReason | undefined,
  optionId: number,
  weight: number
): ModerationLogEntry {
  return {
    timestamp: Date.now(),
    username,
    userId,
    action,
    reason,
    optionId,
    weight,
  };
}

/**
 * Adds a log entry to the storage for a specific poll.
 * @param pollId - The unique identifier of the poll
 * @param entry - The log entry to add
 * 
 * Requirements: 3.2
 */
export function addLogEntry(pollId: string, entry: ModerationLogEntry): void {
  const entries = logStorage.get(pollId) ?? [];
  entries.push(entry);
  logStorage.set(pollId, entries);
}

/**
 * Retrieves log entries for a specific poll with optional limit.
 * Returns the most recent entries up to the specified limit.
 * @param pollId - The unique identifier of the poll
 * @param limit - Maximum number of entries to return (default: 100)
 * @returns Array of log entries, limited to the most recent entries
 * 
 * Requirements: 3.2
 */
export function getLogEntries(pollId: string, limit: number = 100): ModerationLogEntry[] {
  const entries = logStorage.get(pollId) ?? [];
  // Return the most recent entries up to the limit
  if (entries.length <= limit) {
    return [...entries];
  }
  return entries.slice(-limit);
}

/**
 * Groups log entries by rejection reason and returns counts.
 * Only counts entries with action 'REJECTED'.
 * @param entries - Array of log entries to group
 * @returns Record mapping each rejection reason to its count
 * 
 * Requirements: 3.4
 */
export function groupLogByReason(entries: ModerationLogEntry[]): Record<RejectionReason, number> {
  const result: Record<RejectionReason, number> = {
    ACCOUNT_TOO_YOUNG: 0,
    COOLDOWN_ACTIVE: 0,
    VOTE_CHANGE_DISABLED: 0,
    INVALID_OPTION: 0,
    NOT_WHITELISTED: 0,
    BLACKLISTED: 0,
  };

  for (const entry of entries) {
    if (entry.action === 'REJECTED' && entry.reason) {
      result[entry.reason]++;
    }
  }

  return result;
}

/**
 * Exports log entries to CSV format.
 * @param entries - Array of log entries to export
 * @returns CSV string with headers and data rows
 * 
 * Requirements: 3.3
 */
export function exportLogToCSV(entries: ModerationLogEntry[]): string {
  const headers = ['timestamp', 'username', 'userId', 'action', 'reason', 'optionId', 'weight'];
  const rows = entries.map(entry => [
    entry.timestamp.toString(),
    `"${entry.username.replace(/"/g, '""')}"`, // Escape quotes in username
    `"${entry.userId.replace(/"/g, '""')}"`,
    entry.action,
    entry.reason ?? '',
    entry.optionId.toString(),
    entry.weight.toString(),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Clears log entries for a specific poll (useful for testing).
 * @param pollId - The unique identifier of the poll
 */
export function clearLogEntries(pollId: string): void {
  logStorage.delete(pollId);
}

/**
 * Clears all log entries (useful for testing).
 */
export function clearAllLogEntries(): void {
  logStorage.clear();
}

// ============================================================================
// Statistics Collector Functions
// ============================================================================

/**
 * Updates moderation statistics based on a vote attempt result.
 * Returns a new ModerationStats object with updated values.
 * 
 * @param stats - The current moderation statistics
 * @param isAccepted - Whether the vote was accepted
 * @param reason - The rejection reason (required if isAccepted is false)
 * @returns Updated ModerationStats with new totals and acceptance rate
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export function updateStats(
  stats: ModerationStats,
  isAccepted: boolean,
  reason?: RejectionReason
): ModerationStats {
  const newTotalAttempts = stats.totalAttempts + 1;
  const newAcceptedVotes = isAccepted ? stats.acceptedVotes + 1 : stats.acceptedVotes;
  
  // Create a copy of rejectedByReason
  const newRejectedByReason = { ...stats.rejectedByReason };
  
  // Increment the rejection counter if vote was rejected
  if (!isAccepted && reason) {
    newRejectedByReason[reason] = (newRejectedByReason[reason] ?? 0) + 1;
  }
  
  // Calculate acceptance rate
  const newAcceptanceRate = calculateAcceptanceRate({
    totalAttempts: newTotalAttempts,
    acceptedVotes: newAcceptedVotes,
    rejectedByReason: newRejectedByReason,
    acceptanceRate: 0, // Will be recalculated
  });
  
  return {
    totalAttempts: newTotalAttempts,
    acceptedVotes: newAcceptedVotes,
    rejectedByReason: newRejectedByReason,
    acceptanceRate: newAcceptanceRate,
  };
}

/**
 * Calculates the acceptance rate as a percentage.
 * Returns 100 if there are no attempts (to avoid division by zero).
 * 
 * @param stats - The moderation statistics
 * @returns The acceptance rate as a percentage (0-100)
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export function calculateAcceptanceRate(stats: ModerationStats): number {
  if (stats.totalAttempts === 0) {
    return 100;
  }
  return (stats.acceptedVotes / stats.totalAttempts) * 100;
}

/**
 * Determines if a warning should be displayed based on acceptance rate.
 * Warning is shown when acceptance rate falls below 50%.
 * 
 * @param acceptanceRate - The current acceptance rate (0-100)
 * @returns true if warning should be displayed, false otherwise
 * 
 * Requirements: 5.4
 */
export function shouldShowWarning(acceptanceRate: number): boolean {
  return acceptanceRate < 50;
}

// ============================================================================
// Vote Change Handler Functions
// ============================================================================

/**
 * Extended Poll type with moderation support (for use within this module)
 */
export interface ModeratedPoll {
  id: string;
  title?: string;
  question: string;
  options: { id: number; label: string; votes: number; color: string; icon?: string; image?: string }[];
  isActive: boolean;
  totalVotes: number;
  startTime: number;
  maxVotes?: number;
  duration?: number;
  progressBarColor?: string;
  limitIndicatorColor?: string;
  moderationConfig: ModerationConfig;
  moderationStats: ModerationStats;
  moderationLog: ModerationLogEntry[];
}

/**
 * Handles a vote change by updating vote counts correctly.
 * Decrements the old option's count and increments the new option's count by the user's weight.
 * The total vote count remains unchanged after a vote change.
 * 
 * @param poll - The current moderated poll state
 * @param _userId - The unique identifier of the user changing their vote (unused but kept for API consistency)
 * @param oldOptionId - The ID of the option the user previously voted for
 * @param newOptionId - The ID of the option the user is changing to
 * @param weight - The weight of the user's vote
 * @returns A new ModeratedPoll with updated vote counts
 * 
 * Requirements: 4.4
 */
export function handleVoteChange(
  poll: ModeratedPoll,
  _userId: string,
  oldOptionId: number,
  newOptionId: number,
  weight: number
): ModeratedPoll {
  // Create a deep copy of the poll to avoid mutation
  const updatedPoll: ModeratedPoll = {
    ...poll,
    options: poll.options.map(option => ({ ...option })),
    moderationStats: { ...poll.moderationStats, rejectedByReason: { ...poll.moderationStats.rejectedByReason } },
    moderationLog: [...poll.moderationLog],
  };

  // Find and update the old option (decrement by weight)
  const oldOption = updatedPoll.options.find(opt => opt.id === oldOptionId);
  if (oldOption) {
    oldOption.votes -= weight;
  }

  // Find and update the new option (increment by weight)
  const newOption = updatedPoll.options.find(opt => opt.id === newOptionId);
  if (newOption) {
    newOption.votes += weight;
  }

  // Total vote count remains unchanged (invariant: decrement + increment = 0 net change)
  // No need to update totalVotes

  return updatedPoll;
}

// ============================================================================
// Preset Manager Functions
// ============================================================================

// Storage key for presets
const PRESETS_STORAGE_KEY = 'twitch_vote_mod_presets';

// In-memory preset storage (for environments without localStorage)
let inMemoryPresets: ModerationPreset[] = [];

/**
 * Generates a unique ID for a preset.
 * @returns A unique string ID
 */
function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gets all presets from storage.
 * @returns Array of all saved presets
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export function getAllPresets(): ModerationPreset[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ModerationPreset[];
      }
    }
  } catch {
    // Fall back to in-memory storage
  }
  return [...inMemoryPresets];
}

/**
 * Saves all presets to storage.
 * @param presets - Array of presets to save
 */
function saveAllPresets(presets: ModerationPreset[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    }
  } catch {
    // Fall back to in-memory storage
  }
  inMemoryPresets = [...presets];
}

/**
 * Saves a moderation configuration as a preset with a user-provided name.
 * @param name - The name for the preset
 * @param config - The moderation configuration to save
 * @returns The created ModerationPreset with generated ID and timestamp
 * 
 * Requirements: 6.1
 */
export function savePreset(name: string, config: ModerationConfig): ModerationPreset {
  const preset: ModerationPreset = {
    id: generatePresetId(),
    name,
    config: { ...config, weights: { ...config.weights } }, // Deep copy config
    createdAt: Date.now(),
  };

  const presets = getAllPresets();
  presets.push(preset);
  saveAllPresets(presets);

  return preset;
}

/**
 * Loads a preset by its ID.
 * @param id - The unique identifier of the preset to load
 * @returns The ModerationPreset if found, null otherwise
 * 
 * Requirements: 6.2
 */
export function loadPreset(id: string): ModerationPreset | null {
  const presets = getAllPresets();
  const preset = presets.find(p => p.id === id);
  return preset ?? null;
}

/**
 * Deletes a preset by its ID.
 * @param id - The unique identifier of the preset to delete
 * @returns true if the preset was found and deleted, false otherwise
 * 
 * Requirements: 6.3
 */
export function deletePreset(id: string): boolean {
  const presets = getAllPresets();
  const initialLength = presets.length;
  const filteredPresets = presets.filter(p => p.id !== id);
  
  if (filteredPresets.length < initialLength) {
    saveAllPresets(filteredPresets);
    return true;
  }
  
  return false;
}

/**
 * Formats a preset summary for display.
 * Shows the preset name and a summary of key settings.
 * @param preset - The preset to format
 * @returns A formatted string containing preset name and key settings
 * 
 * Requirements: 6.4
 */
export function formatPresetSummary(preset: ModerationPreset): string {
  const { name, config } = preset;
  const parts: string[] = [name];
  
  // Add account age setting
  if (config.minAccountAgeDays > 0) {
    parts.push(`Min Age: ${config.minAccountAgeDays} days`);
  } else {
    parts.push('Min Age: None');
  }
  
  // Add vote change setting
  parts.push(`Vote Change: ${config.voteChangeEnabled ? 'Enabled' : 'Disabled'}`);
  
  // Add weight settings
  parts.push(`Weights: Sub=${config.weights.subscriber}, Follow=${config.weights.follower}`);
  
  return parts.join(' | ');
}

/**
 * Clears all presets (useful for testing).
 */
export function clearAllPresets(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PRESETS_STORAGE_KEY);
    }
  } catch {
    // Ignore errors
  }
  inMemoryPresets = [];
}
