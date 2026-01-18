import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';

export interface OverlayRoute {
  path: string;
  component: () => Promise<{ default: React.ComponentType }>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
  name: string;
}

export interface PreloadStrategy {
  execute(routes: OverlayRoute[], updatePreloaded: (routes: Set<string>) => void): void;
}

export interface OverlayRouterConfig {
  routes: OverlayRoute[];
  preloadStrategy: PreloadStrategy;
  fallbackComponent: React.ComponentType;
  errorBoundary: React.ComponentType<ErrorBoundaryProps>;
}

interface ErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  name: string;
}

// Default loading component
const DefaultLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    <span className="ml-3 text-gray-600">Loading overlay...</span>
  </div>
);

// Default error component
const DefaultError: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="p-4 border border-red-300 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-medium">Overlay Load Error</h3>
    <p className="text-red-600 text-sm mt-1">
      Failed to load overlay: {error.message}
    </p>
    <button
      onClick={retry}
      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

// Enhanced lazy component wrapper with error handling and preloading
const LazyComponent: React.FC<LazyComponentProps> = ({
  loader,
  fallback: Fallback = DefaultLoader,
  errorFallback: ErrorFallback = DefaultError,
  preload = false,
  name
}) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const loadComponent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();
      const module = await loader();
      const loadTime = performance.now() - startTime;
      
      // Report loading performance
      if (process.env.NODE_ENV === 'development') {
        console.log(`Overlay ${name} loaded in ${loadTime.toFixed(2)}ms`);
      }
      
      // Send performance metric
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'overlay_load_time', {
          overlay_name: name,
          load_time: loadTime
        });
      }
      
      setComponent(() => module.default);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Report loading error
      console.error(`Failed to load overlay ${name}:`, error);
      
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: { type: 'overlay_load_error', overlay: name }
        });
      }
    } finally {
      setLoading(false);
    }
  }, [loader, name]);

  // Preload if requested
  useEffect(() => {
    if (preload) {
      loadComponent();
    }
  }, [preload, loadComponent]);

  // Load component when first rendered (if not preloaded)
  useEffect(() => {
    if (!preload && !Component && !loading && !error) {
      loadComponent();
    }
  }, [preload, Component, loading, error, loadComponent]);

  if (error) {
    return <ErrorFallback error={error} retry={loadComponent} />;
  }

  if (loading || !Component) {
    return <Fallback />;
  }

  return <Component />;
};

// Intelligent preloading strategy based on user behavior and context
export class IntelligentPreloadStrategy implements PreloadStrategy {
  private userBehaviorAnalyzer: UserBehaviorAnalyzer;
  private networkDetector: NetworkDetector;

  constructor() {
    this.userBehaviorAnalyzer = new UserBehaviorAnalyzer();
    this.networkDetector = new NetworkDetector();
  }

  execute(routes: OverlayRoute[], updatePreloaded: (routes: Set<string>) => void): void {
    // Analyze user patterns
    const predictions = this.userBehaviorAnalyzer.predictNextRoutes();
    
    // Check network conditions
    const networkInfo = this.networkDetector.getCurrentConditions();
    
    // Determine preload candidates
    const candidates = this.selectPreloadCandidates(routes, predictions, networkInfo);
    
    // Execute preloading
    this.preloadRoutes(candidates, updatePreloaded);
  }

  private selectPreloadCandidates(
    routes: OverlayRoute[],
    predictions: string[],
    networkInfo: NetworkInfo
  ): OverlayRoute[] {
    return routes.filter(route => {
      // High priority routes always preload
      if (route.priority === 'high') return true;
      
      // Predicted routes on good network
      if (predictions.includes(route.path) && networkInfo.effectiveType !== 'slow-2g') {
        return true;
      }
      
      // Small components on fast network
      if (networkInfo.effectiveType === '4g' && route.priority !== 'low') {
        return true;
      }
      
      return false;
    });
  }

  private async preloadRoutes(
    candidates: OverlayRoute[],
    updatePreloaded: (routes: Set<string>) => void
  ): Promise<void> {
    const preloadPromises = candidates.map(async route => {
      try {
        const startTime = performance.now();
        await route.component();
        const loadTime = performance.now() - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Preloaded ${route.name} in ${loadTime.toFixed(2)}ms`);
        }
        
        return route.path;
      } catch (error) {
        console.warn(`Failed to preload route ${route.path}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(preloadPromises);
    const successful = results
      .filter((result): result is PromiseFulfilledResult<string> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    updatePreloaded(new Set(successful));
  }
}

// User behavior analyzer for predictive preloading
class UserBehaviorAnalyzer {
  private routeHistory: string[] = [];
  private routeFrequency: Map<string, number> = new Map();

  predictNextRoutes(): string[] {
    // Simple prediction based on frequency and recent usage
    const recentRoutes = this.routeHistory.slice(-5);
    const frequentRoutes = Array.from(this.routeFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([route]) => route);

    return [...new Set([...recentRoutes, ...frequentRoutes])];
  }

  recordRouteVisit(route: string): void {
    this.routeHistory.push(route);
    this.routeFrequency.set(route, (this.routeFrequency.get(route) || 0) + 1);

    // Keep history manageable
    if (this.routeHistory.length > 50) {
      this.routeHistory = this.routeHistory.slice(-25);
    }
  }
}

// Network condition detector
interface NetworkInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
}

class NetworkDetector {
  getCurrentConditions(): NetworkInfo {
    // Use Network Information API if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100
      };
    }

    // Fallback to reasonable defaults
    return {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100
    };
  }
}

// Main Overlay Router component
export const OverlayRouter: React.FC<OverlayRouterConfig> = ({
  routes,
  preloadStrategy,
  fallbackComponent: Fallback,
  errorBoundary: ErrorBoundary
}) => {
  const [preloadedRoutes, setPreloadedRoutes] = useState<Set<string>>(new Set());

  // Intelligent preloading based on user behavior
  useEffect(() => {
    preloadStrategy.execute(routes, setPreloadedRoutes);
  }, [routes, preloadStrategy]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {routes.map(route => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <LazyComponent 
                  loader={route.component} 
                  preload={preloadedRoutes.has(route.path)}
                  name={route.name}
                />
              }
            />
          ))}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

// Utility function to create overlay routes with lazy loading
export function createOverlayRoute(
  path: string,
  name: string,
  componentImport: () => Promise<{ default: React.ComponentType }>,
  options: {
    priority?: 'high' | 'medium' | 'low';
    preload?: boolean;
    dependencies?: string[];
  } = {}
): OverlayRoute {
  return {
    path,
    name,
    component: componentImport,
    priority: options.priority || 'medium',
    preload: options.preload || false,
    dependencies: options.dependencies || []
  };
}