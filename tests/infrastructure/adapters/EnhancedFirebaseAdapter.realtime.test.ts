/**
 * Enhanced Firebase Adapter Real-time Synchronization Tests
 * 
 * Tests the real-time synchronization features including:
 * - Sub-100ms propagation latency tracking
 * - Multi-device synchronization support
 * - Performance monitoring and metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedFirebaseAdapter } from '../../../src/infrastructure/adapters/EnhancedFirebaseAdapter';
import type { PollOverlayState } from '../../../src/domain/entities/OverlayState';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
  doc: vi.fn(() => ({ id: 'test-doc' })),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn((ref, options, onNext, onError) => {
    // Simulate real-time listener behavior
    const callback = typeof options === 'function' ? options : onNext;
    
    // Simulate immediate callback with test data
    setTimeout(() => {
      callback({
        exists: () => true,
        data: () => ({
          id: 'test-poll',
          type: 'poll',
          isActive: true,
          updatedAt: { toMillis: () => Date.now() - 50 }, // 50ms ago
          syncedAt: Date.now() - 50,
          version: 2,
          channelId: 'test-channel',
          data: {
            question: 'Test question?',
            options: [
              { id: 1, label: 'Option 1', votes: 5, color: '#ff0000' },
              { id: 2, label: 'Option 2', votes: 3, color: '#00ff00' }
            ],
            totalVotes: 8,
            showResults: true
          }
        }),
        metadata: { hasPendingWrites: false }
      });
    }, 10);
    
    // Return unsubscribe function
    return vi.fn();
  }),
  serverTimestamp: vi.fn(() => ({ type: 'server-timestamp' })),
}));

// Mock Firebase Auth Service
vi.mock('../../../src/infrastructure/auth/FirebaseAuthService', () => ({
  FirebaseAuthService: {
    initialize: vi.fn(() => Promise.resolve()),
    isAuthenticated: vi.fn(() => true),
    signInAnonymously: vi.fn(() => Promise.resolve()),
    getUid: vi.fn(() => 'test-user-123'),
  }
}));

// Mock validation functions
vi.mock('../../../src/domain/entities/OverlayStateValidation', () => ({
  validateOverlayState: vi.fn(() => ({ isValid: true, errors: [] })),
  validateAndMigrateSchema: vi.fn((state) => ({ state, migrated: false })),
  OVERLAY_STATE_SCHEMA: { version: 2 }
}));

// Mock retry logic
vi.mock('../../../src/application/utils/retryLogic', () => ({
  withRetry: vi.fn((operation) => operation())
}));

describe('EnhancedFirebaseAdapter - Real-time Synchronization', () => {
  let adapter: EnhancedFirebaseAdapter;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage for device ID
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      writable: true
    });
    
    adapter = new EnhancedFirebaseAdapter({
      monitoringEnabled: true,
      retryEnabled: true,
      maxRetries: 3,
    });
  });
  
  afterEach(() => {
    adapter.dispose();
  });
  
  describe('Real-time Subscription Performance', () => {
    it('should track propagation latency for real-time updates', async () => {
      const callbackSpy = vi.fn();
      
      // Subscribe to poll updates
      const subscription = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      // Wait for the mocked callback to be triggered
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify callback was called
      expect(callbackSpy).toHaveBeenCalled();
      
      // Check subscription metadata includes latency tracking
      const metadata = subscription.getMetadata();
      expect(metadata).toHaveProperty('connectionLatency');
      expect(metadata).toHaveProperty('averagePropagationLatency');
      expect(metadata).toHaveProperty('maxPropagationLatency');
      expect(metadata).toHaveProperty('recentLatencies');
      
      subscription.unsubscribe();
    });
    
    it('should provide real-time performance metrics', async () => {
      const callbackSpy = vi.fn();
      
      // Subscribe and trigger some updates
      const subscription = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      // Wait for callbacks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get performance metrics
      const metrics = adapter.getMetrics();
      
      // Verify real-time performance metrics are included
      expect(metrics).toHaveProperty('realtimePerformance');
      expect(metrics.realtimePerformance).toHaveProperty('averagePropagationLatency');
      expect(metrics.realtimePerformance).toHaveProperty('maxPropagationLatency');
      expect(metrics.realtimePerformance).toHaveProperty('sub100msRate');
      expect(metrics.realtimePerformance).toHaveProperty('byOverlayType');
      
      subscription.unsubscribe();
    });
    
    it('should track sub-100ms delivery rate', async () => {
      const callbackSpy = vi.fn();
      
      // Subscribe to multiple overlay types
      const pollSub = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      // Wait for callbacks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get metrics and check sub-100ms rate
      const metrics = adapter.getMetrics();
      
      expect(metrics.realtimePerformance?.sub100msRate).toBeGreaterThanOrEqual(0);
      expect(metrics.realtimePerformance?.sub100msRate).toBeLessThanOrEqual(100);
      
      pollSub.unsubscribe();
    });
  });
  
  describe('Multi-device Synchronization', () => {
    it('should include device ID in published state', async () => {
      const testState: PollOverlayState = {
        id: 'test-poll',
        type: 'poll',
        isActive: true,
        updatedAt: Date.now(),
        version: 2,
        channelId: 'test-channel',
        data: {
          question: 'Test question?',
          options: [
            { id: 1, label: 'Option 1', votes: 0, color: '#ff0000' },
            { id: 2, label: 'Option 2', votes: 0, color: '#00ff00' }
          ],
          totalVotes: 0,
          showResults: false
        }
      };
      
      const result = await adapter.publish(testState);
      
      expect(result.success).toBe(true);
      
      // Verify device info is included in metrics
      const metrics = adapter.getMetrics();
      expect(metrics).toHaveProperty('deviceInfo');
      expect(metrics.deviceInfo).toHaveProperty('deviceId');
      expect(metrics.deviceInfo).toHaveProperty('sequenceCounters');
      expect(metrics.deviceInfo?.deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    });
    
    it('should increment sequence numbers for ordering', async () => {
      const testState: PollOverlayState = {
        id: 'test-poll',
        type: 'poll',
        isActive: true,
        updatedAt: Date.now(),
        version: 2,
        channelId: 'test-channel',
        data: {
          question: 'Test question?',
          options: [],
          totalVotes: 0,
          showResults: false
        }
      };
      
      // Publish multiple times
      await adapter.publish(testState);
      await adapter.publish(testState);
      await adapter.publish(testState);
      
      // Check sequence counters
      const metrics = adapter.getMetrics();
      expect(metrics.deviceInfo?.sequenceCounters.poll).toBe(3);
    });
    
    it('should maintain unique device ID across instances', () => {
      const adapter1 = new EnhancedFirebaseAdapter();
      const adapter2 = new EnhancedFirebaseAdapter();
      
      const metrics1 = adapter1.getMetrics();
      const metrics2 = adapter2.getMetrics();
      
      // Both should have device IDs (may be same if using localStorage mock)
      expect(metrics1.deviceInfo?.deviceId).toBeDefined();
      expect(metrics2.deviceInfo?.deviceId).toBeDefined();
      
      adapter1.dispose();
      adapter2.dispose();
    });
  });
  
  describe('Performance Monitoring', () => {
    it('should log warnings for high propagation latency', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock high latency scenario
      const { onSnapshot } = await import('firebase/firestore');
      vi.mocked(onSnapshot).mockImplementation((ref, options, onNext, onError) => {
        const callback = typeof options === 'function' ? options : onNext;
        
        // Simulate high latency (150ms)
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => ({
              syncedAt: Date.now() - 150, // 150ms ago
              type: 'poll',
              version: 2
            }),
            metadata: { hasPendingWrites: false }
          });
        }, 10);
        
        return vi.fn();
      });
      
      const callbackSpy = vi.fn();
      const subscription = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should log warning for high latency
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High propagation latency detected')
      );
      
      subscription.unsubscribe();
      consoleSpy.mockRestore();
    });
    
    it('should track latency statistics by overlay type', async () => {
      const callbackSpy = vi.fn();
      
      // Subscribe to poll updates
      const subscription = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = adapter.getMetrics();
      
      // Should have type-specific metrics
      expect(metrics.realtimePerformance?.byOverlayType).toHaveProperty('poll');
      
      const pollMetrics = metrics.realtimePerformance?.byOverlayType.poll;
      if (pollMetrics) {
        expect(pollMetrics).toHaveProperty('avgLatency');
        expect(pollMetrics).toHaveProperty('maxLatency');
        expect(pollMetrics).toHaveProperty('sampleCount');
        expect(pollMetrics).toHaveProperty('sub100msRate');
      }
      
      subscription.unsubscribe();
    });
  });
  
  describe('Connection Management', () => {
    it('should attempt reconnection on subscription errors', async () => {
      const reconnectSpy = vi.spyOn(adapter, 'reconnect').mockResolvedValue();
      
      // Mock subscription error
      const { onSnapshot } = await import('firebase/firestore');
      vi.mocked(onSnapshot).mockImplementation((ref, options, onNext, onError) => {
        const errorCallback = typeof options === 'function' ? onError : 
                             typeof onNext === 'function' ? onError : options;
        
        // Trigger error after short delay
        setTimeout(() => {
          if (errorCallback) {
            errorCallback(new Error('Connection lost'));
          }
        }, 10);
        
        return vi.fn();
      });
      
      const callbackSpy = vi.fn();
      const subscription = adapter.subscribe<PollOverlayState>('poll', callbackSpy);
      
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for reconnect delay
      
      // Should attempt reconnection
      expect(reconnectSpy).toHaveBeenCalled();
      
      subscription.unsubscribe();
      reconnectSpy.mockRestore();
    });
  });
});