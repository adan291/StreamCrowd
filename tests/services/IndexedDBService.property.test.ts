/**
 * Property-based tests for IndexedDBService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the IndexedDB storage system.
 * 
 * @requirements 1.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { IndexedDBService, type DBSchema } from '../../src/application/services/IndexedDBService';

// ============ ARBITRARIES ============

/**
 * Arbitrary for valid store names
 */
const storeNameArb: fc.Arbitrary<keyof DBSchema> = fc.constantFrom(
  'polls',
  'predictions',
  'giveaways',
  'commands',
  'timers',
  'settings'
);

/**
 * Arbitrary for valid keys (non-empty strings, excluding reserved names)
 */
const keyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !['__proto__', 'constructor', 'prototype'].includes(s));

/**
 * Arbitrary for poll-like objects
 */
const pollArb = fc.record({
  id: keyArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  options: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 6 }),
  status: fc.constantFrom('active', 'closed', 'pending'),
  createdAt: fc.integer({ min: 0, max: Date.now() }),
});

/**
 * Arbitrary for command-like objects
 */
const commandArb = fc.record({
  id: keyArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  response: fc.string({ minLength: 1, maxLength: 200 }),
  enabled: fc.boolean(),
  cooldown: fc.integer({ min: 0, max: 3600 }),
});

/**
 * Arbitrary for timer-like objects
 */
const timerArb = fc.record({
  id: keyArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  interval: fc.integer({ min: 1, max: 3600 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  enabled: fc.boolean(),
});

/**
 * Arbitrary for settings-like objects
 */
const settingsArb = fc.record({
  key: keyArb,
  value: fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.array(fc.string(), { maxLength: 5 })
  ),
});

/**
 * Arbitrary for generic serializable data
 */
const serializableDataArb = fc.oneof(
  pollArb,
  commandArb,
  timerArb,
  settingsArb
);

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

// ============ TESTS ============

describe('IndexedDBService Property Tests', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Storage;

  beforeEach(() => {
    // Mock localStorage for fallback testing
    mockStorage = createMockLocalStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    mockStorage.clear();
  });

  describe('Property 1: IndexedDB Round-Trip Consistency', () => {
    /**
     * Feature: offline-mode, Property 1: IndexedDB Round-Trip Consistency
     * 
     * For any valid data object, storing it in IndexedDB and then retrieving it
     * SHALL produce an equivalent object.
     * 
     * **Validates: Requirements 1.5**
     */
    it('should preserve poll data through put/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          pollArb,
          async (pollData) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Store the data
              await service.put('polls', pollData.id, pollData);
              
              // Retrieve the data
              const retrieved = await service.get<typeof pollData>('polls', pollData.id);
              
              // Verify round-trip consistency
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(pollData.id);
              expect(retrieved!.title).toBe(pollData.title);
              expect(retrieved!.options).toEqual(pollData.options);
              expect(retrieved!.status).toBe(pollData.status);
              expect(retrieved!.createdAt).toBe(pollData.createdAt);
              
              // Clean up
              await service.delete('polls', pollData.id);
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve command data through put/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          commandArb,
          async (commandData) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Store the data
              await service.put('commands', commandData.id, commandData);
              
              // Retrieve the data
              const retrieved = await service.get<typeof commandData>('commands', commandData.id);
              
              // Verify round-trip consistency
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(commandData.id);
              expect(retrieved!.name).toBe(commandData.name);
              expect(retrieved!.response).toBe(commandData.response);
              expect(retrieved!.enabled).toBe(commandData.enabled);
              expect(retrieved!.cooldown).toBe(commandData.cooldown);
              
              // Clean up
              await service.delete('commands', commandData.id);
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve timer data through put/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerArb,
          async (timerData) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Store the data
              await service.put('timers', timerData.id, timerData);
              
              // Retrieve the data
              const retrieved = await service.get<typeof timerData>('timers', timerData.id);
              
              // Verify round-trip consistency
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(timerData.id);
              expect(retrieved!.name).toBe(timerData.name);
              expect(retrieved!.interval).toBe(timerData.interval);
              expect(retrieved!.message).toBe(timerData.message);
              expect(retrieved!.enabled).toBe(timerData.enabled);
              
              // Clean up
              await service.delete('timers', timerData.id);
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve settings data through put/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          settingsArb,
          async (settingsData) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Store the data
              await service.put('settings', settingsData.key, settingsData);
              
              // Retrieve the data
              const retrieved = await service.get<typeof settingsData>('settings', settingsData.key);
              
              // Verify round-trip consistency
              expect(retrieved).not.toBeNull();
              expect(retrieved!.key).toBe(settingsData.key);
              expect(retrieved!.value).toEqual(settingsData.value);
              
              // Clean up
              await service.delete('settings', settingsData.key);
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data through multiple put operations (overwrite)', async () => {
      await fc.assert(
        fc.asyncProperty(
          keyArb,
          fc.array(pollArb, { minLength: 2, maxLength: 5 }),
          async (key, pollVersions) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Write multiple versions with the same key
              for (const poll of pollVersions) {
                const pollWithKey = { ...poll, id: key };
                await service.put('polls', key, pollWithKey);
              }
              
              // Retrieve should return the last version
              const lastPoll = { ...pollVersions[pollVersions.length - 1], id: key };
              const retrieved = await service.get<typeof lastPoll>('polls', key);
              
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(key);
              expect(retrieved!.title).toBe(lastPoll.title);
              expect(retrieved!.options).toEqual(lastPoll.options);
              expect(retrieved!.status).toBe(lastPoll.status);
              
              // Clean up
              await service.delete('polls', key);
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          storeNameArb,
          keyArb,
          async (store, key) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Ensure key doesn't exist
              await service.delete(store, key);
              
              // Get should return null
              const retrieved = await service.get(store, key);
              expect(retrieved).toBeNull();
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all items through getAll after multiple puts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(commandArb, { minLength: 1, maxLength: 5 })
            .map(commands => {
              // Ensure unique IDs
              const seen = new Set<string>();
              return commands.filter(c => {
                if (seen.has(c.id)) return false;
                seen.add(c.id);
                return true;
              });
            })
            .filter(commands => commands.length > 0),
          async (commands) => {
            const service = new IndexedDBService();
            
            try {
              await service.init();
              
              // Clear the store first
              await service.clear('commands');
              
              // Store all commands
              for (const command of commands) {
                await service.put('commands', command.id, command);
              }
              
              // Retrieve all
              const retrieved = await service.getAll<typeof commands[0]>('commands');
              
              // Should have same count
              expect(retrieved.length).toBe(commands.length);
              
              // Each original command should be in retrieved
              for (const original of commands) {
                const found = retrieved.find(r => r.id === original.id);
                expect(found).toBeDefined();
                expect(found!.name).toBe(original.name);
                expect(found!.response).toBe(original.response);
                expect(found!.enabled).toBe(original.enabled);
              }
              
              // Clean up
              await service.clear('commands');
            } finally {
              service.close();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
