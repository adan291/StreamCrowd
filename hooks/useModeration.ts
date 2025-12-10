import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ModerationConfig,
  ModerationStats,
  ModerationLogEntry,
  UserVoteState,
  VoteValidationResult,
  RejectionReason,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  validateVote,
  createLogEntry,
  updateStats,
} from '../types';

/**
 * Context for processing a vote through moderation
 */
export interface VoteContext {
  userId: string;
  username: string;
  optionId: number;
  /** Whether the user is a subscriber */
  isSubscriber: boolean;
  /** Whether the user is a follower */
  isFollower: boolean;
  /** Account age in days (defaults to 365 if unknown) */
  accountAgeDays?: number;
}

/**
 * Result of processing a vote through moderation
 */
export interface ProcessVoteResult extends VoteValidationResult {
  /** Whether this is a vote change (user already voted) */
  isVoteChange: boolean;
  /** Previous option ID if this is a vote change */
  previousOptionId?: number;
  /** Previous weight if this is a vote change */
  previousWeight?: number;
}

/**
 * Return type for the useModeration hook
 */
export interface UseModerationReturn {
  // State
  config: ModerationConfig;
  stats: ModerationStats;
  log: ModerationLogEntry[];
  userVoteStates: Map<string, UserVoteState>;
  userWeights: Map<string, number>;

  // Actions
  setConfig: (config: ModerationConfig) => void;
  processVote: (context: VoteContext, validOptionIds: number[]) => ProcessVoteResult;
  reset: () => void;
  logEntry: (entry: ModerationLogEntry) => void;
  
  // Direct setters for advanced use cases
  setStats: React.Dispatch<React.SetStateAction<ModerationStats>>;
  setLog: React.Dispatch<React.SetStateAction<ModerationLogEntry[]>>;
  setUserVoteStates: React.Dispatch<React.SetStateAction<Map<string, UserVoteState>>>;
  setUserWeights: React.Dispatch<React.SetStateAction<Map<string, number>>>;
}

/**
 * A custom hook for managing vote moderation state and logic
 * 
 * Features:
 * - Moderation configuration management
 * - Vote validation with account age, cooldown, and vote change rules
 * - Statistics tracking (accepted/rejected votes)
 * - Moderation log for audit trail
 * - User vote state tracking for vote changes
 * - Weighted voting support
 * 
 * @returns Moderation state and action functions
 * 
 * @example
 * const { config, stats, processVote, reset } = useModeration();
 * 
 * // Process a vote
 * const result = processVote({
 *   userId: 'user123',
 *   username: 'viewer',
 *   optionId: 1,
 *   isSubscriber: true,
 *   isFollower: false,
 * }, [1, 2, 3]);
 * 
 * if (result.isValid) {
 *   // Vote accepted with weight: result.weight
 * } else {
 *   // Vote rejected: result.rejectionReason
 * }
 */
