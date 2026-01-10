/**
 * ChatCommands Service
 * Handles chat commands for giveaway system
 */

import type { GiveawayThread } from '../types';

// ============================================
// TYPES
// ============================================

export interface ChatCommand {
  name: string;
  aliases: string[];
  description: string;
  cooldown: number; // seconds
  modOnly: boolean;
}

export interface CommandResponse {
  message: string;
  success: boolean;
}

export interface ChatCommandsConfig {
  prefix: string; // e.g., "!"
  enabled: boolean;
  announceWinner: boolean;
  announceWinnerDelay: number; // seconds
  winnerMessageTemplate: string;
  requireWinnerConfirmation: boolean;
  confirmationTimeout: number; // seconds
  cooldownEnabled: boolean;
  globalCooldown: number; // seconds
}

export const DEFAULT_CHAT_COMMANDS_CONFIG: ChatCommandsConfig = {
  prefix: '!',
  enabled: true,
  announceWinner: true,
  announceWinnerDelay: 2,
  winnerMessageTemplate: '🎉 ¡Felicidades {winner}! Has ganado el sorteo "{name}"',
  requireWinnerConfirmation: false,
  confirmationTimeout: 60,
  cooldownEnabled: true,
  globalCooldown: 5,
};

// ============================================
// AVAILABLE COMMANDS
// ============================================

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    name: 'participantes',
    aliases: ['participants', 'p'],
    description: 'Muestra el número de participantes del sorteo activo',
    cooldown: 10,
    modOnly: false,
  },
  {
    name: 'sorteo',
    aliases: ['giveaway', 'raffle'],
    description: 'Muestra información del sorteo activo',
    cooldown: 10,
    modOnly: false,
  },
  {
    name: 'tiempo',
    aliases: ['time', 't'],
    description: 'Muestra el tiempo restante del sorteo',
    cooldown: 5,
    modOnly: false,
  },
  {
    name: 'ganador',
    aliases: ['winner', 'w'],
    description: 'Muestra el último ganador',
    cooldown: 10,
    modOnly: false,
  },
];

// ============================================
// CHAT COMMANDS SERVICE
// ============================================

export class ChatCommandsService {
  private config: ChatCommandsConfig;
  private lastCommandTime: Map<string, number> = new Map();
  private pendingConfirmation: {
    winner: string;
    threadId: string;
    expiresAt: number;
  } | null = null;

  constructor(config: Partial<ChatCommandsConfig> = {}) {
    this.config = { ...DEFAULT_CHAT_COMMANDS_CONFIG, ...config };
  }

  updateConfig(config: Partial<ChatCommandsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChatCommandsConfig {
    return { ...this.config };
  }

  /**
   * Parse a chat message and check if it's a command
   */
  parseCommand(message: string): { command: string; args: string[] } | null {
    if (!this.config.enabled) return null;
    if (!message.startsWith(this.config.prefix)) return null;

    const parts = message.slice(this.config.prefix.length).trim().split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!commandName) return null;

    // Find matching command
    const command = CHAT_COMMANDS.find(
      (cmd) => cmd.name === commandName || cmd.aliases.includes(commandName)
    );

    if (!command) return null;

    return { command: command.name, args };
  }

  /**
   * Check if command is on cooldown
   */
  isOnCooldown(commandName: string): boolean {
    if (!this.config.cooldownEnabled) return false;

    const lastTime = this.lastCommandTime.get(commandName);
    if (!lastTime) return false;

    const command = CHAT_COMMANDS.find((c) => c.name === commandName);
    const cooldown = command?.cooldown || this.config.globalCooldown;

    return Date.now() - lastTime < cooldown * 1000;
  }

  /**
   * Execute a command and return response
   */
  executeCommand(
    commandName: string,
    args: string[],
    context: {
      activeThread?: GiveawayThread;
      lastWinner?: string;
      participantCount?: number;
    }
  ): CommandResponse | null {
    if (this.isOnCooldown(commandName)) {
      return null; // Silently ignore cooldown
    }

    this.lastCommandTime.set(commandName, Date.now());

    switch (commandName) {
      case 'participantes':
        return this.handleParticipantes(context);
      case 'sorteo':
        return this.handleSorteo(context);
      case 'tiempo':
        return this.handleTiempo(context);
      case 'ganador':
        return this.handleGanador(context);
      default:
        return null;
    }
  }

