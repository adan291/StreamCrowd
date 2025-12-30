/**
 * MigrationService - Servicio de migración de datos de localStorage a IndexedDB
 * 
 * Este servicio detecta datos existentes en localStorage y los migra
 * a IndexedDB, asegurando que la migración se ejecute solo una vez.
 * 
 * @requirements 6.1, 6.2, 6.3, 6.4
 */

import { 
  IndexedDBService, 
  getIndexedDBService, 
  DBSchema,
  MigrationRecord 
} from './IndexedDBService';

// ============ TYPES ============

/**
 * Resultado de la migración
 */
export interface MigrationResult {
  success: boolean;
  migratedStores: string[];
  errors: MigrationError[];
  totalItemsMigrated: number;
}

/**
 * Error durante la migración
 */
export interface MigrationError {
  store: string;
  key: string;
  error: string;
}

/**
 * Estado de la migración
 */
export interface MigrationStatus {
  completed: boolean;
  completedAt: number | null;
  version: number;
}

/**
 * Interfaz del servicio de migración
 */
export interface IMigrationService {
  checkMigrationNeeded(): Promise<boolean>;
  migrate(): Promise<MigrationResult>;
  getMigrationStatus(): Promise<MigrationStatus>;
  resetMigration(): Promise<void>;
}

// ============ CONSTANTS ============

const MIGRATION_ID = 'localStorage_to_indexeddb_v1';
const MIGRATION_VERSION = 1;
const MIGRATION_COMPLETED_KEY = 'twitchvote_migration_completed';

/**
 * Mapeo de claves de localStorage a stores de IndexedDB
 * Cada entrada define qué clave de localStorage corresponde a qué store
 */
const LOCALSTORAGE_TO_STORE_MAP: Record<string, { store: keyof DBSchema; isArray: boolean }> = {
  // Polls
  'twitch_vote_poll_history': { store: 'polls', isArray: true },
  'twitch_vote_sync_poll': { store: 'polls', isArray: false },
  'twitch_vote_templates': { store: 'polls', isArray: true },
  
  // Predictions
  'twitch_predictions': { store: 'predictions', isArray: true },
  'twitch_prediction_history': { store: 'predictions', isArray: true },
  
  // Giveaways
  'twitch_giveaways': { store: 'giveaways', isArray: true },
  'twitch_giveaway_history': { store: 'giveaways', isArray: true },
  
  // Commands
  'twitch_commands': { store: 'commands', isArray: true },
  'twitch_custom_commands': { store: 'commands', isArray: true },
  
  // Timers
  'twitch_timers': { store: 'timers', isArray: true },
  'twitch_timer_config': { store: 'timers', isArray: true },
  
  // Settings
  'twitch_vote_theme': { store: 'settings', isArray: false },
  'twitch_vote_locale': { store: 'settings', isArray: false },
  'twitch_vote_overlay_config': { store: 'settings', isArray: false },
  'twitch_ai_config': { store: 'settings', isArray: false },
  'twitch_ai_config_v2': { store: 'settings', isArray: false },
  'twitch_vote_mascot_position': { store: 'settings', isArray: false },
  'twitch_vote_moderation_presets': { store: 'settings', isArray: false },
  'twitch_vote_mod_presets': { store: 'settings', isArray: false },
  'obs_connection_config': { store: 'settings', isArray: false },
};

// ============ MIGRATION SERVICE CLASS ============

/**
 * Servicio de migración de localStorage a IndexedDB
 * 
 * Detecta datos existentes en localStorage y los migra a IndexedDB,
 * asegurando que la migración se ejecute solo una vez por instalación.
 */
export class MigrationService implements IMigrationService {
  private indexedDBService: IndexedDBService;

  constructor(indexedDBService?: IndexedDBService) {
    this.indexedDBService = indexedDBService || getIndexedDBService();
  }

  // ============ PUBLIC API ============

  /**
   * Verifica si la migración es necesaria
   * 
   * @requirements 6.4 - La migración se ejecuta solo una vez
   */
  async checkMigrationNeeded(): Promise<boolean> {
    // First check localStorage flag (quick check)
    if (this.isMigrationMarkedComplete()) {
      return false;
    }

    // Initialize IndexedDB if needed
    await this.indexedDBService.init();

    // Check if migration record exists in IndexedDB
    const migrationRecord = await this.indexedDBService.get<MigrationRecord>(
      'migrations',
      MIGRATION_ID
    );

    if (migrationRecord && migrationRecord.version >= MIGRATION_VERSION) {
      // Mark in localStorage for faster future checks
      this.markMigrationComplete();
      return false;
    }

    // Check if there's any data to migrate
    return this.hasDataToMigrate();
  }

