/**
 * BattleshipService - Juego de Hundir la Flota
 * 
 * El streamer coloca barcos y el chat dispara con coordenadas (A1, B5, etc.)
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface BattleshipShip {
  id: string;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
  sunk: boolean;
}

export interface BattleshipCell {
  hasShip: boolean;
  isHit: boolean;
  shipId?: string;
}

export interface PlayerShot {
  oderId: string;
  username: string;
  color: string;
  row: number;
  col: number;
  isHit: boolean;
  timestamp: number;
}

export interface BattleshipState extends BaseGameState {
  phase: 'setup' | 'playing' | 'finished';
  grid: BattleshipCell[][];
  ships: BattleshipShip[];
  shots: PlayerShot[];
  usedCoords: Set<string>;
  playersWhoShot: Set<string>;
  leaderboard: Map<string, { hits: number; username: string; color: string }>;
  lastShot: PlayerShot | null;
  shipsRemaining: number;
}

export const BATTLESHIP_CONSTANTS = {
  GRID_SIZE: 10,
  LETTERS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  SHIPS_CONFIG: [
    { name: 'Portaaviones', size: 5 },
    { name: 'Acorazado', size: 4 },
    { name: 'Crucero', size: 3 },
    { name: 'Submarino', size: 3 },
    { name: 'Destructor', size: 2 },
  ],
};

const GAME_CONFIG: GameConfig = {
  gameId: 'battleship',
  channelName: 'battleship_sync',
  storageKey: 'battleship_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

function createEmptyGrid(): BattleshipCell[][] {
  const { GRID_SIZE } = BATTLESHIP_CONSTANTS;
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => ({ hasShip: false, isHit: false }))
  );
}

const INITIAL_STATE: BattleshipState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  grid: createEmptyGrid(),
  ships: [],
  shots: [],
  usedCoords: new Set(),
  playersWhoShot: new Set(),
  leaderboard: new Map(),
  lastShot: null,
  shipsRemaining: 5,
};

export class BattleshipService extends BaseGameService<BattleshipState> {
  constructor() {
    super(GAME_CONFIG, {
      ...INITIAL_STATE,
      grid: createEmptyGrid(),
      usedCoords: new Set(),
      playersWhoShot: new Set(),
      leaderboard: new Map(),
    });
  }

  // ============ Game-Specific API ============

  getPhase(): 'setup' | 'playing' | 'finished' {
    return this.state.phase;
  }

  getGrid(): BattleshipCell[][] {
    return this.state.grid.map(row => row.map(cell => ({ ...cell })));
  }

  getShips(): BattleshipShip[] {
    return [...this.state.ships];
  }

  getShots(): PlayerShot[] {
    return [...this.state.shots];
  }

  getLastShot(): PlayerShot | null {
    return this.state.lastShot;
  }

  getShipsRemaining(): number {
    return this.state.shipsRemaining;
  }

  getLeaderboard(): Array<{ oderId: string; hits: number; username: string; color: string }> {
    return Array.from(this.state.leaderboard.entries())
      .map(([oderId, data]) => ({ oderId, ...data }))
      .sort((a, b) => b.hits - a.hits);
  }

  // ============ Ship Placement ============

  canPlaceShip(row: number, col: number, size: number, horizontal: boolean): boolean {
    const { GRID_SIZE } = BATTLESHIP_CONSTANTS;
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r >= GRID_SIZE || c >= GRID_SIZE || this.state.grid[r][c].hasShip) {
        return false;
      }
    }
    return true;
  }

  placeShip(row: number, col: number, shipIndex: number, horizontal: boolean): boolean {
    const { SHIPS_CONFIG } = BATTLESHIP_CONSTANTS;
    if (shipIndex >= SHIPS_CONFIG.length) return false;

    const shipConfig = SHIPS_CONFIG[shipIndex];
    if (!this.canPlaceShip(row, col, shipConfig.size, horizontal)) return false;

    const positions: { row: number; col: number }[] = [];
    const shipId = `ship_${shipIndex}`;
    const newGrid = this.state.grid.map(r => r.map(c => ({ ...c })));

    for (let i = 0; i < shipConfig.size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      newGrid[r][c].hasShip = true;
      newGrid[r][c].shipId = shipId;
      positions.push({ row: r, col: c });
    }

    const newShip: BattleshipShip = {
      id: shipId,
      size: shipConfig.size,
      positions,
      hits: 0,
      sunk: false,
    };

    this.setState({
      ...this.state,
      grid: newGrid,
      ships: [...this.state.ships, newShip],
    });

    return true;
  }

  autoPlaceShips(): void {
    const { GRID_SIZE, SHIPS_CONFIG } = BATTLESHIP_CONSTANTS;
    const newGrid = createEmptyGrid();
    const newShips: BattleshipShip[] = [];

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

    this.setState({
      ...this.state,
      grid: newGrid,
      ships: newShips,
    });
  }

  // ============ Game Lifecycle ============

  startGame(): boolean {
    const { SHIPS_CONFIG } = BATTLESHIP_CONSTANTS;
    if (this.state.ships.length < SHIPS_CONFIG.length) return false;

    this.setState({
      ...this.state,
      phase: 'playing',
      gameState: 'playing',
      shipsRemaining: this.state.ships.length,
      startTime: Date.now(),
    });

    return true;
  }

  override reset(): void {
    this.setState({
      ...INITIAL_STATE,
      grid: createEmptyGrid(),
      usedCoords: new Set(),
      playersWhoShot: new Set(),
      leaderboard: new Map(),
    });
  }

  // ============ Shooting ============

  shoot(oderId: string, username: string, color: string, row: number, col: number): PlayerShot | null {
    const { GRID_SIZE, LETTERS } = BATTLESHIP_CONSTANTS;
    if (this.state.phase !== 'playing') return null;
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;

    const coordKey = `${row}-${col}`;
    if (this.state.usedCoords.has(coordKey)) return null;
    if (this.state.playersWhoShot.has(oderId)) return null;

    const cell = this.state.grid[row][col];
    const isHit = cell.hasShip;

    const shot: PlayerShot = {
      oderId,
      username,
      color,
      row,
      col,
      isHit,
      timestamp: Date.now(),
    };

    const newGrid = this.state.grid.map(r => r.map(c => ({ ...c })));
    newGrid[row][col].isHit = true;

    const newUsedCoords = new Set(this.state.usedCoords);
    newUsedCoords.add(coordKey);

    const newPlayersWhoShot = new Set(this.state.playersWhoShot);
    newPlayersWhoShot.add(oderId);

    let newLeaderboard = new Map(this.state.leaderboard);
    let newShips = this.state.ships;
    let newShipsRemaining = this.state.shipsRemaining;
    let newPhase: 'setup' | 'playing' | 'finished' = this.state.phase;

    if (isHit) {
      const existing = newLeaderboard.get(oderId);
      newLeaderboard.set(oderId, {
        hits: (existing?.hits || 0) + 1,
        username,
        color,
      });

      if (cell.shipId) {
        newShips = this.state.ships.map(s => {
          if (s.id === cell.shipId) {
            const newHits = s.hits + 1;
            const sunk = newHits >= s.size;
            if (sunk) newShipsRemaining--;
            return { ...s, hits: newHits, sunk };
          }
          return s;
        });

        if (newShips.every(s => s.sunk)) {
          newPhase = 'finished';
        }
      }
    }

    this.setState({
      ...this.state,
      grid: newGrid,
      shots: [...this.state.shots, shot],
      usedCoords: newUsedCoords,
      playersWhoShot: newPlayersWhoShot,
      leaderboard: newLeaderboard,
      lastShot: shot,
      ships: newShips,
      shipsRemaining: newShipsRemaining,
      phase: newPhase,
      gameState: newPhase === 'finished' ? 'finished' : this.state.gameState,
      endTime: newPhase === 'finished' ? Date.now() : null,
    });

    return shot;
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'playing') return;

    const { GRID_SIZE, LETTERS } = BATTLESHIP_CONSTANTS;
    const msgUpper = message.message.toUpperCase().trim();
    const match = msgUpper.match(/^([A-J])(\d{1,2})$/);

    if (match) {
      const col = LETTERS.indexOf(match[1]);
      const row = parseInt(match[2]) - 1;

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const oderId = message.userId || message.username;
        this.shoot(oderId, message.username, message.color || '#a970ff', row, col);
      }
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      grid: this.state.phase === 'playing' || this.state.phase === 'finished' ? this.state.grid : null,
      ships: this.state.phase === 'finished'
        ? this.state.ships
        : this.state.ships.map(s => ({ ...s, positions: s.sunk ? s.positions : [] })),
      shots: this.state.shots,
      lastShot: this.state.lastShot,
      shipsRemaining: this.state.shipsRemaining,
      leaderboard: Array.from(this.state.leaderboard.entries()),
    };
  }
}

// Singleton
let instance: BattleshipService | null = null;

export function getBattleshipService(): BattleshipService {
  if (!instance) {
    instance = new BattleshipService();
  }
  return instance;
}

export function resetBattleshipService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
