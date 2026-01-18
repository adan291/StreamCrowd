/**
 * Priority Sync Queue - Service for managing prioritized overlay synchronization
 * 
 * This service implements a priority-based queue system for overlay updates,
 * ensuring critical updates are processed first while optimizing for network
 * conditions and batching opportunities.
 * 
 * Features:
 * - Priority-based queue management
 * - Batch processing for efficiency
 * - Network-aware scheduling
 * - Deadline-based processing
 * - Retry logic with exponential backoff
 * 
 * Requirements: 7.5 - Priority-based sync queuing for critical updates
 */

import {
  OverlayState,
  OverlayType,
} from '@/src/domain/entities/OverlayState';

import {
  UpdatePriority,
  PrioritizedUpdate,
  SyncQueueStats,
  BatchConfig,
  NetworkCondition,
  calculateUpdatePriority,
  createPrioritizedUpdate,
  DEFAULT_NETWORK_PRIORITIZATION_CONFIG,
} from '@/src/domain/entities/NetworkPriority';

import { IOverlaySync, SyncResult } from '@/src/domain/ports/IOverlaySync';
import { SyncError, SyncErrorType } from '@/src/domain/errors/OverlaySyncErrors';

/**
 * Configuration for the priority sync queue
 */
export interface PrioritySyncQueueConfig {
  /** Maximum queue size before dropping low priority items */
  maxQueueSize: number;
  
  /** Processing interval in milliseconds */
  processingInterval: number;
  
  /** Maximum processing time per cycle in milliseconds */
  maxProcessingTime: number;
  
  /** Batch processing configuration */
  batching: BatchConfig;
  
  /** Enable deadline-based processing */
  deadlineProcessing: boolean;
  
  /** Enable automatic queue cleanup */
  autoCleanup: boolean;
  
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  
  /** Maximum age for completed items in milliseconds */
  maxCompletedAge: number;
}

/**
 * Default configuration for the priority sync queue
 */
const DEFAULT_CONFIG: PrioritySyncQueueConfig = {
  maxQueueSize: 1000,
  processingInterval: 100, // 100ms
  maxProcessingTime: 50,   // 50ms per cycle
  batching: DEFAULT_NETWORK_PRIORITIZATION_CONFIG.batching,
  deadlineProcessing: true,
  autoCleanup: true,
  cleanupInterval: 30000,  // 30 seconds
  maxCompletedAge: 300000, // 5 minutes
};

/**
 * Queue item with processing metadata
 */
interface QueueItem<T extends OverlayState = OverlayState> extends PrioritizedUpdate<T> {
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  
  /** Timestamp when processing started */
  processingStartedAt?: number;
  
  /** Timestamp when processing completed */
  completedAt?: number;
  
  /** Last error if processing failed */
  lastError?: SyncError;
  
  /** Next retry time if applicable */
  nextRetryAt?: number;
  
  /** Batch ID if part of a batch */
  batchId?: string;
}

/**
 * Batch processing group
 */
interface ProcessingBatch {
  /** Unique batch identifier */
  id: string;
  
  /** Items in this batch */
  items: QueueItem[];
  
  /** Batch creation time */
  createdAt: number;
  
  /** Total estimated cost */
  totalCost: number;
  
  /** Batch processing deadline */
  deadline: number;
}

/**
 * Processing statistics
 */
interface ProcessingStats {
  /** Items processed in current cycle */
  itemsProcessed: number;
  
  /** Time spent processing in current cycle */
  processingTime: number;
  
  /** Batches created in current cycle */
  batchesCreated: number;
  
  /** Errors encountered in current cycle */
  errorsEncountered: number;
}

/**
 * Priority sync queue service
 */
export class PrioritySyncQueue {
  private config: PrioritySyncQueueConfig;
  private queue: QueueItem[] = [];
  private completedItems: QueueItem[] = [];
  private processingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private isDisposed = false;
  private currentNetworkCondition: NetworkCondition = 'good';
  
  // Statistics
  private stats = {
    totalQueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalExpired: 0,
    totalBatches: 0,
    averageProcessingTime: 0,
    processingTimeSum: 0,
    processingTimeCount: 0,
  };

