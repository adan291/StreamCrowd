import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Trophy, RotateCcw, ExternalLink, Swords, Timer } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../services/firebaseSync';

interface Player {
  oderId: string;
  username: string;
  color: string;
  choice: 'piedra' | 'papel' | 'tijera' | null;
  wins: number;
  eliminated: boolean;
}

interface PiedraPapelTijeraProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'ppt_sync';
const STORAGE_KEY_PPT = 'ppt_state';
const CHOICES = ['piedra', 'papel', 'tijera'] as const;
const EMOJIS = { piedra: '🪨', papel: '📄', tijera: '✂️' };

export const PiedraPapelTijera: React.FC<PiedraPapelTijeraProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'waiting' | 'choosing' | 'reveal' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundTime, setRoundTime] = useState(10);
  const [results, setResults] = useState<{ winner: string; loser: string; winChoice: string; loseChoice: string }[]>([]);
  const [champion, setChampion] = useState<Player | null>(null);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const getActivePlayers = useCallback(() => {
    return [...players.values()].filter(p => !p.eliminated);
  }, [players]);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'ppt_state',
      gameState,
      players: getActivePlayers(),
      round,
      timeLeft,
      results: results.slice(-5),
      champion
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_PPT, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('ppt', state).catch(() => {});
  }, [gameState, getActivePlayers, round, timeLeft, results, champion]);

  useEffect(() => { syncToOverlay(); }, [syncToOverlay]);

  // Procesar elecciones del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'choosing') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Detectar elección
      let choice: 'piedra' | 'papel' | 'tijera' | null = null;
      if (msgLower === '!piedra' || msgLower === '🪨' || msgLower === 'piedra') choice = 'piedra';
      else if (msgLower === '!papel' || msgLower === '📄' || msgLower === 'papel') choice = 'papel';
      else if (msgLower === '!tijera' || msgLower === '!tijeras' || msgLower === '✂️' || msgLower === 'tijera') choice = 'tijera';
      
      if (choice) {
        setPlayers(prev => {
          const newPlayers = new Map(prev);
          const existing = newPlayers.get(oderId);
          if (existing && !existing.eliminated) {
            newPlayers.set(oderId, { ...existing, choice });
          } else if (!existing) {
            newPlayers.set(oderId, {
              oderId,
              username: msg.username,
              color: msg.color || '#a970ff',
              choice,
              wins: 0,
              eliminated: false
            });
          }
          return newPlayers;
        });
      }
    });
  }, [chatMessages, isConnected, gameState]);

  // Timer de ronda
  useEffect(() => {
    if (gameState !== 'choosing') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          resolveRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const startGame = () => {
    setPlayers(new Map());
    setRound(1);
    setResults([]);
    setChampion(null);
    setTimeLeft(roundTime);
    setGameState('choosing');
    lastProcessedRef.current = chatMessages.length;
  };

  const resolveRound = () => {
    setGameState('reveal');
    
    const active = getActivePlayers().filter(p => p.choice);
    if (active.length < 2) {
      // No hay suficientes jugadores
      setTimeout(() => {
        if (active.length === 1) {
          setChampion(active[0]);
          setGameState('finished');
        } else {
          nextRound();
        }
      }, 2000);
      return;
    }

    // Contar elecciones
    const counts = { piedra: 0, papel: 0, tijera: 0 };
    active.forEach(p => { if (p.choice) counts[p.choice]++; });

    // Determinar qué elección pierde
    // Piedra pierde contra Papel, Papel pierde contra Tijera, Tijera pierde contra Piedra
    let losingChoice: 'piedra' | 'papel' | 'tijera' | null = null;
    
    if (counts.piedra > 0 && counts.papel > 0 && counts.tijera === 0) {
      losingChoice = 'piedra'; // Papel gana a Piedra
    } else if (counts.papel > 0 && counts.tijera > 0 && counts.piedra === 0) {
      losingChoice = 'papel'; // Tijera gana a Papel
    } else if (counts.tijera > 0 && counts.piedra > 0 && counts.papel === 0) {
      losingChoice = 'tijera'; // Piedra gana a Tijera
    }
    // Si hay empate a 3 o todos eligieron lo mismo, nadie es eliminado

    if (losingChoice) {
      setPlayers(prev => {
        const newPlayers = new Map(prev);
        newPlayers.forEach((player, key) => {
          if (player.choice === losingChoice) {
            newPlayers.set(key, { ...player, eliminated: true });
          }
        });
        return newPlayers;
      });
    }

    // Esperar y pasar a siguiente ronda
    setTimeout(() => {
      const remaining = [...players.values()].filter(p => !p.eliminated && p.choice);
      if (remaining.length <= 1) {
        if (remaining.length === 1) {
          setChampion(remaining[0]);
        }
        setGameState('finished');
      } else {
        nextRound();
      }
    }, 3000);
  };

  const nextRound = () => {
    setPlayers(prev => {
      const newPlayers = new Map(prev);
      newPlayers.forEach((player, key) => {
        newPlayers.set(key, { ...player, choice: null });
      });
      return newPlayers;
    });
    setRound(r => r + 1);
    setTimeLeft(roundTime);
    setGameState('choosing');
  };

  const resetGame = () => {
    setGameState('waiting');
    setPlayers(new Map());
    setRound(1);
    setResults([]);
    setChampion(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const openOverlay = () => {
    const width = 600, height = 450;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayPPT=true`, 'PPTOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const activePlayers = getActivePlayers();
  const chosenCount = activePlayers.filter(p => p.choice).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="text-orange-400" size={24} />
          <h3 className="text-lg font-bold text-white">Piedra Papel Tijera</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
            <RotateCcw size={18} />
          </button>
          <button onClick={openOverlay} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg">
            <ExternalLink size={16} /> Overlay
          </button>
        </div>
      </div>

      {gameState === 'waiting' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          <div className="text-center">
            <p className="text-zinc-300 mb-4">Torneo eliminatorio de Piedra Papel Tijera</p>
            <div className="flex justify-center gap-4 text-4xl mb-4">
              <span>🪨</span><span>📄</span><span>✂️</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-zinc-400" />
            <span className="text-sm text-zinc-400">Tiempo por ronda:</span>
            <select
              value={roundTime}
              onChange={(e) => setRoundTime(parseInt(e.target.value))}
              className="px-2 py-1 bg-zinc-700 rounded text-white text-sm"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
            </select>
          </div>
          <button
            onClick={startGame}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={18} /> ¡Empezar Torneo!
          </button>
        </div>
      )}

      {gameState === 'choosing' && (
        <>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-3">
            <span className="text-white font-medium">Ronda {round}</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeLeft <= 3 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}>
              <Timer size={16} className="text-white" />
              <span className="text-white font-bold">{timeLeft}s</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 text-center">
            <p className="text-white text-lg mb-2">¡Elige tu arma!</p>
            <div className="flex justify-center gap-6 text-5xl mb-3">
              <span className="hover:scale-125 transition-transform cursor-default">🪨</span>
              <span className="hover:scale-125 transition-transform cursor-default">📄</span>
              <span className="hover:scale-125 transition-transform cursor-default">✂️</span>
            </div>
            <p className="text-zinc-400 text-sm">
              Escribe <span className="text-yellow-400">!piedra</span>, <span className="text-yellow-400">!papel</span> o <span className="text-yellow-400">!tijera</span>
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Jugadores: {activePlayers.length}</span>
              <span className="text-green-400">Han elegido: {chosenCount}</span>
            </div>
          </div>
        </>
      )}

      {gameState === 'reveal' && (
        <div className="bg-zinc-800 rounded-xl p-4">
          <p className="text-white text-center text-lg font-bold mb-4">¡Revelando elecciones!</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {CHOICES.map(choice => {
              const count = activePlayers.filter(p => p.choice === choice).length;
              return (
                <div key={choice} className="bg-zinc-700/50 rounded-lg p-3">
                  <span className="text-3xl">{EMOJIS[choice]}</span>
                  <p className="text-white font-bold mt-1">{count}</p>
                  <p className="text-zinc-400 text-xs capitalize">{choice}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'finished' && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center">
          <Trophy size={48} className="text-yellow-400 mx-auto mb-2" />
          {champion ? (
            <>
              <p className="text-white text-xl font-bold">
                ¡<span style={{ color: champion.color }}>{champion.username}</span> es el campeón!
              </p>
              <p className="text-zinc-400 mt-1">Sobrevivió {round} rondas</p>
            </>
          ) : (
            <p className="text-white text-xl font-bold">¡Empate total!</p>
          )}
          <button
            onClick={startGame}
            className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
          >
            Nuevo Torneo
          </button>
        </div>
      )}

      {/* Jugadores activos */}
      {activePlayers.length > 0 && gameState !== 'waiting' && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <p className="text-xs text-zinc-500 mb-2">Jugadores en juego ({activePlayers.length}):</p>
          <div className="flex flex-wrap gap-1">
            {activePlayers.slice(0, 20).map(p => (
              <span key={p.oderId} className="text-xs px-2 py-1 rounded-full bg-zinc-700" style={{ color: p.color }}>
                {p.username} {p.choice && gameState === 'reveal' ? EMOJIS[p.choice] : ''}
              </span>
            ))}
            {activePlayers.length > 20 && (
              <span className="text-xs px-2 py-1 text-zinc-500">+{activePlayers.length - 20} más</span>
            )}
          </div>
        </div>
      )}

      <OBSOverlayUrl overlayParam="overlayPPT" title="piedra papel tijera" />
    </div>
  );
};

export default PiedraPapelTijera;
