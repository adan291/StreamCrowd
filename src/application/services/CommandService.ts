/**
 * CommandService - Servicio de aplicación para comandos personalizados
 * 
 * Este servicio gestiona el parsing de mensajes, cooldowns, permisos
 * e interpolación de variables para comandos de chat personalizados.
 * 
 * @requirements 2.1 - WHEN a chat message starts with the command prefix (!) THEN THE Command_Parser SHALL check if it matches a registered command
 * @requirements 2.2 - WHEN a valid command is detected THEN THE Command_Parser SHALL execute the associated action
 * @requirements 2.4 - WHEN a command is on cooldown THEN THE Command_Parser SHALL ignore repeated invocations
 * @requirements 2.5 - WHEN a user lacks permission THEN THE Command_Parser SHALL not execute the command
 * @requirements 2.8 - THE Command_Parser SHALL support variables in responses: {user}, {channel}, {count}, {random}
 */

import type { 
  ICommandPort, 
  CustomCommand, 
  CommandContext,
  UserLevel 
} from '../../domain/ports/ICommandPort';

/**
 * Resultado del parsing de un comando
 */
export interface CommandParseResult {
  command: CustomCommand;
  args: string[];
}

/**
 * Jerarquía de niveles de usuario (mayor número = más permisos)
 */
const USER_LEVEL_HIERARCHY: Record<UserLevel, number> = {
  'everyone': 0,
  'subscriber': 1,
  'vip': 2,
  'moderator': 3,
  'broadcaster': 4
};

/**
 * CommandService class
 * 
 * Gestiona comandos personalizados con cooldowns, permisos y variables.
 */
export class CommandService {
  private port: ICommandPort;
  private cooldowns: Map<string, number> = new Map(); // command id -> last used timestamp
  private prefix: string = '!';

  constructor(port: ICommandPort) {
    this.port = port;
  }

  // ==================== Parsing ====================

  /**
   * Parsea un mensaje y ejecuta el comando si corresponde
   * @param message - Mensaje del chat
   * @param context - Contexto del usuario
   * @returns Respuesta del comando o null si no aplica
   */
  parseMessage(message: string, context: CommandContext): string | null {
    // Check if message starts with prefix
    if (!this.startsWithPrefix(message)) {
      return null;
    }

    // Try to match a command
    const match = this.matchCommand(message);
    if (!match) {
      return null;
    }

    const { command, args } = match;

    // Check if command can be executed
    if (!this.canExecute(command, context)) {
      return null;
    }

    // Update usage stats
    this.port.updateUsage(command.id);
    this.cooldowns.set(command.id, Date.now());

    // Interpolate and return response
    return this.interpolateResponse(command.response, context, args, command);
  }


  /**
   * Verifica si un mensaje comienza con el prefix de comandos
   * @param message - Mensaje a verificar
   * @returns true si comienza con el prefix
   */
  startsWithPrefix(message: string): boolean {
    return message.startsWith(this.prefix);
  }

  /**
   * Intenta hacer match de un mensaje con un comando registrado
   * @param message - Mensaje del chat
   * @returns Comando y argumentos o null
   */
  matchCommand(message: string): CommandParseResult | null {
    // Remove prefix and split into parts
    const withoutPrefix = message.slice(this.prefix.length);
    const parts = withoutPrefix.trim().split(/\s+/);
    
    if (parts.length === 0 || parts[0] === '') {
      return null;
    }

    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.port.getCommandByName(commandName);
    
    if (!command || !command.enabled) {
      return null;
    }

    return { command, args };
  }

  // ==================== Execution Checks ====================

