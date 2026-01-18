/**
 * WebSocketManager - Optimized WebSocket management for real-time streaming
 * Implements exponential backoff, connection pooling, and message deduplication
 * Critical for reducing CPU usage in OBS and improving UI responsiveness
 */

import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
}

export interface ConnectionStats {
  isConnected: boolean;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  duplicatesFiltered: number;
  averageLatency: number;
  connectionUptime: number;
  lastError?: string;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private sentMessages = new Map<string, number>(); // For deduplication
  private receivedMessages = new Set<string>(); // For deduplication
  private stats: ConnectionStats;
  private connectionStartTime: number = 0;
  private latencyMeasurements: number[] = [];

  constructor(config: WebSocketConfig) {
    super();
    
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 1000,
      enableCompression: true,
      enableDeduplication: true,
      protocols: [],
      ...config
    };

    this.stats = {
      isConnected: false,
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      duplicatesFiltered: 0,
      averageLatency: 0,
      connectionUptime: 0
    };

    this.setupCleanupTimers();
  }

  /**
   * Connect to WebSocket with exponential backoff
   */
  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.CONNECTING || 
        this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.connectionStartTime = Date.now();
      
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      
      // Configure compression if supported
      if (this.config.enableCompression && 'extensions' in this.ws) {
        // Note: Compression is typically handled by the browser automatically
      }

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.stats.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Send message with deduplication and queuing
   */
  public sendMessage(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      priority: 'normal',
      retryCount: 0,
      ...message
    };

    // Check for duplicates if enabled
    if (this.config.enableDeduplication) {
      const messageHash = this.hashMessage(fullMessage);
      const lastSent = this.sentMessages.get(messageHash);
      
      if (lastSent && (Date.now() - lastSent) < 1000) {
        this.stats.duplicatesFiltered++;
        return false; // Duplicate message, skip
      }
      
      this.sentMessages.set(messageHash, Date.now());
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.sendImmediately(fullMessage);
    } else {
      return this.queueMessage(fullMessage);
    }
  }

  /**
   * Send high-priority message (bypasses queue)
   */
  public sendPriorityMessage(message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'priority'>): boolean {
    return this.sendMessage({ ...message, priority: 'high' });
  }

  /**
   * Get connection statistics
   */
  public getStats(): ConnectionStats {
    return {
      ...this.stats,
      connectionUptime: this.stats.isConnected 
        ? Date.now() - this.connectionStartTime 
        : 0,
      averageLatency: this.calculateAverageLatency()
    };
  }

  /**
   * Clear message queues and reset stats
   */
  public reset(): void {
    this.messageQueue = [];
    this.sentMessages.clear();
    this.receivedMessages.clear();
    this.latencyMeasurements = [];
    
    this.stats = {
      isConnected: false,
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      duplicatesFiltered: 0,
      averageLatency: 0,
      connectionUptime: 0
    };
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.stats.isConnected = true;
      this.stats.reconnectAttempts = 0;
      this.connectionStartTime = Date.now();
      
      this.startHeartbeat();
      this.processMessageQueue();
      
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      this.stats.isConnected = false;
      this.clearTimers();
      
      if (event.code !== 1000) { // Not a normal closure
        this.handleConnectionError(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
      }
      
      this.emit('disconnected', event);
    };

    this.ws.onerror = (event) => {
      const error = new Error('WebSocket error');
      this.handleConnectionError(error);
      this.emit('error', error);
    };
  }

  /**
   * Handle incoming messages with deduplication
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Check for duplicates if enabled
      if (this.config.enableDeduplication) {
        const messageHash = this.hashMessage(message);
        
        if (this.receivedMessages.has(messageHash)) {
          this.stats.duplicatesFiltered++;
          return; // Duplicate message, skip
        }
        
        this.receivedMessages.add(messageHash);
        
        // Clean old received messages (keep last 1000)
        if (this.receivedMessages.size > 1000) {
          const toDelete = Array.from(this.receivedMessages).slice(0, 100);
          toDelete.forEach(hash => this.receivedMessages.delete(hash));
        }
      }

      // Measure latency for ping/pong messages
      if (message.type === 'pong' && message.data?.timestamp) {
        const latency = Date.now() - message.data.timestamp;
        this.latencyMeasurements.push(latency);
        
        // Keep only last 10 measurements
        if (this.latencyMeasurements.length > 10) {
          this.latencyMeasurements.shift();
        }
      }

      this.stats.messagesReceived++;
      this.emit('message', message);
      
    } catch (error) {
      this.emit('error', new Error('Failed to parse message'));
    }
  }

  /**
   * Send message immediately
   */
  private sendImmediately(message: WebSocketMessage): boolean {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
        return true;
      }
      return false;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): boolean {
    // Remove oldest messages if queue is full
    while (this.messageQueue.length >= this.config.messageQueueSize) {
      const removed = this.messageQueue.shift();
      if (removed) {
        this.emit('messageDropped', removed);
      }
    }

    // Insert message based on priority
    if (message.priority === 'high') {
      this.messageQueue.unshift(message);
    } else {
      this.messageQueue.push(message);
    }

    return true;
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendImmediately(message);
      }
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(error: Error): void {
    this.stats.lastError = error.message;
    this.stats.isConnected = false;
    
    if (this.stats.reconnectAttempts < this.config.maxReconnectAttempts) {
      const delay = Math.min(
        this.config.reconnectInterval * Math.pow(2, this.stats.reconnectAttempts),
        30000 // Max 30 seconds
      );
      
      this.stats.reconnectAttempts++;
      
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {
          // Error will be handled by the next attempt
        });
      }, delay);
      
      this.emit('reconnecting', { attempt: this.stats.reconnectAttempts, delay });
    } else {
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          data: { timestamp: Date.now() }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Setup cleanup timers for memory management
   */
  private setupCleanupTimers(): void {
    // Clean old sent messages every minute
    setInterval(() => {
      const cutoff = Date.now() - 60000; // 1 minute ago
      for (const [hash, timestamp] of this.sentMessages.entries()) {
        if (timestamp < cutoff) {
          this.sentMessages.delete(hash);
        }
      }
    }, 60000);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash message for deduplication
   */
  private hashMessage(message: WebSocketMessage): string {
    const { id, timestamp, retryCount, ...hashableData } = message;
    return btoa(JSON.stringify(hashableData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    
    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyMeasurements.length);
  }
}

/**
 * WebSocket Manager Factory for different connection types
 */
export class WebSocketManagerFactory {
  private static instances = new Map<string, WebSocketManager>();

  /**
   * Get or create WebSocket manager for specific service
   */
  public static getManager(
    service: 'twitch' | 'obs' | 'firebase' | 'custom',
    config: WebSocketConfig
  ): WebSocketManager {
    const key = `${service}-${config.url}`;
    
    if (!this.instances.has(key)) {
      const manager = new WebSocketManager(config);
      this.instances.set(key, manager);
      
      // Auto-cleanup on disconnect
      manager.on('maxReconnectAttemptsReached', () => {
        this.instances.delete(key);
      });
    }

    return this.instances.get(key)!;
  }

  /**
   * Get Twitch WebSocket manager with optimized config
   */
  public static getTwitchManager(url: string): WebSocketManager {
    return this.getManager('twitch', {
      url,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      messageQueueSize: 500,
      enableCompression: true,
      enableDeduplication: true
    });
  }

  /**
   * Get OBS WebSocket manager with low-latency config
   */
  public static getOBSManager(url: string): WebSocketManager {
    return this.getManager('obs', {
      url,
      reconnectInterval: 500,
      maxReconnectAttempts: 10,
      heartbeatInterval: 10000,
      messageQueueSize: 100,
      enableCompression: false, // Lower latency
      enableDeduplication: true
    });
  }

  /**
   * Disconnect all managers
   */
  public static disconnectAll(): void {
    for (const manager of this.instances.values()) {
      manager.disconnect();
    }
    this.instances.clear();
  }

  /**
   * Get statistics for all managers
   */
  public static getAllStats(): Record<string, ConnectionStats> {
    const stats: Record<string, ConnectionStats> = {};
    
    for (const [key, manager] of this.instances.entries()) {
      stats[key] = manager.getStats();
    }
    
    return stats;
  }
}