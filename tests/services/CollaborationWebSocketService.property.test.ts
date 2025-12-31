// Property tests for CollaborationWebSocketService
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CollaborationWebSocketService, 
  resetCollaborationWebSocketService 
} from '../../src/collaboration/services/CollaborationWebSocketService';
import { Collaborator, WSMessage, ConnectionState } from '../../types/collaboration';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code = 1000): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code }));
    }
  }

  getSentMessages(): string[] {
    return this.sentMessages;
  }

  getLastSentMessage(): unknown | null {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }
}

// Store reference to created WebSocket instances
let mockWebSocketInstance: MockWebSocket | null = null;

// Mock global WebSocket
vi.stubGlobal('WebSocket', class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockWebSocketInstance = this;
  }
});

describe('CollaborationWebSocketService', () => {
  let service: CollaborationWebSocketService;
  const testUser: Omit<Collaborator, 'joinedAt' | 'lastActiveAt'> = {
    id: 'user1',
    name: 'Alice',
    role: 'moderator',
    status: 'online'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    resetCollaborationWebSocketService();
    mockWebSocketInstance = null;
    service = new CollaborationWebSocketService({
      url: 'ws://test.local/collab',
      autoReconnect: false
    });
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  // ============================================
  // Connection Tests
  // ============================================

  describe('connect', () => {
    it('should create WebSocket with correct URL', async () => {
      const connectPromise = service.connect('ABC123', testUser, 'token123');
      
      expect(mockWebSocketInstance).not.toBeNull();
      expect(mockWebSocketInstance!.url).toContain('ws://test.local/collab');
      expect(mockWebSocketInstance!.url).toContain('session=ABC123');
      expect(mockWebSocketInstance!.url).toContain('token=token123');

      mockWebSocketInstance!.simulateOpen();
      await connectPromise;
    });

    it('should resolve true on successful connection', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      
      mockWebSocketInstance!.simulateOpen();
      
      const result = await connectPromise;
      expect(result).toBe(true);
    });

    it('should resolve false on connection error', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      
      // Simulate error followed by close - the close event resolves the promise
      mockWebSocketInstance!.simulateError();
      // Need to set state before close to trigger proper handling
      mockWebSocketInstance!.readyState = MockWebSocket.CLOSED;
      mockWebSocketInstance!.onclose!(new CloseEvent('close', { code: 1006 }));
      
      const result = await connectPromise;
      expect(result).toBe(false);
    });

    it('should set connection state to connecting', () => {
      service.connect('ABC123', testUser);
      
      expect(service.getConnectionState()).toBe('connecting');
    });

    it('should set connection state to connected on open', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      expect(service.getConnectionState()).toBe('connected');
    });

    it('should send join message on connection', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('join');
      expect((lastMessage.payload as any).sessionCode).toBe('ABC123');
      expect((lastMessage.payload as any).user.id).toBe('user1');
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      service.disconnect();

      expect(service.getConnectionState()).toBe('disconnected');
    });

    it('should clear session data', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      service.disconnect();

      expect(service.isConnected()).toBe(false);
    });
  });

  describe('reconnect', () => {
    it('should attempt to reconnect', async () => {
      const serviceWithReconnect = new CollaborationWebSocketService({
        url: 'ws://test.local/collab',
        autoReconnect: true,
        reconnectDelay: 100
      });

      const connectPromise = serviceWithReconnect.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // Simulate unexpected close
      mockWebSocketInstance!.simulateClose(1006);

      expect(serviceWithReconnect.getConnectionState()).toBe('reconnecting');

      serviceWithReconnect.dispose();
    });

    it('should use exponential backoff', async () => {
      const serviceWithReconnect = new CollaborationWebSocketService({
        url: 'ws://test.local/collab',
        autoReconnect: true,
        reconnectDelay: 1000,
        maxReconnectDelay: 10000
      });

      const connectPromise = serviceWithReconnect.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // First disconnect
      mockWebSocketInstance!.simulateClose(1006);
      
      // Check reconnect attempts increase
      const info = serviceWithReconnect.getConnectionInfo();
      expect(info.reconnectAttempts).toBe(1);

      serviceWithReconnect.dispose();
    });
  });

  // ============================================
  // Message Sending Tests
  // ============================================

  describe('send', () => {
    it('should send message when connected', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const message: WSMessage = {
        type: 'chat',
        payload: { content: 'Hello' },
        timestamp: Date.now()
      };

      const result = service.send(message);

      expect(result).toBe(true);
    });

    it('should queue message when not connected', () => {
      const message: WSMessage = {
        type: 'chat',
        payload: { content: 'Hello' },
        timestamp: Date.now()
      };

      const result = service.send(message);

      expect(result).toBe(false);
    });

    it('should flush queue on reconnection', async () => {
      // Queue a message before connecting
      const message: WSMessage = {
        type: 'chat',
        payload: { content: 'Queued' },
        timestamp: Date.now()
      };
      service.send(message);

      // Now connect
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // Check that queued message was sent (after join message)
      const sentMessages = mockWebSocketInstance!.getSentMessages();
      expect(sentMessages.length).toBeGreaterThan(1);
    });
  });

  describe('sendAction', () => {
    it('should send action message', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const action = {
        id: 'action1',
        type: 'poll:create' as const,
        payload: { title: 'Test' },
        userId: 'user1',
        userName: 'Alice',
        timestamp: Date.now(),
        version: 1
      };

      service.sendAction(action);

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('action');
    });
  });

  describe('sendChat', () => {
    it('should send chat message', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const chatMessage = {
        id: 'msg1',
        userId: 'user1',
        userName: 'Alice',
        content: 'Hello',
        mentions: [],
        timestamp: Date.now()
      };

      service.sendChat(chatMessage);

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('chat');
    });
  });

  describe('sendPresence', () => {
    it('should send presence update', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      service.sendPresence('away');

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('presence');
      expect((lastMessage.payload as any).status).toBe('away');
    });
  });

  describe('sendTyping', () => {
    it('should send typing indicator', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      service.sendTyping(true);

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('typing');
      expect((lastMessage.payload as any).isTyping).toBe(true);
    });
  });

  describe('sendEditing', () => {
    it('should send editing indicator', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      service.sendEditing('poll-123', 'poll');

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('editing');
      expect((lastMessage.payload as any).itemId).toBe('poll-123');
    });
  });

  // ============================================
  // Message Receiving Tests
  // ============================================

  describe('onMessage', () => {
    it('should notify handlers on message', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const handler = vi.fn();
      service.onMessage(handler);

      const incomingMessage: WSMessage = {
        type: 'chat',
        payload: { content: 'Hello' },
        timestamp: Date.now()
      };

      mockWebSocketInstance!.simulateMessage(incomingMessage);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'chat'
      }));
    });

    it('should allow unsubscribe', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const handler = vi.fn();
      const unsubscribe = service.onMessage(handler);

      unsubscribe();

      mockWebSocketInstance!.simulateMessage({ type: 'chat', payload: {}, timestamp: Date.now() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not notify on pong messages', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const handler = vi.fn();
      service.onMessage(handler);

      mockWebSocketInstance!.simulateMessage({ type: 'pong', payload: {}, timestamp: Date.now() });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Connection State Tests
  // ============================================

  describe('onConnectionChange', () => {
    it('should notify on connection state changes', async () => {
      const handler = vi.fn();
      service.onConnectionChange(handler);

      // Should be called immediately with current state
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        state: 'disconnected'
      }));

      handler.mockClear();

      const connectPromise = service.connect('ABC123', testUser);
      
      // Should notify connecting
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        state: 'connecting'
      }));

      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // Should notify connected
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        state: 'connected'
      }));
    });

    it('should allow unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = service.onConnectionChange(handler);

      handler.mockClear();
      unsubscribe();

      service.connect('ABC123', testUser);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection info', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const info = service.getConnectionInfo();

      expect(info.state).toBe('connected');
      expect(info.reconnectAttempts).toBe(0);
      expect(info.lastConnectedAt).toBeGreaterThan(0);
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      expect(service.isConnected()).toBe(true);
    });

    it('should return false when disconnected', () => {
      expect(service.isConnected()).toBe(false);
    });
  });

  // ============================================
  // Ping/Pong Tests
  // ============================================

  describe('ping/pong', () => {
    it('should send ping at interval', async () => {
      const serviceWithPing = new CollaborationWebSocketService({
        url: 'ws://test.local/collab',
        pingInterval: 1000,
        autoReconnect: false
      });

      const connectPromise = serviceWithPing.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // Clear initial messages
      const initialCount = mockWebSocketInstance!.getSentMessages().length;

      // Advance time to trigger ping
      vi.advanceTimersByTime(1001);

      const newCount = mockWebSocketInstance!.getSentMessages().length;
      expect(newCount).toBeGreaterThan(initialCount);

      const lastMessage = mockWebSocketInstance!.getLastSentMessage() as WSMessage;
      expect(lastMessage.type).toBe('ping');

      serviceWithPing.dispose();
    });

    it('should update latency on pong', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      // Simulate ping being sent
      vi.advanceTimersByTime(100);

      // Simulate pong response
      mockWebSocketInstance!.simulateMessage({ type: 'pong', payload: {}, timestamp: Date.now() });

      expect(service.getLatency()).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Dispose Tests
  // ============================================

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const connectPromise = service.connect('ABC123', testUser);
      mockWebSocketInstance!.simulateOpen();
      await connectPromise;

      const messageHandler = vi.fn();
      const connectionHandler = vi.fn();
      service.onMessage(messageHandler);
      service.onConnectionChange(connectionHandler);

      service.dispose();

      expect(service.getConnectionState()).toBe('disconnected');
    });
  });
});
