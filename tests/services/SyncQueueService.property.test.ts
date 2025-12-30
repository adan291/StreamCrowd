/**
 * Property-based tests for SyncQueueService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the sync queue system.
 * 
 * @requirements 4.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  SyncQueueService, 
  SyncOperationInput,
  resetSyncQueueService 
} from '../../src/application/services/SyncQueueService';
import { 
  IndexedDBService, 
  resetIndexedDBService 
} from '../../src/application/services/IndexedDBService';
import { 
  NetworkService, 
  resetNetworkService 
} from '../../src/application/services/NetworkService';

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
 * Arbitrary for sync operation types
 */
const operationTypeArb = fc.constantFrom('create', 'update', 'delete') as fc.Arbitrary<'create' | 'update' | 'delete'>;

/**
 * Arbitrary for valid store names
 */
const storeNameArb = fc.constantFrom(
  'polls',
  'predictions',
  'giveaways',
  'commands',
  'timers',
  'settings'
);

/**
 * Arbitrary for valid keys (non-empty strings)
 */
const keyArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for generic data payload
 */
const dataArb = fc.record({
  id: keyArb,
  value: fc.string({ minLength: 1, maxLength: 20 }),
});

/**
 * Arbitrary for a single sync operation input
 */
const syncOperationInputArb: fc.Arbitrary<SyncOperationInput> = fc.record({
  type: operationTypeArb,
  store: storeNameArb,
  key: keyArb,
  data: dataArb,
  maxRetries: fc.constant(3),
});

/**
 * Arbitrary for a sequence of sync operations with unique keys
 * to ensure we can track order properly
 */
const syncOperationSequenceArb = fc.array(syncOperationInputArb, { minLength: 2, maxLength: 5 })
  .chain(operations => 
    fc.integer({ min: 1000, max: 9999 }).map(seed => {
      // Ensure unique keys by appending index and seed
      return operations.map((op, index) => ({
        ...op,
        key: `${op.key.substring(0, 5)}_${index}_${seed}`,
      }));
    })
  );

// ============ TESTS ============

