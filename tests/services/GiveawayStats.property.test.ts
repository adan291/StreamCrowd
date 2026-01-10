/**
 * Property Test: Statistics Accumulation
 * Property 11: Statistics Accumulation
 * Validates: Requirements 8.1 - Statistics should accumulate correctly
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES
// ============================================

interface GiveawayStats {
  totalGiveaways: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  byMode: {
    viewers: number;
    keyword: number;
    subs: number;
  };
  topWinners: Array<{ name: string; wins: number }>;
  topParticipants: Array<{ name: string; participations: number }>;
}

interface GiveawayResult {
  mode: 'viewers' | 'keyword' | 'subs';
  participantCount: number;
  winners: string[];
  participants: string[];
}

// ============================================
// STATS ACCUMULATOR (simulates StatsPanel logic)
// ============================================

const createEmptyStats = (): GiveawayStats => ({
  totalGiveaways: 0,
  totalParticipants: 0,
  totalWinners: 0,
  averageParticipants: 0,
  byMode: { viewers: 0, keyword: 0, subs: 0 },
  topWinners: [],
  topParticipants: [],
});

const accumulateStats = (
  currentStats: GiveawayStats,
  result: GiveawayResult
): GiveawayStats => {
  const newTotalGiveaways = currentStats.totalGiveaways + 1;
  const newTotalParticipants = currentStats.totalParticipants + result.participantCount;
  const newTotalWinners = currentStats.totalWinners + result.winners.length;
  
  // Update winner counts
  const winnerMap = new Map<string, number>();
  currentStats.topWinners.forEach(w => winnerMap.set(w.name, w.wins));
  result.winners.forEach(w => {
    winnerMap.set(w, (winnerMap.get(w) || 0) + 1);
  });
  
  // Update participant counts
  const participantMap = new Map<string, number>();
  currentStats.topParticipants.forEach(p => participantMap.set(p.name, p.participations));
  result.participants.forEach(p => {
    participantMap.set(p, (participantMap.get(p) || 0) + 1);
  });
  
  return {
    totalGiveaways: newTotalGiveaways,
    totalParticipants: newTotalParticipants,
    totalWinners: newTotalWinners,
    averageParticipants: newTotalParticipants / newTotalGiveaways,
    byMode: {
      ...currentStats.byMode,
      [result.mode]: currentStats.byMode[result.mode] + 1,
    },
    topWinners: Array.from(winnerMap.entries())
      .map(([name, wins]) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10),
    topParticipants: Array.from(participantMap.entries())
      .map(([name, participations]) => ({ name, participations }))
      .sort((a, b) => b.participations - a.participations)
      .slice(0, 10),
  };
};

// ============================================
// ARBITRARIES
// ============================================

const usernameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
  { minLength: 3, maxLength: 15 }
);

const giveawayResultArb: fc.Arbitrary<GiveawayResult> = fc.record({
  mode: fc.constantFrom('viewers', 'keyword', 'subs') as fc.Arbitrary<'viewers' | 'keyword' | 'subs'>,
  participantCount: fc.integer({ min: 1, max: 100 }),
  winners: fc.array(usernameArb, { minLength: 1, maxLength: 5 }),
  participants: fc.array(usernameArb, { minLength: 1, maxLength: 50 }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Statistics Accumulation Property Tests', () => {
  describe('Property 11: Statistics Accumulation', () => {
    it('totalGiveaways should increment by 1 for each giveaway', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            expect(stats.totalGiveaways).toBe(results.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('totalParticipants should equal sum of all participant counts', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            const expectedTotal = results.reduce((sum, r) => sum + r.participantCount, 0);
            expect(stats.totalParticipants).toBe(expectedTotal);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('totalWinners should equal sum of all winners', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            const expectedTotal = results.reduce((sum, r) => sum + r.winners.length, 0);
            expect(stats.totalWinners).toBe(expectedTotal);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('averageParticipants should be totalParticipants / totalGiveaways', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            const expectedAverage = stats.totalParticipants / stats.totalGiveaways;
            expect(stats.averageParticipants).toBeCloseTo(expectedAverage, 10);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('byMode counts should sum to totalGiveaways', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            const modeSum = stats.byMode.viewers + stats.byMode.keyword + stats.byMode.subs;
            expect(modeSum).toBe(stats.totalGiveaways);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('topWinners should be sorted by wins descending', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 20 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            for (let i = 1; i < stats.topWinners.length; i++) {
              expect(stats.topWinners[i - 1].wins).toBeGreaterThanOrEqual(stats.topWinners[i].wins);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('topWinners should have max 10 entries', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 1, maxLength: 50 }),
          (results) => {
            let stats = createEmptyStats();
            results.forEach(result => {
              stats = accumulateStats(stats, result);
            });
            
            expect(stats.topWinners.length).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('stats should be monotonically increasing', () => {
      fc.assert(
        fc.property(
          fc.array(giveawayResultArb, { minLength: 2, maxLength: 10 }),
          (results) => {
            let prevStats = createEmptyStats();
            
            for (const result of results) {
              const newStats = accumulateStats(prevStats, result);
              
              expect(newStats.totalGiveaways).toBeGreaterThan(prevStats.totalGiveaways);
              expect(newStats.totalParticipants).toBeGreaterThanOrEqual(prevStats.totalParticipants);
              expect(newStats.totalWinners).toBeGreaterThanOrEqual(prevStats.totalWinners);
              
              prevStats = newStats;
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
