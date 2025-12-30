/**
 * ActivePrediction - Component for displaying and managing an active Twitch prediction
 * 
 * Shows real-time prediction data including:
 * - Outcomes with vote counts and channel points
 * - Top predictors for each outcome
 * - Action buttons (Lock, Resolve, Cancel) based on prediction status
 * 
 * @requirements 1.3, 1.4, 2.1, 2.6 - Display active prediction with real-time data and controls
 */

import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Trophy, 
  XCircle, 
  Users, 
  Coins, 
  Clock, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Crown
} from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import type { TwitchPrediction, TwitchOutcome, PredictionStatus } from '../types/twitch';

// ============================================
// Types
// ============================================

export interface ActivePredictionProps {
  prediction: TwitchPrediction;
  onLock: () => Promise<void>;
  onResolve: (outcomeId: string) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
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
 * Calculate percentage of total points for an outcome
 */
function calculatePercentage(outcome: TwitchOutcome, totalPoints: number): number {
  if (totalPoints === 0) return 0;
  return Math.round((outcome.channel_points / totalPoints) * 100);
}

/**
 * Get time remaining in prediction window
 */
function getTimeRemaining(prediction: TwitchPrediction): number {
  const createdAt = new Date(prediction.created_at).getTime();
  const windowMs = prediction.prediction_window * 1000;
  const endTime = createdAt + windowMs;
  const remaining = Math.max(0, endTime - Date.now());
  return Math.ceil(remaining / 1000);
}

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get status display info
 */
function getStatusInfo(status: PredictionStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Activa', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    case 'LOCKED':
      return { label: 'Bloqueada', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    case 'RESOLVED':
      return { label: 'Resuelta', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    case 'CANCELED':
      return { label: 'Cancelada', color: 'text-red-500', bgColor: 'bg-red-500/10' };
    default:
      return { label: status, color: 'text-zinc-500', bgColor: 'bg-zinc-500/10' };
  }
}

// ============================================
// Sub-Components
// ============================================

interface OutcomeCardProps {
  outcome: TwitchOutcome;
  totalPoints: number;
  isWinner: boolean;
  canResolve: boolean;
  onResolve: () => void;
  isLoading: boolean;
  showTopPredictors: boolean;
  onTogglePredictors: () => void;
}

const OutcomeCard: React.FC<OutcomeCardProps> = ({
  outcome,
  totalPoints,
  isWinner,
  canResolve,
  onResolve,
  isLoading,
  showTopPredictors,
  onTogglePredictors,
}) => {
  const percentage = calculatePercentage(outcome, totalPoints);
  const colorClass = outcome.color === 'BLUE' ? 'bg-blue-500' : 'bg-pink-500';
  const borderClass = outcome.color === 'BLUE' ? 'border-blue-500' : 'border-pink-500';
  
  return (
    <div 
      className={`relative bg-white dark:bg-zinc-900 rounded-xl border-2 transition-all ${
        isWinner 
          ? 'border-yellow-400 ring-2 ring-yellow-400/30' 
          : `border-zinc-200 dark:border-zinc-700 hover:${borderClass}`
      }`}
    >
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
          <Trophy size={12} />
          Ganador
        </div>
      )}
      
      <div className="p-4">
        {/* Outcome Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
            <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
              {outcome.title}
            </h4>
          </div>
          {canResolve && (
            <Tooltip text="Seleccionar como ganador">
              <button
                onClick={onResolve}
                disabled={isLoading}
                className="text-zinc-400 hover:text-yellow-500 disabled:opacity-50 p-1 rounded-lg hover:bg-yellow-500/10 transition-colors"
                aria-label={`Seleccionar ${outcome.title} como ganador`}
              >
                <Trophy size={18} />
              </button>
            </Tooltip>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full ${colorClass} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Users size={14} />
              {outcome.users.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Coins size={14} />
              {formatPoints(outcome.channel_points)}
            </span>
          </div>
          <span className="font-bold text-zinc-900 dark:text-white">
            {percentage}%
          </span>
        </div>
        
        {/* Top Predictors Toggle */}
        {outcome.top_predictors && outcome.top_predictors.length > 0 && (
          <button
            onClick={onTogglePredictors}
            className="w-full mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-twitch-brand transition-colors"
          >
            <Crown size={12} />
            Top Predictors
            {showTopPredictors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        
        {/* Top Predictors List */}
        {showTopPredictors && outcome.top_predictors && outcome.top_predictors.length > 0 && (
          <div className="mt-2 space-y-1.5 animate-fade-in-down">
            {outcome.top_predictors.slice(0, 5).map((predictor, index) => (
              <div 
                key={predictor.user_id}
                className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-zinc-300 text-zinc-700' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">
                    {predictor.user_name}
                  </span>
                </div>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatPoints(predictor.channel_points_used)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const ActivePrediction: React.FC<ActivePredictionProps> = ({
  prediction,
  onLock,
  onResolve,
  onCancel,
  isLoading,
}) => {
  const { t } = useI18n();
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(prediction));

  // Update time remaining every second for ACTIVE predictions
  React.useEffect(() => {
    if (prediction.status !== 'ACTIVE') return;
    
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(prediction));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [prediction]);

  // Calculate totals
  const totalPoints = useMemo(() => 
    prediction.outcomes.reduce((sum, o) => sum + o.channel_points, 0),
    [prediction.outcomes]
  );
  
  const totalUsers = useMemo(() => 
    prediction.outcomes.reduce((sum, o) => sum + o.users, 0),
    [prediction.outcomes]
  );

  // Status info
  const statusInfo = getStatusInfo(prediction.status);
  
  // Determine available actions based on status
  const canLock = prediction.status === 'ACTIVE';
  const canResolve = prediction.status === 'ACTIVE' || prediction.status === 'LOCKED';
  const canCancel = prediction.status === 'ACTIVE' || prediction.status === 'LOCKED';

  // Toggle top predictors visibility
  const togglePredictors = (outcomeId: string) => {
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(outcomeId)) {
        next.delete(outcomeId);
      } else {
        next.add(outcomeId);
      }
      return next;
    });
  };

  // Handle cancel with confirmation
  const handleCancel = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 3000);
      return;
    }
    setConfirmCancel(false);
    await onCancel();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
              {statusInfo.label}
            </span>
            {prediction.status === 'ACTIVE' && timeRemaining > 0 && (
              <span className={`flex items-center gap-1 text-xs font-medium ${
                timeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                <Clock size={12} />
                {formatTime(timeRemaining)}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
            {prediction.title}
          </h3>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Users size={16} />
            <span className="font-medium">{totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Coins size={16} />
            <span className="font-medium">{formatPoints(totalPoints)}</span>
          </div>
        </div>
      </div>

      {/* Outcomes Grid */}
      <div className={`grid gap-3 ${
        prediction.outcomes.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 
        prediction.outcomes.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {prediction.outcomes.map((outcome) => (
          <OutcomeCard
            key={outcome.id}
            outcome={outcome}
            totalPoints={totalPoints}
            isWinner={prediction.winning_outcome_id === outcome.id}
            canResolve={canResolve}
            onResolve={() => onResolve(outcome.id)}
            isLoading={isLoading}
            showTopPredictors={expandedOutcomes.has(outcome.id)}
            onTogglePredictors={() => togglePredictors(outcome.id)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      {(canLock || canResolve || canCancel) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          {canLock && (
            <Button
              variant="secondary"
              onClick={onLock}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Lock size={16} className="mr-2" />
              )}
              Bloquear
            </Button>
          )}
          
          {canCancel && (
            <Button
              variant={confirmCancel ? 'danger' : 'ghost'}
              onClick={handleCancel}
              disabled={isLoading}
              className={`flex-1 sm:flex-none ${confirmCancel ? 'animate-pulse' : ''}`}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <XCircle size={16} className="mr-2" />
              )}
              {confirmCancel ? '¿Confirmar cancelar?' : 'Cancelar'}
            </Button>
          )}
        </div>
      )}

      {/* Resolved/Canceled Message */}
      {prediction.status === 'RESOLVED' && prediction.winning_outcome_id && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
            <Trophy size={16} />
            Predicción resuelta - Ganador: {
              prediction.outcomes.find(o => o.id === prediction.winning_outcome_id)?.title
            }
          </p>
        </div>
      )}
      
      {prediction.status === 'CANCELED' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
            <XCircle size={16} />
            Predicción cancelada - Puntos reembolsados
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivePrediction;
