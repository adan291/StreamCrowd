/**
 * DuckHuntService - Juego de Caza de Patos
 * 
 * Los viewers escriben !pato para aparecer como patos.
 * El streamer hace clic para dispararles.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface Duck {
  id: string;
  oderId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isAlive: boolean;
  canDodge: boolean;
  spawnTime: number;
}

export interface DuckKill {
  username: string;
  color: string;
  timestamp: number;
}

export interface DuckHuntState extends BaseGameState {
  ducks: Duck[];
  score: number;
  shotsFired: number;
  kills: DuckKill[];
  lastHitPos: { x: number; y: number; hit: boolean } | null;
  isActive: boolean;
}

export const DUCKHUNT_CONSTANTS = {
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 400,
  DUCK_SIZE: 40,
  MAX_DUCKS: 25,
  DODGE_COOLDOWN: 1000,
};

const GAME_CONFIG: GameConfig = {
  gameId: 'duckhunt',
  channelName: 'duckhunt_sync',
  storageKey: 'duckhunt_state',
  maxPlayers: DUCKHUNT_CONSTANTS.MAX_DUCKS,
  joinCommands: ['!pato', '!duck'],
  autoSync: true,
};

const INITIAL_STATE: DuckHuntState = {
  gameState: 'playing',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  ducks: [],
  score: 0,
  shotsFired: 0,
  kills: [],
  lastHitPos: null,
  isActive: true,
};

export class DuckHuntService extends BaseGameService<DuckHuntState> {
  private dodgeCooldowns = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE });
  }

  // ============ Game-Specific API ============

  getDucks(): Duck[] {
    return this.state.ducks.filter(d => d.isAlive);
  }

  getAllDucks(): Duck[] {
    return [...this.state.ducks];
  }

  getScore(): number {
    return this.state.score;
  }

  getShotsFired(): number {
    return this.state.shotsFired;
  }

  getKills(): DuckKill[] {
    return [...this.state.kills];
  }

  getAccuracy(): number {
    return this.state.shotsFired > 0 
      ? Math.round((this.state.kills.length / this.state.shotsFired) * 100) 
      : 0;
  }

  getLastHitPos(): { x: number; y: number; hit: boolean } | null {
    return this.state.lastHitPos;
  }

  setActive(active: boolean): void {
    this.setState({ ...this.state, isActive: active });
  }

  clearLastHit(): void {
    this.setState({ ...this.state, lastHitPos: null });
  }

  // ============ Duck Management ============

  spawnDuck(oderId: string, username: string, color: string): Duck | null {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, DUCK_SIZE } = DUCKHUNT_CONSTANTS;
    
    // Check if user already has a duck
    const existingDuck = this.state.ducks.find(d => d.oderId === oderId && d.isAlive);
    if (existingDuck) return null;

    const newDuck: Duck = {
      id: `duck_${Date.now()}_${Math.random()}`,
      oderId,
      username,
      color: color || '#FFD700',
      x: 50 + Math.random() * (CANVAS_WIDTH - 100),
      y: 50 + Math.random() * (CANVAS_HEIGHT - 150),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1,
      isAlive: true,
      canDodge: true,
      spawnTime: Date.now(),
    };

    this.setState({
      ...this.state,
      ducks: [...this.state.ducks, newDuck].slice(-DUCKHUNT_CONSTANTS.MAX_DUCKS),
    });

    return newDuck;
  }

  dodge(oderId: string): boolean {
    const duck = this.state.ducks.find(d => d.oderId === oderId && d.isAlive);
    if (!duck || !duck.canDodge) return false;

    // Dramatic dodge movement
    const dodgeVy = duck.vy > 0 ? -2.5 - Math.random() : 2.5 + Math.random();
    const dodgeVx = (Math.random() - 0.5) * 2;

    this.setState({
      ...this.state,
      ducks: this.state.ducks.map(d =>
        d.oderId === oderId && d.isAlive
          ? { ...d, vy: dodgeVy, vx: d.vx + dodgeVx, canDodge: false }
          : d
      ),
    });

    // Reset dodge cooldown
    const existingTimeout = this.dodgeCooldowns.get(oderId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      this.setState({
        ...this.state,
        ducks: this.state.ducks.map(d =>
          d.oderId === oderId ? { ...d, canDodge: true } : d
        ),
      });
      this.dodgeCooldowns.delete(oderId);
    }, DUCKHUNT_CONSTANTS.DODGE_COOLDOWN);

    this.dodgeCooldowns.set(oderId, timeout);
    return true;
  }

  updateDuckPositions(updatedDucks: Duck[]): void {
    this.setState({ ...this.state, ducks: updatedDucks });
  }

  // ============ Shooting ============

  shoot(clickX: number, clickY: number): Duck | null {
    if (!this.state.isActive) return null;

    this.setState({
      ...this.state,
      shotsFired: this.state.shotsFired + 1,
    });

    let hitDuck: Duck | null = null;
    
    for (const duck of this.state.ducks) {
      if (!duck.isAlive) continue;
      const dx = duck.x - clickX;
      const dy = duck.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < DUCKHUNT_CONSTANTS.DUCK_SIZE * 1.3) {
        hitDuck = duck;
        break;
      }
    }

    this.setState({
      ...this.state,
      lastHitPos: { x: clickX, y: clickY, hit: !!hitDuck },
    });

    if (hitDuck) {
      const kill: DuckKill = {
        username: hitDuck.username,
        color: hitDuck.color,
        timestamp: Date.now(),
      };

      this.setState({
        ...this.state,
        ducks: this.state.ducks.map(d =>
          d.id === hitDuck!.id ? { ...d, isAlive: false } : d
        ),
        score: this.state.score + 100,
        kills: [...this.state.kills, kill].slice(-10),
      });

      // Remove dead duck after animation
      setTimeout(() => {
        this.setState({
          ...this.state,
          ducks: this.state.ducks.filter(d => d.id !== hitDuck!.id),
        });
      }, 500);
    }

    return hitDuck;
  }

  // ============ Game Lifecycle ============

  override reset(): void {
    // Clear all dodge cooldowns
    this.dodgeCooldowns.forEach(timeout => clearTimeout(timeout));
    this.dodgeCooldowns.clear();
    
    this.setState({ ...INITIAL_STATE });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (!this.state.isActive) return;

    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    if (msgLower === '!pato' || msgLower === '!duck') {
      const existingDuck = this.state.ducks.find(d => d.oderId === oderId && d.isAlive);
      
      if (existingDuck) {
        // Try to dodge
        this.dodge(oderId);
      } else {
        // Spawn new duck
        this.spawnDuck(oderId, message.username, message.color || '#FFD700');
      }
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      ducks: this.state.ducks,
      score: this.state.score,
      kills: this.state.kills.slice(-5),
      shotsFired: this.state.shotsFired,
      accuracy: this.getAccuracy(),
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.dodgeCooldowns.forEach(timeout => clearTimeout(timeout));
    this.dodgeCooldowns.clear();
    super.dispose();
  }
}

// Singleton
let instance: DuckHuntService | null = null;

export function getDuckHuntService(): DuckHuntService {
  if (!instance) {
    instance = new DuckHuntService();
  }
  return instance;
}

export function resetDuckHuntService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
