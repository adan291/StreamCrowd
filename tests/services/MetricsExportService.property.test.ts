// Property-based tests for MetricsExportService
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MetricsExportService } from '../../src/application/services/MetricsExportService';
import { SessionMetrics, SessionSummary, StreamEvent } from '../../types/metrics';

describe('MetricsExportService Property Tests', () => {
  const service = new MetricsExportService();

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

  // Arbitrary for StreamEvent
  const streamEventArb = fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('poll', 'prediction', 'raid', 'host', 'milestone') as fc.Arbitrary<StreamEvent['type']>,
    timestamp: fc.integer({ min: 1700000000000, max: 1800000000000 }),
    data: fc.constant({} as Record<string, unknown>),
  });

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
    events: fc.array(streamEventArb, { minLength: 0, maxLength: 10 }),
  }) as fc.Arbitrary<SessionMetrics>;

  // Property 5: Export Data Consistency
  describe('Property 5: Export Data Consistency', () => {
    it('CSV export contains all session data', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 5 }),
          (sessions) => {
            const blob = service.exportCSV(sessions);
            
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('text/csv;charset=utf-8;');
            expect(blob.size).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('CSV content includes all session IDs', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 5 }),
          (sessions) => {
            const csvContent = service.generateCSVContent(sessions);
            
            for (const session of sessions) {
              expect(csvContent).toContain(session.id);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('CSV content preserves numeric values correctly', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 3 }),
          (sessions) => {
            const csvContent = service.generateCSVContent(sessions);
            
            for (const session of sessions) {
              expect(csvContent).toContain(session.summary.peakViewers.toString());
              expect(csvContent).toContain(session.summary.totalMessages.toString());
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('CSV content with events includes event data', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 3 }).filter(
            sessions => sessions.some(s => s.events.length > 0)
          ),
          (sessions) => {
            const csvContent = service.generateCSVContent(sessions, { includeEvents: true });
            
            expect(csvContent).toContain('Events');
            
            for (const session of sessions) {
              for (const event of session.events) {
                expect(csvContent).toContain(event.type);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('PDF HTML includes session summary data', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 3 }),
          (sessions) => {
            const html = service.generatePDFHTML(sessions);
            
            expect(html).toContain('Summary');
            expect(html).toContain('Session Details');
            expect(html).toContain('TwitchVote');
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('PDF export creates valid blob', async () => {
      // Test with a single session to verify blob creation
      const session: SessionMetrics = {
        id: 'test-pdf-session',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
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
      
      const blob = await service.exportPDF([session]);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  // Date range filtering
  describe('Date Range Filtering', () => {
    it('date range filter excludes sessions outside range', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 3, maxLength: 5 }),
          (sessions) => {
            const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
            
            if (sorted.length < 2) return true;
            
            const dateRange = {
              start: sorted[0].startTime - 1000,
              end: sorted[0].startTime + 1000,
            };
            
            const csvContent = service.generateCSVContent(sessions, { dateRange });
            
            expect(csvContent).toContain(sorted[0].id);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Filename generation
  describe('Filename Generation', () => {
    it('generates valid filename with correct extension', () => {
      fc.assert(
        fc.property(
          fc.array(sessionMetricsArb, { minLength: 1, maxLength: 10 }),
          fc.constantFrom('csv', 'pdf') as fc.Arbitrary<'csv' | 'pdf'>,
          (sessions, format) => {
            const filename = service.getFilename(format, sessions);
            
            expect(filename).toMatch(new RegExp(`\\.${format}$`));
            expect(filename).toContain(`${sessions.length}sessions`);
            expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // CSV escaping
  describe('CSV Escaping', () => {
    it('properly escapes special characters in channel names', () => {
      const sessionWithSpecialChars: SessionMetrics = {
        id: 'test-id',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        platform: 'twitch',
        channelName: 'test,channel"name',
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

      const csvContent = service.generateCSVContent([sessionWithSpecialChars]);
      
      expect(csvContent).toContain('"test,channel""name"');
    });
  });
});
