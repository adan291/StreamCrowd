/**
 * Tests for useBatchedMessages hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchedMessages } from '../../src/application/hooks/useBatchedMessages';

describe('useBatchedMessages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useBatchedMessages<string>());
    expect(result.current.messages).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
  });

  it('should initialize with provided messages', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<string>({ initialMessages: ['a', 'b', 'c'] })
    );
    expect(result.current.messages).toEqual(['a', 'b', 'c']);
  });

  it('should batch messages before flushing', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<string>({ batchInterval: 100 })
    );

    act(() => {
      result.current.addMessage('msg1');
      result.current.addMessage('msg2');
      result.current.addMessage('msg3');
    });

    // Messages should be pending, not in state yet
    expect(result.current.messages).toEqual([]);
    expect(result.current.pendingCount).toBe(3);

    // Flush after interval
    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current.messages).toEqual(['msg1', 'msg2', 'msg3']);
    expect(result.current.pendingCount).toBe(0);
  });

  it('should respect maxMessages limit', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<number>({ maxMessages: 5, batchInterval: 50 })
    );

    act(() => {
      for (let i = 1; i <= 10; i++) {
        result.current.addMessage(i);
      }
    });

    act(() => { vi.advanceTimersByTime(50); });

    // Should only keep last 5 messages
    expect(result.current.messages).toEqual([6, 7, 8, 9, 10]);
  });

  it('should add multiple messages at once', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<string>({ batchInterval: 50 })
    );

    act(() => {
      result.current.addMessages(['a', 'b', 'c']);
    });

    expect(result.current.pendingCount).toBe(3);

    act(() => { vi.advanceTimersByTime(50); });

    expect(result.current.messages).toEqual(['a', 'b', 'c']);
  });

  it('should clear all messages', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<string>({ 
        initialMessages: ['existing'],
        batchInterval: 100 
      })
    );

    act(() => {
      result.current.addMessage('pending');
    });

    expect(result.current.messages).toEqual(['existing']);
    expect(result.current.pendingCount).toBe(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
  });

  it('should use default batch interval of 100ms', () => {
    const { result } = renderHook(() => useBatchedMessages<string>());

    act(() => {
      result.current.addMessage('test');
    });

    act(() => { vi.advanceTimersByTime(99); });
    expect(result.current.messages).toEqual([]);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.messages).toEqual(['test']);
  });

  it('should handle rapid message additions', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<number>({ batchInterval: 50 })
    );

    // Simulate rapid messages
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.addMessage(i);
      }
    });

    expect(result.current.pendingCount).toBe(100);

    act(() => { vi.advanceTimersByTime(50); });

    expect(result.current.messages.length).toBe(100);
  });

  it('should accumulate messages across multiple batches', () => {
    const { result } = renderHook(() => 
      useBatchedMessages<string>({ batchInterval: 50, maxMessages: 100 })
    );

    // First batch
    act(() => {
      result.current.addMessage('batch1-a');
      result.current.addMessage('batch1-b');
    });
    act(() => { vi.advanceTimersByTime(50); });

    expect(result.current.messages).toEqual(['batch1-a', 'batch1-b']);

    // Second batch
    act(() => {
      result.current.addMessage('batch2-a');
      result.current.addMessage('batch2-b');
    });
    act(() => { vi.advanceTimersByTime(50); });

    expect(result.current.messages).toEqual([
      'batch1-a', 'batch1-b', 'batch2-a', 'batch2-b'
    ]);
  });

  it('should work with complex objects', () => {
    interface Message {
      id: number;
      text: string;
    }

    const { result } = renderHook(() => 
      useBatchedMessages<Message>({ batchInterval: 50 })
    );

    act(() => {
      result.current.addMessage({ id: 1, text: 'Hello' });
      result.current.addMessage({ id: 2, text: 'World' });
    });

    act(() => { vi.advanceTimersByTime(50); });

    expect(result.current.messages).toEqual([
      { id: 1, text: 'Hello' },
      { id: 2, text: 'World' },
    ]);
  });

  it('should cleanup timeout on unmount', () => {
    const { result, unmount } = renderHook(() => 
      useBatchedMessages<string>({ batchInterval: 100 })
    );

    act(() => {
      result.current.addMessage('test');
    });

    // Unmount before flush
    unmount();

    // Should not throw
    act(() => { vi.advanceTimersByTime(100); });
  });
});
