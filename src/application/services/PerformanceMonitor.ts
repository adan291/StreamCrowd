/**
 * PerformanceMonitor - Overlay sync performance monitoring service
 * 
 * This service monitors overlay synchronization performance including latency tracking,
 * error rate monitoring, connection status, and diagnostic report generation.
 * 
 * This is different from WebVitalsMonitor which tracks web performance metrics.
 */

import {
  SyncError,
  SyncErrorType,
} from '@/src/domain/errors/OverlaySyncErrors';

export interface PerformanceConfig {
  maxLatencySamples?: number;
  errorRateWindowMs?: number;
  connectionStabilityWindowMs?: number;
  autoDetectIssues?: boolean;
  thresholds?: {
    highLatencyMs?: number;
    criticalLatencyMs?: number;
    highErrorRate?: number;
    criticalErrorRate?: number;
    lowConnectionStability?: number;
    criticalConnectionStability?: number;
  };
}

export interface LatencyRecord {
  operation: string;
  latency: number;
  timestamp: number;
}

export interface ErrorRecord {
  operation: string;
  error: SyncError;
  timestamp: number;
}

export interface ConnectionStatusRecord {
  status: string;
  timestamp: number;
}

export interface PerformanceIssue {
  type: PerformanceIssueType;
  severity: PerformanceIssueSeverity;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
}

export enum PerformanceIssueType {
  HIGH_LATENCY = 'high_latency',
  HIGH_ERROR_RATE = 'high_error_rate',
  CONNECTION_INSTABILITY = 'connection_instability',
  TIMEOUT_FREQUENCY = 'timeout_frequency',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

export enum PerformanceIssueSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface DiagnosticReport {
  generatedAt: number;
  overallHealth: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  summary: {
    averageLatency: number;
    errorRate: number;
    connectionStability: number;
  };
  latencyStats: {
    samples: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
  };
  errorStats: {
    totalOperations: number;
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<SyncErrorType, number>;
  };
  connectionStats: {
    currentStatus: string;
    stabilityPercentage: number;
    disconnectionCount: number;
  };
  issues: PerformanceIssue[];
  recommendations: string[];
}

const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  maxLatencySamples: 1000,
  errorRateWindowMs: 300000, // 5 minutes
  connectionStabilityWindowMs: 600000, // 10 minutes
  autoDetectIssues: true,
  thresholds: {
    highLatencyMs: 200,
    criticalLatencyMs: 500,
    highErrorRate: 10,
    criticalErrorRate: 25,
    lowConnectionStability: 90,
    criticalConnectionStability: 70,
  },
};

export class PerformanceMonitor {
  private config: Required<PerformanceConfig>;
  private latencyRecords: LatencyRecord[] = [];
  private errorRecords: ErrorRecord[] = [];
  private connectionRecords: ConnectionStatusRecord[] = [];
  private disposed = false;

  constructor(config: PerformanceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (config.thresholds) {
      this.config.thresholds = { ...DEFAULT_CONFIG.thresholds, ...config.thresholds };
    }
  }

  /**
   * Record sync operation latency
   */
  recordSyncLatency(operation: string, latency: number): void {
    if (this.disposed || !this.isValidLatency(latency)) {
      return;
    }

    const record: LatencyRecord = {
      operation,
      latency,
      timestamp: Date.now(),
    };

    this.latencyRecords.push(record);

    // Maintain sample size limit
    if (this.latencyRecords.length > this.config.maxLatencySamples) {
      this.latencyRecords.shift();
    }
  }

  /**
   * Record sync operation error
   */
  recordSyncError(operation: string, error: SyncError): void {
    if (this.disposed) {
      return;
    }

    const record: ErrorRecord = {
      operation,
      error,
      timestamp: Date.now(),
    };

    this.errorRecords.push(record);
    this.cleanupOldRecords();
  }

  /**
   * Record connection status change
   */
  recordConnectionStatusChange(status: string): void {
    if (this.disposed) {
      return;
    }

    const record: ConnectionStatusRecord = {
      status,
      timestamp: Date.now(),
    };

    this.connectionRecords.push(record);
    this.cleanupOldRecords();
  }

  /**
   * Get average latency for a time window
   */
  getAverageLatency(timeWindowMs?: number): number {
    const records = this.getRecentLatencyRecords(timeWindowMs);
    if (records.length === 0) return 0;

    const sum = records.reduce((acc, record) => acc + record.latency, 0);
    return sum / records.length;
  }

  /**
   * Get error rate for a time window
   */
  getErrorRate(timeWindowMs?: number): number {
    const windowMs = timeWindowMs || this.config.errorRateWindowMs;
    const cutoff = Date.now() - windowMs;

    const recentErrors = this.errorRecords.filter(record => record.timestamp >= cutoff);
    const recentLatencies = this.latencyRecords.filter(record => record.timestamp >= cutoff);
    
    const totalOperations = recentErrors.length + recentLatencies.length;
    if (totalOperations === 0) return 0;

    return (recentErrors.length / totalOperations) * 100;
  }

