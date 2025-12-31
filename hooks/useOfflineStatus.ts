/**
 * useOfflineStatus - Hook para acceder al estado de red desde componentes
 * 
 * Este hook proporciona acceso reactivo al estado de conexión de red,
 * suscribiéndose automáticamente a los cambios del NetworkService.
 * 
 * @requirements 2.3
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getNetworkService, 
  NetworkStatus, 
  NetworkService 
} from '../src/application/services/NetworkService';

// ============ TYPES ============

/**
 * Opciones para el hook useOfflineStatus
 */
export interface UseOfflineStatusOptions {
  /**
   * Instancia personalizada del NetworkService (útil para testing)
   */
  networkService?: NetworkService;
}

/**
 * Valor de retorno del hook useOfflineStatus
 */
export interface UseOfflineStatusReturn {
  /**
   * Indica si hay conexión a internet
   */
  isOnline: boolean;
  
  /**
   * Indica si está offline (inverso de isOnline para conveniencia)
   */
  isOffline: boolean;
  
  /**
   * Timestamp de la última vez que estuvo online
   */
  lastOnline: number | null;
  
  /**
   * Timestamp de la última vez que estuvo offline
   */
  lastOffline: number | null;
  
  /**
   * Estado completo de la red
   */
  status: NetworkStatus;
  
  /**
   * Verifica activamente la conexión haciendo una petición de red
   */
  checkConnection: () => Promise<boolean>;
}

// ============ HOOK ============

/**
 * Hook para acceder al estado de red desde componentes React
 * 
 * Proporciona acceso reactivo al estado de conexión y se suscribe
 * automáticamente a los cambios del NetworkService.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, isOffline, checkConnection } = useOfflineStatus();
 *   
 *   if (isOffline) {
 *     return <div>Sin conexión a internet</div>;
 *   }
 *   
 *   return <div>Conectado</div>;
 * }
 * ```
 * 
 * @requirements 2.3
 */
export function useOfflineStatus(
  options: UseOfflineStatusOptions = {}
): UseOfflineStatusReturn {
  const { networkService } = options;
  
  // Get the service instance
  const service = networkService || getNetworkService();
  
  // Initialize state with current status
  const [status, setStatus] = useState<NetworkStatus>(() => service.getStatus());

  // Subscribe to network status changes
  useEffect(() => {
    // Update state when status changes
    const unsubscribe = service.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Sync initial state in case it changed between render and effect
    setStatus(service.getStatus());

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [service]);

  // Memoized check connection function
  const checkConnection = useCallback(async (): Promise<boolean> => {
    return service.checkConnection();
  }, [service]);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    lastOnline: status.lastOnline,
    lastOffline: status.lastOffline,
    status,
    checkConnection
  };
}

export default useOfflineStatus;
