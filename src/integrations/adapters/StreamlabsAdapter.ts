import type {
  StreamlabsTokens,
  StreamlabsConfig,
  StreamlabsDonation,
  StreamlabsFollow,
  StreamlabsSub,
  StreamlabsHost,
  StreamlabsBits,
  ConnectionStatus,
} from '../../../types/integrations';

type EventHandler<T> = (event: T) => void;

interface StreamlabsSocketEvent {
  type: string;
  message: Array<{
    id: string;
    name: string;
    amount?: number;
    formatted_amount?: string;
    currency?: string;
    message?: string;
    months?: number;
    tier?: string;
    viewers?: number;
    created_at?: string;
    from?: string;
  }>;
  for?: string;
}

export class StreamlabsAdapter {
  private config: StreamlabsConfig | null = null;
  private tokens: StreamlabsTokens | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  // Event handlers
  private donationHandlers: EventHandler<StreamlabsDonation>[] = [];
  private followHandlers: EventHandler<StreamlabsFollow>[] = [];
  private subHandlers: EventHandler<StreamlabsSub>[] = [];
  private hostHandlers: EventHandler<StreamlabsHost>[] = [];
  private bitsHandlers: EventHandler<StreamlabsBits>[] = [];
  private connectionHandlers: EventHandler<ConnectionStatus>[] = [];

  private static readonly OAUTH_URL = 'https://streamlabs.com/api/v2.0/authorize';
  private static readonly TOKEN_URL = 'https://streamlabs.com/api/v2.0/token';
  private static readonly SOCKET_URL = 'wss://sockets.streamlabs.com';

  constructor(config?: StreamlabsConfig) {
    if (config) {
      this.config = config;
    }
  }

  // ============================================
  // OAuth Methods
  // ============================================

  setConfig(config: StreamlabsConfig): void {
    this.config = config;
  }

