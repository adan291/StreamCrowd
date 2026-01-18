/**
 * Enhanced useOverlaySync hook - Application layer implementation
 * 
 * This hook provides the new overlay synchronization interface following
 * hexagonal architecture principles. It replaces the legacy hook with
 * improved type safety, error handling, and performance monitoring.
 * 
 * Features:
 * - Type-safe overlay state management
 * - Comprehensive error handling and recovery
 * - Performance monitoring and health checks
 * - Resource cleanup and memory management
 * - Feature flag support for gradual rollout
 * - Backward compatibility with legacy components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import type { OverlaySyncService } from '../services/OverlaySyncService';
import type { 
  OverlayState, 
  OverlayType,
  PollOverlayState,
  GiveawayOverlayState,
  GameOverlayState,
  PredictionOverlayState
} from '../../domain/entities/OverlayState';
import type { 
  ConnectionStatus, 
  SyncMetrics,
  SyncResult 
} from '../../domain/ports/IOverlaySync';
import { DependencyFactory } from '../../infrastructure/factories/DependencyFactory';
import { AuditUserContext } from '../../domain/entities/AuditLog';

/**
 * Hook configuration options
 */
export interface UseOverlaySyncOptions {
  /** Channel ID for synchronization */
  channelId?: string;
  
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  
  /** Auto-reconnect on connection failure */
  autoReconnect?: boolean;
  
  /** Debounce delay for updates (ms) */
  debounceMs?: number;
  
  /** Enable audit logging */
  enableAuditLog?: boolean;
  
  /** User context for audit logging */
  userContext?: AuditUserContext;
  
  /** Maximum retry attempts for failed operations */
  maxRetries?: number;
  
  /** Enable network prioritization */
  enableNetworkPrioritization?: boolean;
}

/**
 * Hook return interface with enhanced capabilities
 */
export interface UseOverlaySyncReturn<T extends OverlayState = OverlayState> {
  // Core state management
  state: T | null;
  updateState: (state: T, options?: UpdateOptions) => Promise<SyncResult>;
  clearState: (type: OverlayType) => Promise<SyncResult>;
  clearAllStates: () => Promise<SyncResult>;
  
  // Connection management
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  reconnect: () => Promise<void>;
  
  // Error handling
  error: string | null;
  lastError: Error | null;
  clearError: () => void;
  
  // Performance monitoring
  metrics: SyncMetrics | null;
  healthCheck: () => Promise<boolean>;
  
  // Subscription management
  subscribe: <U extends OverlayState>(
    type: OverlayType,
    callback: (state: U | null) => void
  ) => () => void;
  
  // Service access
  service: OverlaySyncService | null;
}

/**
 * Update options for state modifications
 */
export interface UpdateOptions {
  /** Priority level for network prioritization */
  priority?: 'low' | 'normal' | 'high' | 'critical';
  
  /** Bypass debouncing for immediate updates */
  immediate?: boolean;
  
  /** Custom deadline for the update (timestamp) */
  deadline?: number;
  
  /** Skip validation for performance-critical updates */
  skipValidation?: boolean;
}

/**
 * Feature flag configuration
 */
interface FeatureFlags {
  enhancedOverlaySync: boolean;
  performanceMonitoring: boolean;
  autoErrorRecovery: boolean;
  auditLogging: boolean;
  networkPrioritization: boolean;
}

/**
 * Get feature flags from environment and localStorage
 */
const getFeatureFlags = (): FeatureFlags => {
  const envFlags = {
    enhancedOverlaySync: import.meta.env.VITE_ENHANCED_OVERLAY_SYNC !== 'false',
    performanceMonitoring: import.meta.env.VITE_OVERLAY_MONITORING !== 'false',
    autoErrorRecovery: import.meta.env.VITE_AUTO_ERROR_RECOVERY !== 'false',
    auditLogging: import.meta.env.VITE_AUDIT_LOGGING !== 'false',
    networkPrioritization: import.meta.env.VITE_NETWORK_PRIORITIZATION !== 'false',
  };

  try {
    const storedFlags = localStorage.getItem('streamcrowd_feature_flags');
    if (storedFlags) {
      const parsed = JSON.parse(storedFlags);
      return { ...envFlags, ...parsed };
    }
  } catch (error) {
    console.warn('[useOverlaySync] Failed to parse feature flags:', error);
  }

  return envFlags;
};

