import React, { useState, useEffect } from 'react';
import { Trophy, Skull, Heart } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../services/firebaseSync';

const GAME_CHANNEL = 'ahorcado_sync';
const STORAGE_KEY_AHORCADO = 'ahorcado_state';

export const AhorcadoOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<any>({
    gameState: 'setup',
    displayWord: '',
    hint: '',
    guessedLetters: [],
    errors: 0,
    maxErrors: 6,
    contributors: [],
    secretWord: null
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'ahorcado_state') setState(data);
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'ahorcado' && data.state) {
        handleState({ ...data.state, type: 'ahorcado_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_AHORCADO);
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

  const renderHangman = () => {
    const parts = [
      state.errors >= 1 && <circle key="head" cx="150" cy="50" r="20" stroke="white" strokeWidth="4" fill="none" />,
      state.errors >= 2 && <line key="body" x1="150" y1="70" x2="150" y2="130" stroke="white" strokeWidth="4" />,
      state.errors >= 3 && <line key="leftArm" x1="150" y1="85" x2="120" y2="110" stroke="white" strokeWidth="4" />,
      state.errors >= 4 && <line key="rightArm" x1="150" y1="85" x2="180" y2="110" stroke="white" strokeWidth="4" />,
      state.errors >= 5 && <line key="leftLeg" x1="150" y1="130" x2="125" y2="170" stroke="white" strokeWidth="4" />,
      state.errors >= 6 && <line key="rightLeg" x1="150" y1="130" x2="175" y2="170" stroke="white" strokeWidth="4" />,
    ];

    return (
      <svg width="250" height="220" className="mx-auto">
        <line x1="30" y1="200" x2="220" y2="200" stroke="#666" strokeWidth="5" />
        <line x1="70" y1="200" x2="70" y2="15" stroke="#666" strokeWidth="5" />
        <line x1="70" y1="15" x2="150" y2="15" stroke="#666" strokeWidth="5" />
        <line x1="150" y1="15" x2="150" y2="30" stroke="#666" strokeWidth="4" />
        {parts}
      </svg>
    );
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {state.gameState === 'setup' && (
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-4">
          <Skull size={48} className="text-red-400 mx-auto mb-2" />
          <p className="text-white text-2xl font-bold">Ahorcado</p>
          <p className="text-zinc-400">Preparando...</p>
        </div>
      )}

      {state.gameState === 'playing' && (
        <div className="w-full max-w-xl space-y-4">
          <div className="bg-black/60 backdrop-blur rounded-xl p-4">
            {renderHangman()}
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(state.maxErrors)].map((_, i) => (
                <Heart
                  key={i}
                  size={24}
                  className={i < state.maxErrors - state.errors ? 'text-red-500 fill-red-500' : 'text-zinc-600'}
                />
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur rounded-2xl p-6 text-center">
            <p className="text-white text-3xl font-mono tracking-[0.3em] mb-2">
              {state.displayWord}
            </p>
            {state.hint && (
              <p className="text-zinc-200 text-sm">💡 {state.hint}</p>
            )}
          </div>

          <div className="bg-black/60 backdrop-blur rounded-xl p-3">
            <p className="text-zinc-400 text-xs mb-2">Letras usadas:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {state.guessedLetters?.map((letter: string) => (
                <span key={letter} className="w-8 h-8 flex items-center justify-center rounded bg-zinc-700 text-white font-bold">
                  {letter.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <p className="text-center text-zinc-300 bg-black/40 rounded-lg px-4 py-2">
            <span className="text-yellow-400">!letra X</span> para adivinar
          </p>
        </div>
      )}

      {(state.gameState === 'won' || state.gameState === 'lost') && (
        <div className={`text-center backdrop-blur rounded-2xl p-8 ${state.gameState === 'won' ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
          {state.gameState === 'won' ? (
            <>
              <Trophy size={64} className="text-yellow-300 mx-auto mb-4" />
              <p className="text-white text-2xl font-bold">¡El chat ganó!</p>
            </>
          ) : (
            <>
              <Skull size={64} className="text-white mx-auto mb-4" />
              <p className="text-white text-2xl font-bold">¡El chat perdió!</p>
            </>
          )}
          <p className="text-white text-xl mt-4">
            La palabra era: <span className="font-bold text-yellow-300">{state.secretWord}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default AhorcadoOverlay;
