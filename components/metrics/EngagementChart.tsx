// EngagementChart - Poll and prediction participation chart

import React, { useMemo } from 'react';
import { TimeSeries, TimeWindow } from '../../types/metrics';

interface EngagementChartProps {
  pollData: TimeSeries | undefined;
  predictionData: TimeSeries | undefined;
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
}

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '5min', label: '5 min' },
  { value: '15min', label: '15 min' },
  { value: '30min', label: '30 min' },
  { value: '1h', label: '1 hora' },
  { value: 'all', label: 'Todo' },
];

export const EngagementChart: React.FC<EngagementChartProps> = ({
  pollData,
  predictionData,
  timeWindow,
  onTimeWindowChange,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    const pollTotal = pollData?.points.reduce((sum, p) => sum + p.value, 0) || 0;
    const predictionTotal = predictionData?.points.reduce((sum, p) => sum + p.value, 0) || 0;
    const total = pollTotal + predictionTotal;

    return {
      pollTotal,
      predictionTotal,
      total,
      pollPercent: total > 0 ? Math.round((pollTotal / total) * 100) : 0,
      predictionPercent: total > 0 ? Math.round((predictionTotal / total) * 100) : 0,
    };
  }, [pollData, predictionData]);

  // Filter and merge data
  const chartData = useMemo(() => {
    const now = Date.now();
    const windowMs = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      'all': Infinity,
    }[timeWindow];

    const pollPoints = (pollData?.points || []).filter(p => now - p.timestamp <= windowMs);
    const predictionPoints = (predictionData?.points || []).filter(p => now - p.timestamp <= windowMs);

    // Merge timestamps
    const allTimestamps = new Set([
      ...pollPoints.map(p => p.timestamp),
      ...predictionPoints.map(p => p.timestamp),
    ]);

    return Array.from(allTimestamps)
      .sort((a, b) => a - b)
      .map(ts => ({
        timestamp: ts,
        poll: pollPoints.find(p => p.timestamp === ts)?.value || 0,
        prediction: predictionPoints.find(p => p.timestamp === ts)?.value || 0,
      }));
  }, [pollData, predictionData, timeWindow]);

  // Chart dimensions
  const chartHeight = 150;
  const chartWidth = 400;
  const padding = 30;

  // Generate paths
  const { pollPath, predictionPath } = useMemo(() => {
    if (chartData.length < 2) return { pollPath: '', predictionPath: '' };

    const maxValue = Math.max(
      ...chartData.map(d => Math.max(d.poll, d.prediction)),
      1
    );
    const minTime = chartData[0].timestamp;
    const maxTime = chartData[chartData.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const getPath = (getValue: (d: typeof chartData[0]) => number) => {
      const points = chartData.map(d => {
        const x = padding + ((d.timestamp - minTime) / timeRange) * (chartWidth - padding * 2);
        const y = chartHeight - padding - (getValue(d) / maxValue) * (chartHeight - padding * 2);
        return `${x},${y}`;
      });
      return `M ${points.join(' L ')}`;
    };

    return {
      pollPath: getPath(d => d.poll),
      predictionPath: getPath(d => d.prediction),
    };
  }, [chartData, chartHeight, chartWidth, padding]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🎯 Engagement
        </h3>
        <div className="flex gap-1">
          {TIME_WINDOWS.map(tw => (
            <button
              key={tw.value}
              onClick={() => onTimeWindowChange(tw.value)}
              className={`px-2 py-1 text-xs rounded ${
                timeWindow === tw.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Polls</span>
            <span className="text-xs text-green-400">{stats.pollPercent}%</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.pollTotal.toLocaleString()}</div>
          <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
            <div
              className="bg-green-500 h-1 rounded-full"
              style={{ width: `${stats.pollPercent}%` }}
            />
          </div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Predictions</span>
            <span className="text-xs text-orange-400">{stats.predictionPercent}%</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{stats.predictionTotal.toLocaleString()}</div>
          <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
            <div
              className="bg-orange-500 h-1 rounded-full"
              style={{ width: `${stats.predictionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {chartData.length > 1 ? (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36"
            preserveAspectRatio="none"
          >
            {/* Poll line */}
            <path
              d={pollPath}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Prediction line */}
            <path
              d={predictionPath}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <div className="h-36 flex items-center justify-center text-gray-500">
            Sin datos de engagement
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-gray-400">Polls</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-xs text-gray-400">Predictions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementChart;
