/**
 * OverlaySyncService - Core application service for overlay synchronization
 * 
 * This service orchestrates overlay state synchronization across multiple devices
 * and overlay windows. It implements debouncing logic, error handling, performance
 * monitoring, and resource management following hexagonal architecture principles.
 * 
 * Requirements: 4.2, 3.2
 */

import {
  OverlayState,
  OverlayType,
  cloneOverlayState,
} from '@/src/domain/entities/OverlayState';

import {
  IOverlaySync,
  SyncCallback,
  SyncSubscription,
  SyncResult,
  ConnectionStatus,
  SyncMetrics,
} from '@/src/domain/ports/IOverlaySync';

import { OverlayStateManager } from './OverlayStateManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ErrorRecoverySystem, RecoveryResult } from './ErrorRecoverySystem';

import {
  SyncError,
  SyncErrorType,
  OverlaySyncError,
  ValidationSyncError,
} from '@/src/domain/errors/OverlaySyncErrors';

import {
  ResourceManager,
  TimerResource,
  SubscriptionResource,
  type Disposable,
  type ResourceBreakdown,
} from '@/src/infrastructure/utils/ResourceManager';

import { AuditLogService } from './AuditLogService';
import { AuditUserContext } from '@/src/domain/entities/AuditLog';
import { NetworkPrioritizationService } from './NetworkPrioritizationService';
import { UpdatePriority } from '@/src/domain/entities/NetworkPriority';

/**
 * Debounce configuration for different overlay types
 */
export interface DebounceConfig {
  /** Debounce delay in milliseconds */
  delayMs: number;
  
  /** Maximum delay before forcing an update */
  maxDelayMs: number;
  
  /** Whether debouncing is enabled for this type */
  enabled: boolean;
}

/**
 * Service configuration options
 */
export interface OverlaySyncServiceConfig {
  /** Unique service identifier */
  serviceId: string;
  
  /** Debounce configuration per overlay type */
  debouncing: Record<OverlayType, DebounceConfig>;
  
  /** Default debounce configuration */
  defaultDebounce: DebounceConfig;
  
  /** Enable performance monitoring */
  monitoringEnabled: boolean;
  
  /** Enable automatic error recovery */
  autoRecoveryEnabled: boolean;
  
  /** Maximum concurrent subscriptions */
  maxSubscriptions: number;
  
  /** Enable network prioritization */
  networkPrioritizationEnabled: boolean;
}

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: OverlaySyncServiceConfig = {
  serviceId: 'overlay-sync-service',
  debouncing: {
    poll: { delayMs: 300, maxDelayMs: 1000, enabled: true },
    giveaway: { delayMs: 200, maxDelayMs: 800, enabled: true },
    game: { delayMs: 100, maxDelayMs: 500, enabled: true },
    prediction: { delayMs: 250, maxDelayMs: 750, enabled: true },
  },
  defaultDebounce: { delayMs: 200, maxDelayMs: 1000, enabled: true },
  monitoringEnabled: true,
  autoRecoveryEnabled: true,
  maxSubscriptions: 50,
  stateComparison: {
    enabled: true,
    ignoreFields: ['updatedAt'],
    timestampTolerance: 1000, // 1 second
  },
  networkPrioritizationEnabled: true,
};

/**
 * Pending update information for debouncing
 */
interface PendingUpdate<T extends OverlayState> {
  state: T;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
  timerResource?: TimerResource;
  resolve: (result: SyncResult) => void;
  reject: (error: Error) => void;
}

/**
 * Subscription wrapper with metadata
 */
interface ManagedSubscription {
  subscription: SyncSubscription;
  subscriptionResource?: SubscriptionResource;
  type: OverlayType;
  callback: SyncCallback<OverlayState>;
  createdAt: number;
  callCount: number;
  lastCallAt?: number;
}

