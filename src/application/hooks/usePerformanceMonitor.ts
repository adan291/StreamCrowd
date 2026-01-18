import { useEffect, useState, useCallback } from 'react';
import { webVitalsMonitor, type PerformanceMetrics } from '../services/WebVitalsMonitor';

export interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  reportInterval?: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  thresholds: ReturnType<typeof webVitalsMonitor.getThresholds>;
  performance: ReturnType<typeof webVitalsMonitor.checkPerformance>;
  bundleSizeFormatted: string;
  isPerformanceGood: boolean;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { enabled = true, reportInterval = 5000 } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>(webVitalsMonitor.getMetrics());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize performance monitoring
  useEffect(() => {
    if (!enabled || isInitialized) return;

    webVitalsMonitor.initialize();
    setIsInitialized(true);
  }, [enabled, isInitialized]);

  // Subscribe to metrics updates
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = webVitalsMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    return unsubscribe;
  }, [enabled]);

  // Periodic metrics update
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setMetrics(webVitalsMonitor.getMetrics());
    }, reportInterval);

    return () => clearInterval(interval);
  }, [enabled, reportInterval]);

  // Format bundle size for display
  const formatBundleSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  // Generate performance report
  const generateReport = useCallback((): PerformanceReport => {
    const thresholds = webVitalsMonitor.getThresholds();
    const performance = webVitalsMonitor.checkPerformance();
    const bundleSizeFormatted = formatBundleSize(metrics.bundleSize);
    
    // Check if overall performance is good (all metrics pass)
    const isPerformanceGood = performance.length === 0 || performance.every(p => p.passed);

    return {
      metrics,
      thresholds,
      performance,
      bundleSizeFormatted,
      isPerformanceGood
    };
  }, [metrics, formatBundleSize]);

  // Update thresholds
  const updateThresholds = useCallback((newThresholds: Parameters<typeof webVitalsMonitor.updateThresholds>[0]) => {
    webVitalsMonitor.updateThresholds(newThresholds);
  }, []);

  // Track custom performance metric
  const trackCustomMetric = useCallback((name: string, value: number, labels?: Record<string, string>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'custom_performance_metric', {
        metric_name: name,
        metric_value: value,
        ...labels
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Custom Performance Metric - ${name}:`, value, labels);
    }
  }, []);

  // Track component render time
  const trackComponentRender = useCallback((componentName: string, renderTime: number) => {
    trackCustomMetric('component_render_time', renderTime, { component: componentName });
  }, [trackCustomMetric]);

  // Track lazy loading performance
  const trackLazyLoad = useCallback((componentName: string, loadTime: number, success: boolean) => {
    trackCustomMetric('lazy_load_time', loadTime, { 
      component: componentName,
      success: success.toString()
    });
  }, [trackCustomMetric]);

  return {
    metrics,
    isInitialized,
    generateReport,
    updateThresholds,
    trackCustomMetric,
    trackComponentRender,
    trackLazyLoad,
    formatBundleSize
  };
}

// Hook for tracking component render performance
export function useRenderPerformance(componentName: string) {
  const { trackComponentRender } = usePerformanceMonitor();
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      trackComponentRender(componentName, renderTime);
    };
  }, [componentName, trackComponentRender]);
}

// Hook for tracking lazy component loading
export function useLazyLoadPerformance(componentName: string) {
  const { trackLazyLoad } = usePerformanceMonitor();
  const [loadStartTime] = useState(() => performance.now());
  
  const reportLoadSuccess = useCallback(() => {
    const loadTime = performance.now() - loadStartTime;
    trackLazyLoad(componentName, loadTime, true);
  }, [componentName, loadStartTime, trackLazyLoad]);
  
  const reportLoadError = useCallback(() => {
    const loadTime = performance.now() - loadStartTime;
    trackLazyLoad(componentName, loadTime, false);
  }, [componentName, loadStartTime, trackLazyLoad]);
  
  return {
    reportLoadSuccess,
    reportLoadError
  };
}