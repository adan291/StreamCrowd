// InsightsPanel - Display and manage session insights

import React from 'react';
import { useInsights } from '../../hooks/useInsights';
import { Insight, InsightType } from '../../types/metrics';

interface InsightsPanelProps {
  sessionId: string;
}

const INSIGHT_ICONS: Record<InsightType, string> = {
  peak_correlation: '📈',
  engagement_trend: '📊',
  optimal_time: '⏰',
  chatter_retention: '👥',
  growth_pattern: '🌱',
  comparison_highlight: '🔍',
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  peak_correlation: 'border-purple-500 bg-purple-500/10',
  engagement_trend: 'border-blue-500 bg-blue-500/10',
  optimal_time: 'border-green-500 bg-green-500/10',
  chatter_retention: 'border-yellow-500 bg-yellow-500/10',
  growth_pattern: 'border-pink-500 bg-pink-500/10',
  comparison_highlight: 'border-orange-500 bg-orange-500/10',
};

interface InsightCardProps {
  insight: Insight;
  onFeedback: (feedback: 'useful' | 'not_useful') => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onFeedback }) => {
  const icon = INSIGHT_ICONS[insight.type] || '💡';
  const colorClass = INSIGHT_COLORS[insight.type] || 'border-gray-500 bg-gray-500/10';

  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="text-white font-semibold">{insight.title}</h4>
            <p className="text-gray-300 text-sm mt-1">{insight.description}</p>
            {insight.suggestedAction && (
              <p className="text-purple-400 text-sm mt-2">
                💡 {insight.suggestedAction}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {Math.round(insight.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Feedback buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-500">¿Fue útil?</span>
        <button
          onClick={() => onFeedback('useful')}
          className={`px-2 py-1 rounded text-xs ${
            insight.feedback === 'useful'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          👍 Sí
        </button>
        <button
          onClick={() => onFeedback('not_useful')}
          className={`px-2 py-1 rounded text-xs ${
            insight.feedback === 'not_useful'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          👎 No
        </button>
      </div>
    </div>
  );
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ sessionId }) => {
  const { insights, isLoading, error, loadInsights, generateInsights, provideFeedback } = useInsights();

  React.useEffect(() => {
    loadInsights(sessionId);
  }, [sessionId, loadInsights]);

  // Sort insights by confidence
  const sortedInsights = [...insights].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          💡 Insights
        </h3>
        <button
          onClick={() => generateInsights(sessionId)}
          disabled={isLoading}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50"
        >
          {isLoading ? 'Generando...' : '🔄 Regenerar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p>Analizando sesión...</p>
        </div>
      ) : sortedInsights.length > 0 ? (
        <div className="space-y-3">
          {sortedInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onFeedback={(feedback) => provideFeedback(insight.id, feedback)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p>No hay insights disponibles</p>
          <p className="text-sm">Genera insights para obtener recomendaciones</p>
        </div>
      )}

      {/* Summary */}
      {sortedInsights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{sortedInsights.length} insights generados</span>
            <span>
              {sortedInsights.filter(i => i.feedback === 'useful').length} útiles •{' '}
              {sortedInsights.filter(i => i.feedback === 'not_useful').length} no útiles
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
