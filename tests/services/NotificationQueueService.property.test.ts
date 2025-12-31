/**
 * Property-based tests for NotificationQueueService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the notification queue system.
 * 
 * Feature: push-notifications, Property 2: Notification Queue FIFO Order
 * **Validates: Requirements 5.1, 5.6**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  NotificationQueueService,
  resetNotificationQueueService,
} from '../../src/application/services/NotificationQueueService';
import {
  IndexedDBService,
  resetIndexedDBService,
} from '../../src/application/services/IndexedDBService';
import {
  NotificationEvent,
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
} from '../../types/notifications';

// ============ MOCK LOCALSTORAGE ============

function createMockLocalStorage(): Storage {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() { return storage.size; },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
  };
}

// ============ ARBITRARIES ============

/**
 * Arbitrary for notification event types
 */
const eventTypeArb: fc.Arbitrary<NotificationEventType> = fc.constantFrom(
  'follower',
  'raid',
  'host',
  'donation',
  'subscription',
  'bits',
  'poll_ended',
  'prediction_resolved',
  'giveaway_winner',
  'command_executed'
);

/**
 * Arbitrary for notification priority
 */
const priorityArb: fc.Arbitrary<NotificationPriority> = fc.constantFrom('low', 'normal', 'high');

/**
 * Arbitrary for notification channels
 */
const channelArb: fc.Arbitrary<NotificationChannel> = fc.constantFrom('push', 'discord', 'telegram');

/**
 * Arbitrary for non-empty array of channels
 */
const channelsArb: fc.Arbitrary<NotificationChannel[]> = fc.array(channelArb, { minLength: 1, maxLength: 3 })
  .map(channels => [...new Set(channels)]); // Remove duplicates

/**
 * Arbitrary for a notification event
 */
const notificationEventArb: fc.Arbitrary<NotificationEvent> = fc.record({
  id: fc.uuid(),
  type: eventTypeArb,
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }),
  priority: priorityArb,
});

/**
 * Arbitrary for a notification with channels
 */
interface NotificationWithChannels {
  event: NotificationEvent;
  channels: NotificationChannel[];
}

const notificationWithChannelsArb: fc.Arbitrary<NotificationWithChannels> = fc.record({
  event: notificationEventArb,
  channels: channelsArb,
});

/**
 * Arbitrary for a sequence of notifications with unique IDs
 */
const notificationSequenceArb: fc.Arbitrary<NotificationWithChannels[]> = fc
  .array(notificationWithChannelsArb, { minLength: 2, maxLength: 10 })
  .chain(notifications =>
    fc.integer({ min: 1000, max: 9999 }).map(seed => {
      // Ensure unique IDs by appending index and seed
      return notifications.map((n, index) => ({
        ...n,
        event: {
          ...n.event,
          id: `${n.event.id.substring(0, 8)}-${index}-${seed}`,
        },
      }));
    })
  );

// ============ TESTS ============

