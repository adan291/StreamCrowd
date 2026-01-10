/**
 * MultiWinnerDisplay Component
 * Displays multiple winners with podium-style layout
 */

import React from 'react';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import type { WinnerEntry } from './types';

interface MultiWinnerDisplayProps {
  winners: WinnerEntry[];
  isAnimating?: boolean;
  currentPosition?: number;
  currentName?: string;
  onClose?: () => void;
  className?: string;
}

export const MultiWinnerDisplay: React.FC<MultiWinnerDisplayProps> = ({
  winners,
  isAnimating = false,
  currentPosition = 0,
  currentName = '',
  onClose,
  className = '',
}) => {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown size={24} className="text-yellow-500" />;
      case 2: return <Medal size={20} className="text-zinc-400" />;
      case 3: return <Medal size={20} className="text-amber-600" />;
      default: return <Award size={18} className="text-zinc-500" />;
    }
  };

  const getPositionStyle = (position: number): string => {
    switch (position) {
      case 1: return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30 scale-110';
      case 2: return 'bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-800 shadow-lg';
      case 3: return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg';
      default: return 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300';
    }
  };

  const getPositionLabel = (position: number): string => {
    if (position === 1) return '1º';
    if (position === 2) return '2º';
    if (position === 3) return '3º';
    return `${position}º`;
  };

  // Podium layout for top 3
  const renderPodium = () => {
    const top3 = winners.slice(0, 3);
    const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd for visual layout

    return (
      <div className="flex items-end justify-center gap-2 mb-4">
        {podiumOrder.map((orderIndex) => {
          const winner = top3[orderIndex];
          if (!winner) return <div key={orderIndex} className="w-24" />;

          const height = winner.position === 1 ? 'h-28' : winner.position === 2 ? 'h-24' : 'h-20';

          return (
            <div
              key={winner.position}
              className={`flex flex-col items-center ${winner.position === 1 ? 'order-2' : winner.position === 2 ? 'order-1' : 'order-3'}`}
            >
              {/* Winner card */}
              <div className={`w-24 rounded-t-xl p-2 text-center ${getPositionStyle(winner.position)}`}>
                <div className="mb-1">{getPositionIcon(winner.position)}</div>
                <p className="font-bold text-sm truncate">{winner.username}</p>
                {winner.prize && (
                  <p className="text-xs opacity-80 truncate">{winner.prize}</p>
                )}
              </div>
              {/* Podium base */}
              <div className={`w-24 ${height} ${getPositionStyle(winner.position)} rounded-b-lg flex items-center justify-center`}>
                <span className="text-2xl font-bold opacity-50">{getPositionLabel(winner.position)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // List for positions 4+
  const renderList = () => {
    const rest = winners.slice(3);
    if (rest.length === 0) return null;

    return (
      <div className="space-y-1.5 mt-4">
        {rest.map((winner) => (
          <div
            key={winner.position}
            className="flex items-center gap-3 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
          >
            <span className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {getPositionLabel(winner.position)}
            </span>
            <span className="flex-1 font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {winner.username}
            </span>
            {winner.prize && (
              <span className="text-xs text-zinc-500 truncate max-w-[100px]">
                {winner.prize}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Animation state
  if (isAnimating && currentPosition > 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <div className="mb-2">
          <Trophy size={32} className="mx-auto text-amber-500 animate-bounce" />
        </div>
        <p className="text-sm text-zinc-500 mb-2">
          Seleccionando {getPositionLabel(currentPosition)} puesto...
        </p>
        <div className="text-3xl font-bold text-purple-500 animate-pulse">
          {currentName}
        </div>
        {/* Show already selected winners */}
        {winners.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 mb-2">Ganadores seleccionados:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {winners.map((w) => (
                <span
                  key={w.position}
                  className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 dark:text-green-400"
                >
                  {getPositionLabel(w.position)} {w.username}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Final display
  if (winners.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white">
          <Trophy size={18} />
          <span className="font-bold">
            {winners.length === 1 ? '¡Ganador!' : `¡${winners.length} Ganadores!`}
          </span>
        </div>
      </div>

      {/* Single winner */}
      {winners.length === 1 && (
        <div className="text-center py-4">
          <div className="inline-block p-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg shadow-yellow-500/30">
            <Crown size={32} className="mx-auto text-white mb-2" />
            <p className="text-2xl font-bold text-white">{winners[0].username}</p>
            {winners[0].prize && (
              <p className="text-sm text-white/80 mt-1">{winners[0].prize}</p>
            )}
          </div>
        </div>
      )}

      {/* Multiple winners with podium */}
      {winners.length > 1 && (
        <>
          {renderPodium()}
          {renderList()}
        </>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Cerrar
        </button>
      )}
    </div>
  );
};

export default MultiWinnerDisplay;
