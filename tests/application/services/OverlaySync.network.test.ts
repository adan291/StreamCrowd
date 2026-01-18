/**
 * Overlay Sync Network Condition Tests
 * 
 * Tests overlay synchronization performance under various network conditions:
 * - Latency variations and jitter simulation
 * - Packet loss and connection instability
 * - Bandwidth limitations and throttling
 * - Network recovery and reconnection scenarios
 * 
 * Requirements: 7.1, 7.3, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import * as fc from 'fast-check';

import { 
  OverlaySyncService, 
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

import {
  ConnectionStatus,
  SyncResult,
} from '@/src/domain/ports/IOverlaySync';

// Network condition test configuration
const NETWORK_TEST_CONFIG = {
  // Network condition presets
  EXCELLENT: { latency: 20, packetLoss: 0, jitter: 5, bandwidth: 1000 },
  GOOD: { latency: 50, packetLoss: 0.01, jitter: 10, bandwidth: 500 },
  FAIR: { latency: 150, packetLoss: 0.05, jitter: 30, bandwidth: 100 },
  POOR: { latency: 300, packetLoss: 0.1, jitter: 50, bandwidth: 50 },
  BAD: { latency: 500, packetLoss: 0.2, jitter: 100, bandwidth: 10 },
  
  // Performance thresholds per condition
  THRESHOLDS: {
    EXCELLENT: { maxLatency: 100, minSuccessRate: 0.99 },
    GOOD: { maxLatency: 200, minSuccessRate: 0.95 },
    FAIR: { maxLatency: 400, minSuccessRate: 0.9 },
    POOR: { maxLatency: 800, minSuccessRate: 0.8 },
    BAD: { maxLatency: 1500, minSuccessRate: 0.6 },
  },
  
  // Test parameters
  OPERATIONS_PER_CONDITION: 50,
  RECONNECTION_TEST_DURATION: 10000, // 10 seconds
  JITTER_TEST_SAMPLES: 100,
};

/**
 * Enhanced network simulation adapter
 */
class NetworkSimulationAdapter extends MockSyncAdapter {
  private currentCondition: NetworkCondition;
  private connectionDrops: number = 0;
  private reconnectionAttempts: number = 0;
  private operationHistory: OperationRecord[] = [];
  private isConnected: boolean = true;
  
  constructor(initialCondition: NetworkCondition) {
    super({
      simulateLatency: true,
      latencyMs: initialCondition.latency,
      simulateFailures: true,
      failureRate: initialCondition.packetLoss,
      autoReconnect: true,
      reconnectDelayMs: 1000,
    });
    
    this.currentCondition = initialCondition;
  }

  setNetworkCondition(condition: NetworkCondition): void {
    this.currentCondition = condition;
    this.updateConfig({
      latencyMs: condition.latency,
      failureRate: condition.packetLoss,
    });
  }

