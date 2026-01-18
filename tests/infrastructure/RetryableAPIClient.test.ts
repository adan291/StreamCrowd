/**
 * Tests for Retryable API Client
 * 
 * Tests the RetryableAPIClient for HTTP requests with retry logic.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to API calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RetryableAPIClient,
  getRetryableAPIClient,
  resetRetryableAPIClient,
} from '@/src/infrastructure/api/RetryableAPIClient';
import { NetworkError } from '@/src/domain/errors/AppErrors';

describe('RetryableAPIClient', () => {
  let client: RetryableAPIClient;

  beforeEach(() => {
    vi.useFakeTimers();
    resetRetryableAPIClient();
    client = new RetryableAPIClient();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.get('/api/test');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', { method: 'GET' });
    });

    it('should retry on 500 error', async () => {
      const mockResponse = { data: 'success' };
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const promise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Bad request',
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const promise = client.get('/api/test');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(NetworkError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (rate limit)', async () => {
      const mockResponse = { data: 'success' };
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limited',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const promise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const mockResponse = { id: 1 };
      const body = { name: 'test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.post('/api/test', body);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should retry POST on 503 error', async () => {
      const mockResponse = { id: 1 };
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Service unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const promise = client.post('/api/test', { name: 'test' });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation with retry', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = client.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent error'));

      const promise = client.executeWithRetry(operation, 'test operation');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('persistent error');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customClient = new RetryableAPIClient({
        maxAttempts: 5,
        initialDelayMs: 500,
      });

      const config = customClient.getConfig();
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelayMs).toBe(500);
    });

    it('should update configuration', () => {
      client.updateConfig({ maxAttempts: 5 });
      const config = client.getConfig();
      expect(config.maxAttempts).toBe(5);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getRetryableAPIClient();
      const instance2 = getRetryableAPIClient();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getRetryableAPIClient();
      resetRetryableAPIClient();
      const instance2 = getRetryableAPIClient();
      expect(instance1).not.toBe(instance2);
    });
  });
});
