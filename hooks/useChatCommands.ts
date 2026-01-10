/**
 * useChatCommands Hook - Generic Chat Command Processing
 * Reusable command parsing and cooldown management for all activities
 * Provides command detection, parsing, and cooldown enforcement
 */

import { useState, useCallback, useRef, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  enabled: boolean;
  cooldownMs: number;
  description?: string;
  requiresArgs?: boolean;
  minArgs?: number;
  maxArgs?: number;
}

export interface ParsedCommand {
  name: string;
  args: string[];
  rawArgs: string;
  originalMessage: string;
  userId: string;
  username: string;
  timestamp: number;
}

export interface CommandResult {
  success: boolean;
  command?: ParsedCommand;
  error?: 'not_command' | 'unknown_command' | 'disabled' | 'on_cooldown' | 'invalid_args';
  cooldownRemaining?: number;
}

export interface UseChatCommandsOptions {
  prefix?: string;
  commands: CommandDefinition[];
  globalCooldownMs?: number;
  userCooldownMs?: number;
}

export interface UseChatCommandsReturn {
  processMessage: (message: string, userId: string, username: string) => CommandResult;
  isOnCooldown: (commandName: string, userId?: string) => boolean;
  getCooldownRemaining: (commandName: string, userId?: string) => number;
  resetCooldowns: () => void;
  resetUserCooldown: (userId: string) => void;
  commands: CommandDefinition[];
  prefix: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse a message into command parts
 */
export function parseCommand(
  message: string,
  prefix: string
): { name: string; args: string[]; rawArgs: string } | null {
  const trimmed = message.trim();
  
  // Check if message starts with prefix
  if (!trimmed.startsWith(prefix)) {
    return null;
  }
  
  // Remove prefix and split
  const withoutPrefix = trimmed.slice(prefix.length);
  const parts = withoutPrefix.split(/\s+/).filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return null;
  }
  
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);
  const rawArgs = withoutPrefix.slice(parts[0].length).trim();
  
  return { name, args, rawArgs };
}

/**
 * Find command definition by name or alias
 */
export function findCommand(
  name: string,
  commands: CommandDefinition[]
): CommandDefinition | undefined {
  const lowerName = name.toLowerCase();
  
  return commands.find(cmd => {
    if (cmd.name.toLowerCase() === lowerName) return true;
    if (cmd.aliases?.some(alias => alias.toLowerCase() === lowerName)) return true;
    return false;
  });
}

/**
 * Validate command arguments
 */
export function validateArgs(
  args: string[],
  command: CommandDefinition
): boolean {
  if (command.requiresArgs && args.length === 0) {
    return false;
  }
  
  if (command.minArgs !== undefined && args.length < command.minArgs) {
    return false;
  }
  
  if (command.maxArgs !== undefined && args.length > command.maxArgs) {
    return false;
  }
  
  return true;
}

/**
 * Generate cooldown key for command + user
 */
