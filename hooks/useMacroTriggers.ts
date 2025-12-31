/**
 * useMacroTriggers - Hook for connecting TriggerService with app events
 * 
 * This hook connects the macro system's TriggerService with application events:
 * - Chat messages (commands and keywords)
 * - Stream events (follows, raids, subscriptions, bits, etc.)
 * - Schedule triggers (interval-based)
 * 
 * @requirements 2.1 - THE Macro_Service SHALL support trigger type "chat_command"
 * @requirements 2.2 - THE Macro_Service SHALL support trigger type "chat_keyword"
 * @requirements 2.3 - THE Macro_Service SHALL support trigger type "schedule"
 * @requirements 2.4 - THE Macro_Service SHALL support trigger type "event"
 */

import { useEffect, useRef, useCallback } from 'react';
import { getMacroService, type IMacroService } from '../src/application/services/MacroService';
import { TriggerService } from '../src/application/services/TriggerService';
import type { TwitchMessage } from '../types';
import type { StreamEvent } from '../src/domain/entities/StreamEvent';
import type {
  ExecutionContext,
  ExecutionUser,
  UserRole,
  MacroVariable,
  Macro,
} from '../types/macros';

// ============ TYPES ============

/**
 * Extended TwitchMessage with role information for macro triggers
 */
export interface TwitchMessageWithRoles extends TwitchMessage {
  isBroadcaster?: boolean;
  isModerator?: boolean;
}

/**
 * Options for the useMacroTriggers hook
 */
