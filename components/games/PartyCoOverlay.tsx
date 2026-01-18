import React, { useState, useEffect } from 'react';
import { Timer, Trophy, Crown, Users, Brain, Eye, Pencil, Zap, Ban, Gamepad2 } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { useGameSync } from '../../src/application/hooks/useGameSync';
import { GameOverlayWrapper } from './GameOverlayWrapper';

type ChallengeType = 'trivia' | 'mimica' | 'dibujo' | 'tabu' | 'rapidez';

interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  answer?: string;
  forbidden?: string[];
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
  gameState: 'lobby' | 'playing' | 'paused' | 'final';
  currentChallenge: Challenge | null;
  timeLeft: number;
  winner: Player | null;
  roundNumber: number;
  topPlayers: Player[];
  pointsToWin: number;
  pointsPerWin: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

const GAME_CHANNEL = 'party_co_sync';
const STORAGE_KEY_PARTYCO = 'party_co_state';
const DRAWING_SYNC_CHANNEL = 'party_co_drawing_sync';

const CHALLENGE_ICONS: Record<ChallengeType, React.ReactNode> = {
  trivia: <Brain size={28} />,
  mimica: <Eye size={28} />,
  dibujo: <Pencil size={28} />,
  tabu: <Ban size={28} />,
  rapidez: <Zap size={28} />,
};

const CHALLENGE_COLORS: Record<ChallengeType, string> = {
  trivia: '#8b5cf6',
  mimica: '#f97316',
  dibujo: '#22c55e',
  tabu: '#3b82f6',
  rapidez: '#ef4444',
};

const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  trivia: 'TRIVIA',
  mimica: 'MÍMICA',
  dibujo: 'DIBUJO',
  tabu: 'TABÚ',
  rapidez: 'RAPIDEZ',
};

