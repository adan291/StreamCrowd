// Hook para gestión de plugins
import { useState, useEffect, useCallback } from 'react';
import { Plugin, PluginManifest, PluginInstallResult } from '../types/plugins';
import { getPluginManagerService } from '../src/plugins/services/PluginManagerService';
import { getPluginRegistryService } from '../src/plugins/services/PluginRegistryService';

export interface UsePluginsReturn {
  plugins: Plugin[];
  activePlugins: Plugin[];
  loading: boolean;
  error: string | null;
  
  // Actions
  installFromFile: (file: File) => Promise<PluginInstallResult>;
  installFromURL: (url: string) => Promise<PluginInstallResult>;
  uninstall: (pluginId: string) => Promise<boolean>;
  activate: (pluginId: string) => Promise<boolean>;
  deactivate: (pluginId: string) => Promise<boolean>;
  toggle: (pluginId: string) => Promise<boolean>;
  
  // Queries
  getPlugin: (pluginId: string) => Plugin | null;
  isActive: (pluginId: string) => boolean;
  hasPlugin: (pluginId: string) => boolean;
  
  // Refresh
  refresh: () => void;
}

export function usePlugins(): UsePluginsReturn {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manager = getPluginManagerService();
  const registry = getPluginRegistryService();

  // Load plugins on mount
  useEffect(() => {
    const loadPlugins = async () => {
      try {
        setLoading(true);
        await manager.initialize();
        setPlugins(manager.listPlugins());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando plugins');
      } finally {
        setLoading(false);
      }
    };

    loadPlugins();

    // Subscribe to changes
    const unsubscribe = registry.subscribe((updatedPlugins) => {
      setPlugins(updatedPlugins);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    setPlugins(manager.listPlugins());
  }, []);

  const installFromFile = useCallback(async (file: File): Promise<PluginInstallResult> => {
    setLoading(true);
    try {
      const result = await manager.installFromFile(file);
      if (result.success) {
        refresh();
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const installFromURL = useCallback(async (url: string): Promise<PluginInstallResult> => {
    setLoading(true);
    try {
      const result = await manager.installFromURL(url);
      if (result.success) {
        refresh();
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const uninstall = useCallback(async (pluginId: string): Promise<boolean> => {
    const result = await manager.uninstallPlugin(pluginId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const activate = useCallback(async (pluginId: string): Promise<boolean> => {
    const result = await manager.activatePlugin(pluginId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const deactivate = useCallback(async (pluginId: string): Promise<boolean> => {
    const result = await manager.deactivatePlugin(pluginId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const toggle = useCallback(async (pluginId: string): Promise<boolean> => {
    const result = await manager.togglePlugin(pluginId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const getPlugin = useCallback((pluginId: string): Plugin | null => {
    return manager.getPlugin(pluginId);
  }, []);

  const isActive = useCallback((pluginId: string): boolean => {
    const plugin = manager.getPlugin(pluginId);
    return plugin?.status === 'active';
  }, []);

  const hasPlugin = useCallback((pluginId: string): boolean => {
    return manager.getPlugin(pluginId) !== null;
  }, []);

  const activePlugins = plugins.filter(p => p.status === 'active');

  return {
    plugins,
    activePlugins,
    loading,
    error,
    installFromFile,
    installFromURL,
    uninstall,
    activate,
    deactivate,
    toggle,
    getPlugin,
    isActive,
    hasPlugin,
    refresh
  };
}
