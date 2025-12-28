import React, { useState, useEffect, useRef } from 'react';
import { TwitchMessage } from '../../types';
import { Eye, Play, Trophy, RotateCcw, ExternalLink, Check, X, HelpCircle } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface Player {
  oderId: string;
  username: string;
  color: string;
  score: number;
  guesses: number;
}

interface VeoVeoProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'veoveo_sync';
const STORAGE_KEY_VEOVEO = 'veoveo_state';

export const VeoVeo: React.FC<VeoVeoProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'revealed'>('setup');
  const [secretWord, setSecretWord] = useState('');
  const [hint, setHint] = useState('');
  const [guesses, setGuesses] = useState<{ username: string; color: string; guess: string; correct: boolean }[]>([]);
  const [winner, setWinner] = useState<{ username: string; color: string } | null>(null);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [hintsGiven, setHintsGiven] = useState<string[]>([]);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = () => {
    const state = {
      type: 'veoveo_state',
      gameState,
      hint,
      guesses: guesses.slice(-10),
      winner,
      hintsGiven,
      revealedWord: gameState === 'revealed' ? secretWord : null
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_VEOVEO, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('veoveo', state).catch(() => {});
  };

  useEffect(() => { syncToOverlay(); }, [gameState, hint, guesses, winner, hintsGiven]);

  // Procesar mensajes del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'playing') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Comando !veo para adivinar
      if (msgLower.startsWith('!veo ')) {
        const guess = msg.message.slice(5).trim().toLowerCase();
        if (!guess) return;
        
        const isCorrect = guess === secretWord.toLowerCase();
        
        setGuesses(prev => [...prev, {
          username: msg.username,
          color: msg.color || '#a970ff',
          guess: msg.message.slice(5).trim(),
          correct: isCorrect
        }].slice(-50));
        
        // Actualizar jugador
        setPlayers(prev => {
          const newPlayers = new Map(prev);
          const existing = newPlayers.get(oderId);
          newPlayers.set(oderId, {
            oderId,
            username: msg.username,
            color: msg.color || '#a970ff',
            score: (existing?.score || 0) + (isCorrect ? 100 : 0),
            guesses: (existing?.guesses || 0) + 1
          });
          return newPlayers;
        });
        
        if (isCorrect) {
          setWinner({ username: msg.username, color: msg.color || '#a970ff' });
          setGameState('revealed');
        }
      }
    });
  }, [chatMessages, isConnected, gameState, secretWord]);

  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const startGame = () => {
    if (!secretWord.trim() || !hint.trim()) return;
    setGameState('playing');
    setGuesses([]);
    setWinner(null);
    setHintsGiven([hint]);
    lastProcessedRef.current = chatMessages.length;
    triggerGameStart();
  };

  const addHint = (newHint: string) => {
    if (!newHint.trim()) return;
    setHintsGiven(prev => [...prev, newHint]);
    setHint(newHint);
  };

  const revealAnswer = () => {
    setGameState('revealed');
  };

  const resetGame = () => {
    setGameState('setup');
    setSecretWord('');
    setHint('');
    setGuesses([]);
    setWinner(null);
    setHintsGiven([]);
    triggerGameEnd();
  };

  const sortedPlayers = [...players.values()].sort((a, b) => b.score - a.score);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="text-purple-400" size={24} />
          <h3 className="text-lg font-bold text-white">Veo Veo</h3>
        </div>
        <div className="flex items-center gap-2">
          <OBSOverlayUrl overlayParam="overlayVeoVeo" title="el Veo Veo" />
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {gameState === 'setup' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Palabra secreta (solo tú la ves)</label>
            <input
              type="text"
              value={secretWord}
              onChange={(e) => setSecretWord(e.target.value)}
              placeholder="Ej: semáforo, perro, coche rojo..."
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Primera pista</label>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Ej: Veo veo algo que empieza por S..."
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white"
            />
          </div>
          <button
            onClick={startGame}
            disabled={!secretWord.trim() || !hint.trim()}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={18} /> ¡Empezar Veo Veo!
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={18} className="text-yellow-400" />
              <span className="text-sm text-zinc-400">Pista actual:</span>
            </div>
            <p className="text-white text-lg font-medium">{hintsGiven[hintsGiven.length - 1]}</p>
            {hintsGiven.length > 1 && (
              <div className="mt-2 text-xs text-zinc-500">
                Pistas anteriores: {hintsGiven.slice(0, -1).join(' → ')}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Añadir nueva pista..."
              className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addHint((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <button
              onClick={revealAnswer}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm"
            >
              Revelar
            </button>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-400 text-sm text-center mb-2">
              Chat escribe <span className="text-yellow-400 font-bold">!veo [respuesta]</span> para adivinar
            </p>
          </div>
        </>
      )}

      {gameState === 'revealed' && (
        <div className={`rounded-xl p-4 text-center ${winner ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
          {winner ? (
            <>
              <Trophy size={32} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">
                ¡<span style={{ color: winner.color }}>{winner.username}</span> lo adivinó!
              </p>
            </>
          ) : (
            <p className="text-white text-xl font-bold">Nadie lo adivinó 😅</p>
          )}
          <p className="text-zinc-300 mt-2">La respuesta era: <span className="text-yellow-400 font-bold">{secretWord}</span></p>
          <button
            onClick={resetGame}
            className="mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
          >
            Nueva Ronda
          </button>
        </div>
      )}

      {/* Intentos recientes */}
      {guesses.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3 max-h-40 overflow-y-auto">
          <p className="text-xs text-zinc-500 mb-2">Últimos intentos:</p>
          <div className="space-y-1">
            {guesses.slice(-10).reverse().map((g, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {g.correct ? <Check size={14} className="text-green-400" /> : <X size={14} className="text-red-400" />}
                <span style={{ color: g.color }}>{g.username}:</span>
                <span className="text-zinc-300">{g.guess}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking */}
      {sortedPlayers.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs text-zinc-400">Ranking</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedPlayers.slice(0, 5).map((p, i) => (
              <span key={p.oderId} className="text-xs px-2 py-1 bg-zinc-700 rounded" style={{ color: p.color }}>
                {i === 0 ? '👑' : ''} {p.username}: {p.score}pts
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VeoVeo;
