/**
 * Property-based tests for TwitchAPIService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch API service.
 * 
 * Feature: stream-activity-refactor
 * @requirements 1.1-1.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  TwitchAPIService,
  isTwitchAPIError,
  type TwitchAPIError,
  type Follower,
  type Subscriber,
  type BitsLeader,
  type Clip,
  type Video,
  type Moderator,
  type VIP,
  type Chatter,
} from '../../src/application/services/TwitchAPIService';

// ============ ARBITRARIES ============

// Generate valid Twitch usernames (3-25 chars, alphanumeric + underscore)
const usernameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// Generate valid user IDs (numeric strings)
const userIdArb = fc.integer({ min: 1, max: 999999999 }).map(String);

// Generate valid ISO date strings
const isoDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date() })
  .map(d => d.toISOString());

// Generate subscription tiers
const tierArb = fc.constantFrom('1000', '2000', '3000', 'Prime') as fc.Arbitrary<'1000' | '2000' | '3000' | 'Prime'>;

// Generate video types
const videoTypeArb = fc.constantFrom('archive', 'highlight', 'upload') as fc.Arbitrary<'archive' | 'highlight' | 'upload'>;

// Generate bits periods
const bitsPeriodArb = fc.constantFrom('day', 'week', 'month', 'year', 'all');

// Generate HTTP status codes
const httpStatusArb = fc.oneof(
  fc.constant(200),
  fc.constant(401),
  fc.constant(403),
  fc.constant(404),
  fc.constant(429),
  fc.constant(500),
  fc.constant(503)
);

// Generate data types for error parsing
const dataTypeArb = fc.constantFrom(
  'followers',
  'subscribers',
  'bits',
  'moderators',
  'vips',
  'chatters',
  'clips',
  'videos',
  undefined
);

// ============ MOCK API RESPONSES ============

// Generate mock follower API response
const followerResponseArb = fc.array(
  fc.record({
    user_login: usernameArb,
    user_name: usernameArb,
    followed_at: isoDateArb,
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock subscriber API response
const subscriberResponseArb = fc.array(
  fc.record({
    user_login: usernameArb,
    user_name: usernameArb,
    tier: tierArb,
    is_gift: fc.boolean(),
    gifter_id: fc.option(userIdArb, { nil: undefined }),
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock bits leaderboard API response
const bitsLeaderboardResponseArb = fc.array(
  fc.record({
    rank: fc.integer({ min: 1, max: 100 }),
    user_login: usernameArb,
    user_name: usernameArb,
    score: fc.integer({ min: 1, max: 1000000 }),
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock clip API response
const clipResponseArb = fc.array(
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    url: fc.webUrl(),
    thumbnail_url: fc.webUrl(),
    view_count: fc.integer({ min: 0, max: 1000000 }),
    creator_name: usernameArb,
    created_at: isoDateArb,
    duration: fc.float({ min: 1, max: 60 }),
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock video API response
const videoResponseArb = fc.array(
  fc.record({
    id: userIdArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    url: fc.webUrl(),
    thumbnail_url: fc.webUrl(),
    view_count: fc.integer({ min: 0, max: 1000000 }),
    type: videoTypeArb,
    duration: fc.string({ minLength: 1, maxLength: 10 }),
    created_at: isoDateArb,
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock moderator API response
const moderatorResponseArb = fc.array(
  fc.record({
    user_id: userIdArb,
    user_login: usernameArb,
    user_name: usernameArb,
  }),
  { minLength: 0, maxLength: 10 }
);

// Generate mock VIP API response (same structure as moderator)
const vipResponseArb = moderatorResponseArb;

// Generate mock chatter API response
const chatterResponseArb = fc.array(
  fc.record({
    user_id: userIdArb,
    user_login: usernameArb,
    user_name: usernameArb,
  }),
  { minLength: 0, maxLength: 10 }
);

// ============ TESTS ============

describe('TwitchAPIService Property Tests', () => {
  let service: TwitchAPIService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new TwitchAPIService('test_token');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Property 1: API Response Transformation', () => {
    /**
     * Feature: stream-activity-refactor, Property 1: API Response Transformation
     * 
     * For any valid Twitch API response, the TwitchAPIService SHALL transform it
     * into the correct typed structure with all required fields populated.
     * 
     * @validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
     */

    it('should transform follower responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(followerResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getFollowers('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((follower, i) => {
              expect(follower.username).toBe(mockData[i].user_login || mockData[i].user_name);
              expect(follower.displayName).toBe(mockData[i].user_name || mockData[i].user_login);
              expect(follower.followedAt).toBe(mockData[i].followed_at);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform subscriber responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(subscriberResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getSubscribers('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((sub, i) => {
              expect(sub.username).toBe(mockData[i].user_login || mockData[i].user_name);
              expect(sub.tier).toBe(mockData[i].tier);
              expect(sub.isGift).toBe(mockData[i].is_gift || false);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform bits leaderboard responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(bitsLeaderboardResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getBitsLeaderboard('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((entry, i) => {
              expect(entry.rank).toBe(mockData[i].rank);
              expect(entry.username).toBe(mockData[i].user_login || mockData[i].user_name);
              expect(entry.bits).toBe(mockData[i].score);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform clip responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(clipResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getClips('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((clip, i) => {
              expect(clip.id).toBe(mockData[i].id);
              expect(clip.title).toBe(mockData[i].title);
              expect(clip.url).toBe(mockData[i].url);
              expect(clip.viewCount).toBe(mockData[i].view_count);
              expect(clip.creatorName).toBe(mockData[i].creator_name);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform video responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(videoResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getVideos('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((video, i) => {
              expect(video.id).toBe(mockData[i].id);
              expect(video.title).toBe(mockData[i].title);
              expect(video.type).toBe(mockData[i].type);
              expect(video.viewCount).toBe(mockData[i].view_count);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform moderator responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(moderatorResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getModerators('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((mod, i) => {
              expect(mod.userId).toBe(mockData[i].user_id);
              expect(mod.username).toBe(mockData[i].user_login || mockData[i].user_name);
              expect(mod.displayName).toBe(mockData[i].user_name || mockData[i].user_login);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform VIP responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(vipResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getVIPs('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((vip, i) => {
              expect(vip.userId).toBe(mockData[i].user_id);
              expect(vip.username).toBe(mockData[i].user_login || mockData[i].user_name);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should transform chatter responses correctly', async () => {
      await fc.assert(
        fc.asyncProperty(chatterResponseArb, async (mockData) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockData }),
          });

          const result = await service.getChatters('123456');

          if (!isTwitchAPIError(result)) {
            expect(result).toHaveLength(mockData.length);
            result.forEach((chatter, i) => {
              expect(chatter.userId).toBe(mockData[i].user_id);
              expect(chatter.username).toBe(mockData[i].user_login || mockData[i].user_name);
            });
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: API Error Handling', () => {
    /**
     * Feature: stream-activity-refactor, Property 2: API Error Handling
     * 
     * For any HTTP error status code (4xx, 5xx), the TwitchAPIService SHALL return
     * a TwitchAPIError with a valid code, descriptive message, and actionable solution.
     * 
     * @validates Requirements 1.9
     */

    it('should return structured errors for all HTTP error codes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          dataTypeArb,
          fc.option(fc.string(), { nil: undefined }),
          (status, dataType, errorBody) => {
            const error = service.parseError(status, errorBody, dataType);

            // Error should have all required fields
            expect(error).toHaveProperty('code');
            expect(error).toHaveProperty('status');
            expect(error).toHaveProperty('message');
            expect(error).toHaveProperty('solution');

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
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return appropriate error codes for specific HTTP statuses', () => {
      fc.assert(
        fc.property(
          httpStatusArb,
          dataTypeArb,
          (status, dataType) => {
            if (status === 200) return true; // Skip success status

            const error = service.parseError(status, undefined, dataType);

            // 401 should return token-related errors
            if (status === 401) {
              expect(['invalid_token', 'token_expired']).toContain(error.code);
            }

            // 403 should return permission-related errors
            if (status === 403) {
              expect(error.code).toMatch(/^(missing_scope_|not_broadcaster|access_denied)/);
            }

            // 404 should return not found error
            if (status === 404) {
              expect(error.code).toBe('channel_not_found');
            }

            // 429 should return rate limit error
            if (status === 429) {
              expect(error.code).toBe('rate_limit');
            }

            // 5xx should return server errors
            if (status >= 500) {
              expect(['server_error', 'service_unavailable']).toContain(error.code);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return scope-specific errors for 403 with data type', () => {
      // Map data types to their expected error codes
      const dataTypeToErrorCode: Record<string, string> = {
        followers: 'missing_scope_followers',
        subscribers: 'missing_scope_subscribers',
        bits: 'missing_scope_bits',
        moderators: 'missing_scope_moderation', // Note: uses 'moderation' not 'moderators'
        vips: 'missing_scope_vips',
        chatters: 'missing_scope_chatters',
      };
      
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(dataTypeToErrorCode)),
          (dataType) => {
            const error = service.parseError(403, undefined, dataType);

            // Should return the specific missing scope error
            expect(error.code).toBe(dataTypeToErrorCode[dataType]);
            expect(error.status).toBe(403);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include link for authentication errors', () => {
      fc.assert(
        fc.property(
          fc.constant(401),
          fc.option(fc.string(), { nil: undefined }),
          (status, errorBody) => {
            const error = service.parseError(status, errorBody);

            // 401 errors should include a link to token generator
            expect(error.link).toBeDefined();
            expect(error.link).toContain('twitchtokengenerator.com');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return errors from API methods on HTTP failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }),
          async (status) => {
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status,
              text: () => Promise.resolve('Error'),
            });

            const result = await service.getFollowers('123456');

            expect(isTwitchAPIError(result)).toBe(true);
            if (isTwitchAPIError(result)) {
              expect(result.status).toBe(status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
