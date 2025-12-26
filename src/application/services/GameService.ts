/**
 * GameService - Servicio base para juegos interactivos
 * 
 * Proporciona funcionalidad común para todos los juegos:
 * - Sincronización con overlays (BroadcastChannel + Firebase)
 * - Procesamiento de mensajes del chat
 * - Gestión de estado del juego
 * - Persistencia en localStorage
 */

import type { IOverlaySync } from '../../domain/ports/IOverlaySync';
import type { ChatMessage } from '../../domain/ports/IChatProvider';
import { getSyncProvider } from '../../infrastructure/factories/ProviderFactory';

export type GameState = 'idle' | 'waiting' | 'playing' | 'paused' | 'finished';

export interface GamePlayer {
  oderId: string;
  username: string;
  color: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  data?: Record<string, unknown>;
}

export interface BaseGameState {
  gameState: GameState;
  players: GamePlayer[];
  round: number;
  startTime: number | null;
  endTime: number | null;
}

export interface GameConfig {
  /** ID único del juego */
  gameId: string;
  /** Nombre del canal de BroadcastChannel */
  channelName: string;
  /** Clave de localStorage para persistencia */
  storageKey: string;
  /** Máximo de jugadores */
  maxPlayers?: number;
  /** Comandos para unirse al juego */
  joinCommands?: string[];
  /** Auto-sync con overlay */
  autoSync?: boolean;
}

export type MessageHandler = (message: ChatMessage, gameState: BaseGameState) => void;
export type StateChangeCallback<T extends BaseGameState> = (state: T) => void;

/**
 * Clase base abstracta para juegos
 * Extiende esta clase para crear nuevos juegos
 */
export abstract class BaseGameService<TState extends BaseGameState = BaseGameState> {
  protected syncProvider: IOverlaySync;
  protected broadcastChannel: BroadcastChannel | null = null;
  protected config: Required<GameConfig>;
  protected state: TState;
  
  protected stateCallbacks = new Set<StateChangeCallback<TState>>();
  protected messageHandlers = new Set<MessageHandler>();
  protected syncThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
  protected lastSyncTime = 0;
  
  constructor(config: GameConfig, initialState: TState) {
    this.syncProvider = getSyncProvider();
    this.config = {
      maxPlayers: config.maxPlayers ?? 50,
      joinCommands: config.joinCommands ?? ['!join'],
      autoSync: config.autoSync ?? true,
      ...config,
    };
    this.state = initialState;
    
    this.initBroadcastChannel();
    this.loadState();
  }
  
  // ============ Abstract Methods (implementar en subclases) ============
  
  /** Procesar un mensaje del chat específico del juego */
  protected abstract processGameMessage(message: ChatMessage): void;
  
  /** Obtener datos para sincronizar con overlay */
  protected abstract getOverlayData(): Record<string, unknown>;
  
  // ============ Public API ============
  
  getState(): TState {
    return { ...this.state };
  }
  
  getPlayers(): GamePlayer[] {
    return [...this.state.players];
  }
  
  getActivePlayers(): GamePlayer[] {
    return this.state.players.filter(p => p.isActive);
  }
  
  getPlayer(oderId: string): GamePlayer | undefined {
    return this.state.players.find(p => p.oderId === oderId);
  }
  
  isPlaying(): boolean {
    return this.state.gameState === 'playing';
  }
  
  // ============ Game Lifecycle ============
  
  start(): void {
    if (this.state.gameState === 'playing') return;
    
    this.setState({
      ...this.state,
      gameState: 'playing',
      startTime: Date.now(),
      endTime: null,
    });
  }
  
  pause(): void {
    if (this.state.gameState !== 'playing') return;
    
    this.setState({
      ...this.state,
      gameState: 'paused',
    });
  }
  
  resume(): void {
    if (this.state.gameState !== 'paused') return;
    
    this.setState({
      ...this.state,
      gameState: 'playing',
    });
  }
  
  stop(): void {
    this.setState({
      ...this.state,
      gameState: 'finished',
      endTime: Date.now(),
    });
  }
  
  reset(): void {
    this.setState({
      ...this.state,
      gameState: 'idle',
      players: [],
      round: 1,
      startTime: null,
      endTime: null,
    });
  }
  
  // ============ Player Management ============
  
  addPlayer(oderId: string, username: string, color: string): GamePlayer | null {
    if (this.state.players.length >= this.config.maxPlayers) {
      return null;
    }
    
    const existing = this.state.players.find(p => p.oderId === oderId);
    if (existing) {
      return existing;
    }
    
    const player: GamePlayer = {
      oderId,
      username,
      color,
      score: 0,
      isActive: true,
      joinedAt: Date.now(),
    };
    
    this.setState({
      ...this.state,
      players: [...this.state.players, player],
    });
    
    return player;
  }
  
  removePlayer(oderId: string): void {
    this.setState({
      ...this.state,
      players: this.state.players.filter(p => p.oderId !== oderId),
    });
  }
  
