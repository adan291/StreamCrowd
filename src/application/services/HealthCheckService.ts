/**
 * HealthCheckService - Service for providing health check endpoints
 * 
 * This service provides HTTP-like health check endpoints that can be used
 * by external monitoring systems to check the health of the overlay
 * synchronization system.
 * 
 * Requirements: 5.3
 */

import type { OverlaySyncService } from './OverlaySyncService';
import type { ConnectionStatus, SyncMetrics } from '@/src/domain/ports/IOverlaySync';
import { DependencyFactory } from '@/src/infrastructure/factories/DependencyFactory';

/**
 * Health check response format
 */
export interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** HTTP-like status code */
  code: 200 | 503 | 500;
  
  /** Human-readable message */
  message: string;
  
  /** Timestamp of the check */
  timestamp: number;
  
  /** Detailed health information */
  details: {
    /** Service information */
    service: {
      name: string;
      version: string;
      uptime: number;
    };
    
    /** Connection status */
    connection: {
      status: ConnectionStatus;
      lastConnected?: number;
    };
    
    /** Performance metrics */
    performance: {
      averageLatency: number;
      errorRate: number;
      totalOperations: number;
      failedOperations: number;
    };
    
    /** Resource usage */
    resources: {
      activeSubscriptions: number;
      pendingUpdates: number;
      resourceCount: number;
      memoryLeakRisk: 'low' | 'medium' | 'high';
    };
    
    /** Detected issues */
    issues: string[];
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Service name for identification */
  serviceName: string;
  
  /** Service version */
  serviceVersion: string;
  
  /** Thresholds for determining health status */
  thresholds: {
    /** Maximum acceptable latency in milliseconds */
    maxLatencyMs: number;
    
    /** Maximum acceptable error rate (0-1) */
    maxErrorRate: number;
    
    /** Maximum acceptable resource count */
    maxResourceCount: number;
    
    /** Connection timeout threshold in milliseconds */
    connectionTimeoutMs: number;
  };
  
  /** Enable detailed diagnostics in response */
  includeDetailedDiagnostics: boolean;
}

/**
 * Default health check configuration
 */
const DEFAULT_CONFIG: HealthCheckConfig = {
  serviceName: 'StreamCrowd Overlay Sync',
  serviceVersion: '2.0.0',
  thresholds: {
    maxLatencyMs: 1000,
    maxErrorRate: 0.1,
    maxResourceCount: 100,
    connectionTimeoutMs: 5000,
  },
  includeDetailedDiagnostics: true,
};

/**
 * Health check service for overlay synchronization
 * 
 * Provides standardized health check endpoints that can be consumed by:
 * - External monitoring systems
 * - Load balancers
 * - Service discovery systems
 * - Development tools
 */
