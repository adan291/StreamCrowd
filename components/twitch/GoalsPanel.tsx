/**
 * GoalsPanel - Panel para gestionar objetivos de canal (Goals)
 * 
 * Permite ver y gestionar objetivos de seguidores, suscriptores y bits.
 * 
 * @requirements 9.3, 9.4 - Channel Goals management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Target, Users, Star, Gem, Plus, Trash2, RefreshCw, TrendingUp, Lock, AlertTriangle } from 'lucide-react';
import { getTwitchAdapter, ChannelGoal } from '../../src/infrastructure/adapters/TwitchAdapter';
import { useI18n } from '../../i18n';

interface GoalsPanelProps {
  token: string;
  broadcasterId: string;
  isOwnChannel: boolean;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type GoalType = ChannelGoal['type'];

const GOAL_TYPE_CONFIG: Record<GoalType, { icon: React.ReactNode; label: string; color: string }> = {
  follower: { icon: <Users className="w-4 h-4" />, label: 'Seguidores', color: 'text-blue-400' },
  subscription: { icon: <Star className="w-4 h-4" />, label: 'Suscripciones', color: 'text-purple-400' },
  subscription_count: { icon: <Star className="w-4 h-4" />, label: 'Total Subs', color: 'text-purple-400' },
  new_subscription: { icon: <Star className="w-4 h-4" />, label: 'Nuevas Subs', color: 'text-green-400' },
  new_subscription_count: { icon: <Star className="w-4 h-4" />, label: 'Nuevas Subs (Total)', color: 'text-green-400' },
};

export const GoalsPanel: React.FC<GoalsPanelProps> = ({
  token,
  broadcasterId,
  isOwnChannel,
  onNotification,
}) => {
  const { t } = useI18n();
  const [goals, setGoals] = useState<ChannelGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const adapter = getTwitchAdapter();

  const fetchGoals = useCallback(async () => {
    if (!token || !broadcasterId) {
      setNeedsAuth(true);
      return;
    }
    
    // Don't fetch if we already know we need auth
    if (needsAuth) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGoals = await adapter.getChannelGoals(token, broadcasterId);
      if (fetchedGoals) {
        setGoals(fetchedGoals);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.status === 401) {
        setNeedsAuth(true);
        setError('Se requieren permisos adicionales para ver objetivos del canal.');
      } else {
        setError('Error al cargar objetivos');
        onNotification?.('Error al cargar objetivos', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, broadcasterId, adapter, onNotification, needsAuth]);

  useEffect(() => {
    if (!needsAuth) {
      fetchGoals();
    }
    
    // Subscribe to goal progress updates
    const unsubscribe = adapter.onGoalProgress((updatedGoal) => {
      setGoals(prev => {
        const index = prev.findIndex(g => g.id === updatedGoal.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedGoal;
          return updated;
        }
        return prev;
      });
    });

    // Poll for updates every 60 seconds (only if we have auth)
    const interval = !needsAuth ? setInterval(fetchGoals, 60000) : null;

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [adapter, token, broadcasterId]); // Remove fetchGoals to avoid loop

  const getProgressPercentage = (goal: ChannelGoal): number => {
    if (goal.targetAmount === 0) return 0;
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-purple-500';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Objetivos del Canal</h3>
        </div>
        <button
          onClick={fetchGoals}
          disabled={isLoading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Authorization Required Message */}
      {needsAuth && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Permisos adicionales requeridos</p>
              <p className="text-yellow-400/70 text-sm mt-1">
                Para ver objetivos del canal, necesitas reconectar tu cuenta de Twitch con el scope <code className="bg-yellow-500/20 px-1 rounded">channel:read:goals</code>.
              </p>
              <p className="text-yellow-400/60 text-xs mt-2">
                Ve a Configuración → Conexiones y reconecta tu cuenta de Twitch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !needsAuth && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Goals List */}
      {!needsAuth && goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map((goal) => {
            const config = GOAL_TYPE_CONFIG[goal.type];
            const percentage = getProgressPercentage(goal);
            const isComplete = percentage >= 100;

            return (
              <div 
                key={goal.id}
                className={`p-4 rounded-xl border transition-all ${
                  isComplete 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <div>
                      <span className="text-sm text-gray-400">{config.label}</span>
                      {goal.description && (
                        <p className="text-white font-medium">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  {isComplete && (
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      ¡Completado!
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progreso</span>
                    <span className="text-white font-medium">
                      {formatNumber(goal.currentAmount)} / {formatNumber(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {percentage.toFixed(1)}% completado
                    </span>
                    {!isComplete && (
                      <span className="text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Faltan {formatNumber(goal.targetAmount - goal.currentAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Created Date */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-xs text-gray-500">
                    Creado el {goal.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : !needsAuth && !error ? (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
          <Target className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No hay objetivos activos</p>
          <p className="text-gray-500 text-sm mt-1">
            {isOwnChannel 
              ? 'Crea objetivos desde el panel de Twitch para motivar a tu comunidad'
              : 'El streamer no tiene objetivos activos en este momento'
            }
          </p>
        </div>
      ) : null}

      {/* Info Note */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-blue-400 text-sm">
          💡 Los objetivos se gestionan desde el panel de creador de Twitch. 
          Aquí puedes ver el progreso en tiempo real.
        </p>
      </div>
    </div>
  );
};

export default GoalsPanel;