  /**
   * Detect performance issues
   */
  detectPerformanceIssues(): PerformanceIssue[] {
    if (!this.config.autoDetectIssues) return [];

    const issues: PerformanceIssue[] = [];
    const now = Date.now();

    // Check latency issues
    const avgLatency = this.getAverageLatency();
    if (avgLatency > this.config.thresholds.criticalLatencyMs) {
      issues.push({
        type: PerformanceIssueType.HIGH_LATENCY,
        severity: PerformanceIssueSeverity.CRITICAL,
        message: `Critical latency detected: ${avgLatency.toFixed(1)}ms`,
        currentValue: avgLatency,
        threshold: this.config.thresholds.criticalLatencyMs,
        timestamp: now,
      });
    } else if (avgLatency > this.config.thresholds.highLatencyMs) {
      issues.push({
        type: PerformanceIssueType.HIGH_LATENCY,
        severity: PerformanceIssueSeverity.WARNING,
        message: `High latency detected: ${avgLatency.toFixed(1)}ms`,
        currentValue: avgLatency,
        threshold: this.config.thresholds.highLatencyMs,
        timestamp: now,
      });
    }

    // Check error rate issues
    const errorRate = this.getErrorRate();
    if (errorRate > this.config.thresholds.criticalErrorRate) {
      issues.push({
        type: PerformanceIssueType.HIGH_ERROR_RATE,
        severity: PerformanceIssueSeverity.CRITICAL,
        message: `Critical error rate: ${errorRate.toFixed(1)}%`,
        currentValue: errorRate,
        threshold: this.config.thresholds.criticalErrorRate,
        timestamp: now,
      });
    } else if (errorRate > this.config.thresholds.highErrorRate) {
      issues.push({
        type: PerformanceIssueType.HIGH_ERROR_RATE,
        severity: PerformanceIssueSeverity.WARNING,
        message: `High error rate: ${errorRate.toFixed(1)}%`,
        currentValue: errorRate,
        threshold: this.config.thresholds.highErrorRate,
        timestamp: now,
      });
    }

    // Check connection stability
    const stability = this.calculateConnectionStability();
    if (stability < this.config.thresholds.criticalConnectionStability) {
      issues.push({
        type: PerformanceIssueType.CONNECTION_INSTABILITY,
        severity: PerformanceIssueSeverity.CRITICAL,
        message: `Critical connection instability: ${stability.toFixed(1)}%`,
        currentValue: stability,
        threshold: this.config.thresholds.criticalConnectionStability,
        timestamp: now,
      });
    } else if (stability < this.config.thresholds.lowConnectionStability) {
      issues.push({
        type: PerformanceIssueType.CONNECTION_INSTABILITY,
        severity: PerformanceIssueSeverity.WARNING,
        message: `Low connection stability: ${stability.toFixed(1)}%`,
        currentValue: stability,
        threshold: this.config.thresholds.lowConnectionStability,
        timestamp: now,
      });
    }

    return issues;
  }

