/**
 * Tests for WebSocketManager
 * 
 * Note: These tests focus on the public API and behavior.
 * WebSocket mocking in jsdom is complex, so we test what we can.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '../../src/infrastructure/realtime/WebSocketManager';

describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should create instance with default options', () => {
      const manager = new WebSocketManager('wss://test.com');
      expect(manager).toBeDefined();
      expect(manager.isConnected()).toBe(false);
    });

    it('should create instance with custom options', () => {
      const manager = new WebSocketManager('wss://test.com', {
        initialReconnectDelay: 500,
        maxReconnectDelay: 10000,
        backoffMultiplier: 1.5,
        maxReconnectAttempts: 5,
        batchInterval: 100,
        heartbeatInterval: 15000,
        heartbeatTimeout: 5000,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('handler registration', () => {
    it('should register and unregister message handlers', () => {
      const manager = new WebSocketManager('wss://test.com');
      const handler = vi.fn();

      const unsubscribe = manager.onMessage(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      // Handler should be removed (no way to verify directly, but no error)
    });

    it('should register and unregister status handlers', () => {
      const manager = new WebSocketManager('wss://test.com');
      const handler = vi.fn();

      const unsubscribe = manager.onStatus(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should register and unregister error handlers', () => {
      const manager = new WebSocketManager('wss://test.com');
      const handler = vi.fn();

      const unsubscribe = manager.onError(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });
  });

  describe('metrics', () => {
    it('should return initial metrics', () => {
      const manager = new WebSocketManager('wss://test.com');
      const metrics = manager.getMetrics();

      expect(metrics).toEqual({
        messagesReceived: 0,
        messagesSent: 0,
        reconnectAttempts: 0,
        lastLatency: 0,
        averageLatency: 0,
        connectionUptime: 0,
      });
    });
  });

  describe('connection state', () => {
    it('should report not connected initially', () => {
      const manager = new WebSocketManager('wss://test.com');
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('send method', () => {
    it('should queue messages when not connected', () => {
      const manager = new WebSocketManager('wss://test.com');
      
      // Should not throw when sending while disconnected
      expect(() => manager.send({ type: 'test' })).not.toThrow();
      expect(() => manager.send('string message')).not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect when not connected', () => {
      const manager = new WebSocketManager('wss://test.com');
      
      // Should not throw
      expect(() => manager.disconnect()).not.toThrow();
    });

    it('should notify status on disconnect', () => {
      const manager = new WebSocketManager('wss://test.com');
      const statusHandler = vi.fn();
      manager.onStatus(statusHandler);

      manager.disconnect();

      expect(statusHandler).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('connect', () => {
    it('should notify connecting status', () => {
      const manager = new WebSocketManager('wss://test.com');
      const statusHandler = vi.fn();
      manager.onStatus(statusHandler);

      // This will fail in jsdom but should notify connecting
      try {
        manager.connect();
      } catch {
        // Expected in test environment
      }

      expect(statusHandler).toHaveBeenCalledWith('connecting');
    });
  });
});

describe('WebSocketManager options', () => {
  it('should use default values when not specified', () => {
    const manager = new WebSocketManager('wss://test.com');
    // Just verify it creates without error
    expect(manager).toBeDefined();
  });

  it('should accept partial options', () => {
    const manager = new WebSocketManager('wss://test.com', {
      batchInterval: 100,
    });
    expect(manager).toBeDefined();
  });

  it('should accept all options', () => {
    const manager = new WebSocketManager('wss://test.com', {
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      backoffMultiplier: 2,
      maxReconnectAttempts: 10,
      batchInterval: 50,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      heartbeatMessage: 'ping',
    });
    expect(manager).toBeDefined();
  });
});
