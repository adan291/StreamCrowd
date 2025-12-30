/**
 * Property-based tests for vote processing utilities
 * 
 * Tests vote processing across platforms for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 4.5, 5.5 - Process votes using same format across platforms
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  parseVote,
  isVote,
  createVoteFromMessage,
  aggregateVotes,
  addVoteToAggregation,
  getTotalVotes,
  getVotesByPlatform,
  deduplicateVotes,
  VOTE_PATTERN,
} from '../../src/application/utils/voteProcessing';
import type { Platform, ChatMessage, PlatformVote, AggregatedVotes } from '../../types/platform';

// ============================================
// ARBITRARIES (Generators)
// ============================================

const platformArb = fc.constantFrom<Platform>('twitch', 'youtube', 'kick');

// Valid vote values
const voteValueArb = fc.oneof(
  fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z]+$/.test(s))
);

// Valid vote message (matches +1, +2, +key format)
const validVoteMessageArb = voteValueArb.map(v => `+${v}`);

// Invalid vote message (doesn't match vote pattern)
const invalidVoteMessageArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => !VOTE_PATTERN.test(s.trim())),
  fc.constant('hello world'),
  fc.constant('++1'),
  fc.constant('+ 1'),
  fc.constant('1+'),
);

const chatMessageArb = fc.record({
  id: fc.uuid(),
  platform: platformArb,
  username: fc.string({ minLength: 1, maxLength: 30 }),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  timestamp: fc.nat({ max: Date.now() }),
  badges: fc.constant([]),
});

const voteMessageArb = fc.record({
  id: fc.uuid(),
  platform: platformArb,
  username: fc.string({ minLength: 1, maxLength: 30 }),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  message: validVoteMessageArb,
  timestamp: fc.nat({ max: Date.now() }),
  badges: fc.constant([]),
});


const platformVoteArb = fc.record({
  id: fc.uuid(),
  platform: platformArb,
  username: fc.string({ minLength: 1, maxLength: 30 }),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  voteValue: voteValueArb,
  timestamp: fc.nat({ max: Date.now() }),
  messageId: fc.uuid(),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Vote Processing Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Feature: enhanced-features, Property 10: Vote Processing Across Platforms**
   * 
   * *For any* chat message from any platform (Twitch, YouTube, Kick) that matches
   * the vote format (+1, +2, +key), the Platform_Adapter SHALL process it
   * identically regardless of source platform.
   * 
   * **Validates: Requirements 4.5, 5.5**
   */
  describe('Property 10: Vote Processing Across Platforms', () => {
    it('parseVote returns same result for same message regardless of platform', () => {
      fc.assert(
        fc.property(
          validVoteMessageArb,
          (message) => {
            // Parse the same message - should get same result
            const result1 = parseVote(message);
            const result2 = parseVote(message);
            const result3 = parseVote(message);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valid vote messages are parsed correctly', () => {
      fc.assert(
        fc.property(
          voteValueArb,
          (voteValue) => {
            const message = `+${voteValue}`;
            const parsed = parseVote(message);
            
            expect(parsed).toBe(voteValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid vote messages return null', () => {
      fc.assert(
        fc.property(
          invalidVoteMessageArb,
          (message) => {
            const parsed = parseVote(message);
            expect(parsed).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isVote returns true for valid votes', () => {
      fc.assert(
        fc.property(
          validVoteMessageArb,
          (message) => {
            expect(isVote(message)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isVote returns false for invalid votes', () => {
      fc.assert(
        fc.property(
          invalidVoteMessageArb,
          (message) => {
            expect(isVote(message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createVoteFromMessage works identically for all platforms', () => {
      fc.assert(
        fc.property(
          voteValueArb,
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.nat({ max: Date.now() }),
          (voteValue, id, username, displayName, timestamp) => {
            const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
            const votes: (PlatformVote | null)[] = [];
            
            for (const platform of platforms) {
              const message: ChatMessage = {
                id,
                platform,
                username,
                displayName,
                message: `+${voteValue}`,
                timestamp,
                badges: [],
              };
              
              votes.push(createVoteFromMessage(message));
            }
            
            // All votes should have the same voteValue
            for (const vote of votes) {
              expect(vote).not.toBeNull();
              expect(vote?.voteValue).toBe(voteValue);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('vote parsing handles whitespace consistently', () => {
      fc.assert(
        fc.property(
          voteValueArb,
          (voteValue) => {
            const messageWithSpaces = `  +${voteValue}  `;
            const messageWithoutSpaces = `+${voteValue}`;
            
            const parsed1 = parseVote(messageWithSpaces);
            const parsed2 = parseVote(messageWithoutSpaces);
            
            expect(parsed1).toBe(parsed2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('numeric votes are parsed as strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (num) => {
            const message = `+${num}`;
            const parsed = parseVote(message);
            
            expect(typeof parsed).toBe('string');
            expect(parsed).toBe(num.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('alphabetic votes are case-sensitive', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
          (value) => {
            const lowercase = `+${value}`;
            const uppercase = `+${value.toUpperCase()}`;
            
            const parsedLower = parseVote(lowercase);
            const parsedUpper = parseVote(uppercase);
            
            // Both should parse successfully
            expect(parsedLower).not.toBeNull();
            expect(parsedUpper).not.toBeNull();
            
            // But they should be different (case-sensitive)
            if (value !== value.toUpperCase()) {
              expect(parsedLower).not.toBe(parsedUpper);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: enhanced-features, Property 14: Multi-Platform Vote Aggregation**
   * 
   * *For any* poll with votes from multiple platforms, the aggregated vote count
   * SHALL equal the sum of votes from each individual platform.
   * 
   * **Validates: Requirements 6.2**
   */
  describe('Property 14: Multi-Platform Vote Aggregation', () => {
    it('total votes equals sum of platform votes', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 1, maxLength: 50 }),
          (votes) => {
            const aggregation = aggregateVotes(votes);
            const total = getTotalVotes(aggregation);
            
            expect(total).toBe(votes.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('platform breakdown sums to total', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 1, maxLength: 50 }),
          (votes) => {
            const aggregation = aggregateVotes(votes);
            
            for (const agg of aggregation) {
              const platformSum = 
                agg.byPlatform.twitch + 
                agg.byPlatform.youtube + 
                agg.byPlatform.kick;
              
              expect(platformSum).toBe(agg.total);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getVotesByPlatform returns correct count', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 1, maxLength: 50 }),
          platformArb,
          (votes, platform) => {
            const aggregation = aggregateVotes(votes);
            const platformVotes = getVotesByPlatform(aggregation, platform);
            
            const expectedCount = votes.filter(v => v.platform === platform).length;
            expect(platformVotes).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('addVoteToAggregation increases total by 1', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 0, maxLength: 20 }),
          platformVoteArb,
          (existingVotes, newVote) => {
            const initialAggregation = aggregateVotes(existingVotes);
            const initialTotal = getTotalVotes(initialAggregation);
            
            const updatedAggregation = addVoteToAggregation(initialAggregation, newVote);
            const updatedTotal = getTotalVotes(updatedAggregation);
            
            expect(updatedTotal).toBe(initialTotal + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('aggregation groups votes by option', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 1, maxLength: 50 }),
          (votes) => {
            const aggregation = aggregateVotes(votes);
            
            // Each unique vote value should have exactly one entry
            const uniqueOptions = new Set(votes.map(v => v.voteValue));
            expect(aggregation.length).toBe(uniqueOptions.size);
            
            // Each option should appear exactly once
            const aggregatedOptions = new Set(aggregation.map(a => a.option));
            expect(aggregatedOptions.size).toBe(aggregation.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deduplication keeps one vote per user per platform', () => {
      fc.assert(
        fc.property(
          fc.array(platformVoteArb, { minLength: 1, maxLength: 50 }),
          (votes) => {
            const deduplicated = deduplicateVotes(votes);
            
            // Check no duplicates
            const seen = new Set<string>();
            for (const vote of deduplicated) {
              const key = `${vote.platform}:${vote.username}`;
              expect(seen.has(key)).toBe(false);
              seen.add(key);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty votes array produces empty aggregation', () => {
      const aggregation = aggregateVotes([]);
      expect(aggregation).toHaveLength(0);
      expect(getTotalVotes(aggregation)).toBe(0);
    });

    it('single vote produces correct aggregation', () => {
      fc.assert(
        fc.property(
          platformVoteArb,
          (vote) => {
            const aggregation = aggregateVotes([vote]);
            
            expect(aggregation).toHaveLength(1);
            expect(aggregation[0].option).toBe(vote.voteValue);
            expect(aggregation[0].total).toBe(1);
            expect(aggregation[0].byPlatform[vote.platform]).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
