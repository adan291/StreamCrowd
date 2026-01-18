/**
 * Tests for useThrottle hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottle } from '../../src/application/hooks/useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('initial', 100));
    expect(result.current).toBe('initial');
  });

  it('should throttle value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 100),
      { initialProps: { value: 'a' } }
    );

    expect(result.current).toBe('a');

    // Update value - should schedule update
    rerender({ value: 'b' });
    
    // Value updates after interval
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('b');
  });

  it('should throttle rapid updates and use latest value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 100),
      { initialProps: { value: 'a' } }
    );

    // Rapid updates
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(30); });
    
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(30); });
    
    rerender({ value: 'd' });
    
    // Still initial value (throttled)
    expect(result.current).toBe('a');

    // Complete the interval - should have latest value
    act(() => { vi.advanceTimersByTime(40); });
    expect(result.current).toBe('d');
  });

  it('should use default interval of 100ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    
    // Not updated yet
    act(() => { vi.advanceTimersByTime(99); });
    expect(result.current).toBe('initial');

    // Updated after 100ms
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('should work with different types', () => {
    // Number
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value }) => useThrottle(value, 50),
      { initialProps: { value: 0 } }
    );
    numRerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(50); });
    expect(numResult.current).toBe(42);

    // Object
    const obj1 = { count: 1 };
    const obj2 = { count: 2 };
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useThrottle(value, 50),
      { initialProps: { value: obj1 } }
    );
    objRerender({ value: obj2 });
    act(() => { vi.advanceTimersByTime(50); });
    expect(objResult.current).toEqual({ count: 2 });
  });

  it('should cleanup timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useThrottle(value, 100),
      { initialProps: { value: 'initial' } }
    );

    // Trigger a pending update
    rerender({ value: 'updated' });

    // Unmount before timeout completes
    unmount();

    // Should not throw
    act(() => { vi.advanceTimersByTime(100); });
  });

  it('should handle interval changes', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }) => useThrottle(value, interval),
      { initialProps: { value: 'initial', interval: 200 } }
    );

    rerender({ value: 'updated', interval: 50 });
    
    // Should update with new interval
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toBe('updated');
  });

  it('should allow immediate update after interval passes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 100),
      { initialProps: { value: 'a' } }
    );

    // First update
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('b');

    // Wait for interval to pass completely
    act(() => { vi.advanceTimersByTime(100); });

    // Next update should happen quickly
    rerender({ value: 'c' });
    // Immediate update since interval passed
    expect(result.current).toBe('c');
  });
});
