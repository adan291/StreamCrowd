/**
 * CarreraService - Carrera de Emotes
 * 
 * Los viewers apuestan por emotes que compiten en una carrera.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface Racer {
  id: string;
  emote: string;
  name: string;
  position: number; // 0-100
  speed: number;
  bets: { username: string; color: string }[];
}

export interface CarreraState extends BaseGameState {
  phase: 'setup' | 'betting' | 'racing' | 'finished';
  racers: Racer[];
  winner: Racer | null;
  bettingTime: number;
  timeLeft: number;
}

const GAME_CONFIG: GameConfig = {
  gameId: 'carrera_emotes',
  channelName: 'carrera_emotes_sync',
  storageKey: 'carrera_emotes_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const DEFAULT_EMOTES = ['🐎', '🦄', '🐢', '🐇', '🦊', '🐼'];

const INITIAL_STATE: CarreraState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  racers: [],
  winner: null,
  bettingTime: 15,
  timeLeft: 0,
};

export class CarreraService extends BaseGameService<CarreraState> {
  private bettingTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE });
  }

  // ============ Game-Specific API ============

  getPhase(): CarreraState['phase'] {
    return this.state.phase;
  }

  getRacers(): Racer[] {
    return [...this.state.racers];
  }

  getWinner(): Racer | null {
    return this.state.winner;
  }

  getTimeLeft(): number {
    return this.state.timeLeft;
  }

  getTotalBets(): number {
    return this.state.racers.reduce((sum, r) => sum + r.bets.length, 0);
  }

  setBettingTime(seconds: number): void {
    this.setState({
      ...this.state,
      bettingTime: Math.max(5, Math.min(60, seconds)),
    });
  }

  // ============ Racer Management ============

  initializeDefaultRacers(): void {
    const defaultRacers: Racer[] = DEFAULT_EMOTES.slice(0, 4).map((emote, i) => ({
      id: `racer_${i}`,
      emote,
      name: `Corredor ${i + 1}`,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
      bets: [],
    }));
    this.setState({ ...this.state, racers: defaultRacers });
  }

  addRacer(emote: string, name?: string): Racer {
    const newRacer: Racer = {
      id: `racer_${Date.now()}`,
      emote,
      name: name || `Corredor ${this.state.racers.length + 1}`,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
      bets: [],
    };
    this.setState({
      ...this.state,
      racers: [...this.state.racers, newRacer],
    });
    return newRacer;
  }

  removeRacer(id: string): void {
    this.setState({
      ...this.state,
      racers: this.state.racers.filter(r => r.id !== id),
    });
  }

  setRacers(racers: Array<{ emote: string; name: string }>): void {
    const newRacers: Racer[] = racers.map((r, i) => ({
      id: `racer_${Date.now()}_${i}`,
      emote: r.emote,
      name: r.name,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
      bets: [],
    }));
    this.setState({ ...this.state, racers: newRacers });
  }

  // ============ Betting ============

  placeBet(oderId: string, username: string, color: string, racerIndex: number): boolean {
    if (this.state.phase !== 'betting') return false;
    if (racerIndex < 0 || racerIndex >= this.state.racers.length) return false;

    // Remove previous bet from this user
    const newRacers = this.state.racers.map(r => ({
      ...r,
      bets: r.bets.filter(b => b.username !== username),
    }));

    // Add new bet
    newRacers[racerIndex] = {
      ...newRacers[racerIndex],
      bets: [...newRacers[racerIndex].bets, { username, color }],
    };

    this.setState({ ...this.state, racers: newRacers });
    return true;
  }

  // ============ Game Lifecycle ============

  startBetting(): boolean {
    if (this.state.racers.length < 2) return false;

    this.setState({
      ...this.state,
      phase: 'betting',
      gameState: 'waiting',
      timeLeft: this.state.bettingTime,
    });

    this.startBettingTimer();
    return true;
  }

  private startBettingTimer(): void {
    this.stopBettingTimer();

    this.bettingTimer = setInterval(() => {
      const newTime = this.state.timeLeft - 1;
      if (newTime <= 0) {
        this.stopBettingTimer();
        this.startRace();
      } else {
        this.setState({ ...this.state, timeLeft: newTime });
      }
    }, 1000);
  }

  private stopBettingTimer(): void {
    if (this.bettingTimer) {
      clearInterval(this.bettingTimer);
      this.bettingTimer = null;
    }
  }

  startRace(): void {
    // Reset positions and assign speeds
    const racers = this.state.racers.map(r => ({
      ...r,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
    }));

    this.setState({
      ...this.state,
      racers,
      phase: 'racing',
      gameState: 'playing',
      startTime: Date.now(),
    });
  }

  // Called from component animation loop
  updateRacePositions(): Racer | null {
    if (this.state.phase !== 'racing') return null;

    const newRacers = this.state.racers.map(r => {
      const boost = Math.random() * 2;
      const newPosition = Math.min(100, r.position + r.speed + boost);
      return { ...r, position: newPosition };
    });

    const finisher = newRacers.find(r => r.position >= 100);
    if (finisher) {
      this.setState({
        ...this.state,
        racers: newRacers,
        winner: finisher,
        phase: 'finished',
        gameState: 'finished',
        endTime: Date.now(),
      });
      return finisher;
    }

    this.setState({ ...this.state, racers: newRacers });
    return null;
  }

  override reset(): void {
    this.stopBettingTimer();
    this.setState({ ...INITIAL_STATE });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'betting') return;

    const msgLower = message.message.toLowerCase().trim();

    // !apostar 1, !apostar 2, etc. or !bet
    if (msgLower.startsWith('!apostar ') || msgLower.startsWith('!bet ')) {
      const num = parseInt(msgLower.split(' ')[1]);
      if (isNaN(num) || num < 1 || num > this.state.racers.length) return;

      const oderId = message.userId || message.username;
      this.placeBet(oderId, message.username, message.color || '#a970ff', num - 1);
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      racers: this.state.racers,
      winner: this.state.winner,
      timeLeft: this.state.timeLeft,
      totalBets: this.getTotalBets(),
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.stopBettingTimer();
    super.dispose();
  }
}

// Singleton
let instance: CarreraService | null = null;

export function getCarreraService(): CarreraService {
  if (!instance) {
    instance = new CarreraService();
  }
  return instance;
}

export function resetCarreraService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
