/**
 * BatchUpdateOptimizer - Optimizes React state updates by batching them
 * Reduces re-renders and improves performance during high-frequency updates
 * Critical for chat messages, viewer counts, and real-time data
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

export interface BatchConfig {
  maxBatchSize?: number;
  batchDelay?: number;
  priority?: 'low' | 'normal' | 'high';
  deduplicateBy?: string | ((item: any) => string);
}

export interface BatchedUpdate<T = any> {
  id: string;
  data: T;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  callback: (data: T) => void;
}

export interface BatchStats {
  totalUpdates: number;
  batchedUpdates: number;
  duplicatesFiltered: number;
  averageBatchSize: number;
  averageDelay: number;
}

export class BatchUpdateOptimizer {
  private static instance: BatchUpdateOptimizer;
  private updateQueues = new Map<string, BatchedUpdate[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private stats: BatchStats = {
    totalUpdates: 0,
    batchedUpdates: 0,
    duplicatesFiltered: 0,
    averageBatchSize: 0,
    averageDelay: 0
  };
  private batchSizes: number[] = [];
  private batchDelays: number[] = [];

  private constructor() {}

  public static getInstance(): BatchUpdateOptimizer {
    if (!BatchUpdateOptimizer.instance) {
      BatchUpdateOptimizer.instance = new BatchUpdateOptimizer();
    }
    return BatchUpdateOptimizer.instance;
  }

  /**
   * Schedule a batched update
   */
  public scheduleUpdate<T>(
    queueKey: string,
    data: T,
    callback: (data: T) => void,
    config: BatchConfig = {}
  ): void {
    const {
      maxBatchSize = 50,
      batchDelay = 16, // ~60fps
      priority = 'normal',
      deduplicateBy
    } = config;

    this.stats.totalUpdates++;

    const update: BatchedUpdate<T> = {
      id: this.generateUpdateId(),
      data,
      timestamp: Date.now(),
      priority,
      callback: callback as (data: any) => void
    };

    // Initialize queue if it doesn't exist
    if (!this.updateQueues.has(queueKey)) {
      this.updateQueues.set(queueKey, []);
    }

    const queue = this.updateQueues.get(queueKey)!;

    // Handle deduplication
    if (deduplicateBy) {
      const dedupeKey = typeof deduplicateBy === 'string' 
        ? (data as any)[deduplicateBy]
        : deduplicateBy(data);
      
      const existingIndex = queue.findIndex(item => {
        const existingKey = typeof deduplicateBy === 'string'
          ? (item.data as any)[deduplicateBy]
          : deduplicateBy(item.data);
        return existingKey === dedupeKey;
      });

      if (existingIndex !== -1) {
        // Replace existing update
        queue[existingIndex] = update;
        this.stats.duplicatesFiltered++;
        return;
      }
    }

    // Insert update based on priority
    if (priority === 'high') {
      queue.unshift(update);
    } else {
      queue.push(update);
    }

    // Process batch if size limit reached or high priority
    if (queue.length >= maxBatchSize || priority === 'high') {
      this.processBatch(queueKey);
    } else {
      // Schedule batch processing
      this.scheduleBatchProcessing(queueKey, batchDelay);
    }
  }

  /**
   * Process batch immediately
   */
  public flushBatch(queueKey: string): void {
    this.processBatch(queueKey);
  }

  /**
   * Flush all batches
   */
  public flushAll(): void {
    for (const queueKey of this.updateQueues.keys()) {
      this.processBatch(queueKey);
    }
  }

  /**
   * Get batch statistics
   */
  public getStats(): BatchStats {
    return {
      ...this.stats,
      averageBatchSize: this.calculateAverage(this.batchSizes),
      averageDelay: this.calculateAverage(this.batchDelays)
    };
  }

  /**
   * Clear all queues and reset stats
   */
  public clear(): void {
    // Clear timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.updateQueues.clear();

    // Reset stats
    this.stats = {
      totalUpdates: 0,
      batchedUpdates: 0,
      duplicatesFiltered: 0,
      averageBatchSize: 0,
      averageDelay: 0
    };
    this.batchSizes = [];
    this.batchDelays = [];
  }

  /**
   * Schedule batch processing with timer
   */
  private scheduleBatchProcessing(queueKey: string, delay: number): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(queueKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(queueKey);
    }, delay);

    this.batchTimers.set(queueKey, timer);
  }

  /**
   * Process batch of updates
   */
  private processBatch(queueKey: string): void {
    const queue = this.updateQueues.get(queueKey);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(timer);
    }

    // Extract updates from queue
    const updates = queue.splice(0);
    const batchStartTime = Date.now();

    // Record batch size
    this.batchSizes.push(updates.length);
    if (this.batchSizes.length > 100) {
      this.batchSizes.shift();
    }

    // Group updates by priority
    const highPriority = updates.filter(u => u.priority === 'high');
    const normalPriority = updates.filter(u => u.priority === 'normal');
    const lowPriority = updates.filter(u => u.priority === 'low');

    // Process in priority order using React's batched updates
    unstable_batchedUpdates(() => {
      // Process high priority first
      highPriority.forEach(update => {
        try {
          update.callback(update.data);
        } catch (error) {
          console.error('Error in high priority batch update:', error);
        }
      });

      // Then normal priority
      normalPriority.forEach(update => {
        try {
          update.callback(update.data);
        } catch (error) {
          console.error('Error in normal priority batch update:', error);
        }
      });

      // Finally low priority
      lowPriority.forEach(update => {
        try {
          update.callback(update.data);
        } catch (error) {
          console.error('Error in low priority batch update:', error);
        }
      });
    });

    // Record batch delay
    const oldestUpdate = updates.reduce((oldest, current) => 
      current.timestamp < oldest.timestamp ? current : oldest
    );
    const batchDelay = batchStartTime - oldestUpdate.timestamp;
    
    this.batchDelays.push(batchDelay);
    if (this.batchDelays.length > 100) {
      this.batchDelays.shift();
    }

    this.stats.batchedUpdates += updates.length;
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}

