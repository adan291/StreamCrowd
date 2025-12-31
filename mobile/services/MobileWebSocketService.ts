/**
 * MobileWebSocketService - WebSocket client for mobile companion
 * @requirements Task 2 - Implementar MobileWebSocketService
 */

import type {
  MobileMessage,
  DesktopMessage,
  MobileConnectionStatus,
  PairingData,
} from '../../types/mobile';

export interface MobileWebSocketServiceConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  connectionTimeout?: number;
}

const DEFAULT_CONFIG: Required<MobileWebSocketServiceConfig> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  pingInterval: 30000,
  connectionTimeout: 10000,
};

type MessageHandler = (message: DesktopMessage) => void;
type StatusHandler = (status: MobileConnectionStatus, error?: string) => void;

export class MobileWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<MobileWebSocketServiceConfig>;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private status: MobileConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private pairingData: PairingData | null = null;
  private deviceId: string | null = null;

  constructor(config: MobileWebSocketServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to desktop WebSocket server
   */
  async connect(pairingData: PairingData): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    this.pairingData = pairingData;
    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with token
        const url = new URL(pairingData.wsUrl);
        url.searchParams.set('token', pairingData.token);
        url.searchParams.set('sessionId', pairingData.sessionId);

        this.ws = new WebSocket(url.toString());

        // Connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            this.setStatus('error', 'Connection timeout');
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          this.clearConnectionTimer();
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          this.startPingInterval();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.clearTimers();
          
          if (event.wasClean) {
            this.setStatus('disconnected');
          } else {
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setStatus('error', 'Connection error');
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as DesktopMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
      } catch (error) {
        this.setStatus('error', (error as Error).message);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = this.config.maxReconnectAttempts; // Prevent reconnect
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }
    
    this.pairingData = null;
    this.deviceId = null;
    this.setStatus('disconnected');
  }

  /**
   * Send message to desktop
   */
  send(message: MobileMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Request full state sync
   */
  requestState(): void {
    this.send({ type: 'REQUEST_STATE', data: {} });
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Immediately call with current status
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): MobileConnectionStatus {
    return this.status;
  }

  /**
   * Get device ID (assigned by server)
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Manual reconnect
   */
  reconnect(): void {
    if (!this.pairingData) {
      console.warn('Cannot reconnect: no pairing data');
      return;
    }
    
    this.reconnectAttempts = 0;
    this.handleReconnect();
  }

  // ============================================
  // Private Methods
  // ============================================

  private handleMessage(message: DesktopMessage): void {
    // Handle special messages
    if (message.type === 'CONNECTION_ACCEPTED') {
      this.deviceId = message.data.deviceId;
    } else if (message.type === 'PONG') {
      // Handle pong (could calculate latency)
      const latency = Date.now() - message.data.timestamp;
      console.debug(`Latency: ${latency}ms`);
    }

    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  private setStatus(status: MobileConnectionStatus, error?: string): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status, error);
      } catch (err) {
        console.error('Status handler error:', err);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus('error', 'Max reconnect attempts reached');
      return;
    }

    if (!this.pairingData) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.pairingData) {
        this.connect(this.pairingData).catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'PING', data: { timestamp: Date.now() } });
      }
    }, this.config.pingInterval);
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectionTimer();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

// Singleton instance
let instance: MobileWebSocketService | null = null;

export function getMobileWebSocketService(): MobileWebSocketService {
  if (!instance) {
    instance = new MobileWebSocketService();
  }
  return instance;
}

export default MobileWebSocketService;
