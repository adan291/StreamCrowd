/**
 * Property-based tests for usePredictions hook
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch Predictions hook API integration.
 * 
 * Feature: twitch-tools-implementation
 * Property 3: Prediction API Integration
 * 
 * @requirements 1.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { 
  TwitchPrediction, 
  TwitchOutcome, 
  PredictionStatus,
  PredictionFormData,
} from '../../types/twitch';

// ============ MOCK SETUP ============

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock OBS Service
vi.mock('../../src/application/services/OBSService', () => ({
  getOBSService: () => ({
    executeTrigger: vi.fn().mockResolvedValue(true),
    isConnected: () => false,
  }),
}));

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
  title: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
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
  title: fc.string({ minLength: 1, maxLength: 45 }).filter(s => s.trim().length > 0),
  winning_outcome_id: fc.constant(null),
  outcomes: fc.array(outcomeArb, { minLength: 2, maxLength: 10 }),
  prediction_window: fc.integer({ min: 30, max: 1800 }),
  status: predictionStatusArb,
  created_at: isoDateArb,
  ended_at: fc.constant(null),
  locked_at: fc.constant(null),
});

// Generate valid prediction form data
const predictionFormDataArb: fc.Arbitrary<PredictionFormData> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 45 }).filter(s => s.trim().length > 0),
  outcomes: fc.array(
    fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
    { minLength: 2, maxLength: 10 }
  ),
  duration: fc.integer({ min: 30, max: 1800 }),
});

// ============ TESTS ============

describe('usePredictions Property Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Property 3: Prediction API Integration', () => {
    /**
     * Feature: twitch-tools-implementation, Property 3: Prediction API Integration
     * 
     * For any prediction action (create, lock, resolve, cancel), the system SHALL call
     * the correct Twitch API endpoint with valid parameters and handle the response appropriately.
     * 
     * **Validates: Requirements 1.2, 2.3, 2.4, 2.5**
     */

    it('should call create endpoint with correct parameters for any valid form data', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionFormDataArb,
          userIdArb,
          async (formData, broadcasterId) => {
            const mockPrediction: TwitchPrediction = {
              id: 'pred-123',
              broadcaster_id: broadcasterId,
              broadcaster_name: 'testuser',
              broadcaster_login: 'testuser',
              title: formData.title,
              winning_outcome_id: null,
              outcomes: formData.outcomes.map((title, i) => ({
                id: `outcome-${i}`,
                title,
                users: 0,
                channel_points: 0,
                top_predictors: null,
                color: i === 0 ? 'BLUE' : 'PINK',
              })),
              prediction_window: formData.duration,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              ended_at: null,
              locked_at: null,
            };

            let capturedBody: string | null = null;
            global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
              if (options?.method === 'POST') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [mockPrediction] }),
              };
            });

            // Import and use the service directly to test API calls
            const { TwitchPredictionService } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            await service.createPrediction({
              broadcaster_id: broadcasterId,
              title: formData.title,
              outcomes: formData.outcomes.map(title => ({ title })),
              prediction_window: formData.duration,
            });

            // Verify fetch was called
            expect(global.fetch).toHaveBeenCalled();
            
            // Verify the body contains correct data
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.broadcaster_id).toBe(broadcasterId);
            expect(parsedBody.title).toBe(formData.title);
            expect(parsedBody.outcomes).toHaveLength(formData.outcomes.length);
            expect(parsedBody.prediction_window).toBe(formData.duration);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call lock endpoint with correct prediction ID for any active prediction', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb.filter(p => p.status === 'ACTIVE'),
          async (prediction) => {
            const lockedPrediction = { ...prediction, status: 'LOCKED' as const };
            
            let capturedBody: string | null = null;
            global.fetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
              if (options?.method === 'PATCH') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [lockedPrediction] }),
              };
            });

            const { TwitchPredictionService } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.lockPrediction(prediction.broadcaster_id, prediction.id);

            // Verify fetch was called with PATCH
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/predictions'),
              expect.objectContaining({ method: 'PATCH' })
            );
            
            // Verify body contains correct data
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.broadcaster_id).toBe(prediction.broadcaster_id);
            expect(parsedBody.id).toBe(prediction.id);
            expect(parsedBody.status).toBe('LOCKED');
            
            // Verify result
            const { isTwitchPredictionError } = await import('../../src/application/services/TwitchPredictionService');
            expect(isTwitchPredictionError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call resolve endpoint with winning outcome ID for any lockable prediction', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb.filter(p => p.status === 'ACTIVE' || p.status === 'LOCKED'),
          async (prediction) => {
            // Ensure we have at least one outcome
            if (prediction.outcomes.length === 0) return;
            
            const winningOutcomeId = prediction.outcomes[0].id;
            const resolvedPrediction = {
              ...prediction,
              status: 'RESOLVED' as const,
              winning_outcome_id: winningOutcomeId,
            };
            
            let capturedBody: string | null = null;
            global.fetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
              if (options?.method === 'PATCH') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [resolvedPrediction] }),
              };
            });

            const { TwitchPredictionService } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.resolvePrediction(
              prediction.broadcaster_id,
              prediction.id,
              winningOutcomeId
            );

            // Verify fetch was called with PATCH
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/predictions'),
              expect.objectContaining({ method: 'PATCH' })
            );
            
            // Verify body contains correct data including winning_outcome_id
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.broadcaster_id).toBe(prediction.broadcaster_id);
            expect(parsedBody.id).toBe(prediction.id);
            expect(parsedBody.status).toBe('RESOLVED');
            expect(parsedBody.winning_outcome_id).toBe(winningOutcomeId);
            
            // Verify result
            const { isTwitchPredictionError } = await import('../../src/application/services/TwitchPredictionService');
            expect(isTwitchPredictionError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call cancel endpoint for any active or locked prediction', async () => {
      await fc.assert(
        fc.asyncProperty(
          predictionArb.filter(p => p.status === 'ACTIVE' || p.status === 'LOCKED'),
          async (prediction) => {
            const canceledPrediction = { ...prediction, status: 'CANCELED' as const };
            
            let capturedBody: string | null = null;
            global.fetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
              if (options?.method === 'PATCH') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [canceledPrediction] }),
              };
            });

            const { TwitchPredictionService } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.cancelPrediction(prediction.broadcaster_id, prediction.id);

            // Verify fetch was called with PATCH
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/predictions'),
              expect.objectContaining({ method: 'PATCH' })
            );
            
            // Verify body contains correct data
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.broadcaster_id).toBe(prediction.broadcaster_id);
            expect(parsedBody.id).toBe(prediction.id);
            expect(parsedBody.status).toBe('CANCELED');
            
            // Verify result
            const { isTwitchPredictionError } = await import('../../src/application/services/TwitchPredictionService');
            expect(isTwitchPredictionError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error for any API failure status code', async () => {
      const httpErrorStatusArb = fc.oneof(
        fc.constant(401),
        fc.constant(403),
        fc.constant(404),
        fc.constant(429),
        fc.constant(500)
      );

      await fc.assert(
        fc.asyncProperty(
          httpErrorStatusArb,
          userIdArb,
          async (errorStatus, broadcasterId) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: errorStatus,
              text: () => Promise.resolve('Error'),
            });

            const { TwitchPredictionService, isTwitchPredictionError } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.getPredictions(broadcasterId);

            // Should return an error object
            expect(isTwitchPredictionError(result)).toBe(true);
            if (isTwitchPredictionError(result)) {
              expect(result.status).toBe(errorStatus);
              expect(result.message).toBeTruthy();
              expect(result.solution).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle successful API responses for any valid prediction data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(predictionArb, { minLength: 0, maxLength: 5 }),
          userIdArb,
          async (predictions, broadcasterId) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: predictions }),
            });

            const { TwitchPredictionService, isTwitchPredictionError } = await import('../../src/application/services/TwitchPredictionService');
            const service = new TwitchPredictionService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.getPredictions(broadcasterId);

            // Should return array of predictions
            expect(isTwitchPredictionError(result)).toBe(false);
            if (!isTwitchPredictionError(result)) {
              expect(Array.isArray(result)).toBe(true);
              expect(result).toHaveLength(predictions.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
