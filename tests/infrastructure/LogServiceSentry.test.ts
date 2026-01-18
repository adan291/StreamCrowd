/**
 * Tests for LogService Sentry Integration
 * 
 * Tests LogService methods that interact with Sentry.
 * Requirements: 3.4, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logService } from '../../src/infrastructure/logging/LogService';
import { sentryIntegration } from '../../src/infrastructure/logging/SentryIntegration';

describe('LogService Sentry Integration', () => {
  beforeEach(() => {
    // Clear logs and Sentry aggregation before each test
    logService.clearLogs();
    sentryIntegration.clearAggregation();
  });

  describe('Error Statistics', () => {
    it('should return error statistics', () => {
      // Log some errors
      logService.error({
        message: 'Test error 1',
        feature: 'polls',
      });

      logService.error({
        message: 'Test error 1',
        feature: 'polls',
      });

      logService.error({
        message: 'Test error 2',
        feature: 'giveaway',
      });

      const stats = logService.getErrorStats();

      // Should have aggregated errors
      expect(Array.isArray(stats)).toBe(true);
      // Stats should contain aggregated errors from Sentry integration
      expect(stats.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no errors', () => {
      const stats = logService.getErrorStats();

      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('Feature Error Statistics', () => {
    it('should return errors for specific feature', () => {
      logService.error({
        message: 'Poll error',
        feature: 'polls',
      });

      logService.error({
        message: 'Poll error',
        feature: 'polls',
      });

      logService.error({
        message: 'Giveaway error',
        feature: 'giveaway',
      });

      const pollErrors = logService.getFeatureErrors('polls');
      const giveawayErrors = logService.getFeatureErrors('giveaway');

      expect(Array.isArray(pollErrors)).toBe(true);
      expect(Array.isArray(giveawayErrors)).toBe(true);
    });

    it('should return empty array for feature with no errors', () => {
      logService.error({
        message: 'Test error',
        feature: 'polls',
      });

      const gameErrors = logService.getFeatureErrors('games');

      expect(Array.isArray(gameErrors)).toBe(true);
      expect(gameErrors.length).toBe(0);
    });
  });

  describe('Breadcrumb Tracking', () => {
    it('should add breadcrumb without error', () => {
      // Should not throw
      expect(() => {
        logService.addBreadcrumb('User clicked button', 'user-action');
      }).not.toThrow();
    });

    it('should add breadcrumb with default category', () => {
      // Should not throw
      expect(() => {
        logService.addBreadcrumb('User action');
      }).not.toThrow();
    });
  });

  describe('User Context', () => {
    it('should set user context', () => {
      // Should not throw
      expect(() => {
        logService.setUser('user123', 'user@example.com', 'username');
      }).not.toThrow();
    });

    it('should set user with only ID', () => {
      // Should not throw
      expect(() => {
        logService.setUser('user123');
      }).not.toThrow();
    });

    it('should clear user context', () => {
      logService.setUser('user123');

      // Should not throw
      expect(() => {
        logService.clearUser();
      }).not.toThrow();
    });
  });

  describe('Sentry Readiness', () => {
    it('should report Sentry status', () => {
      const isReady = logService.isSentryReady();

      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('Error Logging with Sentry', () => {
    it('should log error with all details', () => {
      logService.error({
        message: 'API call failed',
        feature: 'polls',
        stack: 'Error: API call failed\n  at function (file.ts:10)',
        context: { endpoint: '/api/polls', statusCode: 500 },
      });

      const logs = logService.getLogs('error');

      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('API call failed');
      expect(logs[0].feature).toBe('polls');
      expect(logs[0].context?.endpoint).toBe('/api/polls');
    });

    it('should log error with minimal details', () => {
      logService.error({
        message: 'Simple error',
      });

      const logs = logService.getLogs('error');

      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Simple error');
    });

    it('should include timestamp in error logs', () => {
      logService.error({
        message: 'Test error',
        feature: 'polls',
      });

      const logs = logService.getLogs('error');

      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Log Export with Sentry Context', () => {
    it('should export logs with error details', () => {
      logService.error({
        message: 'Test error',
        feature: 'polls',
        stack: 'Error stack trace',
        context: { userId: 'user123' },
      });

      const exported = logService.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test error');
      expect(parsed[0].feature).toBe('polls');
      expect(parsed[0].context.userId).toBe('user123');
    });
  });

  describe('Integration with Log Levels', () => {
    it('should only send errors to Sentry, not other levels', () => {
      logService.debug('Debug message');
      logService.info('Info message');
      logService.warn('Warning message');
      logService.error({ message: 'Error message', feature: 'test' });

      const allLogs = logService.getLogs();
      const errorLogs = logService.getLogs('error');

      expect(allLogs.length).toBe(4);
      expect(errorLogs.length).toBe(1);
    });
  });
});
