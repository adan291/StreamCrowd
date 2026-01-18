import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebVitalsMonitor } from '../../../src/application/services/WebVitalsMonitor';

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFID: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  getEntriesByType: vi.fn(() => []),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    gtag: vi.fn(),
    Sentry: {
      captureException: vi.fn(),
    },
    navigator: {
      userAgent: 'test',
    },
    import: vi.fn(),
  },
  writable: true,
});

describe('WebVitalsMonitor', () => {
  let monitor: WebVitalsMonitor;

  beforeEach(() => {
    monitor = new WebVitalsMonitor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default metrics', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics).toEqual({
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        ttfb: 0,
        bundleSize: 0,
        chunkLoadTime: {}
      });
    });

    it('should initialize with default thresholds', () => {
      const thresholds = monitor.getThresholds();
      
      expect(thresholds).toEqual({
        fcp: 1500,
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        ttfb: 800,
        bundleSize: 2 * 1024 * 1024
      });
    });
  });

  describe('metrics subscription', () => {
    it('should allow subscribing to metrics updates', () => {
      const callback = vi.fn();
      const unsubscribe = monitor.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Simulate a metric update
      monitor['notifyListeners']();
      
      expect(callback).toHaveBeenCalledWith(monitor.getMetrics());
    });

    it('should allow unsubscribing from metrics updates', () => {
      const callback = vi.fn();
      const unsubscribe = monitor.subscribe(callback);
      
      unsubscribe();
      
      // Simulate a metric update
      monitor['notifyListeners']();
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in listener callbacks gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();
      
      monitor.subscribe(errorCallback);
      monitor.subscribe(normalCallback);
      
      // Should not throw
      expect(() => monitor['notifyListeners']()).not.toThrow();
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('threshold management', () => {
    it('should allow updating thresholds', () => {
      const newThresholds = {
        fcp: 2000,
        lcp: 3000,
      };
      
      monitor.updateThresholds(newThresholds);
      
      const thresholds = monitor.getThresholds();
      expect(thresholds.fcp).toBe(2000);
      expect(thresholds.lcp).toBe(3000);
      expect(thresholds.fid).toBe(100); // Should remain unchanged
    });
  });

  describe('performance checking', () => {
    it('should return empty array when no metrics are available', () => {
      const results = monitor.checkPerformance();
      expect(results).toEqual([]);
    });

    it('should check performance against thresholds', () => {
      // Simulate some metrics
      monitor['metrics'].fcp = 2000; // Above threshold (1500)
      monitor['metrics'].lcp = 2000; // Below threshold (2500)
      
      const results = monitor.checkPerformance();
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        metric: 'First Contentful Paint',
        value: 2000,
        threshold: 1500,
        passed: false
      });
      expect(results[1]).toEqual({
        metric: 'Largest Contentful Paint',
        value: 2000,
        threshold: 2500,
        passed: true
      });
    });
  });

  describe('bundle size tracking', () => {
    it('should calculate bundle size from performance resources', () => {
      const mockResources = [
        { name: 'app.js', transferSize: 1000 },
        { name: 'vendor.js', transferSize: 2000 },
        { name: 'style.css', transferSize: 500 }, // Should be ignored
        { name: 'node_modules/lib.js', transferSize: 1500 }, // Should be ignored
      ];
      
      mockPerformance.getEntriesByType.mockReturnValue(mockResources);
      
      monitor['trackBundleSize']();
      
      const metrics = monitor.getMetrics();
      expect(metrics.bundleSize).toBe(3000); // Only app.js + vendor.js
    });
  });

  describe('error handling', () => {
    it('should handle missing performance API gracefully', () => {
      // Temporarily remove performance API
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      expect(() => monitor['trackBundleSize']()).not.toThrow();
      
      // Restore performance API
      global.performance = originalPerformance;
    });

    it('should handle missing window object gracefully', () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(() => monitor['reportMetric']('test', 100)).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('development mode', () => {
    it('should log metrics in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Set development mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      monitor['reportMetric']('test_metric', 100);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Metric - test_metric:'),
        expect.any(String),
        undefined
      );
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not log metrics in production mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Set production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      monitor['reportMetric']('test_metric', 100);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('analytics integration', () => {
    it('should send metrics to gtag when available', () => {
      const gtagSpy = vi.fn();
      (global.window as any).gtag = gtagSpy;
      
      monitor['reportMetric']('test_metric', 100, { label: 'test' });
      
      expect(gtagSpy).toHaveBeenCalledWith('event', 'performance_metric', {
        metric_name: 'test_metric',
        metric_value: 100,
        label: 'test'
      });
    });

    it('should send errors to Sentry when available', () => {
      const sentrySpy = vi.fn();
      (global.window as any).Sentry = { captureException: sentrySpy };
      
      const testError = new Error('Test error');
      monitor['reportError']('test_error', testError, { context: 'test' });
      
      expect(sentrySpy).toHaveBeenCalledWith(testError, {
        tags: { type: 'performance_error', name: 'test_error' },
        extra: { context: 'test' }
      });
    });
  });
});