/**
 * RequestDeduplicator
 * 
 * Deduplicates concurrent API requests to prevent redundant network calls.
 * When multiple components request the same data simultaneously, only one
 * request is made and the result is shared.
 * 
 * @example
 * const deduplicator = new RequestDeduplicator();
 * 
 * // Multiple calls with same key will share the same request
 * const [result1, result2] = await Promise.all([
 *   deduplicator.dedupe('user-123', () => fetchUser(123)),
 *   deduplicator.dedupe('user-123', () => fetchUser(123)),
 * ]);
 * // Only one fetch was made, both get the same result
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface DeduplicatorOptions {
  /** Time-to-live for cached results in milliseconds (default: 5000) */
  ttl?: number;
  /** Maximum number of cached entries (default: 100) */
  maxEntries?: number;
}

export class RequestDeduplicator {
  private pending: Map<string, PendingRequest<any>> = new Map();
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private ttl: number;
  private maxEntries: number;

  constructor(options: DeduplicatorOptions = {}) {
    this.ttl = options.ttl ?? 5000;
    this.maxEntries = options.maxEntries ?? 100;
  }

  /**
   * Deduplicate a request by key
   * @param key - Unique identifier for the request
   * @param fetcher - Function that performs the actual request
   * @param options - Optional per-request configuration
   * @returns Promise resolving to the request result
   */
  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; skipCache?: boolean }
  ): Promise<T> {
    const requestTtl = options?.ttl ?? this.ttl;
    const skipCache = options?.skipCache ?? false;

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < requestTtl) {
        return cached.value as T;
      }
    }

    // Check if there's already a pending request
    const pending = this.pending.get(key);
    if (pending && Date.now() - pending.timestamp < requestTtl) {
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = fetcher()
      .then((result) => {
        // Cache the result
        this.setCache(key, result, requestTtl);
        return result;
      })
      .finally(() => {
        // Clean up pending request after a short delay
        // This allows for rapid successive calls to still dedupe
        setTimeout(() => {
          const current = this.pending.get(key);
          if (current?.promise === promise) {
            this.pending.delete(key);
          }
        }, 100);
      });

    this.pending.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  /**
   * Invalidate a cached entry
   * @param key - Key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pending.delete(key);
  }

  /**
   * Invalidate all entries matching a pattern
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pending.keys()) {
      if (pattern.test(key)) {
        this.pending.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { cacheSize: number; pendingSize: number } {
    return {
      cacheSize: this.cache.size,
      pendingSize: this.pending.size,
    };
  }

  private setCache(key: string, value: any, ttl: number): void {
    // Enforce max entries limit
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });

    // Schedule cleanup
    setTimeout(() => {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp >= ttl) {
        this.cache.delete(key);
      }
    }, ttl);
  }
}

// Singleton instance for global use
let globalDeduplicator: RequestDeduplicator | null = null;

export function getRequestDeduplicator(): RequestDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new RequestDeduplicator();
  }
  return globalDeduplicator;
}

export default RequestDeduplicator;
