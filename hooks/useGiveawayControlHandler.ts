/**
 * useGiveawayControlHandler Hook
 * 
 * Handles chat commands for controlling giveaways remotely.
 * 
 * Commands:
 * - !sorteo iniciar "Premio" [palabra_clave] [duracion]
 * - !sorteo ganador
 * - !sorteo reroll
 * - !sorteo cerrar
 * - !sorteo participantes
 * - !sorteo info
 * 
 * @module hooks/useGiveawayControlHandler
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

export interface GiveawayState {
  isActive: boolean;
  name: string;
  keyword?: string;
  participants: Array<{ username: string; displayName: string }>;
  participantCount: number;
  winner?: { username: string; displayName: string } | null;
  duration?: number;
  timeRemaining?: number;
  endsAt?: number;
}

export interface GiveawayActions {
  /** Start a new giveaway */
  start: (name: string, keyword?: string, duration?: number) => void;
  /** Pick a winner */
  pickWinner: () => { username: string; displayName: string } | null;
  /** Reroll (pick new winner) */
  reroll: () => { username: string; displayName: string } | null;
  /** Close/end the giveaway */
  close: () => void;
  /** Get current state */
  getState: () => GiveawayState | null;
}

export interface UseGiveawayControlHandlerOptions {
  /** Current giveaway state */
  state: GiveawayState | null;
  /** Giveaway actions */
  actions: GiveawayActions;
  /** Register handler function from useChatControlCommands */
  registerHandler: (dynamic: 'giveaway', handler: CommandHandler) => () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format time remaining
 */
function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format giveaway info for chat
 */
function formatGiveawayInfo(state: GiveawayState): string {
  const parts = [`🎁 Sorteo: ${state.name}`];
  
  if (state.keyword) {
    parts.push(`📝 Escribe "${state.keyword}" para participar`);
  }
  
  parts.push(`👥 ${state.participantCount} participantes`);
  
  if (state.timeRemaining !== undefined && state.timeRemaining > 0) {
    parts.push(`⏱️ ${formatTimeRemaining(state.timeRemaining)}`);
  }
  
  if (state.winner) {
    parts.push(`🏆 Ganador: @${state.winner.displayName}`);
  }
  
  return parts.join(' | ');
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useGiveawayControlHandler(options: UseGiveawayControlHandlerOptions): void {
  const { state, actions, registerHandler } = options;

  // Create the command handler
  const handler: CommandHandler = useCallback((command: ParsedControlCommand): CommandExecutionResult => {
    const { action, args, user } = command;

    switch (action) {
      // ============================================
      // START GIVEAWAY
      // ============================================
      case 'start':
      case 'new': {
        if (state?.isActive) {
          return {
            success: false,
            message: '❌ Raffle already active. Close it first with !tv raffle close',
          };
        }

        // Parse: "Prize" [keyword] [duration]
        if (args.length < 1) {
          return {
            success: false,
            message: '❌ Usage: !tv raffle start "Prize" [keyword] [duration_seconds]',
          };
        }

        const name = args[0];
        const keyword = args[1] || undefined;
        const duration = args[2] ? parseInt(args[2], 10) : undefined;

        try {
          actions.start(name, keyword, duration);
          
          let message = `🎁 Raffle started by @${user.displayName}! Prize: "${name}"`;
          if (keyword) {
            message += ` | Type "${keyword}" to enter`;
          }
          if (duration) {
            message += ` | Duration: ${formatTimeRemaining(duration)}`;
          }
          
          return {
            success: true,
            message,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error starting raffle: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // PICK WINNER
      // ============================================
      case 'winner':
      case 'pick': {
        if (!state?.isActive) {
          return {
            success: false,
            message: '❌ No active raffle',
          };
        }

        if (state.participantCount === 0) {
          return {
            success: false,
            message: '❌ No participants in the raffle',
          };
        }

        try {
          const winner = actions.pickWinner();
          
          if (!winner) {
            return {
              success: false,
              message: '❌ Could not pick a winner',
            };
          }
          
          return {
            success: true,
            message: `🎉🎉🎉 CONGRATULATIONS @${winner.displayName}! You won "${state.name}" 🎉🎉🎉`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error picking winner: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // REROLL
      // ============================================
      case 'reroll':
      case 'again': {
        if (!state?.isActive && !state?.winner) {
          return {
            success: false,
            message: '❌ No raffle to reroll',
          };
        }

        if (state && state.participantCount <= 1) {
          return {
            success: false,
            message: '❌ Not enough participants to reroll',
          };
        }

        try {
          const winner = actions.reroll();
          
          if (!winner) {
            return {
              success: false,
              message: '❌ Could not pick a new winner',
            };
          }
          
          return {
            success: true,
            message: `🔄 New winner! 🎉 @${winner.displayName} wins "${state?.name || 'the raffle'}" 🎉`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error rerolling: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // CLOSE GIVEAWAY
      // ============================================
      case 'close':
      case 'end':
      case 'stop': {
        if (!state?.isActive) {
          return {
            success: false,
            message: '❌ No active raffle to close',
          };
        }

        try {
          actions.close();
          return {
            success: true,
            message: `🔒 Raffle "${state.name}" closed by @${user.displayName}`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error closing raffle: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // PARTICIPANTS
      // ============================================
      case 'participants':
      case 'count':
      case 'p': {
        if (!state) {
          return {
            success: false,
            message: '❌ No active raffle',
          };
        }

        return {
          success: true,
          message: `👥 Participants in "${state.name}": ${state.participantCount}`,
        };
      }

      // ============================================
      // INFO / HELP
      // ============================================
      case 'help':
      case 'commands':
      case 'cmds': {
        return {
          success: true,
          message: '🎁 SORTEO: !tv raffle start "Premio" [keyword] [seg] | !tv raffle winner | !tv raffle reroll | !tv raffle close | !tv raffle participants',
        };
      }

      case 'info':
      case '': {
        if (!state?.isActive) {
          return {
            success: true,
            message: '🎁 No hay sorteo activo. Usa !tv raffle help para ver comandos',
          };
        }
        return {
          success: true,
          message: formatGiveawayInfo(state),
        };
      }

      // ============================================
      // UNKNOWN ACTION
      // ============================================
      default:
        return {
          success: false,
          message: `❌ Unknown action: ${action}. Use: start, winner, reroll, close, participants`,
        };
    }
  }, [state, actions]);

  // Register the handler
  useEffect(() => {
    const unsubscribe = registerHandler('giveaway', handler);
    return unsubscribe;
  }, [registerHandler, handler]);
}

export default useGiveawayControlHandler;
