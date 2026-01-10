/**
 * ActivityStatsDrawer Component
 * Drawer/modal that shows aggregated activity statistics
 * Can be opened from the ActivitySelector
 */

import React, { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import { ActivityStatsPanel, ActivityStatsData } from './ActivityStatsPanel';

// ============================================
// TYPES
// ============================================

export interface ActivityStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  polls: 'poll_history',
  predictions: 'prediction_history',
  games: 'game_history',
  giveaways: 'giveaway_history',
};

// ============================================
// COMPONENT
// ============================================

export const ActivityStatsDrawer: React.FC<ActivityStatsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<ActivityStatsData>({
    polls: [],
    predictions: [],
    games: [],
    giveaways: [],
  });

  // Load data from localStorage
  useEffect(() => {
    if (!isOpen) return;

    const loadData = () => {
      const newData: ActivityStatsData = {
        polls: [],
        predictions: [],
        games: [],
        giveaways: [],
      };

      try {
        // Load polls
        const pollsRaw = localStorage.getItem(STORAGE_KEYS.polls);
        if (pollsRaw) {
          const polls = JSON.parse(pollsRaw);
          newData.polls = Array.isArray(polls) ? polls.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.question || p.title || 'Encuesta',
            type: 'poll' as const,
            result: p.winner || p.result || 'Sin resultado',
            participantCount: p.totalVotes || p.participantCount || 0,
            createdAt: p.createdAt || p.startTime || Date.now(),
            finishedAt: p.finishedAt || p.endTime || Date.now(),
            metadata: p,
          })) : [];
        }

        // Load predictions
        const predictionsRaw = localStorage.getItem(STORAGE_KEYS.predictions);
        if (predictionsRaw) {
          const predictions = JSON.parse(predictionsRaw);
          newData.predictions = Array.isArray(predictions) ? predictions.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.title || 'Predicción',
            type: 'prediction' as const,
            result: p.winningOutcome || p.result || 'Sin resultado',
            participantCount: p.totalParticipants || p.participantCount || 0,
            createdAt: p.createdAt || p.startedAt || Date.now(),
            finishedAt: p.finishedAt || p.resolvedAt || Date.now(),
            metadata: p,
          })) : [];
        }

        // Load games
        const gamesRaw = localStorage.getItem(STORAGE_KEYS.games);
        if (gamesRaw) {
          const games = JSON.parse(gamesRaw);
          newData.games = Array.isArray(games) ? games.map((g: any) => ({
            id: g.id || crypto.randomUUID(),
            name: g.gameName || g.title || 'Juego',
            type: 'game' as const,
            result: g.winner || g.result || 'Sin ganador',
            participantCount: g.participants || g.participantCount || 0,
            createdAt: g.createdAt || g.startTime || Date.now(),
            finishedAt: g.finishedAt || g.endTime || Date.now(),
            metadata: g,
          })) : [];
        }

        // Load giveaways
        const giveawaysRaw = localStorage.getItem(STORAGE_KEYS.giveaways);
        if (giveawaysRaw) {
          const giveaways = JSON.parse(giveawaysRaw);
          newData.giveaways = Array.isArray(giveaways) ? giveaways.map((g: any) => ({
            id: g.id || crypto.randomUUID(),
            name: g.prize || g.title || 'Sorteo',
            type: 'giveaway' as const,
            result: g.winner || g.result || 'Sin ganador',
            participantCount: g.participantCount || g.participants || 0,
            createdAt: g.createdAt || g.startTime || Date.now(),
            finishedAt: g.finishedAt || g.endTime || Date.now(),
            metadata: g,
          })) : [];
        }
      } catch (error) {
        console.error('Error loading activity stats:', error);
      }

      setData(newData);
    };

    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const totalActivities = data.polls.length + data.predictions.length + data.games.length + data.giveaways.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <BarChart3 size={20} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Estadísticas
              </h2>
              <p className="text-xs text-zinc-500">
                {totalActivities} actividades registradas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {totalActivities === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <BarChart3 size={32} className="text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Sin datos aún
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                Las estadísticas aparecerán aquí cuando realices encuestas, predicciones, juegos o sorteos.
              </p>
            </div>
          ) : (
            <ActivityStatsPanel data={data} showChart={true} />
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ActivityStatsDrawer;
