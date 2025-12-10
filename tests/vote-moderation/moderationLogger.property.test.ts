/**
 * Property-based tests for Moderation Logger
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createLogEntry,
  addLogEntry,
  getLogEntries,
  groupLogByReason,
  clearLogEntries,
  clearAllLogEntries,
  RejectionReason,
  ModerationLogEntry,
} from '../../services/voteModerationService';

// Valid rejection reasons for generators
const REJECTION_REASONS: RejectionReason[] = [
  'ACCOUNT_TOO_YOUNG',
  'COOLDOWN_ACTIVE',
  'VOTE_CHANGE_DISABLED',
  'INVALID_OPTION',
];

// Arbitrary for generating valid rejection reasons
const rejectionReasonArb = fc.constantFrom(...REJECTION_REASONS);

// Arbitrary for generating valid actions
const actionArb = fc.constantFrom('REJECTED' as const, 'ACCEPTED' as const, 'VOTE_CHANGED' as const);

// Arbitrary for generating non-empty usernames
const usernameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

// Arbitrary for generating non-empty user IDs
const userIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

describe('ModerationLogger Property Tests', () => {
  beforeEach(() => {
    clearAllLogEntries();
  });

  /**
   * **Feature: vote-moderation, Property 6: Log entry completeness**
   * 
   * *For any* rejected vote, the corresponding log entry contains a non-empty username,
   * a valid timestamp, and a rejection reason from the defined set.
   * 
   * **Validates: Requirements 3.1**
   */
  describe('Property 6: Log entry completeness', () => {
    it('should create log entries with non-empty username for rejected votes', () => {
      fc.assert(
        fc.property(
          usernameArb,
          userIdArb,
          rejectionReasonArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          (username, userId, reason, optionId, weight) => {
            const entry = createLogEntry(username, userId, 'REJECTED', reason, optionId, weight);
            
            // Username must be non-empty
            expect(entry.username.length).toBeGreaterThan(0);
            expect(entry.username).toBe(username);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create log entries with valid timestamps', () => {
      fc.assert(
        fc.property(
          usernameArb,
          userIdArb,
          rejectionReasonArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          (username, userId, reason, optionId, weight) => {
            const beforeTime = Date.now();
            const entry = createLogEntry(username, userId, 'REJECTED', reason, optionId, weight);
            const afterTime = Date.now();
            
            // Timestamp must be a valid number within the execution window
            expect(typeof entry.timestamp).toBe('number');
            expect(entry.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(entry.timestamp).toBeLessThanOrEqual(afterTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create log entries with rejection reason from defined set for rejected votes', () => {
      fc.assert(
        fc.property(
          usernameArb,
          userIdArb,
          rejectionReasonArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          (username, userId, reason, optionId, weight) => {
            const entry = createLogEntry(username, userId, 'REJECTED', reason, optionId, weight);
            
            // Rejection reason must be from the defined set
            expect(REJECTION_REASONS).toContain(entry.reason);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all input fields in the created log entry', () => {
      fc.assert(
        fc.property(
          usernameArb,
          userIdArb,
          actionArb,
          fc.option(rejectionReasonArb, { nil: undefined }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 5 }),
          (username, userId, action, reason, optionId, weight) => {
            const entry = createLogEntry(username, userId, action, reason, optionId, weight);
            
            expect(entry.username).toBe(username);
            expect(entry.userId).toBe(userId);
            expect(entry.action).toBe(action);
            expect(entry.reason).toBe(reason);
            expect(entry.optionId).toBe(optionId);
            expect(entry.weight).toBe(weight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vote-moderation, Property 7: Log display limit**
   * 
   * *For any* moderation log with N entries, the displayed entries count is min(N, 100).
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 7: Log display limit', () => {
    it('should return all entries when count is less than or equal to 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // number of entries (0 to 100)
          fc.uuid(), // pollId
          (numEntries, pollId) => {
            clearLogEntries(pollId);
            
            // Add entries
            for (let i = 0; i < numEntries; i++) {
              const entry = createLogEntry(`user${i}`, `id${i}`, 'ACCEPTED', undefined, 1, 1);
              addLogEntry(pollId, entry);
            }
            
            const retrieved = getLogEntries(pollId);
            
            // Should return all entries when N <= 100
            expect(retrieved.length).toBe(numEntries);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return exactly 100 entries when count exceeds 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 101, max: 200 }), // number of entries (more than 100)
          fc.uuid(), // pollId
          (numEntries, pollId) => {
            clearLogEntries(pollId);
            
            // Add entries
            for (let i = 0; i < numEntries; i++) {
              const entry = createLogEntry(`user${i}`, `id${i}`, 'ACCEPTED', undefined, 1, 1);
              addLogEntry(pollId, entry);
            }
            
            const retrieved = getLogEntries(pollId);
            
            // Should return exactly 100 entries (the limit)
            expect(retrieved.length).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return min(N, limit) entries for any custom limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }), // number of entries
          fc.integer({ min: 1, max: 150 }), // custom limit
          fc.uuid(), // pollId
          (numEntries, limit, pollId) => {
            clearLogEntries(pollId);
            
            // Add entries
            for (let i = 0; i < numEntries; i++) {
              const entry = createLogEntry(`user${i}`, `id${i}`, 'ACCEPTED', undefined, 1, 1);
              addLogEntry(pollId, entry);
            }
            
            const retrieved = getLogEntries(pollId, limit);
            
            // Should return min(N, limit) entries
            expect(retrieved.length).toBe(Math.min(numEntries, limit));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return the most recent entries when limited', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }), // number of entries
          fc.integer({ min: 1, max: 9 }), // limit (less than entries)
          fc.uuid(), // pollId
          (numEntries, limit, pollId) => {
            clearLogEntries(pollId);
            
            // Add entries with sequential usernames
            for (let i = 0; i < numEntries; i++) {
              const entry = createLogEntry(`user${i}`, `id${i}`, 'ACCEPTED', undefined, 1, 1);
              addLogEntry(pollId, entry);
            }
            
            const retrieved = getLogEntries(pollId, limit);
            
            // Should return the most recent entries (last `limit` entries)
            expect(retrieved.length).toBe(limit);
            // The first retrieved entry should be from the (numEntries - limit) position
            expect(retrieved[0].username).toBe(`user${numEntries - limit}`);
            // The last retrieved entry should be the most recent
            expect(retrieved[limit - 1].username).toBe(`user${numEntries - 1}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vote-moderation, Property 8: Log grouping correctness**
   * 
   * *For any* set of log entries, the sum of counts across all rejection reason groups
   * equals the total number of rejected entries.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 8: Log grouping correctness', () => {
    it('should have sum of grouped counts equal total rejected entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              action: actionArb,
              reason: fc.option(rejectionReasonArb, { nil: undefined }),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (entrySpecs) => {
            // Create log entries from specs
            const entries: ModerationLogEntry[] = entrySpecs.map((spec, i) => 
              createLogEntry(`user${i}`, `id${i}`, spec.action, spec.reason, 1, 1)
            );
            
            const grouped = groupLogByReason(entries);
            
            // Sum of all grouped counts
            const sumOfGroups = Object.values(grouped).reduce((sum, count) => sum + count, 0);
            
            // Count of rejected entries with valid reasons
            const rejectedCount = entries.filter(
              e => e.action === 'REJECTED' && e.reason !== undefined
            ).length;
            
            expect(sumOfGroups).toBe(rejectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly count each rejection reason', () => {
      fc.assert(
        fc.property(
          fc.record({
            accountTooYoung: fc.integer({ min: 0, max: 20 }),
            cooldownActive: fc.integer({ min: 0, max: 20 }),
            voteChangeDisabled: fc.integer({ min: 0, max: 20 }),
            invalidOption: fc.integer({ min: 0, max: 20 }),
            accepted: fc.integer({ min: 0, max: 20 }),
          }),
          (counts) => {
            const entries: ModerationLogEntry[] = [];
            let idx = 0;
            
            // Add entries for each reason
            for (let i = 0; i < counts.accountTooYoung; i++) {
              entries.push(createLogEntry(`user${idx++}`, `id${idx}`, 'REJECTED', 'ACCOUNT_TOO_YOUNG', 1, 1));
            }
            for (let i = 0; i < counts.cooldownActive; i++) {
              entries.push(createLogEntry(`user${idx++}`, `id${idx}`, 'REJECTED', 'COOLDOWN_ACTIVE', 1, 1));
            }
            for (let i = 0; i < counts.voteChangeDisabled; i++) {
              entries.push(createLogEntry(`user${idx++}`, `id${idx}`, 'REJECTED', 'VOTE_CHANGE_DISABLED', 1, 1));
            }
            for (let i = 0; i < counts.invalidOption; i++) {
              entries.push(createLogEntry(`user${idx++}`, `id${idx}`, 'REJECTED', 'INVALID_OPTION', 1, 1));
            }
            // Add some accepted entries (should not be counted)
            for (let i = 0; i < counts.accepted; i++) {
              entries.push(createLogEntry(`user${idx++}`, `id${idx}`, 'ACCEPTED', undefined, 1, 1));
            }
            
            const grouped = groupLogByReason(entries);
            
            expect(grouped.ACCOUNT_TOO_YOUNG).toBe(counts.accountTooYoung);
            expect(grouped.COOLDOWN_ACTIVE).toBe(counts.cooldownActive);
            expect(grouped.VOTE_CHANGE_DISABLED).toBe(counts.voteChangeDisabled);
            expect(grouped.INVALID_OPTION).toBe(counts.invalidOption);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero counts for empty entries', () => {
      const grouped = groupLogByReason([]);
      
      expect(grouped.ACCOUNT_TOO_YOUNG).toBe(0);
      expect(grouped.COOLDOWN_ACTIVE).toBe(0);
      expect(grouped.VOTE_CHANGE_DISABLED).toBe(0);
      expect(grouped.INVALID_OPTION).toBe(0);
    });

    it('should not count ACCEPTED or VOTE_CHANGED entries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // number of non-rejected entries
          (numEntries) => {
            const entries: ModerationLogEntry[] = [];
            
            // Add only ACCEPTED and VOTE_CHANGED entries
            for (let i = 0; i < numEntries; i++) {
              const action = i % 2 === 0 ? 'ACCEPTED' : 'VOTE_CHANGED';
              entries.push(createLogEntry(`user${i}`, `id${i}`, action, undefined, 1, 1));
            }
            
            const grouped = groupLogByReason(entries);
            const sumOfGroups = Object.values(grouped).reduce((sum, count) => sum + count, 0);
            
            // No entries should be counted
            expect(sumOfGroups).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
