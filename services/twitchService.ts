
import tmi from 'tmi.js';
import { ConnectionStatus, CollaborationChannel } from '../types';

/**
 * Configuration for TwitchService reconnection behavior
 */
export interface TwitchServiceConfig {
  /** Maximum number of reconnection attempts before giving up */
  maxReconnectAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  reconnectBaseDelay: number;
  /** Maximum delay in milliseconds for exponential backoff */
  reconnectMaxDelay: number;
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
 * Callback type for handling incoming chat messages
 * @param tags - TMI chat userstate tags
 * @param message - The message content
 * @param self - Whether the message was sent by the bot
 * @param channel - The channel the message came from (for collaborations)
 */
export type MessageCallback = (tags: tmi.ChatUserstate, message: string, self: boolean, channel?: string) => void;

/**
 * Callback type for handling connection status changes
 */
export type StatusCallback = (status: ConnectionStatus, error?: string) => void;

/**
 * Callback type for handling reconnection attempts
 */
export type ReconnectAttemptCallback = (attempt: number, maxAttempts: number) => void;

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
  onReconnectAttempt?: ReconnectAttemptCallback;
}

/** Default configuration for TwitchService */
export const DEFAULT_TWITCH_SERVICE_CONFIG: TwitchServiceConfig = {
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
};

class TwitchService {
  private client: tmi.Client | null = null;
  private messageCallback: MessageCallback | null = null;
  private statusChangeCallback: StatusCallback | null = null;
  private reconnectAttemptCallback: ReconnectAttemptCallback | null = null;
  private currentChannel: string = '';
  private isAnonymous: boolean = false;
  private config: TwitchServiceConfig;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentOptions: TwitchConnectionOptions | null = null;
  private isManualDisconnect: boolean = false;
  
  // Collaboration support
  private collaborationChannels: Map<string, CollaborationChannel> = new Map();
  private collaborationClients: Map<string, tmi.Client> = new Map();
  private collaborationCallbacks: Map<string, ((channel: string, status: 'connected' | 'disconnected' | 'error', error?: string) => void)> = new Map();

  constructor(config: Partial<TwitchServiceConfig> = {}) {
    this.config = { ...DEFAULT_TWITCH_SERVICE_CONFIG, ...config };
  }

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
   * @param channel Channel name to add as collaborator
   * @param onStatusChange Optional callback for this channel's connection status
   * @returns Promise that resolves when connected
   */
  public async addCollaborationChannel(
    channel: string,
    onStatusChange?: (channel: string, status: 'connected' | 'disconnected' | 'error', error?: string) => void
  ): Promise<CollaborationChannel | null> {
    const normalizedChannel = channel.toLowerCase().replace('#', '');
    
    // Don't add if it's the main channel or already added
    if (normalizedChannel === this.currentChannel.replace('#', '').toLowerCase()) {
      return null;
    }
    if (this.collaborationChannels.has(normalizedChannel)) {
      return this.collaborationChannels.get(normalizedChannel) || null;
    }

    const safeChannel = `#${normalizedChannel}`;
    
    // Store callback if provided
    if (onStatusChange) {
      this.collaborationCallbacks.set(normalizedChannel, onStatusChange);
    }

    try {
      const collabClient = new tmi.Client({
        channels: [safeChannel],
        connection: {
          secure: true,
          reconnect: true,
        },
      });

      // Set up message handler for this collaboration channel
      collabClient.on('message', (msgChannel, tags, message, self) => {
        if (this.messageCallback) {
          this.messageCallback(tags, message, self, normalizedChannel);
        }
      });

      collabClient.on('connected', () => {
        const callback = this.collaborationCallbacks.get(normalizedChannel);
        if (callback) callback(normalizedChannel, 'connected');
      });

      collabClient.on('disconnected', () => {
        const callback = this.collaborationCallbacks.get(normalizedChannel);
        if (callback) callback(normalizedChannel, 'disconnected');
      });

      await collabClient.connect();

      const collabChannel: CollaborationChannel = {
        name: normalizedChannel,
        color: this.getNextCollaborationColor(),
        isMain: false,
        connectedAt: Date.now(),
      };

      this.collaborationChannels.set(normalizedChannel, collabChannel);
      this.collaborationClients.set(normalizedChannel, collabClient);

      return collabChannel;
    } catch (err) {
      const callback = this.collaborationCallbacks.get(normalizedChannel);
      if (callback) callback(normalizedChannel, 'error', String(err));
      return null;
    }
  }

  /**
   * Remove a collaboration channel
   * @param channel Channel name to remove
   */
  public removeCollaborationChannel(channel: string): void {
    const normalizedChannel = channel.toLowerCase().replace('#', '');
    
    const client = this.collaborationClients.get(normalizedChannel);
    if (client) {
      try {
        client.disconnect();
      } catch (e) {
        console.warn('Error disconnecting collaboration channel', e);
      }
    }

    this.collaborationChannels.delete(normalizedChannel);
    this.collaborationClients.delete(normalizedChannel);
    this.collaborationCallbacks.delete(normalizedChannel);
  }

