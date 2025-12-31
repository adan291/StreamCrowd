/**
 * PredictionHistory - Component for displaying past Twitch predictions
 * 
 * Shows a list of past predictions with:
 * - Title and winning outcome
 * - Total participants and points
 * - Expandable details for each prediction
 * 
 * @requirements 3.1, 3.2, 3.4 - Display history with statistics and details
 */

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  XCircle, 
  Users, 
  Coins, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Clock,
  History as HistoryIcon
} from 'lucide-react';
import { useI18n } from '../i18n';
import type { TwitchPrediction, TwitchOutcome } from '../types/twitch';

// ============================================
// Types
// ============================================

export interface PredictionHistoryProps {
  predictions: TwitchPrediction[];
  onSelectPrediction?: (prediction: TwitchPrediction) => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format channel points with K/M suffix for large numbers
 */
function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toLocaleString();
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate total points from outcomes
 */
function getTotalPoints(outcomes: TwitchOutcome[]): number {
  return outcomes.reduce((sum, o) => sum + o.channel_points, 0);
}

/**
 * Calculate total users from outcomes
 */
function getTotalUsers(outcomes: TwitchOutcome[]): number {
  return outcomes.reduce((sum, o) => sum + o.users, 0);
}

/**
 * Get winning outcome from prediction
 */
function getWinningOutcome(prediction: TwitchPrediction): TwitchOutcome | null {
  if (!prediction.winning_outcome_id) return null;
  return prediction.outcomes.find(o => o.id === prediction.winning_outcome_id) || null;
}

/**
 * Calculate percentage of total points for an outcome
 */
function calculatePercentage(outcome: TwitchOutcome, totalPoints: number): number {
  if (totalPoints === 0) return 0;
  return Math.round((outcome.channel_points / totalPoints) * 100);
}

// ============================================
// Sub-Components
// ============================================

interface PredictionCardProps {
  prediction: TwitchPrediction;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  isExpanded,
  onToggle,
  onSelect,
}) => {
  const winningOutcome = getWinningOutcome(prediction);
  const totalPoints = getTotalPoints(prediction.outcomes);
  const totalUsers = getTotalUsers(prediction.outcomes);
  const isResolved = prediction.status === 'RESOLVED';
  const isCanceled = prediction.status === 'CANCELED';

  return (
    <div 
      className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all ${
        isExpanded 
          ? 'border-twitch-brand shadow-lg' 
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
      }`}
    >
      {/* Card Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        {/* Status Icon */}
        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isResolved 
            ? 'bg-green-500/10 text-green-500' 
            : 'bg-red-500/10 text-red-500'
        }`}>
          {isResolved ? <Trophy size={20} /> : <XCircle size={20} />}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate">
                {prediction.title}
              </h4>
              {isResolved && winningOutcome && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                  <Trophy size={10} />
                  {winningOutcome.title}
                </p>
              )}
              {isCanceled && (
                <p className="text-xs text-red-500 mt-0.5">
                  Cancelada - Puntos reembolsados
                </p>
              )}
            </div>
            <div className="shrink-0 text-zinc-400">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(prediction.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {totalUsers.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Coins size={12} />
              {formatPoints(totalPoints)}
            </span>
          </div>
        </div>
      </button>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700 pt-3 animate-fade-in-down">
          {/* Outcomes List */}
          <div className="space-y-2">
            {prediction.outcomes.map((outcome) => {
              const percentage = calculatePercentage(outcome, totalPoints);
              const isWinner = prediction.winning_outcome_id === outcome.id;
              const colorClass = outcome.color === 'BLUE' ? 'bg-blue-500' : 'bg-pink-500';
              
              return (
                <div 
                  key={outcome.id}
                  className={`relative rounded-lg p-3 ${
                    isWinner 
                      ? 'bg-yellow-500/10 border border-yellow-500/30' 
                      : 'bg-zinc-50 dark:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                      <span className={`text-sm font-medium ${
                        isWinner 
                          ? 'text-yellow-700 dark:text-yellow-400' 
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {outcome.title}
                      </span>
                      {isWinner && (
                        <Trophy size={14} className="text-yellow-500" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {percentage}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full ${colorClass} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {/* Outcome Stats */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {outcome.users.toLocaleString()} votantes
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins size={10} />
                      {formatPoints(outcome.channel_points)} puntos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Additional Info */}
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Duración: {Math.floor(prediction.prediction_window / 60)} min
            </span>
            {prediction.ended_at && (
              <span>
                Finalizada: {formatDate(prediction.ended_at)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  predictions,
  onSelectPrediction,
}) => {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort predictions by date (newest first)
  const sortedPredictions = useMemo(() => 
    [...predictions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [predictions]
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const resolved = predictions.filter(p => p.status === 'RESOLVED').length;
    const canceled = predictions.filter(p => p.status === 'CANCELED').length;
    const totalParticipants = predictions.reduce((sum, p) => 
      sum + getTotalUsers(p.outcomes), 0
    );
    const totalPoints = predictions.reduce((sum, p) => 
      sum + getTotalPoints(p.outcomes), 0
    );
    
    return { resolved, canceled, totalParticipants, totalPoints };
  }, [predictions]);

  const toggleExpanded = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <HistoryIcon size={24} className="text-zinc-400" />
        </div>
        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Sin historial
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Las predicciones pasadas aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {predictions.length}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.resolved}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Resueltas</p>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {stats.totalParticipants.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Participantes</p>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {formatPoints(stats.totalPoints)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Puntos</p>
        </div>
      </div>

      {/* Predictions List */}
      <div className="space-y-2">
        {sortedPredictions.map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            isExpanded={expandedId === prediction.id}
            onToggle={() => toggleExpanded(prediction.id)}
            onSelect={onSelectPrediction ? () => onSelectPrediction(prediction) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default PredictionHistory;