  async publish<T extends OverlayState>(state: T): Promise<SyncResult> {
    const operationStart = performance.now();
    
    // Simulate connection drops
    if (!this.isConnected) {
      throw new Error('Connection lost');
    }
    
    // Simulate random disconnections based on network quality
    if (Math.random() < this.currentCondition.packetLoss * 0.1) {
      this.simulateConnectionDrop();
      throw new Error('Connection dropped during operation');
    }
    
    // Simulate bandwidth throttling (delay based on payload size)
    const payloadSize = JSON.stringify(state).length;
    const bandwidthDelay = this.calculateBandwidthDelay(payloadSize);
    
    // Simulate network jitter
    const jitterDelay = (Math.random() - 0.5) * this.currentCondition.jitter;
    const totalNetworkDelay = this.currentCondition.latency + jitterDelay + bandwidthDelay;
    
    if (totalNetworkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, totalNetworkDelay)));
    }
    
    // Simulate packet loss
    if (Math.random() < this.currentCondition.packetLoss) {
      throw new Error('Packet lost');
    }
    
    const result = await super.publish(state);
    const operationEnd = performance.now();
    
    this.operationHistory.push({
      timestamp: Date.now(),
      latency: operationEnd - operationStart,
      success: result.success,
      networkCondition: { ...this.currentCondition },
    });
    
    return result;
  }

  private calculateBandwidthDelay(payloadSizeBytes: number): number {
    // Simulate bandwidth limitation (bytes per ms)
    const bandwidthBytesPerMs = (this.currentCondition.bandwidth * 1024) / 1000; // KB/s to bytes/ms
    return payloadSizeBytes / bandwidthBytesPerMs;
  }

  private simulateConnectionDrop(): void {
    this.isConnected = false;
    this.connectionDrops++;
    
    // Auto-reconnect after delay
    setTimeout(() => {
      this.isConnected = true;
      this.reconnectionAttempts++;
    }, 1000 + Math.random() * 2000); // 1-3 second reconnection delay
  }

  getConnectionStatus(): ConnectionStatus {
    return this.isConnected ? 'connected' : 'disconnected';
  }

  getNetworkStats(): NetworkStats {
    const recentOperations = this.operationHistory.filter(
      op => Date.now() - op.timestamp < 60000 // Last minute
    );
    
    const successfulOps = recentOperations.filter(op => op.success);
    const latencies = successfulOps.map(op => op.latency);
    
    return {
      totalOperations: this.operationHistory.length,
      recentOperations: recentOperations.length,
      successRate: recentOperations.length > 0 ? 
        successfulOps.length / recentOperations.length : 0,
      averageLatency: latencies.length > 0 ? 
        latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      connectionDrops: this.connectionDrops,
      reconnectionAttempts: this.reconnectionAttempts,
      currentCondition: { ...this.currentCondition },
    };
  }

  resetStats(): void {
    this.operationHistory = [];
    this.connectionDrops = 0;
    this.reconnectionAttempts = 0;
  }
}

interface NetworkCondition {
  latency: number; // ms
  packetLoss: number; // 0-1
  jitter: number; // ms
  bandwidth: number; // KB/s
}

interface OperationRecord {
  timestamp: number;
  latency: number;
  success: boolean;
  networkCondition: NetworkCondition;
}

interface NetworkStats {
  totalOperations: number;
  recentOperations: number;
  successRate: number;
  averageLatency: number;
  connectionDrops: number;
  reconnectionAttempts: number;
  currentCondition: NetworkCondition;
}

/**
 * Network condition test harness
 */
class NetworkTestHarness {
  private service: OverlaySyncService;
  private adapter: NetworkSimulationAdapter;
  private stateManager: OverlayStateManager;
  private performanceMonitor: PerformanceMonitor;
  private errorRecovery: ErrorRecoverySystem;
  private resourceManager: ResourceManager;

  constructor(initialCondition: NetworkCondition) {
    this.adapter = new NetworkSimulationAdapter(initialCondition);
    this.stateManager = new OverlayStateManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.errorRecovery = new ErrorRecoverySystem();
    this.resourceManager = new ResourceManager();

    // Mock state manager for network tests
    vi.spyOn(this.stateManager, 'validateState').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    vi.spyOn(this.stateManager, 'compareStates').mockReturnValue(false);
    vi.spyOn(this.stateManager, 'transformForSync').mockImplementation((state) => state);

    this.service = new OverlaySyncService(
      this.adapter,
      this.stateManager,
      this.performanceMonitor,
      this.errorRecovery,
      this.resourceManager,
      {
        serviceId: 'network-test-service',
        debouncing: {
          poll: { delayMs: 50, maxDelayMs: 200, enabled: true },
          giveaway: { delayMs: 25, maxDelayMs: 100, enabled: true },
          game: { delayMs: 10, maxDelayMs: 50, enabled: true },
          prediction: { delayMs: 40, maxDelayMs: 150, enabled: true },
        },
        monitoringEnabled: true,
        autoRecoveryEnabled: true,
        maxSubscriptions: 20,
        networkPrioritizationEnabled: true,
      }
    );
  }

