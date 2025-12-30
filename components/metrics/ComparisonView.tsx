// ComparisonView - Compare multiple sessions side by side

import React from 'react';
import { SessionComparison, MetricType } from '../../types/metrics';

interface ComparisonViewProps {
  comparison: SessionComparison;
  onClose: () => void;
}

const METRIC_LABELS: Record<MetricType, { label: string; icon: string }> = {
  viewers: { label: 'Peak Viewers', icon: '👁️' },
  chat_messages: { label: 'Mensajes', icon: '💬' },
  poll_participation: { label: 'Participación Polls', icon: '📊' },
  prediction_participation: { label: 'Participación Predictions', icon: '🎯' },
  followers: { label: 'Nuevos Followers', icon: '👥' },
  subscribers: { label: 'Nuevos Subs', icon: '⭐' },
  bits: { label: 'Bits', icon: '💎' },
  raids: { label: 'Raids', icon: '🚀' },
};

const getChangeColor = (change: number): string => {
  if (change > 10) return 'text-green-400';
  if (change < -10) return 'text-red-400';
  return 'text-gray-400';
};

const formatChange = (change: number): string => {
  if (change === 0) return '-';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  comparison,
  onClose,
}) => {
  const { sessions, differences, highlights } = comparison;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">📊 Comparación de Sesiones</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Session headers */}
        <div className="p-4 border-b border-gray-700">
          <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${sessions.length}, 1fr)` }}>
            <div className="text-gray-500 text-sm">Métrica</div>
            {sessions.map((session, i) => (
              <div key={session.id} className="text-center">
                <div className="text-white font-semibold">{session.channelName}</div>
                <div className="text-gray-400 text-xs">
                  {new Date(session.startTime).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">
                  Sesión {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics comparison */}
        <div className="p-4">
          {differences.map(diff => {
            const metricInfo = METRIC_LABELS[diff.metric] || { label: diff.metric, icon: '📈' };
            
            return (
              <div
                key={diff.metric}
                className="grid gap-4 py-3 border-b border-gray-800"
                style={{ gridTemplateColumns: `200px repeat(${sessions.length}, 1fr)` }}
              >
                <div className="flex items-center gap-2 text-gray-300">
                  <span>{metricInfo.icon}</span>
                  <span>{metricInfo.label}</span>
                </div>
                {diff.values.map((value, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xl font-bold text-white">
                      {value.toLocaleString()}
                    </div>
                    {i > 0 && (
                      <div className={`text-sm ${getChangeColor(diff.percentChanges[i])}`}>
                        {formatChange(diff.percentChanges[i])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-white font-semibold mb-3">💡 Destacados</h3>
            <div className="space-y-2">
              {highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-gray-300 bg-gray-800 rounded p-2"
                >
                  <span className="text-yellow-400">•</span>
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual comparison chart */}
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-white font-semibold mb-3">📈 Comparación Visual</h3>
          <div className="space-y-4">
            {differences.slice(0, 4).map(diff => {
              const metricInfo = METRIC_LABELS[diff.metric] || { label: diff.metric, icon: '📈' };
              const maxValue = Math.max(...diff.values, 1);
              
              return (
                <div key={diff.metric}>
                  <div className="text-gray-400 text-sm mb-1">
                    {metricInfo.icon} {metricInfo.label}
                  </div>
                  <div className="space-y-1">
                    {diff.values.map((value, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">S{i + 1}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              i === 0 ? 'bg-purple-500' :
                              i === 1 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(value / maxValue) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">
                          {value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