export function getCooldownKey(commandName: string, userId?: string): string {
  if (userId) {
    return `${commandName}:${userId}`;
  }
  return `global:${commandName}`;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useChatCommands(options: UseChatCommandsOptions): UseChatCommandsReturn {
  const {
    prefix = '!',
    commands,
    globalCooldownMs = 0,
    userCooldownMs = 0,
  } = options;

  // Cooldown tracking: Map<key, expiresAt>
  const cooldowns = useRef<Map<string, number>>(new Map<string, number>());
  
  // Force re-render when cooldowns change (for UI updates)
  const [, forceUpdate] = useState(0);

  // Memoize commands for stable reference
  const commandList = useMemo(() => commands, [commands]);

  /**
   * Check if a command is on cooldown
   */
  const isOnCooldown = useCallback((commandName: string, userId?: string): boolean => {
    const now = Date.now();
    
    // Check global cooldown
    const globalKey = getCooldownKey(commandName);
    const globalExpires = cooldowns.current.get(globalKey);
    if (globalExpires && globalExpires > now) {
      return true;
    }
    
    // Check user-specific cooldown
    if (userId) {
      const userKey = getCooldownKey(commandName, userId);
      const userExpires = cooldowns.current.get(userKey);
      if (userExpires && userExpires > now) {
        return true;
      }
    }
    
    return false;
  }, []);

  /**
   * Get remaining cooldown time in ms
   */
  const getCooldownRemaining = useCallback((commandName: string, userId?: string): number => {
    const now = Date.now();
    let maxRemaining = 0;
    
    // Check global cooldown
    const globalKey = getCooldownKey(commandName);
    const globalExpires = cooldowns.current.get(globalKey);
    if (globalExpires && globalExpires > now) {
      maxRemaining = Math.max(maxRemaining, globalExpires - now);
    }
    
    // Check user-specific cooldown
    if (userId) {
      const userKey = getCooldownKey(commandName, userId);
      const userExpires = cooldowns.current.get(userKey);
      if (userExpires && userExpires > now) {
        maxRemaining = Math.max(maxRemaining, userExpires - now);
      }
    }
    
    return maxRemaining;
  }, []);

  /**
   * Set cooldown for a command
   */
  const setCooldown = useCallback((commandName: string, userId: string, durationMs: number) => {
    if (durationMs <= 0) return;
    
    const now = Date.now();
    const expiresAt = now + durationMs;
    
    // Set global cooldown if configured
    if (globalCooldownMs > 0) {
      const globalKey = getCooldownKey(commandName);
      cooldowns.current.set(globalKey, now + globalCooldownMs);
    }
    
    // Set user cooldown
    if (userCooldownMs > 0 || durationMs > 0) {
      const userKey = getCooldownKey(commandName, userId);
      cooldowns.current.set(userKey, expiresAt);
    }
    
    // Cleanup expired cooldowns periodically
    cooldowns.current.forEach((expires, key) => {
      if (expires <= now) {
        cooldowns.current.delete(key);
      }
    });
  }, [globalCooldownMs, userCooldownMs]);

  /**
   * Process a chat message and return command result
   */
  const processMessage = useCallback((
    message: string,
    userId: string,
    username: string
  ): CommandResult => {
    const now = Date.now();
    
    // Parse the message
    const parsed = parseCommand(message, prefix);
    if (!parsed) {
      return { success: false, error: 'not_command' };
    }
    
    // Find the command
    const command = findCommand(parsed.name, commandList);
    if (!command) {
      return { success: false, error: 'unknown_command' };
    }
    
    // Check if enabled
    if (!command.enabled) {
      return { success: false, error: 'disabled' };
    }
    
    // Check cooldown
    const cooldownRemaining = getCooldownRemaining(command.name, userId);
    if (cooldownRemaining > 0) {
      return { 
        success: false, 
        error: 'on_cooldown',
        cooldownRemaining,
      };
    }
    
    // Validate arguments
    if (!validateArgs(parsed.args, command)) {
      return { success: false, error: 'invalid_args' };
    }
    
    // Set cooldown
    setCooldown(command.name, userId, command.cooldownMs);
    
    // Return successful result
    const parsedCommand: ParsedCommand = {
      name: command.name,
      args: parsed.args,
      rawArgs: parsed.rawArgs,
      originalMessage: message,
      userId,
      username,
      timestamp: now,
    };
    
    return { success: true, command: parsedCommand };
  }, [prefix, commandList, getCooldownRemaining, setCooldown]);

  /**
   * Reset all cooldowns
   */
  const resetCooldowns = useCallback(() => {
    cooldowns.current.clear();
    forceUpdate(n => n + 1);
  }, []);

  /**
   * Reset cooldowns for a specific user
   */
  const resetUserCooldown = useCallback((userId: string) => {
    cooldowns.current.forEach((_, key) => {
      if (key.includes(`:${userId}`)) {
        cooldowns.current.delete(key);
      }
    });
    forceUpdate(n => n + 1);
  }, []);

  return {
    processMessage,
    isOnCooldown,
    getCooldownRemaining,
    resetCooldowns,
    resetUserCooldown,
    commands: commandList,
    prefix,
  };
}

export default useChatCommands;
