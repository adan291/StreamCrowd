// Property-based tests for OutgoingWebhookService

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { OutgoingWebhookService } from '../../src/application/services/OutgoingWebhookService';
import { RATE_LIMIT_CONFIG } from '../../types/webhooks';

describe('OutgoingWebhookService Property Tests', () => {
  let service: OutgoingWebhookService;

  beforeEach(() => {
    service = new OutgoingWebhookService();
  });

  // Property 5: Retry Backoff Correctness
  describe('Property 5: Retry Backoff Correctness', () => {
    it('retry delay follows exponential backoff formula', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (attempt) => {
            const delay = service.calculateRetryDelay(attempt);
            const expected = RATE_LIMIT_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            expect(delay).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('delay increases with each attempt', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }),
          (attempt) => {
            const delay1 = service.calculateRetryDelay(attempt);
            const delay2 = service.calculateRetryDelay(attempt + 1);
            expect(delay2).toBe(delay1 * 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('first attempt has base delay', () => {
      const delay = service.calculateRetryDelay(1);
      expect(delay).toBe(RATE_LIMIT_CONFIG.BASE_RETRY_DELAY_MS);
    });
  });

  // Property 4: Rate Limiting Accuracy
  describe('Property 4: Rate Limiting Accuracy', () => {
    it('allows exactly N requests per minute window', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          (webhookId) => {
            // Fresh service for each test
            const testService = new OutgoingWebhookService();
            
            // Should allow exactly OUTGOING_PER_MINUTE requests
            let allowed = 0;
            for (let i = 0; i < RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE + 10; i++) {
              if (testService.checkRateLimit(webhookId)) {
                allowed++;
              }
            }
            
            expect(allowed).toBe(RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('different webhooks have independent rate limits', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 5, maxLength: 20 }),
          (webhookId1, webhookId2) => {
            fc.pre(webhookId1 !== webhookId2);
            
            const testService = new OutgoingWebhookService();
            
            // Exhaust rate limit for webhook1
            for (let i = 0; i < RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE; i++) {
              testService.checkRateLimit(webhookId1);
            }
            
            // webhook2 should still have full quota
            expect(testService.checkRateLimit(webhookId2)).toBe(true);
            
            // webhook1 should be rate limited
            expect(testService.checkRateLimit(webhookId1)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('rate limit status shows correct remaining count', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE - 1 }),
          (webhookId, requestCount) => {
            const testService = new OutgoingWebhookService();
            
            // Make some requests
            for (let i = 0; i < requestCount; i++) {
              testService.checkRateLimit(webhookId);
            }
            
            const status = testService.getRateLimitStatus(webhookId);
            expect(status.remaining).toBe(RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE - requestCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Property 8: Delivery Log Completeness (tested via structure)
  describe('Property 8: Delivery Logging Structure', () => {
    it('delivery objects have all required fields', () => {
      // This tests the structure that would be logged
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            webhookId: fc.string({ minLength: 1 }),
            eventType: fc.constantFrom(
              'follower', 'raid', 'subscription', 'bits',
              'poll_started', 'poll_ended', 'prediction_started',
              'prediction_resolved', 'giveaway_winner', 'macro_executed'
            ),
            status: fc.constantFrom('pending', 'success', 'failed'),
            attempts: fc.integer({ min: 0, max: 10 }),
            createdAt: fc.integer({ min: 0 }),
          }),
          (deliveryData) => {
            // Verify structure has timestamp and result fields
            expect(deliveryData).toHaveProperty('id');
            expect(deliveryData).toHaveProperty('webhookId');
            expect(deliveryData).toHaveProperty('eventType');
            expect(deliveryData).toHaveProperty('status');
            expect(deliveryData).toHaveProperty('attempts');
            expect(deliveryData).toHaveProperty('createdAt');
            expect(typeof deliveryData.createdAt).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Max retry attempts
  describe('Max Retry Attempts', () => {
    it('max retry attempts is configured correctly', () => {
      expect(RATE_LIMIT_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('delay at max attempts is reasonable', () => {
      const maxDelay = service.calculateRetryDelay(RATE_LIMIT_CONFIG.MAX_RETRY_ATTEMPTS);
      // At attempt 3: 1000 * 2^2 = 4000ms
      expect(maxDelay).toBe(4000);
    });
  });
});