/**
 * OverlaySyncService - Main service class for overlay synchronization
 * 
 * Orchestrates overlay state synchronization with comprehensive features:
 * - Debounced updates to reduce Firebase operations
 * - State comparison to skip identical updates
 * - Performance monitoring and error recovery
 * - Resource management and cleanup
 * - Type-safe overlay state handling
 */
export class OverlaySyncService {
  private readonly config: OverlaySyncServiceConfig;
  private readonly subscriptions = new Map<string, ManagedSubscription>();
  private readonly pendingUpdates = new Map<string, PendingUpdate<OverlayState>>();
  private readonly lastStates = new Map<string, OverlayState>();
  
  private isDisposed = false;
  private startTime = Date.now();

  constructor(
    private readonly syncAdapter: IOverlaySync,
    private stateManager?: OverlayStateManager,
    private performanceMonitor?: PerformanceMonitor,
    private errorRecovery?: ErrorRecoverySystem,
    private readonly resourceManager: ResourceManager = new ResourceManager({
      maxResources: 500,
      warningThreshold: 50,
    }),
    private readonly auditLogService?: AuditLogService,
    private readonly networkPrioritizationService?: NetworkPrioritizationService,
    config: Partial<OverlaySyncServiceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize optional dependencies with defaults if not provided
    this.stateManager = stateManager || new OverlayStateManager();
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor();
    this.errorRecovery = errorRecovery || new ErrorRecoverySystem(syncAdapter);
    
    // Track this service for cleanup
    this.resourceManager.track(this);
    
    // Initialize performance monitoring if enabled
    if (this.config.monitoringEnabled) {
      this.initializeMonitoring();
    }
  }

