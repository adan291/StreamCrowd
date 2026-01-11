/**
 * VeoVeoService - Juego Veo Veo
 * 
 * El streamer da pistas y el chat intenta adivinar con !veo [respuesta]
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface VeoVeoPlayer {
  oderId: string;
  username: string;
  color: string;
  score: number;
  guesses: number;
}

export interface VeoVeoGuess {
  username: string;
  color: string;
  guess: string;
  correct: boolean;
}

export interface VeoVeoState extends BaseGameState {
  phase: 'setup' | 'playing' | 'revealed';
  secretWord: string;
  hintsGiven: string[];
  guesses: VeoVeoGuess[];
  winner: { username: string; color: string } | null;
  veoPlayers: Map<string, VeoVeoPlayer>;
}

const GAME_CONFIG: GameConfig = {
  gameId: 'veoveo',
  channelName: 'veoveo_sync',
  storageKey: 'veoveo_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: VeoVeoState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  secretWord: '',
  hintsGiven: [],
  guesses: [],
  winner: null,
  veoPlayers: new Map(),
};

export class VeoVeoService extends BaseGameService<VeoVeoState> {
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, veoPlayers: new Map() });
  }

  // ============ Game-Specific API ============

  getPhase(): VeoVeoState['phase'] {
    return this.state.phase;
  }

  getHints(): string[] {
    return [...this.state.hintsGiven];
  }

  getCurrentHint(): string {
    return this.state.hintsGiven[this.state.hintsGiven.length - 1] || '';
  }

  getGuesses(): VeoVeoGuess[] {
    return [...this.state.guesses];
  }

  getWinner(): { username: string; color: string } | null {
    return this.state.winner;
  }

  getSecretWord(): string {
    return this.state.secretWord;
  }

  getVeoVeoPlayers(): VeoVeoPlayer[] {
    return [...this.state.veoPlayers.values()].sort((a, b) => b.score - a.score);
  }

  // ============ Setup ============

  setSecretWord(word: string): void {
    this.setState({ ...this.state, secretWord: word });
  }

  addHint(hint: string): void {
    if (!hint.trim()) return;
    this.setState({
      ...this.state,
      hintsGiven: [...this.state.hintsGiven, hint],
    });
  }

  // ============ Game Lifecycle ============

  startGame(secretWord: string, firstHint: string): boolean {
    if (!secretWord.trim() || !firstHint.trim()) return false;

    this.setState({
      ...this.state,
      secretWord,
      hintsGiven: [firstHint],
      guesses: [],
      winner: null,
      phase: 'playing',
      gameState: 'playing',
      startTime: Date.now(),
    });

    return true;
  }

  revealAnswer(): void {
    this.setState({
      ...this.state,
      phase: 'revealed',
      gameState: 'finished',
      endTime: Date.now(),
    });
  }

  override reset(): void {
    this.setState({ ...INITIAL_STATE, veoPlayers: new Map() });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'playing') return;

    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    // !veo [guess]
    if (msgLower.startsWith('!veo ')) {
      const guess = message.message.slice(5).trim();
      if (!guess) return;

      const isCorrect = guess.toLowerCase() === this.state.secretWord.toLowerCase();

      const newGuess: VeoVeoGuess = {
        username: message.username,
        color: message.color || '#a970ff',
        guess,
        correct: isCorrect,
      };

      // Update player stats
      const newPlayers = new Map(this.state.veoPlayers);
      const existing = newPlayers.get(oderId);
      newPlayers.set(oderId, {
        oderId,
        username: message.username,
        color: message.color || '#a970ff',
        score: (existing?.score || 0) + (isCorrect ? 100 : 0),
        guesses: (existing?.guesses || 0) + 1,
      });

      if (isCorrect) {
        this.setState({
          ...this.state,
          guesses: [...this.state.guesses, newGuess].slice(-50),
          veoPlayers: newPlayers,
          winner: { username: message.username, color: message.color || '#a970ff' },
          phase: 'revealed',
          gameState: 'finished',
          endTime: Date.now(),
        });
      } else {
        this.setState({
          ...this.state,
          guesses: [...this.state.guesses, newGuess].slice(-50),
          veoPlayers: newPlayers,
        });
      }
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      hint: this.getCurrentHint(),
      hintsGiven: this.state.hintsGiven,
      guesses: this.state.guesses.slice(-10),
      winner: this.state.winner,
      revealedWord: this.state.phase === 'revealed' ? this.state.secretWord : null,
    };
  }
}

// Singleton
let instance: VeoVeoService | null = null;

export function getVeoVeoService(): VeoVeoService {
  if (!instance) {
    instance = new VeoVeoService();
  }
  return instance;
}

export function resetVeoVeoService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
