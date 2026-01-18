/**
 * Real-Time Optimization Integration Tests
 * Validates that optimization services integrate correctly with existing components
 * and achieve performance targets in realistic scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchUpdateOptimizer } from '../../../src/application/services/BatchUpdateOptimizer';
import { WebSocketManager, WebSocketManagerFactory } from '../../../src/application/services/WebSocketManager';
import { RequestDeduplicator } from '../../../src/application/services/RequestDeduplicator';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string, public protocols?: string[]) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Simulate message echo for testing
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }));
    }, 5);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: 1000 }));
  }
}

// Mock performance.memory for memory tests
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  },
  configurable: true
});

describe('Real-Time Optimization Integration', () => {
  beforeEach(() => {
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any;
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    
    // Clean up singletons
    BatchUpdateOptimizer.getInstance().clear();
    WebSocketManagerFactory.disconnectAll();
  });

  describe('Batch Update Optimization Integration', () => {
    it('should optimize React state updates through batching', async () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const mockCallback = vi.fn();
      
      // Schedule multiple rapid updates
      for (let i = 0; i < 50; i++) {
        optimizer.scheduleUpdate(
          'test_queue',
          { id: i, message: `Message ${i}` },
          mockCallback,
          { maxBatchSize: 10, batchDelay: 50 }
        );
      }

      // Fast-forward to process batches
      vi.advanceTimersByTime(100);

      // Should have batched the updates
      expect(mockCallback).toHaveBeenCalled();
      
      const stats = optimizer.getStats();
      expect(stats.totalUpdates).toBe(50);
      expect(stats.batchedUpdates).toBeGreaterThan(0);
      expect(stats.batchedUpdates).toBeLessThan(50); // Should be batched
    });

    it('should handle priority updates correctly', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const mockCallback = vi.fn();
      
      // Schedule normal priority updates
      for (let i = 0; i < 10; i++) {
        optimizer.scheduleUpdate(
          'normal_queue',
          { id: i },
          mockCallback,
          { priority: 'normal', batchDelay: 100 }
        );
      }

      // Schedule high priority update
      optimizer.scheduleUpdate(
        'normal_queue',
        { id: 'high_priority' },
        mockCallback,
        { priority: 'high' }
      );

      // High priority should process immediately
      expect(mockCallback).toHaveBeenCalledWith({ id: 'high_priority' });
    });

    it('should deduplicate updates by key', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const mockCallback = vi.fn();
      
      // Schedule duplicate updates
      for (let i = 0; i < 5; i++) {
        optimizer.scheduleUpdate(
          'dedup_queue',
          { userId: 'user123', count: i },
          mockCallback,
          { deduplicateBy: 'userId', batchDelay: 50 }
        );
      }

      vi.advanceTimersByTime(100);

      // Should only process the last update due to deduplication
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({ userId: 'user123', count: 4 });
      
      const stats = optimizer.getStats();
      expect(stats.duplicatesFiltered).toBe(4);
    });
  });

  describe('WebSocket Manager Integration', () => {
    it('should manage WebSocket connections with optimization', async () => {
      const manager = new WebSocketManager({
        url: 'ws://localhost:8080/test',
        enableDeduplication: true,
        messageQueueSize: 100
      });

      await manager.connect();
      
      // Test message sending with deduplication
      const message1 = { type: 'test', data: { content: 'duplicate' } };
      const message2 = { type: 'test', data: { content: 'duplicate' } };
      
      const sent1 = manager.sendMessage(message1);
      const sent2 = manager.sendMessage(message2); // Should be deduplicated
      
      expect(sent1).toBe(true);
      expect(sent2).toBe(false); // Deduplicated
      
      const stats = manager.getStats();
      expect(stats.duplicatesFiltered).toBe(1);
      expect(stats.messagesSent).toBe(1);
      
      manager.disconnect();
    });

    it('should handle connection failures with exponential backoff', async () => {
      // Mock failing WebSocket
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string, protocols?: string[]) {
          super(url, protocols);
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            this.onerror?.(new Event('error'));
          }, 20);
        }
      };

      global.WebSocket = FailingWebSocket as any;

      const manager = new WebSocketManager({
        url: 'ws://failing-url',
        maxReconnectAttempts: 3,
        reconnectInterval: 100
      });

      const connectPromise = manager.connect().catch(() => {
        // Expected to fail
      });

      // Fast-forward through reconnection attempts
      vi.advanceTimersByTime(1000);

      await connectPromise;

      const stats = manager.getStats();
      expect(stats.reconnectAttempts).toBeGreaterThan(0);
      expect(stats.isConnected).toBe(false);
    });

    it('should queue messages during disconnection', () => {
      const manager = new WebSocketManager({
        url: 'ws://localhost:8080/test',
        messageQueueSize: 10
      });

      // Send messages while disconnected
      for (let i = 0; i < 5; i++) {
        const queued = manager.sendMessage({
          type: 'queued',
          data: { id: i }
        });
        expect(queued).toBe(true); // Should be queued
      }

      // Messages should be queued, not sent
      const stats = manager.getStats();
      expect(stats.messagesSent).toBe(0);
    });
  });

  describe('Request Deduplication Integration', () => {
    it('should deduplicate identical API requests', async () => {
      const deduplicator = new RequestDeduplicator();
      const mockApiCall = vi.fn().mockResolvedValue({ data: 'test' });
      
      // Make multiple identical requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          deduplicator.executeRequest('test-key', mockApiCall, { ttl: 1000 })
        );
      }

      const results = await Promise.all(promises);
      
      // Should only call API once due to deduplication
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      
      // All promises should resolve with same result
      results.forEach(result => {
        expect(result).toEqual({ data: 'test' });
      });

      const stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.duplicatesFiltered).toBe(4);
    });

    it('should batch multiple requests', async () => {
      const deduplicator = new RequestDeduplicator();
      const mockBatchProcessor = vi.fn().mockResolvedValue([
        { id: 1, result: 'a' },
        { id: 2, result: 'b' },
        { id: 3, result: 'c' }
      ]);

      // Schedule batched requests
      const promises = [
        deduplicator.executeBatchedRequest('batch-key', { id: 1 }, mockBatchProcessor, {
          batchSize: 3,
          batchDelay: 50
        }),
        deduplicator.executeBatchedRequest('batch-key', { id: 2 }, mockBatchProcessor, {
          batchSize: 3,
          batchDelay: 50
        }),
        deduplicator.executeBatchedRequest('batch-key', { id: 3 }, mockBatchProcessor, {
          batchSize: 3,
          batchDelay: 50
        })
      ];

      // Fast-forward to trigger batch processing
      vi.advanceTimersByTime(100);

      const results = await Promise.all(promises);
      
      // Should call batch processor once with all items
      expect(mockBatchProcessor).toHaveBeenCalledTimes(1);
      expect(mockBatchProcessor).toHaveBeenCalledWith([
        { id: 1 }, { id: 2 }, { id: 3 }
      ]);

      // Results should be distributed correctly
      expect(results).toEqual([
        { id: 1, result: 'a' },
        { id: 2, result: 'b' },
        { id: 3, result: 'c' }
      ]);
    });

    it('should handle request failures with retry logic', async () => {
      const deduplicator = new RequestDeduplicator();
      let callCount = 0;
      const mockFailingCall = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ data: 'success' });
      });

      const result = await deduplicator.executeRequest(
        'retry-key',
        mockFailingCall,
        { 
          ttl: 1000,
          retryAttempts: 3,
          retryDelay: 100
        }
      );

      // Should retry and eventually succeed
      expect(mockFailingCall).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });

      const stats = deduplicator.getStats();
      expect(stats.retryAttempts).toBe(2); // 2 retries before success
    });
  });

  describe('Performance Target Validation', () => {
    it('should achieve significant performance improvements', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const mockCallback = vi.fn();
      
      // Simulate high-frequency updates
      const updateCount = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < updateCount; i++) {
        optimizer.scheduleUpdate(
          'performance_test',
          { id: i, timestamp: Date.now() },
          mockCallback,
          { maxBatchSize: 50, batchDelay: 16 } // ~60fps
        );
      }

      // Process all batches
      vi.advanceTimersByTime(1000);
      
      const stats = optimizer.getStats();
      
      // Verify significant batching occurred
      expect(stats.totalUpdates).toBe(updateCount);
      expect(stats.batchedUpdates).toBeLessThan(updateCount * 0.5); // At least 50% reduction
      
      // Calculate efficiency
      const batchingEfficiency = ((stats.totalUpdates - stats.batchedUpdates) / stats.totalUpdates) * 100;
      expect(batchingEfficiency).toBeGreaterThanOrEqual(50); // 50% efficiency target
    });

    it('should maintain performance under sustained load', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const deduplicator = new RequestDeduplicator();
      const mockCallback = vi.fn();
      const mockApiCall = vi.fn().mockResolvedValue({ data: 'test' });
      
      // Sustained load test
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Batch updates
        optimizer.scheduleUpdate(
          'sustained_test',
          { iteration: i },
          mockCallback,
          { maxBatchSize: 20, batchDelay: 50 }
        );
        
        // Deduplicated requests
        deduplicator.executeRequest(`request_${i % 10}`, mockApiCall, { ttl: 1000 });
      }

      vi.advanceTimersByTime(2000);
      
      // Verify optimizations are working
      const batchStats = optimizer.getStats();
      const dedupStats = deduplicator.getStats();
      
      expect(batchStats.batchedUpdates).toBeLessThan(iterations);
      expect(dedupStats.duplicatesFiltered).toBeGreaterThan(0);
      expect(mockApiCall).toHaveBeenCalledTimes(10); // Only unique requests
    });
  });

  describe('Memory Management Integration', () => {
    it('should prevent memory leaks with automatic cleanup', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const initialStats = optimizer.getStats();
      
      // Create many operations
      for (let i = 0; i < 1000; i++) {
        optimizer.scheduleUpdate(
          `queue_${i % 10}`, // 10 different queues
          { data: `item_${i}` },
          () => {}, // Empty callback
          { maxBatchSize: 10, batchDelay: 10 }
        );
      }

      // Process all operations
      vi.advanceTimersByTime(1000);
      
      // Clear and verify cleanup
      optimizer.clear();
      const clearedStats = optimizer.getStats();
      
      expect(clearedStats.totalUpdates).toBe(0);
      expect(clearedStats.batchedUpdates).toBe(0);
      expect(clearedStats.duplicatesFiltered).toBe(0);
    });

    it('should manage WebSocket memory efficiently', async () => {
      const manager = new WebSocketManager({
        url: 'ws://localhost:8080/test',
        enableDeduplication: true,
        messageQueueSize: 100
      });

      await manager.connect();
      
      // Send many messages to test memory management
      for (let i = 0; i < 1000; i++) {
        manager.sendMessage({
          type: 'memory_test',
          data: { id: i, payload: 'x'.repeat(100) }
        });
      }

      vi.advanceTimersByTime(100);
      
      // Reset and verify cleanup
      manager.reset();
      const stats = manager.getStats();
      
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.duplicatesFiltered).toBe(0);
      
      manager.disconnect();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle batch processing errors gracefully', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Processing error');
      });
      const successCallback = vi.fn();

      // Mix error and success callbacks
      optimizer.scheduleUpdate('error_test', { id: 1 }, errorCallback);
      optimizer.scheduleUpdate('error_test', { id: 2 }, successCallback);
      optimizer.scheduleUpdate('error_test', { id: 3 }, errorCallback);

      // Should not crash when processing errors
      expect(() => {
        vi.advanceTimersByTime(100);
      }).not.toThrow();

      // Success callback should still work
      expect(successCallback).toHaveBeenCalledWith({ id: 2 });
    });

    it('should recover from deduplication errors', async () => {
      const deduplicator = new RequestDeduplicator();
      const errorCall = vi.fn().mockRejectedValue(new Error('API Error'));
      const successCall = vi.fn().mockResolvedValue({ data: 'success' });

      // Error request should not affect subsequent requests
      await expect(
        deduplicator.executeRequest('error_key', errorCall, { ttl: 1000 })
      ).rejects.toThrow('API Error');

      const result = await deduplicator.executeRequest('success_key', successCall, { ttl: 1000 });
      expect(result).toEqual({ data: 'success' });

      // Stats should still be tracked
      const stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect different batch configurations', () => {
      const optimizer = BatchUpdateOptimizer.getInstance();
      const mockCallback = vi.fn();

      // Test different batch sizes
      const configs = [
        { maxBatchSize: 5, batchDelay: 10 },
        { maxBatchSize: 20, batchDelay: 50 },
        { maxBatchSize: 100, batchDelay: 100 }
      ];

      configs.forEach((config, index) => {
        const queueKey = `config_test_${index}`;
        
        // Send more messages than batch size
        for (let i = 0; i < config.maxBatchSize + 5; i++) {
          optimizer.scheduleUpdate(
            queueKey,
            { id: i },
            mockCallback,
            config
          );
        }
      });

      vi.advanceTimersByTime(200);

      // Should have processed batches according to configurations
      expect(mockCallback).toHaveBeenCalled();
      
      const stats = optimizer.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
      expect(stats.batchedUpdates).toBeGreaterThan(0);
    });

    it('should handle WebSocket configuration variations', async () => {
      const configs = [
        { enableDeduplication: true, messageQueueSize: 50 },
        { enableDeduplication: false, messageQueueSize: 100 },
        { enableCompression: true, heartbeatInterval: 10000 }
      ];

      for (const config of configs) {
        const manager = new WebSocketManager({
          url: 'ws://localhost:8080/test',
          ...config
        });

        await manager.connect();
        
        // Test message sending with different configs
        const sent = manager.sendMessage({
          type: 'config_test',
          data: { config: JSON.stringify(config) }
        });
        
        expect(sent).toBe(true);
        
        const stats = manager.getStats();
        expect(stats.isConnected).toBe(true);
        
        manager.disconnect();
      }
    });
  });
});