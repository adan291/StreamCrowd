/**
 * usePollSync - Application layer hook for poll synchronization
 * 
 * This hook provides a clean interface for React components to interact with
 * poll synchronization without directly importing Firebase or infrastructure code.
 * It follows hexagonal architecture principles by using dependency injection
 * to access the OverlaySyncService.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OverlayState } from '../../domain/entities/OverlayState';
import type { Poll, PollOption, VoteRecord } from '../../domain/entities/Poll';
import { DependencyFactory } from '../../infrastructure/factories/DependencyFactory';

/**
 * Poll state structure for synchronization
 */
export interface PollState {
  /** Current active poll */
  poll: Poll | null;
  
  /** Vote records for the current poll */
  votes: VoteRecord[];
  
  /** Poll statistics */
  stats: {
    totalVotes: number;
    uniqueVoters: number;
    averageVoteWeight: number;
    votesPerMinute: number;
  };
  
  /** Poll configuration */
  config: {
    allowMultipleVotes: boolean;
    requireSubscription: boolean;
    minFollowTime: number;
    voteWeights: Record<string, number>; // subscriber: 2, mod: 3, etc.
  };
  
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Return type for usePollSync hook
 */
export interface UsePollSyncReturn {
  /** Current poll state, null if no active poll */
  pollState: PollState | null;
  
  /** Publish new poll state to all connected clients */
  publishPollState: (state: PollState) => Promise<void>;
  
  /** Clear current poll state */
  clearPollState: () => Promise<void>;
  
  /** Start a new poll */
  startPoll: (poll: Poll) => Promise<void>;
  
  /** Stop the current poll */
  stopPoll: () => Promise<void>;
  
  /** Add a vote to the current poll */
  addVote: (vote: VoteRecord) => Promise<void>;
  
  /** Whether the sync connection is active */
  isConnected: boolean;
  
  /** Any error that occurred during sync operations */
  error: string | null;
  
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Hook for poll synchronization using application layer services
 * 
 * @returns Object with poll state and sync methods
 */
export function usePollSync(): UsePollSyncReturn {
  const [pollState, setPollState] = useState<PollState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get overlay sync service through dependency injection
  const overlaySync = DependencyFactory.getInstance().getOverlaySyncService();

  const publishPollState = useCallback(async (state: PollState): Promise<void> => {
    try {
      setError(null);
      const overlayState: OverlayState<PollState> = {
        type: 'poll',
        data: state,
        updatedAt: Date.now(),
        isActive: state.poll?.isActive ?? false,
        metadata: {
          version: '1.0',
          source: 'usePollSync',
        }
      };
      
      const result = await overlaySync.publish(overlayState);
      if (!result.success && result.error) {
        throw result.error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish poll state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const clearPollState = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await overlaySync.clear('poll');
      if (!result.success && result.error) {
        throw result.error;
      }
      setPollState(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear poll state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const startPoll = useCallback(async (poll: Poll): Promise<void> => {
    const newPollState: PollState = {
      poll,
      votes: [],
      stats: {
        totalVotes: 0,
        uniqueVoters: 0,
        averageVoteWeight: 0,
        votesPerMinute: 0,
      },
      config: {
        allowMultipleVotes: false,
        requireSubscription: false,
        minFollowTime: 0,
        voteWeights: {
          viewer: 1,
          subscriber: 1,
          moderator: 1,
          vip: 1,
        },
      },
      lastUpdate: Date.now(),
    };
    
    await publishPollState(newPollState);
  }, [publishPollState]);

  const stopPoll = useCallback(async (): Promise<void> => {
    if (!pollState?.poll) return;
    
    const updatedPoll = {
      ...pollState.poll,
      isActive: false,
      endTime: Date.now(),
    };
    
    const updatedState: PollState = {
      ...pollState,
      poll: updatedPoll,
      lastUpdate: Date.now(),
    };
    
    await publishPollState(updatedState);
  }, [pollState, publishPollState]);

  const addVote = useCallback(async (vote: VoteRecord): Promise<void> => {
    if (!pollState?.poll) {
      throw new Error('No active poll to vote on');
    }
    
    const updatedVotes = [...pollState.votes, vote];
    const uniqueVoters = new Set(updatedVotes.map(v => v.username)).size;
    const totalVotes = updatedVotes.length;
    const averageVoteWeight = updatedVotes.reduce((sum, v) => sum + v.weight, 0) / totalVotes;
    
    // Calculate votes per minute
    const pollDuration = (Date.now() - pollState.poll.startTime) / (1000 * 60); // minutes
    const votesPerMinute = pollDuration > 0 ? totalVotes / pollDuration : 0;
    
    // Update poll options with new vote
    const updatedOptions = pollState.poll.options.map(option => 
      option.id === vote.optionId 
        ? { ...option, votes: option.votes + vote.weight }
        : option
    );
    
    const updatedPoll = {
      ...pollState.poll,
      options: updatedOptions,
      totalVotes: updatedOptions.reduce((sum, o) => sum + o.votes, 0),
    };
    
    const updatedState: PollState = {
      ...pollState,
      poll: updatedPoll,
      votes: updatedVotes,
      stats: {
        totalVotes,
        uniqueVoters,
        averageVoteWeight,
        votesPerMinute,
      },
      lastUpdate: Date.now(),
    };
    
    await publishPollState(updatedState);
  }, [pollState, publishPollState]);

  const reconnect = useCallback(() => {
    setError(null);
    setIsConnected(false);
    // Trigger reconnection through overlay sync service
    overlaySync.reconnect().catch(err => {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
    });
  }, [overlaySync]);

  useEffect(() => {
    // Subscribe to poll state changes
    const subscription = overlaySync.subscribe<OverlayState<PollState>>('poll', (state) => {
      if (state?.data) {
        setPollState(state.data);
        setIsConnected(true);
        setError(null);
      } else {
        setPollState(null);
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(overlaySync.isConnected());
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    return () => {
      subscription.unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [overlaySync]);

  return {
    pollState,
    publishPollState,
    clearPollState,
    startPoll,
    stopPoll,
    addVote,
    isConnected,
    error,
    reconnect
  };
}