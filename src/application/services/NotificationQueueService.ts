/**
 * NotificationQueueService - Servicio de cola de notificaciones
 * 
 * Este servicio implementa una cola de notificaciones pendientes que se
 * procesan en orden FIFO con un delay mínimo de 1 segundo entre cada una.
 * Soporta agrupación cuando excede 50 items y persistencia en IndexedDB.
 * 
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import {
  NotificationEvent,
  NotificationChannel,
  QueuedNotification,
  INotificationQueueService,
  NotificationResult,
} from '../../../types/notifications';
import {
  getIndexedDBService,
  IndexedDBService,
} from './IndexedDBService';

// ============ TYPES ============

/**
 * Callback para notificar cambios en la cola
 */
export type NotificationQueueCallback = (count: number) => void;

/**
 * Handler para procesar notificaciones
 */
export type NotificationHandler = (
  event: NotificationEvent,
  channels: NotificationChannel[]
) => Promise<NotificationResult[]>;

/**
 * Grouped notification for batch processing
 */
export interface GroupedNotification {
  type: NotificationEvent['type'];
  count: number;
  events: NotificationEvent[];
  channels: NotificationChannel[];
}

// ============ CONSTANTS ============

/**
 * Configuración por defecto
 */
const DEFAULT_MAX_ATTEMPTS = 3;
const PROCESS_DELAY_MS = 1000; // 1 segundo entre notificaciones
const MAX_QUEUE_SIZE = 50; // Límite para agrupar notificaciones
const QUEUE_STORAGE_KEY = 'notification_queue';

// ============ HELPERS ============

/**
 * Genera un UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Calcula el delay con backoff exponencial
 */
export function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 segundo
  const maxDelay = 60000; // 1 minuto
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Jitter
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ NOTIFICATION QUEUE SERVICE CLASS ============

/**
 * Servicio de cola de notificaciones
 * 
 * Proporciona encolado de notificaciones con persistencia en IndexedDB,
 * procesamiento FIFO con delay de 1 segundo, y agrupación automática.
 */
export class NotificationQueueService implements INotificationQueueService {
  private indexedDBService: IndexedDBService;
  private pendingCount: number = 0;
  private subscribers: Set<NotificationQueueCallback>;
  private notificationHandler: NotificationHandler | null = null;
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;
  private queue: QueuedNotification[] = [];

  constructor(indexedDBService?: IndexedDBService) {
    this.indexedDBService = indexedDBService || getIndexedDBService();
    this.subscribers = new Set();
    
    // Initialize
    this.initialize();
  }

  // ============ INITIALIZATION ============

  /**
   * Inicializa el servicio cargando la cola persistida
   * 
   * @requirements 5.5
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.indexedDBService.init();
      
      // Load persisted queue
      await this.loadPersistedQueue();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('NotificationQueueService initialization error:', error);
    }
  }

  /**
   * Carga la cola persistida desde IndexedDB
   * 
   * @requirements 5.4, 5.5
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const persisted = await this.indexedDBService.get<QueuedNotification[]>(
        'settings',
        QUEUE_STORAGE_KEY
      );
      
      if (persisted && Array.isArray(persisted)) {
        // Sort by createdAt to maintain FIFO order
        this.queue = persisted.sort((a, b) => a.createdAt - b.createdAt);
        this.pendingCount = this.queue.length;
      }
    } catch (error) {
      console.error('Error loading persisted notification queue:', error);
      this.queue = [];
      this.pendingCount = 0;
    }
  }

  /**
   * Persiste la cola en IndexedDB
   * 
   * @requirements 5.4
   */
  private async persistQueue(): Promise<void> {
    try {
      await this.indexedDBService.put(
        'settings',
        QUEUE_STORAGE_KEY,
        this.queue
      );
    } catch (error) {
      console.error('Error persisting notification queue:', error);
    }
  }

  /**
   * Notifica a los suscriptores del cambio en el conteo
   */
  private notifySubscribers(): void {
    const count = this.pendingCount;
    this.subscribers.forEach(callback => {
      try {
        callback(count);
      } catch (error) {
        console.error('Error in notification queue subscriber:', error);
      }
    });
  }

  // ============ PUBLIC API ============

  /**
   * Encola una notificación para procesamiento
   * 
   * @requirements 5.1, 5.4, 5.6
   */
  async enqueue(
    event: NotificationEvent,
    channels: NotificationChannel[]
  ): Promise<string> {
    const queuedNotification: QueuedNotification = {
      id: generateUUID(),
      event,
      channels,
      attempts: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      createdAt: Date.now(),
      nextAttemptAt: Date.now(),
    };

    // Add to queue maintaining FIFO order
    this.queue.push(queuedNotification);
    this.pendingCount = this.queue.length;

    // Persist to IndexedDB
    await this.persistQueue();
    
    // Notify subscribers
    this.notifySubscribers();

    return queuedNotification.id;
  }

  /**
   * Procesa las notificaciones pendientes en orden FIFO
   * 
   * @requirements 5.1, 5.2, 5.3, 5.6
   */
  async process(): Promise<void> {
    // Check if already processing
    if (this.isProcessing) {
      return;
    }

    // Check if handler is registered
    if (!this.notificationHandler) {
      console.warn('No notification handler registered');
      return;
    }

    this.isProcessing = true;

    try {
      // Check if we need to group notifications
      if (this.queue.length > MAX_QUEUE_SIZE) {
        await this.processGrouped();
      } else {
        await this.processIndividual();
      }
    } finally {
      this.isProcessing = false;
      await this.persistQueue();
      this.notifySubscribers();
    }
  }

