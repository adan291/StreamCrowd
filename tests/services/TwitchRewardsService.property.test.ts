/**
 * Property-based tests for TwitchRewardsService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch Rewards service, specifically CRUD operations and redemption management.
 * 
 * Feature: twitch-tools-implementation
 * Property 4: Reward CRUD Operations
 * **Validates: Requirements 4.3, 4.4, 4.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  TwitchRewardsService,
  isTwitchRewardsError,
} from '../../src/application/services/TwitchRewardsService';
import type {
  TwitchReward,
  TwitchRedemption,
  CreateRewardData,
  UpdateRewardData,
  RedemptionStatus,
} from '../../types/twitch';

// ============ ARBITRARIES ============

// Generate valid user IDs (numeric strings)
const userIdArb = fc.integer({ min: 1, max: 999999999 }).map(String);

// Generate valid Twitch usernames
const usernameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// Generate valid ISO date strings
const isoDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date() })
  .map(d => d.toISOString());

// Generate valid reward titles
const rewardTitleArb = fc.string({ minLength: 1, maxLength: 45 })
  .filter(s => s.trim().length > 0);

// Generate valid reward costs
const rewardCostArb = fc.integer({ min: 1, max: 999999999 });

// Generate valid hex colors
const hexColorArb = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(s => `#${s}`);

// Generate redemption status
const redemptionStatusArb = fc.constantFrom('UNFULFILLED', 'FULFILLED', 'CANCELED') as fc.Arbitrary<RedemptionStatus>;

// Generate a mock reward image
const rewardImageArb = fc.record({
  url_1x: fc.webUrl(),
  url_2x: fc.webUrl(),
  url_4x: fc.webUrl(),
});

// Generate max per stream setting
const maxPerStreamSettingArb = fc.record({
  is_enabled: fc.boolean(),
  max_per_stream: fc.integer({ min: 1, max: 100 }),
});

// Generate max per user per stream setting
const maxPerUserPerStreamSettingArb = fc.record({
  is_enabled: fc.boolean(),
  max_per_user_per_stream: fc.integer({ min: 1, max: 100 }),
});

// Generate global cooldown setting
const globalCooldownSettingArb = fc.record({
  is_enabled: fc.boolean(),
  global_cooldown_seconds: fc.integer({ min: 0, max: 604800 }),
});


// Generate a mock TwitchReward
const rewardArb: fc.Arbitrary<TwitchReward> = fc.record({
  id: fc.uuid(),
  broadcaster_id: userIdArb,
  broadcaster_name: usernameArb,
  broadcaster_login: usernameArb,
  title: rewardTitleArb,
  prompt: fc.string({ minLength: 0, maxLength: 200 }),
  cost: rewardCostArb,
  is_enabled: fc.boolean(),
  is_paused: fc.boolean(),
  is_in_stock: fc.boolean(),
  is_user_input_required: fc.boolean(),
  max_per_stream: maxPerStreamSettingArb,
  max_per_user_per_stream: maxPerUserPerStreamSettingArb,
  global_cooldown: globalCooldownSettingArb,
  background_color: hexColorArb,
  image: fc.option(rewardImageArb, { nil: null }),
  default_image: rewardImageArb,
  should_redemptions_skip_request_queue: fc.boolean(),
  redemptions_redeemed_current_stream: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null }),
  cooldown_expires_at: fc.option(isoDateArb, { nil: null }),
});

// Generate a mock redemption reward info
const redemptionRewardArb = fc.record({
  id: fc.uuid(),
  title: rewardTitleArb,
  prompt: fc.string({ minLength: 0, maxLength: 200 }),
  cost: rewardCostArb,
});

// Generate a mock TwitchRedemption
const redemptionArb: fc.Arbitrary<TwitchRedemption> = fc.record({
  id: fc.uuid(),
  user_id: userIdArb,
  user_name: usernameArb,
  user_login: usernameArb,
  user_input: fc.string({ minLength: 0, maxLength: 500 }),
  status: redemptionStatusArb,
  redeemed_at: isoDateArb,
  reward: redemptionRewardArb,
  broadcaster_id: userIdArb,
  broadcaster_name: usernameArb,
  broadcaster_login: usernameArb,
});

// Generate CreateRewardData
const createRewardDataArb: fc.Arbitrary<CreateRewardData> = fc.record({
  title: rewardTitleArb,
  cost: rewardCostArb,
  prompt: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  is_enabled: fc.option(fc.boolean(), { nil: undefined }),
  background_color: fc.option(hexColorArb, { nil: undefined }),
  is_user_input_required: fc.option(fc.boolean(), { nil: undefined }),
  is_max_per_stream_enabled: fc.option(fc.boolean(), { nil: undefined }),
  max_per_stream: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  is_max_per_user_per_stream_enabled: fc.option(fc.boolean(), { nil: undefined }),
  max_per_user_per_stream: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  is_global_cooldown_enabled: fc.option(fc.boolean(), { nil: undefined }),
  global_cooldown_seconds: fc.option(fc.integer({ min: 0, max: 604800 }), { nil: undefined }),
  should_redemptions_skip_request_queue: fc.option(fc.boolean(), { nil: undefined }),
});

// Generate UpdateRewardData
const updateRewardDataArb: fc.Arbitrary<UpdateRewardData> = fc.record({
  title: fc.option(rewardTitleArb, { nil: undefined }),
  cost: fc.option(rewardCostArb, { nil: undefined }),
  prompt: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  is_enabled: fc.option(fc.boolean(), { nil: undefined }),
  is_paused: fc.option(fc.boolean(), { nil: undefined }),
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

describe('TwitchRewardsService Property Tests', () => {
  let service: TwitchRewardsService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Property 4: Reward CRUD Operations', () => {
    /**
     * Feature: twitch-tools-implementation, Property 4: Reward CRUD Operations
     * 
     * For any reward operation (create, update, delete, toggle), the system SHALL
     * call the correct Twitch API endpoint and update the local state to reflect the change.
     * 
     * **Validates: Requirements 4.3, 4.4, 4.5**
     */

    it('should call correct API endpoint for getCustomRewards', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(rewardArb, { minLength: 0, maxLength: 10 }),
          async (broadcasterId, mockRewards) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: mockRewards }),
            });

            const result = await service.getCustomRewards(broadcasterId);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`broadcaster_id=${broadcasterId}`),
              expect.objectContaining({
                headers: expect.objectContaining({
                  'Authorization': expect.stringContaining('Bearer'),
                  'Client-Id': 'test_client_id',
                }),
              })
            );

            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result).toEqual(mockRewards);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for createCustomReward', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          createRewardDataArb,
          rewardArb,
          async (broadcasterId, createData, mockReward) => {
            const responseReward = { ...mockReward, title: createData.title, cost: createData.cost };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responseReward] }),
            });

            const result = await service.createCustomReward(broadcasterId, createData);

            // Verify the API was called with correct URL and method
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`broadcaster_id=${broadcasterId}`),
              expect.objectContaining({
                method: 'POST',
              })
            );

            // Verify the body contains the title (JSON-escaped)
            const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.title).toBe(createData.title);
            expect(body.cost).toBe(createData.cost);

            expect(isTwitchRewardsError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for updateCustomReward', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          updateRewardDataArb,
          rewardArb,
          async (broadcasterId, rewardId, updateData, mockReward) => {
            const responseReward = { ...mockReward, ...updateData };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responseReward] }),
            });

            const result = await service.updateCustomReward(broadcasterId, rewardId, updateData);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`broadcaster_id=${broadcasterId}`),
              expect.objectContaining({
                method: 'PATCH',
              })
            );
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`id=${rewardId}`),
              expect.anything()
            );

            expect(isTwitchRewardsError(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for deleteCustomReward', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          async (broadcasterId, rewardId) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 204,
            });

            const result = await service.deleteCustomReward(broadcasterId, rewardId);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`broadcaster_id=${broadcasterId}`),
              expect.objectContaining({
                method: 'DELETE',
              })
            );
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`id=${rewardId}`),
              expect.anything()
            );

            // DELETE returns void on success
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle reward enabled status correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.boolean(),
          rewardArb,
          async (broadcasterId, rewardId, isEnabled, mockReward) => {
            const responseReward = { ...mockReward, is_enabled: isEnabled };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responseReward] }),
            });

            const result = await service.toggleReward(broadcasterId, rewardId, isEnabled);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.anything(),
              expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining(`"is_enabled":${isEnabled}`),
              })
            );

            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.is_enabled).toBe(isEnabled);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 4b: Redemption Management', () => {
    /**
     * Feature: twitch-tools-implementation, Property 4b: Redemption Management
     * 
     * For any redemption action (fulfill, reject), the system SHALL update
     * the redemption status via API.
     * 
     * **Validates: Requirements 5.3**
     */

    it('should call correct API endpoint for getRedemptions', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.array(redemptionArb, { minLength: 0, maxLength: 10 }),
          async (broadcasterId, rewardId, mockRedemptions) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: mockRedemptions }),
            });

            const result = await service.getRedemptions(broadcasterId, rewardId);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`broadcaster_id=${broadcasterId}`),
              expect.anything()
            );
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`reward_id=${rewardId}`),
              expect.anything()
            );

            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result).toEqual(mockRedemptions);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter redemptions by status when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          redemptionStatusArb,
          async (broadcasterId, rewardId, status) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [] }),
            });

            await service.getRedemptions(broadcasterId, rewardId, status);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`status=${status}`),
              expect.anything()
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for fulfillRedemption', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.uuid(),
          redemptionArb,
          async (broadcasterId, rewardId, redemptionId, mockRedemption) => {
            const responseRedemption = { ...mockRedemption, status: 'FULFILLED' as const };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responseRedemption] }),
            });

            const result = await service.fulfillRedemption(broadcasterId, rewardId, redemptionId);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`id=${redemptionId}`),
              expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining('"status":"FULFILLED"'),
              })
            );

            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.status).toBe('FULFILLED');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call correct API endpoint for rejectRedemption', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.uuid(),
          redemptionArb,
          async (broadcasterId, rewardId, redemptionId, mockRedemption) => {
            const responseRedemption = { ...mockRedemption, status: 'CANCELED' as const };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [responseRedemption] }),
            });

            const result = await service.rejectRedemption(broadcasterId, rewardId, redemptionId);

            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`id=${redemptionId}`),
              expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining('"status":"CANCELED"'),
              })
            );

            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.status).toBe('CANCELED');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 4c: Error Handling', () => {
    /**
     * Feature: twitch-tools-implementation, Property 4c: Error Handling
     * 
     * For any HTTP error status code, the TwitchRewardsService SHALL return
     * a TwitchRewardsError with valid code, message, solution, and retryable flag.
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

            const result = await service.getCustomRewards('123456');

            expect(isTwitchRewardsError(result)).toBe(true);
            if (isTwitchRewardsError(result)) {
              expect(result.status).toBe(status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify specific error types from response body', () => {
      // Test duplicate reward error
      const duplicateError = service.parseError(400, 'already exists');
      expect(duplicateError.code).toBe('reward_exists');

      // Test cost error
      const costError = service.parseError(400, 'invalid cost');
      expect(costError.code).toBe('invalid_cost');

      // Test cannot manage error
      const manageError = service.parseError(403, 'cannot manage this reward');
      expect(manageError.code).toBe('cannot_manage_reward');

      // Test redemption not found
      const redemptionError = service.parseError(404, 'redemption not found');
      expect(redemptionError.code).toBe('redemption_not_found');
    });
  });
});
