/**
 * LocalStorageCommandAdapter - Implementación de ICommandPort para localStorage
 * 
 * Proporciona persistencia de comandos personalizados usando localStorage.
 * Incluye versionado del schema para migraciones futuras.
 * 
 * @requirements 2.6 - WHEN saving commands THEN THE System SHALL persist to localStorage
 * @requirements 2.7 - WHEN loading the application THEN THE System SHALL restore saved commands
 */

import type { 
  ICommandPort, 
  CustomCommand 
} from '../../domain/ports/ICommandPort';

/** Versión actual del schema de almacenamiento */
const CURRENT_SCHEMA_VERSION = 1;

/** Clave de localStorage para comandos */
const STORAGE_KEY = 'custom_commands';

/**
 * Schema de almacenamiento con versionado
 */
interface CommandStorageSchema {
  version: number;
  prefix: string;
  commands: CustomCommand[];
}

/**
 * Adapter que implementa ICommandPort usando localStorage
 */
export class LocalStorageCommandAdapter implements ICommandPort {
  private commands: Map<string, CustomCommand> = new Map();
  private commandsByName: Map<string, CustomCommand> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carga los comandos desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.initializeDefaults();
        return;
      }

      const data = JSON.parse(raw);
      const migrated = this.migrateSchema(data);
      
      this.commands.clear();
      this.commandsByName.clear();
      migrated.commands.forEach(command => {
        this.commands.set(command.id, command);
        this.commandsByName.set(command.name.toLowerCase(), command);
      });
    } catch (error) {
      console.warn('Error loading commands from localStorage:', error);
      this.initializeDefaults();
    }
  }


  /**
   * Migra el schema si es necesario
   */
  private migrateSchema(data: unknown): CommandStorageSchema {
    // Handle legacy data without version
    if (!data || typeof data !== 'object') {
      return { version: CURRENT_SCHEMA_VERSION, prefix: '!', commands: [] };
    }

    const schema = data as Partial<CommandStorageSchema>;
    
    // If no version, assume it's legacy data
    if (!schema.version) {
      // Try to extract commands from legacy format
      if (Array.isArray(schema)) {
        return { 
          version: CURRENT_SCHEMA_VERSION, 
          prefix: '!', 
          commands: schema as CustomCommand[] 
        };
      }
      return { version: CURRENT_SCHEMA_VERSION, prefix: '!', commands: [] };
    }

    // Future migrations would go here
    // if (schema.version === 1) { migrate to v2 }

    return {
      version: CURRENT_SCHEMA_VERSION,
      prefix: schema.prefix || '!',
      commands: schema.commands || []
    };
  }

  /**
   * Inicializa comandos por defecto
   */
  private initializeDefaults(): void {
    const defaultCommands: CustomCommand[] = [
      {
        id: 'default-hello',
        name: 'hello',
        response: '¡Hola {user}! Bienvenido al stream 👋',
        cooldown: 5,
        userLevel: 'everyone',
        enabled: true,
        usageCount: 0
      },
      {
        id: 'default-discord',
        name: 'discord',
        response: '¡Únete a nuestro Discord! https://discord.gg/example',
        cooldown: 30,
        userLevel: 'everyone',
        enabled: true,
        usageCount: 0
      },
      {
        id: 'default-uptime',
        name: 'uptime',
        response: 'El stream lleva activo un buen rato. ¡Gracias por estar aquí, {user}!',
        cooldown: 10,
        userLevel: 'everyone',
        enabled: true,
        usageCount: 0
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
      this.commandsByName.set(command.name.toLowerCase(), command);
    });

    this.saveToStorage();
  }

  /**
   * Guarda los comandos en localStorage
   */
  private saveToStorage(): void {
    try {
      const schema: CommandStorageSchema = {
        version: CURRENT_SCHEMA_VERSION,
        prefix: '!',
        commands: Array.from(this.commands.values())
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    } catch (error) {
      console.error('Error saving commands to localStorage:', error);
      // If quota exceeded, log but continue with in-memory only
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, continuing with in-memory only');
      }
    }
  }

  /**
   * Obtiene todos los comandos
   */
  getCommands(): CustomCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Guarda un comando
   */
  saveCommand(command: CustomCommand): void {
    // Remove old name mapping if updating
    const existing = this.commands.get(command.id);
    if (existing && existing.name !== command.name) {
      this.commandsByName.delete(existing.name.toLowerCase());
    }
    
    this.commands.set(command.id, command);
    this.commandsByName.set(command.name.toLowerCase(), command);
    this.saveToStorage();
  }

  /**
   * Elimina un comando
   */
  deleteCommand(id: string): void {
    const command = this.commands.get(id);
    if (command) {
      this.commandsByName.delete(command.name.toLowerCase());
      this.commands.delete(id);
      this.saveToStorage();
    }
  }

  /**
   * Obtiene un comando por su nombre
   */
  getCommandByName(name: string): CustomCommand | null {
    return this.commandsByName.get(name.toLowerCase()) || null;
  }

  /**
   * Actualiza el contador de uso de un comando
   */
  updateUsage(id: string): void {
    const command = this.commands.get(id);
    if (command) {
      command.usageCount++;
      command.lastUsed = Date.now();
      this.saveToStorage();
    }
  }
}

// Singleton instance
let instance: LocalStorageCommandAdapter | null = null;

/**
 * Obtiene la instancia singleton del adapter
 */
export function getLocalStorageCommandAdapter(): LocalStorageCommandAdapter {
  if (!instance) {
    instance = new LocalStorageCommandAdapter();
  }
  return instance;
}
