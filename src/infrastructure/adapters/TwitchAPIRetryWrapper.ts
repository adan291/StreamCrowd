/**
 * Twitch API Retry Wrapper
 * 
 * Wraps Twitch API calls with automatic retry logic and exponential backoff.
 * Provides a centralized way to make Twitch API requests with consistent retry behavior.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Twitch API calls
 */

import { getRetryableAPIClient, RetryableAPIClient } from '../api/RetryableAPIClient';
import { logService } from '../logging/LogService';
import { NetworkError } from '../../domain/errors/AppErrors';

/**
 * Configuration for Twitch API retry wrapper
 */
export interface TwitchAPIRetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to log retry attempts (default: true) */
  logRetries?: boolean;
}

/**
 * Default configuration for Twitch API retry wrapper
 */
const DEFAULT_CONFIG: Required<TwitchAPIRetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  logRetries: true,
};

/**
 * Twitch API Retry Wrapper
 * 
 * Provides methods for making Twitch API requests with automatic retry logic.
 * Handles Twitch-specific errors and rate limiting.
 */
export class TwitchAPIRetryWrapper {
  private config: Required<TwitchAPIRetryConfig>;
  private apiClient: RetryableAPIClient;

  constructor(config: TwitchAPIRetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiClient = getRetryableAPIClient({
      maxAttempts: this.config.maxAttempts,
      initialDelayMs: this.config.initialDelayMs,
      maxDelayMs: this.config.maxDelayMs,
      backoffMultiplier: this.config.backoffMultiplier,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Include 429 for rate limiting
      logRetries: this.config.logRetries,
    });
  }

