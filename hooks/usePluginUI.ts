// Hook para componentes UI de plugins
import { useState, useEffect, useCallback } from 'react';
import { PanelConfig, OverlayConfig } from '../types/plugins';
import { getPluginManagerService } from '../src/plugins/services/PluginManagerService';
import { getPluginHostService } from '../src/plugins/services/PluginHostService';
import { getPluginRegistryService } from '../src/plugins/services/PluginRegistryService';

export interface PluginPanel {
  pluginId: string;
  id: string;
  title: string;
  icon?: string;
  position?: 'left' | 'right' | 'bottom';
}

export interface PluginOverlay {
  pluginId: string;
  id: string;
  zIndex?: number;
}

export interface UsePluginUIReturn {
  panels: PluginPanel[];
  overlays: PluginOverlay[];
  loading: boolean;
  
  // Panel actions
  getPanelsByPosition: (position: 'left' | 'right' | 'bottom') => PluginPanel[];
  isPanelVisible: (pluginId: string, panelId: string) => boolean;
  
  // Overlay actions
  getActiveOverlays: () => PluginOverlay[];
  
  // Toast/notifications
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  
  // Refresh
  refresh: () => void;
}

export function usePluginUI(): UsePluginUIReturn {
  const [panels, setPanels] = useState<PluginPanel[]>([]);
  const [overlays, setOverlays] = useState<PluginOverlay[]>([]);
  const [loading, setLoading] = useState(true);

  const manager = getPluginManagerService();
  const host = getPluginHostService();
  const registry = getPluginRegistryService();

  const loadUI = useCallback(() => {
    try {
      setLoading(true);
      
      // Get registered panels
      const registeredPanels = manager.getRegisteredPanels();
      setPanels(registeredPanels.map(p => ({
        pluginId: p.pluginId,
        id: p.id,
        title: p.title,
        position: 'right' as const
      })));
      
      // Get registered overlays
      const registeredOverlays = manager.getRegisteredOverlays();
      setOverlays(registeredOverlays.map(o => ({
        pluginId: o.pluginId,
        id: o.id
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load UI on mount
  useEffect(() => {
    loadUI();

    // Subscribe to plugin changes
    const unsubscribe = registry.subscribe(() => {
      loadUI();
    });

    return () => {
      unsubscribe();
    };
  }, [loadUI]);

  const refresh = useCallback(() => {
    loadUI();
  }, [loadUI]);

  const getPanelsByPosition = useCallback((position: 'left' | 'right' | 'bottom'): PluginPanel[] => {
    return panels.filter(p => p.position === position);
  }, [panels]);

  const isPanelVisible = useCallback((pluginId: string, panelId: string): boolean => {
    const plugin = manager.getPlugin(pluginId);
    if (!plugin || plugin.status !== 'active') return false;
    return panels.some(p => p.pluginId === pluginId && p.id === panelId);
  }, [panels]);

  const getActiveOverlays = useCallback((): PluginOverlay[] => {
    return overlays.filter(o => {
      const plugin = manager.getPlugin(o.pluginId);
      return plugin?.status === 'active';
    });
  }, [overlays]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void => {
    // Emit toast event for the app to handle
    manager.broadcastEvent('ui:toast', { message, type, timestamp: Date.now() });
  }, []);

  return {
    panels,
    overlays,
    loading,
    getPanelsByPosition,
    isPanelVisible,
    getActiveOverlays,
    showToast,
    refresh
  };
}

// Hook for rendering a specific plugin panel
export function usePluginPanel(pluginId: string, panelId: string): {
  isVisible: boolean;
  config: PanelConfig | null;
} {
  const { isPanelVisible } = usePluginUI();
  const host = getPluginHostService();

  const isVisible = isPanelVisible(pluginId, panelId);
  
  // Get panel config from host
  const registeredPanels = host.getRegisteredPanels();
  const pluginPanels = registeredPanels.get(pluginId);
  const config = pluginPanels?.get(panelId) || null;

  return { isVisible, config };
}

// Hook for rendering a specific plugin overlay
export function usePluginOverlay(pluginId: string, overlayId: string): {
  isActive: boolean;
  config: OverlayConfig | null;
} {
  const manager = getPluginManagerService();
  const host = getPluginHostService();

  const plugin = manager.getPlugin(pluginId);
  const isActive = plugin?.status === 'active';
  
  // Get overlay config from host
  const registeredOverlays = host.getRegisteredOverlays();
  const pluginOverlays = registeredOverlays.get(pluginId);
  const config = pluginOverlays?.get(overlayId) || null;

  return { isActive, config };
}
