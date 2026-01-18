/**
 * Legacy useOverlaySync hook with migration support
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { OverlaySyncService } from '@/src/application/services/OverlaySyncService';
import type { OverlayState, OverlayType } from '@/src/domain/entities/OverlayState';
import type { ConnectionStatus, SyncMetrics } from '@/src/domain/ports/IOverlaySync';
import { DependencyFactory } from '@/src/infrastructure/factories/DependencyFactory';

// Legacy interface for backward compatibility
interface OverlayStateData {
  currentPoll?: any;
  currentGiveaway?: any;
  currentGame?: any;
  currentPrediction?: any;
  theme?: string;
  mood?: 'hype' | 'calm' | 'toxic' | 'confused';
  lastUpdate?: number;
}

// Enhanced interface with new features
interface UseOverlaySyncReturn {
  state: OverlayStateData;
  updateState: (updates: Partial<OverlayStateData>) => Promise<void>;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  connectionStatus: ConnectionStatus;
  metrics: SyncMetrics | null;
  healthCheck: () => Promise<boolean>;
}

// Options interface for configuration
interface UseOverlaySyncOptions {
  channelId?: string;
  useEnhancedSync?: boolean;
  enableMonitoring?: boolean;
  autoReconnect?: boolean;
  debounceMs?: number;
}

// Feature flags interface for gradual rollout
interface FeatureFlags {
  useEnhancedSync?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAuditLogging?: boolean;
  enableNetworkPrioritization?: boolean;
}

/**
 * Enhanced useOverlaySync hook with backward compatibility and migration support
 */
export function useOverlaySync(
  options?: UseOverlaySyncOptions | string
): UseOverlaySyncReturn {
  const config: UseOverlaySyncOptions = typeof options === 'string' 
    ? { channelId: options }
    : options || {};

  const [state, setState] = useState<OverlayStateData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [localChannelId] = useLocalStorage('channelId', '');
  const [overlaySync, setOverlaySync] = useState<OverlaySyncService | null>(null);
  
  const activeChannelId = config.channelId || localChannelId;

  // Initialize overlay sync service
  useEffect(() => {
    let mounted = true;
    
    const initializeService = async () => {
      try {
        const service = await DependencyFactory.getInstance().getOverlaySyncService();
        if (mounted) {
          setOverlaySync(service);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync service';
          setError(errorMessage);
          console.error('[useOverlaySync] Service initialization failed:', err);
        }
      }
    };

    initializeService();
    
    return () => {
      mounted = false;
    };
  }, []);

  const healthCheck = useCallback(async (): Promise<boolean> => {
    if (!overlaySync) {
      return false;
    }

    try {
      const status = overlaySync.getConnectionStatus();
      return status === 'connected';
    } catch (error) {
      console.error('[useOverlaySync] Health check failed:', error);
      return false;
    }
  }, [overlaySync]);

  const reconnect = useCallback(async () => {
    setError(null);
    setIsConnected(false);
    setConnectionStatus('reconnecting');
    
    if (!overlaySync) {
      setError('Sync service not available');
      setConnectionStatus('error');
      return;
    }

    try {
      const status = overlaySync.getConnectionStatus();
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reconnection failed';
      setError(errorMessage);
      setConnectionStatus('error');
    }
  }, [overlaySync]);

  const updateState = useCallback(async (updates: Partial<OverlayStateData>) => {
    if (!activeChannelId) {
      throw new Error('No channel ID available');
    }

    if (!overlaySync) {
      throw new Error('Sync service not initialized');
    }

    try {
      const legacyState: OverlayState = {
        id: `legacy_${activeChannelId}_${Date.now()}`,
        type: 'poll' as OverlayType,
        channelId: activeChannelId,
        version: 1,
        data: {
          ...state,
          ...updates,
          lastUpdate: Date.now()
        },
        updatedAt: Date.now(),
        isActive: true,
      };

      await overlaySync.updateOverlayState(legacyState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update state';
      console.error('[useOverlaySync] Update failed:', err);
      setError(errorMessage);
      throw err;
    }
  }, [activeChannelId, overlaySync, state]);

  return {
    state,
    updateState,
    isConnected,
    error,
    reconnect,
    connectionStatus,
    metrics,
    healthCheck,
  };
}

/**
 * Legacy useOverlayReceiver hook for backward compatibility
 * This is a simplified version that just receives state updates
 */
export function useOverlayReceiver(channelId?: string): {
  state: OverlayStateData;
  isConnected: boolean;
  error: string | null;
} {
  const { state, isConnected, error } = useOverlaySync({ channelId });
  
  return {
    state,
    isConnected,
    error,
  };
}

export type { 
  UseOverlaySyncOptions, 
  UseOverlaySyncReturn,
  OverlayStateData,
  FeatureFlags
};