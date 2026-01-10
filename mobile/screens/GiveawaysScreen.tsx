import React, { useState, useRef, useEffect } from 'react';
import type { MobileAppState, MobileMessage } from '../../types/mobile';

/**
 * GiveawaysScreen - View and manage giveaways from mobile
 * Enhanced with Quick Raffle, swipe gestures, and real-time updates
 * @requirements Task 15 - Mejorar experiencia móvil
 */

interface GiveawaysScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onBack: () => void;
}

export const GiveawaysScreen: React.FC<GiveawaysScreenProps> = ({
  state,
  onAction,
  onBack,
}) => {
  const { giveaways } = state;
  const activeGiveaways = giveaways.filter(g => g.isActive);
  const finishedGiveaways = giveaways.filter(g => !g.isActive && g.winner);
  
  const [showQuickRaffle, setShowQuickRaffle] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pull to refresh handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    
    const pullDistance = e.touches[0].clientY - pullStartY.current;
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      onAction({ type: 'GIVEAWAY_REFRESH', data: {} });
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleTouchEnd = () => {
    pullStartY.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-zinc-950 pb-20 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Sorteos</h1>
        </div>
        
        {/* Quick Raffle Button */}
        <button
          onClick={() => setShowQuickRaffle(true)}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-xl flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Rápido
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Active Giveaways */}
        {activeGiveaways.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Activos ({activeGiveaways.length})
            </h2>
            <div className="space-y-3">
              {activeGiveaways.map((giveaway) => (
                <SwipeableGiveawayCard
                  key={giveaway.id}
                  giveaway={giveaway}
                  onAction={onAction}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finished Giveaways */}
        {finishedGiveaways.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">
              Finalizados ({finishedGiveaways.length})
            </h2>
            <div className="space-y-3">
              {finishedGiveaways.slice(0, 5).map((giveaway) => (
                <FinishedGiveawayCard key={giveaway.id} giveaway={giveaway} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {giveaways.length === 0 && (
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
            <div className="text-4xl mb-4">🎁</div>
            <h2 className="text-white font-medium mb-2">Sin sorteos</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Crea un sorteo rápido o espera a que se sincronice desde el escritorio
            </p>
            <button
              onClick={() => setShowQuickRaffle(true)}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl"
            >
              Crear sorteo rápido
            </button>
          </div>
        )}

        {/* Swipe Instructions */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">💡 Gestos</h3>
          <div className="space-y-2 text-xs text-zinc-500">
            <p>👈 Desliza a la izquierda para eliminar</p>
            <p>👉 Desliza a la derecha para sortear</p>
            <p>👇 Tira hacia abajo para actualizar</p>
          </div>
        </div>
      </div>

      {/* Quick Raffle Modal */}
      {showQuickRaffle && (
        <QuickRaffleModal
          onClose={() => setShowQuickRaffle(false)}
          onAction={onAction}
        />
      )}
    </div>
  );
};

// ============================================
// SWIPEABLE GIVEAWAY CARD
// ============================================

interface SwipeableGiveawayCardProps {
  giveaway: {
    id: string;
    name: string;
    keyword?: string;
    participantCount: number;
    isActive: boolean;
    winner?: string;
    mode: 'viewers' | 'keyword' | 'subs';
    endsAt?: number;
  };
  onAction: (action: MobileMessage) => void;
}

const SwipeableGiveawayCard: React.FC<SwipeableGiveawayCardProps> = ({ giveaway, onAction }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!giveaway.endsAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = giveaway.endsAt! - now;
      
      if (remaining <= 0) {
        setCountdown('¡Finalizado!');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [giveaway.endsAt]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    const diff = e.touches[0].clientX - startX;
    setSwipeX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      // Swipe right - Draw winner
      onAction({ type: 'GIVEAWAY_DRAW', data: { giveawayId: giveaway.id } });
    } else if (swipeX < -60) {
      // Swipe left - Delete
      onAction({ type: 'GIVEAWAY_DELETE', data: { giveawayId: giveaway.id } });
    }
    setSwipeX(0);
    setStartX(null);
  };

  const modeLabels = {
    viewers: 'Viewers',
    keyword: 'Keyword',
    subs: 'Subs',
  };

  const modeIcons = {
    viewers: '👥',
    keyword: '🔑',
    subs: '⭐',
  };

  const bgColor = swipeX > 30 ? 'bg-green-500/20' : swipeX < -30 ? 'bg-red-500/20' : 'bg-zinc-900';

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-green-500/30 flex items-center justify-start pl-4">
          <span className="text-green-400 text-sm font-medium">🎲 Sortear</span>
        </div>
        <div className="flex-1 bg-red-500/30 flex items-center justify-end pr-4">
          <span className="text-red-400 text-sm font-medium">🗑️ Eliminar</span>
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={`${bgColor} p-4 border border-pink-500/30 transition-colors relative`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{modeIcons[giveaway.mode]}</span>
            <span className="text-white font-medium">{giveaway.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {countdown && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                ⏱️ {countdown}
              </span>
            )}
            <span className="text-xs font-medium text-pink-400 bg-pink-500/20 px-2 py-1 rounded-full">
              {modeLabels[giveaway.mode]}
            </span>
          </div>
        </div>

        {giveaway.keyword && (
          <div className="mb-3 text-sm">
            <span className="text-zinc-500">Palabra: </span>
            <span className="text-cyan-400 font-mono">{giveaway.keyword}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-zinc-400 text-sm">{giveaway.participantCount} participantes</span>
          </div>
          
          {/* Quick action button */}
          <button
            onClick={() => onAction({ type: 'GIVEAWAY_DRAW', data: { giveawayId: giveaway.id } })}
            disabled={giveaway.participantCount === 0}
            className="px-4 py-2 bg-pink-500 text-white text-sm rounded-lg font-medium disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            Sortear
          </button>
        </div>

        {/* Winner Display */}
        {giveaway.winner && (
          <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <span className="text-xs text-green-400">Ganador</span>
                <p className="text-white font-medium">{giveaway.winner}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// FINISHED GIVEAWAY CARD
// ============================================

interface FinishedGiveawayCardProps {
  giveaway: {
    id: string;
    name: string;
    participantCount: number;
    winner?: string;
  };
}

const FinishedGiveawayCard: React.FC<FinishedGiveawayCardProps> = ({ giveaway }) => (
  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
    <div className="flex items-center justify-between mb-2">
      <span className="text-white font-medium">{giveaway.name}</span>
      <span className="text-xs text-zinc-500">{giveaway.participantCount} participantes</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-2xl">🏆</span>
      <span className="text-green-400 font-medium">{giveaway.winner}</span>
    </div>
  </div>
);

// ============================================
// QUICK RAFFLE MODAL
// ============================================

interface QuickRaffleModalProps {
  onClose: () => void;
  onAction: (action: MobileMessage) => void;
}

const QuickRaffleModal: React.FC<QuickRaffleModalProps> = ({ onClose, onAction }) => {
  const [mode, setMode] = useState<'viewers' | 'keyword'>('viewers');
  const [keyword, setKeyword] = useState('');
  const [duration, setDuration] = useState(60); // seconds

  const handleCreate = () => {
    onAction({
      type: 'GIVEAWAY_CREATE',
      data: {
        mode,
        keyword: mode === 'keyword' ? keyword : undefined,
        duration,
        name: `Sorteo rápido ${mode === 'keyword' ? `(${keyword})` : ''}`,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Sorteo Rápido</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Selection */}
        <div className="mb-4">
          <label className="text-sm text-zinc-400 mb-2 block">Modo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('viewers')}
              className={`p-3 rounded-xl border ${
                mode === 'viewers'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              👥 Viewers
            </button>
            <button
              onClick={() => setMode('keyword')}
              className={`p-3 rounded-xl border ${
                mode === 'keyword'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              🔑 Keyword
            </button>
          </div>
        </div>

        {/* Keyword Input */}
        {mode === 'keyword' && (
          <div className="mb-4">
            <label className="text-sm text-zinc-400 mb-2 block">Palabra clave</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ej: !sorteo"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
            />
          </div>
        )}

        {/* Duration */}
        <div className="mb-6">
          <label className="text-sm text-zinc-400 mb-2 block">Duración</label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 120, 300].map((sec) => (
              <button
                key={sec}
                onClick={() => setDuration(sec)}
                className={`p-3 rounded-xl border text-sm ${
                  duration === sec
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={mode === 'keyword' && !keyword.trim()}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
        >
          Crear Sorteo
        </button>
      </div>
    </div>
  );
};

export default GiveawaysScreen;
