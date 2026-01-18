/**
 * Tests for useThrottledCallback hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useThrottledCallback, 
  useThrottledCallbackWithCancel 
} from '../../src/application/hooks/useThrottledCallback';

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call immediately on first invocation (leading edge)', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    act(() => { result.current('first'); });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');
  });

  it('should throttle subsequent calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    act(() => { result.current('a'); });
    expect(callback).toHaveBeenCalledTimes(1);

    // Rapid calls within interval
    act(() => { 
      vi.advanceTimersByTime(30);
      result.current('b');
    });
    act(() => { 
      vi.advanceTimersByTime(30);
      result.current('c');
    });

    // Still only called once
    expect(callback).toHaveBeenCalledTimes(1);

    // Complete interval - trailing call
    act(() => { vi.advanceTimersByTime(40); });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('c');
  });

  it('should use default interval of 100ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback));

    act(() => { result.current('a'); });
    act(() => { result.current('b'); });
    
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(100); });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should respect leading: false option', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallback(callback, 100, { leading: false })
    );

    act(() => { result.current('first'); });
    
    // Should not call immediately
    expect(callback).not.toHaveBeenCalled();

    // Should call after interval
    act(() => { vi.advanceTimersByTime(100); });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');
  });

  it('should respect trailing: false option', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallback(callback, 100, { trailing: false })
    );

    act(() => { result.current('a'); });
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => { 
      vi.advanceTimersByTime(50);
      result.current('b');
    });

    // Wait for interval
    act(() => { vi.advanceTimersByTime(100); });
    
    // No trailing call
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    act(() => { result.current('arg1', 'arg2', 123); });
    
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should cleanup on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => 
      useThrottledCallback(callback, 100)
    );

    act(() => { result.current('a'); });
    act(() => { 
      vi.advanceTimersByTime(50);
      result.current('b');
    });
    
    unmount();
    
    act(() => { vi.advanceTimersByTime(100); });
    
    // Only the leading call should have happened
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should use latest callback reference', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ cb }) => useThrottledCallback(cb, 100),
      { initialProps: { cb: callback1 } }
    );

    act(() => { result.current('a'); });
    expect(callback1).toHaveBeenCalledTimes(1);

    // Change callback
    rerender({ cb: callback2 });

    act(() => { 
      vi.advanceTimersByTime(50);
      result.current('b');
    });

    act(() => { vi.advanceTimersByTime(50); });

    // Trailing call should use new callback
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith('b');
  });
});

describe('useThrottledCallbackWithCancel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should provide cancel functionality', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallbackWithCancel(callback, 100)
    );

    act(() => { result.current.throttledCallback('a'); });
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => { 
      vi.advanceTimersByTime(50);
      result.current.throttledCallback('b');
    });

    // Cancel pending trailing call
    act(() => { result.current.cancel(); });
    
    act(() => { vi.advanceTimersByTime(100); });
    
    // No trailing call
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should allow new calls after cancel', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallbackWithCancel(callback, 100)
    );

    act(() => { result.current.throttledCallback('a'); });
    act(() => { result.current.cancel(); });
    
    // Wait for interval to pass
    act(() => { vi.advanceTimersByTime(100); });

    // New call should work
    act(() => { result.current.throttledCallback('b'); });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');
  });

  it('should throttle calls correctly', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useThrottledCallbackWithCancel(callback, 100)
    );

    // First call - immediate
    act(() => { result.current.throttledCallback('a'); });
    expect(callback).toHaveBeenCalledTimes(1);

    // Call during throttle period
    act(() => { 
      vi.advanceTimersByTime(50);
      result.current.throttledCallback('b');
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Wait for trailing call
    act(() => { vi.advanceTimersByTime(50); });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');
  });
});
