# Code Splitting and Overlay Optimization Design

## Architecture Overview

This design implements a comprehensive code splitting strategy for StreamCrowd, focusing on overlay performance optimization and bundle size reduction through intelligent lazy loading, strategic chunking, and performance monitoring.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    StreamCrowd Application                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Core Bundle   │  │  Overlay Router │  │ Performance  │ │
│  │   (Essential)   │  │   (Lazy Load)   │  │  Monitor     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Game Chunks    │  │  Vendor Chunks  │  │ Asset Loader │ │
│  │  (On-Demand)    │  │  (Shared Libs)  │  │ (Optimized)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Preload System  │  │  Cache Manager  │  │ Error Handler│ │
│  │ (Intelligent)   │  │  (Strategic)    │  │ (Resilient)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Bundle Strategy

#### Core Bundle (Critical Path)
- **Size Target**: <500KB gzipped
- **Contents**: Essential UI, routing, authentication
- **Loading**: Immediate on app start
- **Caching**: Long-term (1 year)

#### Overlay Chunks (Lazy Loaded)
- **Size Target**: <200KB per overlay
- **Contents**: Individual overlay components
- **Loading**: On-demand with preloading
- **Caching**: Medium-term (1 month)

#### Game Chunks (Dynamic Import)
- **Size Target**: <150KB per game
- **Contents**: Individual mini-games
- **Loading**: User-initiated
- **Caching**: Short-term (1 week)

#### Vendor Chunks (Shared Libraries)
- **Size Target**: Optimized per library
- **Contents**: React, Firebase, MediaPipe, etc.
- **Loading**: Strategic based on usage
- **Caching**: Long-term (1 year)

## Component Architecture

### 1. Overlay Router System

```typescript
// Core overlay routing with lazy loading
interface OverlayRouterConfig {
  routes: OverlayRoute[];
  preloadStrategy: PreloadStrategy;
  fallbackComponent: React.ComponentType;
  errorBoundary: React.ComponentType<ErrorBoundaryProps>;
}

interface OverlayRoute {
  path: string;
  component: () => Promise<{ default: React.ComponentType }>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

// Implementation
const OverlayRouter: React.FC<OverlayRouterConfig> = ({
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
              element={<LazyComponent loader={route.component} />}
            />
          ))}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};
```

### 2. Lazy Component Wrapper

```typescript
// Enhanced lazy loading with error handling and preloading
interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
}

const LazyComponent: React.FC<LazyComponentProps> = ({
  loader,
  fallback: Fallback = DefaultLoader,
  errorFallback: ErrorFallback = DefaultError,
  preload = false
}) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const loadComponent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const module = await loader();
      setComponent(() => module.default);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  // Preload if requested
  useEffect(() => {
    if (preload) {
      loadComponent();
    }
  }, [preload, loadComponent]);

  if (error) {
    return <ErrorFallback error={error} retry={loadComponent} />;
  }

  if (loading || !Component) {
    return <Fallback />;
  }

  return <Component />;
};
```

### 3. Preloading Strategy System

```typescript
// Intelligent preloading based on user behavior and context
interface PreloadStrategy {
  execute(routes: OverlayRoute[], updatePreloaded: (routes: Set<string>) => void): void;
}

class IntelligentPreloadStrategy implements PreloadStrategy {
  private userBehaviorAnalyzer: UserBehaviorAnalyzer;
  private networkDetector: NetworkDetector;
  private performanceMonitor: PerformanceMonitor;

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
        await route.component();
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
```

## Vite Configuration Optimization

### Enhanced Manual Chunks Strategy

