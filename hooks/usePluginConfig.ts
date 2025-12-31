// Hook para configuración de plugins
import { useState, useEffect, useCallback } from 'react';
import { getPluginManagerService } from '../src/plugins/services/PluginManagerService';
import { getPluginRegistryService } from '../src/plugins/services/PluginRegistryService';

export interface UsePluginConfigReturn<T = Record<string, unknown>> {
  config: T;
  loading: boolean;
  error: string | null;
  
  // Actions
  setConfig: (config: Partial<T>) => boolean;
  resetConfig: () => boolean;
  getValue: <K extends keyof T>(key: K) => T[K] | undefined;
  setValue: <K extends keyof T>(key: K, value: T[K]) => boolean;
}

export function usePluginConfig<T extends Record<string, unknown> = Record<string, unknown>>(
  pluginId: string
): UsePluginConfigReturn<T> {
  const [config, setConfigState] = useState<T>({} as T);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manager = getPluginManagerService();
  const registry = getPluginRegistryService();

  // Load config on mount
  useEffect(() => {
    const loadConfig = () => {
      try {
        setLoading(true);
        const pluginConfig = manager.getPluginConfig(pluginId) as T;
        setConfigState(pluginConfig);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando configuración');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Subscribe to changes
    const unsubscribe = registry.subscribe((plugins) => {
      const plugin = plugins.find(p => p.id === pluginId);
      if (plugin) {
        setConfigState(plugin.config as T);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pluginId]);

  const setConfig = useCallback((newConfig: Partial<T>): boolean => {
    try {
      const result = manager.setPluginConfig(pluginId, newConfig as Record<string, unknown>);
      if (result) {
        setConfigState(prev => ({ ...prev, ...newConfig }));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando configuración');
      return false;
    }
  }, [pluginId]);

  const resetConfig = useCallback((): boolean => {
    try {
      const result = manager.resetPluginConfig(pluginId);
      if (result) {
        const newConfig = manager.getPluginConfig(pluginId) as T;
        setConfigState(newConfig);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reseteando configuración');
      return false;
    }
  }, [pluginId]);

  const getValue = useCallback(<K extends keyof T>(key: K): T[K] | undefined => {
    return config[key];
  }, [config]);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]): boolean => {
    return setConfig({ [key]: value } as Partial<T>);
  }, [setConfig]);

  return {
    config,
    loading,
    error,
    setConfig,
    resetConfig,
    getValue,
    setValue
  };
}
