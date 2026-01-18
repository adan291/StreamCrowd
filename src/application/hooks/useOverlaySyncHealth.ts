/**
 * useOverlaySyncHealth - Health monitoring hook for overlay synchronization
 * 
 * This hook provides comprehensive health monitoring and diagnostics for the
 * overlay synchronization system. It exposes performance metrics, connection
 * status, and health check capabilities.
 * 
 * Requirements: 5.3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OverlaySyncService } from '../services/OverlaySyncService';
import type { ConnectionStatus, SyncMetrics } from '@/src/domain/ports/IOverlaySync';
import { DependencyFactory } from '@/src/infrastructure/factories/DependencyFactory';

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  timestamp: number;
  details: {
    connectionStatus: ConnectionStatus;
    metrics: SyncMetrics | null;
    serviceStatus: {
      initialized: boolean;
      uptime: number;
      activeSubscriptions: number;
      pendingUpdates: number;
      resourceCount: number;
      memoryLeakRisk: 'low' | 'medium' | 'high';
    };
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitoringConfig {
  /** Enable automatic health checks */
  enabled: boolean;
  
  /** Health check interval in milliseconds */
  checkIntervalMs: number;
  
  /** Enable performance metrics collection */
  collectMetrics: boolean;
  
  /** Metrics collection interval in milliseconds */
  metricsIntervalMs: number;
  
  /** Thresholds for health status determination */
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
}

/**
 * Default health monitoring configuration
 */
const DEFAULT_CONFIG: HealthMonitoringConfig = {
  enabled: true,
  checkIntervalMs: 30000, // 30 seconds
  collectMetrics: true,
  metricsIntervalMs: 10000, // 10 seconds
  thresholds: {
    maxLatencyMs: 1000, // 1 second
    maxErrorRate: 0.1, // 10%
    maxResourceCount: 100,
    connectionTimeoutMs: 5000, // 5 seconds
  },
};

/**
 * Health monitoring hook return interface
 */
export interface UseOverlaySyncHealthReturn {
  /** Current health status */
  healthStatus: HealthStatus;
  
  /** Latest health check result */
  healthResult: HealthCheckResult | null;
  
  /** Current performance metrics */
  metrics: SyncMetrics | null;
  
  /** Connection status */
  connectionStatus: ConnectionStatus;
  
  /** Whether monitoring is active */
  isMonitoring: boolean;
  
  /** Perform manual health check */
  performHealthCheck: () => Promise<HealthCheckResult>;
  
  /** Start/stop monitoring */
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  /** Get health history */
  getHealthHistory: () => HealthCheckResult[];
  
  /** Clear health history */
  clearHealthHistory: () => void;
  
  /** Export health data for debugging */
  exportHealthData: () => string;
}

/**
 * Health monitoring hook for overlay synchronization
 * 
 * Provides comprehensive health monitoring including:
 * - Automatic health checks
 * - Performance metrics collection
 * - Connection status monitoring
 * - Issue detection and recommendations
 * - Health history tracking
 * 
 * @param config Health monitoring configuration
 * @returns Health monitoring interface
 */