```typescript
// vite.config.ts - Optimized chunking configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Vendor libraries - separate by usage patterns
          if (id.includes('node_modules')) {
            // Core React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            
            // State management
            if (id.includes('@reduxjs') || id.includes('redux')) {
              return 'state-management';
            }
            
            // Firebase - heavy but essential
            if (id.includes('firebase')) {
              return 'firebase';
            }
            
            // MediaPipe - very heavy, optional
            if (id.includes('@mediapipe')) {
              return 'mediapipe';
            }
            
            // Charts and visualization
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }
            
            // Socket.io and real-time
            if (id.includes('socket.io') || id.includes('tmi.js')) {
              return 'realtime';
            }
            
            // OBS integration
            if (id.includes('obs-websocket')) {
              return 'obs-integration';
            }
            
            // UI libraries
            if (id.includes('lucide') || id.includes('tailwind')) {
              return 'ui-libs';
            }
            
            // Other vendors
            return 'vendor';
          }
          
          // Game components - separate chunk per game
          if (id.includes('/games/')) {
            const gameMatch = id.match(/\/games\/([^\/]+)/);
            if (gameMatch) {
              return `game-${gameMatch[1]}`;
            }
          }
          
          // Overlay components - separate chunks
          if (id.includes('/overlays/') || id.includes('Overlay.tsx')) {
            const overlayMatch = id.match(/\/([^\/]+)Overlay/);
            if (overlayMatch) {
              return `overlay-${overlayMatch[1].toLowerCase()}`;
            }
            return 'overlays';
          }
          
          // Integration components
          if (id.includes('/integrations/')) {
            return 'integrations';
          }
          
          // Shared utilities
          if (id.includes('/utils/') || id.includes('/hooks/')) {
            return 'shared-utils';
          }
          
          // i18n system
          if (id.includes('/i18n/')) {
            return 'i18n';
          }
        },
        
        // Optimize chunk loading
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          
          return `assets/[name]-[hash].js`;
        },
        
        // Asset optimization
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext ?? '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          if (/woff2?|eot|ttf|otf/i.test(ext ?? '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Optimize build settings
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Source maps for production debugging
    sourcemap: 'hidden'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'socket.io-client'
    ],
    exclude: [
      '@mediapipe/tasks-vision' // Load on demand
    ]
  }
});
```

### Asset Optimization Pipeline

```typescript
// Asset optimization configuration
const assetOptimization = {
  images: {
    // WebP conversion for modern browsers
    webp: {
      quality: 80,
      effort: 6
    },
    
    // AVIF for cutting-edge browsers
    avif: {
      quality: 70,
      effort: 9
    },
    
    // Fallback optimization
    jpeg: {
      quality: 85,
      progressive: true
    },
    
    png: {
      compressionLevel: 9,
      adaptiveFiltering: true
    }
  },
  
  fonts: {
    // Subset fonts to reduce size
    subset: {
      text: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
      unicodeRange: 'U+0020-007F' // Basic Latin
    },
    
    // Preload critical fonts
    preload: [
      'Inter-Regular.woff2',
      'Inter-Medium.woff2'
    ]
  },
  
  audio: {
    // Compress audio files
    mp3: {
      bitrate: 128,
      quality: 2
    },
    
    // Modern format fallback
    ogg: {
      quality: 0.7
    }
  }
};
```

## Performance Monitoring System

### Web Vitals Integration

```typescript
// Performance monitoring with Web Vitals
interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  bundleSize: number;
  chunkLoadTime: Record<string, number>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    bundleSize: 0,
    chunkLoadTime: {}
  };

  initialize(): void {
    // Web Vitals measurement
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.onCLS.bind(this));
      getFID(this.onFID.bind(this));
      getFCP(this.onFCP.bind(this));
      getLCP(this.onLCP.bind(this));
      getTTFB(this.onTTFB.bind(this));
    });

    // Chunk loading performance
    this.monitorChunkLoading();
    
    // Bundle size tracking
    this.trackBundleSize();
  }

  private onCLS(metric: any): void {
    this.metrics.cls = metric.value;
    this.reportMetric('cls', metric.value);
  }

  private onFID(metric: any): void {
    this.metrics.fid = metric.value;
    this.reportMetric('fid', metric.value);
  }

  private onFCP(metric: any): void {
    this.metrics.fcp = metric.value;
    this.reportMetric('fcp', metric.value);
  }

  private onLCP(metric: any): void {
    this.metrics.lcp = metric.value;
    this.reportMetric('lcp', metric.value);
  }

  private onTTFB(metric: any): void {
    this.metrics.ttfb = metric.value;
    this.reportMetric('ttfb', metric.value);
  }

  private monitorChunkLoading(): void {
    // Monitor dynamic imports
    const originalImport = window.__webpack_require__ || window.import;
    
    if (originalImport) {
      window.import = async (specifier: string) => {
        const startTime = performance.now();
        try {
          const result = await originalImport(specifier);
          const loadTime = performance.now() - startTime;
          this.metrics.chunkLoadTime[specifier] = loadTime;
          this.reportMetric('chunk_load_time', loadTime, { chunk: specifier });
          return result;
        } catch (error) {
          this.reportError('chunk_load_error', error, { chunk: specifier });
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
  }

  private reportMetric(name: string, value: number, labels?: Record<string, string>): void {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        ...labels
      });
    }
    
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Metric - ${name}:`, value, labels);
    }
  }

  private reportError(name: string, error: Error, labels?: Record<string, string>): void {
    console.error(`Performance Error - ${name}:`, error, labels);
    
    // Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { type: 'performance_error', name },
        extra: labels
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}
```

### Bundle Analysis Integration

```typescript
// Bundle analysis and reporting
interface BundleAnalysis {
  totalSize: number;
  chunkSizes: Record<string, number>;
  duplicatedModules: string[];
  unusedExports: string[];
  recommendations: string[];
}