  constructor(
    private syncAdapter: IOverlaySync,
    config: Partial<PrioritySyncQueueConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startProcessing();
    
    if (this.config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Add an overlay state update to the queue
   */
  async enqueue<T extends OverlayState>(
    state: T,
    options?: {
      priority?: UpdatePriority;
      deadline?: number;
      maxRetries?: number;
      batchable?: boolean;
    }
  ): Promise<string> {
    if (this.isDisposed) {
      throw new Error('PrioritySyncQueue has been disposed');
    }

    // Calculate priority if not provided
    const overlayConfig = DEFAULT_NETWORK_PRIORITIZATION_CONFIG.overlayPriorities[state.type] ||
                         DEFAULT_NETWORK_PRIORITIZATION_CONFIG.defaultPriority;
    
    const { priority, reason } = options?.priority 
      ? { priority: options.priority, reason: 'Explicitly set priority' }
      : calculateUpdatePriority(state, overlayConfig, this.currentNetworkCondition);

    // Create prioritized update
    const prioritizedUpdate = createPrioritizedUpdate(state, priority, {
      deadline: options?.deadline,
      maxRetries: options?.maxRetries,
      priorityReason: reason,
      batchable: options?.batchable,
    });

    // Create queue item
    const queueItem: QueueItem<T> = {
      ...prioritizedUpdate,
      status: 'pending',
    };

    // Check queue size limits
    if (this.queue.length >= this.config.maxQueueSize) {
      this.evictLowPriorityItems();
    }

    // Insert item in priority order
    this.insertInPriorityOrder(queueItem);
    
    this.stats.totalQueued++;
    
    console.log(
      `[PrioritySyncQueue] Enqueued ${state.type} update with ${priority} priority: ${reason}`,
      { queueSize: this.queue.length, updateId: queueItem.id }
    );

    return queueItem.id;
  }

  /**
   * Remove an item from the queue
   */
  dequeue(updateId: string): boolean {
    const index = this.queue.findIndex(item => item.id === updateId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get current queue statistics
   */
  getStats(): SyncQueueStats {
    const now = Date.now();
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    
    // Calculate by priority
    const byPriority: Record<UpdatePriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };
    
    pendingItems.forEach(item => {
      byPriority[item.priority]++;
    });

    // Calculate by type
    const byType: Record<OverlayType, number> = {
      poll: 0,
      giveaway: 0,
      game: 0,
      prediction: 0,
    };
    
    pendingItems.forEach(item => {
      byType[item.state.type]++;
    });

    // Calculate queue times
    const queueTimes = pendingItems.map(item => now - item.queuedAt);
    const averageQueueTime = queueTimes.length > 0 
      ? queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length 
      : 0;
    
    const oldestItemAge = queueTimes.length > 0 ? Math.max(...queueTimes) : 0;

    // Calculate processing rate
    const processingRate = this.stats.processingTimeCount > 0 
      ? this.stats.totalProcessed / (this.stats.processingTimeSum / 1000) 
      : 0;

    // Estimate clear time
    const estimatedClearTime = processingRate > 0 
      ? (pendingItems.length / processingRate) * 1000 
      : 0;

    return {
      totalItems: pendingItems.length,
      byPriority,
      byType,
      averageQueueTime,
      oldestItemAge,
      processingRate,
      estimatedClearTime,
    };
  }

  /**
   * Get detailed queue information
   */
  getQueueInfo(): {
    pending: QueueItem[];
    processing: QueueItem[];
    completed: QueueItem[];
    failed: QueueItem[];
    stats: typeof this.stats;
  } {
    return {
      pending: this.queue.filter(item => item.status === 'pending'),
      processing: this.queue.filter(item => item.status === 'processing'),
      completed: this.completedItems.filter(item => item.status === 'completed'),
      failed: this.completedItems.filter(item => item.status === 'failed'),
      stats: { ...this.stats },
    };
  }

  /**
   * Update network condition for priority calculations
   */
  updateNetworkCondition(condition: NetworkCondition): void {
    if (this.currentNetworkCondition !== condition) {
      console.log(`[PrioritySyncQueue] Network condition updated: ${this.currentNetworkCondition} → ${condition}`);
      this.currentNetworkCondition = condition;
      
      // Re-evaluate priorities for pending items if network degraded
      if (condition === 'poor' || condition === 'critical') {
        this.reevaluatePriorities();
      }
    }
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.queue = [];
    this.completedItems = [];
    console.log('[PrioritySyncQueue] Queue cleared');
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('[PrioritySyncQueue] Processing paused');
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.processingInterval && !this.isDisposed) {
      this.startProcessing();
      console.log('[PrioritySyncQueue] Processing resumed');
    }
  }

  /**
   * Dispose of the queue and clean up resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.queue = [];
    this.completedItems = [];
    
    console.log('[PrioritySyncQueue] Disposed');
  }

  // Private methods

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && !this.isDisposed) {
        this.processQueue().catch(error => {
          console.error('[PrioritySyncQueue] Processing error:', error);
        });
      }
    }, this.config.processingInterval);
  }

  /**
   * Start the cleanup loop
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedItems();
    }, this.config.cleanupInterval);
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const cycleStartTime = Date.now();
    const stats: ProcessingStats = {
      itemsProcessed: 0,
      processingTime: 0,
      batchesCreated: 0,
      errorsEncountered: 0,
    };

    try {
      // Process expired items first
      this.processExpiredItems();

      // Process items by priority and deadline
      while (
        this.queue.length > 0 && 
        stats.processingTime < this.config.maxProcessingTime &&
        !this.isDisposed
      ) {
        const itemStartTime = Date.now();
        
        // Find next item to process
        const item = this.getNextItemToProcess();
        if (!item) {
          break;
        }

        // Check if we should batch this item
        if (item.batchable && this.shouldBatch(item)) {
          const batch = this.createBatch(item);
          if (batch.items.length > 1) {
            await this.processBatch(batch);
            stats.batchesCreated++;
            stats.itemsProcessed += batch.items.length;
          } else {
            await this.processItem(item);
            stats.itemsProcessed++;
          }
        } else {
          await this.processItem(item);
          stats.itemsProcessed++;
        }

        stats.processingTime += Date.now() - itemStartTime;
      }

    } catch (error) {
      console.error('[PrioritySyncQueue] Queue processing error:', error);
      stats.errorsEncountered++;
    } finally {
      this.isProcessing = false;
      
      // Update statistics
      const totalCycleTime = Date.now() - cycleStartTime;
      this.stats.processingTimeSum += totalCycleTime;
      this.stats.processingTimeCount++;
      this.stats.averageProcessingTime = this.stats.processingTimeSum / this.stats.processingTimeCount;
      
      if (stats.itemsProcessed > 0) {
        console.log(
          `[PrioritySyncQueue] Processed ${stats.itemsProcessed} items in ${totalCycleTime}ms`,
          { batches: stats.batchesCreated, errors: stats.errorsEncountered, queueSize: this.queue.length }
        );
      }
    }
  }

  /**
   * Get the next item to process based on priority and deadline
   */
  private getNextItemToProcess(): QueueItem | null {
    const now = Date.now();
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      return null;
    }

    // Sort by priority first, then by deadline
    pendingItems.sort((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // If same priority, sort by deadline (earliest first)
      return a.deadline - b.deadline;
    });

    // Check for deadline-critical items first
    if (this.config.deadlineProcessing) {
      const urgentItem = pendingItems.find(item => 
        item.deadline - now < 1000 && item.priority !== 'low'
      );
      if (urgentItem) {
        return urgentItem;
      }
    }

    return pendingItems[0];
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.processingStartedAt = Date.now();

    try {
      const result = await this.syncAdapter.publish(item.state);
      
      if (result.success) {
        item.status = 'completed';
        item.completedAt = Date.now();
        this.moveToCompleted(item);
        this.stats.totalProcessed++;
      } else {
        await this.handleItemFailure(item, result.error);
      }
      
    } catch (error) {
      const syncError: SyncError = {
        type: SyncErrorType.UNKNOWN,
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
      };
      
      await this.handleItemFailure(item, syncError);
    }
  }

  /**
   * Handle item processing failure
   */
  private async handleItemFailure(item: QueueItem, error?: SyncError): Promise<void> {
    item.lastError = error;
    item.retryCount++;

    if (item.retryCount < item.maxRetries && error?.isRetryable !== false) {
      // Schedule retry with exponential backoff
      const backoffDelay = Math.min(
        1000 * Math.pow(2, item.retryCount - 1),
        30000 // Max 30 seconds
      );
      
      item.nextRetryAt = Date.now() + backoffDelay;
      item.status = 'pending';
      
      console.warn(
        `[PrioritySyncQueue] Item ${item.id} failed, retrying in ${backoffDelay}ms (attempt ${item.retryCount}/${item.maxRetries})`,
        { error: error?.message }
      );
    } else {
      // Max retries reached or non-retryable error
      item.status = 'failed';
      item.completedAt = Date.now();
      this.moveToCompleted(item);
      this.stats.totalFailed++;
      
      console.error(
        `[PrioritySyncQueue] Item ${item.id} failed permanently after ${item.retryCount} attempts`,
        { error: error?.message }
      );
    }
  }

  /**
   * Check if an item should be batched
   */
  private shouldBatch(item: QueueItem): boolean {
    if (!item.batchable || this.currentNetworkCondition === 'critical') {
      return false;
    }

    // Don't batch critical items unless network is good
    if (item.priority === 'critical' && this.currentNetworkCondition !== 'excellent' && this.currentNetworkCondition !== 'good') {
      return false;
    }

    // Look for other batchable items of the same type
    const batchableItems = this.queue.filter(queueItem => 
      queueItem.status === 'pending' &&
      queueItem.batchable &&
      queueItem.state.type === item.state.type &&
      queueItem.priority === item.priority
    );

    return batchableItems.length > 1;
  }

  /**
   * Create a batch from compatible items
   */
  private createBatch(leadItem: QueueItem): ProcessingBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const batchItems: QueueItem[] = [leadItem];
    let totalCost = leadItem.estimatedCost;
    
    // Find other compatible items
    const compatibleItems = this.queue.filter(item => 
      item.id !== leadItem.id &&
      item.status === 'pending' &&
      item.batchable &&
      item.state.type === leadItem.state.type &&
      item.priority === leadItem.priority
    );

    // Add items to batch up to limits
    for (const item of compatibleItems) {
      if (
        batchItems.length >= this.config.batching.maxBatchSize ||
        totalCost + item.estimatedCost > this.config.batching.maxBatchCost
      ) {
        break;
      }
      
      batchItems.push(item);
      totalCost += item.estimatedCost;
    }

    // Set batch ID on all items
    batchItems.forEach(item => {
      item.batchId = batchId;
    });

    const earliestDeadline = Math.min(...batchItems.map(item => item.deadline));

    return {
      id: batchId,
      items: batchItems,
      createdAt: Date.now(),
      totalCost,
      deadline: earliestDeadline,
    };
  }