  getAuthUrl(scopes: string[] = ['donations.read', 'alerts.create']): string {
    if (!this.config) {
      throw new Error('StreamlabsAdapter: Config not set');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    return `${StreamlabsAdapter.OAUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<StreamlabsTokens> {
    if (!this.config) {
      throw new Error('StreamlabsAdapter: Config not set');
    }

    const response = await fetch(StreamlabsAdapter.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json();
    
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope?.split(' ') || [],
    };

    return this.tokens;
  }

  async refreshToken(): Promise<StreamlabsTokens> {
    if (!this.config || !this.tokens?.refreshToken) {
      throw new Error('StreamlabsAdapter: Cannot refresh without config and refresh token');
    }

    const response = await fetch(StreamlabsAdapter.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: this.tokens.scope,
    };

    return this.tokens;
  }

  setTokens(tokens: StreamlabsTokens): void {
    this.tokens = tokens;
  }

  getTokens(): StreamlabsTokens | null {
    return this.tokens;
  }

  isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return new Date() >= this.tokens.expiresAt;
  }

  // ============================================
  // Socket Connection
  // ============================================

  async connectSocket(token?: string): Promise<void> {
    const accessToken = token || this.tokens?.accessToken;
    
    if (!accessToken) {
      throw new Error('StreamlabsAdapter: No access token available');
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const socketUrl = `${StreamlabsAdapter.SOCKET_URL}?token=${accessToken}`;
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.emitConnectionStatus({ connected: true });
        resolve();
      };

      this.socket.onclose = () => {
        this.emitConnectionStatus({ connected: false });
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        this.emitConnectionStatus({ connected: false, error: 'Connection error' });
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  disconnectSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
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
      this.connectSocket().catch(() => {
        // Will trigger another reconnect attempt
      });
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private handleMessage(data: string): void {
    try {
      const event: StreamlabsSocketEvent = JSON.parse(data);
      
      if (!event.message || !Array.isArray(event.message)) {
        return;
      }

      for (const msg of event.message) {
        switch (event.type) {
          case 'donation':
            this.emitDonation(this.parseDonation(msg));
            break;
          case 'follow':
            this.emitFollow(this.parseFollow(msg));
            break;
          case 'subscription':
            this.emitSub(this.parseSub(msg));
            break;
          case 'host':
            this.emitHost(this.parseHost(msg));
            break;
          case 'bits':
            this.emitBits(this.parseBits(msg));
            break;
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  // ============================================
  // Event Parsers
  // ============================================

  private parseDonation(msg: StreamlabsSocketEvent['message'][0]): StreamlabsDonation {
    return {
      id: msg.id || crypto.randomUUID(),
      name: msg.name || 'Anonymous',
      amount: msg.amount || 0,
      formattedAmount: msg.formatted_amount || `$${msg.amount || 0}`,
      currency: msg.currency || 'USD',
      message: msg.message || '',
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
      from: msg.from || msg.name || 'Anonymous',
    };
  }

  private parseFollow(msg: StreamlabsSocketEvent['message'][0]): StreamlabsFollow {
    return {
      id: msg.id || crypto.randomUUID(),
      name: msg.name || 'Anonymous',
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
    };
  }

  private parseSub(msg: StreamlabsSocketEvent['message'][0]): StreamlabsSub {
    return {
      id: msg.id || crypto.randomUUID(),
      name: msg.name || 'Anonymous',
      months: msg.months || 1,
      message: msg.message || '',
      tier: msg.tier || '1000',
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
    };
  }

  private parseHost(msg: StreamlabsSocketEvent['message'][0]): StreamlabsHost {
    return {
      id: msg.id || crypto.randomUUID(),
      name: msg.name || 'Anonymous',
      viewers: msg.viewers || 0,
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
    };
  }

  private parseBits(msg: StreamlabsSocketEvent['message'][0]): StreamlabsBits {
    return {
      id: msg.id || crypto.randomUUID(),
      name: msg.name || 'Anonymous',
      amount: msg.amount || 0,
      message: msg.message || '',
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
    };
  }

  // ============================================
  // Event Handlers
  // ============================================

  onDonation(handler: EventHandler<StreamlabsDonation>): () => void {
    this.donationHandlers.push(handler);
    return () => {
      this.donationHandlers = this.donationHandlers.filter(h => h !== handler);
    };
  }

  onFollow(handler: EventHandler<StreamlabsFollow>): () => void {
    this.followHandlers.push(handler);
    return () => {
      this.followHandlers = this.followHandlers.filter(h => h !== handler);
    };
  }

  onSubscription(handler: EventHandler<StreamlabsSub>): () => void {
    this.subHandlers.push(handler);
    return () => {
      this.subHandlers = this.subHandlers.filter(h => h !== handler);
    };
  }

  onHost(handler: EventHandler<StreamlabsHost>): () => void {
    this.hostHandlers.push(handler);
    return () => {
      this.hostHandlers = this.hostHandlers.filter(h => h !== handler);
    };
  }

  onBits(handler: EventHandler<StreamlabsBits>): () => void {
    this.bitsHandlers.push(handler);
    return () => {
      this.bitsHandlers = this.bitsHandlers.filter(h => h !== handler);
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

  private emitDonation(donation: StreamlabsDonation): void {
    this.donationHandlers.forEach(h => h(donation));
  }

  private emitFollow(follow: StreamlabsFollow): void {
    this.followHandlers.forEach(h => h(follow));
  }

  private emitSub(sub: StreamlabsSub): void {
    this.subHandlers.forEach(h => h(sub));
  }

  private emitHost(host: StreamlabsHost): void {
    this.hostHandlers.forEach(h => h(host));
  }

  private emitBits(bits: StreamlabsBits): void {
    this.bitsHandlers.forEach(h => h(bits));
  }

  private emitConnectionStatus(partial: Partial<ConnectionStatus>): void {
    const status: ConnectionStatus = {
      provider: 'streamlabs',
      connected: false,
      ...partial,
    };
    this.connectionHandlers.forEach(h => h(status));
  }

  // ============================================
  // API Actions
  // ============================================

  async testAlert(type: 'donation' | 'follow' | 'subscription' = 'donation'): Promise<void> {
    if (!this.tokens?.accessToken) {
      throw new Error('StreamlabsAdapter: Not authenticated');
    }

    const response = await fetch('https://streamlabs.com/api/v2.0/alerts/send_test_alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.tokens.accessToken}`,
      },
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send test alert: ${response.statusText}`);
    }
  }

  async skipAlert(): Promise<void> {
    if (!this.tokens?.accessToken) {
      throw new Error('StreamlabsAdapter: Not authenticated');
    }

    const response = await fetch('https://streamlabs.com/api/v2.0/alerts/skip', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to skip alert: ${response.statusText}`);
    }
  }
}
