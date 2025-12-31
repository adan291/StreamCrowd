/**
 * useMobileSync - Main hook for mobile app state synchronization
 * @requirements Task 2.4 - Implementar handlers de mensajes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMobileWebSocketService } from '../services/MobileWebSocketService';
import type {
  MobileAppState,
  MobileConnectionStatus,
  MobileMessage,
  DesktopMessage,
  PairingData,
} from '../../types/mobile';

export interface UseMobileSyncReturn {
  // Connection state
  status: MobileConnectionStatus;
  isConnected: boolean;
  error: string | null;
  
  // App state
  state: MobileAppState | null;
  
  // Actions
  connect: (pairingData: PairingData) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  sendAction: (action: MobileMessage) => boolean;
  requestState: () => void;
}

const INITIAL_STATE: MobileAppState = {
  channelName: '',
  isLive: false,
  viewerCount: 0,
  poll: null,
  prediction: null,
  timers: [],
  giveaways: [],
  recentChat: [],
};

export function useMobileSync(): UseMobileSyncReturn {
  const [status, setStatus] = useState<MobileConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<MobileAppState | null>(null);
  
  const wsService = useRef(getMobileWebSocketService());

  // Handle incoming messages
  const handleMessage = useCallback((message: DesktopMessage) => {
    switch (message.type) {
      case 'STATE_SYNC':
        setState(message.data);
        break;
        
      case 'POLL_UPDATE':
        setState((prev) => prev ? { ...prev, poll: message.data } : null);
        break;
        
      case 'PREDICTION_UPDATE':
        setState((prev) => prev ? { ...prev, prediction: message.data } : null);
        break;
        
      case 'TIMER_UPDATE':
        setState((prev) => {
          if (!prev) return null;
          const timers = prev.timers.map((t) =>
            t.id === message.data.id ? message.data : t
          );
          // Add if not exists
          if (!timers.find((t) => t.id === message.data.id)) {
            timers.push(message.data);
          }
          return { ...prev, timers };
        });
        break;
        
      case 'GIVEAWAY_UPDATE':
        setState((prev) => {
          if (!prev) return null;
          const giveaways = prev.giveaways.map((g) =>
            g.id === message.data.id ? message.data : g
          );
          if (!giveaways.find((g) => g.id === message.data.id)) {
            giveaways.push(message.data);
          }
          return { ...prev, giveaways };
        });
        break;
        
      case 'CHAT_MESSAGE':
        setState((prev) => {
          if (!prev) return null;
          const recentChat = [message.data, ...prev.recentChat].slice(0, 100);
          return { ...prev, recentChat };
        });
        break;
        
      case 'METRICS_UPDATE':
        setState((prev) => prev ? {
          ...prev,
          viewerCount: message.data.viewerCount,
        } : null);
        break;
        
      case 'NOTIFICATION':
        // Handle notifications (could trigger push notification)
        console.log('Notification:', message.data);
        break;
        
      case 'ERROR':
        setError(message.data.message);
        break;
        
      case 'CONNECTION_ACCEPTED':
        // Connection confirmed, request initial state
        wsService.current.requestState();
        break;
    }
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback((newStatus: MobileConnectionStatus, err?: string) => {
    setStatus(newStatus);
    if (err) {
      setError(err);
    } else if (newStatus === 'connected') {
      setError(null);
    }
  }, []);

  // Setup listeners
  useEffect(() => {
    const unsubMessage = wsService.current.onMessage(handleMessage);
    const unsubStatus = wsService.current.onStatusChange(handleStatusChange);

    return () => {
      unsubMessage();
      unsubStatus();
    };
  }, [handleMessage, handleStatusChange]);

  // Connect to desktop
  const connect = useCallback(async (pairingData: PairingData) => {
    setError(null);
    try {
      await wsService.current.connect(pairingData);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    wsService.current.disconnect();
    setState(null);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    wsService.current.reconnect();
  }, []);

  // Send action to desktop
  const sendAction = useCallback((action: MobileMessage): boolean => {
    return wsService.current.send(action);
  }, []);

  // Request full state
  const requestState = useCallback(() => {
    wsService.current.requestState();
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    error,
    state,
    connect,
    disconnect,
    reconnect,
    sendAction,
    requestState,
  };
}

export default useMobileSync;