class BundleAnalyzer {
  async generateReport(): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunkSizes: {},
      duplicatedModules: [],
      unusedExports: [],
      recommendations: []
    };

    // Analyze chunk sizes
    const chunks = await this.getChunkInformation();
    analysis.chunkSizes = chunks.reduce((acc, chunk) => {
      acc[chunk.name] = chunk.size;
      analysis.totalSize += chunk.size;
      return acc;
    }, {} as Record<string, number>);

    // Detect duplicated modules
    analysis.duplicatedModules = await this.findDuplicatedModules(chunks);

    // Find unused exports
    analysis.unusedExports = await this.findUnusedExports();

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  private async getChunkInformation(): Promise<ChunkInfo[]> {
    // Implementation would integrate with Rollup/Vite build output
    // This is a simplified version
    return [];
  }

  private async findDuplicatedModules(chunks: ChunkInfo[]): Promise<string[]> {
    // Analyze chunks for duplicated modules
    const moduleOccurrences = new Map<string, number>();
    
    chunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleOccurrences.set(module, (moduleOccurrences.get(module) || 0) + 1);
      });
    });

    return Array.from(moduleOccurrences.entries())
      .filter(([_, count]) => count > 1)
      .map(([module, _]) => module);
  }

  private async findUnusedExports(): Promise<string[]> {
    // Static analysis to find unused exports
    // This would integrate with tools like ts-unused-exports
    return [];
  }

  private generateRecommendations(analysis: BundleAnalysis): string[] {
    const recommendations: string[] = [];

    // Size-based recommendations
    Object.entries(analysis.chunkSizes).forEach(([chunk, size]) => {
      if (size > 500 * 1024) { // 500KB
        recommendations.push(`Consider splitting ${chunk} chunk (${(size / 1024).toFixed(1)}KB)`);
      }
    });

    // Duplication recommendations
    if (analysis.duplicatedModules.length > 0) {
      recommendations.push(`Found ${analysis.duplicatedModules.length} duplicated modules - consider chunk optimization`);
    }

    // Unused exports recommendations
    if (analysis.unusedExports.length > 0) {
      recommendations.push(`Remove ${analysis.unusedExports.length} unused exports to reduce bundle size`);
    }

    return recommendations;
  }
}

interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
}
```

## Error Handling and Resilience

### Lazy Loading Error Recovery

```typescript
// Robust error handling for lazy loading failures
class LazyLoadErrorHandler {
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
      return this.getFallbackComponent(componentPath);
    }

    // Increment retry count
    this.retryAttempts.set(componentPath, attempts + 1);

    // Wait before retry
    await this.delay(this.retryDelay * Math.pow(2, attempts));

    try {
      const result = await loader();
      // Reset retry count on success
      this.retryAttempts.delete(componentPath);
      return result;
    } catch (retryError) {
      return this.handleLazyLoadError(componentPath, loader, retryError);
    }
  }

  private getFallbackComponent(componentPath: string): { default: React.ComponentType } {
    const FallbackComponent: React.FC = () => (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-medium">Component Load Error</h3>
        <p className="text-red-600 text-sm mt-1">
          Failed to load {componentPath}. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    );

    return { default: FallbackComponent };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Integration Points

### OBS Browser Source Optimization

```typescript
// OBS-specific optimizations
class OBSOptimizer {
  private isOBSEnvironment(): boolean {
    return window.navigator.userAgent.includes('OBS') || 
           window.obsstudio !== undefined;
  }

  applyOBSOptimizations(): void {
    if (!this.isOBSEnvironment()) return;

    // Disable animations that can cause performance issues
    document.documentElement.style.setProperty('--animation-duration', '0s');
    
    // Optimize rendering
    this.optimizeRendering();
    
    // Preload critical overlays
    this.preloadCriticalOverlays();
    
    // Monitor performance
    this.monitorOBSPerformance();
  }

  private optimizeRendering(): void {
    // Force hardware acceleration
    document.body.style.transform = 'translateZ(0)';
    
    // Optimize CSS for OBS
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .overlay-container {
        will-change: transform, opacity;
        backface-visibility: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  private preloadCriticalOverlays(): void {
    // Preload most commonly used overlays for OBS
    const criticalOverlays = [
      'poll-overlay',
      'giveaway-overlay',
      'timer-overlay'
    ];

    criticalOverlays.forEach(overlay => {
      import(`../overlays/${overlay}`).catch(error => {
        console.warn(`Failed to preload ${overlay}:`, error);
      });
    });
  }

  private monitorOBSPerformance(): void {
    // Monitor frame rate and memory usage specific to OBS
    let frameCount = 0;
    let lastTime = performance.now();

    const checkPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        if (fps < 30) {
          console.warn(`Low FPS detected in OBS: ${fps}`);
          this.triggerPerformanceOptimization();
        }
      }
      
      requestAnimationFrame(checkPerformance);
    };
    
    requestAnimationFrame(checkPerformance);
  }

  private triggerPerformanceOptimization(): void {
    // Reduce quality or disable non-essential features
    document.documentElement.classList.add('performance-mode');
  }
}
```

## Testing Strategy

### Performance Testing Framework

```typescript
// Performance testing utilities
interface PerformanceTest {
  name: string;
  target: number;
  measure: () => Promise<number>;
}

class PerformanceTestSuite {
  private tests: PerformanceTest[] = [
    {
      name: 'Bundle Size',
      target: 2 * 1024 * 1024, // 2MB target
      measure: this.measureBundleSize
    },
    {
      name: 'Overlay Load Time',
      target: 2000, // 2 seconds
      measure: this.measureOverlayLoadTime
    },
    {
      name: 'First Contentful Paint',
      target: 1500, // 1.5 seconds
      measure: this.measureFCP
    },
    {
      name: 'Time to Interactive',
      target: 3000, // 3 seconds
      measure: this.measureTTI
    }
  ];

  async runTests(): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    for (const test of this.tests) {
      try {
        const startTime = performance.now();
        const value = await test.measure();
        const duration = performance.now() - startTime;

        results.push({
          name: test.name,
          value,
          target: test.target,
          passed: value <= test.target,
          duration
        });
      } catch (error) {
        results.push({
          name: test.name,
          value: -1,
          target: test.target,
          passed: false,
          duration: 0,
          error: error.message
        });
      }
    }

    return results;
  }

  private async measureBundleSize(): Promise<number> {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter(r => r.name.includes('.js'))
      .reduce((sum, r) => sum + (r.transferSize || 0), 0);
  }

  private async measureOverlayLoadTime(): Promise<number> {
    const startTime = performance.now();
    
    // Simulate overlay loading
    await import('../overlays/PollOverlay');
    
    return performance.now() - startTime;
  }

  private async measureFCP(): Promise<number> {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          resolve(fcpEntry.startTime);
        }
      }).observe({ entryTypes: ['paint'] });
    });
  }

  private async measureTTI(): Promise<number> {
    // Simplified TTI measurement
    return new Promise(resolve => {
      const checkInteractive = () => {
        if (document.readyState === 'complete') {
          resolve(performance.now());
        } else {
          setTimeout(checkInteractive, 100);
        }
      };
      checkInteractive();
    });
  }
}

interface PerformanceTestResult {
  name: string;
  value: number;
  target: number;
  passed: boolean;
  duration: number;
  error?: string;
}
```

## Migration Strategy

### Gradual Implementation Plan

1. **Phase 1: Core Infrastructure**
   - Implement OverlayRouter with basic lazy loading
   - Set up performance monitoring
   - Configure enhanced Vite chunking

2. **Phase 2: Component Migration**
   - Convert overlay components to lazy loading
   - Implement game component chunking
   - Add error boundaries and fallbacks

3. **Phase 3: Optimization**
   - Implement intelligent preloading
   - Optimize asset loading
   - Fine-tune chunk sizes

4. **Phase 4: Monitoring & Refinement**
   - Deploy performance monitoring
   - Analyze real-world performance
   - Optimize based on data

### Rollback Strategy

- Feature flags for lazy loading components
- Ability to disable preloading
- Fallback to synchronous loading if needed
- Performance monitoring alerts for regressions

## Success Metrics

### Primary KPIs
- **Bundle Size**: <2MB total (60-80% reduction)
- **Overlay Load Time**: <2 seconds in OBS
- **First Contentful Paint**: <1.5 seconds
- **Vercel Deployment**: 100% success rate

### Secondary KPIs
- **Time to Interactive**: <3 seconds
- **Cumulative Layout Shift**: <0.1
- **Memory Usage**: <100MB per overlay
- **User Satisfaction**: Improved streaming experience

This design provides a comprehensive approach to code splitting and performance optimization while maintaining the existing functionality and architecture principles of StreamCrowd.