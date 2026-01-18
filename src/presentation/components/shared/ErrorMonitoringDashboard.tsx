/**
 * Error Monitoring Dashboard
 * 
 * Provides a comprehensive view of application errors including:
 * - Error log viewer with filtering and search
 * - Error frequency chart showing error patterns over time
 * - Export functionality for logs
 * 
 * Requirements: 8.3, 8.4
 */

import React, { useState, useMemo, useCallback } from 'react';
import { logService, LogEntry, LogLevel } from '../../../infrastructure/logging/LogService';
import { 
  AlertTriangle, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
  Clock,
  AlertCircle,
  Info,
  Bug
} from 'lucide-react';

// Types
interface ErrorFrequency {
  hour: string;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

interface Props {
  className?: string;
}

// Log level colors and icons
const LOG_LEVEL_CONFIG: Record<LogLevel, { color: string; bgColor: string; icon: React.ReactNode }> = {
  debug: { 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/20', 
    icon: <Bug className="w-4 h-4" /> 
  },
  info: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20', 
    icon: <Info className="w-4 h-4" /> 
  },
  warn: { 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20', 
    icon: <AlertTriangle className="w-4 h-4" /> 
  },
  error: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20', 
    icon: <AlertCircle className="w-4 h-4" /> 
  },
};

/**
 * ErrorMonitoringDashboard Component
 * 
 * Main dashboard for viewing and analyzing application errors
 */
