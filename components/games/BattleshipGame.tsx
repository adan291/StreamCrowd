import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, RotateCcw, Ship, Target, Trophy, ExternalLink, Crosshair } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../services/firebaseSync';

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

interface BattleshipGameProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'battleship_sync';
const STORAGE_KEY_BATTLESHIP = 'battleship_state';
const GRID_SIZE = 10;
const SHIPS_CONFIG = [
  { name: 'Portaaviones', size: 5 },
  { name: 'Acorazado', size: 4 },
  { name: 'Crucero', size: 3 },
  { name: 'Submarino', size: 3 },
  { name: 'Destructor', size: 2 },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const BattleshipGame: React.FC<BattleshipGameProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [grid, setGrid] = useState<Cell[][]>(() => createEmptyGrid());
  const [ships, setShips] = useState<Ship[]>([]);
  const [shots, setShots] = useState<PlayerShot[]>([]);
  const [usedCoords, setUsedCoords] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<Map<string, { hits: number; username: string; color: string }>>(new Map());
  const [lastShot, setLastShot] = useState<PlayerShot | null>(null);
  const [shipsRemaining, setShipsRemaining] = useState(5);
  
  // Setup state
  const [placingShipIndex, setPlacingShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  function createEmptyGrid(): Cell[][] {
    return Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({ hasShip: false, isHit: false }))
    );
  }

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'battleship_state',
      gameState,
      grid: gameState === 'playing' || gameState === 'finished' ? grid : null,
      ships: gameState === 'finished' ? ships : ships.map(s => ({ ...s, positions: s.sunk ? s.positions : [] })),
      shots,
      lastShot,
      shipsRemaining,
      leaderboard: Array.from(leaderboard.entries())
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_BATTLESHIP, JSON.stringify(state));
    } catch { /* ignore */ }
    // Sync to Firebase for OBS Browser Source
    gameSync.update('battleship', state).catch(() => {});
  }, [gameState, grid, ships, shots, lastShot, shipsRemaining, leaderboard]);

  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);

  // Process chat messages for shots
  useEffect(() => {
    if (!isConnected || gameState !== 'playing') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg: TwitchMessage) => {
      const msgUpper = msg.message.toUpperCase().trim();
      // Match coordinates like A1, B5, J10, etc.
      const match = msgUpper.match(/^([A-J])(\d{1,2})$/);
      
      if (match) {
        const col = LETTERS.indexOf(match[1]);
        const row = parseInt(match[2]) - 1;
        
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
          const coordKey = `${row}-${col}`;
          const oderId = msg.userId || msg.username;
          
          // Check if this user already shot or coord already used
          if (usedCoords.has(coordKey)) return;
          if (shots.find(s => s.oderId === oderId)) return;
          
          const cell = grid[row][col];
          const isHit = cell.hasShip;
          
          // Register shot
          const shot: PlayerShot = {
            oderId,
            username: msg.username,
            color: msg.color || '#a970ff',
            row,
            col,
            isHit,
            timestamp: Date.now()
          };
          
          setShots(prev => [...prev, shot]);
          setUsedCoords(prev => new Set(prev).add(coordKey));
          setLastShot(shot);
          
          // Update grid
          setGrid(prev => {
            const newGrid = prev.map(r => r.map(c => ({ ...c })));
            newGrid[row][col].isHit = true;
            return newGrid;
          });
          
          // Update leaderboard if hit
          if (isHit) {
            setLeaderboard(prev => {
              const newBoard = new Map(prev);
              const existing = newBoard.get(oderId);
              newBoard.set(oderId, {
                hits: (existing?.hits || 0) + 1,
                username: msg.username,
                color: msg.color || '#a970ff'
              });
              return newBoard;
            });
            
            // Check if ship sunk
            if (cell.shipId) {
              setShips(prev => {
                const newShips = prev.map(s => {
                  if (s.id === cell.shipId) {
                    const newHits = s.hits + 1;
                    const sunk = newHits >= s.size;
                    if (sunk) {
                      setShipsRemaining(r => r - 1);
                    }
                    return { ...s, hits: newHits, sunk };
                  }
                  return s;
                });
                
                // Check if all ships sunk
                if (newShips.every(s => s.sunk)) {
                  setTimeout(() => setGameState('finished'), 1000);
                }
                
                return newShips;
              });
            }
          }
        }
      }
    });
  }, [chatMessages, isConnected, gameState, grid, usedCoords, shots]);

  const canPlaceShip = (row: number, col: number, size: number, horizontal: boolean): boolean => {
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r >= GRID_SIZE || c >= GRID_SIZE || grid[r][c].hasShip) return false;
    }
    return true;
  };

  const placeShip = (row: number, col: number) => {
    if (placingShipIndex >= SHIPS_CONFIG.length) return;
    
    const shipConfig = SHIPS_CONFIG[placingShipIndex];
    if (!canPlaceShip(row, col, shipConfig.size, isHorizontal)) return;
    
    const positions: { row: number; col: number }[] = [];
    const shipId = `ship_${placingShipIndex}`;
    
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(c => ({ ...c })));
      for (let i = 0; i < shipConfig.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        newGrid[r][c].hasShip = true;
        newGrid[r][c].shipId = shipId;
        positions.push({ row: r, col: c });
      }
      return newGrid;
    });
    
    setShips(prev => [...prev, {
      id: shipId,
      size: shipConfig.size,
      positions,
      hits: 0,
      sunk: false
    }]);
    
    setPlacingShipIndex(prev => prev + 1);
  };

  const startGame = () => {
    if (ships.length < SHIPS_CONFIG.length) return;
    setGameState('playing');
    setShipsRemaining(ships.length);
  };

  const resetGame = () => {
    setGameState('setup');
    setGrid(createEmptyGrid());
    setShips([]);
    setShots([]);
    setUsedCoords(new Set());
    setLeaderboard(new Map());
    setLastShot(null);
    setShipsRemaining(5);
    setPlacingShipIndex(0);
    lastProcessedRef.current = chatMessages.length;
  };

  const autoPlaceShips = () => {
    const newGrid = createEmptyGrid();
    const newShips: Ship[] = [];
    
    SHIPS_CONFIG.forEach((config, idx) => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const horizontal = Math.random() > 0.5;
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        
        let canPlace = true;
        const positions: { row: number; col: number }[] = [];
        
        for (let i = 0; i < config.size; i++) {
          const r = horizontal ? row : row + i;
          const c = horizontal ? col + i : col;
          if (r >= GRID_SIZE || c >= GRID_SIZE || newGrid[r][c].hasShip) {
            canPlace = false;
            break;
          }
          positions.push({ row: r, col: c });
        }
        
        if (canPlace) {
          const shipId = `ship_${idx}`;
          positions.forEach(p => {
            newGrid[p.row][p.col].hasShip = true;
            newGrid[p.row][p.col].shipId = shipId;
          });
          newShips.push({ id: shipId, size: config.size, positions, hits: 0, sunk: false });
          placed = true;
        }
        attempts++;
      }
    });
    
    setGrid(newGrid);
    setShips(newShips);
    setPlacingShipIndex(SHIPS_CONFIG.length);
  };

  const sortedLeaderboard = Array.from(leaderboard.entries())
    .sort((a, b) => b[1].hits - a[1].hits)
    .slice(0, 5);

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {gameState === 'setup' && (
          <>
            <button
              onClick={autoPlaceShips}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
            >
              <Ship size={16} /> Auto-colocar
            </button>
            <button
              onClick={() => setIsHorizontal(!isHorizontal)}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
            >
              {isHorizontal ? '↔️ Horizontal' : '↕️ Vertical'}
            </button>
            <button
              onClick={startGame}
              disabled={ships.length < SHIPS_CONFIG.length}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg"
            >
              <Play size={16} /> ¡Empezar!
            </button>
          </>
        )}
        
        {gameState === 'playing' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-lg">
            <Target size={16} className="text-blue-400" />
            <span className="text-white font-medium">{shipsRemaining} barcos restantes</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          <OBSOverlayUrl overlayParam="overlayBattleship" title="hundir la flota" />
          <button
            onClick={resetGame}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
            title="Reiniciar"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      
      {/* Setup info */}
      {gameState === 'setup' && placingShipIndex < SHIPS_CONFIG.length && (
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-zinc-300">
            Coloca el <span className="text-cyan-400 font-bold">{SHIPS_CONFIG[placingShipIndex].name}</span> 
            ({SHIPS_CONFIG[placingShipIndex].size} casillas)
          </p>
          <p className="text-zinc-500 text-xs mt-1">Haz clic en el tablero para colocar</p>
        </div>
      )}

      {/* Playing info */}
      {gameState === 'playing' && (
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-zinc-400 text-sm">
            El chat dispara con coordenadas: <span className="text-cyan-400 font-bold">A1</span>, <span className="text-cyan-400 font-bold">B5</span>, <span className="text-cyan-400 font-bold">J10</span>...
          </p>
          <p className="text-zinc-500 text-xs mt-1">Cada viewer puede disparar 1 vez</p>
        </div>
      )}

      {/* Last shot */}
      {lastShot && gameState === 'playing' && (
        <div className={`text-center p-2 rounded-lg animate-pulse ${lastShot.isHit ? 'bg-red-500/30' : 'bg-blue-500/30'}`}>
          <span style={{ color: lastShot.color }} className="font-bold">{lastShot.username}</span>
          <span className="text-white"> disparó a {LETTERS[lastShot.col]}{lastShot.row + 1}: </span>
          <span className={lastShot.isHit ? 'text-red-400 font-bold' : 'text-blue-400'}>
            {lastShot.isHit ? '💥 ¡TOCADO!' : '💦 Agua'}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="flex justify-center">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className="w-7 h-7" />
            {LETTERS.map(letter => (
              <div key={letter} className="w-7 h-7 flex items-center justify-center text-xs text-zinc-400 font-bold">
                {letter}
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex">
              <div className="w-7 h-7 flex items-center justify-center text-xs text-zinc-400 font-bold">
                {rowIdx + 1}
              </div>
              {row.map((cell, colIdx) => {
                const isHover = hoverCell?.row === rowIdx && hoverCell?.col === colIdx;
                const showShip = gameState === 'setup' || gameState === 'finished' || cell.isHit;
                
                // Preview ship placement
                let isPreview = false;
                if (gameState === 'setup' && hoverCell && placingShipIndex < SHIPS_CONFIG.length) {
                  const size = SHIPS_CONFIG[placingShipIndex].size;
                  for (let i = 0; i < size; i++) {
                    const r = isHorizontal ? hoverCell.row : hoverCell.row + i;
                    const c = isHorizontal ? hoverCell.col + i : hoverCell.col;
                    if (r === rowIdx && c === colIdx) isPreview = true;
                  }
                }
                
                return (
                  <div
                    key={colIdx}
                    onClick={() => gameState === 'setup' && placeShip(rowIdx, colIdx)}
                    onMouseEnter={() => setHoverCell({ row: rowIdx, col: colIdx })}
                    onMouseLeave={() => setHoverCell(null)}
                    className={`w-7 h-7 border border-zinc-700 flex items-center justify-center text-xs cursor-pointer transition-all ${
                      cell.isHit && cell.hasShip ? 'bg-red-500' :
                      cell.isHit ? 'bg-blue-900' :
                      showShip && cell.hasShip ? 'bg-zinc-600' :
                      isPreview ? 'bg-cyan-500/50' :
                      isHover ? 'bg-zinc-700' : 'bg-zinc-800'
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
      </div>

      {/* Ships status */}
      {gameState !== 'setup' && (
        <div className="flex flex-wrap justify-center gap-2">
          {ships.map((ship, i) => (
            <div
              key={ship.id}
              className={`px-2 py-1 rounded text-xs ${ship.sunk ? 'bg-red-500/30 text-red-400 line-through' : 'bg-zinc-700 text-zinc-300'}`}
            >
              {SHIPS_CONFIG[i].name} ({ship.hits}/{ship.size})
            </div>
          ))}
        </div>
      )}

      {/* Finished */}
      {gameState === 'finished' && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center">
          <Trophy size={32} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-white text-xl font-bold">¡Todos los barcos hundidos!</p>
          <p className="text-zinc-400 text-sm mt-1">{shots.length} disparos totales</p>
        </div>
      )}

      {/* Leaderboard */}
      {sortedLeaderboard.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair size={14} className="text-red-400" />
            <span className="text-xs font-medium text-zinc-400">Mejores tiradores</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedLeaderboard.map(([oderId, data], i) => (
              <span
                key={oderId}
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: data.color + '30', color: data.color }}
              >
                {i === 0 ? '🎯' : ''} {data.username}: {data.hits} hits
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default BattleshipGame;
