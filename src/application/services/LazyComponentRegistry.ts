/**
 * LazyComponentRegistry - Master registry for all lazy-loaded components
 * Implements Phase 3.6: Unified Component Management
 * Coordinates all lazy loading services for optimal performance
 */

import { ComponentType } from 'react';
import { lazyComponentManager } from './LazyComponentManager';
import { LazyIntegrations, preloadCriticalIntegrations } from './LazyIntegrationComponents';
import { LazyGames, preloadPopularGames, GameCategories } from './LazyGameComponents';
import { LazyOverlays, preloadCriticalOverlays, OverlayCategories, createOverlayRouter } from './LazyOverlayComponents';

export interface ComponentRegistryStats {
  totalComponents: number;
  loadedComponents: number;
  currentlyLoading: number;
  categories: {
    integrations: number;
    games: number;
    overlays: number;
  };
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface PreloadStrategy {
  critical: boolean;
  popular: boolean;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

export class LazyComponentRegistry {
  private static instance: LazyComponentRegistry;
  private overlayRouter = createOverlayRouter();
  private preloadedCategories = new Set<string>();

  private constructor() {
    // Initialize performance monitoring
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): LazyComponentRegistry {
    if (!LazyComponentRegistry.instance) {
      LazyComponentRegistry.instance = new LazyComponentRegistry();
    }
    return LazyComponentRegistry.instance;
  }

  /**
   * Get component by category and name
   */
  public getComponent(category: 'integrations' | 'games' | 'overlays', name: string): ComponentType | undefined {
    switch (category) {
      case 'integrations':
        return LazyIntegrations[name as keyof typeof LazyIntegrations];
      case 'games':
        return LazyGames[name as keyof typeof LazyGames];
      case 'overlays':
        return LazyOverlays[name as keyof typeof LazyOverlays];
      default:
        return undefined;
    }
  }

  /**
   * Get overlay component by type (for URL routing)
   */
  public getOverlay(overlayType: string): ComponentType | undefined {
    return this.overlayRouter.getOverlay(overlayType);
  }

  /**
   * Get all available components by category
   */
  public getComponentsByCategory(category: 'integrations' | 'games' | 'overlays') {
    switch (category) {
      case 'integrations':
        return LazyIntegrations;
      case 'games':
        return LazyGames;
      case 'overlays':
        return LazyOverlays;
      default:
        return {};
    }
  }

  /**
   * Preload components based on strategy
   */
  public async preloadComponents(strategy: PreloadStrategy): Promise<void> {
    const promises: Promise<void>[] = [];

    if (strategy.critical) {
      promises.push(
        preloadCriticalIntegrations(),
        preloadCriticalOverlays()
      );
    }

    if (strategy.popular) {
      promises.push(preloadPopularGames());
    }

    if (strategy.category) {
      promises.push(this.preloadCategory(strategy.category));
    }

    try {
      await Promise.allSettled(promises);
      console.log('Component preloading completed with strategy:', strategy);
    } catch (error) {
      console.warn('Some components failed to preload:', error);
    }
  }

  /**
   * Preload entire category of components
   */
  public async preloadCategory(category: string): Promise<void> {
    if (this.preloadedCategories.has(category)) {
      console.log(`Category ${category} already preloaded`);
      return;
    }

    const gameCategory = GameCategories[category as keyof typeof GameCategories];
    const overlayCategory = OverlayCategories[category as keyof typeof OverlayCategories];

    const promises: Promise<void>[] = [];

    if (gameCategory) {
      gameCategory.forEach(componentName => {
        const component = LazyGames[componentName as keyof typeof LazyGames];
        if (component) {
          // Extract the import function from the lazy component
          promises.push(
            lazyComponentManager.preloadComponent(
              () => Promise.resolve({ default: component }),
              `game-${componentName}`
            )
          );
        }
      });
    }

    if (overlayCategory) {
      overlayCategory.forEach(componentName => {
        const component = LazyOverlays[componentName as keyof typeof LazyOverlays];
        if (component) {
          promises.push(
            lazyComponentManager.preloadComponent(
              () => Promise.resolve({ default: component }),
              `overlay-${componentName}`
            )
          );
        }
      });
    }

    try {
      await Promise.allSettled(promises);
      this.preloadedCategories.add(category);
      console.log(`Category ${category} preloaded successfully`);
    } catch (error) {
      console.warn(`Failed to preload category ${category}:`, error);
    }
  }

  /**
   * Get comprehensive registry statistics
   */
  public getStats(): ComponentRegistryStats {
    const managerStats = lazyComponentManager.getStats();
    
    const integrationCount = Object.keys(LazyIntegrations).length;
    const gameCount = Object.keys(LazyGames).length;
    const overlayCount = Object.keys(LazyOverlays).length;

    return {
      totalComponents: integrationCount + gameCount + overlayCount,
      loadedComponents: managerStats.loadedComponents,
      currentlyLoading: managerStats.currentlyLoading,
      categories: {
        integrations: integrationCount,
        games: gameCount,
        overlays: overlayCount
      },
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : undefined
    };
  }

  /**
   * Get available overlay types for routing
   */
  public getAvailableOverlayTypes(): string[] {
    return this.overlayRouter.getAllOverlays();
  }

  /**
   * Check if overlay type exists
   */
  public hasOverlayType(overlayType: string): boolean {
    return this.overlayRouter.hasOverlay(overlayType);
  }

  /**
   * Get game categories
   */
  public getGameCategories(): typeof GameCategories {
    return GameCategories;
  }

  /**
   * Get overlay categories
   */
  public getOverlayCategories(): typeof OverlayCategories {
    return OverlayCategories;
  }

  /**
   * Clear all component caches (useful for development)
   */
  public clearCache(): void {
    lazyComponentManager.clearCache();
    this.preloadedCategories.clear();
    console.log('Component registry cache cleared');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Monitor memory usage
      setInterval(() => {
        if (performance.memory) {
          const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
          if (memoryUsage > 100) { // Alert if over 100MB
            console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
          }
        }
      }, 30000); // Check every 30 seconds

      // Monitor component loading performance
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('lazy-component')) {
            console.log(`Lazy component loaded: ${entry.name} in ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    const stats = this.getStats();
    const loadingPercentage = ((stats.loadedComponents / stats.totalComponents) * 100).toFixed(1);
    
    let report = `# Lazy Component Registry Performance Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Component Statistics\n`;
    report += `- **Total Components:** ${stats.totalComponents}\n`;
    report += `- **Loaded Components:** ${stats.loadedComponents} (${loadingPercentage}%)\n`;
    report += `- **Currently Loading:** ${stats.currentlyLoading}\n\n`;
    
    report += `## Category Breakdown\n`;
    report += `- **Integrations:** ${stats.categories.integrations} components\n`;
    report += `- **Games:** ${stats.categories.games} components\n`;
    report += `- **Overlays:** ${stats.categories.overlays} components\n\n`;

    if (stats.memoryUsage) {
      const memoryUsedMB = (stats.memoryUsage.used / 1024 / 1024).toFixed(2);
      const memoryTotalMB = (stats.memoryUsage.total / 1024 / 1024).toFixed(2);
      const memoryLimitMB = (stats.memoryUsage.limit / 1024 / 1024).toFixed(2);
      
      report += `## Memory Usage\n`;
      report += `- **Used:** ${memoryUsedMB} MB\n`;
      report += `- **Total:** ${memoryTotalMB} MB\n`;
      report += `- **Limit:** ${memoryLimitMB} MB\n\n`;
    }

    report += `## Preloaded Categories\n`;
    if (this.preloadedCategories.size > 0) {
      Array.from(this.preloadedCategories).forEach(category => {
        report += `- ${category}\n`;
      });
    } else {
      report += `- None\n`;
    }

    return report;
  }

  /**
   * Optimize for streaming performance
   */
  public async optimizeForStreaming(): Promise<void> {
    console.log('Optimizing component registry for streaming performance...');

    // Preload critical components for streaming
    await this.preloadComponents({
      critical: true,
      popular: true,
      priority: 'high'
    });

    // Preload overlay-specific categories
    await Promise.allSettled([
      this.preloadCategory('critical'),
      this.preloadCategory('interactive'),
      this.preloadCategory('notifications')
    ]);

    console.log('Streaming optimization completed');
  }
}

// Singleton instance
export const lazyComponentRegistry = LazyComponentRegistry.getInstance();

// Convenience exports
export { LazyIntegrations, LazyGames, LazyOverlays, GameCategories, OverlayCategories };