  /**
   * Ejecuta la migración de datos de localStorage a IndexedDB
   * 
   * @requirements 6.1, 6.2, 6.3
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedStores: [],
      errors: [],
      totalItemsMigrated: 0,
    };

    try {
      // Initialize IndexedDB
      await this.indexedDBService.init();

      // Check if IndexedDB is available
      if (!this.indexedDBService.isAvailable()) {
        // If IndexedDB is not available, mark as complete to avoid retries
        // Data will remain in localStorage (fallback behavior)
        this.markMigrationComplete();
        result.success = true;
        return result;
      }

      // Migrate each localStorage key
      for (const [localStorageKey, config] of Object.entries(LOCALSTORAGE_TO_STORE_MAP)) {
        try {
          const migrated = await this.migrateKey(localStorageKey, config);
          if (migrated > 0) {
            result.totalItemsMigrated += migrated;
            if (!result.migratedStores.includes(config.store)) {
              result.migratedStores.push(config.store);
            }
          }
        } catch (error) {
          result.errors.push({
            store: config.store,
            key: localStorageKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Mark migration as complete
      await this.saveMigrationRecord();
      this.markMigrationComplete();

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      // If migration fails completely, don't mark as complete
      // Data remains in localStorage
      result.errors.push({
        store: 'all',
        key: 'migration',
        error: error instanceof Error ? error.message : String(error),
      });
      return result;
    }
  }

  /**
   * Obtiene el estado actual de la migración
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    await this.indexedDBService.init();

    const migrationRecord = await this.indexedDBService.get<MigrationRecord>(
      'migrations',
      MIGRATION_ID
    );

    if (migrationRecord) {
      return {
        completed: true,
        completedAt: migrationRecord.completedAt,
        version: migrationRecord.version,
      };
    }

    return {
      completed: this.isMigrationMarkedComplete(),
      completedAt: null,
      version: 0,
    };
  }

  /**
   * Resetea el estado de migración (útil para testing)
   */
  async resetMigration(): Promise<void> {
    await this.indexedDBService.init();
    
    // Remove migration record from IndexedDB
    try {
      await this.indexedDBService.delete('migrations', MIGRATION_ID);
    } catch {
      // Ignore if not found
    }

    // Remove localStorage flag
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MIGRATION_COMPLETED_KEY);
    }
  }

  // ============ PRIVATE METHODS ============

  /**
   * Verifica si hay datos para migrar en localStorage
   * 
   * @requirements 6.1 - Detecta datos existentes en localStorage
   */
  private hasDataToMigrate(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    for (const key of Object.keys(LOCALSTORAGE_TO_STORE_MAP)) {
      const data = localStorage.getItem(key);
      if (data !== null && data !== '') {
        return true;
      }
    }

    return false;
  }

  /**
   * Migra una clave específica de localStorage a IndexedDB
   * 
   * @requirements 6.2 - Migra datos a IndexedDB
   */
  private async migrateKey(
    localStorageKey: string,
    config: { store: keyof DBSchema; isArray: boolean }
  ): Promise<number> {
    if (typeof localStorage === 'undefined') {
      return 0;
    }

    const rawData = localStorage.getItem(localStorageKey);
    if (rawData === null || rawData === '') {
      return 0;
    }

    let data: unknown;
    try {
      data = JSON.parse(rawData);
    } catch {
      // Invalid JSON, skip this key
      console.warn(`MigrationService: Invalid JSON in ${localStorageKey}`);
      return 0;
    }

    let itemsMigrated = 0;

    if (config.isArray && Array.isArray(data)) {
      // Migrate array items
      for (const item of data) {
        const itemId = this.getItemId(item, localStorageKey);
        if (itemId) {
          await this.indexedDBService.put(config.store, itemId, item);
          itemsMigrated++;
        }
      }
    } else if (!config.isArray && data !== null) {
      // Migrate single item
      const itemId = this.getSettingsKey(localStorageKey);
      await this.indexedDBService.put(config.store, itemId, {
        key: itemId,
        value: data,
        migratedFrom: localStorageKey,
        migratedAt: Date.now(),
      });
      itemsMigrated = 1;
    }

    return itemsMigrated;
  }

  /**
   * Obtiene el ID de un item para usar como clave en IndexedDB
   */
  private getItemId(item: unknown, fallbackKey: string): string {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      // Try common ID fields
      if (typeof obj.id === 'string') return obj.id;
      if (typeof obj.id === 'number') return String(obj.id);
      if (typeof obj.name === 'string') return obj.name;
      if (typeof obj.key === 'string') return obj.key;
    }
    // Generate a unique ID based on content hash
    return `${fallbackKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convierte una clave de localStorage a una clave de settings
   */
  private getSettingsKey(localStorageKey: string): string {
    // Remove common prefixes and convert to a clean key
    return localStorageKey
      .replace(/^twitch_vote_/, '')
      .replace(/^twitch_/, '')
      .replace(/_/g, '-');
  }

  /**
   * Guarda el registro de migración en IndexedDB
   * 
   * @requirements 6.2 - Marca los datos como migrados
   */
  private async saveMigrationRecord(): Promise<void> {
    const record: MigrationRecord = {
      id: MIGRATION_ID,
      completedAt: Date.now(),
      version: MIGRATION_VERSION,
    };

    await this.indexedDBService.put('migrations', MIGRATION_ID, record);
  }

  /**
   * Verifica si la migración está marcada como completa en localStorage
   */
  private isMigrationMarkedComplete(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const flag = localStorage.getItem(MIGRATION_COMPLETED_KEY);
    return flag === 'true';
  }

  /**
   * Marca la migración como completa en localStorage
   * 
   * @requirements 6.2 - Marca los datos como migrados
   */
  private markMigrationComplete(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
    }
  }
}

// ============ SINGLETON INSTANCE ============

let migrationServiceInstance: MigrationService | null = null;

/**
 * Obtiene la instancia singleton del servicio de migración
 */
export function getMigrationService(): MigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new MigrationService();
  }
  return migrationServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetMigrationService(): void {
  migrationServiceInstance = null;
}
