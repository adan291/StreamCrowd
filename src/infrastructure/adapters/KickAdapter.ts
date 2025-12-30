/**
 * KickAdapter - Platform adapter for Kick streaming
 * 
 * Implements the IPlatformAdapter interface for Kick streaming platform.
 * Handles authentication, WebSocket chat connection, message sending,
 * and automatic reconnection with exponential backoff.
 * 
 * @requirements 5.1 - Kick platform support
 * @requirements 5.2 - Kick authentication
 * @requirements 5.3 - Read Kick chat messages in real-time via WebSocket
 * @requirements 5.4 - Send messages to Kick chat
 * @requirements 5.7 - Automatic reconnection with exponential backoff
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
  ReconnectionConfig,
} from '../../../types/platform';

// Kick API configuration
const KICK_API_BASE = 'https://kick.com/api/v2';
const KICK_PUSHER_KEY = '32cbd69e4b950bf97679'; // Kick's Pusher key
const KICK_PUSHER_CLUSTER = 'us2';

/**
 * Kick chat message from WebSocket
 */
interface KickChatMessage {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string;
      badges: KickBadge[];
    };
  };
}

/**
 * Kick badge from API
 */
interface KickBadge {
  type: string;
  text: string;
  count?: number;
}

/**
 * Kick channel info from API
 */
interface KickChannelInfo {
  id: number;
  user_id: number;
  slug: string;
  chatroom: {
    id: number;
    chatable_type: string;
    channel_id: number;
    created_at: string;
    updated_at: string;
  };
  user: {
    id: number;
    username: string;
    bio: string;
    profile_pic: string;
  };
}

/**
 * Configuration for KickAdapter
 */
interface KickAdapterConfig {
  reconnectionConfig?: Partial<ReconnectionConfig>;
}

