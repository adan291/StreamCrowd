/**
 * HypeTrainPanel - Panel para mostrar eventos de Hype Train en tiempo real
 * 
 * Muestra el progreso del Hype Train actual, nivel, contribuciones y top contributors.
 * 
 * @requirements 9.1, 9.2 - Hype Train events display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, Users, Clock, Trophy, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { getTwitchAdapter, HypeTrainEvent, HypeTrainContribution } from '../../src/infrastructure/adapters/TwitchAdapter';
import { useI18n } from '../../i18n';

interface HypeTrainPanelProps {
  token: string;
  broadcasterId: string;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const HypeTrainPanel: React.FC<HypeTrainPanelProps> = ({
  token,
  broadcasterId,
  onNotification,
}) => {
  const { t } = useI18n();
  const [hypeTrainEvents, setHypeTrainEvents] = useState<HypeTrainEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeHypeTrain, setActiveHypeTrain] = useState<HypeTrainEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const adapter = getTwitchAdapter();

  const fetchHypeTrainEvents = useCallback(async () => {
    if (!token || !broadcasterId) {
      setNeedsAuth(true);
      return;
    }
    
    // Don't fetch if we already know we need auth
    if (needsAuth) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const events = await adapter.getHypeTrainEvents(token, broadcasterId);
      if (events) {
        setHypeTrainEvents(events);
        const active = events.find(e => e.isActive);
        setActiveHypeTrain(active || null);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Error fetching Hype Train events:', err);
      // Check if it's an authorization error
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.status === 401) {
        setNeedsAuth(true);
        setError('Se requieren permisos adicionales para ver eventos de Hype Train. Reconecta tu cuenta de Twitch con los scopes necesarios.');
      } else {
        setError('Error al cargar eventos de Hype Train');
        onNotification?.('Error al cargar eventos de Hype Train', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, broadcasterId, adapter, onNotification, needsAuth]);

  useEffect(() => {
    // Only fetch if we don't already need auth
    if (!needsAuth) {
      fetchHypeTrainEvents();
    }
    
    // Subscribe to real-time Hype Train events
    const unsubscribe = adapter.onHypeTrain((event) => {
      setActiveHypeTrain(event.isActive ? event : null);
      setHypeTrainEvents(prev => {
        const existing = prev.findIndex(e => e.id === event.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event;
          return updated;
        }
        return [event, ...prev].slice(0, 5);
      });
    });

    // Poll for updates every 30 seconds (only if we have auth)
    const interval = !needsAuth ? setInterval(fetchHypeTrainEvents, 30000) : null;

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [adapter, token, broadcasterId]); // Remove fetchHypeTrainEvents to avoid loop

  const getProgressPercentage = (event: HypeTrainEvent): number => {
    if (event.goal === 0) return 0;
    return Math.min(100, (event.total / event.goal) * 100);
  };

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Finalizado';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getContributionIcon = (type: string): string => {
    switch (type) {
      case 'bits': return '💎';
      case 'subscription': return '⭐';
      default: return '🎁';
    }
  };

  const getLevelColor = (level: number): string => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-orange-500 to-orange-600',
      'from-red-500 to-red-600',
    ];
    return colors[Math.min(level - 1, colors.length - 1)] || colors[0];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Hype Train</h3>
        </div>
        <button
          onClick={fetchHypeTrainEvents}
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
                Para ver eventos de Hype Train, necesitas reconectar tu cuenta de Twitch con el scope <code className="bg-yellow-500/20 px-1 rounded">channel:read:hype_train</code>.
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

      {/* Active Hype Train */}
      {!needsAuth && activeHypeTrain ? (
        <div className={`p-4 rounded-xl bg-gradient-to-r ${getLevelColor(activeHypeTrain.level)} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10">
            {/* Level and Progress */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">Nivel {activeHypeTrain.level}</span>
                <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <div className="flex items-center gap-1 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTimeRemaining(activeHypeTrain.expiresAt)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{activeHypeTrain.total.toLocaleString()} puntos</span>
                <span>{activeHypeTrain.goal.toLocaleString()} para nivel {activeHypeTrain.level + 1}</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/90 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(activeHypeTrain)}%` }}
                />
              </div>
            </div>

            {/* Top Contributors */}
            {activeHypeTrain.topContributions.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-1 text-white/80 text-sm mb-2">
                  <Trophy className="w-4 h-4" />
                  <span>Top Contribuidores</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeHypeTrain.topContributions.slice(0, 3).map((contrib, index) => (
                    <div 
                      key={contrib.userId}
                      className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-full"
                    >
                      <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                      <span className="text-white font-medium">{contrib.userName}</span>
                      <span className="text-white/70">
                        {getContributionIcon(contrib.type)} {contrib.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Contribution */}
            {activeHypeTrain.lastContribution && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Última contribución:</span>
                  <span className="font-medium text-white">
                    {activeHypeTrain.lastContribution.userName}
                  </span>
                  <span>
                    {getContributionIcon(activeHypeTrain.lastContribution.type)} 
                    {activeHypeTrain.lastContribution.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !needsAuth && !error ? (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
          <Zap className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No hay Hype Train activo</p>
          <p className="text-gray-500 text-sm mt-1">
            El Hype Train se activa cuando hay muchas subs y bits en poco tiempo
          </p>
        </div>
      ) : null}

      {/* Recent Hype Trains */}
      {!needsAuth && hypeTrainEvents.length > 0 && !activeHypeTrain && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Hype Trains Recientes
          </h4>
          <div className="space-y-2">
            {hypeTrainEvents.slice(0, 3).map((event) => (
              <div 
                key={event.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${getLevelColor(event.level)} text-white`}>
                      Nivel {event.level}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {event.total.toLocaleString()} puntos
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {event.startedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HypeTrainPanel;
