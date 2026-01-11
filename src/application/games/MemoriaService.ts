/**
 * MemoriaService - Juego de Memoria IRL
 * 
 * El streamer muestra una imagen, el chat memoriza objetos y luego los adivina.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface MemoryObject {
  id: string;
  name: string;
  found: boolean;
  foundBy?: { username: string; color: string };
}

export interface MemoriaPlayer {
  oderId: string;
  username: string;
  color: string;
  points: number;
}

export interface MemoriaState extends BaseGameState {
  phase: 'setup' | 'viewing' | 'guessing' | 'results';
  imageUrl: string;
  objects: MemoryObject[];
  viewingTime: number;
  guessingTime: number;
  timeLeft: number;
  memoriaPlayers: Map<string, MemoriaPlayer>;
}

const GAME_CONFIG: GameConfig = {
  gameId: 'memoria_irl',
  channelName: 'memoria_irl_sync',
  storageKey: 'memoria_irl_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: MemoriaState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  imageUrl: '',
  objects: [],
  viewingTime: 15,
  guessingTime: 30,
  timeLeft: 0,
  memoriaPlayers: new Map(),
};

export class MemoriaService extends BaseGameService<MemoriaState> {
  private phaseTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, memoriaPlayers: new Map() });
  }

  // ============ Helpers ============

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
      }
    }
    return matrix[b.length][a.length];
  }

  // ============ Game-Specific API ============

  getPhase(): MemoriaState['phase'] {
    return this.state.phase;
  }

  getObjects(): MemoryObject[] {
    return [...this.state.objects];
  }

  getFoundCount(): number {
    return this.state.objects.filter(o => o.found).length;
  }

  getTimeLeft(): number {
    return this.state.timeLeft;
  }

  getImageUrl(): string {
    return this.state.imageUrl;
  }

  getMemoriaPlayers(): MemoriaPlayer[] {
    return [...this.state.memoriaPlayers.values()].sort((a, b) => b.points - a.points);
  }

  // ============ Setup ============

  setImageUrl(url: string): void {
    this.setState({ ...this.state, imageUrl: url });
  }

  addObject(name: string): void {
    if (!name.trim()) return;
    const obj: MemoryObject = {
      id: `obj_${Date.now()}`,
      name: name.toLowerCase().trim(),
      found: false,
    };
    this.setState({ ...this.state, objects: [...this.state.objects, obj] });
  }

  removeObject(id: string): void {
    this.setState({
      ...this.state,
      objects: this.state.objects.filter(o => o.id !== id),
    });
  }

  setObjects(names: string[]): void {
    const objects: MemoryObject[] = names.map((name, i) => ({
      id: `obj_${i}`,
      name: name.toLowerCase(),
      found: false,
    }));
    this.setState({ ...this.state, objects });
  }

  setTimes(viewing: number, guessing: number): void {
    this.setState({
      ...this.state,
      viewingTime: viewing,
      guessingTime: guessing,
    });
  }

  // ============ Game Lifecycle ============

  startGame(): boolean {
    if (!this.state.imageUrl || this.state.objects.length < 3) return false;

    this.setState({
      ...this.state,
      phase: 'viewing',
      gameState: 'playing',
      timeLeft: this.state.viewingTime,
      memoriaPlayers: new Map(),
      objects: this.state.objects.map(o => ({ ...o, found: false, foundBy: undefined })),
      startTime: Date.now(),
    });

    this.startPhaseTimer();
    return true;
  }

  private startPhaseTimer(): void {
    this.stopPhaseTimer();

    this.phaseTimer = setInterval(() => {
      const newTime = this.state.timeLeft - 1;
      if (newTime <= 0) {
        this.stopPhaseTimer();
        if (this.state.phase === 'viewing') {
          this.setState({
            ...this.state,
            phase: 'guessing',
            timeLeft: this.state.guessingTime,
          });
          this.startPhaseTimer();
        } else {
          this.setState({
            ...this.state,
            phase: 'results',
            gameState: 'finished',
            endTime: Date.now(),
          });
        }
      } else {
        this.setState({ ...this.state, timeLeft: newTime });
      }
    }, 1000);
  }

  private stopPhaseTimer(): void {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private checkAllFound(): void {
    if (this.state.objects.every(o => o.found)) {
      this.stopPhaseTimer();
      this.setState({
        ...this.state,
        phase: 'results',
        gameState: 'finished',
        endTime: Date.now(),
      });
    }
  }

  override reset(): void {
    this.stopPhaseTimer();
    this.setState({
      ...INITIAL_STATE,
      memoriaPlayers: new Map(),
      viewingTime: this.state.viewingTime,
      guessingTime: this.state.guessingTime,
    });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'guessing') return;

    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;

    // Check if message matches any unfound object
    for (const obj of this.state.objects) {
      if (obj.found) continue;

      const objLower = obj.name.toLowerCase();
      const isMatch = msgLower.includes(objLower) || 
                      objLower.includes(msgLower) || 
                      this.levenshteinDistance(msgLower, objLower) <= 2;

      if (isMatch) {
        // Update object as found
        const newObjects = this.state.objects.map(o =>
          o.id === obj.id
            ? { ...o, found: true, foundBy: { username: message.username, color: message.color || '#a970ff' } }
            : o
        );

        // Update player score
        const newPlayers = new Map(this.state.memoriaPlayers);
        const existing = newPlayers.get(oderId);
        newPlayers.set(oderId, {
          oderId,
          username: message.username,
          color: message.color || '#a970ff',
          points: (existing?.points || 0) + 10,
        });

        this.setState({
          ...this.state,
          objects: newObjects,
          memoriaPlayers: newPlayers,
        });

        this.checkAllFound();
        break; // Only match one object per message
      }
    }
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      imageUrl: this.state.phase === 'viewing' ? this.state.imageUrl : null,
      objects: this.state.phase === 'results'
        ? this.state.objects
        : this.state.objects.map(o => ({ ...o, name: o.found ? o.name : '???' })),
      timeLeft: this.state.timeLeft,
      totalObjects: this.state.objects.length,
      foundCount: this.getFoundCount(),
    };
  }

  // ============ Cleanup ============

  override dispose(): void {
    this.stopPhaseTimer();
    super.dispose();
  }
}

// Singleton
let instance: MemoriaService | null = null;

export function getMemoriaService(): MemoriaService {
  if (!instance) {
    instance = new MemoriaService();
  }
  return instance;
}

export function resetMemoriaService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
