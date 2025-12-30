import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  StreamElementsConfig,
  SEtip,
  SEFollow,
  SESub,
  SERaid,
  SECheer,
  SEPoints,
  ConnectionStatus,
} from '../types/integrations';
import { StreamElementsAdapter } from '../src/integrations/adapters/StreamElementsAdapter';

interface UseStreamElementsReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus | null;
  channelId: string | null;
  error: string | null;
  
  // Actions
  setJWTToken: (token: string) => void;
  validateToken: () => Promise<boolean>;
  connect: () => Promise<void>;
  disconnect: () => void;
  testAlert: (type?: string) => Promise<void>;
  
  // Points
  getPoints: (username: string) => Promise<SEPoints | null>;
  addPoints: (username: string, amount: number) => Promise<SEPoints | null>;
  removePoints: (username: string, amount: number) => Promise<SEPoints | null>;
  
  // Events
  tips: SEtip[];
  follows: SEFollow[];
  subscriptions: SESub[];
  raids: SERaid[];
  cheers: SECheer[];
}

export function useStreamElements(): UseStreamElementsReturn {
  const adapterRef = useRef<StreamElementsAdapter>(new StreamElementsAdapter());
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [tips, setTips] = useState<SEtip[]>([]);
  const [follows, setFollows] = useState<SEFollow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SESub[]>([]);
  const [raids, setRaids] = useState<SERaid[]>([]);
  const [cheers, setCheers] = useState<SECheer[]>([]);

  useEffect(() => {
    const adapter = adapterRef.current;
    
    const unsubTip = adapter.onTip((tip) => {
      setTips(prev => [tip, ...prev].slice(0, 100));
    });
    
    const unsubFollow = adapter.onFollow((follow) => {
      setFollows(prev => [follow, ...prev].slice(0, 100));
    });
    
    const unsubSub = adapter.onSubscription((sub) => {
      setSubscriptions(prev => [sub, ...prev].slice(0, 100));
    });
    
    const unsubRaid = adapter.onRaid((raid) => {
      setRaids(prev => [raid, ...prev].slice(0, 100));
    });
    
    const unsubCheer = adapter.onCheer((cheer) => {
      setCheers(prev => [cheer, ...prev].slice(0, 100));
    });
    
    const unsubConnection = adapter.onConnectionChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status.connected);
      if (status.error) {
        setError(status.error);
      }
    });

    return () => {
      unsubTip();
      unsubFollow();
      unsubSub();
      unsubRaid();
      unsubCheer();
      unsubConnection();
    };
  }, []);

  const setJWTToken = useCallback((token: string) => {
    adapterRef.current.setJWTToken(token);
  }, []);

  const validateToken = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const valid = await adapterRef.current.validateToken();
      if (valid) {
        setChannelId(adapterRef.current.getChannelId());
      }
      return valid;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await adapterRef.current.connectSocket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    adapterRef.current.disconnectSocket();
  }, []);

  const testAlert = useCallback(async (type?: string) => {
    try {
      await adapterRef.current.testAlert(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test alert');
      throw err;
    }
  }, []);

  const getPoints = useCallback(async (username: string) => {
    return adapterRef.current.getPoints(username);
  }, []);

  const addPoints = useCallback(async (username: string, amount: number) => {
    return adapterRef.current.addPoints(username, amount);
  }, []);

  const removePoints = useCallback(async (username: string, amount: number) => {
    return adapterRef.current.removePoints(username, amount);
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    channelId,
    error,
    setJWTToken,
    validateToken,
    connect,
    disconnect,
    testAlert,
    getPoints,
    addPoints,
    removePoints,
    tips,
    follows,
    subscriptions,
    raids,
    cheers,
  };
}
