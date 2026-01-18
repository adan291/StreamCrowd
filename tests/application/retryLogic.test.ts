/**
 * Tests for Retry Logic
 * 
 * Tests the withRetry function and useRetry hook for exponential backoff
 * and retry behavior.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.2 - Delay increases: 1s, 2s, 4s (exponential)
 * @requirements 4.6 - Maximum delay cap at 30 seconds
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRetry,
  calculateBackoffDelay,
  DEFAULT_RETRY_OPTIONS,
  type RetryOptions,
} from '@/src/application/utils/retryLogic';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate correct delay for first attempt', () => {
      const delay = calculateBackoffDelay(1, DEFAULT_RETRY_OPTIONS);
      expect(delay).toBe(1000); // 1s
    });

    it('should calculate correct delay for second attempt', () => {
      const delay = calculateBackoffDelay(2, DEFAULT_RETRY_OPTIONS);
      expect(delay).toBe(2000); // 2s
    });

    it('should calculate correct delay for third attempt', () => {
      const delay = calculateBackoffDelay(3, DEFAULT_RETRY_OPTIONS);
      expect(delay).toBe(4000); // 4s
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, DEFAULT_RETRY_OPTIONS);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_OPTIONS.maxDelayMs);
    });

    it('should respect custom multiplier', () => {
      const options = { ...DEFAULT_RETRY_OPTIONS, backoffMultiplier: 3 };
      const delay = calculateBackoffDelay(2, options);
      expect(delay).toBe(3000); // 1000 * 3^(2-1)
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxAttempts: 3 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const error = new Error('persistent failure');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = withRetry(fn, { maxAttempts: 3 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxAttempts: 3, onRetry });
      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should wait between retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxAttempts: 3, initialDelayMs: 1000 });

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe('success');
    });

    it('should use custom retry options', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, {
        maxAttempts: 5,
        initialDelayMs: 500,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should preserve error type', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('custom error');
      const fn = vi.fn().mockRejectedValue(error);

      try {
        await withRetry(fn, { maxAttempts: 1 });
      } catch (err) {
        expect(err).toBeInstanceOf(CustomError);
        expect((err as Error).message).toBe('custom error');
      }
    });
  });

  describe('Property 3: Retry Exponential Backoff', () => {
    it('should increase delays exponentially', async () => {
      const delays: number[] = [];
      const onRetry = vi.fn((attempt: number) => {
        const delay = calculateBackoffDelay(attempt, DEFAULT_RETRY_OPTIONS);
        delays.push(delay);
      });

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxAttempts: 3, onRetry });
      await vi.runAllTimersAsync();
      await promise;

      // Verify exponential growth
      expect(delays[0]).toBe(1000); // 1s
      expect(delays[1]).toBe(2000); // 2s
      expect(delays[1]).toBe(delays[0] * 2);
    });

    it('should cap delays at maximum', async () => {
      const delays: number[] = [];
      for (let i = 1; i <= 10; i++) {
        const delay = calculateBackoffDelay(i, DEFAULT_RETRY_OPTIONS);
        delays.push(delay);
      }

      // All delays should be <= maxDelayMs
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_OPTIONS.maxDelayMs);
      });

      // Later delays should be capped
      expect(delays[9]).toBe(DEFAULT_RETRY_OPTIONS.maxDelayMs);
    });
  });
});