  updatePlayer(oderId: string, updates: Partial<GamePlayer>): void {
    this.setState({
      ...this.state,
      players: this.state.players.map(p =>
        p.oderId === oderId ? { ...p, ...updates } : p
      ),
    });
  }
  
  addScore(oderId: string, points: number): void {
    this.updatePlayer(oderId, {
      score: (this.getPlayer(oderId)?.score ?? 0) + points,
    });
  }
  
  // ============ Message Processing ============
  
  processMessage(message: ChatMessage): void {
    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;
    
    // Check join commands
    if (this.state.gameState === 'waiting' || this.state.gameState === 'idle') {
      if (this.config.joinCommands.some(cmd => msgLower === cmd)) {
        this.addPlayer(oderId, message.displayName || message.username, message.color || '#a970ff');
        return;
      }
    }
    
    // Call custom message handlers
    this.messageHandlers.forEach(handler => handler(message, this.state));
    
    // Call game-specific processing
    this.processGameMessage(message);
  }
  
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
  
  // ============ State Management ============
  
  protected setState(newState: TState): void {
    this.state = newState;
    this.notifyStateChange();
    this.syncToOverlayThrottled();
    this.saveState();
  }
  
  onStateChange(callback: StateChangeCallback<TState>): () => void {
    this.stateCallbacks.add(callback);
    callback(this.state);
    return () => this.stateCallbacks.delete(callback);
  }
  
  private notifyStateChange(): void {
    this.stateCallbacks.forEach(cb => cb(this.state));
  }
  
  // ============ Sync ============
  
  protected syncToOverlay(): void {
    if (!this.config.autoSync) return;
    
    const data = {
      type: `${this.config.gameId}_state`,
      ...this.getOverlayData(),
    };
    
    // BroadcastChannel (same browser)
    this.broadcastChannel?.postMessage(data);
    
    // Firebase (cross-browser/OBS)
    this.syncProvider.publish('game', {
      gameType: this.config.gameId,
      state: data,
    }).catch(() => {});
    
    // localStorage (fallback)
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch { /* ignore */ }
    
    this.lastSyncTime = Date.now();
  }
  
  private syncToOverlayThrottled(): void {
    if (!this.config.autoSync) return;
    
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    const throttleMs = 100; // 10 updates per second max
    
    if (this.syncThrottleTimeout) {
      clearTimeout(this.syncThrottleTimeout);
    }
    
    if (timeSinceLastSync >= throttleMs) {
      this.syncToOverlay();
    } else {
      this.syncThrottleTimeout = setTimeout(
        () => this.syncToOverlay(),
        throttleMs - timeSinceLastSync
      );
    }
  }
  
  // ============ Persistence ============
  
  private loadState(): void {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore certain fields, not the full state
        if (parsed.players) {
          this.state = { ...this.state, players: parsed.players };
        }
      }
    } catch { /* ignore */ }
  }
  
  private saveState(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify({
        players: this.state.players,
        round: this.state.round,
      }));
    } catch { /* ignore */ }
  }
  
  // ============ Lifecycle ============
  
  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.config.channelName);
    }
  }
  
  dispose(): void {
    if (this.syncThrottleTimeout) {
      clearTimeout(this.syncThrottleTimeout);
    }
    this.broadcastChannel?.close();
    this.stateCallbacks.clear();
    this.messageHandlers.clear();
  }
}

/**
 * Helper para crear un servicio de juego simple sin subclase
 */
export function createGameService<TState extends BaseGameState>(
  config: GameConfig,
  initialState: TState,
  handlers: {
    processMessage?: (message: ChatMessage, state: TState, service: SimpleGameService<TState>) => void;
    getOverlayData?: (state: TState) => Record<string, unknown>;
  } = {}
): SimpleGameService<TState> {
  return new SimpleGameService(config, initialState, handlers);
}

class SimpleGameService<TState extends BaseGameState> extends BaseGameService<TState> {
  private handlers: {
    processMessage?: (message: ChatMessage, state: TState, service: SimpleGameService<TState>) => void;
    getOverlayData?: (state: TState) => Record<string, unknown>;
  };
  
  constructor(
    config: GameConfig,
    initialState: TState,
    handlers: {
      processMessage?: (message: ChatMessage, state: TState, service: SimpleGameService<TState>) => void;
      getOverlayData?: (state: TState) => Record<string, unknown>;
    }
  ) {
    super(config, initialState);
    this.handlers = handlers;
  }
  
  protected processGameMessage(message: ChatMessage): void {
    this.handlers.processMessage?.(message, this.state, this);
  }
  
  protected getOverlayData(): Record<string, unknown> {
    return this.handlers.getOverlayData?.(this.state) ?? {
      gameState: this.state.gameState,
      players: this.state.players,
      round: this.state.round,
    };
  }
  
  // Expose setState for external use
  public updateState(updates: Partial<TState>): void {
    this.setState({ ...this.state, ...updates });
  }
}
