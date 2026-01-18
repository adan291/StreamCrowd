/**
 * Tests for useDebounce hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../src/application/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 300 });
    
    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Advance time by less than delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Advance time to complete delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Rapid updates
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });
    
    rerender({ value: 'd' });
    act(() => { vi.advanceTimersByTime(100); });

    // Still should be initial value
    expect(result.current).toBe('a');

    // Complete the delay from last update
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('d');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('should work with different types', () => {
    // Number
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );
    numRerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(numResult.current).toBe(42);

    // Object
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: obj1 } }
    );
    objRerender({ value: obj2 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(objResult.current).toEqual({ a: 2 });
  });

  it('should cleanup timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    
    // Unmount before timeout completes
    unmount();

    // Should not throw or cause issues
    act(() => { vi.advanceTimersByTime(300); });
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 100 });
    
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('updated');
  });
});
