/**
 * TwitchAdapter - Implementación de IChatProvider para Twitch
 * 
 * Este adapter envuelve la funcionalidad de tmi.js y expone
 * una interfaz limpia que puede ser intercambiada por otros proveedores.
 * 
 * Arquitectura Hexagonal: Este es un "adapter" de infraestructura.
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

export class TwitchAdapter implements IMultiChannelProvider {
  readonly providerId = 'twitch';
  readonly providerName = 'Twitch';
  
  private client: tmi.Client | null = null;
  private config: Required<TwitchAdapterConfig>;
  private currentChannel: string | null = null;
  private currentToken: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  
  private messageCallbacks = new Set<MessageCallback>();
  private statusCallbacks = new Set<StatusCallback>();
  private streamEventCallbacks = new Set<StreamEventCallback>();
  
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
  
  onStreamEvent(callback: StreamEventCallback): () => void {
    this.streamEventCallbacks.add(callback);
    return () => this.streamEventCallbacks.delete(callback);
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
    this.streamEventCallbacks.clear();
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
    
    // Stream events
    this.client.on('subscription', (channel, username, method, message, userstate) => {
      this.emitStreamEvent({
        id: `sub_${username}_${Date.now()}`,
        type: 'sub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier: method?.plan, message },
      });
    });
    
    this.client.on('resub', (channel, username, months, message, userstate, methods) => {
      this.emitStreamEvent({
        id: `resub_${username}_${Date.now()}`,
        type: 'resub',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier: methods?.plan, months, message },
      });
    });
    
    this.client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
      this.emitStreamEvent({
        id: `gift_${username}_${recipient}_${Date.now()}`,
        type: 'gift',
        username,
        displayName: userstate['display-name'] || username,
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { tier: methods?.plan, recipient },
      });
    });
    
    this.client.on('raided', (channel, username, viewers) => {
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
    });
    
    this.client.on('cheer', (channel, userstate, message) => {
      this.emitStreamEvent({
        id: `bits_${userstate.username}_${Date.now()}`,
        type: 'bits',
        username: userstate.username || 'anonymous',
        displayName: userstate['display-name'] || userstate.username || 'Anonymous',
        timestamp: Date.now(),
        channel: channel.replace('#', ''),
        provider: 'twitch',
        data: { bits: parseInt(userstate.bits || '0', 10), message },
      });
    });
    
    this.client.on('ban', (channel, username, reason, userstate) => {
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
    });
    
    this.client.on('timeout', (channel, username, reason, duration, userstate) => {
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
    this.streamEventCallbacks.forEach(cb => cb(event));
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
}

// Singleton instance for backward compatibility
let defaultInstance: TwitchAdapter | null = null;

export function getTwitchAdapter(): TwitchAdapter {
  if (!defaultInstance) {
    defaultInstance = new TwitchAdapter();
  }
  return defaultInstance;
}