  setNetworkCondition(condition: NetworkCondition): void {
    this.adapter.setNetworkCondition(condition);
  }

  async runOperationBatch(count: number): Promise<BatchResults> {
    const results: OperationResult[] = [];
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const operationStart = performance.now();
      let success = false;
      let error: string | null = null;

      try {
        const state = this.createTestState(i);
        await this.service.updateOverlayState(state);
        await new Promise(resolve => setTimeout(resolve, 60)); // Wait for debouncing
        success = true;
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
      }

      const operationEnd = performance.now();
      results.push({
        operationId: i,
        success,
        latency: operationEnd - operationStart,
        error,
      });
    }

    const endTime = performance.now();
    const networkStats = this.adapter.getNetworkStats();

    return {
      operations: results,
      totalTime: endTime - startTime,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      averageLatency: results.filter(r => r.success).reduce((sum, r) => sum + r.latency, 0) / 
                     Math.max(1, results.filter(r => r.success).length),
      networkStats,
    };
  }

  private createTestState(operationId: number): OverlayState {
    const types = ['poll', 'giveaway', 'game', 'prediction'] as const;
    const type = types[operationId % types.length];
    
    switch (type) {
      case 'poll':
        return createOverlayState('poll', 'network-test', {
          question: `Network test poll ${operationId}?`,
          options: [
            { id: 1, label: 'Option A', votes: operationId, color: '#ff0000' },
            { id: 2, label: 'Option B', votes: operationId * 2, color: '#00ff00' },
          ],
          totalVotes: operationId * 3,
          showResults: operationId % 2 === 0,
          startTime: Date.now(),
        });
        
      case 'giveaway':
        return createOverlayState('giveaway', 'network-test', {
          winner: operationId % 5 === 0 ? `winner-${operationId}` : null,
          isSpinning: operationId % 3 === 0,
          participants: Array.from({ length: operationId % 10 + 1 }, (_, i) => `user-${i}`),
          mode: 'viewers' as const,
          prizeTitle: `Prize ${operationId}`,
          prizeImage: null,
        });
        
      case 'game':
        return createOverlayState('game', 'network-test', {
          gameType: 'network-test',
          state: { score: operationId * 10, level: Math.floor(operationId / 10) + 1 },
          players: [`player-${operationId}`],
          isActive: operationId % 4 !== 0,
        });
        
      case 'prediction':
        return createOverlayState('prediction', 'network-test', {
          title: `Network Prediction ${operationId}`,
          outcomes: [
            { id: '1', title: 'Yes', color: '#00ff00', users: operationId, channelPoints: operationId * 100 },
            { id: '2', title: 'No', color: '#ff0000', users: operationId * 2, channelPoints: operationId * 200 },
          ],
          predictionWindow: 300,
          status: 'ACTIVE' as const,
        });
    }
  }

  getService(): OverlaySyncService {
    return this.service;
  }

  getAdapter(): NetworkSimulationAdapter {
    return this.adapter;
  }

  dispose(): void {
    this.service.dispose();
  }
}

interface OperationResult {
  operationId: number;
  success: boolean;
  latency: number;
  error: string | null;
}

interface BatchResults {
  operations: OperationResult[];
  totalTime: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  networkStats: NetworkStats;
}

