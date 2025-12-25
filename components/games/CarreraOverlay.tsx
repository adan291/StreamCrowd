import React, { useState, useEffect } from 'react';
import { Trophy, Flag, Timer } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../services/firebaseSync';

const GAME_CHANNEL = 'carrera_emotes_sync';
const STORAGE_KEY_CARRERA = 'carrera_emotes_state';

export const CarreraOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<any>({
    gameState: 'setup',
    racers: [],
    winner: null,
    timeLeft: 0
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'carrera_state') setState(data);
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'carrera' && data.state) {
        handleState({ ...data.state, type: 'carrera_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_CARRERA);
        if (stored) handleState(JSON.parse(stored));
      } catch { /* ignore */ }
    };
    loadFromStorage();
    const pollInterval = setInterval(loadFromStorage, 300);
    
    return () => {
      channel.close();
      unsubscribeFirebase();
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {state.gameState === 'setup' && (
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-4">
          <Flag size={48} className="text-green-400 mx-auto mb-2" />
          <p className="text-white text-2xl font-bold">Carrera de Emotes</p>
          <p className="text-zinc-400">Preparando...</p>
        </div>
      )}

      {state.gameState === 'betting' && (
        <div className="w-full max-w-xl space-y-4">
          <div className="flex items-center justify-between bg-black/60 backdrop-blur rounded-xl px-6 py-3">
            <span className="text-white font-bold text-xl">¡Hagan sus apuestas!</span>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500">
              <Timer size={20} className="text-black" />
              <span className="text-black font-bold text-xl">{state.timeLeft}s</span>
            </div>
          </div>

          <div className="space-y-3">
            {state.racers?.map((r: any, i: number) => (
              <div key={r.id} className="bg-zinc-800/80 backdrop-blur rounded-xl p-4 flex items-center gap-4">
                <span className="text-4xl">{r.emote}</span>
                <div className="flex-1">
                  <p className="text-white font-bold">{i + 1}. {r.name}</p>
                  <p className="text-zinc-400 text-sm">{r.bets?.length || 0} apuestas</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-zinc-300 bg-black/40 rounded-lg px-4 py-2">
            <span className="text-yellow-400">!apostar 1</span>, <span className="text-yellow-400">!apostar 2</span>, etc.
          </p>
        </div>
      )}

      {state.gameState === 'racing' && (
        <div className="w-full max-w-2xl space-y-3">
          <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-3 text-center">
            <span className="text-white font-bold text-2xl animate-pulse">🏁 ¡CARRERA! 🏁</span>
          </div>

          {state.racers?.map((r: any, i: number) => (
            <div key={r.id} className="relative">
              <div className="h-12 bg-zinc-800/80 backdrop-blur rounded-full relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500/40 to-green-500/10 transition-all duration-75"
                  style={{ width: `${r.position}%` }}
                />
                <span 
                  className="absolute text-3xl transition-all duration-75"
                  style={{ left: `calc(${Math.min(r.position, 95)}% - 15px)`, top: '6px' }}
                >
                  {r.emote}
                </span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">🏁</span>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-sm font-bold">
                  {i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.gameState === 'finished' && state.winner && (
        <div className="text-center bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur rounded-2xl p-8">
          <Trophy size={64} className="text-yellow-300 mx-auto mb-4" />
          <span className="text-6xl block mb-4">{state.winner.emote}</span>
          <p className="text-white text-2xl font-bold">¡{state.winner.name} gana!</p>
          
          {state.winner.bets?.length > 0 && (
            <div className="mt-4">
              <p className="text-zinc-200 text-sm mb-2">🎉 Ganadores:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {state.winner.bets.slice(0, 10).map((b: any, i: number) => (
                  <span key={i} className="text-sm px-2 py-1 bg-black/30 rounded" style={{ color: b.color }}>
                    {b.username}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CarreraOverlay;
