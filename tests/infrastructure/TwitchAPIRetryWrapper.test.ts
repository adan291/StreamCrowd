/**
 * Tests for Twitch API Retry Wrapper
 * 
 * Tests the TwitchAPIRetryWrapper for Twitch API calls with retry logic.
 * 
 * @requirements 4.1 - Retry up to 3 times with exponential backoff
 * @requirements 4.5 - Add retry to Twitch API calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TwitchAPIRetryWrapper,
  getTwitchAPIRetryWrapper,
  resetTwitchAPIRetryWrapper,
} from '@/src/infrastructure/adapters/TwitchAPIRetryWrapper';

describe('TwitchAPIRetryWrapper', () => {
  let wrapper: TwitchAPIRetryWrapper;

  beforeEach(() => {
    vi.useFakeTimers();
    resetTwitchAPIRetryWrapper();
    wrapper = new TwitchAPIRetryWrapper();
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

      const result = await wrapper.get('/api/test', 'test-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
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

      const promise = wrapper.get('/api/test', 'test-token');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
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

      const promise = wrapper.get('/api/test', 'test-token');
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

      const result = await wrapper.post('/api/test', 'test-token', body);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
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

      const promise = wrapper.post('/api/test', 'test-token', { name: 'test' });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Helper methods', () => {
    it('should get user with retry', async () => {
      const mockResponse = { id: '123', login: 'testuser' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await wrapper.getUser('testuser', 'test-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('login=testuser'),
        expect.any(Object)
      );
    });

    it('should get channel with retry', async () => {
      const mockResponse = { broadcaster_id: '123', game_name: 'Test Game' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await wrapper.getChannel('123', 'test-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('broadcaster_id=123'),
        expect.any(Object)
      );
    });

    it('should ban user with retry', async () => {
      const mockResponse = { data: [{ user_id: '456' }] };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await wrapper.banUser('123', '789', '456', 'test-token', 'spam', 3600);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('broadcaster_id=123'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Token cleaning', () => {
    it('should clean oauth: prefix from token', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await wrapper.get('/api/test', 'oauth:test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customWrapper = new TwitchAPIRetryWrapper({
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
      const instance1 = getTwitchAPIRetryWrapper();
      const instance2 = getTwitchAPIRetryWrapper();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getTwitchAPIRetryWrapper();
      resetTwitchAPIRetryWrapper();
      const instance2 = getTwitchAPIRetryWrapper();
      expect(instance1).not.toBe(instance2);
    });
  });
});
