// useDashboardLayout - Hook for managing dashboard widget layout

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout, DashboardWidget, WidgetType, METRICS_STORAGE_KEYS } from '../types/metrics';
import { sessionStorageService } from '../src/application/services/SessionStorageService';

const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  widgets: [
    {
      id: 'viewers-chart',
      type: 'viewers_chart',
      position: { x: 0, y: 0 },
      size: { width: 2, height: 1 },
      config: {},
    },
    {
      id: 'chat-chart',
      type: 'chat_chart',
      position: { x: 2, y: 0 },
      size: { width: 2, height: 1 },
      config: {},
    },
    {
      id: 'summary-card',
      type: 'summary_card',
      position: { x: 0, y: 1 },
      size: { width: 1, height: 1 },
      config: {},
    },
    {
      id: 'insights-list',
      type: 'insights_list',
      position: { x: 1, y: 1 },
      size: { width: 1, height: 1 },
      config: {},
    },
  ],
  compactMode: false,
  autoRefresh: true,
  refreshInterval: 5000,
};

interface UseDashboardLayoutReturn {
  layout: DashboardLayout;
  isLoading: boolean;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  moveWidget: (id: string, position: { x: number; y: number }) => void;
  resizeWidget: (id: string, size: { width: number; height: number }) => void;
  toggleCompactMode: () => void;
  toggleAutoRefresh: () => void;
  setRefreshInterval: (interval: number) => void;
  resetLayout: () => void;
  saveLayout: () => Promise<void>;
}

export function useDashboardLayout(): UseDashboardLayoutReturn {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  // Load layout from storage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        // Try IndexedDB first
        const stored = await sessionStorageService.getLayout('default');
        if (stored) {
          setLayout(stored);
        } else {
          // Fallback to localStorage
          const localStored = localStorage.getItem(METRICS_STORAGE_KEYS.DASHBOARD_LAYOUT);
          if (localStored) {
            setLayout(JSON.parse(localStored));
          }
        }
      } catch {
        // Use default layout on error
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, []);

  // Save layout to storage
  const saveLayout = useCallback(async () => {
    try {
      await sessionStorageService.saveLayout(layout);
      localStorage.setItem(METRICS_STORAGE_KEYS.DASHBOARD_LAYOUT, JSON.stringify(layout));
    } catch {
      // Fallback to localStorage only
      localStorage.setItem(METRICS_STORAGE_KEYS.DASHBOARD_LAYOUT, JSON.stringify(layout));
    }
  }, [layout]);

  // Auto-save on layout changes
  useEffect(() => {
    if (!isLoading) {
      saveLayout();
    }
  }, [layout, isLoading, saveLayout]);

  // Add a new widget
  const addWidget = useCallback((type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type,
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      config: {},
    };

    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
  }, []);

  // Remove a widget
  const removeWidget = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== id),
    }));
  }, []);

  // Update widget properties
  const updateWidget = useCallback((id: string, updates: Partial<DashboardWidget>) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === id ? { ...w, ...updates } : w
      ),
    }));
  }, []);

  // Move a widget
  const moveWidget = useCallback((id: string, position: { x: number; y: number }) => {
    updateWidget(id, { position });
  }, [updateWidget]);

  // Resize a widget
  const resizeWidget = useCallback((id: string, size: { width: number; height: number }) => {
    updateWidget(id, { size });
  }, [updateWidget]);

  // Toggle compact mode
  const toggleCompactMode = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      compactMode: !prev.compactMode,
    }));
  }, []);

  // Toggle auto refresh
  const toggleAutoRefresh = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      autoRefresh: !prev.autoRefresh,
    }));
  }, []);

  // Set refresh interval
  const setRefreshInterval = useCallback((interval: number) => {
    setLayout(prev => ({
      ...prev,
      refreshInterval: interval,
    }));
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  return {
    layout,
    isLoading,
    addWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    resizeWidget,
    toggleCompactMode,
    toggleAutoRefresh,
    setRefreshInterval,
    resetLayout,
    saveLayout,
  };
}
