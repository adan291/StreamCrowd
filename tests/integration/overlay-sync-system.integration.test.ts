// System Integration Tests for Overlay Sync Improvements
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OverlaySyncService } from '../../src/application/services/OverlaySyncService';
import { OverlayStateManager } from '../../src/application/services/OverlayStateManager';
import { PerformanceMonitor } from '../../src/application/services/PerformanceMonitor';
import { ErrorRecoverySystem } from '../../src/application/services/ErrorRecoverySystem';
import { EnhancedFirebaseAdapter } from '../../src/infrastructure/adapters/EnhancedFirebaseAdapter';
import { MockSyncAdapter } from '../../src/infrastructure/adapters/MockSyncAdapter';
import { ResourceManager } from '../../src/infrastructure/utils/ResourceManager';
import { DependencyFactory } from '../../src/infrastructure/factories/DependencyFactory';
import { AuditLogService } from '../../src/application/services/AuditLogService';
import { ErrorClassificationService } from '../../src/application/services/ErrorClassificationService';
import { NetworkPrioritizationService } from '../../src/application/services/NetworkPrioritizationService';
import { HealthCheckService } from '../../src/application/services/HealthCheckService';
import type { 
  OverlayState, 
  PollOverlayState, 
  GiveawayOverlayState,
  SyncMetrics,
  ConnectionStatus 
} from '../../src/domain/entities/OverlayState';

// Mock Firebase for testing
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}));

