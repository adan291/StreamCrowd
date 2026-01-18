/**
 * useGiveaway Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for giveaway feature.
 * Provides a clean API for components to interact with giveaway state.
 * 
 * @requirements 9.3
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  createGiveaway,
  addParticipant,
  removeParticipant,
  clearParticipants,
  selectWinner,
  confirmWinner,
  rerollWinner,
  endGiveaway,
  resetGiveaway,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
  enableCloudSync,
  disableCloudSync,
  updateLastSynced,
  restoreGiveaway,
  selectActiveGiveaway,
  selectGiveawayHistory,
  selectGiveawayError,
  selectGiveawaySelecting,
  selectCloudSyncEnabled,
  selectLastSyncedAt,
  selectParticipants,
  selectParticipantCount,
  selectGiveawayWinner,
  selectGiveawayStatus,
  selectGiveawayHistoryCount,
  selectParticipantsByPlatform,
  type Giveaway,
  type Participant,
} from '../state/slices/giveawaySlice';

export interface UseGiveawayReturn {
  // State
  activeGiveaway: Giveaway | null;
  history: Giveaway[];
  error: string | null;
  isSelecting: boolean;
  cloudSyncEnabled: boolean;
  lastSyncedAt: string | null;
  participants: Participant[];
  participantCount: number;
  winner: Participant | null;
  status: 'active' | 'selecting' | 'ended' | null;
  historyCount: number;
  participantsByPlatform: Record<string, Participant[]>;

  // Actions
  createGiveaway: (title: string) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'joinedAt'>) => void;
  removeParticipant: (participantId: string) => void;
  clearParticipants: () => void;
  selectWinner: () => void;
  confirmWinner: () => void;
  rerollWinner: () => void;
  endGiveaway: () => void;
  resetGiveaway: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  clearHistory: () => void;
  removeFromHistory: (giveawayId: string) => void;
  enableCloudSync: () => void;
  disableCloudSync: () => void;
  updateLastSynced: () => void;
  restoreGiveaway: (giveaway: Giveaway) => void;
}

/**
 * Custom hook for giveaway state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * 
 * @example
 * ```tsx
 * const { activeGiveaway, participants, createGiveaway, addParticipant, selectWinner } = useGiveaway();
 * 
 * // Create a giveaway
 * createGiveaway('Stream Giveaway');
 * 
 * // Add participants
 * addParticipant({ username: 'user1', platform: 'twitch' });
 * addParticipant({ username: 'user2', platform: 'youtube' });
 * 
 * // Select winner
 * selectWinner();
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useGiveaway(): UseGiveawayReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  const activeGiveaway = useAppSelector(selectActiveGiveaway);
  const history = useAppSelector(selectGiveawayHistory);
  const error = useAppSelector(selectGiveawayError);
  const isSelecting = useAppSelector(selectGiveawaySelecting);
  const cloudSyncEnabled = useAppSelector(selectCloudSyncEnabled);
  const lastSyncedAt = useAppSelector(selectLastSyncedAt);
  const participants = useAppSelector(selectParticipants);
  const participantCount = useAppSelector(selectParticipantCount);
  const winner = useAppSelector(selectGiveawayWinner);
  const status = useAppSelector(selectGiveawayStatus);
  const historyCount = useAppSelector(selectGiveawayHistoryCount);
  const participantsByPlatform = useAppSelector(selectParticipantsByPlatform);

  // Action creators wrapped in useCallback for stability
  const handleCreateGiveaway = useCallback(
    (title: string) => {
      dispatch(createGiveaway({ title }));
    },
    [dispatch]
  );

  const handleAddParticipant = useCallback(
    (participant: Omit<Participant, 'id' | 'joinedAt'>) => {
      dispatch(addParticipant(participant));
    },
    [dispatch]
  );

  const handleRemoveParticipant = useCallback(
    (participantId: string) => {
      dispatch(removeParticipant({ participantId }));
    },
    [dispatch]
  );

  const handleClearParticipants = useCallback(() => {
    dispatch(clearParticipants());
  }, [dispatch]);

  const handleSelectWinner = useCallback(() => {
    dispatch(selectWinner());
  }, [dispatch]);

  const handleConfirmWinner = useCallback(() => {
    dispatch(confirmWinner());
  }, [dispatch]);

  const handleRerollWinner = useCallback(() => {
    dispatch(rerollWinner());
  }, [dispatch]);

  const handleEndGiveaway = useCallback(() => {
    dispatch(endGiveaway());
  }, [dispatch]);

  const handleResetGiveaway = useCallback(() => {
    dispatch(resetGiveaway());
  }, [dispatch]);

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
    (giveawayId: string) => {
      dispatch(removeFromHistory({ giveawayId }));
    },
    [dispatch]
  );

  const handleEnableCloudSync = useCallback(() => {
    dispatch(enableCloudSync());
  }, [dispatch]);

  const handleDisableCloudSync = useCallback(() => {
    dispatch(disableCloudSync());
  }, [dispatch]);

  const handleUpdateLastSynced = useCallback(() => {
    dispatch(updateLastSynced());
  }, [dispatch]);

  const handleRestoreGiveaway = useCallback(
    (giveaway: Giveaway) => {
      dispatch(restoreGiveaway({ giveaway }));
    },
    [dispatch]
  );

  return {
    // State
    activeGiveaway,
    history,
    error,
    isSelecting,
    cloudSyncEnabled,
    lastSyncedAt,
    participants,
    participantCount,
    winner,
    status,
    historyCount,
    participantsByPlatform,

    // Actions
    createGiveaway: handleCreateGiveaway,
    addParticipant: handleAddParticipant,
    removeParticipant: handleRemoveParticipant,
    clearParticipants: handleClearParticipants,
    selectWinner: handleSelectWinner,
    confirmWinner: handleConfirmWinner,
    rerollWinner: handleRerollWinner,
    endGiveaway: handleEndGiveaway,
    resetGiveaway: handleResetGiveaway,
    setError: handleSetError,
    clearError: handleClearError,
    clearHistory: handleClearHistory,
    removeFromHistory: handleRemoveFromHistory,
    enableCloudSync: handleEnableCloudSync,
    disableCloudSync: handleDisableCloudSync,
    updateLastSynced: handleUpdateLastSynced,
    restoreGiveaway: handleRestoreGiveaway,
  };
}

export default useGiveaway;
