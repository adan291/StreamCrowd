/**
 * OverlaySyncHealthMonitor - Health monitoring component for overlay synchronization
 * 
 * This component provides a visual interface for monitoring the health of the
 * overlay synchronization system. It displays real-time health status, metrics,
 * and provides debugging capabilities.
 * 
 * Requirements: 5.3
 */

import React, { useState, useCallback } from 'react';
import { useOverlaySyncHealth, type HealthStatus, type HealthCheckResult } from '@/src/application/hooks/useOverlaySyncHealth';
import type { ConnectionStatus } from '@/src/domain/ports/IOverlaySync';

/**
 * Props for the health monitor component
 */
interface OverlaySyncHealthMonitorProps {
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  
  /** Whether to show health history */
  showHistory?: boolean;
  
  /** Maximum number of history items to display */
  maxHistoryItems?: number;
  
  /** Custom CSS classes */
  className?: string;
  
  /** Callback when health status changes */
  onHealthStatusChange?: (status: HealthStatus) => void;
}

/**
 * Get status color based on health status
 */
const getStatusColor = (status: HealthStatus): string => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'warning':
      return 'text-yellow-600 bg-yellow-100';
    case 'critical':
      return 'text-red-600 bg-red-100';
    case 'unknown':
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

/**
 * Get connection status color
 */
const getConnectionColor = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'text-green-600';
    case 'reconnecting':
      return 'text-yellow-600';
    case 'disconnected':
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

/**
 * Format duration in milliseconds to human readable format
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

/**
 * Format timestamp to readable date
 */
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Health monitoring component
 */
export const OverlaySyncHealthMonitor: React.FC<OverlaySyncHealthMonitorProps> = ({
  showDetails = false,
  showHistory = false,
  maxHistoryItems = 10,
  className = '',
  onHealthStatusChange,
}) => {
  const {
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
  } = useOverlaySyncHealth();

  const [isPerformingCheck, setIsPerformingCheck] = useState(false);
  const [showExportData, setShowExportData] = useState(false);

  // Handle manual health check
  const handleManualCheck = useCallback(async () => {
    setIsPerformingCheck(true);
    try {
      await performHealthCheck();
    } catch (error) {
      console.error('Manual health check failed:', error);
    } finally {
      setIsPerformingCheck(false);
    }
  }, [performHealthCheck]);

  // Handle export data
  const handleExportData = useCallback(() => {
    const data = exportHealthData();
    navigator.clipboard.writeText(data).then(() => {
      setShowExportData(true);
      setTimeout(() => setShowExportData(false), 2000);
    }).catch(console.error);
  }, [exportHealthData]);

  // Notify parent of health status changes
  React.useEffect(() => {
    if (onHealthStatusChange) {
      onHealthStatusChange(healthStatus);
    }
  }, [healthStatus, onHealthStatusChange]);

  return (
    <div className={`overlay-sync-health-monitor ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Overlay Sync Health
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Health Status Badge */}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthStatus)}`}>
            {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          </span>
          
          {/* Monitoring Toggle */}
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isMonitoring 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Connection:</span>
          <span className={`text-sm font-medium ${getConnectionColor(connectionStatus)}`}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>
      </div>

      {/* Health Result */}
      {healthResult && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Last Check: {formatTimestamp(healthResult.timestamp)}
            </span>
            <button
              onClick={handleManualCheck}
              disabled={isPerformingCheck}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {isPerformingCheck ? 'Checking...' : 'Check Now'}
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{healthResult.message}</p>
          
          {/* Issues */}
          {healthResult.details.issues.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-red-600">Issues:</span>
              <ul className="text-xs text-red-600 ml-4">
                {healthResult.details.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {healthResult.details.recommendations.length > 0 && (
            <div>
              <span className="text-xs font-medium text-blue-600">Recommendations:</span>
              <ul className="text-xs text-blue-600 ml-4">
                {healthResult.details.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detailed Metrics */}
      {showDetails && metrics && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Avg Latency:</span>
              <span className="ml-1 font-medium">{formatDuration(metrics.averageLatency)}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Error Rate:</span>
              <span className="ml-1 font-medium">{(metrics.errorRate * 100).toFixed(1)}%</span>
            </div>
            
            <div>
              <span className="text-gray-600">Total Syncs:</span>
              <span className="ml-1 font-medium">{metrics.totalSyncs}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Failed Syncs:</span>
              <span className="ml-1 font-medium">{metrics.failedSyncs}</span>
            </div>
            
            {metrics.lastSyncTime && (
              <div className="col-span-2">
                <span className="text-gray-600">Last Sync:</span>
                <span className="ml-1 font-medium">{formatTimestamp(metrics.lastSyncTime)}</span>
              </div>
            )}
          </div>

          {/* Service-specific metrics */}
          {healthResult?.details.serviceStatus && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Service Status</h5>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Uptime:</span>
                  <span className="ml-1 font-medium">
                    {formatDuration(healthResult.details.serviceStatus.uptime)}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">Subscriptions:</span>
                  <span className="ml-1 font-medium">
                    {healthResult.details.serviceStatus.activeSubscriptions}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">Pending Updates:</span>
                  <span className="ml-1 font-medium">
                    {healthResult.details.serviceStatus.pendingUpdates}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">Resources:</span>
                  <span className="ml-1 font-medium">
                    {healthResult.details.serviceStatus.resourceCount}
                  </span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-gray-600">Memory Risk:</span>
                  <span className={`ml-1 font-medium ${
                    healthResult.details.serviceStatus.memoryLeakRisk === 'high' ? 'text-red-600' :
                    healthResult.details.serviceStatus.memoryLeakRisk === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {healthResult.details.serviceStatus.memoryLeakRisk}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health History */}
      {showHistory && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Health History</h4>
            <button
              onClick={clearHealthHistory}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {getHealthHistory()
              .slice(-maxHistoryItems)
              .reverse()
              .map((result, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">
                    {formatTimestamp(result.timestamp)}
                  </span>
                  <span className={`font-medium ${getStatusColor(result.status).split(' ')[0]}`}>
                    {result.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleExportData}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          Export Data
        </button>
        
        {showExportData && (
          <span className="text-xs text-green-600">Copied to clipboard!</span>
        )}
      </div>
    </div>
  );
};

export default OverlaySyncHealthMonitor;