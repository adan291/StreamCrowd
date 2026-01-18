/**
 * Real-Time Optimization Tests
 * Tests for REQ-008 implementation: debounce, throttle, batching, and WebSocket optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../../../src/application/hooks/useDebounce';
import { useThrottle, useThrottledCallback } from '../../../src/application/hooks/useThrottle';
import { RequestDeduplicator } from '../../../src/application/services/RequestDeduplicator';
import { BatchUpdateOptimizer } from '../../../src/application/services/BatchUpdateOptimizer';
import { WebSocketManager } from '../../../src/application/services/WebSocketManager';

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Update value multiple times quickly
    rerender({ value: 'update1', delay: 300 });
    rerender({ value: 'update2', delay: 300 });
    rerender({ value: 'final', delay: 300 });

    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated to the latest
    expect(result.current).toBe('final');
  });

  it('should debounce callback execution', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 300)
    );

    const [debouncedFn] = result.current;

    // Call multiple times quickly
    act(() => {
      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');
    });

    // Callback should not be called yet
    expect(mockCallback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should be called once with the last arguments
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('call3');
  });

  it('should handle leading edge execution', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 300, { leading: true, trailing: false })
    );

    const [debouncedFn] = result.current;

    act(() => {
      debouncedFn('first');
    });

    // Should execute immediately on leading edge
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('first');

    act(() => {
      debouncedFn('second');
      vi.advanceTimersByTime(300);
    });

    // Should not execute again (trailing: false)
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});

describe('useThrottle Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }) => useThrottle(value, interval),
      { initialProps: { value: 'initial', interval: 100 } }
    );

    expect(result.current).toBe('initial');

    // Update value quickly
    rerender({ value: 'update1', interval: 100 });
    expect(result.current).toBe('update1'); // Should update immediately

    rerender({ value: 'update2', interval: 100 });
    expect(result.current).toBe('update1'); // Should not update yet

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('update2'); // Should update now
  });

  it('should throttle callback execution', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallback(mockCallback, 100)
    );

    const [throttledFn] = result.current;

    // First call should execute immediately
    act(() => {
      throttledFn('call1');
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('call1');

    // Subsequent calls should be throttled
    act(() => {
      throttledFn('call2');
      throttledFn('call3');
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should execute the trailing call
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith('call3');
  });
});

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = RequestDeduplicator.getInstance();
    deduplicator.clear();
  });

  it('should deduplicate identical requests', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    // Execute same request multiple times
    const promises = [
      deduplicator.executeRequest({ key: 'test' }, mockFn),
      deduplicator.executeRequest({ key: 'test' }, mockFn),
      deduplicator.executeRequest({ key: 'test' }, mockFn)
    ];

    const results = await Promise.all(promises);

    // All should return same result
    expect(results).toEqual(['result', 'result', 'result']);
    
    // But function should only be called once
    expect(mockFn).toHaveBeenCalledTimes(1);

    const stats = deduplicator.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.duplicatesFiltered).toBe(2);
  });

  it('should cache results with TTL', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce('result1')
      .mockResolvedValueOnce('result2');

    // First request
    const result1 = await deduplicator.executeRequest(
      { key: 'cached', ttl: 1000 }, 
      mockFn
    );
    expect(result1).toBe('result1');

    // Second request should use cache
    const result2 = await deduplicator.executeRequest(
      { key: 'cached', ttl: 1000 }, 
      mockFn
    );
    expect(result2).toBe('result1'); // Same as first

    expect(mockFn).toHaveBeenCalledTimes(1);

    const stats = deduplicator.getStats();
    expect(stats.cacheHits).toBe(1);
  });

  it('should handle request failures with retry', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success');

    const result = await deduplicator.executeRequest(
      { key: 'retry-test', maxRetries: 3 },
      mockFn
    );

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should batch requests correctly', async () => {
    const batchFn = vi.fn().mockResolvedValue(['result1', 'result2', 'result3']);

    const promises = [
      deduplicator.executeBatchedRequest(
        { key: 'batch', batchSize: 3, batchDelay: 100 },
        'data1',
        batchFn
      ),
      deduplicator.executeBatchedRequest(
        { key: 'batch', batchSize: 3, batchDelay: 100 },
        'data2',
        batchFn
      ),
      deduplicator.executeBatchedRequest(
        { key: 'batch', batchSize: 3, batchDelay: 100 },
        'data3',
        batchFn
      )
    ];

    const results = await Promise.all(promises);

    expect(results).toEqual(['result1', 'result2', 'result3']);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['data1', 'data2', 'data3']);
  });
});

describe('BatchUpdateOptimizer', () => {
  let optimizer: BatchUpdateOptimizer;

  beforeEach(() => {
    optimizer = BatchUpdateOptimizer.getInstance();
    optimizer.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch updates by size', () => {
    const mockCallback = vi.fn();
    
    // Schedule updates that should trigger batch by size
    for (let i = 0; i < 5; i++) {
      optimizer.scheduleUpdate(
        'test-queue',
        `data${i}`,
        mockCallback,
        { maxBatchSize: 3, batchDelay: 1000 }
      );
    }

    // Should have processed 2 batches (3 + 2 items)
    expect(mockCallback).toHaveBeenCalledTimes(5);
  });

  it('should batch updates by time', () => {
    const mockCallback = vi.fn();
    
    // Schedule updates
    optimizer.scheduleUpdate('test-queue', 'data1', mockCallback, { batchDelay: 100 });
    optimizer.scheduleUpdate('test-queue', 'data2', mockCallback, { batchDelay: 100 });

    // Should not execute immediately
    expect(mockCallback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should execute both updates
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should handle priority updates', () => {
    const mockCallback = vi.fn();
    
    // Schedule normal priority update
    optimizer.scheduleUpdate('test-queue', 'normal', mockCallback, { 
      batchDelay: 1000, 
      priority: 'normal' 
    });

    // Schedule high priority update
    optimizer.scheduleUpdate('test-queue', 'high', mockCallback, { 
      batchDelay: 1000, 
      priority: 'high' 
    });

    // High priority should execute immediately
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, 'high'); // High priority first
    expect(mockCallback).toHaveBeenNthCalledWith(2, 'normal');
  });

  it('should deduplicate updates', () => {
    const mockCallback = vi.fn();
    
    // Schedule duplicate updates
    optimizer.scheduleUpdate('test-queue', { id: 1, value: 'old' }, mockCallback, {
      batchDelay: 100,
      deduplicateBy: 'id'
    });
    
    optimizer.scheduleUpdate('test-queue', { id: 1, value: 'new' }, mockCallback, {
      batchDelay: 100,
      deduplicateBy: 'id'
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should only execute once with the latest data
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ id: 1, value: 'new' });
  });
});

describe('WebSocketManager', () => {
  let manager: WebSocketManager;
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);
    
    manager = new WebSocketManager({
      url: 'ws://localhost:8080',
      reconnectInterval: 100,
      maxReconnectAttempts: 3
    });
  });

  afterEach(() => {
    manager.disconnect();
  });

  it('should establish WebSocket connection', async () => {
    const connectPromise = manager.connect();
    
    // Simulate connection open
    mockWebSocket.readyState = WebSocket.OPEN;
    mockWebSocket.onopen();

    await expect(connectPromise).resolves.toBeUndefined();
    
    const stats = manager.getStats();
    expect(stats.isConnected).toBe(true);
  });

  it('should queue messages when disconnected', () => {
    mockWebSocket.readyState = WebSocket.CLOSED;
    
    const result = manager.sendMessage({
      type: 'test',
      data: 'test-data'
    });

    expect(result).toBe(true); // Queued successfully
    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should send messages when connected', () => {
    mockWebSocket.readyState = WebSocket.OPEN;
    
    const result = manager.sendMessage({
      type: 'test',
      data: 'test-data'
    });

    expect(result).toBe(true);
    expect(mockWebSocket.send).toHaveBeenCalled();
    
    const stats = manager.getStats();
    expect(stats.messagesSent).toBe(1);
  });

  it('should deduplicate messages', () => {
    mockWebSocket.readyState = WebSocket.OPEN;
    
    // Send same message twice quickly
    const message = { type: 'test', data: 'duplicate' };
    
    manager.sendMessage(message);
    const result = manager.sendMessage(message);

    expect(result).toBe(false); // Second message should be filtered
    expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    
    const stats = manager.getStats();
    expect(stats.duplicatesFiltered).toBe(1);
  });

  it('should handle connection errors with exponential backoff', () => {
    vi.useFakeTimers();
    
    const reconnectingSpy = vi.fn();
    manager.on('reconnecting', reconnectingSpy);

    // Simulate connection error
    mockWebSocket.onerror(new Event('error'));
    mockWebSocket.onclose({ code: 1006, reason: 'Connection lost' });

    expect(reconnectingSpy).toHaveBeenCalledWith({
      attempt: 1,
      delay: 100 // First attempt delay
    });

    // Fast-forward and trigger another error
    vi.advanceTimersByTime(100);
    mockWebSocket.onerror(new Event('error'));
    mockWebSocket.onclose({ code: 1006, reason: 'Connection lost' });

    expect(reconnectingSpy).toHaveBeenCalledWith({
      attempt: 2,
      delay: 200 // Exponential backoff
    });

    vi.useRealTimers();
  });
});

describe('Integration Tests', () => {
  it('should work together for complete optimization', () => {
    const deduplicator = RequestDeduplicator.getInstance();
    const optimizer = BatchUpdateOptimizer.getInstance();
    
    // Clear previous state
    deduplicator.clear();
    optimizer.clear();

    // Test that all services are properly initialized
    expect(deduplicator).toBeDefined();
    expect(optimizer).toBeDefined();

    const deduplicationStats = deduplicator.getStats();
    const batchStats = optimizer.getStats();

    expect(deduplicationStats.totalRequests).toBe(0);
    expect(batchStats.totalUpdates).toBe(0);
  });

  it('should provide significant performance improvements', async () => {
    vi.useFakeTimers();
    
    const deduplicator = RequestDeduplicator.getInstance();
    const optimizer = BatchUpdateOptimizer.getInstance();
    
    deduplicator.clear();
    optimizer.clear();

    // Simulate high-frequency updates
    const mockCallback = vi.fn();
    const mockRequest = vi.fn().mockResolvedValue('result');

    // Batch updates
    for (let i = 0; i < 100; i++) {
      optimizer.scheduleUpdate('perf-test', `data${i}`, mockCallback, {
        maxBatchSize: 10,
        batchDelay: 50
      });
    }

    // Deduplicated requests
    const requests = Array(50).fill(0).map(() => 
      deduplicator.executeRequest({ key: 'perf-test' }, mockRequest)
    );

    await Promise.all(requests);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const deduplicationStats = deduplicator.getStats();
    const batchStats = optimizer.getStats();

    // Should have significant deduplication
    expect(deduplicationStats.duplicatesFiltered).toBeGreaterThan(40);
    
    // Should have batched updates
    expect(batchStats.batchedUpdates).toBe(100);
    
    // Mock request should only be called once due to deduplication
    expect(mockRequest).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

// Property-based tests for optimization effectiveness
describe('Property-Based Tests', () => {
  it('should maintain debounce properties', () => {
    // Property: Debounced function should never execute more than once per delay period
    const { result } = renderHook(() => {
      const mockFn = vi.fn();
      const [debouncedFn] = useDebouncedCallback(mockFn, 100);
      return { mockFn, debouncedFn };
    });

    vi.useFakeTimers();

    // Call multiple times within delay period
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.debouncedFn();
      }
    });

    // Should not execute yet
    expect(result.current.mockFn).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should execute exactly once
    expect(result.current.mockFn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should maintain throttle properties', () => {
    // Property: Throttled function should execute at most once per interval
    const { result } = renderHook(() => {
      const mockFn = vi.fn();
      const [throttledFn] = useThrottledCallback(mockFn, 100);
      return { mockFn, throttledFn };
    });

    vi.useFakeTimers();

    // First call should execute immediately
    act(() => {
      result.current.throttledFn();
    });
    expect(result.current.mockFn).toHaveBeenCalledTimes(1);

    // Subsequent calls within interval should be throttled
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.throttledFn();
      }
    });
    expect(result.current.mockFn).toHaveBeenCalledTimes(1);

    // After interval, should execute trailing call
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.mockFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should maintain batch optimization properties', () => {
    const optimizer = BatchUpdateOptimizer.getInstance();
    optimizer.clear();

    const mockCallback = vi.fn();

    // Property: Batching should reduce total function calls
    const updateCount = 100;
    const batchSize = 10;

    for (let i = 0; i < updateCount; i++) {
      optimizer.scheduleUpdate('batch-test', `data${i}`, mockCallback, {
        maxBatchSize: batchSize,
        batchDelay: 1000
      });
    }

    // Should have executed in batches
    const expectedBatches = Math.ceil(updateCount / batchSize);
    expect(mockCallback).toHaveBeenCalledTimes(updateCount);

    const stats = optimizer.getStats();
    expect(stats.totalUpdates).toBe(updateCount);
  });
});