/**
 * ChatControlCommandsService - Remote control of dynamics via chat commands
 * 
 * Allows streamers and moderators to control dynamics from Twitch/YouTube/Kick chat:
 * - Create, close, and manage polls
 * - Start, stop, and pick winners for giveaways
 * - Create, lock, resolve predictions
 * - Start/stop judge tournaments
 * 
 * @module src/application/services/ChatControlCommandsService
 */

import type { Platform } from '../../../types/platform';

// ============================================
// TYPES
// ============================================

export type DynamicType = 'poll' | 'giveaway' | 'prediction' | 'judge';

export type PermissionLevel = 'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'everyone';

export interface CommandUser {
  id: string;
  username: string;
  displayName: string;
  isBroadcaster: boolean;
  isModerator: boolean;
  isVip: boolean;
  isSubscriber: boolean;
  platform: Platform;
}

export interface ControlCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
  minPermission: PermissionLevel;
  dynamic: DynamicType;
  subcommands?: string[];
}

export interface ParsedControlCommand {
  dynamic: DynamicType;
  action: string;
  args: string[];
  rawArgs: string;
  user: CommandUser;
  timestamp: number;
}

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export type CommandHandler = (
  command: ParsedControlCommand
) => Promise<CommandExecutionResult> | CommandExecutionResult;

export interface ChatControlConfig {
  enabled: boolean;
  prefix: string;
  allowedPermissions: Record<DynamicType, PermissionLevel>;
  cooldownMs: number;
  announceInChat: boolean;
  language: 'es' | 'en';
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_CONTROL_CONFIG: ChatControlConfig = {
  enabled: true,
  prefix: '!',
  allowedPermissions: {
    poll: 'moderator',
    giveaway: 'moderator',
    prediction: 'moderator',
    judge: 'moderator',
  },
  cooldownMs: 2000,
  announceInChat: true,
  language: 'es',
};

/**
 * All available control commands (using !tv prefix to avoid conflicts)
 */
export const CONTROL_COMMANDS: ControlCommand[] = [
  // ============================================
  // POLL COMMANDS (!tv poll)
  // ============================================
  {
    name: 'tv',
    aliases: [],
    description: 'Control TwitchVote dynamics',
    usage: '!tv <dynamic> <action> [args]',
    examples: [
      '!tv poll create "What game?" option1,option2,option3',
      '!tv poll close',
      '!tv poll results',
      '!tv raffle start "Prize" keyword',
      '!tv raffle winner',
      '!tv pred create "Who wins?" team1,team2',
      '!tv judge next',
    ],
    minPermission: 'moderator',
    dynamic: 'poll',
    subcommands: ['poll', 'raffle', 'pred', 'judge'],
  },
];

// ============================================
// PERMISSION HELPERS
// ============================================

const PERMISSION_HIERARCHY: PermissionLevel[] = [
  'broadcaster',
  'moderator',
  'vip',
  'subscriber',
  'everyone',
];

/**
 * Check if user has required permission level
 */
export function hasPermission(user: CommandUser, required: PermissionLevel): boolean {
  if (user.isBroadcaster) return true;
  
  const requiredIndex = PERMISSION_HIERARCHY.indexOf(required);
  
  if (user.isModerator && requiredIndex >= PERMISSION_HIERARCHY.indexOf('moderator')) {
    return true;
  }
  
  if (user.isVip && requiredIndex >= PERMISSION_HIERARCHY.indexOf('vip')) {
    return true;
  }
  
  if (user.isSubscriber && requiredIndex >= PERMISSION_HIERARCHY.indexOf('subscriber')) {
    return true;
  }
  
  return required === 'everyone';
}

/**
 * Get user's highest permission level
 */
export function getUserPermissionLevel(user: CommandUser): PermissionLevel {
  if (user.isBroadcaster) return 'broadcaster';
  if (user.isModerator) return 'moderator';
  if (user.isVip) return 'vip';
  if (user.isSubscriber) return 'subscriber';
  return 'everyone';
}

// ============================================
// COMMAND PARSING
// ============================================

/**
 * Parse a chat message into a control command
 * Format: !tv <dynamic> <action> [args]
 * Examples: !tv poll create "Question" op1,op2
 *           !tv raffle winner
 *           !tv pred resolve 1
 */
export function parseControlCommand(
  message: string,
  user: CommandUser,
  config: ChatControlConfig
): ParsedControlCommand | null {
  if (!config.enabled) return null;
  
  const trimmed = message.trim();
  if (!trimmed.startsWith(config.prefix)) return null;
  
  // Remove prefix and split
  const withoutPrefix = trimmed.slice(config.prefix.length);
  
  // Handle quoted strings properly
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of withoutPrefix) {
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  
  if (parts.length === 0) return null;
  
  const firstWord = parts[0].toLowerCase();
  
  // Check if it's a !tv command
  if (firstWord !== 'tv') return null;
  
  if (parts.length < 2) return null;
  
  const dynamicName = parts[1].toLowerCase();
  const action = parts[2]?.toLowerCase() || '';
  const args = parts.slice(3);
  
  // Map dynamic name to type
  const dynamicMap: Record<string, DynamicType> = {
    'poll': 'poll',
    'raffle': 'giveaway',
    'giveaway': 'giveaway',
    'pred': 'prediction',
    'prediction': 'prediction',
    'judge': 'judge',
    'tournament': 'judge',
  };
  
  const dynamic = dynamicMap[dynamicName];
  if (!dynamic) return null;
  
  // Check permission
  const requiredPermission = config.allowedPermissions[dynamic];
  if (!hasPermission(user, requiredPermission)) {
    return null; // Silently ignore if no permission
  }
  
  return {
    dynamic,
    action,
    args,
    rawArgs: parts.slice(3).join(' '),
    user,
    timestamp: Date.now(),
  };
}

// ============================================
// SERVICE CLASS
// ============================================

export class ChatControlCommandsService {
  private config: ChatControlConfig;
  private handlers: Map<DynamicType, CommandHandler> = new Map();
  private lastCommandTime: Map<string, number> = new Map();
  private messageCallback: ((message: string) => void) | null = null;

