import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Poll, VoteRecord } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Configuration for creating a new poll
 */
export interface CreatePollConfig {
  title: string;
  question: string;
  options: PollOptionConfig[];
  maxVotes?: number;
  duration?: number;
  progressBarColor?: string;
  limitIndicatorColor?: string;
  votePrefix?: string;
}

export interface PollOptionConfig {
  label: string;
  color: string;
  icon?: string;
  image?: string;
}

/**
 * Return type for the usePoll hook
 */
export interface UsePollReturn {
  // State
  currentPoll: Poll | null;
  voteHistory: VoteRecord[];
  pastPolls: Poll[];
  votedUserIds: Set<string>;
  userVoteMap: Map<string, number>;
  
  // Actions
  createPoll: (config: CreatePollConfig) => Poll;
  stopPoll: (auto?: boolean) => Poll | null;
  resetPoll: () => void;
  addVote: (vote: VoteRecord, weight: number) => void;
  updateVote: (userId: string, oldOptionId: number, newOptionId: number, oldWeight: number, newWeight: number) => void;
  
  // Direct setters for advanced use cases
  setCurrentPoll: React.Dispatch<React.SetStateAction<Poll | null>>;
  setVoteHistory: React.Dispatch<React.SetStateAction<VoteRecord[]>>;
}

/**
 * Options for configuring the usePoll hook
 */
export interface UsePollOptions {
  /** Whether to sync poll state to localStorage for overlay mode */
  syncToStorage?: boolean;
  /** Whether this is running in overlay mode (read-only from storage) */
  isOverlayMode?: boolean;
}


/**
 * A custom hook for managing poll state and actions
 * 
 * Features:
 * - Poll lifecycle management (create, stop, reset)
 * - Vote tracking with user deduplication
 * - Past polls history
 * - Optional localStorage sync for overlay mode
 * 
 * @param options - Configuration options for the hook
 * @returns Poll state and action functions
 * 
 * @example
 * const { currentPoll, createPoll, stopPoll, addVote } = usePoll();
 * 
 * // Create a new poll
 * createPoll({
 *   title: 'Game Poll',
 *   question: 'Which game should we play?',
 *   options: [
 *     { label: 'Minecraft', color: '#4ade80' },
 *     { label: 'Fortnite', color: '#a970ff' },
 *   ],
 * });
 */
