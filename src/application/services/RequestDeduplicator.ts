/**
 * RequestDeduplicator - Prevents duplicate API requests and optimizes batch operations
 * Reduces server load and improves response times through intelligent caching and batching
 */

export interface DeduplicationConfig {
  ttl?: number; // Time to live for cached results (ms)
  retryAttempts?: number;
  retryDelay?: number;
  enableBatching?: boolean;
}

export interface BatchConfig {
  batchSize?: number;
  batchDelay?: number;
  maxWaitTime?: number;
}

export interface DeduplicationStats {
  totalRequests: number;
  duplicatesFiltered: number;
  cacheHits: number;
  cacheMisses: number;
  retryAttempts: number;
  failedRequests: number;
  batchedRequests: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface BatchEntry<T, R> {
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class RequestDeduplicator {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueues = new Map<string, BatchEntry<any, any>[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  
  private stats: DeduplicationStats = {
    totalRequests: 0,
    duplicatesFiltered: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retryAttempts: 0,
    failedRequests: 0,
    batchedRequests: 0
  };

  /**
   * Execute a request with deduplication and caching
   */
  public async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: DeduplicationConfig = {}
  ): Promise<T> {
    const {
      ttl = 30000, // 30 seconds default
      retryAttempts = 0,
      retryDelay = 1000
    } = config;

    this.stats.totalRequests++;

    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.stats.duplicatesFiltered++;
      return pending;
    }

    // Execute request with retry logic
    const requestPromise = this.executeWithRetry(requestFn, retryAttempts, retryDelay);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      this.setCache(key, result, ttl);
      
      return result;
    } catch (error) {
      this.stats.failedRequests++;
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Execute batched requests
   */
  public async executeBatchedRequest<T, R>(
    batchKey: string,
    data: T,
    batchProcessor: (items: T[]) => Promise<R[]>,
    config: BatchConfig = {}
  ): Promise<R> {
    const {
      batchSize = 10,
      batchDelay = 100,
      maxWaitTime = 5000
    } = config;

    this.stats.totalRequests++;

    return new Promise<R>((resolve, reject) => {
      // Initialize batch queue if needed
      if (!this.batchQueues.has(batchKey)) {
        this.batchQueues.set(batchKey, []);
      }

      const queue = this.batchQueues.get(batchKey)!;
      
      // Add to batch queue
      queue.push({
        data,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Process batch if size limit reached
      if (queue.length >= batchSize) {
        this.processBatch(batchKey, batchProcessor);
      } else {
        // Schedule batch processing
        this.scheduleBatchProcessing(batchKey, batchProcessor, batchDelay, maxWaitTime);
      }
    });
  }

  /**
   * Get deduplication statistics
   */
  public getStats(): DeduplicationStats {
    return { ...this.stats };
  }

  /**
   * Clear cache and reset stats
   */
  public clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    
    // Clear batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.batchQueues.clear();

    this.stats = {
      totalRequests: 0,
      duplicatesFiltered: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryAttempts: 0,
      failedRequests: 0,
      batchedRequests: 0
    };
  }

  /**
   * Manually invalidate cache entry
   */
  public invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get cache size and cleanup old entries
   */
  public cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          this.stats.retryAttempts++;
          
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing<T, R>(
    batchKey: string,
    batchProcessor: (items: T[]) => Promise<R[]>,
    batchDelay: number,
    maxWaitTime: number
  ): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Check if oldest item exceeds max wait time
    const queue = this.batchQueues.get(batchKey);
    if (queue && queue.length > 0) {
      const oldestTimestamp = Math.min(...queue.map(item => item.timestamp));
      const waitTime = Date.now() - oldestTimestamp;
      
      if (waitTime >= maxWaitTime) {
        // Process immediately if max wait time exceeded
        this.processBatch(batchKey, batchProcessor);
        return;
      }
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(batchKey, batchProcessor);
    }, batchDelay);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Process batch queue
   */
  private async processBatch<T, R>(
    batchKey: string,
    batchProcessor: (items: T[]) => Promise<R[]>
  ): Promise<void> {
    const queue = this.batchQueues.get(batchKey);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Extract batch items
    const batchItems = queue.splice(0);
    const batchData = batchItems.map(item => item.data);
    
    this.stats.batchedRequests += batchItems.length;

    try {
      const results = await batchProcessor(batchData);
      
      // Resolve individual promises
      batchItems.forEach((item, index) => {
        if (results[index] !== undefined) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error(`No result for batch item at index ${index}`));
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batchItems.forEach(item => {
        item.reject(error as Error);
      });
      
      this.stats.failedRequests += batchItems.length;
    }
  }
}

/**
 * React hook for request deduplication
 */
export function useRequestDeduplication() {
  const deduplicator = new RequestDeduplicator();

  const executeRequest = async <T>(
    key: string,
    requestFn: () => Promise<T>,
    config?: DeduplicationConfig
  ) => {
    return deduplicator.executeRequest(key, requestFn, config);
  };

  const executeBatchedRequest = async <T, R>(
    batchKey: string,
    data: T,
    batchProcessor: (items: T[]) => Promise<R[]>,
    config?: BatchConfig
  ) => {
    return deduplicator.executeBatchedRequest(batchKey, data, batchProcessor, config);
  };

  const getStats = () => deduplicator.getStats();
  const clear = () => deduplicator.clear();
  const invalidateCache = (key: string) => deduplicator.invalidateCache(key);

  return {
    executeRequest,
    executeBatchedRequest,
    getStats,
    clear,
    invalidateCache
  };
}