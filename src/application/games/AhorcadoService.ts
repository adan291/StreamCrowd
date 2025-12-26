/**
 * AhorcadoService - Juego del Ahorcado
 * 
 * El streamer configura una palabra secreta y el chat intenta adivinarla
 * letra por letra con !letra X o la palabra completa con !palabra XXXX
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface AhorcadoContributor {
  username: string;
  color: string;
  letter: string;
  correct: boolean;
}

export type AhorcadoGamePhase = 'setup' | 'playing' | 'won' | 'lost';

export interface AhorcadoState extends BaseGameState {
  phase: AhorcadoGamePhase;
  secretWord: string;
  hint: string;
  guessedLetters: Set<string>;
  errors: number;
  maxErrors: number;
  contributors: AhorcadoContributor[];
}

const MAX_ERRORS = 6;

const GAME_CONFIG: GameConfig = {
  gameId: 'ahorcado',
  channelName: 'ahorcado_sync',
  storageKey: 'ahorcado_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: AhorcadoState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  secretWord: '',
  hint: '',
  guessedLetters: new Set(),
  errors: 0,
  maxErrors: MAX_ERRORS,
  contributors: [],
};

export class AhorcadoService extends BaseGameService<AhorcadoState> {
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, guessedLetters: new Set() });
  }

  // ============ Helpers ============

  private normalizeChar(char: string): string {
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // ============ Game-Specific API ============

  getPhase(): AhorcadoGamePhase {
    return this.state.phase;
  }

  getDisplayWord(): string {
    return this.state.secretWord.split('').map(char => {
      if (char === ' ') return '  ';
      const normalized = this.normalizeChar(char);
      return this.state.guessedLetters.has(normalized) ? char : '_';
    }).join(' ');
  }

  getGuessedLetters(): string[] {
    return [...this.state.guessedLetters];
  }

  getContributors(): AhorcadoContributor[] {
    return [...this.state.contributors];
  }

  getErrors(): number {
    return this.state.errors;
  }

  getMaxErrors(): number {
    return this.state.maxErrors;
  }

  getRemainingLives(): number {
    return this.state.maxErrors - this.state.errors;
  }

  getHint(): string {
    return this.state.hint;
  }

  getSecretWord(): string {
    return this.state.secretWord;
  }

  isLetterCorrect(letter: string): boolean {
    const normalized = this.normalizeChar(letter);
    return this.state.secretWord.split('').some(char => this.normalizeChar(char) === normalized);
  }

  private isWordComplete(): boolean {
    return this.state.secretWord.split('').every(char => {
      if (char === ' ') return true;
      return this.state.guessedLetters.has(this.normalizeChar(char));
    });
  }

  // ============ Setup ============

  setSecretWord(word: string): void {
    this.setState({
      ...this.state,
      secretWord: word.toUpperCase(),
    });
  }

  setHint(hint: string): void {
    this.setState({ ...this.state, hint });
  }

  // ============ Game Lifecycle ============

  startGame(): boolean {
    if (!this.state.secretWord.trim()) return false;

    this.setState({
      ...this.state,
      phase: 'playing',
      gameState: 'playing',
      guessedLetters: new Set(),
      errors: 0,
      contributors: [],
      startTime: Date.now(),
    });

    return true;
  }

  override reset(): void {
    this.setState({
      ...INITIAL_STATE,
      guessedLetters: new Set(),
    });
  }

  // ============ Guessing ============

  guessLetter(letter: string, username: string, color: string): { success: boolean; correct: boolean } {
    if (this.state.phase !== 'playing') return { success: false, correct: false };

    const normalized = this.normalizeChar(letter);
    if (!normalized || !/[a-z]/.test(normalized)) return { success: false, correct: false };
    if (this.state.guessedLetters.has(normalized)) return { success: false, correct: false };

    const isCorrect = this.isLetterCorrect(normalized);
    const newGuessedLetters = new Set([...this.state.guessedLetters, normalized]);
    const newErrors = isCorrect ? this.state.errors : this.state.errors + 1;

    const contributor: AhorcadoContributor = {
      username,
      color,
      letter: letter.toUpperCase(),
      correct: isCorrect,
    };

    this.setState({
      ...this.state,
      guessedLetters: newGuessedLetters,
      errors: newErrors,
      contributors: [...this.state.contributors, contributor].slice(-50),
    });

    // Check game end conditions
    this.checkGameEnd();

    return { success: true, correct: isCorrect };
  }

  guessWord(word: string, username: string, color: string): { success: boolean; correct: boolean } {
    if (this.state.phase !== 'playing') return { success: false, correct: false };

    const isCorrect = this.normalizeChar(word) === this.normalizeChar(this.state.secretWord);

    if (isCorrect) {
      // Reveal all letters
      const allLetters = new Set(this.state.guessedLetters);
      this.state.secretWord.split('').forEach(char => {
        if (char !== ' ') {
          allLetters.add(this.normalizeChar(char));
        }
      });

      const contributor: AhorcadoContributor = {
        username,
        color,
        letter: '🎯 PALABRA',
        correct: true,
      };

      this.setState({
        ...this.state,
        guessedLetters: allLetters,
        contributors: [...this.state.contributors, contributor],
        phase: 'won',
        gameState: 'finished',
        endTime: Date.now(),
      });
    } else {
      // Penalty for wrong word guess
      const newErrors = this.state.errors + 2;
      const contributor: AhorcadoContributor = {
        username,
        color,
        letter: '❌ ' + word.slice(0, 10),
        correct: false,
      };

      this.setState({
        ...this.state,
        errors: newErrors,
        contributors: [...this.state.contributors, contributor],
      });

      this.checkGameEnd();
    }

    return { success: true, correct: isCorrect };
  }

  private checkGameEnd(): void {
    if (this.state.errors >= this.state.maxErrors) {
      this.setState({
        ...this.state,
        phase: 'lost',
        gameState: 'finished',
        endTime: Date.now(),
      });
    } else if (this.isWordComplete()) {
      this.setState({
        ...this.state,
        phase: 'won',
        gameState: 'finished',
        endTime: Date.now(),
      });
    }
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'playing') return;

    const msgLower = message.message.toLowerCase().trim();
    const color = message.color || '#a970ff';

    // !letra X
    if (msgLower.startsWith('!letra ')) {
      const letter = msgLower.slice(7).trim().charAt(0);
      this.guessLetter(letter, message.username, color);
      return;
    }

    // !palabra XXXX
    if (msgLower.startsWith('!palabra ')) {
      const guess = msgLower.slice(9).trim();
      this.guessWord(guess, message.username, color);
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      displayWord: this.getDisplayWord(),
      hint: this.state.hint,
      guessedLetters: [...this.state.guessedLetters],
      errors: this.state.errors,
      maxErrors: this.state.maxErrors,
      contributors: this.state.contributors.slice(-10),
      secretWord: this.state.phase === 'won' || this.state.phase === 'lost' 
        ? this.state.secretWord 
        : null,
    };
  }
}

// Singleton
let instance: AhorcadoService | null = null;

export function getAhorcadoService(): AhorcadoService {
  if (!instance) {
    instance = new AhorcadoService();
  }
  return instance;
}

export function resetAhorcadoService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
