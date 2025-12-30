/**
 * useIndexedDB - Hook para operaciones CRUD desde componentes
 * 
 * Este hook proporciona acceso a las operaciones de IndexedDB
 * con manejo de estados de carga y error.
 * 
 * @requirements 1.2, 1.3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getIndexedDBService, 
  IndexedDBService,
  DBSchema 
} from '../src/application/services/IndexedDBService';

// ============ TYPES ============

/**
 * Opciones para el hook useIndexedDB
 */
export interface UseIndexedDBOptions {
  /**
   * Instancia personalizada del IndexedDBService (útil para testing)
   */
  indexedDBService?: IndexedDBService;
  
  /**
   * Si es true, inicializa el servicio automáticamente
   * @default true
   */
  autoInit?: boolean;
}

/**
 * Estado de una operación async
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Valor de retorno del hook useIndexedDB
 */
export interface UseIndexedDBReturn {
  /**
   * Indica si el servicio está inicializado y listo
   */
  isReady: boolean;
  
  /**
   * Indica si IndexedDB está disponible (o si usa fallback)
   */
  isAvailable: boolean;
  
  /**
   * Indica si hay una operación en curso
   */
  isLoading: boolean;
  
  /**
   * Último error ocurrido
   */
  error: Error | null;
  
  /**
   * Inicializa el servicio manualmente
   */
  init: () => Promise<void>;
  
  /**
   * Obtiene un valor por clave de un store
   */
  get: <T>(store: keyof DBSchema, key: string) => Promise<T | null>;
  
  /**
   * Obtiene todos los valores de un store
   */
  getAll: <T>(store: keyof DBSchema) => Promise<T[]>;
  
  /**
   * Guarda un valor en un store
   */
  put: <T>(store: keyof DBSchema, key: string, value: T) => Promise<void>;
  
  /**
   * Elimina un valor de un store
   */
  remove: (store: keyof DBSchema, key: string) => Promise<void>;
  
  /**
   * Limpia todos los valores de un store
   */
  clear: (store: keyof DBSchema) => Promise<void>;
  
  /**
   * Limpia el último error
   */
  clearError: () => void;
}

// ============ HOOK ============

/**
 * Hook para operaciones CRUD con IndexedDB desde componentes React
 * 
 * Proporciona acceso a las operaciones de almacenamiento con
 * manejo automático de estados de carga y error.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { get, put, isLoading, error } = useIndexedDB();
 *   
 *   const saveData = async () => {
 *     await put('settings', 'theme', { dark: true });
 *   };
 *   
 *   const loadData = async () => {
 *     const theme = await get('settings', 'theme');
 *     console.log(theme);
 *   };
 *   
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *   
 *   return <button onClick={saveData}>Save</button>;
 * }
 * ```
 * 
 * @requirements 1.2, 1.3
 */
export function useIndexedDB(
  options: UseIndexedDBOptions = {}
): UseIndexedDBReturn {
  const { indexedDBService, autoInit = true } = options;
  
  // Get the service instance
  const serviceRef = useRef<IndexedDBService>(
    indexedDBService || getIndexedDBService()
  );
  
  // State
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Initialize service
  const init = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await serviceRef.current.init();
      if (isMountedRef.current) {
        setIsReady(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to initialize IndexedDB'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoInit) {
      init();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [autoInit, init]);

  // Get operation
  const get = useCallback(async <T>(
    store: keyof DBSchema, 
    key: string
  ): Promise<T | null> => {
    if (!isMountedRef.current) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await serviceRef.current.get<T>(store, key);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get data');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // GetAll operation
  const getAll = useCallback(async <T>(store: keyof DBSchema): Promise<T[]> => {
    if (!isMountedRef.current) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await serviceRef.current.getAll<T>(store);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get all data');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Put operation
  const put = useCallback(async <T>(
    store: keyof DBSchema, 
    key: string, 
    value: T
  ): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await serviceRef.current.put(store, key, value);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save data');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Delete operation
  const remove = useCallback(async (
    store: keyof DBSchema, 
    key: string
  ): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await serviceRef.current.delete(store, key);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete data');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Clear operation
  const clear = useCallback(async (store: keyof DBSchema): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await serviceRef.current.clear(store);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear store');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isReady,
    isAvailable: serviceRef.current.isAvailable(),
    isLoading,
    error,
    init,
    get,
    getAll,
    put,
    remove,
    clear,
    clearError
  };
}

export default useIndexedDB;