  /**
   * Make a GET request to Twitch API with retry logic
   * 
   * @param url - Twitch API URL
   * @param accessToken - OAuth access token
   * @returns Response data
   * @throws NetworkError if all retries fail
   * 
   * @requirements 4.1 - Retry up to 3 times with exponential backoff
   * @requirements 4.5 - Add retry to Twitch API calls
   */
  async get<T>(
    url: string,
    accessToken: string
  ): Promise<T> {
    const cleanToken = this.cleanToken(accessToken);
    return this.apiClient.get<T>(url, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5',
      },
    });
  }

  /**
   * Make a POST request to Twitch API with retry logic
   * 
   * @param url - Twitch API URL
   * @param accessToken - OAuth access token
   * @param body - Request body
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async post<T>(
    url: string,
    accessToken: string,
    body?: unknown
  ): Promise<T> {
    const cleanToken = this.cleanToken(accessToken);
    return this.apiClient.post<T>(url, body, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5',
      },
    });
  }

  /**
   * Make a PUT request to Twitch API with retry logic
   * 
   * @param url - Twitch API URL
   * @param accessToken - OAuth access token
   * @param body - Request body
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async put<T>(
    url: string,
    accessToken: string,
    body?: unknown
  ): Promise<T> {
    const cleanToken = this.cleanToken(accessToken);
    return this.apiClient.put<T>(url, body, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5',
      },
    });
  }

  /**
   * Make a DELETE request to Twitch API with retry logic
   * 
   * @param url - Twitch API URL
   * @param accessToken - OAuth access token
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  async delete<T>(
    url: string,
    accessToken: string
  ): Promise<T> {
    const cleanToken = this.cleanToken(accessToken);
    return this.apiClient.delete<T>(url, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5',
      },
    });
  }

  /**
   * Get user information from Twitch API with retry logic
   * 
   * @param login - User login name
   * @param accessToken - OAuth access token
   * @returns User data
   */
  async getUser(
    login: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/users');
    url.searchParams.set('login', login.toLowerCase());
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get channel information from Twitch API with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param accessToken - OAuth access token
   * @returns Channel data
   */
  async getChannel(
    broadcasterId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/channels');
    url.searchParams.set('broadcaster_id', broadcasterId);
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get chatters in a channel with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param accessToken - OAuth access token
   * @returns Chatters data
   */
  async getChatters(
    broadcasterId: string,
    moderatorId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/chat/chatters');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('moderator_id', moderatorId);
    url.searchParams.set('first', '1000');
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get channel emotes with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param accessToken - OAuth access token
   * @returns Emotes data
   */
  async getEmotes(
    broadcasterId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/chat/emotes');
    url.searchParams.set('broadcaster_id', broadcasterId);
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get clips with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param accessToken - OAuth access token
   * @param options - Query options
   * @returns Clips data
   */
  async getClips(
    broadcasterId: string,
    accessToken: string,
    options?: {
      first?: number;
      startedAt?: string;
      endedAt?: string;
    }
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/clips');
    url.searchParams.set('broadcaster_id', broadcasterId);
    if (options?.first) url.searchParams.set('first', options.first.toString());
    if (options?.startedAt) url.searchParams.set('started_at', options.startedAt);
    if (options?.endedAt) url.searchParams.set('ended_at', options.endedAt);
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get videos with retry logic
   * 
   * @param userId - User ID
   * @param accessToken - OAuth access token
   * @param options - Query options
   * @returns Videos data
   */
  async getVideos(
    userId: string,
    accessToken: string,
    options?: {
      first?: number;
      type?: 'all' | 'archive' | 'highlight' | 'upload';
    }
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/videos');
    url.searchParams.set('user_id', userId);
    if (options?.first) url.searchParams.set('first', options.first.toString());
    if (options?.type && options.type !== 'all') url.searchParams.set('type', options.type);
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get moderators with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param accessToken - OAuth access token
   * @returns Moderators data
   */
  async getModerators(
    broadcasterId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/moderation/moderators');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('first', '100');
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Get VIPs with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param accessToken - OAuth access token
   * @returns VIPs data
   */
  async getVIPs(
    broadcasterId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/channels/vips');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('first', '100');
    
    return this.get(url.toString(), accessToken);
  }

  /**
   * Ban a user with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param userId - User ID to ban
   * @param accessToken - OAuth access token
   * @param reason - Ban reason
   * @param duration - Ban duration in seconds (0 for permanent)
   * @returns Ban result
   */
  async banUser(
    broadcasterId: string,
    moderatorId: string,
    userId: string,
    accessToken: string,
    reason?: string,
    duration?: number
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/moderation/bans');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('moderator_id', moderatorId);
    
    const body: any = { user_id: userId };
    if (reason) body.reason = reason;
    if (duration !== undefined) body.duration = duration;
    
    return this.post(url.toString(), accessToken, body);
  }

  /**
   * Unban a user with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param userId - User ID to unban
   * @param accessToken - OAuth access token
   * @returns Unban result
   */
  async unbanUser(
    broadcasterId: string,
    moderatorId: string,
    userId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/moderation/bans');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('moderator_id', moderatorId);
    url.searchParams.set('user_id', userId);
    
    return this.delete(url.toString(), accessToken);
  }

  /**
   * Delete a chat message with retry logic
   * 
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param messageId - Message ID to delete
   * @param accessToken - OAuth access token
   * @returns Delete result
   */
  async deleteMessage(
    broadcasterId: string,
    moderatorId: string,
    messageId: string,
    accessToken: string
  ): Promise<any> {
    const url = new URL('https://api.twitch.tv/helix/moderation/chat');
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('moderator_id', moderatorId);
    url.searchParams.set('message_id', messageId);
    
    return this.delete(url.toString(), accessToken);
  }

  /**
   * Clean OAuth token (remove 'oauth:' prefix if present)
   */
  private cleanToken(token: string): string {
    return token.replace(/^oauth:/, '');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TwitchAPIRetryConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiClient.updateConfig({
      maxAttempts: this.config.maxAttempts,
      initialDelayMs: this.config.initialDelayMs,
      maxDelayMs: this.config.maxDelayMs,
      backoffMultiplier: this.config.backoffMultiplier,
      logRetries: this.config.logRetries,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<TwitchAPIRetryConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance of TwitchAPIRetryWrapper
 */
let instance: TwitchAPIRetryWrapper | null = null;

/**
 * Get or create the singleton TwitchAPIRetryWrapper instance
 */
export function getTwitchAPIRetryWrapper(
  config?: TwitchAPIRetryConfig
): TwitchAPIRetryWrapper {
  if (!instance) {
    instance = new TwitchAPIRetryWrapper(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetTwitchAPIRetryWrapper(): void {
  instance = null;
}
