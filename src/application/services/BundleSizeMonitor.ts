/**
 * BundleSizeMonitor - Monitors bundle size and performance metrics
 * Implements Task 1.1.4: Set up bundle size monitoring in CI/CD
 */

import { BundleAnalyzer } from './BundleAnalyzer';

export interface BundleSizeThresholds {
  totalSize: number; // Maximum total bundle size in bytes
  chunkSize: number; // Maximum individual chunk size in bytes
  vendorSize: number; // Maximum vendor chunk size in bytes
  assetSize: number; // Maximum asset size in bytes
}

export interface BundleSizeReport {
  timestamp: number;
  totalSize: number;
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
  violations: Array<{
    type: 'chunk' | 'total' | 'vendor' | 'asset';
    name: string;
    actualSize: number;
    threshold: number;
    severity: 'warning' | 'error';
  }>;
  recommendations: string[];
}

export class BundleSizeMonitor {
  private static instance: BundleSizeMonitor;
  private bundleAnalyzer: BundleAnalyzer;
  private thresholds: BundleSizeThresholds;

  // Default thresholds based on performance best practices
  private static readonly DEFAULT_THRESHOLDS: BundleSizeThresholds = {
    totalSize: 2 * 1024 * 1024, // 2MB total
    chunkSize: 500 * 1024, // 500KB per chunk
    vendorSize: 1 * 1024 * 1024, // 1MB for vendor chunks
    assetSize: 100 * 1024, // 100KB per asset
  };

  private constructor(thresholds?: Partial<BundleSizeThresholds>) {
    this.bundleAnalyzer = BundleAnalyzer.getInstance();
    this.thresholds = { ...BundleSizeMonitor.DEFAULT_THRESHOLDS, ...thresholds };
  }

  public static getInstance(thresholds?: Partial<BundleSizeThresholds>): BundleSizeMonitor {
    if (!BundleSizeMonitor.instance) {
      BundleSizeMonitor.instance = new BundleSizeMonitor(thresholds);
    }
    return BundleSizeMonitor.instance;
  }

  /**
   * Analyze current bundle and generate size report
   */
  public async generateSizeReport(): Promise<BundleSizeReport> {
    const analysis = await this.bundleAnalyzer.analyzeBuild();
    const violations: BundleSizeReport['violations'] = [];
    const recommendations: string[] = [];

    // Check total bundle size
    if (analysis.totalSize > this.thresholds.totalSize) {
      violations.push({
        type: 'total',
        name: 'Total Bundle',
        actualSize: analysis.totalSize,
        threshold: this.thresholds.totalSize,
        severity: 'error'
      });
      recommendations.push(
        `Total bundle size (${this.formatBytes(analysis.totalSize)}) exceeds threshold (${this.formatBytes(this.thresholds.totalSize)}). Consider code splitting or removing unused dependencies.`
      );
    }

    // Check individual chunk sizes
    analysis.chunks.forEach(chunk => {
      if (chunk.size > this.thresholds.chunkSize) {
        const severity = chunk.size > this.thresholds.chunkSize * 1.5 ? 'error' : 'warning';
        violations.push({
          type: 'chunk',
          name: chunk.name,
          actualSize: chunk.size,
          threshold: this.thresholds.chunkSize,
          severity
        });

        if (severity === 'error') {
          recommendations.push(
            `Chunk "${chunk.name}" (${this.formatBytes(chunk.size)}) is too large. Consider splitting it further or lazy loading components.`
          );
        }
      }

      // Special check for vendor chunks
      if (chunk.name.includes('vendor') && chunk.size > this.thresholds.vendorSize) {
        violations.push({
          type: 'vendor',
          name: chunk.name,
          actualSize: chunk.size,
          threshold: this.thresholds.vendorSize,
          severity: 'warning'
        });
        recommendations.push(
          `Vendor chunk "${chunk.name}" is large. Consider splitting vendor libraries into smaller chunks.`
        );
      }
    });

    // Check asset sizes
    analysis.assets.forEach(asset => {
      if (asset.size > this.thresholds.assetSize) {
        violations.push({
          type: 'asset',
          name: asset.name,
          actualSize: asset.size,
          threshold: this.thresholds.assetSize,
          severity: 'warning'
        });
        
        if (asset.type === 'image') {
          recommendations.push(
            `Image "${asset.name}" (${this.formatBytes(asset.size)}) should be optimized or converted to WebP/AVIF format.`
          );
        } else if (asset.type === 'font') {
          recommendations.push(
            `Font "${asset.name}" (${this.formatBytes(asset.size)}) should be subset or compressed.`
          );
        }
      }
    });

    // Generate additional recommendations based on analysis
    this.generateOptimizationRecommendations(analysis, recommendations);

    return {
      timestamp: Date.now(),
      totalSize: analysis.totalSize,
      chunks: analysis.chunks.map(chunk => ({
        name: chunk.name,
        size: chunk.size,
        gzipSize: chunk.gzipSize,
        brotliSize: chunk.brotliSize
      })),
      assets: analysis.assets,
      violations,
      recommendations
    };
  }

  /**
   * Check if bundle size is within acceptable limits
   */
  public async validateBundleSize(): Promise<{ passed: boolean; report: BundleSizeReport }> {
    const report = await this.generateSizeReport();
    const hasErrors = report.violations.some(v => v.severity === 'error');
    
    return {
      passed: !hasErrors,
      report
    };
  }

