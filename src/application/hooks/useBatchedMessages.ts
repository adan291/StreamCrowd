/**
 * useBatchedMessages Hook
 * 
 * Batches incoming messages to reduce re-renders.
 * Instead of updating state on every message, it collects messages
 * and updates in batches at a configurable interval.
 * 
 * @example
 * const { messages, addMessage, clearMessages } = useBatchedMessages({
 *   maxMessages: 200,
 *   batchInterval: 100,
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseBatchedMessagesOptions<T> {
  /** Maximum number of messages to keep (default: 200) */
  maxMessages?: number;
  /** Batch interval in milliseconds (default: 100) */
  batchInterval?: number;
  /** Initial messages */
  initialMessages?: T[];
}

interface UseBatchedMessagesReturn<T> {
  /** Current messages */
  messages: T[];
  /** Add a single message (will be batched) */
  addMessage: (message: T) => void;
  /** Add multiple messages at once */
  addMessages: (messages: T[]) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Get pending message count (not yet flushed) */
  pendingCount: number;
}

export function useBatchedMessages<T>(
  options: UseBatchedMessagesOptions<T> = {}
): UseBatchedMessagesReturn<T> {
  const {
    maxMessages = 200,
    batchInterval = 100,
    initialMessages = [],
  } = options;

  const [messages, setMessages] = useState<T[]>(initialMessages);
  const pendingMessagesRef = useRef<T[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Flush pending messages to state
  const flushMessages = useCallback(() => {
    if (pendingMessagesRef.current.length === 0) return;

    const newMessages = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];
    setPendingCount(0);

    setMessages(prev => {
      const combined = [...prev, ...newMessages];
      // Keep only the last maxMessages
      return combined.slice(-maxMessages);
    });
  }, [maxMessages]);

  // Schedule a flush if not already scheduled
  const scheduleFlush = useCallback(() => {
    if (batchTimeoutRef.current) return;

    batchTimeoutRef.current = setTimeout(() => {
      flushMessages();
      batchTimeoutRef.current = null;
    }, batchInterval);
  }, [batchInterval, flushMessages]);

  // Add a single message
  const addMessage = useCallback((message: T) => {
    pendingMessagesRef.current.push(message);
    setPendingCount(pendingMessagesRef.current.length);
    scheduleFlush();
  }, [scheduleFlush]);

  // Add multiple messages at once
  const addMessages = useCallback((newMessages: T[]) => {
    pendingMessagesRef.current.push(...newMessages);
    setPendingCount(pendingMessagesRef.current.length);
    scheduleFlush();
  }, [scheduleFlush]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    pendingMessagesRef.current = [];
    setPendingCount(0);
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  // Flush any pending messages before unmount
  useEffect(() => {
    return () => {
      if (pendingMessagesRef.current.length > 0) {
        // Force flush on unmount
        flushMessages();
      }
    };
  }, [flushMessages]);

  return {
    messages,
    addMessage,
    addMessages,
    clearMessages,
    pendingCount,
  };
}

export default useBatchedMessages;
