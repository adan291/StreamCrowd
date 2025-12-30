/**
 * useNotificationConfig - Hook para gestionar configuración de alertas
 * 
 * Este hook proporciona acceso a la configuración de alertas de notificaciones,
 * permitiendo leer, actualizar y resetear la configuración desde componentes React.
 * 
 * @requirements 4.1, 4.2, 4.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AlertConfigService,
} from '../src/application/services/AlertConfigService';
import type {
  AlertConfig,
  NotificationChannel,
  NotificationEventType,
  PushNotificationConfig,
  DiscordWebhookConfig,
  TelegramBotConfig,
  QuietHoursConfig,
  EventNotificationConfig,
} from '../types/notifications';
import { DEFAULT_ALERT_CONFIG } from '../types/notifications';

// ============ TYPES ============

/**
 * Opciones para el hook useNotificationConfig
 */
export interface UseNotificationConfigOptions {
  /**
   * Instancia personalizada del AlertConfigService (útil para testing)
   */
  alertConfigService?: AlertConfigService;
}

/**
 * Valor de retorno del hook useNotificationConfig
 */
export interface UseNotificationConfigReturn {
  /**
   * Configuración actual de alertas
   * @requirements 4.1, 4.2
   */
  config: AlertConfig;
  
  /**
   * Actualiza la configuración completa
   * @requirements 4.4
   */
  updateConfig: (config: AlertConfig) => void;
  
  /**
   * Actualiza parcialmente la configuración
   */
  updatePartialConfig: (partialConfig: Partial<AlertConfig>) => void;
  
  /**
   * Resetea la configuración a los valores por defecto
   */
  resetConfig: () => void;
  
  /**
   * Actualiza la configuración de un canal específico
   * @requirements 4.1
   */
  updateChannelConfig: <K extends NotificationChannel>(
    channel: K,
    config: Partial<AlertConfig['channels'][K]>
  ) => void;
  
  /**
   * Actualiza la configuración de un tipo de evento
   * @requirements 4.2
   */
  updateEventConfig: (
    eventType: NotificationEventType,
    config: Partial<EventNotificationConfig>
  ) => void;
  
  /**
   * Actualiza la configuración de quiet hours
   */
  updateQuietHours: (config: Partial<QuietHoursConfig>) => void;
  
  /**
   * Habilita o deshabilita un canal
   * @requirements 4.1
   */
  setChannelEnabled: (channel: NotificationChannel, enabled: boolean) => void;
  
  /**
   * Habilita o deshabilita un tipo de evento
   * @requirements 4.2
   */
  setEventEnabled: (eventType: NotificationEventType, enabled: boolean) => void;
  
  /**
   * Añade un canal a un tipo de evento
   */
  addChannelToEvent: (eventType: NotificationEventType, channel: NotificationChannel) => void;
  
  /**
   * Elimina un canal de un tipo de evento
   */
  removeChannelFromEvent: (eventType: NotificationEventType, channel: NotificationChannel) => void;
  
  /**
   * Verifica si un evento está habilitado para un canal
   */
  isEventEnabled: (eventType: NotificationEventType, channel: NotificationChannel) => boolean;
  
  /**
   * Verifica si las quiet hours están activas
   */
  isQuietHoursActive: () => boolean;
  
  /**
   * Obtiene los canales habilitados
   */
  getEnabledChannels: () => NotificationChannel[];
  
  /**
   * Obtiene los canales configurados para un evento
   */
  getChannelsForEvent: (eventType: NotificationEventType) => NotificationChannel[];
  
  /**
   * Indica si la configuración ha sido modificada desde los valores por defecto
   */
  isModified: boolean;
  
