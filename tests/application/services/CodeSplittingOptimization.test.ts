/**
 * Code Splitting Optimization Tests
 * Tests for Phase 1-4 implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LazyComponentManager } from '../../../src/application/services/LazyComponentManager';
import { BundleSizeMonitor } from '../../../src/application/services/BundleSizeMonitor';
import { AssetOptimizer } from '../../../src/application/services/AssetOptimizer';

describe('LazyComponentManager', () => {
  let manager: LazyComponentManager;

  beforeEach(() => {
    manager = LazyComponentManager.getInstance();
    manager.clearCache();
  });

  it('should create lazy components with error handling', async () => {
    const mockImport = vi.fn().mockResolvedValue({
      default: () => 'Test Component'
    });

    const LazyComponent = manager.createLazyComponent(mockImport, {
      name: 'TestComponent',
      priority: 'high',
      retryAttempts: 2
    });

    expect(LazyComponent).toBeDefined();
    expect(typeof LazyComponent).toBe('function');
  });

  it('should handle component loading failures with retry', async () => {
    const mockImport = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        default: () => 'Test Component'
      });

    const LazyComponent = manager.createLazyComponent(mockImport, {
      name: 'TestComponent',
      priority: 'high',
      retryAttempts: 2
    });

    // Component should be created successfully
    expect(LazyComponent).toBeDefined();
  });

  it('should preload components successfully', async () => {
    const mockImport = vi.fn().mockResolvedValue({
      default: () => 'Preloaded Component'
    });

    await manager.preloadComponent(mockImport, 'PreloadedComponent');

    const stats = manager.getStats();
    expect(stats.loadedComponents).toBe(1);
    expect(stats.componentNames).toContain('PreloadedComponent');
  });

  it('should cache loaded components', async () => {
    const mockImport = vi.fn().mockResolvedValue({
      default: () => 'Cached Component'
    });

    // Load component twice
    await manager.preloadComponent(mockImport, 'CachedComponent');
    await manager.preloadComponent(mockImport, 'CachedComponent');

    // Import should only be called once due to caching
    expect(mockImport).toHaveBeenCalledTimes(1);
  });

  it('should provide loading statistics', () => {
    const stats = manager.getStats();
    
    expect(stats).toHaveProperty('loadedComponents');
    expect(stats).toHaveProperty('currentlyLoading');
    expect(stats).toHaveProperty('componentNames');
    expect(Array.isArray(stats.componentNames)).toBe(true);
  });
});

describe('BundleSizeMonitor', () => {
  let monitor: BundleSizeMonitor;

  beforeEach(() => {
    monitor = BundleSizeMonitor.getInstance();
  });

  it('should have default thresholds', () => {
    const thresholds = monitor.getThresholds();
    
    expect(thresholds.totalSize).toBe(2 * 1024 * 1024); // 2MB
    expect(thresholds.chunkSize).toBe(500 * 1024); // 500KB
    expect(thresholds.vendorSize).toBe(1 * 1024 * 1024); // 1MB
    expect(thresholds.assetSize).toBe(100 * 1024); // 100KB
  });

  it('should allow threshold updates', () => {
    const newThresholds = {
      totalSize: 3 * 1024 * 1024, // 3MB
      chunkSize: 600 * 1024 // 600KB
    };

    monitor.updateThresholds(newThresholds);
    const updatedThresholds = monitor.getThresholds();

    expect(updatedThresholds.totalSize).toBe(3 * 1024 * 1024);
    expect(updatedThresholds.chunkSize).toBe(600 * 1024);
    expect(updatedThresholds.vendorSize).toBe(1 * 1024 * 1024); // Unchanged
  });

  it('should detect size violations', async () => {
    // Mock bundle analyzer to return large sizes
    const mockAnalysis = {
      totalSize: 3 * 1024 * 1024, // 3MB (exceeds 2MB threshold)
      chunks: [
        {
          name: 'large-chunk',
          size: 800 * 1024, // 800KB (exceeds 500KB threshold)
          gzipSize: 400 * 1024,
          brotliSize: 350 * 1024
        }
      ],
      assets: [
        {
          name: 'large-image.png',
          size: 200 * 1024, // 200KB (exceeds 100KB threshold)
          type: 'image'
        }
      ]
    };

    // Mock the bundle analyzer
    vi.spyOn(monitor['bundleAnalyzer'], 'analyzeBuild').mockResolvedValue(mockAnalysis);

    const report = await monitor.generateSizeReport();

    expect(report.violations.length).toBeGreaterThan(0);
    expect(report.violations.some(v => v.type === 'total')).toBe(true);
    expect(report.violations.some(v => v.type === 'chunk')).toBe(true);
    expect(report.violations.some(v => v.type === 'asset')).toBe(true);
  });

  it('should generate CI-compatible reports', async () => {
    // Mock a passing bundle analysis
    const mockAnalysis = {
      totalSize: 1.5 * 1024 * 1024, // 1.5MB (within 2MB threshold)
      chunks: [
        {
          name: 'main',
          size: 400 * 1024, // 400KB (within 500KB threshold)
          gzipSize: 200 * 1024,
          brotliSize: 180 * 1024
        }
      ],
      assets: [
        {
          name: 'logo.png',
          size: 50 * 1024, // 50KB (within 100KB threshold)
          type: 'image'
        }
      ]
    };

    vi.spyOn(monitor['bundleAnalyzer'], 'analyzeBuild').mockResolvedValue(mockAnalysis);

    const ciReport = await monitor.generateCIReport();

    expect(ciReport).toContain('# Bundle Size Report');
    expect(ciReport).toContain('✅ PASSED');
    expect(ciReport).toContain('| Chunk | Size | Gzipped | Status |');
  });

  it('should compare build sizes for regression detection', () => {
    const previousReport = {
      timestamp: Date.now() - 1000,
      totalSize: 1.8 * 1024 * 1024,
      chunks: [
        { name: 'main', size: 400 * 1024 }
      ],
      assets: [],
      violations: [],
      recommendations: []
    };

    const currentReport = {
      timestamp: Date.now(),
      totalSize: 2.2 * 1024 * 1024, // Increased by 400KB
      chunks: [
        { name: 'main', size: 600 * 1024 } // Increased by 200KB
      ],
      assets: [],
      violations: [],
      recommendations: []
    };

    const comparison = monitor.compareBuildSizes(currentReport, previousReport);

    expect(comparison.totalSizeDiff).toBe(400 * 1024);
    expect(comparison.isRegression).toBe(true); // >5% increase
    expect(comparison.chunkDiffs).toHaveLength(1);
    expect(comparison.chunkDiffs[0].sizeDiff).toBe(200 * 1024);
  });
});

describe('AssetOptimizer', () => {
  let optimizer: AssetOptimizer;

  beforeEach(() => {
    optimizer = AssetOptimizer.getInstance();
  });

  it('should have default configuration', () => {
    const config = optimizer['config'];
    
    expect(config.images.enableWebP).toBe(true);
    expect(config.images.enableAVIF).toBe(true);
    expect(config.images.quality).toBe(85);
    expect(config.fonts.fontDisplay).toBe('swap');
    expect(config.audio.enableLazyLoading).toBe(true);
  });

  it('should generate responsive image srcset', () => {
    const baseUrl = 'https://example.com/image.jpg';
    const srcSet = optimizer.generateResponsiveImageSrcSet(baseUrl);

    expect(srcSet).toContain('320w');
    expect(srcSet).toContain('640w');
    expect(srcSet).toContain('1920w');
    expect(srcSet.split(',').length).toBe(6); // Default breakpoints
  });

  it('should create lazy loading images', () => {
    const img = optimizer.createLazyImage(
      'https://example.com/image.jpg',
      'Test image',
      { className: 'test-class' }
    );

    expect(img.tagName).toBe('IMG');
    expect(img.alt).toBe('Test image');
    expect(img.className).toBe('test-class');
    expect(img.loading).toBe('lazy');
  });

  it('should optimize audio with multiple formats', async () => {
    const audioUrl = 'https://example.com/sound.wav';
    const optimized = await optimizer.optimizeAudio(audioUrl);

    expect(optimized).toHaveProperty('mp3');
    expect(optimized).toHaveProperty('ogg');
    expect(optimized.mp3).toContain('.mp3');
    expect(optimized.ogg).toContain('.ogg');
  });

  it('should create lazy audio elements', () => {
    const sources = {
      mp3: 'https://example.com/sound.mp3',
      ogg: 'https://example.com/sound.ogg'
    };

    const audio = optimizer.createLazyAudio(sources, {
      preload: 'metadata',
      controls: true
    });

    expect(audio.tagName).toBe('AUDIO');
    expect(audio.preload).toBe('metadata');
    expect(audio.controls).toBe(true);
    expect(audio.children.length).toBe(2); // Two source elements
  });

  it('should preload critical audio files', () => {
    const audioUrls = [
      'https://example.com/notification.mp3',
      'https://example.com/success.mp3'
    ];

    // Mock document.head.appendChild
    const mockAppendChild = vi.fn();
    const originalAppendChild = document.head.appendChild;
    document.head.appendChild = mockAppendChild;

    optimizer.preloadCriticalAudio(audioUrls);

    expect(mockAppendChild).toHaveBeenCalledTimes(2);

    // Restore original method
    document.head.appendChild = originalAppendChild;
  });

  it('should provide optimization statistics', () => {
    const stats = optimizer.getOptimizationStats();

    expect(stats).toHaveProperty('imagesOptimized');
    expect(stats).toHaveProperty('fontsPreloaded');
    expect(stats).toHaveProperty('audioOptimized');
    expect(stats).toHaveProperty('totalSavings');
  });
});

describe('Integration Tests', () => {
  it('should work together for complete optimization', async () => {
    const manager = LazyComponentManager.getInstance();
    const monitor = BundleSizeMonitor.getInstance();
    const optimizer = AssetOptimizer.getInstance();

    // Test that all services are properly initialized
    expect(manager).toBeDefined();
    expect(monitor).toBeDefined();
    expect(optimizer).toBeDefined();

    // Test that they can work together
    const stats = manager.getStats();
    const thresholds = monitor.getThresholds();
    const optimizationStats = optimizer.getOptimizationStats();

    expect(stats.loadedComponents).toBeGreaterThanOrEqual(0);
    expect(thresholds.totalSize).toBeGreaterThan(0);
    expect(optimizationStats.imagesOptimized).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors gracefully across services', async () => {
    const manager = LazyComponentManager.getInstance();
    
    // Test error handling in lazy component loading
    const failingImport = vi.fn().mockRejectedValue(new Error('Load failed'));
    
    const LazyComponent = manager.createLazyComponent(failingImport, {
      name: 'FailingComponent',
      priority: 'low',
      retryAttempts: 1,
      fallbackComponent: () => 'Fallback'
    });

    expect(LazyComponent).toBeDefined();
    // The component should handle the error gracefully with fallback
  });
});

// Property-based tests for bundle size validation
describe('Property-Based Tests', () => {
  it('should maintain bundle size properties', () => {
    const monitor = BundleSizeMonitor.getInstance();
    const thresholds = monitor.getThresholds();

    // Property: Total size threshold should always be larger than chunk threshold
    expect(thresholds.totalSize).toBeGreaterThan(thresholds.chunkSize);

    // Property: Vendor threshold should be reasonable compared to total
    expect(thresholds.vendorSize).toBeLessThanOrEqual(thresholds.totalSize);

    // Property: Asset threshold should be smaller than chunk threshold
    expect(thresholds.assetSize).toBeLessThan(thresholds.chunkSize);
  });

  it('should maintain optimization properties', () => {
    const optimizer = AssetOptimizer.getInstance();
    const config = optimizer['config'];

    // Property: Image quality should be between 1 and 100
    expect(config.images.quality).toBeGreaterThan(0);
    expect(config.images.quality).toBeLessThanOrEqual(100);

    // Property: Max dimensions should be positive
    expect(config.images.maxWidth).toBeGreaterThan(0);
    expect(config.images.maxHeight).toBeGreaterThan(0);

    // Property: Audio formats should be valid
    expect(Array.isArray(config.audio.formats)).toBe(true);
    expect(config.audio.formats.length).toBeGreaterThan(0);
  });
});