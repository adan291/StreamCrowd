/**
 * Redux Performance Tests
 * 
 * Tests for Redux performance characteristics:
 * - No unnecessary re-renders
 * - Selector memoization
 * - Action frequency and performance
 * 
 * @requirements 2.4, 2.6, 9.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';

// Import slices and selectors
import pollReducer, {
  createPoll,
  addVote,
  endPoll,
  selectActivePoll,
  selectActivePollOptions,
  selectActivePollTotalVotes,
  selectActivePollResults,
  selectActivePollWinner,
} from '../../src/application/state/slices/pollSlice';

import giveawayReducer, {
  createGiveaway,
  addParticipant,
  selectActiveGiveaway,
  selectParticipants,
} from '../../src/application/state/slices/giveawaySlice';

import { useAppSelector } from '../../src/application/state/hooks';

// Helper to create a test store
function createTestStore() {
  return configureStore({
    reducer: {
      poll: pollReducer,
      giveaway: giveawayReducer,
    },
  });
}

// Helper to create a wrapper with Redux Provider
function createWrapper(store: ReturnType<typeof createTestStore>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
}

describe('Redux Performance Tests', () => {
  describe('Requirement 2.4: No Unnecessary Re-renders', () => {
    it('should not re-render component when unrelated state changes', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      let renderCount = 0;
      
      // Create a hook that only selects active poll
      const { result, rerender } = renderHook(
        () => {
          renderCount++;
          return useAppSelector(selectActivePoll);
        },
        { wrapper }
      );
      
      // Initial render
      expect(renderCount).toBe(1);
      expect(result.current).toBeNull();
      
      // Create a poll - should trigger re-render
      act(() => {
        store.dispatch(createPoll({
          title: 'Test Poll',
          options: [
            { id: '1', text: 'Option 1', votes: 0 },
            { id: '2', text: 'Option 2', votes: 0 },
          ],
        }));
      });
      
      // Should have re-rendered
      expect(renderCount).toBe(2);
      expect(result.current).not.toBeNull();
      
      // Create a giveaway (unrelated state) - should NOT trigger re-render
      const renderCountBeforeGiveaway = renderCount;
      act(() => {
        store.dispatch(createGiveaway({ title: 'Test Giveaway' }));
      });
      
      // Should NOT have re-rendered because we're only selecting poll state
      expect(renderCount).toBe(renderCountBeforeGiveaway);
    });

    it('should only re-render when selected slice changes', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      let pollRenderCount = 0;
      let giveawayRenderCount = 0;
      
      // Hook that selects poll state
      const pollHook = renderHook(
        () => {
          pollRenderCount++;
          return useAppSelector(selectActivePoll);
        },
        { wrapper }
      );
      
      // Hook that selects giveaway state
      const giveawayHook = renderHook(
        () => {
          giveawayRenderCount++;
          return useAppSelector(selectActiveGiveaway);
        },
        { wrapper }
      );
      
      // Initial renders
      expect(pollRenderCount).toBe(1);
      expect(giveawayRenderCount).toBe(1);
      
      // Update poll state
      act(() => {
        store.dispatch(createPoll({
          title: 'Test Poll',
          options: [{ id: '1', text: 'Option 1', votes: 0 }],
        }));
      });
      
      // Only poll hook should re-render
      expect(pollRenderCount).toBe(2);
      expect(giveawayRenderCount).toBe(1);
      
      // Update giveaway state
      act(() => {
        store.dispatch(createGiveaway({ title: 'Test Giveaway' }));
      });
      
      // Only giveaway hook should re-render
      expect(pollRenderCount).toBe(2);
      expect(giveawayRenderCount).toBe(2);
    });

    it('should not re-render when state value remains the same', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      // Create initial poll
      act(() => {
        store.dispatch(createPoll({
          title: 'Test Poll',
          options: [{ id: '1', text: 'Option 1', votes: 0 }],
        }));
      });
      
      let renderCount = 0;
      
      // Hook that selects poll title
      const { result } = renderHook(
        () => {
          renderCount++;
          return useAppSelector((state) => state.poll.active?.title);
        },
        { wrapper }
      );
      
      // Initial render
      expect(renderCount).toBe(1);
      expect(result.current).toBe('Test Poll');
      
      // Add a vote (changes poll state but not title)
      act(() => {
        store.dispatch(addVote({ optionId: '1' }));
      });
      
      // Should NOT re-render because title didn't change
      // React-Redux uses shallow equality check
      expect(renderCount).toBe(1);
    });
  });

  describe('Requirement 2.6: Selector Memoization', () => {
    it('should memoize selector results when state unchanged', () => {
      const store = createTestStore();
      
      // Create a poll
      store.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 5 },
          { id: '2', text: 'Option 2', votes: 3 },
        ],
      }));
      
      const state = store.getState();
      
      // Call selector multiple times
      const result1 = selectActivePollOptions(state);
      const result2 = selectActivePollOptions(state);
      const result3 = selectActivePollOptions(state);
      
      // Should return the same reference (memoized)
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should recompute selector when dependencies change', () => {
      const store = createTestStore();
      
      // Create a poll
      store.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 5 },
          { id: '2', text: 'Option 2', votes: 3 },
        ],
      }));
      
      const state1 = store.getState();
      const result1 = selectActivePollOptions(state1);
      
      // Add a vote (changes state)
      store.dispatch(addVote({ optionId: '1' }));
      
      const state2 = store.getState();
      const result2 = selectActivePollOptions(state2);
      
      // Should return different reference (recomputed)
      expect(result1).not.toBe(result2);
      
      // But values should be different
      expect(result1[0].votes).toBe(5);
      expect(result2[0].votes).toBe(6);
    });

    it('should memoize derived selectors efficiently', () => {
      const store = createTestStore();
      
      // Create a poll with votes
      store.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 10 },
          { id: '2', text: 'Option 2', votes: 5 },
          { id: '3', text: 'Option 3', votes: 15 },
        ],
      }));
      
      const state = store.getState();
      
      // Call derived selectors multiple times
      const totalVotes1 = selectActivePollTotalVotes(state);
      const totalVotes2 = selectActivePollTotalVotes(state);
      
      const results1 = selectActivePollResults(state);
      const results2 = selectActivePollResults(state);
      
      const winner1 = selectActivePollWinner(state);
      const winner2 = selectActivePollWinner(state);
      
      // Should return same values (memoized)
      expect(totalVotes1).toBe(totalVotes2);
      expect(totalVotes1).toBe(30);
      
      expect(results1).toBe(results2);
      expect(results1[0].text).toBe('Option 3'); // Highest votes
      
      expect(winner1).toBe(winner2);
      expect(winner1?.text).toBe('Option 3');
    });

    it('should not recompute derived selectors when unrelated state changes', () => {
      const store = createTestStore();
      
      // Create a poll
      store.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 10 },
          { id: '2', text: 'Option 2', votes: 5 },
        ],
      }));
      
      const state1 = store.getState();
      const totalVotes1 = selectActivePollTotalVotes(state1);
      const results1 = selectActivePollResults(state1);
      
      // Change unrelated state (giveaway)
      store.dispatch(createGiveaway({ title: 'Test Giveaway' }));
      
      const state2 = store.getState();
      const totalVotes2 = selectActivePollTotalVotes(state2);
      const results2 = selectActivePollResults(state2);
      
      // Should return same references (memoized, poll state unchanged)
      expect(totalVotes1).toBe(totalVotes2);
      expect(results1).toBe(results2);
    });

    it('should measure selector performance with large datasets', () => {
      const store = createTestStore();
      
      // Create a poll with many options
      const options = Array.from({ length: 1000 }, (_, i) => ({
        id: `opt-${i}`,
        text: `Option ${i}`,
        votes: Math.floor(Math.random() * 100),
      }));
      
      store.dispatch(createPoll({
        title: 'Large Poll',
        options,
      }));
      
      const state = store.getState();
      
      // Measure first call (computation)
      const start1 = performance.now();
      const result1 = selectActivePollResults(state);
      const duration1 = performance.now() - start1;
      
      // Measure second call (should be memoized)
      const start2 = performance.now();
      const result2 = selectActivePollResults(state);
      const duration2 = performance.now() - start2;
      
      // Memoized call should be significantly faster
      expect(result1).toBe(result2);
      expect(duration2).toBeLessThan(duration1);
      
      // Memoized call should be very fast (< 1ms)
      expect(duration2).toBeLessThan(1);
    });
  });

  describe('Requirement 9.4: Component Re-render Optimization', () => {
    it('should minimize re-renders with specific selectors', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      // Create a poll
      act(() => {
        store.dispatch(createPoll({
          title: 'Test Poll',
          options: [
            { id: '1', text: 'Option 1', votes: 0 },
            { id: '2', text: 'Option 2', votes: 0 },
          ],
        }));
      });
      
      let specificRenderCount = 0;
      let broadRenderCount = 0;
      
      // Hook with specific selector (only title)
      const specificHook = renderHook(
        () => {
          specificRenderCount++;
          return useAppSelector((state) => state.poll.active?.title);
        },
        { wrapper }
      );
      
      // Hook with broad selector (entire poll)
      const broadHook = renderHook(
        () => {
          broadRenderCount++;
          return useAppSelector(selectActivePoll);
        },
        { wrapper }
      );
      
      // Initial renders
      expect(specificRenderCount).toBe(1);
      expect(broadRenderCount).toBe(1);
      
      // Add votes (changes poll but not title)
      act(() => {
        store.dispatch(addVote({ optionId: '1' }));
        store.dispatch(addVote({ optionId: '1' }));
        store.dispatch(addVote({ optionId: '2' }));
      });
      
      // Specific selector should NOT re-render (title unchanged)
      expect(specificRenderCount).toBe(1);
      
      // Broad selector WILL re-render (poll object changed)
      expect(broadRenderCount).toBeGreaterThan(1);
    });

    it('should handle rapid state updates efficiently', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      // Create a poll
      act(() => {
        store.dispatch(createPoll({
          title: 'Test Poll',
          options: [
            { id: '1', text: 'Option 1', votes: 0 },
            { id: '2', text: 'Option 2', votes: 0 },
          ],
        }));
      });
      
      let renderCount = 0;
      
      const { result } = renderHook(
        () => {
          renderCount++;
          return useAppSelector(selectActivePollTotalVotes);
        },
        { wrapper }
      );
      
      // Initial render
      expect(renderCount).toBe(1);
      expect(result.current).toBe(0);
      
      // Dispatch many votes rapidly
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          store.dispatch(addVote({ optionId: i % 2 === 0 ? '1' : '2' }));
        }
      });
      
      const duration = performance.now() - startTime;
      
      // Should handle rapid updates efficiently (< 100ms)
      expect(duration).toBeLessThan(100);
      
      // Should have final correct value
      expect(result.current).toBe(100);
      
      // Render count should be reasonable (not 100+)
      // React batches updates, so we expect fewer renders
      expect(renderCount).toBeLessThan(20);
    });
  });

  describe('Action Frequency and Performance', () => {
    it('should handle high-frequency actions efficiently', () => {
      const store = createTestStore();
      
      // Create a poll
      store.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 0 },
          { id: '2', text: 'Option 2', votes: 0 },
        ],
      }));
      
      // Measure time to dispatch many actions
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        store.dispatch(addVote({ optionId: i % 2 === 0 ? '1' : '2' }));
      }
      
      const duration = performance.now() - startTime;
      
      // Should handle 1000 actions quickly (< 100ms)
      expect(duration).toBeLessThan(100);
      
      // Verify final state is correct
      const state = store.getState();
      const totalVotes = selectActivePollTotalVotes(state);
      expect(totalVotes).toBe(1000);
    });

    it('should maintain performance with large state', () => {
      const store = createTestStore();
      
      // Create a giveaway
      store.dispatch(createGiveaway({ title: 'Large Giveaway' }));
      
      // Add many participants
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        store.dispatch(addParticipant({
          username: `user${i}`,
          platform: i % 2 === 0 ? 'twitch' : 'youtube',
        }));
      }
      
      const duration = performance.now() - startTime;
      
      // Should handle large state efficiently (< 500ms for 1000 operations)
      // Note: Performance may vary based on system, so we use a reasonable threshold
      expect(duration).toBeLessThan(500);
      
      // Verify state is correct
      const state = store.getState();
      const participants = selectParticipants(state);
      expect(participants.length).toBe(1000);
    });

    it('should measure selector performance under load', () => {
      const store = createTestStore();
      
      // Create a poll with many options
      const options = Array.from({ length: 500 }, (_, i) => ({
        id: `opt-${i}`,
        text: `Option ${i}`,
        votes: Math.floor(Math.random() * 1000),
      }));
      
      store.dispatch(createPoll({
        title: 'Performance Test Poll',
        options,
      }));
      
      const state = store.getState();
      
      // Measure selector performance
      const measurements: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        selectActivePollResults(state);
        const duration = performance.now() - start;
        measurements.push(duration);
      }
      
      // Calculate average
      const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      
      // Average should be very fast due to memoization (< 0.1ms)
      expect(average).toBeLessThan(0.1);
      
      // First call might be slower, but subsequent calls should be instant
      expect(measurements[99]).toBeLessThan(0.05);
    });
  });

  describe('Memory and Performance Benchmarks', () => {
    it('should not leak memory with repeated actions', () => {
      const store = createTestStore();
      
      // Create and end many polls
      for (let i = 0; i < 100; i++) {
        store.dispatch(createPoll({
          title: `Poll ${i}`,
          options: [
            { id: '1', text: 'Option 1', votes: 0 },
            { id: '2', text: 'Option 2', votes: 0 },
          ],
        }));
        
        // Add some votes
        for (let j = 0; j < 10; j++) {
          store.dispatch(addVote({ optionId: '1' }));
        }
        
        // End the poll to move it to history
        store.dispatch(endPoll());
      }
      
      const state = store.getState();
      
      // History should contain polls (we ended them)
      expect(state.poll.history.length).toBe(100);
      
      // State should be reasonable size (not growing unbounded)
      const stateSize = JSON.stringify(state).length;
      expect(stateSize).toBeLessThan(1000000); // < 1MB
    });

    it('should perform well with concurrent selector calls', () => {
      const store = createTestStore();
      
      // Create a poll
      store.dispatch(createPoll({
        title: 'Concurrent Test',
        options: Array.from({ length: 100 }, (_, i) => ({
          id: `opt-${i}`,
          text: `Option ${i}`,
          votes: i,
        })),
      }));
      
      const state = store.getState();
      
      // Call multiple selectors concurrently
      const startTime = performance.now();
      
      const results = Promise.all([
        Promise.resolve(selectActivePollOptions(state)),
        Promise.resolve(selectActivePollTotalVotes(state)),
        Promise.resolve(selectActivePollResults(state)),
        Promise.resolve(selectActivePollWinner(state)),
      ]);
      
      const duration = performance.now() - startTime;
      
      // Should be very fast (< 5ms)
      expect(duration).toBeLessThan(5);
      
      return results.then(([options, total, results, winner]) => {
        expect(options.length).toBe(100);
        expect(total).toBeGreaterThan(0);
        expect(results.length).toBe(100);
        expect(winner).toBeDefined();
      });
    });
  });
});