  /**
   * Verifica si un comando puede ser ejecutado
   * @param command - Comando a verificar
   * @param context - Contexto del usuario
   * @returns true si puede ejecutarse
   */
  canExecute(command: CustomCommand, context: CommandContext): boolean {
    if (!command.enabled) {
      return false;
    }

    if (this.isOnCooldown(command)) {
      return false;
    }

    if (!this.hasPermission(command, context)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica si un comando está en cooldown
   * @param command - Comando a verificar
   * @returns true si está en cooldown
   */
  isOnCooldown(command: CustomCommand): boolean {
    if (command.cooldown <= 0) {
      return false;
    }

    const lastUsed = this.cooldowns.get(command.id);
    if (!lastUsed) {
      return false;
    }

    const elapsed = (Date.now() - lastUsed) / 1000; // Convert to seconds
    return elapsed < command.cooldown;
  }

  /**
   * Verifica si un usuario tiene permiso para ejecutar un comando
   * @param command - Comando a verificar
   * @param context - Contexto del usuario
   * @returns true si tiene permiso
   */
  hasPermission(command: CustomCommand, context: CommandContext): boolean {
    const requiredLevel = USER_LEVEL_HIERARCHY[command.userLevel];
    const userLevel = this.getUserLevel(context);
    
    return userLevel >= requiredLevel;
  }

  /**
   * Obtiene el nivel de usuario basado en el contexto
   * @param context - Contexto del usuario
   * @returns Nivel numérico del usuario
   */
  private getUserLevel(context: CommandContext): number {
    if (context.isBroadcaster) {
      return USER_LEVEL_HIERARCHY['broadcaster'];
    }
    if (context.isMod) {
      return USER_LEVEL_HIERARCHY['moderator'];
    }
    if (context.isVip) {
      return USER_LEVEL_HIERARCHY['vip'];
    }
    if (context.isSub) {
      return USER_LEVEL_HIERARCHY['subscriber'];
    }
    return USER_LEVEL_HIERARCHY['everyone'];
  }


  // ==================== Variable Interpolation ====================

  /**
   * Interpola variables en la respuesta del comando
   * Soporta: {user}, {channel}, {count}, {random:min:max}, {args}, {arg0}, {arg1}...
   * @param response - Respuesta con variables
   * @param context - Contexto del usuario
   * @param args - Argumentos del comando
   * @param command - Comando (para {count})
   * @returns Respuesta interpolada
   */
  interpolateResponse(
    response: string, 
    context: CommandContext, 
    args: string[],
    command: CustomCommand
  ): string {
    let result = response;

    // {user} - nombre del usuario
    result = result.replace(/\{user\}/gi, context.user);

    // {channel} - nombre del canal
    result = result.replace(/\{channel\}/gi, context.channel);

    // {count} - contador de usos del comando
    result = result.replace(/\{count\}/gi, String(command.usageCount + 1));

    // {args} - todos los argumentos
    result = result.replace(/\{args\}/gi, args.join(' '));

    // {arg0}, {arg1}, etc. - argumentos individuales
    result = result.replace(/\{arg(\d+)\}/gi, (match, index) => {
      const idx = parseInt(index, 10);
      return args[idx] !== undefined ? args[idx] : '';
    });

    // {random:min:max} - número aleatorio
    result = result.replace(/\{random:(\d+):(\d+)\}/gi, (match, minStr, maxStr) => {
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      if (isNaN(min) || isNaN(max) || min > max) {
        return match; // Return original if invalid
      }
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
    });

    // {random} - número aleatorio 1-100 (shorthand)
    result = result.replace(/\{random\}/gi, () => {
      return String(Math.floor(Math.random() * 100) + 1);
    });

    return result;
  }

  // ==================== Command Management ====================

  /**
   * Añade un nuevo comando
   * @param commandData - Datos del comando (sin id ni usageCount)
   * @returns Comando creado
   */
  addCommand(commandData: Omit<CustomCommand, 'id' | 'usageCount'>): CustomCommand {
    const command: CustomCommand = {
      ...commandData,
      id: this.generateId(),
      usageCount: 0
    };
    
    this.port.saveCommand(command);
    return command;
  }

  /**
   * Actualiza un comando existente
   * @param id - ID del comando
   * @param updates - Campos a actualizar
   * @returns true si se actualizó
   */
  updateCommand(id: string, updates: Partial<CustomCommand>): boolean {
    const commands = this.port.getCommands();
    const existing = commands.find(c => c.id === id);
    
    if (!existing) {
      return false;
    }

    const updated: CustomCommand = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent id change
      usageCount: existing.usageCount // Preserve usage count
    };

    this.port.saveCommand(updated);
    return true;
  }

  /**
   * Elimina un comando
   * @param id - ID del comando
   * @returns true si se eliminó
   */
  deleteCommand(id: string): boolean {
    const commands = this.port.getCommands();
    const exists = commands.some(c => c.id === id);
    
    if (!exists) {
      return false;
    }

    this.port.deleteCommand(id);
    this.cooldowns.delete(id);
    return true;
  }

  /**
   * Obtiene todos los comandos
   * @returns Array de comandos
   */
  getCommands(): CustomCommand[] {
    return this.port.getCommands();
  }

  /**
   * Obtiene un comando por nombre
   * @param name - Nombre del comando
   * @returns Comando o null
   */
  getCommandByName(name: string): CustomCommand | null {
    return this.port.getCommandByName(name);
  }

  // ==================== Configuration ====================

  /**
   * Obtiene el prefix actual
   * @returns Prefix de comandos
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * Establece el prefix de comandos
   * @param prefix - Nuevo prefix
   */
  setPrefix(prefix: string): void {
    if (prefix && prefix.length > 0) {
      this.prefix = prefix;
    }
  }

  /**
   * Limpia todos los cooldowns (útil para testing)
   */
  clearCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Genera un ID único para un comando
   */
  private generateId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
