/**
 * useChatControlIntegration Hook
 * 
 * Integrates chat control commands with actual dynamic actions.
 * This hook connects the command handlers to the real poll, giveaway,
 * prediction, and judge panel actions.
 * 
 * Usage: Call this hook in App.tsx or DynamicsPanel to enable remote control.
 * 
 * @module hooks/useChatControlIntegration
 */

import { useMemo } from 'react';
import { useChatControlCommands } from './useChatControlCommands';
import { usePollControlHandler, type PollState, type PollActions } from './usePollControlHandler';
import { useGiveawayControlHandler, type GiveawayState, type GiveawayActions } from './useGiveawayControlHandler';
import { usePredictionControlHandler, type PredictionState, type PredictionActions } from './usePredictionControlHandler';
import { useJudgeControlHandler, type JudgeState, type JudgeActions } from './useJudgeControlHandler';
import type { Poll } from '../src/domain/entities/Poll';
import type { ChatControlConfig, ParsedControlCommand, CommandExecutionResult } from '../src/application/services/ChatControlCommandsService';
import type { Platform } from '../types/platform';

// ============================================
// TYPES
// ============================================

export interface UseChatControlIntegrationOptions {
  /** Enable/disable chat control */
  enabled?: boolean;
  
  /** Poll state and actions from usePoll hook */
  poll?: {
    currentPoll: Poll | null;
    createPoll: (params: { title: string; question: string; options: Array<{ label: string; color: string }> }) => Poll;
    stopPoll: (auto?: boolean) => { poll: Poll } | null;
    resetPoll: () => void;
  };
  
  /** Giveaway state and actions from useRaffle hook */
  giveaway?: {
    isRunning: boolean;
    winner: string | null;
    config: { title: string; keyword: string };
    participants: Array<{ oderId: string; username: string; displayName: string }>;
    start: (duration?: number) => void;
    setWinner: (winner: string) => void;
    softReset: () => void;
    updateConfig: (config: { title?: string; keyword?: string }) => void;
  };
  
  /** Prediction state and actions from usePredictions hook */
  prediction?: {
    currentPrediction: {
      id: string;
      title: string;
      outcomes: Array<{ id: string; title: string; users: number; channel_points: number; color: string }>;
      status: 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';
      prediction_window: number;
    } | null;
    create: (title: string, outcomes: string[], duration?: number) => Promise<boolean>;
    lock: () => Promise<boolean>;
    resolve: (outcomeId: string) => Promise<boolean>;
    cancel: () => Promise<boolean>;
  };
  
  /** Judge panel state and actions */
  judge?: {
    isActive: boolean;
    contestants: Array<{ id: string; name: string; totalScore: number }>;
    currentIndex: number;
    start: () => void;
    pause: () => void;
    resume: () => void;
    nextContestant: () => void;
    prevContestant: () => void;
    finish: () => { id: string; name: string; totalScore: number } | null;
  };
  
  /** Callback for sending messages to chat */
  onSendMessage?: (message: string, platform?: Platform) => void;
  
  /** Callback when a command is executed */
  onCommandExecuted?: (command: ParsedControlCommand, result: CommandExecutionResult) => void;
  
  /** Custom config overrides */
  config?: Partial<ChatControlConfig>;
}

export interface UseChatControlIntegrationReturn {
  /** Whether chat control is enabled */
  isEnabled: boolean;
  /** Current config */
  config: ChatControlConfig;
  /** Update config */
  updateConfig: (config: Partial<ChatControlConfig>) => void;
  /** Last command result */
  lastResult: CommandExecutionResult | null;
}

// ============================================
// HELPER: Convert Poll to PollState
// ============================================

