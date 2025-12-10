
import tmi from 'tmi.js';
import { ConnectionStatus } from '../types';

// Define a callback type for messages
type MessageCallback = (tags: tmi.ChatUserstate, message: string, self: boolean) => void;

class TwitchService {
  private client: tmi.Client | null = null;
  private messageCallback: MessageCallback | null = null;
  private statusChangeCallback: ((status: ConnectionStatus, error?: string) => void) | null = null;
  private currentChannel: string = '';
  private isAnonymous: boolean = false;

  constructor() {}

  public connect(channel: string, token?: string) {
    if (this.client) {
      this.disconnect();
    }

    // Ensure channel has # prefix for IRC
    const safeChannel = channel.startsWith('#') ? channel : `#${channel}`;
    this.currentChannel = safeChannel;
    // Determine if anonymous based on presence of token
    this.isAnonymous = !token;
    
    if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.CONNECTING);

    const options: tmi.Options = {
      channels: [safeChannel],
      connection: {
        secure: true,
        reconnect: true,
      },
    };

    // If token is provided, add identity to enable sending messages
    if (token) {
      options.identity = {
        username: channel, // Using channel name as username often works, but token is key
        password: token.startsWith('oauth:') ? token : `oauth:${token}`
      };
    }

    try {
        this.client = new tmi.Client(options);

        this.client.on('message', (channel, tags, message, self) => {
          if (this.messageCallback) {
            this.messageCallback(tags, message, self);
          }
        });

        this.client.on('connected', (addr, port) => {
          console.log(`Connected to ${addr}:${port}`);
          if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.CONNECTED);
        });

        this.client.on('disconnected', (reason) => {
          console.log(`Disconnected: ${reason}`);
          if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
        });

        this.client.connect().catch((err) => {
          console.error("Twitch Connection Error:", err);
          let errorMsg = "No se pudo conectar al chat.";
          
          // Basic error parsing
          if (typeof err === 'string') {
              if (err.includes('Login authentication failed')) {
                  errorMsg = "Token OAuth inválido o expirado.";
              } else if (err.includes('No response from Twitch')) {
                  errorMsg = "Sin respuesta de Twitch (Problema de red).";
              }
          }
          
          if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.ERROR, errorMsg);
        });
    } catch (error) {
        console.error("Failed to initialize Twitch Client:", error);
        if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.ERROR, "Error interno al inicializar cliente.");
    }
  }

  public disconnect() {
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
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
    }
  }

  public sendMessage(message: string) {
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

  public onMessage(callback: MessageCallback) {
    this.messageCallback = callback;
  }

  public onStatusChange(callback: (status: ConnectionStatus, error?: string) => void) {
    this.statusChangeCallback = callback;
  }
}

export const twitchService = new TwitchService();
