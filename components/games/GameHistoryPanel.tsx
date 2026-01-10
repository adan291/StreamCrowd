/**
 * GameHistoryPanel Component
 * History panel specifically for games using GenericHistoryPanel
 * Shows game history with name, winner, duration, and participants
 */

import React, { useMemo } from 'react';
import { Trophy, Users, Clock, Gamepad2 } from 'lucide-react';
import { GenericHistoryPanel, type HistoryPanelConfig } from '../ui/GenericHistoryPanel';
import type { BaseHistoryItem } from '../../hooks/useActivityHistory';

// ============================================
// TYPES
// ============================================

export interface GameHistoryItem extends BaseHistoryItem {
  gameName: string;
  gameType: string;
  winner: string;
  winnerScore?: number;
  participants: string[];
  duration: number; // in seconds
  scores?: Record<string, number>;
}

export interface GameHistoryPanelProps {
  games: GameHistoryItem[];
  className?: string;
  maxHeight?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ============================================
// COMPONENT
// ============================================

export const GameHistoryPanel: React.FC<GameHistoryPanelProps> = ({
  games,
  className = '',
  maxHeight = '400px',
}) => {
  // Config for GenericHistoryPanel
  const config: HistoryPanelConfig<GameHistoryItem> = useMemo(() => ({
    activityType: 'game',
    title: 'Historial de Juegos',
    labels: {
      result: 'Ganador',
      participants: 'Jugadores',
    },
    accentColor: 'green',
    
    // Custom render for item details
    renderItemDetails: (item) => (
      <>
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Trophy size={12} /> {item.winner}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Users size={12} /> {item.participantCount}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock size={12} /> {formatDuration(item.duration)}
        </span>
      </>
    ),
    
    // Custom render for expanded content
    renderExpandedContent: (item) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gamepad2 size={14} className="text-green-500" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.gameName}</span>
          <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400">
            {item.gameType}
          </span>
        </div>
        
        {/* Winner highlight */}
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <Trophy size={14} className="text-yellow-500" />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.winner}</span>
          {item.winnerScore !== undefined && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {item.winnerScore} pts
            </span>
          )}
        </div>
        
        {/* Participants */}
        {item.participants.length > 0 && (
          <div>
            <span className="text-xs text-zinc-500 mb-1 block">Participantes:</span>
            <div className="flex flex-wrap gap-1">
              {item.participants.slice(0, 10).map((p, i) => (
                <span 
                  key={i}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    p === item.winner 
                      ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' 
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {p}
                  {item.scores?.[p] !== undefined && ` (${item.scores[p]})`}
                </span>
              ))}
              {item.participants.length > 10 && (
                <span className="text-xs text-zinc-500">
                  +{item.participants.length - 10} más
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div className="flex gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <span className="text-zinc-500 text-xs">
            Duración: <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatDuration(item.duration)}
            </span>
          </span>
          <span className="text-zinc-500 text-xs">
            Jugadores: <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {item.participantCount}
            </span>
          </span>
        </div>
      </div>
    ),
    
    exportFields: ['id', 'name', 'result', 'participantCount', 'createdAt', 'finishedAt'],
  }), []);

  return (
    <GenericHistoryPanel
      items={games}
      config={config}
      className={className}
      maxHeight={maxHeight}
    />
  );
};

export default GameHistoryPanel;