export const ErrorMonitoringDashboard: React.FC<Props> = ({ className = '' }) => {
  // State
  const [logs, setLogs] = useState<LogEntry[]>(() => logService.getLogs());
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Refresh logs from service
  const refreshLogs = useCallback(() => {
    setLogs(logService.getLogs());
  }, []);

  // Filter logs based on level and search query
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      result = result.filter(log => log.level === selectedLevel);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.feature?.toLowerCase().includes(query) ||
        log.stack?.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [logs, selectedLevel, searchQuery, sortOrder]);

  // Calculate error frequency by hour for chart
  const errorFrequency = useMemo((): ErrorFrequency[] => {
    const frequencyMap = new Map<string, ErrorFrequency>();
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().slice(0, 13);
      frequencyMap.set(hourKey, {
        hour: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      });
    }

    // Count logs per hour
    logs.forEach(log => {
      const hourKey = log.timestamp.slice(0, 13);
      const freq = frequencyMap.get(hourKey);
      if (freq) {
        freq[log.level]++;
      }
    });

    return Array.from(frequencyMap.values());
  }, [logs]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter(l => l.level === 'error').length;
    const warnings = logs.filter(l => l.level === 'warn').length;
    const features = new Set(logs.map(l => l.feature).filter(Boolean));
    
    return { total, errors, warnings, featuresAffected: features.size };
  }, [logs]);

  // Export logs as JSON
  const handleExport = useCallback(() => {
    const exportData = logService.exportLogs();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Clear all logs
  const handleClearLogs = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      logService.clearLogs();
      setLogs([]);
    }
  }, []);

  // Copy log entry to clipboard
  const copyLogEntry = useCallback((log: LogEntry) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text);
  }, []);

  // Toggle log expansion
  const toggleLogExpansion = useCallback((index: number) => {
    setExpandedLogId(prev => prev === index ? null : index);
  }, []);

  // Get max value for chart scaling
  const maxChartValue = useMemo(() => {
    return Math.max(
      ...errorFrequency.map(f => f.debug + f.info + f.warn + f.error),
      1
    );
  }, [errorFrequency]);

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Error Monitoring Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            View and analyze application errors and logs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshLogs}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-gray-400 text-sm">Total Logs</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
          <div className="text-gray-400 text-sm">Errors</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.warnings}</div>
          <div className="text-gray-400 text-sm">Warnings</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{stats.featuresAffected}</div>
          <div className="text-gray-400 text-sm">Features Affected</div>
        </div>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded ${
                viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded ${
                viewMode === 'chart' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Chart
            </button>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Filter className="w-4 h-4 text-gray-400 ml-2" />
            {(['all', 'error', 'warn', 'info', 'debug'] as const).map(level => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-3 py-1.5 rounded text-sm capitalize ${
                  selectedLevel === level 
                    ? 'bg-gray-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
          
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
          >
            <Clock className="w-4 h-4" />
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'list' ? (
        /* Log List View */
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm mt-1">
                {searchQuery || selectedLevel !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Logs will appear here when errors occur'}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredLogs.map((log, index) => {
                const config = LOG_LEVEL_CONFIG[log.level];
                const isExpanded = expandedLogId === index;
                
                return (
                  <div 
                    key={`${log.timestamp}-${index}`}
                    className="border-b border-gray-700 last:border-b-0"
                  >
                    {/* Log Header */}
                    <div 
                      className="flex items-center gap-3 p-3 hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => toggleLogExpansion(index)}
                    >
                      <span className={`${config.color}`}>
                        {config.icon}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${config.bgColor} ${config.color}`}>
                        {log.level}
                      </span>
                      
                      <span className="text-gray-500 text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      
                      {log.feature && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {log.feature}
                        </span>
                      )}
                      
                      <span className="flex-1 text-white text-sm truncate">
                        {log.message}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLogEntry(log);
                        }}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="Copy log entry"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-900/50">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">Message</div>
                            <div className="text-white font-mono text-xs bg-gray-800 p-2 rounded">
                              {log.message}
                            </div>
                          </div>
                          
                          {log.context && Object.keys(log.context).length > 0 && (
                            <div>
                              <div className="text-gray-500 mb-1">Context</div>
                              <pre className="text-white font-mono text-xs bg-gray-800 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(log.context, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        
                        {log.stack && (
                          <div className="mt-4">
                            <div className="text-gray-500 mb-1">Stack Trace</div>
                            <pre className="text-red-400 font-mono text-xs bg-gray-800 p-2 rounded overflow-auto max-h-40">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                        
                        {log.componentStack && (
                          <div className="mt-4">
                            <div className="text-gray-500 mb-1">Component Stack</div>
                            <pre className="text-yellow-400 font-mono text-xs bg-gray-800 p-2 rounded overflow-auto max-h-40">
                              {log.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Chart View */
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Error Frequency (Last 24 Hours)</h3>
          
          {/* Simple Bar Chart */}
          <div className="flex items-end gap-1 h-48">
            {errorFrequency.map((freq, index) => {
              const total = freq.debug + freq.info + freq.warn + freq.error;
              const height = (total / maxChartValue) * 100;
              
              return (
                <div 
                  key={index} 
                  className="flex-1 flex flex-col items-center group relative"
                >
                  {/* Stacked Bar */}
                  <div 
                    className="w-full flex flex-col-reverse rounded-t overflow-hidden transition-all"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    {freq.error > 0 && (
                      <div 
                        className="bg-red-500" 
                        style={{ height: `${(freq.error / total) * 100}%` }}
                      />
                    )}
                    {freq.warn > 0 && (
                      <div 
                        className="bg-yellow-500" 
                        style={{ height: `${(freq.warn / total) * 100}%` }}
                      />
                    )}
                    {freq.info > 0 && (
                      <div 
                        className="bg-blue-500" 
                        style={{ height: `${(freq.info / total) * 100}%` }}
                      />
                    )}
                    {freq.debug > 0 && (
                      <div 
                        className="bg-gray-500" 
                        style={{ height: `${(freq.debug / total) * 100}%` }}
                      />
                    )}
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 border border-gray-700 rounded p-2 text-xs whitespace-nowrap z-10">
                    <div className="font-semibold text-white mb-1">{freq.hour}</div>
                    <div className="text-red-400">Errors: {freq.error}</div>
                    <div className="text-yellow-400">Warnings: {freq.warn}</div>
                    <div className="text-blue-400">Info: {freq.info}</div>
                    <div className="text-gray-400">Debug: {freq.debug}</div>
                  </div>
                  
                  {/* Hour Label (show every 4th) */}
                  {index % 4 === 0 && (
                    <div className="text-gray-500 text-xs mt-2 transform -rotate-45 origin-top-left">
                      {freq.hour}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-gray-400 text-sm">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span className="text-gray-400 text-sm">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-gray-400 text-sm">Info</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded" />
              <span className="text-gray-400 text-sm">Debug</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-gray-500 text-xs">
        <span>
          Showing {filteredLogs.length} of {logs.length} logs
        </span>
        <span>
          Max capacity: {logService.getMaxLogs()} logs
        </span>
      </div>
    </div>
  );
};

export default ErrorMonitoringDashboard;
