/**
 * useJudgeControlHandler Hook
 * 
 * Handles chat commands for controlling judge panel/tournaments remotely.
 * 
 * Commands:
 * - !torneo iniciar
 * - !torneo pausar
 * - !torneo siguiente
 * - !torneo ganador
 * - !torneo ranking
 * - !torneo info
 * 
 * @module hooks/useJudgeControlHandler
 */

import { useCallback, useEffect } from 'react';
import type { 
  ParsedControlCommand, 
  CommandExecutionResult,
  CommandHandler,
} from '../src/application/services/ChatControlCommandsService';

// ============================================
// TYPES
// ============================================

export type TournamentStatus = 'idle' | 'active' | 'paused' | 'voting' | 'finished';

export interface ContestantScore {
  id: string;
  name: string;
  totalScore: number;
  judgeScores: number[];
  publicVotes: number;
  rank: number;
}

export interface JudgeState {
  status: TournamentStatus;
  title: string;
  contestants: ContestantScore[];
  currentContestantIndex: number;
  currentContestant?: ContestantScore;
  publicVotingActive: boolean;
  publicVotingTimeLeft?: number;
  winnerId?: string;
}

export interface JudgeActions {
  /** Start the tournament */
  start: () => void;
  /** Pause the tournament */
  pause: () => void;
  /** Resume the tournament */
  resume: () => void;
  /** Move to next contestant */
  nextContestant: () => void;
  /** Move to previous contestant */
  prevContestant: () => void;
  /** Start public voting */
  startPublicVoting: (duration?: number) => void;
  /** Stop public voting */
  stopPublicVoting: () => void;
  /** Finish and declare winner */
  finish: () => ContestantScore | null;
  /** Get current state */
  getState: () => JudgeState | null;
}

