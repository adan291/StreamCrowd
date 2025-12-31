/**
 * useNotificationHistory - Hook para acceder al historial de notificaciones
 * 
 * Este hook proporciona acceso al historial de notificaciones enviadas,
 * estadísticas y funciones para gestionar el historial desde componentes React.
 * 
 * @requirements 6.3, 6.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  NotificationHistoryService,
  getNotificationHistoryService,
} from '../src/application/services/NotificationHistoryService';
import type {
  NotificationHistoryEntry,
  NotificationStats,
  NotificationChannel,
} from '../types/notifications';

// ============ TYPES ============

/**
 * Opciones para el hook useNotificationHistory
 */
export interface UseNotificationHistoryOptions {
  /**
   * Instancia personalizada del NotificationHistoryService (útil para testing)
   */
  historyService?: NotificationHistoryService;
  
  /**
   * Intervalo de actualización automática en ms (default: 5000)
   */
  refreshInterval?: number;
  
  /**
   * Habilitar actualización automática (default: true)
   */
  autoRefresh?: boolean;
}

/**
 * Filtros para el historial de notificaciones
 */
export interface NotificationHistoryFilters {
  /**
   * Filtrar por canal
   */
  channel?: NotificationChannel;
  
  /**
   * Filtrar por estado (éxito/fallo)
   */
  success?: boolean;
  
  /**
   * Filtrar desde una fecha específica
   */
  fromDate?: Date;
  
  /**
   * Filtrar hasta una fecha específica
   */
  toDate?: Date;
}

/**
 * Valor de retorno del hook useNotificationHistory
 */
export interface UseNotificationHistoryReturn {
  /**
   * Historial de notificaciones (últimas 50)
   * @requirements 6.3
   */
  history: NotificationHistoryEntry[];
  
  /**
   * Estadísticas de notificaciones
   * @requirements 6.4
   */
  stats: NotificationStats;
  
  /**
   * Limpia todo el historial
   */
  clearHistory: () => Promise<void>;
  
  /**
   * Recarga el historial desde el servicio
   */
  refresh: () => Promise<void>;
  
  /**
   * Filtra el historial según los criterios especificados
   */
  filterHistory: (filters: NotificationHistoryFilters) => NotificationHistoryEntry[];
  
  /**
   * Obtiene las entradas fallidas
   */
  getFailedEntries: () => NotificationHistoryEntry[];
  
  /**
   * Obtiene las entradas exitosas
   */
  getSuccessfulEntries: () => NotificationHistoryEntry[];
  
  /**
   * Obtiene las entradas de hoy
   */
  getTodayEntries: () => NotificationHistoryEntry[];
  
  /**
   * Número total de entradas en el historial
   */
  count: number;
  
  /**
   * Indica si el historial está cargando
   */
  isLoading: boolean;
  
  /**
   * Indica si el servicio está listo
   */
  isReady: boolean;
  
  /**
   * Último error ocurrido
   */
  error: Error | null;
  
  /**
   * Limpia el último error
   */
  clearError: () => void;
}

// ============ HELPERS ============

/**
 * Obtiene el inicio del día actual en milisegundos
 */
function getStartOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * Verifica si una entrada tiene al menos un resultado exitoso
 */
function isEntrySuccessful(entry: NotificationHistoryEntry): boolean {
  return entry.results.some(r => r.success);
}

/**
 * Verifica si una entrada tiene todos los resultados fallidos
 */
function isEntryFailed(entry: NotificationHistoryEntry): boolean {
  return entry.results.length > 0 && entry.results.every(r => !r.success);
}

/**
 * Estadísticas por defecto
 */
const DEFAULT_STATS: NotificationStats = {
  sentToday: 0,
  failed: 0,
  pending: 0,
};

// ============ HOOK ============