  /**
   * Process a batch of items
   */
  private async processBatch(batch: ProcessingBatch): Promise<void> {
    console.log(`[PrioritySyncQueue] Processing batch ${batch.id} with ${batch.items.length} items`);
    
    // Mark all items as processing
    batch.items.forEach(item => {
      item.status = 'processing';
      item.processingStartedAt = Date.now();
    });

    try {
      // Process all items in the batch concurrently
      const results = await Promise.allSettled(
        batch.items.map(item => this.syncAdapter.publish(item.state))
      );

      // Handle results
      results.forEach((result, index) => {
        const item = batch.items[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          item.status = 'completed';
          item.completedAt = Date.now();
          this.moveToCompleted(item);
          this.stats.totalProcessed++;
        } else {
          const error = result.status === 'fulfilled' 
            ? result.value.error 
            : {
                type: SyncErrorType.UNKNOWN,
                code: 'BATCH_PROCESSING_ERROR',
                message: 'Batch processing failed',
                isRetryable: true,
                requiresReauth: false,
                timestamp: Date.now(),
              } as SyncError;
          
          this.handleItemFailure(item, error);
        }
      });

      this.stats.totalBatches++;
      
    } catch (error) {
      console.error(`[PrioritySyncQueue] Batch ${batch.id} processing error:`, error);
      
      // Mark all items as failed
      batch.items.forEach(item => {
        const syncError: SyncError = {
          type: SyncErrorType.UNKNOWN,
          code: 'BATCH_ERROR',
          message: error instanceof Error ? error.message : 'Batch processing error',
          isRetryable: true,
          requiresReauth: false,
          timestamp: Date.now(),
        };
        
        this.handleItemFailure(item, syncError);
      });
    }
  }

