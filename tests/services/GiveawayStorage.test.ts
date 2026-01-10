/**
 * GiveawayStorage Property Tests
 * Tests for storage service using property-based testing with fast-check
 * 
 * **Feature: giveaway-improvements**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GiveawayStorage } from '../../components/giveaway/services/GiveawayStorage';
import type { 
  GiveawayThread, 
  FinishedGiveaway, 
  GiveawayExport,
  SubsGiveawayConfig 
} from '../../components/giveaway/types';

// ============================================
// ARBITRARIES (Generators)
// ============================================

/**
 * Generate a valid SubsGiveawayConfig
 */
const subsConfigArb = fc.record({
  tier1Value: fc.integer({ min: 0, max: 100 }),
  tier2Value: fc.integer({ min: 0, max: 100 }),
  tier3Value: fc.integer({ min: 0, max: 100 }),
  primeValue: fc.integer({ min: 0, max: 100 }),
  resubEnabled: fc.boolean(),
  resubValue: fc.integer({ min: 0, max: 100 }),
  resubBonusPerMonth: fc.double({ min: 0, max: 1, noNaN: true }),
  giftSubEnabled: fc.boolean(),
  giftSubValue: fc.integer({ min: 0, max: 100 }),
  bitsEnabled: fc.boolean(),
  bitsPerEntry: fc.integer({ min: 1, max: 10000 }),
  bitsMinimum: fc.integer({ min: 0, max: 10000 }),
  donationsEnabled: fc.boolean(),
  donationPerEntry: fc.double({ min: 0.01, max: 1000, noNaN: true }),
  donationMinimum: fc.double({ min: 0, max: 1000, noNaN: true }),
  donationCurrency: fc.constantFrom('EUR', 'USD', 'GBP'),
  channelGiftsEnabled: fc.boolean(),
  channelGiftValue: fc.integer({ min: 0, max: 100 }),
});

/**
 * Generate a valid GiveawayParticipant
 */
const participantArb = fc.record({
  oderId: fc.string({ minLength: 1, maxLength: 20 }),
  username: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  timestamp: fc.integer({ min: 0 }),
  messageId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate a valid GiveawayThread
 */
const threadArb = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  keyword: fc.string({ minLength: 0, maxLength: 50 }),
  isActive: fc.boolean(),
  participants: fc.array(participantArb, { minLength: 0, maxLength: 20 }),
  createdAt: fc.integer({ min: 0 }),
  closedAt: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  winner: fc.option(participantArb, { nil: undefined }),
  subscribersOnly: fc.boolean(),
  allowMultipleEntries: fc.boolean(),
  mode: fc.constantFrom('keyword', 'subs') as fc.Arbitrary<'keyword' | 'subs'>,
  subsConfig: fc.option(subsConfigArb, { nil: undefined }),
  startsAt: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  endsAt: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  prizeImages: fc.option(fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }), { nil: undefined }),
});

/**
 * Generate a valid FinishedGiveaway
 */
const finishedGiveawayArb = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  keyword: fc.string({ minLength: 0, maxLength: 50 }),
  mode: fc.constantFrom('viewers', 'keyword', 'subs') as fc.Arbitrary<'viewers' | 'keyword' | 'subs'>,
  winner: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  participantCount: fc.integer({ min: 0, max: 10000 }),
  subscribersOnly: fc.boolean(),
  createdAt: fc.integer({ min: 0 }),
  finishedAt: fc.integer({ min: 0 }),
});

/**
 * Generate a valid GiveawayExport
 */
const giveawayExportArb = fc.record({
  version: fc.constant(2),
  exportedAt: fc.integer({ min: 0 }),
  threads: fc.array(threadArb, { minLength: 0, maxLength: 10 }),
  history: fc.array(finishedGiveawayArb, { minLength: 0, maxLength: 20 }),
});

// ============================================
// MOCK LOCALSTORAGE
// ============================================

class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

// ============================================
// TEST SETUP
// ============================================