/**
 * Hook para acceder al historial de notificaciones desde componentes React
 * 
 * Proporciona acceso reactivo al historial de notificaciones,
 * estadísticas y funciones para filtrar y gestionar el historial.
 * 
 * @example
 * ```tsx
 * function NotificationHistoryPanel() {
 *   const { 
 *     history, 
 *     stats, 
 *     clearHistory,
 *     filterHistory,
 *     isLoading 
 *   } = useNotificationHistory();
 *   
 *   const failedOnly = filterHistory({ success: false });
 *   
 *   return (
 *     <div>
 *       <h2>Estadísticas</h2>
 *       <p>Enviadas hoy: {stats.sentToday}</p>
 *       <p>Fallidas: {stats.failed}</p>
 *       <p>Pendientes: {stats.pending}</p>
 *       
 *       <h2>Historial ({history.length})</h2>
 *       {isLoading ? (
 *         <p>Cargando...</p>
 *       ) : (
 *         <ul>
 *           {history.map(entry => (
 *             <li key={entry.id}>
 *               {entry.event.title} - {entry.event.type}
 *             </li>
 *           ))}
 *         </ul>
 *       )}
 *       
 *       <button onClick={clearHistory}>Limpiar historial</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 6.3, 6.4
 */
export function useNotificationHistory(
  options: UseNotificationHistoryOptions = {}
): UseNotificationHistoryReturn {
  const { 
    historyService, 
    refreshInterval = 5000,
    autoRefresh = true,
  } = options;
  
  // Get the service instance
  const serviceRef = useRef<NotificationHistoryService>(
    historyService || getNotificationHistoryService()
  );
  
  // State
  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [stats, setStats] = useState<NotificationStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  /**
   * Carga el historial y estadísticas desde el servicio
   */
  const loadData = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    try {
      const [historyData, statsData] = await Promise.all([
        serviceRef.current.getHistory(),
        serviceRef.current.getStats(),
      ]);
      
      if (isMountedRef.current) {
        setHistory(historyData);
        setStats(statsData);
        setIsReady(serviceRef.current.isReady());
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to load notification history');
        setError(error);
      }
    }
  }, []);

  /**
   * Recarga el historial desde el servicio
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    
    try {
      await loadData();
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadData]);

  // Initial load and auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial load
    const initialLoad = async () => {
      setIsLoading(true);
      await loadData();
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    };
    
    initialLoad();
    
    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        loadData();
      }, refreshInterval);
    }
    
    return () => {
      isMountedRef.current = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadData, autoRefresh, refreshInterval]);

  /**
   * Limpia todo el historial
   */
  const clearHistory = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await serviceRef.current.clear();
      
      if (isMountedRef.current) {
        setHistory([]);
        // Refresh stats after clearing
        const newStats = await serviceRef.current.getStats();
        setStats(newStats);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
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

  /**
   * Filtra el historial según los criterios especificados
   */
  const filterHistory = useCallback((
    filters: NotificationHistoryFilters
  ): NotificationHistoryEntry[] => {
    let filtered = [...history];
    
    // Filter by channel
    if (filters.channel) {
      filtered = filtered.filter(entry => 
        entry.channels.includes(filters.channel!)
      );
    }
    
    // Filter by success/failure
    if (filters.success !== undefined) {
      if (filters.success) {
        filtered = filtered.filter(isEntrySuccessful);
      } else {
        filtered = filtered.filter(isEntryFailed);
      }
    }
    
    // Filter by date range
    if (filters.fromDate) {
      const fromTime = filters.fromDate.getTime();
      filtered = filtered.filter(entry => entry.createdAt >= fromTime);
    }
    
    if (filters.toDate) {
      const toTime = filters.toDate.getTime();
      filtered = filtered.filter(entry => entry.createdAt <= toTime);
    }
    
    return filtered;
  }, [history]);

  /**
   * Obtiene las entradas fallidas
   */
  const getFailedEntries = useCallback((): NotificationHistoryEntry[] => {
    return history.filter(isEntryFailed);
  }, [history]);

  /**
   * Obtiene las entradas exitosas
   */
  const getSuccessfulEntries = useCallback((): NotificationHistoryEntry[] => {
    return history.filter(isEntrySuccessful);
  }, [history]);

  /**
   * Obtiene las entradas de hoy
   */
  const getTodayEntries = useCallback((): NotificationHistoryEntry[] => {
    const startOfToday = getStartOfToday();
    return history.filter(entry => entry.createdAt >= startOfToday);
  }, [history]);

  /**
   * Limpia el último error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    history,
    stats,
    clearHistory,
    refresh,
    filterHistory,
    getFailedEntries,
    getSuccessfulEntries,
    getTodayEntries,
    count: history.length,
    isLoading,
    isReady,
    error,
    clearError,
  };
}

export default useNotificationHistory;
