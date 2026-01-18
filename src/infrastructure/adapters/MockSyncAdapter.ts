/**
 * MockSyncAdapter - Mock implementation of IOverlaySync for testing and development
 * 
 * This adapter provides an in-memory implementation of the overlay sync interface,
 * useful for testing, development, and demonstrating backend agnosticism.
 * It simulates network latency and can be configured to simulate various error conditions.
 */

import type { 
  IOverlaySync, 
  OverlayType, 
  OverlayState, 
  SyncCallback,
  SyncResult,
  SyncSubscription,
  ConnectionStatus,
  SyncMetrics,
  DiagnosticInfo
} from '../../domain/ports/IOverlaySync';

import { SyncError, SyncErrorType } from '../../domain/errors/OverlaySyncErrors';

/**
 * Configuration for the mock adapter
 */
export interface MockSyncAdapterConfig {
  /** Simulate network latency */
  simulateLatency: boolean;
  
  /** Latency in milliseconds */
  latencyMs: number;
  
  /** Simulate connection failures */
  simulateFailures: boolean;
  
  /** Failure rate (0-1) */
  failureRate: number;
  
  /** Auto-reconnect after failures */
  autoReconnect: boolean;
  
  /** Reconnect delay in milliseconds */
  reconnectDelayMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MockSyncAdapterConfig = {
  simulateLatency: true,
  latencyMs: 100,
  simulateFailures: false,
  failureRate: 0.1,
  autoReconnect: true,
  reconnectDelayMs: 2000,
};

/**
 * Mock subscription implementation
 */
class MockSubscription implements SyncSubscription {
  private active = true;
  private callbackCount = 0;
  private lastCallbackAt?: number;

  constructor(
    private type: OverlayType,
    private callback: SyncCallback<any>,
    private onUnsubscribe: () => void
  ) {}

