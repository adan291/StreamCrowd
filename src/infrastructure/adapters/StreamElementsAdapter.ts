/**
 * StreamElementsAdapter - Implementación de IAlertProvider para StreamElements
 * 
 * Este adapter conecta con la API de StreamElements via WebSocket
 * para recibir alertas en tiempo real (donaciones, follows, subs, etc.)
 * 
 * @requirements 1.1 - WHEN connecting to StreamElements THEN THE System SHALL authenticate using JWT token
 * @requirements 1.2 - WHEN connected to StreamElements THEN THE System SHALL receive real-time alerts
 */

import { io, Socket } from 'socket.io-client';
import type {
  IAlertProvider,
  AlertProviderConfig,
  AlertProviderStatus,
  ExternalAlert,
  ExternalAlertType,
  AlertCallback,
  AlertProviderStatusCallback,
} from '../../domain/ports/IAlertProvider';

const STREAMELEMENTS_SOCKET_URL = 'https://realtime.streamelements.com';

/**
 * StreamElements event types from their API
 */
interface StreamElementsEvent {
  _id: string;
  type: 'tip' | 'follow' | 'subscriber' | 'cheer' | 'raid' | 'host';
  data: {
    username?: string;
    displayName?: string;
    amount?: number;
    currency?: string;
    message?: string;
    tier?: string;
    quantity?: number;
    viewers?: number;
    gifted?: boolean;
    sender?: string;
  };
  createdAt?: string;
}

export class StreamElementsAdapter implements IAlertProvider {
  readonly providerName = 'streamelements' as const;
  
  private socket: Socket | null = null;
  private status: AlertProviderStatus = 'disconnected';
  private alertCallbacks = new Set<AlertCallback>();
  private statusCallbacks = new Set<AlertProviderStatusCallback>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentConfig: AlertProviderConfig | null = null;

  async connect(config: AlertProviderConfig): Promise<void> {
    if (!config.jwtToken) {
      throw new Error('JWT token is required for StreamElements connection');
    }

    if (this.socket) {
      await this.disconnect();
    }

    this.currentConfig = config;
    this.reconnectAttempts = 0;
    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(STREAMELEMENTS_SOCKET_URL, {
          transports: ['websocket'],
          reconnection: false, // We handle reconnection ourselves
        });

        this.socket.on('connect', () => {
          // Authenticate with JWT token
          this.socket?.emit('authenticate', {
            method: 'jwt',
            token: config.jwtToken,
          });
        });

        this.socket.on('authenticated', () => {
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          resolve();
        });

        this.socket.on('unauthorized', (error: { message?: string }) => {
          this.setStatus('error', error?.message || 'Authentication failed');
          reject(new Error(error?.message || 'StreamElements authentication failed'));
        });

        this.socket.on('disconnect', (reason: string) => {
          if (reason !== 'io client disconnect') {
            this.attemptReconnect();
          } else {
            this.setStatus('disconnected');
          }
        });

        this.socket.on('connect_error', (error: Error) => {
          if (this.status === 'connecting' && this.reconnectAttempts === 0) {
            this.setStatus('error', error.message);
            reject(error);
          } else {
            this.attemptReconnect();
          }
        });

        // Listen for events
        this.socket.on('event', (event: StreamElementsEvent) => {
          this.handleEvent(event);
        });

        this.socket.on('event:test', (event: StreamElementsEvent) => {
          // Test events from StreamElements dashboard
          this.handleEvent(event);
        });

      } catch (error) {
        this.setStatus('error', (error as Error).message);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentConfig = null;
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.socket?.connected === true;
  }

  getStatus(): AlertProviderStatus {
    return this.status;
  }

  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  onStatusChange(callback: AlertProviderStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  dispose(): void {
    this.disconnect();
    this.alertCallbacks.clear();
    this.statusCallbacks.clear();
  }

  private setStatus(status: AlertProviderStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status, error));
  }

  private handleEvent(event: StreamElementsEvent): void {
    const alert = this.mapEventToAlert(event);
    if (alert) {
      this.alertCallbacks.forEach(cb => cb(alert));
    }
  }

  private mapEventToAlert(event: StreamElementsEvent): ExternalAlert | null {
    const typeMap: Record<string, ExternalAlertType> = {
      'tip': 'donation',
      'follow': 'follow',
      'subscriber': 'subscription',
      'cheer': 'cheer',
      'raid': 'raid',
      'host': 'raid', // Map host to raid
    };

    const alertType = typeMap[event.type];
    if (!alertType) {
      return null;
    }

    const data = event.data;
    
    return {
      id: event._id || `se_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertType,
      username: data.displayName || data.username || 'Anonymous',
      amount: this.getAmount(event),
      currency: data.currency,
      message: data.message,
      timestamp: event.createdAt ? new Date(event.createdAt).getTime() : Date.now(),
      provider: 'streamelements',
      metadata: {
        tier: data.tier,
        gifted: data.gifted,
        sender: data.sender,
        quantity: data.quantity,
      },
    };
  }

  private getAmount(event: StreamElementsEvent): number | undefined {
    const data = event.data;
    
    switch (event.type) {
      case 'tip':
        return data.amount;
      case 'cheer':
        return data.amount; // bits
      case 'raid':
      case 'host':
        return data.viewers;
      case 'subscriber':
        return data.quantity || 1; // gift count or 1 for single sub
      default:
        return undefined;
    }
  }

  private attemptReconnect(): void {
    if (!this.currentConfig || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error', `Reconnection failed after ${this.maxReconnectAttempts} attempts`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.setStatus('connecting');

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentConfig) {
        this.connect(this.currentConfig).catch(() => {
          // Error handled in connect
        });
      }
    }, delay);
  }
}
