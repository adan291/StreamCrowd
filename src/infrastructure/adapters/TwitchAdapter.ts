/**
 * TwitchAdapter - Implementación de IChatProvider para Twitch
 * 
 * Este adapter envuelve la funcionalidad de tmi.js y expone
 * una interfaz limpia que puede ser intercambiada por otros proveedores.
 * 
 * Arquitectura Hexagonal: Este es un "adapter" de infraestructura.
 * 
 * @requirements 2.3 - THE TwitchAdapter SHALL implement `IStreamEventProvider` to emit stream events
 * @requirements 4.1 - THE TwitchAdapter SHALL handle connection, disconnection, and reconnection with exponential backoff
 */

import tmi from 'tmi.js';
import type { 
  IChatProvider, 
  IMultiChannelProvider,
  ChatMessage, 
  StreamEvent,
  ChannelInfo,
  ConnectionOptions,
  ConnectionStatus,
  MessageCallback,
  StatusCallback,
  StreamEventCallback,
} from '../../domain/ports/IChatProvider';
import type { IStreamEventProvider, StreamEventCallback as DomainStreamEventCallback } from '../../domain/ports/IStreamEventProvider';
import type { StreamEvent as DomainStreamEvent, SubTier } from '../../domain/entities/StreamEvent';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

interface TwitchAdapterConfig {
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  reconnectMaxDelay?: number;
}

const DEFAULT_CONFIG: Required<TwitchAdapterConfig> = {
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
};

/**
 * Parse subscription tier from TMI method plan
 */
function parseTier(plan?: string): SubTier {
  switch (plan) {
    case 'Prime': return 'Prime';
    case '2000': return '2000';
    case '3000': return '3000';
    default: return '1000';
  }
}

export class TwitchAdapter implements IMultiChannelProvider, IStreamEventProvider {
  readonly providerId = 'twitch';
  readonly providerName = 'Twitch';
  
  private client: tmi.Client | null = null;
  private config: Required<TwitchAdapterConfig>;
  private currentChannel: string | null = null;
  private currentToken: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  
  private messageCallbacks = new Set<MessageCallback>();
  private statusCallbacks = new Set<StatusCallback>();
  private chatProviderStreamEventCallbacks = new Set<StreamEventCallback>();
  private domainStreamEventCallbacks = new Set<DomainStreamEventCallback>();
  
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;
  
  // Multi-channel support
  private collaborationClients = new Map<string, tmi.Client>();
  
  constructor(config: TwitchAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  getConnectionStatus(): ConnectionStatus {
    return this.status;
  }
  
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }
  
