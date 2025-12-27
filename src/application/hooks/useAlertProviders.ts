/**
 * useAlertProviders Hook
 * 
 * Hook de React para gestionar proveedores de alertas externos
 * (StreamElements, Streamlabs) usando AlertProviderService.
 * 
 * @module src/application/hooks/useAlertProviders
 * @requirements 1.5, 1.6
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AlertProviderService, ProviderState } from '../services/AlertProviderService';
import { StreamElementsAdapter } from '../../infrastructure/adapters/StreamElementsAdapter';
import { StreamlabsAdapter } from '../../infrastructure/adapters/StreamlabsAdapter';
import type {
  AlertProviderConfig,
  AlertProviderType,
  ExternalAlert,
  AlertCallback,
} from '../../domain/ports/IAlertProvider';

// Re-export types for convenience
export type { AlertProviderConfig, AlertProviderType, ExternalAlert, ProviderState };

/**
 * Return type for the useAlertProviders hook
 */
export interface UseAlertProvidersReturn {
  /** States of all providers */
  providerStates: ProviderState[];
  /** All saved configurations */
  configs: AlertProviderConfig[];
  /** Whether StreamElements is connected */
  isStreamElementsConnected: boolean;
  /** Whether Streamlabs is connected */
  isStreamlabsConnected: boolean;
  /** Connect to StreamElements */
  connectStreamElements: (jwtToken: string) => Promise<void>;
  /** Connect to Streamlabs */
  connectStreamlabs: (socketToken: string) => Promise<void>;
  /** Disconnect a provider */
  disconnectProvider: (provider: AlertProviderType) => Promise<void>;
  /** Disconnect all providers */
  disconnectAll: () => Promise<void>;
  /** Get config for a provider */
  getConfig: (provider: AlertProviderType) => AlertProviderConfig | null;
  /** Save a provider config */
  saveConfig: (config: AlertProviderConfig) => void;
  /** Delete a provider config */
  deleteConfig: (provider: AlertProviderType) => void;
  /** Register a listener for external alerts */
  onAlert: (callback: AlertCallback) => () => void;
  /** Connection error message (if any) */
  error: string | null;
  /** Whether a connection is in progress */
  isConnecting: boolean;
  /** Service instance */
  service: AlertProviderService;
}

// Singleton service instance
let alertProviderServiceInstance: AlertProviderService | null = null;

const getAlertProviderService = (): AlertProviderService => {
  if (!alertProviderServiceInstance) {
    alertProviderServiceInstance = new AlertProviderService();
    
    // Register providers
    alertProviderServiceInstance.addProvider(new StreamElementsAdapter());
    alertProviderServiceInstance.addProvider(new StreamlabsAdapter());
  }
  return alertProviderServiceInstance;
};

/**
 * Hook para gestionar proveedores de alertas externos
 * 
 * @example
 * ```tsx
 * const { 
 *   isStreamElementsConnected, 
 *   connectStreamElements, 
 *   disconnectProvider 
 * } = useAlertProviders();
 * 
 * // Connect to StreamElements
 * await connectStreamElements('your-jwt-token');
 * 
 * // Disconnect
 * await disconnectProvider('streamelements');
 * ```
 */
export function useAlertProviders(): UseAlertProvidersReturn {
  const serviceRef = useRef<AlertProviderService>(getAlertProviderService());
  
  // Provider states
  const [providerStates, setProviderStates] = useState<ProviderState[]>(() => 
    serviceRef.current.getProviderStates()
  );
  
  // Configs state
  const [configs, setConfigs] = useState<AlertProviderConfig[]>(() => 
    serviceRef.current.getConfigs()
  );
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Connecting state
  const [isConnecting, setIsConnecting] = useState(false);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = serviceRef.current.onStateChange((states) => {
      setProviderStates(states);
    });
    
    return unsubscribe;
  }, []);

  // Derived state
  const isStreamElementsConnected = useMemo(() => 
    serviceRef.current.isProviderConnected('streamelements'),
    [providerStates]
  );
  
  const isStreamlabsConnected = useMemo(() => 
    serviceRef.current.isProviderConnected('streamlabs'),
    [providerStates]
  );

  // Connection methods
  const connectStreamElements = useCallback(async (jwtToken: string) => {
    setError(null);
    setIsConnecting(true);
    
    try {
      const config: AlertProviderConfig = {
        provider: 'streamelements',
        enabled: true,
        jwtToken,
      };
      
      await serviceRef.current.connectProvider('streamelements', config);
      setConfigs(serviceRef.current.getConfigs());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to StreamElements';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectStreamlabs = useCallback(async (socketToken: string) => {
    setError(null);
    setIsConnecting(true);
    
    try {
      const config: AlertProviderConfig = {
        provider: 'streamlabs',
        enabled: true,
        socketToken,
      };
      
      await serviceRef.current.connectProvider('streamlabs', config);
      setConfigs(serviceRef.current.getConfigs());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Streamlabs';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectProvider = useCallback(async (provider: AlertProviderType) => {
    setError(null);
    
    try {
      await serviceRef.current.disconnectProvider(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to disconnect ${provider}`;
      setError(message);
      throw err;
    }
  }, []);

  const disconnectAll = useCallback(async () => {
    setError(null);
    
    try {
      await serviceRef.current.disconnectAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect providers';
      setError(message);
      throw err;
    }
  }, []);

  // Config management
  const getConfig = useCallback((provider: AlertProviderType): AlertProviderConfig | null => {
    return serviceRef.current.getProviderConfig(provider);
  }, []);

  const saveConfig = useCallback((config: AlertProviderConfig) => {
    serviceRef.current.saveProviderConfig(config);
    setConfigs(serviceRef.current.getConfigs());
  }, []);

  const deleteConfig = useCallback((provider: AlertProviderType) => {
    serviceRef.current.deleteProviderConfig(provider);
    setConfigs(serviceRef.current.getConfigs());
  }, []);

  // Alert listener
  const onAlert = useCallback((callback: AlertCallback): () => void => {
    return serviceRef.current.onAlert(callback);
  }, []);

  return {
    providerStates,
    configs,
    isStreamElementsConnected,
    isStreamlabsConnected,
    connectStreamElements,
    connectStreamlabs,
    disconnectProvider,
    disconnectAll,
    getConfig,
    saveConfig,
    deleteConfig,
    onAlert,
    error,
    isConnecting,
    service: serviceRef.current,
  };
}

export default useAlertProviders;
