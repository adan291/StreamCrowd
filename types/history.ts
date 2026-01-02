/**
 * History Types for Unified History System
 * 
 * Defines types for the centralized history management system that tracks
 * all user activities: polls, predictions, giveaways, commands, and timers.
 * 
 * @requirements 1.1, 1.2 - Centralized history with metadata and timestamps
 */

// ============================================
// CATEGORY-SPECIFIC DATA TYPES
// ============================================

/**
 * Poll history data - stores completed poll information
 */
export interface PollHistoryData {
  question: string;
  options: {
    label: string;
    votes: number;
    color: string;
    icon?: string;
    percentage: number;
  }[];
  totalVotes: number;
  duration?: number;
  winnerId?: number;
  winnerLabel?: string;
}

/**
 * Prediction history data - stores Twitch prediction results
 */
export interface PredictionHistoryData {
  title: string;
  outcomes: {
    id: string;
    title: string;
    users: number;
    channelPoints: number;
    color: 'BLUE' | 'PINK';
    percentage: number;
  }[];
  status: 'RESOLVED' | 'CANCELED';
  winningOutcomeId?: string;
  winningOutcomeTitle?: string;
  totalUsers: number;
  totalPoints: number;
  predictionWindow: number;
}

/**
 * Giveaway history data - stores completed giveaway information
 */
export interface GiveawayHistoryData {
  name: string;
  mode: 'viewers' | 'keyword' | 'subs';
  keyword?: string;
  winner: string;
  participantCount: number;
  subscribersOnly: boolean;
  duration?: number;
}

/**
 * Command history data - stores executed command information
 */
export interface CommandHistoryData {
  commandName: string;
  trigger: string;
  response: string;
  executedBy: string;
  channel: string;
}

/**
 * Timer history data - stores executed timer information
 */
export interface TimerHistoryData {
  timerName: string;
  message: string;
  interval: number;
  executionCount: number;
  channel: string;
}

// ============================================
// CORE HISTORY TYPES
// ============================================

/**
 * History item type categories
 */
export type HistoryItemType = 'poll' | 'prediction' | 'giveaway' | 'command' | 'timer';

/**
 * Platform source for history items
 */
export type HistoryPlatform = 'twitch' | 'youtube' | 'kick' | 'multi';

/**
 * Union type for all history data types
 */
export type HistoryData = 
  | PollHistoryData 
  | PredictionHistoryData 
  | GiveawayHistoryData 
  | CommandHistoryData 
  | TimerHistoryData;

/**
 * A single history item representing any tracked activity
 * 
 * @requirements 1.2 - Records events with timestamp and metadata
 */
export interface HistoryItem {
  /** Unique identifier for the history item */
  id: string;
  /** Type of activity */
  type: HistoryItemType;
  /** Unix timestamp when the activity occurred */
  timestamp: number;
  /** Platform where the activity occurred */
  platform: HistoryPlatform;
  /** Activity-specific data */
  data: HistoryData;
  /** Additional metadata for statistics */
  metadata: {
    /** Number of participants (for polls, predictions, giveaways) */
    participants?: number;
    /** Total votes or points */
    totalVotes?: number;
    /** Winner name or label */
    winner?: string;
    /** Duration in seconds */
    duration?: number;
  };
}

/**
 * Filter criteria for querying history items
 * 
 * @requirements 1.3, 1.4 - Filtering by type and date range
 */
export interface HistoryFilter {
  /** Filter by activity types */
  types?: HistoryItemType[];
  /** Filter by platforms */
  platforms?: HistoryPlatform[];
  /** Start of date range (Unix timestamp) */
  dateFrom?: number;
  /** End of date range (Unix timestamp) */
  dateTo?: number;
  /** Text search query */
  searchQuery?: string;
}

// ============================================
// STORAGE TYPES
// ============================================

/**
 * Storage schema for history data in localStorage
 * 
 * @requirements 1.6 - Maximum 100 items per category
 */
export interface HistoryStorage {
  /** Schema version for migrations */
  version: 1;
  /** History items organized by category */
  items: {
    polls: HistoryItem[];
    predictions: HistoryItem[];
    giveaways: HistoryItem[];
    commands: HistoryItem[];
    timers: HistoryItem[];
  };
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Export format for history data
 * 
 * @requirements 1.8 - Export to JSON format
 */
export interface HistoryExport {
  /** Export format version */
  version: 1;
  /** Export timestamp */
  exportedAt: number;
  /** Application identifier */
  application: 'streamcrowd';
  /** All history items */
  items: HistoryItem[];
  /** Export metadata */
  metadata: {
    totalItems: number;
    itemsByType: Record<HistoryItemType, number>;
  };
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum items per category
 * @requirements 1.6 - Maximum of 100 items per category
 */
export const HISTORY_MAX_ITEMS_PER_CATEGORY = 100;

/**
 * localStorage key for history data
 */
export const HISTORY_STORAGE_KEY = 'streamcrowd_unified_history';

/**
 * Default empty history storage
 */
export const DEFAULT_HISTORY_STORAGE: HistoryStorage = {
  version: 1,
  items: {
    polls: [],
    predictions: [],
    giveaways: [],
    commands: [],
    timers: [],
  },
  lastUpdated: 0,
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for PollHistoryData
 */
export function isPollHistoryData(data: HistoryData): data is PollHistoryData {
  return 'question' in data && 'options' in data && 'totalVotes' in data;
}

/**
 * Type guard for PredictionHistoryData
 */
export function isPredictionHistoryData(data: HistoryData): data is PredictionHistoryData {
  return 'title' in data && 'outcomes' in data && 'status' in data;
}

/**
 * Type guard for GiveawayHistoryData
 */
export function isGiveawayHistoryData(data: HistoryData): data is GiveawayHistoryData {
  return 'name' in data && 'mode' in data && 'winner' in data && 'participantCount' in data;
}

/**
 * Type guard for CommandHistoryData
 */
export function isCommandHistoryData(data: HistoryData): data is CommandHistoryData {
  return 'commandName' in data && 'trigger' in data && 'response' in data;
}

/**
 * Type guard for TimerHistoryData
 */
export function isTimerHistoryData(data: HistoryData): data is TimerHistoryData {
  return 'timerName' in data && 'message' in data && 'interval' in data;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Input type for adding a new history item (without auto-generated fields)
 */
export type AddHistoryItemInput = Omit<HistoryItem, 'id' | 'timestamp'>;

/**
 * Category key mapping for storage
 */
export type HistoryCategoryKey = 'polls' | 'predictions' | 'giveaways' | 'commands' | 'timers';

/**
 * Maps HistoryItemType to storage category key
 */
export const TYPE_TO_CATEGORY: Record<HistoryItemType, HistoryCategoryKey> = {
  poll: 'polls',
  prediction: 'predictions',
  giveaway: 'giveaways',
  command: 'commands',
  timer: 'timers',
};
