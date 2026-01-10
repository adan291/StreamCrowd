/**
 * useChatControlCommands Hook
 * 
 * Connects chat messages to the ChatControlCommandsService for remote control
 * of dynamics (polls, giveaways, predictions, judge panel).
 * 
 * Usage:
 * 1. Call this hook in your main app or activity component
 * 2. Register handlers for each dynamic type you want to control
 * 3. The hook will automatically process incoming chat messages
 * 
 * @module hooks/useChatControlCommands
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { 
  getChatControlCommandsService,
  type ChatControlConfig,
  type DynamicType,
  type CommandHandler,
  type CommandUser,
  type ParsedControlCommand,
  type CommandExecutionResult,
} from '../src/application/services/ChatControlCommandsService';
import { PlatformManagerService } from '../src/application/services/PlatformManagerService';
import type { Platform, Badge } from '../types/platform';
import type { ChatMessage as ProviderChatMessage } from '../src/domain/ports/IChatProvider';

// ============================================
// TYPES
// ============================================

export interface UseChatControlCommandsOptions {
  /** Enable/disable command processing */
  enabled?: boolean;
  /** Custom config overrides */
  config?: Partial<ChatControlConfig>;
  /** Callback when a command is executed */
  onCommandExecuted?: (command: ParsedControlCommand, result: CommandExecutionResult) => void;
  /** Callback for sending messages to chat */
  onSendMessage?: (message: string, platform?: Platform) => void;
}

export interface UseChatControlCommandsReturn {
  /** Register a handler for a dynamic type */
  registerHandler: (dynamic: DynamicType, handler: CommandHandler) => () => void;
  /** Process a message manually (for testing) */
  processMessage: (message: string, user: CommandUser) => Promise<CommandExecutionResult | null>;
  /** Get current config */
  config: ChatControlConfig;
  /** Update config */
  updateConfig: (config: Partial<ChatControlConfig>) => void;
  /** Whether commands are enabled */
  isEnabled: boolean;
  /** Last executed command result */
  lastResult: CommandExecutionResult | null;
}

// ============================================
// HELPER: Check if badge array contains a badge type
// ============================================

function hasBadge(badges: Badge[] | Record<string, string> | undefined, type: string): boolean {
  if (!badges) return false;
  
  // Handle array of Badge objects (platform.ts format)
  if (Array.isArray(badges)) {
    return badges.some(badge => badge.type === type);
  }
  
  // Handle Record<string, string> (IChatProvider format)
  if (typeof badges === 'object') {
    return type in badges;
  }
  
  return false;
}

// ============================================
// HELPER: Map provider to platform
// ============================================

function providerToPlatform(provider: string): Platform {
  switch (provider) {
    case 'twitch': return 'twitch';
    case 'youtube': return 'youtube';
    default: return 'twitch'; // Default to twitch for unknown providers
  }
}

// ============================================
// HELPER: Convert ProviderChatMessage to CommandUser
// ============================================

function providerMessageToCommandUser(message: ProviderChatMessage): CommandUser {
  return {
    id: message.userId || message.id,
    username: message.username,
    displayName: message.displayName || message.username,
    isBroadcaster: message.isBroadcaster === true || hasBadge(message.badges, 'broadcaster'),
    isModerator: message.isModerator === true || hasBadge(message.badges, 'moderator'),
    isVip: hasBadge(message.badges, 'vip'),
    isSubscriber: message.isSubscriber === true || hasBadge(message.badges, 'subscriber'),
    platform: providerToPlatform(message.provider),
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useChatControlCommands(
  options: UseChatControlCommandsOptions = {}
): UseChatControlCommandsReturn {
  const {
    enabled = true,
    config: configOverrides,
    onCommandExecuted,
    onSendMessage,
  } = options;

  const service = getChatControlCommandsService(configOverrides);
  const [lastResult, setLastResult] = useState<CommandExecutionResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState(service.getConfig());
  
  // Track registered handlers for cleanup
  const handlersRef = useRef<Map<DynamicType, () => void>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set up message callback for sending to chat
  useEffect(() => {
    if (onSendMessage) {
      service.setMessageCallback(onSendMessage);
    }
  }, [onSendMessage, service]);

  // Subscribe to platform messages
  useEffect(() => {
    if (!enabled) {
      // Unsubscribe if disabled
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Subscribe to messages from all platforms
    const unsubscribe = PlatformManagerService.onMessage(async (message: ProviderChatMessage) => {
      const user = providerMessageToCommandUser(message);
      const result = await service.processMessage(message.message, user);
      
      if (result) {
        setLastResult(result);
        onCommandExecuted?.({
          dynamic: 'poll', // Will be overwritten by actual command
          action: '',
          args: [],
          rawArgs: '',
          user,
          timestamp: Date.now(),
        }, result);
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [enabled, service, onCommandExecuted]);

  // Register handler
  const registerHandler = useCallback((
    dynamic: DynamicType,
    handler: CommandHandler
  ): (() => void) => {
    // Unregister previous handler if exists
    const prevUnsubscribe = handlersRef.current.get(dynamic);
    if (prevUnsubscribe) {
      prevUnsubscribe();
    }

    // Register new handler
    const unsubscribe = service.registerHandler(dynamic, handler);
    handlersRef.current.set(dynamic, unsubscribe);

    return () => {
      unsubscribe();
      handlersRef.current.delete(dynamic);
    };
  }, [service]);

  // Process message manually
  const processMessage = useCallback(async (
    message: string,
    user: CommandUser
  ): Promise<CommandExecutionResult | null> => {
    const result = await service.processMessage(message, user);
    if (result) {
      setLastResult(result);
    }
    return result;
  }, [service]);

  // Update config
  const updateConfig = useCallback((config: Partial<ChatControlConfig>) => {
    service.updateConfig(config);
    setCurrentConfig(service.getConfig());
  }, [service]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from messages
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Unregister all handlers
      handlersRef.current.forEach(unsubscribe => unsubscribe());
      handlersRef.current.clear();
    };
  }, []);

  return {
    registerHandler,
    processMessage,
    config: currentConfig,
    updateConfig,
    isEnabled: enabled && currentConfig.enabled,
    lastResult,
  };
}

export default useChatControlCommands;