  /**
   * Updates overlay state with debouncing and validation
   * 
   * @param state - The overlay state to update
   * @param options - Update options including priority
   * @returns Promise resolving when update completes
   */
  async updateOverlayState<T extends OverlayState>(
    state: T,
    options?: {
      priority?: UpdatePriority;
      bypassQueue?: boolean;
      deadline?: number;
    }
  ): Promise<void> {
    this.ensureNotDisposed();
    
    const startTime = Date.now();
    const stateKey = this.getStateKey(state.type, state.channelId);

    try {
      // Validate state before processing
      const validation = this.stateManager.validateState(state);
      if (!validation.isValid) {
        throw new ValidationSyncError(
          `State validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'UPDATE_VALIDATION_FAILED',
          {
            context: {
              errors: validation.errors,
              stateType: state.type,
              stateId: state.id,
            },
          }
        );
      }

      // Check if network prioritization is enabled and should be used
      if (this.config.networkPrioritizationEnabled && this.networkPrioritizationService) {
        const result = await this.networkPrioritizationService.publish(state, options);
        
        if (!result.success && result.error) {
          throw new OverlaySyncError(
            result.error.type as SyncErrorType,
            `Network prioritization failed: ${result.error.message}`,
            result.error.code,
            {
              context: result.error.context,
              originalError: result.error.originalError,
            }
          );
        }
        
        // Store state for future comparisons
        this.lastStates.set(stateKey, cloneOverlayState(state));
        this.recordMetrics('updateOverlayState', startTime, true);
        return;
      }

      // Check if state has actually changed (only for non-prioritized updates)
      if (this.shouldSkipUpdate(state)) {
        this.recordMetrics('updateOverlayState', startTime, true);
        return;
      }

      // Handle debouncing if enabled
      if (this.shouldDebounceUpdate(state.type)) {
        await this.handleDebouncedUpdate(state);
      } else {
        await this.performImmediateUpdate(state);
      }

      // Store state for future comparisons
      this.lastStates.set(stateKey, cloneOverlayState(state));
      
      this.recordMetrics('updateOverlayState', startTime, true);
      
      this.recordMetrics('updateOverlayState', startTime, true);
    } catch (error) {
      this.recordMetrics('updateOverlayState', startTime, false, error as Error);
      
      // Check if this is a disposal error or debouncing cancellation - don't attempt recovery
      if (error instanceof Error && (
        error.message === 'Service disposed' || 
        error.message === 'Update superseded by newer update'
      )) {
        throw error;
      }
      
      // Handle error through recovery system if enabled
      if (this.config.autoRecoveryEnabled) {
        await this.handleUpdateError(error as Error, state);
      } else {
        throw error;
      }
    }
  }

  /**
   * Subscribes to overlay state changes for a specific type
   * 
   * @param type - The overlay type to subscribe to
   * @param callback - Function called when state changes
   * @returns Unsubscribe function
   */
  subscribeToOverlayChanges<T extends OverlayState>(
    type: OverlayType,
    callback: (state: T | null) => void
  ): () => void {
    this.ensureNotDisposed();

    // Check subscription limits
    if (this.subscriptions.size >= this.config.maxSubscriptions) {
      throw new Error(`Maximum subscriptions (${this.config.maxSubscriptions}) exceeded`);
    }

    const subscriptionId = this.generateSubscriptionId(type);
    
    try {
      // Create wrapped callback for monitoring
      const wrappedCallback: SyncCallback<T> = (state: T | null) => {
        try {
          const subscription = this.subscriptions.get(subscriptionId);
          if (subscription) {
            subscription.callCount++;
            subscription.lastCallAt = Date.now();
          }
          
          callback(state);
        } catch (error) {
          // Log callback errors but don't propagate them
          console.warn('Subscription callback error:', error);
        }
      };

      // Subscribe through the adapter
      const adapterSubscription = this.syncAdapter.subscribe<T>(type, wrappedCallback);
      
      // Track subscription with resource manager
      const subscriptionResource = this.resourceManager.trackSubscription(
        () => adapterSubscription.unsubscribe(),
        () => {
          // Cleanup callback when subscription is disposed
          this.subscriptions.delete(subscriptionId);
        }
      );
      
      // Create managed subscription
      const managedSubscription: ManagedSubscription = {
        subscription: adapterSubscription,
        subscriptionResource,
        type,
        callback: wrappedCallback as SyncCallback<OverlayState>,
        createdAt: Date.now(),
        callCount: 0,
      };

      this.subscriptions.set(subscriptionId, managedSubscription);

      // Return unsubscribe function
      return () => {
        this.unsubscribe(subscriptionId);
      };
    } catch (error) {
      this.recordMetrics('subscribeToOverlayChanges', Date.now(), false, error as Error);
      throw error;
    }
  }

  /**
   * Clears overlay state for a specific type
   * 
   * @param type - The overlay type to clear
   */
  async clearOverlay(type: OverlayType): Promise<void> {
    this.ensureNotDisposed();
    
    const startTime = Date.now();

    try {
      // Get states that will be cleared for audit logging
      const stateKeys = Array.from(this.lastStates.keys()).filter(key => key.startsWith(`${type}:`));
      const statesToClear = stateKeys.map(key => this.lastStates.get(key)).filter(Boolean) as OverlayState[];
      
      const result = await this.syncAdapter.clear(type);
      
      if (!result.success && result.error) {
        // Log failed clear operation
        if (this.auditLogService && statesToClear.length > 0) {
          await this.auditLogService.logBulkOperation(
            'clear',
            'system',
            statesToClear,
            {
              userContext: this.getUserContext(),
              success: false,
              reason: (this as any).currentReason || `Clear operation failed: ${result.error.message}`,
            }
          );
        }
        
        throw new Error(`Clear operation failed: ${result.error.message}`);
      }

      // Clear local state cache
      for (const key of stateKeys) {
        this.lastStates.delete(key);
      }

      // Log successful clear operation
      if (this.auditLogService && statesToClear.length > 0) {
        await this.auditLogService.logBulkOperation(
          'clear',
          'system',
          statesToClear,
          {
            userContext: this.getUserContext(),
            success: true,
            reason: (this as any).currentReason || `Cleared all ${type} overlays`,
          }
        );
      }

      this.recordMetrics('clearOverlay', startTime, true);
    } catch (error) {
      this.recordMetrics('clearOverlay', startTime, false, error as Error);
      throw error;
    }
  }

  /**
   * Gets current connection status
   * 
   * @returns Current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.syncAdapter.getConnectionStatus();
  }

  /**
   * Gets comprehensive performance metrics
   * 
   * @returns Performance metrics including service-specific data
   */
  getPerformanceMetrics(): SyncMetrics & {
    serviceMetrics: {
      uptime: number;
      activeSubscriptions: number;
      pendingUpdates: number;
      cachedStates: number;
      resourceCount: number;
      resourceBreakdown: ResourceBreakdown;
      memoryLeakRisk: 'low' | 'medium' | 'high';
    };
    networkPrioritization?: {
      enabled: boolean;
      networkCondition: string;
      queueStats: {
        totalItems: number;
        criticalItems: number;
        processingRate: number;
      };
      fallbackModeActive: boolean;
    };
  } {
    const baseMetrics = this.syncAdapter.getMetrics();
    const resourceBreakdown = this.resourceManager.getResourceBreakdown();
    
    // Assess memory leak risk based on resource counts
    let memoryLeakRisk: 'low' | 'medium' | 'high' = 'low';
    if (resourceBreakdown.total > 100) {
      memoryLeakRisk = 'high';
    } else if (resourceBreakdown.total > 50) {
      memoryLeakRisk = 'medium';
    }
    
    return {
      ...baseMetrics,
      serviceMetrics: {
        uptime: Date.now() - this.startTime,
        activeSubscriptions: this.subscriptions.size,
        pendingUpdates: this.pendingUpdates.size,
        cachedStates: this.lastStates.size,
        resourceCount: this.resourceManager.getResourceCount(),
        resourceBreakdown,
        memoryLeakRisk,
      },
      networkPrioritization: this.config.networkPrioritizationEnabled && this.networkPrioritizationService ? {
        enabled: true,
        networkCondition: this.networkPrioritizationService.getCurrentNetworkCondition(),
        queueStats: {
          totalItems: this.networkPrioritizationService.getMetrics().queueStats.totalItems,
          criticalItems: this.networkPrioritizationService.getMetrics().queueStats.criticalItems,
          processingRate: this.networkPrioritizationService.getMetrics().queueStats.processingRate,
        },
        fallbackModeActive: this.networkPrioritizationService.isFallbackModeActive(),
      } : {
        enabled: false,
        networkCondition: 'unknown',
        queueStats: { totalItems: 0, criticalItems: 0, processingRate: 0 },
        fallbackModeActive: false,
      },
    };
  }

  /**
   * Disposes of the service and cleans up all resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    // Cancel all pending updates and clean up their timers
    for (const [, pending] of this.pendingUpdates.entries()) {
      // Clean up timer resource if tracked
      if (pending.timerResource) {
        pending.timerResource.dispose();
        this.resourceManager.untrack(pending.timerResource);
      } else {
        // Fallback to direct timer cleanup
        clearTimeout(pending.timeoutId);
      }
      
      // Reject the pending promise
      try {
        pending.reject(new Error('Service disposed'));
      } catch (error) {
        // Ignore errors during disposal
        console.warn('Error rejecting pending update during disposal:', error);
      }
    }
    this.pendingUpdates.clear();

    // Unsubscribe from all subscriptions (handled by resource manager)
    for (const [id] of this.subscriptions.entries()) {
      this.unsubscribe(id);
    }

    // Clear state cache
    this.lastStates.clear();

    // Clean up all tracked resources (timers, intervals, subscriptions, etc.)
    this.resourceManager.cleanup();
  }

  // Private helper methods

  /**
   * Ensures the service is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('OverlaySyncService has been disposed');
    }
  }

  /**
   * Generates a unique state key for caching
   */
  private getStateKey(type: OverlayType, channelId: string): string {
    return `${type}:${channelId}`;
  }

  /**
   * Generates a unique subscription ID
   */
  private generateSubscriptionId(type: OverlayType): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Determines if an update should be debounced
   */
  private shouldDebounceUpdate(type: OverlayType): boolean {
    const config = this.config.debouncing[type] || this.config.defaultDebounce;
    return config.enabled;
  }

  /**
   * Checks if an update should be skipped due to identical state
   */
  private shouldSkipUpdate<T extends OverlayState>(state: T): boolean {
    if (!this.config.stateComparison.enabled) {
      return false;
    }

    const stateKey = this.getStateKey(state.type, state.channelId);
    const lastState = this.lastStates.get(stateKey);

    if (!lastState || lastState.type !== state.type) {
      return false;
    }

    // Use state manager for comparison with configured options
    return this.stateManager.compareStates(state, lastState as T, {
      ignoreFields: this.config.stateComparison.ignoreFields,
      tolerance: this.config.stateComparison.timestampTolerance,
    });
  }

  /**
   * Handles debounced updates with timeout management
   */
  private async handleDebouncedUpdate<T extends OverlayState>(state: T): Promise<void> {
    const stateKey = this.getStateKey(state.type, state.channelId);
    const config = this.config.debouncing[state.type] || this.config.defaultDebounce;

    // Cancel existing pending update
    const existing = this.pendingUpdates.get(stateKey);
    if (existing) {
      // Clean up timer resource if tracked
      if (existing.timerResource) {
        existing.timerResource.dispose();
        this.resourceManager.untrack(existing.timerResource);
      } else {
        clearTimeout(existing.timeoutId);
      }
      existing.reject(new Error('Update superseded by newer update'));
      this.pendingUpdates.delete(stateKey);
    }

    // Create new pending update
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        this.pendingUpdates.delete(stateKey);
        
        // Check if service was disposed during the timeout
        if (this.isDisposed) {
          reject(new Error('Service disposed'));
          return;
        }
        
        try {
          await this.performImmediateUpdate(state);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, config.delayMs);

      // Track the timer for proper cleanup
      const timerResource = this.resourceManager.trackTimer(timeoutId);

      // Store pending update with timer resource for cleanup
      const pending: PendingUpdate<T> = {
        state,
        timestamp: Date.now(),
        timeoutId,
        timerResource,
        resolve: () => resolve(),
        reject,
      };

      this.pendingUpdates.set(stateKey, pending as PendingUpdate<OverlayState>);
    });
  }

  /**
   * Performs immediate update without debouncing
   */
  private async performImmediateUpdate<T extends OverlayState>(state: T): Promise<void> {
    const startTime = Date.now();
    const previousState = this.lastStates.get(this.getStateKey(state.type, state.channelId));
    
    try {
      // Transform state for synchronization
      const transformedState = this.stateManager.transformForSync(state, {
        validate: false, // Already validated
        sanitize: true,
        normalizeTimestamps: true,
      });

      // Publish through adapter
      const result = await this.syncAdapter.publish(transformedState);
      
      if (!result.success && result.error) {
        // Log failed sync operation
        if (this.auditLogService && typeof this.auditLogService.logStateChange === 'function') {
          try {
            await this.auditLogService.logStateChange(
            previousState ? 'update' : 'create',
            'system',
            state,
            {
              previousState,
              userContext: this.getUserContext(),
              success: false,
              error: result.error.message,
              duration: Date.now() - startTime,
              reason: (this as any).currentReason || 'Sync operation failed',
            }
          );
          } catch (auditError) {
            // Ignore audit logging errors to prevent cascading failures
            console.warn('Audit logging failed:', auditError);
          }
        }
        
        throw new OverlaySyncError(
          result.error.type,
          `Sync operation failed: ${result.error.message}`,
          result.error.code,
          {
            context: result.error.context,
            originalError: result.error.originalError,
          }
        );
      }
      
      // Log successful sync operation
      if (this.auditLogService && typeof this.auditLogService.logStateChange === 'function') {
        try {
          await this.auditLogService.logStateChange(
          previousState ? 'update' : 'create',
          'system',
          state,
          {
            previousState,
            userContext: this.getUserContext(),
            success: true,
            duration: Date.now() - startTime,
            reason: (this as any).currentReason || 'Overlay state synchronized',
          }
        );
        } catch (auditError) {
          // Ignore audit logging errors to prevent cascading failures
          console.warn('Audit logging failed:', auditError);
        }
      }
    } catch (error) {
      // Log failed operation if not already logged
      if (this.auditLogService && typeof this.auditLogService.logStateChange === 'function' && !(error instanceof OverlaySyncError)) {
        try {
          await this.auditLogService.logStateChange(
            previousState ? 'update' : 'create',
            'system',
            state,
            {
              previousState,
              userContext: this.getUserContext(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - startTime,
              reason: (this as any).currentReason || 'Sync operation exception',
            }
          );
        } catch (auditError) {
          // Ignore audit logging errors to prevent cascading failures
          console.warn('Audit logging failed:', auditError);
        }
      }
      throw error;
    }
  }

  /**
   * Handles update errors through the recovery system
   */
  private async handleUpdateError<T extends OverlayState>(
    error: Error,
    state: T
  ): Promise<void> {
    try {
      const recoveryResult = await this.errorRecovery.handleConnectionFailure(error);
      
      if (recoveryResult.success) {
        // Retry the update after successful recovery
        await this.performImmediateUpdate(state);
      } else {
        // Recovery failed, throw the original error
        throw error;
      }
    } catch (recoveryError) {
      // Recovery itself failed, throw the original error
      throw error;
    }
  }

  /**
   * Unsubscribes from a specific subscription
   */
  private unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      try {
        // Use the subscription resource for proper cleanup if available
        if (subscription.subscriptionResource) {
          subscription.subscriptionResource.dispose();
          this.resourceManager.untrack(subscription.subscriptionResource);
        } else {
          // Fallback to direct unsubscribe
          subscription.subscription.unsubscribe();
        }
      } catch (error) {
        // Ignore unsubscribe errors during cleanup
        console.warn('Unsubscribe failed:', error);
      }
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Records performance metrics if monitoring is enabled
   */
  private recordMetrics(
    operation: string,
    startTime: number,
    success: boolean,
    error?: Error
  ): void {
    if (!this.config.monitoringEnabled) {
      return;
    }

    const latency = Date.now() - startTime;

    if (success) {
      this.performanceMonitor.recordSyncLatency(operation, latency);
    } else if (error) {
      // Convert to sync error for monitoring
      const syncError: SyncError = {
        type: SyncErrorType.UNKNOWN,
        code: 'OPERATION_FAILED',
        message: error.message,
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
        originalError: error,
      };
      
      this.performanceMonitor.recordSyncError(operation, syncError);
    }
  }

  /**
   * Initializes performance monitoring
   */
  private initializeMonitoring(): void {
    // Monitor connection status changes
    const checkConnectionStatus = () => {
      const status = this.syncAdapter.getConnectionStatus();
      this.performanceMonitor.recordConnectionStatusChange(status);
    };

    // Check connection status periodically
    const connectionCheckInterval = setInterval(checkConnectionStatus, 5000);
    
    // Track the interval for cleanup using enhanced resource manager
    this.resourceManager.trackInterval(connectionCheckInterval);

    // Initial connection status check
    checkConnectionStatus();
    
    // Monitor resource usage periodically
    const resourceCheckInterval = setInterval(() => {
      const breakdown = this.resourceManager.getResourceBreakdown();
      
      // Log warning if resource count is getting high
      if (breakdown.total > 50) {
        console.warn(`High resource count detected: ${breakdown.total} resources tracked`, breakdown);
      }
      
      // Check for potential memory leaks
      if (breakdown.total > 100) {
        console.error(`Potential memory leak detected: ${breakdown.total} resources tracked`, breakdown);
      }
    }, 30000); // Check every 30 seconds
    
    // Track the resource monitoring interval
    this.resourceManager.trackInterval(resourceCheckInterval);
  }

  /**
   * Sets user context for audit logging
   * 
   * @param userContext - User context information
   */
  setUserContext(userContext: AuditUserContext): void {
    if (this.auditLogService) {
      // Store user context for future operations
      (this as any).currentUserContext = userContext;
    }
  }

  /**
   * Clears user context for audit logging
   */
  clearUserContext(): void {
    if (this.auditLogService) {
      (this as any).currentUserContext = undefined;
    }
  }

  /**
   * Gets current user context
   */
  getUserContext(): AuditUserContext | undefined {
    return (this as any).currentUserContext;
  }

  /**
   * Updates overlay state with user context for audit logging
   * 
   * @param state - The overlay state to update
   * @param userContext - User context for this specific operation
   * @param reason - Reason for the update
   * @param options - Update options including priority
   * @returns Promise resolving when update completes
   */
  async updateOverlayStateWithContext<T extends OverlayState>(
    state: T,
    userContext?: AuditUserContext,
    reason?: string,
    options?: {
      priority?: UpdatePriority;
      bypassQueue?: boolean;
      deadline?: number;
    }
  ): Promise<void> {
    const previousUserContext = this.getUserContext();
    
    try {
      // Temporarily set user context if provided
      if (userContext) {
        this.setUserContext(userContext);
      }
      
      // Store reason for audit logging
      if (reason) {
        (this as any).currentReason = reason;
      }
      
      await this.updateOverlayState(state, options);
    } finally {
      // Restore previous user context
      if (userContext && previousUserContext) {
        this.setUserContext(previousUserContext);
      } else if (userContext) {
        this.clearUserContext();
      }
      
      // Clear reason
      (this as any).currentReason = undefined;
    }
  }

  /**
   * Get current network condition (if network prioritization is enabled)
   */
  getCurrentNetworkCondition(): string {
    if (this.config.networkPrioritizationEnabled && this.networkPrioritizationService) {
      return this.networkPrioritizationService.getCurrentNetworkCondition();
    }
    return 'unknown';
  }

  /**
   * Check if fallback mode is active (if network prioritization is enabled)
   */
  isFallbackModeActive(): boolean {
    if (this.config.networkPrioritizationEnabled && this.networkPrioritizationService) {
      return this.networkPrioritizationService.isFallbackModeActive();
    }
    return false;
  }

  /**
   * Get network prioritization metrics (if enabled)
   */
  getNetworkPrioritizationMetrics() {
    if (this.config.networkPrioritizationEnabled && this.networkPrioritizationService) {
      return this.networkPrioritizationService.getMetrics();
    }
    return null;
  }

  /**
   * Subscribe to network condition changes (if network prioritization is enabled)
   */
  onNetworkConditionChange(callback: (condition: string) => void): (() => void) | null {
    if (this.config.networkPrioritizationEnabled && this.networkPrioritizationService) {
      return this.networkPrioritizationService.onNetworkConditionChange(callback);
    }
    return null;
  }
  /**
   * Clears overlay with user context for audit logging
   * 
   * @param type - The overlay type to clear
   * @param userContext - User context for this specific operation
   * @param reason - Reason for clearing
   * @returns Promise resolving when clear completes
   */
  async clearOverlayWithContext(
    type: OverlayType,
    userContext?: AuditUserContext,
    reason?: string
  ): Promise<void> {
    const previousUserContext = this.getUserContext();
    
    try {
      // Temporarily set user context if provided
      if (userContext) {
        this.setUserContext(userContext);
      }
      
      // Store reason for audit logging
      if (reason) {
        (this as any).currentReason = reason;
      }
      
      await this.clearOverlay(type);
    } finally {
      // Restore previous user context
      if (userContext && previousUserContext) {
        this.setUserContext(previousUserContext);
      } else if (userContext) {
        this.clearUserContext();
      }
      
      // Clear reason
      (this as any).currentReason = undefined;
    }
  }
}