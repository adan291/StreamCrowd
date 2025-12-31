/**
 * Property-based tests for NotificationHistoryService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the notification history system.
 * 
 * Feature: push-notifications, Property 8: History Limit Enforcement
 * **Validates: Requirements 6.3**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  NotificationHistoryService,
  resetNotificationHistoryService,
} from '../../src/application/services/NotificationHistoryService';
import {
  IndexedDBService,
  resetIndexedDBService,
} from '../../src/application/services/IndexedDBService';
import {
  resetNotificationQueueService,
  NotificationQueueService,
} from '../../src/application/services/NotificationQueueService';
import {
  NotificationHistoryEntry,
  NotificationEvent,
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  NotificationResult,
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
 * Arbitrary for a notification result
 */
const notificationResultArb: fc.Arbitrary<NotificationResult> = fc.record({
  channel: channelArb,
  success: fc.boolean(),
  sentAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
}).chain(result => 
  result.success 
    ? fc.constant(result)
    : fc.string({ minLength: 1, maxLength: 50 }).map(error => ({ ...result, error }))
);

/**
 * Arbitrary for notification results array
 */
const notificationResultsArb: fc.Arbitrary<NotificationResult[]> = fc.array(notificationResultArb, { minLength: 1, maxLength: 3 });

/**
 * Arbitrary for a notification history entry
 */
const historyEntryArb: fc.Arbitrary<NotificationHistoryEntry> = fc.record({
  id: fc.uuid(),
  event: notificationEventArb,
  channels: channelsArb,
  results: notificationResultsArb,
  createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
});

/**
 * Arbitrary for a sequence of history entries with unique IDs
 */
const historySequenceArb = (minLength: number, maxLength: number): fc.Arbitrary<NotificationHistoryEntry[]> => 
  fc.array(historyEntryArb, { minLength, maxLength })
    .chain(entries =>
      fc.integer({ min: 1000, max: 9999 }).map(seed => {
        // Ensure unique IDs by appending index and seed
        return entries.map((entry, index) => ({
          ...entry,
          id: `${entry.id.substring(0, 8)}-${index}-${seed}`,
          event: {
            ...entry.event,
            id: `${entry.event.id.substring(0, 8)}-${index}-${seed}`,
          },
        }));
      })
    );

// ============ TESTS ============

describe('NotificationHistoryService Property Tests', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Storage;

  beforeEach(() => {
    // Reset singletons
    resetNotificationHistoryService();
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
    resetNotificationHistoryService();
    resetNotificationQueueService();
    resetIndexedDBService();
  });

  describe('Property 8: History Limit Enforcement', () => {
    /**
     * Feature: push-notifications, Property 8: History Limit Enforcement
     *
     * For any state of the notification history, the number of entries SHALL
     * not exceed 50, with oldest entries being removed first when the limit
     * is reached.
     *
     * **Validates: Requirements 6.3**
     */
    it('should never exceed 50 entries regardless of how many are added', async () => {
      await fc.assert(
        fc.asyncProperty(
          historySequenceArb(51, 100), // Generate more than 50 entries
          async (entries) => {
            const indexedDBService = new IndexedDBService();
            const queueService = new NotificationQueueService(indexedDBService);

            try {
              await indexedDBService.init();

              const historyService = new NotificationHistoryService(
                indexedDBService,
                queueService
              );

              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));

              // Clear any existing history
              await historyService.clear();

              // Add all entries
              for (const entry of entries) {
                await historyService.addEntry(entry);
              }

              // Get history
              const history = await historyService.getHistory();

              // Property: history should never exceed 50 entries
              expect(history.length).toBeLessThanOrEqual(50);

              // Property: count should match history length
              expect(historyService.getCount()).toBe(history.length);

              // Clean up
              await historyService.clear();
              historyService.destroy();
              queueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    /**
     * Feature: push-notifications, Property 8: History Limit Enforcement
     *
     * When adding entries beyond the limit, the oldest entries SHALL be
     * removed first (FIFO removal).
     *
     * **Validates: Requirements 6.3**
     */
    it('should remove oldest entries first when limit is exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          historySequenceArb(55, 60), // Generate slightly more than 50 entries
          async (entries) => {
            const indexedDBService = new IndexedDBService();
            const queueService = new NotificationQueueService(indexedDBService);

            try {
              await indexedDBService.init();

              const historyService = new NotificationHistoryService(
                indexedDBService,
                queueService
              );

              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));

              // Clear any existing history
              await historyService.clear();

              // Add all entries with incrementing createdAt to establish order
              const baseTime = Date.now();
              const entriesWithOrder = entries.map((entry, index) => ({
                ...entry,
                createdAt: baseTime + index * 1000, // Each entry 1 second apart
              }));

              for (const entry of entriesWithOrder) {
                await historyService.addEntry(entry);
              }

              // Get history
              const history = await historyService.getHistory();

              // Property: should have exactly 50 entries
              expect(history.length).toBe(50);

              // Property: the newest 50 entries should be kept
              // History is sorted newest first, so the first entry should be the last added
              const newestEntries = entriesWithOrder.slice(-50).reverse();
              
              for (let i = 0; i < history.length; i++) {
                expect(history[i].id).toBe(newestEntries[i].id);
              }

              // Clean up
              await historyService.clear();
              historyService.destroy();
              queueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    /**
     * Feature: push-notifications, Property 8: History Limit Enforcement
     *
     * For any number of entries less than or equal to 50, all entries
     * SHALL be preserved.
     *
     * **Validates: Requirements 6.3**
     */
    it('should preserve all entries when under the limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          historySequenceArb(1, 50), // Generate up to 50 entries
          async (entries) => {
            const indexedDBService = new IndexedDBService();
            const queueService = new NotificationQueueService(indexedDBService);

            try {
              await indexedDBService.init();

              const historyService = new NotificationHistoryService(
                indexedDBService,
                queueService
              );

              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));

              // Clear any existing history
              await historyService.clear();

              // Add all entries
              for (const entry of entries) {
                await historyService.addEntry(entry);
              }

              // Get history
              const history = await historyService.getHistory();

              // Property: all entries should be preserved
              expect(history.length).toBe(entries.length);

              // Property: all entry IDs should be present
              const historyIds = new Set(history.map(h => h.id));
              for (const entry of entries) {
                expect(historyIds.has(entry.id)).toBe(true);
              }

              // Clean up
              await historyService.clear();
              historyService.destroy();
              queueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('History Order', () => {
    /**
     * For any sequence of history entries, getHistory SHALL return them
     * sorted by createdAt in descending order (newest first).
     */
    it('should return history sorted by createdAt descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          historySequenceArb(2, 20),
          async (entries) => {
            const indexedDBService = new IndexedDBService();
            const queueService = new NotificationQueueService(indexedDBService);

            try {
              await indexedDBService.init();

              const historyService = new NotificationHistoryService(
                indexedDBService,
                queueService
              );

              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));

              // Clear any existing history
              await historyService.clear();

              // Add entries with random createdAt values
              for (const entry of entries) {
                await historyService.addEntry(entry);
              }

              // Get history
              const history = await historyService.getHistory();

              // Property: history should be sorted by createdAt descending
              for (let i = 1; i < history.length; i++) {
                expect(history[i - 1].createdAt).toBeGreaterThanOrEqual(history[i].createdAt);
              }

              // Clean up
              await historyService.clear();
              historyService.destroy();
              queueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
