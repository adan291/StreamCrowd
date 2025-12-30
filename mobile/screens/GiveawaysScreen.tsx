import React from 'react';
import type { MobileAppState, MobileMessage } from '../../types/mobile';

/**
 * GiveawaysScreen - View and manage giveaways from mobile
 * @requirements Task 9 - Crear GiveawaysScreen
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

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center gap-3">
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

      {/* Content */}
      <div className="p-4">
        {/* Active Giveaways */}
        {activeGiveaways.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Activos</h2>
            <div className="space-y-3">
              {activeGiveaways.map((giveaway) => (
                <GiveawayCard
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
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Finalizados</h2>
            <div className="space-y-3">
              {finishedGiveaways.map((giveaway) => (
                <div
                  key={giveaway.id}
                  className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{giveaway.name}</span>
                    <span className="text-xs text-zinc-500">{giveaway.participantCount} participantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <span className="text-green-400 font-medium">{giveaway.winner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {giveaways.length === 0 && (
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
            <div className="text-4xl mb-4">🎁</div>
            <h2 className="text-white font-medium mb-2">Sin sorteos</h2>
            <p className="text-zinc-500 text-sm">
              Los sorteos se crean desde la app de escritorio
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">💡 Tip</h3>
          <p className="text-xs text-zinc-500">
            Desde aquí puedes seleccionar ganadores y hacer re-roll. 
            Para crear nuevos sorteos, usa la app de escritorio.
          </p>
        </div>
      </div>
    </div>
  );
};

interface GiveawayCardProps {
  giveaway: {
    id: string;
    name: string;
    keyword?: string;
    participantCount: number;
    isActive: boolean;
    winner?: string;
    mode: 'viewers' | 'keyword' | 'subs';
  };
  onAction: (action: MobileMessage) => void;
}

const GiveawayCard: React.FC<GiveawayCardProps> = ({ giveaway, onAction }) => {
  const modeLabels = {
    viewers: 'Viewers',
    keyword: 'Palabra clave',
    subs: 'Suscriptores',
  };

  const modeIcons = {
    viewers: '👥',
    keyword: '#️⃣',
    subs: '⭐',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-pink-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{modeIcons[giveaway.mode]}</span>
          <span className="text-white font-medium">{giveaway.name}</span>
        </div>
        <span className="text-xs font-medium text-pink-400 bg-pink-500/20 px-2 py-1 rounded-full">
          {modeLabels[giveaway.mode]}
        </span>
      </div>

      {giveaway.keyword && (
        <div className="mb-3 text-sm">
          <span className="text-zinc-500">Palabra: </span>
          <span className="text-cyan-400 font-mono">{giveaway.keyword}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-zinc-400 text-sm">{giveaway.participantCount} participantes</span>
        </div>
      </div>

      {/* Winner Display */}
      {giveaway.winner && (
        <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <span className="text-xs text-green-400">Ganador</span>
              <p className="text-white font-medium">{giveaway.winner}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!giveaway.winner ? (
          <button
            onClick={() => onAction({ type: 'GIVEAWAY_DRAW', data: { giveawayId: giveaway.id } })}
            disabled={giveaway.participantCount === 0}
            className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sortear
          </button>
        ) : (
          <button
            onClick={() => onAction({ type: 'GIVEAWAY_REROLL', data: { giveawayId: giveaway.id } })}
            className="flex-1 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl font-medium hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-roll
          </button>
        )}
      </div>
    </div>
  );
};

export default GiveawaysScreen;