  unsubscribe(): void {
    if (this.active) {
      this.active = false;
      this.onUnsubscribe();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getType(): OverlayType {
    return this.type;
  }

  getMetadata() {
    return {
      subscribedAt: Date.now() - 1000, // Mock subscription time
      callbackCount: this.callbackCount,
      lastCallbackAt: this.lastCallbackAt,
    };
  }

  // Internal method to trigger callback
  triggerCallback(state: any): void {
    if (this.active) {
      this.callbackCount++;
      this.lastCallbackAt = Date.now();
      try {
        this.callback(state);
      } catch (error) {
        console.warn('Mock subscription callback error:', error);
      }
    }
  }
}

/**
 * Mock sync adapter implementation
 */
export class MockSyncAdapter implements IOverlaySync {
  readonly syncId = 'mock';
  
  private config: MockSyncAdapterConfig;
  private states = new Map<OverlayType, OverlayState>();
  private subscriptions = new Map<string, MockSubscription>();
  private connectionStatus: ConnectionStatus = 'connected';
  private metrics: SyncMetrics;
  private startTime = Date.now();
  private operationCount = 0;
  private errorCount = 0;
  private latencies: number[] = [];

  constructor(config: Partial<MockSyncAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.metrics = {
      connectionStatus: 'connected',
      averageLatency: 0,
      errorRate: 0,
      lastSyncTime: Date.now(),
      totalSyncs: 0,
      failedSyncs: 0,
      latencyStats: {
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        samples: 0,
      },
      errorBreakdown: {},
      activeSubscriptions: 0,
    };
  }

  async publish<T extends OverlayState>(state: T): Promise<SyncResult> {
    const startTime = Date.now();
    this.operationCount++;

    try {
      // Simulate latency
      if (this.config.simulateLatency) {
        await this.delay(this.config.latencyMs);
      }

      // Simulate failures
      if (this.config.simulateFailures && Math.random() < this.config.failureRate) {
        throw new Error('Simulated network failure');
      }

      // Store state
      this.states.set(state.type, state);

      // Notify subscribers
      this.notifySubscribers(state.type, state);

      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      this.updateMetrics();

      return {
        success: true,
        latency,
        timestamp: Date.now(),
        metadata: {
          mockAdapter: true,
          stateType: state.type,
        },
      };
    } catch (error) {
      this.errorCount++;
      this.updateMetrics();

      const syncError: SyncError = {
        type: SyncErrorType.CONNECTION,
        code: 'MOCK_PUBLISH_FAILED',
        message: error instanceof Error ? error.message : 'Mock publish failed',
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
        originalError: error instanceof Error ? error : new Error('Unknown error'),
      };

      return {
        success: false,
        error: syncError,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  subscribe<T extends OverlayState>(
    type: OverlayType, 
    callback: SyncCallback<T>
  ): SyncSubscription {
    const subscriptionId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const subscription = new MockSubscription(
      type,
      callback,
      () => {
        this.subscriptions.delete(subscriptionId);
        this.updateMetrics();
      }
    );

    this.subscriptions.set(subscriptionId, subscription);
    this.updateMetrics();

    // Immediately send current state if available
    const currentState = this.states.get(type);
    if (currentState) {
      // Use setTimeout to make it async like real implementations
      setTimeout(() => {
        subscription.triggerCallback(currentState);
      }, 0);
    }

    return subscription;
  }

  async clear(type: OverlayType): Promise<SyncResult> {
    const startTime = Date.now();
    this.operationCount++;

    try {
      // Simulate latency
      if (this.config.simulateLatency) {
        await this.delay(this.config.latencyMs / 2); // Faster for clear operations
      }

      // Simulate failures
      if (this.config.simulateFailures && Math.random() < this.config.failureRate) {
        throw new Error('Simulated clear failure');
      }

      // Clear state
      this.states.delete(type);

      // Notify subscribers with null state
      this.notifySubscribers(type, null);

      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      this.updateMetrics();

      return {
        success: true,
        latency,
        timestamp: Date.now(),
        metadata: {
          mockAdapter: true,
          operation: 'clear',
          stateType: type,
        },
      };
    } catch (error) {
      this.errorCount++;
      this.updateMetrics();

      const syncError: SyncError = {
        type: SyncErrorType.CONNECTION,
        code: 'MOCK_CLEAR_FAILED',
        message: error instanceof Error ? error.message : 'Mock clear failed',
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
        originalError: error instanceof Error ? error : new Error('Unknown error'),
      };

      return {
        success: false,
        error: syncError,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  async clearAll(): Promise<SyncResult> {
    const startTime = Date.now();
    this.operationCount++;

    try {
      // Simulate latency
      if (this.config.simulateLatency) {
        await this.delay(this.config.latencyMs);
      }

      // Clear all states
      const types = Array.from(this.states.keys());
      this.states.clear();

      // Notify all subscribers
      for (const type of types) {
        this.notifySubscribers(type, null);
      }

      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      this.updateMetrics();

      return {
        success: true,
        latency,
        timestamp: Date.now(),
        metadata: {
          mockAdapter: true,
          operation: 'clearAll',
          clearedTypes: types,
        },
      };
    } catch (error) {
      this.errorCount++;
      this.updateMetrics();

      const syncError: SyncError = {
        type: SyncErrorType.CONNECTION,
        code: 'MOCK_CLEAR_ALL_FAILED',
        message: error instanceof Error ? error.message : 'Mock clear all failed',
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
        originalError: error instanceof Error ? error : new Error('Unknown error'),
      };

      return {
        success: false,
        error: syncError,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async reconnect(): Promise<void> {
    this.connectionStatus = 'reconnecting';
    
    // Simulate reconnection delay
    await this.delay(this.config.reconnectDelayMs);
    
    this.connectionStatus = 'connected';
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  getDiagnostics(): DiagnosticInfo {
    return {
      syncId: this.syncId,
      connectionDetails: {
        status: this.connectionStatus,
        lastConnectedAt: this.startTime,
        reconnectAttempts: 0,
      },
      performance: this.getMetrics(),
      recentErrors: [], // Mock implementation doesn't track detailed errors
      config: {
        retryEnabled: this.config.autoReconnect,
        maxRetries: 3,
        timeoutMs: 10000,
        debounceMs: 200,
      },
      runtime: {
        uptime: Date.now() - this.startTime,
        version: '1.0.0-mock',
        environment: 'mock',
      },
    };
  }

  resetMetrics(): void {
    this.operationCount = 0;
    this.errorCount = 0;
    this.latencies = [];
    this.updateMetrics();
  }

  dispose(): void {
    // Unsubscribe all subscriptions
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    
    // Clear all states
    this.states.clear();
    
    // Update connection status
    this.connectionStatus = 'disconnected';
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: SyncError;
    timestamp: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Simulate health check latency
      if (this.config.simulateLatency) {
        await this.delay(this.config.latencyMs / 4);
      }

      const latency = Date.now() - startTime;
      
      return {
        healthy: this.connectionStatus === 'connected',
        latency,
        timestamp: Date.now(),
      };
    } catch (error) {
      const syncError: SyncError = {
        type: SyncErrorType.CONNECTION,
        code: 'MOCK_HEALTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Health check failed',
        isRetryable: true,
        requiresReauth: false,
        timestamp: Date.now(),
        originalError: error instanceof Error ? error : new Error('Unknown error'),
      };

      return {
        healthy: false,
        error: syncError,
        timestamp: Date.now(),
      };
    }
  }

  // Configuration methods for testing
  updateConfig(newConfig: Partial<MockSyncAdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MockSyncAdapterConfig {
    return { ...this.config };
  }

  // Simulate connection status changes for testing
  simulateDisconnection(): void {
    this.connectionStatus = 'disconnected';
  }

  simulateReconnection(): void {
    this.connectionStatus = 'connected';
  }

  // Get current state for testing
  getCurrentState(type: OverlayType): OverlayState | undefined {
    return this.states.get(type);
  }

  // Private helper methods

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private notifySubscribers(type: OverlayType, state: OverlayState | null): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.getType() === type) {
        subscription.triggerCallback(state);
      }
    }
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    
    // Keep only last 1000 latencies to prevent memory growth
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    
    // Calculate latency statistics
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const latencyStats = {
      min: sortedLatencies[0] || 0,
      max: sortedLatencies[sortedLatencies.length - 1] || 0,
      p50: this.percentile(sortedLatencies, 0.5),
      p95: this.percentile(sortedLatencies, 0.95),
      p99: this.percentile(sortedLatencies, 0.99),
      samples: sortedLatencies.length,
    };

    this.metrics = {
      connectionStatus: this.connectionStatus,
      averageLatency: this.latencies.length > 0 
        ? this.latencies.reduce((sum, lat) => sum + lat, 0) / this.latencies.length 
        : 0,
      errorRate: this.operationCount > 0 ? (this.errorCount / this.operationCount) * 100 : 0,
      lastSyncTime: now,
      totalSyncs: this.operationCount,
      failedSyncs: this.errorCount,
      latencyStats,
      errorBreakdown: {
        'MOCK_PUBLISH_FAILED': this.errorCount,
      },
      activeSubscriptions: this.subscriptions.size,
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }
}