export function useModeration(): UseModerationReturn {
  // Core moderation state
  const [config, setConfigState] = useState<ModerationConfig>(DEFAULT_MODERATION_CONFIG);
  const [stats, setStats] = useState<ModerationStats>(DEFAULT_MODERATION_STATS);
  const [log, setLog] = useState<ModerationLogEntry[]>([]);
  const [userVoteStates, setUserVoteStates] = useState<Map<string, UserVoteState>>(new Map());
  const [userWeights, setUserWeights] = useState<Map<string, number>>(new Map());

  // Refs for callbacks to avoid stale closures
  const configRef = useRef<ModerationConfig>(DEFAULT_MODERATION_CONFIG);
  const userVoteStatesRef = useRef<Map<string, UserVoteState>>(new Map());
  const userWeightsRef = useRef<Map<string, number>>(new Map());

  // Sync refs with state
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    userVoteStatesRef.current = userVoteStates;
  }, [userVoteStates]);

  useEffect(() => {
    userWeightsRef.current = userWeights;
  }, [userWeights]);

  /**
   * Set the moderation configuration
   */
  const setConfig = useCallback((newConfig: ModerationConfig) => {
    setConfigState(newConfig);
    configRef.current = newConfig;
  }, []);

  /**
   * Add a log entry to the moderation log
   */
  const logEntry = useCallback((entry: ModerationLogEntry) => {
    setLog(prev => [...prev, entry]);
  }, []);

  /**
   * Process a vote through moderation validation
   * Returns validation result with vote change information
   */
  const processVote = useCallback((
    context: VoteContext,
    validOptionIds: number[]
  ): ProcessVoteResult => {
    const { userId, username, optionId, isSubscriber, isFollower, accountAgeDays = 365 } = context;
    const currentTime = Date.now();
    const currentConfig = configRef.current;

    // Check valid option first
    if (!validOptionIds.includes(optionId)) {
      const entry = createLogEntry(
        username,
        userId,
        'REJECTED',
        'INVALID_OPTION',
        optionId,
        0
      );
      setLog(prev => [...prev, entry]);
      setStats(prev => updateStats(prev, false, 'INVALID_OPTION'));

      return {
        isValid: false,
        rejectionReason: 'INVALID_OPTION',
        weight: 0,
        isVoteChange: false,
      };
    }

    // Get user's existing vote state
    const existingVoteState = userVoteStatesRef.current.get(userId);
    const hasVoted = existingVoteState !== undefined;
    const lastVoteTime = existingVoteState?.timestamp ?? 0;

    // Validate the vote using moderation service
    const validationResult = validateVote(
      {
        accountAgeDays,
        hasVoted,
        lastVoteTime,
        currentTime,
        isSubscriber,
        isFollower,
      },
      currentConfig
    );

    if (!validationResult.isValid) {
      // Vote rejected - log and update stats
      const entry = createLogEntry(
        username,
        userId,
        'REJECTED',
        validationResult.rejectionReason,
        optionId,
        0
      );
      setLog(prev => [...prev, entry]);
      setStats(prev => updateStats(prev, false, validationResult.rejectionReason));

      return {
        ...validationResult,
        isVoteChange: false,
      };
    }

    const weight = validationResult.weight;

    // Handle vote change vs new vote
    if (hasVoted && existingVoteState) {
      const oldOptionId = existingVoteState.optionId;
      const oldWeight = existingVoteState.weight;

      // Update vote state
      const newVoteState: UserVoteState = {
        optionId,
        timestamp: currentTime,
        weight,
        canChangeAt: currentConfig.voteChangeEnabled
          ? currentTime + (currentConfig.voteChangeCooldownSeconds * 1000)
          : undefined,
      };
      userVoteStatesRef.current.set(userId, newVoteState);
      setUserVoteStates(new Map(userVoteStatesRef.current));

      // Log vote change
      const entry = createLogEntry(
        username,
        userId,
        'VOTE_CHANGED',
        undefined,
        optionId,
        weight
      );
      setLog(prev => [...prev, entry]);
      setStats(prev => updateStats(prev, true));

      return {
        isValid: true,
        weight,
        isVoteChange: true,
        previousOptionId: oldOptionId,
        previousWeight: oldWeight,
      };
    } else {
      // New vote
      // Store vote state
      const newVoteState: UserVoteState = {
        optionId,
        timestamp: currentTime,
        weight,
        canChangeAt: currentConfig.voteChangeEnabled
          ? currentTime + (currentConfig.voteChangeCooldownSeconds * 1000)
          : undefined,
      };
      userVoteStatesRef.current.set(userId, newVoteState);
      setUserVoteStates(new Map(userVoteStatesRef.current));

      // Store user weight
      userWeightsRef.current.set(userId, weight);
      setUserWeights(new Map(userWeightsRef.current));

      // Log accepted vote
      const entry = createLogEntry(
        username,
        userId,
        'ACCEPTED',
        undefined,
        optionId,
        weight
      );
      setLog(prev => [...prev, entry]);
      setStats(prev => updateStats(prev, true));

      return {
        isValid: true,
        weight,
        isVoteChange: false,
      };
    }
  }, []);

  /**
   * Reset all moderation state to defaults
   */
  const reset = useCallback(() => {
    setStats(DEFAULT_MODERATION_STATS);
    setLog([]);
    setUserVoteStates(new Map());
    userVoteStatesRef.current = new Map();
    setUserWeights(new Map());
    userWeightsRef.current = new Map();
  }, []);

  return {
    // State
    config,
    stats,
    log,
    userVoteStates,
    userWeights,

    // Actions
    setConfig,
    processVote,
    reset,
    logEntry,

    // Direct setters
    setStats,
    setLog,
    setUserVoteStates,
    setUserWeights,
  };
}

export default useModeration;
