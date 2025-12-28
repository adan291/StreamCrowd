import React, { useState, useEffect, useRef } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Trophy, RotateCcw, ExternalLink, Skull, Heart, Sparkles } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface AhorcadoProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'ahorcado_sync';
const STORAGE_KEY_AHORCADO = 'ahorcado_state';
const MAX_ERRORS = 6;

export const Ahorcado: React.FC<AhorcadoProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [secretWord, setSecretWord] = useState('');
  const [hint, setHint] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [contributors, setContributors] = useState<{ username: string; color: string; letter: string; correct: boolean }[]>([]);
  const [useAI, setUseAI] = useState(false);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const normalizeChar = (char: string): string => {
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const getDisplayWord = (): string => {
    return secretWord.split('').map(char => {
      if (char === ' ') return '  ';
      const normalized = normalizeChar(char);
      return guessedLetters.has(normalized) ? char : '_';
    }).join(' ');
  };

  const isWordComplete = (): boolean => {
    return secretWord.split('').every(char => {
      if (char === ' ') return true;
      return guessedLetters.has(normalizeChar(char));
    });
  };

  const syncToOverlay = () => {
    const state = {
      type: 'ahorcado_state',
      gameState,
      displayWord: getDisplayWord(),
      hint,
      guessedLetters: [...guessedLetters],
      errors,
      maxErrors: MAX_ERRORS,
      contributors: contributors.slice(-10),
      secretWord: gameState === 'won' || gameState === 'lost' ? secretWord : null
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_AHORCADO, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('ahorcado', state).catch(() => {});
  };

  useEffect(() => { syncToOverlay(); }, [gameState, guessedLetters, errors, contributors]);

  // Procesar letras del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'playing') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      
      // Comando !letra X
      if (msgLower.startsWith('!letra ')) {
        const letter = normalizeChar(msgLower.slice(7).trim().charAt(0));
        if (!letter || !/[a-z]/.test(letter)) return;
        if (guessedLetters.has(letter)) return;
        
        const isCorrect = secretWord.split('').some(char => normalizeChar(char) === letter);
        
        setGuessedLetters(prev => new Set([...prev, letter]));
        setContributors(prev => [...prev, {
          username: msg.username,
          color: msg.color || '#a970ff',
          letter: letter.toUpperCase(),
          correct: isCorrect
        }].slice(-50));
        
        if (!isCorrect) {
          setErrors(prev => {
            const newErrors = prev + 1;
            if (newErrors >= MAX_ERRORS) {
              setTimeout(() => setGameState('lost'), 500);
            }
            return newErrors;
          });
        }
      }
      
      // Intentar adivinar palabra completa !palabra X
      if (msgLower.startsWith('!palabra ')) {
        const guess = msgLower.slice(9).trim();
        if (normalizeChar(guess) === normalizeChar(secretWord)) {
          // Revelar todas las letras
          secretWord.split('').forEach(char => {
            if (char !== ' ') {
              setGuessedLetters(prev => new Set([...prev, normalizeChar(char)]));
            }
          });
          setContributors(prev => [...prev, {
            username: msg.username,
            color: msg.color || '#a970ff',
            letter: '🎯 PALABRA',
            correct: true
          }]);
          setTimeout(() => setGameState('won'), 500);
        } else {
          setErrors(prev => {
            const newErrors = prev + 2; // Penalización por fallar palabra
            if (newErrors >= MAX_ERRORS) {
              setTimeout(() => setGameState('lost'), 500);
            }
            return newErrors;
          });
          setContributors(prev => [...prev, {
            username: msg.username,
            color: msg.color || '#a970ff',
            letter: '❌ ' + guess.slice(0, 10),
            correct: false
          }]);
        }
      }
    });
  }, [chatMessages, isConnected, gameState, secretWord, guessedLetters]);

  // Verificar victoria
  useEffect(() => {
    if (gameState === 'playing' && isWordComplete()) {
      setGameState('won');
    }
  }, [guessedLetters, gameState]);

  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const startGame = () => {
    if (!secretWord.trim()) return;
    setGameState('playing');
    setGuessedLetters(new Set());
    setErrors(0);
    setContributors([]);
    lastProcessedRef.current = chatMessages.length;
    triggerGameStart();
  };

  const resetGame = () => {
    setGameState('setup');
    setSecretWord('');
    setHint('');
    setGuessedLetters(new Set());
    setErrors(0);
    setContributors([]);
    triggerGameEnd();
  };

  // Dibujar ahorcado
  const renderHangman = () => {
    const parts = [
      errors >= 1 && <circle key="head" cx="150" cy="45" r="15" stroke="white" strokeWidth="3" fill="none" />,
      errors >= 2 && <line key="body" x1="150" y1="60" x2="150" y2="110" stroke="white" strokeWidth="3" />,
      errors >= 3 && <line key="leftArm" x1="150" y1="75" x2="125" y2="95" stroke="white" strokeWidth="3" />,
      errors >= 4 && <line key="rightArm" x1="150" y1="75" x2="175" y2="95" stroke="white" strokeWidth="3" />,
      errors >= 5 && <line key="leftLeg" x1="150" y1="110" x2="130" y2="145" stroke="white" strokeWidth="3" />,
      errors >= 6 && <line key="rightLeg" x1="150" y1="110" x2="170" y2="145" stroke="white" strokeWidth="3" />,
    ];

    return (
      <svg width="200" height="180" className="mx-auto">
        {/* Base */}
        <line x1="20" y1="170" x2="180" y2="170" stroke="#666" strokeWidth="4" />
        <line x1="60" y1="170" x2="60" y2="10" stroke="#666" strokeWidth="4" />
        <line x1="60" y1="10" x2="150" y2="10" stroke="#666" strokeWidth="4" />
        <line x1="150" y1="10" x2="150" y2="30" stroke="#666" strokeWidth="3" />
        {parts}
      </svg>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skull className="text-red-400" size={24} />
          <h3 className="text-lg font-bold text-white">Ahorcado</h3>
        </div>
        <div className="flex items-center gap-2">
          <OBSOverlayUrl overlayParam="overlayAhorcado" title="el ahorcado" />
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {gameState === 'setup' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Palabra secreta</label>
            <input
              type="text"
              value={secretWord}
              onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
              placeholder="Ej: PROGRAMACION, TWITCH STREAMER..."
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white uppercase"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Pista (opcional)</label>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Ej: Es un lenguaje de programación..."
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white"
            />
          </div>
          <button
            onClick={startGame}
            disabled={!secretWord.trim()}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={18} /> ¡Empezar!
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="bg-zinc-800 rounded-xl p-4">
            {renderHangman()}
            
            {/* Vidas */}
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(MAX_ERRORS)].map((_, i) => (
                <Heart
                  key={i}
                  size={20}
                  className={i < MAX_ERRORS - errors ? 'text-red-500 fill-red-500' : 'text-zinc-600'}
                />
              ))}
            </div>
          </div>

          {/* Palabra */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center">
            <p className="text-white text-2xl font-mono tracking-widest mb-2">
              {getDisplayWord()}
            </p>
            {hint && (
              <p className="text-zinc-400 text-sm">💡 {hint}</p>
            )}
          </div>

          {/* Letras usadas */}
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-xs text-zinc-500 mb-2">Letras usadas:</p>
            <div className="flex flex-wrap gap-1">
              {[...guessedLetters].map(letter => {
                const isCorrect = secretWord.split('').some(char => normalizeChar(char) === letter);
                return (
                  <span
                    key={letter}
                    className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold ${
                      isCorrect ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                    }`}
                  >
                    {letter.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <p className="text-zinc-400 text-sm">
              <span className="text-yellow-400">!letra X</span> para adivinar letra • 
              <span className="text-yellow-400 ml-2">!palabra XXXX</span> para adivinar palabra
            </p>
          </div>
        </>
      )}

      {(gameState === 'won' || gameState === 'lost') && (
        <div className={`rounded-xl p-4 text-center ${gameState === 'won' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {gameState === 'won' ? (
            <>
              <Trophy size={48} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">¡El chat ganó!</p>
            </>
          ) : (
            <>
              <Skull size={48} className="text-red-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">¡El chat perdió!</p>
            </>
          )}
          <p className="text-zinc-300 mt-2">La palabra era: <span className="text-yellow-400 font-bold">{secretWord}</span></p>
          <button
            onClick={resetGame}
            className="mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
          >
            Nueva Palabra
          </button>
        </div>
      )}

      {/* Contribuidores */}
      {contributors.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3 max-h-32 overflow-y-auto">
          <p className="text-xs text-zinc-500 mb-2">Últimas letras:</p>
          <div className="flex flex-wrap gap-1">
            {contributors.slice(-15).map((c, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 rounded ${c.correct ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                style={{ color: c.color }}
              >
                {c.username}: {c.letter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ahorcado;
