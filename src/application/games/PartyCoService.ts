/**
 * PartyCoService - Juego Party & Co
 * 
 * Juego de pruebas variadas: trivia, mímica, dibujo, palabras, cultura, rapidez.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export type ChallengeType = 'trivia' | 'mimica' | 'dibujo' | 'palabras' | 'cultura' | 'rapidez';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  answer?: string;
  hints?: string[];
  timeLimit: number;
  points: number;
}

export interface PartyCoPlayer {
  oderId: string;
  username: string;
  color: string;
  score: number;
  wins: number;
  joinedAt: number;
}

export interface PartyCoState extends BaseGameState {
  phase: 'lobby' | 'rolling' | 'challenge' | 'results' | 'final';
  partyPlayers: Map<string, PartyCoPlayer>;
  currentChallenge: Challenge | null;
  timeLeft: number;
  diceValue: number;
  isRolling: boolean;
  roundWinner: PartyCoPlayer | null;
  pointsToWin: number;
  timeMultiplier: number;
  usedChallenges: Set<string>;
  enabledTypes: Set<ChallengeType>;
}

const GAME_CONFIG: GameConfig = {
  gameId: 'party_co',
  channelName: 'party_co_sync',
  storageKey: 'party_co_state',
  maxPlayers: 100,
  joinCommands: ['!co', '!party'],
  autoSync: true,
};

const INITIAL_STATE: PartyCoState = {
  gameState: 'idle',
  players: [],
  round: 0,
  startTime: null,
  endTime: null,
  phase: 'lobby',
  partyPlayers: new Map(),
  currentChallenge: null,
  timeLeft: 0,
  diceValue: 1,
  isRolling: false,
  roundWinner: null,
  pointsToWin: 50,
  timeMultiplier: 1,
  usedChallenges: new Set(),
  enabledTypes: new Set(['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez']),
};

export class PartyCoService extends BaseGameService<PartyCoState> {
  private challengeTimer: ReturnType<typeof setInterval> | null = null;
  private diceInterval: ReturnType<typeof setInterval> | null = null;
  private challenges: Challenge[] = [];

  constructor() {
    super(GAME_CONFIG, {
      ...INITIAL_STATE,
      partyPlayers: new Map(),
      usedChallenges: new Set(),
      enabledTypes: new Set(['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez']),
    });
  }

  // ============ Game-Specific API ============

  getPhase(): PartyCoState['phase'] {
    return this.state.phase;
  }

  getPartyPlayers(): PartyCoPlayer[] {
    return [...this.state.partyPlayers.values()].sort((a, b) => b.score - a.score);
  }

  getCurrentChallenge(): Challenge | null {
    return this.state.currentChallenge;
  }

  getTimeLeft(): number {
    return this.state.timeLeft;
  }

  getDiceValue(): number {
    return this.state.diceValue;
  }

  isRolling(): boolean {
    return this.state.isRolling;
  }

  getRoundWinner(): PartyCoPlayer | null {
    return this.state.roundWinner;
  }

  // ============ Configuration ============

  setChallenges(challenges: Challenge[]): void {
    this.challenges = challenges;
  }

  setPointsToWin(points: number): void {
    this.setState({ ...this.state, pointsToWin: Math.max(20, points) });
  }

  setTimeMultiplier(multiplier: number): void {
    this.setState({ ...this.state, timeMultiplier: multiplier });
  }

  toggleChallengeType(type: ChallengeType): void {
    const newTypes = new Set(this.state.enabledTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    this.setState({ ...this.state, enabledTypes: newTypes });
  }

  // ============ Player Management ============

  joinPlayer(oderId: string, username: string, color: string): boolean {
    if (this.state.phase !== 'lobby') return false;
    if (this.state.partyPlayers.has(oderId)) return false;

    const newPlayers = new Map(this.state.partyPlayers);
    newPlayers.set(oderId, {
      oderId,
      username,
      color,
      score: 0,
      wins: 0,
      joinedAt: Date.now(),
    });

    this.setState({ ...this.state, partyPlayers: newPlayers });
    return true;
  }

  // ============ Dice Rolling ============

  rollDice(): void {
    if (this.state.partyPlayers.size < 1) return;

    this.setState({
      ...this.state,
      isRolling: true,
      phase: 'rolling',
    });

    let rolls = 0;
    this.diceInterval = setInterval(() => {
      this.setState({
        ...this.state,
        diceValue: Math.floor(Math.random() * 6) + 1,
      });
      rolls++;

      if (rolls >= 15) {
        this.stopDiceRoll();
        const finalValue = Math.floor(Math.random() * 6) + 1;
        this.setState({ ...this.state, diceValue: finalValue, isRolling: false });
        setTimeout(() => this.selectChallenge(finalValue), 500);
      }
    }, 100);
  }

  private stopDiceRoll(): void {
    if (this.diceInterval) {
      clearInterval(this.diceInterval);
      this.diceInterval = null;
    }
  }

  private selectChallenge(diceResult: number): void {
    const types: ChallengeType[] = ['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez'];
    const selectedType = types[(diceResult - 1) % types.length];

    const available = this.challenges.filter(c =>
      c.type === selectedType &&
      this.state.enabledTypes.has(c.type) &&
      !this.state.usedChallenges.has(c.id)
    );

    if (available.length === 0) {
      this.setState({ ...this.state, usedChallenges: new Set() });
      const any = this.challenges.filter(c => this.state.enabledTypes.has(c.type));
      if (any.length > 0) {
        this.startChallenge(any[Math.floor(Math.random() * any.length)]);
      }
      return;
    }

    this.startChallenge(available[Math.floor(Math.random() * available.length)]);
  }

  startChallenge(challenge: Challenge): void {
    const newUsed = new Set(this.state.usedChallenges);
    newUsed.add(challenge.id);

    this.setState({
      ...this.state,
      currentChallenge: challenge,
      timeLeft: Math.round(challenge.timeLimit * this.state.timeMultiplier),
      roundWinner: null,
      round: this.state.round + 1,
      usedChallenges: newUsed,
      phase: 'challenge',
      gameState: 'playing',
    });

    this.startChallengeTimer();
  }

  private startChallengeTimer(): void {
    this.stopChallengeTimer();

    this.challengeTimer = setInterval(() => {
      const newTime = this.state.timeLeft - 1;
      if (newTime <= 0) {
        this.stopChallengeTimer();
        if (!this.state.roundWinner) {
          this.setState({ ...this.state, phase: 'results', timeLeft: 0 });
        }
      } else {
        this.setState({ ...this.state, timeLeft: newTime });
      }
    }, 1000);
  }

  private stopChallengeTimer(): void {
    if (this.challengeTimer) {
      clearInterval(this.challengeTimer);
      this.challengeTimer = null;
    }
  }

  nextRound(): void {
    this.setState({
      ...this.state,
      currentChallenge: null,
      roundWinner: null,
      phase: 'lobby',
    });
  }

  override reset(): void {
    this.stopChallengeTimer();
    this.stopDiceRoll();
    this.setState({
      ...INITIAL_STATE,
      partyPlayers: new Map(),
      usedChallenges: new Set(),
      enabledTypes: new Set(['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez']),
    });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    // Join game
    if (this.state.phase === 'lobby' && (msgLower === '!co' || msgLower === '!party')) {
      this.joinPlayer(oderId, message.username, message.color || '#a970ff');
      return;
    }

    // Answer during challenge
    if (this.state.phase === 'challenge' && this.state.currentChallenge && !this.state.roundWinner) {
      const challenge = this.state.currentChallenge;
      const answer = challenge.answer?.toLowerCase();
      const hints = challenge.hints?.map(h => h.toLowerCase()) || [];
      const allAnswers = answer ? [answer, ...hints] : [];

      const isCorrect = allAnswers.some(ans =>
        msgLower.includes(ans) || ans.includes(msgLower)
      );

      if (isCorrect) {
        const player = this.state.partyPlayers.get(oderId);
        if (player) {
          const updatedPlayer: PartyCoPlayer = {
            ...player,
            score: player.score + challenge.points,
            wins: player.wins + 1,
          };

          const newPlayers = new Map(this.state.partyPlayers);
          newPlayers.set(oderId, updatedPlayer);

          this.stopChallengeTimer();

          if (updatedPlayer.score >= this.state.pointsToWin) {
            this.setState({
              ...this.state,
              partyPlayers: newPlayers,
              roundWinner: updatedPlayer,
              phase: 'final',
              gameState: 'finished',
              endTime: Date.now(),
            });
          } else {
            this.setState({
              ...this.state,
              partyPlayers: newPlayers,
              roundWinner: updatedPlayer,
              phase: 'results',
            });
          }
        }
      }
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      currentChallenge: this.state.currentChallenge,
      timeLeft: this.state.timeLeft,
      diceValue: this.state.diceValue,
      isRolling: this.state.isRolling,
      roundWinner: this.state.roundWinner,
      roundNumber: this.state.round,
      topPlayers: this.getPartyPlayers().slice(0, 10),
      pointsToWin: this.state.pointsToWin,
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.stopChallengeTimer();
    this.stopDiceRoll();
    super.dispose();
  }
}

// Singleton
let instance: PartyCoService | null = null;

export function getPartyCoService(): PartyCoService {
  if (!instance) {
    instance = new PartyCoService();
  }
  return instance;
}

export function resetPartyCoService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
