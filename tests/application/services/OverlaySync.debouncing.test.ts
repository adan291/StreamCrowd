/**
 * Overlay Sync Debouncing Effectiveness Tests
 * 
 * Comprehensive tests for debouncing logic effectiveness including:
 * - Rapid update consolidation and operation reduction
 * - Different debounce configurations per overlay type
 * - Maximum delay enforcement under continuous updates
 * - Performance impact measurement and optimization validation
 * 
 * Requirements: 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import * as fc from 'fast-check';

import { 
  OverlaySyncService, 
  OverlaySyncServiceConfig,
  DebounceConfig,
} from '@/src/application/services/OverlaySyncService';
import { OverlayStateManager } from '@/src/application/services/OverlayStateManager';
import { PerformanceMonitor } from '@/src/application/services/PerformanceMonitor';
import { ErrorRecoverySystem } from '@/src/application/services/ErrorRecoverySystem';
import { ResourceManager } from '@/src/infrastructure/utils/ResourceManager';
import { MockSyncAdapter } from '@/src/infrastructure/adapters/MockSyncAdapter';

import {
  OverlayState,
  OverlayType,
  createOverlayState,
} from '@/src/domain/entities/OverlayState';

// Debouncing test configuration
const DEBOUNCE_TEST_CONFIG = {
  // Test parameters
  RAPID_UPDATE_COUNT: 100,
  CONTINUOUS_UPDATE_DURATION: 5000, // 5 seconds
  UPDATE_INTERVALS: [10, 25, 50, 100, 200], // ms between updates
  
  // Performance thresholds
  MIN_OPERATION_REDUCTION: 70, // % reduction expected from debouncing
  MAX_DELAY_TOLERANCE: 50, // ms tolerance for max delay enforcement
  
  // Debounce configurations for testing
  AGGRESSIVE_DEBOUNCE: {
    poll: { delayMs: 500, maxDelayMs: 1000, enabled: true },
    giveaway: { delayMs: 300, maxDelayMs: 600, enabled: true },
    game: { delayMs: 200, maxDelayMs: 400, enabled: true },
    prediction: { delayMs: 400, maxDelayMs: 800, enabled: true },
  },
  
  MODERATE_DEBOUNCE: {
    poll: { delayMs: 200, maxDelayMs: 500, enabled: true },
    giveaway: { delayMs: 100, maxDelayMs: 300, enabled: true },
    game: { delayMs: 50, maxDelayMs: 150, enabled: true },
    prediction: { delayMs: 150, maxDelayMs: 400, enabled: true },
  },
  
  MINIMAL_DEBOUNCE: {
    poll: { delayMs: 50, maxDelayMs: 100, enabled: true },
    giveaway: { delayMs: 25, maxDelayMs: 75, enabled: true },
    game: { delayMs: 10, maxDelayMs: 50, enabled: true },
    prediction: { delayMs: 30, maxDelayMs: 80, enabled: true },
  },
  
  NO_DEBOUNCE: {
    poll: { delayMs: 0, maxDelayMs: 0, enabled: false },
    giveaway: { delayMs: 0, maxDelayMs: 0, enabled: false },
    game: { delayMs: 0, maxDelayMs: 0, enabled: false },
    prediction: { delayMs: 0, maxDelayMs: 0, enabled: false },
  },
};

/**
 * Debouncing test harness with operation tracking
 */
class DebounceTestHarness {
  private service: OverlaySyncService;
  private adapter: MockSyncAdapter;
  private stateManager: OverlayStateManager;
  private performanceMonitor: PerformanceMonitor;
  private errorRecovery: ErrorRecoverySystem;
  private resourceManager: ResourceManager;
  
  private operationLog: OperationLogEntry[] = [];
  private publishSpy: vi.SpyInstance;

