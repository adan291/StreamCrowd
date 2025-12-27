/**
 * TwitchService - Application service for Twitch connection management
 * 
 * This service orchestrates the TwitchAdapter and provides a clean API
 * for connecting to Twitch, handling reconnection, and managing collaboration channels.
 * 
 * @requirements 4.1 - THE TwitchAdapter SHALL handle connection, disconnection, and reconnection with exponential backoff
 * @requirements 4.4 - THE TwitchService SHALL orchestrate TwitchAdapter and provide a clean API
 * @requirements 4.5 - WHEN connection fails, THE TwitchService SHALL attempt reconnection up to configurable max attempts
 */

import { TwitchAdapter, getTwitchAdapter } from '../../infrastructure/adapters/TwitchAdapter';
import type { 
  ConnectionStatus, 
  ChatMessage, 
  MessageCallback, 
  StatusCallback,
  ConnectionOptions,
} from '../../domain/ports/IChatProvider';
import type { StreamEvent } from '../../domain/entities/StreamEvent';
import type { StreamEventCallback } from '../../domain/ports/IStreamEventProvider';

/**
 * Configuration for TwitchService
 */
export interface TwitchServiceConfig {
  /** Maximum number of reconnection attempts before giving up */
  maxReconnectAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  reconnectBaseDelay: number;
  /** Maximum delay in milliseconds for exponential backoff */
  reconnectMaxDelay: number;
}

/**
 * Default configuration for TwitchService
 */
export const DEFAULT_TWITCH_SERVICE_CONFIG: TwitchServiceConfig = {
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
};

/**
 * Collaboration channel information
 */
export interface CollaborationChannel {
  name: string;
  color: string;
  isMain: boolean;
  connectedAt: number;
}

/** Default colors for collaboration channels */
const COLLABORATION_COLORS = [
  '#a970ff', // Purple (main)
  '#00f0f0', // Cyan
  '#ff6b6b', // Red
  '#4ade80', // Green
  '#fbbf24', // Yellow
  '#f472b6', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Teal
];

/**
 * Options for establishing a Twitch connection
 */
export interface TwitchConnectionOptions {
  /** Channel name to connect to (with or without # prefix) */
  channel: string;
  /** OAuth token for authenticated connections (optional for anonymous) */
  token?: string;
  /** Callback for incoming messages */
  onMessage?: MessageCallback;
  /** Callback for connection status changes */
  onStatusChange?: StatusCallback;
  /** Callback for reconnection attempts */
  onReconnectAttempt?: (attempt: number, maxAttempts: number) => void;
}

/**
 * OAuth result from Twitch authentication
 */
export interface TwitchOAuthResult {
  accessToken: string;
  username: string;
  userId: string;
  expiresIn?: number;
}


/**
 * TwitchService - Application layer service for Twitch integration
 * 
 * Provides a high-level API for:
 * - Connection management with automatic reconnection
 * - Message handling
 * - Stream event handling
 * - Collaboration channels (multi-channel support)
 * - OAuth token management
 */
export class TwitchService {
  private adapter: TwitchAdapter;
  private config: TwitchServiceConfig;
  private collaborationChannels: Map<string, CollaborationChannel> = new Map();
  private messageCallback: MessageCallback | null = null;
  private statusCallback: StatusCallback | null = null;
  private reconnectAttemptCallback: ((attempt: number, maxAttempts: number) => void) | null = null;
  private streamEventCallbacks: Set<StreamEventCallback> = new Set();
  private currentOptions: TwitchConnectionOptions | null = null;
  
  constructor(adapter?: TwitchAdapter, config: Partial<TwitchServiceConfig> = {}) {
    this.adapter = adapter || getTwitchAdapter();
    this.config = { ...DEFAULT_TWITCH_SERVICE_CONFIG, ...config };
    
    // Apply config to adapter
    this.adapter.setConfig({
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectBaseDelay: this.config.reconnectBaseDelay,
      reconnectMaxDelay: this.config.reconnectMaxDelay,
    });
  }
  
  // ============================================
  // Connection Management
  // ============================================
  
