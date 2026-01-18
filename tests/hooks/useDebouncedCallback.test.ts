/**
 * Tests for useDebouncedCallback hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useDebouncedCallback, 
  useDebouncedCallbackWithControls 
} from '../../src/application/hooks/useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call multiple times rapidly
    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled();

    // Advance time
    act(() => { vi.advanceTimersByTime(300); });

    // Should be called once with last argument
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should reset timer on each call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => { result.current('a'); });
    act(() => { vi.advanceTimersByTime(200); });
    
    act(() => { result.current('b'); });
    act(() => { vi.advanceTimersByTime(200); });
    
    act(() => { result.current('c'); });
    
    // Still not called
    expect(callback).not.toHaveBeenCalled();

    // Complete delay from last call
    act(() => { vi.advanceTimersByTime(300); });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should use default delay of 300ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => { result.current(); });
    
    act(() => { vi.advanceTimersByTime(299); });
    expect(callback).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 100)
    );

    act(() => { result.current('arg1', 'arg2', 123); });
    act(() => { vi.advanceTimersByTime(100); });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should cleanup on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => 
      useDebouncedCallback(callback, 300)
    );

    act(() => { result.current(); });
    unmount();
    
    act(() => { vi.advanceTimersByTime(300); });
    
    // Should not be called after unmount
    expect(callback).not.toHaveBeenCalled();
  });

  it('should use latest callback reference', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 300),
      { initialProps: { cb: callback1 } }
    );

    act(() => { result.current(); });
    
    // Change callback before timeout
    rerender({ cb: callback2 });
    
    act(() => { vi.advanceTimersByTime(300); });

    // Should call the new callback
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});

describe('useDebouncedCallbackWithControls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should provide cancel functionality', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallbackWithControls(callback, 300)
    );

    act(() => { result.current.debouncedCallback('test'); });
    
    // Cancel before timeout
    act(() => { result.current.cancel(); });
    
    act(() => { vi.advanceTimersByTime(300); });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should provide flush functionality', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallbackWithControls(callback, 300)
    );

    act(() => { result.current.debouncedCallback('test'); });
    
    // Flush immediately
    act(() => { result.current.flush(); });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should provide isPending functionality', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallbackWithControls(callback, 300)
    );

    expect(result.current.isPending()).toBe(false);

    act(() => { result.current.debouncedCallback(); });
    expect(result.current.isPending()).toBe(true);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.isPending()).toBe(false);
  });

  it('should not flush if nothing is pending', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallbackWithControls(callback, 300)
    );

    act(() => { result.current.flush(); });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear pending state after cancel', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallbackWithControls(callback, 300)
    );

    act(() => { result.current.debouncedCallback('test'); });
    expect(result.current.isPending()).toBe(true);

    act(() => { result.current.cancel(); });
    expect(result.current.isPending()).toBe(false);

    // Flush should do nothing now
    act(() => { result.current.flush(); });
    expect(callback).not.toHaveBeenCalled();
  });
});
