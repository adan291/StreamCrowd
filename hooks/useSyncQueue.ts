/**
 * useSyncQueue - Hook para acceder a la cola de sincronización
 * 
 * Este hook proporciona acceso a la cola de sincronización,
 * exponiendo el conteo de operaciones pendientes y funciones
 * para encolar y procesar operaciones.
 * 
 * @requirements 4.1, 3.3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getSyncQueueService, 
  SyncQueueService,
  SyncOperationInput,
  SyncResult,
  SyncHandler
} from '../src/application/services/SyncQueueService';
import { SyncOperation } from '../src/application/services/IndexedDBService';

// ============ TYPES ============

/**
 * Opciones para el hook useSyncQueue
 */
export interface UseSyncQueueOptions {
  /**
   * Instancia personalizada del SyncQueueService (útil para testing)
   */
  syncQueueService?: SyncQueueService;
  
  /**
   * Handler para ejecutar las operaciones de sincronización
   */
  syncHandler?: SyncHandler;
}

/**
 * Valor de retorno del hook useSyncQueue
 */
export interface UseSyncQueueReturn {
  /**
   * Número de operaciones pendientes de sincronizar
   * @requirements 3.3
   */
  pendingCount: number;
  
  /**
   * Indica si hay operaciones pendientes
   */
  hasPending: boolean;
  
  /**
   * Indica si se está procesando la cola
   */
  isProcessing: boolean;
  
  /**
   * Último error ocurrido durante el procesamiento
   */
  error: Error | null;
  
  /**
   * Encola una operación para sincronización
   * @requirements 4.1
   */
  enqueue: (operation: SyncOperationInput) => Promise<string>;
  
  /**
   * Procesa todas las operaciones pendientes
   */
  process: () => Promise<SyncResult[]>;
  
  /**
   * Obtiene todas las operaciones pendientes
   */
  getPending: () => Promise<SyncOperation[]>;
  
  /**
   * Limpia todas las operaciones de la cola
   */
  clear: () => Promise<void>;
  
  /**
   * Registra un handler para ejecutar las operaciones
   */
  registerHandler: (handler: SyncHandler) => void;
  
  /**
   * Limpia el último error
   */
  clearError: () => void;
}

// ============ HOOK ============

/**
 * Hook para acceder a la cola de sincronización desde componentes React
 * 
 * Proporciona acceso reactivo al conteo de operaciones pendientes
 * y funciones para encolar y procesar operaciones de sincronización.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { pendingCount, hasPending, enqueue, process } = useSyncQueue();
 *   
 *   const saveOffline = async () => {
 *     await enqueue({
 *       type: 'create',
 *       store: 'polls',
 *       key: 'poll-123',
 *       data: { title: 'My Poll' }
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       {hasPending && <span>Pendientes: {pendingCount}</span>}
 *       <button onClick={saveOffline}>Guardar</button>
 *       <button onClick={process}>Sincronizar</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 4.1, 3.3
 */
export function useSyncQueue(
  options: UseSyncQueueOptions = {}
): UseSyncQueueReturn {
  const { syncQueueService, syncHandler } = options;
  
  // Get the service instance
  const serviceRef = useRef<SyncQueueService>(
    syncQueueService || getSyncQueueService()
  );
  
  // State
  const [pendingCount, setPendingCount] = useState<number>(() => 
    serviceRef.current.getCount()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Subscribe to count changes
  useEffect(() => {
    isMountedRef.current = true;
    
    const unsubscribe = serviceRef.current.subscribe((count) => {
      if (isMountedRef.current) {
        setPendingCount(count);
      }
    });

    // Sync initial count
    setPendingCount(serviceRef.current.getCount());

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Register sync handler if provided
  useEffect(() => {
    if (syncHandler) {
      serviceRef.current.registerHandler(syncHandler);
    }
  }, [syncHandler]);

  // Enqueue operation
  const enqueue = useCallback(async (
    operation: SyncOperationInput
  ): Promise<string> => {
    setError(null);
    
    try {
      const operationId = await serviceRef.current.enqueue(operation);
      return operationId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to enqueue operation');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  // Process queue
  const process = useCallback(async (): Promise<SyncResult[]> => {
    if (!isMountedRef.current) return [];
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const results = await serviceRef.current.process();
      
      // Check for any failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        const errorMessage = failures
          .map(f => f.error || 'Unknown error')
          .join('; ');
        if (isMountedRef.current) {
          setError(new Error(`Some operations failed: ${errorMessage}`));
        }
      }
      
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process queue');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, []);

  // Get pending operations
  const getPending = useCallback(async (): Promise<SyncOperation[]> => {
    try {
      return await serviceRef.current.getPending();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get pending operations');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  // Clear queue
  const clear = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      await serviceRef.current.clear();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear queue');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  // Register handler
  const registerHandler = useCallback((handler: SyncHandler): void => {
    serviceRef.current.registerHandler(handler);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pendingCount,
    hasPending: pendingCount > 0,
    isProcessing,
    error,
    enqueue,
    process,
    getPending,
    clear,
    registerHandler,
    clearError
  };
}

export default useSyncQueue;
