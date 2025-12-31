/**
 * Property-based tests for NetworkService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the network status notification system.
 * 
 * @requirements 2.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  NetworkService, 
  NetworkStatus,
  resetNetworkService 
} from '../../src/application/services/NetworkService';

// ============ ARBITRARIES ============

/**
 * Arbitrary for number of subscribers (between 2 and 10)
 */
const subscriberCountArb = fc.integer({ min: 2, max: 10 });

/**
 * Arbitrary for network status changes (sequence of online/offline states)
 */
const networkStateSequenceArb = fc.array(
  fc.boolean(), // true = online, false = offline
  { minLength: 1, maxLength: 5 }
);

// ============ TESTS ============

describe('NetworkService Property Tests', () => {
  beforeEach(() => {
    resetNetworkService();
  });

  afterEach(() => {
    resetNetworkService();
  });

  describe('Property 3: Network Status Consistency', () => {
    /**
     * Feature: offline-mode, Property 3: Network Status Consistency
     * 
     * For any network state change, all subscribers SHALL receive the same status update.
     * 
     * **Validates: Requirements 2.4**
     */
    it('should notify all subscribers with the same status when network state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriberCountArb,
          async (numSubscribers) => {
            const networkService = new NetworkService();
            
            try {
              // Track received statuses for each subscriber
              const receivedStatuses: NetworkStatus[][] = Array.from(
                { length: numSubscribers },
                () => []
              );
              
              // Subscribe multiple listeners
              const unsubscribes: (() => void)[] = [];
              
              for (let i = 0; i < numSubscribers; i++) {
                const unsubscribe = networkService.subscribe((status) => {
                  receivedStatuses[i].push({ ...status });
                });
                unsubscribes.push(unsubscribe);
              }
              
              // Simulate network state change by calling internal methods
              // We access the private methods through the prototype for testing
              const handleOnline = (networkService as any).handleOnline.bind(networkService);
              const handleOffline = (networkService as any).handleOffline.bind(networkService);
              
              // Trigger an offline event
              handleOffline();
              
              // Wait for notifications to propagate
              await new Promise(resolve => setTimeout(resolve, 10));
              
              // Trigger an online event
              handleOnline();
              
              // Wait for notifications to propagate
              await new Promise(resolve => setTimeout(resolve, 10));
              
              // Verify all subscribers received notifications
              // Each subscriber should have received at least one notification
              for (let i = 0; i < numSubscribers; i++) {
                expect(receivedStatuses[i].length).toBeGreaterThan(0);
              }
              
              // Verify all subscribers received the SAME status for each notification
              // Compare the last received status across all subscribers
              const lastStatuses = receivedStatuses.map(statuses => 
                statuses[statuses.length - 1]
              );
              
              // All last statuses should have the same isOnline value
              const firstLastStatus = lastStatuses[0];
              for (let i = 1; i < lastStatuses.length; i++) {
                expect(lastStatuses[i].isOnline).toBe(firstLastStatus.isOnline);
              }
              
              // Clean up
              unsubscribes.forEach(unsub => unsub());
              networkService.destroy();
            } catch (error) {
              networkService.destroy();
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: offline-mode, Property 3: Network Status Consistency (Order)
     * 
     * For any sequence of network state changes, all subscribers SHALL receive
     * notifications in the same order.
     * 
     * **Validates: Requirements 2.4**
     */
    it('should notify all subscribers in the same order for state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriberCountArb,
          networkStateSequenceArb,
          async (numSubscribers, stateSequence) => {
            const networkService = new NetworkService();
            
            try {
              // Track received isOnline values for each subscriber
              const receivedStates: boolean[][] = Array.from(
                { length: numSubscribers },
                () => []
              );
              
              // Subscribe multiple listeners
              const unsubscribes: (() => void)[] = [];
              
              for (let i = 0; i < numSubscribers; i++) {
                const unsubscribe = networkService.subscribe((status) => {
                  receivedStates[i].push(status.isOnline);
                });
                unsubscribes.push(unsubscribe);
              }
              
              // Access internal handlers for testing
              const handleOnline = (networkService as any).handleOnline.bind(networkService);
              const handleOffline = (networkService as any).handleOffline.bind(networkService);
              
              // Apply state sequence (only changes trigger notifications)
              let currentState = networkService.getStatus().isOnline;
              
              for (const targetState of stateSequence) {
                if (targetState !== currentState) {
                  if (targetState) {
                    handleOnline();
                  } else {
                    handleOffline();
                  }
                  currentState = targetState;
                  // Small delay to ensure synchronous notification
                  await new Promise(resolve => setTimeout(resolve, 5));
                }
              }
              
              // Verify all subscribers received the same sequence of states
              // All arrays should have the same length
              const firstLength = receivedStates[0].length;
              for (let i = 1; i < numSubscribers; i++) {
                expect(receivedStates[i].length).toBe(firstLength);
              }
              
              // All arrays should have the same values in the same order
              for (let stateIdx = 0; stateIdx < firstLength; stateIdx++) {
                const expectedState = receivedStates[0][stateIdx];
                for (let subIdx = 1; subIdx < numSubscribers; subIdx++) {
                  expect(receivedStates[subIdx][stateIdx]).toBe(expectedState);
                }
              }
              
              // Clean up
              unsubscribes.forEach(unsub => unsub());
              networkService.destroy();
            } catch (error) {
              networkService.destroy();
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: offline-mode, Property 3: Network Status Consistency (Value Equality)
     * 
     * For any network state change, all subscribers SHALL receive status objects
     * with identical values (isOnline, lastOnline, lastOffline).
     * 
     * **Validates: Requirements 2.4**
     */
    it('should provide consistent status values to all subscribers', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriberCountArb,
          async (numSubscribers) => {
            const networkService = new NetworkService();
            
            try {
              // Track received status objects for each subscriber
              const receivedStatuses: NetworkStatus[][] = Array.from(
                { length: numSubscribers },
                () => []
              );
              
              // Subscribe multiple listeners
              const unsubscribes: (() => void)[] = [];
              
              for (let i = 0; i < numSubscribers; i++) {
                const unsubscribe = networkService.subscribe((status) => {
                  receivedStatuses[i].push({ ...status });
                });
                unsubscribes.push(unsubscribe);
              }
              
              // Trigger state changes
              const handleOffline = (networkService as any).handleOffline.bind(networkService);
              const handleOnline = (networkService as any).handleOnline.bind(networkService);
              
              handleOffline();
              await new Promise(resolve => setTimeout(resolve, 10));
              
              handleOnline();
              await new Promise(resolve => setTimeout(resolve, 10));
              
              // Verify all subscribers received the same number of notifications
              const firstLength = receivedStatuses[0].length;
              for (let i = 1; i < numSubscribers; i++) {
                expect(receivedStatuses[i].length).toBe(firstLength);
              }
              
              // Verify all subscribers received identical values for each notification
              for (let notifIdx = 0; notifIdx < firstLength; notifIdx++) {
                const referenceStatus = receivedStatuses[0][notifIdx];
                for (let subIdx = 1; subIdx < numSubscribers; subIdx++) {
                  const currentStatus = receivedStatuses[subIdx][notifIdx];
                  expect(currentStatus.isOnline).toBe(referenceStatus.isOnline);
                  expect(currentStatus.lastOnline).toBe(referenceStatus.lastOnline);
                  expect(currentStatus.lastOffline).toBe(referenceStatus.lastOffline);
                }
              }
              
              // Clean up
              unsubscribes.forEach(unsub => unsub());
              networkService.destroy();
            } catch (error) {
              networkService.destroy();
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
