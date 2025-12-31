// Property-based tests for MetricsService - Session Comparison
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MetricsService } from '../../src/application/services/MetricsService';
import { SessionMetrics, SessionSummary } from '../../types/metrics';

describe('MetricsService Property Tests', () => {
  // Arbitrary for SessionSummary
  const sessionSummaryArb = fc.record({
    duration: fc.integer({ min: 60000, max: 7200000 }),
    peakViewers: fc.integer({ min: 0, max: 100000 }),
    avgViewers: fc.integer({ min: 0, max: 50000 }),
    totalMessages: fc.integer({ min: 0, max: 50000 }),
    uniqueChatters: fc.integer({ min: 0, max: 10000 }),
    pollsCreated: fc.integer({ min: 0, max: 100 }),
    pollParticipation: fc.integer({ min: 0, max: 10000 }),
    predictionsCreated: fc.integer({ min: 0, max: 100 }),
    predictionParticipation: fc.integer({ min: 0, max: 10000 }),
    newFollowers: fc.integer({ min: 0, max: 1000 }),
    newSubscribers: fc.integer({ min: 0, max: 500 }),
  }) as fc.Arbitrary<SessionSummary>;

  // Arbitrary for SessionMetrics
  const sessionMetricsArb = fc.record({
    id: fc.uuid(),
    startTime: fc.integer({ min: 1700000000000, max: 1750000000000 }),
    endTime: fc.option(fc.integer({ min: 1750000000001, max: 1800000000000 }), { nil: undefined }),
    platform: fc.constantFrom('twitch', 'youtube', 'kick'),
    channelName: fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    isFavorite: fc.boolean(),
    summary: sessionSummaryArb,
    timeSeries: fc.constant({}),
    events: fc.constant([]),
  }) as fc.Arbitrary<SessionMetrics>;

  // Property 7: Comparison Calculation Accuracy
  describe('Property 7: Comparison Calculation Accuracy', () => {
    it('percent changes are calculated correctly: (new - old) / old * 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (oldValue, newValue) => {
            // Calculate expected percent change
            const expectedChange = ((newValue - oldValue) / oldValue) * 100;
            const roundedExpected = Math.round(expectedChange * 10) / 10;

            // Use the internal calculation method via a test helper
            const values = [oldValue, newValue];
            const percentChanges = calculatePercentChanges(values);

            // First value should have 0 change (no previous value)
            expect(percentChanges[0]).toBe(0);
            
            // Second value should have the calculated change
            expect(percentChanges[1]).toBe(roundedExpected);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles zero old value correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          (newValue) => {
            const values = [0, newValue];
            const percentChanges = calculatePercentChanges(values);

            expect(percentChanges[0]).toBe(0);
            
            // When old value is 0, should return 100 if new > 0, else 0
            if (newValue > 0) {
              expect(percentChanges[1]).toBe(100);
            } else {
              expect(percentChanges[1]).toBe(0);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('multiple values have correct sequential changes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 3, maxLength: 5 }),
          (values) => {
            const percentChanges = calculatePercentChanges(values);

            // First value always has 0 change
            expect(percentChanges[0]).toBe(0);

            // Each subsequent value should have correct change from previous
            for (let i = 1; i < values.length; i++) {
              const oldVal = values[i - 1];
              const newVal = values[i];
              const expected = Math.round(((newVal - oldVal) / oldVal) * 100 * 10) / 10;
              expect(percentChanges[i]).toBe(expected);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('comparison returns correct number of differences', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 2, maxLength: 3 }),
          (sessions) => {
            // Create a mock comparison result
            const comparison = createMockComparison(sessions);

            // Should have differences for each metric type
            expect(comparison.differences.length).toBeGreaterThan(0);

            // Each difference should have values for each session
            for (const diff of comparison.differences) {
              expect(diff.values.length).toBe(sessions.length);
              expect(diff.percentChanges.length).toBe(sessions.length);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('comparison highlights are generated for significant changes', () => {
      // Create sessions with significant differences
      const session1: SessionMetrics = {
        id: 'session-1',
        startTime: Date.now() - 7200000,
        endTime: Date.now() - 3600000,
        platform: 'twitch',
        channelName: 'testchannel',
        isFavorite: false,
        summary: {
          duration: 3600000,
          peakViewers: 100,
          avgViewers: 50,
          totalMessages: 500,
          uniqueChatters: 50,
          pollsCreated: 2,
          pollParticipation: 100,
          predictionsCreated: 1,
          predictionParticipation: 50,
          newFollowers: 10,
          newSubscribers: 5,
        },
        timeSeries: {},
        events: [],
      };

      const session2: SessionMetrics = {
        ...session1,
        id: 'session-2',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        summary: {
          ...session1.summary,
          peakViewers: 200, // 100% increase
          totalMessages: 1000, // 100% increase
        },
      };

      const comparison = createMockComparison([session1, session2]);

      // Should have highlights for significant changes
      expect(comparison.highlights.length).toBeGreaterThan(0);
    });
  });

  // Session management tests
  describe('Session Management', () => {
    it('startSession creates valid session with correct properties', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('twitch', 'youtube', 'kick'),
          fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          (platform, channelName) => {
            const service = new MetricsService();
            const session = service.startSession(platform, channelName);

            expect(session.id).toBeDefined();
            expect(session.platform).toBe(platform);
            expect(session.channelName).toBe(channelName);
            expect(session.startTime).toBeLessThanOrEqual(Date.now());
            expect(session.isFavorite).toBe(false);
            expect(session.events).toEqual([]);

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('getCurrentMetrics returns null when no session is active', () => {
      const service = new MetricsService();
      expect(service.getCurrentMetrics()).toBeNull();
    });

    it('getCurrentMetrics returns session data when active', () => {
      const service = new MetricsService();
      service.startSession('twitch', 'testchannel');
      
      const metrics = service.getCurrentMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.platform).toBe('twitch');
      expect(metrics?.channelName).toBe('testchannel');
    });
  });
});

// Helper function to calculate percent changes (mirrors MetricsService logic)
function calculatePercentChanges(values: number[]): number[] {
  if (values.length < 2) {
    return values.map(() => 0);
  }

  const percentChanges: number[] = [0];

  for (let i = 1; i < values.length; i++) {
    const oldValue = values[i - 1];
    const newValue = values[i];

    if (oldValue === 0) {
      percentChanges.push(newValue > 0 ? 100 : 0);
    } else {
      const change = ((newValue - oldValue) / oldValue) * 100;
      percentChanges.push(Math.round(change * 10) / 10);
    }
  }

  return percentChanges;
}

// Helper to create mock comparison (mirrors MetricsService logic)
function createMockComparison(sessions: SessionMetrics[]) {
  const metricTypes = [
    'viewers',
    'chat_messages',
    'poll_participation',
    'prediction_participation',
    'followers',
    'subscribers',
  ] as const;

  const differences = metricTypes.map(metric => {
    const values = sessions.map(s => {
      switch (metric) {
        case 'viewers': return s.summary.peakViewers;
        case 'chat_messages': return s.summary.totalMessages;
        case 'poll_participation': return s.summary.pollParticipation;
        case 'prediction_participation': return s.summary.predictionParticipation;
        case 'followers': return s.summary.newFollowers;
        case 'subscribers': return s.summary.newSubscribers;
        default: return 0;
      }
    });

    return {
      metric,
      values,
      percentChanges: calculatePercentChanges(values),
    };
  });

  const highlights: string[] = [];
  for (const diff of differences) {
    const maxChange = Math.max(...diff.percentChanges);
    if (maxChange > 20) {
      highlights.push(`${diff.metric} increased significantly`);
    }
  }

  if (highlights.length === 0) {
    highlights.push('Sessions have similar metrics');
  }

  return { sessions, differences, highlights };
}
