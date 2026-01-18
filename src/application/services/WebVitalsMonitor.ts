import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  bundleSize: number;
  chunkLoadTime: Record<string, number>;
}

export interface PerformanceThresholds {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  bundleSize: number;
}

export class WebVitalsMonitor {
  private metrics: PerformanceMetrics = {
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    bundleSize: 0,
    chunkLoadTime: {}
  };

  private thresholds: PerformanceThresholds = {
    fcp: 1500, // 1.5 seconds
    lcp: 2500, // 2.5 seconds
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 800, // 800ms
    bundleSize: 2 * 1024 * 1024 // 2MB
  };

  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];

  initialize(): void {
    // Web Vitals measurement
    onCLS(this.onCLS.bind(this));
    onFID(this.onFID.bind(this));
    onFCP(this.onFCP.bind(this));
    onLCP(this.onLCP.bind(this));
    onTTFB(this.onTTFB.bind(this));

    // Chunk loading performance
    this.monitorChunkLoading();
    
    // Bundle size tracking
    this.trackBundleSize();

    // Monitor navigation performance
    this.monitorNavigation();
  }

  private onCLS(metric: any): void {
    this.metrics.cls = metric.value;
    this.reportMetric('cls', metric.value);
    this.notifyListeners();
  }

  private onFID(metric: any): void {
    this.metrics.fid = metric.value;
    this.reportMetric('fid', metric.value);
    this.notifyListeners();
  }

  private onFCP(metric: any): void {
    this.metrics.fcp = metric.value;
    this.reportMetric('fcp', metric.value);
    this.notifyListeners();
  }

  private onLCP(metric: any): void {
    this.metrics.lcp = metric.value;
    this.reportMetric('lcp', metric.value);
    this.notifyListeners();
  }

  private onTTFB(metric: any): void {
    this.metrics.ttfb = metric.value;
    this.reportMetric('ttfb', metric.value);
    this.notifyListeners();
  }

  private monitorChunkLoading(): void {
    // Monitor dynamic imports
    const originalImport = (window as any).import;
    
    if (originalImport) {
      (window as any).import = async (specifier: string) => {
        const startTime = performance.now();
        try {
          const result = await originalImport(specifier);
          const loadTime = performance.now() - startTime;
          this.metrics.chunkLoadTime[specifier] = loadTime;
          this.reportMetric('chunk_load_time', loadTime, { chunk: specifier });
          this.notifyListeners();
          return result;
        } catch (error) {
          this.reportError('chunk_load_error', error as Error, { chunk: specifier });
          throw error;
        }
      };
    }
  }

  private trackBundleSize(): void {
    // Calculate total bundle size from loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && !resource.name.includes('node_modules')
    );
    
    const totalSize = jsResources.reduce((sum, resource) => {
      return sum + (resource.transferSize || 0);
    }, 0);
    
    this.metrics.bundleSize = totalSize;
    this.reportMetric('bundle_size', totalSize);
    this.notifyListeners();
  }

  private monitorNavigation(): void {
    // Monitor page navigation performance
    window.addEventListener('beforeunload', () => {
      this.reportNavigationMetrics();
    });
  }

  private reportNavigationMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const metrics = {
        dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp_connect: navigation.connectEnd - navigation.connectStart,
        request_response: navigation.responseEnd - navigation.requestStart,
        dom_processing: navigation.domContentLoadedEventEnd - navigation.responseEnd,
        load_complete: navigation.loadEventEnd - navigation.loadEventStart
      };

      Object.entries(metrics).forEach(([name, value]) => {
        this.reportMetric(`navigation_${name}`, value);
      });
    }
  }

  private reportMetric(name: string, value: number, labels?: Record<string, string>): void {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        ...labels
      });
    }
    
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const threshold = this.getThreshold(name);
      const status = threshold && value > threshold ? '⚠️ SLOW' : '✅ GOOD';
      console.log(`Performance Metric - ${name}: ${value.toFixed(2)}ms ${status}`, labels);
    }
  }

  private getThreshold(metricName: string): number | undefined {
    const thresholdMap: Record<string, keyof PerformanceThresholds> = {
      'fcp': 'fcp',
      'lcp': 'lcp',
      'fid': 'fid',
      'cls': 'cls',
      'ttfb': 'ttfb',
      'bundle_size': 'bundleSize'
    };

    const thresholdKey = thresholdMap[metricName];
    return thresholdKey ? this.thresholds[thresholdKey] : undefined;
  }

  private reportError(name: string, error: Error, labels?: Record<string, string>): void {
    console.error(`Performance Error - ${name}:`, error, labels);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { type: 'performance_error', name },
        extra: labels
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.metrics });
      } catch (error) {
        console.error('Error notifying performance listener:', error);
      }
    });
  }

  public subscribe(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  public checkPerformance(): { metric: string; value: number; threshold: number; passed: boolean }[] {
    const results = [];
    
    if (this.metrics.fcp > 0) {
      results.push({
        metric: 'First Contentful Paint',
        value: this.metrics.fcp,
        threshold: this.thresholds.fcp,
        passed: this.metrics.fcp <= this.thresholds.fcp
      });
    }

    if (this.metrics.lcp > 0) {
      results.push({
        metric: 'Largest Contentful Paint',
        value: this.metrics.lcp,
        threshold: this.thresholds.lcp,
        passed: this.metrics.lcp <= this.thresholds.lcp
      });
    }

    if (this.metrics.fid > 0) {
      results.push({
        metric: 'First Input Delay',
        value: this.metrics.fid,
        threshold: this.thresholds.fid,
        passed: this.metrics.fid <= this.thresholds.fid
      });
    }

    if (this.metrics.cls > 0) {
      results.push({
        metric: 'Cumulative Layout Shift',
        value: this.metrics.cls,
        threshold: this.thresholds.cls,
        passed: this.metrics.cls <= this.thresholds.cls
      });
    }

    if (this.metrics.bundleSize > 0) {
      results.push({
        metric: 'Bundle Size',
        value: this.metrics.bundleSize,
        threshold: this.thresholds.bundleSize,
        passed: this.metrics.bundleSize <= this.thresholds.bundleSize
      });
    }

    return results;
  }
}

// Singleton instance
export const webVitalsMonitor = new WebVitalsMonitor();