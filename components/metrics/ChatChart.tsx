// ChatChart - Chat messages per minute chart

import React, { useMemo } from 'react';
import { TimeSeries, TimeWindow } from '../../types/metrics';

interface ChatChartProps {
  data: TimeSeries | undefined;
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

export const ChatChart: React.FC<ChatChartProps> = ({
  data,
  timeWindow,
  onTimeWindowChange,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    if (!data || data.points.length === 0) {
      return { total: 0, perMinute: 0, peak: 0 };
    }

    const values = data.points.map(p => p.value);
    const total = values.reduce((a, b) => a + b, 0);
    const peak = Math.max(...values);
    
    // Calculate messages per minute
    const timeRange = data.points.length > 1
      ? (data.points[data.points.length - 1].timestamp - data.points[0].timestamp) / 60000
      : 1;
    const perMinute = Math.round(total / Math.max(timeRange, 1));

    return { total, perMinute, peak };
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

  // Chart dimensions
  const chartHeight = 150;
  const barWidth = 8;
  const gap = 2;

  // Calculate bar heights
  const bars = useMemo(() => {
    if (filteredData.length === 0) return [];

    const maxValue = Math.max(...filteredData.map(p => p.value), 1);
    
    return filteredData.map((p, i) => ({
      x: i * (barWidth + gap),
      height: (p.value / maxValue) * (chartHeight - 20),
      value: p.value,
    }));
  }, [filteredData, chartHeight, barWidth, gap]);

  const chartWidth = bars.length * (barWidth + gap);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          💬 Chat
        </h3>
        <div className="flex gap-1">
          {TIME_WINDOWS.map(tw => (
            <button
              key={tw.value}
              onClick={() => onTimeWindowChange(tw.value)}
              className={`px-2 py-1 text-xs rounded ${
                timeWindow === tw.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-700 rounded p-2 text-center">
          <div className="text-xl font-bold text-blue-400">{stats.total.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-gray-700 rounded p-2 text-center">
          <div className="text-xl font-bold text-green-400">{stats.perMinute}</div>
          <div className="text-xs text-gray-400">Por minuto</div>
        </div>
        <div className="bg-gray-700 rounded p-2 text-center">
          <div className="text-xl font-bold text-yellow-400">{stats.peak}</div>
          <div className="text-xs text-gray-400">Pico</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="overflow-x-auto">
        {bars.length > 0 ? (
          <svg
            width={Math.max(chartWidth, 300)}
            height={chartHeight}
            className="min-w-full"
          >
            {bars.map((bar, i) => (
              <g key={i}>
                <rect
                  x={bar.x}
                  y={chartHeight - bar.height - 10}
                  width={barWidth}
                  height={bar.height}
                  fill="#3b82f6"
                  rx="2"
                  className="hover:fill-blue-400 transition-colors"
                />
              </g>
            ))}
          </svg>
        ) : (
          <div className="h-36 flex items-center justify-center text-gray-500">
            Sin datos de chat
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatChart;