  /**
   * Get all collaboration channels
   * @returns Array of collaboration channels
   */
  public getCollaborationChannels(): CollaborationChannel[] {
    return Array.from(this.collaborationChannels.values());
  }

  /**
   * Check if a channel is connected as collaborator
   * @param channel Channel name to check
   */
  public isCollaborationChannel(channel: string): boolean {
    return this.collaborationChannels.has(channel.toLowerCase().replace('#', ''));
  }

  /**
   * Get the main channel info as CollaborationChannel
   */
  public getMainChannelInfo(): CollaborationChannel | null {
    if (!this.currentChannel) return null;
    return {
      name: this.currentChannel.replace('#', ''),
      color: COLLABORATION_COLORS[0],
      isMain: true,
      connectedAt: Date.now(),
    };
  }

  /**
   * Disconnect all collaboration channels
   */
  public disconnectAllCollaborations(): void {
    for (const [channel] of this.collaborationClients) {
      this.removeCollaborationChannel(channel);
    }
  }

  /**
   * Connect to a Twitch channel
   * @param options Connection options including channel, token, and callbacks
   */
  public connect(options: TwitchConnectionOptions): void;
  /**
   * Connect to a Twitch channel (legacy signature)
   * @param channel Channel name to connect to
   * @param token Optional OAuth token
   */
  public connect(channel: string, token?: string): void;
  public connect(channelOrOptions: string | TwitchConnectionOptions, token?: string): void {
    // Handle both signatures
    const options: TwitchConnectionOptions = typeof channelOrOptions === 'string'
      ? { channel: channelOrOptions, token }
      : channelOrOptions;

    if (this.client) {
      this.disconnect();
    }

    // Store options for reconnection
    this.currentOptions = options;
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;

    // Set callbacks if provided in options
    if (options.onMessage) {
      this.messageCallback = options.onMessage;
    }
    if (options.onStatusChange) {
      this.statusChangeCallback = options.onStatusChange;
    }
    if (options.onReconnectAttempt) {
      this.reconnectAttemptCallback = options.onReconnectAttempt;
    }

    // Ensure channel has # prefix for IRC
    const safeChannel = options.channel.startsWith('#') ? options.channel : `#${options.channel}`;
    this.currentChannel = safeChannel;
    // Determine if anonymous based on presence of token
    this.isAnonymous = !options.token;
    
    if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.CONNECTING);

    const tmiOptions: tmi.Options = {
      channels: [safeChannel],
      connection: {
        secure: true,
        reconnect: false, // We handle reconnection ourselves
      },
    };

    // If token is provided, add identity to enable sending messages
    if (options.token) {
      tmiOptions.identity = {
        username: options.channel, // Using channel name as username often works, but token is key
        password: options.token.startsWith('oauth:') ? options.token : `oauth:${options.token}`
      };
    }

