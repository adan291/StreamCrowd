import tmi from 'tmi.js';
import { ConnectionStatus } from '../types';

// Define a callback type for messages
type MessageCallback = (tags: tmi.ChatUserstate, message: string, self: boolean) => void;

class TwitchService {
  private client: tmi.Client | null = null;
  private messageCallback: MessageCallback | null = null;
  private statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;
  private currentChannel: string = '';

  constructor() {}

  public connect(channel: string, token?: string) {
    if (this.client) {
      this.disconnect();
    }

    this.currentChannel = channel;
    if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.CONNECTING);

    const options: tmi.Options = {
      channels: [channel],
      connection: {
        secure: true,
        reconnect: true,
      },
    };

    // If token is provided, add identity to enable sending messages
    if (token) {
      options.identity = {
        username: channel, // Assuming the streamer is connecting as themselves
        password: token.startsWith('oauth:') ? token : `oauth:${token}`
      };
    }

    this.client = new tmi.Client(options);

    this.client.on('message', (channel, tags, message, self) => {
      if (this.messageCallback) {
        this.messageCallback(tags, message, self);
      }
    });

    this.client.on('connected', () => {
      console.log(`Connected to ${channel}`);
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.CONNECTED);
    });

    this.client.on('disconnected', () => {
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
    });

    this.client.connect().catch((err) => {
      console.error(err);
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.ERROR);
    });
  }

  public disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      if (this.statusChangeCallback) this.statusChangeCallback(ConnectionStatus.DISCONNECTED);
    }
  }

  public sendMessage(message: string) {
    if (this.client && this.client.readyState() === 'OPEN') {
      this.client.say(this.currentChannel, message).catch(err => {
        console.error("Failed to send message:", err);
      });
    }
  }

  public onMessage(callback: MessageCallback) {
    this.messageCallback = callback;
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusChangeCallback = callback;
  }
}

export const twitchService = new TwitchService();