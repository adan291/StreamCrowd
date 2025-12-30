// WebSocket Service - Conexiones en tiempo real
import {
  ServerEvent,
  ClientMessage,
  WebSocketConnection,
  APIKey,
  APIException
} from '../../../types/api';
import { getAPIKeyService } from './APIKeyService';

type EventType = ServerEvent['type'];
type EventHandler = (event: ServerEvent) => void;

export class WebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.startPingInterval();
  }

  // ============================================
  // Connection Management
  // ============================================

  async handleConnection(
    connectionId: string,
    apiKey: string,
    onMessage: (message: ServerEvent) => void,
    onClose: () => void
  ): Promise<WebSocketConnection> {
    // Validate API key
    const service = getAPIKeyService();
    const key = await service.validateKey(apiKey);

    if (!key) {
      throw APIException.unauthorized('Invalid API key');
    }

    // Create connection
    const connection: WebSocketConnection = {
      id: connectionId,
      keyId: key.id,
      subscribedEvents: [],
      connectedAt: Date.now(),
      lastPingAt: Date.now()
    };

    this.connections.set(connectionId, connection);

    // Register message handler
    this.registerHandler(connectionId, onMessage);

    // Send welcome message
    onMessage({
      type: 'pong',
      data: { timestamp: Date.now() }
    });

    return connection;
  }

  handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Unsubscribe from all events
      for (const eventType of connection.subscribedEvents) {
        this.unsubscribeFromEvent(connectionId, eventType);
      }
      this.connections.delete(connectionId);
    }
  }

  // ============================================
  // Message Handling
  // ============================================

  handleMessage(connectionId: string, message: ClientMessage): ServerEvent | null {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { type: 'error', data: { message: 'Connection not found', code: 'NOT_FOUND' } };
    }

    switch (message.type) {
      case 'ping':
        connection.lastPingAt = Date.now();
        return { type: 'pong', data: { timestamp: Date.now() } };

      case 'subscribe':
        for (const event of message.events) {
          if (!connection.subscribedEvents.includes(event)) {
            connection.subscribedEvents.push(event);
          }
        }
        return null;

      case 'unsubscribe':
        connection.subscribedEvents = connection.subscribedEvents.filter(
          e => !message.events.includes(e)
        );
        return null;

      case 'auth':
        // Re-authentication not supported after connection
        return { type: 'error', data: { message: 'Already authenticated', code: 'BAD_REQUEST' } };

      default:
        return { type: 'error', data: { message: 'Unknown message type', code: 'BAD_REQUEST' } };
    }
  }

  // ============================================
  // Event Broadcasting
  // ============================================

  broadcast(event: ServerEvent): void {
    const eventType = event.type.split(':')[0]; // e.g., 'poll' from 'poll:created'

    for (const [connectionId, connection] of this.connections) {
      // Check if connection is subscribed to this event type
      const isSubscribed = connection.subscribedEvents.some(sub => {
        // Match exact event type or wildcard
        return sub === event.type || 
               sub === eventType || 
               sub === '*' ||
               (sub.endsWith(':*') && event.type.startsWith(sub.slice(0, -1)));
      });

      if (isSubscribed) {
        this.sendToConnection(connectionId, event);
      }
    }
  }

  broadcastToAll(event: ServerEvent): void {
    for (const connectionId of this.connections.keys()) {
      this.sendToConnection(connectionId, event);
    }
  }

  sendToConnection(connectionId: string, event: ServerEvent): void {
    const handlers = this.eventHandlers.get(connectionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error sending to connection ${connectionId}:`, error);
        }
      }
    }
  }

  // ============================================
  // Subscription Management
  // ============================================

  subscribe(connectionId: string, events: string[]): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    for (const event of events) {
      if (!connection.subscribedEvents.includes(event)) {
        connection.subscribedEvents.push(event);
      }
    }
  }

  unsubscribe(connectionId: string, events: string[]): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscribedEvents = connection.subscribedEvents.filter(
      e => !events.includes(e)
    );
  }

  private subscribeToEvent(connectionId: string, eventType: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && !connection.subscribedEvents.includes(eventType)) {
      connection.subscribedEvents.push(eventType);
    }
  }

  private unsubscribeFromEvent(connectionId: string, eventType: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscribedEvents = connection.subscribedEvents.filter(e => e !== eventType);
    }
  }

  // ============================================
  // Handler Registration
  // ============================================

  private registerHandler(connectionId: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(connectionId)) {
      this.eventHandlers.set(connectionId, new Set());
    }
    this.eventHandlers.get(connectionId)!.add(handler);
  }

  private unregisterHandler(connectionId: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(connectionId);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(connectionId);
      }
    }
  }

  // ============================================
  // Ping/Pong & Connection Health
  // ============================================

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [connectionId, connection] of this.connections) {
        // Check if connection is stale
        if (now - connection.lastPingAt > this.PING_INTERVAL + this.PING_TIMEOUT) {
          staleConnections.push(connectionId);
        }
      }

      // Remove stale connections
      for (const connectionId of staleConnections) {
        console.log(`Removing stale connection: ${connectionId}`);
        this.handleDisconnection(connectionId);
      }
    }, this.PING_INTERVAL);
  }

  stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ============================================
  // Statistics
  // ============================================

  getStats(): {
    totalConnections: number;
    connectionsByKey: Record<string, number>;
    subscriptionCounts: Record<string, number>;
  } {
    const connectionsByKey: Record<string, number> = {};
    const subscriptionCounts: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      // Count by key
      connectionsByKey[connection.keyId] = (connectionsByKey[connection.keyId] || 0) + 1;

      // Count subscriptions
      for (const event of connection.subscribedEvents) {
        subscriptionCounts[event] = (subscriptionCounts[event] || 0) + 1;
      }
    }

    return {
      totalConnections: this.connections.size,
      connectionsByKey,
      subscriptionCounts
    };
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  // ============================================
  // Cleanup
  // ============================================

  closeAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.handleDisconnection(connectionId);
    }
    this.stopPingInterval();
  }
}

// Singleton instance
let instance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!instance) {
    instance = new WebSocketService();
  }
  return instance;
}

export function resetWebSocketService(): void {
  if (instance) {
    instance.closeAll();
  }
  instance = null;
}
