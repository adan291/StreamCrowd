/**
 * Tests for useRetry Hook
 * 
 * Tests the React hook wrapper for retry logic.
 * 
 * @requirements 4.3 - Add isRetrying state
 * @requirements 4.4 - Add attempt counter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetry } from '@/src/presentation/hooks/useRetry';

describe('useRetry Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct state', () => {
    const fn = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(fn));

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.attempt).toBe(0);
    expect(result.current.error).toBe(null);
    expect(result.current.result).toBeUndefined();
  });

  it('should execute function successfully', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(fn));

    let res: string | undefined;
    await act(async () => {
      res = await result.current.execute();
    });

    expect(res).toBe('success');
    expect(result.current.result).toBe('success');
    expect(result.current.error).toBe(null);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should set isRetrying state during execution', async () => {
    const fn = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('success'), 100))
    );
    const { result } = renderHook(() => useRetry(fn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.isRetrying).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isRetrying).toBe(false);
  });

  it('should provide execute function that returns result', async () => {
    const fn = vi.fn().mockResolvedValue('test result');
    const { result } = renderHook(() => useRetry(fn));

    let returnedResult: string | undefined;
    await act(async () => {
      returnedResult = await result.current.execute();
    });

    expect(returnedResult).toBe('test result');
    expect(result.current.result).toBe('test result');
  });

  it('should have execute, isRetrying, attempt, and error properties', () => {
    const fn = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(fn));

    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.isRetrying).toBe('boolean');
    expect(typeof result.current.attempt).toBe('number');
    expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
  });
});
