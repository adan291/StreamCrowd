/**
 * TriggerService - Service for managing and detecting macro triggers
 * 
 * This service handles trigger registration, detection, and cooldown management:
 * - Register/unregister triggers for macros
 * - Check chat commands (e.g., !raid)
 * - Check chat keywords (word matching in messages)
 * - Check scheduled triggers (interval-based)
 * - Check event triggers (follower, raid, subscription, etc.)
 * - Cooldown tracking to prevent spam
 * 
 * @requirements 2.1 - THE Macro_Service SHALL support trigger type "chat_command"
 * @requirements 2.2 - THE Macro_Service SHALL support trigger type "chat_keyword"
 * @requirements 2.3 - THE Macro_Service SHALL support trigger type "schedule"
 * @requirements 2.4 - THE Macro_Service SHALL support trigger type "event"
 * @requirements 2.5 - THE Macro_Service SHALL support trigger type "manual"
 * @requirements 2.6 - WHEN a trigger activates, THE Macro_Service SHALL verify conditions before executing
 * @requirements 2.7 - THE Macro_Service SHALL allow cooldown per trigger (prevent spam)
 */

import type {
  Macro,
  MacroTrigger,
  TriggerType,
  TriggerEvent,
  ChatCommandTrigger,
  ChatKeywordTrigger,
  ScheduleTrigger,
  EventTrigger,
  ManualTrigger,
  ExecutionUser,
  UserRole
} from '../../../types/macros';

/**
 * Interface for the TriggerService
 */
export interface ITriggerService {
  registerTrigger(macro: Macro): void;
  unregisterTrigger(macroId: string): void;
  checkTrigger(event: TriggerEvent): Macro[];
  checkChatCommand(command: string, user?: ExecutionUser): Macro[];
  checkChatKeyword(message: string, user?: ExecutionUser): Macro[];
  checkSchedule(): Macro[];
  checkEvent(eventType: string, eventData?: Record<string, unknown>): Macro[];
  checkManual(macroId: string): Macro | null;
  isOnCooldown(macroId: string): boolean;
  getRemainingCooldown(macroId: string): number;
  recordExecution(macroId: string): void;
  clearCooldowns(): void;
  getRegisteredMacros(): Macro[];
  dispose(): void;
}

/**
 * Internal structure for tracking registered macros and their schedules
 */
interface RegisteredMacro {
  macro: Macro;
  scheduleIntervalId?: ReturnType<typeof setInterval>;
}

/**
 * TriggerService class
 * 
 * Manages macro triggers, detects trigger events, and enforces cooldowns.
 */
export class TriggerService implements ITriggerService {
  private registeredMacros: Map<string, RegisteredMacro> = new Map();
  private cooldowns: Map<string, number> = new Map(); // macroId -> lastExecutedTimestamp
  private scheduleCallbacks: Map<string, () => void> = new Map();

  /**
   * Registers a macro's trigger for detection
   * @param macro - The macro to register
   */
  registerTrigger(macro: Macro): void {
    if (!macro || !macro.id || !macro.trigger) {
      return;
    }

    // Unregister existing trigger if present
    this.unregisterTrigger(macro.id);

    const registered: RegisteredMacro = { macro };

    // Set up schedule interval if it's a schedule trigger
    if (macro.trigger.type === 'schedule' && macro.enabled) {
      const scheduleConfig = macro.trigger.config as ScheduleTrigger;
      
      if (scheduleConfig.type === 'interval' && scheduleConfig.interval && scheduleConfig.interval > 0) {
        // Convert minutes to milliseconds
        const intervalMs = scheduleConfig.interval * 60 * 1000;
        
        registered.scheduleIntervalId = setInterval(() => {
          const callback = this.scheduleCallbacks.get(macro.id);
          if (callback) {
            callback();
          }
        }, intervalMs);
      }
    }

    this.registeredMacros.set(macro.id, registered);
  }

  /**
   * Unregisters a macro's trigger
   * @param macroId - The ID of the macro to unregister
   */
  unregisterTrigger(macroId: string): void {
    const registered = this.registeredMacros.get(macroId);
    
    if (registered) {
      // Clear any schedule interval
      if (registered.scheduleIntervalId) {
        clearInterval(registered.scheduleIntervalId);
      }
      
      this.registeredMacros.delete(macroId);
    }
    
    this.scheduleCallbacks.delete(macroId);
  }

  /**
   * Sets a callback for schedule triggers
   * @param macroId - The macro ID
   * @param callback - The callback to execute when schedule fires
   */
  setScheduleCallback(macroId: string, callback: () => void): void {
    this.scheduleCallbacks.set(macroId, callback);
  }

