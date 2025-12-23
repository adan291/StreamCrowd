import React, { useState, useEffect } from 'react';
import { Eye, Trophy, Check, X } from 'lucide-react';

const GAME_CHANNEL = 'veoveo_sync';

export const VeoVeoOverlay: React.FC = () => {
  const [state, setState] = useState<any>({
    gameState: 'setup',
    hint: '',
    guesses: [],
    winner: null,
    hintsGiven: [],
    revealedWord: null
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    channel.onmessage = (e) => {
      if (e.data.type === 'veoveo_state') setState(e.data);
    };
    return () => channel.close();
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col items-center justify-center p-8">
      {state.gameState === 'setup' && (
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-4">
          <Eye size={48} className="text-purple-400 mx-auto mb-2" />
          <p className="text-white text-2xl font-bold">Veo Veo</p>
          <p className="text-zinc-400">Preparando...</p>
        </div>
      )}

      {state.gameState === 'playing' && (
        <div className="w-full max-w-xl space-y-4">
          <div className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur rounded-2xl p-6 text-center">
            <Eye size={32} className="text-white mx-auto mb-2" />
            <p className="text-white text-2xl font-bold">{state.hintsGiven?.[state.hintsGiven.length - 1] || state.hint}</p>
          </div>

          <div className="bg-black/60 backdrop-blur rounded-xl p-4">
            <p className="text-zinc-400 text-sm mb-2">Últimos intentos:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {state.guesses?.slice(-8).reverse().map((g: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  {g.correct ? <Check size={16} className="text-green-400" /> : <X size={16} className="text-red-400/50" />}
                  <span style={{ color: g.color }}>{g.username}:</span>
                  <span className="text-white">{g.guess}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-zinc-300 bg-black/40 rounded-lg px-4 py-2">
            Escribe <span className="text-yellow-400">!veo [respuesta]</span> para adivinar
          </p>
        </div>
      )}

      {state.gameState === 'revealed' && (
        <div className="text-center bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur rounded-2xl p-8">
          {state.winner ? (
            <>
              <Trophy size={64} className="text-yellow-300 mx-auto mb-4" />
              <p className="text-white text-2xl font-bold mb-2">
                ¡<span style={{ color: state.winner.color }}>{state.winner.username}</span> lo adivinó!
              </p>
            </>
          ) : (
            <p className="text-white text-2xl font-bold mb-2">Nadie lo adivinó</p>
          )}
          <p className="text-white text-xl">
            Era: <span className="text-yellow-300 font-bold">{state.revealedWord}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default VeoVeoOverlay;