  constructor(config: Partial<ChatControlConfig> = {}) {
    this.config = { ...DEFAULT_CONTROL_CONFIG, ...config };
  }

  // ============================================
  // Configuration
  // ============================================

  updateConfig(config: Partial<ChatControlConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChatControlConfig {
    return { ...this.config };
  }

  // ============================================
  // Handler Registration
  // ============================================

  /**
   * Register a handler for a dynamic type
   */
  registerHandler(dynamic: DynamicType, handler: CommandHandler): () => void {
    this.handlers.set(dynamic, handler);
    return () => this.handlers.delete(dynamic);
  }

  /**
   * Set callback for sending messages to chat
   */
  setMessageCallback(callback: (message: string) => void): void {
    this.messageCallback = callback;
  }

  // ============================================
  // Command Processing
  // ============================================

  /**
   * Process a chat message and execute command if valid
   */
  async processMessage(
    message: string,
    user: CommandUser
  ): Promise<CommandExecutionResult | null> {
    // Parse command
    const parsed = parseControlCommand(message, user, this.config);
    if (!parsed) return null;
    
    // Check cooldown
    const cooldownKey = `${user.id}:${parsed.dynamic}`;
    const lastTime = this.lastCommandTime.get(cooldownKey);
    if (lastTime && Date.now() - lastTime < this.config.cooldownMs) {
      return null; // Silently ignore cooldown
    }
    
    // Get handler
    const handler = this.handlers.get(parsed.dynamic);
    if (!handler) {
      return {
        success: false,
        message: `No hay handler registrado para ${parsed.dynamic}`,
      };
    }
    
    // Update cooldown
    this.lastCommandTime.set(cooldownKey, Date.now());
    
    // Execute handler
    try {
      const result = await handler(parsed);
      
      // Announce in chat if enabled
      if (this.config.announceInChat && result.success && this.messageCallback) {
        this.messageCallback(result.message);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      return {
        success: false,
        message: `Error ejecutando comando: ${errorMsg}`,
      };
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get available commands for a user
   */
  getAvailableCommands(user: CommandUser): ControlCommand[] {
    return CONTROL_COMMANDS.filter(cmd => {
      const required = this.config.allowedPermissions[cmd.dynamic];
      return hasPermission(user, required);
    });
  }

  /**
   * Get help text for a command
   */
  getCommandHelp(commandName: string): string | null {
    const command = CONTROL_COMMANDS.find(
      cmd => cmd.name === commandName || cmd.aliases.includes(commandName)
    );
    
    if (!command) return null;
    
    const lines = [
      `📋 ${this.config.prefix}${command.name} - ${command.description}`,
      `Uso: ${command.usage}`,
      `Subcomandos: ${command.subcommands?.join(', ') || 'ninguno'}`,
      `Ejemplos:`,
      ...command.examples.map(ex => `  ${ex}`),
    ];
    
    return lines.join('\n');
  }

  /**
   * Reset cooldowns
   */
  resetCooldowns(): void {
    this.lastCommandTime.clear();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let instance: ChatControlCommandsService | null = null;

export function getChatControlCommandsService(
  config?: Partial<ChatControlConfig>
): ChatControlCommandsService {
  if (!instance) {
    instance = new ChatControlCommandsService(config);
  } else if (config) {
    instance.updateConfig(config);
  }
  return instance;
}

export function resetChatControlCommandsService(): void {
  instance = null;
}

export default ChatControlCommandsService;
