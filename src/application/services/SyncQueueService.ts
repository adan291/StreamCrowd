/**
 * SyncQueueService - Servicio de cola de sincronización
 * 
 * Este servicio implementa una cola de operaciones pendientes que se
 * ejecutan cuando la conexión a internet se restablece. Las operaciones
 * se procesan en orden FIFO con backoff exponencial en caso de fallos.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { 
  getIndexedDBService, 
  IndexedDBService, 
  SyncOperation 
} from './IndexedDBService';
import { 
  getNetworkService, 
  NetworkService, 
  NetworkStatus 
} from './NetworkService';

// ============ TYPES ============

/**
 * Tipo de operación de sincronización
 */
export type SyncOperationType = 'create' | 'update' | 'delete';

/**
 * Datos para crear una nueva operación de sincronización
 */
export interface SyncOperationInput {
  type: SyncOperationType;
  store: string;
  key: string;
  data: unknown;
  maxRetries?: number;
}

/**
 * Resultado del procesamiento de una operación
 */
export interface SyncResult {
  success: boolean;
  operationId: string;
  error?: string;
}

/**
 * Handler para ejecutar operaciones de sincronización
 */
export type SyncHandler = (operation: SyncOperation) => Promise<boolean>;

/**
 * Callback para notificar cambios en la cola
 */
export type SyncQueueCallback = (count: number) => void;

/**
 * Interfaz del servicio de cola de sincronización
 */
export interface ISyncQueueService {
  enqueue(operation: SyncOperationInput): Promise<string>;
  process(): Promise<SyncResult[]>;
  getPending(): Promise<SyncOperation[]>;
  getCount(): number;
  clear(): Promise<void>;
  subscribe(callback: SyncQueueCallback): () => void;
  registerHandler(handler: SyncHandler): void;
  destroy(): void;
}

// ============ CONSTANTS ============

/**
 * Configuración por defecto
 */
const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_MS = 1000;

/**
 * Store de IndexedDB para la cola
 */
const SYNC_QUEUE_STORE = 'syncQueue';

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
 * Calcula el delay con backoff exponencial y jitter
 * 
 * @requirements 4.3
 */
export function calculateBackoff(retries: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retries), MAX_DELAY_MS);
  const jitter = Math.random() * JITTER_MS;
  return delay + jitter;
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ SYNC QUEUE SERVICE CLASS ============

/**
 * Servicio de cola de sincronización
 * 
 * Proporciona encolado de operaciones con persistencia en IndexedDB,
 * procesamiento FIFO con backoff exponencial, y notificación de cambios.
 */
export class SyncQueueService implements ISyncQueueService {
  private indexedDBService: IndexedDBService;
  private networkService: NetworkService;
  private pendingCount: number = 0;
  private subscribers: Set<SyncQueueCallback>;
  private syncHandler: SyncHandler | null = null;
  private isProcessing: boolean = false;
  private unsubscribeNetwork: (() => void) | null = null;
  private isInitialized: boolean = false;

  constructor(
    indexedDBService?: IndexedDBService,
    networkService?: NetworkService
  ) {
    this.indexedDBService = indexedDBService || getIndexedDBService();
    this.networkService = networkService || getNetworkService();
    this.subscribers = new Set();
    
    // Initialize
    this.initialize();
  }

  // ============ INITIALIZATION ============

  /**
   * Inicializa el servicio
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.indexedDBService.init();
      
      // Load initial count
      await this.refreshCount();
      
      // Subscribe to network changes
      this.unsubscribeNetwork = this.networkService.subscribe(
        this.handleNetworkChange.bind(this)
      );
      
      this.isInitialized = true;
    } catch (error) {
      console.error('SyncQueueService initialization error:', error);
    }
  }

  /**
   * Maneja cambios en el estado de red
   * Procesa la cola automáticamente cuando vuelve la conexión
   * 
   * @requirements 4.2
   */
  private async handleNetworkChange(status: NetworkStatus): Promise<void> {
    if (status.isOnline && this.pendingCount > 0 && !this.isProcessing) {
      // Auto-process queue when coming back online
      await this.process();
    }
  }