    this.initializeClient(tmiOptions);
  }

  /**
   * Initialize the TMI client with the given options
   */
  private initializeClient(tmiOptions: tmi.Options): void {
    try {
        this.client = new tmi.Client(tmiOptions);

        this.client.on('message', (_channel, tags, message, self) => {
          if (this.messageCallback) {
            // Pass the main channel name for consistency with collaboration channels
            const mainChannel = this.currentChannel.replace('#', '');
            this.messageCallback(tags, message, self, mainChannel);
          }
        });

        this.client.on('connected', () => {
          this.reconnectAttempts = 0;
          if (this.statusChangeCallback) {
            this.statusChangeCallback(ConnectionStatus.CONNECTED);
          }
        });

        this.client.on('disconnected', (reason) => {
          // Debug: console.log(`Disconnected: ${reason}`);
          if (!this.isManualDisconnect) {
            this.attemptReconnect();
          } else {
            if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
          }
        });

        this.client.connect().catch((err) => {
          this.handleConnectionError(err);
        });
    } catch (error) {
        console.error("Failed to initialize Twitch Client:", error);
        if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.ERROR, "Error interno al inicializar cliente.");
    }
  }

  /**
   * Handle connection errors and attempt reconnection if appropriate
   */
  private handleConnectionError(err: unknown): void {
    let errorMsg = "No se pudo conectar al chat.";
    let shouldReconnect = true;
    
    // Basic error parsing
    if (typeof err === 'string') {
        if (err.includes('Login authentication failed')) {
            errorMsg = "Token OAuth inválido o expirado.";
            shouldReconnect = false; // Don't retry auth failures
        } else if (err.includes('No response from Twitch')) {
            errorMsg = "Sin respuesta de Twitch (Problema de red).";
        }
    }
    
    if (shouldReconnect && !this.isManualDisconnect) {
      this.attemptReconnect();
    } else {
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.ERROR, errorMsg);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.isManualDisconnect || !this.currentOptions) {
      return;
    }

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      const errorMsg = `Reconexión fallida después de ${this.config.maxReconnectAttempts} intentos.`;
      if (this.statusChangeCallback) {
        this.statusChangeCallback(ConnectionStatus.ERROR, errorMsg);
      }
      return;
    }

    // Notify about reconnection attempt
    if (this.reconnectAttemptCallback) {
      this.reconnectAttemptCallback(this.reconnectAttempts, this.config.maxReconnectAttempts);
    }

    // Calculate delay with exponential backoff
    const delay = this.calculateBackoffDelay(this.reconnectAttempts);
    // Debug: console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    if (this.statusChangeCallback) {
      this.statusChangeCallback(ConnectionStatus.CONNECTING);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentOptions && !this.isManualDisconnect) {
        // Clean up old client
        if (this.client) {
          try {
            this.client.disconnect();
          } catch {
            // Ignore disconnect errors during reconnection
          }
          this.client = null;
        }

        // Rebuild TMI options
        const safeChannel = this.currentOptions.channel.startsWith('#') 
          ? this.currentOptions.channel 
          : `#${this.currentOptions.channel}`;
        
        const tmiOptions: tmi.Options = {
          channels: [safeChannel],
          connection: {
            secure: true,
            reconnect: false,
          },
        };

        if (this.currentOptions.token) {
          tmiOptions.identity = {
            username: this.currentOptions.channel,
            password: this.currentOptions.token.startsWith('oauth:') 
              ? this.currentOptions.token 
              : `oauth:${this.currentOptions.token}`
          };
        }

        this.initializeClient(tmiOptions);
      }
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   * @param attempt Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  public calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
    const delay = this.config.reconnectBaseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.reconnectMaxDelay);
  }

  /**
   * Disconnect from the current channel
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Disconnect all collaboration channels first
    this.disconnectAllCollaborations();
    
    if (this.client) {
      try {
        // Only disconnect if connected or connecting
        if (this.client.readyState() === 'OPEN' || this.client.readyState() === 'CONNECTING') {
            this.client.disconnect();
        }
      } catch (e) {
          console.warn("Error disconnecting", e);
      }
      this.client = null;
    }
    
    this.reconnectAttempts = 0;
    this.currentOptions = null;
    
    if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
  }

  /**
   * Send a message to the current channel
   * @param message Message to send
   */
  public sendMessage(message: string): void {
    // Prevent sending if anonymous (no token provided)
    if (this.isAnonymous) {
      return;
    }

    if (this.client && this.client.readyState() === 'OPEN') {
      this.client.say(this.currentChannel, message).catch(err => {
        console.error("Failed to send message:", err);
      });
    }
  }

  /**
   * Set the message callback
   * @param callback Function to call when a message is received
   */
  public onMessage(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  /**
   * Set the status change callback
   * @param callback Function to call when connection status changes
   */
  public onStatusChange(callback: StatusCallback): void {
    this.statusChangeCallback = callback;
  }

  /**
   * Set the reconnect attempt callback
   * @param callback Function to call when a reconnection is attempted
   */
  public onReconnectAttempt(callback: ReconnectAttemptCallback): void {
    this.reconnectAttemptCallback = callback;
  }

  /**
   * Get the current connection state
   * @returns Current connection status
   */
  public getConnectionState(): ConnectionStatus {
    if (!this.client) {
      return ConnectionStatus.DISCONNECTED;
    }
    
    const readyState = this.client.readyState();
    switch (readyState) {
      case 'OPEN':
        return ConnectionStatus.CONNECTED;
      case 'CONNECTING':
        return ConnectionStatus.CONNECTING;
      default:
        return ConnectionStatus.DISCONNECTED;
    }
  }

  /**
   * Get the current reconnection attempt count
   * @returns Number of reconnection attempts made
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Update the service configuration
   * @param config Partial configuration to merge
   */
  public setConfig(config: Partial<TwitchServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current service configuration
   * @returns Current configuration
   */
  public getConfig(): TwitchServiceConfig {
    return { ...this.config };
  }

  /**
   * Get the current channel name (without # prefix)
   * @returns Channel name or empty string if not connected
   */
  public getCurrentChannel(): string {
    return this.currentChannel.replace('#', '');
  }

  /**
   * Get viewer count for a channel
   * Uses DecAPI to get viewer count. Returns null if channel is offline.
   * @param channel Channel name (optional, uses current channel if not provided)
   * @returns Promise with viewer count or null if offline/unavailable
   */
  public async getViewerCount(channel?: string): Promise<number | null> {
    const targetChannel = channel || this.getCurrentChannel();
    if (!targetChannel) return null;

    try {
      // Use DecAPI - returns number if online, text message if offline
      const response = await fetch(
        `https://decapi.me/twitch/viewercount/${targetChannel.toLowerCase()}`
      );
      if (!response.ok) return null;
      
      const text = await response.text().catch(() => '');
      const trimmed = text.trim();
      
      // DecAPI returns a message like "channel is offline" when not streaming
      if (trimmed.toLowerCase().includes('offline') || trimmed.toLowerCase().includes('error')) {
        return null;
      }
      
      const count = parseInt(trimmed, 10);
      return isNaN(count) ? null : count;
    } catch {
      // Silently fail - viewer count is not critical
      return null;
    }
  }
}

export const twitchService = new TwitchService();
