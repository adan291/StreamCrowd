/**
 * usePollControlHandler Hook
 * 
 * Handles chat commands for controlling polls remotely.
 * 
 * Commands:
 * - !tv poll create "Pregunta" opcion1,opcion2,opcion3 [duracion]
 * - !tv poll close
 * - !tv poll results
 * - !tv poll reset
 * 
 * @module hooks/usePollControlHandler
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

export interface PollState {
  isActive: boolean;
  question: string;
  options: Array<{ label: string; votes: number }>;
  totalVotes: number;
  duration?: number;
  timeRemaining?: number;
}

export interface PollActions {
  /** Create a new poll */
  create: (question: string, options: string[], duration?: number) => void;
  /** Close the current poll */
  close: () => void;
  /** Reset/clear the poll */
  reset: () => void;
  /** Get current results */
  getResults: () => PollState | null;
}

export interface UsePollControlHandlerOptions {
  /** Current poll state */
  state: PollState | null;
  /** Poll actions */
  actions: PollActions;
  /** Register handler function from useChatControlCommands */
  registerHandler: (dynamic: 'poll', handler: CommandHandler) => () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse options from comma-separated string
 */
function parseOptions(input: string): string[] {
  return input
    .split(',')
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0);
}

/**
 * Format poll results for chat
 */
function formatResults(state: PollState): string {
  if (!state.isActive && state.totalVotes === 0) {
    return '📊 No hay encuesta activa';
  }

  const lines = [`📊 ${state.question}`];
  
  state.options.forEach((opt, i) => {
    const percentage = state.totalVotes > 0 
      ? Math.round((opt.votes / state.totalVotes) * 100) 
      : 0;
    const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    lines.push(`${i + 1}. ${opt.label}: ${bar} ${percentage}% (${opt.votes})`);
  });
  
  lines.push(`Total: ${state.totalVotes} votos`);
  
  if (state.timeRemaining !== undefined && state.timeRemaining > 0) {
    const mins = Math.floor(state.timeRemaining / 60);
    const secs = state.timeRemaining % 60;
    lines.push(`⏱️ ${mins}:${secs.toString().padStart(2, '0')}`);
  }
  
  return lines.join(' | ');
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePollControlHandler(options: UsePollControlHandlerOptions): void {
  const { state, actions, registerHandler } = options;

  // Create the command handler
  const handler: CommandHandler = useCallback((command: ParsedControlCommand): CommandExecutionResult => {
    const { action, args, rawArgs, user } = command;

    switch (action) {
      // ============================================
      // CREATE POLL
      // ============================================
      case 'create':
      case 'new': {
        if (state?.isActive) {
          return {
            success: false,
            message: '❌ Poll already active. Close it first with !tv poll close',
          };
        }

        // Parse: "Question" option1,option2,option3 [duration]
        if (args.length < 2) {
          return {
            success: false,
            message: '❌ Usage: !tv poll create "Question" option1,option2,option3 [duration]',
          };
        }

        const question = args[0];
        const optionsStr = args[1];
        const duration = args[2] ? parseInt(args[2], 10) : undefined;
        
        const pollOptions = parseOptions(optionsStr);
        
        if (pollOptions.length < 2) {
          return {
            success: false,
            message: '❌ Need at least 2 options separated by commas',
          };
        }

        if (pollOptions.length > 10) {
          return {
            success: false,
            message: '❌ Maximum 10 options allowed',
          };
        }

        try {
          actions.create(question, pollOptions, duration);
          return {
            success: true,
            message: `✅ Poll created by @${user.displayName}: "${question}" with ${pollOptions.length} options`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error creating poll: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // CLOSE POLL
      // ============================================
      case 'close':
      case 'end':
      case 'stop': {
        if (!state?.isActive) {
          return {
            success: false,
            message: '❌ No active poll to close',
          };
        }

        try {
          actions.close();
          
          // Get winner
          const winner = state.options.reduce((max, opt) => 
            opt.votes > max.votes ? opt : max
          , state.options[0]);
          
          return {
            success: true,
            message: `🏆 Poll closed! Winner: "${winner.label}" with ${winner.votes} votes (${Math.round((winner.votes / state.totalVotes) * 100)}%)`,
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error closing poll: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      }

      // ============================================
      // GET RESULTS
      // ============================================
      case 'results':
      case 'votes': {
        if (!state) {
          return {
            success: false,
            message: '📊 No active poll',
          };
        }

        return {
          success: true,
          message: formatResults(state),
        };
      }

      // ============================================
      // RESET POLL
      // ============================================
      case 'reset':
      case 'clear': {
        try {
          actions.reset();
          return {
            success: true,
            message: '🔄 Poll reset',
          };
        } catch (err) {
          return {
            success: false,
            message: `❌ Error resetting: ${err instanceof Error ? err.message : 'Unknown error'}`,
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
          message: '📊 ENCUESTA: !tv poll create "Pregunta" op1,op2,op3 [seg] | !tv poll close | !tv poll results | !tv poll reset',
        };
      }

      case 'info':
      case '': {
        if (!state?.isActive) {
          return {
            success: true,
            message: '📊 No hay encuesta activa. Usa !tv poll help para ver comandos',
          };
        }
        return {
          success: true,
          message: formatResults(state),
        };
      }

      // ============================================
      // UNKNOWN ACTION
      // ============================================
      default:
        return {
          success: false,
          message: `❌ Unknown action: ${action}. Use: create, close, results, reset`,
        };
    }
  }, [state, actions]);

  // Register the handler
  useEffect(() => {
    const unsubscribe = registerHandler('poll', handler);
    return unsubscribe;
  }, [registerHandler, handler]);
}

export default usePollControlHandler;