/**
 * React hook for batched state updates
 */
export function useBatchedUpdates<T>(
  initialState: T,
  config: BatchConfig = {}
): [T, (newState: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const optimizer = useRef(BatchUpdateOptimizer.getInstance());
  const queueKey = useRef(`state_${Math.random().toString(36).substr(2, 9)}`);

  const batchedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    const updateData = typeof newState === 'function' 
      ? (newState as (prev: T) => T)(state)
      : newState;

    optimizer.current.scheduleUpdate(
      queueKey.current,
      updateData,
      setState,
      config
    );
  }, [state, config]);

  const flushUpdates = useCallback(() => {
    optimizer.current.flushBatch(queueKey.current);
  }, []);

  return [state, batchedSetState, flushUpdates];
}

/**
 * Hook for batching array updates (like chat messages)
 */
export function useBatchedArrayUpdates<T>(
  initialArray: T[] = [],
  config: BatchConfig & { maxItems?: number } = {}
): [T[], (items: T | T[]) => void, () => void] {
  const { maxItems = 1000, ...batchConfig } = config;
  const [array, setArray] = useBatchedUpdates<T[]>(initialArray, batchConfig);

  const addItems = useCallback((items: T | T[]) => {
    const itemsToAdd = Array.isArray(items) ? items : [items];
    
    setArray(prevArray => {
      const newArray = [...prevArray, ...itemsToAdd];
      
      // Trim array if it exceeds max items
      if (newArray.length > maxItems) {
        return newArray.slice(-maxItems);
      }
      
      return newArray;
    });
  }, [setArray, maxItems]);

  const clearArray = useCallback(() => {
    setArray([]);
  }, [setArray]);

  return [array, addItems, clearArray];
}

/**
 * Hook for batching object updates
 */
export function useBatchedObjectUpdates<T extends Record<string, any>>(
  initialObject: T,
  config: BatchConfig = {}
): [T, (updates: Partial<T>) => void, () => void] {
  const [object, setObject] = useBatchedUpdates<T>(initialObject, {
    ...config,
    deduplicateBy: config.deduplicateBy || ((update: Partial<T>) => 
      Object.keys(update).sort().join(',')
    )
  });

  const updateObject = useCallback((updates: Partial<T>) => {
    setObject(prevObject => ({ ...prevObject, ...updates }));
  }, [setObject]);

  const resetObject = useCallback(() => {
    setObject(initialObject);
  }, [setObject, initialObject]);

  return [object, updateObject, resetObject];
}

/**
 * Specialized hook for chat message batching
 */
export function useBatchedChatMessages(maxMessages: number = 500) {
  return useBatchedArrayUpdates<any>([], {
    maxBatchSize: 20,
    batchDelay: 50, // 20fps for chat
    priority: 'normal',
    deduplicateBy: 'id',
    maxItems: maxMessages
  });
}

/**
 * Specialized hook for viewer count batching
 */
export function useBatchedViewerCount(initialCount: number = 0) {
  return useBatchedUpdates<number>(initialCount, {
    maxBatchSize: 1,
    batchDelay: 1000, // Update viewer count max once per second
    priority: 'low',
    deduplicateBy: () => 'viewer_count' // Always deduplicate
  });
}

/**
 * Specialized hook for poll vote batching
 */
export function useBatchedPollVotes() {
  return useBatchedObjectUpdates<Record<string, number>>({}, {
    maxBatchSize: 10,
    batchDelay: 100, // 10fps for vote updates
    priority: 'normal'
  });
}

/**
 * Performance monitoring hook for batch updates
 */
export function useBatchUpdatePerformance() {
  const optimizer = useRef(BatchUpdateOptimizer.getInstance());
  const [stats, setStats] = useState<BatchStats>(optimizer.current.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(optimizer.current.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearStats = useCallback(() => {
    optimizer.current.clear();
    setStats(optimizer.current.getStats());
  }, []);

  return { stats, clearStats };
}