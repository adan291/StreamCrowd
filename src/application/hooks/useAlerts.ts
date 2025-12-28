/**
 * useAlerts Hook
 * 
 * Hook de React para usar AlertService con la arquitectura hexagonal.
 * Proporciona gestión de alertas personalizadas desacoplada de la UI.
 * 
 * @module src/application/hooks/useAlerts
 * @requirements 1.2, 1.4
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AlertService, AlertListener, AlertQueueState } from '../services/AlertService';
import { LocalStorageAlertAdapter, getLocalStorageAlertAdapter } from '../../infrastructure/adapters/LocalStorageAlertAdapter';
import type { AlertConfig, AlertEvent, AlertEventType } from '../../domain/ports/IAlertPort';

// Re-export types for convenience
export type { AlertConfig, AlertEvent, AlertEventType, AlertQueueState };

/**
 * Return type for the useAlerts hook
 */
export interface UseAlertsReturn {
  /** Current alert being displayed */
  currentAlert: { event: AlertEvent; config: AlertConfig } | null;
  /** Pending alerts in queue */
  pendingAlerts: AlertEvent[];
  /** Whether alerts are being processed */
  isProcessing: boolean;
  /** All alert configurations */
  configs: AlertConfig[];
  /** Get config for a specific event type */
  getConfig: (eventType: AlertEventType) => AlertConfig | null;
  /** Save an alert configuration */
  saveConfig: (config: AlertConfig) => void;
  /** Delete an alert configuration */
  deleteConfig: (id: string) => void;
  /** Manually trigger an alert */
  triggerAlert: (event: AlertEvent) => void;
  /** Trigger a follow alert */
  triggerFollowAlert: (username: string) => void;
  /** Preview an alert without queueing */
  previewAlert: (config: AlertConfig) => void;
  /** Clear all pending alerts */
  clearQueue: () => void;
  /** Register a listener for alerts */
  onAlert: (callback: AlertListener) => () => void;
  /** Service instance */
  service: AlertService;
}

// Singleton service instance
let alertServiceInstance: AlertService | null = null;

const getAlertService = (): AlertService => {
  if (!alertServiceInstance) {
    const adapter = getLocalStorageAlertAdapter();
    alertServiceInstance = new AlertService(adapter);
  }
  return alertServiceInstance;
};

/**
 * Hook para gestionar alertas personalizadas usando AlertService
 * 
 * @example
 * ```tsx
 * const { currentAlert, configs, saveConfig, triggerFollowAlert } = useAlerts();
 * 
 * // Trigger a follow alert
 * triggerFollowAlert('new_follower');
 * 
 * // Update a config
 * saveConfig({ ...config, duration: 5000 });
 * ```
 */
export function useAlerts(): UseAlertsReturn {
  const serviceRef = useRef<AlertService>(getAlertService());
  
  // Queue state
  const [queueState, setQueueState] = useState<AlertQueueState>(() => 
    serviceRef.current.getQueueState()
  );
  
  // Configs state
  const [configs, setConfigs] = useState<AlertConfig[]>(() => 
    serviceRef.current.getAllConfigs()
  );

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = serviceRef.current.onStateChange((state) => {
      setQueueState(state);
    });
    
    return unsubscribe;
  }, []);

  // Derived state
  const currentAlert = useMemo(() => queueState.current, [queueState]);
  const pendingAlerts = useMemo(() => queueState.pending, [queueState]);
  const isProcessing = useMemo(() => queueState.isProcessing, [queueState]);

  // Config management
  const getConfig = useCallback((eventType: AlertEventType): AlertConfig | null => {
    return serviceRef.current.getConfig(eventType);
  }, []);

  const saveConfig = useCallback((config: AlertConfig) => {
    serviceRef.current.saveConfig(config);
    setConfigs(serviceRef.current.getAllConfigs());
  }, []);

  const deleteConfig = useCallback((id: string) => {
    serviceRef.current.deleteConfig(id);
    setConfigs(serviceRef.current.getAllConfigs());
  }, []);

  // Alert triggering
  const triggerAlert = useCallback((event: AlertEvent) => {
    serviceRef.current.enqueue(event);
  }, []);

  const triggerFollowAlert = useCallback((username: string) => {
    serviceRef.current.triggerFollowAlert(username);
  }, []);

  const previewAlert = useCallback((config: AlertConfig) => {
    serviceRef.current.previewAlert(config);
  }, []);

  const clearQueue = useCallback(() => {
    serviceRef.current.clearQueue();
  }, []);

  // Listener registration
  const onAlert = useCallback((callback: AlertListener): () => void => {
    return serviceRef.current.onAlert(callback);
  }, []);

  return {
    currentAlert,
    pendingAlerts,
    isProcessing,
    configs,
    getConfig,
    saveConfig,
    deleteConfig,
    triggerAlert,
    triggerFollowAlert,
    previewAlert,
    clearQueue,
    onAlert,
    service: serviceRef.current,
  };
}

export default useAlerts;
