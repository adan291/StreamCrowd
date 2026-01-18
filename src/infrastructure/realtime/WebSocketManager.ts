/**
 * WebSocketManager
 * 
 * Manages WebSocket connections with:
 * - Exponential backoff for reconnections
 * - Message batching for incoming messages
 * - Queue for outgoing messages
 * - Heartbeat for connection health monitoring
 * 
 * @example
 * const ws = new WebSocketManager('wss://api.example.com/ws');
 * ws.onMessage((messages) => console.log('Batch:', messages));
 * ws.connect();
 */

export interface WebSocketManagerOptions {
  /** Initial reconnection delay in ms (default: 1000) */
  initialReconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Maximum reconnection attempts (default: 10, -1 for infinite) */
  maxReconnectAttempts?: number;
  /** Batch interval for incoming messages in ms (default: 50) */
  batchInterval?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Heartbeat timeout in ms (default: 10000) */
  heartbeatTimeout?: number;
  /** Custom heartbeat message (default: 'ping') */
  heartbeatMessage?: string;
}

export interface WebSocketMetrics {
  messagesReceived: number;
  messagesSent: number;
  reconnectAttempts: number;
  lastLatency: number;
  averageLatency: number;
  connectionUptime: number;
}

type MessageHandler = (messages: any[]) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
type ErrorHandler = (error: Error) => void;

export class WebSocketManager {
  private url: string;
  private ws: WebSocket | null = null;
  private options: Required<WebSocketManagerOptions>;
  
  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  
  // Message batching
  private messageBuffer: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  // Outgoing queue
  private outgoingQueue: string[] = [];
  private isProcessingQueue = false;
  
  // Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastPongTime = 0;
  
  // Metrics
  private metrics: WebSocketMetrics = {
    messagesReceived: 0,
    messagesSent: 0,
    reconnectAttempts: 0,
    lastLatency: 0,
    averageLatency: 0,
    connectionUptime: 0,
  };
  private connectionStartTime = 0;
  private latencyHistory: number[] = [];
  
  // Handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  constructor(url: string, options: WebSocketManagerOptions = {}) {
    this.url = url;
    this.options = {
      initialReconnectDelay: options.initialReconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      batchInterval: options.batchInterval ?? 50,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 10000,
      heartbeatMessage: options.heartbeatMessage ?? 'ping',
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;
    this.notifyStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.notifyStatus('disconnected');
  }

  /**
   * Send a message (queued if not connected)
   */
  send(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.metrics.messagesSent++;
    } else {
      // Queue for later
      this.outgoingQueue.push(message);
    }
  }

  /**
   * Register a message handler (receives batched messages)
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a status change handler
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    if (this.connectionStartTime > 0) {
      this.metrics.connectionUptime = Date.now() - this.connectionStartTime;
    }
    return { ...this.metrics };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionStartTime = Date.now();
      this.notifyStatus('connected');
      this.startHeartbeat();
      this.processOutgoingQueue();
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      if (!this.isManualClose) {
        this.notifyStatus('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
  }

  private handleIncomingMessage(data: string): void {
    // Handle pong response
    if (data === 'pong') {
      this.handlePong();
      return;
    }

    // Parse message
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    this.metrics.messagesReceived++;
    
    // Add to buffer
    this.messageBuffer.push(parsed);
    
    // Schedule batch flush
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushMessageBuffer();
      }, this.options.batchInterval);
    }
  }

  private flushMessageBuffer(): void {
    if (this.messageBuffer.length === 0) return;

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];
    this.batchTimeout = null;

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(messages);
      } catch (error) {
        console.error('[WebSocketManager] Handler error:', error);
      }
    }
  }

  private processOutgoingQueue(): void {
    if (this.isProcessingQueue || this.outgoingQueue.length === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.isProcessingQueue = true;

    while (this.outgoingQueue.length > 0) {
      const message = this.outgoingQueue.shift()!;
      this.ws.send(message);
      this.metrics.messagesSent++;
    }

    this.isProcessingQueue = false;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        this.ws.send(this.options.heartbeatMessage);
        
        // Set timeout for pong response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('[WebSocketManager] Heartbeat timeout, reconnecting...');
          this.ws?.close();
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handlePong(): void {
    const now = Date.now();
    
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    if (this.lastPongTime > 0) {
      const latency = now - this.lastPongTime;
      this.metrics.lastLatency = latency;
      
      // Update average latency (keep last 10 samples)
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 10) {
        this.latencyHistory.shift();
      }
      this.metrics.averageLatency = 
        this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    }
    
    this.lastPongTime = now;
  }

  private scheduleReconnect(): void {
    if (this.isManualClose) return;
    
    const { maxReconnectAttempts, initialReconnectDelay, maxReconnectDelay, backoffMultiplier } = this.options;
    
    if (maxReconnectAttempts !== -1 && this.reconnectAttempts >= maxReconnectAttempts) {
      this.handleError(new Error(`Max reconnection attempts (${maxReconnectAttempts}) reached`));
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      initialReconnectDelay * Math.pow(backoffMultiplier, this.reconnectAttempts),
      maxReconnectDelay
    );

    this.reconnectAttempts++;
    this.metrics.reconnectAttempts = this.reconnectAttempts;

    console.log(`[WebSocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleError(error: Error): void {
    this.notifyStatus('error');
    
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        console.error('[WebSocketManager] Error handler error:', e);
      }
    }
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch (error) {
        console.error('[WebSocketManager] Status handler error:', error);
      }
    }
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.stopHeartbeat();
    this.messageBuffer = [];
  }
}

export default WebSocketManager;
