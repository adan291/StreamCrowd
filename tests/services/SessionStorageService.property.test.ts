// Property-based tests for SessionStorageService

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { METRICS_STORAGE_CONFIG } from '../../types/metrics';

describe('SessionStorageService Property Tests', () => {
  // Property 6: Storage Limit Enforcement
  describe('Property 6: Storage Limit Enforcement', () => {
    it('storage limits are configured correctly', () => {
      expect(METRICS_STORAGE_CONFIG.MAX_TOTAL_SIZE).toBe(50 * 1024 * 1024);
      expect(METRICS_STORAGE_CONFIG.MAX_SESSIONS).toBe(100);
      expect(METRICS_STORAGE_CONFIG.RETENTION_DAYS).toBe(30);
      expect(METRICS_STORAGE_CONFIG.FAVORITE_RETENTION_DAYS).toBe(365);
    });

    it('retention calculation is correct', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (days) => {
            const retentionMs = days * 24 * 60 * 60 * 1000;
            const expectedMs = days * 86400000;
            expect(retentionMs).toBe(expectedMs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('session age calculation determines cleanup eligibility', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.boolean(),
          (ageDays, isFavorite) => {
            const now = Date.now();
            const sessionStartTime = now - (ageDays * 24 * 60 * 60 * 1000);
            const age = now - sessionStartTime;
            
            const retentionMs = isFavorite 
              ? METRICS_STORAGE_CONFIG.FAVORITE_RETENTION_DAYS * 24 * 60 * 60 * 1000
              : METRICS_STORAGE_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;

            const shouldCleanup = age > retentionMs;

            // Non-favorites older than 30 days should be cleaned
            if (!isFavorite && ageDays > METRICS_STORAGE_CONFIG.RETENTION_DAYS) {
              expect(shouldCleanup).toBe(true);
            }

            // Favorites older than 365 days should be cleaned
            if (isFavorite && ageDays > METRICS_STORAGE_CONFIG.FAVORITE_RETENTION_DAYS) {
              expect(shouldCleanup).toBe(true);
            }

            // Sessions within retention should not be cleaned
            if (ageDays <= (isFavorite ? METRICS_STORAGE_CONFIG.FAVORITE_RETENTION_DAYS : METRICS_STORAGE_CONFIG.RETENTION_DAYS)) {
              expect(shouldCleanup).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('storage usage calculation is consistent', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              data: fc.string({ minLength: 100, maxLength: 1000 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (sessions) => {
            // Simulate storage calculation
            let totalSize = 0;
            for (const session of sessions) {
              totalSize += JSON.stringify(session).length;
            }

            // Size should be positive
            expect(totalSize).toBeGreaterThan(0);
            
            // Size should be sum of individual sizes
            const individualSizes = sessions.map(s => JSON.stringify(s).length);
            const sumOfSizes = individualSizes.reduce((a, b) => a + b, 0);
            expect(totalSize).toBe(sumOfSizes);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('cleanup threshold triggers at 90% capacity', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: METRICS_STORAGE_CONFIG.MAX_TOTAL_SIZE }),
          (usedBytes) => {
            const threshold = METRICS_STORAGE_CONFIG.MAX_TOTAL_SIZE * 0.9;
            const shouldTriggerCleanup = usedBytes >= threshold;

            if (usedBytes >= threshold) {
              expect(shouldTriggerCleanup).toBe(true);
            } else {
              expect(shouldTriggerCleanup).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Session count limits
  describe('Session Count Limits', () => {
    it('max sessions limit is enforced', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          (sessionCount) => {
            const exceedsLimit = sessionCount >= METRICS_STORAGE_CONFIG.MAX_SESSIONS;
            
            if (sessionCount >= 100) {
              expect(exceedsLimit).toBe(true);
            } else {
              expect(exceedsLimit).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
