/**
 * usePoll Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for poll feature.
 * Provides a clean API for components to interact with poll state.
 * 
 * @requirements 9.3, 9.4
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  createPoll,
  addVote,
  endPoll,
  resetPoll,
  setCreating,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
  selectActivePoll,
  selectPollHistory,
  selectPollError,
  selectPollCreating,
  selectActivePollOptions,
  selectActivePollTotalVotes,
  selectActivePollResults,
  selectActivePollWinner,
  selectPollHistoryCount,
  type Poll,
  type PollOption,
} from '../state/slices/pollSlice';

export interface UsePollReturn {
  // State
  activePoll: Poll | null;
  history: Poll[];
  error: string | null;
  isCreating: boolean;
  options: PollOption[];
  totalVotes: number;
  results: PollOption[];
  winner: PollOption | null;
  historyCount: number;

  // Actions
  createPoll: (poll: Omit<Poll, 'id' | 'createdAt' | 'status'>) => void;
  addVote: (optionId: string) => void;
  endPoll: () => void;
  resetPoll: () => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
  clearHistory: () => void;
  removeFromHistory: (pollId: string) => void;
}

/**
 * Custom hook for poll state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * Components using this hook will only re-render when their selected data changes.
 * 
 * @example
 * ```tsx
 * const { activePoll, createPoll, addVote, endPoll } = usePoll();
 * 
 * // Create a poll
 * createPoll({
 *   title: 'Favorite Game',
 *   options: [
 *     { id: '1', text: 'Minecraft', votes: 0 },
 *     { id: '2', text: 'Fortnite', votes: 0 },
 *   ],
 * });
 * 
 * // Add a vote
 * addVote('1');
 * 
 * // End the poll
 * endPoll();
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 * @requirements 9.4 - Components only re-render when selected data changes
 */
export function usePoll(): UsePollReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  // @requirements 9.4 - Only re-render when selected data changes
  const activePoll = useAppSelector(selectActivePoll);
  const history = useAppSelector(selectPollHistory);
  const error = useAppSelector(selectPollError);
  const isCreating = useAppSelector(selectPollCreating);
  const options = useAppSelector(selectActivePollOptions);
  const totalVotes = useAppSelector(selectActivePollTotalVotes);
  const results = useAppSelector(selectActivePollResults);
  const winner = useAppSelector(selectActivePollWinner);
  const historyCount = useAppSelector(selectPollHistoryCount);

  // Action creators wrapped in useCallback for stability
  const handleCreatePoll = useCallback(
    (poll: Omit<Poll, 'id' | 'createdAt' | 'status'>) => {
      dispatch(createPoll(poll));
    },
    [dispatch]
  );

  const handleAddVote = useCallback(
    (optionId: string) => {
      dispatch(addVote({ optionId }));
    },
    [dispatch]
  );

  const handleEndPoll = useCallback(() => {
    dispatch(endPoll());
  }, [dispatch]);

  const handleResetPoll = useCallback(() => {
    dispatch(resetPoll());
  }, [dispatch]);

  const handleSetCreating = useCallback(
    (creating: boolean) => {
      dispatch(setCreating(creating));
    },
    [dispatch]
  );

  const handleSetError = useCallback(
    (errorMsg: string) => {
      dispatch(setError(errorMsg));
    },
    [dispatch]
  );

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleClearHistory = useCallback(() => {
    dispatch(clearHistory());
  }, [dispatch]);

  const handleRemoveFromHistory = useCallback(
    (pollId: string) => {
      dispatch(removeFromHistory({ pollId }));
    },
    [dispatch]
  );

  return {
    // State
    activePoll,
    history,
    error,
    isCreating,
    options,
    totalVotes,
    results,
    winner,
    historyCount,

    // Actions
    createPoll: handleCreatePoll,
    addVote: handleAddVote,
    endPoll: handleEndPoll,
    resetPoll: handleResetPoll,
    setCreating: handleSetCreating,
    setError: handleSetError,
    clearError: handleClearError,
    clearHistory: handleClearHistory,
    removeFromHistory: handleRemoveFromHistory,
  };
}

export default usePoll;
