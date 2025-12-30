// ViewersChart - Real-time viewers chart component

import React, { useMemo } from 'react';
import { TimeSeries, TimeWindow } from '../../types/metrics';

interface ViewersChartProps {
  data: TimeSeries | undefined;
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
  showStats?: boolean;
}

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '5min', label: '5 min' },
  { value: '15min', label: '15 min' },
  { value: '30min', label: '30 min' },
  { value: '1h', label: '1 hora' },
  { value: 'all', label: 'Todo' },
];

export const ViewersChart: React.FC<ViewersChartProps> = ({
  data,
  timeWindow,
  onTimeWindowChange,
  showStats = true,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    if (!data || data.points.length === 0) {
      return { current: 0, max: 0, avg: 0, min: 0 };
    }

    const values = data.points.map(p => p.value);
    const current = values[values.length - 1] || 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    return { current, max, avg, min };
  }, [data]);

  // Filter data by time window
  const filteredData = useMemo(() => {
    if (!data || data.points.length === 0) return [];

    const now = Date.now();
    const windowMs = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      'all': Infinity,
    }[timeWindow];

    return data.points.filter(p => now - p.timestamp <= windowMs);
  }, [data, timeWindow]);

  // Calculate chart dimensions
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  // Generate SVG path
  const pathData = useMemo(() => {
    if (filteredData.length < 2) return '';

    const maxValue = Math.max(...filteredData.map(p => p.value), 1);
    const minTime = filteredData[0].timestamp;
    const maxTime = filteredData[filteredData.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const points = filteredData.map(p => {
      const x = padding + ((p.timestamp - minTime) / timeRange) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (p.value / maxValue) * (chartHeight - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [filteredData, chartHeight, chartWidth, padding]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          👁️ Viewers
        </h3>
        <div className="flex gap-1">
          {TIME_WINDOWS.map(tw => (
            <button
              key={tw.value}
              onClick={() => onTimeWindowChange(tw.value)}
              className={`px-2 py-1 text-xs rounded ${
                timeWindow === tw.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.current}</div>
            <div className="text-xs text-gray-400">Actual</div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.max}</div>
            <div className="text-xs text-gray-400">Máximo</div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.avg}</div>
            <div className="text-xs text-gray-400">Promedio</div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.min}</div>
            <div className="text-xs text-gray-400">Mínimo</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {filteredData.length > 1 ? (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <g className="text-gray-600">
              {[0, 25, 50, 75, 100].map(pct => (
                <line
                  key={pct}
                  x1={padding}
                  y1={chartHeight - padding - (pct / 100) * (chartHeight - padding * 2)}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding - (pct / 100) * (chartHeight - padding * 2)}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeDasharray="4"
                />
              ))}
            </g>

            {/* Area fill */}
            <path
              d={`${pathData} L ${chartWidth - padding},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
              fill="url(#viewersGradient)"
              opacity="0.3"
            />

            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#9333ea"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="viewersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            Sin datos suficientes
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewersChart;
