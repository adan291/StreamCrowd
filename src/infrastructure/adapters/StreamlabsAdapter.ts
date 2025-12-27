/**
 * StreamlabsAdapter - Implementación de IAlertProvider para Streamlabs
 * 
 * Este adapter conecta con la API de Streamlabs via Socket.IO
 * para recibir alertas en tiempo real (donaciones, follows, subs, etc.)
 * 
 * @requirements 1.3 - WHEN connecting to Streamlabs THEN THE System SHALL authenticate using OAuth
 * @requirements 1.4 - WHEN connected to Streamlabs THEN THE System SHALL receive real-time alerts via socket
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

const STREAMLABS_SOCKET_URL = 'https://sockets.streamlabs.com';

/**
 * Streamlabs event types from their API
 */
interface StreamlabsEventMessage {
  type: 'donation' | 'follow' | 'subscription' | 'bits' | 'raid' | 'host';
  message: StreamlabsEventData[];
  for?: string; // Platform: 'twitch_account', 'youtube_account', etc.
  event_id?: string;
}

interface StreamlabsEventData {
  _id?: string;
  id?: string;
  name?: string;
  from?: string;
  amount?: number | string;
  formatted_amount?: string;
  currency?: string;
  message?: string;
  months?: number;
  sub_plan?: string;
  sub_type?: string;
  gifter?: string;
  gifter_display_name?: string;
  raiders?: number;
  viewers?: number;
  isTest?: boolean;
}

export class StreamlabsAdapter implements IAlertProvider {
  readonly providerName = 'streamlabs' as const;
  
  private socket: Socket | null = null;
  private status: AlertProviderStatus = 'disconnected';
  private alertCallbacks = new Set<AlertCallback>();
  private statusCallbacks = new Set<AlertProviderStatusCallback>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentConfig: AlertProviderConfig | null = null;

  async connect(config: AlertProviderConfig): Promise<void> {
    if (!config.socketToken) {
      throw new Error('Socket token is required for Streamlabs connection');
    }

    if (this.socket) {
      await this.disconnect();
    }

    this.currentConfig = config;
    this.reconnectAttempts = 0;
    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Streamlabs uses token as query parameter
        this.socket = io(STREAMLABS_SOCKET_URL, {
          query: {
            token: config.socketToken,
          },
          transports: ['websocket'],
          reconnection: false, // We handle reconnection ourselves
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          resolve();
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
        this.socket.on('event', (eventData: StreamlabsEventMessage) => {
          this.handleEvent(eventData);
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

  private handleEvent(eventData: StreamlabsEventMessage): void {
    // Streamlabs sends an array of messages for each event type
    if (!eventData.message || !Array.isArray(eventData.message)) {
      return;
    }

    for (const data of eventData.message) {
      const alert = this.mapEventToAlert(eventData.type, data, eventData.event_id);
      if (alert) {
        this.alertCallbacks.forEach(cb => cb(alert));
      }
    }
  }

  private mapEventToAlert(
    type: StreamlabsEventMessage['type'],
    data: StreamlabsEventData,
    eventId?: string
  ): ExternalAlert | null {
    const typeMap: Record<string, ExternalAlertType> = {
      'donation': 'donation',
      'follow': 'follow',
      'subscription': 'subscription',
      'bits': 'cheer',
      'raid': 'raid',
      'host': 'raid', // Map host to raid
    };

    const alertType = typeMap[type];
    if (!alertType) {
      return null;
    }

    const username = data.name || data.from || 'Anonymous';
    const amount = this.parseAmount(data.amount);

    return {
      id: data._id || data.id || eventId || `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertType,
      username,
      amount,
      currency: data.currency,
      message: data.message,
      timestamp: Date.now(),
      provider: 'streamlabs',
      metadata: {
        formattedAmount: data.formatted_amount,
        months: data.months,
        subPlan: data.sub_plan,
        subType: data.sub_type,
        gifter: data.gifter || data.gifter_display_name,
        isTest: data.isTest,
        raiders: data.raiders,
        viewers: data.viewers,
      },
    };
  }

  private parseAmount(amount: number | string | undefined): number | undefined {
    if (amount === undefined) {
      return undefined;
    }
    if (typeof amount === 'number') {
      return amount;
    }
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? undefined : parsed;
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