describe('Overlay Sync Network Condition Tests', () => {
  describe('Network Quality Performance Impact', () => {
    it('should perform optimally under excellent network conditions', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.EXCELLENT);
      
      try {
        const results = await harness.runOperationBatch(NETWORK_TEST_CONFIG.OPERATIONS_PER_CONDITION);
        const threshold = NETWORK_TEST_CONFIG.THRESHOLDS.EXCELLENT;
        
        expect(results.successCount / results.operations.length).toBeGreaterThan(threshold.minSuccessRate);
        expect(results.averageLatency).toBeLessThan(threshold.maxLatency);
        expect(results.networkStats.connectionDrops).toBe(0);
        
      } finally {
        harness.dispose();
      }
    });

    it('should maintain good performance under good network conditions', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.GOOD);
      
      try {
        const results = await harness.runOperationBatch(NETWORK_TEST_CONFIG.OPERATIONS_PER_CONDITION);
        const threshold = NETWORK_TEST_CONFIG.THRESHOLDS.GOOD;
        
        expect(results.successCount / results.operations.length).toBeGreaterThan(threshold.minSuccessRate);
        expect(results.averageLatency).toBeLessThan(threshold.maxLatency);
        
      } finally {
        harness.dispose();
      }
    });

    it('should degrade gracefully under poor network conditions', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.POOR);
      
      try {
        const results = await harness.runOperationBatch(NETWORK_TEST_CONFIG.OPERATIONS_PER_CONDITION);
        const threshold = NETWORK_TEST_CONFIG.THRESHOLDS.POOR;
        
        expect(results.successCount / results.operations.length).toBeGreaterThan(threshold.minSuccessRate);
        expect(results.averageLatency).toBeLessThan(threshold.maxLatency);
        
        // Should still function despite poor conditions
        expect(results.successCount).toBeGreaterThan(0);
        
      } finally {
        harness.dispose();
      }
    });

    it('should remain functional under bad network conditions', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.BAD);
      
      try {
        const results = await harness.runOperationBatch(NETWORK_TEST_CONFIG.OPERATIONS_PER_CONDITION);
        const threshold = NETWORK_TEST_CONFIG.THRESHOLDS.BAD;
        
        // Even under bad conditions, some operations should succeed
        expect(results.successCount / results.operations.length).toBeGreaterThan(threshold.minSuccessRate);
        expect(results.averageLatency).toBeLessThan(threshold.maxLatency);
        
        // System should not completely fail
        expect(results.successCount).toBeGreaterThan(NETWORK_TEST_CONFIG.OPERATIONS_PER_CONDITION * 0.3);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Network Condition Transitions', () => {
    it('should adapt to improving network conditions', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.POOR);
      
      try {
        // Start with poor conditions
        const poorResults = await harness.runOperationBatch(20);
        
        // Improve to good conditions
        harness.setNetworkCondition(NETWORK_TEST_CONFIG.GOOD);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Allow adaptation time
        
        const goodResults = await harness.runOperationBatch(20);
        
        // Performance should improve
        expect(goodResults.averageLatency).toBeLessThan(poorResults.averageLatency);
        expect(goodResults.successCount / goodResults.operations.length)
          .toBeGreaterThan(poorResults.successCount / poorResults.operations.length);
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle degrading network conditions gracefully', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.EXCELLENT);
      
      try {
        // Start with excellent conditions
        const excellentResults = await harness.runOperationBatch(20);
        
        // Degrade to fair conditions
        harness.setNetworkCondition(NETWORK_TEST_CONFIG.FAIR);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Allow adaptation time
        
        const fairResults = await harness.runOperationBatch(20);
        
        // Performance should degrade but remain functional
        expect(fairResults.averageLatency).toBeGreaterThan(excellentResults.averageLatency);
        expect(fairResults.successCount / fairResults.operations.length).toBeGreaterThan(0.8);
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle rapid network condition changes', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.GOOD);
      const conditions = [
        NETWORK_TEST_CONFIG.EXCELLENT,
        NETWORK_TEST_CONFIG.POOR,
        NETWORK_TEST_CONFIG.GOOD,
        NETWORK_TEST_CONFIG.BAD,
        NETWORK_TEST_CONFIG.FAIR,
      ];
      
      try {
        const results: BatchResults[] = [];
        
        for (const condition of conditions) {
          harness.setNetworkCondition(condition);
          await new Promise(resolve => setTimeout(resolve, 500)); // Brief adaptation time
          
          const batchResult = await harness.runOperationBatch(10);
          results.push(batchResult);
        }
        
        // System should remain stable despite rapid changes
        const totalSuccessRate = results.reduce((sum, r) => sum + r.successCount, 0) / 
                                results.reduce((sum, r) => sum + r.operations.length, 0);
        
        expect(totalSuccessRate).toBeGreaterThan(0.7); // 70% overall success rate
        
        // No single batch should completely fail
        results.forEach(result => {
          expect(result.successCount).toBeGreaterThan(0);
        });
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Jitter and Latency Variation Handling', () => {
    it('should handle high jitter networks effectively', async () => {
      const highJitterCondition: NetworkCondition = {
        latency: 100,
        packetLoss: 0.02,
        jitter: 200, // High jitter
        bandwidth: 100,
      };
      
      const harness = new NetworkTestHarness(highJitterCondition);
      
      try {
        const results = await harness.runOperationBatch(NETWORK_TEST_CONFIG.JITTER_TEST_SAMPLES);
        
        // Should handle jitter without excessive failures
        expect(results.successCount / results.operations.length).toBeGreaterThan(0.8);
        
        // Latency should vary but not be excessive
        const latencies = results.operations.filter(op => op.success).map(op => op.latency);
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);
        
        expect(maxLatency - minLatency).toBeLessThan(1000); // Reasonable jitter tolerance
        expect(results.averageLatency).toBeLessThan(500);
        
      } finally {
        harness.dispose();
      }
    });

    it('should adapt to latency spikes', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.GOOD);
      
      try {
        // Normal operations
        const normalResults = await harness.runOperationBatch(10);
        
        // Simulate latency spike
        const spikeCondition: NetworkCondition = {
          ...NETWORK_TEST_CONFIG.GOOD,
          latency: 1000, // 1 second spike
        };
        
        harness.setNetworkCondition(spikeCondition);
        const spikeResults = await harness.runOperationBatch(5);
        
        // Return to normal
        harness.setNetworkCondition(NETWORK_TEST_CONFIG.GOOD);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const recoveryResults = await harness.runOperationBatch(10);
        
        // Should handle spike and recover
        expect(spikeResults.averageLatency).toBeGreaterThan(normalResults.averageLatency);
        expect(recoveryResults.averageLatency).toBeLessThan(spikeResults.averageLatency);
        expect(recoveryResults.successCount / recoveryResults.operations.length).toBeGreaterThan(0.9);
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Connection Recovery Testing', () => {
    it('should recover from temporary connection loss', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.GOOD);
      
      try {
        // Normal operations
        const beforeResults = await harness.runOperationBatch(10);
        expect(beforeResults.successCount).toBeGreaterThan(8);
        
        // Simulate connection loss
        const lossCondition: NetworkCondition = {
          ...NETWORK_TEST_CONFIG.GOOD,
          packetLoss: 1.0, // 100% packet loss (simulates disconnection)
        };
        
        harness.setNetworkCondition(lossCondition);
        const duringResults = await harness.runOperationBatch(5);
        
        // Restore connection
        harness.setNetworkCondition(NETWORK_TEST_CONFIG.GOOD);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Allow reconnection time
        
        const afterResults = await harness.runOperationBatch(10);
        
        // Should recover functionality
        expect(duringResults.successCount).toBeLessThan(beforeResults.successCount);
        expect(afterResults.successCount).toBeGreaterThan(duringResults.successCount);
        expect(afterResults.successCount / afterResults.operations.length).toBeGreaterThan(0.8);
        
      } finally {
        harness.dispose();
      }
    });

    it('should handle intermittent connectivity', async () => {
      const harness = new NetworkTestHarness(NETWORK_TEST_CONFIG.GOOD);
      
      try {
        const results: OperationResult[] = [];
        
        // Simulate intermittent connectivity over time
        for (let i = 0; i < 50; i++) {
          // Alternate between connected and disconnected states
          const condition = i % 5 === 0 ? 
            { ...NETWORK_TEST_CONFIG.GOOD, packetLoss: 0.8 } : // Mostly disconnected
            NETWORK_TEST_CONFIG.GOOD; // Connected
          
          harness.setNetworkCondition(condition);
          
          const batchResult = await harness.runOperationBatch(1);
          results.push(...batchResult.operations);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const successCount = results.filter(r => r.success).length;
        const successRate = successCount / results.length;
        
        // Should maintain some connectivity despite intermittent issues
        expect(successRate).toBeGreaterThan(0.6); // 60% success rate
        expect(successCount).toBeGreaterThan(20); // At least 20 successful operations
        
      } finally {
        harness.dispose();
      }
    });
  });

  describe('Bandwidth Limitation Impact', () => {
    it('should handle low bandwidth conditions', async () => {
      const lowBandwidthCondition: NetworkCondition = {
        latency: 100,
        packetLoss: 0.05,
        jitter: 20,
        bandwidth: 5, // Very low bandwidth (5 KB/s)
      };
      
      const harness = new NetworkTestHarness(lowBandwidthCondition);
      
      try {
        const results = await harness.runOperationBatch(20);
        
        // Should still function but with higher latency
        expect(results.successCount / results.operations.length).toBeGreaterThan(0.7);
        expect(results.averageLatency).toBeGreaterThan(200); // Higher due to bandwidth
        expect(results.averageLatency).toBeLessThan(2000); // But not excessive
        
      } finally {
        harness.dispose();
      }
    });

    it('should optimize for bandwidth when available', async () => {
      const lowBandwidth = { ...NETWORK_TEST_CONFIG.GOOD, bandwidth: 10 };
      const highBandwidth = { ...NETWORK_TEST_CONFIG.GOOD, bandwidth: 1000 };
      
      const lowHarness = new NetworkTestHarness(lowBandwidth);
      const highHarness = new NetworkTestHarness(highBandwidth);
      
      try {
        const lowResults = await lowHarness.runOperationBatch(15);
        const highResults = await highHarness.runOperationBatch(15);
        
        // High bandwidth should have better performance
        expect(highResults.averageLatency).toBeLessThan(lowResults.averageLatency);
        expect(highResults.successCount / highResults.operations.length)
          .toBeGreaterThanOrEqual(lowResults.successCount / lowResults.operations.length);
        
      } finally {
        lowHarness.dispose();
        highHarness.dispose();
      }
    });
  });

  describe('Property-Based Network Testing', () => {
    it('should maintain functionality across random network conditions', () => {
      // Feature: overlay-sync-improvements, Property 15.4: Network Condition Resilience
      fc.assert(fc.property(
        fc.record({
          latency: fc.integer({ min: 20, max: 800 }),
          packetLoss: fc.float({ min: 0, max: 0.3 }),
          jitter: fc.integer({ min: 5, max: 150 }),
          bandwidth: fc.integer({ min: 5, max: 500 }),
        }),
        async (networkCondition) => {
          const harness = new NetworkTestHarness(networkCondition);
          
          try {
            const results = await harness.runOperationBatch(20);
            
            // Should maintain basic functionality regardless of conditions
            expect(results.successCount).toBeGreaterThan(0);
            
            // Success rate should correlate with network quality
            const qualityScore = (1 - networkCondition.packetLoss) * 
                               (1000 / (networkCondition.latency + 100)) * 
                               (networkCondition.bandwidth / 100);
            
            const expectedMinSuccessRate = Math.max(0.3, Math.min(0.95, qualityScore));
            expect(results.successCount / results.operations.length)
              .toBeGreaterThan(expectedMinSuccessRate * 0.8); // Allow some variance
            
          } finally {
            harness.dispose();
          }
        }
      ), { numRuns: 10 }); // Reduced runs for network tests
    });
  });
});