  /**
   * Process expired items
   */
  private processExpiredItems(): void {
    const now = Date.now();
    const expiredItems = this.queue.filter(item => 
      item.status === 'pending' && item.deadline < now
    );

    expiredItems.forEach(item => {
      item.status = 'expired';
      item.completedAt = now;
      this.moveToCompleted(item);
      this.stats.totalExpired++;
    });

    if (expiredItems.length > 0) {
      console.warn(`[PrioritySyncQueue] ${expiredItems.length} items expired`);
    }
  }

  /**
   * Insert item in priority order
   */
  private insertInPriorityOrder(item: QueueItem): void {
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const existingItem = this.queue[i];
      
      // Compare priority first
      if (priorityOrder[item.priority] > priorityOrder[existingItem.priority]) {
        insertIndex = i;
        break;
      }
      
      // If same priority, compare deadline
      if (
        priorityOrder[item.priority] === priorityOrder[existingItem.priority] &&
        item.deadline < existingItem.deadline
      ) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, item);
  }

  /**
   * Evict low priority items when queue is full
   */
  private evictLowPriorityItems(): void {
    // Remove oldest low priority items first
    const lowPriorityItems = this.queue
      .filter(item => item.priority === 'low' && item.status === 'pending')
      .sort((a, b) => a.queuedAt - b.queuedAt);

    if (lowPriorityItems.length > 0) {
      const evicted = lowPriorityItems[0];
      this.dequeue(evicted.id);
      console.warn(`[PrioritySyncQueue] Evicted low priority item ${evicted.id} due to queue size limit`);
    } else {
      // If no low priority items, remove oldest normal priority item
      const normalPriorityItems = this.queue
        .filter(item => item.priority === 'normal' && item.status === 'pending')
        .sort((a, b) => a.queuedAt - b.queuedAt);

      if (normalPriorityItems.length > 0) {
        const evicted = normalPriorityItems[0];
        this.dequeue(evicted.id);
        console.warn(`[PrioritySyncQueue] Evicted normal priority item ${evicted.id} due to queue size limit`);
      }
    }
  }

  /**
   * Re-evaluate priorities for pending items
   */
  private reevaluatePriorities(): void {
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    let priorityChanges = 0;

    pendingItems.forEach(item => {
      const overlayConfig = DEFAULT_NETWORK_PRIORITIZATION_CONFIG.overlayPriorities[item.state.type] ||
                           DEFAULT_NETWORK_PRIORITIZATION_CONFIG.defaultPriority;
      
      const { priority: newPriority, reason } = calculateUpdatePriority(
        item.state,
        overlayConfig,
        this.currentNetworkCondition
      );

      if (newPriority !== item.priority) {
        item.priority = newPriority;
        item.priorityReason = reason;
        priorityChanges++;
      }
    });

    if (priorityChanges > 0) {
      // Re-sort queue after priority changes
      this.queue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        return a.deadline - b.deadline;
      });

      console.log(`[PrioritySyncQueue] Re-evaluated priorities for ${priorityChanges} items due to network condition change`);
    }
  }

  /**
   * Move item to completed list
   */
  private moveToCompleted(item: QueueItem): void {
    const index = this.queue.findIndex(queueItem => queueItem.id === item.id);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.completedItems.push(item);
    }
  }

  /**
   * Clean up old completed items
   */
  private cleanupCompletedItems(): void {
    const now = Date.now();
    const initialCount = this.completedItems.length;
    
    this.completedItems = this.completedItems.filter(item => 
      !item.completedAt || (now - item.completedAt) < this.config.maxCompletedAge
    );

    const cleanedCount = initialCount - this.completedItems.length;
    if (cleanedCount > 0) {
      console.log(`[PrioritySyncQueue] Cleaned up ${cleanedCount} old completed items`);
    }
  }
}