/**
 * Enhanced useOverlaySync hook with full type safety and monitoring
 * 
 * @param type The overlay type to manage
 * @param options Configuration options
 * @returns Enhanced overlay sync interface
 */
export function useOverlaySync<T extends OverlayState = OverlayState>(
  type: OverlayType,
  options: UseOverlaySyncOptions = {}
): UseOverlaySyncReturn<T> {
  // State management
  const [state, setState] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [service, setService] = useState<OverlaySyncService | null>(null);
  
  // Configuration
  const [localChannelId] = useLocalStorage('channelId', '');
  const activeChannelId = options.channelId || localChannelId;
  const featureFlags = getFeatureFlags();
  
  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Initialize service
  useEffect(() => {
    const initializeService = async () => {
      try {
        const overlayService = await DependencyFactory.getInstance().getOverlaySyncService();
        if (mountedRef.current) {
          setService(overlayService);
          setError(null);
          setLastError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync service';
          setError(errorMessage);
          setLastError(err instanceof Error ? err : new Error(errorMessage));
          console.error('[useOverlaySync] Service initialization failed:', err);
        }
      }
    };

    initializeService();
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
    setLastError(null);
  }, []);

  // Health check function
  const healthCheck = useCallback(async (): Promise<boolean> => {
    if (!service) {
      return false;
    }

    try {
      const status = service.getConnectionStatus();
      const isHealthy = status === 'connected';
      
      if (options.enableMonitoring && featureFlags.performanceMonitoring) {
        const currentMetrics = service.getPerformanceMetrics();
        setMetrics(currentMetrics);
      }
      
      return isHealthy;
    } catch (error) {
      console.error('[useOverlaySync] Health check failed:', error);
      return false;
    }
  }, [service, options.enableMonitoring, featureFlags.performanceMonitoring]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    if (!service) {
      throw new Error('Service not available');
    }

    setError(null);
    setLastError(null);
    setConnectionStatus('reconnecting');
    
    try {
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Attempt reconnection
      if ('reconnect' in service) {
        await (service as any).reconnect();
      }
      
      // Check connection status
      const status = service.getConnectionStatus();
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      
      if (status !== 'connected') {
        throw new Error(`Reconnection failed: ${status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reconnection failed';
      setError(errorMessage);
      setLastError(err instanceof Error ? err : new Error(errorMessage));
      setConnectionStatus('error');
      
      // Auto-retry if enabled
      if (options.autoReconnect !== false && featureFlags.autoErrorRecovery) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            reconnect().catch(console.error);
          }
        }, 5000);
      }
      
      throw err;
    }
  }, [service, options.autoReconnect, featureFlags.autoErrorRecovery]);

  // Update state function
  const updateState = useCallback(async (
    newState: T, 
    updateOptions: UpdateOptions = {}
  ): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    if (!activeChannelId) {
      throw new Error('No channel ID available');
    }

    try {
      // Ensure state has required fields
      const completeState: T = {
        ...newState,
        channelId: activeChannelId,
        updatedAt: Date.now(),
        metadata: {
          ...newState.metadata,
          source: 'useOverlaySync_enhanced',
          userId: options.userContext?.userId || activeChannelId,
          timestamp: Date.now(),
        }
      };

      // Update with options
      const result = await service.updateOverlayState(completeState, {
        priority: updateOptions.priority === 'critical' ? 'critical' :
                 updateOptions.priority === 'high' ? 'high' :
                 updateOptions.priority === 'low' ? 'low' : 'normal',
        bypassQueue: updateOptions.immediate,
        deadline: updateOptions.deadline,
      });

      if (result.success) {
        setState(completeState);
        setError(null);
        setLastError(null);
      } else if (result.error) {
        const errorMessage = result.error.message || 'Update failed';
        setError(errorMessage);
        setLastError(new Error(errorMessage));
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update state';
      setError(errorMessage);
      setLastError(err instanceof Error ? err : new Error(errorMessage));
      console.error('[useOverlaySync] Update failed:', err);
      
      return {
        success: false,
        error: {
          type: 'unknown',
          code: 'UPDATE_FAILED',
          message: errorMessage,
          isRetryable: true,
          requiresReauth: false,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };
    }
  }, [service, activeChannelId, options.userContext]);

  // Clear state function
  const clearState = useCallback(async (overlayType: OverlayType): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await service.clearOverlay(overlayType);
      
      if (result.success && overlayType === type) {
        setState(null);
        setError(null);
        setLastError(null);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear state';
      setError(errorMessage);
      setLastError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [service, type]);

  // Clear all states function
  const clearAllStates = useCallback(async (): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await service.clearAllOverlays();
      
      if (result.success) {
        setState(null);
        setError(null);
        setLastError(null);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all states';
      setError(errorMessage);
      setLastError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [service]);

  // Subscribe function
  const subscribe = useCallback(<U extends OverlayState>(
    overlayType: OverlayType,
    callback: (state: U | null) => void
  ): (() => void) => {
    if (!service) {
      console.warn('[useOverlaySync] Cannot subscribe: service not initialized');
      return () => {};
    }

    try {
      return service.subscribeToOverlayChanges<U>(overlayType, callback);
    } catch (error) {
      console.error('[useOverlaySync] Subscription failed:', error);
      return () => {};
    }
  }, [service]);

  // Main subscription effect
  useEffect(() => {
    if (!activeChannelId || !service) {
      return;
    }

    try {
      // Subscribe to overlay state changes
      const unsubscribe = service.subscribeToOverlayChanges<T>(
        type,
        (overlayState) => {
          if (mountedRef.current) {
            setState(overlayState);
            setError(null);
            setLastError(null);
            
            if (import.meta.env.DEV) {
              console.log(`[useOverlaySync] State updated for ${type}:`, overlayState);
            }
          }
        }
      );

      unsubscribeRef.current = unsubscribe;

      // Monitor connection status
      const checkConnection = () => {
        if (service && mountedRef.current) {
          const status = service.getConnectionStatus();
          setConnectionStatus(status);
          setIsConnected(status === 'connected');
          
          if (status === 'error' || status === 'disconnected') {
            setError(`Connection ${status}`);
          } else if (status === 'connected') {
            setError(null);
            setLastError(null);
          }
        }
      };

      // Initial connection check
      checkConnection();

      // Periodic connection monitoring
      const connectionInterval = setInterval(checkConnection, 5000);

      // Performance metrics monitoring if enabled
      if (options.enableMonitoring && featureFlags.performanceMonitoring) {
        const updateMetrics = () => {
          if (service && mountedRef.current) {
            try {
              const currentMetrics = service.getPerformanceMetrics();
              setMetrics(currentMetrics);
            } catch (error) {
              console.warn('[useOverlaySync] Metrics update failed:', error);
            }
          }
        };

        updateMetrics(); // Initial metrics
        metricsIntervalRef.current = setInterval(updateMetrics, 10000); // Every 10 seconds
      }

      return () => {
        // Cleanup subscriptions and intervals
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        
        clearInterval(connectionInterval);
        
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        
        if (mountedRef.current) {
          setIsConnected(false);
          setConnectionStatus('disconnected');
        }
      };
    } catch (error) {
      console.error('[useOverlaySync] Subscription setup failed:', error);
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Subscription failed');
        setLastError(error instanceof Error ? error : new Error('Subscription failed'));
      }
    }
  }, [activeChannelId, service, type, options.enableMonitoring, featureFlags.performanceMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear metrics interval
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      // Unsubscribe from overlay changes
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  return {
    // Core state management
    state,
    updateState,
    clearState,
    clearAllStates,
    
    // Connection management
    isConnected,
    connectionStatus,
    reconnect,
    
    // Error handling
    error,
    lastError,
    clearError,
    
    // Performance monitoring
    metrics,
    healthCheck,
    
    // Subscription management
    subscribe,
    
    // Service access
    service,
  };
}

/**
 * Typed hooks for specific overlay types
 */
export const usePollSync = (options?: UseOverlaySyncOptions) => 
  useOverlaySync<PollOverlayState>('poll', options);

export const useGiveawaySync = (options?: UseOverlaySyncOptions) => 
  useOverlaySync<GiveawayOverlayState>('giveaway', options);

export const useGameSync = (options?: UseOverlaySyncOptions) => 
  useOverlaySync<GameOverlayState>('game', options);

export const usePredictionSync = (options?: UseOverlaySyncOptions) => 
  useOverlaySync<PredictionOverlayState>('prediction', options);

/**
 * Multi-type overlay sync hook for components that need multiple overlay types
 */
export function useMultiOverlaySync(
  types: OverlayType[],
  options: UseOverlaySyncOptions = {}
): {
  states: Record<OverlayType, OverlayState | null>;
  updateState: (type: OverlayType, state: OverlayState, options?: UpdateOptions) => Promise<SyncResult>;
  clearState: (type: OverlayType) => Promise<SyncResult>;
  clearAllStates: () => Promise<SyncResult>;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  service: OverlaySyncService | null;
} {
  const [states, setStates] = useState<Record<OverlayType, OverlayState | null>>({
    poll: null,
    giveaway: null,
    game: null,
    prediction: null,
  });
  
  const [service, setService] = useState<OverlaySyncService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribesRef = useRef<Map<OverlayType, () => void>>(new Map());
  const mountedRef = useRef(true);

  // Initialize service
  useEffect(() => {
    DependencyFactory.getInstance().getOverlaySyncService()
      .then(overlayService => {
        if (mountedRef.current) {
          setService(overlayService);
          setError(null);
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to initialize service');
        }
      });
  }, []);

  // Subscribe to all requested types
  useEffect(() => {
    if (!service) return;

    types.forEach(type => {
      const unsubscribe = service.subscribeToOverlayChanges(
        type,
        (overlayState) => {
          if (mountedRef.current) {
            setStates(prev => ({
              ...prev,
              [type]: overlayState,
            }));
          }
        }
      );
      
      unsubscribesRef.current.set(type, unsubscribe);
    });

    // Monitor connection
    const checkConnection = () => {
      if (service && mountedRef.current) {
        const status = service.getConnectionStatus();
        setConnectionStatus(status);
        setIsConnected(status === 'connected');
      }
    };

    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);

    return () => {
      // Cleanup all subscriptions
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribesRef.current.clear();
      clearInterval(connectionInterval);
    };
  }, [service, types]);

  // Update state function
  const updateState = useCallback(async (
    type: OverlayType,
    state: OverlayState,
    updateOptions: UpdateOptions = {}
  ): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    const result = await service.updateOverlayState(state, {
      priority: updateOptions.priority === 'critical' ? 'critical' :
               updateOptions.priority === 'high' ? 'high' :
               updateOptions.priority === 'low' ? 'low' : 'normal',
      bypassQueue: updateOptions.immediate,
      deadline: updateOptions.deadline,
    });

    if (result.success) {
      setStates(prev => ({
        ...prev,
        [type]: state,
      }));
    }

    return result;
  }, [service]);

  // Clear state function
  const clearState = useCallback(async (type: OverlayType): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    const result = await service.clearOverlay(type);
    
    if (result.success) {
      setStates(prev => ({
        ...prev,
        [type]: null,
      }));
    }
    
    return result;
  }, [service]);

  // Clear all states function
  const clearAllStates = useCallback(async (): Promise<SyncResult> => {
    if (!service) {
      throw new Error('Service not initialized');
    }

    const result = await service.clearAllOverlays();
    
    if (result.success) {
      setStates({
        poll: null,
        giveaway: null,
        game: null,
        prediction: null,
      });
    }
    
    return result;
  }, [service]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribesRef.current.clear();
    };
  }, []);

  return {
    states,
    updateState,
    clearState,
    clearAllStates,
    isConnected,
    connectionStatus,
    error,
    service,
  };
}

// Export types
export type {
  UseOverlaySyncOptions,
  UseOverlaySyncReturn,
  UpdateOptions,
  FeatureFlags,
};