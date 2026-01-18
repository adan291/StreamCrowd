import React from 'react';

export class LazyLoadErrorHandler {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 1000;

  async handleLazyLoadError(
    componentPath: string,
    loader: () => Promise<any>,
    error: Error
  ): Promise<any> {
    const attempts = this.retryAttempts.get(componentPath) || 0;
    
    if (attempts >= this.maxRetries) {
      // Fallback to error component
      console.error(`Failed to load component ${componentPath} after ${attempts} attempts:`, error);
      
      // Report to error tracking
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: { 
            type: 'lazy_load_failure', 
            component: componentPath,
            attempts: attempts
          }
        });
      }
      
      return this.getFallbackComponent(componentPath);
    }

    // Increment retry count
    this.retryAttempts.set(componentPath, attempts + 1);

    // Wait before retry with exponential backoff
    await this.delay(this.retryDelay * Math.pow(2, attempts));

    try {
      const result = await loader();
      // Reset retry count on success
      this.retryAttempts.delete(componentPath);
      
      // Log successful retry
      if (process.env.NODE_ENV === 'development') {
        console.log(`Successfully loaded ${componentPath} after ${attempts + 1} attempts`);
      }
      
      return result;
    } catch (retryError) {
      return this.handleLazyLoadError(componentPath, loader, retryError as Error);
    }
  }

  private getFallbackComponent(componentPath: string): { default: React.ComponentType } {
    const FallbackComponent: React.FC = () => React.createElement('div', {
      className: "p-4 border border-red-300 rounded-lg bg-red-50"
    }, [
      React.createElement('h3', {
        key: 'title',
        className: "text-red-800 font-medium"
      }, 'Component Load Error'),
      React.createElement('p', {
        key: 'message',
        className: "text-red-600 text-sm mt-1"
      }, `Failed to load ${componentPath}. Please refresh the page.`),
      React.createElement('button', {
        key: 'refresh',
        onClick: () => window.location.reload(),
        className: "mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      }, 'Refresh Page')
    ]);

    return { default: FallbackComponent };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear retry attempts for a component (useful for manual retries)
  clearRetryAttempts(componentPath: string): void {
    this.retryAttempts.delete(componentPath);
  }

  // Get current retry count for a component
  getRetryCount(componentPath: string): number {
    return this.retryAttempts.get(componentPath) || 0;
  }

  // Update retry configuration
  updateConfig(config: { maxRetries?: number; retryDelay?: number }): void {
    if (config.maxRetries !== undefined) {
      this.maxRetries = config.maxRetries;
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay;
    }
  }

  // Get current configuration
  getConfig(): { maxRetries: number; retryDelay: number } {
    return {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay
    };
  }
}

// Singleton instance
export const lazyLoadErrorHandler = new LazyLoadErrorHandler();

// Higher-order component for wrapping lazy components with error handling
export function withLazyErrorHandling<P extends object>(
  componentPath: string,
  loader: () => Promise<{ default: React.ComponentType<P> }>
): () => Promise<{ default: React.ComponentType<P> }> {
  return async () => {
    try {
      return await loader();
    } catch (error) {
      return await lazyLoadErrorHandler.handleLazyLoadError(
        componentPath,
        loader,
        error as Error
      );
    }
  };
}

// Utility function to create resilient lazy components
export function createResilientLazy<P extends object>(
  componentPath: string,
  loader: () => Promise<{ default: React.ComponentType<P> }>
): React.LazyExoticComponent<React.ComponentType<P>> {
  const resilientLoader = withLazyErrorHandling(componentPath, loader);
  return React.lazy(resilientLoader);
}

// Performance tracking for lazy loading
export class LazyLoadPerformanceTracker {
  private loadTimes = new Map<string, number[]>();

  trackLoadTime(componentPath: string, loadTime: number): void {
    const times = this.loadTimes.get(componentPath) || [];
    times.push(loadTime);
    
    // Keep only last 10 load times
    if (times.length > 10) {
      times.shift();
    }
    
    this.loadTimes.set(componentPath, times);

    // Report performance metrics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'lazy_load_performance', {
        component: componentPath,
        load_time: loadTime,
        average_load_time: this.getAverageLoadTime(componentPath)
      });
    }

    // Log slow loading components
    if (loadTime > 2000 && process.env.NODE_ENV === 'development') {
      console.warn(`Slow lazy loading detected for ${componentPath}: ${loadTime.toFixed(2)}ms`);
    }
  }

  getAverageLoadTime(componentPath: string): number {
    const times = this.loadTimes.get(componentPath) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getLoadTimeStats(componentPath: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } {
    const times = this.loadTimes.get(componentPath) || [];
    
    if (times.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      count: times.length
    };
  }

  getAllStats(): Record<string, ReturnType<typeof this.getLoadTimeStats>> {
    const stats: Record<string, ReturnType<typeof this.getLoadTimeStats>> = {};
    
    for (const [componentPath] of this.loadTimes) {
      stats[componentPath] = this.getLoadTimeStats(componentPath);
    }
    
    return stats;
  }
}

// Singleton performance tracker
export const lazyLoadPerformanceTracker = new LazyLoadPerformanceTracker();