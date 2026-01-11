/**
 * usePredictionControlHandler Hook
 * 
 * Handles chat commands for controlling predictions remotely.
 * 
 * Commands:
 * - !prediccion crear "Titulo" opcion1,opcion2 [duracion]
 * - !prediccion bloquear
 * - !prediccion resolver <numero_opcion>
 * - !prediccion cancelar
 * - !prediccion info
 * 
 * @module hooks/usePredictionControlHandler
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

export type PredictionStatus = 'active' | 'locked' | 'resolved' | 'canceled' | 'none';

export interface PredictionOutcome {
  id: string;
  title: string;
  users: number;
  channelPoints: number;
  color: string;
}

export interface PredictionState {
  status: PredictionStatus;
  title: string;
  outcomes: PredictionOutcome[];
  totalUsers: number;
  totalPoints: number;
  locksAt?: number;
  timeRemaining?: number;
  winningOutcomeId?: string;
}

export interface PredictionActions {
  /** Create a new prediction */
  create: (title: string, outcomes: string[], duration?: number) => Promise<boolean>;
  /** Lock the prediction (no more bets) */
  lock: () => Promise<boolean>;
  /** Resolve with winning outcome */
  resolve: (outcomeIndex: number) => Promise<boolean>;
  /** Cancel the prediction */
  cancel: () => Promise<boolean>;
  /** Get current state */
  getState: () => PredictionState | null;
}

export interface UsePredictionControlHandlerOptions {
  /** Current prediction state */
  state: PredictionState | null;
  /** Prediction actions */
  actions: PredictionActions;
  /** Register handler function from useChatControlCommands */
  registerHandler: (dynamic: 'prediction', handler: CommandHandler) => () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse outcomes from comma-separated string
 */
function parseOutcomes(input: string): string[] {
  return input
    .split(',')
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0);
}

/**
 * Format time remaining
 */
function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format prediction info for chat
 */
