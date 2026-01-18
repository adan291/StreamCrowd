import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebVitalsMonitor } from '@/src/application/services/WebVitalsMonitor';

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFID: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

describe('WebVitalsMonitor', () => {
  let webVitalsMonitor: WebVitalsMonitor;

  beforeEach(() => {
    webVitalsMonitor = new WebVitalsMonitor();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(() => webVitalsMonitor.initialize()).not.toThrow();
    });

    it('should return initial empty metrics', () => {
      const metrics = webVitalsMonitor.getMetrics();
      
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
  });

  describe('performance checks', () => {
    it('should return empty array when no metrics are available', () => {
      const results = webVitalsMonitor.checkPerformance();
      expect(results).toEqual([]);
    });

    it('should return default thresholds', () => {
      const thresholds = webVitalsMonitor.getThresholds();
      
      expect(thresholds).toEqual({
        fcp: 1500,
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        ttfb: 800,
        bundleSize: 2 * 1024 * 1024 // 2MB
      });
    });
  });
});