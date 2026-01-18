/**
 * LazyComponentManager - Manages lazy loading of integration components
 * Implements Phase 3.3 of code-splitting optimization
 */

import { lazy, ComponentType } from 'react';
import { LazyLoadErrorHandler } from './LazyLoadErrorHandler';

export interface LazyComponentConfig {
  name: string;
  priority: 'high' | 'medium' | 'low';
  preload?: boolean;
  retryAttempts?: number;
  fallbackComponent?: ComponentType;
}

export class LazyComponentManager {
  private static instance: LazyComponentManager;
  private loadedComponents = new Map<string, ComponentType>();
  private loadingPromises = new Map<string, Promise<ComponentType>>();
  private errorHandler: LazyLoadErrorHandler;

  private constructor() {
    this.errorHandler = new LazyLoadErrorHandler();
  }

  public static getInstance(): LazyComponentManager {
    if (!LazyComponentManager.instance) {
      LazyComponentManager.instance = new LazyComponentManager();
    }
    return LazyComponentManager.instance;
  }

  /**
   * Create a lazy-loaded component with error handling and retry logic
   */
  public createLazyComponent<T = {}>(
    importFn: () => Promise<{ default: ComponentType<T> }>,
    config: LazyComponentConfig
  ): ComponentType<T> {
    const { name, retryAttempts = 3, fallbackComponent } = config;

    return lazy(async () => {
      // Check if already loaded
      if (this.loadedComponents.has(name)) {
        return { default: this.loadedComponents.get(name)! as ComponentType<T> };
      }

      // Check if currently loading
      if (this.loadingPromises.has(name)) {
        const component = await this.loadingPromises.get(name)!;
        return { default: component as ComponentType<T> };
      }

      // Start loading with retry logic
      const loadingPromise = this.loadWithRetry(importFn, retryAttempts, name);
      this.loadingPromises.set(name, loadingPromise as Promise<ComponentType>);

      try {
        const module = await loadingPromise;
        const component = module.default;
        
        // Cache the loaded component
        this.loadedComponents.set(name, component as ComponentType);
        this.loadingPromises.delete(name);
        
        return { default: component };
      } catch (error) {
        this.loadingPromises.delete(name);
        
        // Use fallback component if available
        if (fallbackComponent) {
          console.warn(`Failed to load ${name}, using fallback component`);
          return { default: fallbackComponent };
        }
        
        throw error;
      }
    });
  }

  /**
   * Preload a component without rendering it
   */
  public async preloadComponent(
    importFn: () => Promise<{ default: ComponentType }>,
    name: string
  ): Promise<void> {
    if (this.loadedComponents.has(name) || this.loadingPromises.has(name)) {
      return;
    }

    try {
      const loadingPromise = this.loadWithRetry(importFn, 2, name);
      this.loadingPromises.set(name, loadingPromise as Promise<ComponentType>);
      
      const module = await loadingPromise;
      this.loadedComponents.set(name, module.default as ComponentType);
      this.loadingPromises.delete(name);
      
      console.log(`Successfully preloaded component: ${name}`);
    } catch (error) {
      this.loadingPromises.delete(name);
      console.warn(`Failed to preload component ${name}:`, error);
    }
  }

  /**
   * Load component with retry logic
   */
  private async loadWithRetry<T>(
    importFn: () => Promise<{ default: ComponentType<T> }>,
    maxAttempts: number,
    componentName: string
  ): Promise<{ default: ComponentType<T> }> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const startTime = performance.now();
        const module = await importFn();
        const loadTime = performance.now() - startTime;

        // Report successful load
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'lazy_component_load', {
            component_name: componentName,
            load_time: loadTime,
            attempt: attempt
          });
        }

        console.log(`Loaded ${componentName} in ${loadTime.toFixed(2)}ms (attempt ${attempt})`);
        return module;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to load ${componentName} (attempt ${attempt}/${maxAttempts}):`, error);

        if (attempt < maxAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Report failure
    this.errorHandler.handleError(lastError!, componentName);
    throw lastError!;
  }

  /**
   * Get loading statistics
   */
  public getStats() {
    return {
      loadedComponents: this.loadedComponents.size,
      currentlyLoading: this.loadingPromises.size,
      componentNames: Array.from(this.loadedComponents.keys())
    };
  }

  /**
   * Clear cache (useful for development)
   */
  public clearCache(): void {
    this.loadedComponents.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const lazyComponentManager = LazyComponentManager.getInstance();