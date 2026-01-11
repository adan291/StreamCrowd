/**
 * useOverlaySync - Reusable hook for overlay synchronization
 * 
 * Provides a standardized way to sync state between main app and overlay windows
 * using BroadcastChannel API. Reduces code duplication across overlay components.
 * 
 * @example
 * // In overlay component
 * const { state, bgColor, sendMessage } = useOverlaySync<GameState>('game_sync', initialState);
 * 
 * // In main component
 * const { sendMessage } = useOverlaySync<GameState>('game_sync', initialState);
 * sendMessage({ type: 'update', data: newState });
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Re-export overlay mode hook for convenience
export { useOverlayMode, OVERLAY_BG_COLORS } from './useOverlayMode';

/**
 * Message types for overlay communication
 */
export interface OverlaySyncMessage<T = unknown> {
  type: 'sync' | 'request_sync' | 'update' | 'reset' | string;
  data?: T;
  timestamp?: number;
}

/**
 * Options for useOverlaySync hook
 */
export interface UseOverlaySyncOptions<T> {
  /** Initial state value */
  initialState: T;
  /** Whether to request sync on mount (default: true for overlays) */
  requestSyncOnMount?: boolean;
  /** Callback when state is updated from remote */
  onStateUpdate?: (newState: T, prevState: T) => void;
  /** Custom message handler for non-standard messages */
  onMessage?: (message: OverlaySyncMessage<T>) => void;
}

/**
 * Return type for useOverlaySync hook
 */
export interface UseOverlaySyncReturn<T> {
  /** Current synchronized state */
  state: T;
  /** Update local state (does not broadcast) */
  setState: (value: T | ((prev: T) => T)) => void;
  /** Send message to all connected windows */
  sendMessage: (message: OverlaySyncMessage<T>) => void;
  /** Broadcast current state to all windows */
  broadcastState: () => void;
  /** Request state sync from main window */
  requestSync: () => void;
  /** Whether channel is connected */
  isConnected: boolean;
}

/**
 * Hook for synchronizing state between main app and overlay windows
 * 
 * @param channelName - Unique name for the BroadcastChannel
 * @param options - Configuration options
 * @returns Sync utilities and state
 */
export function useOverlaySync<T>(
  channelName: string,
  options: UseOverlaySyncOptions<T>
): UseOverlaySyncReturn<T> {
  const {
    initialState,
    requestSyncOnMount = true,
    onStateUpdate,
    onMessage,
  } = options;

  const [state, setState] = useState<T>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef<T>(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Send message to all connected windows
  const sendMessage = useCallback((message: OverlaySyncMessage<T>) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        ...message,
        timestamp: Date.now(),
      });
    }
  }, []);

  // Broadcast current state
  const broadcastState = useCallback(() => {
    sendMessage({ type: 'sync', data: stateRef.current });
  }, [sendMessage]);

  // Request sync from main window
  const requestSync = useCallback(() => {
    sendMessage({ type: 'request_sync' });
  }, [sendMessage]);

  // Initialize BroadcastChannel
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(channelName);
      setIsConnected(true);

      channelRef.current.onmessage = (event: MessageEvent<OverlaySyncMessage<T>>) => {
        const message = event.data;

        switch (message.type) {
          case 'sync':
          case 'update':
            if (message.data !== undefined) {
              const prevState = stateRef.current;
              setState(message.data);
              onStateUpdate?.(message.data, prevState);
            }
            break;

          case 'request_sync':
            // Respond with current state
            broadcastState();
            break;

          case 'reset':
            setState(initialState);
            break;

          default:
            // Pass to custom handler
            onMessage?.(message);
        }
      };

      channelRef.current.onmessageerror = () => {
        console.warn(`[useOverlaySync] Message error on channel: ${channelName}`);
      };

      // Request sync on mount if enabled
      if (requestSyncOnMount) {
        requestSync();
      }

    } catch (error) {
      console.error(`[useOverlaySync] Failed to create channel: ${channelName}`, error);
      setIsConnected(false);
    }

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [channelName, initialState, requestSyncOnMount, broadcastState, requestSync, onStateUpdate, onMessage]);

  return {
    state,
    setState,
    sendMessage,
    broadcastState,
    requestSync,
    isConnected,
  };
}

/**
 * Simplified hook for overlay components that only need to receive state
 * 
 * @param channelName - Unique name for the BroadcastChannel
 * @param initialState - Initial state value
 * @returns Current state and background color
 */
export function useOverlayReceiver<T>(
  channelName: string,
  initialState: T
): { state: T; isConnected: boolean } {
  const { state, isConnected } = useOverlaySync<T>(channelName, {
    initialState,
    requestSyncOnMount: true,
  });

  return { state, isConnected };
}

export default useOverlaySync;
