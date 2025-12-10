/**
 * Property-based tests for useAIAnalytics hook
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useAIAnalytics } from '../../hooks/useAIAnalytics';

// Arbitrary for generating valid channel names
const channelNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

// Arbitrary for generating stored messages
const storedMessageArb = fc.record({
  username: fc.string({ minLength: 1, maxLength: 50 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.integer({ min: 0 }),
  userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

// Arbitrary for generating poll summaries
const pollSummaryArb = fc.record({
  question: fc.string({ minLength: 1, maxLength: 200 }),
  winner: fc.string({ minLength: 1, maxLength: 100 }),
  totalVotes: fc.integer({ min: 0, max: 10000 }),
  options: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 100 }),
      votes: fc.integer({ min: 0, max: 10000 }),
      percentage: fc.float({ min: 0, max: 100 }),
    }),
    { minLength: 2, maxLength: 10 }
  ),
});

describe('useAIAnalytics Property Tests', () => {
  // Store original localStorage
  let originalLocalStorage: Storage;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    // Create a mock localStorage for testing
    mockStorage = new Map<string, string>();
    originalLocalStorage = global.localStorage;

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      get length() {
        return mockStorage.size;
      },
      key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    };

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    mockStorage.clear();
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  /**
   * **Feature: app-refactoring, Property 11: useAIAnalytics Session Lifecycle**
   *
   * *For any* stream session, ending it should result in the session having an endTime set.
   *
   * **Validates: Requirements 7.3**
   */
  describe('Property 11: useAIAnalytics Session Lifecycle', () => {
    it('should set endTime when session is ended', () => {
      fc.assert(
        fc.property(channelNameArb, (channelName) => {
          const { result } = renderHook(() => useAIAnalytics());

          // Start a session
          act(() => {
            result.current.startSession(channelName);
          });

          // Verify session is created without endTime
          expect(result.current.currentSession).not.toBeNull();
          expect(result.current.currentSession!.channelName).toBe(channelName);
          expect(result.current.currentSession!.endTime).toBeUndefined();

          // End the session
          act(() => {
            result.current.endSession();
          });

          // Session should be cleared from current state
          expect(result.current.currentSession).toBeNull();

          // Verify session was saved with endTime (check localStorage)
          const savedSessions = mockStorage.get('twitch_stream_sessions');
          expect(savedSessions).toBeDefined();

          const sessions = JSON.parse(savedSessions!);
          const savedSession = sessions.find(
            (s: { channelName: string }) => s.channelName === channelName
          );
          expect(savedSession).toBeDefined();
          expect(savedSession.endTime).toBeDefined();
          expect(typeof savedSession.endTime).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('should create session with correct initial state', () => {
      fc.assert(
        fc.property(channelNameArb, (channelName) => {
          const { result } = renderHook(() => useAIAnalytics());

          // Start a session
          act(() => {
            result.current.startSession(channelName);
          });

          // Verify session has correct initial state
          const session = result.current.currentSession;
          expect(session).not.toBeNull();
          expect(session!.channelName).toBe(channelName);
          expect(session!.id).toMatch(/^session_\d+$/);
          expect(session!.startTime).toBeDefined();
          expect(typeof session!.startTime).toBe('number');
          expect(session!.messages).toEqual([]);
          expect(session!.pollResults).toEqual([]);
          expect(session!.endTime).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should accumulate messages in session', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          fc.array(storedMessageArb, { minLength: 1, maxLength: 20 }),
          (channelName, messages) => {
            const { result } = renderHook(() => useAIAnalytics());

            // Start a session
            act(() => {
              result.current.startSession(channelName);
            });

            // Add messages
            for (const msg of messages) {
              act(() => {
                result.current.addMessageToSession(msg);
              });
            }

            // Verify messages were added
            expect(result.current.currentSession!.messages.length).toBe(messages.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accumulate poll results in session', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          fc.array(pollSummaryArb, { minLength: 1, maxLength: 5 }),
          (channelName, pollResults) => {
            const { result } = renderHook(() => useAIAnalytics());

            // Start a session
            act(() => {
              result.current.startSession(channelName);
            });

            // Add poll results
            for (const poll of pollResults) {
              act(() => {
                result.current.addPollResultToSession(poll);
              });
            }

            // Verify poll results were added
            expect(result.current.currentSession!.pollResults!.length).toBe(pollResults.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve messages and poll results when session ends', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          fc.array(storedMessageArb, { minLength: 1, maxLength: 10 }),
          fc.array(pollSummaryArb, { minLength: 1, maxLength: 3 }),
          (channelName, messages, pollResults) => {
            // Clear storage before each iteration to isolate tests
            mockStorage.clear();
            
            const { result } = renderHook(() => useAIAnalytics());

            // Start a session
            act(() => {
              result.current.startSession(channelName);
            });

            // Capture the session ID for later lookup
            const sessionId = result.current.currentSession!.id;

            // Add messages and poll results
            for (const msg of messages) {
              act(() => {
                result.current.addMessageToSession(msg);
              });
            }
            for (const poll of pollResults) {
              act(() => {
                result.current.addPollResultToSession(poll);
              });
            }

            // End the session
            act(() => {
              result.current.endSession();
            });

            // Verify saved session has all data
            const savedSessions = mockStorage.get('twitch_stream_sessions');
            const sessions = JSON.parse(savedSessions!);
            // Find by session ID instead of channel name to avoid conflicts
            const savedSession = sessions.find(
              (s: { id: string }) => s.id === sessionId
            );

            expect(savedSession.messages.length).toBe(messages.length);
            expect(savedSession.pollResults.length).toBe(pollResults.length);
            expect(savedSession.endTime).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle ending session when no session is active', () => {
      const { result } = renderHook(() => useAIAnalytics());

      // End session without starting one - should not throw
      act(() => {
        result.current.endSession();
      });

      expect(result.current.currentSession).toBeNull();
    });

    it('should not add messages when no session is active', () => {
      fc.assert(
        fc.property(storedMessageArb, (message) => {
          const { result } = renderHook(() => useAIAnalytics());

          // Try to add message without starting session
          act(() => {
            result.current.addMessageToSession(message);
          });

          // Session should still be null
          expect(result.current.currentSession).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });
});
