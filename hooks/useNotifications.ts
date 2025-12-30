/**
 * useNotifications - Hook para enviar notificaciones desde componentes
 * 
 * Este hook proporciona acceso al servicio de notificaciones,
 * permitiendo enviar notificaciones y probar canales desde componentes React.
 * 
 * @requirements 1.3, 2.2, 3.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  NotificationService,
  getNotificationService,
} from '../src/application/services/NotificationService';
import type {
  NotificationEvent,
  NotificationChannel,
  NotificationResult,
  NotificationEventType,
  NotificationPriority,
} from '../types/notifications';

// ============ TYPES ============

/**
 * Opciones para el hook useNotifications
 */
export interface UseNotificationsOptions {
  /**
   * Instancia personalizada del NotificationService (útil para testing)
   */
  notificationService?: NotificationService;
}

/**
 * Parámetros para crear un evento de notificación
 */
export interface CreateNotificationParams {
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

/**
 * Valor de retorno del hook useNotifications
 */
export interface UseNotificationsReturn {
  /**
   * Envía una notificación a todos los canales configurados
   * @requirements 1.3, 2.2, 3.3
   */
  notify: (event: NotificationEvent | CreateNotificationParams) => Promise<NotificationResult[]>;
  
  /**
   * Envía una notificación inmediatamente sin encolar
   */
  notifyImmediate: (event: NotificationEvent | CreateNotificationParams) => Promise<NotificationResult[]>;
  
  /**
   * Prueba un canal de notificación específico
   * @requirements 1.3, 2.2, 3.3
   */
  testChannel: (channel: NotificationChannel) => Promise<boolean>;
  
  /**
   * Obtiene los canales habilitados
   */
  getEnabledChannels: () => NotificationChannel[];
  
  /**
   * Número de notificaciones pendientes en la cola
   */
  pendingCount: number;
  
  /**
   * Indica si hay notificaciones pendientes
   */
  hasPending: boolean;
  
  /**
   * Indica si se está enviando una notificación
   */
  isSending: boolean;
  
  /**
   * Indica si se está probando un canal
   */
  isTesting: boolean;
  
  /**
   * Último error ocurrido
   */
  error: Error | null;
  
  /**
   * Limpia el último error
   */
  clearError: () => void;
  
  /**
   * Procesa las notificaciones pendientes
   */
  processPending: () => Promise<void>;
  
  /**
   * Limpia todas las notificaciones pendientes
   */
  clearPending: () => Promise<void>;
}

// ============ HELPERS ============

/**
 * Genera un ID único para una notificación
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convierte parámetros de creación a un evento de notificación completo
 */
function toNotificationEvent(
  params: NotificationEvent | CreateNotificationParams
): NotificationEvent {
  // Si ya es un NotificationEvent completo, retornarlo
  if ('id' in params && 'timestamp' in params) {
    return params as NotificationEvent;
  }
  
  // Crear un evento completo desde los parámetros
  const createParams = params as CreateNotificationParams;
  return {
    id: generateNotificationId(),
    type: createParams.type,
    title: createParams.title,
    message: createParams.message,
    data: createParams.data,
    priority: createParams.priority || 'normal',
    timestamp: Date.now(),
  };
}

// ============ HOOK ============

/**
 * Hook para enviar notificaciones desde componentes React
 * 
 * Proporciona acceso al servicio de notificaciones con estado reactivo
 * para enviar notificaciones y probar canales.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { notify, testChannel, isSending, error } = useNotifications();
 *   
 *   const handleNewFollower = async (username: string) => {
 *     await notify({
 *       type: 'follower',
 *       title: 'Nuevo seguidor',
 *       message: `${username} te ha seguido!`,
 *     });
 *   };
 *   
 *   const handleTestDiscord = async () => {
 *     const success = await testChannel('discord');
 *     if (success) {
 *       console.log('Discord funciona!');
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       {isSending && <span>Enviando...</span>}
 *       {error && <span>Error: {error.message}</span>}
 *       <button onClick={() => handleNewFollower('user123')}>
 *         Simular seguidor
 *       </button>
 *       <button onClick={handleTestDiscord}>
 *         Probar Discord
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 1.3, 2.2, 3.3
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { notificationService } = options;
  
  // Get the service instance
  const serviceRef = useRef<NotificationService>(
    notificationService || getNotificationService()
  );
  
  // State
  const [pendingCount, setPendingCount] = useState<number>(() => 
    serviceRef.current.getPendingCount()
  );
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Update pending count periodically
  useEffect(() => {
    isMountedRef.current = true;
    
    // Update pending count
    const updatePendingCount = () => {
      if (isMountedRef.current) {
        setPendingCount(serviceRef.current.getPendingCount());
      }
    };
    
    // Initial update
    updatePendingCount();
    
    // Poll for updates (since NotificationService doesn't have subscription)
    const interval = setInterval(updatePendingCount, 1000);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Envía una notificación a todos los canales configurados
   * @requirements 1.3, 2.2, 3.3
   */
  const notify = useCallback(async (
    eventOrParams: NotificationEvent | CreateNotificationParams
  ): Promise<NotificationResult[]> => {
    if (!isMountedRef.current) return [];
    
    setIsSending(true);
    setError(null);
    
    try {
      const event = toNotificationEvent(eventOrParams);
      const results = await serviceRef.current.notify(event);
      
      // Update pending count
      if (isMountedRef.current) {
        setPendingCount(serviceRef.current.getPendingCount());
      }
      
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send notification');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  }, []);

  /**
   * Envía una notificación inmediatamente sin encolar
   */
  const notifyImmediate = useCallback(async (
    eventOrParams: NotificationEvent | CreateNotificationParams
  ): Promise<NotificationResult[]> => {
    if (!isMountedRef.current) return [];
    
    setIsSending(true);
    setError(null);
    
    try {
      const event = toNotificationEvent(eventOrParams);
      const results = await serviceRef.current.notifyImmediate(event);
      
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send immediate notification');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  }, []);

  /**
   * Prueba un canal de notificación específico
   * @requirements 1.3, 2.2, 3.3
   */
  const testChannel = useCallback(async (
    channel: NotificationChannel
  ): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    
    setIsTesting(true);
    setError(null);
    
    try {
      const success = await serviceRef.current.testChannel(channel);
      return success;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to test ${channel} channel`);
      if (isMountedRef.current) {
        setError(error);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsTesting(false);
      }
    }
  }, []);

  /**
   * Obtiene los canales habilitados
   */
  const getEnabledChannels = useCallback((): NotificationChannel[] => {
    return serviceRef.current.getEnabledChannels();
  }, []);

  /**
   * Procesa las notificaciones pendientes
   */
  const processPending = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      await serviceRef.current.processPending();
      
      if (isMountedRef.current) {
        setPendingCount(serviceRef.current.getPendingCount());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process pending notifications');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Limpia todas las notificaciones pendientes
   */
  const clearPending = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      await serviceRef.current.clearPending();
      
      if (isMountedRef.current) {
        setPendingCount(0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear pending notifications');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Limpia el último error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    notify,
    notifyImmediate,
    testChannel,
    getEnabledChannels,
    pendingCount,
    hasPending: pendingCount > 0,
    isSending,
    isTesting,
    error,
    clearError,
    processPending,
    clearPending,
  };
}

export default useNotifications;
