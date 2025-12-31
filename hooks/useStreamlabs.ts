import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  StreamlabsTokens,
  StreamlabsConfig,
  StreamlabsDonation,
  StreamlabsFollow,
  StreamlabsSub,
  ConnectionStatus,
} from '../types/integrations';
import { StreamlabsAdapter } from '../src/integrations/adapters/StreamlabsAdapter';

interface UseStreamlabsReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus | null;
  tokens: StreamlabsTokens | null;
  error: string | null;
  
  // Actions
  setConfig: (config: StreamlabsConfig) => void;
  getAuthUrl: (scopes?: string[]) => string | null;
  handleCallback: (code: string) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  testAlert: (type?: 'donation' | 'follow' | 'subscription') => Promise<void>;
  
  // Events
  donations: StreamlabsDonation[];
  follows: StreamlabsFollow[];
  subscriptions: StreamlabsSub[];
}

export function useStreamlabs(): UseStreamlabsReturn {
  const adapterRef = useRef<StreamlabsAdapter>(new StreamlabsAdapter());
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [tokens, setTokens] = useState<StreamlabsTokens | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [donations, setDonations] = useState<StreamlabsDonation[]>([]);
  const [follows, setFollows] = useState<StreamlabsFollow[]>([]);
  const [subscriptions, setSubscriptions] = useState<StreamlabsSub[]>([]);

  useEffect(() => {
    const adapter = adapterRef.current;
    
    const unsubDonation = adapter.onDonation((donation) => {
      setDonations(prev => [donation, ...prev].slice(0, 100));
    });
    
    const unsubFollow = adapter.onFollow((follow) => {
      setFollows(prev => [follow, ...prev].slice(0, 100));
    });
    
    const unsubSub = adapter.onSubscription((sub) => {
      setSubscriptions(prev => [sub, ...prev].slice(0, 100));
    });
    
    const unsubConnection = adapter.onConnectionChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status.connected);
      if (status.error) {
        setError(status.error);
      }
    });

    return () => {
      unsubDonation();
      unsubFollow();
      unsubSub();
      unsubConnection();
    };
  }, []);

  const setConfig = useCallback((config: StreamlabsConfig) => {
    adapterRef.current.setConfig(config);
  }, []);

  const getAuthUrl = useCallback((scopes?: string[]): string | null => {
    try {
      return adapterRef.current.getAuthUrl(scopes);
    } catch {
      return null;
    }
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    setError(null);
    try {
      const newTokens = await adapterRef.current.handleCallback(code);
      setTokens(newTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle callback');
      throw err;
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

  const testAlert = useCallback(async (type?: 'donation' | 'follow' | 'subscription') => {
    try {
      await adapterRef.current.testAlert(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test alert');
      throw err;
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    tokens,
    error,
    setConfig,
    getAuthUrl,
    handleCallback,
    connect,
    disconnect,
    testAlert,
    donations,
    follows,
    subscriptions,
  };
}