export interface UseMacroTriggersOptions {
  /**
   * Whether the hook is enabled (default: true)
   */
  enabled?: boolean;
  /**
   * Custom MacroService instance (useful for testing)
   */
  macroService?: IMacroService;
  /**
   * Callback when a macro is triggered
   */
  onMacroTriggered?: (macroId: string, triggerType: string) => void;
  /**
   * Callback when a macro execution completes
   */
  onMacroExecuted?: (macroId: string, success: boolean) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * Return type for the useMacroTriggers hook
 */
export interface UseMacroTriggersReturn {
  /**
   * Processes a chat message for potential triggers
   * @requirements 2.1, 2.2
   */
  processChatMessage: (message: TwitchMessageWithRoles) => void;
  /**
   * Processes a stream event for potential triggers
   * @requirements 2.4
   */
  processStreamEvent: (event: StreamEvent) => void;
  /**
   * Initializes the trigger system (loads and registers all macros)
   */
  initialize: () => Promise<void>;
  /**
   * Whether the system is initialized
   */
  isInitialized: boolean;
}

// ============ HELPERS ============

/**
 * Determines user role from TwitchMessageWithRoles
 */
function getUserRole(message: TwitchMessageWithRoles): UserRole {
  // Check badges or flags for role determination
  if (message.isBroadcaster) {
    return 'broadcaster';
  }
  if (message.isModerator) {
    return 'moderator';
  }
  if (message.isSubscriber) {
    return 'subscriber';
  }
  return 'viewer';
}

/**
 * Creates an ExecutionUser from a TwitchMessageWithRoles
 */
function createUserFromMessage(message: TwitchMessageWithRoles): ExecutionUser {
  return {
    username: message.username,
    displayName: message.username,
    role: getUserRole(message),
    platform: message.sourceChannel ? 'twitch' : 'twitch',
  };
}

/**
 * Creates an ExecutionContext from a chat message
 */
function createChatContext(
  message: TwitchMessageWithRoles,
  triggeredBy: 'chat_command' | 'chat_keyword'
): ExecutionContext {
  return {
    triggeredBy,
    user: createUserFromMessage(message),
    message: message.message,
    variables: new Map<string, MacroVariable>(),
  };
}

/**
 * Creates an ExecutionContext from a stream event
 */
function createEventContext(event: StreamEvent): ExecutionContext {
  const eventData: Record<string, unknown> = {
    type: event.type,
    username: event.username,
    timestamp: event.timestamp,
  };

  // Add event-specific data
  if (event.viewerCount !== undefined) {
    eventData.viewers = event.viewerCount;
  }
  if (event.months !== undefined) {
    eventData.months = event.months;
  }
  if (event.tier !== undefined) {
    eventData.tier = event.tier;
  }
  if (event.giftCount !== undefined) {
    eventData.giftCount = event.giftCount;
  }
  if (event.bits !== undefined) {
    eventData.bits = event.bits;
  }

  return {
    triggeredBy: 'event',
    user: {
      username: event.username,
      displayName: event.username,
      role: 'viewer',
      platform: 'twitch',
    },
    event: {
      type: event.type,
      data: eventData,
    },
    variables: new Map<string, MacroVariable>(),
  };
}

/**
 * Maps StreamEvent type to macro event type
 */
function mapEventType(eventType: string): string {
  const mapping: Record<string, string> = {
    'follow': 'follower',
    'follower': 'follower',
    'raid': 'raid',
    'subscription': 'subscription',
    'sub': 'subscription',
    'resub': 'subscription',
    'gift': 'subscription',
    'bits': 'bits',
    'cheer': 'bits',
    'host': 'host',
  };
  return mapping[eventType.toLowerCase()] || eventType;
}

// ============ HOOK ============

/**
 * Hook for connecting TriggerService with app events
 * 
 * This hook automatically processes chat messages and stream events,
 * checking for macro triggers and executing matching macros.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { processChatMessage, processStreamEvent, initialize } = useMacroTriggers({
 *     enabled: isConnected,
 *     onMacroTriggered: (id, type) => console.log(`Macro ${id} triggered by ${type}`),
 *     onMacroExecuted: (id, success) => console.log(`Macro ${id} executed: ${success}`),
 *   });
 *   
 *   useEffect(() => {
 *     initialize();
 *   }, []);
 *   
 *   // In chat message handler:
 *   // processChatMessage(message);
 *   
 *   // In stream event handler:
 *   // processStreamEvent(event);
 * }
 * ```
 * 
 * @requirements 2.1, 2.2, 2.3, 2.4
 */
export function useMacroTriggers(
  options: UseMacroTriggersOptions = {}
): UseMacroTriggersReturn {
  const {
    enabled = true,
    macroService,
    onMacroTriggered,
    onMacroExecuted,
    onError,
  } = options;

  // Get service instance
  const serviceRef = useRef<IMacroService>(macroService || getMacroService());
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  /**
   * Executes a macro with the given context
   */
  const executeMacro = useCallback(async (
    macro: Macro,
    context: ExecutionContext
  ): Promise<void> => {
    if (!isMountedRef.current || !enabled) return;

    try {
      onMacroTriggered?.(macro.id, context.triggeredBy);
      
      const result = await serviceRef.current.executeMacro(macro.id, context);
      
      if (isMountedRef.current) {
        onMacroExecuted?.(macro.id, result.success);
      }
    } catch (error) {
      if (isMountedRef.current) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [enabled, onMacroTriggered, onMacroExecuted, onError]);

  /**
   * Processes a chat message for potential triggers
   * @requirements 2.1, 2.2
   */
  const processChatMessage = useCallback((message: TwitchMessageWithRoles): void => {
    if (!enabled || !isInitializedRef.current) return;

    const triggerService = (serviceRef.current as any).getTriggerService?.() as TriggerService | undefined;
    if (!triggerService) return;

    const user = createUserFromMessage(message);
    const text = message.message.trim();

    // Check for chat commands (messages starting with !)
    // @requirements 2.1
    if (text.startsWith('!')) {
      const command = text.split(' ')[0]; // Get just the command part
      const matchingMacros = triggerService.checkChatCommand(command, user);
      
      for (const macro of matchingMacros) {
        const context = createChatContext(message, 'chat_command');
        executeMacro(macro, context);
      }
    }

    // Check for chat keywords (any message)
    // @requirements 2.2
    const keywordMacros = triggerService.checkChatKeyword(text, user);
    
    for (const macro of keywordMacros) {
      const context = createChatContext(message, 'chat_keyword');
      executeMacro(macro, context);
    }
  }, [enabled, executeMacro]);

  /**
   * Processes a stream event for potential triggers
   * @requirements 2.4
   */
  const processStreamEvent = useCallback((event: StreamEvent): void => {
    if (!enabled || !isInitializedRef.current) return;

    const triggerService = (serviceRef.current as any).getTriggerService?.() as TriggerService | undefined;
    if (!triggerService) return;

    // Map event type to macro event type
    const eventType = mapEventType(event.type);
    
    // Build event data for trigger checking
    const eventData: Record<string, unknown> = {
      username: event.username,
      timestamp: event.timestamp,
    };

    // Add event-specific values
    if (event.viewerCount !== undefined) {
      eventData.viewers = event.viewerCount;
    }
    if (event.bits !== undefined) {
      eventData.bits = event.bits;
    }
    if (event.months !== undefined) {
      eventData.months = event.months;
    }

    // Check for matching event triggers
    const matchingMacros = triggerService.checkEvent(eventType, eventData);
    
    for (const macro of matchingMacros) {
      const context = createEventContext(event);
      executeMacro(macro, context);
    }
  }, [enabled, executeMacro]);

  /**
   * Initializes the trigger system
   */
  const initialize = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      // Initialize the macro service (loads and registers all macros)
      if (typeof (serviceRef.current as any).initialize === 'function') {
        await (serviceRef.current as any).initialize();
      }
      
      isInitializedRef.current = true;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to initialize macro triggers'));
    }
  }, [onError]);

  // Initialize on mount if enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      initialize();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, initialize]);

  return {
    processChatMessage,
    processStreamEvent,
    initialize,
    isInitialized: isInitializedRef.current,
  };
}

export default useMacroTriggers;