describe('GiveawayStorage Property Tests', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: new MockLocalStorage(),
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  // ============================================
  // PROPERTY 6: Storage Data Round-Trip
  // **Validates: Requirements 5.6**
  // ============================================

  describe('Property 6: Storage Data Round-Trip', () => {
    it('exportAll then importAll should preserve all data', () => {
      fc.assert(
        fc.property(
          fc.array(threadArb, { minLength: 0, maxLength: 5 }),
          fc.array(finishedGiveawayArb, { minLength: 0, maxLength: 10 }),
          (threads, history) => {
            // Clear storage
            GiveawayStorage.clearAll();

            // Save initial data
            if (threads.length > 0) {
              GiveawayStorage.saveThreads(threads);
            }
            history.forEach(h => GiveawayStorage.addToHistory(h));

            // Export
            const exported = GiveawayStorage.exportAll();

            // Clear and reimport
            GiveawayStorage.clearAll();
            const result = GiveawayStorage.importAll(exported);

            // Verify import succeeded
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);

            // Verify data integrity
            const loadedThreads = GiveawayStorage.getThreads();
            const loadedHistory = GiveawayStorage.getHistory();

            // Threads should match (by id)
            expect(loadedThreads.map(t => t.id).sort()).toEqual(threads.map(t => t.id).sort());

            // History should match (by id, limited to 100)
            const expectedHistoryIds = history.slice(0, 100).map(h => h.id).sort();
            expect(loadedHistory.map(h => h.id).sort()).toEqual(expectedHistoryIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('double export/import should be idempotent', () => {
      fc.assert(
        fc.property(giveawayExportArb, (exportData) => {
          GiveawayStorage.clearAll();

          // First import
          const json1 = JSON.stringify(exportData);
          GiveawayStorage.importAll(json1);

          // Export
          const exported1 = GiveawayStorage.exportAll();

          // Clear and import again
          GiveawayStorage.clearAll();
          GiveawayStorage.importAll(exported1);

          // Export again
          const exported2 = GiveawayStorage.exportAll();

          // Parse both exports
          const parsed1 = JSON.parse(exported1);
          const parsed2 = JSON.parse(exported2);

          // Thread and history IDs should match
          expect(parsed1.threads.map((t: GiveawayThread) => t.id).sort())
            .toEqual(parsed2.threads.map((t: GiveawayThread) => t.id).sort());
          expect(parsed1.history.map((h: FinishedGiveaway) => h.id).sort())
            .toEqual(parsed2.history.map((h: FinishedGiveaway) => h.id).sort());
        }),
        { numRuns: 100 }
      );
    });
  });


  // ============================================
  // PROPERTY 7: Storage Migration Idempotence
  // **Validates: Requirements 5.2**
  // ============================================

  describe('Property 7: Storage Migration Idempotence', () => {
    it('migrating already migrated data should produce same result', () => {
      fc.assert(
        fc.property(giveawayExportArb, (exportData) => {
          // First migration
          const migrated1 = GiveawayStorage.migrate(exportData);

          // Second migration (should be idempotent)
          const migrated2 = GiveawayStorage.migrate(migrated1);

          // Results should be equivalent
          expect(migrated1.version).toBe(migrated2.version);
          expect(migrated1.threads.length).toBe(migrated2.threads.length);
          expect(migrated1.history.length).toBe(migrated2.history.length);

          // Thread IDs should match
          expect(migrated1.threads.map(t => t.id).sort())
            .toEqual(migrated2.threads.map(t => t.id).sort());
        }),
        { numRuns: 100 }
      );
    });

    it('v1 data should migrate to v2 correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadArb, { minLength: 1, maxLength: 5 }),
          (threads) => {
            // Create v1 format (no version field)
            const v1Data = {
              threads: threads.map(t => ({ ...t, mode: undefined })), // v1 didn't have mode
              history: [],
              exportedAt: Date.now(),
            };

            // Migrate
            const migrated = GiveawayStorage.migrate(v1Data);

            // Should be v2
            expect(migrated.version).toBe(2);

            // All threads should have mode defaulted to 'keyword'
            migrated.threads.forEach(t => {
              expect(t.mode).toBe('keyword');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================
  // PROPERTY 8: Storage Validation Correctness
  // **Validates: Requirements 5.3**
  // ============================================

  describe('Property 8: Storage Validation Correctness', () => {
    it('valid threads should pass validation', () => {
      fc.assert(
        fc.property(fc.array(threadArb, { minLength: 0, maxLength: 10 }), (threads) => {
          const result = GiveawayStorage.validateThreads(threads);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('valid history should pass validation', () => {
      fc.assert(
        fc.property(fc.array(finishedGiveawayArb, { minLength: 0, maxLength: 10 }), (history) => {
          const result = GiveawayStorage.validateHistory(history);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('invalid data should fail validation with specific errors', () => {
      // Test with missing required fields
      const invalidThreads = [
        { id: 123 }, // id should be string
        { id: 'valid', name: null }, // name should be string
        { id: 'valid', name: 'test', keyword: 123 }, // keyword should be string
      ];

      invalidThreads.forEach(invalid => {
        const result = GiveawayStorage.validateThreads([invalid as unknown as GiveawayThread]);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('non-array input should fail validation', () => {
      const result1 = GiveawayStorage.validateThreads('not an array' as unknown as GiveawayThread[]);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Threads must be an array');

      const result2 = GiveawayStorage.validateHistory({ not: 'array' } as unknown as FinishedGiveaway[]);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('History must be an array');
    });
  });
});
