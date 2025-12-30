/**
 * useHistoryRecorder - Helper hook for recording activities to unified history
 * 
 * Provides convenient methods to record different types of activities
 * (polls, predictions, giveaways, commands, timers) to the unified history.
 * 
 * This hook bridges existing components with the HistoryManager.
 * 
 * @requirements 1.2 - Record events with timestamp and metadata
 */

import { useCallback } from 'react';
import { useHistoryManager } from './useHistoryManager';
import type { Poll } from '../types';
import type { TwitchPrediction } from '../types/twitch';
import type {
  HistoryPlatform,
  PollHistoryData,
  PredictionHistoryData,
  GiveawayHistoryData,
  CommandHistoryData,
  TimerHistoryData,
} from '../types/history';

// ============================================
// TYPES
// ============================================

export interface RecordPollParams {
  poll: Poll;
  platform?: HistoryPlatform;
}

export interface RecordPredictionParams {
  prediction: TwitchPrediction;
  platform?: HistoryPlatform;
}

export interface RecordGiveawayParams {
  name: string;
  mode: 'viewers' | 'keyword' | 'subs';
  keyword?: string;
  winner: string;
  participantCount: number;
  subscribersOnly: boolean;
  duration?: number;
  platform?: HistoryPlatform;
}

export interface RecordCommandParams {
  commandName: string;
  trigger: string;
  response: string;
  executedBy: string;
  channel: string;
  platform?: HistoryPlatform;
}

export interface RecordTimerParams {
  timerName: string;
  message: string;
  interval: number;
  executionCount: number;
  channel: string;
  platform?: HistoryPlatform;
}

export interface UseHistoryRecorderReturn {
  /** Record a completed poll */
  recordPoll: (params: RecordPollParams) => void;
  /** Record a completed prediction */
  recordPrediction: (params: RecordPredictionParams) => void;
  /** Record a completed giveaway */
  recordGiveaway: (params: RecordGiveawayParams) => void;
  /** Record an executed command */
  recordCommand: (params: RecordCommandParams) => void;
  /** Record a timer execution */
  recordTimer: (params: RecordTimerParams) => void;
}

// ============================================
// MAIN HOOK
// ============================================

export function useHistoryRecorder(): UseHistoryRecorderReturn {
  const { addItem } = useHistoryManager();

  /**
   * Record a completed poll to history
   */
  const recordPoll = useCallback(({ poll, platform = 'twitch' }: RecordPollParams) => {
    const totalVotes = poll.totalVotes;
    const winner = poll.options.reduce((prev, curr) => 
      curr.votes > prev.votes ? curr : prev
    , poll.options[0]);

    const data: PollHistoryData = {
      question: poll.question,
      options: poll.options.map(opt => ({
        label: opt.label,
        votes: opt.votes,
        color: opt.color,
        icon: opt.icon,
        percentage: totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0,
      })),
      totalVotes,
      duration: poll.duration,
      winnerId: winner?.id,
      winnerLabel: winner?.label,
    };

    addItem({
      type: 'poll',
      platform,
      data,
      metadata: {
        participants: totalVotes,
        totalVotes,
        winner: winner?.label,
        duration: poll.duration,
      },
    });
  }, [addItem]);

  /**
   * Record a completed prediction to history
   */
  const recordPrediction = useCallback(({ prediction, platform = 'twitch' }: RecordPredictionParams) => {
    const totalUsers = prediction.outcomes.reduce((sum, o) => sum + o.users, 0);
    const totalPoints = prediction.outcomes.reduce((sum, o) => sum + o.channel_points, 0);
    const winningOutcome = prediction.outcomes.find(o => o.id === prediction.winning_outcome_id);

    const data: PredictionHistoryData = {
      title: prediction.title,
      outcomes: prediction.outcomes.map(o => ({
        id: o.id,
        title: o.title,
        users: o.users,
        channelPoints: o.channel_points,
        color: o.color,
        percentage: totalPoints > 0 ? (o.channel_points / totalPoints) * 100 : 0,
      })),
      status: prediction.status as 'RESOLVED' | 'CANCELED',
      winningOutcomeId: prediction.winning_outcome_id ?? undefined,
      winningOutcomeTitle: winningOutcome?.title,
      totalUsers,
      totalPoints,
      predictionWindow: prediction.prediction_window,
    };

    addItem({
      type: 'prediction',
      platform,
      data,
      metadata: {
        participants: totalUsers,
        totalVotes: totalPoints,
        winner: winningOutcome?.title,
        duration: prediction.prediction_window,
      },
    });
  }, [addItem]);

  /**
   * Record a completed giveaway to history
   */
  const recordGiveaway = useCallback((params: RecordGiveawayParams) => {
    const { platform = 'twitch', ...rest } = params;

    const data: GiveawayHistoryData = {
      name: rest.name,
      mode: rest.mode,
      keyword: rest.keyword,
      winner: rest.winner,
      participantCount: rest.participantCount,
      subscribersOnly: rest.subscribersOnly,
      duration: rest.duration,
    };

    addItem({
      type: 'giveaway',
      platform,
      data,
      metadata: {
        participants: rest.participantCount,
        winner: rest.winner,
        duration: rest.duration,
      },
    });
  }, [addItem]);

  /**
   * Record an executed command to history
   */
  const recordCommand = useCallback((params: RecordCommandParams) => {
    const { platform = 'twitch', ...rest } = params;

    const data: CommandHistoryData = {
      commandName: rest.commandName,
      trigger: rest.trigger,
      response: rest.response,
      executedBy: rest.executedBy,
      channel: rest.channel,
    };

    addItem({
      type: 'command',
      platform,
      data,
      metadata: {},
    });
  }, [addItem]);

  /**
   * Record a timer execution to history
   */
  const recordTimer = useCallback((params: RecordTimerParams) => {
    const { platform = 'twitch', ...rest } = params;

    const data: TimerHistoryData = {
      timerName: rest.timerName,
      message: rest.message,
      interval: rest.interval,
      executionCount: rest.executionCount,
      channel: rest.channel,
    };

    addItem({
      type: 'timer',
      platform,
      data,
      metadata: {
        duration: rest.interval,
      },
    });
  }, [addItem]);

  return {
    recordPoll,
    recordPrediction,
    recordGiveaway,
    recordCommand,
    recordTimer,
  };
}

export default useHistoryRecorder;