  private handleParticipantes(context: {
    activeThread?: GiveawayThread;
    participantCount?: number;
  }): CommandResponse {
    const count = context.activeThread?.participants.length || context.participantCount || 0;
    
    if (!context.activeThread) {
      return {
        message: '❌ No hay ningún sorteo activo en este momento',
        success: false,
      };
    }

    return {
      message: `👥 Participantes: ${count}`,
      success: true,
    };
  }

  private handleSorteo(context: { activeThread?: GiveawayThread }): CommandResponse {
    const thread = context.activeThread;

    if (!thread) {
      return {
        message: '❌ No hay ningún sorteo activo en este momento',
        success: false,
      };
    }

    const parts = [`🎁 Sorteo: ${thread.name}`];
    
    if (thread.keyword) {
      parts.push(`📝 Escribe "${thread.keyword}" para participar`);
    }
    
    parts.push(`👥 ${thread.participants.length} participantes`);

    if (thread.endsAt) {
      const remaining = Math.max(0, Math.floor((thread.endsAt - Date.now()) / 1000));
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        parts.push(`⏱️ Tiempo: ${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }

    return {
      message: parts.join(' | '),
      success: true,
    };
  }

  private handleTiempo(context: { activeThread?: GiveawayThread }): CommandResponse {
    const thread = context.activeThread;

    if (!thread) {
      return {
        message: '❌ No hay ningún sorteo activo',
        success: false,
      };
    }

    if (!thread.endsAt) {
      return {
        message: '⏱️ Este sorteo no tiene límite de tiempo',
        success: true,
      };
    }

    const remaining = Math.max(0, Math.floor((thread.endsAt - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    if (remaining === 0) {
      return {
        message: '⏱️ ¡El tiempo ha terminado!',
        success: true,
      };
    }

    return {
      message: `⏱️ Tiempo restante: ${mins}:${secs.toString().padStart(2, '0')}`,
      success: true,
    };
  }

  private handleGanador(context: { lastWinner?: string }): CommandResponse {
    if (!context.lastWinner) {
      return {
        message: '❌ Aún no hay ganador',
        success: false,
      };
    }

    return {
      message: `🏆 Último ganador: ${context.lastWinner}`,
      success: true,
    };
  }

  /**
   * Generate winner announcement message
   */
  generateWinnerAnnouncement(winner: string, giveawayName: string): string {
    return this.config.winnerMessageTemplate
      .replace('{winner}', winner)
      .replace('{name}', giveawayName);
  }

  /**
   * Set pending winner confirmation
   */
  setPendingConfirmation(winner: string, threadId: string): void {
    if (!this.config.requireWinnerConfirmation) return;

    this.pendingConfirmation = {
      winner,
      threadId,
      expiresAt: Date.now() + this.config.confirmationTimeout * 1000,
    };
  }

  /**
   * Check if a message confirms the winner
   */
  checkWinnerConfirmation(username: string, message: string): boolean {
    if (!this.pendingConfirmation) return false;
    if (username.toLowerCase() !== this.pendingConfirmation.winner.toLowerCase()) return false;
    if (Date.now() > this.pendingConfirmation.expiresAt) {
      this.pendingConfirmation = null;
      return false;
    }

    // Any message from the winner counts as confirmation
    this.pendingConfirmation = null;
    return true;
  }

  /**
   * Check if confirmation has expired
   */
  isConfirmationExpired(): boolean {
    if (!this.pendingConfirmation) return false;
    return Date.now() > this.pendingConfirmation.expiresAt;
  }

  /**
   * Get pending confirmation info
   */
  getPendingConfirmation(): { winner: string; threadId: string; remainingTime: number } | null {
    if (!this.pendingConfirmation) return null;
    if (this.isConfirmationExpired()) {
      this.pendingConfirmation = null;
      return null;
    }

    return {
      winner: this.pendingConfirmation.winner,
      threadId: this.pendingConfirmation.threadId,
      remainingTime: Math.max(0, Math.floor((this.pendingConfirmation.expiresAt - Date.now()) / 1000)),
    };
  }

  /**
   * Clear pending confirmation
   */
  clearPendingConfirmation(): void {
    this.pendingConfirmation = null;
  }
}

// Singleton instance
let chatCommandsInstance: ChatCommandsService | null = null;

export function getChatCommandsService(config?: Partial<ChatCommandsConfig>): ChatCommandsService {
  if (!chatCommandsInstance) {
    chatCommandsInstance = new ChatCommandsService(config);
  } else if (config) {
    chatCommandsInstance.updateConfig(config);
  }
  return chatCommandsInstance;
}

export default ChatCommandsService;