  /**
   * Connect to a Twitch channel
   * @param options - Connection options
   */
  async connect(options: TwitchConnectionOptions): Promise<void> {
    this.currentOptions = options;
    
    // Set callbacks
    if (options.onMessage) {
      this.messageCallback = options.onMessage;
    }
    if (options.onStatusChange) {
      this.statusCallback = options.onStatusChange;
    }
    if (options.onReconnectAttempt) {
      this.reconnectAttemptCallback = options.onReconnectAttempt;
    }
    
    // Register adapter callbacks
    this.adapter.onMessage((message: ChatMessage) => {
      if (this.messageCallback) {
        // Convert to legacy format for backward compatibility
        this.messageCallback(message);
      }
    });
    
    this.adapter.onStatusChange((status: ConnectionStatus, error?: string) => {
      if (this.statusCallback) {
        this.statusCallback(status, error);
      }
      
      // Handle reconnection attempt notification
      if (status === 'connecting' && this.reconnectAttemptCallback) {
        const attempts = this.adapter.getReconnectAttempts();
        if (attempts > 0) {
          this.reconnectAttemptCallback(attempts, this.config.maxReconnectAttempts);
        }
      }
    });
    
    // Register stream event callback
    this.adapter.onStreamEvent((event: StreamEvent) => {
      this.streamEventCallbacks.forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error('Error in stream event callback:', e);
        }
      });
    });
    
    // Connect via adapter
    const connectionOptions: ConnectionOptions = {
      channel: options.channel,
      token: options.token,
    };
    
    await this.adapter.connect(connectionOptions);
  }
  
  /**
   * Disconnect from the current channel
   */
  disconnect(): void {
    // Disconnect all collaboration channels first
    this.disconnectAllCollaborations();
    
    // Disconnect main channel
    this.adapter.disconnect();
    this.currentOptions = null;
  }
  
  /**
   * Get the current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.adapter.getConnectionStatus();
  }
  
  /**
   * Get the current channel name (without # prefix)
   */
  getCurrentChannel(): string | null {
    return this.adapter.getCurrentChannel();
  }
  
  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.adapter.getConnectionStatus() === 'connected';
  }
  
  // ============================================
  // Messaging
  // ============================================
  
  /**
   * Send a message to the current channel
   * @param message - Message to send
   * @returns True if message was sent successfully
   */
  async sendMessage(message: string): Promise<boolean> {
    return this.adapter.sendMessage(message);
  }
  
  /**
   * Register a callback for incoming messages
   * @param callback - Function to call when a message is received
   * @returns Unsubscribe function
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallback = callback;
    return this.adapter.onMessage(callback);
  }
  
  /**
   * Register a callback for connection status changes
   * @param callback - Function to call when status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallback = callback;
    return this.adapter.onStatusChange(callback);
  }
  
  // ============================================
  // Stream Events
  // ============================================
  
  /**
   * Register a callback for stream events (subs, raids, cheers, etc.)
   * @param callback - Function to call when a stream event occurs
   * @returns Unsubscribe function
   */
  onStreamEvent(callback: StreamEventCallback): () => void {
    this.streamEventCallbacks.add(callback);
    return () => this.streamEventCallbacks.delete(callback);
  }
  
  /**
   * Remove a stream event callback
   * @param callback - Callback to remove
   */
  offStreamEvent(callback: StreamEventCallback): void {
    this.streamEventCallbacks.delete(callback);
  }
  
  // ============================================
  // Collaboration Channels
  // ============================================
  
  /**
   * Get the next available color for a collaboration channel
   */
  private getNextCollaborationColor(): string {
    const usedColors = Array.from(this.collaborationChannels.values()).map(c => c.color);
    // Main channel uses first color
    usedColors.push(COLLABORATION_COLORS[0]);
    
    for (const color of COLLABORATION_COLORS) {
      if (!usedColors.includes(color)) {
        return color;
      }
    }
    // If all colors used, cycle back
    return COLLABORATION_COLORS[(this.collaborationChannels.size + 1) % COLLABORATION_COLORS.length];
  }
  
  /**
   * Add a collaboration channel (connect to another streamer's chat)
   * @param channel - Channel name to add as collaborator
   * @param onStatusChange - Optional callback for this channel's connection status
   * @returns CollaborationChannel info or null if failed
   */
  async addCollaborationChannel(
    channel: string,
    onStatusChange?: (channel: string, status: 'connected' | 'disconnected' | 'error', error?: string) => void
  ): Promise<CollaborationChannel | null> {
    const normalizedChannel = channel.toLowerCase().replace('#', '');
    const currentChannel = this.getCurrentChannel();
    
    // Don't add if it's the main channel or already added
    if (currentChannel && normalizedChannel === currentChannel.toLowerCase()) {
      return null;
    }
    if (this.collaborationChannels.has(normalizedChannel)) {
      return this.collaborationChannels.get(normalizedChannel) || null;
    }
    
    try {
      const success = await this.adapter.addChannel(normalizedChannel);
      
      if (success) {
        const collabChannel: CollaborationChannel = {
          name: normalizedChannel,
          color: this.getNextCollaborationColor(),
          isMain: false,
          connectedAt: Date.now(),
        };
        
        this.collaborationChannels.set(normalizedChannel, collabChannel);
        
        if (onStatusChange) {
          onStatusChange(normalizedChannel, 'connected');
        }
        
        return collabChannel;
      }
      
      if (onStatusChange) {
        onStatusChange(normalizedChannel, 'error', 'Failed to connect');
      }
      return null;
    } catch (err) {
      if (onStatusChange) {
        onStatusChange(normalizedChannel, 'error', String(err));
      }
      return null;
    }
  }
  
  /**
   * Remove a collaboration channel
   * @param channel - Channel name to remove
   */
  removeCollaborationChannel(channel: string): void {
    const normalizedChannel = channel.toLowerCase().replace('#', '');
    
    this.adapter.removeChannel(normalizedChannel);
    this.collaborationChannels.delete(normalizedChannel);
  }
  
  /**
   * Get all collaboration channels
   * @returns Array of collaboration channels
   */
  getCollaborationChannels(): CollaborationChannel[] {
    return Array.from(this.collaborationChannels.values());
  }
  
  /**
   * Check if a channel is connected as collaborator
   * @param channel - Channel name to check
   */
  isCollaborationChannel(channel: string): boolean {
    return this.collaborationChannels.has(channel.toLowerCase().replace('#', ''));
  }
  
  /**
   * Get the main channel info as CollaborationChannel
   */
  getMainChannelInfo(): CollaborationChannel | null {
    const currentChannel = this.getCurrentChannel();
    if (!currentChannel) return null;
    
    return {
      name: currentChannel,
      color: COLLABORATION_COLORS[0],
      isMain: true,
      connectedAt: Date.now(),
    };
  }
  
  /**
   * Disconnect all collaboration channels
   */
  disconnectAllCollaborations(): void {
    for (const [channel] of this.collaborationChannels) {
      this.adapter.removeChannel(channel);
    }
    this.collaborationChannels.clear();
  }
  
  // ============================================
  // OAuth & Token Management
  // ============================================
  
  /**
   * Validate an OAuth token and get user info
   * @param accessToken - OAuth access token to validate
   * @returns Token info or null if invalid
   */
  async validateToken(accessToken: string): Promise<{
    valid: boolean;
    expiresIn: number;
    login?: string;
    userId?: string;
    scopes?: string[];
  } | null> {
    return this.adapter.validateToken(accessToken);
  }
  
  /**
   * Revoke an OAuth token
   * @param accessToken - Token to revoke
   * @returns True if revocation was successful
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    return this.adapter.revokeToken(accessToken);
  }
  
  /**
   * Check if a token is about to expire
   * @param expiresIn - Seconds until token expires
   * @param warningThreshold - Threshold in seconds to trigger warning (default: 1 hour)
   * @returns True if token is about to expire
   */
  isTokenExpiringSoon(expiresIn: number, warningThreshold: number = 3600): boolean {
    return TwitchAdapter.isTokenExpiringSoon(expiresIn, warningThreshold);
  }
  
  /**
   * Get the current OAuth token (if connected with authentication)
   */
  getCurrentToken(): string | null {
    return this.adapter.getCurrentToken();
  }
  
  /**
   * Get the OAuth scopes required for full functionality
   */
  static getRequiredScopes(): string[] {
    return TwitchAdapter.getRequiredScopes();
  }
  
  /**
   * Build the Twitch OAuth authorization URL
   * @param state - CSRF protection state string
   * @param redirectUri - OAuth redirect URI
   * @returns Authorization URL
   */
  static buildAuthUrl(state: string, redirectUri: string): string {
    return TwitchAdapter.buildAuthUrl(state, redirectUri);
  }
  
  /**
   * Generate a random state string for CSRF protection
   */
  static generateOAuthState(): string {
    return TwitchAdapter.generateOAuthState();
  }
  
  // ============================================
  // Utilities
  // ============================================
  
  /**
   * Get viewer count for a channel
   * @param channel - Channel name (optional, uses current channel if not provided)
   * @returns Viewer count or null if offline/unavailable
   */
  async getViewerCount(channel?: string): Promise<number | null> {
    return this.adapter.getViewerCount(channel);
  }
  
  /**
   * Get channel info
   * @param channel - Channel name (optional, uses current channel if not provided)
   * @returns Channel info or null if not found
   */
  async getChannelInfo(channel?: string): Promise<{ name: string; avatar?: string } | null> {
    return this.adapter.getChannelInfo(channel);
  }
  
  /**
   * Calculate exponential backoff delay for reconnection
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attempt: number): number {
    return this.adapter.calculateBackoffDelay(attempt);
  }
  
  /**
   * Get the current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.adapter.getReconnectAttempts();
  }
  
  /**
   * Update service configuration
   * @param config - Partial configuration to merge
   */
  setConfig(config: Partial<TwitchServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.adapter.setConfig({
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectBaseDelay: this.config.reconnectBaseDelay,
      reconnectMaxDelay: this.config.reconnectMaxDelay,
    });
  }
  
  /**
   * Get the current service configuration
   */
  getConfig(): TwitchServiceConfig {
    return { ...this.config };
  }
  
  // ============================================
  // Twitch API Methods
  // ============================================
  
  /**
   * Get user ID for a channel
   * @param token - OAuth token with required scopes
   * @param channel - Channel name (optional, uses current channel if not provided)
   * @returns User ID or null if not found
   */
  async getUserId(token: string, channel?: string): Promise<string | null> {
    return this.adapter.getUserId(token, channel);
  }
  
  /**
   * Get chatters (users in chat) for a channel
   * Requires OAuth token with moderator:read:chatters scope
   * @param token - OAuth token with required scope
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID (usually same as broadcaster)
   * @returns Array of usernames or null if failed
   */
  async getChatters(token: string, broadcasterId: string, moderatorId: string): Promise<string[] | null> {
    return this.adapter.getChatters(token, broadcasterId, moderatorId);
  }
  
  /**
   * Get subscribers for a channel
   * Requires OAuth token with channel:read:subscriptions scope
   * @param token - OAuth token with required scope
   * @param broadcasterId - Broadcaster user ID
   * @returns Array of subscriber usernames or null if failed
   */
  async getSubscribers(token: string, broadcasterId: string): Promise<string[] | null> {
    return this.adapter.getSubscribers(token, broadcasterId);
  }
  
  // ============================================
  // Twitch API Methods - Extended
  // ============================================
  
  /**
   * Get bits leaderboard for a channel
   */
  async getBitsLeaderboard(
    token: string, 
    broadcasterId: string, 
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
  ): Promise<{ rank: number; username: string; bits: number }[] | null> {
    return this.adapter.getBitsLeaderboard(token, broadcasterId, period);
  }
  
  /**
   * Get clips for a channel
   */
  async getClips(
    token: string, 
    broadcasterId: string, 
    first?: number,
    startedAt?: string,
    endedAt?: string
  ): Promise<{ id: string; title: string; url: string; viewCount: number; createdAt: string; creatorName: string; thumbnailUrl: string }[] | null> {
    return this.adapter.getClips(token, broadcasterId, first, startedAt, endedAt);
  }
  
  /**
   * Get VODs/videos for a channel
   */
  async getVideos(
    token: string, 
    userId: string, 
    type?: 'all' | 'upload' | 'archive' | 'highlight',
    first?: number
  ): Promise<{ id: string; title: string; url: string; viewCount: number; createdAt: string; duration: string; thumbnailUrl: string; type: string }[] | null> {
    return this.adapter.getVideos(token, userId, type, first);
  }
  
  /**
   * Get moderators for a channel
   */
  async getModerators(token: string, broadcasterId: string): Promise<{ id: string; username: string; displayName: string }[] | null> {
    return this.adapter.getModerators(token, broadcasterId);
  }
  
  /**
   * Get VIPs for a channel
   */
  async getVIPs(token: string, broadcasterId: string): Promise<{ id: string; username: string; displayName: string }[] | null> {
    return this.adapter.getVIPs(token, broadcasterId);
  }
  
  /**
   * Ban a user from the channel
   */
  async banUser(token: string, broadcasterId: string, userId: string, reason?: string): Promise<boolean> {
    return this.adapter.banUser(token, broadcasterId, userId, reason);
  }
  
  /**
   * Timeout a user in the channel
   */
  async timeoutUser(token: string, broadcasterId: string, userId: string, duration: number, reason?: string): Promise<boolean> {
    return this.adapter.timeoutUser(token, broadcasterId, userId, duration, reason);
  }
  
  /**
   * Unban a user from the channel
   */
  async unbanUser(token: string, broadcasterId: string, userId: string): Promise<boolean> {
    return this.adapter.unbanUser(token, broadcasterId, userId);
  }
  
  /**
   * Get detailed chatters list
   */
  async getChattersDetailed(token: string, broadcasterId: string, moderatorId: string): Promise<{ userId: string; userLogin: string; userName: string }[] | null> {
    return this.adapter.getChattersDetailed(token, broadcasterId, moderatorId);
  }
  
  /**
   * Dispose of the service and clean up resources
   */
  dispose(): void {
    this.disconnect();
    this.streamEventCallbacks.clear();
    this.messageCallback = null;
    this.statusCallback = null;
    this.reconnectAttemptCallback = null;
  }
}

// Singleton instance for convenience
let defaultInstance: TwitchService | null = null;

/**
 * Get the default TwitchService instance
 */
export function getTwitchService(): TwitchService {
  if (!defaultInstance) {
    defaultInstance = new TwitchService();
  }
  return defaultInstance;
}
