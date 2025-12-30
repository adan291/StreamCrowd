/**
 * Property-based tests for TwitchPredictionService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch Prediction service, specifically the state machine transitions.
 * 
 * Feature: twitch-tools-implementation
 * @requirements 1.4, 2.3, 2.4, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  TwitchPredictionService,
  isTwitchPredictionError,
  isValidTransition,
  VALID_TRANSITIONS,
} from '../../src/application/services/TwitchPredictionService';
import type { PredictionStatus, TwitchPrediction, TwitchOutcome } from '../../types/twitch';

// ============ ARBITRARIES ============

// Generate valid prediction statuses
const predictionStatusArb = fc.constantFrom('ACTIVE', 'LOCKED', 'RESOLVED', 'CANCELED') as fc.Arbitrary<PredictionStatus>;

// Generate valid user IDs (numeric strings)
const userIdArb = fc.integer({ min: 1, max: 999999999 }).map(String);

// Generate valid Twitch usernames
const usernameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// Generate valid ISO date strings
const isoDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date() })
  .map(d => d.toISOString());

// Generate outcome colors
const outcomeColorArb = fc.constantFrom('BLUE', 'PINK') as fc.Arbitrary<'BLUE' | 'PINK'>;

// Generate a mock outcome
const outcomeArb: fc.Arbitrary<TwitchOutcome> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 25 }),
  users: fc.integer({ min: 0, max: 10000 }),
  channel_points: fc.integer({ min: 0, max: 10000000 }),
  top_predictors: fc.constant(null),
  color: outcomeColorArb,
});

// Generate a mock prediction
const predictionArb: fc.Arbitrary<TwitchPrediction> = fc.record({
  id: fc.uuid(),
  broadcaster_id: userIdArb,
  broadcaster_name: usernameArb,
  broadcaster_login: usernameArb,
  title: fc.string({ minLength: 1, maxLength: 45 }),
  winning_outcome_id: fc.constant(null),
  outcomes: fc.array(outcomeArb, { minLength: 2, maxLength: 10 }),
  prediction_window: fc.integer({ min: 30, max: 1800 }),
  status: predictionStatusArb,
  created_at: isoDateArb,
  ended_at: fc.constant(null),
  locked_at: fc.constant(null),
});

// Generate HTTP status codes for errors
const httpErrorStatusArb = fc.oneof(
  fc.constant(401),
  fc.constant(403),
  fc.constant(404),
  fc.constant(429),
  fc.constant(500),
  fc.constant(503)
);

// ============ TESTS ============

describe('TwitchPredictionService Property Tests', () => {
  let service: TwitchPredictionService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Property 2: Prediction State Machine', () => {
    /**
     * Feature: twitch-tools-implementation, Property 2: Prediction State Machine
     * 
     * For any prediction, the status transitions SHALL follow:
     * ACTIVE → LOCKED → RESOLVED|CANCELED, or ACTIVE → RESOLVED|CANCELED.
     * No other transitions are valid.
     * 
     * **Validates: Requirements 1.4, 2.3, 2.4, 2.5**
     */

    it('should allow valid transitions from ACTIVE state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('LOCKED', 'RESOLVED', 'CANCELED') as fc.Arbitrary<PredictionStatus>,
          (targetStatus) => {
            const isValid = isValidTransition('ACTIVE', targetStatus);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow valid transitions from LOCKED state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('RESOLVED', 'CANCELED') as fc.Arbitrary<PredictionStatus>,
          (targetStatus) => {
            const isValid = isValidTransition('LOCKED', targetStatus);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow transitions from terminal states (RESOLVED, CANCELED)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('RESOLVED', 'CANCELED') as fc.Arbitrary<PredictionStatus>,
          predictionStatusArb,
          (terminalState, targetStatus) => {
            const isValid = isValidTransition(terminalState, targetStatus);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow invalid transitions from ACTIVE state', () => {
      // ACTIVE cannot go back to ACTIVE
      const isValid = isValidTransition('ACTIVE', 'ACTIVE');
      expect(isValid).toBe(false);
    });

    it('should not allow invalid transitions from LOCKED state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ACTIVE', 'LOCKED') as fc.Arbitrary<PredictionStatus>,
          (targetStatus) => {
            const isValid = isValidTransition('LOCKED', targetStatus);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct valid transitions defined for all states', () => {
      // Verify the VALID_TRANSITIONS constant matches the expected state machine
      expect(VALID_TRANSITIONS['ACTIVE']).toEqual(['LOCKED', 'RESOLVED', 'CANCELED']);
      expect(VALID_TRANSITIONS['LOCKED']).toEqual(['RESOLVED', 'CANCELED']);
      expect(VALID_TRANSITIONS['RESOLVED']).toEqual([]);
      expect(VALID_TRANSITIONS['CANCELED']).toEqual([]);
    });

    it('should validate all possible state pairs correctly', () => {
      fc.assert(
        fc.property(
          predictionStatusArb,
          predictionStatusArb,
          (fromStatus, toStatus) => {
            const isValid = isValidTransition(fromStatus, toStatus);
            const expectedValid = VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
            expect(isValid).toBe(expectedValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2b: Prediction API State Transitions', () => {
    /**
     * Feature: twitch-tools-implementation, Property 2b: Prediction API State Transitions
     * 
     * For any prediction action (lock, resolve, cancel), the service SHALL call
     * the correct API endpoint and handle the response appropriately.
     * 
     * **Validates: Requirements 2.3, 2.4, 2.5**
     */

    it('should require winning_outcome_id when resolving a prediction', async () => {
      // Calling endPrediction with RESOLVED but no winning_outcome_id should return error
      const result = await service.endPrediction({
        broadcaster_id: '123456',
        id: 'pred-123',
        status: 'RESOLVED',
        // No winning_outcome_id
      });

      expect(isTwitchPredictionError(result)).toBe(true);
      if (isTwitchPredictionError(result)) {
        expect(result.code).toBe('missing_winning_outcome');
      }
    });

    it('should not require winning_outcome_id for LOCKED or CANCELED status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('LOCKED', 'CANCELED') as fc.Arbitrary<'LOCKED' | 'CANCELED'>,
          predictionArb,
          async (status, mockPrediction) => {
            const responsePrediction = { ...mockPrediction, status };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responsePrediction] }),
            });

            const result = await service.endPrediction({
              broadcaster_id: mockPrediction.broadcaster_id,
              id: mockPrediction.id,
              status,
            });

            // Should succeed without winning_outcome_id
            expect(isTwitchPredictionError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept winning_outcome_id when resolving a prediction', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb.filter(p => p.outcomes.length >= 2),
          async (mockPrediction) => {
            const winningOutcomeId = mockPrediction.outcomes[0].id;
            const responsePrediction = {
              ...mockPrediction,
              status: 'RESOLVED' as const,
              winning_outcome_id: winningOutcomeId,
            };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responsePrediction] }),
            });

            const result = await service.resolvePrediction(
              mockPrediction.broadcaster_id,
              mockPrediction.id,
              winningOutcomeId
            );

            expect(isTwitchPredictionError(result)).toBe(false);
            if (!isTwitchPredictionError(result)) {
              expect(result.status).toBe('RESOLVED');
              expect(result.winning_outcome_id).toBe(winningOutcomeId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API method for lock operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb,
          async (mockPrediction) => {
            const responsePrediction = { ...mockPrediction, status: 'LOCKED' as const };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responsePrediction] }),
            });

            await service.lockPrediction(mockPrediction.broadcaster_id, mockPrediction.id);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/predictions'),
              expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining('"status":"LOCKED"'),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API method for cancel operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb,
          async (mockPrediction) => {
            const responsePrediction = { ...mockPrediction, status: 'CANCELED' as const };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responsePrediction] }),
            });

            await service.cancelPrediction(mockPrediction.broadcaster_id, mockPrediction.id);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/predictions'),
              expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining('"status":"CANCELED"'),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2c: Error Handling', () => {
    /**
     * Feature: twitch-tools-implementation, Property 2c: Error Handling
     * 
     * For any HTTP error status code, the TwitchPredictionService SHALL return
     * a TwitchPredictionError with valid code, message, solution, and retryable flag.
     * 
     * **Validates: Requirements 8.2, 8.4**
     */

    it('should return structured errors for all HTTP error codes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.option(fc.string(), { nil: undefined }),
          (status, errorBody) => {
            const error = service.parseError(status, errorBody);

            // Error should have all required fields
            expect(error).toHaveProperty('code');
            expect(error).toHaveProperty('status');
            expect(error).toHaveProperty('message');
            expect(error).toHaveProperty('solution');
            expect(error).toHaveProperty('retryable');

            // Status should match input
            expect(error.status).toBe(status);

            // Code should be a non-empty string
            expect(typeof error.code).toBe('string');
            expect(error.code.length).toBeGreaterThan(0);

            // Message should be a non-empty string
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);

            // Solution should be a non-empty string
            expect(typeof error.solution).toBe('string');
            expect(error.solution.length).toBeGreaterThan(0);

            // Retryable should be boolean
            expect(typeof error.retryable).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark rate limit errors as retryable', () => {
      const error = service.parseError(429);
      expect(error.code).toBe('rate_limit');
      expect(error.retryable).toBe(true);
    });

    it('should mark server errors as retryable', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 599 }),
          (status) => {
            const error = service.parseError(status);
            expect(error.retryable).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark client errors as non-retryable', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 428 }), // Exclude 429 (rate limit)
          (status) => {
            const error = service.parseError(status);
            expect(error.retryable).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return errors from API methods on HTTP failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          httpErrorStatusArb,
          async (status) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status,
              text: () => Promise.resolve('Error'),
            });

            const result = await service.getPredictions('123456');

            expect(isTwitchPredictionError(result)).toBe(true);
            if (isTwitchPredictionError(result)) {
              expect(result.status).toBe(status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
