/**
 * YouTubeAdapter - Platform adapter for YouTube Live
 * 
 * Implements the IPlatformAdapter interface for YouTube Live streaming.
 * Handles OAuth 2.0 authentication, chat reading via YouTube Live API,
 * message sending, and rate limit handling with queue.
 * 
 * @requirements 4.1 - YouTube platform support
 * @requirements 4.2 - OAuth 2.0 authentication
 * @requirements 4.3 - Read YouTube Live chat messages in real-time
 * @requirements 4.4 - Send messages to YouTube Live chat
 * @requirements 4.7 - Handle rate limits with queue
 */

import type {
  Platform,
  PlatformConnectionStatus,
  PlatformConnectionConfig,
  ChatMessage,
  Badge,
  BadgeType,
  PlatformMessageCallback,
  PlatformStatusCallback,
  IPlatformAdapter,
  QueuedMessage,
  RateLimitConfig,
  ReconnectionConfig,
  PLATFORM_RATE_LIMITS,
  PLATFORM_RECONNECTION_CONFIG,
} from '../../../types/platform';

// YouTube API configuration
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Required OAuth scopes for YouTube Live
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

/**
 * YouTube Live chat message from API
 */
interface YouTubeChatMessage {
  id: string;
  snippet: {
    type: string;
    liveChatId: string;
    authorChannelId: string;
    publishedAt: string;
    hasDisplayContent: boolean;
    displayMessage: string;
    textMessageDetails?: {
      messageText: string;
    };
    superChatDetails?: {
      amountMicros: string;
      currency: string;
      amountDisplayString: string;
      userComment: string;
      tier: number;
    };
  };
  authorDetails: {
    channelId: string;
    channelUrl: string;
    displayName: string;
    profileImageUrl: string;
    isVerified: boolean;
    isChatOwner: boolean;
    isChatSponsor: boolean;
    isChatModerator: boolean;
  };
}

/**
 * YouTube Live broadcast info
 */
interface YouTubeBroadcast {
  id: string;
  snippet: {
    liveChatId: string;
    title: string;
    channelId: string;
  };
}

/**
 * Configuration for YouTubeAdapter
 */
interface YouTubeAdapterConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  rateLimitConfig?: Partial<RateLimitConfig>;
  reconnectionConfig?: Partial<ReconnectionConfig>;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxMessagesPerSecond: 0.5,
  maxMessagesPerMinute: 10,
  burstLimit: 3,
};

