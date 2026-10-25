import type {
  StreamElementsConfig,
  SEtip,
  SEFollow,
  SESub,
  SERaid,
  SECheer,
  SEPoints,
  ConnectionStatus,
} from '../../../types/integrations';

type EventHandler<T> = (event: T) => void;

interface SESocketEvent {
  type: string;
  data: {
    _id?: string;
    username?: string;
    displayName?: string;
    amount?: number;
    currency?: string;
    message?: string;
    tier?: string;
    months?: number;
    viewers?: number;
    gifted?: boolean;
    sender?: string;
    createdAt?: string;
  };
}

export class StreamElementsAdapter {
  private config: StreamElementsConfig | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private channelId: string | null = null;

  // Event handlers
  private tipHandlers: EventHandler<SEtip>[] = [];
  private followHandlers: EventHandler<SEFollow>[] = [];
  private subHandlers: EventHandler<SESub>[] = [];
  private raidHandlers: EventHandler<SERaid>[] = [];
  private cheerHandlers: EventHandler<SECheer>[] = [];
  private connectionHandlers: EventHandler<ConnectionStatus>[] = [];

  private static readonly SOCKET_URL = 'wss://realtime.streamelements.com';
  private static readonly API_URL = 'https://api.streamelements.com/kappa/v2';

  constructor(config?: StreamElementsConfig) {
    if (config) {
      this.config = config;
    }
  }

  // ============================================
  // JWT Auth Methods
  // ============================================

  setJWTToken(token: string): void {
    this.config = { jwtToken: token };
  }

  setConfig(config: StreamElementsConfig): void {
    this.config = config;
    if (config.channelId) {
      this.channelId = config.channelId;
    }
  }

  getConfig(): StreamElementsConfig | null {
    return this.config;
  }