describe('NotificationQueueService Property Tests', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Storage;

  beforeEach(() => {
    // Reset singletons
    resetNotificationQueueService();
    resetIndexedDBService();

    // Mock localStorage for fallback testing
    mockStorage = createMockLocalStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    mockStorage.clear();

    // Reset singletons
    resetNotificationQueueService();
    resetIndexedDBService();
  });

  describe('Property 2: Notification Queue FIFO Order', () => {
    /**
     * Feature: push-notifications, Property 2: Notification Queue FIFO Order
     *
     * For any sequence of enqueued notifications, processing SHALL execute them
     * in the exact order they were added, and the order SHALL be preserved
     * across all operations.
     *
     * **Validates: Requirements 5.1, 5.6**
     */
    it('should maintain FIFO order when enqueueing multiple notifications', async () => {
      await fc.assert(
        fc.asyncProperty(notificationSequenceArb, async (notifications) => {
          const indexedDBService = new IndexedDBService();

          try {
            await indexedDBService.init();

            const queueService = new NotificationQueueService(indexedDBService);

            // Wait for service initialization
            await new Promise(resolve => setTimeout(resolve, 50));

            // Clear any existing notifications
            await queueService.clear();

            // Enqueue notifications in sequence
            const enqueuedIds: string[] = [];

            for (const notification of notifications) {
              const id = await queueService.enqueue(
                notification.event,
                notification.channels
              );
              enqueuedIds.push(id);
            }

            // Get pending notifications
            const pending = await queueService.getPending();

            // Verify FIFO order: notifications should be in the same order as enqueued
            expect(pending.length).toBe(notifications.length);

            // Verify the event IDs match in order
            for (let i = 0; i < pending.length; i++) {
              expect(pending[i].event.id).toBe(notifications[i].event.id);
              expect(pending[i].event.type).toBe(notifications[i].event.type);
              expect(pending[i].event.title).toBe(notifications[i].event.title);
            }

            // Verify createdAt timestamps are in ascending order (FIFO)
            for (let i = 1; i < pending.length; i++) {
              expect(pending[i].createdAt).toBeGreaterThanOrEqual(pending[i - 1].createdAt);
            }

            // Clean up
            await queueService.clear();
            queueService.destroy();
          } finally {
            indexedDBService.close();
          }
        }),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test

    /**
     * Feature: push-notifications, Property 2: Notification Queue FIFO Order (Processing)
     *
     * For any sequence of enqueued notifications, when processed, the handler
     * SHALL receive them in FIFO order.
     *
     * **Validates: Requirements 5.1, 5.6**
     * 
     * Note: This test uses fewer runs and smaller sequences because the process()
     * method has intentional 1-second delays between notifications (per requirements).
     */
    it('should process notifications in FIFO order', async () => {
      // Use a smaller sequence for processing tests due to 1-second delays
      const smallSequenceArb: fc.Arbitrary<NotificationWithChannels[]> = fc
        .array(notificationWithChannelsArb, { minLength: 2, maxLength: 3 })
        .chain(notifications =>
          fc.integer({ min: 1000, max: 9999 }).map(seed => {
            return notifications.map((n, index) => ({
              ...n,
              event: {
                ...n.event,
                id: `${n.event.id.substring(0, 8)}-${index}-${seed}`,
              },
            }));
          })
        );

      await fc.assert(
        fc.asyncProperty(smallSequenceArb, async (notifications) => {
          const indexedDBService = new IndexedDBService();

          try {
            await indexedDBService.init();

            const queueService = new NotificationQueueService(indexedDBService);

            // Wait for service initialization
            await new Promise(resolve => setTimeout(resolve, 50));

            // Clear any existing notifications
            await queueService.clear();

            // Track the order in which notifications are processed
            const processedOrder: string[] = [];

            // Register a handler that tracks processing order
            queueService.registerHandler(async (event) => {
              processedOrder.push(event.id);
              return [{ channel: 'push', success: true, sentAt: Date.now() }];
            });

            // Enqueue notifications in sequence
            for (const notification of notifications) {
              await queueService.enqueue(notification.event, notification.channels);
            }

            // Process all notifications
            await queueService.process();

            // Verify processing order matches enqueue order (FIFO)
            expect(processedOrder.length).toBe(notifications.length);

            for (let i = 0; i < processedOrder.length; i++) {
              expect(processedOrder[i]).toBe(notifications[i].event.id);
            }

            // Clean up
            await queueService.clear();
            queueService.destroy();
          } finally {
            indexedDBService.close();
          }
        }),
        { numRuns: 10 } // Reduced runs due to 1-second delays per notification
      );
    }, 120000); // 120 second timeout for property test (processing has delays)
  });

  describe('Pending Count Accuracy', () => {
    /**
     * For any state of the notification queue, the pending count SHALL equal
     * the number of unprocessed notifications.
     */
    it('should maintain accurate pending count after enqueue operations', async () => {
      await fc.assert(
        fc.asyncProperty(notificationSequenceArb, async (notifications) => {
          const indexedDBService = new IndexedDBService();

          try {
            await indexedDBService.init();

            const queueService = new NotificationQueueService(indexedDBService);

            // Wait for service initialization
            await new Promise(resolve => setTimeout(resolve, 50));

            // Clear any existing notifications
            await queueService.clear();

            // Verify initial count is 0
            expect(queueService.getCount()).toBe(0);

            // Enqueue notifications and verify count after each
            for (let i = 0; i < notifications.length; i++) {
              await queueService.enqueue(
                notifications[i].event,
                notifications[i].channels
              );

              // Count should equal number of enqueued notifications
              expect(queueService.getCount()).toBe(i + 1);

              // Verify count matches actual pending notifications
              const pending = await queueService.getPending();
              expect(queueService.getCount()).toBe(pending.length);
            }

            // Final verification: count equals total notifications
            expect(queueService.getCount()).toBe(notifications.length);

            // Clean up
            await queueService.clear();
            expect(queueService.getCount()).toBe(0);

            queueService.destroy();
          } finally {
            indexedDBService.close();
          }
        }),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test
  });
});