describe('SyncQueueService Property Tests', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Storage;

  beforeEach(() => {
    // Reset singletons
    resetSyncQueueService();
    resetIndexedDBService();
    resetNetworkService();
    
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
    resetSyncQueueService();
    resetIndexedDBService();
    resetNetworkService();
  });

  describe('Property 2: Sync Queue FIFO Order', () => {
    /**
     * Feature: offline-mode, Property 2: Sync Queue FIFO Order
     * 
     * For any sequence of enqueued operations, processing SHALL execute them
     * in the exact order they were added.
     * 
     * **Validates: Requirements 4.6**
     */
    it('should maintain FIFO order when enqueueing multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncOperationSequenceArb,
          async (operations) => {
            const indexedDBService = new IndexedDBService();
            const networkService = new NetworkService();
            
            try {
              await indexedDBService.init();
              
              const syncQueueService = new SyncQueueService(
                indexedDBService,
                networkService
              );
              
              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Clear any existing operations
              await syncQueueService.clear();
              
              // Enqueue operations in sequence
              // Use incrementing timestamps to ensure FIFO order
              const enqueuedIds: string[] = [];
              const enqueuedKeys: string[] = [];
              
              for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                const id = await syncQueueService.enqueue(operation);
                enqueuedIds.push(id);
                enqueuedKeys.push(operation.key);
              }
              
              // Get pending operations
              const pending = await syncQueueService.getPending();
              
              // Verify FIFO order: operations should be in the same order as enqueued
              expect(pending.length).toBe(operations.length);
              
              // Verify the keys match in order
              for (let i = 0; i < pending.length; i++) {
                expect(pending[i].key).toBe(enqueuedKeys[i]);
                expect(pending[i].type).toBe(operations[i].type);
                expect(pending[i].store).toBe(operations[i].store);
              }
              
              // Verify timestamps are in ascending order (FIFO)
              for (let i = 1; i < pending.length; i++) {
                expect(pending[i].timestamp).toBeGreaterThanOrEqual(pending[i - 1].timestamp);
              }
              
              // Clean up
              await syncQueueService.clear();
              syncQueueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test

    /**
     * Feature: offline-mode, Property 2: Sync Queue FIFO Order (Processing)
     * 
     * For any sequence of enqueued operations, when processed, the handler
     * SHALL receive them in FIFO order.
     * 
     * **Validates: Requirements 4.6**
     */
    it('should process operations in FIFO order', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncOperationSequenceArb,
          async (operations) => {
            const indexedDBService = new IndexedDBService();
            const networkService = new NetworkService();
            
            try {
              await indexedDBService.init();
              
              const syncQueueService = new SyncQueueService(
                indexedDBService,
                networkService
              );
              
              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Clear any existing operations
              await syncQueueService.clear();
              
              // Track the order in which operations are processed
              const processedOrder: string[] = [];
              
              // Register a handler that tracks processing order
              syncQueueService.registerHandler(async (operation) => {
                processedOrder.push(operation.key);
                return true; // Mark as successful
              });
              
              // Enqueue operations in sequence
              const enqueuedKeys: string[] = [];
              for (const operation of operations) {
                await syncQueueService.enqueue(operation);
                enqueuedKeys.push(operation.key);
              }
              
              // Process all operations
              await syncQueueService.process();
              
              // Verify processing order matches enqueue order (FIFO)
              expect(processedOrder.length).toBe(enqueuedKeys.length);
              
              for (let i = 0; i < processedOrder.length; i++) {
                expect(processedOrder[i]).toBe(enqueuedKeys[i]);
              }
              
              // Clean up
              await syncQueueService.clear();
              syncQueueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test
  });

  describe('Property 4: Pending Operations Count', () => {
    /**
     * Feature: offline-mode, Property 4: Pending Operations Count
     * 
     * For any state of the sync queue, the pending count SHALL equal
     * the number of unprocessed operations.
     * 
     * **Validates: Requirements 3.3**
     */
    it('should maintain accurate pending count after enqueue operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncOperationSequenceArb,
          async (operations) => {
            const indexedDBService = new IndexedDBService();
            const networkService = new NetworkService();
            
            try {
              await indexedDBService.init();
              
              const syncQueueService = new SyncQueueService(
                indexedDBService,
                networkService
              );
              
              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Clear any existing operations
              await syncQueueService.clear();
              
              // Verify initial count is 0
              expect(syncQueueService.getCount()).toBe(0);
              
              // Enqueue operations and verify count after each
              for (let i = 0; i < operations.length; i++) {
                await syncQueueService.enqueue(operations[i]);
                
                // Count should equal number of enqueued operations
                expect(syncQueueService.getCount()).toBe(i + 1);
                
                // Verify count matches actual pending operations
                const pending = await syncQueueService.getPending();
                expect(syncQueueService.getCount()).toBe(pending.length);
              }
              
              // Final verification: count equals total operations
              expect(syncQueueService.getCount()).toBe(operations.length);
              
              // Clean up
              await syncQueueService.clear();
              expect(syncQueueService.getCount()).toBe(0);
              
              syncQueueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test

    /**
     * Feature: offline-mode, Property 4: Pending Operations Count (After Processing)
     * 
     * For any state of the sync queue, after processing operations,
     * the pending count SHALL equal the number of remaining unprocessed operations.
     * 
     * **Validates: Requirements 3.3**
     */
    it('should maintain accurate pending count after processing operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncOperationSequenceArb,
          async (operations) => {
            const indexedDBService = new IndexedDBService();
            const networkService = new NetworkService();
            
            try {
              await indexedDBService.init();
              
              const syncQueueService = new SyncQueueService(
                indexedDBService,
                networkService
              );
              
              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Clear any existing operations
              await syncQueueService.clear();
              
              // Register a handler that always succeeds
              syncQueueService.registerHandler(async () => true);
              
              // Enqueue all operations
              for (const operation of operations) {
                await syncQueueService.enqueue(operation);
              }
              
              // Verify count equals number of enqueued operations
              expect(syncQueueService.getCount()).toBe(operations.length);
              
              // Process all operations
              await syncQueueService.process();
              
              // After successful processing, count should be 0
              expect(syncQueueService.getCount()).toBe(0);
              
              // Verify actual pending operations also equals 0
              const pending = await syncQueueService.getPending();
              expect(pending.length).toBe(0);
              expect(syncQueueService.getCount()).toBe(pending.length);
              
              // Clean up
              syncQueueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test

    /**
     * Feature: offline-mode, Property 4: Pending Operations Count (Subscriber Notification)
     * 
     * For any state change in the sync queue, subscribers SHALL receive
     * the accurate pending count.
     * 
     * **Validates: Requirements 3.3**
     */
    it('should notify subscribers with accurate pending count', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncOperationSequenceArb,
          async (operations) => {
            const indexedDBService = new IndexedDBService();
            const networkService = new NetworkService();
            
            try {
              await indexedDBService.init();
              
              const syncQueueService = new SyncQueueService(
                indexedDBService,
                networkService
              );
              
              // Wait for service initialization
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Clear any existing operations
              await syncQueueService.clear();
              
              // Track all count notifications
              const notifiedCounts: number[] = [];
              
              // Subscribe to count changes
              const unsubscribe = syncQueueService.subscribe((count) => {
                notifiedCounts.push(count);
              });
              
              // Enqueue operations
              for (const operation of operations) {
                await syncQueueService.enqueue(operation);
              }
              
              // Verify we received notifications for each enqueue
              // First notification is from subscribe (initial count = 0)
              // Then one notification per enqueue
              expect(notifiedCounts.length).toBe(operations.length + 1);
              
              // First notification should be 0 (initial state after clear)
              expect(notifiedCounts[0]).toBe(0);
              
              // Each subsequent notification should increment by 1
              for (let i = 1; i <= operations.length; i++) {
                expect(notifiedCounts[i]).toBe(i);
              }
              
              // Final notified count should match getCount()
              expect(notifiedCounts[notifiedCounts.length - 1]).toBe(syncQueueService.getCount());
              
              // Clean up
              unsubscribe();
              await syncQueueService.clear();
              syncQueueService.destroy();
            } finally {
              indexedDBService.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test
  });
});