  /**
   * Checks a trigger event and returns matching macros
   * @param event - The trigger event to check
   * @returns Array of macros that match the trigger
   */
  checkTrigger(event: TriggerEvent): Macro[] {
    if (!event || !event.type) {
      return [];
    }

    switch (event.type) {
      case 'chat_command':
        return this.checkChatCommand(event.command || '', event.user);
      
      case 'chat_keyword':
        return this.checkChatKeyword(event.message || '', event.user);
      
      case 'schedule':
        return this.checkSchedule();
      
      case 'event':
        return this.checkEvent(event.eventType || '', event.eventData);
      
      case 'manual':
        // Manual triggers are checked by specific macro ID
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Checks for macros triggered by a chat command
   * @param command - The command string (e.g., "!raid" or "raid")
   * @param user - Optional user who sent the command
   * @returns Array of matching macros
   */
  checkChatCommand(command: string, user?: ExecutionUser): Macro[] {
    if (!command) {
      return [];
    }

    const matchingMacros: Macro[] = [];
    const normalizedCommand = command.startsWith('!') ? command : `!${command}`;

    for (const registered of this.registeredMacros.values()) {
      const { macro } = registered;
      
      if (!macro.enabled || macro.trigger.type !== 'chat_command') {
        continue;
      }

      if (this.isOnCooldown(macro.id)) {
        continue;
      }

      const config = macro.trigger.config as ChatCommandTrigger;
      
      if (this.matchesChatCommand(normalizedCommand, config, user)) {
        matchingMacros.push(macro);
      }
    }

    return matchingMacros;
  }

  /**
   * Checks for macros triggered by keywords in a chat message
   * @param message - The chat message to check
   * @param user - Optional user who sent the message
   * @returns Array of matching macros
   */
  checkChatKeyword(message: string, user?: ExecutionUser): Macro[] {
    if (!message) {
      return [];
    }

    const matchingMacros: Macro[] = [];

    for (const registered of this.registeredMacros.values()) {
      const { macro } = registered;
      
      if (!macro.enabled || macro.trigger.type !== 'chat_keyword') {
        continue;
      }

      if (this.isOnCooldown(macro.id)) {
        continue;
      }

      const config = macro.trigger.config as ChatKeywordTrigger;
      
      if (this.matchesChatKeyword(message, config)) {
        matchingMacros.push(macro);
      }
    }

    return matchingMacros;
  }

  /**
   * Checks for macros with schedule triggers that should fire
   * Note: This is typically called by the schedule interval, not directly
   * @returns Array of schedule-triggered macros ready to execute
   */
  checkSchedule(): Macro[] {
    const matchingMacros: Macro[] = [];

    for (const registered of this.registeredMacros.values()) {
      const { macro } = registered;
      
      if (!macro.enabled || macro.trigger.type !== 'schedule') {
        continue;
      }

      if (this.isOnCooldown(macro.id)) {
        continue;
      }

      // Schedule macros are returned if they're registered and enabled
      matchingMacros.push(macro);
    }

    return matchingMacros;
  }

  /**
   * Checks for macros triggered by stream events
   * @param eventType - The type of event (follower, raid, subscription, etc.)
   * @param eventData - Optional event data (e.g., bits amount)
   * @returns Array of matching macros
   */
  checkEvent(eventType: string, eventData?: Record<string, unknown>): Macro[] {
    if (!eventType) {
      return [];
    }

    const matchingMacros: Macro[] = [];

    for (const registered of this.registeredMacros.values()) {
      const { macro } = registered;
      
      if (!macro.enabled || macro.trigger.type !== 'event') {
        continue;
      }

      if (this.isOnCooldown(macro.id)) {
        continue;
      }

      const config = macro.trigger.config as EventTrigger;
      
      if (this.matchesEvent(eventType, config, eventData)) {
        matchingMacros.push(macro);
      }
    }

    return matchingMacros;
  }

  /**
   * Checks if a specific macro can be manually triggered
   * @param macroId - The ID of the macro to check
   * @returns The macro if it can be triggered, null otherwise
   */
  checkManual(macroId: string): Macro | null {
    const registered = this.registeredMacros.get(macroId);
    
    if (!registered) {
      return null;
    }

    const { macro } = registered;

    if (!macro.enabled) {
      return null;
    }

    if (macro.trigger.type !== 'manual') {
      return null;
    }

    if (this.isOnCooldown(macro.id)) {
      return null;
    }

    return macro;
  }

  /**
   * Checks if a macro is currently on cooldown
   * @param macroId - The macro ID to check
   * @returns True if on cooldown, false otherwise
   */
  isOnCooldown(macroId: string): boolean {
    const lastExecuted = this.cooldowns.get(macroId);
    
    if (lastExecuted === undefined) {
      return false;
    }

    const registered = this.registeredMacros.get(macroId);
    
    if (!registered) {
      return false;
    }

    const { macro } = registered;
    const cooldownMs = (macro.cooldown || 0) * 1000;
    
    if (cooldownMs <= 0) {
      return false;
    }

    const elapsed = Date.now() - lastExecuted;
    return elapsed < cooldownMs;
  }

  /**
   * Gets the remaining cooldown time in milliseconds
   * @param macroId - The macro ID to check
   * @returns Remaining cooldown in milliseconds, 0 if not on cooldown
   */
  getRemainingCooldown(macroId: string): number {
    const lastExecuted = this.cooldowns.get(macroId);
    
    if (lastExecuted === undefined) {
      return 0;
    }

    const registered = this.registeredMacros.get(macroId);
    
    if (!registered) {
      return 0;
    }

    const { macro } = registered;
    const cooldownMs = (macro.cooldown || 0) * 1000;
    
    if (cooldownMs <= 0) {
      return 0;
    }

    const elapsed = Date.now() - lastExecuted;
    const remaining = cooldownMs - elapsed;
    
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Records a macro execution for cooldown tracking
   * @param macroId - The macro ID that was executed
   */
  recordExecution(macroId: string): void {
    this.cooldowns.set(macroId, Date.now());
  }

  /**
   * Clears all cooldowns (useful for testing or emergency reset)
   */
  clearCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Gets all registered macros
   * @returns Array of registered macros
   */
  getRegisteredMacros(): Macro[] {
    return Array.from(this.registeredMacros.values()).map(r => r.macro);
  }

  /**
   * Disposes of all resources (intervals, etc.)
   */
  dispose(): void {
    for (const registered of this.registeredMacros.values()) {
      if (registered.scheduleIntervalId) {
        clearInterval(registered.scheduleIntervalId);
      }
    }
    
    this.registeredMacros.clear();
    this.cooldowns.clear();
    this.scheduleCallbacks.clear();
  }

  // ==================== Private Methods ====================

  /**
   * Checks if a command matches a chat command trigger configuration
   */
  private matchesChatCommand(
    command: string,
    config: ChatCommandTrigger,
    user?: ExecutionUser
  ): boolean {
    // Normalize the config command
    const configCommand = config.command.startsWith('!') 
      ? config.command 
      : `!${config.command}`;

    // Compare commands
    const commandMatches = config.caseSensitive
      ? command === configCommand
      : command.toLowerCase() === configCommand.toLowerCase();

    if (!commandMatches) {
      return false;
    }

    // Check role requirement if specified
    if (config.requiredRole && user) {
      if (!this.hasRequiredRole(user.role, config.requiredRole)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a message matches a chat keyword trigger configuration
   */
  private matchesChatKeyword(message: string, config: ChatKeywordTrigger): boolean {
    if (!config.keywords || config.keywords.length === 0) {
      return false;
    }

    const normalizedMessage = config.caseSensitive 
      ? message 
      : message.toLowerCase();

    const keywordMatches = config.keywords.map(keyword => {
      const normalizedKeyword = config.caseSensitive 
        ? keyword 
        : keyword.toLowerCase();
      
      return normalizedMessage.includes(normalizedKeyword);
    });

    // matchAll: true = AND (all keywords must match)
    // matchAll: false = OR (at least one keyword must match)
    if (config.matchAll) {
      return keywordMatches.every(match => match);
    } else {
      return keywordMatches.some(match => match);
    }
  }

  /**
   * Checks if an event matches an event trigger configuration
   */
  private matchesEvent(
    eventType: string,
    config: EventTrigger,
    eventData?: Record<string, unknown>
  ): boolean {
    // Check event type match
    if (config.eventType !== eventType) {
      return false;
    }

    // Check minimum value if specified
    if (config.minValue !== undefined && config.minValue > 0) {
      const eventValue = this.extractEventValue(eventType, eventData);
      
      if (eventValue < config.minValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extracts a numeric value from event data based on event type
   */
  private extractEventValue(
    eventType: string,
    eventData?: Record<string, unknown>
  ): number {
    if (!eventData) {
      return 0;
    }

    switch (eventType) {
      case 'bits':
        return typeof eventData.bits === 'number' ? eventData.bits : 0;
      
      case 'raid':
        return typeof eventData.viewers === 'number' ? eventData.viewers : 0;
      
      case 'subscription':
        return typeof eventData.months === 'number' ? eventData.months : 1;
      
      default:
        // Try common value field names
        if (typeof eventData.value === 'number') {
          return eventData.value;
        }
        if (typeof eventData.amount === 'number') {
          return eventData.amount;
        }
        return 0;
    }
  }

  /**
   * Checks if a user has the required role or higher
   * Role hierarchy: broadcaster > moderator > subscriber > viewer
   */
  private hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      'viewer': 0,
      'subscriber': 1,
      'moderator': 2,
      'broadcaster': 3
    };

    const userLevel = roleHierarchy[userRole] ?? 0;
    const requiredLevel = roleHierarchy[requiredRole] ?? 0;

    return userLevel >= requiredLevel;
  }
}
