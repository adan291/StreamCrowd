/**
 * GameResultsOverlay Component
 * Shows game results with winner celebration and action buttons
 */

import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, ArrowRight, X, Star, Users, Clock, Sparkles } from 'lucide-react';
import { Button } from '../Button';

// ============================================
// TYPES
// ============================================

export interface GameResult {
  gameId: string;
  gameName: string;
  winner?: {
    username: string;
    displayName?: string;
    avatar?: string;
    score?: number;
  };
  participants: number;
  duration: number; // seconds
  topPlayers?: Array<{
    username: string;
    displayName?: string;
    score: number;
    rank: number;
  }>;
  stats?: Record<string, number | string>;
}

export interface GameResultsOverlayProps {
  result: GameResult;
  onPlayAgain: () => void;
  onChangeGame: () => void;
  onClose: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const GameResultsOverlay: React.FC<GameResultsOverlayProps> = ({
  result,
  onPlayAgain,
  onChangeGame,
  onClose,
  className = '',
}) => {
  const [showConfetti, setShowConfetti] = useState(true);

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ${className}`}>
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles
                size={16 + Math.random() * 16}
                className={`text-${['yellow', 'pink', 'blue', 'green', 'purple'][Math.floor(Math.random() * 5)]}-400`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors z-10"
        >
          <X size={16} className="text-zinc-500" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur rounded-full flex items-center justify-center animate-bounce-slow">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            ¡Juego Terminado!
          </h2>
          <p className="text-white/80 text-sm">
            {result.gameName}
          </p>
        </div>

        {/* Winner section */}
        {result.winner && (
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
            <div className="text-center">
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                Ganador
              </span>
              <div className="flex items-center justify-center gap-3 mt-2">
                {result.winner.avatar ? (
                  <img
                    src={result.winner.avatar}
                    alt={result.winner.displayName || result.winner.username}
                    className="w-12 h-12 rounded-full border-2 border-amber-400"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Star size={24} className="text-white" />
                  </div>
                )}
                <div className="text-left">
                  <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {result.winner.displayName || result.winner.username}
                  </p>
                  {result.winner.score !== undefined && (
                    <p className="text-sm text-amber-500 font-medium">
                      {result.winner.score} puntos
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center">
            <Users size={18} className="mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              {result.participants}
            </p>
            <p className="text-xs text-zinc-500">Participantes</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center">
            <Clock size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              {formatDuration(result.duration)}
            </p>
            <p className="text-xs text-zinc-500">Duración</p>
          </div>
        </div>

        {/* Top players */}
        {result.topPlayers && result.topPlayers.length > 1 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-2">Top Jugadores</p>
            <div className="space-y-1">
              {result.topPlayers.slice(0, 5).map((player) => (
                <div
                  key={player.username}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      player.rank === 1 ? 'bg-amber-400 text-white' :
                      player.rank === 2 ? 'bg-zinc-400 text-white' :
                      player.rank === 3 ? 'bg-amber-600 text-white' :
                      'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {player.rank}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {player.displayName || player.username}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 flex gap-2">
          <Button
            variant="primary"
            onClick={onPlayAgain}
            className="flex-1"
          >
            <RefreshCw size={16} className="mr-2" />
            Jugar de nuevo
          </Button>
          <Button
            variant="secondary"
            onClick={onChangeGame}
            className="flex-1"
          >
            <ArrowRight size={16} className="mr-2" />
            Cambiar juego
          </Button>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GameResultsOverlay;
