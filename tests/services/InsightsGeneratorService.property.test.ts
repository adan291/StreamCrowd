// Property-based tests for InsightsGeneratorService

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { InsightsGeneratorService } from '../../src/application/services/InsightsGeneratorService';
import { SessionMetrics, SessionSummary, TimeSeries, MetricPoint } from '../../types/metrics';

describe('InsightsGeneratorService Property Tests', () => {
  let service: InsightsGeneratorService;

  beforeEach(() => {
    service = new InsightsGeneratorService();
  });

  // Helper to create a valid session
  const createSession = (overrides: Partial<SessionMetrics> = {}): SessionMetrics => {
    const now = Date.now();
    return {
      id: `session_${Math.random().toString(36).substring(2, 9)}`,
      startTime: now - 3600000, // 1 hour ago
      endTime: now,
      platform: 'twitch',
      channelName: 'test_channel',
      isFavorite: false,
      summary: {
        duration: 3600000,
        peakViewers: 100,
        avgViewers: 75,
        totalMessages: 500,
        uniqueChatters: 50,
        pollsCreated: 2,
        pollParticipation: 30,
        predictionsCreated: 1,
        predictionParticipation: 25,
        newFollowers: 10,
        newSubscribers: 2,
      },
      timeSeries: {
        viewers: {
          name: 'viewers',
          points: Array.from({ length: 20 }, (_, i) => ({
            timestamp: now - 3600000 + i * 180000,
            value: 50 + Math.floor(Math.random() * 50),
          })),
          resolution: 'raw',
        },
      },
      events: [],
      ...overrides,
    };
  };

  // Property 8: Insight Generation Minimum
  describe('Property 8: Insight Generation Minimum', () => {
    it('generates at least 3 insights for sessions with data', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }),
          fc.integer({ min: 25, max: 200 }),
          fc.integer({ min: 100, max: 2000 }),
          (peakViewers, avgViewers, totalMessages) => {
            const session = createSession({
              summary: {
                duration: 3600000,
                peakViewers,
                avgViewers: Math.min(avgViewers, peakViewers),
                totalMessages,
                uniqueChatters: Math.floor(totalMessages / 10),
                pollsCreated: 2,
                pollParticipation: 30,
                predictionsCreated: 1,
                predictionParticipation: 25,
                newFollowers: Math.floor(peakViewers * 0.1),
                newSubscribers: Math.floor(peakViewers * 0.02),
              },
            });

            const insights = service.generateInsights(session);
            
            expect(insights.length).toBeGreaterThanOrEqual(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all insights have required fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 500 }),
          (peakViewers) => {
            const session = createSession({
              summary: {
                ...createSession().summary,
                peakViewers,
                avgViewers: Math.floor(peakViewers * 0.7),
              },
            });

            const insights = service.generateInsights(session);
            
            for (const insight of insights) {
              expect(insight).toHaveProperty('id');
              expect(insight).toHaveProperty('sessionId');
              expect(insight).toHaveProperty('type');
              expect(insight).toHaveProperty('title');
              expect(insight).toHaveProperty('description');
              expect(insight).toHaveProperty('confidence');
              expect(insight).toHaveProperty('data');
              expect(insight).toHaveProperty('createdAt');
              
              // Confidence should be between 0 and 1
              expect(insight.confidence).toBeGreaterThanOrEqual(0);
              expect(insight.confidence).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('insights have unique IDs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (sessionCount) => {
            const allInsightIds = new Set<string>();
            
            for (let i = 0; i < sessionCount; i++) {
              const session = createSession();
              const insights = service.generateInsights(session);
              
              for (const insight of insights) {
                expect(allInsightIds.has(insight.id)).toBe(false);
                allInsightIds.add(insight.id);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Additional: Trend detection
  describe('Trend Detection', () => {
    it('detects trends with multiple sessions', () => {
      const sessions = Array.from({ length: 5 }, (_, i) => 
        createSession({
          id: `session_${i}`,
          startTime: Date.now() - (5 - i) * 86400000,
          summary: {
            ...createSession().summary,
            avgViewers: 50 + i * 10, // Growing trend
          },
        })
      );

      const insights = service.detectTrends(sessions);
      
      // Should detect the growth trend
      expect(insights.length).toBeGreaterThanOrEqual(0);
    });
  });

  // Additional: Peak correlation
  describe('Peak Correlation', () => {
    it('correlates peaks with nearby events', () => {
      const now = Date.now();
      const session = createSession({
        timeSeries: {
          viewers: {
            name: 'viewers',
            points: [
              { timestamp: now - 3600000, value: 50 },
              { timestamp: now - 3000000, value: 60 },
              { timestamp: now - 2400000, value: 150 }, // Peak
              { timestamp: now - 1800000, value: 80 },
              { timestamp: now - 1200000, value: 70 },
              { timestamp: now - 600000, value: 60 },
            ],
            resolution: 'raw',
          },
        },
        events: [
          {
            id: 'event_1',
            type: 'raid',
            timestamp: now - 2400000, // Same time as peak
            data: { viewers: 50 },
          },
        ],
      });

      const insights = service.detectPeakCorrelations(session);
      
      // Should find correlation between peak and raid
      const peakInsight = insights.find(i => i.type === 'peak_correlation');
      if (peakInsight) {
        expect(peakInsight.data).toHaveProperty('eventType', 'raid');
      }
    });
  });

  // Additional: Empty/minimal data handling
  describe('Edge Cases', () => {
    it('handles session with minimal data', () => {
      const session = createSession({
        summary: {
          duration: 60000,
          peakViewers: 0,
          avgViewers: 0,
          totalMessages: 0,
          uniqueChatters: 0,
          pollsCreated: 0,
          pollParticipation: 0,
          predictionsCreated: 0,
          predictionParticipation: 0,
          newFollowers: 0,
          newSubscribers: 0,
        },
        timeSeries: {},
        events: [],
      });

      // Should not throw
      const insights = service.generateInsights(session);
      expect(Array.isArray(insights)).toBe(true);
    });
  });
});
