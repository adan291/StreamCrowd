// Property-based tests for WebhookSignatureService

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WebhookSignatureService } from '../../src/application/services/WebhookSignatureService';
import { SIGNATURE_CONFIG } from '../../types/webhooks';

describe('WebhookSignatureService Property Tests', () => {
  let service: WebhookSignatureService;

  beforeEach(() => {
    service = new WebhookSignatureService();
  });

  // Property 1: Signature Round-Trip
  describe('Property 1: Signature Round-Trip', () => {
    it('sign followed by verify always returns true for valid timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10000 }),
          fc.string({ minLength: 32, maxLength: 64 }),
          async (payload, secret) => {
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = await service.sign(payload, secret, timestamp);
            const isValid = await service.verify(payload, signature, secret, timestamp);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verify returns false for tampered payload', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (payload, secret, tamper) => {
            fc.pre(tamper !== '' && payload !== payload + tamper);
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = await service.sign(payload, secret, timestamp);
            const isValid = await service.verify(payload + tamper, signature, secret, timestamp);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verify returns false for wrong secret', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.string({ minLength: 32, maxLength: 64 }),
          async (payload, secret1, secret2) => {
            fc.pre(secret1 !== secret2);
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = await service.sign(payload, secret1, timestamp);
            const isValid = await service.verify(payload, signature, secret2, timestamp);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: Secret Uniqueness
  describe('Property 2: Secret Uniqueness', () => {
    it('generateSecret produces unique values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          (count) => {
            const secrets = new Set<string>();
            for (let i = 0; i < count; i++) {
              secrets.add(service.generateSecret());
            }
            // All secrets should be unique
            expect(secrets.size).toBe(count);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('generateSecret produces 64-character hex strings', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const secret = service.generateSecret();
            expect(secret).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 7: Timestamp Tolerance
  describe('Property 7: Timestamp Tolerance', () => {
    it('signatures within tolerance window are valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.integer({ min: 0, max: SIGNATURE_CONFIG.TOLERANCE_SECONDS - 1 }),
          async (payload, offsetSeconds) => {
            const secret = service.generateSecret();
            const timestamp = Math.floor(Date.now() / 1000) - offsetSeconds;
            const signature = await service.sign(payload, secret, timestamp);
            const isValid = await service.verify(payload, signature, secret, timestamp);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('signatures outside tolerance window are rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.integer({ min: SIGNATURE_CONFIG.TOLERANCE_SECONDS + 1, max: SIGNATURE_CONFIG.TOLERANCE_SECONDS + 3600 }),
          async (payload, offsetSeconds) => {
            const secret = service.generateSecret();
            const timestamp = Math.floor(Date.now() / 1000) - offsetSeconds;
            const signature = await service.sign(payload, secret, timestamp);
            const isValid = await service.verify(payload, signature, secret, timestamp);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('future timestamps outside tolerance are rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.integer({ min: SIGNATURE_CONFIG.TOLERANCE_SECONDS + 1, max: SIGNATURE_CONFIG.TOLERANCE_SECONDS + 3600 }),
          async (payload, offsetSeconds) => {
            const secret = service.generateSecret();
            const timestamp = Math.floor(Date.now() / 1000) + offsetSeconds;
            const signature = await service.sign(payload, secret, timestamp);
            const isValid = await service.verify(payload, signature, secret, timestamp);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Signature format
  describe('Signature Format', () => {
    it('signature has correct format sha256=<hex>', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (payload) => {
            const secret = service.generateSecret();
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = await service.sign(payload, secret, timestamp);
            expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Headers creation
  describe('Headers Creation', () => {
    it('createHeaders includes all required headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (payload) => {
            const secret = service.generateSecret();
            const headers = await service.createHeaders(payload, secret);
            
            expect(headers).toHaveProperty(SIGNATURE_CONFIG.HEADER_SIGNATURE);
            expect(headers).toHaveProperty(SIGNATURE_CONFIG.HEADER_TIMESTAMP);
            expect(headers).toHaveProperty(SIGNATURE_CONFIG.HEADER_API_VERSION);
            expect(headers).toHaveProperty('Content-Type', 'application/json');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
