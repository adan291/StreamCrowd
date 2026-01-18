export interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
  loadTime?: number;
}

export interface BundleAnalysis {
  totalSize: number;
  chunkSizes: Record<string, number>;
  duplicatedModules: string[];
  unusedExports: string[];
  recommendations: string[];
  performanceImpact: {
    criticalChunks: string[];
    slowLoadingChunks: string[];
    oversizedChunks: string[];
  };
  chunks: Array<{
    name: string;
    size: number;
    gzipSize?: number;
    brotliSize?: number;
  }>;
  assets: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export class BundleAnalyzer {
  private static instance: BundleAnalyzer;
  private chunkLoadTimes = new Map<string, number>();
  private resourceTimings: PerformanceResourceTiming[] = [];

  private constructor() {}

  public static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer();
    }
    return BundleAnalyzer.instance;
  }

  async generateReport(): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunkSizes: {},
      duplicatedModules: [],
      unusedExports: [],
      recommendations: [],
      performanceImpact: {
        criticalChunks: [],
        slowLoadingChunks: [],
        oversizedChunks: []
      },
      chunks: [],
      assets: []
    };

    this.collectResourceTimings();
    const chunks = await this.getChunkInformation();
    
    analysis.chunkSizes = chunks.reduce((acc, chunk) => {
      acc[chunk.name] = chunk.size;
      analysis.totalSize += chunk.size;
      return acc;
    }, {} as Record<string, number>);

    // Map chunks to the expected format
    analysis.chunks = chunks.map(chunk => ({
      name: chunk.name,
      size: chunk.size,
      gzipSize: chunk.size * 0.7, // Estimate gzip size
      brotliSize: chunk.size * 0.65 // Estimate brotli size
    }));

    // Mock assets for now
    analysis.assets = [
      { name: 'favicon.ico', size: 15 * 1024, type: 'image' },
      { name: 'logo.png', size: 45 * 1024, type: 'image' }
    ];

    analysis.performanceImpact = this.analyzePerformanceImpact(chunks);
    analysis.duplicatedModules = await this.findDuplicatedModules(chunks);
    analysis.unusedExports = await this.findUnusedExports();
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze build for CI/CD monitoring
   */
  async analyzeBuild(): Promise<BundleAnalysis> {
    return this.generateReport();
  }

  /**
   * Find duplicate dependencies across chunks
   */
  findDuplicateDependencies(): string[] {
    const duplicates: string[] = [];
    const suspiciousPatterns = ['react', 'lodash', 'moment', 'axios', 'firebase'];
    
    const chunkNames = Array.from(this.chunkLoadTimes.keys());
    
    suspiciousPatterns.forEach(pattern => {
      const matchingChunks = chunkNames.filter(name => name.toLowerCase().includes(pattern));
      if (matchingChunks.length > 1) {
        duplicates.push(`${pattern} (found in: ${matchingChunks.join(', ')})`);
      }
    });

    return duplicates;
  }

  /**
   * Find unused exports (public method)
   */
  async findUnusedExports(): Promise<string[]> {
    const unused: string[] = [];
    const smallChunks = Array.from(this.chunkLoadTimes.entries())
      .filter(([_, loadTime]) => loadTime < 50)
      .map(([name]) => name);

    if (smallChunks.length > 0) {
      unused.push(`Small chunks that might contain unused code: ${smallChunks.join(', ')}`);
    }

    return unused;
  }

  private collectResourceTimings(): void {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return;
    }
    this.resourceTimings = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  }

  private async getChunkInformation(): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    const jsResources = this.resourceTimings.filter(resource => 
      resource.name.includes('.js') && 
      !resource.name.includes('node_modules') &&
      resource.name.includes('/assets/')
    );

    for (const resource of jsResources) {
      const chunkName = this.extractChunkName(resource.name);
      const loadTime = resource.responseEnd - resource.requestStart;
      
      chunks.push({
        name: chunkName,
        size: resource.transferSize || 0,
        modules: [],
        loadTime
      });

      this.chunkLoadTimes.set(chunkName, loadTime);
    }

    return chunks;
  }

  private extractChunkName(url: string): string {
    const match = url.match(/\/assets\/js\/([^-]+)/);
    if (match) {
      return match[1];
    }
    const filename = url.split('/').pop() || 'unknown';
    return filename.replace(/\.[^.]+$/, '');
  }

  private analyzePerformanceImpact(chunks: ChunkInfo[]): BundleAnalysis['performanceImpact'] {
    const impact = {
      criticalChunks: [] as string[],
      slowLoadingChunks: [] as string[],
      oversizedChunks: [] as string[]
    };

    chunks.forEach(chunk => {
      if (this.isCriticalChunk(chunk.name)) {
        impact.criticalChunks.push(chunk.name);
      }
      if (chunk.loadTime && chunk.loadTime > 2000) {
        impact.slowLoadingChunks.push(chunk.name);
      }
      if (chunk.size > 500 * 1024) {
        impact.oversizedChunks.push(chunk.name);
      }
    });

    return impact;
  }

  private isCriticalChunk(chunkName: string): boolean {
    const criticalPatterns = ['index', 'main', 'app', 'vendor', 'react-core', 'react-dom'];
    return criticalPatterns.some(pattern => chunkName.toLowerCase().includes(pattern));
  }

  private async findDuplicatedModules(chunks: ChunkInfo[]): Promise<string[]> {
    const duplicates: string[] = [];
    const chunkNames = chunks.map(c => c.name);
    const suspiciousPatterns = ['react', 'lodash', 'moment', 'axios', 'firebase'];

    suspiciousPatterns.forEach(pattern => {
      const matchingChunks = chunkNames.filter(name => name.toLowerCase().includes(pattern));
      if (matchingChunks.length > 1) {
        duplicates.push(`Potential ${pattern} duplication in: ${matchingChunks.join(', ')}`);
      }
    });

    return duplicates;
  }

  private generateRecommendations(analysis: BundleAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.totalSize > 5 * 1024 * 1024) {
      recommendations.push('Total bundle size is very large (>5MB). Consider more aggressive code splitting.');
    }

    Object.entries(analysis.chunkSizes).forEach(([chunk, size]) => {
      if (size > 1024 * 1024) {
        recommendations.push(`Chunk '${chunk}' is large (${this.formatSize(size)}). Consider splitting further.`);
      }
    });

    if (analysis.performanceImpact.slowLoadingChunks.length > 0) {
      recommendations.push(`Slow loading chunks detected: ${analysis.performanceImpact.slowLoadingChunks.join(', ')}.`);
    }

    return recommendations;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  startRealTimeMonitoring(): () => void {
    const observer = new PerformanceObserver((list: PerformanceObserverEntryList) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceEntry) => {
        if (entry.name.includes('.js') && entry.name.includes('/assets/')) {
          const chunkName = this.extractChunkName(entry.name);
          const loadTime = entry.duration;
          this.chunkLoadTimes.set(chunkName, loadTime);
          
          if (process.env.NODE_ENV === 'development' && loadTime > 1000) {
            console.warn(`🐌 Slow chunk load: ${chunkName} took ${loadTime.toFixed(2)}ms`);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    return () => observer.disconnect();
  }
}

export const bundleAnalyzer = BundleAnalyzer.getInstance();