import React, { Suspense, useState, useEffect } from 'react';
import { useLazyLoadPerformance } from '../hooks/usePerformanceMonitor';
import { lazyLoadErrorHandler } from './LazyLoadErrorHandler';

interface LazyComponentWrapperProps {
  componentName: string;
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  children?: React.ReactNode;
  [key: string]: any; // Allow passing through other props
}

// Default loading component
const DefaultLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Default error component
const DefaultError: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="p-4 border border-red-300 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-medium">Component Load Error</h3>
    <p className="text-red-600 text-sm mt-1">
      Failed to load component: {error.message}
    </p>
    <button
      onClick={retry}
      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  componentName,
  loader,
  fallback: Fallback = DefaultLoader,
  errorFallback: ErrorFallback = DefaultError,
  children,
  ...props
}) => {
  const { reportLoadSuccess, reportLoadError } = useLazyLoadPerformance(componentName);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const loadComponent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();
      
      // Use the error handler for resilient loading
      const module = await lazyLoadErrorHandler.handleLazyLoadError(
        componentName,
        loader,
        new Error('Initial load')
      );
      
      const loadTime = performance.now() - startTime;
      
      setComponent(() => module.default);
      reportLoadSuccess();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Lazy loaded ${componentName} in ${loadTime.toFixed(2)}ms`);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      reportLoadError();
      
      console.error(`❌ Failed to load ${componentName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComponent();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    return <ErrorFallback error={error} retry={handleRetry} />;
  }

  if (loading || !Component) {
    return <Fallback />;
  }

  return <Component {...props}>{children}</Component>;
};

// Higher-order component factory for creating lazy components with performance tracking
export function createLazyComponent<P extends object>(
  componentName: string,
  loader: () => Promise<{ default: React.ComponentType<P> }>,
  options: {
    fallback?: React.ComponentType;
    errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  } = {}
): React.ComponentType<P> {
  const LazyComponent: React.ComponentType<P> = (props) => (
    <LazyComponentWrapper
      componentName={componentName}
      loader={loader}
      fallback={options.fallback}
      errorFallback={options.errorFallback}
      {...props}
    />
  );

  LazyComponent.displayName = `Lazy(${componentName})`;
  
  return LazyComponent;
}

// Utility for creating lazy components with Suspense boundary
export function createSuspenseLazyComponent<P extends object>(
  componentName: string,
  loader: () => Promise<{ default: React.ComponentType<P> }>,
  options: {
    fallback?: React.ReactNode;
    errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
  } = {}
): React.ComponentType<P> {
  const LazyComponent = React.lazy(async () => {
    const startTime = performance.now();
    
    try {
      const module = await loader();
      const loadTime = performance.now() - startTime;
      
      // Track performance
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'lazy_component_load', {
          component_name: componentName,
          load_time: loadTime,
          success: true
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Suspense lazy loaded ${componentName} in ${loadTime.toFixed(2)}ms`);
      }
      
      return module;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      
      // Track error
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'lazy_component_load', {
          component_name: componentName,
          load_time: loadTime,
          success: false
        });
      }
      
      console.error(`❌ Suspense failed to load ${componentName}:`, error);
      throw error;
    }
  });

  const WrappedComponent: React.ComponentType<P> = (props) => (
    <Suspense fallback={options.fallback || <DefaultLoader />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = `SuspenseLazy(${componentName})`;
  
  return WrappedComponent;
}

// Hook for preloading components
export function usePreloadComponent(
  componentName: string,
  loader: () => Promise<{ default: React.ComponentType<any> }>,
  shouldPreload: boolean = false
) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  const preload = async () => {
    if (isPreloaded || isPreloading) return;
    
    setIsPreloading(true);
    
    try {
      const startTime = performance.now();
      await loader();
      const loadTime = performance.now() - startTime;
      
      setIsPreloaded(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Preloaded ${componentName} in ${loadTime.toFixed(2)}ms`);
      }
      
      // Track preload performance
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'component_preload', {
          component_name: componentName,
          load_time: loadTime
        });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${componentName}:`, error);
    } finally {
      setIsPreloading(false);
    }
  };

  useEffect(() => {
    if (shouldPreload) {
      preload();
    }
  }, [shouldPreload]);

  return {
    preload,
    isPreloaded,
    isPreloading
  };
}