/**
 * useLazyComponents - React hook for lazy component management
 * Provides easy access to lazy-loaded components with performance optimization
 */

import { useEffect, useState, useCallback } from 'react';
import { ComponentType } from 'react';
import { 
  lazyComponentRegistry, 
  ComponentRegistryStats, 
  PreloadStrategy 
} from '../services/LazyComponentRegistry';

export interface UseLazyComponentsOptions {
  preloadStrategy?: PreloadStrategy;
  enablePerformanceMonitoring?: boolean;
  autoOptimizeForStreaming?: boolean;
}

export interface LazyComponentsState {
  stats: ComponentRegistryStats;
  isLoading: boolean;
  error: string | null;
  performanceReport: string | null;
}

export function useLazyComponents(options: UseLazyComponentsOptions = {}) {
  const [state, setState] = useState<LazyComponentsState>({
    stats: lazyComponentRegistry.getStats(),
    isLoading: false,
    error: null,
    performanceReport: null
  });

  // Initialize and preload components
  useEffect(() => {
    const initializeComponents = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Apply preload strategy if provided
        if (options.preloadStrategy) {
          await lazyComponentRegistry.preloadComponents(options.preloadStrategy);
        }

        // Auto-optimize for streaming if enabled
        if (options.autoOptimizeForStreaming) {
          await lazyComponentRegistry.optimizeForStreaming();
        }

        // Update stats
        const updatedStats = lazyComponentRegistry.getStats();
        setState(prev => ({ 
          ...prev, 
          stats: updatedStats, 
          isLoading: false 
        }));

      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false 
        }));
      }
    };

    initializeComponents();
  }, [options.preloadStrategy, options.autoOptimizeForStreaming]);

  // Performance monitoring
  useEffect(() => {
    if (!options.enablePerformanceMonitoring) return;

    const interval = setInterval(() => {
      const updatedStats = lazyComponentRegistry.getStats();
      setState(prev => ({ ...prev, stats: updatedStats }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [options.enablePerformanceMonitoring]);

  // Get component by category and name
  const getComponent = useCallback((
    category: 'integrations' | 'games' | 'overlays', 
    name: string
  ): ComponentType | undefined => {
    return lazyComponentRegistry.getComponent(category, name);
  }, []);

  // Get overlay component by type
  const getOverlay = useCallback((overlayType: string): ComponentType | undefined => {
    return lazyComponentRegistry.getOverlay(overlayType);
  }, []);

  // Get all components by category
  const getComponentsByCategory = useCallback((
    category: 'integrations' | 'games' | 'overlays'
  ) => {
    return lazyComponentRegistry.getComponentsByCategory(category);
  }, []);

  // Preload specific category
  const preloadCategory = useCallback(async (category: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await lazyComponentRegistry.preloadCategory(category);
      const updatedStats = lazyComponentRegistry.getStats();
      setState(prev => ({ 
        ...prev, 
        stats: updatedStats, 
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to preload category',
        isLoading: false 
      }));
    }
  }, []);

  // Generate performance report
  const generatePerformanceReport = useCallback(() => {
    const report = lazyComponentRegistry.generatePerformanceReport();
    setState(prev => ({ ...prev, performanceReport: report }));
    return report;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    lazyComponentRegistry.clearCache();
    const updatedStats = lazyComponentRegistry.getStats();
    setState(prev => ({ 
      ...prev, 
      stats: updatedStats,
      performanceReport: null 
    }));
  }, []);

  // Get available overlay types
  const getAvailableOverlayTypes = useCallback(() => {
    return lazyComponentRegistry.getAvailableOverlayTypes();
  }, []);

  // Check if overlay type exists
  const hasOverlayType = useCallback((overlayType: string) => {
    return lazyComponentRegistry.hasOverlayType(overlayType);
  }, []);

  // Get game categories
  const getGameCategories = useCallback(() => {
    return lazyComponentRegistry.getGameCategories();
  }, []);

  // Get overlay categories
  const getOverlayCategories = useCallback(() => {
    return lazyComponentRegistry.getOverlayCategories();
  }, []);

  return {
    // State
    ...state,
    
    // Component access methods
    getComponent,
    getOverlay,
    getComponentsByCategory,
    
    // Management methods
    preloadCategory,
    clearCache,
    
    // Utility methods
    getAvailableOverlayTypes,
    hasOverlayType,
    getGameCategories,
    getOverlayCategories,
    
    // Performance methods
    generatePerformanceReport,
    
    // Computed values
    loadingPercentage: (state.stats.loadedComponents / state.stats.totalComponents) * 100,
    isFullyLoaded: state.stats.loadedComponents === state.stats.totalComponents,
    memoryUsageMB: state.stats.memoryUsage 
      ? (state.stats.memoryUsage.used / 1024 / 1024).toFixed(2)
      : null
  };
}

// Specialized hooks for specific use cases

/**
 * Hook for overlay components (optimized for OBS)
 */
export function useOverlayComponents() {
  return useLazyComponents({
    preloadStrategy: {
      critical: true,
      category: 'critical'
    },
    enablePerformanceMonitoring: true,
    autoOptimizeForStreaming: true
  });
}

/**
 * Hook for game components
 */
export function useGameComponents() {
  return useLazyComponents({
    preloadStrategy: {
      popular: true,
      category: 'casino'
    },
    enablePerformanceMonitoring: true
  });
}

/**
 * Hook for integration components
 */
export function useIntegrationComponents() {
  return useLazyComponents({
    preloadStrategy: {
      critical: true,
      priority: 'high'
    }
  });
}

/**
 * Hook for development/debugging
 */
export function useLazyComponentsDebug() {
  const result = useLazyComponents({
    enablePerformanceMonitoring: true
  });

  // Auto-generate performance report in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const report = result.generatePerformanceReport();
      console.log('Lazy Components Performance Report:', report);
    }
  }, [result.stats.loadedComponents]);

  return result;
}