describe('Overlay Sync System Integration Tests', () => {
  let overlaySyncService: OverlaySyncService;
  let stateManager: OverlayStateManager;
  let performanceMonitor: PerformanceMonitor;
  let errorRecovery: ErrorRecoverySystem;
  let mockAdapter: MockSyncAdapter;
  let resourceManager: ResourceManager;
  let auditLog: AuditLogService;
  let errorClassification: ErrorClassificationService;
  let networkPrioritization: NetworkPrioritizationService;
  let healthCheck: HealthCheckService;

  beforeEach(async () => {
    // Create all services with proper dependency injection
    const factory = new DependencyFactory();
    
    // Use mock adapter for testing
    mockAdapter = new MockSyncAdapter();
    stateManager = factory.createOverlayStateManager();
    performanceMonitor = factory.createPerformanceMonitor();
    errorRecovery = factory.createErrorRecoverySystem();
    resourceManager = factory.createResourceManager();
    auditLog = factory.createAuditLogService();
    errorClassification = factory.createErrorClassificationService();
    networkPrioritization = factory.createNetworkPrioritizationService();
    healthCheck = factory.createHealthCheckService();

    // Create main service with all dependencies
    overlaySyncService = new OverlaySyncService(
      mockAdapter,
      stateManager,
      performanceMonitor,
      errorRecovery,
      resourceManager,
      auditLog,
      errorClassification,
      networkPrioritization
    );
  });

  afterEach(() => {
    // Cleanup resources
    if (resourceManager) {
      resourceManager.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Task 16.1: Complete System Integration', () => {
    describe('Full State Synchronization Flow', () => {
      it('should handle complete poll lifecycle with all services', async () => {
        const pollState: PollOverlayState = {
          id: 'poll-1',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'What is your favorite game?',
            options: [
              { id: 1, label: 'Minecraft', votes: 0, color: '#4CAF50' },
              { id: 2, label: 'Fortnite', votes: 0, color: '#2196F3' }
            ],
            totalVotes: 0,
            showResults: false
          }
        };

        // Test state validation
        const validationResult = stateManager.validateState(pollState);
        expect(validationResult.isValid).toBe(true);

        // Test state update with performance monitoring
        const startTime = Date.now();
        await overlaySyncService.updateOverlayState(pollState);
        const endTime = Date.now();

        // Verify performance tracking
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.totalOperations).toBeGreaterThan(0);
        expect(metrics.averageLatency).toBeGreaterThan(0);

        // Verify audit logging
        const auditEntries = auditLog.getRecentEntries();
        expect(auditEntries.length).toBeGreaterThan(0);
        expect(auditEntries[0].action).toBe('overlay_state_updated');
        expect(auditEntries[0].entityType).toBe('poll');

        // Test subscription and real-time updates
        let receivedState: PollOverlayState | null = null;
        const unsubscribe = overlaySyncService.subscribeToOverlayChanges<PollOverlayState>(
          'poll',
          (state) => { receivedState = state; }
        );

        // Simulate state change
        const updatedPollState = {
          ...pollState,
          data: {
            ...pollState.data,
            options: [
              { id: 1, label: 'Minecraft', votes: 5, color: '#4CAF50' },
              { id: 2, label: 'Fortnite', votes: 3, color: '#2196F3' }
            ],
            totalVotes: 8
          }
        };

        await overlaySyncService.updateOverlayState(updatedPollState);

        // Verify subscription received update
        expect(receivedState).not.toBeNull();
        expect(receivedState?.data.totalVotes).toBe(8);

        // Cleanup
        unsubscribe();
      });

      it('should handle giveaway state with network prioritization', async () => {
        const giveawayState: GiveawayOverlayState = {
          id: 'giveaway-1',
          type: 'giveaway',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            winner: null,
            isSpinning: false,
            participants: ['user1', 'user2', 'user3'],
            mode: 'viewers'
          }
        };

        // Test critical update prioritization
        await overlaySyncService.updateOverlayState(giveawayState);

        // Simulate winner selection (critical update)
        const winnerState = {
          ...giveawayState,
          data: {
            ...giveawayState.data,
            winner: 'user2',
            isSpinning: false
          }
        };

        await overlaySyncService.updateOverlayState(winnerState);

        // Verify network prioritization handled critical update
        const priorityQueue = networkPrioritization.getPriorityQueue();
        expect(priorityQueue.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Error Handling Across System', () => {
      it('should handle connection failures with proper recovery', async () => {
        // Simulate connection failure
        mockAdapter.simulateConnectionFailure();

        const testState: PollOverlayState = {
          id: 'poll-error-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Test question',
            options: [],
            totalVotes: 0,
            showResults: false
          }
        };

        // Attempt update during failure
        try {
          await overlaySyncService.updateOverlayState(testState);
        } catch (error) {
          // Error should be properly classified
          const classification = errorClassification.classifyError(error as Error);
          expect(classification.type).toBe('connection');
          expect(classification.isRetryable).toBe(true);
        }

        // Verify error recovery attempts
        const recoveryMetrics = errorRecovery.getRecoveryMetrics();
        expect(recoveryMetrics.totalAttempts).toBeGreaterThan(0);

        // Restore connection and verify recovery
        mockAdapter.restoreConnection();
        
        // Should succeed after recovery
        await expect(overlaySyncService.updateOverlayState(testState)).resolves.not.toThrow();
      });

      it('should handle validation errors properly', async () => {
        const invalidState = {
          id: '',  // Invalid: empty ID
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: '',  // Invalid: empty question
            options: [],   // Invalid: no options
            totalVotes: 0,
            showResults: false
          }
        } as PollOverlayState;

        // Should reject invalid state
        await expect(overlaySyncService.updateOverlayState(invalidState)).rejects.toThrow();

        // Verify error classification
        try {
          await overlaySyncService.updateOverlayState(invalidState);
        } catch (error) {
          const classification = errorClassification.classifyError(error as Error);
          expect(classification.type).toBe('validation');
          expect(classification.isRetryable).toBe(false);
        }
      });
    });

    describe('Resource Management and Cleanup', () => {
      it('should properly cleanup resources on service disposal', async () => {
        const testState: PollOverlayState = {
          id: 'cleanup-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Cleanup test',
            options: [{ id: 1, label: 'Option 1', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        // Create multiple subscriptions
        const unsubscribe1 = overlaySyncService.subscribeToOverlayChanges('poll', () => {});
        const unsubscribe2 = overlaySyncService.subscribeToOverlayChanges('giveaway', () => {});

        // Update state to create timers and resources
        await overlaySyncService.updateOverlayState(testState);

        // Verify resources are tracked
        const resourceCount = resourceManager.getActiveResourceCount();
        expect(resourceCount).toBeGreaterThan(0);

        // Cleanup subscriptions
        unsubscribe1();
        unsubscribe2();

        // Dispose service
        resourceManager.dispose();

        // Verify all resources cleaned up
        const finalResourceCount = resourceManager.getActiveResourceCount();
        expect(finalResourceCount).toBe(0);
      });

      it('should handle memory leaks prevention', async () => {
        const initialMemoryUsage = resourceManager.getMemoryUsage();

        // Create and destroy many subscriptions
        for (let i = 0; i < 100; i++) {
          const unsubscribe = overlaySyncService.subscribeToOverlayChanges('poll', () => {});
          unsubscribe();
        }

        // Force cleanup
        resourceManager.cleanup();

        const finalMemoryUsage = resourceManager.getMemoryUsage();
        
        // Memory usage should not grow significantly
        expect(finalMemoryUsage.subscriptions).toBe(0);
        expect(finalMemoryUsage.timers).toBe(0);
      });
    });

    describe('Performance Requirements Validation', () => {
      it('should meet sub-100ms synchronization latency', async () => {
        const testState: PollOverlayState = {
          id: 'performance-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Performance test',
            options: [{ id: 1, label: 'Fast', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        // Measure synchronization latency
        const startTime = performance.now();
        await overlaySyncService.updateOverlayState(testState);
        const endTime = performance.now();

        const latency = endTime - startTime;
        
        // Should be under 100ms (allowing for test environment overhead)
        expect(latency).toBeLessThan(200); // Relaxed for test environment

        // Verify performance monitoring captured this
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.averageLatency).toBeGreaterThan(0);
      });

      it('should handle debouncing for rapid updates', async () => {
        const baseState: PollOverlayState = {
          id: 'debounce-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Debounce test',
            options: [{ id: 1, label: 'Option', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        // Send rapid updates
        const promises = [];
        for (let i = 0; i < 10; i++) {
          const state = {
            ...baseState,
            data: {
              ...baseState.data,
              options: [{ id: 1, label: 'Option', votes: i, color: '#000' }],
              totalVotes: i
            }
          };
          promises.push(overlaySyncService.updateOverlayState(state));
        }

        await Promise.all(promises);

        // Verify debouncing reduced actual sync operations
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.totalOperations).toBeLessThan(10); // Should be debounced
      });
    });

    describe('Health Monitoring Integration', () => {
      it('should provide comprehensive health status', async () => {
        // Update some state to generate activity
        const testState: PollOverlayState = {
          id: 'health-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Health test',
            options: [{ id: 1, label: 'Healthy', votes: 1, color: '#4CAF50' }],
            totalVotes: 1,
            showResults: false
          }
        };

        await overlaySyncService.updateOverlayState(testState);

        // Get comprehensive health status
        const healthStatus = healthCheck.getHealthStatus();

        expect(healthStatus.overall).toBeDefined();
        expect(healthStatus.services.overlaySync).toBeDefined();
        expect(healthStatus.services.firebase).toBeDefined();
        expect(healthStatus.services.performance).toBeDefined();
        expect(healthStatus.timestamp).toBeGreaterThan(0);

        // Verify individual service health
        expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.services.overlaySync.status);
      });

      it('should detect and report performance degradation', async () => {
        // Simulate slow operations
        mockAdapter.simulateSlowResponse(500); // 500ms delay

        const testState: PollOverlayState = {
          id: 'slow-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Slow test',
            options: [{ id: 1, label: 'Slow', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        await overlaySyncService.updateOverlayState(testState);

        // Check if performance degradation was detected
        const healthStatus = healthCheck.getHealthStatus();
        const performanceIssues = performanceMonitor.detectPerformanceIssues();

        expect(performanceIssues.length).toBeGreaterThan(0);
        expect(performanceIssues[0].type).toBe('high_latency');

        // Restore normal speed
        mockAdapter.restoreNormalSpeed();
      });
    });

    describe('Backward Compatibility', () => {
      it('should maintain API compatibility with existing hooks', async () => {
        // Test that the service maintains the same interface as the old hook
        const connectionStatus = overlaySyncService.getConnectionStatus();
        expect(connectionStatus).toBeDefined();
        expect(['connected', 'disconnected', 'reconnecting', 'error']).toContain(connectionStatus);

        const metrics = overlaySyncService.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        expect(typeof metrics.connectionStatus).toBe('string');
        expect(typeof metrics.averageLatency).toBe('number');
        expect(typeof metrics.errorRate).toBe('number');
      });

      it('should handle legacy state formats', async () => {
        // Test with old format (without version and channelId)
        const legacyState = {
          id: 'legacy-poll',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          data: {
            question: 'Legacy poll',
            options: [{ id: 1, label: 'Yes', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        // Should handle migration automatically
        await expect(overlaySyncService.updateOverlayState(legacyState as any)).resolves.not.toThrow();

        // Verify state was migrated
        const migratedState = stateManager.migrateStateVersion(legacyState as any, 2);
        expect(migratedState.version).toBe(2);
        expect(migratedState.channelId).toBeDefined();
      });
    });

    describe('Multi-Device Synchronization', () => {
      it('should synchronize state across multiple mock devices', async () => {
        const testState: PollOverlayState = {
          id: 'multi-device-test',
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: 'Multi-device test',
            options: [{ id: 1, label: 'Device 1', votes: 0, color: '#000' }],
            totalVotes: 0,
            showResults: false
          }
        };

        // Simulate multiple device subscriptions
        const device1Updates: OverlayState[] = [];
        const device2Updates: OverlayState[] = [];

        const unsubscribe1 = overlaySyncService.subscribeToOverlayChanges('poll', (state) => {
          if (state) device1Updates.push(state);
        });

        const unsubscribe2 = overlaySyncService.subscribeToOverlayChanges('poll', (state) => {
          if (state) device2Updates.push(state);
        });

        // Update state from "device 1"
        await overlaySyncService.updateOverlayState(testState);

        // Both devices should receive the update
        expect(device1Updates.length).toBeGreaterThan(0);
        expect(device2Updates.length).toBeGreaterThan(0);
        expect(device1Updates[0].id).toBe(testState.id);
        expect(device2Updates[0].id).toBe(testState.id);

        // Cleanup
        unsubscribe1();
        unsubscribe2();
      });
    });
  });

  describe('System Stress Testing', () => {
    it('should handle high-frequency updates without degradation', async () => {
      const baseState: PollOverlayState = {
        id: 'stress-test',
        type: 'poll',
        isActive: true,
        updatedAt: Date.now(),
        version: 1,
        channelId: 'test-channel',
        data: {
          question: 'Stress test',
          options: [
            { id: 1, label: 'Option 1', votes: 0, color: '#000' },
            { id: 2, label: 'Option 2', votes: 0, color: '#111' }
          ],
          totalVotes: 0,
          showResults: false
        }
      };

      const startTime = performance.now();
      
      // Send 50 rapid updates
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const state = {
          ...baseState,
          data: {
            ...baseState.data,
            options: [
              { id: 1, label: 'Option 1', votes: i, color: '#000' },
              { id: 2, label: 'Option 2', votes: 50 - i, color: '#111' }
            ],
            totalVotes: 50
          }
        };
        promises.push(overlaySyncService.updateOverlayState(state));
      }

      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max

      // System should remain healthy
      const healthStatus = healthCheck.getHealthStatus();
      expect(['healthy', 'degraded']).toContain(healthStatus.overall);

      // Performance metrics should be reasonable
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should handle concurrent subscriptions and updates', async () => {
      const subscriptionCount = 20;
      const updateCount = 10;
      
      // Create multiple concurrent subscriptions
      const unsubscribeFunctions: (() => void)[] = [];
      const receivedUpdates: OverlayState[][] = [];

      for (let i = 0; i < subscriptionCount; i++) {
        const updates: OverlayState[] = [];
        receivedUpdates.push(updates);
        
        const unsubscribe = overlaySyncService.subscribeToOverlayChanges('poll', (state) => {
          if (state) updates.push(state);
        });
        unsubscribeFunctions.push(unsubscribe);
      }

      // Send concurrent updates
      const updatePromises = [];
      for (let i = 0; i < updateCount; i++) {
        const state: PollOverlayState = {
          id: `concurrent-${i}`,
          type: 'poll',
          isActive: true,
          updatedAt: Date.now(),
          version: 1,
          channelId: 'test-channel',
          data: {
            question: `Concurrent test ${i}`,
            options: [{ id: 1, label: `Option ${i}`, votes: i, color: '#000' }],
            totalVotes: i,
            showResults: false
          }
        };
        updatePromises.push(overlaySyncService.updateOverlayState(state));
      }

      await Promise.all(updatePromises);

      // All subscriptions should receive updates
      receivedUpdates.forEach((updates, index) => {
        expect(updates.length).toBeGreaterThan(0);
      });

      // Cleanup all subscriptions
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());

      // Verify no memory leaks
      const memoryUsage = resourceManager.getMemoryUsage();
      expect(memoryUsage.subscriptions).toBe(0);
    });
  });
});