  /**
   * Indica si se está guardando la configuración
   */
  isSaving: boolean;
  
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
 * Compara dos configuraciones para determinar si son diferentes
 */
function isConfigModified(current: AlertConfig, defaultConfig: AlertConfig): boolean {
  return JSON.stringify(current) !== JSON.stringify(defaultConfig);
}

// ============ HOOK ============

/**
 * Hook para gestionar la configuración de alertas de notificaciones
 * 
 * Proporciona acceso reactivo a la configuración y funciones para
 * actualizar canales, eventos y quiet hours.
 * 
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const { 
 *     config, 
 *     updateChannelConfig, 
 *     setChannelEnabled,
 *     resetConfig,
 *     isModified 
 *   } = useNotificationConfig();
 *   
 *   const handleEnableDiscord = () => {
 *     setChannelEnabled('discord', true);
 *   };
 *   
 *   const handleUpdateWebhook = (url: string) => {
 *     updateChannelConfig('discord', { webhookUrl: url });
 *   };
 *   
 *   return (
 *     <div>
 *       <label>
 *         <input 
 *           type="checkbox" 
 *           checked={config.channels.discord.enabled}
 *           onChange={(e) => setChannelEnabled('discord', e.target.checked)}
 *         />
 *         Discord habilitado
 *       </label>
 *       <input 
 *         value={config.channels.discord.webhookUrl}
 *         onChange={(e) => handleUpdateWebhook(e.target.value)}
 *       />
 *       {isModified && <button onClick={resetConfig}>Resetear</button>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 4.1, 4.2, 4.4
 */
export function useNotificationConfig(
  options: UseNotificationConfigOptions = {}
): UseNotificationConfigReturn {
  const { alertConfigService } = options;
  
  // Get the service instance
  const serviceRef = useRef<AlertConfigService>(
    alertConfigService || AlertConfigService.getInstance()
  );
  
  // State
  const [config, setConfig] = useState<AlertConfig>(() => 
    serviceRef.current.getConfig()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Sync config with service on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Load initial config
    setConfig(serviceRef.current.getConfig());
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Actualiza la configuración completa
   * @requirements 4.4
   */
  const updateConfig = useCallback((newConfig: AlertConfig): void => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      serviceRef.current.saveConfig(newConfig);
      setConfig(serviceRef.current.getConfig());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save config');
      setError(error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Actualiza parcialmente la configuración
   */
  const updatePartialConfig = useCallback((partialConfig: Partial<AlertConfig>): void => {
    if (!isMountedRef.current) return;
    
    const currentConfig = serviceRef.current.getConfig();
    const newConfig: AlertConfig = {
      ...currentConfig,
      ...partialConfig,
      channels: {
        ...currentConfig.channels,
        ...(partialConfig.channels || {}),
      },
      events: {
        ...currentConfig.events,
        ...(partialConfig.events || {}),
      },
      quietHours: {
        ...currentConfig.quietHours,
        ...(partialConfig.quietHours || {}),
      },
    };
    
    updateConfig(newConfig);
  }, [updateConfig]);

  /**
   * Resetea la configuración a los valores por defecto
   */
  const resetConfig = useCallback((): void => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      serviceRef.current.resetConfig();
      setConfig(serviceRef.current.getConfig());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset config');
      setError(error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Actualiza la configuración de un canal específico
   * @requirements 4.1
   */
  const updateChannelConfig = useCallback(<K extends NotificationChannel>(
    channel: K,
    channelConfig: Partial<AlertConfig['channels'][K]>
  ): void => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      serviceRef.current.updateChannelConfig(channel, channelConfig);
      setConfig(serviceRef.current.getConfig());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update ${channel} config`);
      setError(error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Actualiza la configuración de un tipo de evento
   * @requirements 4.2
   */
  const updateEventConfig = useCallback((
    eventType: NotificationEventType,
    eventConfig: Partial<EventNotificationConfig>
  ): void => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      serviceRef.current.updateEventConfig(eventType, eventConfig);
      setConfig(serviceRef.current.getConfig());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update ${eventType} config`);
      setError(error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Actualiza la configuración de quiet hours
   */
  const updateQuietHours = useCallback((
    quietHoursConfig: Partial<QuietHoursConfig>
  ): void => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      serviceRef.current.updateQuietHours(quietHoursConfig);
      setConfig(serviceRef.current.getConfig());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update quiet hours');
      setError(error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Habilita o deshabilita un canal
   * @requirements 4.1
   */
  const setChannelEnabled = useCallback((
    channel: NotificationChannel,
    enabled: boolean
  ): void => {
    updateChannelConfig(channel, { enabled } as Partial<AlertConfig['channels'][typeof channel]>);
  }, [updateChannelConfig]);

  /**
   * Habilita o deshabilita un tipo de evento
   * @requirements 4.2
   */
  const setEventEnabled = useCallback((
    eventType: NotificationEventType,
    enabled: boolean
  ): void => {
    updateEventConfig(eventType, { enabled });
  }, [updateEventConfig]);

  /**
   * Añade un canal a un tipo de evento
   */
  const addChannelToEvent = useCallback((
    eventType: NotificationEventType,
    channel: NotificationChannel
  ): void => {
    const currentConfig = serviceRef.current.getConfig();
    const currentChannels = currentConfig.events[eventType]?.channels || [];
    
    if (!currentChannels.includes(channel)) {
      updateEventConfig(eventType, {
        channels: [...currentChannels, channel],
      });
    }
  }, [updateEventConfig]);

  /**
   * Elimina un canal de un tipo de evento
   */
  const removeChannelFromEvent = useCallback((
    eventType: NotificationEventType,
    channel: NotificationChannel
  ): void => {
    const currentConfig = serviceRef.current.getConfig();
    const currentChannels = currentConfig.events[eventType]?.channels || [];
    
    updateEventConfig(eventType, {
      channels: currentChannels.filter(c => c !== channel),
    });
  }, [updateEventConfig]);

  /**
   * Verifica si un evento está habilitado para un canal
   */
  const isEventEnabled = useCallback((
    eventType: NotificationEventType,
    channel: NotificationChannel
  ): boolean => {
    return serviceRef.current.isEventEnabled(eventType, channel);
  }, []);

  /**
   * Verifica si las quiet hours están activas
   */
  const isQuietHoursActive = useCallback((): boolean => {
    return serviceRef.current.isQuietHoursActive();
  }, []);

  /**
   * Obtiene los canales habilitados
   */
  const getEnabledChannels = useCallback((): NotificationChannel[] => {
    return serviceRef.current.getEnabledChannels();
  }, []);

  /**
   * Obtiene los canales configurados para un evento
   */
  const getChannelsForEvent = useCallback((
    eventType: NotificationEventType
  ): NotificationChannel[] => {
    return serviceRef.current.getChannelsForEvent(eventType);
  }, []);

  /**
   * Limpia el último error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Calculate if config is modified
  const isModified = isConfigModified(config, DEFAULT_ALERT_CONFIG);

  return {
    config,
    updateConfig,
    updatePartialConfig,
    resetConfig,
    updateChannelConfig,
    updateEventConfig,
    updateQuietHours,
    setChannelEnabled,
    setEventEnabled,
    addChannelToEvent,
    removeChannelFromEvent,
    isEventEnabled,
    isQuietHoursActive,
    getEnabledChannels,
    getChannelsForEvent,
    isModified,
    isSaving,
    error,
    clearError,
  };
}

export default useNotificationConfig;