export const PartyCoOverlay: React.FC = () => {
  const { gameState: syncedGameState } = useGameSync();

  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<PartyCoState>({
    gameState: 'lobby',
    currentChallenge: null,
    timeLeft: 0,
    winner: null,
    roundNumber: 0,
    topPlayers: [],
    pointsToWin: 50,
    pointsPerWin: 10,
    canvasWidth: 800,
    canvasHeight: 600
  });
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    const drawingChannel = new BroadcastChannel(DRAWING_SYNC_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'party_co_state') {
        setState({
          gameState: data.gameState,
          currentChallenge: data.currentChallenge,
          timeLeft: data.timeLeft,
          winner: data.winner,
          roundNumber: data.roundNumber,
          topPlayers: data.topPlayers || [],
          pointsToWin: data.pointsToWin || 50,
          pointsPerWin: data.pointsPerWin || 10,
          canvasWidth: data.canvasWidth || 800,
          canvasHeight: data.canvasHeight || 600
        });
        // Clear drawing when not in dibujo mode
        if (data.currentChallenge?.type !== 'dibujo') {
          setDrawingDataUrl(null);
        }
      }
    };

    const handleDrawing = (data: any) => {
      if (data.type === 'drawing_update' && data.dataUrl) {
        setDrawingDataUrl(data.dataUrl);
        // Update canvas size if provided
        if (data.canvasWidth && data.canvasHeight) {
          setState(prev => ({
            ...prev,
            canvasWidth: data.canvasWidth,
            canvasHeight: data.canvasHeight
          }));
        }
      }
    };
    
    channel.onmessage = (event) => handleState(event.data);
    drawingChannel.onmessage = (event) => handleDrawing(event.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'partyco' && data.state) {
        handleState({ ...data.state, type: 'party_co_state' });
      }
      if (data && data.type === 'partyco_drawing' && data.dataUrl) {
        setDrawingDataUrl(data.dataUrl);
      }
    });
    
    // Also poll localStorage for legacy support (faster for drawing)
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PARTYCO);
        if (stored) handleState(JSON.parse(stored));
        const drawing = localStorage.getItem('party_co_drawing');
        if (drawing && drawing !== drawingDataUrl) setDrawingDataUrl(drawing);
        // Load canvas size
        const canvasSize = localStorage.getItem('party_co_canvas_size');
        if (canvasSize) {
          const { width, height } = JSON.parse(canvasSize);
          setState(prev => ({
            ...prev,
            canvasWidth: width || 800,
            canvasHeight: height || 600
          }));
        }
      } catch { /* ignore */ }
    };
    loadFromStorage();
    const pollInterval = setInterval(loadFromStorage, 100); // Faster polling for smoother drawing

    return () => {
      channel.close();
      drawingChannel.close();
      unsubscribeFirebase();
      clearInterval(pollInterval);
    };
  }, []);

  const { gameState, currentChallenge, timeLeft, winner, roundNumber, topPlayers, pointsToWin, pointsPerWin, canvasWidth, canvasHeight } = state;

  return (
    <GameOverlayWrapper gameName="Party & Co" gameId="partyco">
      <div className="min-h-screen p-4 flex flex-col items-center justify-center" style={{ backgroundColor: bgColor }}>
        <OverlayChromaKey {...chromaKeyProps} />
        {/* Lobby */}
        {gameState === 'lobby' && (
          <div className="text-center animate-pulse">
            <Gamepad2 size={80} className="text-purple-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">PARTY & CO</h1>
            <p className="text-xl text-purple-300">Escribe !CO para unirte</p>
            <p className="text-zinc-400 mt-2">{topPlayers.length} jugadores</p>
          </div>
        )}

        {/* Paused */}
        {gameState === 'paused' && (
          <div className="text-center">
            <div className="text-8xl mb-4 animate-pulse">⏸️</div>
            <h2 className="text-3xl font-bold text-white mb-2">PAUSADO</h2>
            <p className="text-zinc-400">Ronda {roundNumber}</p>
          </div>
        )}

        {/* Playing - Challenge active */}
        {gameState === 'playing' && currentChallenge && (
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
              {/* Dibujo - Show canvas instead of word */}
              {currentChallenge.type === 'dibujo' && drawingDataUrl ? (
                <div className="mb-4">
                  <p className="text-zinc-400 text-sm mb-3">🎨 ¿Qué está dibujando?</p>
                  <img 
                    src={drawingDataUrl} 
                    alt="Dibujo" 
                    className="w-full max-w-lg mx-auto rounded-xl border-2 border-green-500/30"
                    style={{ aspectRatio: `${canvasWidth}/${canvasHeight}`, objectFit: 'contain', backgroundColor: '#1f1f1f' }}
                  />
                </div>
              ) : currentChallenge.type === 'dibujo' ? (
                <div className="mb-4 p-8 bg-zinc-800 rounded-xl border-2 border-dashed border-green-500/30">
                  <Pencil size={48} className="text-green-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-zinc-400">Esperando dibujo...</p>
                </div>
              ) : (
                <>
                  {/* Tabú - Show word to guess (viewers need to guess it) */}
                  {currentChallenge.type === 'tabu' ? (
                    <div className="mb-4">
                      <p className="text-zinc-400 text-sm mb-2">🎯 ¿Qué palabra está describiendo?</p>
                      <p className="text-blue-400 text-lg">Escucha las pistas y adivina</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-white mb-4">
                        {currentChallenge.title}
                      </h2>
                      <p className="text-zinc-400 text-lg mb-4">
                        {currentChallenge.description}
                      </p>
                    </>
                  )}
                </>
              )}
              
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 rounded-full">
                <Trophy size={24} className="text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-400">
                  +{pointsPerWin} puntos
                </span>
              </div>

              {/* Winner announcement */}
              {winner && (
                <div className="mt-6 p-6 bg-green-500/20 rounded-xl animate-pulse">
                  <div className="text-5xl mb-2">🎉</div>
                  <p className="text-3xl font-bold" style={{ color: winner.color }}>
                    ¡{winner.username}!
                  </p>
                  <p className="text-green-400 text-xl">+{pointsPerWin} puntos</p>
                </div>
              )}
            </div>
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
            <p className="text-zinc-400 mt-2">Meta: {pointsToWin} puntos</p>
          </div>
        )}

        {/* Leaderboard (always visible except final) */}
        {gameState !== 'final' && topPlayers.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-zinc-900/90 rounded-xl p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Users size={14} />
                <span>Top Jugadores</span>
              </div>
              <span className="text-xs text-purple-400">Meta: {pointsToWin}</span>
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
    </GameOverlayWrapper>
  );
};

export default PartyCoOverlay;
