/**
 * useCommands Hook
 * 
 * Hook de React para usar CommandService con la arquitectura hexagonal.
 * Proporciona gestión de comandos personalizados desacoplada de la UI.
 * 
 * @module src/application/hooks/useCommands
 * @requirements 2.1, 2.2, 2.3
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { CommandService } from '../services/CommandService';
import { 
  LocalStorageCommandAdapter, 
  getLocalStorageCommandAdapter 
} from '../../infrastructure/adapters/LocalStorageCommandAdapter';
import type { 
  CustomCommand, 
  CommandContext, 
  UserLevel 
} from '../../domain/ports/ICommandPort';

// Re-export types for convenience
export type { CustomCommand, CommandContext, UserLevel };

/**
 * Return type for the useCommands hook
 */
export interface UseCommandsReturn {
  /** All registered commands */
  commands: CustomCommand[];
  /** Current command prefix */
  prefix: string;
  /** Get a command by name */
  getCommandByName: (name: string) => CustomCommand | null;
  /** Add a new command */
  addCommand: (command: Omit<CustomCommand, 'id' | 'usageCount'>) => CustomCommand;
  /** Update an existing command */
  updateCommand: (id: string, updates: Partial<CustomCommand>) => boolean;
  /** Delete a command */
  deleteCommand: (id: string) => boolean;
  /** Process a chat message and return response if it's a command */
  processMessage: (message: string, context: CommandContext) => string | null;
  /** Set the command prefix */
  setPrefix: (prefix: string) => void;
  /** Clear all cooldowns */
  clearCooldowns: () => void;
  /** Refresh commands from storage */
  refreshCommands: () => void;
  /** Service instance */
  service: CommandService;
}

// Singleton service instance
let commandServiceInstance: CommandService | null = null;

const getCommandService = (): CommandService => {
  if (!commandServiceInstance) {
    const adapter = getLocalStorageCommandAdapter();
    commandServiceInstance = new CommandService(adapter);
  }
  return commandServiceInstance;
};


/**
 * Hook para gestionar comandos personalizados usando CommandService
 * 
 * @example
 * ```tsx
 * const { commands, addCommand, processMessage } = useCommands();
 * 
 * // Add a new command
 * addCommand({
 *   name: 'hello',
 *   response: 'Hello {user}!',
 *   cooldown: 5,
 *   userLevel: 'everyone',
 *   enabled: true
 * });
 * 
 * // Process a chat message
 * const response = processMessage('!hello', {
 *   user: 'viewer123',
 *   channel: 'streamer',
 *   isMod: false,
 *   isSub: false,
 *   isVip: false,
 *   isBroadcaster: false
 * });
 * ```
 */
export function useCommands(): UseCommandsReturn {
  const serviceRef = useRef<CommandService>(getCommandService());
  
  // Commands state
  const [commands, setCommands] = useState<CustomCommand[]>(() => 
    serviceRef.current.getCommands()
  );
  
  // Prefix state
  const [prefix, setPrefix] = useState<string>(() => 
    serviceRef.current.getPrefix()
  );

  // Refresh commands from storage
  const refreshCommands = useCallback(() => {
    setCommands(serviceRef.current.getCommands());
  }, []);

  // Get command by name
  const getCommandByName = useCallback((name: string): CustomCommand | null => {
    return serviceRef.current.getCommandByName(name);
  }, []);

  // Add a new command
  const addCommand = useCallback((
    commandData: Omit<CustomCommand, 'id' | 'usageCount'>
  ): CustomCommand => {
    const newCommand = serviceRef.current.addCommand(commandData);
    setCommands(serviceRef.current.getCommands());
    return newCommand;
  }, []);

  // Update an existing command
  const updateCommand = useCallback((
    id: string, 
    updates: Partial<CustomCommand>
  ): boolean => {
    const success = serviceRef.current.updateCommand(id, updates);
    if (success) {
      setCommands(serviceRef.current.getCommands());
    }
    return success;
  }, []);

  // Delete a command
  const deleteCommand = useCallback((id: string): boolean => {
    const success = serviceRef.current.deleteCommand(id);
    if (success) {
      setCommands(serviceRef.current.getCommands());
    }
    return success;
  }, []);

  // Process a chat message
  const processMessage = useCallback((
    message: string, 
    context: CommandContext
  ): string | null => {
    const result = serviceRef.current.parseMessage(message, context);
    // Refresh commands to update usage counts
    if (result) {
      setCommands(serviceRef.current.getCommands());
    }
    return result;
  }, []);

  // Set the command prefix
  const handleSetPrefix = useCallback((newPrefix: string) => {
    serviceRef.current.setPrefix(newPrefix);
    setPrefix(serviceRef.current.getPrefix());
  }, []);

  // Clear all cooldowns
  const clearCooldowns = useCallback(() => {
    serviceRef.current.clearCooldowns();
  }, []);

  return {
    commands,
    prefix,
    getCommandByName,
    addCommand,
    updateCommand,
    deleteCommand,
    processMessage,
    setPrefix: handleSetPrefix,
    clearCooldowns,
    refreshCommands,
    service: serviceRef.current,
  };
}

export default useCommands;
