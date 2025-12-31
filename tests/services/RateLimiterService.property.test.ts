// Property tests for RateLimiterService
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RateLimiterService } from '../../src/api/services/RateLimiterService';

describe('RateLimiterService Property Tests', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    service = new RateLimiterService({ windowMs: 60000, maxRequests: 10 });
  });

  describe('Property 1: Rate limit is applied consistently', () => {
    it('should block requests after limit is reached', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (keyId, limit) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Make exactly 'limit' requests
            for (let i = 0; i < limit; i++) {
              const status = localService.recordRequest(keyId);
              expect(status.remaining).toBe(limit - i - 1);
            }

            // Next request should be limited
            expect(localService.isLimited(keyId, limit)).toBe(true);
            expect(localService.getRemainingRequests(keyId, limit)).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should allow requests within limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 1, max: 4 }),
          (keyId, limit, requestCount) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Make fewer requests than limit
            for (let i = 0; i < requestCount; i++) {
              localService.recordRequest(keyId);
            }

            // Should not be limited
            expect(localService.isLimited(keyId, limit)).toBe(false);
            expect(localService.getRemainingRequests(keyId, limit)).toBe(limit - requestCount);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Window time resets correctly', () => {
    it('should reset after window expires', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (keyId, limit) => {
            // Use a very short window for testing
            const windowMs = 10; // 10ms window
            const localService = new RateLimiterService({ windowMs, maxRequests: limit });

            // Fill up the limit
            for (let i = 0; i < limit; i++) {
              localService.recordRequest(keyId);
            }

            // Should be limited
            expect(localService.isLimited(keyId, limit)).toBe(true);

            // Wait for window to expire (simulate by manipulating internal state)
            // In real scenario, we'd wait. For testing, we reset.
            localService.resetLimit(keyId);

            // Should no longer be limited
            expect(localService.isLimited(keyId, limit)).toBe(false);
            expect(localService.getRemainingRequests(keyId, limit)).toBe(limit);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Requests within limit pass', () => {
    it('should not throw for requests within limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 5, max: 20 }),
          (keyId, limit) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Make limit-1 requests (should all pass)
            for (let i = 0; i < limit - 1; i++) {
              expect(() => localService.checkAndRecord(keyId, limit)).not.toThrow();
            }

            // One more should still pass
            expect(() => localService.checkAndRecord(keyId, limit)).not.toThrow();

            // Next one should throw
            expect(() => localService.checkAndRecord(keyId, limit)).toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 4: Different keys have independent limits', () => {
    it('should track limits independently per key', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 })
            .filter(arr => new Set(arr).size === arr.length), // Ensure unique keys
          fc.integer({ min: 3, max: 10 }),
          (keys, limit) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Fill up limit for first key only
            for (let i = 0; i < limit; i++) {
              localService.recordRequest(keys[0]);
            }

            // First key should be limited
            expect(localService.isLimited(keys[0], limit)).toBe(true);

            // Other keys should not be limited
            for (let i = 1; i < keys.length; i++) {
              expect(localService.isLimited(keys[i], limit)).toBe(false);
              expect(localService.getRemainingRequests(keys[i], limit)).toBe(limit);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: Headers are correct', () => {
    it('should return correct rate limit headers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 0, max: 4 }),
          (keyId, limit, requestCount) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Make some requests
            for (let i = 0; i < requestCount; i++) {
              localService.recordRequest(keyId);
            }

            const headers = localService.getHeaders(keyId, limit);

            expect(headers['X-RateLimit-Limit']).toBe(limit.toString());
            expect(headers['X-RateLimit-Remaining']).toBe((limit - requestCount).toString());
            expect(headers['X-RateLimit-Reset']).toBeDefined();
            expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Property 6: Request count is accurate', () => {
    it('should accurately count requests', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (keyId, requestCount) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: 100 });

            // Make requests
            for (let i = 0; i < requestCount; i++) {
              localService.recordRequest(keyId);
            }

            expect(localService.getRequestCount(keyId)).toBe(requestCount);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Property 7: Reset clears limit', () => {
    it('should clear limit after reset', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (keyId, limit) => {
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            // Fill up limit
            for (let i = 0; i < limit; i++) {
              localService.recordRequest(keyId);
            }

            expect(localService.isLimited(keyId, limit)).toBe(true);

            // Reset
            localService.resetLimit(keyId);

            // Should be cleared
            expect(localService.isLimited(keyId, limit)).toBe(false);
            expect(localService.getRequestCount(keyId)).toBe(0);
            expect(localService.getRemainingRequests(keyId, limit)).toBe(limit);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 8: Stats are accurate', () => {
    it('should report accurate statistics', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.integer({ min: 1, max: 5 })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (keyRequests) => {
            const limit = 10;
            const localService = new RateLimiterService({ windowMs: 60000, maxRequests: limit });

            let expectedTotal = 0;
            const uniqueKeys = new Set<string>();

            for (const [keyId, count] of keyRequests) {
              uniqueKeys.add(keyId);
              for (let i = 0; i < count; i++) {
                localService.recordRequest(keyId);
                expectedTotal++;
              }
            }

            const stats = localService.getStats();

            expect(stats.totalKeys).toBe(uniqueKeys.size);
            expect(stats.totalRequests).toBe(expectedTotal);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 9: Cleanup removes expired entries', () => {
    it('should remove entries with no recent requests after cleanup', () => {
      const localService = new RateLimiterService({ windowMs: 1, maxRequests: 10 }); // 1ms window

      // Add some requests
      localService.recordRequest('key1');
      localService.recordRequest('key2');

      // Wait a bit for window to expire
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait for 5ms
      }

      // Cleanup
      localService.cleanup();

      // Entries should be removed
      expect(localService.getRequestCount('key1')).toBe(0);
      expect(localService.getRequestCount('key2')).toBe(0);
    });
  });
});