export function usePoll(options: UsePollOptions = {}): UsePollReturn {
  const { syncToStorage = false, isOverlayMode = false } = options;

  // Core poll state
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [votedUserIds, setVotedUserIds] = useState<Set<string>>(new Set());

  // Ref for votedUserIds to avoid stale closures
  const votedUserIdsRef = useRef<Set<string>>(new Set());

  // Sync votedUserIds ref with state
  useEffect(() => {
    votedUserIdsRef.current = votedUserIds;
  }, [votedUserIds]);

  // Memoize the map of UserID -> OptionID for efficient lookups
  const userVoteMap = useMemo(() => {
    const map = new Map<string, number>();
    voteHistory.forEach(v => map.set(v.userId, v.optionId));
    return map;
  }, [voteHistory]);

  // Sync to localStorage for overlay mode (Controller Mode)
  useEffect(() => {
    if (syncToStorage && !isOverlayMode) {
      try {
        if (currentPoll) {
          localStorage.setItem(STORAGE_KEYS.POLL_SYNC, JSON.stringify(currentPoll));
        }
        localStorage.setItem(STORAGE_KEYS.VOTE_HISTORY_SYNC, JSON.stringify(voteHistory));
      } catch (e) {
        console.error('Storage Sync Error (Quota Exceeded?):', e);
      }
    }
  }, [currentPoll, voteHistory, syncToStorage, isOverlayMode]);

  // Listen for storage changes in overlay mode
  useEffect(() => {
    if (!isOverlayMode) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.POLL_SYNC && e.newValue) {
        try {
          setCurrentPoll(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
      if (e.key === STORAGE_KEYS.VOTE_HISTORY_SYNC && e.newValue) {
        try {
          setVoteHistory(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Initial load from storage
    const loadFromStorage = () => {
      const storedPoll = localStorage.getItem(STORAGE_KEYS.POLL_SYNC);
      if (storedPoll) {
        try {
          setCurrentPoll(JSON.parse(storedPoll));
        } catch { /* ignore */ }
      }
      const storedHistory = localStorage.getItem(STORAGE_KEYS.VOTE_HISTORY_SYNC);
      if (storedHistory) {
        try {
          setVoteHistory(JSON.parse(storedHistory));
        } catch { /* ignore */ }
      }
    };

    loadFromStorage();

    // Poll for changes every 500ms (storage event doesn't fire in same tab)
    const pollInterval = setInterval(loadFromStorage, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [isOverlayMode]);


  /**
   * Create a new poll with the given configuration
   * Resets vote history and voted user tracking
   */
  const createPoll = useCallback((config: CreatePollConfig): Poll => {
    const newPoll: Poll = {
      id: Date.now().toString(),
      title: config.title,
      question: config.question,
      options: config.options.map((o, i) => ({
        id: i + 1,
        label: o.label,
        votes: 0,
        color: o.color,
        icon: o.icon,
        image: o.image,
      })),
      isActive: true,
      totalVotes: 0,
      startTime: Date.now(),
      maxVotes: config.maxVotes,
      duration: config.duration,
      progressBarColor: config.progressBarColor,
      limitIndicatorColor: config.limitIndicatorColor,
      votePrefix: config.votePrefix || '+',
    };

    setCurrentPoll(newPoll);
    setVoteHistory([]);
    setVotedUserIds(new Set());
    votedUserIdsRef.current = new Set();

    return newPoll;
  }, []);

  /**
   * Stop the current poll and add it to past polls history
   * @param auto - Whether the poll was stopped automatically (e.g., timer expired)
   * @returns The stopped poll or null if no active poll
   */
  const stopPoll = useCallback((auto = false): Poll | null => {
    if (!currentPoll) return null;

    const finishedPoll: Poll = { ...currentPoll, isActive: false };
    setCurrentPoll(finishedPoll);
    setPastPolls(prev => [finishedPoll, ...prev]);

    return finishedPoll;
  }, [currentPoll]);

  /**
   * Reset all poll state - clears current poll, vote history, and voted users
   */
  const resetPoll = useCallback(() => {
    setCurrentPoll(null);
    setVoteHistory([]);
    setVotedUserIds(new Set());
    votedUserIdsRef.current = new Set();
  }, []);

  /**
   * Add a new vote to the current poll
   * @param vote - The vote record to add
   * @param weight - The weight of the vote (for weighted voting)
   */
  const addVote = useCallback((vote: VoteRecord, weight: number) => {
    // Track voted user
    votedUserIdsRef.current.add(vote.userId);
    setVotedUserIds(new Set(votedUserIdsRef.current));

    // Add to vote history
    setVoteHistory(prev => [...prev, vote]);

    // Update poll counts
    setCurrentPoll(prev => {
      if (!prev) return null;
      const newOptions = prev.options.map(o => {
        if (o.id === vote.optionId) {
          return { ...o, votes: o.votes + weight };
        }
        return o;
      });
      const newTotalVotes = newOptions.reduce((sum, o) => sum + o.votes, 0);
      return { ...prev, options: newOptions, totalVotes: newTotalVotes };
    });
  }, []);

  /**
   * Update an existing vote (vote change)
   * @param userId - The user changing their vote
   * @param oldOptionId - The previous option ID
   * @param newOptionId - The new option ID
   * @param oldWeight - The weight of the old vote
   * @param newWeight - The weight of the new vote
   */
  const updateVote = useCallback((
    userId: string,
    oldOptionId: number,
    newOptionId: number,
    oldWeight: number,
    newWeight: number
  ) => {
    const currentTime = Date.now();

    // Update poll counts (decrement old, increment new)
    setCurrentPoll(prev => {
      if (!prev) return null;
      const newOptions = prev.options.map(o => {
        if (o.id === oldOptionId) {
          return { ...o, votes: o.votes - oldWeight };
        }
        if (o.id === newOptionId) {
          return { ...o, votes: o.votes + newWeight };
        }
        return o;
      });
      return { ...prev, options: newOptions };
    });

    // Update vote history
    setVoteHistory(prev =>
      prev.map(v =>
        v.userId === userId
          ? { ...v, optionId: newOptionId, timestamp: currentTime }
          : v
      )
    );
  }, []);

  return {
    // State
    currentPoll,
    voteHistory,
    pastPolls,
    votedUserIds,
    userVoteMap,
    
    // Actions
    createPoll,
    stopPoll,
    resetPoll,
    addVote,
    updateVote,
    
    // Direct setters
    setCurrentPoll,
    setVoteHistory,
  };
}

export default usePoll;
