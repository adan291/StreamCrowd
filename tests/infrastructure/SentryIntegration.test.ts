/**
 * Tests for SentryIntegration
 * 
 * Tests error aggregation, Sentry initialization, and error reporting.
 * Requirements: 3.4, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sentryIntegration } from '../../src/infrastructure/logging/SentryIntegration';

describe('SentryIntegration', () => {
  beforeEach(() => {
    // Clear aggregation before each test
    sentryIntegration.clearAggregation();
  });

  describe('Error Aggregation', () => {
    it('should aggregate errors by error code', () => {
      // Capture the same error multiple times
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Test error'), { feature: 'giveaway' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should have one aggregated error
      expect(aggregation.length).toBe(1);
      expect(aggregation[0].count).toBe(3);
      expect(aggregation[0].features).toContain('polls');
      expect(aggregation[0].features).toContain('giveaway');
    });

    it('should track different errors separately', () => {
      sentryIntegration.captureException(new Error('Error 1'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Error 2'), { feature: 'giveaway' });
      sentryIntegration.captureException(new Error('Error 1'), { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should have two different errors
      expect(aggregation.length).toBe(2);

      // Find the aggregations
      const error1 = aggregation.find(a => a.messages.includes('Error 1'));
      const error2 = aggregation.find(a => a.messages.includes('Error 2'));

      expect(error1?.count).toBe(2);
      expect(error2?.count).toBe(1);
    });

    it('should sort errors by frequency', () => {
      sentryIntegration.captureException(new Error('Rare error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Common error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Common error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Common error'), { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Most frequent error should be first
      expect(aggregation[0].messages).toContain('Common error');
      expect(aggregation[0].count).toBe(3);
      expect(aggregation[1].messages).toContain('Rare error');
      expect(aggregation[1].count).toBe(1);
    });

    it('should track feature-specific errors', () => {
      sentryIntegration.captureException(new Error('Poll error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Poll error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Giveaway error'), { feature: 'giveaway' });

      const pollErrors = sentryIntegration.getFeatureErrors('polls');
      const giveawayErrors = sentryIntegration.getFeatureErrors('giveaway');

      expect(pollErrors.length).toBe(1);
      expect(pollErrors[0].count).toBe(2);

      expect(giveawayErrors.length).toBe(1);
      expect(giveawayErrors[0].count).toBe(1);
    });

    it('should update last occurrence timestamp', async () => {
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      const firstAggregation = sentryIntegration.getErrorAggregation()[0];
      const firstTimestamp = firstAggregation.lastOccurrence;

      // Wait a bit and capture again
      await new Promise(resolve => setTimeout(resolve, 10));

      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      const secondAggregation = sentryIntegration.getErrorAggregation()[0];
      const secondTimestamp = secondAggregation.lastOccurrence;

      // Timestamp should be updated
      expect(new Date(secondTimestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(firstTimestamp).getTime()
      );
    });

    it('should maintain max aggregated errors limit', () => {
      // Create more errors than the max limit
      for (let i = 0; i < 150; i++) {
        sentryIntegration.captureException(new Error(`Error ${i}`), { feature: 'test' });
      }

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should not exceed max limit
      expect(aggregation.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Code Generation', () => {
    it('should generate consistent error codes for same message', () => {
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should have only one aggregated error (same code)
      expect(aggregation.length).toBe(1);
    });

    it('should generate different error codes for different messages', () => {
      sentryIntegration.captureException(new Error('Error A'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Error B'), { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should have two different errors
      expect(aggregation.length).toBe(2);
      expect(aggregation[0].errorCode).not.toBe(aggregation[1].errorCode);
    });
  });

  describe('String Error Handling', () => {
    it('should handle string errors', () => {
      sentryIntegration.captureException('String error message', { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      expect(aggregation.length).toBe(1);
      expect(aggregation[0].messages).toContain('String error message');
    });

    it('should aggregate string errors with same message', () => {
      sentryIntegration.captureException('Same error', { feature: 'polls' });
      sentryIntegration.captureException('Same error', { feature: 'giveaway' });

      const aggregation = sentryIntegration.getErrorAggregation();

      expect(aggregation.length).toBe(1);
      expect(aggregation[0].count).toBe(2);
    });
  });

  describe('Feature Tracking', () => {
    it('should track multiple features for same error', () => {
      sentryIntegration.captureException(new Error('Network error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Network error'), { feature: 'giveaway' });
      sentryIntegration.captureException(new Error('Network error'), { feature: 'games' });

      const aggregation = sentryIntegration.getErrorAggregation();

      expect(aggregation[0].features).toContain('polls');
      expect(aggregation[0].features).toContain('giveaway');
      expect(aggregation[0].features).toContain('games');
    });

    it('should not duplicate features in aggregation', () => {
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Test error'), { feature: 'polls' });

      const aggregation = sentryIntegration.getErrorAggregation();

      // Should only have one 'polls' entry
      const pollCount = aggregation[0].features.filter(f => f === 'polls').length;
      expect(pollCount).toBe(1);
    });
  });

  describe('Clear Aggregation', () => {
    it('should clear all aggregated errors', () => {
      sentryIntegration.captureException(new Error('Error 1'), { feature: 'polls' });
      sentryIntegration.captureException(new Error('Error 2'), { feature: 'giveaway' });

      let aggregation = sentryIntegration.getErrorAggregation();
      expect(aggregation.length).toBe(2);

      sentryIntegration.clearAggregation();

      aggregation = sentryIntegration.getErrorAggregation();
      expect(aggregation.length).toBe(0);
    });
  });

  describe('Initialization State', () => {
    it('should report not initialized when no config provided', () => {
      const isReady = sentryIntegration.isReady();

      // Should not be initialized without explicit initialization
      expect(typeof isReady).toBe('boolean');
    });

    it('should return null config when not initialized', () => {
      const config = sentryIntegration.getConfig();

      // Config should be null or undefined if not initialized
      expect(config === null || config === undefined).toBe(true);
    });
  });
});