  /**
   * Actualiza el conteo de operaciones pendientes
   */
  private async refreshCount(): Promise<void> {
    try {
      const pending = await this.indexedDBService.getAll<SyncOperation>(SYNC_QUEUE_STORE);
      this.pendingCount = pending.length;
    } catch (error) {
      console.error('Error refreshing sync queue count:', error);
      this.pendingCount = 0;
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
        console.error('Error in sync queue subscriber:', error);
      }
    });
  }

  // ============ PUBLIC API ============

  /**
   * Encola una operación para sincronización
   * 
   * @requirements 4.1, 4.4
   */
  async enqueue(input: SyncOperationInput): Promise<string> {
    const operation: SyncOperation = {
      id: generateUUID(),
      type: input.type,
      store: input.store,
      key: input.key,
      data: input.data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES
    };

    // Persist to IndexedDB
    await this.indexedDBService.put(SYNC_QUEUE_STORE, operation.id, operation);
    
    // Update count
    this.pendingCount++;
    this.notifySubscribers();

    return operation.id;
  }

  /**
   * Procesa las operaciones pendientes en orden FIFO
   * 
   * @requirements 4.2, 4.3, 4.5
   */
  async process(): Promise<SyncResult[]> {
    // Check if already processing
    if (this.isProcessing) {
      return [];
    }

    // Check network status
    const networkStatus = this.networkService.getStatus();
    if (!networkStatus.isOnline) {
      return [];
    }

    this.isProcessing = true;
    const results: SyncResult[] = [];

    try {
      // Get all pending operations sorted by timestamp (FIFO)
      const pending = await this.getPending();

      for (const operation of pending) {
        const result = await this.processOperation(operation);
        results.push(result);

        // If operation succeeded, remove it from queue
        if (result.success) {
          await this.removeOperation(operation.id);
        } else {
          // Update operation with retry info
          await this.updateOperationRetry(operation, result.error);
        }
      }
    } finally {
      this.isProcessing = false;
      await this.refreshCount();
      this.notifySubscribers();
    }

    return results;
  }

  /**
   * Procesa una operación individual
   */
  private async processOperation(operation: SyncOperation): Promise<SyncResult> {
    // Check if max retries exceeded
    if (operation.retries >= operation.maxRetries) {
      return {
        success: false,
        operationId: operation.id,
        error: `Max retries (${operation.maxRetries}) exceeded`
      };
    }

    // If no handler registered, mark as failed
    if (!this.syncHandler) {
      return {
        success: false,
        operationId: operation.id,
        error: 'No sync handler registered'
      };
    }

    try {
      // Apply backoff delay if this is a retry
      if (operation.retries > 0) {
        const delay = calculateBackoff(operation.retries);
        await sleep(delay);
      }

      // Execute the sync handler
      const success = await this.syncHandler(operation);

      return {
        success,
        operationId: operation.id,
        error: success ? undefined : 'Sync handler returned false'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        operationId: operation.id,
        error: errorMessage
      };
    }
  }

  /**
   * Elimina una operación de la cola
   * 
   * @requirements 4.5
   */
  private async removeOperation(operationId: string): Promise<void> {
    await this.indexedDBService.delete(SYNC_QUEUE_STORE, operationId);
  }

  /**
   * Actualiza una operación con información de reintento
   * 
   * @requirements 4.3
   */
  private async updateOperationRetry(
    operation: SyncOperation, 
    error?: string
  ): Promise<void> {
    const updated: SyncOperation = {
      ...operation,
      retries: operation.retries + 1,
      lastError: error
    };
    await this.indexedDBService.put(SYNC_QUEUE_STORE, operation.id, updated);
  }

  /**
   * Obtiene todas las operaciones pendientes ordenadas por timestamp (FIFO)
   * 
   * @requirements 4.6
   */
  async getPending(): Promise<SyncOperation[]> {
    const operations = await this.indexedDBService.getAll<SyncOperation>(SYNC_QUEUE_STORE);
    // Sort by timestamp to ensure FIFO order
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Obtiene el número de operaciones pendientes
   * 
   * @requirements 3.3
   */
  getCount(): number {
    return this.pendingCount;
  }

  /**
   * Limpia todas las operaciones de la cola
   */
  async clear(): Promise<void> {
    await this.indexedDBService.clear(SYNC_QUEUE_STORE);
    this.pendingCount = 0;
    this.notifySubscribers();
  }

  /**
   * Suscribe un callback para recibir notificaciones de cambios en la cola
   */
  subscribe(callback: SyncQueueCallback): () => void {
    this.subscribers.add(callback);
    
    // Immediately notify with current count
    callback(this.pendingCount);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Registra el handler que ejecutará las operaciones de sincronización
   */
  registerHandler(handler: SyncHandler): void {
    this.syncHandler = handler;
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
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = null;
    }
    this.subscribers.clear();
    this.syncHandler = null;
    this.isInitialized = false;
  }
}

// ============ SINGLETON INSTANCE ============

let syncQueueServiceInstance: SyncQueueService | null = null;

/**
 * Obtiene la instancia singleton del servicio de cola de sincronización
 */
export function getSyncQueueService(): SyncQueueService {
  if (!syncQueueServiceInstance) {
    syncQueueServiceInstance = new SyncQueueService();
  }
  return syncQueueServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetSyncQueueService(): void {
  if (syncQueueServiceInstance) {
    syncQueueServiceInstance.destroy();
    syncQueueServiceInstance = null;
  }
}
