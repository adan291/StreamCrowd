/**
 * AuditLogViewer - Component for viewing and managing audit logs
 * 
 * This component demonstrates how to use the audit logging system
 * to view overlay state changes, filter logs, and export audit data.
 */

import React, { useState, useEffect } from 'react';
import { useAuditLog } from '../src/application/hooks/useAuditLog';
import { AuditLogEntry, AuditLogFilters, AuditOperation, AuditSource } from '../src/domain/entities/AuditLog';
import { OverlayType } from '../src/domain/entities/OverlayState';

interface AuditLogViewerProps {
  /** Whether to show real-time updates */
  realTimeUpdates?: boolean;
  
  /** Maximum number of logs to display */
  maxLogs?: number;
  
  /** Default filters to apply */
  defaultFilters?: Partial<AuditLogFilters>;
}

export function AuditLogViewer({ 
  realTimeUpdates = true, 
  maxLogs = 50,
  defaultFilters = {}
}: AuditLogViewerProps) {
  const {
    getAuditLogs,
    getAuditStats,
    exportAuditLogs,
    clearAuditLogs,
    auditLogCount,
    isEnabled
  } = useAuditLog({
    enableRealTimeUpdates: realTimeUpdates,
    updateInterval: 2000,
  });

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: maxLogs,
    ...defaultFilters
  });
  
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [showStats, setShowStats] = useState(false);

  // Update logs when filters change
  useEffect(() => {
    const filteredLogs = getAuditLogs(filters);
    setLogs(filteredLogs);
  }, [filters, auditLogCount, getAuditLogs]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleExport = () => {
    const exported = exportAuditLogs(filters);
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear the audit logs?')) {
      const clearedCount = clearAuditLogs(filters);
      alert(`Cleared ${clearedCount} audit log entries`);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOperationColor = (operation: AuditOperation) => {
    const colors = {
      create: 'text-green-600',
      update: 'text-blue-600',
      delete: 'text-red-600',
      activate: 'text-green-500',
      deactivate: 'text-yellow-600',
      clear: 'text-orange-600',
      sync: 'text-purple-600',
      migrate: 'text-indigo-600',
    };
    return colors[operation] || 'text-gray-600';
  };

  const getSourceBadge = (source: AuditSource) => {
    const badges = {
      user: 'bg-blue-100 text-blue-800',
      system: 'bg-gray-100 text-gray-800',
      api: 'bg-green-100 text-green-800',
      webhook: 'bg-purple-100 text-purple-800',
      migration: 'bg-yellow-100 text-yellow-800',
      recovery: 'bg-red-100 text-red-800',
    };
    return badges[source] || 'bg-gray-100 text-gray-800';
  };

  if (!isEnabled) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Audit logging is currently disabled.</p>
      </div>
    );
  }

  const stats = showStats ? getAuditStats(filters) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-600">
            Total entries: {auditLogCount} | Showing: {logs.length}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
          >
            Export
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Operations</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(stats.byOperation).map(([op, count]) => (
                <div key={op} className="flex justify-between">
                  <span className="capitalize">{op}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Sources</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div key={source} className="flex justify-between">
                  <span className="capitalize">{source}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Performance</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Success Rate:</span>
                <span className="font-medium">{(stats.successRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Duration:</span>
                <span className="font-medium">{stats.averageDuration.toFixed(0)}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overlay Type
          </label>
          <select
            value={filters.overlayType || ''}
            onChange={(e) => handleFilterChange('overlayType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="poll">Poll</option>
            <option value="giveaway">Giveaway</option>
            <option value="game">Game</option>
            <option value="prediction">Prediction</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operation
          </label>
          <select
            value={filters.operation || ''}
            onChange={(e) => handleFilterChange('operation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Operations</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="clear">Clear</option>
            <option value="sync">Sync</option>
            <option value="migrate">Migrate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={filters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Sources</option>
            <option value="user">User</option>
            <option value="system">System</option>
            <option value="api">API</option>
            <option value="webhook">Webhook</option>
            <option value="migration">Migration</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Success Status
          </label>
          <select
            value={filters.success === undefined ? '' : filters.success.toString()}
            onChange={(e) => handleFilterChange('success', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overlay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getOperationColor(log.operation)}`}>
                      {log.operation}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSourceBadge(log.source)}`}>
                      {log.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{log.overlayType}</div>
                      <div className="text-gray-500 text-xs">{log.overlayId.substring(0, 12)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.userContext?.username || log.userContext?.userId || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.duration ? `${log.duration}ms` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No audit logs found matching the current filters.
          </div>
        )}
      </div>
    </div>
  );
}