  /**
   * Generate comprehensive diagnostic report
   */
  generateDiagnosticReport(): DiagnosticReport {
    const now = Date.now();
    const latencyStats = this.calculateLatencyStats();
    const errorStats = this.calculateErrorStats();
    const connectionStats = this.calculateConnectionStats();
    const issues = this.detectPerformanceIssues();

    const overallHealth = this.determineOverallHealth(issues, latencyStats, errorStats, connectionStats);
    const recommendations = this.generateRecommendations(issues, latencyStats, errorStats, connectionStats);

    return {
      generatedAt: now,
      overallHealth,
      summary: {
        averageLatency: latencyStats.average,
        errorRate: errorStats.errorRate,
        connectionStability: connectionStats.stabilityPercentage,
      },
      latencyStats,
      errorStats,
      connectionStats,
      issues,
      recommendations,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<PerformanceConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...newConfig.thresholds };
    }
  }

  /**
   * Reset all metrics and history
   */
  resetMetrics(): void {
    this.latencyRecords = [];
    this.errorRecords = [];
    this.connectionRecords = [];
  }

  /**
   * Dispose of the monitor
   */
  dispose(): void {
    this.disposed = true;
    this.resetMetrics();
  }

  private isValidLatency(latency: number): boolean {
    return typeof latency === 'number' && 
           !isNaN(latency) && 
           isFinite(latency) && 
           latency >= 0;
  }

  private getRecentLatencyRecords(timeWindowMs?: number): LatencyRecord[] {
    if (!timeWindowMs) return this.latencyRecords;

    const cutoff = Date.now() - timeWindowMs;
    return this.latencyRecords.filter(record => record.timestamp >= cutoff);
  }

  private cleanupOldRecords(): void {
    const now = Date.now();
    const errorCutoff = now - this.config.errorRateWindowMs;
    const connectionCutoff = now - this.config.connectionStabilityWindowMs;

    this.errorRecords = this.errorRecords.filter(record => record.timestamp >= errorCutoff);
    this.connectionRecords = this.connectionRecords.filter(record => record.timestamp >= connectionCutoff);
  }

  private calculateLatencyStats() {
    const records = this.latencyRecords;
    if (records.length === 0) {
      return {
        samples: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
      };
    }

    const latencies = records.map(r => r.latency).sort((a, b) => a - b);
    const sum = latencies.reduce((acc, val) => acc + val, 0);

    return {
      samples: records.length,
      average: sum / records.length,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      p50: this.calculatePercentile(latencies, 50),
      p95: this.calculatePercentile(latencies, 95),
    };
  }

  private calculateErrorStats() {
    const windowMs = this.config.errorRateWindowMs;
    const cutoff = Date.now() - windowMs;

    const recentErrors = this.errorRecords.filter(record => record.timestamp >= cutoff);
    const recentLatencies = this.latencyRecords.filter(record => record.timestamp >= cutoff);
    
    const totalOperations = recentErrors.length + recentLatencies.length;
    const errorRate = totalOperations > 0 ? (recentErrors.length / totalOperations) * 100 : 0;

    const errorsByType: Record<SyncErrorType, number> = {} as Record<SyncErrorType, number>;
    Object.values(SyncErrorType).forEach(type => {
      errorsByType[type] = 0;
    });

    recentErrors.forEach(record => {
      errorsByType[record.error.type]++;
    });

    return {
      totalOperations,
      totalErrors: recentErrors.length,
      errorRate,
      errorsByType,
    };
  }

  private calculateConnectionStats() {
    if (this.connectionRecords.length === 0) {
      return {
        currentStatus: 'unknown',
        stabilityPercentage: 100,
        disconnectionCount: 0,
      };
    }

    const currentStatus = this.connectionRecords[this.connectionRecords.length - 1].status;
    const stability = this.calculateConnectionStability();
    
    const disconnectionCount = this.connectionRecords.filter(
      record => record.status === 'disconnected'
    ).length;

    return {
      currentStatus,
      stabilityPercentage: stability,
      disconnectionCount,
    };
  }

  private calculateConnectionStability(): number {
    const windowMs = this.config.connectionStabilityWindowMs;
    const cutoff = Date.now() - windowMs;
    const recentRecords = this.connectionRecords.filter(record => record.timestamp >= cutoff);

    if (recentRecords.length === 0) return 100;

    let connectedTime = 0;
    let lastTimestamp = cutoff;
    let lastStatus = 'connected'; // Assume connected at start of window

    for (const record of recentRecords) {
      if (lastStatus === 'connected') {
        connectedTime += record.timestamp - lastTimestamp;
      }
      lastTimestamp = record.timestamp;
      lastStatus = record.status;
    }

    // Account for time from last record to now
    const now = Date.now();
    if (lastStatus === 'connected') {
      connectedTime += now - lastTimestamp;
    }

    return (connectedTime / windowMs) * 100;
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private determineOverallHealth(
    issues: PerformanceIssue[],
    latencyStats: any,
    errorStats: any,
    connectionStats: any
  ): 'healthy' | 'degraded' | 'unhealthy' | 'critical' {
    const criticalIssues = issues.filter(issue => issue.severity === PerformanceIssueSeverity.CRITICAL);
    const warningIssues = issues.filter(issue => issue.severity === PerformanceIssueSeverity.WARNING);

    if (criticalIssues.length > 0) return 'critical';
    if (warningIssues.length > 2) return 'unhealthy';
    if (warningIssues.length > 0) return 'degraded';
    return 'healthy';
  }

  private generateRecommendations(
    issues: PerformanceIssue[],
    latencyStats: any,
    errorStats: any,
    connectionStats: any
  ): string[] {
    const recommendations: string[] = [];

    // Latency recommendations
    if (latencyStats.average > this.config.thresholds.highLatencyMs) {
      recommendations.push('Consider implementing caching to reduce sync latency');
      recommendations.push('Review network conditions and optimize connection settings');
    }

    // Error rate recommendations
    if (errorStats.errorRate > this.config.thresholds.highErrorRate) {
      recommendations.push('Implement exponential backoff for failed operations');
      recommendations.push('Review error patterns and add specific error handling');
    }

    // Connection stability recommendations
    if (connectionStats.stabilityPercentage < this.config.thresholds.lowConnectionStability) {
      recommendations.push('Implement connection health monitoring and automatic reconnection');
      recommendations.push('Consider using multiple connection endpoints for redundancy');
    }

    // Issue-specific recommendations
    issues.forEach(issue => {
      switch (issue.type) {
        case PerformanceIssueType.TIMEOUT_FREQUENCY:
          recommendations.push('Increase timeout values or optimize slow operations');
          break;
        case PerformanceIssueType.RATE_LIMIT_EXCEEDED:
          recommendations.push('Implement rate limiting and request queuing');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}