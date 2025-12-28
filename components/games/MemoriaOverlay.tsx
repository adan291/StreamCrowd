import React, { useState, useEffect } from 'react';
import { Trophy, Eye, EyeOff, Camera, Check } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

const GAME_CHANNEL = 'memoria_irl_sync';
const STORAGE_KEY_MEMORIA = 'memoria_irl_state';

export const MemoriaOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<any>({
    gameState: 'setup',
    imageUrl: null,
    objects: [],
    timeLeft: 0,
    totalObjects: 0,
    foundCount: 0
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'memoria_state') setState(data);
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'memoria' && data.state) {
        handleState({ ...data.state, type: 'memoria_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_MEMORIA);
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
          <Camera size={48} className="text-cyan-400 mx-auto mb-2" />
          <p className="text-white text-2xl font-bold">Memoria IRL</p>
          <p className="text-zinc-400">Preparando...</p>
        </div>
      )}

      {state.gameState === 'viewing' && (
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-between bg-black/60 backdrop-blur rounded-xl px-6 py-3">
            <div className="flex items-center gap-2">
              <Eye className="text-green-400" size={24} />
              <span className="text-white font-bold text-xl">¡Memoriza!</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500">
              <span className="text-white font-bold text-xl">{state.timeLeft}s</span>
            </div>
          </div>

          {state.imageUrl && (
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img src={state.imageUrl} alt="Memoriza" className="w-full" />
            </div>
          )}

          <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-3 text-center">
            <p className="text-zinc-300">Hay <span className="text-yellow-400 font-bold text-xl">{state.totalObjects}</span> objetos que recordar</p>
          </div>
        </div>
      )}

      {state.gameState === 'guessing' && (
        <div className="w-full max-w-xl space-y-4">
          <div className="flex items-center justify-between bg-black/60 backdrop-blur rounded-xl px-6 py-3">
            <div className="flex items-center gap-2">
              <EyeOff className="text-orange-400" size={24} />
              <span className="text-white font-bold text-xl">¿Qué había?</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${state.timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
              <span className="text-white font-bold text-xl">{state.timeLeft}s</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur rounded-2xl p-6 text-center">
            <p className="text-white text-2xl font-bold mb-4">
              {state.foundCount} / {state.totalObjects}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.objects?.map((obj: any) => (
                <span
                  key={obj.id}
                  className={`px-4 py-2 rounded-full text-lg ${
                    obj.found ? 'bg-green-500/50 text-green-200' : 'bg-zinc-700/50 text-zinc-400'
                  }`}
                >
                  {obj.found ? <><Check size={16} className="inline mr-1" />{obj.name}</> : '???'}
                </span>
              ))}
            </div>
          </div>

          <p className="text-center text-zinc-300 bg-black/40 rounded-lg px-4 py-2">
            Escribe los objetos que recuerdes en el chat
          </p>
        </div>
      )}

      {state.gameState === 'results' && (
        <div className="w-full max-w-xl space-y-4">
          <div className="text-center bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur rounded-2xl p-6">
            <Trophy size={48} className="text-yellow-300 mx-auto mb-2" />
            <p className="text-white text-2xl font-bold">
              {state.foundCount === state.totalObjects ? '¡Todos encontrados!' : `${state.foundCount} de ${state.totalObjects}`}
            </p>
          </div>

          <div className="bg-black/60 backdrop-blur rounded-xl p-4">
            <p className="text-zinc-400 text-sm mb-3">Objetos:</p>
            <div className="flex flex-wrap gap-2">
              {state.objects?.map((obj: any) => (
                <span
                  key={obj.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    obj.found ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                  }`}
                >
                  {obj.found ? '✓' : '✗'} {obj.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoriaOverlay;