  async connect(options: ConnectionOptions): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }
    
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.currentChannel = options.channel.replace('#', '');
    this.currentToken = options.token || null;
    
    this.setStatus('connecting');
    
    const tmiOptions: tmi.Options = {
      channels: [`#${this.currentChannel}`],
      connection: {
        secure: true,
        reconnect: false, // We handle reconnection ourselves
      },
      options: {
        skipUpdatingEmotesets: true,
      },
    };
    
    if (options.token) {
      tmiOptions.identity = {
        username: this.currentChannel,
        password: options.token.startsWith('oauth:') ? options.token : `oauth:${options.token}`,
      };
    }
    
    try {
      this.client = new tmi.Client(tmiOptions);
      this.setupEventHandlers();
      await this.client.connect();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }
  
  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Disconnect collaboration channels
    for (const [, client] of this.collaborationClients) {
      try {
        client.disconnect();
      } catch { /* ignore */ }
    }
    this.collaborationClients.clear();
    
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch { /* ignore */ }
      this.client = null;
    }
    
    this.currentChannel = null;
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }
  
  async sendMessage(message: string): Promise<boolean> {
    if (!this.client || !this.currentChannel || !this.currentToken) {
      return false;
    }
    
    try {
      await this.client.say(`#${this.currentChannel}`, message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }
  
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }
  
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }
  
  /**
   * Register callback for stream events
   * Supports both IChatProvider StreamEventCallback and IStreamEventProvider DomainStreamEventCallback
   * @param callback - Callback to receive stream events
   * @returns Unsubscribe function
   */
  onStreamEvent(callback: StreamEventCallback | DomainStreamEventCallback): () => void {
    // Add to both callback sets - the emit methods will handle the type differences
    this.chatProviderStreamEventCallbacks.add(callback as StreamEventCallback);
    this.domainStreamEventCallbacks.add(callback as DomainStreamEventCallback);
    return () => {
      this.chatProviderStreamEventCallbacks.delete(callback as StreamEventCallback);
      this.domainStreamEventCallbacks.delete(callback as DomainStreamEventCallback);
    };
  }
  
  /**
   * Remove a stream event callback (IStreamEventProvider interface)
   * @param callback - Callback to remove
   */
  offStreamEvent(callback: DomainStreamEventCallback): void {
    this.chatProviderStreamEventCallbacks.delete(callback as StreamEventCallback);
    this.domainStreamEventCallbacks.delete(callback);
  }
  
  async getChannelInfo(channel?: string): Promise<ChannelInfo | null> {
    const targetChannel = channel || this.currentChannel;
    if (!targetChannel) return null;
    
    try {
      const avatar = await this.fetchAvatar(targetChannel);
      return {
        name: targetChannel,
        avatar: avatar || undefined,
      };
    } catch {
      return { name: targetChannel };
    }
  }
  
  async getViewerCount(channel?: string): Promise<number | null> {
    const targetChannel = channel || this.currentChannel;
    if (!targetChannel) return null;
    
    try {
      const response = await fetch(
        `https://decapi.me/twitch/viewercount/${targetChannel.toLowerCase()}`
      );
      if (!response.ok) return null;
      
      const text = await response.text();
      const trimmed = text.trim();
      
      if (trimmed.toLowerCase().includes('offline') || trimmed.toLowerCase().includes('error')) {
        return null;
      }
      
      const count = parseInt(trimmed, 10);
      return isNaN(count) ? null : count;
    } catch {
      return null;
    }
  }
  
  // Multi-channel support
  async addChannel(channel: string): Promise<boolean> {
    const normalized = channel.toLowerCase().replace('#', '');
    
    if (normalized === this.currentChannel?.toLowerCase()) {
      return false; // Can't add main channel as collaboration
    }
    
    if (this.collaborationClients.has(normalized)) {
      return true; // Already connected
    }
    
    try {
      const collabClient = new tmi.Client({
        channels: [`#${normalized}`],
        connection: { secure: true, reconnect: true },
        options: { skipUpdatingEmotesets: true },
      });
      
      collabClient.on('message', (msgChannel, tags, message, self) => {
        this.emitMessage(tags, message, self, normalized);
      });
      
      await collabClient.connect();
      this.collaborationClients.set(normalized, collabClient);
      return true;
    } catch (error) {
      console.error(`Failed to connect to collaboration channel ${normalized}:`, error);
      return false;
    }
  }
  
  removeChannel(channel: string): void {
    const normalized = channel.toLowerCase().replace('#', '');
    const client = this.collaborationClients.get(normalized);
    
    if (client) {
      try {
        client.disconnect();
      } catch { /* ignore */ }
      this.collaborationClients.delete(normalized);
    }
  }
  
  getConnectedChannels(): string[] {
    const channels: string[] = [];
    if (this.currentChannel) {
      channels.push(this.currentChannel);
    }
    channels.push(...this.collaborationClients.keys());
    return channels;
  }
  
  dispose(): void {
    this.disconnect();
    this.messageCallbacks.clear();
    this.statusCallbacks.clear();
    this.chatProviderStreamEventCallbacks.clear();
    this.domainStreamEventCallbacks.clear();
  }
  
  // Private methods
  
  private setupEventHandlers(): void {
    if (!this.client) return;
    
    this.client.on('message', (channel, tags, message, self) => {
      this.emitMessage(tags, message, self, this.currentChannel || undefined);
    });
    
    this.client.on('connected', () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    });
    
    this.client.on('disconnected', (reason) => {
      if (!this.isManualDisconnect) {
        this.attemptReconnect();
      } else {
        this.setStatus('disconnected');
      }
    });
    
    // Stream events - Subscription
    this.client.on('subscription', (channel, username, method, message, userstate) => {
      const tier = parseTier(method?.plan);
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `sub_${username}_${Date.now()}`,
        type: 'sub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier, message },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `sub_${username}_${Date.now()}`,
        type: 'sub',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        tier,
        message: message || undefined,
      });
    });
    
    // Stream events - Resub
    this.client.on('resub', (channel, username, months, message, userstate, methods) => {
      const tier = parseTier(methods?.plan);
      const cumulativeMonths = parseInt(userstate['msg-param-cumulative-months'] || '0', 10) || months;
      const streakMonths = parseInt(userstate['msg-param-streak-months'] || '0', 10) || undefined;
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `resub_${username}_${Date.now()}`,
        type: 'resub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier, months, cumulativeMonths, streakMonths, message },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `resub_${username}_${Date.now()}`,
        type: 'resub',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        tier,
        months,
        cumulativeMonths,
        streakMonths,
        message: message || undefined,
      });
    });
    
    // Stream events - Gift sub (single gift)
    this.client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
      const tier = parseTier(methods?.plan);
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `gift_${username}_${recipient}_${Date.now()}`,
        type: 'gift',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier, recipient, recipientDisplayName: userstate['msg-param-recipient-display-name'] || recipient },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `subgift_${username}_${recipient}_${Date.now()}`,
        type: 'subgift',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        tier,
        recipientUsername: recipient,
        giftCount: 1,
      });
    });
    
    // Stream events - Mystery gift (mass gift subs)
    this.client.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => {
      const tier = parseTier(methods?.plan);
      const senderCount = parseInt(userstate['msg-param-sender-count'] || '0', 10) || undefined;
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `mysterygift_${username}_${Date.now()}`,
        type: 'gift',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier, giftCount: numbOfSubs, senderCount },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `submysterygift_${username}_${Date.now()}`,
        type: 'submysterygift',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        tier,
        giftCount: numbOfSubs,
      });
    });
    
    // Stream events - Prime paid upgrade
    this.client.on('primepaidupgrade', (channel, username, methods, userstate) => {
      const tier = parseTier(methods?.plan);
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `primepaidupgrade_${username}_${Date.now()}`,
        type: 'sub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier, isPrimeUpgrade: true },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `primepaidupgrade_${username}_${Date.now()}`,
        type: 'primepaidupgrade',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        tier,
      });
    });
    
    // Stream events - Gift paid upgrade
    this.client.on('giftpaidupgrade', (channel, username, sender, userstate) => {
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `giftpaidupgrade_${username}_${Date.now()}`,
        type: 'sub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { isGiftUpgrade: true, gifterUsername: sender },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `giftpaidupgrade_${username}_${Date.now()}`,
        type: 'giftpaidupgrade',
        username,
        displayName: userstate['display-name'] || username,
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
      });
    });
    
    // Stream events - Raid
    this.client.on('raided', (channel, username, viewers) => {
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `raid_${username}_${Date.now()}`,
        type: 'raid',
        username,
        displayName: username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { viewerCount: viewers },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `raid_${username}_${Date.now()}`,
        type: 'raid',
        username,
        displayName: username,
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        viewerCount: viewers,
      });
    });
    
    // Stream events - Hosted (when someone hosts you)
    this.client.on('hosted', (channel, username, viewers, autohost) => {
      // Only emit for manual hosts, not autohosts
      if (!autohost) {
        // Emit IChatProvider StreamEvent
        this.emitStreamEvent({
          id: `hosted_${username}_${Date.now()}`,
          type: 'raid', // Map to raid for IChatProvider
          username,
          displayName: username,
          timestamp: Date.now(),
          channel: channel.replace('#', ''),
          provider: 'twitch',
          data: { viewerCount: viewers, isHost: true },
        });
        
        // Emit domain StreamEvent
        this.emitDomainStreamEvent({
          id: `hosted_${username}_${Date.now()}`,
          type: 'hosted',
          username,
          displayName: username,
          channel: channel.replace('#', ''),
          timestamp: Date.now(),
          viewerCount: viewers,
        });
      }
    });
    
    // Stream events - Cheer/Bits
    this.client.on('cheer', (channel, userstate, message) => {
      const bits = parseInt(userstate.bits || '0', 10);
      
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `bits_${userstate.username}_${Date.now()}`,
        type: 'bits',
        username: userstate.username || 'anonymous',
        displayName: userstate['display-name'] || userstate.username || 'Anonymous',
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { bits, message },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `cheer_${userstate.username}_${Date.now()}`,
        type: 'cheer',
        username: userstate.username || 'anonymous',
        displayName: userstate['display-name'] || userstate.username || 'Anonymous',
        userId: userstate['user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        bits,
        message,
      });
    });
    
    // Stream events - Ban (permanent)
    this.client.on('ban', (channel, username, reason, userstate) => {
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `ban_${username}_${Date.now()}`,
        type: 'ban',
        username,
        displayName: username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { reason },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `ban_${username}_${Date.now()}`,
        type: 'ban',
        username,
        displayName: username,
        userId: userstate?.['target-user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        reason: reason || undefined,
      });
    });
    
    // Stream events - Timeout (temporary ban)
    this.client.on('timeout', (channel, username, reason, duration, userstate) => {
      // Emit IChatProvider StreamEvent
      this.emitStreamEvent({
        id: `timeout_${username}_${Date.now()}`,
        type: 'timeout',
        username,
        displayName: username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { reason, duration },
      });
      
      // Emit domain StreamEvent
      this.emitDomainStreamEvent({
        id: `timeout_${username}_${Date.now()}`,
        type: 'timeout',
        username,
        displayName: username,
        userId: userstate?.['target-user-id'],
        channel: channel.replace('#', ''),
        timestamp: Date.now(),
        duration,
        reason: reason || undefined,
      });
    });
  }
  
  private emitMessage(tags: tmi.ChatUserstate, message: string, self: boolean, sourceChannel?: string): void {
    const chatMessage: ChatMessage = {
      id: tags.id || `${Date.now()}_${Math.random()}`,
      username: tags.username || 'unknown',
      displayName: tags['display-name'] || tags.username || 'Unknown',
      message,
      timestamp: Date.now(),
      userId: tags['user-id'],
      color: tags.color,
      isSubscriber: tags.subscriber === true || tags.subscriber === '1' ||
        (tags.badges && ('subscriber' in tags.badges || 'founder' in tags.badges)),
      isModerator: tags.mod === true || tags.mod === '1',
      isBroadcaster: tags.badges ? 'broadcaster' in tags.badges : false,
      badges: tags.badges as Record<string, string>,
      sourceChannel,
      provider: 'twitch',
    };
    
    this.messageCallbacks.forEach(cb => cb(chatMessage));
  }
  
  private emitStreamEvent(event: StreamEvent): void {
    this.chatProviderStreamEventCallbacks.forEach(cb => cb(event));
  }
  
  private emitDomainStreamEvent(event: DomainStreamEvent): void {
    this.domainStreamEventCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Error in domain stream event callback:', e);
      }
    });
  }
  
  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status, error));
  }
  
  private handleConnectionError(error: unknown): void {
    let errorMsg = 'No se pudo conectar al chat.';
    let shouldReconnect = true;
    
    if (typeof error === 'string') {
      if (error.includes('Login authentication failed')) {
        errorMsg = 'Token OAuth inválido o expirado.';
        shouldReconnect = false;
      } else if (error.includes('No response from Twitch')) {
        errorMsg = 'Sin respuesta de Twitch (Problema de red).';
      }
    }
    
    if (shouldReconnect && !this.isManualDisconnect) {
      this.attemptReconnect();
    } else {
      this.setStatus('error', errorMsg);
    }
  }
  
  private attemptReconnect(): void {
    if (this.isManualDisconnect || !this.currentChannel) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.setStatus('error', `Reconexión fallida después de ${this.config.maxReconnectAttempts} intentos.`);
      return;
    }
    
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectMaxDelay
    );
    
    this.setStatus('connecting');
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.currentChannel && !this.isManualDisconnect) {
        this.connect({
          channel: this.currentChannel,
          token: this.currentToken || undefined,
        });
      }
    }, delay);
  }
  
  private async fetchAvatar(channel: string): Promise<string | null> {
    try {
      const response = await fetch(`https://decapi.me/twitch/avatar/${channel}`);
      const url = await response.text();
      if (url && !url.includes('not found')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }
  
  // ============================================
  // OAuth Methods
  // ============================================
  
  /**
   * Get the OAuth scopes required for full functionality
   */
  static getRequiredScopes(): string[] {
    return [
      'chat:read',
      'chat:edit',
      'channel:read:subscriptions',
      'moderator:read:chatters',
      'moderator:read:followers',
      'channel:read:vips',
      'moderation:read',
      'bits:read',
      // Moderation action scopes
      'moderator:manage:banned_users',
      'moderator:manage:chat_messages',
      'moderator:manage:chat_settings',
      'moderator:manage:announcements',
      'channel:manage:vips',
    ];
  }
  
  /**
   * Build the Twitch OAuth authorization URL
   * @param state - CSRF protection state string
   * @param redirectUri - OAuth redirect URI (must match Twitch Dev Console)
   * @returns Authorization URL
   */
  static buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: TwitchAdapter.getRequiredScopes().join(' '),
      state: state,
      force_verify: 'false',
    });
    
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }
  
  /**
   * Generate a random state string for CSRF protection
   */
  static generateOAuthState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Validate an OAuth token and get user info
   * @param accessToken - OAuth access token to validate
   * @returns Token info including username, userId, and expiration
   */
  async validateToken(accessToken: string): Promise<{
    valid: boolean;
    expiresIn: number;
    login?: string;
    userId?: string;
    scopes?: string[];
  } | null> {
    try {
      let cleanToken = accessToken.trim();
      if (cleanToken.toLowerCase().startsWith('oauth:')) {
        cleanToken = cleanToken.substring(6);
      }
      
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${cleanToken}`,
        },
      });
      
      if (!response.ok) {
        return { valid: false, expiresIn: 0 };
      }
      
      const data = await response.json();
      return {
        valid: true,
        expiresIn: data.expires_in || 0,
        login: data.login,
        userId: data.user_id,
        scopes: data.scopes || [],
      };
    } catch (err) {
      console.error('Error validating token:', err);
      return null;
    }
  }
  
  /**
   * Revoke an OAuth token
   * @param accessToken - Token to revoke
   * @returns True if revocation was successful
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          token: accessToken,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if a token is about to expire
   * @param expiresIn - Seconds until token expires
   * @param warningThreshold - Threshold in seconds to trigger warning (default: 1 hour)
   * @returns True if token is about to expire
   */
  static isTokenExpiringSoon(expiresIn: number, warningThreshold: number = 3600): boolean {
    return expiresIn > 0 && expiresIn <= warningThreshold;
  }
  
  /**
   * Get the current token (if connected with authentication)
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }
  
  /**
   * Calculate exponential backoff delay for reconnection
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attempt: number): number {
    const delay = this.config.reconnectBaseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.reconnectMaxDelay);
  }
  
  /**
   * Get the current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
  
  /**
   * Update adapter configuration
   * @param config - Partial configuration to merge
   */
  setConfig(config: Partial<TwitchAdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get the current adapter configuration
   */
  getConfig(): Required<TwitchAdapterConfig> {
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
    const targetChannel = channel || this.currentChannel;
    if (!targetChannel) return null;
    
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/users?login=${targetChannel.toLowerCase()}`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.[0]?.id || null;
    } catch {
      return null;
    }
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
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&first=1000`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((chatter: { user_login: string }) => chatter.user_login) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get subscribers for a channel
   * Requires OAuth token with channel:read:subscriptions scope
   * @param token - OAuth token with required scope
   * @param broadcasterId - Broadcaster user ID
   * @returns Array of subscriber usernames or null if failed
   */
  async getSubscribers(token: string, broadcasterId: string): Promise<string[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const allSubs: string[] = [];
      let cursor: string | undefined;
      
      do {
        const url = new URL('https://api.twitch.tv/helix/subscriptions');
        url.searchParams.set('broadcaster_id', broadcasterId);
        url.searchParams.set('first', '100');
        if (cursor) {
          url.searchParams.set('after', cursor);
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const subs = data.data?.map((sub: { user_login: string }) => sub.user_login) || [];
        allSubs.push(...subs);
        
        cursor = data.pagination?.cursor;
      } while (cursor);
      
      return allSubs;
    } catch {
      return null;
    }
  }
  
  // ============================================
  // Twitch API Methods - Extended
  // ============================================
  
  /**
   * Get bits leaderboard for a channel
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param period - Time period for leaderboard
   * @returns Leaderboard data or null if failed
   */
  async getBitsLeaderboard(
    token: string, 
    broadcasterId: string, 
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
  ): Promise<{ rank: number; username: string; bits: number }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const url = new URL('https://api.twitch.tv/helix/bits/leaderboard');
      url.searchParams.set('count', '100');
      url.searchParams.set('period', period);
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((entry: any) => ({
        rank: entry.rank,
        username: entry.user_name || entry.user_login,
        bits: entry.score,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get channel emotes for a broadcaster
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @returns Array of emotes or null if failed
   */
  async getChannelEmotes(token: string, broadcasterId: string): Promise<{ code: string; url: string; id: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((emote: any) => ({
        id: emote.id,
        code: emote.name,
        url: emote.images?.url_1x || emote.images?.url_2x || `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get clips for a channel
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param first - Number of clips to fetch (max 100)
   * @param startedAt - Optional start date (ISO 8601 format)
   * @param endedAt - Optional end date (ISO 8601 format)
   * @returns Clips data or null if failed
   */
  async getClips(
    token: string, 
    broadcasterId: string, 
    first: number = 20,
    startedAt?: string,
    endedAt?: string
  ): Promise<{ id: string; title: string; url: string; viewCount: number; createdAt: string; creatorName: string; thumbnailUrl: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const url = new URL('https://api.twitch.tv/helix/clips');
      url.searchParams.set('broadcaster_id', broadcasterId);
      url.searchParams.set('first', first.toString());
      
      if (startedAt) url.searchParams.set('started_at', startedAt);
      if (endedAt) url.searchParams.set('ended_at', endedAt);
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((clip: any) => ({
        id: clip.id,
        title: clip.title,
        url: clip.url,
        viewCount: clip.view_count,
        createdAt: clip.created_at,
        creatorName: clip.creator_name,
        thumbnailUrl: clip.thumbnail_url,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get VODs/videos for a channel
   * @param token - OAuth token
   * @param userId - User ID
   * @param type - Video type filter
   * @param first - Number of videos to fetch (max 100)
   * @returns Videos data or null if failed
   */
  async getVideos(
    token: string, 
    userId: string, 
    type: 'all' | 'upload' | 'archive' | 'highlight' = 'all',
    first: number = 20
  ): Promise<{ id: string; title: string; url: string; viewCount: number; createdAt: string; duration: string; thumbnailUrl: string; type: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const url = new URL('https://api.twitch.tv/helix/videos');
      url.searchParams.set('user_id', userId);
      url.searchParams.set('first', first.toString());
      if (type !== 'all') url.searchParams.set('type', type);
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((video: any) => ({
        id: video.id,
        title: video.title,
        url: video.url,
        viewCount: video.view_count,
        createdAt: video.created_at,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180'),
        type: video.type,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get moderators for a channel
   * Requires OAuth token with moderation:read scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @returns Moderators list or null if failed
   */
  async getModerators(token: string, broadcasterId: string): Promise<{ id: string; username: string; displayName: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((mod: any) => ({
        id: mod.user_id,
        username: mod.user_login,
        displayName: mod.user_name,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Get VIPs for a channel
   * Requires OAuth token with channel:read:vips scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @returns VIPs list or null if failed
   */
  async getVIPs(token: string, broadcasterId: string): Promise<{ id: string; username: string; displayName: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((vip: any) => ({
        id: vip.user_id,
        username: vip.user_login,
        displayName: vip.user_name,
      })) || [];
    } catch {
      return null;
    }
  }
  
  /**
   * Ban a user from the channel
   * Requires OAuth token with moderator:manage:banned_users scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param userId - User ID to ban
   * @param reason - Optional reason for the ban
   * @returns True if successful
   */
  async banUser(token: string, broadcasterId: string, userId: string, reason?: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              user_id: userId,
              reason: reason || undefined,
            }
          })
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Timeout a user in the channel
   * Requires OAuth token with moderator:manage:banned_users scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param userId - User ID to timeout
   * @param duration - Duration in seconds (1-1209600, max 2 weeks)
   * @param reason - Optional reason for the timeout
   * @returns True if successful
   */
  async timeoutUser(token: string, broadcasterId: string, userId: string, duration: number, reason?: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const clampedDuration = Math.max(1, Math.min(duration, 1209600));
      
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              user_id: userId,
              duration: clampedDuration,
              reason: reason || undefined,
            }
          })
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Unban a user from the channel
   * Requires OAuth token with moderator:manage:banned_users scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param userId - User ID to unban
   * @returns True if successful
   */
  async unbanUser(token: string, broadcasterId: string, userId: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Get detailed chatters list with user info
   * Requires OAuth token with moderator:read:chatters scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @returns Detailed chatters list or null if failed
   */
  async getChattersDetailed(token: string, broadcasterId: string, moderatorId: string): Promise<{ userId: string; userLogin: string; userName: string }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&first=1000`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((chatter: any) => ({
        userId: chatter.user_id,
        userLogin: chatter.user_login,
        userName: chatter.user_name,
      })) || [];
    } catch {
      return null;
    }
  }

  /**
   * Delete a specific chat message
   * Requires OAuth token with moderator:manage:chat_messages scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param messageId - ID of the message to delete
   * @returns True if successful
   */
  async deleteMessage(token: string, broadcasterId: string, moderatorId: string, messageId: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear all chat messages in the channel
   * Requires OAuth token with moderator:manage:chat_messages scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @returns True if successful
   */
  async clearChat(token: string, broadcasterId: string, moderatorId: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get banned users in the channel
   * Requires OAuth token with moderation:read scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @returns List of banned users or null if failed
   */
  async getBannedUsers(token: string, broadcasterId: string): Promise<{ 
    id: string; 
    username: string; 
    displayName: string; 
    reason: string;
    moderatorName: string;
    bannedAt: string;
    expiresAt: string | null;
  }[] | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data?.map((ban: any) => ({
        id: ban.user_id,
        username: ban.user_login,
        displayName: ban.user_name,
        reason: ban.reason || '',
        moderatorName: ban.moderator_name || '',
        bannedAt: ban.created_at,
        expiresAt: ban.expires_at || null,
      })) || [];
    } catch {
      return null;
    }
  }

  /**
   * Update chat settings (slow mode, follower-only, etc.)
   * Requires OAuth token with moderator:manage:chat_settings scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param settings - Chat settings to update
   * @returns True if successful
   */
  async updateChatSettings(
    token: string, 
    broadcasterId: string, 
    moderatorId: string,
    settings: {
      slowMode?: boolean;
      slowModeWaitTime?: number;
      followerMode?: boolean;
      followerModeDuration?: number;
      subscriberMode?: boolean;
      emoteMode?: boolean;
      uniqueChatMode?: boolean;
    }
  ): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      
      const body: Record<string, any> = {};
      if (settings.slowMode !== undefined) body.slow_mode = settings.slowMode;
      if (settings.slowModeWaitTime !== undefined) body.slow_mode_wait_time = settings.slowModeWaitTime;
      if (settings.followerMode !== undefined) body.follower_mode = settings.followerMode;
      if (settings.followerModeDuration !== undefined) body.follower_mode_duration = settings.followerModeDuration;
      if (settings.subscriberMode !== undefined) body.subscriber_mode = settings.subscriberMode;
      if (settings.emoteMode !== undefined) body.emote_mode = settings.emoteMode;
      if (settings.uniqueChatMode !== undefined) body.unique_chat_mode = settings.uniqueChatMode;
      
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current chat settings
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @returns Chat settings or null if failed
   */
  async getChatSettings(token: string, broadcasterId: string): Promise<{
    slowMode: boolean;
    slowModeWaitTime: number;
    followerMode: boolean;
    followerModeDuration: number;
    subscriberMode: boolean;
    emoteMode: boolean;
    uniqueChatMode: boolean;
  } | null> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const settings = data.data?.[0];
      if (!settings) return null;
      
      return {
        slowMode: settings.slow_mode || false,
        slowModeWaitTime: settings.slow_mode_wait_time || 0,
        followerMode: settings.follower_mode || false,
        followerModeDuration: settings.follower_mode_duration || 0,
        subscriberMode: settings.subscriber_mode || false,
        emoteMode: settings.emote_mode || false,
        uniqueChatMode: settings.unique_chat_mode || false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Send an announcement to chat
   * Requires OAuth token with moderator:manage:announcements scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param moderatorId - Moderator user ID
   * @param message - Announcement message
   * @param color - Announcement color (blue, green, orange, purple, primary)
   * @returns True if successful
   */
  async sendAnnouncement(
    token: string, 
    broadcasterId: string, 
    moderatorId: string,
    message: string,
    color: 'blue' | 'green' | 'orange' | 'purple' | 'primary' = 'primary'
  ): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message, color })
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Add a VIP to the channel
   * Requires OAuth token with channel:manage:vips scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param userId - User ID to add as VIP
   * @returns True if successful
   */
  async addVIP(token: string, broadcasterId: string, userId: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Remove a VIP from the channel
   * Requires OAuth token with channel:manage:vips scope
   * @param token - OAuth token
   * @param broadcasterId - Broadcaster user ID
   * @param userId - User ID to remove as VIP
   * @returns True if successful
   */
  async removeVIP(token: string, broadcasterId: string, userId: string): Promise<boolean> {
    try {
      const cleanToken = token.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance for backward compatibility
let defaultInstance: TwitchAdapter | null = null;

export function getTwitchAdapter(): TwitchAdapter {
  if (!defaultInstance) {
    defaultInstance = new TwitchAdapter();
  }
  return defaultInstance;
}
