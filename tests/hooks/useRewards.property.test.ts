/**
 * Property-based tests for useRewards hook
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch Rewards hook redemption management.
 * 
 * Feature: twitch-tools-implementation
 * Property 5: Redemption Management
 * 
 * For any redemption action (fulfill, reject), the system SHALL update
 * the redemption status via API and remove it from the pending list.
 * 
 * **Validates: Requirements 5.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { 
  TwitchReward,
  TwitchRedemption,
  RedemptionStatus,
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
const hexColorArb = fc.stringMatching(/^#[0-9A-Fa-f]{6}$/);

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

// Generate unfulfilled redemption (pending)
const pendingRedemptionArb = redemptionArb.map(r => ({
  ...r,
  status: 'UNFULFILLED' as const,
}));

// ============ TESTS ============

describe('useRewards Property Tests', () => {
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

  describe('Property 5: Redemption Management', () => {
    /**
     * Feature: twitch-tools-implementation, Property 5: Redemption Management
     * 
     * For any redemption action (fulfill, reject), the system SHALL update
     * the redemption status via API and remove it from the pending list.
     * 
     * **Validates: Requirements 5.3**
     */

    it('should call fulfill API endpoint with correct parameters for any pending redemption', async () => {
      await fc.assert(
        fc.asyncProperty(
          pendingRedemptionArb,
          userIdArb,
          async (redemption, broadcasterId) => {
            const fulfilledRedemption = { ...redemption, status: 'FULFILLED' as const };
            
            let capturedUrl: string | null = null;
            let capturedBody: string | null = null;
            
            global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
              capturedUrl = url;
              if (options?.method === 'PATCH') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [fulfilledRedemption] }),
              };
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.fulfillRedemption(
              broadcasterId,
              redemption.reward.id,
              redemption.id
            );

            // Verify fetch was called with PATCH
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/redemptions'),
              expect.objectContaining({ method: 'PATCH' })
            );
            
            // Verify URL contains correct IDs
            expect(capturedUrl).toContain(`broadcaster_id=${broadcasterId}`);
            expect(capturedUrl).toContain(`reward_id=${redemption.reward.id}`);
            expect(capturedUrl).toContain(`id=${redemption.id}`);
            
            // Verify body contains FULFILLED status
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.status).toBe('FULFILLED');
            
            // Verify result is not an error
            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.status).toBe('FULFILLED');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call reject API endpoint with correct parameters for any pending redemption', async () => {
      await fc.assert(
        fc.asyncProperty(
          pendingRedemptionArb,
          userIdArb,
          async (redemption, broadcasterId) => {
            const canceledRedemption = { ...redemption, status: 'CANCELED' as const };
            
            let capturedUrl: string | null = null;
            let capturedBody: string | null = null;
            
            global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
              capturedUrl = url;
              if (options?.method === 'PATCH') {
                capturedBody = options.body as string;
              }
              return {
                ok: true,
                json: () => Promise.resolve({ data: [canceledRedemption] }),
              };
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.rejectRedemption(
              broadcasterId,
              redemption.reward.id,
              redemption.id
            );

            // Verify fetch was called with PATCH
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('/redemptions'),
              expect.objectContaining({ method: 'PATCH' })
            );
            
            // Verify URL contains correct IDs
            expect(capturedUrl).toContain(`broadcaster_id=${broadcasterId}`);
            expect(capturedUrl).toContain(`reward_id=${redemption.reward.id}`);
            expect(capturedUrl).toContain(`id=${redemption.id}`);
            
            // Verify body contains CANCELED status
            expect(capturedBody).not.toBeNull();
            const parsedBody = JSON.parse(capturedBody!);
            expect(parsedBody.status).toBe('CANCELED');
            
            // Verify result is not an error
            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.status).toBe('CANCELED');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error for any API failure when fulfilling redemption', async () => {
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
          pendingRedemptionArb,
          userIdArb,
          async (errorStatus, redemption, broadcasterId) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: errorStatus,
              text: () => Promise.resolve('Error'),
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.fulfillRedemption(
              broadcasterId,
              redemption.reward.id,
              redemption.id
            );

            // Should return an error object
            expect(isTwitchRewardsError(result)).toBe(true);
            if (isTwitchRewardsError(result)) {
              expect(result.status).toBe(errorStatus);
              expect(result.message).toBeTruthy();
              expect(result.solution).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error for any API failure when rejecting redemption', async () => {
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
          pendingRedemptionArb,
          userIdArb,
          async (errorStatus, redemption, broadcasterId) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: errorStatus,
              text: () => Promise.resolve('Error'),
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.rejectRedemption(
              broadcasterId,
              redemption.reward.id,
              redemption.id
            );

            // Should return an error object
            expect(isTwitchRewardsError(result)).toBe(true);
            if (isTwitchRewardsError(result)) {
              expect(result.status).toBe(errorStatus);
              expect(result.message).toBeTruthy();
              expect(result.solution).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update redemption status correctly for any valid redemption', async () => {
      const targetStatusArb = fc.constantFrom('FULFILLED', 'CANCELED') as fc.Arbitrary<'FULFILLED' | 'CANCELED'>;

      await fc.assert(
        fc.asyncProperty(
          pendingRedemptionArb,
          userIdArb,
          targetStatusArb,
          async (redemption, broadcasterId, targetStatus) => {
            const updatedRedemption = { ...redemption, status: targetStatus };
            
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ data: [updatedRedemption] }),
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.updateRedemptionStatus(
              broadcasterId,
              redemption.reward.id,
              redemption.id,
              targetStatus
            );

            // Verify result matches expected status
            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(result.status).toBe(targetStatus);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch pending redemptions correctly for any broadcaster', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(rewardArb, { minLength: 1, maxLength: 3 }),
          fc.array(pendingRedemptionArb, { minLength: 0, maxLength: 5 }),
          async (broadcasterId, rewards, redemptions) => {
            let fetchCallCount = 0;
            
            global.fetch = vi.fn().mockImplementation(async (url: string) => {
              fetchCallCount++;
              
              // First call gets rewards
              if (url.includes('custom_rewards') && !url.includes('redemptions')) {
                return {
                  ok: true,
                  json: () => Promise.resolve({ data: rewards }),
                };
              }
              
              // Subsequent calls get redemptions for each reward
              if (url.includes('redemptions')) {
                return {
                  ok: true,
                  json: () => Promise.resolve({ data: redemptions }),
                };
              }
              
              return {
                ok: true,
                json: () => Promise.resolve({ data: [] }),
              };
            });

            const { TwitchRewardsService, isTwitchRewardsError } = await import('../../src/application/services/TwitchRewardsService');
            const service = new TwitchRewardsService('test_token', 'test_client_id', 0, 0);
            
            const result = await service.getAllPendingRedemptions(broadcasterId);

            // Should return array (not error)
            expect(isTwitchRewardsError(result)).toBe(false);
            if (!isTwitchRewardsError(result)) {
              expect(Array.isArray(result)).toBe(true);
            }
            
            // Should have called fetch at least once for rewards
            expect(fetchCallCount).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
