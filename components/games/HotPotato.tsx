import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Bomb, Timer, Trophy, RotateCcw, Users, ExternalLink } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { useGameSync } from '../../src/application/hooks/useGameSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface Player {
  oderId: string; // visitorId typo kept for compatibility
  username: string;
  color: string;
  hasPotato: boolean;
  isOut: boolean;
  passCount: number;
}

interface HotPotatoProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'hot_potato_sync';
const STORAGE_KEY_POTATO = 'hot_potato_state';

export const HotPotato: React.FC<HotPotatoProps> = ({ chatMessages, isConnected = true }) => {
  // Game sync hook for hexagonal architecture
  const { publishGameState } = useGameSync();
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'exploded'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bombTime, setBombTime] = useState(30);
  const [currentHolder, setCurrentHolder] = useState<Player | null>(null);
  const [loser, setLoser] = useState<Player | null>(null);
  const [round, setRound] = useState(1);
  const [leaderboard, setLeaderboard] = useState<Map<string, number>>(new Map<string, number>());
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(async () => {
    const state = {
      type: 'potato_state',
      gameState,
      players,
      currentHolder,
      timeLeft,
      loser,
      round
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_POTATO, JSON.stringify(state));
    } catch { /* ignore */ }
    
    // Use hexagonal architecture game sync
    try {
      await publishGameState({
        gameType: 'hot-potato',
        isActive: gameState === 'playing',
        players: players.map(player => ({
          id: player.id,
          username: player.username,
          score: leaderboard.get(player.id) || 0,
          isActive: player.id !== loser?.id,
          joinedAt: player.joinedAt,
        })),
        currentRound: round,
        settings: {
          gameState,
          bombTime,
          timeLeft,
          currentHolder: currentHolder?.username,
        },
        lastUpdate: Date.now(),
        ...state, // Include all original data for backward compatibility
      });
    } catch (error) {
      console.warn('Failed to sync game state:', error);
    }
  }, [gameState, players, currentHolder, timeLeft, loser, round, publishGameState, leaderboard, bombTime]);

  // Sync state changes to overlay
  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);

  // Process chat messages
  useEffect(() => {
    if (!isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Join game with !papa or !potato
      if (gameState === 'waiting' && (msgLower === '!papa' || msgLower === '!potato' || msgLower === '!join')) {
        setPlayers(prev => {
          if (prev.find(p => p.oderId === oderId)) return prev;
          if (prev.length >= 20) return prev; // Max 20 players
          return [...prev, {
            oderId,
            username: msg.username,
            color: msg.color || '#a970ff',
            hasPotato: false,
            isOut: false,
            passCount: 0
          }];
        });
      }
      
      // Pass potato with !pass @username or !pasar @username
      if (gameState === 'playing' && (msgLower.startsWith('!pass ') || msgLower.startsWith('!pasar '))) {
        const targetName = msgLower.split(' ')[1]?.replace('@', '').toLowerCase();
        
        setPlayers(prev => {
          const holder = prev.find(p => p.hasPotato && p.oderId === oderId);
          if (!holder) return prev; // Not the holder
          
          const target = prev.find(p => 
            p.username.toLowerCase() === targetName && !p.isOut && p.oderId !== oderId
          );
          if (!target) return prev; // Invalid target
          
          return prev.map(p => ({
            ...p,
            hasPotato: p.oderId === target.oderId,
            passCount: p.oderId === holder.oderId ? p.passCount + 1 : p.passCount
          }));
        });
      }
    });
  }, [chatMessages, isConnected, gameState]);

  // Update current holder when players change
  useEffect(() => {
    const holder = players.find(p => p.hasPotato);
    setCurrentHolder(holder || null);
    syncToOverlay();
  }, [players, syncToOverlay]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // BOOM!
          clearInterval(timerRef.current!);
          const holder = players.find(p => p.hasPotato);
          if (holder) {
            setLoser(holder);
            setPlayers(prev => prev.map(p => 
              p.oderId === holder.oderId ? { ...p, isOut: true, hasPotato: false } : p
            ));
            setLeaderboard(prev => {
              const newBoard = new Map<string, number>(prev);
              newBoard.set(holder.username, (newBoard.get(holder.username) || 0) + 1);
              return newBoard;
            });
          }
          setGameState('exploded');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, players]);

  const startGame = () => {
    if (players.length < 2) return;
    
    // Give potato to random player
    const randomIndex = Math.floor(Math.random() * players.length);
    setPlayers(prev => prev.map((p, i) => ({
      ...p,
      hasPotato: i === randomIndex,
      isOut: false
    })));
    
    // Random time between 10-bombTime seconds
    const time = Math.floor(Math.random() * (bombTime - 10)) + 10;
    setTimeLeft(time);
    setGameState('playing');
    setLoser(null);
    triggerGameStart();
  };

  const nextRound = () => {
    const activePlayers = players.filter(p => !p.isOut);
    if (activePlayers.length < 2) {
      // Game over - we have a winner!
      setGameState('waiting');
      return;
    }
    
    // Give potato to random active player
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const randomPlayer = activePlayers[randomIndex];
    
    setPlayers(prev => prev.map(p => ({
      ...p,
      hasPotato: p.oderId === randomPlayer.oderId
    })));
    
    const time = Math.floor(Math.random() * (bombTime - 10)) + 10;
    setTimeLeft(time);
    setRound(prev => prev + 1);
    setGameState('playing');
    setLoser(null);
  };

  const resetGame = () => {
    setPlayers([]);
    setGameState('waiting');
    setTimeLeft(0);
    setLoser(null);
    setRound(1);
    setCurrentHolder(null);
    if (timerRef.current) clearInterval(timerRef.current);
    triggerGameEnd();
  };

  const activePlayers = players.filter((p: Player) => !p.isOut);
  const sortedLeaderboard = Array.from(leaderboard.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {gameState === 'waiting' && (
          <button
            onClick={startGame}
            disabled={players.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
          >
            <Play size={16} />
            ¡Empezar! ({players.length} jugadores)
          </button>
        )}
        
        {gameState === 'exploded' && (
          <button
            onClick={nextRound}
            disabled={activePlayers.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
          >
            <Play size={16} />
            {activePlayers.length >= 2 ? `Ronda ${round + 1}` : '¡Tenemos ganador!'}
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="potato-bomb-time" className="text-zinc-400 text-sm">Tiempo:</label>
          <input
            type="number"
            id="potato-bomb-time"
            name="potato-bomb-time"
            min="15"
            max="120"
            value={bombTime}
            onChange={(e) => setBombTime(Math.max(15, parseInt(e.target.value) || 30))}
            disabled={gameState === 'playing'}
            className="w-14 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm"
          />
          <span className="text-zinc-500 text-xs">s</span>
        </div>
        
        <OBSOverlayUrl overlayParam="overlayPotato" title="la patata caliente" />
        
        <button
          onClick={resetGame}
          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
          title="Reiniciar"
        >
          <RotateCcw size={18} />
        </button>
      </div>
      
      {/* Game Status */}
      {gameState === 'waiting' && (
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-zinc-400 mb-2">
            Escribe <span className="text-orange-400 font-bold">!papa</span> o <span className="text-orange-400 font-bold">!potato</span> para unirte
          </p>
          <p className="text-zinc-500 text-xs">Mínimo 2 jugadores para empezar</p>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bomb size={24} className={`text-orange-400 ${timeLeft <= 5 ? 'animate-bounce' : 'animate-pulse'}`} />
              <span className="text-white font-bold">Ronda {round}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
            }`}>
              <Timer size={16} className="text-white" />
              <span className="text-white font-bold text-lg">{timeLeft}s</span>
            </div>
          </div>
          
          {currentHolder && (
            <div className="text-center">
              <p className="text-zinc-300 text-sm mb-1">🔥 La papa la tiene:</p>
              <p className="text-2xl font-bold" style={{ color: currentHolder.color }}>
                {currentHolder.username}
              </p>
              <p className="text-zinc-400 text-xs mt-2">
                Pasa con: <code className="bg-zinc-700 px-1 rounded">!pass @usuario</code>
              </p>
            </div>
          )}
        </div>
      )}

      {gameState === 'exploded' && loser && (
        <div className="bg-red-500/30 rounded-xl p-4 text-center animate-pulse">
          <p className="text-4xl mb-2">💥</p>
          <p className="text-white font-bold text-xl">¡BOOM!</p>
          <p className="text-red-300">
            <span style={{ color: loser.color }}>{loser.username}</span> ha sido eliminado
          </p>
        </div>
      )}

      {/* Players Grid */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">
            Jugadores ({activePlayers.length} activos / {players.length} total)
          </span>
        </div>
        
        {players.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Esperando jugadores...
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {players.map((player) => (
              <div
                key={player.oderId}
                className={`relative p-2 rounded-lg text-center transition-all ${
                  player.isOut 
                    ? 'bg-zinc-700/50 opacity-50' 
                    : player.hasPotato 
                      ? 'bg-orange-500/30 ring-2 ring-orange-400 animate-pulse' 
                      : 'bg-zinc-700/50'
                }`}
              >
                {player.hasPotato && (
                  <span className="absolute -top-2 -right-2 text-lg">🥔</span>
                )}
                {player.isOut && (
                  <span className="absolute -top-2 -right-2 text-lg">💀</span>
                )}
                <p 
                  className="text-xs font-medium truncate"
                  style={{ color: player.isOut ? '#666' : player.color }}
                >
                  {player.username}
                </p>
                {player.passCount > 0 && (
                  <p className="text-[10px] text-zinc-500">{player.passCount} pases</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {sortedLeaderboard.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-medium text-zinc-400">Más eliminaciones:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedLeaderboard.slice(0, 5).map(([user, count], i) => (
              <span key={user} className="text-xs bg-zinc-700 px-2 py-1 rounded">
                {i === 0 ? '💀' : ''} {user}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotPotato;
