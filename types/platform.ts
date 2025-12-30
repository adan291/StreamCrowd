/**
 * Platform Types and Interfaces
 * 
 * Common types for multi-platform support (Twitch, YouTube, Kick).
 * These types define the unified interface for all streaming platforms.
 * 
 * @requirements 4.1 - YouTube platform support
 * @requirements 5.1 - Kick platform support
 * @requirements 6.1 - Multi-platform simultaneous connections
 */

// ============================================
// PLATFORM TYPES
// ============================================

/**
 * Supported streaming platforms
 */
export type Platform = 'twitch' | 'youtube' | 'kick';

/**
 * Connection status for a platform
 */
export type PlatformConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

/**
 * Platform connection state
 * @requirements 6.4 - Independent connection status per platform
 */
export interface PlatformConnection {
  platform: Platform;
  status: PlatformConnectionStatus;
  channel: string;
  enabled: boolean;
  lastError?: string;
  lastConnectedAt?: number;
  reconnectAttempts?: number;
}

// ============================================
// CHAT MESSAGE TYPES
// ============================================

/**
 * Badge types across all platforms
 * @requirements 4.6 - YouTube badges (member, moderator)
 * @requirements 5.6 - Kick badges (subscriber, moderator, VIP)
 */
export type BadgeType = 
  | 'subscriber' 
  | 'moderator' 
  | 'vip' 
  | 'member' 
  | 'owner' 
  | 'broadcaster'
  | 'verified'
  | 'founder'
  | 'prime';

/**
 * Platform-specific badge
 */
export interface Badge {
  type: BadgeType;
  platform: Platform;
  tier?: number;
  label?: string;
  imageUrl?: string;
}

/**
 * Unified chat message from any platform
 * @requirements 6.3 - Display which platform each vote came from
 */
export interface ChatMessage {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  message: string;
  timestamp: number;
  userId?: string;
  color?: string;
  badges: Badge[];
  isVote?: boolean;
  voteValue?: string;
  /** Raw platform-specific data */
  rawData?: Record<string, unknown>;
}

// ============================================
// VOTE TYPES
// ============================================

/**
 * Vote parsed from a chat message
 * @requirements 4.5, 5.5 - Process votes using same format (+1, +2, +key)
 */
export interface PlatformVote {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  voteValue: string;
  timestamp: number;
  messageId: string;
}

/**
 * Aggregated vote count across platforms
 * @requirements 6.2 - Aggregate votes from all platforms
 */
export interface AggregatedVotes {
  option: string;
  total: number;
  byPlatform: Record<Platform, number>;
}

// ============================================
// PLATFORM ADAPTER INTERFACE
// ============================================

/**
 * Configuration for platform connection
 */
export interface PlatformConnectionConfig {
  channel: string;
  token?: string;
  refreshToken?: string;
  apiKey?: string;
  /** Platform-specific options */
  options?: Record<string, unknown>;
}

/**
 * Rate limit configuration
 * @requirements 4.7 - Handle rate limits with queue
 */
export interface RateLimitConfig {
  maxMessagesPerSecond: number;
  maxMessagesPerMinute: number;
  burstLimit: number;
}

/**
 * Queued message for rate limiting
 */
export interface QueuedMessage {
  id: string;
  message: string;
  timestamp: number;
  priority: number;
}

/**
 * Reconnection configuration
 * @requirements 5.7 - Automatic reconnection with exponential backoff
 */
export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

/**
 * Callback types for platform events
 */
export type PlatformMessageCallback = (message: ChatMessage) => void;
export type PlatformStatusCallback = (platform: Platform, status: PlatformConnectionStatus, error?: string) => void;
export type PlatformVoteCallback = (vote: PlatformVote) => void;

/**
 * Interface for platform adapters
 * All platform adapters (YouTube, Kick) must implement this interface
 */
export interface IPlatformAdapter {
  /** Platform identifier */
  readonly platform: Platform;
  
  /** Platform display name */
  readonly displayName: string;
  
  /** Get current connection status */
  getStatus(): PlatformConnectionStatus;
  
  /** Get current channel */
  getCurrentChannel(): string | null;
  
  /** Connect to a channel */
  connect(config: PlatformConnectionConfig): Promise<void>;
  
  /** Disconnect from current channel */
  disconnect(): Promise<void>;
  
  /** Send a message to chat */
  sendMessage(message: string): Promise<boolean>;
  
  /** Register message callback */
  onMessage(callback: PlatformMessageCallback): () => void;
  
  /** Register status change callback */
  onStatusChange(callback: PlatformStatusCallback): () => void;
  
  /** Check if platform is enabled */
  isEnabled(): boolean;
  
  /** Enable/disable the platform without disconnecting */
  setEnabled(enabled: boolean): void;
  
  /** Clean up resources */
  dispose(): void;
}

// ============================================
// MULTI-PLATFORM MANAGER TYPES
// ============================================

/**
 * State for the multi-platform manager
 * @requirements 6.4, 6.5, 6.6 - Independent platform state management
 */
export interface MultiPlatformState {
  connections: Record<Platform, PlatformConnection | null>;
  messages: ChatMessage[];
  votes: PlatformVote[];
  aggregatedVotes: AggregatedVotes[];
}

/**
 * Options for the multi-platform manager
 */
export interface MultiPlatformOptions {
  /** Maximum messages to keep in memory */
  maxMessages?: number;
  /** Maximum votes to keep in memory */
  maxVotes?: number;
  /** Enable vote aggregation */
  enableVoteAggregation?: boolean;
}

// ============================================
// PLATFORM STORAGE TYPES
// ============================================

/**
 * Stored platform credentials
 */
export interface PlatformCredentials {
  platform: Platform;
  channel: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Platform preferences storage
 */
export interface PlatformPreferences {
  version: number;
  defaultPlatform: Platform;
  multiPlatformEnabled: boolean;
  credentials: Partial<Record<Platform, PlatformCredentials>>;
  enabledPlatforms: Platform[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default rate limit configurations per platform
 */
export const PLATFORM_RATE_LIMITS: Record<Platform, RateLimitConfig> = {
  twitch: {
    maxMessagesPerSecond: 1,
    maxMessagesPerMinute: 20,
    burstLimit: 5,
  },
  youtube: {
    maxMessagesPerSecond: 0.5,
    maxMessagesPerMinute: 10,
    burstLimit: 3,
  },
  kick: {
    maxMessagesPerSecond: 1,
    maxMessagesPerMinute: 30,
    burstLimit: 5,
  },
};

/**
 * Default reconnection configurations per platform
 */
export const PLATFORM_RECONNECTION_CONFIG: Record<Platform, ReconnectionConfig> = {
  twitch: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  youtube: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  },
  kick: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
};

/**
 * Vote pattern regex - matches +1, +2, +key format
 * @requirements 4.5, 5.5 - Same vote format across platforms
 */
export const VOTE_PATTERN = /^\+(\d+|[a-zA-Z]+)$/;

/**
 * Parse a vote from a message
 * @param message - Chat message to parse
 * @returns Vote value if message is a vote, null otherwise
 */
export function parseVoteFromMessage(message: string): string | null {
  const trimmed = message.trim();
  const match = trimmed.match(VOTE_PATTERN);
  return match ? match[1] : null;
}

/**
 * Check if a message is a vote
 * @param message - Chat message to check
 * @returns True if message is a vote
 */
export function isVoteMessage(message: string): boolean {
  return VOTE_PATTERN.test(message.trim());
}
