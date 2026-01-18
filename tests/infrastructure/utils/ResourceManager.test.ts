/**
 * ResourceManager Tests
 * 
 * Tests for the ResourceManager utility including:
 * - Resource tracking and cleanup
 * - Timer and interval management
 * - Subscription management
 * - Memory leak detection
 * - Error handling during cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ResourceManager,
  TimerResource,
  IntervalResource,
  SubscriptionResource,
  EventListenerResource,
  CallbackResource,
  createResourceManager,
  getGlobalResourceManager,
  resetGlobalResourceManager,
  type Disposable,
  type ResourceManagerConfig,
} from '@/src/infrastructure/utils/ResourceManager';

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.stubGlobal('console', mockConsole);

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager({
      debug: false,
      enableLeakDetection: false, // Disable for tests
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    resourceManager.dispose();
  });

  describe('Basic Resource Tracking', () => {
    it('should track and cleanup disposable resources', () => {
      const mockResource: Disposable = {
        dispose: vi.fn(),
      };

      resourceManager.track(mockResource);
      expect(resourceManager.getResourceCount()).toBe(1);

      resourceManager.cleanup();
      expect(mockResource.dispose).toHaveBeenCalledOnce();
      expect(resourceManager.getResourceCount()).toBe(0);
    });

    it('should handle multiple resources', () => {
      const resources: Disposable[] = Array.from({ length: 5 }, () => ({
        dispose: vi.fn(),
      }));

      resources.forEach(resource => resourceManager.track(resource));
      expect(resourceManager.getResourceCount()).toBe(5);

      resourceManager.cleanup();
      resources.forEach(resource => {
        expect(resource.dispose).toHaveBeenCalledOnce();
      });
      expect(resourceManager.getResourceCount()).toBe(0);
    });

    it('should allow untracking specific resources', () => {
      const resource1: Disposable = { dispose: vi.fn() };
      const resource2: Disposable = { dispose: vi.fn() };

      resourceManager.track(resource1);
      resourceManager.track(resource2);
      expect(resourceManager.getResourceCount()).toBe(2);

      resourceManager.untrack(resource1);
      expect(resourceManager.getResourceCount()).toBe(1);

      resourceManager.cleanup();
      expect(resource1.dispose).not.toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalledOnce();
    });
  });

  describe('Timer Management', () => {
    it('should track and cleanup timers', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const timerId = setTimeout(() => {}, 1000) as NodeJS.Timeout;

      const timerResource = resourceManager.trackTimer(timerId);
      expect(resourceManager.getResourceCount()).toBe(1);
      expect(timerResource).toBeInstanceOf(TimerResource);

      resourceManager.cleanup();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
      expect(resourceManager.getResourceCount()).toBe(0);

      clearTimeoutSpy.mockRestore();
    });

    it('should handle timer resource disposal', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const timerId = setTimeout(() => {}, 1000) as NodeJS.Timeout;

      const timerResource = resourceManager.trackTimer(timerId);
      expect(timerResource.isDisposed()).toBe(false);

      timerResource.dispose();
      expect(timerResource.isDisposed()).toBe(true);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);

      // Should not clear again on second dispose
      timerResource.dispose();
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Interval Management', () => {
    it('should track and cleanup intervals', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const intervalId = setInterval(() => {}, 1000) as NodeJS.Timeout;

      const intervalResource = resourceManager.trackInterval(intervalId);
      expect(resourceManager.getResourceCount()).toBe(1);
      expect(intervalResource).toBeInstanceOf(IntervalResource);

      resourceManager.cleanup();
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
      expect(resourceManager.getResourceCount()).toBe(0);

      clearIntervalSpy.mockRestore();
    });

    it('should handle interval resource disposal', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const intervalId = setInterval(() => {}, 1000) as NodeJS.Timeout;

      const intervalResource = resourceManager.trackInterval(intervalId);
      expect(intervalResource.isDisposed()).toBe(false);

      intervalResource.dispose();
      expect(intervalResource.isDisposed()).toBe(true);
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Subscription Management', () => {
    it('should track and cleanup subscriptions', () => {
      const unsubscribeFn = vi.fn();
      const onDisposeFn = vi.fn();

      const subscriptionResource = resourceManager.trackSubscription(unsubscribeFn, onDisposeFn);
      expect(resourceManager.getResourceCount()).toBe(1);
      expect(subscriptionResource).toBeInstanceOf(SubscriptionResource);

      resourceManager.cleanup();
      expect(unsubscribeFn).toHaveBeenCalledOnce();
      expect(onDisposeFn).toHaveBeenCalledOnce();
      expect(resourceManager.getResourceCount()).toBe(0);
    });

    it('should handle subscription errors gracefully', () => {
      const unsubscribeFn = vi.fn().mockImplementation(() => {
        throw new Error('Unsubscribe failed');
      });
      const onDisposeFn = vi.fn().mockImplementation(() => {
        throw new Error('Dispose callback failed');
      });

      const subscriptionResource = resourceManager.trackSubscription(unsubscribeFn, onDisposeFn);
      
      // Should not throw during cleanup
      expect(() => resourceManager.cleanup()).not.toThrow();
      expect(unsubscribeFn).toHaveBeenCalledOnce();
      expect(onDisposeFn).toHaveBeenCalledOnce();
      expect(mockConsole.warn).toHaveBeenCalledTimes(2);
    });

    it('should handle subscription without dispose callback', () => {
      const unsubscribeFn = vi.fn();

      const subscriptionResource = resourceManager.trackSubscription(unsubscribeFn);
      resourceManager.cleanup();
      
      expect(unsubscribeFn).toHaveBeenCalledOnce();
    });
  });

  describe('Event Listener Management', () => {
    it('should track and cleanup event listeners', () => {
      const mockTarget = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as EventTarget;
      
      const listener = vi.fn();
      const options = { passive: true };

      const eventResource = resourceManager.trackEventListener(mockTarget, 'click', listener, options);
      expect(resourceManager.getResourceCount()).toBe(1);
      expect(eventResource).toBeInstanceOf(EventListenerResource);

      resourceManager.cleanup();
      expect(mockTarget.removeEventListener).toHaveBeenCalledWith('click', listener, options);
      expect(resourceManager.getResourceCount()).toBe(0);
    });

    it('should handle event listener cleanup errors', () => {
      const mockTarget = {
        removeEventListener: vi.fn().mockImplementation(() => {
          throw new Error('Remove listener failed');
        }),
      } as unknown as EventTarget;
      
      const listener = vi.fn();

      resourceManager.trackEventListener(mockTarget, 'click', listener);
      
      // Should not throw during cleanup
      expect(() => resourceManager.cleanup()).not.toThrow();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Event listener cleanup failed:',
        expect.any(Error)
      );
    });
  });

  describe('Callback Resource Management', () => {
    it('should track and cleanup callback resources', () => {
      const cleanupFn = vi.fn();

      const callbackResource = resourceManager.trackCallback(cleanupFn);
      expect(resourceManager.getResourceCount()).toBe(1);
      expect(callbackResource).toBeInstanceOf(CallbackResource);

      resourceManager.cleanup();
      expect(cleanupFn).toHaveBeenCalledOnce();
      expect(resourceManager.getResourceCount()).toBe(0);
    });

    it('should handle callback cleanup errors', () => {
      const cleanupFn = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      resourceManager.trackCallback(cleanupFn);
      
      // Should not throw during cleanup
      expect(() => resourceManager.cleanup()).not.toThrow();
      expect(cleanupFn).toHaveBeenCalledOnce();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Callback resource cleanup failed:',
        expect.any(Error)
      );
    });
  });

  describe('Resource Breakdown and Statistics', () => {
    it('should provide accurate resource breakdown', () => {
      const timerId = setTimeout(() => {}, 1000) as NodeJS.Timeout;
      const intervalId = setInterval(() => {}, 1000) as NodeJS.Timeout;
      
      resourceManager.trackTimer(timerId);
      resourceManager.trackInterval(intervalId);
      resourceManager.trackSubscription(() => {});
      resourceManager.trackEventListener(document, 'click', () => {});
      resourceManager.trackCallback(() => {});

      const breakdown = resourceManager.getResourceBreakdown();
      expect(breakdown).toEqual({
        timers: 1,
        intervals: 1,
        subscriptions: 1,
        eventListeners: 1,
        callbacks: 1,
        other: 0,
        total: 5,
      });

      clearTimeout(timerId);
      clearInterval(intervalId);
    });

    it('should provide resource details for debugging', () => {
      const timerId = setTimeout(() => {}, 1000) as NodeJS.Timeout;
      resourceManager.trackTimer(timerId);

      const details = resourceManager.getResourceDetails();
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        type: 'timer',
        createdAt: expect.any(Number),
        age: expect.any(Number),
      });

      clearTimeout(timerId);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect low risk with few resources', () => {
      // Add a few resources
      for (let i = 0; i < 10; i++) {
        resourceManager.trackCallback(() => {});
      }

      const result = resourceManager.detectMemoryLeaks();
      expect(result.riskLevel).toBe('low');
      expect(result.resourceCount).toBe(10);
      expect(result.recommendations).toContain('Resource usage is within normal limits');
    });

    it('should detect medium risk with moderate resources', () => {
      // Add moderate number of resources
      for (let i = 0; i < 150; i++) {
        resourceManager.trackCallback(() => {});
      }

      const result = resourceManager.detectMemoryLeaks();
      expect(result.riskLevel).toBe('medium');
      expect(result.resourceCount).toBe(150);
      expect(result.recommendations).toContain('Moderate resource usage');
    });

    it('should detect high risk with many resources', () => {
      // Add many resources
      for (let i = 0; i < 250; i++) {
        resourceManager.trackCallback(() => {});
      }

      const result = resourceManager.detectMemoryLeaks();
      expect(result.riskLevel).toBe('high');
      expect(result.resourceCount).toBe(250);
      expect(result.recommendations).toContain('High resource usage detected');
    });

    it('should provide specific recommendations for resource types', () => {
      // Add many timers
      for (let i = 0; i < 60; i++) {
        const timerId = setTimeout(() => {}, 1000) as NodeJS.Timeout;
        resourceManager.trackTimer(timerId);
      }

      const result = resourceManager.detectMemoryLeaks();
      expect(result.recommendations.some(r => r.includes('High timer count'))).toBe(true);

      // Cleanup timers
      resourceManager.cleanup();
    });
  });

  describe('Configuration and Limits', () => {
    it('should respect resource limits', () => {
      const limitedManager = new ResourceManager({
        maxResources: 5,
        warningThreshold: 3,
        debug: false,
        enableLeakDetection: false,
      });

      // Add resources up to warning threshold
      for (let i = 0; i < 3; i++) {
        limitedManager.trackCallback(() => {});
      }

      // Should not warn yet (no cooldown in test)
      limitedManager.trackCallback(() => {});
      
      // Should throw when exceeding limit
      expect(() => {
        limitedManager.trackCallback(() => {});
        limitedManager.trackCallback(() => {}); // This should throw
      }).toThrow('Resource limit exceeded');

      limitedManager.dispose();
    });

    it('should handle disposal state correctly', () => {
      expect(resourceManager.isDisposed()).toBe(false);
      
      resourceManager.dispose();
      expect(resourceManager.isDisposed()).toBe(true);

      // Should warn when trying to track on disposed manager
      resourceManager.track({ dispose: vi.fn() });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[ResourceManager] Attempting to track resource on disposed ResourceManager'
      );
    });

    it('should handle multiple cleanup calls safely', () => {
      const mockResource: Disposable = { dispose: vi.fn() };
      resourceManager.track(mockResource);

      resourceManager.cleanup();
      expect(mockResource.dispose).toHaveBeenCalledTimes(1);

      // Second cleanup should be safe
      resourceManager.cleanup();
      expect(mockResource.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Factory Functions', () => {
    it('should create resource manager with factory function', () => {
      const manager = createResourceManager({
        maxResources: 100,
        debug: true,
      });

      expect(manager).toBeInstanceOf(ResourceManager);
      expect(manager.isDisposed()).toBe(false);

      manager.dispose();
    });

    it('should manage global resource manager', () => {
      resetGlobalResourceManager();

      const manager1 = getGlobalResourceManager();
      const manager2 = getGlobalResourceManager();

      expect(manager1).toBe(manager2); // Should be same instance

      resetGlobalResourceManager();
      const manager3 = getGlobalResourceManager();
      expect(manager3).not.toBe(manager1); // Should be new instance
    });

    it('should recreate global manager if disposed', () => {
      resetGlobalResourceManager();

      const manager1 = getGlobalResourceManager();
      manager1.dispose();

      const manager2 = getGlobalResourceManager();
      expect(manager2).not.toBe(manager1);
      expect(manager2.isDisposed()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should collect and report cleanup errors', () => {
      const resources: Disposable[] = [
        { dispose: vi.fn() }, // Success
        { dispose: vi.fn().mockImplementation(() => { throw new Error('Error 1'); }) },
        { dispose: vi.fn() }, // Success
        { dispose: vi.fn().mockImplementation(() => { throw new Error('Error 2'); }) },
      ];

      resources.forEach(resource => resourceManager.track(resource));

      // Should not throw despite errors
      expect(() => resourceManager.cleanup()).not.toThrow();

      // All dispose methods should have been called
      resources.forEach(resource => {
        expect(resource.dispose).toHaveBeenCalledOnce();
      });

      // Should have logged errors
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup completed with 2 errors'),
        expect.any(Array)
      );
    });

    it('should handle resource metadata gracefully', () => {
      const mockResource: Disposable = { dispose: vi.fn() };
      
      // Track with metadata
      resourceManager.track(mockResource, { type: 'custom', stackTrace: true });
      
      const details = resourceManager.getResourceDetails();
      expect(details[0].type).toBe('custom');
      
      resourceManager.cleanup();
    });
  });
});