/**
 * Network Prioritization Service - Main orchestrator for network-aware overlay synchronization
 * 
 * This service integrates network condition detection with priority-based sync queuing
 * to ensure critical overlay updates are delivered efficiently even under poor network
 * conditions.
 * 
 * Features:
 * - Network condition monitoring and adaptation
 * - Critical update prioritization
 * - Intelligent batching and throttling
 * - Performance monitoring and diagnostics
 * - Fallback mode for critical network conditions
 * 
 * Requirements: 7.5 - Critical Update Prioritization
 */

import { OverlayState, OverlayType } from '@/src/domain/entities/OverlayState';
import {
  NetworkCondition,
  NetworkConditionAssessment,
  UpdatePriority,
  NetworkPrioritizationConfig,
  DEFAULT_NETWORK_PRIORITIZATION_CONFIG,
} from '@/src/domain/entities/NetworkPriority';

import { IOverlaySync, SyncResult } from '@/src/domain/ports/IOverlaySync';
import { NetworkConditionDetector } from './NetworkConditionDetector';
import { PrioritySyncQueue } from './PrioritySyncQueue';

/**
 * Configuration for the network prioritization service
 */
export interface NetworkPrioritizationServiceConfig {
  /** Enable network prioritization */
  enabled: boolean;
  
  /** Network prioritization configuration */
  prioritization: NetworkPrioritizationConfig;
  
  /** Enable fallback mode for critical network conditions */
  fallbackMode: boolean;
  
  /** Fallback mode threshold */
  fallbackThreshold: NetworkCondition;
  
  /** Enable performance monitoring */
  monitoringEnabled: boolean;
  
  /** Performance monitoring interval in milliseconds */
  monitoringInterval: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: NetworkPrioritizationServiceConfig = {
  enabled: true,
  prioritization: DEFAULT_NETWORK_PRIORITIZATION_CONFIG,
  fallbackMode: true,
  fallbackThreshold: 'critical',
  monitoringEnabled: true,
  monitoringInterval: 10000, // 10 seconds
};

/**
 * Performance metrics for network prioritization
 */
export interface NetworkPrioritizationMetrics {
  /** Current network condition */
  networkCondition: NetworkCondition;
  
  /** Network condition confidence */
  networkConfidence: number;
  
  /** Queue statistics */
  queueStats: {
    totalItems: number;
    criticalItems: number;
    highPriorityItems: number;
    averageQueueTime: number;
    processingRate: number;
  };
  
  /** Prioritization statistics */
  prioritizationStats: {
    totalUpdates: number;
    criticalUpdates: number;
    priorityElevations: number;
    networkAdaptations: number;
  };
  
  /** Performance statistics */
  performanceStats: {
    averageLatency: number;
    successRate: number;
    fallbackModeActive: boolean;
    adaptationCount: number;
  };
  
  /** Timestamp of metrics */
  timestamp: number;
}

/**
 * Network prioritization service
 */
export class NetworkPrioritizationService {
  private config: NetworkPrioritizationServiceConfig;
  private networkDetector: NetworkConditionDetector;
  private syncQueue: PrioritySyncQueue;
  private isDisposed = false;
  private fallbackModeActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Statistics
  private stats = {
    totalUpdates: 0,
    criticalUpdates: 0,
    priorityElevations: 0,
    networkAdaptations: 0,
    adaptationCount: 0,
    latencySum: 0,
    latencyCount: 0,
    successCount: 0,
    failureCount: 0,
  };

  // Listeners
  private networkConditionListeners: Array<(condition: NetworkCondition) => void> = [];
  private fallbackModeListeners: Array<(active: boolean) => void> = [];

