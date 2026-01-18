import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useKiroBridge } from '@/hooks/useKiroBridge';

// Mock fetch
global.fetch = vi.fn();

// Mock environment variables
process.env.VITE_KIRO_API_URL = 'https://test-kiro-api.com';
process.env.VITE_KIRO_API_KEY = 'test-api-key';

describe('useKiroBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('should send request to Kiro API successfully', async () => {
    const mockResponse = {
      action: 'hype',
      mood: 'excited',
      response: 'Chat está emocionado!'
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useKiroBridge());

    let response;
    await act(async () => {
      response = await result.current.sendToKiro({
        hook: 'chat-brain',
        input: 'Test message',
        metadata: { test: true }
      });
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://test-kiro-api.com/hooks/chat-brain',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: expect.stringContaining('Test message')
      })
    );

    expect(response).toEqual({
      success: true,
      data: mockResponse,
      timestamp: expect.any(Number)
    });
  });

  it('should handle API errors', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const { result } = renderHook(() => useKiroBridge());

    await act(async () => {
      try {
        await result.current.sendToKiro({
          hook: 'chat-brain',
          input: 'Test message'
        });
      } catch (error) {
        expect(error).toEqual({
          success: false,
          error: 'Kiro API error: 500 Internal Server Error',
          timestamp: expect.any(Number)
        });
      }
    });

    expect(result.current.error).toBe('Kiro API error: 500 Internal Server Error');
  });

  it('should handle network errors with retry', async () => {
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    const { result } = renderHook(() => useKiroBridge());

    let response;
    await act(async () => {
      response = await result.current.sendToKiro({
        hook: 'chat-brain',
        input: 'Test message'
      });
    });

    // Should retry and succeed
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.success).toBe(true);
  });

  it('should set loading state correctly', async () => {
    (fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true })
      }), 100))
    );

    const { result } = renderHook(() => useKiroBridge());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.sendToKiro({
        hook: 'chat-brain',
        input: 'Test message'
      });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle missing API configuration', async () => {
    // Temporarily remove API URL
    const originalUrl = process.env.VITE_KIRO_API_URL;
    delete process.env.VITE_KIRO_API_URL;

    const { result } = renderHook(() => useKiroBridge());

    await act(async () => {
      try {
        await result.current.sendToKiro({
          hook: 'chat-brain',
          input: 'Test message'
        });
      } catch (error) {
        expect(error).toEqual({
          success: false,
          error: 'Kiro API URL not configured',
          timestamp: expect.any(Number)
        });
      }
    });

    // Restore API URL
    process.env.VITE_KIRO_API_URL = originalUrl;
  });
});