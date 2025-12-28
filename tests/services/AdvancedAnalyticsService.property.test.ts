/**
 * Property-based tests for AdvancedAnalyticsService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the advanced analytics system.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.6, 3.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AdvancedAnalyticsService } from '../../src/application/services/AdvancedAnalyticsService';
import { LocalStorageAnalyticsAdapter } from '../../src/infrastructure/adapters/LocalStorageAnalyticsAdapter';
import type { StreamSession, TimelinePoint } from '../../src/domain/ports/IAdvancedAnalyticsPort';

// ============ ARBITRARIES ============

const timelinePointArb: fc.Arbitrary<TimelinePoint> = fc.record({
  timestamp: fc.integer({ min: 1700000000000, max: 1800000000000 }),
  viewers: fc.integer({ min: 0, max: 100000 }),
  messages: fc.integer({ min: 0, max: 1000 }),
  events: fc.array(fc.constantFrom('follow', 'sub', 'raid', 'bits'), { maxLength: 5 })
});

const streamSessionArb: fc.Arbitrary<StreamSession> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
  startTime: fc.integer({ min: 1700000000000, max: 1800000000000 }),
  endTime: fc.option(fc.integer({ min: 1700000000000, max: 1800000000000 }), { nil: undefined }),
  peakViewers: fc.integer({ min: 0, max: 100000 }),
  averageViewers: fc.integer({ min: 0, max: 100000 }),
  totalMessages: fc.integer({ min: 0, max: 100000 }),
  uniqueChatters: fc.integer({ min: 0, max: 10000 }),
  newFollowers: fc.integer({ min: 0, max: 1000 }),
  newSubs: fc.integer({ min: 0, max: 500 }),
  bitsReceived: fc.integer({ min: 0, max: 1000000 }),
  timeline: fc.array(timelinePointArb, { minLength: 0, maxLength: 20 })
}).filter(s => {
  // Ensure endTime > startTime if endTime exists
  if (s.endTime !== undefined) {
    return s.endTime >= s.startTime;
  }
  return true;
});

// ============ TESTS ============

describe('AdvancedAnalyticsService Property Tests', () => {
  let originalLocalStorage: Storage;
  let storage: Map<string, string>;

  beforeEach(() => {
    // Mock localStorage
    storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Property 10: Session Persistence Round-Trip', () => {
    /**
     * For any completed StreamSession, ending the session and then retrieving 
     * history SHALL include that session with equivalent data.
     * 
     * **Property 10: Session Persistence Round-Trip**
     * **Validates: Requirements 3.2, 3.3**
     */
    it('should persist and retrieve sessions with equivalent data', () => {
      fc.assert(
        fc.property(
          streamSessionArb,
          (session) => {
            // Create fresh adapter and service for each test
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Save the session
            adapter.saveSession(session);

            // Retrieve the session
            const retrieved = adapter.getSession(session.id);

            // Verify equivalence
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(session.id);
            expect(retrieved!.startTime).toBe(session.startTime);
            expect(retrieved!.endTime).toBe(session.endTime);
            expect(retrieved!.peakViewers).toBe(session.peakViewers);
            expect(retrieved!.averageViewers).toBe(session.averageViewers);
            expect(retrieved!.totalMessages).toBe(session.totalMessages);
            expect(retrieved!.uniqueChatters).toBe(session.uniqueChatters);
            expect(retrieved!.newFollowers).toBe(session.newFollowers);
            expect(retrieved!.newSubs).toBe(session.newSubs);
            expect(retrieved!.bitsReceived).toBe(session.bitsReceived);
            expect(retrieved!.timeline.length).toBe(session.timeline.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include saved session in history', () => {
      fc.assert(
        fc.property(
          streamSessionArb,
          (session) => {
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Save the session
            adapter.saveSession(session);

            // Get history
            const history = service.getSessionHistory();

            // Verify session is in history
            const found = history.find(s => s.id === session.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(session.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Metrics Consistency', () => {
    /**
     * For any session, peakViewers SHALL be >= averageViewers, 
     * and uniqueChatters SHALL be <= totalMessages.
     * 
     * **Property 11: Metrics Consistency**
     * **Validates: Requirements 3.1**
     */
    it('should maintain metrics invariants during session', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 50 }),
          fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 100 }),
          (viewerCounts, usernames) => {
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Start session
            service.startSession();

            // Update viewer counts
            viewerCounts.forEach(count => {
              service.updateViewerCount(count);
            });

            // Record messages
            usernames.forEach(username => {
              service.recordMessage(username);
            });

            // End session
            const session = service.endSession();

            // Verify invariants
            expect(session).not.toBeNull();
            expect(session!.peakViewers).toBeGreaterThanOrEqual(session!.averageViewers);
            expect(session!.uniqueChatters).toBeLessThanOrEqual(session!.totalMessages);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: CSV Export Completeness', () => {
    /**
     * For any session, the exported CSV SHALL contain all required fields:
     * id, startTime, endTime, peakViewers, averageViewers, totalMessages, uniqueChatters.
     * 
     * **Property 12: CSV Export Completeness**
     * **Validates: Requirements 3.6**
     */
    it('should export CSV with all required fields', () => {
      fc.assert(
        fc.property(
          streamSessionArb,
          (session) => {
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Save the session
            adapter.saveSession(session);

            // Export to CSV
            const csv = service.exportToCSV(session.id);

            // Verify CSV contains required fields
            expect(csv).toContain('id');
            expect(csv).toContain('startTime');
            expect(csv).toContain('endTime');
            expect(csv).toContain('peakViewers');
            expect(csv).toContain('averageViewers');
            expect(csv).toContain('totalMessages');
            expect(csv).toContain('uniqueChatters');

            // Verify CSV contains session data
            expect(csv).toContain(session.id);
            expect(csv).toContain(String(session.startTime));
            expect(csv).toContain(String(session.peakViewers));
            expect(csv).toContain(String(session.averageViewers));
            expect(csv).toContain(String(session.totalMessages));
            expect(csv).toContain(String(session.uniqueChatters));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export all sessions to CSV', () => {
      fc.assert(
        fc.property(
          fc.array(streamSessionArb, { minLength: 1, maxLength: 5 }),
          (sessions) => {
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Save all sessions
            sessions.forEach(session => {
              adapter.saveSession(session);
            });

            // Export all to CSV
            const csv = service.exportAllToCSV();

            // Verify headers
            expect(csv).toContain('id');
            expect(csv).toContain('startTime');

            // Verify each session is in the CSV
            sessions.forEach(session => {
              expect(csv).toContain(session.id);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 13: Retention Calculation Bounds', () => {
    /**
     * For any session with timeline data, the retention percentage 
     * SHALL be between 0 and 100 inclusive.
     * 
     * **Property 13: Retention Calculation Bounds**
     * **Validates: Requirements 3.7**
     */
    it('should calculate retention within valid bounds', () => {
      fc.assert(
        fc.property(
          streamSessionArb,
          (session) => {
            storage.clear();
            const adapter = new LocalStorageAnalyticsAdapter();
            const service = new AdvancedAnalyticsService(adapter);

            // Calculate retention
            const retention = service.calculateRetention(session);

            // Verify bounds
            expect(retention).toBeGreaterThanOrEqual(0);
            expect(retention).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
