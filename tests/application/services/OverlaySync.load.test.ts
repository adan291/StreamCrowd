/**
 * Overlay Sync Load Testing Suite
 * 
 * Specialized load tests for overlay synchronization focusing on:
 * - High-volume concurrent operations
 * - Stress testing under extreme conditions
 * - Memory and resource usage under sustained load
 * - Performance degradation analysis
 * 
 * Requirements: 7.1, 7.3, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import * as fc from 'fast-check';

import { 
  OverlaySyncService, 
  OverlaySyncServiceConfig, 
} from '@/src/application/services/OverlaySyncService';
import { OverlayStateManager } from '@/src/application/services/OverlayStateManager';
import { PerformanceMonitor } from '@/src/application/services/PerformanceMonitor';
import { ErrorRecoverySystem } from '@/src/application/services/ErrorRecoverySystem';
import { ResourceManager } from '@/src/infrastructure/utils/ResourceManager';
import { MockSyncAdapter } from '@/src/infrastructure/adapters/MockSyncAdapter';

import {
  OverlayState,
  createOverlayState,
} from '@/src/domain/entities/OverlayState';

// Load test configuration
const LOAD_TEST_CONFIG = {
  // Stress test parameters
  EXTREME_DEVICE_COUNT: 100,
  EXTREME_UPDATE_COUNT: 1000,
  STRESS_TEST_DURATION_MS: 30000, // 30 seconds
  
  // Performance thresholds under load
  MAX_LATENCY_UNDER_LOAD: 500, // ms
  MAX_MEMORY_GROWTH_UNDER_LOAD: 100, // MB
  MIN_SUCCESS_RATE_UNDER_LOAD: 0.8, // 80%
  
  // Concurrent operation limits
  MAX_CONCURRENT_OPERATIONS: 500,
  BATCH_SIZE: 50,
  
  // Resource monitoring
  RESOURCE_CHECK_INTERVAL: 1000, // ms
  MAX_RESOURCE_GROWTH_RATE: 10, // resources per second
};

/**
 * Load testing utilities
 */
class LoadTestHarness {
  private services: OverlaySyncService[] = [];
  private adapters: MockSyncAdapter[] = [];
  private resourceManagers: ResourceManager[] = [];
  private performanceMonitors: PerformanceMonitor[] = [];
  
  private operationCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private latencies: number[] = [];
  
  constructor(private deviceCount: number) {
    this.initializeServices();
  }

  private initializeServices(): void {
    for (let i = 0; i < this.deviceCount; i++) {
      const adapter = new MockSyncAdapter({
        simulateLatency: true,
        latencyMs: 50 + Math.random() * 100, // Vary latency per device
        simulateFailures: false,
        failureRate: 0.02, // 2% failure rate
        autoReconnect: true,
        reconnectDelayMs: 1000,
      });

      const stateManager = new OverlayStateManager();
      const performanceMonitor = new PerformanceMonitor();
      const errorRecovery = new ErrorRecoverySystem();
      const resourceManager = new ResourceManager();

      const service = new OverlaySyncService(
        adapter,
        stateManager,
        performanceMonitor,
        errorRecovery,
        resourceManager,
        {
          serviceId: `load-test-device-${i}`,
          debouncing: {
            poll: { delayMs: 50, maxDelayMs: 200, enabled: true },
            giveaway: { delayMs: 25, maxDelayMs: 100, enabled: true },
            game: { delayMs: 10, maxDelayMs: 50, enabled: true },
            prediction: { delayMs: 40, maxDelayMs: 150, enabled: true },
          },
          monitoringEnabled: true,
          autoRecoveryEnabled: true,
          maxSubscriptions: 100,
          networkPrioritizationEnabled: true,
        }
      );

      this.services.push(service);
      this.adapters.push(adapter);
      this.resourceManagers.push(resourceManager);
      this.performanceMonitors.push(performanceMonitor);
    }
  }

