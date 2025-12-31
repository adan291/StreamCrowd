/**
 * NotificationHistoryService - Servicio de historial de notificaciones
 * 
 * Este servicio implementa el almacenamiento y gestión del historial de
 * notificaciones enviadas, con un límite de 50 entradas y estadísticas.
 * 
 * @requirements 6.3, 6.4
 */

import {
  NotificationHistoryEntry,
  NotificationStats,
  INotificationHistoryService,
} from '../../../types/notifications';
import {
  getIndexedDBService,
  IndexedDBService,
} from './IndexedDBService';
import { getNotificationQueueService, NotificationQueueService } from './NotificationQueueService';

// ============ CONSTANTS ============

/**
 * Maximum number of history entries to keep
 */
const MAX_HISTORY_ENTRIES = 50;

/**
 * Storage key for history in IndexedDB
 */
const HISTORY_STORAGE_KEY = 'notification_history';

// ============ HELPERS ============

/**
 * Gets the start of today in milliseconds
 */
function getStartOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// ============ NOTIFICATION HISTORY SERVICE CLASS ============

/**
 * Servicio de historial de notificaciones
 * 
 * Proporciona almacenamiento de historial con límite de 50 entradas,
 * estadísticas de notificaciones y persistencia en IndexedDB.
 */
export class NotificationHistoryService implements INotificationHistoryService {
  private indexedDBService: IndexedDBService;
  private queueService: NotificationQueueService;
  private history: NotificationHistoryEntry[] = [];
  private isInitialized: boolean = false;

  constructor(
    indexedDBService?: IndexedDBService,
    queueService?: NotificationQueueService
  ) {
    this.indexedDBService = indexedDBService || getIndexedDBService();
    this.queueService = queueService || getNotificationQueueService();
    
    // Initialize
    this.initialize();
  }

  // ============ INITIALIZATION ============

  /**
   * Inicializa el servicio cargando el historial persistido
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.indexedDBService.init();
      
      // Load persisted history
      await this.loadPersistedHistory();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('NotificationHistoryService initialization error:', error);
    }
  }

  /**
   * Carga el historial persistido desde IndexedDB
   */
  private async loadPersistedHistory(): Promise<void> {
    try {
      const persisted = await this.indexedDBService.get<NotificationHistoryEntry[]>(
        'settings',
        HISTORY_STORAGE_KEY
      );
      
      if (persisted && Array.isArray(persisted)) {
        // Sort by createdAt descending (newest first)
        this.history = persisted.sort((a, b) => b.createdAt - a.createdAt);
        
        // Enforce limit
        if (this.history.length > MAX_HISTORY_ENTRIES) {
          this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
          await this.persistHistory();
        }
      }
    } catch (error) {
      console.error('Error loading persisted notification history:', error);
      this.history = [];
    }
  }

  /**
   * Persiste el historial en IndexedDB
   */
  private async persistHistory(): Promise<void> {
    try {
      await this.indexedDBService.put(
        'settings',
        HISTORY_STORAGE_KEY,
        this.history
      );
    } catch (error) {
      console.error('Error persisting notification history:', error);
    }
  }

  // ============ PUBLIC API ============

  /**
   * Añade una entrada al historial con límite de 50
   * 
   * @requirements 6.3
   */
  async addEntry(entry: NotificationHistoryEntry): Promise<void> {
    // Add new entry at the beginning (newest first)
    this.history.unshift(entry);
    
    // Enforce limit by removing oldest entries
    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
    }
    
    // Persist to IndexedDB
    await this.persistHistory();
  }

  /**
   * Obtiene el historial de notificaciones (últimas 50)
   * 
   * @requirements 6.3
   */
  async getHistory(): Promise<NotificationHistoryEntry[]> {
    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Return a copy sorted by createdAt descending (newest first)
    return [...this.history].sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Obtiene estadísticas de notificaciones
   * 
   * @requirements 6.4
   */
  async getStats(): Promise<NotificationStats> {
    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startOfToday = getStartOfToday();
    
    // Count sent today
    const sentToday = this.history.filter(entry => 
      entry.createdAt >= startOfToday
    ).length;
    
    // Count failed (entries where all results failed)
    const failed = this.history.filter(entry =>
      entry.results.length > 0 && entry.results.every(r => !r.success)
    ).length;
    
    // Get pending count from queue service
    const pending = this.queueService.getCount();
    
    return {
      sentToday,
      failed,
      pending,
    };
  }

  /**
   * Limpia todo el historial
   */
  async clear(): Promise<void> {
    this.history = [];
    await this.persistHistory();
  }

  /**
   * Verifica si el servicio está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Obtiene el número de entradas en el historial
   */
  getCount(): number {
    return this.history.length;
  }

  /**
   * Limpia los recursos del servicio
   */
  destroy(): void {
    this.history = [];
    this.isInitialized = false;
  }
}

// ============ SINGLETON INSTANCE ============

let notificationHistoryServiceInstance: NotificationHistoryService | null = null;

/**
 * Obtiene la instancia singleton del servicio de historial de notificaciones
 */
export function getNotificationHistoryService(): NotificationHistoryService {
  if (!notificationHistoryServiceInstance) {
    notificationHistoryServiceInstance = new NotificationHistoryService();
  }
  return notificationHistoryServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetNotificationHistoryService(): void {
  if (notificationHistoryServiceInstance) {
    notificationHistoryServiceInstance.destroy();
    notificationHistoryServiceInstance = null;
  }
}