function formatPredictionInfo(state: PredictionState): string {
  const statusEmoji: Record<PredictionStatus, string> = {
    active: '🔮',
    locked: '🔒',
    resolved: '✅',
    canceled: '❌',
    none: '📋',
  };

  const parts = [`${statusEmoji[state.status]} ${state.title}`];
  
  state.outcomes.forEach((outcome, i) => {
    const percentage = state.totalPoints > 0 
      ? Math.round((outcome.channelPoints / state.totalPoints) * 100) 
      : 0;
    parts.push(`${i + 1}. ${outcome.title}: ${percentage}% (${outcome.users} usuarios, ${outcome.channelPoints.toLocaleString()} pts)`);
  });
  
  if (state.timeRemaining !== undefined && state.timeRemaining > 0 && state.status === 'active') {
    parts.push(`⏱️ Se bloquea en: ${formatTimeRemaining(state.timeRemaining)}`);
  }
  
  if (state.winningOutcomeId) {
    const winner = state.outcomes.find(o => o.id === state.winningOutcomeId);
    if (winner) {
      parts.push(`🏆 Ganador: ${winner.title}`);
    }
  }
  
  return parts.join(' | ');
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePredictionControlHandler(options: UsePredictionControlHandlerOptions): void {
  const { state, actions, registerHandler } = options;

  // Create the command handler
  const handler: CommandHandler = useCallback(async (command: ParsedControlCommand): Promise<CommandExecutionResult> => {
    const { action, args, user } = command;

    switch (action) {
      // ============================================
      // CREATE PREDICTION
      // ============================================
      case 'create':
      case 'new': {
        if (state && state.status !== 'none' && state.status !== 'resolved' && state.status !== 'canceled') {
          return {
            success: false,
            message: '❌ Prediction already active. Resolve or cancel it first.',
          };
        }

        // Parse: "Title" option1,option2 [duration]
        if (args.length < 2) {
          return {
            success: false,
            message: '❌ Usage: !tv pred create "Title" option1,option2 [duration_seconds]',
          };
        }

        const title = args[0];
        const outcomesStr = args[1];
        const duration = args[2] ? parseInt(args[2], 10) : 120; // Default 2 minutes
        
        const outcomes = parseOutcomes(outcomesStr);
        
        if (outcomes.length < 2) {
          return {
            success: false,
            message: '❌ Need at least 2 options separated by commas',
          };
        }

        if (outcomes.length > 10) {
          return {
            success: false,
            message: '❌ Maximum 10 options allowed',
          };
        }

        try {
          const success = await actions.create(title, outcomes, duration);
          
          if (!success) {
            return {
              success: false,
              message: '❌ Could not create prediction. Check permissions.',
            };
          }
          
          return {
            success: true,
            message: `🔮 Prediction created by @${user.displayName}: "${title}" | Options: ${outcomes.join(', ')} | Duration: ${formatTimeRemaining(duration)}`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error creating prediction: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // LOCK PREDICTION
      // ============================================
      case 'lock':
      case 'close': {
        if (!state || state.status !== 'active') {
          return {
            success: false,
            message: '❌ No active prediction to lock',
          };
        }

        try {
          const success = await actions.lock();
          
          if (!success) {
            return {
              success: false,
              message: '❌ Could not lock prediction',
            };
          }
          
          return {
            success: true,
            message: `🔒 Prediction locked by @${user.displayName} - No more bets`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error locking: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // RESOLVE PREDICTION
      // ============================================
      case 'resolve':
      case 'winner': {
        if (!state || (state.status !== 'active' && state.status !== 'locked')) {
          return {
            success: false,
            message: '❌ No active prediction to resolve',
          };
        }

        if (args.length < 1) {
          const options = state.outcomes.map((o, i) => `${i + 1}=${o.title}`).join(', ');
          return {
            success: false,
            message: `❌ Usage: !tv pred resolve <number> | Options: ${options}`,
          };
        }

        const outcomeIndex = parseInt(args[0], 10) - 1; // Convert to 0-based
        
        if (isNaN(outcomeIndex) || outcomeIndex < 0 || outcomeIndex >= state.outcomes.length) {
          return {
            success: false,
            message: `❌ Invalid option. Use a number from 1 to ${state.outcomes.length}`,
          };
        }

        try {
          const success = await actions.resolve(outcomeIndex);
          
          if (!success) {
            return {
              success: false,
              message: '❌ Could not resolve prediction',
            };
          }
          
          const winner = state.outcomes[outcomeIndex];
          return {
            success: true,
            message: `✅ Prediction resolved by @${user.displayName} | Winner: "${winner.title}" 🎉`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error resolving: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // CANCEL PREDICTION
      // ============================================
      case 'cancel': {
        if (!state || (state.status !== 'active' && state.status !== 'locked')) {
          return {
            success: false,
            message: '❌ No active prediction to cancel',
          };
        }

        try {
          const success = await actions.cancel();
          
          if (!success) {
            return {
              success: false,
              message: '❌ Could not cancel prediction',
            };
          }
          
          return {
            success: true,
            message: `❌ Prediction canceled by @${user.displayName} - Points refunded`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error canceling: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // INFO / HELP
      // ============================================
      case 'help':
      case 'commands':
      case 'cmds': {
        return {
          success: true,
          message: '🔮 PREDICCIÓN: !tv pred create "Título" op1,op2 [seg] | !tv pred lock | !tv pred resolve <num> | !tv pred cancel',
        };
      }

      case 'info':
      case '': {
        if (!state || state.status === 'none') {
          return {
            success: true,
            message: '🔮 No hay predicción activa. Usa !tv pred help para ver comandos',
          };
        }
        return {
          success: true,
          message: formatPredictionInfo(state),
        };
      }

      // ============================================
      // UNKNOWN ACTION
      // ============================================
      default:
        return {
          success: false,
          message: `❌ Unknown action: ${action}. Use: create, lock, resolve, cancel`,
        };
    }
  }, [state, actions]);

  // Register the handler
  useEffect(() => {
    const unsubscribe = registerHandler('prediction', handler);
    return unsubscribe;
  }, [registerHandler, handler]);
}

export default usePredictionControlHandler;
