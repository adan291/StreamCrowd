import React, { useState, useEffect } from 'react';
import { Bomb, Timer } from 'lucide-react';

interface Player {
  oderId: string;
  username: string;
  color: string;
  hasPotato: boolean;
  isOut: boolean;
}

interface PotatoState {
  gameState: 'waiting' | 'playing' | 'exploded';
  players: Player[];
  currentHolder: Player | null;
  timeLeft: number;
  loser: Player | null;
  round: number;
}

const GAME_CHANNEL = 'hot_potato_sync';

export const PotatoOverlay: React.FC = () => {
  const [state, setState] = useState<PotatoState>({
    gameState: 'waiting',
    players: [],
    currentHolder: null,
    timeLeft: 0,
    loser: null,
    round: 1
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    channel.onmessage = (e) => {
      if (e.data.type === 'potato_state') {
        setState(e.data);
      }
    };
    return () => channel.close();
  }, []);

  const activePlayers = state.players.filter(p => !p.isOut);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col items-center justify-center p-8">
      {/* Waiting */}
      {state.gameState === 'waiting' && (
        <div className="text-center">
          <p className="text-white text-2xl font-bold bg-black/60 backdrop-blur rounded-xl px-8 py-4">
            🥔 Esperando jugadores... ({state.players.length})
          </p>
          <p className="text-zinc-300 mt-2 bg-black/40 rounded-lg px-4 py-2">
            Escribe !papa para unirte
          </p>
        </div>
      )}

      {/* Playing */}
      {state.gameState === 'playing' && (
        <div className="text-center space-y-6">
          {/* Timer */}
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
            state.timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
          }`}>
            <Timer size={28} className="text-white" />
            <span className="text-white font-bold text-4xl">{state.timeLeft}s</span>
          </div>
          
          {/* Round */}
          <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-2">
            <span className="text-white font-bold">Ronda {state.round}</span>
          </div>
          
          {/* Current holder */}
          {state.currentHolder && (
            <div className="bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur rounded-2xl px-8 py-6 animate-pulse">
              <p className="text-white text-lg mb-2">🔥 La papa la tiene:</p>
              <p className="text-4xl font-bold" style={{ color: state.currentHolder.color }}>
                {state.currentHolder.username}
              </p>
              <div className="mt-4 text-6xl animate-bounce">🥔</div>
            </div>
          )}
          
          {/* Players circle */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {activePlayers.map((player) => (
              <div
                key={player.oderId}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  player.hasPotato 
                    ? 'bg-orange-500 ring-2 ring-yellow-400 scale-110' 
                    : 'bg-zinc-700/80'
                }`}
                style={{ color: player.color }}
              >
                {player.hasPotato && '🥔 '}{player.username}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exploded */}
      {state.gameState === 'exploded' && state.loser && (
        <div className="text-center animate-pulse">
          <div className="text-8xl mb-4">💥</div>
          <div className="bg-red-500/80 backdrop-blur rounded-2xl px-8 py-6">
            <p className="text-white font-bold text-3xl mb-2">¡BOOM!</p>
            <p className="text-2xl" style={{ color: state.loser.color }}>
              {state.loser.username}
            </p>
            <p className="text-white text-lg mt-2">ha sido eliminado</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotatoOverlay;
