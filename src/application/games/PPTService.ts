/**
 * PPTService - Piedra Papel Tijera
 * 
 * Torneo eliminatorio donde los viewers eligen piedra, papel o tijera.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export type PPTChoice = 'piedra' | 'papel' | 'tijera';

export interface PPTPlayer {
  oderId: string;
  username: string;
  color: string;
  choice: PPTChoice | null;
  wins: number;
  eliminated: boolean;
}

export interface PPTState extends BaseGameState {
  phase: 'waiting' | 'choosing' | 'reveal' | 'finished';
  pptPlayers: Map<string, PPTPlayer>;
  roundTime: number;
  timeLeft: number;
  champion: PPTPlayer | null;
}

const GAME_CONFIG: GameConfig = {
  gameId: 'ppt',
  channelName: 'ppt_sync',
  storageKey: 'ppt_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: PPTState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'waiting',
  pptPlayers: new Map(),
  roundTime: 10,
  timeLeft: 0,
  champion: null,
};

const EMOJIS: Record<PPTChoice, string> = { piedra: '🪨', papel: '📄', tijera: '✂️' };

export class PPTService extends BaseGameService<PPTState> {
  private roundTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, pptPlayers: new Map() });
  }

  // ============ Game-Specific API ============

  getPhase(): PPTState['phase'] {
    return this.state.phase;
  }

  getPPTActivePlayers(): PPTPlayer[] {
    return [...this.state.pptPlayers.values()].filter(p => !p.eliminated);
  }

  getPPTAllPlayers(): PPTPlayer[] {
    return [...this.state.pptPlayers.values()];
  }

  getChampion(): PPTPlayer | null {
    return this.state.champion;
  }

  getTimeLeft(): number {
    return this.state.timeLeft;
  }

  getChosenCount(): number {
    return this.getPPTActivePlayers().filter(p => p.choice).length;
  }

  setRoundTime(seconds: number): void {
    this.setState({
      ...this.state,
      roundTime: Math.max(5, Math.min(30, seconds)),
    });
  }

  // ============ Game Lifecycle ============

  startGame(): void {
    this.setState({
      ...this.state,
      pptPlayers: new Map(),
      round: 1,
      champion: null,
      timeLeft: this.state.roundTime,
      phase: 'choosing',
      gameState: 'playing',
      startTime: Date.now(),
    });

    this.startRoundTimer();
  }

  private startRoundTimer(): void {
    this.stopRoundTimer();

    this.roundTimer = setInterval(() => {
      const newTime = this.state.timeLeft - 1;
      if (newTime <= 0) {
        this.stopRoundTimer();
        this.resolveRound();
      } else {
        this.setState({ ...this.state, timeLeft: newTime });
      }
    }, 1000);
  }

  private stopRoundTimer(): void {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private resolveRound(): void {
    this.setState({ ...this.state, phase: 'reveal' });

    const active = this.getPPTActivePlayers().filter(p => p.choice);
    
    if (active.length < 2) {
      setTimeout(() => {
        if (active.length === 1) {
          this.setState({
            ...this.state,
            champion: active[0],
            phase: 'finished',
            gameState: 'finished',
            endTime: Date.now(),
          });
        } else {
          this.nextRound();
        }
      }, 2000);
      return;
    }

    // Count choices
    const counts = { piedra: 0, papel: 0, tijera: 0 };
    active.forEach(p => { if (p.choice) counts[p.choice]++; });

    // Determine losing choice
    let losingChoice: PPTChoice | null = null;
    if (counts.piedra > 0 && counts.papel > 0 && counts.tijera === 0) {
      losingChoice = 'piedra';
    } else if (counts.papel > 0 && counts.tijera > 0 && counts.piedra === 0) {
      losingChoice = 'papel';
    } else if (counts.tijera > 0 && counts.piedra > 0 && counts.papel === 0) {
      losingChoice = 'tijera';
    }

    if (losingChoice) {
      const newPlayers = new Map(this.state.pptPlayers);
      newPlayers.forEach((player, key) => {
        if (player.choice === losingChoice) {
          newPlayers.set(key, { ...player, eliminated: true });
        }
      });
      this.setState({ ...this.state, pptPlayers: newPlayers });
    }

    setTimeout(() => {
      const remaining = [...this.state.pptPlayers.values()].filter(p => !p.eliminated && p.choice);
      if (remaining.length <= 1) {
        this.setState({
          ...this.state,
          champion: remaining.length === 1 ? remaining[0] : null,
          phase: 'finished',
          gameState: 'finished',
          endTime: Date.now(),
        });
      } else {
        this.nextRound();
      }
    }, 3000);
  }

  private nextRound(): void {
    const newPlayers = new Map(this.state.pptPlayers);
    newPlayers.forEach((player, key) => {
      newPlayers.set(key, { ...player, choice: null });
    });

    this.setState({
      ...this.state,
      pptPlayers: newPlayers,
      round: this.state.round + 1,
      timeLeft: this.state.roundTime,
      phase: 'choosing',
    });

    this.startRoundTimer();
  }

  override reset(): void {
    this.stopRoundTimer();
    this.setState({ ...INITIAL_STATE, pptPlayers: new Map() });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'choosing') return;

    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    let choice: PPTChoice | null = null;
    if (msgLower === '!piedra' || msgLower === '🪨' || msgLower === 'piedra') choice = 'piedra';
    else if (msgLower === '!papel' || msgLower === '📄' || msgLower === 'papel') choice = 'papel';
    else if (msgLower === '!tijera' || msgLower === '!tijeras' || msgLower === '✂️' || msgLower === 'tijera') choice = 'tijera';

    if (choice) {
      const newPlayers = new Map(this.state.pptPlayers);
      const existing = newPlayers.get(oderId);

      if (existing && !existing.eliminated) {
        newPlayers.set(oderId, { ...existing, choice });
      } else if (!existing) {
        newPlayers.set(oderId, {
          oderId,
          username: message.username,
          color: message.color || '#a970ff',
          choice,
          wins: 0,
          eliminated: false,
        });
      }

      this.setState({ ...this.state, pptPlayers: newPlayers });
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      players: this.getPPTActivePlayers(),
      round: this.state.round,
      timeLeft: this.state.timeLeft,
      champion: this.state.champion,
      chosenCount: this.getChosenCount(),
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.stopRoundTimer();
    super.dispose();
  }
}

// Singleton
let instance: PPTService | null = null;

export function getPPTService(): PPTService {
  if (!instance) {
    instance = new PPTService();
  }
  return instance;
}

export function resetPPTService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
