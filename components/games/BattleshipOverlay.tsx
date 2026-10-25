import React, { useState, useEffect, useRef } from 'react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

interface Ship {
  id: string;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
  sunk: boolean;
}

interface Cell {
  hasShip: boolean;
  isHit: boolean;
  shipId?: string;
}

interface PlayerShot {
  oderId: string;
  username: string;
  color: string;
  row: number;
  col: number;
  isHit: boolean;
  timestamp: number;
}

interface BattleshipState {
  gameState: 'setup' | 'playing' | 'finished';
  grid: Cell[][] | null;
  ships: Ship[];
  shots: PlayerShot[];
  lastShot: PlayerShot | null;
  shipsRemaining: number;
  leaderboard: [string, { hits: number; username: string; color: string }][];
}

const GAME_CHANNEL = 'battleship_sync';
const STORAGE_KEY_BATTLESHIP = 'battleship_state';
const GRID_SIZE = 10;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SHIPS_CONFIG = [
  { name: 'Portaaviones', size: 5 },
  { name: 'Acorazado', size: 4 },
  { name: 'Crucero', size: 3 },
  { name: 'Submarino', size: 3 },
  { name: 'Destructor', size: 2 },
];

export const BattleshipOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<BattleshipState>({
    gameState: 'setup',
    grid: null,
    ships: [],
    shots: [],
    lastShot: null,
    shipsRemaining: 5,
    leaderboard: []
  });
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'battleship_state') {
        setState({
          gameState: data.gameState,
          grid: data.grid,
          ships: data.ships || [],
          shots: data.shots || [],
          lastShot: data.lastShot,
          shipsRemaining: data.shipsRemaining,
          leaderboard: data.leaderboard || []
        });
      }
    };
    
    channelRef.current.onmessage = (event) => handleState(event.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'battleship' && data.state) {
        handleState({ ...data.state, type: 'battleship_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_BATTLESHIP);
        if (stored) handleState(JSON.parse(stored));
      } catch { /* ignore */ }
    };
    loadFromStorage();
    // Other windows of this browser: react to localStorage writes instead of
    // polling (BroadcastChannel and Firebase already deliver live updates)
    window.addEventListener('storage', loadFromStorage);
    
    return () => {
      channelRef.current?.close();
      unsubscribeFirebase();
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  const { gameState, grid, ships, lastShot, shipsRemaining, leaderboard } = state;

  // Waiting state
  if (gameState === 'setup' || !grid) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}>
        <OverlayChromaKey {...chromaKeyProps} />
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-6">
          <div className="text-6xl mb-4">🚢</div>
          <p className="text-white text-2xl font-bold">Hundir la Flota</p>
          <p className="text-blue-300 text-lg mt-2">Preparando batalla...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen p-4 overflow-hidden" style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🚢</span>
          <div>
            <h1 className="text-white text-2xl font-bold">Hundir la Flota</h1>
            <p className="text-blue-300 text-sm">Escribe coordenadas: A1, B5, J10...</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Ships remaining */}
          <div className="bg-blue-800/50 rounded-xl px-4 py-2">
            <span className="text-blue-300 text-sm">Barcos: </span>
            <span className="text-white font-bold text-xl">{shipsRemaining}</span>
          </div>
          
          {/* Game state */}
          <div className={`px-4 py-2 rounded-xl font-bold ${
            gameState === 'finished' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
          }`}>
            {gameState === 'finished' ? '🏆 ¡VICTORIA!' : '⚔️ EN BATALLA'}
          </div>
        </div>
      </div>

      <div className="flex gap-6 justify-center">
        {/* Grid */}
        <div className="bg-blue-800/30 rounded-2xl p-4">
          {/* Column headers */}
          <div className="flex">
            <div className="w-10 h-10" />
            {LETTERS.map(letter => (
              <div key={letter} className="w-10 h-10 flex items-center justify-center text-blue-300 font-bold">
                {letter}
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex">
              <div className="w-10 h-10 flex items-center justify-center text-blue-300 font-bold">
                {rowIdx + 1}
              </div>
              {row.map((cell, colIdx) => {
                const showShip = gameState === 'finished' || cell.isHit;
                
                return (
                  <div
                    key={colIdx}
                    className={`w-10 h-10 border border-blue-600/50 flex items-center justify-center text-xl transition-all ${
                      cell.isHit && cell.hasShip ? 'bg-red-500 animate-pulse' :
                      cell.isHit ? 'bg-blue-700' :
                      showShip && cell.hasShip ? 'bg-zinc-600' : 'bg-blue-900/50'
                    }`}
                  >
                    {cell.isHit && cell.hasShip && '💥'}
                    {cell.isHit && !cell.hasShip && '💦'}
                    {!cell.isHit && showShip && cell.hasShip && '🚢'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4 w-64">
          {/* Last shot */}
          {lastShot && (
            <div className={`rounded-xl p-4 ${lastShot.isHit ? 'bg-red-500/30' : 'bg-blue-500/30'}`}>
              <p className="text-white text-sm mb-1">Último disparo:</p>
              <p className="font-bold text-lg" style={{ color: lastShot.color }}>
                {lastShot.username}
              </p>
              <p className="text-white text-xl">
                {LETTERS[lastShot.col]}{lastShot.row + 1}: {lastShot.isHit ? '💥 ¡TOCADO!' : '💦 Agua'}
              </p>
            </div>
          )}

          {/* Ships status */}
          <div className="bg-blue-800/30 rounded-xl p-3">
            <p className="text-blue-300 text-xs mb-2 font-medium">Estado de barcos:</p>
            <div className="space-y-1">
              {ships.map((ship, i) => (
                <div
                  key={ship.id}
                  className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                    ship.sunk ? 'bg-red-500/30 text-red-400 line-through' : 'bg-blue-700/50 text-white'
                  }`}
                >
                  <span>{SHIPS_CONFIG[i]?.name || `Barco ${i+1}`}</span>
                  <span>{ship.hits}/{ship.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-blue-800/30 rounded-xl p-3">
              <p className="text-blue-300 text-xs mb-2 font-medium">🎯 Mejores tiradores:</p>
              <div className="space-y-1">
                {leaderboard.slice(0, 5).map(([oderId, data], i) => (
                  <div
                    key={oderId}
                    className="flex items-center justify-between px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: data.color + '30' }}
                  >
                    <span style={{ color: data.color }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎯'} {data.username}
                    </span>
                    <span className="text-white font-bold">{data.hits}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleshipOverlay;
