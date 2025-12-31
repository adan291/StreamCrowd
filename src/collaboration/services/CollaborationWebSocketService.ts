// Collaboration WebSocket Service - Gestiona conexión WebSocket para colaboración
import {
  WSMessage,
  WSMessageType,
  ConnectionState,
  ConnectionInfo,
  WSJoinPayload,
  WSActionPayload,
  WSChatPayload,
  WSPresencePayload,
  WSTypingPayload,
  WSEditingPayload,
  Collaborator
} from '../../../types/collaboration';

const DEFAULT_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;

export interface WebSocketServiceOptions {
  url?: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  pingInterval?: number;
  autoReconnect?: boolean;
}

type MessageHandler = (message: WSMessage) => void;
type ConnectionHandler = (info: ConnectionInfo) => void;

export class CollaborationWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionCode: string | null = null;
  private token: string | null = null;
  private user: Omit<Collaborator, 'joinedAt' | 'lastActiveAt'> | null = null;
  
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private pingInterval: number;
  private autoReconnect: boolean;
  
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private latency = 0;
  private lastConnectedAt: number | null = null;
  
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private messageQueue: WSMessage[] = [];

  constructor(options: WebSocketServiceOptions = {}) {
    this.url = options.url || 'ws://localhost:8080/collab';
    this.reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    this.maxReconnectDelay = options.maxReconnectDelay ?? MAX_RECONNECT_DELAY;
    this.pingInterval = options.pingInterval ?? PING_INTERVAL;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  // ============================================
  // Connection Management
  // ============================================

  connect(
    sessionCode: string,
    user: Omit<Collaborator, 'joinedAt' | 'lastActiveAt'>,
    token?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.connectionState === 'connected') {
        resolve(true);
        return;
      }

      this.sessionCode = sessionCode;
      this.user = user;
      this.token = token || null;

      this.setConnectionState('connecting');

      try {
        const wsUrl = this.buildUrl(sessionCode, token);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve(true);
        };

        this.ws.onerror = (error) => {
          this.handleError(error);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
          if (this.connectionState !== 'connected') {
            resolve(false);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        this.setConnectionState('error', String(error));
        resolve(false);
      }
    });
  }

  disconnect(): void {
    this.autoReconnect = false;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.sessionCode = null;
    this.token = null;
    this.user = null;
    this.reconnectAttempts = 0;
    this.setConnectionState('disconnected');
  }

  reconnect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'reconnecting') {
      return;
    }

    if (!this.sessionCode || !this.user) {
      return;
    }

    this.setConnectionState('reconnecting');
    this.connect(this.sessionCode, this.user, this.token || undefined);
  }

  private buildUrl(sessionCode: string, token?: string): string {
    const params = new URLSearchParams();
    params.set('session', sessionCode);
    if (token) {
      params.set('token', token);
    }
    return `${this.url}?${params.toString()}`;
  }

  // ============================================
  // Event Handlers
  // ============================================

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.lastConnectedAt = Date.now();
    this.setConnectionState('connected');
    
    // Send join message
    if (this.user && this.sessionCode) {
      this.sendJoin();
    }

    // Start ping interval
    this.startPingInterval();

    // Flush message queue
    this.flushMessageQueue();
  }

  private handleClose(event: CloseEvent): void {
    this.clearTimers();
    this.ws = null;

    if (event.code === 1000) {
      // Normal closure
      this.setConnectionState('disconnected');
      return;
    }

    if (this.autoReconnect && this.sessionCode && this.user) {
      this.scheduleReconnect();
    } else {
      this.setConnectionState('disconnected');
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.setConnectionState('error', 'Connection error');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WSMessage;
      
      // Handle pong
      if (message.type === 'pong') {
        this.handlePong();
        return;
      }

      // Notify handlers
      this.messageHandlers.forEach(handler => handler(message));
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // ============================================
  // Message Sending
  // ============================================

  send(message: WSMessage): boolean {
    if (!this.ws || this.connectionState !== 'connected') {
      // Queue message for later
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  private sendJoin(): void {
    if (!this.user || !this.sessionCode) return;

    const payload: WSJoinPayload = {
      sessionCode: this.sessionCode,
      user: this.user,
      token: this.token || undefined
    };

    this.send({
      type: 'join',
      payload,
      timestamp: Date.now()
    });
  }

  sendAction(action: WSActionPayload['action']): boolean {
    return this.send({
      type: 'action',
      payload: { action },
      timestamp: Date.now()
    });
  }

  sendChat(message: WSChatPayload['message']): boolean {
    return this.send({
      type: 'chat',
      payload: { message },
      timestamp: Date.now()
    });
  }

  sendPresence(status: WSPresencePayload['status']): boolean {
    if (!this.user) return false;

    return this.send({
      type: 'presence',
      payload: { userId: this.user.id, status },
      timestamp: Date.now()
    });
  }

  sendTyping(isTyping: boolean): boolean {
    if (!this.user) return false;

    const payload: WSTypingPayload = {
      userId: this.user.id,
      isTyping
    };

    return this.send({
      type: 'typing',
      payload,
      timestamp: Date.now()
    });
  }

  sendEditing(itemId: string | null, itemType?: string): boolean {
    if (!this.user) return false;

    const payload: WSEditingPayload = {
      userId: this.user.id,
      itemId,
      itemType
    };

    return this.send({
      type: 'editing',
      payload,
      timestamp: Date.now()
    });
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  // ============================================
  // Ping/Pong
  // ============================================

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingInterval);
  }

  private sendPing(): void {
    if (!this.ws || this.connectionState !== 'connected') return;

    this.lastPingTime = Date.now();
    
    this.send({
      type: 'ping',
      payload: {},
      timestamp: this.lastPingTime
    });

    // Set pong timeout
    this.pongTimer = setTimeout(() => {
      console.warn('Pong timeout - connection may be lost');
      this.handlePongTimeout();
    }, PONG_TIMEOUT);
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }

    this.latency = Date.now() - this.lastPingTime;
    this.notifyConnectionHandlers();
  }

  private handlePongTimeout(): void {
    // Connection seems dead, try to reconnect
    if (this.ws) {
      this.ws.close();
    }
  }

  // ============================================
  // Reconnection
  // ============================================

  private scheduleReconnect(): void {
    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.sessionCode && this.user) {
        this.connect(this.sessionCode, this.user, this.token || undefined);
      }
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ============================================
  // Connection State
  // ============================================

  private setConnectionState(state: ConnectionState, error?: string): void {
    this.connectionState = state;
    this.notifyConnectionHandlers(error);
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.connectionState,
      latency: this.latency,
      lastConnectedAt: this.lastConnectedAt || undefined,
      reconnectAttempts: this.reconnectAttempts,
      error: undefined
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  getLatency(): number {
    return this.latency;
  }

  // ============================================
  // Event Handlers Registration
  // ============================================

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    // Immediately notify with current state
    handler(this.getConnectionInfo());
    return () => this.connectionHandlers.delete(handler);
  }

  private notifyConnectionHandlers(error?: string): void {
    const info: ConnectionInfo = {
      ...this.getConnectionInfo(),
      error
    };
    this.connectionHandlers.forEach(handler => handler(info));
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.messageQueue = [];
  }
}

// Singleton
let instance: CollaborationWebSocketService | null = null;

export function getCollaborationWebSocketService(): CollaborationWebSocketService {
  if (!instance) {
    instance = new CollaborationWebSocketService();
  }
  return instance;
}

export function resetCollaborationWebSocketService(): void {
  if (instance) {
    instance.dispose();
  }
  instance = null;
}