export function useOverlaySyncHealth(
  config: Partial<HealthMonitoringConfig> = {}
): UseOverlaySyncHealthReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('unknown');
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [overlaySync, setOverlaySync] = useState<OverlaySyncService | null>(null);
  
  // Refs for intervals and history
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthHistoryRef = useRef<HealthCheckResult[]>([]);
  const maxHistorySize = 100; // Keep last 100 health checks

  // Initialize overlay sync service
  useEffect(() => {
    let mounted = true;
    
    const initializeService = async () => {
      try {
        const service = await DependencyFactory.getInstance().getOverlaySyncService();
        if (mounted) {
          setOverlaySync(service);
        }
      } catch (error) {
        console.error('[useOverlaySyncHealth] Service initialization failed:', error);
      }
    };

    initializeService();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Perform health check
  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    const timestamp = Date.now();
    
    if (!overlaySync) {
      const result: HealthCheckResult = {
        status: 'critical',
        message: 'Overlay sync service not initialized',
        timestamp,
        details: {
          connectionStatus: 'error',
          metrics: null,
          serviceStatus: {
            initialized: false,
            uptime: 0,
            activeSubscriptions: 0,
            pendingUpdates: 0,
            resourceCount: 0,
            memoryLeakRisk: 'low',
          },
          issues: ['Service not initialized'],
          recommendations: ['Check service initialization', 'Verify dependencies'],
        },
      };
      
      setHealthResult(result);
      setHealthStatus(result.status);
      return result;
    }

    try {
      // Get current metrics and status
      const currentMetrics = overlaySync.getPerformanceMetrics();
      const currentConnectionStatus = overlaySync.getConnectionStatus();
      
      // Analyze health based on metrics and thresholds
      const issues: string[] = [];
      const recommendations: string[] = [];
      let status: HealthStatus = 'healthy';

      // Check connection status
      if (currentConnectionStatus === 'error' || currentConnectionStatus === 'disconnected') {
        issues.push(`Connection status: ${currentConnectionStatus}`);
        recommendations.push('Check network connectivity and Firebase configuration');
        status = 'critical';
      } else if (currentConnectionStatus === 'reconnecting') {
        issues.push('Connection is reconnecting');
        recommendations.push('Monitor connection stability');
        status = status === 'healthy' ? 'warning' : status;
      }

      // Check latency
      if (currentMetrics.averageLatency > fullConfig.thresholds.maxLatencyMs) {
        issues.push(`High latency: ${currentMetrics.averageLatency}ms`);
        recommendations.push('Check network conditions and Firebase performance');
        status = status === 'healthy' ? 'warning' : status;
      }

      // Check error rate
      if (currentMetrics.errorRate > fullConfig.thresholds.maxErrorRate) {
        issues.push(`High error rate: ${(currentMetrics.errorRate * 100).toFixed(1)}%`);
        recommendations.push('Investigate error patterns and causes');
        status = status === 'healthy' ? 'warning' : status;
      }

      // Check service-specific metrics if available
      if ('serviceMetrics' in currentMetrics) {
        const serviceMetrics = (currentMetrics as any).serviceMetrics;
        
        // Check resource count
        if (serviceMetrics.resourceCount > fullConfig.thresholds.maxResourceCount) {
          issues.push(`High resource count: ${serviceMetrics.resourceCount}`);
          recommendations.push('Check for resource leaks and cleanup subscriptions');
          status = status === 'healthy' ? 'warning' : status;
        }

        // Check memory leak risk
        if (serviceMetrics.memoryLeakRisk === 'high') {
          issues.push('High memory leak risk detected');
          recommendations.push('Review resource management and cleanup logic');
          status = 'critical';
        } else if (serviceMetrics.memoryLeakRisk === 'medium') {
          issues.push('Medium memory leak risk detected');
          recommendations.push('Monitor resource usage closely');
          status = status === 'healthy' ? 'warning' : status;
        }
      }

      // Create health check result
      const result: HealthCheckResult = {
        status,
        message: status === 'healthy' 
          ? 'All systems operational' 
          : `${issues.length} issue(s) detected`,
        timestamp,
        details: {
          connectionStatus: currentConnectionStatus,
          metrics: currentMetrics,
          serviceStatus: {
            initialized: true,
            uptime: 'serviceMetrics' in currentMetrics 
              ? (currentMetrics as any).serviceMetrics.uptime 
              : Date.now() - timestamp,
            activeSubscriptions: 'serviceMetrics' in currentMetrics 
              ? (currentMetrics as any).serviceMetrics.activeSubscriptions 
              : 0,
            pendingUpdates: 'serviceMetrics' in currentMetrics 
              ? (currentMetrics as any).serviceMetrics.pendingUpdates 
              : 0,
            resourceCount: 'serviceMetrics' in currentMetrics 
              ? (currentMetrics as any).serviceMetrics.resourceCount 
              : 0,
            memoryLeakRisk: 'serviceMetrics' in currentMetrics 
              ? (currentMetrics as any).serviceMetrics.memoryLeakRisk 
              : 'low',
          },
          issues,
          recommendations,
        },
      };

      // Update state
      setHealthResult(result);
      setHealthStatus(result.status);
      setMetrics(currentMetrics);
      setConnectionStatus(currentConnectionStatus);

      // Add to history
      healthHistoryRef.current.push(result);
      if (healthHistoryRef.current.length > maxHistorySize) {
        healthHistoryRef.current = healthHistoryRef.current.slice(-maxHistorySize);
      }

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        status: 'critical',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        details: {
          connectionStatus: 'error',
          metrics: null,
          serviceStatus: {
            initialized: true,
            uptime: 0,
            activeSubscriptions: 0,
            pendingUpdates: 0,
            resourceCount: 0,
            memoryLeakRisk: 'low',
          },
          issues: ['Health check execution failed'],
          recommendations: ['Check service availability', 'Review error logs'],
        },
      };

      setHealthResult(result);
      setHealthStatus(result.status);
      return result;
    }
  }, [overlaySync, fullConfig.thresholds]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring || !fullConfig.enabled) {
      return;
    }

    setIsMonitoring(true);

    // Start health check interval
    healthCheckIntervalRef.current = setInterval(() => {
      performHealthCheck().catch(console.error);
    }, fullConfig.checkIntervalMs);

    // Start metrics collection interval if different from health check
    if (fullConfig.collectMetrics && fullConfig.metricsIntervalMs !== fullConfig.checkIntervalMs) {
      metricsIntervalRef.current = setInterval(() => {
        if (overlaySync) {
          try {
            const currentMetrics = overlaySync.getPerformanceMetrics();
            setMetrics(currentMetrics);
            setConnectionStatus(overlaySync.getConnectionStatus());
          } catch (error) {
            console.warn('[useOverlaySyncHealth] Metrics collection failed:', error);
          }
        }
      }, fullConfig.metricsIntervalMs);
    }

    // Perform initial health check
    performHealthCheck().catch(console.error);
  }, [isMonitoring, fullConfig, performHealthCheck, overlaySync]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) {
      return;
    }

    setIsMonitoring(false);

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, [isMonitoring]);

  // Get health history
  const getHealthHistory = useCallback((): HealthCheckResult[] => {
    return [...healthHistoryRef.current];
  }, []);

  // Clear health history
  const clearHealthHistory = useCallback(() => {
    healthHistoryRef.current = [];
  }, []);

  // Export health data for debugging
  const exportHealthData = useCallback((): string => {
    const exportData = {
      timestamp: Date.now(),
      currentHealth: healthResult,
      currentMetrics: metrics,
      connectionStatus,
      history: healthHistoryRef.current,
      config: fullConfig,
    };

    return JSON.stringify(exportData, null, 2);
  }, [healthResult, metrics, connectionStatus, fullConfig]);

  // Auto-start monitoring when service is available
  useEffect(() => {
    if (overlaySync && fullConfig.enabled && !isMonitoring) {
      startMonitoring();
    }
  }, [overlaySync, fullConfig.enabled, isMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    healthStatus,
    healthResult,
    metrics,
    connectionStatus,
    isMonitoring,
    performHealthCheck,
    startMonitoring,
    stopMonitoring,
    getHealthHistory,
    clearHealthHistory,
    exportHealthData,
  };
}