function pollToPollState(poll: Poll | null): PollState | null {
  if (!poll) return null;
  
  return {
    isActive: poll.isActive,
    question: poll.question,
    options: poll.options.map(opt => ({
      label: opt.label,
      votes: opt.votes,
    })),
    totalVotes: poll.totalVotes,
    duration: poll.duration,
    timeRemaining: poll.duration && poll.startTime 
      ? Math.max(0, poll.duration - Math.floor((Date.now() - poll.startTime) / 1000))
      : undefined,
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useChatControlIntegration(
  options: UseChatControlIntegrationOptions = {}
): UseChatControlIntegrationReturn {
  const {
    enabled = true,
    poll,
    giveaway,
    prediction,
    judge,
    onSendMessage,
    onCommandExecuted,
    config: configOverrides,
  } = options;

  // Initialize chat control commands hook
  const chatControl = useChatControlCommands({
    enabled,
    config: configOverrides,
    onCommandExecuted,
    onSendMessage,
  });

  // ============================================
  // POLL INTEGRATION
  // ============================================
  
  const pollState = useMemo(() => pollToPollState(poll?.currentPoll ?? null), [poll?.currentPoll]);
  
  const pollActions: PollActions = useMemo(() => ({
    create: (question: string, options: string[], _duration?: number) => {
      if (!poll?.createPoll) return;
      const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
      poll.createPoll({
        title: 'Encuesta',
        question,
        options: options.map((label, i) => ({
          label,
          color: colors[i % colors.length],
        })),
      });
    },
    close: () => {
      poll?.stopPoll?.();
    },
    reset: () => {
      poll?.resetPoll?.();
    },
    getResults: () => pollState,
  }), [poll, pollState]);

  // Register poll handler
  usePollControlHandler({
    state: pollState,
    actions: pollActions,
    registerHandler: chatControl.registerHandler,
  });

  // ============================================
  // GIVEAWAY INTEGRATION
  // ============================================
  
  const giveawayState: GiveawayState | null = useMemo(() => {
    if (!giveaway) return null;
    
    return {
      isActive: giveaway.isRunning,
      name: giveaway.config.title || 'Sorteo',
      keyword: giveaway.config.keyword,
      participants: giveaway.participants.map(p => ({
        username: p.username,
        displayName: p.displayName,
      })),
      participantCount: giveaway.participants.length,
      winner: giveaway.winner ? { username: giveaway.winner, displayName: giveaway.winner } : null,
    };
  }, [giveaway]);

  const giveawayActions: GiveawayActions = useMemo(() => ({
    start: (name: string, keyword?: string, duration?: number) => {
      if (!giveaway) return;
      giveaway.updateConfig({ title: name, keyword: keyword || '' });
      giveaway.start(duration);
    },
    pickWinner: () => {
      if (!giveaway || giveaway.participants.length === 0) return null;
      // Pick random winner
      const randomIndex = Math.floor(Math.random() * giveaway.participants.length);
      const winner = giveaway.participants[randomIndex];
      giveaway.setWinner(winner.displayName);
      return { username: winner.username, displayName: winner.displayName };
    },
    reroll: () => {
      if (!giveaway || giveaway.participants.length <= 1) return null;
      // Pick new random winner (excluding current)
      const currentWinner = giveaway.winner;
      const eligibleParticipants = giveaway.participants.filter(p => p.displayName !== currentWinner);
      if (eligibleParticipants.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
      const winner = eligibleParticipants[randomIndex];
      giveaway.setWinner(winner.displayName);
      return { username: winner.username, displayName: winner.displayName };
    },
    close: () => {
      giveaway?.softReset?.();
    },
    getState: () => giveawayState,
  }), [giveaway, giveawayState]);

  // Register giveaway handler
  useGiveawayControlHandler({
    state: giveawayState,
    actions: giveawayActions,
    registerHandler: chatControl.registerHandler,
  });

  // ============================================
  // PREDICTION INTEGRATION
  // ============================================
  
  const predictionState: PredictionState | null = useMemo(() => {
    if (!prediction?.currentPrediction) return null;
    
    const pred = prediction.currentPrediction;
    const statusMap: Record<string, 'active' | 'locked' | 'resolved' | 'canceled' | 'none'> = {
      'ACTIVE': 'active',
      'LOCKED': 'locked',
      'RESOLVED': 'resolved',
      'CANCELED': 'canceled',
    };
    
    return {
      status: statusMap[pred.status] || 'none',
      title: pred.title,
      outcomes: pred.outcomes.map(o => ({
        id: o.id,
        title: o.title,
        users: o.users,
        channelPoints: o.channel_points,
        color: o.color,
      })),
      totalUsers: pred.outcomes.reduce((sum, o) => sum + o.users, 0),
      totalPoints: pred.outcomes.reduce((sum, o) => sum + o.channel_points, 0),
    };
  }, [prediction?.currentPrediction]);

  const predictionActions: PredictionActions = useMemo(() => ({
    create: async (title: string, outcomes: string[], duration?: number) => {
      if (!prediction?.create) return false;
      return prediction.create(title, outcomes, duration);
    },
    lock: async () => {
      if (!prediction?.lock) return false;
      return prediction.lock();
    },
    resolve: async (outcomeIndex: number) => {
      if (!prediction?.resolve || !prediction.currentPrediction) return false;
      const outcome = prediction.currentPrediction.outcomes[outcomeIndex];
      if (!outcome) return false;
      return prediction.resolve(outcome.id);
    },
    cancel: async () => {
      if (!prediction?.cancel) return false;
      return prediction.cancel();
    },
    getState: () => predictionState,
  }), [prediction, predictionState]);

  // Register prediction handler
  usePredictionControlHandler({
    state: predictionState,
    actions: predictionActions,
    registerHandler: chatControl.registerHandler,
  });

  // ============================================
  // JUDGE PANEL INTEGRATION
  // ============================================
  
  const judgeState: JudgeState | null = useMemo(() => {
    if (!judge) return null;
    
    return {
      status: judge.isActive ? 'active' : 'idle',
      title: 'Torneo',
      contestants: judge.contestants.map((c, i) => ({
        id: c.id,
        name: c.name,
        totalScore: c.totalScore,
        judgeScores: [],
        publicVotes: 0,
        rank: i + 1,
      })),
      currentContestantIndex: judge.currentIndex,
      currentContestant: judge.contestants[judge.currentIndex] ? {
        id: judge.contestants[judge.currentIndex].id,
        name: judge.contestants[judge.currentIndex].name,
        totalScore: judge.contestants[judge.currentIndex].totalScore,
        judgeScores: [],
        publicVotes: 0,
        rank: judge.currentIndex + 1,
      } : undefined,
      publicVotingActive: false,
    };
  }, [judge]);

  const judgeActions: JudgeActions = useMemo(() => ({
    start: () => judge?.start?.(),
    pause: () => judge?.pause?.(),
    resume: () => judge?.resume?.(),
    nextContestant: () => judge?.nextContestant?.(),
    prevContestant: () => judge?.prevContestant?.(),
    startPublicVoting: () => {},
    stopPublicVoting: () => {},
    finish: () => {
      if (!judge?.finish) return null;
      const winner = judge.finish();
      if (!winner) return null;
      return {
        id: winner.id,
        name: winner.name,
        totalScore: winner.totalScore,
        judgeScores: [],
        publicVotes: 0,
        rank: 1,
      };
    },
    getState: () => judgeState,
  }), [judge, judgeState]);

  // Register judge handler
  useJudgeControlHandler({
    state: judgeState,
    actions: judgeActions,
    registerHandler: chatControl.registerHandler,
  });

  return {
    isEnabled: chatControl.isEnabled,
    config: chatControl.config,
    updateConfig: chatControl.updateConfig,
    lastResult: chatControl.lastResult,
  };
}

export default useChatControlIntegration;
