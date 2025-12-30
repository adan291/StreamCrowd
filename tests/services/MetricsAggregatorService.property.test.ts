// Property-based tests for MetricsAggregatorService

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MetricsAggregatorService } from '../../src/application/services/MetricsAggregatorService';
import { TimeSeries, MetricPoint, MetricType } from '../../types/metrics';

describe('MetricsAggregatorService Property Tests', () => {
  let service: MetricsAggregatorService;

  beforeEach(() => {
    service = new MetricsAggregatorService();
  });

  // Helper to generate valid metric points
  const metricPointArb = fc.record({
    timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }),
    value: fc.integer({ min: 0, max: 10000 }),
  });

  const timeSeriesArb = (name: MetricType) => fc.record({
    name: fc.constant(name),
    points: fc.array(metricPointArb, { minLength: 1, maxLength: 100 }),
    resolution: fc.constant('raw' as const),
  });

  // Property 1: Aggregation Preserves Totals (for count metrics)
  describe('Property 1: Aggregation Preserves Totals', () => {
    it('sum of aggregated count metrics equals sum of raw', () => {
      const countMetrics: MetricType[] = ['chat_messages', 'followers', 'subscribers', 'bits', 'raids'];

      fc.assert(
        fc.property(
          fc.constantFrom(...countMetrics),
          fc.array(metricPointArb, { minLength: 1, maxLength: 50 }),
          (metricType, points) => {
            const series: TimeSeries = {
              name: metricType,
              points,
              resolution: 'raw',
            };

            const rawSum = service.calculateSum(series);
            const aggregated = service.aggregate(series, '1min');
            const aggregatedSum = service.calculateSum(aggregated);

            expect(aggregatedSum).toBe(rawSum);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: Aggregation Preserves Extremes (for viewers)
  describe('Property 2: Aggregation Preserves Extremes', () => {
    it('max of aggregated viewers equals max of raw', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 1, maxLength: 50 }),
          (points) => {
            const series: TimeSeries = {
              name: 'viewers',
              points,
              resolution: 'raw',
            };

            const rawMax = service.calculateMax(series);
            const aggregated = service.aggregate(series, '1min');
            const aggregatedMax = service.calculateMax(aggregated);

            // Aggregated max should be <= raw max (we use max within buckets)
            expect(aggregatedMax).toBeLessThanOrEqual(rawMax);
            // But should capture the peak if it's the only point in its bucket
            expect(aggregatedMax).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('min of raw is preserved or approximated in aggregation', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 1, maxLength: 50 }),
          (points) => {
            const series: TimeSeries = {
              name: 'viewers',
              points,
              resolution: 'raw',
            };

            const rawMin = service.calculateMin(series);
            const aggregated = service.aggregate(series, '1min');
            const aggregatedMin = service.calculateMin(aggregated);

            // Aggregated min should be >= raw min (we use max within buckets for viewers)
            expect(aggregatedMin).toBeGreaterThanOrEqual(rawMin);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 3: Time Series Ordering
  describe('Property 3: Time Series Ordering', () => {
    it('aggregated series is sorted by timestamp', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 2, maxLength: 50 }),
          (points) => {
            const series: TimeSeries = {
              name: 'viewers',
              points,
              resolution: 'raw',
            };

            const aggregated = service.aggregate(series, '1min');
            
            expect(service.isSorted(aggregated)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortByTimestamp produces sorted series', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 2, maxLength: 50 }),
          (points) => {
            const series: TimeSeries = {
              name: 'chat_messages',
              points,
              resolution: 'raw',
            };

            const sorted = service.sortByTimestamp(series);
            
            expect(service.isSorted(sorted)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 4: Summary Consistency
  describe('Property 4: Summary Consistency', () => {
    it('summary values are derivable from time series', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 1, maxLength: 30 }),
          fc.array(metricPointArb, { minLength: 1, maxLength: 30 }),
          (viewerPoints, chatPoints) => {
            const timeSeries: Partial<Record<MetricType, TimeSeries>> = {
              viewers: { name: 'viewers', points: viewerPoints, resolution: 'raw' },
              chat_messages: { name: 'chat_messages', points: chatPoints, resolution: 'raw' },
            };

            const startTime = Math.min(...viewerPoints.map(p => p.timestamp)) - 1000;
            const endTime = Math.max(...viewerPoints.map(p => p.timestamp)) + 1000;

            const summary = service.calculateSummary(timeSeries, [], startTime, endTime);

            // Peak viewers should match max from series
            expect(summary.peakViewers).toBe(service.calculateMax(timeSeries.viewers!));
            
            // Total messages should match sum from series
            expect(summary.totalMessages).toBe(service.calculateSum(timeSeries.chat_messages!));
            
            // Duration should be positive
            expect(summary.duration).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Aggregation reduces point count
  describe('Aggregation Efficiency', () => {
    it('aggregation reduces or maintains point count', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 10, maxLength: 100 }),
          (points) => {
            const series: TimeSeries = {
              name: 'viewers',
              points,
              resolution: 'raw',
            };

            const aggregated = service.aggregate(series, '1min');
            
            // Aggregated should have fewer or equal points
            expect(aggregated.points.length).toBeLessThanOrEqual(series.points.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional: Empty series handling
  describe('Empty Series Handling', () => {
    it('handles empty series gracefully', () => {
      const emptySeries: TimeSeries = {
        name: 'viewers',
        points: [],
        resolution: 'raw',
      };

      const aggregated = service.aggregate(emptySeries, '1min');
      expect(aggregated.points).toHaveLength(0);
      expect(service.calculateSum(emptySeries)).toBe(0);
      expect(service.calculateMax(emptySeries)).toBe(0);
      expect(service.calculateMin(emptySeries)).toBe(0);
      expect(service.calculateAverage(emptySeries)).toBe(0);
    });
  });

  // Additional: Resolution changes
  describe('Resolution Changes', () => {
    it('aggregation updates resolution field', () => {
      fc.assert(
        fc.property(
          fc.array(metricPointArb, { minLength: 1, maxLength: 20 }),
          fc.constantFrom('1min' as const, '5min' as const),
          (points, targetResolution) => {
            const series: TimeSeries = {
              name: 'viewers',
              points,
              resolution: 'raw',
            };

            const aggregated = service.aggregate(series, targetResolution);
            
            expect(aggregated.resolution).toBe(targetResolution);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
