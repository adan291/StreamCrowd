/**
 * LocalStorageAnalyticsAdapter - Implementación de IAdvancedAnalyticsPort para localStorage
 * 
 * Proporciona persistencia de sesiones de stream usando localStorage.
 * Incluye versionado del schema y pruning automático de sesiones antiguas.
 * 
 * @requirements 3.2 - WHEN a stream session ends THEN THE Analytics_Dashboard SHALL save session statistics
 * @requirements 3.3 - WHEN viewing history THEN THE Analytics_Dashboard SHALL show statistics from previous sessions
 */

import type { 
  IAdvancedAnalyticsPort, 
  StreamSession 
} from '../../domain/ports/IAdvancedAnalyticsPort';

/** Versión actual del schema de almacenamiento */
const CURRENT_SCHEMA_VERSION = 1;

/** Clave de localStorage para sesiones */
const STORAGE_KEY = 'stream_analytics_sessions';

/** Número máximo de sesiones a mantener */
const MAX_SESSIONS = 50;

/**
 * Schema de almacenamiento con versionado
 */
interface AnalyticsStorageSchema {
  version: number;
  sessions: StreamSession[];
  maxSessions: number;
}

/**
 * Adapter que implementa IAdvancedAnalyticsPort usando localStorage
 */
export class LocalStorageAnalyticsAdapter implements IAdvancedAnalyticsPort {
  private sessions: Map<string, StreamSession> = new Map();
  private maxSessions: number = MAX_SESSIONS;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carga las sesiones desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const data = JSON.parse(raw);
      const migrated = this.migrateSchema(data);
      
      this.sessions.clear();
      this.maxSessions = migrated.maxSessions;
      
      migrated.sessions.forEach(session => {
        this.sessions.set(session.id, session);
      });
    } catch (error) {
      console.warn('Error loading analytics sessions from localStorage:', error);
    }
  }

  /**
   * Migra el schema si es necesario
   */
  private migrateSchema(data: unknown): AnalyticsStorageSchema {
    if (!data || typeof data !== 'object') {
      return { version: CURRENT_SCHEMA_VERSION, sessions: [], maxSessions: MAX_SESSIONS };
    }

    const schema = data as Partial<AnalyticsStorageSchema>;
    
    // Handle legacy data without version
    if (!schema.version) {
      if (Array.isArray(schema)) {
        return { 
          version: CURRENT_SCHEMA_VERSION, 
          sessions: schema as StreamSession[], 
          maxSessions: MAX_SESSIONS 
        };
      }
      return { version: CURRENT_SCHEMA_VERSION, sessions: [], maxSessions: MAX_SESSIONS };
    }

    return {
      version: CURRENT_SCHEMA_VERSION,
      sessions: schema.sessions || [],
      maxSessions: schema.maxSessions || MAX_SESSIONS
    };
  }

  /**
   * Guarda las sesiones en localStorage
   */
  private saveToStorage(): void {
    try {
      // Prune old sessions before saving
      this.pruneOldSessions();
      
      const schema: AnalyticsStorageSchema = {
        version: CURRENT_SCHEMA_VERSION,
        sessions: Array.from(this.sessions.values()),
        maxSessions: this.maxSessions
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    } catch (error) {
      console.error('Error saving analytics sessions to localStorage:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, pruning more sessions');
        this.aggressivePrune();
        try {
          const schema: AnalyticsStorageSchema = {
            version: CURRENT_SCHEMA_VERSION,
            sessions: Array.from(this.sessions.values()),
            maxSessions: this.maxSessions
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        } catch {
          console.error('Still unable to save after aggressive prune');
        }
      }
    }
  }

  /**
   * Elimina sesiones antiguas para mantener el límite
   */
  private pruneOldSessions(): void {
    if (this.sessions.size <= this.maxSessions) {
      return;
    }

    // Sort by startTime descending and keep only maxSessions
    const sortedSessions = Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, this.maxSessions);

    this.sessions.clear();
    sortedSessions.forEach(session => {
      this.sessions.set(session.id, session);
    });
  }

  /**
   * Pruning agresivo cuando hay problemas de espacio
   */
  private aggressivePrune(): void {
    // Keep only half of maxSessions
    const keepCount = Math.floor(this.maxSessions / 2);
    const sortedSessions = Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, keepCount);

    this.sessions.clear();
    sortedSessions.forEach(session => {
      this.sessions.set(session.id, session);
    });
  }

  /**
   * Guarda una sesión de stream
   */
  saveSession(session: StreamSession): void {
    this.sessions.set(session.id, session);
    this.saveToStorage();
  }

  /**
   * Obtiene las sesiones guardadas
   */
  getSessions(limit?: number): StreamSession[] {
    const sorted = Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime);
    
    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Obtiene una sesión específica por ID
   */
  getSession(id: string): StreamSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * Elimina una sesión
   */
  deleteSession(id: string): void {
    this.sessions.delete(id);
    this.saveToStorage();
  }
}

// Singleton instance
let instance: LocalStorageAnalyticsAdapter | null = null;

/**
 * Obtiene la instancia singleton del adapter
 */
export function getLocalStorageAnalyticsAdapter(): LocalStorageAnalyticsAdapter {
  if (!instance) {
    instance = new LocalStorageAnalyticsAdapter();
  }
  return instance;
}
