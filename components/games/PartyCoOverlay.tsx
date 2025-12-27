import React, { useState, useEffect } from 'react';
import { Timer, Trophy, Crown, Users, Dice6, Brain, Eye, Pencil, MessageCircle, HelpCircle, Zap } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

type ChallengeType = 'trivia' | 'mimica' | 'dibujo' | 'palabras' | 'cultura' | 'rapidez';

interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  answer?: string;
  timeLimit: number;
  points: number;
}

interface Player {
  oderId: string;
  username: string;
  color: string;
  score: number;
  wins: number;
}

interface PartyCoState {
  gameState: 'lobby' | 'rolling' | 'challenge' | 'results' | 'final';
  currentChallenge: Challenge | null;
  timeLeft: number;
  diceValue: number;
  isRolling: boolean;
  winner: Player | null;
  roundNumber: number;
  topPlayers: Player[];
  pointsToWin: number;
}

const GAME_CHANNEL = 'party_co_sync';
const STORAGE_KEY_PARTYCO = 'party_co_state';

const CHALLENGE_ICONS: Record<ChallengeType, React.ReactNode> = {
  trivia: <Brain size={24} />,
  mimica: <Eye size={24} />,
  dibujo: <Pencil size={24} />,
  palabras: <MessageCircle size={24} />,
  cultura: <HelpCircle size={24} />,
  rapidez: <Zap size={24} />,
};

const CHALLENGE_COLORS: Record<ChallengeType, string> = {
  trivia: '#8b5cf6',
  mimica: '#f97316',
  dibujo: '#22c55e',
  palabras: '#3b82f6',
  cultura: '#eab308',
  rapidez: '#ef4444',
};

const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  trivia: 'TRIVIA',
  mimica: 'MÍMICA',
  dibujo: 'DIBUJO',
  palabras: 'PALABRAS',
  cultura: 'CULTURA',
  rapidez: 'RAPIDEZ',
};

export const PartyCoOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<PartyCoState>({
    gameState: 'lobby',
    currentChallenge: null,
    timeLeft: 0,
    diceValue: 1,
    isRolling: false,
    winner: null,
    roundNumber: 0,
    topPlayers: [],
    pointsToWin: 50
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'party_co_state') {
        setState({
          gameState: data.gameState,
          currentChallenge: data.currentChallenge,
          timeLeft: data.timeLeft,
          diceValue: data.diceValue,
          isRolling: data.isRolling,
          winner: data.winner,
          roundNumber: data.roundNumber,
          topPlayers: data.topPlayers || [],
          pointsToWin: data.pointsToWin || 50
        });
      }
    };
    
    channel.onmessage = (event) => handleState(event.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'partyco' && data.state) {
        handleState({ ...data.state, type: 'party_co_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PARTYCO);
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

  const { gameState, currentChallenge, timeLeft, diceValue, isRolling, winner, roundNumber, topPlayers, pointsToWin } = state;

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center" style={{ backgroundColor: bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {/* Lobby */}
      {gameState === 'lobby' && (
        <div className="text-center animate-pulse">
          <Dice6 size={80} className="text-purple-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">PARTY & CO</h1>
          <p className="text-xl text-purple-300">Escribe !CO para unirte</p>
          <p className="text-zinc-400 mt-2">{topPlayers.length} jugadores</p>
        </div>
      )}

      {/* Rolling dice */}
      {gameState === 'rolling' && (
        <div className="text-center">
          <div className={`text-9xl mb-4 ${isRolling ? 'animate-bounce' : 'animate-pulse'}`}>
            🎲
          </div>
          <div className="text-8xl font-bold text-white animate-pulse">
            {diceValue}
          </div>
        </div>
      )}

      {/* Challenge active */}
      {gameState === 'challenge' && currentChallenge && (
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div 
            className="rounded-t-2xl p-4 flex items-center justify-between"
            style={{ backgroundColor: CHALLENGE_COLORS[currentChallenge.type] }}
          >
            <div className="flex items-center gap-3">
              {CHALLENGE_ICONS[currentChallenge.type]}
              <span className="text-xl font-bold text-white">
                {CHALLENGE_NAMES[currentChallenge.type]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/80">Ronda {roundNumber}</span>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 ${
                timeLeft <= 5 ? 'animate-pulse' : ''
              }`}>
                <Timer size={20} className="text-white" />
                <span className="text-2xl font-bold text-white">{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Challenge content */}
          <div className="bg-zinc-900/95 rounded-b-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {currentChallenge.title}
            </h2>
            <p className="text-zinc-400 text-lg mb-6">
              {currentChallenge.description}
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 rounded-full">
              <Trophy size={24} className="text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">
                {currentChallenge.points} puntos
              </span>
            </div>

            {/* Winner announcement */}
            {winner && (
              <div className="mt-6 p-6 bg-green-500/20 rounded-xl animate-pulse">
                <div className="text-5xl mb-2">🎉</div>
                <p className="text-3xl font-bold" style={{ color: winner.color }}>
                  ¡{winner.username}!
                </p>
                <p className="text-green-400 text-xl">+{currentChallenge.points} puntos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {gameState === 'results' && (
        <div className="text-center bg-zinc-900/95 rounded-2xl p-8 min-w-[400px]">
          {winner ? (
            <>
              <Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                ¡{winner.username} gana!
              </h2>
              <p className="text-xl text-purple-400">
                {winner.score} / {pointsToWin} puntos
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                ¡Tiempo agotado!
              </h2>
              <p className="text-zinc-400">Nadie acertó</p>
            </>
          )}
        </div>
      )}

      {/* Final - Game winner */}
      {gameState === 'final' && winner && (
        <div className="text-center">
          <Crown size={100} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h1 className="text-5xl font-bold text-white mb-4">
            🏆 ¡GANADOR! 🏆
          </h1>
          <p 
            className="text-4xl font-bold mb-4"
            style={{ color: winner.color }}
          >
            {winner.username}
          </p>
          <p className="text-3xl text-yellow-400 font-bold">
            {winner.score} puntos
          </p>
        </div>
      )}

      {/* Leaderboard (always visible except final) */}
      {gameState !== 'final' && topPlayers.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-zinc-900/90 rounded-xl p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
            <Users size={14} />
            <span>Top Jugadores</span>
          </div>
          <div className="space-y-1">
            {topPlayers.slice(0, 5).map((player, i) => (
              <div key={player.oderId} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-zinc-500">
                  {i === 0 ? '👑' : `${i + 1}.`}
                </span>
                <span 
                  className="flex-1 truncate font-medium"
                  style={{ color: player.color }}
                >
                  {player.username}
                </span>
                <span className="text-purple-400 font-bold">
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyCoOverlay;