export class HealthCheckService {
  private config: HealthCheckConfig;
  private startTime: number;
  private overlaySync: OverlaySyncService | null = null;
  private lastHealthCheck: HealthCheckResponse | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.initializeService();
  }

  /**
   * Initialize the overlay sync service
   */
  private async initializeService(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.overlaySync = await DependencyFactory.getInstance().getOverlaySyncService();
      } catch (error) {
        console.error('[HealthCheckService] Failed to initialize overlay sync service:', error);
        // Continue without the service - health checks will report unhealthy
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Perform a comprehensive health check
   * 
   * @returns Health check response
   */
  async performHealthCheck(): Promise<HealthCheckResponse> {
    const timestamp = Date.now();
    
    try {
      await this.initializeService();
      
      if (!this.overlaySync) {
        const response: HealthCheckResponse = {
          status: 'unhealthy',
          code: 500,
          message: 'Overlay sync service not available',
          timestamp,
          details: {
            service: {
              name: this.config.serviceName,
              version: this.config.serviceVersion,
              uptime: timestamp - this.startTime,
            },
            connection: {
              status: 'error',
            },
            performance: {
              averageLatency: 0,
              errorRate: 1,
              totalOperations: 0,
              failedOperations: 0,
            },
            resources: {
              activeSubscriptions: 0,
              pendingUpdates: 0,
              resourceCount: 0,
              memoryLeakRisk: 'low',
            },
            issues: ['Service not initialized'],
          },
        };
        
        this.lastHealthCheck = response;
        return response;
      }

      // Get current metrics and status
      const metrics = this.overlaySync.getPerformanceMetrics();
      const connectionStatus = this.overlaySync.getConnectionStatus();
      
      // Analyze health based on metrics and thresholds
      const issues: string[] = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let code: 200 | 503 | 500 = 200;

      // Check connection status
      if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
        issues.push(`Connection ${connectionStatus}`);
        status = 'unhealthy';
        code = 503;
      } else if (connectionStatus === 'reconnecting') {
        issues.push('Connection unstable');
        status = status === 'healthy' ? 'degraded' : status;
        code = code === 200 ? 503 : code;
      }

      // Check performance metrics
      if (metrics.averageLatency > this.config.thresholds.maxLatencyMs) {
        issues.push(`High latency: ${metrics.averageLatency}ms`);
        status = status === 'healthy' ? 'degraded' : status;
        code = code === 200 ? 503 : code;
      }

      if (metrics.errorRate > this.config.thresholds.maxErrorRate) {
        issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
        status = status === 'healthy' ? 'degraded' : status;
        code = code === 200 ? 503 : code;
      }

      // Check service-specific metrics if available
      let serviceMetrics = null;
      if ('serviceMetrics' in metrics) {
        serviceMetrics = (metrics as any).serviceMetrics;
        
        if (serviceMetrics.resourceCount > this.config.thresholds.maxResourceCount) {
          issues.push(`High resource usage: ${serviceMetrics.resourceCount}`);
          status = status === 'healthy' ? 'degraded' : status;
          code = code === 200 ? 503 : code;
        }

        if (serviceMetrics.memoryLeakRisk === 'high') {
          issues.push('Memory leak risk detected');
          status = 'unhealthy';
          code = 500;
        } else if (serviceMetrics.memoryLeakRisk === 'medium') {
          issues.push('Elevated memory usage');
          status = status === 'healthy' ? 'degraded' : status;
          code = code === 200 ? 503 : code;
        }
      }

      // Create response
      const response: HealthCheckResponse = {
        status,
        code,
        message: this.getStatusMessage(status, issues.length),
        timestamp,
        details: {
          service: {
            name: this.config.serviceName,
            version: this.config.serviceVersion,
            uptime: timestamp - this.startTime,
          },
          connection: {
            status: connectionStatus,
            lastConnected: connectionStatus === 'connected' ? timestamp : undefined,
          },
          performance: {
            averageLatency: metrics.averageLatency,
            errorRate: metrics.errorRate,
            totalOperations: metrics.totalSyncs,
            failedOperations: metrics.failedSyncs,
          },
          resources: {
            activeSubscriptions: serviceMetrics?.activeSubscriptions || 0,
            pendingUpdates: serviceMetrics?.pendingUpdates || 0,
            resourceCount: serviceMetrics?.resourceCount || 0,
            memoryLeakRisk: serviceMetrics?.memoryLeakRisk || 'low',
          },
          issues: this.config.includeDetailedDiagnostics ? issues : [],
        },
      };

      this.lastHealthCheck = response;
      return response;
    } catch (error) {
      const response: HealthCheckResponse = {
        status: 'unhealthy',
        code: 500,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        details: {
          service: {
            name: this.config.serviceName,
            version: this.config.serviceVersion,
            uptime: timestamp - this.startTime,
          },
          connection: {
            status: 'error',
          },
          performance: {
            averageLatency: 0,
            errorRate: 1,
            totalOperations: 0,
            failedOperations: 0,
          },
          resources: {
            activeSubscriptions: 0,
            pendingUpdates: 0,
            resourceCount: 0,
            memoryLeakRisk: 'low',
          },
          issues: this.config.includeDetailedDiagnostics ? ['Health check execution failed'] : [],
        },
      };

      this.lastHealthCheck = response;
      return response;
    }
  }

  /**
   * Get a lightweight health status (for quick checks)
   * 
   * @returns Simple health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
  }> {
    try {
      await this.initializeService();
      
      if (!this.overlaySync) {
        return { status: 'unhealthy', timestamp: Date.now() };
      }

      const connectionStatus = this.overlaySync.getConnectionStatus();
      
      if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
        return { status: 'unhealthy', timestamp: Date.now() };
      } else if (connectionStatus === 'reconnecting') {
        return { status: 'degraded', timestamp: Date.now() };
      } else {
        return { status: 'healthy', timestamp: Date.now() };
      }
    } catch (error) {
      return { status: 'unhealthy', timestamp: Date.now() };
    }
  }

  /**
   * Get the last health check result (cached)
   * 
   * @returns Last health check response or null if none performed
   */
  getLastHealthCheck(): HealthCheckResponse | null {
    return this.lastHealthCheck;
  }

  /**
   * Check if the service is ready to handle requests
   * 
   * @returns Readiness status
   */
  async isReady(): Promise<boolean> {
    try {
      await this.initializeService();
      return this.overlaySync !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the service is alive (basic liveness check)
   * 
   * @returns Liveness status
   */
  isAlive(): boolean {
    return true; // Service is alive if this method can be called
  }

  /**
   * Get service information
   * 
   * @returns Service metadata
   */
  getServiceInfo(): {
    name: string;
    version: string;
    uptime: number;
    startTime: number;
  } {
    return {
      name: this.config.serviceName,
      version: this.config.serviceVersion,
      uptime: Date.now() - this.startTime,
      startTime: this.startTime,
    };
  }

  /**
   * Update health check configuration
   * 
   * @param newConfig Partial configuration to merge
   */
  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   * 
   * @returns Current health check configuration
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  /**
   * Generate status message based on health status and issues
   */
  private getStatusMessage(status: 'healthy' | 'degraded' | 'unhealthy', issueCount: number): string {
    switch (status) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return `Service degraded - ${issueCount} issue(s) detected`;
      case 'unhealthy':
        return `Service unhealthy - ${issueCount} critical issue(s) detected`;
      default:
        return 'Unknown status';
    }
  }
}

/**
 * Global health check service instance
 */
let globalHealthCheckService: HealthCheckService | null = null;

/**
 * Get or create the global health check service instance
 * 
 * @param config Optional configuration for the service
 * @returns Health check service instance
 */
export function getHealthCheckService(config?: Partial<HealthCheckConfig>): HealthCheckService {
  if (!globalHealthCheckService) {
    globalHealthCheckService = new HealthCheckService(config);
  }
  return globalHealthCheckService;
}

/**
 * Reset the global health check service (useful for testing)
 */
export function resetHealthCheckService(): void {
  globalHealthCheckService = null;
}