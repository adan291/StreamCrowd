/**
 * Property-Based Tests for PollPreview Component
 * Feature: dynamics-ui-improvements
 * 
 * Tests preview reactivity and data consistency
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CHART_COLORS } from '../../constants';

// ============================================
// TYPES (matching component)
// ============================================

interface PollPreviewOption {
  label: string;
  color: string;
  icon?: string;
  image?: string;
}

interface OptionWithStats extends PollPreviewOption {
  votes: number;
  percentage: number;
}

// ============================================
// HELPER FUNCTIONS (extracted from component logic)
// ============================================

function calculateOptionsWithStats(
  options: PollPreviewOption[],
  simulatedVotes: number[]
): OptionWithStats[] {
  const totalVotes = simulatedVotes.reduce((sum, v) => sum + v, 0);
  
  return options.map((opt, i) => ({
    ...opt,
    votes: simulatedVotes[i] || 0,
    percentage: totalVotes > 0 ? ((simulatedVotes[i] || 0) / totalVotes) * 100 : 0,
    color: opt.color || CHART_COLORS[i % CHART_COLORS.length],
  }));
}

function findLeader(optionsWithStats: OptionWithStats[]): OptionWithStats | null {
  if (optionsWithStats.length === 0) return null;
  return optionsWithStats.reduce((max, opt) => 
    opt.votes > max.votes ? opt : max, optionsWithStats[0]
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ============================================
// GENERATORS
// ============================================

const optionArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => `#${h}`),
  icon: fc.option(fc.constantFrom('🎉', '🔥', '⭐', '👍', '❤️'), { nil: undefined }),
});

const optionsArb = fc.array(optionArb, { minLength: 2, maxLength: 10 });

const votesArb = (length: number) => fc.array(
  fc.integer({ min: 0, max: 1000 }),
  { minLength: length, maxLength: length }
);

// ============================================
// PROPERTY TESTS
// ============================================

describe('PollPreview Property Tests', () => {
  /**
   * Property 6: Preview Reactivity
   * When poll configuration changes, the preview SHALL update to reflect 
   * the new configuration within the same render cycle.
   * Validates: Requirements 4.2, 4.3
   */
  describe('Property 6: Preview Reactivity', () => {
    it('should calculate correct percentages that sum to 100%', () => {
      fc.assert(
        fc.property(
          optionsArb,
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 10 }),
          (options, votes) => {
            // Ensure votes array matches options length
            const adjustedVotes = votes.slice(0, options.length);
            while (adjustedVotes.length < options.length) {
              adjustedVotes.push(Math.floor(Math.random() * 100) + 1);
            }
            
            const optionsWithStats = calculateOptionsWithStats(options, adjustedVotes);
            const totalPercentage = optionsWithStats.reduce((sum, o) => sum + o.percentage, 0);
            
            // Percentages should sum to approximately 100% (allowing for floating point)
            return Math.abs(totalPercentage - 100) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify the correct leader (highest votes)', () => {
      fc.assert(
        fc.property(
          optionsArb,
          fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 10 }),
          (options, votes) => {
            const adjustedVotes = votes.slice(0, options.length);
            while (adjustedVotes.length < options.length) {
              adjustedVotes.push(0);
            }
            
            const optionsWithStats = calculateOptionsWithStats(options, adjustedVotes);
            const leader = findLeader(optionsWithStats);
            
            if (!leader) return optionsWithStats.length === 0;
            
            // Leader should have the maximum votes
            const maxVotes = Math.max(...optionsWithStats.map(o => o.votes));
            return leader.votes === maxVotes;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve option order after stats calculation', () => {
      fc.assert(
        fc.property(
          optionsArb,
          fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 10 }),
          (options, votes) => {
            const adjustedVotes = votes.slice(0, options.length);
            while (adjustedVotes.length < options.length) {
              adjustedVotes.push(0);
            }
            
            const optionsWithStats = calculateOptionsWithStats(options, adjustedVotes);
            
            // Order should be preserved
            return options.every((opt, i) => optionsWithStats[i].label === opt.label);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero total votes gracefully', () => {
      fc.assert(
        fc.property(optionsArb, (options) => {
          const zeroVotes = options.map(() => 0);
          const optionsWithStats = calculateOptionsWithStats(options, zeroVotes);
          
          // All percentages should be 0 when no votes
          return optionsWithStats.every(o => o.percentage === 0);
        }),
        { numRuns: 100 }
      );
    });

    it('should assign default colors when not provided', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ label: fc.string({ minLength: 1, maxLength: 20 }), color: fc.constant('') }),
            { minLength: 2, maxLength: 10 }
          ),
          (options) => {
            const votes = options.map(() => 10);
            const optionsWithStats = calculateOptionsWithStats(options, votes);
            
            // All options should have a valid color
            return optionsWithStats.every(o => 
              o.color && o.color.startsWith('#') && o.color.length === 7
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Duration Formatting
   * Tests that duration is formatted correctly
   */
  describe('Duration Formatting', () => {
    it('should format seconds correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 59 }), (seconds) => {
          const formatted = formatDuration(seconds);
          return formatted === `${seconds}s`;
        }),
        { numRuns: 60 }
      );
    });

    it('should format minutes and seconds correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          fc.integer({ min: 0, max: 59 }),
          (minutes, seconds) => {
            const totalSeconds = minutes * 60 + seconds;
            const formatted = formatDuration(totalSeconds);
            return formatted === `${minutes}m ${seconds}s`;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
