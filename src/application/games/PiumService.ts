/**
 * PiumService - Juego de Billar/Pool
 * 
 * Los usuarios se convierten en bolas al escribir en el chat.
 * Con !pium disparan la bola blanca.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface PoolBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  username: string;
  isWhite: boolean;
  pocketed: boolean;
  shooter?: string;
  shooterColor?: string;
}

export interface PiumState extends BaseGameState {
  balls: PoolBall[];
  cueBall: PoolBall | null;
  scores: Map<string, number>;
  lastPocketed: { username: string; color: string } | null;
  cueBallReady: boolean;
  shotPower: number;
  shotAngle: number;
  isActive: boolean;
}

// Constants
export const PIUM_CONSTANTS = {
  BALL_RADIUS: 24,
  FRICTION: 0.985,
  POCKET_RADIUS: 36,
  CANVAS_WIDTH: 1400,
  CANVAS_HEIGHT: 760,
  MAX_BALLS: 20,
  COLORS: ['#FFD700', '#1E90FF', '#FF4500', '#9932CC', '#00CED1', '#FF69B4', '#32CD32', '#FF6347', '#4169E1', '#FFA500'],
};

const GAME_CONFIG: GameConfig = {
  gameId: 'pium_game',
  channelName: 'pium_game_sync',
  storageKey: 'pium_game_state',
  maxPlayers: PIUM_CONSTANTS.MAX_BALLS,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: PiumState = {
  gameState: 'playing',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  balls: [],
  cueBall: null,
  scores: new Map(),
  lastPocketed: null,
  cueBallReady: true,
  shotPower: 8,
  shotAngle: 0,
  isActive: true,
};

export class PiumService extends BaseGameService<PiumState> {
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, scores: new Map() });
    this.initCueBall();
  }

  // ============ Pocket Positions ============

  getPockets(): Array<{ x: number; y: number }> {
    const { CANVAS_WIDTH: w, CANVAS_HEIGHT: h } = PIUM_CONSTANTS;
    const margin = 44;
    return [
      { x: margin, y: margin },
      { x: w / 2, y: margin - 6 },
      { x: w - margin, y: margin },
      { x: margin, y: h - margin },
      { x: w / 2, y: h - margin + 6 },
      { x: w - margin, y: h - margin },
    ];
  }

  // ============ Game-Specific API ============

  getBalls(): PoolBall[] {
    return this.state.balls.filter(b => !b.pocketed);
  }

  getCueBall(): PoolBall | null {
    return this.state.cueBall;
  }

  getScores(): Array<[string, number]> {
    return Array.from(this.state.scores.entries()).sort((a, b) => b[1] - a[1]);
  }

  getTopScores(limit = 5): Array<{ username: string; score: number }> {
    return this.getScores()
      .slice(0, limit)
      .map(([username, score]) => ({ username, score }));
  }

  setActive(active: boolean): void {
    this.setState({ ...this.state, isActive: active });
  }

  setShotParams(angle?: number, power?: number): void {
    this.setState({
      ...this.state,
      shotAngle: angle ?? this.state.shotAngle,
      shotPower: power !== undefined ? Math.max(3, Math.min(15, power)) : this.state.shotPower,
    });
  }

  setCueBallReady(ready: boolean): void {
    this.setState({ ...this.state, cueBallReady: ready });
  }

  clearLastPocketed(): void {
    this.setState({ ...this.state, lastPocketed: null });
  }

  // ============ Ball Management ============

  private initCueBall(): void {
    if (!this.state.cueBall) {
      const cueBall: PoolBall = {
        id: 'cue_ball',
        x: PIUM_CONSTANTS.CANVAS_WIDTH * 0.2,
        y: PIUM_CONSTANTS.CANVAS_HEIGHT / 2,
        vx: 0,
        vy: 0,
        radius: PIUM_CONSTANTS.BALL_RADIUS,
        color: '#FFFFFF',
        username: '',
        isWhite: true,
        pocketed: false,
      };
      this.setState({ ...this.state, cueBall });
    }
  }

  addBall(oderId: string, username: string, color: string): PoolBall | null {
    if (this.state.balls.filter(b => !b.pocketed).length >= PIUM_CONSTANTS.MAX_BALLS) {
      return null;
    }

    const existing = this.state.balls.find(b => b.id === oderId && !b.pocketed);
    if (existing) return existing;

    const pos = this.getSpawnPosition();
    const newBall: PoolBall = {
      id: oderId,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: PIUM_CONSTANTS.BALL_RADIUS,
      color: color || PIUM_CONSTANTS.COLORS[Math.floor(Math.random() * PIUM_CONSTANTS.COLORS.length)],
      username,
      isWhite: false,
      pocketed: false,
    };

    this.setState({
      ...this.state,
      balls: [...this.state.balls, newBall].slice(-PIUM_CONSTANTS.MAX_BALLS),
    });

    return newBall;
  }

  private getSpawnPosition(): { x: number; y: number } {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS, POCKET_RADIUS } = PIUM_CONSTANTS;
    const margin = 80;
    const cueBallX = CANVAS_WIDTH * 0.2;
    
    const minX = cueBallX + BALL_RADIUS * 4;
    const maxX = CANVAS_WIDTH - margin;
    const minY = margin;
    const maxY = CANVAS_HEIGHT - margin;

    let pos = { x: 0, y: 0 };
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      pos = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };

      let overlaps = false;

      // Check against existing balls
      for (const ball of this.state.balls) {
        if (ball.pocketed) continue;
        const dx = pos.x - ball.x;
        const dy = pos.y - ball.y;
        if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS * 3) {
          overlaps = true;
          break;
        }
      }

      // Check against pockets
      if (!overlaps) {
        for (const pocket of this.getPockets()) {
          const dx = pos.x - pocket.x;
          const dy = pos.y - pocket.y;
          if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS + BALL_RADIUS + 15) {
            overlaps = true;
            break;
          }
        }
      }

      if (!overlaps) break;
      attempts++;
    }

    return pos;
  }

  // ============ Shooting ============

  shoot(shooter: string, shooterColor: string, angle?: number, power?: number): boolean {
    if (!this.state.cueBallReady || this.state.balls.filter(b => !b.pocketed).length === 0) {
      return false;
    }

    const finalAngle = (angle ?? this.state.shotAngle) * (Math.PI / 180);
    const finalPower = power ?? this.state.shotPower;

    if (this.state.cueBall) {
      const updatedCueBall: PoolBall = {
        ...this.state.cueBall,
        vx: Math.cos(finalAngle) * finalPower,
        vy: Math.sin(finalAngle) * finalPower,
        shooter,
        shooterColor,
      };

      this.setState({
        ...this.state,
        cueBall: updatedCueBall,
        cueBallReady: false,
      });

      return true;
    }

    return false;
  }

  // ============ Physics Update (called from component) ============

  updateBallPosition(ballId: string, x: number, y: number, vx: number, vy: number): void {
    if (ballId === 'cue_ball' && this.state.cueBall) {
      this.setState({
        ...this.state,
        cueBall: { ...this.state.cueBall, x, y, vx, vy },
      });
    } else {
      this.setState({
        ...this.state,
        balls: this.state.balls.map(b =>
          b.id === ballId ? { ...b, x, y, vx, vy } : b
        ),
      });
    }
  }

  pocketBall(ballId: string): void {
    const ball = this.state.balls.find(b => b.id === ballId);
    if (!ball || ball.pocketed) return;

    const shooter = this.state.cueBall?.shooter;
    let newScores = new Map(this.state.scores);
    
    if (shooter) {
      const currentScore = newScores.get(shooter) || 0;
      newScores.set(shooter, currentScore + 10);
    }

    this.setState({
      ...this.state,
      balls: this.state.balls.map(b =>
        b.id === ballId ? { ...b, pocketed: true } : b
      ),
      lastPocketed: { username: ball.username, color: ball.color },
      scores: newScores,
    });
  }

  resetCueBall(): void {
    if (this.state.cueBall) {
      this.setState({
        ...this.state,
        cueBall: {
          ...this.state.cueBall,
          x: PIUM_CONSTANTS.CANVAS_WIDTH * 0.2,
          y: PIUM_CONSTANTS.CANVAS_HEIGHT / 2,
          vx: 0,
          vy: 0,
        },
      });
    }
  }

  // ============ Game Lifecycle ============

  clearTable(): void {
    this.setState({
      ...this.state,
      balls: [],
      cueBall: this.state.cueBall ? {
        ...this.state.cueBall,
        x: PIUM_CONSTANTS.CANVAS_WIDTH * 0.2,
        y: PIUM_CONSTANTS.CANVAS_HEIGHT / 2,
        vx: 0,
        vy: 0,
      } : null,
      cueBallReady: true,
      lastPocketed: null,
    });
  }

  resetScores(): void {
    this.setState({ ...this.state, scores: new Map() });
  }

  override reset(): void {
    this.setState({
      ...INITIAL_STATE,
      scores: new Map(),
    });
    this.initCueBall();
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (!this.state.isActive) return;

    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    // !pium shoots the cue ball
    if (msgLower === '!pium' || msgLower.startsWith('!pium ') || msgLower.startsWith('!pium-')) {
      let angle = this.state.shotAngle;
      let power = this.state.shotPower;

      if (msgLower.startsWith('!pium-')) {
        const parts = msgLower.split('-');
        if (parts[1]) {
          const angleNum = parseInt(parts[1]);
          if (!isNaN(angleNum)) angle = angleNum;
        }
        if (parts[2]) {
          const powerNum = parseInt(parts[2]);
          if (!isNaN(powerNum)) power = Math.max(3, Math.min(15, powerNum));
        }
      } else if (msgLower.startsWith('!pium ')) {
        const parts = msgLower.split(' ');
        if (parts[1]) {
          const num = parseInt(parts[1]);
          if (!isNaN(num)) angle = num;
        }
      }

      this.shoot(message.username, message.color || '#fff', angle, power);
      return;
    }

    // Any other message adds the user as a ball
    this.addBall(oderId, message.username, message.color || '');
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      balls: this.state.balls.filter(b => !b.pocketed),
      cueBall: this.state.cueBall,
      scores: Array.from(this.state.scores.entries()),
      pockets: this.getPockets(),
      cueBallReady: this.state.cueBallReady,
      shotAngle: this.state.shotAngle,
      shotPower: this.state.shotPower,
      lastPocketed: this.state.lastPocketed,
    };
  }
}

// Singleton
let instance: PiumService | null = null;

export function getPiumService(): PiumService {
  if (!instance) {
    instance = new PiumService();
  }
  return instance;
}

export function resetPiumService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
