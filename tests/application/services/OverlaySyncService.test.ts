/**
 * OverlaySyncService Tests
 * 
 * Comprehensive unit tests for the OverlaySyncService including:
 * - Dependency injection and configuration
 * - Debouncing logic for rapid state changes
 * - State comparison and optimization
 * - Error handling and recovery
 * - Resource management and cleanup
 * - Performance monitoring integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { 
  OverlaySyncService, 
  OverlaySyncServiceConfig, 
} from '@/src/application/services/OverlaySyncService';
import {
  ResourceManager,
  Disposable,
  TimerResource,
  IntervalResource,
  SubscriptionResource,
} from '@/src/infrastructure/utils/ResourceManager';
import { OverlayStateManager } from '@/src/application/services/OverlayStateManager';
import { PerformanceMonitor } from '@/src/application/services/PerformanceMonitor';
import { ErrorRecoverySystem } from '@/src/application/services/ErrorRecoverySystem';
import {
  IOverlaySync,
  SyncCallback,
  SyncSubscription,
  SyncResult,
  ConnectionStatus,
  SyncMetrics,
} from '@/src/domain/ports/IOverlaySync';
import {
  OverlayState,
  PollOverlayState,
  createOverlayState,
} from '@/src/domain/entities/OverlayState';
import { ValidationSyncError } from '@/src/domain/errors/OverlaySyncErrors';

// Mock implementations
class MockSyncAdapter implements IOverlaySync {
  syncId = 'mock-adapter';
  private connectionStatus: ConnectionStatus = 'connected';
  private subscriptions = new Map<string, SyncCallback<OverlayState>>();

  async publish<T extends OverlayState>(state: T): Promise<SyncResult> {
    return {
      success: true,
      timestamp: Date.now(),
      latency: 50,
    };
  }

  subscribe<T extends OverlayState>(
    type: string,
    callback: SyncCallback<T>
  ): SyncSubscription {
    const id = `${type}_${Date.now()}`;
    this.subscriptions.set(id, callback as SyncCallback<OverlayState>);
    
    return {
      unsubscribe: () => this.subscriptions.delete(id),
      isActive: () => this.subscriptions.has(id),
      getType: () => type as any,
      getMetadata: () => ({
        subscribedAt: Date.now(),
        callbackCount: 0,
      }),
    };
  }

  async clear(): Promise<SyncResult> {
    return { success: true, timestamp: Date.now() };
  }

  async clearAll(): Promise<SyncResult> {
    return { success: true, timestamp: Date.now() };
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async reconnect(): Promise<void> {
    this.connectionStatus = 'connected';
  }

  getMetrics(): SyncMetrics {
    return {
      connectionStatus: this.connectionStatus,
      averageLatency: 50,
      errorRate: 0,
      lastSyncTime: Date.now(),
      totalSyncs: 0,
      failedSyncs: 0,
      latencyStats: {
        min: 10,
        max: 100,
        p50: 50,
        p95: 90,
        p99: 95,
        samples: 100,
      },
      errorBreakdown: {},
      activeSubscriptions: this.subscriptions.size,
    };
  }

  async healthCheck() {
    return {
      healthy: true,
      timestamp: Date.now(),
    };
  }

  getDiagnostics() {
    return {
      syncId: this.syncId,
      connectionDetails: {
        status: this.connectionStatus,
        reconnectAttempts: 0,
      },
      performance: this.getMetrics(),
      recentErrors: [],
      config: {
        retryEnabled: true,
        maxRetries: 3,
        timeoutMs: 5000,
        debounceMs: 300,
      },
      runtime: {
        uptime: 1000,
        version: '1.0.0',
        environment: 'test',
      },
    };
  }

  resetMetrics(): void {}
  dispose(): void {}

  // Test helpers
  setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  triggerCallback(type: string, state: OverlayState | null): void {
    for (const [id, callback] of this.subscriptions.entries()) {
      if (id.startsWith(type)) {
        callback(state);
      }
    }
  }
}

class MockResourceManager implements ResourceManager {
  private resources = new Set<Disposable>();
  private disposed = false;

  track(resource: Disposable): void {
    this.resources.add(resource);
  }

  trackTimer(timerId: NodeJS.Timeout): TimerResource {
    const resource = new TimerResource(timerId);
    this.track(resource);
    return resource;
  }

  trackInterval(intervalId: NodeJS.Timeout): IntervalResource {
    const resource = new IntervalResource(intervalId);
    this.track(resource);
    return resource;
  }

  trackSubscription(unsubscribeFn: () => void, onDispose?: () => void): SubscriptionResource {
    const resource = new SubscriptionResource(unsubscribeFn, onDispose);
    this.track(resource);
    return resource;
  }

  trackEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): any {
    // Mock implementation - return a disposable
    const resource = { dispose: vi.fn() };
    this.track(resource);
    return resource;
  }

  trackCallback(cleanupFn: () => void): any {
    // Mock implementation - return a disposable
    const resource = { dispose: vi.fn() };
    this.track(resource);
    return resource;
  }

  untrack(resource: Disposable): void {
    this.resources.delete(resource);
  }

  cleanup(): void {
    for (const resource of this.resources) {
      try {
        resource.dispose();
      } catch (error) {
        // Ignore cleanup errors to prevent cascading failures
        console.warn('Resource cleanup failed:', error);
      }
    }
    this.resources.clear();
    this.disposed = true;
  }

  getResourceCount(): number {
    return this.resources.size;
  }

  getResourceBreakdown(): {
    timers: number;
    intervals: number;
    subscriptions: number;
    eventListeners: number;
    callbacks: number;
    other: number;
    total: number;
  } {
    return {
      timers: 0,
      intervals: 0,
      subscriptions: 0,
      eventListeners: 0,
      callbacks: 0,
      other: this.resources.size,
      total: this.resources.size,
    };
  }

  detectMemoryLeaks(): any {
    return {
      riskLevel: 'low',
      resourceCount: this.resources.size,
      breakdown: this.getResourceBreakdown(),
      recommendations: [],
      timestamp: Date.now(),
    };
  }

  getResourceDetails(): any[] {
    return [];
  }

  dispose(): void {
    this.cleanup();
  }
}

describe('OverlaySyncService', () => {
  let service: OverlaySyncService;
  let mockAdapter: MockSyncAdapter;
  let mockStateManager: OverlayStateManager;
  let mockPerformanceMonitor: PerformanceMonitor;
  let mockErrorRecovery: ErrorRecoverySystem;
  let mockResourceManager: MockResourceManager;

  const createTestPollState = (): PollOverlayState => {
    return createOverlayState('poll', 'test-channel', {
      question: 'Test poll?',
      options: [
        { id: 1, label: 'Option 1', votes: 0, color: '#ff0000' },
        { id: 2, label: 'Option 2', votes: 0, color: '#00ff00' },
      ],
      totalVotes: 0,
      showResults: false,
      startTime: Date.now(),
    });
  };

  beforeEach(() => {
    // Create mocks
    mockAdapter = new MockSyncAdapter();
    mockStateManager = new OverlayStateManager();
    mockPerformanceMonitor = new PerformanceMonitor();
    mockErrorRecovery = new ErrorRecoverySystem();
    mockResourceManager = new MockResourceManager();

    // Mock state manager methods
    vi.spyOn(mockStateManager, 'validateState').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    vi.spyOn(mockStateManager, 'compareStates').mockReturnValue(false);
    vi.spyOn(mockStateManager, 'transformForSync').mockImplementation((state) => state);

    // Mock performance monitor methods
    vi.spyOn(mockPerformanceMonitor, 'recordSyncLatency').mockImplementation(() => {});
    vi.spyOn(mockPerformanceMonitor, 'recordSyncError').mockImplementation(() => {});
    vi.spyOn(mockPerformanceMonitor, 'recordConnectionStatusChange').mockImplementation(() => {});

    // Mock error recovery methods
    vi.spyOn(mockErrorRecovery, 'handleConnectionFailure').mockResolvedValue({
      success: true,
      attempts: 1,
      recoveryTimeMs: 100,
      fallbackActivated: false,
      strategy: 'retry',
    });

    // Create service with test configuration
    const config: Partial<OverlaySyncServiceConfig> = {
      serviceId: 'test-service',
      debouncing: {
        poll: { delayMs: 100, maxDelayMs: 300, enabled: true },
        giveaway: { delayMs: 50, maxDelayMs: 200, enabled: true },
        game: { delayMs: 25, maxDelayMs: 100, enabled: true },
        prediction: { delayMs: 75, maxDelayMs: 250, enabled: true },
      },
      monitoringEnabled: true,
      autoRecoveryEnabled: true,
      maxSubscriptions: 10,
    };

    service = new OverlaySyncService(
      mockAdapter,
      mockStateManager,
      mockPerformanceMonitor,
      mockErrorRecovery,
      mockResourceManager,
      config
    );
  });

  afterEach(() => {
    service.dispose();
    vi.clearAllMocks();
  });

  describe('Constructor and Dependency Injection', () => {
    it('should initialize with all required dependencies', () => {
      expect(service).toBeDefined();
      expect(service.getConnectionStatus()).toBe('connected');
    });

    it('should use default configuration when partial config provided', () => {
      const minimalService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery
      );

      expect(minimalService).toBeDefined();
      minimalService.dispose();
    });

    it('should track itself for resource cleanup', () => {
      expect(mockResourceManager.getResourceCount()).toBeGreaterThan(0);
    });
  });

  describe('State Updates with Debouncing', () => {
    it('should update overlay state successfully', async () => {
      const state = createTestPollState();
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      await service.updateOverlayState(state);

      // Should be debounced, so wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(publishSpy).toHaveBeenCalledWith(state);
      expect(mockPerformanceMonitor.recordSyncLatency).toHaveBeenCalled();
    });

    it('should debounce rapid state changes', async () => {
      // Create a service with longer debounce to make timing more predictable
      const debounceService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        {
          debouncing: {
            poll: { delayMs: 100, maxDelayMs: 200, enabled: true },
            giveaway: { delayMs: 100, maxDelayMs: 200, enabled: true },
            game: { delayMs: 100, maxDelayMs: 200, enabled: true },
            prediction: { delayMs: 100, maxDelayMs: 200, enabled: true },
          },
        }
      );

      // Create states with the same ID and channelId to ensure same state key
      const baseState = createTestPollState();
      const state1 = { ...baseState };
      const state2 = { ...baseState, data: { ...baseState.data, question: 'Updated question' } };
      
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      // Fire rapid updates to the same state key without awaiting
      debounceService.updateOverlayState(state1);
      debounceService.updateOverlayState(state2);

      // Wait for debounce delay to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only publish the latest state due to debouncing
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(state2);

      debounceService.dispose();
    });

    it('should enforce maximum debounce delay', async () => {
      const state = createTestPollState();
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      await service.updateOverlayState(state);

      // Wait for max delay (300ms for poll)
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(publishSpy).toHaveBeenCalledWith(state);
    });

    it('should skip debouncing when disabled', async () => {
      // Create service with debouncing disabled
      const config: Partial<OverlaySyncServiceConfig> = {
        debouncing: {
          poll: { delayMs: 100, maxDelayMs: 300, enabled: false },
          giveaway: { delayMs: 50, maxDelayMs: 200, enabled: false },
          game: { delayMs: 25, maxDelayMs: 100, enabled: false },
          prediction: { delayMs: 75, maxDelayMs: 250, enabled: false },
        },
      };

      const immediateService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        config
      );

      const state = createTestPollState();
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      await immediateService.updateOverlayState(state);

      // Should publish immediately without debouncing
      expect(publishSpy).toHaveBeenCalledWith(state);

      immediateService.dispose();
    });
  });

  describe('State Comparison and Optimization', () => {
    it('should skip identical state updates', async () => {
      const state = createTestPollState();
      
      // First update to populate cache
      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Reset spy after first update
      const publishSpy = vi.spyOn(mockAdapter, 'publish');
      
      // Mock state comparison to return true (identical) for second update
      vi.spyOn(mockStateManager, 'compareStates').mockReturnValue(true);
      
      // Second update should be skipped
      await service.updateOverlayState(state);

      expect(publishSpy).not.toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordSyncLatency).toHaveBeenCalled();
    });

    it('should update when states are different', async () => {
      const state = createTestPollState();
      
      // Mock state comparison to return false (different)
      vi.spyOn(mockStateManager, 'compareStates').mockReturnValue(false);
      
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(publishSpy).toHaveBeenCalledWith(state);
    });

    it('should cache states for future comparisons', async () => {
      const state1 = createTestPollState();
      const state2 = { ...state1, data: { ...state1.data, totalVotes: 5 } };

      await service.updateOverlayState(state1);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second update should trigger comparison
      await service.updateOverlayState(state2);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockStateManager.compareStates).toHaveBeenCalled();
    });
  });

  describe('Subscriptions Management', () => {
    it('should create subscription successfully', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToOverlayChanges('poll', callback);

      expect(unsubscribe).toBeTypeOf('function');
      expect(service.getPerformanceMetrics().serviceMetrics.activeSubscriptions).toBe(1);
    });

    it('should call subscription callback when state changes', () => {
      const callback = vi.fn();
      service.subscribeToOverlayChanges('poll', callback);

      const state = createTestPollState();
      mockAdapter.triggerCallback('poll', state);

      expect(callback).toHaveBeenCalledWith(state);
    });

    it('should unsubscribe successfully', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToOverlayChanges('poll', callback);

      unsubscribe();

      expect(service.getPerformanceMetrics().serviceMetrics.activeSubscriptions).toBe(0);
    });

    it('should enforce subscription limits', () => {
      const callback = vi.fn();

      // Create maximum subscriptions (10 in test config)
      for (let i = 0; i < 10; i++) {
        service.subscribeToOverlayChanges('poll', callback);
      }

      // 11th subscription should throw
      expect(() => {
        service.subscribeToOverlayChanges('poll', callback);
      }).toThrow('Maximum subscriptions');
    });

    it('should track subscription metadata', () => {
      const callback = vi.fn();
      service.subscribeToOverlayChanges('poll', callback);

      const state = createTestPollState();
      mockAdapter.triggerCallback('poll', state);

      // Callback should be tracked
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle validation errors', async () => {
      const state = createTestPollState();
      
      // Mock validation failure
      vi.spyOn(mockStateManager, 'validateState').mockReturnValue({
        isValid: false,
        errors: [{ field: 'question', message: 'Required', code: 'REQUIRED', value: '' }],
        warnings: [],
      });

      // Disable auto-recovery to ensure error is thrown
      const noRecoveryService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        { autoRecoveryEnabled: false }
      );

      await expect(noRecoveryService.updateOverlayState(state)).rejects.toThrow('State validation failed');
      expect(mockPerformanceMonitor.recordSyncError).toHaveBeenCalled();
      
      noRecoveryService.dispose();
    });

    it('should handle adapter publish failures', async () => {
      const state = createTestPollState();
      
      // Mock adapter failure
      vi.spyOn(mockAdapter, 'publish').mockResolvedValue({
        success: false,
        error: {
          type: 'connection',
          code: 'NETWORK_ERROR',
          message: 'Network failed',
          isRetryable: true,
          requiresReauth: false,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      await expect(service.updateOverlayState(state)).rejects.toThrow();
      expect(mockErrorRecovery.handleConnectionFailure).toHaveBeenCalled();
    });

    it('should recover from errors when auto-recovery enabled', async () => {
      const state = createTestPollState();
      
      // Mock initial failure then success
      let callCount = 0;
      vi.spyOn(mockAdapter, 'publish').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return { success: true, timestamp: Date.now() };
      });

      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockErrorRecovery.handleConnectionFailure).toHaveBeenCalled();
    });

    it('should not attempt recovery when auto-recovery disabled', async () => {
      // Create service with auto-recovery disabled
      const noRecoveryService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        { autoRecoveryEnabled: false }
      );

      const state = createTestPollState();
      
      vi.spyOn(mockAdapter, 'publish').mockRejectedValue(new Error('Network error'));

      await expect(noRecoveryService.updateOverlayState(state)).rejects.toThrow('Network error');
      expect(mockErrorRecovery.handleConnectionFailure).not.toHaveBeenCalled();

      noRecoveryService.dispose();
    });
  });

  describe('Clear Operations', () => {
    it('should clear overlay successfully', async () => {
      const clearSpy = vi.spyOn(mockAdapter, 'clear');

      await service.clearOverlay('poll');

      expect(clearSpy).toHaveBeenCalledWith('poll');
      expect(mockPerformanceMonitor.recordSyncLatency).toHaveBeenCalled();
    });

    it('should handle clear operation failures', async () => {
      vi.spyOn(mockAdapter, 'clear').mockResolvedValue({
        success: false,
        error: {
          type: 'permission',
          code: 'ACCESS_DENIED',
          message: 'Access denied',
          isRetryable: false,
          requiresReauth: true,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      await expect(service.clearOverlay('poll')).rejects.toThrow('Clear operation failed');
      expect(mockPerformanceMonitor.recordSyncError).toHaveBeenCalled();
    });

    it('should clear local state cache on successful clear', async () => {
      const state = createTestPollState();
      
      // First update to populate cache
      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Then clear
      await service.clearOverlay('poll');

      // Cache should be cleared (verified by checking if next update doesn't skip)
      vi.spyOn(mockStateManager, 'compareStates').mockReturnValue(false);
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(publishSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should return comprehensive performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('connectionStatus');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('serviceMetrics');
      expect(metrics.serviceMetrics).toHaveProperty('uptime');
      expect(metrics.serviceMetrics).toHaveProperty('activeSubscriptions');
      expect(metrics.serviceMetrics).toHaveProperty('pendingUpdates');
      expect(metrics.serviceMetrics).toHaveProperty('cachedStates');
      expect(metrics.serviceMetrics).toHaveProperty('resourceCount');
      expect(metrics.serviceMetrics).toHaveProperty('resourceBreakdown');
      expect(metrics.serviceMetrics).toHaveProperty('memoryLeakRisk');
      expect(metrics.serviceMetrics.resourceBreakdown).toHaveProperty('timers');
      expect(metrics.serviceMetrics.resourceBreakdown).toHaveProperty('intervals');
      expect(metrics.serviceMetrics.resourceBreakdown).toHaveProperty('subscriptions');
      expect(metrics.serviceMetrics.resourceBreakdown).toHaveProperty('other');
      expect(metrics.serviceMetrics.resourceBreakdown).toHaveProperty('total');
    });

    it('should track active subscriptions in metrics', () => {
      const callback = vi.fn();
      service.subscribeToOverlayChanges('poll', callback);
      service.subscribeToOverlayChanges('giveaway', callback);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.serviceMetrics.activeSubscriptions).toBe(2);
    });

    it('should record metrics when monitoring enabled', async () => {
      const state = createTestPollState();

      await service.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockPerformanceMonitor.recordSyncLatency).toHaveBeenCalledWith(
        'updateOverlayState',
        expect.any(Number)
      );
    });

    it('should not record metrics when monitoring disabled', async () => {
      // Create service with monitoring disabled
      const noMonitoringService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        { monitoringEnabled: false }
      );

      const state = createTestPollState();

      await noMonitoringService.updateOverlayState(state);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockPerformanceMonitor.recordSyncLatency).not.toHaveBeenCalled();

      noMonitoringService.dispose();
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should dispose successfully', () => {
      const callback = vi.fn();
      const cleanupSpy = vi.spyOn(mockResourceManager, 'cleanup');
      service.subscribeToOverlayChanges('poll', callback);

      service.dispose();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(service.getPerformanceMetrics().serviceMetrics.activeSubscriptions).toBe(0);
    });

    it('should prevent operations after disposal', () => {
      service.dispose();

      expect(() => {
        service.subscribeToOverlayChanges('poll', vi.fn());
      }).toThrow('OverlaySyncService has been disposed');
    });

    it('should cancel pending updates on disposal', async () => {
      // Create a service with longer debounce to ensure we can dispose before completion
      const disposalService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        {
          debouncing: {
            poll: { delayMs: 500, maxDelayMs: 1000, enabled: true },
            giveaway: { delayMs: 500, maxDelayMs: 1000, enabled: true },
            game: { delayMs: 500, maxDelayMs: 1000, enabled: true },
            prediction: { delayMs: 500, maxDelayMs: 1000, enabled: true },
          },
        }
      );

      const state = createTestPollState();
      const publishSpy = vi.spyOn(mockAdapter, 'publish');

      // Start update but don't await - this will be debounced
      const updatePromise = disposalService.updateOverlayState(state);

      // Dispose immediately to ensure timer is cancelled before it completes
      disposalService.dispose();

      // Update should be rejected due to disposal
      await expect(updatePromise).rejects.toThrow('Service disposed');
      
      // Wait a bit to ensure no delayed publish occurs
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify no publish occurred
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('should clean up subscriptions on disposal', () => {
      const callback = vi.fn();
      const unsubscribeSpy = vi.fn();
      
      // Mock subscription with spy
      vi.spyOn(mockAdapter, 'subscribe').mockReturnValue({
        unsubscribe: unsubscribeSpy,
        isActive: () => true,
        getType: () => 'poll',
        getMetadata: () => ({ subscribedAt: Date.now(), callbackCount: 0 }),
      });

      service.subscribeToOverlayChanges('poll', callback);
      service.dispose();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    it('should return current connection status', () => {
      expect(service.getConnectionStatus()).toBe('connected');

      mockAdapter.setConnectionStatus('disconnected');
      expect(service.getConnectionStatus()).toBe('disconnected');
    });

    it('should monitor connection status changes', () => {
      // Connection monitoring is initialized in constructor
      expect(mockPerformanceMonitor.recordConnectionStatusChange).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty state gracefully', async () => {
      const emptyState = {} as PollOverlayState;
      
      vi.spyOn(mockStateManager, 'validateState').mockReturnValue({
        isValid: false,
        errors: [{ field: 'type', message: 'Required', code: 'REQUIRED' }],
        warnings: [],
      });

      // Disable auto-recovery to ensure error is thrown
      const noRecoveryService = new OverlaySyncService(
        mockAdapter,
        mockStateManager,
        mockPerformanceMonitor,
        mockErrorRecovery,
        mockResourceManager,
        { autoRecoveryEnabled: false }
      );

      await expect(noRecoveryService.updateOverlayState(emptyState)).rejects.toThrow('State validation failed');
      
      noRecoveryService.dispose();
    });

    it('should handle subscription callback errors gracefully', () => {
      const faultyCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      service.subscribeToOverlayChanges('poll', faultyCallback);

      // Should not throw when callback fails (error is caught and logged)
      expect(() => {
        mockAdapter.triggerCallback('poll', createTestPollState());
      }).not.toThrow();
      
      // Verify callback was called despite the error
      expect(faultyCallback).toHaveBeenCalled();
    });

    it('should handle resource cleanup errors gracefully', () => {
      const faultyResource = {
        dispose: vi.fn().mockImplementation(() => {
          throw new Error('Cleanup error');
        }),
      };

      mockResourceManager.track(faultyResource);

      // Should not throw during disposal (errors are caught and logged)
      expect(() => {
        service.dispose();
      }).not.toThrow();
      
      // Verify cleanup was attempted
      expect(faultyResource.dispose).toHaveBeenCalled();
    });
  });
});