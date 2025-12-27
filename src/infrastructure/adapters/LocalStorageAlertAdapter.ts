/**
 * LocalStorageAlertAdapter - Implementación de IAlertPort para localStorage
 * 
 * Proporciona persistencia de configuraciones de alertas usando localStorage.
 * Incluye versionado del schema para migraciones futuras.
 * 
 * @requirements 1.6 - WHEN saving alert configuration THEN THE Alert_System SHALL persist to localStorage
 * @requirements 1.7 - WHEN loading the application THEN THE Alert_System SHALL restore saved alert configurations
 */

import type { 
  IAlertPort, 
  AlertConfig, 
  AlertEventType 
} from '../../domain/ports/IAlertPort';

/** Versión actual del schema de almacenamiento */
const CURRENT_SCHEMA_VERSION = 1;

/** Clave de localStorage para alertas */
const STORAGE_KEY = 'stream_alerts_config';

/**
 * Schema de almacenamiento con versionado
 */
interface AlertStorageSchema {
  version: number;
  configs: AlertConfig[];
}

/**
 * Adapter que implementa IAlertPort usando localStorage
 */
export class LocalStorageAlertAdapter implements IAlertPort {
  private configs: Map<string, AlertConfig> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carga las configuraciones desde localStorage
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
      
      this.configs.clear();
      migrated.configs.forEach(config => {
        this.configs.set(config.id, config);
      });
    } catch (error) {
      console.warn('Error loading alert configs from localStorage:', error);
      this.initializeDefaults();
    }
  }

  /**
   * Migra el schema si es necesario
   */
  private migrateSchema(data: unknown): AlertStorageSchema {
    // Handle legacy data without version
    if (!data || typeof data !== 'object') {
      return { version: CURRENT_SCHEMA_VERSION, configs: [] };
    }

    const schema = data as Partial<AlertStorageSchema>;
    
    // If no version, assume it's legacy data
    if (!schema.version) {
      // Try to extract configs from legacy format
      if (Array.isArray(schema)) {
        return { version: CURRENT_SCHEMA_VERSION, configs: schema as AlertConfig[] };
      }
      return { version: CURRENT_SCHEMA_VERSION, configs: [] };
    }

    // Future migrations would go here
    // if (schema.version === 1) { migrate to v2 }

    return {
      version: CURRENT_SCHEMA_VERSION,
      configs: schema.configs || []
    };
  }

  /**
   * Inicializa configuraciones por defecto
   */
  private initializeDefaults(): void {
    const defaultConfigs: AlertConfig[] = [
      {
        id: 'default-follow',
        eventType: 'follow',
        enabled: true,
        template: 'default',
        duration: 5000,
        animation: 'slide',
        soundVolume: 50
      },
      {
        id: 'default-sub',
        eventType: 'sub',
        enabled: true,
        template: 'fancy',
        duration: 7000,
        animation: 'bounce',
        soundVolume: 60
      },
      {
        id: 'default-raid',
        eventType: 'raid',
        enabled: true,
        template: 'fancy',
        duration: 10000,
        animation: 'zoom',
        soundVolume: 70
      },
      {
        id: 'default-bits',
        eventType: 'bits',
        enabled: true,
        template: 'default',
        duration: 6000,
        animation: 'bounce',
        soundVolume: 60
      },
      {
        id: 'default-gift',
        eventType: 'gift',
        enabled: true,
        template: 'fancy',
        duration: 8000,
        animation: 'zoom',
        soundVolume: 65
      }
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.id, config);
    });

    this.saveToStorage();
  }

  /**
   * Guarda las configuraciones en localStorage
   */
  private saveToStorage(): void {
    try {
      const schema: AlertStorageSchema = {
        version: CURRENT_SCHEMA_VERSION,
        configs: Array.from(this.configs.values())
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    } catch (error) {
      console.error('Error saving alert configs to localStorage:', error);
      // If quota exceeded, log but continue with in-memory only
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, continuing with in-memory only');
      }
    }
  }

  /**
   * Obtiene todas las configuraciones de alertas
   */
  getConfigs(): AlertConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Guarda una configuración de alerta
   */
  saveConfig(config: AlertConfig): void {
    this.configs.set(config.id, config);
    this.saveToStorage();
  }

  /**
   * Elimina una configuración de alerta
   */
  deleteConfig(id: string): void {
    this.configs.delete(id);
    this.saveToStorage();
  }

  /**
   * Obtiene la configuración para un tipo de evento específico
   */
  getConfigByEvent(eventType: AlertEventType): AlertConfig | null {
    for (const config of this.configs.values()) {
      if (config.eventType === eventType && config.enabled) {
        return config;
      }
    }
    return null;
  }
}

// Singleton instance
let instance: LocalStorageAlertAdapter | null = null;

/**
 * Obtiene la instancia singleton del adapter
 */
export function getLocalStorageAlertAdapter(): LocalStorageAlertAdapter {
  if (!instance) {
    instance = new LocalStorageAlertAdapter();
  }
  return instance;
}