const DEFAULT_RECONNECTION: ReconnectionConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export class KickAdapter implements IPlatformAdapter {
  readonly platform: Platform = 'kick';
  readonly displayName = 'Kick';
  
  private status: PlatformConnectionStatus = 'disconnected';
  private currentChannel: string | null = null;
  private chatroomId: number | null = null;
  private accessToken: string | null = null;
  private enabled = true;
  
  private messageCallbacks = new Set<PlatformMessageCallback>();
  private statusCallbacks = new Set<PlatformStatusCallback>();
  
  // WebSocket connection
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Reconnection
  private reconnectionConfig: ReconnectionConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;
  private lastConnectionConfig: PlatformConnectionConfig | null = null;
  
  constructor(config: KickAdapterConfig = {}) {
    this.reconnectionConfig = { ...DEFAULT_RECONNECTION, ...config.reconnectionConfig };
  }
  
  getStatus(): PlatformConnectionStatus {
    return this.status;
  }
  
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }
  
  /**
   * Connect to Kick chat via WebSocket
   * @requirements 5.2 - Kick authentication
   * @requirements 5.3 - Read Kick chat messages in real-time via WebSocket
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      await this.disconnect();
    }
    
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.currentChannel = config.channel;
    this.accessToken = config.token || null;
    this.lastConnectionConfig = config;
    
    this.setStatus('connecting');
    
    try {
      // Get channel info to find chatroom ID
      const channelInfo = await this.getChannelInfo(config.channel);
      if (!channelInfo) {
        throw new Error('Channel not found');
      }
      
      this.chatroomId = channelInfo.chatroom.id;
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      this.setStatus('connected');
    } catch (error) {
      this.handleConnectionError(error);
    }
  }
  
  /**
   * Disconnect from Kick chat
   */
  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    
    this.stopPingInterval();
    this.closeWebSocket();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.currentChannel = null;
    this.chatroomId = null;
    this.accessToken = null;
    this.reconnectAttempts = 0;
    this.lastConnectionConfig = null;
    
    this.setStatus('disconnected');
  }
  
  /**
   * Send a message to Kick chat
   * @requirements 5.4 - Send messages to Kick chat
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.chatroomId || !this.accessToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${KICK_API_BASE}/messages/send/${this.chatroomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          content: message,
          type: 'message',
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error sending Kick message:', error);
      return false;
    }
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
  // Private Methods
  // ============================================
  
  /**
   * Get channel info from Kick API
   */
  private async getChannelInfo(channel: string): Promise<KickChannelInfo | null> {
    try {
      const response = await fetch(`${KICK_API_BASE}/channels/${channel}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  }
  
  /**
   * Connect to Kick chat WebSocket using Pusher protocol
   * @requirements 5.3 - Read Kick chat messages in real-time via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://ws-${KICK_PUSHER_CLUSTER}.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=7.6.0&flash=false`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        // Subscribe to chatroom channel
        if (this.ws && this.chatroomId) {
          const subscribeMessage = JSON.stringify({
            event: 'pusher:subscribe',
            data: {
              auth: '',
              channel: `chatrooms.${this.chatroomId}.v2`,
            },
          });
          this.ws.send(subscribeMessage);
        }
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('Kick WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };
      
      this.ws.onclose = (event) => {
        this.handleWebSocketClose(event);
      };
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.event) {
        case 'pusher:connection_established':
          // Connection established, nothing to do
          break;
          
        case 'pusher_internal:subscription_succeeded':
          // Subscription successful
          break;
          
        case 'App\\Events\\ChatMessageEvent':
          // Chat message received
          if (message.data) {
            const chatData = typeof message.data === 'string' 
              ? JSON.parse(message.data) 
              : message.data;
            this.emitMessage(chatData);
          }
          break;
          
        case 'pusher:pong':
          // Pong received, connection is alive
          break;
          
        default:
          // Unknown event, ignore
          break;
      }
    } catch (error) {
      console.error('Error parsing Kick WebSocket message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   * @requirements 5.7 - Automatic reconnection with exponential backoff
   */
  private handleWebSocketClose(event: CloseEvent): void {
    this.stopPingInterval();
    
    if (!this.isManualDisconnect) {
      this.attemptReconnect();
    } else {
      this.setStatus('disconnected');
    }
  }
  
  /**
   * Close WebSocket connection
   */
  private closeWebSocket(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch { /* ignore */ }
      this.ws = null;
    }
  }
  
  /**
   * Start ping interval to keep WebSocket alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 30000); // Ping every 30 seconds
  }
  
  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Convert Kick message to unified ChatMessage format
   */
  private emitMessage(kickMessage: KickChatMessage): void {
    const badges = this.mapKickBadges(kickMessage.sender.identity.badges);
    
    const chatMessage: ChatMessage = {
      id: kickMessage.id,
      platform: 'kick',
      username: kickMessage.sender.slug,
      displayName: kickMessage.sender.username,
      message: kickMessage.content,
      timestamp: new Date(kickMessage.created_at).getTime(),
      userId: kickMessage.sender.id.toString(),
      color: kickMessage.sender.identity.color,
      badges,
      rawData: {
        chatroomId: kickMessage.chatroom_id,
        type: kickMessage.type,
      },
    };
    
    this.messageCallbacks.forEach(cb => cb(chatMessage));
  }
  
  /**
   * Map Kick badges to unified Badge format
   * @requirements 5.6 - Display Kick-specific user badges (subscriber, moderator, VIP)
   */
  private mapKickBadges(kickBadges: KickBadge[]): Badge[] {
    const badges: Badge[] = [];
    
    for (const badge of kickBadges) {
      let badgeType: BadgeType | null = null;
      let tier: number | undefined;
      
      switch (badge.type.toLowerCase()) {
        case 'subscriber':
          badgeType = 'subscriber';
          tier = badge.count;
          break;
        case 'moderator':
          badgeType = 'moderator';
          break;
        case 'vip':
          badgeType = 'vip';
          break;
        case 'broadcaster':
        case 'owner':
          badgeType = 'broadcaster';
          break;
        case 'founder':
          badgeType = 'founder';
          break;
        case 'verified':
          badgeType = 'verified';
          break;
      }
      
      if (badgeType) {
        badges.push({
          type: badgeType,
          platform: 'kick',
          tier,
          label: badge.text,
        });
      }
    }
    
    return badges;
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
   * @requirements 5.7 - Automatic reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.isManualDisconnect || !this.lastConnectionConfig) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.reconnectionConfig.maxAttempts) {
      this.setStatus('error', `Reconnection failed after ${this.reconnectionConfig.maxAttempts} attempts`);
      return;
    }
    
    const delay = this.calculateBackoffDelay(this.reconnectAttempts);
    
    this.setStatus('reconnecting');
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.lastConnectionConfig && !this.isManualDisconnect) {
        this.connect(this.lastConnectionConfig);
      }
    }, delay);
  }
  
  /**
   * Calculate exponential backoff delay
   * @requirements 5.7 - Exponential backoff for reconnection
   */
  calculateBackoffDelay(attempt: number): number {
    const delay = this.reconnectionConfig.baseDelayMs * 
      Math.pow(this.reconnectionConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.reconnectionConfig.maxDelayMs);
  }
  
  // ============================================
  // Public Utility Methods
  // ============================================
  
  /**
   * Get reconnection attempts count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
  
  /**
   * Get reconnection configuration
   */
  getReconnectionConfig(): ReconnectionConfig {
    return { ...this.reconnectionConfig };
  }
  
  /**
   * Update reconnection configuration
   */
  setReconnectionConfig(config: Partial<ReconnectionConfig>): void {
    this.reconnectionConfig = { ...this.reconnectionConfig, ...config };
  }
  
  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get the chatroom ID
   */
  getChatroomId(): number | null {
    return this.chatroomId;
  }
}

export default KickAdapter;
