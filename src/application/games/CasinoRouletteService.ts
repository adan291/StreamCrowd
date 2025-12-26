/**
 * CasinoRouletteService - Juego de Ruleta de Casino
 * 
 * Los usuarios apuestan a números (0-36) con !ruleta-X
 * La ruleta gira y determina ganadores.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface RouletteBet {
  oderId: string;
  username: string;
  number: number;
  color: string;
  timestamp: number;
}

export interface RouletteState extends BaseGameState {
  bets: RouletteBet[];
  isSpinning: boolean;
  rotation: number;
  result: number | null;
  showResult: boolean;
  bettingOpen: boolean;
  autoSpinEnabled: boolean;
  autoSpinInterval: number;
  timeToSpin: number;
  winners: RouletteBet[];
}

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const GAME_CONFIG: GameConfig = {
  gameId: 'casino_roulette',
  channelName: 'casino_roulette_sync',
  storageKey: 'casino_roulette_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: RouletteState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  bets: [],
  isSpinning: false,
  rotation: 0,
  result: null,
  showResult: false,
  bettingOpen: true,
  autoSpinEnabled: false,
  autoSpinInterval: 60,
  timeToSpin: 60,
  winners: [],
};

export class CasinoRouletteService extends BaseGameService<RouletteState> {
  private autoSpinTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE });
  }

  // ============ Static Helpers ============
  
  static getNumberColor(num: number): string {
    if (num === 0) return '#00AA00';
    return RED_NUMBERS.includes(num) ? '#DC2626' : '#1F2937';
  }

  static get ROULETTE_NUMBERS() { return ROULETTE_NUMBERS; }
  static get RED_NUMBERS() { return RED_NUMBERS; }

  // ============ Game-Specific API ============

  getBets(): RouletteBet[] {
    return [...this.state.bets];
  }

  getWinners(): RouletteBet[] {
    return [...this.state.winners];
  }

  getBetsByNumber(): Record<number, number> {
    return this.state.bets.reduce((acc, bet) => {
      acc[bet.number] = (acc[bet.number] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  setAutoSpin(enabled: boolean, interval?: number): void {
    if (interval !== undefined) {
      this.setState({
        ...this.state,
        autoSpinInterval: Math.max(10, Math.min(300, interval)),
      });
    }
    
    this.setState({
      ...this.state,
      autoSpinEnabled: enabled,
      timeToSpin: this.state.autoSpinInterval,
    });

    if (enabled) {
      this.startAutoSpinTimer();
    } else {
      this.stopAutoSpinTimer();
    }
  }

  openBetting(): void {
    this.setState({ ...this.state, bettingOpen: true });
  }

  closeBetting(): void {
    this.setState({ ...this.state, bettingOpen: false });
  }

  clearBets(): void {
    this.setState({ ...this.state, bets: [] });
  }

  // ============ Spin Logic ============

  spin(): { rotation: number; result: number } | null {
    if (this.state.isSpinning) return null;

    const resultIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const resultNumber = ROULETTE_NUMBERS[resultIndex];
    
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    const targetAngle = resultIndex * segmentAngle;
    const spins = 5 + Math.random() * 3;
    const totalRotation = this.state.rotation + (spins * 360) + (360 - targetAngle);

    this.setState({
      ...this.state,
      isSpinning: true,
      bettingOpen: false,
      showResult: false,
      result: null,
    });

    return { rotation: totalRotation, result: resultNumber };
  }

  completeSpinAnimation(finalRotation: number, result: number): void {
    const winners = this.state.bets.filter(b => b.number === result);
    
    this.setState({
      ...this.state,
      isSpinning: false,
      rotation: finalRotation,
      result,
      showResult: true,
      winners,
      round: this.state.round + 1,
    });
  }

  // ============ Game Lifecycle ============

  override reset(): void {
    this.stopAutoSpinTimer();
    this.setState({
      ...INITIAL_STATE,
      autoSpinInterval: this.state.autoSpinInterval,
    });
  }

  newRound(): void {
    this.setState({
      ...this.state,
      bets: [],
      result: null,
      showResult: false,
      bettingOpen: true,
      winners: [],
      timeToSpin: this.state.autoSpinInterval,
    });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (!this.state.bettingOpen || this.state.isSpinning) return;

    const msgLower = message.message.toLowerCase().trim();
    const match = msgLower.match(/^!ruleta[- ]?(\d+)$/);
    
    if (match) {
      const number = parseInt(match[1]);
      if (number >= 0 && number <= 36) {
        this.placeBet(message, number);
      }
    }
  }

  private placeBet(message: ChatMessage, number: number): void {
    const oderId = message.userId || message.username;
    
    // Check if user already bet
    if (this.state.bets.find(b => b.oderId === oderId)) return;

    const bet: RouletteBet = {
      oderId,
      username: message.displayName || message.username,
      number,
      color: message.color || '#a970ff',
      timestamp: Date.now(),
    };

    this.setState({
      ...this.state,
      bets: [...this.state.bets, bet],
    });
  }

  // ============ Auto-Spin Timer ============

  private startAutoSpinTimer(): void {
    this.stopAutoSpinTimer();
    
    this.autoSpinTimer = setInterval(() => {
      if (this.state.isSpinning) return;
      
      const newTime = this.state.timeToSpin - 1;
      if (newTime <= 0) {
        this.spin();
        this.setState({ ...this.state, timeToSpin: this.state.autoSpinInterval });
      } else {
        this.setState({ ...this.state, timeToSpin: newTime });
      }
    }, 1000);
  }

  private stopAutoSpinTimer(): void {
    if (this.autoSpinTimer) {
      clearInterval(this.autoSpinTimer);
      this.autoSpinTimer = null;
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      gameState: this.state.gameState,
      bets: this.state.bets,
      isSpinning: this.state.isSpinning,
      rotation: this.state.rotation,
      result: this.state.result,
      showResult: this.state.showResult,
      bettingOpen: this.state.bettingOpen,
      winners: this.state.winners,
      round: this.state.round,
      timeToSpin: this.state.timeToSpin,
      autoSpinEnabled: this.state.autoSpinEnabled,
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.stopAutoSpinTimer();
    super.dispose();
  }
}

// Singleton
let instance: CasinoRouletteService | null = null;

export function getCasinoRouletteService(): CasinoRouletteService {
  if (!instance) {
    instance = new CasinoRouletteService();
  }
  return instance;
}

export function resetCasinoRouletteService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
