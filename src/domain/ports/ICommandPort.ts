/**
 * ICommandPort - Puerto para el sistema de comandos personalizados
 * 
 * Este puerto define el contrato para gestionar comandos de chat personalizados.
 * Permite crear comandos que los viewers pueden usar para interactuar con el stream.
 * 
 * @requirements 2.6 - WHEN saving commands THEN THE System SHALL persist to localStorage
 * @requirements 2.7 - WHEN loading the application THEN THE System SHALL restore saved commands
 */

/**
 * Niveles de usuario para permisos de comandos
 */
export type UserLevel = 'everyone' | 'subscriber' | 'vip' | 'moderator' | 'broadcaster';

/**
 * Comando personalizado definido por el usuario
 */
export interface CustomCommand {
  /** Identificador único del comando */
  id: string;
  /** Nombre del comando sin prefix (ej: "hello") */
  name: string;
  /** Respuesta del comando (soporta variables) */
  response: string;
  /** Cooldown en segundos */
  cooldown: number;
  /** Nivel de usuario requerido */
  userLevel: UserLevel;
  /** Si el comando está habilitado */
  enabled: boolean;
  /** Contador de usos */
  usageCount: number;
  /** Timestamp del último uso */
  lastUsed?: number;
}

/**
 * Contexto del usuario que ejecuta un comando
 */
export interface CommandContext {
  /** Nombre de usuario */
  user: string;
  /** Nombre del canal */
  channel: string;
  /** Si es moderador */
  isMod: boolean;
  /** Si es suscriptor */
  isSub: boolean;
  /** Si es VIP */
  isVip: boolean;
  /** Si es el broadcaster */
  isBroadcaster: boolean;
}

/**
 * Puerto para gestión de comandos personalizados
 * 
 * Los adapters que implementen esta interfaz deben manejar
 * la persistencia de comandos de chat.
 */
export interface ICommandPort {
  /**
   * Obtiene todos los comandos
   * @returns Array de comandos
   */
  getCommands(): CustomCommand[];

  /**
   * Guarda un comando
   * @param command - Comando a guardar
   */
  saveCommand(command: CustomCommand): void;

  /**
   * Elimina un comando
   * @param id - ID del comando a eliminar
   */
  deleteCommand(id: string): void;

  /**
   * Obtiene un comando por su nombre
   * @param name - Nombre del comando (sin prefix)
   * @returns Comando o null si no existe
   */
  getCommandByName(name: string): CustomCommand | null;

  /**
   * Actualiza el contador de uso de un comando
   * @param id - ID del comando
   */
  updateUsage(id: string): void;
}
