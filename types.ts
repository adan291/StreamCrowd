
export interface PollOption {
  id: number;
  label: string;
  votes: number;
  color: string;
  icon?: string;
  image?: string; // Base64 or URL
}

export interface VoteRecord {
  userId: string;
  username: string;
  optionId: number;
  timestamp: number;
}

export interface Poll {
  id: string;
  title?: string; // Custom title for the dashboard section
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
  startTime: number;
  maxVotes?: number; // Optional limit
  duration?: number; // Duration in seconds (optional)
  progressBarColor?: string; // Custom color for progress bar
  limitIndicatorColor?: string; // Custom color for limit alerts
  votePrefix?: string; // Custom vote prefix (default: "+")
}

export interface SavedPoll {
  id: string;
  title?: string;
  question: string;
  options: { label: string; color: string; icon?: string; image?: string }[];
  maxVotes?: number;
  duration?: number;
  isFavorite?: boolean;
  progressBarColor?: string;
  limitIndicatorColor?: string;
  votePrefix?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  data: string; // Base64
  date: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface TwitchMessage {
  username: string;
  message: string;
  color?: string;
  id?: string;
  userId?: string;
}

// Re-export moderation types from voteModerationService
export type {
  RejectionReason,
  ModerationConfig,
  VoteValidationResult,
  ModerationLogEntry,
  ModerationStats,
  ModerationPreset,
  UserVoteState,
  VoteValidationInput,
} from './services/voteModerationService';

export {
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  validateAccountAge,
  validateCooldown,
  canChangeVote,
  validateVote,
  isValidWeight,
  calculateWeight,
  calculateWeightedTotal,
  createLogEntry,
  addLogEntry,
  getLogEntries,
  groupLogByReason,
  exportLogToCSV,
  clearLogEntries,
  clearAllLogEntries,
  updateStats,
  calculateAcceptanceRate,
  shouldShowWarning,
  handleVoteChange,
  savePreset,
  loadPreset,
  deletePreset,
  getAllPresets,
  formatPresetSummary,
  clearAllPresets,
} from './services/voteModerationService';

// Extended Poll type with moderation support
export interface ModeratedPoll extends Poll {
  moderationConfig: import('./services/voteModerationService').ModerationConfig;
  moderationStats: import('./services/voteModerationService').ModerationStats;
  moderationLog: import('./services/voteModerationService').ModerationLogEntry[];
}