export interface UseJudgeControlHandlerOptions {
  /** Current judge panel state */
  state: JudgeState | null;
  /** Judge panel actions */
  actions: JudgeActions;
  /** Register handler function from useChatControlCommands */
  registerHandler: (dynamic: 'judge', handler: CommandHandler) => () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format ranking for chat
 */
function formatRanking(contestants: ContestantScore[], limit: number = 5): string {
  const sorted = [...contestants].sort((a, b) => b.totalScore - a.totalScore);
  const top = sorted.slice(0, limit);
  
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  
  const lines = top.map((c, i) => 
    `${medals[i] || `${i + 1}.`} ${c.name}: ${c.totalScore.toFixed(1)} pts`
  );
  
  return `🏆 Ranking: ${lines.join(' | ')}`;
}

/**
 * Format tournament info for chat
 */
function formatTournamentInfo(state: JudgeState): string {
  const statusEmoji: Record<TournamentStatus, string> = {
    idle: '⏸️',
    active: '▶️',
    paused: '⏸️',
    voting: '🗳️',
    finished: '🏁',
  };

  const parts = [`${statusEmoji[state.status]} ${state.title}`];
  
  if (state.currentContestant) {
    parts.push(`🎤 Actual: ${state.currentContestant.name}`);
  }
  
  parts.push(`👥 ${state.contestants.length} participantes`);
  
  if (state.publicVotingActive && state.publicVotingTimeLeft !== undefined) {
    const mins = Math.floor(state.publicVotingTimeLeft / 60);
    const secs = state.publicVotingTimeLeft % 60;
    parts.push(`🗳️ Votación: ${mins}:${secs.toString().padStart(2, '0')}`);
  }
  
  if (state.winnerId) {
    const winner = state.contestants.find(c => c.id === state.winnerId);
    if (winner) {
      parts.push(`🏆 Ganador: ${winner.name}`);
    }
  }
  
  return parts.join(' | ');
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useJudgeControlHandler(options: UseJudgeControlHandlerOptions): void {
  const { state, actions, registerHandler } = options;

  // Create the command handler
  const handler: CommandHandler = useCallback((command: ParsedControlCommand): CommandExecutionResult => {
    const { action, args, user } = command;

    switch (action) {
      // ============================================
      // START TOURNAMENT
      // ============================================
      case 'start':
      case 'begin': {
        if (state?.status === 'active' || state?.status === 'voting') {
          return {
            success: false,
            message: '❌ Tournament already in progress',
          };
        }

        try {
          actions.start();
          return {
            success: true,
            message: `🎬 Tournament started by @${user.displayName}! "${state?.title || 'Tournament'}"`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error starting tournament: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // PAUSE TOURNAMENT
      // ============================================
      case 'pause': {
        if (state?.status !== 'active' && state?.status !== 'voting') {
          return {
            success: false,
            message: '❌ No active tournament to pause',
          };
        }

        try {
          actions.pause();
          return {
            success: true,
            message: `⏸️ Tournament paused by @${user.displayName}`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error pausing: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // RESUME TOURNAMENT
      // ============================================
      case 'resume':
      case 'continue': {
        if (state?.status !== 'paused') {
          return {
            success: false,
            message: '❌ Tournament is not paused',
          };
        }

        try {
          actions.resume();
          return {
            success: true,
            message: `▶️ Tournament resumed by @${user.displayName}`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error resuming: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // NEXT CONTESTANT
      // ============================================
      case 'next': {
        if (!state || state.status === 'idle' || state.status === 'finished') {
          return {
            success: false,
            message: '❌ No active tournament',
          };
        }

        if (state.currentContestantIndex >= state.contestants.length - 1) {
          return {
            success: false,
            message: '❌ Already at the last contestant',
          };
        }

        try {
          actions.nextContestant();
          const nextIndex = state.currentContestantIndex + 1;
          const next = state.contestants[nextIndex];
          return {
            success: true,
            message: `➡️ Next: ${next?.name || 'Contestant'} (${nextIndex + 1}/${state.contestants.length})`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // PREVIOUS CONTESTANT
      // ============================================
      case 'prev':
      case 'previous': {
        if (!state || state.status === 'idle' || state.status === 'finished') {
          return {
            success: false,
            message: '❌ No active tournament',
          };
        }

        if (state.currentContestantIndex <= 0) {
          return {
            success: false,
            message: '❌ Already at the first contestant',
          };
        }

        try {
          actions.prevContestant();
          const prevIndex = state.currentContestantIndex - 1;
          const prev = state.contestants[prevIndex];
          return {
            success: true,
            message: `⬅️ Previous: ${prev?.name || 'Contestant'} (${prevIndex + 1}/${state.contestants.length})`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // START PUBLIC VOTING
      // ============================================
      case 'vote':
      case 'voting': {
        if (!state || state.status === 'idle' || state.status === 'finished') {
          return {
            success: false,
            message: '❌ No active tournament',
          };
        }

        if (state.publicVotingActive) {
          return {
            success: false,
            message: '❌ Voting already active',
          };
        }

        const duration = args[0] ? parseInt(args[0], 10) : 60;

        try {
          actions.startPublicVoting(duration);
          return {
            success: true,
            message: `🗳️ Public voting started! Duration: ${duration}s | Type the contestant number to vote`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // FINISH & DECLARE WINNER
      // ============================================
      case 'winner':
      case 'finish': {
        if (!state || state.status === 'idle') {
          return {
            success: false,
            message: '❌ No active tournament',
          };
        }

        if (state.contestants.length === 0) {
          return {
            success: false,
            message: '❌ No contestants',
          };
        }

        try {
          const winner = actions.finish();
          
          if (!winner) {
            return {
              success: false,
              message: '❌ Could not determine winner',
            };
          }
          
          return {
            success: true,
            message: `🏆🎉 TOURNAMENT WINNER! 🎉🏆 ${winner.name} with ${winner.totalScore.toFixed(1)} points! Congratulations!`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // RANKING
      // ============================================
      case 'ranking':
      case 'rank':
      case 'top': {
        if (!state || state.contestants.length === 0) {
          return {
            success: false,
            message: '❌ No contestants to show ranking',
          };
        }

        const limit = args[0] ? parseInt(args[0], 10) : 5;
        return {
          success: true,
          message: formatRanking(state.contestants, Math.min(limit, 10)),
        };
      }

      // ============================================
      // INFO / HELP
      // ============================================
      case 'info':
      case 'help':
      case '': {
        if (!state || state.status === 'idle') {
          return {
            success: true,
            message: '📋 Commands: !tv judge start | !tv judge pause | !tv judge next | !tv judge vote | !tv judge winner | !tv judge ranking',
          };
        }
        return {
          success: true,
          message: formatTournamentInfo(state),
        };
      }

      // ============================================
      // UNKNOWN ACTION
      // ============================================
      default:
        return {
          success: false,
          message: `❌ Unknown action: ${action}. Use: start, pause, next, vote, winner, ranking`,
        };
    }
  }, [state, actions]);

  // Register the handler
  useEffect(() => {
    const unsubscribe = registerHandler('judge', handler);
    return unsubscribe;
  }, [registerHandler, handler]);
}

export default useJudgeControlHandler;
