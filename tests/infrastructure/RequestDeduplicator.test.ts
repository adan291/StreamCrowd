/**
 * Tests for RequestDeduplicator
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestDeduplicator, getRequestDeduplicator } from '../../src/infrastructure/api/RequestDeduplicator';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    vi.useFakeTimers();
    deduplicator = new RequestDeduplicator({ ttl: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should deduplicate concurrent requests with same key', async () => {
    const fetcher = vi.fn().mockResolvedValue('result');

    // Make concurrent requests
    const promise1 = deduplicator.dedupe('key1', fetcher);
    const promise2 = deduplicator.dedupe('key1', fetcher);
    const promise3 = deduplicator.dedupe('key1', fetcher);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    // All should get same result
    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');

    // Fetcher should only be called once
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should not deduplicate requests with different keys', async () => {
    const fetcher = vi.fn().mockImplementation((key) => Promise.resolve(key));

    const [result1, result2] = await Promise.all([
      deduplicator.dedupe('key1', () => fetcher('key1')),
      deduplicator.dedupe('key2', () => fetcher('key2')),
    ]);

    expect(result1).toBe('key1');
    expect(result2).toBe('key2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should cache results for TTL duration', async () => {
    const fetcher = vi.fn().mockResolvedValue('cached');

    // First request
    await deduplicator.dedupe('key1', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);

    // Second request within TTL - should use cache
    const result = await deduplicator.dedupe('key1', fetcher);
    expect(result).toBe('cached');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should refetch after TTL expires', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    // First request
    const result1 = await deduplicator.dedupe('key1', fetcher);
    expect(result1).toBe('first');

    // Wait for TTL to expire
    await vi.advanceTimersByTimeAsync(1100);

    // Second request after TTL - should refetch
    const result2 = await deduplicator.dedupe('key1', fetcher);
    expect(result2).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should skip cache when skipCache option is true', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    // First request
    await deduplicator.dedupe('key1', fetcher);

    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);

    // Second request with skipCache
    const result = await deduplicator.dedupe('key1', fetcher, { skipCache: true });
    expect(result).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should invalidate specific key', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await deduplicator.dedupe('key1', fetcher);
    
    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);
    
    // Invalidate
    deduplicator.invalidate('key1');

    // Should refetch
    const result = await deduplicator.dedupe('key1', fetcher);
    expect(result).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should invalidate by pattern', async () => {
    const fetcher = vi.fn().mockResolvedValue('result');

    await deduplicator.dedupe('user-1', fetcher);
    await deduplicator.dedupe('user-2', fetcher);
    await deduplicator.dedupe('post-1', fetcher);

    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);

    // Invalidate all user keys
    deduplicator.invalidatePattern(/^user-/);

    // User keys should refetch
    await deduplicator.dedupe('user-1', fetcher);
    await deduplicator.dedupe('user-2', fetcher);
    
    // Post key should still be cached
    await deduplicator.dedupe('post-1', fetcher);

    // 3 initial + 2 refetches = 5
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it('should clear all entries', async () => {
    const fetcher = vi.fn().mockResolvedValue('result');

    await deduplicator.dedupe('key1', fetcher);
    await deduplicator.dedupe('key2', fetcher);

    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);

    deduplicator.clear();

    const stats = deduplicator.getStats();
    expect(stats.cacheSize).toBe(0);
    expect(stats.pendingSize).toBe(0);
  });

  it('should enforce max entries limit', async () => {
    const smallDeduplicator = new RequestDeduplicator({ maxEntries: 2, ttl: 10000 });
    const fetcher = vi.fn().mockResolvedValue('result');

    await smallDeduplicator.dedupe('key1', fetcher);
    await smallDeduplicator.dedupe('key2', fetcher);
    
    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);
    
    await smallDeduplicator.dedupe('key3', fetcher);

    // Wait for pending to clear
    await vi.advanceTimersByTimeAsync(200);

    const stats = smallDeduplicator.getStats();
    expect(stats.cacheSize).toBeLessThanOrEqual(2);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Fetch failed');
    const fetcher = vi.fn().mockRejectedValue(error);

    await expect(deduplicator.dedupe('key1', fetcher)).rejects.toThrow('Fetch failed');
  });

  it('should provide stats', async () => {
    const fetcher = vi.fn().mockResolvedValue('result');

    await deduplicator.dedupe('key1', fetcher);

    const stats = deduplicator.getStats();
    expect(stats).toHaveProperty('cacheSize');
    expect(stats).toHaveProperty('pendingSize');
  });
});

describe('getRequestDeduplicator', () => {
  it('should return singleton instance', () => {
    const instance1 = getRequestDeduplicator();
    const instance2 = getRequestDeduplicator();
    expect(instance1).toBe(instance2);
  });
});
