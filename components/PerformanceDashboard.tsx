import React from 'react';
import { Activity, Zap, Package, Clock, Eye, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { usePerformanceMonitor } from '../src/application/hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  className?: string;
  compact?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { generateReport, isInitialized, formatBundleSize } = usePerformanceMonitor();
  
  if (!isInitialized) {
    return (
      <div className={`p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const report = generateReport();
  const { metrics, performance, bundleSizeFormatted, isPerformanceGood } = report;

  if (compact) {
    return (
      <div className={`fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className={isPerformanceGood ? 'text-green-400' : 'text-yellow-400'} />
          <span className="font-bold">Performance</span>
          {isPerformanceGood ? (
            <CheckCircle size={12} className="text-green-400" />
          ) : (
            <AlertTriangle size={12} className="text-yellow-400" />
          )}
        </div>
        <div className="space-y-1">
          {metrics.fcp > 0 && (
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className={metrics.fcp <= 1500 ? 'text-green-400' : 'text-yellow-400'}>
                {metrics.fcp.toFixed(0)}ms
              </span>
            </div>
          )}
          {metrics.lcp > 0 && (
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={metrics.lcp <= 2500 ? 'text-green-400' : 'text-yellow-400'}>
                {metrics.lcp.toFixed(0)}ms
              </span>
            </div>
          )}
          {metrics.bundleSize > 0 && (
            <div className="flex justify-between">
              <span>Bundle:</span>
              <span className={metrics.bundleSize <= 2 * 1024 * 1024 ? 'text-green-400' : 'text-red-400'}>
                {bundleSizeFormatted}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className={`w-6 h-6 ${isPerformanceGood ? 'text-green-500' : 'text-yellow-500'}`} />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Performance Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          {isPerformanceGood ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Good</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Needs Attention</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Web Vitals */}
        <MetricCard
          title="First Contentful Paint"
          value={metrics.fcp}
          threshold={1500}
          unit="ms"
          icon={<Eye className="w-4 h-4" />}
          description="Time until first content appears"
        />
        
        <MetricCard
          title="Largest Contentful Paint"
          value={metrics.lcp}
          threshold={2500}
          unit="ms"
          icon={<Package className="w-4 h-4" />}
          description="Time until largest content loads"
        />
        
        <MetricCard
          title="First Input Delay"
          value={metrics.fid}
          threshold={100}
          unit="ms"
          icon={<Zap className="w-4 h-4" />}
          description="Time until page becomes interactive"
        />
        
        <MetricCard
          title="Cumulative Layout Shift"
          value={metrics.cls}
          threshold={0.1}
          unit=""
          icon={<TrendingUp className="w-4 h-4" />}
          description="Visual stability score"
          precision={3}
        />
        
        <MetricCard
          title="Time to First Byte"
          value={metrics.ttfb}
          threshold={800}
          unit="ms"
          icon={<Clock className="w-4 h-4" />}
          description="Server response time"
        />
        
        <MetricCard
          title="Bundle Size"
          value={metrics.bundleSize}
          threshold={2 * 1024 * 1024}
          unit=""
          icon={<Package className="w-4 h-4" />}
          description="Total JavaScript bundle size"
          formatter={formatBundleSize}
        />
      </div>

      {/* Chunk Load Times */}
      {Object.keys(metrics.chunkLoadTime).length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Chunk Load Times
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(metrics.chunkLoadTime)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([chunk, time]) => (
                <div key={chunk} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 truncate flex-1 mr-2">
                    {chunk.split('/').pop()?.replace('.js', '') || chunk}
                  </span>
                  <span className={`font-mono ${(time as number) > 1000 ? 'text-red-500' : (time as number) > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {(time as number).toFixed(0)}ms
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Performance Issues */}
      {performance.some(p => !p.passed) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Performance Issues
          </h4>
          <div className="space-y-2">
            {performance
              .filter(p => !p.passed)
              .map((issue, index) => (
                <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">{issue.metric}:</span> {issue.value.toFixed(1)}
                  {issue.metric.includes('Size') ? '' : 'ms'} 
                  (threshold: {issue.threshold.toFixed(1)}{issue.metric.includes('Size') ? '' : 'ms'})
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => {
                console.log('Performance Report:', report);
              }}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
            >
              Log Report
            </button>
            <button
              onClick={() => {
                localStorage.setItem('streamcrowd_show_performance', 
                  localStorage.getItem('streamcrowd_show_performance') === 'true' ? 'false' : 'true'
                );
                window.location.reload();
              }}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
            >
              Toggle Visibility
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  threshold: number;
  unit: string;
  icon: React.ReactNode;
  description: string;
  precision?: number;
  formatter?: (value: number) => string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  threshold,
  unit,
  icon,
  description,
  precision = 0,
  formatter
}) => {
  const isGood = value <= threshold || value === 0;
  const displayValue = formatter ? formatter(value) : `${value.toFixed(precision)}${unit}`;
  
  if (value === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        </div>
        <div className="text-lg font-bold text-gray-400 dark:text-gray-500 mb-1">
          Measuring...
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isGood 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {icon}
        </div>
        <h4 className={`text-sm font-medium ${
          isGood ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
        }`}>
          {title}
        </h4>
      </div>
      <div className={`text-2xl font-bold mb-1 ${
        isGood ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
      }`}>
        {displayValue}
      </div>
      <p className={`text-xs ${
        isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {description}
      </p>
      <div className={`text-xs mt-1 ${
        isGood ? 'text-green-500 dark:text-green-500' : 'text-red-500 dark:text-red-500'
      }`}>
        Threshold: {formatter ? formatter(threshold) : `${threshold}${unit}`}
      </div>
    </div>
  );
};