  /**
   * Generate CI/CD compatible report
   */
  public async generateCIReport(): Promise<string> {
    const { passed, report } = await this.validateBundleSize();
    
    let output = '# Bundle Size Report\n\n';
    
    // Summary
    output += `**Status:** ${passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    output += `**Total Size:** ${this.formatBytes(report.totalSize)}\n`;
    output += `**Timestamp:** ${new Date(report.timestamp).toISOString()}\n\n`;

    // Violations
    if (report.violations.length > 0) {
      output += '## ⚠️ Size Violations\n\n';
      report.violations.forEach(violation => {
        const emoji = violation.severity === 'error' ? '🚨' : '⚠️';
        output += `${emoji} **${violation.type.toUpperCase()}**: ${violation.name}\n`;
        output += `   - Actual: ${this.formatBytes(violation.actualSize)}\n`;
        output += `   - Threshold: ${this.formatBytes(violation.threshold)}\n`;
        output += `   - Severity: ${violation.severity}\n\n`;
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output += '## 💡 Optimization Recommendations\n\n';
      report.recommendations.forEach((rec, index) => {
        output += `${index + 1}. ${rec}\n`;
      });
      output += '\n';
    }

    // Chunk breakdown
    output += '## 📦 Chunk Breakdown\n\n';
    output += '| Chunk | Size | Gzipped | Status |\n';
    output += '|-------|------|---------|--------|\n';
    
    report.chunks.forEach(chunk => {
      const status = chunk.size > this.thresholds.chunkSize ? '⚠️' : '✅';
      const gzipSize = chunk.gzipSize ? this.formatBytes(chunk.gzipSize) : 'N/A';
      output += `| ${chunk.name} | ${this.formatBytes(chunk.size)} | ${gzipSize} | ${status} |\n`;
    });

    return output;
  }

  /**
   * Save report to file (for CI/CD artifacts)
   */
  public async saveReportToFile(filePath: string): Promise<void> {
    const report = await this.generateCIReport();
    
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      // Node.js environment (CI/CD)
      const fs = require('fs').promises;
      await fs.writeFile(filePath, report, 'utf8');
    } else {
      // Browser environment - use download
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Compare with previous build (for regression detection)
   */
  public compareBuildSizes(
    currentReport: BundleSizeReport,
    previousReport: BundleSizeReport
  ): {
    totalSizeDiff: number;
    chunkDiffs: Array<{
      name: string;
      sizeDiff: number;
      percentChange: number;
    }>;
    isRegression: boolean;
  } {
    const totalSizeDiff = currentReport.totalSize - previousReport.totalSize;
    const chunkDiffs: Array<{
      name: string;
      sizeDiff: number;
      percentChange: number;
    }> = [];

    // Compare chunks
    currentReport.chunks.forEach(currentChunk => {
      const previousChunk = previousReport.chunks.find(c => c.name === currentChunk.name);
      if (previousChunk) {
        const sizeDiff = currentChunk.size - previousChunk.size;
        const percentChange = (sizeDiff / previousChunk.size) * 100;
        
        chunkDiffs.push({
          name: currentChunk.name,
          sizeDiff,
          percentChange
        });
      }
    });

    // Consider it a regression if total size increased by more than 5%
    const isRegression = totalSizeDiff > 0 && 
      (totalSizeDiff / previousReport.totalSize) > 0.05;

    return {
      totalSizeDiff,
      chunkDiffs,
      isRegression
    };
  }

  /**
   * Generate optimization recommendations based on analysis
   */
  private generateOptimizationRecommendations(
    analysis: any,
    recommendations: string[]
  ): void {
    // Check for duplicate dependencies
    const duplicates = this.bundleAnalyzer.findDuplicateDependencies();
    if (duplicates.length > 0) {
      recommendations.push(
        `Found ${duplicates.length} duplicate dependencies. Consider using webpack-bundle-analyzer to identify and deduplicate them.`
      );
    }

    // Check for large vendor chunks
    const largeVendorChunks = analysis.chunks.filter(
      (chunk: any) => chunk.name.includes('vendor') && chunk.size > 800 * 1024
    );
    if (largeVendorChunks.length > 0) {
      recommendations.push(
        'Large vendor chunks detected. Consider splitting vendor libraries by usage frequency (React, UI libraries, utilities, etc.).'
      );
    }

    // Check for unused exports
    const unusedExports = this.bundleAnalyzer.findUnusedExports();
    if (unusedExports.length > 0) {
      recommendations.push(
        `Found ${unusedExports.length} potentially unused exports. Consider tree-shaking or removing unused code.`
      );
    }

    // MediaPipe specific recommendation
    const mediaPipeChunk = analysis.chunks.find((chunk: any) => 
      chunk.name.includes('mediapipe')
    );
    if (mediaPipeChunk && mediaPipeChunk.size > 500 * 1024) {
      recommendations.push(
        'MediaPipe chunk is large. Consider lazy loading AI features only when needed by users.'
      );
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Update thresholds
   */
  public updateThresholds(newThresholds: Partial<BundleSizeThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): BundleSizeThresholds {
    return { ...this.thresholds };
  }
}

// Export singleton instance
export const bundleSizeMonitor = BundleSizeMonitor.getInstance();