const DEFAULT_RECONNECTION: ReconnectionConfig = {
  maxAttempts: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

export class YouTubeAdapter implements IPlatformAdapter {
  readonly platform: Platform = 'youtube';
  readonly displayName = 'YouTube Live';
  
  private status: PlatformConnectionStatus = 'disconnected';
  private currentChannel: string | null = null;
  private liveChatId: string | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private enabled = true;
  
  private messageCallbacks = new Set<PlatformMessageCallback>();
  private statusCallbacks = new Set<PlatformStatusCallback>();
  
  // Polling for chat messages
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private nextPageToken: string | null = null;
  private pollingDelayMs = 5000; // Default polling interval
  
  // Rate limiting and message queue
  private messageQueue: QueuedMessage[] = [];
  private rateLimitConfig: RateLimitConfig;
  private messagesSentThisMinute = 0;
  private lastMessageTime = 0;
  private queueProcessorInterval: ReturnType<typeof setInterval> | null = null;
  private isRateLimited = false;
  private rateLimitResetTime = 0;
  
  // Reconnection
  private reconnectionConfig: ReconnectionConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;
  
  private config: YouTubeAdapterConfig;
  
  constructor(config: YouTubeAdapterConfig = {}) {
    this.config = config;
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...config.rateLimitConfig };
    this.reconnectionConfig = { ...DEFAULT_RECONNECTION, ...config.reconnectionConfig };
  }
  
  getStatus(): PlatformConnectionStatus {
    return this.status;
  }
  
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }
  
  /**
   * Connect to YouTube Live chat
   * @requirements 4.2 - OAuth 2.0 authentication
   * @requirements 4.3 - Read YouTube Live chat messages
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      await this.disconnect();
    }
    
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.currentChannel = config.channel;
    this.accessToken = config.token || null;
    this.refreshToken = config.refreshToken || null;
    
    this.setStatus('connecting');
    
    try {
      // Validate token
      if (!this.accessToken) {
        throw new Error('Access token is required for YouTube connection');
      }
      
      // Get live broadcast info to find liveChatId
      const broadcast = await this.getActiveBroadcast();
      if (!broadcast) {
        throw new Error('No active live broadcast found');
      }
      
      this.liveChatId = broadcast.snippet.liveChatId;
      
      // Start polling for chat messages
      this.startChatPolling();
      
      // Start message queue processor
      this.startQueueProcessor();
      
      this.setStatus('connected');
    } catch (error) {
      this.handleConnectionError(error);
    }
  }
  
  /**
   * Disconnect from YouTube Live chat
   */
  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    
    this.stopChatPolling();
    this.stopQueueProcessor();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.currentChannel = null;
    this.liveChatId = null;
    this.accessToken = null;
    this.nextPageToken = null;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    
    this.setStatus('disconnected');
  }
  
  /**
   * Send a message to YouTube Live chat
   * @requirements 4.4 - Send messages to YouTube Live chat
   * @requirements 4.7 - Handle rate limits with queue
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.liveChatId || !this.accessToken) {
      return false;
    }
    
    // Add to queue for rate limit handling
    const queuedMessage: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now(),
      priority: 1,
    };
    
    this.messageQueue.push(queuedMessage);
    
    // If not rate limited, try to send immediately
    if (!this.isRateLimited) {
      return this.processNextMessage();
    }
    
    return true; // Message queued successfully
  }
  
  /**
   * Register message callback
   */
  onMessage(callback: PlatformMessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }
  
  /**
   * Register status change callback
   */
  onStatusChange(callback: PlatformStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  dispose(): void {
    this.disconnect();
    this.messageCallbacks.clear();
    this.statusCallbacks.clear();
  }
  
  // ============================================
  // OAuth Methods
  // ============================================
  
  /**
   * Build OAuth authorization URL
   * @requirements 4.2 - OAuth 2.0 authentication
   */
  static buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    
    return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      return false;
    }
    
    try {
      const response = await fetch(YOUTUBE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
      return true;
    } catch {
      return false;
    }
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  /**
   * Get active live broadcast
   */
  private async getActiveBroadcast(): Promise<YouTubeBroadcast | null> {
    if (!this.accessToken) return null;
    
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.getActiveBroadcast();
          }
        }
        return null;
      }
      
      const data = await response.json();
      return data.items?.[0] || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Start polling for chat messages
   * @requirements 4.3 - Read YouTube Live chat messages in real-time
   */
  private startChatPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Initial fetch
    this.fetchChatMessages();
    
    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.fetchChatMessages();
    }, this.pollingDelayMs);
  }
  
  private stopChatPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Fetch chat messages from YouTube API
   */
  private async fetchChatMessages(): Promise<void> {
    if (!this.liveChatId || !this.accessToken || this.status !== 'connected') {
      return;
    }
    
    try {
      let url = `${YOUTUBE_API_BASE}/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails`;
      if (this.nextPageToken) {
        url += `&pageToken=${this.nextPageToken}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshAccessToken();
          if (!refreshed) {
            this.handleConnectionError(new Error('Token expired and refresh failed'));
          }
          return;
        }
        if (response.status === 403) {
          // Rate limited
          this.handleRateLimit(response);
          return;
        }
        return;
      }
      
      const data = await response.json();
      
      // Update polling interval based on API recommendation
      if (data.pollingIntervalMillis) {
        this.pollingDelayMs = data.pollingIntervalMillis;
      }
      
      // Store next page token
      this.nextPageToken = data.nextPageToken || null;
      
      // Process messages
      const messages: YouTubeChatMessage[] = data.items || [];
      for (const msg of messages) {
        this.emitMessage(msg);
      }
    } catch (error) {
      console.error('Error fetching YouTube chat messages:', error);
    }
  }
  
  /**
   * Convert YouTube message to unified ChatMessage format
   */
  private emitMessage(ytMessage: YouTubeChatMessage): void {
    const badges = this.mapYouTubeBadges(ytMessage.authorDetails);
    
    const chatMessage: ChatMessage = {
      id: ytMessage.id,
      platform: 'youtube',
      username: ytMessage.authorDetails.channelId,
      displayName: ytMessage.authorDetails.displayName,
      message: ytMessage.snippet.displayMessage || ytMessage.snippet.textMessageDetails?.messageText || '',
      timestamp: new Date(ytMessage.snippet.publishedAt).getTime(),
      userId: ytMessage.authorDetails.channelId,
      badges,
      rawData: {
        profileImageUrl: ytMessage.authorDetails.profileImageUrl,
        superChat: ytMessage.snippet.superChatDetails,
      },
    };
    
    this.messageCallbacks.forEach(cb => cb(chatMessage));
  }
  
  /**
   * Map YouTube author details to unified Badge format
   * @requirements 4.6 - Display YouTube-specific user badges (member, moderator)
   */
  private mapYouTubeBadges(authorDetails: YouTubeChatMessage['authorDetails']): Badge[] {
    const badges: Badge[] = [];
    
    if (authorDetails.isChatOwner) {
      badges.push({ type: 'owner', platform: 'youtube' });
    }
    if (authorDetails.isChatModerator) {
      badges.push({ type: 'moderator', platform: 'youtube' });
    }
    if (authorDetails.isChatSponsor) {
      badges.push({ type: 'member', platform: 'youtube' });
    }
    if (authorDetails.isVerified) {
      badges.push({ type: 'verified', platform: 'youtube' });
    }
    
    return badges;
  }
  
  /**
   * Start the message queue processor
   * @requirements 4.7 - Handle rate limits with queue
   */
  private startQueueProcessor(): void {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }
    
    // Process queue every second
    this.queueProcessorInterval = setInterval(() => {
      this.processMessageQueue();
    }, 1000);
    
    // Reset messages per minute counter every minute
    setInterval(() => {
      this.messagesSentThisMinute = 0;
    }, 60000);
  }
  
  private stopQueueProcessor(): void {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
    }
  }
  
  /**
   * Process the message queue respecting rate limits
   * @requirements 4.7 - Queue messages and retry when rate limit resets
   */
  private processMessageQueue(): void {
    // Check if rate limit has reset
    if (this.isRateLimited && Date.now() >= this.rateLimitResetTime) {
      this.isRateLimited = false;
    }
    
    if (this.isRateLimited || this.messageQueue.length === 0) {
      return;
    }
    
    // Check rate limits
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    const minTimeBetweenMessages = 1000 / this.rateLimitConfig.maxMessagesPerSecond;
    
    if (timeSinceLastMessage < minTimeBetweenMessages) {
      return;
    }
    
    if (this.messagesSentThisMinute >= this.rateLimitConfig.maxMessagesPerMinute) {
      return;
    }
    
    this.processNextMessage();
  }
  
  /**
   * Process the next message in the queue
   */
  private async processNextMessage(): Promise<boolean> {
    if (this.messageQueue.length === 0 || !this.liveChatId || !this.accessToken) {
      return false;
    }
    
    const queuedMessage = this.messageQueue.shift()!;
    
    try {
      const response = await fetch(`${YOUTUBE_API_BASE}/liveChat/messages?part=snippet`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            liveChatId: this.liveChatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: queuedMessage.message,
            },
          },
        }),
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          // Rate limited - put message back in queue
          this.messageQueue.unshift(queuedMessage);
          this.handleRateLimit(response);
          return false;
        }
        return false;
      }
      
      this.lastMessageTime = Date.now();
      this.messagesSentThisMinute++;
      return true;
    } catch (error) {
      console.error('Error sending YouTube message:', error);
      // Put message back in queue for retry
      this.messageQueue.unshift(queuedMessage);
      return false;
    }
  }
  
  /**
   * Handle rate limit response
   * @requirements 4.7 - Queue messages and retry when rate limit resets
   */
  private handleRateLimit(response: Response): void {
    this.isRateLimited = true;
    
    // Try to get retry-after header
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      this.rateLimitResetTime = Date.now() + parseInt(retryAfter, 10) * 1000;
    } else {
      // Default to 60 seconds
      this.rateLimitResetTime = Date.now() + 60000;
    }
    
    console.warn(`YouTube rate limited. Will retry after ${new Date(this.rateLimitResetTime).toISOString()}`);
  }
  
  private setStatus(status: PlatformConnectionStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(this.platform, status, error));
  }
  
  private handleConnectionError(error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    
    if (!this.isManualDisconnect) {
      this.attemptReconnect();
    } else {
      this.setStatus('error', errorMsg);
    }
  }
  
  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.isManualDisconnect || !this.currentChannel) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.reconnectionConfig.maxAttempts) {
      this.setStatus('error', `Reconnection failed after ${this.reconnectionConfig.maxAttempts} attempts`);
      return;
    }
    
    const delay = Math.min(
      this.reconnectionConfig.baseDelayMs * Math.pow(this.reconnectionConfig.backoffMultiplier, this.reconnectAttempts - 1),
      this.reconnectionConfig.maxDelayMs
    );
    
    this.setStatus('reconnecting');
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.currentChannel && !this.isManualDisconnect) {
        this.connect({
          channel: this.currentChannel,
          token: this.accessToken || undefined,
          refreshToken: this.refreshToken || undefined,
        });
      }
    }, delay);
  }
  
  // ============================================
  // Public Utility Methods
  // ============================================
  
  /**
   * Get the current message queue length
   */
  getQueueLength(): number {
    return this.messageQueue.length;
  }
  
  /**
   * Check if currently rate limited
   */
  isCurrentlyRateLimited(): boolean {
    return this.isRateLimited;
  }
  
  /**
   * Get time until rate limit resets (in ms)
   */
  getRateLimitResetTime(): number {
    if (!this.isRateLimited) return 0;
    return Math.max(0, this.rateLimitResetTime - Date.now());
  }
  
  /**
   * Clear the message queue
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }
  
  /**
   * Get reconnection attempts count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

export default YouTubeAdapter;
