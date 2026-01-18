/**
 * ResourceManager - Comprehensive resource management utility
 * 
 * Provides subscription tracking, timer management, and memory leak prevention
 * for the overlay synchronization system. Ensures proper cleanup of all resources
 * when components unmount or services are disposed.
 * 
 * Requirements: 3.3 - Resource cleanup on component unmount
 */

/**
 * Base interface for disposable resources
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Timer resource wrapper for proper cleanup
 */
export class TimerResource implements Disposable {
  private disposed = false;

  constructor(private readonly timerId: NodeJS.Timeout) {}

  dispose(): void {
    if (!this.disposed) {
      clearTimeout(this.timerId);
      this.disposed = true;
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Interval resource wrapper for proper cleanup
 */
export class IntervalResource implements Disposable {
  private disposed = false;

  constructor(private readonly intervalId: NodeJS.Timeout) {}

  dispose(): void {
    if (!this.disposed) {
      clearInterval(this.intervalId);
      this.disposed = true;
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Subscription resource wrapper for proper cleanup
 */
export class SubscriptionResource implements Disposable {
  private disposed = false;

  constructor(
    private readonly unsubscribeFn: () => void,
    private readonly onDispose?: () => void
  ) {}

  dispose(): void {
    if (!this.disposed) {
      try {
        this.unsubscribeFn();
      } catch (error) {
        // Log but don't throw during cleanup
        console.warn('Subscription cleanup failed:', error);
      }
      
      if (this.onDispose) {
        try {
          this.onDispose();
        } catch (error) {
          console.warn('Subscription dispose callback failed:', error);
        }
      }
      
      this.disposed = true;
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Event listener resource wrapper for proper cleanup
 */
export class EventListenerResource implements Disposable {
  private disposed = false;

  constructor(
    private readonly target: EventTarget,
    private readonly type: string,
    private readonly listener: EventListener,
    private readonly options?: boolean | AddEventListenerOptions
  ) {}

  dispose(): void {
    if (!this.disposed) {
      try {
        this.target.removeEventListener(this.type, this.listener, this.options);
      } catch (error) {
        console.warn('Event listener cleanup failed:', error);
      }
      this.disposed = true;
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Generic callback resource for custom cleanup functions
 */
export class CallbackResource implements Disposable {
  private disposed = false;

  constructor(private readonly cleanupFn: () => void) {}

  dispose(): void {
    if (!this.disposed) {
      try {
        this.cleanupFn();
      } catch (error) {
        console.warn('Callback resource cleanup failed:', error);
      }
      this.disposed = true;
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Resource breakdown statistics
 */
export interface ResourceBreakdown {
  timers: number;
  intervals: number;
  subscriptions: number;
  eventListeners: number;
  callbacks: number;
  other: number;
  total: number;
}

/**
 * Resource manager configuration options
 */
export interface ResourceManagerConfig {
  /** Maximum number of resources before throwing an error */
  maxResources: number;
  
  /** Warning threshold for resource count */
  warningThreshold: number;
  
  /** Enable automatic memory leak detection */
  enableLeakDetection: boolean;
  
  /** Interval for leak detection checks (ms) */
  leakDetectionInterval: number;
  
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default configuration for ResourceManager
 */
const DEFAULT_CONFIG: ResourceManagerConfig = {
  maxResources: 1000,
  warningThreshold: 100,
  enableLeakDetection: true,
  leakDetectionInterval: 30000, // 30 seconds
  debug: false,
};

/**
 * Memory leak detection result
 */
export interface LeakDetectionResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resourceCount: number;
  breakdown: ResourceBreakdown;
  recommendations: string[];
  timestamp: number;
}

/**
 * ResourceManager - Comprehensive resource management utility
 * 
 * Tracks and manages disposable resources including:
 * - Timers (setTimeout)
 * - Intervals (setInterval) 
 * - Subscriptions (Firebase, WebSocket, etc.)
 * - Event listeners
 * - Custom cleanup callbacks
 * 
 * Provides memory leak prevention and automatic cleanup on disposal.
 */
export class ResourceManager implements Disposable {
  private readonly resources = new Set<Disposable>();
  private readonly resourceMetadata = new WeakMap<Disposable, {
    type: string;
    createdAt: number;
    stackTrace?: string;
  }>();
  
  private disposed = false;
  private readonly config: ResourceManagerConfig;
  private leakDetectionTimer?: NodeJS.Timeout;
  private lastWarningTime = 0;
  private readonly warningCooldown = 10000; // 10 seconds between warnings

  constructor(config: Partial<ResourceManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enableLeakDetection) {
      this.startLeakDetection();
    }
    
    if (this.config.debug) {
      console.log('[ResourceManager] Initialized with config:', this.config);
    }
  }

  /**
   * Track a disposable resource for cleanup
   * 
   * @param resource - The disposable resource to track
   * @param metadata - Optional metadata for debugging
   */
  track(resource: Disposable, metadata?: { type?: string; stackTrace?: boolean }): void {
    if (this.disposed) {
      console.warn('[ResourceManager] Attempting to track resource on disposed ResourceManager');
      return;
    }

    // Check for resource limits
    if (this.resources.size >= this.config.maxResources) {
      throw new Error(
        `Resource limit exceeded: ${this.config.maxResources}. ` +
        `Possible memory leak detected. Current count: ${this.resources.size}`
      );
    }

    // Warning threshold check with cooldown
    const now = Date.now();
    if (this.resources.size >= this.config.warningThreshold && 
        now - this.lastWarningTime > this.warningCooldown) {
      console.warn(
        `[ResourceManager] Resource count (${this.resources.size}) exceeds warning threshold ` +
        `(${this.config.warningThreshold}). Check for potential memory leaks.`
      );
      this.lastWarningTime = now;
    }

    // Store metadata for debugging
    const resourceType = metadata?.type || this.inferResourceType(resource);
    const stackTrace = metadata?.stackTrace && this.config.debug ? 
      new Error().stack : undefined;
    
    this.resourceMetadata.set(resource, {
      type: resourceType,
      createdAt: now,
      stackTrace,
    });

    this.resources.add(resource);
    
    if (this.config.debug) {
      console.log(`[ResourceManager] Tracked ${resourceType} resource. Total: ${this.resources.size}`);
    }
  }

  /**
   * Track a timer (setTimeout) for cleanup
   * 
   * @param timerId - The timer ID returned by setTimeout
   * @returns TimerResource wrapper for manual disposal
   */
  trackTimer(timerId: NodeJS.Timeout): TimerResource {
    const resource = new TimerResource(timerId);
    this.track(resource, { type: 'timer' });
    return resource;
  }

  /**
   * Track an interval (setInterval) for cleanup
   * 
   * @param intervalId - The interval ID returned by setInterval
   * @returns IntervalResource wrapper for manual disposal
   */
  trackInterval(intervalId: NodeJS.Timeout): IntervalResource {
    const resource = new IntervalResource(intervalId);
    this.track(resource, { type: 'interval' });
    return resource;
  }

  /**
   * Track a subscription for cleanup
   * 
   * @param unsubscribeFn - Function to call for unsubscribing
   * @param onDispose - Optional callback when resource is disposed
   * @returns SubscriptionResource wrapper for manual disposal
   */
  trackSubscription(
    unsubscribeFn: () => void, 
    onDispose?: () => void
  ): SubscriptionResource {
    const resource = new SubscriptionResource(unsubscribeFn, onDispose);
    this.track(resource, { type: 'subscription' });
    return resource;
  }

  /**
   * Track an event listener for cleanup
   * 
   * @param target - The event target
   * @param type - The event type
   * @param listener - The event listener function
   * @param options - Optional event listener options
   * @returns EventListenerResource wrapper for manual disposal
   */
  trackEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): EventListenerResource {
    const resource = new EventListenerResource(target, type, listener, options);
    this.track(resource, { type: 'eventListener' });
    return resource;
  }

  /**
   * Track a custom cleanup callback
   * 
   * @param cleanupFn - Function to call for cleanup
   * @returns CallbackResource wrapper for manual disposal
   */
  trackCallback(cleanupFn: () => void): CallbackResource {
    const resource = new CallbackResource(cleanupFn);
    this.track(resource, { type: 'callback' });
    return resource;
  }

  /**
   * Remove a specific resource from tracking
   * 
   * @param resource - The resource to stop tracking
   */
  untrack(resource: Disposable): void {
    if (this.resources.has(resource)) {
      this.resources.delete(resource);
      this.resourceMetadata.delete(resource);
      
      if (this.config.debug) {
        console.log(`[ResourceManager] Untracked resource. Total: ${this.resources.size}`);
      }
    }
  }

  /**
   * Clean up all tracked resources
   * 
   * This method is safe to call multiple times and will not throw errors
   * if individual resource cleanup fails.
   */
  cleanup(): void {
    if (this.disposed) {
      return;
    }

    const startTime = Date.now();
    const errors: Error[] = [];
    let successCount = 0;
    
    if (this.config.debug) {
      console.log(`[ResourceManager] Starting cleanup of ${this.resources.size} resources...`);
    }
    
    // Stop leak detection first
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = undefined;
    }
    
    // Dispose all resources
    for (const resource of this.resources) {
      try {
        resource.dispose();
        successCount++;
      } catch (error) {
        // Collect cleanup errors but don't stop cleanup process
        errors.push(error as Error);
      }
    }
    
    // Clear collections
    this.resources.clear();
    // Note: WeakMap will be garbage collected automatically
    
    this.disposed = true;
    
    const duration = Date.now() - startTime;
    
    if (this.config.debug || errors.length > 0) {
      console.log(
        `[ResourceManager] Cleanup completed in ${duration}ms. ` +
        `Success: ${successCount}, Errors: ${errors.length}`
      );
    }

    // Log cleanup errors for debugging
    if (errors.length > 0) {
      console.warn(`[ResourceManager] Cleanup completed with ${errors.length} errors:`, errors);
    }
  }

  /**
   * Get count of tracked resources
   * 
   * @returns Number of currently tracked resources
   */
  getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Get resource breakdown by type
   * 
   * @returns Detailed breakdown of resource types
   */
  getResourceBreakdown(): ResourceBreakdown {
    let timers = 0;
    let intervals = 0;
    let subscriptions = 0;
    let eventListeners = 0;
    let callbacks = 0;
    let other = 0;

    for (const resource of this.resources) {
      const metadata = this.resourceMetadata.get(resource);
      const type = metadata?.type || 'unknown';
      
      switch (type) {
        case 'timer':
          timers++;
          break;
        case 'interval':
          intervals++;
          break;
        case 'subscription':
          subscriptions++;
          break;
        case 'eventListener':
          eventListeners++;
          break;
        case 'callback':
          callbacks++;
          break;
        default:
          other++;
          break;
      }
    }

    return {
      timers,
      intervals,
      subscriptions,
      eventListeners,
      callbacks,
      other,
      total: this.resources.size,
    };
  }

  /**
   * Check if resource manager is disposed
   * 
   * @returns True if the resource manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Perform memory leak detection analysis
   * 
   * @returns Leak detection result with recommendations
   */
  detectMemoryLeaks(): LeakDetectionResult {
    const breakdown = this.getResourceBreakdown();
    const resourceCount = breakdown.total;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const recommendations: string[] = [];
    
    // Assess risk level based on resource count and types
    if (resourceCount > 500) {
      riskLevel = 'critical';
      recommendations.push('Immediate action required: Resource count is critically high');
      recommendations.push('Review component lifecycle and ensure proper cleanup');
    } else if (resourceCount > 200) {
      riskLevel = 'high';
      recommendations.push('High resource usage detected');
      recommendations.push('Consider implementing resource pooling or lazy cleanup');
    } else if (resourceCount > 100) {
      riskLevel = 'medium';
      recommendations.push('Moderate resource usage');
      recommendations.push('Monitor resource growth patterns');
    } else {
      riskLevel = 'low';
      recommendations.push('Resource usage is within normal limits');
    }
    
    // Check for specific resource type issues
    if (breakdown.timers > 50) {
      recommendations.push(`High timer count (${breakdown.timers}): Check for timer leaks`);
    }
    
    if (breakdown.intervals > 20) {
      recommendations.push(`High interval count (${breakdown.intervals}): Ensure intervals are cleared`);
    }
    
    if (breakdown.subscriptions > 100) {
      recommendations.push(`High subscription count (${breakdown.subscriptions}): Review subscription lifecycle`);
    }
    
    if (breakdown.eventListeners > 100) {
      recommendations.push(`High event listener count (${breakdown.eventListeners}): Check for listener leaks`);
    }
    
    return {
      riskLevel,
      resourceCount,
      breakdown,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Get detailed resource information for debugging
   * 
   * @returns Array of resource information including creation time and type
   */
  getResourceDetails(): Array<{
    type: string;
    createdAt: number;
    age: number;
    stackTrace?: string;
  }> {
    const now = Date.now();
    const details: Array<{
      type: string;
      createdAt: number;
      age: number;
      stackTrace?: string;
    }> = [];
    
    for (const resource of this.resources) {
      const metadata = this.resourceMetadata.get(resource);
      if (metadata) {
        details.push({
          type: metadata.type,
          createdAt: metadata.createdAt,
          age: now - metadata.createdAt,
          stackTrace: metadata.stackTrace,
        });
      }
    }
    
    // Sort by age (oldest first)
    details.sort((a, b) => b.age - a.age);
    
    return details;
  }

  /**
   * Dispose of the resource manager and clean up all resources
   * 
   * This is the main cleanup method that should be called when the
   * resource manager is no longer needed.
   */
  dispose(): void {
    this.cleanup();
  }

  // Private helper methods

  /**
   * Infer resource type from the resource instance
   */
  private inferResourceType(resource: Disposable): string {
    if (resource instanceof TimerResource) {
      return 'timer';
    } else if (resource instanceof IntervalResource) {
      return 'interval';
    } else if (resource instanceof SubscriptionResource) {
      return 'subscription';
    } else if (resource instanceof EventListenerResource) {
      return 'eventListener';
    } else if (resource instanceof CallbackResource) {
      return 'callback';
    } else {
      return 'unknown';
    }
  }

  /**
   * Start automatic memory leak detection
   */
  private startLeakDetection(): void {
    if (this.leakDetectionTimer) {
      return;
    }
    
    this.leakDetectionTimer = setInterval(() => {
      const result = this.detectMemoryLeaks();
      
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
        console.warn('[ResourceManager] Memory leak detected:', result);
      } else if (this.config.debug && result.riskLevel === 'medium') {
        console.log('[ResourceManager] Leak detection result:', result);
      }
    }, this.config.leakDetectionInterval);
  }
}

/**
 * Create a new ResourceManager instance with default configuration
 * 
 * @param config - Optional configuration overrides
 * @returns New ResourceManager instance
 */
export function createResourceManager(config?: Partial<ResourceManagerConfig>): ResourceManager {
  return new ResourceManager(config);
}

/**
 * Global resource manager instance for shared use
 * 
 * This can be used when a single resource manager is sufficient
 * for the entire application or module.
 */
let globalResourceManager: ResourceManager | null = null;

/**
 * Get or create the global resource manager instance
 * 
 * @param config - Optional configuration for initial creation
 * @returns Global ResourceManager instance
 */
export function getGlobalResourceManager(config?: Partial<ResourceManagerConfig>): ResourceManager {
  if (!globalResourceManager || globalResourceManager.isDisposed()) {
    globalResourceManager = new ResourceManager(config);
  }
  return globalResourceManager;
}

/**
 * Reset the global resource manager (for testing)
 */
export function resetGlobalResourceManager(): void {
  if (globalResourceManager) {
    globalResourceManager.dispose();
    globalResourceManager = null;
  }
}