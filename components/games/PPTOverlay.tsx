import React, { useState, useEffect } from 'react';
import { Trophy, Timer, Swords } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

const GAME_CHANNEL = 'ppt_sync';
const STORAGE_KEY_PPT = 'ppt_state';
const EMOJIS = { piedra: '🪨', papel: '📄', tijera: '✂️' };

export const PPTOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<any>({
    gameState: 'waiting',
    players: [],
    round: 1,
    timeLeft: 0,
    results: [],
    champion: null
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'ppt_state') setState(data);
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'ppt' && data.state) {
        handleState({ ...data.state, type: 'ppt_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PPT);
        if (stored) handleState(JSON.parse(stored));
      } catch { /* ignore */ }
    };
    loadFromStorage();
    // Other windows of this browser: react to localStorage writes instead of
    // polling (BroadcastChannel and Firebase already deliver live updates)
    window.addEventListener('storage', loadFromStorage);
    
    return () => {
      channel.close();
      unsubscribeFirebase();
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  const counts = { piedra: 0, papel: 0, tijera: 0 };
  state.players?.forEach((p: any) => { if (p.choice) counts[p.choice as keyof typeof counts]++; });

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {state.gameState === 'waiting' && (
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-4">
          <Swords size={48} className="text-orange-400 mx-auto mb-2" />
          <p className="text-white text-2xl font-bold">Piedra Papel Tijera</p>
          <p className="text-zinc-400">Esperando...</p>
        </div>
      )}

      {state.gameState === 'choosing' && (
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center justify-between bg-black/60 backdrop-blur rounded-xl px-6 py-3">
            <span className="text-white font-bold text-xl">Ronda {state.round}</span>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${state.timeLeft <= 3 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}>
              <Timer size={20} className="text-white" />
              <span className="text-white font-bold text-xl">{state.timeLeft}s</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur rounded-2xl p-6 text-center">
            <p className="text-white text-xl mb-4">¡Elige tu arma!</p>
            <div className="flex justify-center gap-8 text-6xl">
              <span>🪨</span><span>📄</span><span>✂️</span>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-zinc-300">Jugadores: <span className="text-white font-bold">{state.players?.length || 0}</span></p>
            <p className="text-zinc-400 text-sm mt-1">!piedra • !papel • !tijera</p>
          </div>
        </div>
      )}

      {state.gameState === 'reveal' && (
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-3 text-center">
            <span className="text-white font-bold text-xl">¡Revelando!</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(['piedra', 'papel', 'tijera'] as const).map(choice => (
              <div key={choice} className="bg-zinc-800/80 backdrop-blur rounded-xl p-4 text-center">
                <span className="text-5xl">{EMOJIS[choice]}</span>
                <p className="text-white font-bold text-2xl mt-2">{counts[choice]}</p>
                <p className="text-zinc-400 text-sm capitalize">{choice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.gameState === 'finished' && (
        <div className="text-center bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur rounded-2xl p-8">
          <Trophy size={64} className="text-yellow-300 mx-auto mb-4" />
          {state.champion ? (
            <>
              <p className="text-white text-2xl font-bold mb-2">¡Campeón!</p>
              <p className="text-3xl font-bold" style={{ color: state.champion.color }}>
                {state.champion.username}
              </p>
              <p className="text-zinc-200 mt-2">Sobrevivió {state.round} rondas</p>
            </>
          ) : (
            <p className="text-white text-2xl font-bold">¡Empate!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PPTOverlay;
