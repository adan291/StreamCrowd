/**
 * Tests for OBS Retry Wrapper
 * 
 * Tests the OBSRetryWrapper for OBS WebSocket operations with retry logic.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to OBS WebSocket
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OBSRetryWrapper,
  getOBSRetryWrapper,
  resetOBSRetryWrapper,
} from '@/src/infrastructure/obs/OBSRetryWrapper';

describe('OBSRetryWrapper', () => {
  let wrapper: OBSRetryWrapper;

  beforeEach(() => {
    vi.useFakeTimers();
    resetOBSRetryWrapper();
    wrapper = new OBSRetryWrapper();
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

    it('should retry on connection refused', async () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';

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

    it('should retry on timeout', async () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'ETIMEDOUT';

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

    it('should throw after max retries', async () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';

      const operation = vi.fn().mockRejectedValue(error);

      const promise = wrapper.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Connection reset');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('connect', () => {
    it('should execute connection operation', async () => {
      const operation = vi.fn().mockResolvedValue({ connected: true });

      const result = await wrapper.connect(operation, 'test connection');

      expect(result).toEqual({ connected: true });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry connection on network error', async () => {
      const error = new Error('Network error');
      (error as any).code = 'ENETUNREACH';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ connected: true });

      const promise = wrapper.connect(operation, 'test connection');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ connected: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('command', () => {
    it('should execute command operation', async () => {
      const operation = vi.fn().mockResolvedValue({ success: true });

      const result = await wrapper.command(operation, 'test command');

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry command on connection reset', async () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true });

      const promise = wrapper.command(operation, 'test command');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('query', () => {
    it('should execute query operation', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await wrapper.query(operation, 'test query');

      expect(result).toEqual({ data: 'test' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry query on timeout', async () => {
      const error = new Error('Query timeout');
      (error as any).code = 'ETIMEDOUT';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: 'test' });

      const promise = wrapper.query(operation, 'test query');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ data: 'test' });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customWrapper = new OBSRetryWrapper({
        maxAttempts: 5,
        initialDelayMs: 500,
        connectionTimeoutMs: 5000,
      });

      const config = customWrapper.getConfig();
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelayMs).toBe(500);
      expect(config.connectionTimeoutMs).toBe(5000);
    });

    it('should update configuration', () => {
      wrapper.updateConfig({ maxAttempts: 5 });
      const config = wrapper.getConfig();
      expect(config.maxAttempts).toBe(5);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getOBSRetryWrapper();
      const instance2 = getOBSRetryWrapper();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getOBSRetryWrapper();
      resetOBSRetryWrapper();
      const instance2 = getOBSRetryWrapper();
      expect(instance1).not.toBe(instance2);
    });
  });
});
