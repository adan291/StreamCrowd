/**
 * PredictionHistoryPanel Component
 * History panel specifically for predictions using GenericHistoryPanel
 * Shows prediction history with title, outcomes, points, and status
 */

import React, { useMemo } from 'react';
import { Trophy, Users, Coins, CheckCircle, XCircle, Clock } from 'lucide-react';
import { GenericHistoryPanel, type HistoryPanelConfig } from '../ui/GenericHistoryPanel';
import type { BaseHistoryItem } from '../../hooks/useActivityHistory';
import type { TwitchPrediction } from '../../types/twitch';

// ============================================
// TYPES
// ============================================

export interface PredictionHistoryItem extends BaseHistoryItem {
  title: string;
  outcomes: {
    id: string;
    title: string;
    users: number;
    channelPoints: number;
    color: 'BLUE' | 'PINK';
    percentage: number;
  }[];
  status: 'RESOLVED' | 'CANCELED' | 'LOCKED';
  winningOutcomeId?: string;
  winningOutcomeTitle?: string;
  totalUsers: number;
  totalPoints: number;
  predictionWindow: number;
}

export interface PredictionHistoryPanelProps {
  predictions: TwitchPrediction[];
  className?: string;
  maxHeight?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert TwitchPrediction to PredictionHistoryItem format
 */
function predictionToHistoryItem(prediction: TwitchPrediction): PredictionHistoryItem {
  const totalUsers = prediction.outcomes.reduce((sum, o) => sum + o.users, 0);
  const totalPoints = prediction.outcomes.reduce((sum, o) => sum + o.channel_points, 0);
  
  const winningOutcome = prediction.winning_outcome_id 
    ? prediction.outcomes.find(o => o.id === prediction.winning_outcome_id)
    : null;
  
  return {
    id: prediction.id,
    name: prediction.title,
    type: 'prediction',
    result: winningOutcome?.title || (prediction.status === 'CANCELED' ? 'Cancelada' : 'Sin resolver'),
    participantCount: totalUsers,
    createdAt: new Date(prediction.created_at).getTime(),
    finishedAt: prediction.ended_at 
      ? new Date(prediction.ended_at).getTime() 
      : new Date(prediction.created_at).getTime() + prediction.prediction_window * 1000,
    title: prediction.title,
    outcomes: prediction.outcomes.map(o => ({
      id: o.id,
      title: o.title,
      users: o.users,
      channelPoints: o.channel_points,
      color: o.color,
      percentage: totalPoints > 0 ? (o.channel_points / totalPoints) * 100 : 0,
    })),
    status: prediction.status as 'RESOLVED' | 'CANCELED' | 'LOCKED',
    winningOutcomeId: prediction.winning_outcome_id,
    winningOutcomeTitle: winningOutcome?.title,
    totalUsers,
    totalPoints,
    predictionWindow: prediction.prediction_window,
  };
}

/**
 * Format channel points number
 */
function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

// ============================================
// COMPONENT
// ============================================

export const PredictionHistoryPanel: React.FC<PredictionHistoryPanelProps> = ({
  predictions,
  className = '',
  maxHeight = '400px',
}) => {
  // Convert predictions to history items
  const historyItems = useMemo(() => {
    return predictions
      .filter(p => p.status === 'RESOLVED' || p.status === 'CANCELED')
      .map(predictionToHistoryItem)
      .sort((a, b) => b.finishedAt - a.finishedAt);
  }, [predictions]);

  // Config for GenericHistoryPanel
  const config: HistoryPanelConfig<PredictionHistoryItem> = useMemo(() => ({
    activityType: 'prediction',
    title: 'Historial de Predicciones',
    labels: {
      result: 'Ganador',
      participants: 'Participantes',
    },
    accentColor: 'blue',
    
    // Custom render for item details
    renderItemDetails: (item) => (
      <>
        {item.status === 'RESOLVED' ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle size={12} /> {item.winningOutcomeTitle}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <XCircle size={12} /> Cancelada
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Users size={12} /> {item.totalUsers}
        </span>
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <Coins size={12} /> {formatPoints(item.totalPoints)}
        </span>
      </>
    ),
    
    // Custom render for expanded content
    renderExpandedContent: (item) => (
      <div className="space-y-2">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">{item.title}</p>
        
        {/* Outcomes breakdown */}
        <div className="space-y-1.5">
          {item.outcomes.map((outcome) => {
            const isWinner = outcome.id === item.winningOutcomeId;
            
            return (
              <div 
                key={outcome.id} 
                className={`flex items-center gap-2 p-1.5 rounded ${
                  isWinner ? 'bg-green-500/10 border border-green-500/20' : ''
                }`}
              >
                <div 
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    outcome.color === 'BLUE' ? 'bg-blue-500' : 'bg-pink-500'
                  }`}
                />
                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                  {outcome.title}
                </span>
                {isWinner && (
                  <Trophy size={12} className="text-yellow-500 shrink-0" />
                )}
                <span className="text-zinc-500 tabular-nums text-xs">
                  {outcome.users} ({outcome.percentage.toFixed(1)}%)
                </span>
                <span className="text-amber-600 tabular-nums text-xs">
                  {formatPoints(outcome.channelPoints)}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <span className="text-zinc-500 text-xs">
            Total: <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.totalUsers}</span> usuarios
          </span>
          <span className="text-zinc-500 text-xs">
            Puntos: <span className="font-medium text-amber-600">{formatPoints(item.totalPoints)}</span>
          </span>
          <span className="text-zinc-500 text-xs flex items-center gap-1">
            <Clock size={10} /> {Math.floor(item.predictionWindow / 60)}min
          </span>
        </div>
      </div>
    ),
    
    exportFields: ['id', 'name', 'result', 'participantCount', 'createdAt', 'finishedAt'],
  }), []);

  return (
    <GenericHistoryPanel
      items={historyItems}
      config={config}
      className={className}
      maxHeight={maxHeight}
    />
  );
};

export default PredictionHistoryPanel;
