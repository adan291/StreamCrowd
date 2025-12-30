// useAPIKeys - Hook para gestionar API Keys
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  APIKey,
  APIScope,
  APIKeyCreateInput,
  APIKeyCreateResult,
  APIKeyUpdateInput,
  APIKeyUsageStats
} from '../types/api';
import { getAPIKeyService, APIKeyService } from '../src/api/services/APIKeyService';

interface UseAPIKeysState {
  keys: APIKey[];
  loading: boolean;
  error: Error | null;
}

interface UseAPIKeysReturn extends UseAPIKeysState {
  createKey: (input: APIKeyCreateInput) => Promise<APIKeyCreateResult>;
  revokeKey: (id: string) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  updateKey: (id: string, updates: APIKeyUpdateInput) => Promise<APIKey>;
  getKey: (id: string) => APIKey | null;
  getUsageStats: (keyId: string) => APIKeyUsageStats;
  refresh: () => void;
  validateKey: (rawKey: string) => Promise<APIKey | null>;
  hasScope: (apiKey: APIKey, scope: APIScope) => boolean;
}

export function useAPIKeys(): UseAPIKeysReturn {
  const serviceRef = useRef<APIKeyService | null>(null);
  const [state, setState] = useState<UseAPIKeysState>({
    keys: [],
    loading: true,
    error: null
  });

  // Initialize service
  useEffect(() => {
    serviceRef.current = getAPIKeyService();
    loadKeys();
  }, []);

  const loadKeys = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const service = serviceRef.current || getAPIKeyService();
      const keys = service.listKeys();
      setState({ keys, loading: false, error: null });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to load keys')
      }));
    }
  }, []);

  const createKey = useCallback(async (input: APIKeyCreateInput): Promise<APIKeyCreateResult> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const service = serviceRef.current || getAPIKeyService();
      const result = await service.generateKey(input);
      loadKeys(); // Refresh list
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create key');
      setState(prev => ({ ...prev, error }));
      throw error;
    }
  }, [loadKeys]);

  const revokeKey = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const service = serviceRef.current || getAPIKeyService();
      await service.revokeKey(id);
      loadKeys(); // Refresh list
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke key');
      setState(prev => ({ ...prev, error }));
      throw error;
    }
  }, [loadKeys]);

  const deleteKey = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const service = serviceRef.current || getAPIKeyService();
      await service.deleteKey(id);
      loadKeys(); // Refresh list
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete key');
      setState(prev => ({ ...prev, error }));
      throw error;
    }
  }, [loadKeys]);

  const updateKey = useCallback(async (id: string, updates: APIKeyUpdateInput): Promise<APIKey> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const service = serviceRef.current || getAPIKeyService();
      const updated = await service.updateKey(id, updates);
      loadKeys(); // Refresh list
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update key');
      setState(prev => ({ ...prev, error }));
      throw error;
    }
  }, [loadKeys]);

  const getKey = useCallback((id: string): APIKey | null => {
    const service = serviceRef.current || getAPIKeyService();
    return service.getKey(id);
  }, []);

  const getUsageStats = useCallback((keyId: string): APIKeyUsageStats => {
    const service = serviceRef.current || getAPIKeyService();
    return service.getUsageStats(keyId);
  }, []);

  const validateKey = useCallback(async (rawKey: string): Promise<APIKey | null> => {
    const service = serviceRef.current || getAPIKeyService();
    return service.validateKey(rawKey);
  }, []);

  const hasScope = useCallback((apiKey: APIKey, scope: APIScope): boolean => {
    const service = serviceRef.current || getAPIKeyService();
    return service.hasScope(apiKey, scope);
  }, []);

  return {
    ...state,
    createKey,
    revokeKey,
    deleteKey,
    updateKey,
    getKey,
    getUsageStats,
    refresh: loadKeys,
    validateKey,
    hasScope
  };
}

export default useAPIKeys;