  constructor(
    private syncAdapter: IOverlaySync,
    config: Partial<NetworkPrioritizationServiceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize network condition detector
    this.networkDetector = new NetworkConditionDetector({
      enabled: this.config.enabled,
      baseInterval: this.config.prioritization.assessmentInterval,
    });
    
    // Initialize priority sync queue
    this.syncQueue = new PrioritySyncQueue(syncAdapter, {
      batching: this.config.prioritization.batching,
    });
    
    // Subscribe to network condition changes
    this.networkDetector.subscribe(this.handleNetworkConditionChange.bind(this));
    
    // Start monitoring if enabled
    if (this.config.enabled) {
      this.start();
    }
    
    // Start performance monitoring if enabled
    if (this.config.monitoringEnabled) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Start the network prioritization service
   */
  start(): void {
    if (!this.config.enabled || this.isDisposed) {
      return;
    }

    this.networkDetector.start();
    console.log('[NetworkPrioritizationService] Started network prioritization');
  }

  /**
   * Stop the network prioritization service
   */
  stop(): void {
    this.networkDetector.stop();
    this.syncQueue.pause();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('[NetworkPrioritizationService] Stopped network prioritization');
  }

  /**
   * Publish overlay state with network prioritization
   */
  async publish<T extends OverlayState>(
    state: T,
    options?: {
      priority?: UpdatePriority;
      bypassQueue?: boolean;
      deadline?: number;
    }
  ): Promise<SyncResult> {
    if (this.isDisposed) {
      throw new Error('NetworkPrioritizationService has been disposed');
    }

    const startTime = Date.now();
    this.stats.totalUpdates++;

    try {
      // Check if we should bypass the queue (for critical items in good network conditions)
      if (options?.bypassQueue || this.shouldBypassQueue(state, options?.priority)) {
        const result = await this.syncAdapter.publish(state);
        this.recordResult(result, startTime);
        
        // Add priority metadata
        if (result.metadata) {
          result.metadata.priority = options?.priority || 'normal';
          result.metadata.bypassed = true;
        } else {
          result.metadata = {
            priority: options?.priority || 'normal',
            bypassed: true,
          };
        }
        
        return result;
      }

      // Add to priority queue
      const updateId = await this.syncQueue.enqueue(state, {
        priority: options?.priority,
        deadline: options?.deadline,
      });

      // For critical updates, we might want to wait for completion
      if (options?.priority === 'critical' || this.isCriticalUpdate(state)) {
        this.stats.criticalUpdates++;
        
        // In fallback mode, process critical updates immediately
        if (this.fallbackModeActive) {
          return await this.syncAdapter.publish(state);
        }
      }

      // Return success for queued items (actual sync happens asynchronously)
      return {
        success: true,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
        metadata: {
          queued: true,
          updateId,
          priority: options?.priority || 'normal',
        },
      };

    } catch (error) {
      this.stats.failureCount++;
      
      return {
        success: false,
        error: {
          type: 'unknown',
          code: 'PRIORITIZATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown prioritization error',
          isRetryable: true,
          requiresReauth: false,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current network condition
   */
  getCurrentNetworkCondition(): NetworkCondition {
    return this.networkDetector.getCurrentCondition();
  }

  /**
   * Get current network assessment
   */
  getCurrentNetworkAssessment(): NetworkConditionAssessment | undefined {
    return this.networkDetector.getCurrentAssessment();
  }

  /**
   * Check if fallback mode is active
   */
  isFallbackModeActive(): boolean {
    return this.fallbackModeActive;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): NetworkPrioritizationMetrics {
    const networkAssessment = this.networkDetector.getCurrentAssessment();
    const queueStats = this.syncQueue.getStats();
    const queueInfo = this.syncQueue.getQueueInfo();

    return {
      networkCondition: networkAssessment?.condition || 'good',
      networkConfidence: networkAssessment?.confidence || 0,
      queueStats: {
        totalItems: queueStats.totalItems,
        criticalItems: queueStats.byPriority.critical,
        highPriorityItems: queueStats.byPriority.high,
        averageQueueTime: queueStats.averageQueueTime,
        processingRate: queueStats.processingRate,
      },
      prioritizationStats: {
        totalUpdates: this.stats.totalUpdates,
        criticalUpdates: this.stats.criticalUpdates,
        priorityElevations: this.stats.priorityElevations,
        networkAdaptations: this.stats.networkAdaptations,
      },
      performanceStats: {
        averageLatency: this.stats.latencyCount > 0 
          ? this.stats.latencySum / this.stats.latencyCount 
          : 0,
        successRate: this.stats.totalUpdates > 0 
          ? (this.stats.successCount / this.stats.totalUpdates) * 100 
          : 0,
        fallbackModeActive: this.fallbackModeActive,
        adaptationCount: this.stats.adaptationCount,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Subscribe to network condition changes
   */
  onNetworkConditionChange(callback: (condition: NetworkCondition) => void): () => void {
    this.networkConditionListeners.push(callback);
    
    // Send current condition
    callback(this.getCurrentNetworkCondition());
    
    return () => {
      const index = this.networkConditionListeners.indexOf(callback);
      if (index >= 0) {
        this.networkConditionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to fallback mode changes
   */
  onFallbackModeChange(callback: (active: boolean) => void): () => void {
    this.fallbackModeListeners.push(callback);
    
    // Send current state
    callback(this.fallbackModeActive);
    
    return () => {
      const index = this.fallbackModeListeners.indexOf(callback);
      if (index >= 0) {
        this.fallbackModeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Force network condition assessment
   */
  async assessNetworkNow(): Promise<NetworkConditionAssessment> {
    return await this.networkDetector.assessNow();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NetworkPrioritizationServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update network detector config
    this.networkDetector.updateConfig({
      enabled: this.config.enabled,
      baseInterval: this.config.prioritization.assessmentInterval,
    });
    
    // Restart if needed
    if (this.config.enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Clear the sync queue
   */
  clearQueue(): void {
    this.syncQueue.clear();
  }

  /**
   * Get queue information
   */
  getQueueInfo(): ReturnType<PrioritySyncQueue['getQueueInfo']> {
    return this.syncQueue.getQueueInfo();
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    this.stop();
    
    this.networkDetector.dispose();
    this.syncQueue.dispose();
    
    this.networkConditionListeners = [];
    this.fallbackModeListeners = [];
    
    console.log('[NetworkPrioritizationService] Disposed');
  }

  // Private methods

  /**
   * Handle network condition changes
   */
  private handleNetworkConditionChange(assessment: NetworkConditionAssessment): void {
    const previousCondition = this.syncQueue ? this.getCurrentNetworkCondition() : 'good';
    const newCondition = assessment.condition;

    // Update sync queue with new network condition
    this.syncQueue.updateNetworkCondition(newCondition);

    // Check if we should enable/disable fallback mode
    if (this.config.fallbackMode) {
      const shouldActivateFallback = this.shouldActivateFallbackMode(newCondition);
      
      if (shouldActivateFallback !== this.fallbackModeActive) {
        this.setFallbackMode(shouldActivateFallback);
      }
    }

    // Track network adaptations
    if (previousCondition !== newCondition) {
      this.stats.networkAdaptations++;
      this.stats.adaptationCount++;
      
      console.log(
        `[NetworkPrioritizationService] Network condition changed: ${previousCondition} → ${newCondition}`,
        { 
          confidence: assessment.confidence,
          fallbackMode: this.fallbackModeActive,
          recommendations: assessment.recommendations.length,
        }
      );
    }

    // Notify listeners
    this.networkConditionListeners.forEach(listener => {
      try {
        listener(newCondition);
      } catch (error) {
        console.warn('[NetworkPrioritizationService] Network condition listener error:', error);
      }
    });
  }

  /**
   * Check if we should bypass the queue for this update
   */
  private shouldBypassQueue<T extends OverlayState>(
    state: T,
    priority?: UpdatePriority
  ): boolean {
    // Always bypass for critical updates in good network conditions
    if (priority === 'critical' && this.getCurrentNetworkCondition() === 'excellent') {
      return true;
    }

    // Bypass if fallback mode is active and this is a critical update
    if (this.fallbackModeActive && this.isCriticalUpdate(state)) {
      return true;
    }

    // Bypass if queue is empty and network is good
    const queueStats = this.syncQueue.getStats();
    if (queueStats.totalItems === 0 && 
        (this.getCurrentNetworkCondition() === 'excellent' || this.getCurrentNetworkCondition() === 'good')) {
      return true;
    }

    return false;
  }

  /**
   * Check if an update is critical based on state content
   */
  private isCriticalUpdate<T extends OverlayState>(state: T): boolean {
    const overlayConfig = this.config.prioritization.overlayPriorities[state.type] ||
                         this.config.prioritization.defaultPriority;
    
    // Check critical conditions
    for (const condition of overlayConfig.criticalConditions) {
      if (this.evaluateCondition(state, condition)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate a condition against state
   */
  private evaluateCondition<T extends OverlayState>(
    state: T,
    condition: { field: string; value: unknown; operator?: string }
  ): boolean {
    const fieldValue = this.getNestedValue(state, condition.field);
    const operator = condition.operator || 'equals';
    
    switch (operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && 
               fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && 
               fieldValue < condition.value;
      default:
        return false;
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' && key in current 
        ? (current as Record<string, unknown>)[key] 
        : undefined;
    }, obj);
  }

  /**
   * Check if fallback mode should be activated
   */
  private shouldActivateFallbackMode(condition: NetworkCondition): boolean {
    const thresholdOrder = { excellent: 5, good: 4, fair: 3, poor: 2, critical: 1 };
    const currentLevel = thresholdOrder[condition];
    const thresholdLevel = thresholdOrder[this.config.fallbackThreshold];
    
    return currentLevel <= thresholdLevel;
  }

  /**
   * Set fallback mode state
   */
  private setFallbackMode(active: boolean): void {
    if (this.fallbackModeActive === active) {
      return;
    }

    this.fallbackModeActive = active;
    
    if (active) {
      console.warn('[NetworkPrioritizationService] Fallback mode activated due to poor network conditions');
      // In fallback mode, pause the queue and process critical updates directly
      this.syncQueue.pause();
    } else {
      console.log('[NetworkPrioritizationService] Fallback mode deactivated, network conditions improved');
      // Resume normal queue processing
      this.syncQueue.resume();
    }

    // Notify listeners
    this.fallbackModeListeners.forEach(listener => {
      try {
        listener(active);
      } catch (error) {
        console.warn('[NetworkPrioritizationService] Fallback mode listener error:', error);
      }
    });
  }

  /**
   * Record sync result for statistics
   */
  private recordResult(result: SyncResult, startTime: number): void {
    const latency = result.latency || (Date.now() - startTime);
    
    this.stats.latencySum += latency;
    this.stats.latencyCount++;
    
    if (result.success) {
      this.stats.successCount++;
    } else {
      this.stats.failureCount++;
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getMetrics();
      
      // Log performance warnings
      if (metrics.queueStats.averageQueueTime > 5000) {
        console.warn(
          `[NetworkPrioritizationService] High average queue time: ${metrics.queueStats.averageQueueTime}ms`
        );
      }
      
      if (metrics.performanceStats.successRate < 90) {
        console.warn(
          `[NetworkPrioritizationService] Low success rate: ${metrics.performanceStats.successRate.toFixed(1)}%`
        );
      }
      
      if (metrics.queueStats.criticalItems > 10) {
        console.warn(
          `[NetworkPrioritizationService] High number of critical items in queue: ${metrics.queueStats.criticalItems}`
        );
      }
      
    }, this.config.monitoringInterval);
  }
}