  constructor(debounceConfig: Record<OverlayType, DebounceConfig>) {
    this.adapter = new MockSyncAdapter({
      simulateLatency: false, // Disable for precise timing
      latencyMs: 0,
      simulateFailures: false,
      failureRate: 0,
      autoReconnect: true,
      reconnectDelayMs: 100,
    });

    this.stateManager = new OverlayStateManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.errorRecovery = new ErrorRecoverySystem();
    this.resourceManager = new ResourceManager();

    // Mock state manager methods
    vi.spyOn(this.stateManager, 'validateState').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    vi.spyOn(this.stateManager, 'compareStates').mockReturnValue(false);
    vi.spyOn(this.stateManager, 'transformForSync').mockImplementation((state) => state);

    // Spy on adapter publish to track actual operations
    this.publishSpy = vi.spyOn(this.adapter, 'publish').mockImplementation(async (state) => {
      this.operationLog.push({
        timestamp: performance.now(),
        stateType: state.type,
        stateId: state.id,
        channelId: state.channelId,
      });
      
      return {
        success: true,
        timestamp: Date.now(),
        latency: 1,
      };
    });

    this.service = new OverlaySyncService(
      this.adapter,
      this.stateManager,
      this.performanceMonitor,
      this.errorRecovery,
      this.resourceManager,
      {
        serviceId: 'debounce-test-service',
        debouncing: debounceConfig,
        monitoringEnabled: true,
        autoRecoveryEnabled: true,
        maxSubscriptions: 50,
        networkPrioritizationEnabled: false,
      }
    );
  }

  async executeRapidUpdates(
    overlayType: OverlayType,
    updateCount: number,
    intervalMs: number = 10
  ): Promise<RapidUpdateResults> {
    this.resetOperationLog();
    
    const startTime = performance.now();
    const updatePromises: Promise<void>[] = [];
    
    // Fire rapid updates
    for (let i = 0; i < updateCount; i++) {
      const updatePromise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const state = this.createTestState(overlayType, i);
            await this.service.updateOverlayState(state);
            resolve();
          } catch (error) {
            resolve(); // Continue even if individual updates fail
          }
        }, i * intervalMs);
      });
      
      updatePromises.push(updatePromise);
    }
    
    // Wait for all updates to be initiated
    await Promise.all(updatePromises);
    
    // Wait for debouncing to complete (use max delay + buffer)
    const config = this.service['config'].debouncing[overlayType];
    const maxWaitTime = config.enabled ? config.maxDelayMs + 200 : 500;
    await new Promise(resolve => setTimeout(resolve, maxWaitTime));
    
    const endTime = performance.now();
    
    return {
      totalUpdatesRequested: updateCount,
      actualOperationsExecuted: this.operationLog.length,
      operationReduction: ((updateCount - this.operationLog.length) / updateCount) * 100,
      totalTimeMs: endTime - startTime,
      operationLog: [...this.operationLog],
      debounceConfig: config,
    };
  }

  async executeContinuousUpdates(
    overlayType: OverlayType,
    durationMs: number,
    intervalMs: number
  ): Promise<ContinuousUpdateResults> {
    this.resetOperationLog();
    
    const startTime = performance.now();
    let updateCount = 0;
    let isRunning = true;
    
    // Start continuous updates
    const updateInterval = setInterval(async () => {
      if (!isRunning) return;
      
      try {
        const state = this.createTestState(overlayType, updateCount);
        await this.service.updateOverlayState(state);
        updateCount++;
      } catch (error) {
        // Continue despite errors
      }
    }, intervalMs);
    
    // Run for specified duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    isRunning = false;
    clearInterval(updateInterval);
    
    // Wait for final debouncing
    const config = this.service['config'].debouncing[overlayType];
    const finalWaitTime = config.enabled ? config.maxDelayMs + 100 : 200;
    await new Promise(resolve => setTimeout(resolve, finalWaitTime));
    
    const endTime = performance.now();
    
    return {
      totalUpdatesRequested: updateCount,
      actualOperationsExecuted: this.operationLog.length,
      operationReduction: updateCount > 0 ? ((updateCount - this.operationLog.length) / updateCount) * 100 : 0,
      totalTimeMs: endTime - startTime,
      averageUpdateInterval: intervalMs,
      operationLog: [...this.operationLog],
      debounceConfig: config,
    };
  }

  async testMaxDelayEnforcement(
    overlayType: OverlayType,
    continuousUpdateInterval: number
  ): Promise<MaxDelayTestResults> {
    this.resetOperationLog();
    
    const config = this.service['config'].debouncing[overlayType];
    if (!config.enabled || config.maxDelayMs === 0) {
      throw new Error('Max delay testing requires enabled debouncing with maxDelayMs > 0');
    }
    
    const startTime = performance.now();
    let updateCount = 0;
    let isRunning = true;
    
    // Start continuous updates at high frequency
    const updateInterval = setInterval(async () => {
      if (!isRunning) return;
      
      const state = this.createTestState(overlayType, updateCount);
      await this.service.updateOverlayState(state);
      updateCount++;
    }, continuousUpdateInterval);
    
    // Wait for max delay + tolerance
    const testDuration = config.maxDelayMs + DEBOUNCE_TEST_CONFIG.MAX_DELAY_TOLERANCE;
    await new Promise(resolve => setTimeout(resolve, testDuration));
    
    isRunning = false;
    clearInterval(updateInterval);
    
    // Wait a bit more for any pending operations
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const endTime = performance.now();
    const actualDuration = endTime - startTime;
    
    return {
      totalUpdatesRequested: updateCount,
      actualOperationsExecuted: this.operationLog.length,
      expectedMaxDelayMs: config.maxDelayMs,
      actualDurationMs: actualDuration,
      maxDelayEnforced: this.operationLog.length > 0,
      operationTimings: this.operationLog.map(op => op.timestamp - startTime),
      debounceConfig: config,
    };
  }

  private createTestState(type: OverlayType, operationId: number): OverlayState {
    const channelId = 'debounce-test-channel';
    
    switch (type) {
      case 'poll':
        return createOverlayState('poll', channelId, {
          question: `Debounce test poll ${operationId}?`,
          options: [
            { id: 1, label: 'Option A', votes: operationId, color: '#ff0000' },
            { id: 2, label: 'Option B', votes: operationId * 2, color: '#00ff00' },
          ],
          totalVotes: operationId * 3,
          showResults: operationId % 2 === 0,
          startTime: Date.now(),
        });
        
      case 'giveaway':
        return createOverlayState('giveaway', channelId, {
          winner: operationId % 10 === 0 ? `winner-${operationId}` : null,
          isSpinning: operationId % 5 === 0,
          participants: Array.from({ length: operationId % 20 + 1 }, (_, i) => `user-${i}`),
          mode: 'viewers' as const,
          prizeTitle: `Prize ${operationId}`,
          prizeImage: null,
        });
        
      case 'game':
        return createOverlayState('game', channelId, {
          gameType: 'debounce-test',
          state: { score: operationId * 10, level: Math.floor(operationId / 50) + 1 },
          players: [`player-${operationId % 5}`],
          isActive: operationId % 3 !== 0,
        });
        
      case 'prediction':
        return createOverlayState('prediction', channelId, {
          title: `Debounce Prediction ${operationId}`,
          outcomes: [
            { id: '1', title: 'Yes', color: '#00ff00', users: operationId, channelPoints: operationId * 100 },
            { id: '2', title: 'No', color: '#ff0000', users: operationId * 2, channelPoints: operationId * 200 },
          ],
          predictionWindow: 300,
          status: 'ACTIVE' as const,
        });
    }
  }

  private resetOperationLog(): void {
    this.operationLog = [];
    this.publishSpy.mockClear();
  }

  getOperationCount(): number {
    return this.operationLog.length;
  }

  getService(): OverlaySyncService {
    return this.service;
  }

  dispose(): void {
    this.service.dispose();
  }
}