  async executeLoadTest(
    operationCount: number,
    concurrencyLevel: number = 10,
    testDurationMs?: number
  ): Promise<LoadTestResults> {
    const startTime = Date.now();
    const endTime = testDurationMs ? startTime + testDurationMs : undefined;
    
    this.resetCounters();
    
    const batches: Promise<void>[] = [];
    let operationsExecuted = 0;

    while (operationsExecuted < operationCount && (!endTime || Date.now() < endTime)) {
      const batchSize = Math.min(concurrencyLevel, operationCount - operationsExecuted);
      const batchPromises: Promise<void>[] = [];

      for (let i = 0; i < batchSize; i++) {
        const deviceIndex = operationsExecuted % this.deviceCount;
        const service = this.services[deviceIndex];
        
        const operation = this.executeRandomOperation(service, operationsExecuted);
        batchPromises.push(operation);
        
        operationsExecuted++;
      }

      batches.push(Promise.all(batchPromises).then(() => {}));
      
      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    await Promise.all(batches);
    
    // Wait for debouncing to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    const totalTime = Date.now() - startTime;
    
    return {
      totalOperations: this.operationCount,
      successfulOperations: this.successCount,
      failedOperations: this.errorCount,
      successRate: this.successCount / this.operationCount,
      totalTimeMs: totalTime,
      operationsPerSecond: (this.operationCount / totalTime) * 1000,
      averageLatency: this.latencies.length > 0 ? 
        this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 0,
      maxLatency: this.latencies.length > 0 ? Math.max(...this.latencies) : 0,
      minLatency: this.latencies.length > 0 ? Math.min(...this.latencies) : 0,
      p95Latency: this.calculatePercentile(this.latencies, 0.95),
      p99Latency: this.calculatePercentile(this.latencies, 0.99),
      deviceCount: this.deviceCount,
      memoryUsage: this.getMemoryUsage(),
      resourceUsage: this.getResourceUsage(),
    };
  }

  private async executeRandomOperation(service: OverlaySyncService, operationId: number): Promise<void> {
    const operationStart = performance.now();
    
    try {
      this.operationCount++;
      
      const overlayTypes = ['poll', 'giveaway', 'game', 'prediction'] as const;
      const randomType = overlayTypes[Math.floor(Math.random() * overlayTypes.length)];
      
      const state = this.createRandomState(randomType, operationId);
      
      await service.updateOverlayState(state);
      
      this.successCount++;
      
    } catch (error) {
      this.errorCount++;
    } finally {
      const operationEnd = performance.now();
      this.latencies.push(operationEnd - operationStart);
    }
  }

  private createRandomState(type: string, operationId: number): OverlayState {
    const channelId = `channel-${Math.floor(operationId / 100)}`; // Group operations by channel
    
    switch (type) {
      case 'poll':
        return createOverlayState('poll', channelId, {
          question: `Load test poll ${operationId}?`,
          options: Array.from({ length: 2 + Math.floor(Math.random() * 4) }, (_, i) => ({
            id: i + 1,
            label: `Option ${i + 1}`,
            votes: Math.floor(Math.random() * 1000),
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          })),
          totalVotes: Math.floor(Math.random() * 5000),
          showResults: Math.random() > 0.5,
          startTime: Date.now(),
        });
        
      case 'giveaway':
        return createOverlayState('giveaway', channelId, {
          winner: Math.random() > 0.8 ? `winner-${operationId}` : null,
          isSpinning: Math.random() > 0.7,
          participants: Array.from({ length: Math.floor(Math.random() * 100) }, (_, i) => `user-${i}`),
          mode: ['viewers', 'keyword', 'subscribers'][Math.floor(Math.random() * 3)] as any,
          prizeTitle: `Prize ${operationId}`,
          prizeImage: null,
        });
        
      case 'game':
        return createOverlayState('game', channelId, {
          gameType: ['duck-hunt', 'fishing', 'roulette'][Math.floor(Math.random() * 3)],
          state: { 
            score: Math.floor(Math.random() * 10000),
            level: Math.floor(Math.random() * 10) + 1,
            operationId,
          },
          players: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => `player-${i}`),
          isActive: Math.random() > 0.3,
        });
        
      case 'prediction':
        return createOverlayState('prediction', channelId, {
          title: `Prediction ${operationId}`,
          outcomes: Array.from({ length: 2 }, (_, i) => ({
            id: `${i + 1}`,
            title: `Outcome ${i + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            users: Math.floor(Math.random() * 1000),
            channelPoints: Math.floor(Math.random() * 100000),
          })),
          predictionWindow: 300 + Math.floor(Math.random() * 600),
          status: ['ACTIVE', 'LOCKED', 'RESOLVED'][Math.floor(Math.random() * 3)] as any,
        });
        
      default:
        throw new Error(`Unknown overlay type: ${type}`);
    }
  }

  private resetCounters(): void {
    this.operationCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.latencies = [];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index] || 0;
  }

  private getMemoryUsage(): MemoryUsageInfo {
    const usage = process.memoryUsage();
    return {
      heapUsedMB: usage.heapUsed / 1024 / 1024,
      heapTotalMB: usage.heapTotal / 1024 / 1024,
      externalMB: usage.external / 1024 / 1024,
      rssMB: usage.rss / 1024 / 1024,
    };
  }

  private getResourceUsage(): ResourceUsageInfo {
    const totalResources = this.resourceManagers.reduce(
      (sum, manager) => sum + manager.getResourceCount(), 0
    );
    
    const breakdowns = this.resourceManagers.map(manager => manager.getResourceBreakdown());
    const aggregatedBreakdown = breakdowns.reduce((acc, breakdown) => ({
      timers: acc.timers + breakdown.timers,
      intervals: acc.intervals + breakdown.intervals,
      subscriptions: acc.subscriptions + breakdown.subscriptions,
      eventListeners: acc.eventListeners + breakdown.eventListeners,
      callbacks: acc.callbacks + breakdown.callbacks,
      other: acc.other + breakdown.other,
      total: acc.total + breakdown.total,
    }), {
      timers: 0,
      intervals: 0,
      subscriptions: 0,
      eventListeners: 0,
      callbacks: 0,
      other: 0,
      total: 0,
    });

    return {
      totalResources,
      breakdown: aggregatedBreakdown,
      averageResourcesPerDevice: totalResources / this.deviceCount,
    };
  }

  getServices(): OverlaySyncService[] {
    return this.services;
  }

  dispose(): void {
    this.services.forEach(service => service.dispose());
  }
}

interface LoadTestResults {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  totalTimeMs: number;
  operationsPerSecond: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  p95Latency: number;
  p99Latency: number;
  deviceCount: number;
  memoryUsage: MemoryUsageInfo;
  resourceUsage: ResourceUsageInfo;
}

interface MemoryUsageInfo {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
}

interface ResourceUsageInfo {
  totalResources: number;
  breakdown: {
    timers: number;
    intervals: number;
    subscriptions: number;
    eventListeners: number;
    callbacks: number;
    other: number;
    total: number;
  };
  averageResourcesPerDevice: number;
}

describe('Overlay Sync Load Tests', () => {
  describe('High-Volume Concurrent Operations', () => {
    it('should handle moderate concurrent load efficiently', async () => {
      const harness = new LoadTestHarness(10);
      
      try {
        const results = await harness.executeLoadTest(500, 20);
        
        // Performance requirements under moderate load
        expect(results.successRate).toBeGreaterThan(0.95); // 95% success rate
        expect(results.averageLatency).toBeLessThan(200); // Average < 200ms
        expect(results.p95Latency).toBeLessThan(500); // 95th percentile < 500ms
        expect(results.operationsPerSecond).toBeGreaterThan(50); // At least 50 ops/sec
        
        // Memory usage should be reasonable
        expect(results.memoryUsage.heapUsedMB).toBeLessThan(100);
        
        // Resource usage should be controlled
        expect(results.resourceUsage.averageResourcesPerDevice).toBeLessThan(20);
        
      } finally {
        harness.dispose();
      }
    });

    it('should maintain performance under high concurrent load', async () => {
      const harness = new LoadTestHarness(25);
      
      try {
        const results = await harness.executeLoadTest(1000, 50);
        
        // Performance requirements under high load
        expect(results.successRate).toBeGreaterThan(LOAD_TEST_CONFIG.MIN_SUCCESS_RATE_UNDER_LOAD);
        expect(results.averageLatency).toBeLessThan(LOAD_TEST_CONFIG.MAX_LATENCY_UNDER_LOAD);
        expect(results.operationsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
        
        // Memory growth should be controlled
        expect(results.memoryUsage.heapUsedMB).toBeLessThan(LOAD_TEST_CONFIG.MAX_MEMORY_GROWTH_UNDER_LOAD);
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle extreme concurrent load gracefully', async () => {
      const harness = new LoadTestHarness(LOAD_TEST_CONFIG.EXTREME_DEVICE_COUNT);
      
      try {
        const results = await harness.executeLoadTest(
          LOAD_TEST_CONFIG.EXTREME_UPDATE_COUNT,
          LOAD_TEST_CONFIG.MAX_CONCURRENT_OPERATIONS
        );
        
        // Under extreme load, we accept degraded but functional performance
        expect(results.successRate).toBeGreaterThan(0.7); // 70% success rate minimum
        expect(results.averageLatency).toBeLessThan(1000); // Average < 1 second
        expect(results.operationsPerSecond).toBeGreaterThan(50); // At least 50 ops/sec
        
        // System should not crash or leak excessive memory
        expect(results.memoryUsage.heapUsedMB).toBeLessThan(200);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Sustained Load Testing', () => {
    it('should maintain performance during sustained operations', async () => {
      const harness = new LoadTestHarness(15);
      
      try {
        // Run sustained load for 10 seconds
        const results = await harness.executeLoadTest(
          Number.MAX_SAFE_INTEGER, // Unlimited operations
          30, // Moderate concurrency
          10000 // 10 seconds
        );
        
        // Performance should remain stable over time
        expect(results.successRate).toBeGreaterThan(0.9);
        expect(results.averageLatency).toBeLessThan(300);
        expect(results.operationsPerSecond).toBeGreaterThan(75);
        
        // Memory usage should stabilize, not grow continuously
        expect(results.memoryUsage.heapUsedMB).toBeLessThan(150);
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle long-duration stress test', async () => {
      const harness = new LoadTestHarness(20);
      
      try {
        // Run stress test for 30 seconds
        const results = await harness.executeLoadTest(
          Number.MAX_SAFE_INTEGER,
          40,
          LOAD_TEST_CONFIG.STRESS_TEST_DURATION_MS
        );
        
        // System should remain functional under prolonged stress
        expect(results.successRate).toBeGreaterThan(0.8);
        expect(results.averageLatency).toBeLessThan(600);
        expect(results.totalOperations).toBeGreaterThan(1000); // Should process significant volume
        
        // Resource usage should not grow unbounded
        expect(results.resourceUsage.averageResourcesPerDevice).toBeLessThan(50);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Memory and Resource Stress Testing', () => {
    it('should handle memory pressure efficiently', async () => {
      const initialMemory = process.memoryUsage();
      const harness = new LoadTestHarness(50);
      
      try {
        // Create memory pressure with large state objects
        const services = harness.getServices();
        const largeStatePromises: Promise<void>[] = [];
        
        for (let i = 0; i < 200; i++) {
          const service = services[i % services.length];
          
          // Create large poll state with many options
          const largeState = createOverlayState('poll', `channel-${i}`, {
            question: `Large poll ${i} with extensive description: ${'x'.repeat(1000)}`,
            options: Array.from({ length: 20 }, (_, j) => ({
              id: j + 1,
              label: `Option ${j + 1}: ${'y'.repeat(100)}`,
              votes: Math.floor(Math.random() * 10000),
              color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            })),
            totalVotes: Math.floor(Math.random() * 200000),
            showResults: false,
            startTime: Date.now(),
          });
          
          largeStatePromises.push(service.updateOverlayState(largeState));
        }
        
        await Promise.all(largeStatePromises);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const finalMemory = process.memoryUsage();
        const memoryGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        
        // Memory growth should be reasonable even with large states
        expect(memoryGrowthMB).toBeLessThan(200);
        
      } finally {
        harness.dispose();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });

    it('should manage resources efficiently under load', async () => {
      const harness = new LoadTestHarness(30);
      
      try {
        const services = harness.getServices();
        const subscriptions: Array<() => void> = [];
        
        // Create many subscriptions to stress resource management
        services.forEach((service, serviceIndex) => {
          for (let i = 0; i < 20; i++) {
            const callback = vi.fn();
            const unsubscribe = service.subscribeToOverlayChanges('poll', callback);
            subscriptions.push(unsubscribe);
          }
        });
        
        // Perform operations while subscriptions are active
        const results = await harness.executeLoadTest(300, 25);
        
        expect(results.successRate).toBeGreaterThan(0.85);
        expect(results.resourceUsage.breakdown.subscriptions).toBe(600); // 30 services * 20 subscriptions
        
        // Cleanup half the subscriptions
        const halfPoint = Math.floor(subscriptions.length / 2);
        subscriptions.slice(0, halfPoint).forEach(unsubscribe => unsubscribe());
        
        // Perform more operations
        const results2 = await harness.executeLoadTest(200, 20);
        
        expect(results2.successRate).toBeGreaterThan(0.9); // Should improve after cleanup
        expect(results2.resourceUsage.breakdown.subscriptions).toBe(300); // Half remaining
        
        // Cleanup remaining subscriptions
        subscriptions.slice(halfPoint).forEach(unsubscribe => unsubscribe());
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process batches efficiently', async () => {
      const harness = new LoadTestHarness(5);
      
      try {
        const services = harness.getServices();
        const batchSizes = [10, 25, 50, 100];
        const batchResults: Array<{ batchSize: number; avgLatency: number; throughput: number }> = [];
        
        for (const batchSize of batchSizes) {
          const startTime = performance.now();
          const batchPromises: Promise<void>[] = [];
          
          for (let i = 0; i < batchSize; i++) {
            const service = services[i % services.length];
            const state = createOverlayState('game', 'batch-test', {
              gameType: 'batch-test',
              state: { batchId: batchSize, operationId: i },
              players: [`player-${i}`],
              isActive: true,
            });
            
            batchPromises.push(service.updateOverlayState(state));
          }
          
          await Promise.all(batchPromises);
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait for debouncing
          
          const endTime = performance.now();
          const batchTime = endTime - startTime;
          
          batchResults.push({
            batchSize,
            avgLatency: batchTime / batchSize,
            throughput: (batchSize / batchTime) * 1000, // operations per second
          });
        }
        
        // Larger batches should have better throughput (ops/sec)
        expect(batchResults[3].throughput).toBeGreaterThan(batchResults[0].throughput);
        
        // All batch sizes should meet minimum performance requirements
        batchResults.forEach(result => {
          expect(result.avgLatency).toBeLessThan(100); // Average per operation < 100ms
          expect(result.throughput).toBeGreaterThan(50); // At least 50 ops/sec
        });
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Property-Based Load Testing', () => {
    it('should maintain performance characteristics under random load patterns', () => {
      // Feature: overlay-sync-improvements, Property 15.3: Load Pattern Performance Consistency
      fc.assert(fc.property(
        fc.record({
          deviceCount: fc.integer({ min: 5, max: 20 }),
          operationCount: fc.integer({ min: 50, max: 200 }),
          concurrency: fc.integer({ min: 5, max: 30 }),
        }),
        async (loadConfig) => {
          const harness = new LoadTestHarness(loadConfig.deviceCount);
          
          try {
            const results = await harness.executeLoadTest(
              loadConfig.operationCount,
              loadConfig.concurrency
            );
            
            // Performance should be consistent regardless of load pattern
            expect(results.successRate).toBeGreaterThan(0.8);
            expect(results.averageLatency).toBeLessThan(400);
            expect(results.operationsPerSecond).toBeGreaterThan(25);
            
            // Resource usage should scale reasonably with device count
            const resourcesPerDevice = results.resourceUsage.averageResourcesPerDevice;
            expect(resourcesPerDevice).toBeLessThan(30);
            
          } finally {
            harness.dispose();
          }
        }
      ), { numRuns: 5 }); // Reduced runs for load tests
    });
  });
});