  /**
   * Procesa notificaciones individualmente con delay de 1 segundo
   * 
   * @requirements 5.2, 5.6
   */
  private async processIndividual(): Promise<void> {
    // Process in FIFO order (queue is already sorted by createdAt)
    while (this.queue.length > 0) {
      const notification = this.queue[0];
      
      // Check if it's time to process this notification
      if (notification.nextAttemptAt > Date.now()) {
        await sleep(notification.nextAttemptAt - Date.now());
      }

      const success = await this.processNotification(notification);

      if (success) {
        // Remove from queue
        this.queue.shift();
        this.pendingCount = this.queue.length;
      } else {
        // Update retry info
        notification.attempts++;
        
        if (notification.attempts >= notification.maxAttempts) {
          // Max retries exceeded, remove from queue
          this.queue.shift();
          this.pendingCount = this.queue.length;
          console.warn(`Notification ${notification.id} failed after ${notification.maxAttempts} attempts`);
        } else {
          // Schedule next retry with backoff
          notification.nextAttemptAt = Date.now() + calculateBackoff(notification.attempts);
          // Move to end of queue for retry
          this.queue.shift();
          this.queue.push(notification);
        }
      }

      // Persist after each operation
      await this.persistQueue();
      this.notifySubscribers();

      // Delay between notifications
      if (this.queue.length > 0) {
        await sleep(PROCESS_DELAY_MS);
      }
    }
  }

  /**
   * Procesa notificaciones agrupadas cuando excede el límite
   * 
   * @requirements 5.3
   */
  private async processGrouped(): Promise<void> {
    // Group notifications by type
    const groups = this.groupNotifications();

    for (const group of groups) {
      // Create a summary notification for the group
      const summaryEvent: NotificationEvent = {
        id: generateUUID(),
        type: group.type,
        title: `${group.count} ${group.type} notifications`,
        message: `You have ${group.count} ${group.type} notifications`,
        timestamp: Date.now(),
        priority: 'normal',
        data: {
          grouped: true,
          count: group.count,
          originalEvents: group.events.map(e => e.id),
        },
      };

      // Process the grouped notification
      if (this.notificationHandler) {
        try {
          await this.notificationHandler(summaryEvent, group.channels);
        } catch (error) {
          console.error('Error processing grouped notification:', error);
        }
      }

      // Remove processed notifications from queue
      const processedIds = new Set(group.events.map(e => e.id));
      this.queue = this.queue.filter(n => !processedIds.has(n.event.id));
      this.pendingCount = this.queue.length;

      // Delay between groups
      await sleep(PROCESS_DELAY_MS);
    }
  }

  /**
   * Agrupa notificaciones por tipo
   * 
   * @requirements 5.3
   */
  private groupNotifications(): GroupedNotification[] {
    const groupMap = new Map<string, GroupedNotification>();

    for (const notification of this.queue) {
      const type = notification.event.type;
      
      if (!groupMap.has(type)) {
        groupMap.set(type, {
          type,
          count: 0,
          events: [],
          channels: [],
        });
      }

      const group = groupMap.get(type)!;
      group.count++;
      group.events.push(notification.event);
      
      // Merge channels
      for (const channel of notification.channels) {
        if (!group.channels.includes(channel)) {
          group.channels.push(channel);
        }
      }
    }

    return Array.from(groupMap.values());
  }

  /**
   * Procesa una notificación individual
   */
  private async processNotification(notification: QueuedNotification): Promise<boolean> {
    if (!this.notificationHandler) {
      return false;
    }

    try {
      const results = await this.notificationHandler(
        notification.event,
        notification.channels
      );

      // Consider successful if at least one channel succeeded
      return results.some(r => r.success);
    } catch (error) {
      console.error('Error processing notification:', error);
      return false;
    }
  }

  /**
   * Obtiene todas las notificaciones pendientes ordenadas por createdAt (FIFO)
   * 
   * @requirements 5.6
   */
  async getPending(): Promise<QueuedNotification[]> {
    // Return a copy sorted by createdAt to ensure FIFO order
    return [...this.queue].sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Obtiene el número de notificaciones pendientes
   */
  getCount(): number {
    return this.pendingCount;
  }

  /**
   * Limpia todas las notificaciones de la cola
   */
  async clear(): Promise<void> {
    this.queue = [];
    this.pendingCount = 0;
    await this.persistQueue();
    this.notifySubscribers();
  }

  /**
   * Suscribe un callback para recibir notificaciones de cambios en la cola
   */
  subscribe(callback: NotificationQueueCallback): () => void {
    this.subscribers.add(callback);
    
    // Immediately notify with current count
    callback(this.pendingCount);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Registra el handler que procesará las notificaciones
   */
  registerHandler(handler: NotificationHandler): void {
    this.notificationHandler = handler;
  }

  /**
   * Verifica si el servicio está procesando
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Verifica si el servicio está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Limpia los recursos del servicio
   */
  destroy(): void {
    this.subscribers.clear();
    this.notificationHandler = null;
    this.isInitialized = false;
    this.queue = [];
    this.pendingCount = 0;
  }
}

// ============ SINGLETON INSTANCE ============

let notificationQueueServiceInstance: NotificationQueueService | null = null;

/**
 * Obtiene la instancia singleton del servicio de cola de notificaciones
 */
export function getNotificationQueueService(): NotificationQueueService {
  if (!notificationQueueServiceInstance) {
    notificationQueueServiceInstance = new NotificationQueueService();
  }
  return notificationQueueServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetNotificationQueueService(): void {
  if (notificationQueueServiceInstance) {
    notificationQueueServiceInstance.destroy();
    notificationQueueServiceInstance = null;
  }
}