interface OperationLogEntry {
  timestamp: number;
  stateType: OverlayType;
  stateId: string;
  channelId: string;
}

interface RapidUpdateResults {
  totalUpdatesRequested: number;
  actualOperationsExecuted: number;
  operationReduction: number;
  totalTimeMs: number;
  operationLog: OperationLogEntry[];
  debounceConfig: DebounceConfig;
}

interface ContinuousUpdateResults {
  totalUpdatesRequested: number;
  actualOperationsExecuted: number;
  operationReduction: number;
  totalTimeMs: number;
  averageUpdateInterval: number;
  operationLog: OperationLogEntry[];
  debounceConfig: DebounceConfig;
}

interface MaxDelayTestResults {
  totalUpdatesRequested: number;
  actualOperationsExecuted: number;
  expectedMaxDelayMs: number;
  actualDurationMs: number;
  maxDelayEnforced: boolean;
  operationTimings: number[];
  debounceConfig: DebounceConfig;
}

describe('Overlay Sync Debouncing Effectiveness Tests', () => {
  describe('Rapid Update Consolidation', () => {
    it('should significantly reduce operations with aggressive debouncing', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.AGGRESSIVE_DEBOUNCE);
      
      try {
        const results = await harness.executeRapidUpdates(
          'poll',
          DEBOUNCE_TEST_CONFIG.RAPID_UPDATE_COUNT,
          10 // 10ms intervals
        );
        
        // Should achieve significant operation reduction
        expect(results.operationReduction).toBeGreaterThan(DEBOUNCE_TEST_CONFIG.MIN_OPERATION_REDUCTION);
        expect(results.actualOperationsExecuted).toBeLessThan(results.totalUpdatesRequested * 0.3);
        
        // Should still execute at least one operation
        expect(results.actualOperationsExecuted).toBeGreaterThan(0);
        
      } finally {
        harness.dispose();
      }
    });

    it('should provide moderate reduction with moderate debouncing', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const results = await harness.executeRapidUpdates(
          'giveaway',
          DEBOUNCE_TEST_CONFIG.RAPID_UPDATE_COUNT,
          15 // 15ms intervals
        );
        
        // Should achieve moderate operation reduction
        expect(results.operationReduction).toBeGreaterThan(50); // At least 50% reduction
        expect(results.operationReduction).toBeLessThan(90); // But not as aggressive as aggressive config
        expect(results.actualOperationsExecuted).toBeGreaterThan(0);
        
      } finally {
        harness.dispose();
      }
    });

    it('should provide minimal reduction with minimal debouncing', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MINIMAL_DEBOUNCE);
      
      try {
        const results = await harness.executeRapidUpdates(
          'game',
          DEBOUNCE_TEST_CONFIG.RAPID_UPDATE_COUNT,
          20 // 20ms intervals
        );
        
        // Should achieve some reduction but less than aggressive configs
        expect(results.operationReduction).toBeGreaterThan(20); // At least 20% reduction
        expect(results.operationReduction).toBeLessThan(70); // But not too aggressive
        expect(results.actualOperationsExecuted).toBeGreaterThan(results.totalUpdatesRequested * 0.3);
        
      } finally {
        harness.dispose();
      }
    });

    it('should not reduce operations when debouncing is disabled', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.NO_DEBOUNCE);
      
      try {
        const results = await harness.executeRapidUpdates(
          'prediction',
          50, // Smaller count for no-debounce test
          25 // 25ms intervals
        );
        
        // Should execute all operations without debouncing
        expect(results.operationReduction).toBeLessThan(10); // Minimal reduction due to timing
        expect(results.actualOperationsExecuted).toBeGreaterThan(results.totalUpdatesRequested * 0.9);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Different Overlay Type Configurations', () => {
    it('should apply different debounce settings per overlay type', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const overlayTypes: OverlayType[] = ['poll', 'giveaway', 'game', 'prediction'];
        const results: Record<OverlayType, RapidUpdateResults> = {} as any;
        
        // Test each overlay type
        for (const type of overlayTypes) {
          const result = await harness.executeRapidUpdates(type, 50, 15);
          results[type] = result;
          
          // Reset for next test
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Game should have the least reduction (shortest debounce)
        // Poll should have more reduction (longer debounce)
        expect(results.game.operationReduction).toBeLessThan(results.poll.operationReduction);
        expect(results.giveaway.operationReduction).toBeLessThan(results.prediction.operationReduction);
        
        // All should achieve some reduction
        overlayTypes.forEach(type => {
          expect(results[type].operationReduction).toBeGreaterThan(20);
          expect(results[type].actualOperationsExecuted).toBeGreaterThan(0);
        });
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle mixed overlay type updates efficiently', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const overlayTypes: OverlayType[] = ['poll', 'giveaway', 'game', 'prediction'];
        const updatePromises: Promise<void>[] = [];
        
        // Fire mixed updates rapidly
        for (let i = 0; i < 80; i++) {
          const type = overlayTypes[i % overlayTypes.length];
          const state = harness['createTestState'](type, i);
          
          updatePromises.push(harness.getService().updateOverlayState(state));
        }
        
        await Promise.all(updatePromises);
        
        // Wait for all debouncing to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const operationCount = harness.getOperationCount();
        
        // Should debounce effectively across different types
        expect(operationCount).toBeLessThan(80);
        expect(operationCount).toBeGreaterThan(4); // At least one per type
        
        // Should have operations for multiple types
        expect(operationCount).toBeGreaterThan(overlayTypes.length);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Maximum Delay Enforcement', () => {
    it('should enforce maximum delay under continuous updates', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const results = await harness.testMaxDelayEnforcement('poll', 10); // Update every 10ms
        
        // Should enforce max delay
        expect(results.maxDelayEnforced).toBe(true);
        expect(results.actualOperationsExecuted).toBeGreaterThan(0);
        
        // Should complete within max delay + tolerance
        const expectedMaxTime = results.expectedMaxDelayMs + DEBOUNCE_TEST_CONFIG.MAX_DELAY_TOLERANCE;
        expect(results.actualDurationMs).toBeLessThan(expectedMaxTime + 100); // Small buffer for test execution
        
        // First operation should occur around max delay time
        if (results.operationTimings.length > 0) {
          const firstOperationTime = results.operationTimings[0];
          expect(firstOperationTime).toBeGreaterThan(results.expectedMaxDelayMs - 100);
          expect(firstOperationTime).toBeLessThan(results.expectedMaxDelayMs + 200);
        }
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle max delay enforcement for different overlay types', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.AGGRESSIVE_DEBOUNCE);
      
      try {
        const overlayTypes: OverlayType[] = ['poll', 'giveaway', 'game', 'prediction'];
        const results: Record<OverlayType, MaxDelayTestResults> = {} as any;
        
        for (const type of overlayTypes) {
          const result = await harness.testMaxDelayEnforcement(type, 5); // Very frequent updates
          results[type] = result;
          
          // Reset between tests
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // All types should enforce their respective max delays
        overlayTypes.forEach(type => {
          expect(results[type].maxDelayEnforced).toBe(true);
          expect(results[type].actualOperationsExecuted).toBeGreaterThan(0);
          
          // Should complete within expected timeframe
          const expectedTime = results[type].expectedMaxDelayMs + DEBOUNCE_TEST_CONFIG.MAX_DELAY_TOLERANCE;
          expect(results[type].actualDurationMs).toBeLessThan(expectedTime + 150);
        });
        
        // Game should have shortest max delay, poll should have longest
        expect(results.game.expectedMaxDelayMs).toBeLessThan(results.poll.expectedMaxDelayMs);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Continuous Update Performance', () => {
    it('should maintain efficiency during sustained rapid updates', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const results = await harness.executeContinuousUpdates(
          'giveaway',
          DEBOUNCE_TEST_CONFIG.CONTINUOUS_UPDATE_DURATION,
          25 // Update every 25ms
        );
        
        // Should achieve significant operation reduction
        expect(results.operationReduction).toBeGreaterThan(60);
        expect(results.actualOperationsExecuted).toBeGreaterThan(0);
        
        // Should handle the sustained load
        expect(results.totalUpdatesRequested).toBeGreaterThan(100);
        expect(results.actualOperationsExecuted).toBeLessThan(results.totalUpdatesRequested * 0.4);
        
      } finally {
        harness.dispose();
      }
    });

    it('should adapt debouncing effectiveness to update frequency', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      
      try {
        const intervals = DEBOUNCE_TEST_CONFIG.UPDATE_INTERVALS;
        const results: Array<{ interval: number; reduction: number; operations: number }> = [];
        
        for (const interval of intervals) {
          const result = await harness.executeContinuousUpdates('game', 2000, interval);
          
          results.push({
            interval,
            reduction: result.operationReduction,
            operations: result.actualOperationsExecuted,
          });
          
          // Reset between tests
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Faster updates should have higher reduction rates
        const fastestResult = results.find(r => r.interval === Math.min(...intervals))!;
        const slowestResult = results.find(r => r.interval === Math.max(...intervals))!;
        
        expect(fastestResult.reduction).toBeGreaterThan(slowestResult.reduction);
        
        // All should achieve some level of optimization
        results.forEach(result => {
          expect(result.operations).toBeGreaterThan(0);
          if (result.interval <= 50) { // Fast updates
            expect(result.reduction).toBeGreaterThan(30);
          }
        });
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Performance Impact Measurement', () => {
    it('should demonstrate performance improvement from debouncing', async () => {
      const debouncedHarness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
      const noDebouncingHarness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.NO_DEBOUNCE);
      
      try {
        const testParams = { type: 'poll' as OverlayType, count: 60, interval: 15 };
        
        // Test with debouncing
        const debouncedResults = await debouncedHarness.executeRapidUpdates(
          testParams.type,
          testParams.count,
          testParams.interval
        );
        
        // Test without debouncing
        const noDebouncingResults = await noDebouncingHarness.executeRapidUpdates(
          testParams.type,
          testParams.count,
          testParams.interval
        );
        
        // Debouncing should reduce operations significantly
        expect(debouncedResults.actualOperationsExecuted)
          .toBeLessThan(noDebouncingResults.actualOperationsExecuted);
        
        // Operation reduction should be substantial
        expect(debouncedResults.operationReduction).toBeGreaterThan(50);
        expect(noDebouncingResults.operationReduction).toBeLessThan(20);
        
        // Both should complete successfully
        expect(debouncedResults.actualOperationsExecuted).toBeGreaterThan(0);
        expect(noDebouncingResults.actualOperationsExecuted).toBeGreaterThan(0);
        
      } finally {
        debouncedHarness.dispose();
        noDebouncingHarness.dispose();
      }
    });

    it('should measure resource efficiency gains from debouncing', async () => {
      const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.AGGRESSIVE_DEBOUNCE);
      
      try {
        const initialMetrics = harness.getService().getPerformanceMetrics();
        
        // Execute many rapid updates
        await harness.executeRapidUpdates('prediction', 200, 8);
        
        const finalMetrics = harness.getService().getPerformanceMetrics();
        
        // Should maintain reasonable resource usage despite many updates
        expect(finalMetrics.serviceMetrics.resourceCount).toBeLessThan(50);
        expect(finalMetrics.serviceMetrics.pendingUpdates).toBeLessThan(10);
        
        // Should have processed significantly fewer operations than requested
        expect(harness.getOperationCount()).toBeLessThan(50); // Much less than 200 requested
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Property-Based Debouncing Tests', () => {
    it('should maintain debouncing effectiveness across random configurations', () => {
      // Feature: overlay-sync-improvements, Property 15.5: Debouncing Configuration Effectiveness
      fc.assert(fc.property(
        fc.record({
          delayMs: fc.integer({ min: 10, max: 500 }),
          maxDelayMs: fc.integer({ min: 50, max: 1000 }),
          updateCount: fc.integer({ min: 20, max: 100 }),
          intervalMs: fc.integer({ min: 5, max: 50 }),
        }),
        async (config) => {
          // Ensure maxDelayMs >= delayMs
          const maxDelayMs = Math.max(config.maxDelayMs, config.delayMs + 50);
          
          const debounceConfig: Record<OverlayType, DebounceConfig> = {
            poll: { delayMs: config.delayMs, maxDelayMs, enabled: true },
            giveaway: { delayMs: config.delayMs, maxDelayMs, enabled: true },
            game: { delayMs: config.delayMs, maxDelayMs, enabled: true },
            prediction: { delayMs: config.delayMs, maxDelayMs, enabled: true },
          };
          
          const harness = new DebounceTestHarness(debounceConfig);
          
          try {
            const results = await harness.executeRapidUpdates(
              'poll',
              config.updateCount,
              config.intervalMs
            );
            
            // Should achieve some level of debouncing effectiveness
            expect(results.actualOperationsExecuted).toBeGreaterThan(0);
            expect(results.actualOperationsExecuted).toBeLessThan(config.updateCount);
            
            // Reduction should correlate with debounce aggressiveness
            const expectedMinReduction = Math.min(80, Math.max(10, 
              (config.delayMs / config.intervalMs) * 10
            ));
            
            expect(results.operationReduction).toBeGreaterThan(expectedMinReduction * 0.5);
            
          } finally {
            harness.dispose();
          }
        }
      ), { numRuns: 15 });
    });

    it('should handle random update patterns efficiently', () => {
      // Feature: overlay-sync-improvements, Property 15.6: Random Update Pattern Handling
      fc.assert(fc.property(
        fc.array(fc.integer({ min: 5, max: 200 }), { minLength: 10, maxLength: 50 }),
        async (updateIntervals) => {
          const harness = new DebounceTestHarness(DEBOUNCE_TEST_CONFIG.MODERATE_DEBOUNCE);
          
          try {
            const updatePromises: Promise<void>[] = [];
            let totalDelay = 0;
            
            // Create updates with random intervals
            updateIntervals.forEach((interval, index) => {
              totalDelay += interval;
              
              const updatePromise = new Promise<void>((resolve) => {
                setTimeout(async () => {
                  try {
                    const state = harness['createTestState']('game', index);
                    await harness.getService().updateOverlayState(state);
                    resolve();
                  } catch (error) {
                    resolve();
                  }
                }, totalDelay);
              });
              
              updatePromises.push(updatePromise);
            });
            
            await Promise.all(updatePromises);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for debouncing
            
            const operationCount = harness.getOperationCount();
            
            // Should handle random patterns effectively
            expect(operationCount).toBeGreaterThan(0);
            expect(operationCount).toBeLessThan(updateIntervals.length);
            
            // Should achieve reasonable reduction for most patterns
            const reduction = ((updateIntervals.length - operationCount) / updateIntervals.length) * 100;
            expect(reduction).toBeGreaterThan(10); // At least 10% reduction
            
          } finally {
            harness.dispose();
          }
        }
      ), { numRuns: 10 });
    });
  });
});