  async validateToken(): Promise<boolean> {
    if (!this.config?.jwtToken) {
      return false;
    }

    try {
      const response = await fetch(`${StreamElementsAdapter.API_URL}/channels/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.jwtToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.channelId = data._id;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getChannelId(): string | null {
    return this.channelId;
  }

  // ============================================
  // Socket Connection
  // ============================================

  async connectSocket(): Promise<void> {
    if (!this.config?.jwtToken) {
      throw new Error('StreamElementsAdapter: No JWT token available');
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(StreamElementsAdapter.SOCKET_URL);

      this.socket.onopen = () => {
        // Authenticate with JWT
        this.socket?.send(JSON.stringify({
          method: 'authenticate',
          token: this.config?.jwtToken,
        }));
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.event === 'authenticated') {
          this.reconnectAttempts = 0;
          this.emitConnectionStatus({ connected: true });
          resolve();
        } else if (data.event === 'unauthorized') {
          this.emitConnectionStatus({ connected: false, error: 'Unauthorized' });
          reject(new Error('Unauthorized'));
        } else {
          this.handleMessage(data);
        }
      };

      this.socket.onclose = () => {
        this.emitConnectionStatus({ connected: false });
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        this.emitConnectionStatus({ connected: false, error: 'Connection error' });
        reject(error);
      };
    });
  }

  disconnectSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      // Detach handlers first so a manual disconnect does not trigger auto-reconnect
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }
    
    this.reconnectAttempts = 0;
    this.emitConnectionStatus({ connected: false });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emitConnectionStatus({ 
        connected: false, 
        error: 'Max reconnect attempts reached' 
      });
      return;
    }

    this.reconnectAttempts++;
    this.emitConnectionStatus({ connected: false, reconnecting: true });

    this.reconnectTimer = setTimeout(() => {
      this.connectSocket().catch(() => {});
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private handleMessage(event: SESocketEvent): void {
    const { type, data } = event;
    
    if (!data) return;

    switch (type) {
      case 'tip':
        this.emitTip(this.parseTip(data));
        break;
      case 'follow':
        this.emitFollow(this.parseFollow(data));
        break;
      case 'subscriber':
        this.emitSub(this.parseSub(data));
        break;
      case 'raid':
        this.emitRaid(this.parseRaid(data));
        break;
      case 'cheer':
        this.emitCheer(this.parseCheer(data));
        break;
    }
  }

  // ============================================
  // Event Parsers
  // ============================================

  private parseTip(data: SESocketEvent['data']): SEtip {
    return {
      _id: data._id || crypto.randomUUID(),
      username: data.username || data.displayName || 'Anonymous',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      message: data.message || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  private parseFollow(data: SESocketEvent['data']): SEFollow {
    return {
      _id: data._id || crypto.randomUUID(),
      username: data.username || data.displayName || 'Anonymous',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  private parseSub(data: SESocketEvent['data']): SESub {
    return {
      _id: data._id || crypto.randomUUID(),
      username: data.username || data.displayName || 'Anonymous',
      tier: data.tier || '1000',
      months: data.months || 1,
      message: data.message || '',
      gifted: data.gifted || false,
      sender: data.sender,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  private parseRaid(data: SESocketEvent['data']): SERaid {
    return {
      _id: data._id || crypto.randomUUID(),
      username: data.username || data.displayName || 'Anonymous',
      viewers: data.viewers || 0,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  private parseCheer(data: SESocketEvent['data']): SECheer {
    return {
      _id: data._id || crypto.randomUUID(),
      username: data.username || data.displayName || 'Anonymous',
      amount: data.amount || 0,
      message: data.message || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  // ============================================
  // Event Handlers
  // ============================================

  onTip(handler: EventHandler<SEtip>): () => void {
    this.tipHandlers.push(handler);
    return () => {
      this.tipHandlers = this.tipHandlers.filter(h => h !== handler);
    };
  }

  onFollow(handler: EventHandler<SEFollow>): () => void {
    this.followHandlers.push(handler);
    return () => {
      this.followHandlers = this.followHandlers.filter(h => h !== handler);
    };
  }

  onSubscription(handler: EventHandler<SESub>): () => void {
    this.subHandlers.push(handler);
    return () => {
      this.subHandlers = this.subHandlers.filter(h => h !== handler);
    };
  }

  onRaid(handler: EventHandler<SERaid>): () => void {
    this.raidHandlers.push(handler);
    return () => {
      this.raidHandlers = this.raidHandlers.filter(h => h !== handler);
    };
  }

  onCheer(handler: EventHandler<SECheer>): () => void {
    this.cheerHandlers.push(handler);
    return () => {
      this.cheerHandlers = this.cheerHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: EventHandler<ConnectionStatus>): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  // ============================================
  // Event Emitters
  // ============================================

  private emitTip(tip: SEtip): void {
    this.tipHandlers.forEach(h => h(tip));
  }

  private emitFollow(follow: SEFollow): void {
    this.followHandlers.forEach(h => h(follow));
  }

  private emitSub(sub: SESub): void {
    this.subHandlers.forEach(h => h(sub));
  }

  private emitRaid(raid: SERaid): void {
    this.raidHandlers.forEach(h => h(raid));
  }

  private emitCheer(cheer: SECheer): void {
    this.cheerHandlers.forEach(h => h(cheer));
  }

  private emitConnectionStatus(partial: Partial<ConnectionStatus>): void {
    const status: ConnectionStatus = {
      provider: 'streamelements',
      connected: false,
      ...partial,
    };
    this.connectionHandlers.forEach(h => h(status));
  }

  // ============================================
  // Points System
  // ============================================

  async getPoints(username: string): Promise<SEPoints | null> {
    if (!this.config?.jwtToken || !this.channelId) {
      throw new Error('StreamElementsAdapter: Not authenticated or no channel ID');
    }

    try {
      const response = await fetch(
        `${StreamElementsAdapter.API_URL}/points/${this.channelId}/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.jwtToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        channel: this.channelId,
        username: data.username,
        points: data.points,
        rank: data.rank,
      };
    } catch {
      return null;
    }
  }

  async addPoints(username: string, amount: number): Promise<SEPoints | null> {
    if (!this.config?.jwtToken || !this.channelId) {
      throw new Error('StreamElementsAdapter: Not authenticated or no channel ID');
    }

    if (amount <= 0) {
      throw new Error('StreamElementsAdapter: Amount must be positive');
    }

    try {
      const response = await fetch(
        `${StreamElementsAdapter.API_URL}/points/${this.channelId}/${username}/${amount}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.config.jwtToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        channel: this.channelId,
        username: data.username,
        points: data.newAmount,
        rank: data.rank || 0,
      };
    } catch {
      return null;
    }
  }

  async removePoints(username: string, amount: number): Promise<SEPoints | null> {
    if (!this.config?.jwtToken || !this.channelId) {
      throw new Error('StreamElementsAdapter: Not authenticated or no channel ID');
    }

    if (amount <= 0) {
      throw new Error('StreamElementsAdapter: Amount must be positive');
    }

    try {
      const response = await fetch(
        `${StreamElementsAdapter.API_URL}/points/${this.channelId}/${username}/-${amount}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.config.jwtToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        channel: this.channelId,
        username: data.username,
        points: data.newAmount,
        rank: data.rank || 0,
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // API Actions
  // ============================================

  async testAlert(type: string = 'tip'): Promise<void> {
    if (!this.config?.jwtToken || !this.channelId) {
      throw new Error('StreamElementsAdapter: Not authenticated');
    }

    const response = await fetch(
      `${StreamElementsAdapter.API_URL}/overlays/${this.channelId}/test/${type}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.jwtToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send test alert: ${response.statusText}`);
    }
  }
}
