/**
 * Tests for Firebase Retry Wrapper
 * 
 * Tests the FirebaseRetryWrapper for Firebase operations with retry logic.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Firebase calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FirebaseRetryWrapper,
  getFirebaseRetryWrapper,
  resetFirebaseRetryWrapper,
} from '@/src/infrastructure/firebase/FirebaseRetryWrapper';

describe('FirebaseRetryWrapper', () => {
  let wrapper: FirebaseRetryWrapper;

  beforeEach(() => {
    vi.useFakeTimers();
    resetFirebaseRetryWrapper();
    wrapper = new FirebaseRetryWrapper();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await wrapper.executeWithRetry(operation, 'test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const error = new Error('NETWORK_ERROR');
      (error as any).code = 'NETWORK_ERROR';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = wrapper.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw non-retryable error immediately', async () => {
      const error = new Error('INVALID_ARGUMENT');
      (error as any).code = 'INVALID_ARGUMENT';

      const operation = vi.fn().mockRejectedValue(error);

      const promise = wrapper.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('INVALID_ARGUMENT');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const error = new Error('SERVICE_UNAVAILABLE');
      (error as any).code = 'SERVICE_UNAVAILABLE';

      const operation = vi.fn().mockRejectedValue(error);

      const promise = wrapper.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('SERVICE_UNAVAILABLE');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('read', () => {
    it('should execute read operation', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await wrapper.read(operation, 'test read');

      expect(result).toEqual({ data: 'test' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry read on network error', async () => {
      const error = new Error('NETWORK_ERROR');
      (error as any).code = 'NETWORK_ERROR';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: 'test' });

      const promise = wrapper.read(operation, 'test read');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ data: 'test' });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('write', () => {
    it('should execute write operation', async () => {
      const operation = vi.fn().mockResolvedValue({ success: true });

      const result = await wrapper.write(operation, 'test write');

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry write on timeout', async () => {
      const error = new Error('TIMEOUT');
      (error as any).code = 'TIMEOUT';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true });

      const promise = wrapper.write(operation, 'test write');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('transaction', () => {
    it('should execute transaction', async () => {
      const operation = vi.fn().mockResolvedValue({ transactionId: '123' });

      const result = await wrapper.transaction(operation, 'test transaction');

      expect(result).toEqual({ transactionId: '123' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry transaction on service unavailable', async () => {
      const error = new Error('SERVICE_UNAVAILABLE');
      (error as any).code = 'SERVICE_UNAVAILABLE';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ transactionId: '123' });

      const promise = wrapper.transaction(operation, 'test transaction');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ transactionId: '123' });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customWrapper = new FirebaseRetryWrapper({
        maxAttempts: 5,
        initialDelayMs: 500,
      });

      const config = customWrapper.getConfig();
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelayMs).toBe(500);
    });

    it('should update configuration', () => {
      wrapper.updateConfig({ maxAttempts: 5 });
      const config = wrapper.getConfig();
      expect(config.maxAttempts).toBe(5);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getFirebaseRetryWrapper();
      const instance2 = getFirebaseRetryWrapper();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getFirebaseRetryWrapper();
      resetFirebaseRetryWrapper();
      const instance2 = getFirebaseRetryWrapper();
      expect(instance1).not.toBe(instance2);
    });
  });
});
