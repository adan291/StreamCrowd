
import tmi from 'tmi.js';
import { ConnectionStatus } from '../types';

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

/**
 * Callback type for handling incoming chat messages
 */
export type MessageCallback = (tags: tmi.ChatUserstate, message: string, self: boolean) => void;

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

  constructor(config: Partial<TwitchServiceConfig> = {}) {
    this.config = { ...DEFAULT_TWITCH_SERVICE_CONFIG, ...config };
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
            this.messageCallback(tags, message, self);
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
}

export const twitchService = new TwitchService();
