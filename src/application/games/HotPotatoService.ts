/**
 * HotPotatoService - Juego de la Patata Caliente
 * 
 * Ejemplo de cómo migrar un juego existente a la nueva arquitectura.
 * Usa BaseGameService para eliminar código duplicado.
 */

import { BaseGameService, BaseGameState, GamePlayer, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

// Estado específico del juego
export interface HotPotatoState extends BaseGameState {
  bombTime: number;
  timeLeft: number;
  currentHolderId: string | null;
  loserId: string | null;
  leaderboard: Map<string, number>;
}

// Configuración del juego
const GAME_CONFIG: GameConfig = {
  gameId: 'hot_potato',
  channelName: 'hot_potato_sync',
  storageKey: 'hot_potato_state',
  maxPlayers: 20,
  joinCommands: ['!papa', '!potato', '!join'],
  autoSync: true,
};

// Estado inicial
const INITIAL_STATE: HotPotatoState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  bombTime: 30,
  timeLeft: 0,
  currentHolderId: null,
  loserId: null,
  leaderboard: new Map(),
};

export class HotPotatoService extends BaseGameService<HotPotatoState> {
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, leaderboard: new Map() });
  }
  
  // ============ Game-Specific API ============
  
  setBombTime(seconds: number): void {
    this.setState({
      ...this.state,
      bombTime: Math.max(15, Math.min(120, seconds)),
    });
  }
  
  getCurrentHolder(): GamePlayer | null {
    if (!this.state.currentHolderId) return null;
    return this.getPlayer(this.state.currentHolderId) ?? null;
  }
  
  getLoser(): GamePlayer | null {
    if (!this.state.loserId) return null;
    return this.getPlayer(this.state.loserId) ?? null;
  }
  
  getLeaderboard(): Array<{ username: string; eliminations: number }> {
    return Array.from(this.state.leaderboard.entries())
      .map(([username, eliminations]) => ({ username, eliminations }))
      .sort((a, b) => b.eliminations - a.eliminations);
  }
  
  // ============ Game Lifecycle ============
  
  override start(): void {
    if (this.state.players.length < 2) return;
    
    // Give potato to random player
    const randomIndex = Math.floor(Math.random() * this.state.players.length);
    const randomPlayer = this.state.players[randomIndex];
    
    // Random time between 10 and bombTime
    const time = Math.floor(Math.random() * (this.state.bombTime - 10)) + 10;
    
    this.setState({
      ...this.state,
      gameState: 'playing',
      startTime: Date.now(),
      timeLeft: time,
      currentHolderId: randomPlayer.oderId,
      loserId: null,
    });
    
    this.startTimer();
  }
  
  nextRound(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      // Game over - we have a winner!
      this.stop();
      return;
    }
    
    // Give potato to random active player
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const randomPlayer = activePlayers[randomIndex];
    
    const time = Math.floor(Math.random() * (this.state.bombTime - 10)) + 10;
    
    this.setState({
      ...this.state,
      gameState: 'playing',
      round: this.state.round + 1,
      timeLeft: time,
      currentHolderId: randomPlayer.oderId,
      loserId: null,
    });
    
    this.startTimer();
  }
  
  override reset(): void {
    this.stopTimer();
    this.setState({
      ...INITIAL_STATE,
      leaderboard: new Map(),
      bombTime: this.state.bombTime,
    });
  }
  
  // ============ Message Processing ============
  
  protected processGameMessage(message: ChatMessage): void {
    if (this.state.gameState !== 'playing') return;
    
    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;
    
    // Pass potato with !pass @username or !pasar @username
    if (msgLower.startsWith('!pass ') || msgLower.startsWith('!pasar ')) {
      const targetName = msgLower.split(' ')[1]?.replace('@', '').toLowerCase();
      this.passPotato(oderId, targetName);
    }
  }
  
  private passPotato(fromId: string, targetUsername: string): void {
    // Check if sender has the potato
    if (this.state.currentHolderId !== fromId) return;
    
    // Find target player
    const target = this.state.players.find(p =>
      p.username.toLowerCase() === targetUsername &&
      p.isActive &&
      p.oderId !== fromId
    );
    
    if (!target) return;
    
    // Update pass count for sender
    this.updatePlayer(fromId, {
      data: {
        ...this.getPlayer(fromId)?.data,
        passCount: ((this.getPlayer(fromId)?.data?.passCount as number) ?? 0) + 1,
      },
    });
    
    // Transfer potato
    this.setState({
      ...this.state,
      currentHolderId: target.oderId,
    });
  }
  
  // ============ Timer ============
  
  private startTimer(): void {
    this.stopTimer();
    
    this.timerInterval = setInterval(() => {
      if (this.state.timeLeft <= 1) {
        this.explode();
      } else {
        this.setState({
          ...this.state,
          timeLeft: this.state.timeLeft - 1,
        });
      }
    }, 1000);
  }
  
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  private explode(): void {
    this.stopTimer();
    
    const holder = this.getCurrentHolder();
    if (!holder) return;
    
    // Mark player as out
    this.updatePlayer(holder.oderId, { isActive: false });
    
    // Update leaderboard
    const newLeaderboard = new Map(this.state.leaderboard);
    newLeaderboard.set(holder.username, (newLeaderboard.get(holder.username) ?? 0) + 1);
    
    this.setState({
      ...this.state,
      gameState: 'paused', // Waiting for next round
      timeLeft: 0,
      currentHolderId: null,
      loserId: holder.oderId,
      leaderboard: newLeaderboard,
    });
  }
  
  // ============ Overlay Data ============
  
  protected getOverlayData(): Record<string, unknown> {
    return {
      gameState: this.state.gameState,
      players: this.state.players,
      currentHolder: this.getCurrentHolder(),
      timeLeft: this.state.timeLeft,
      loser: this.getLoser(),
      round: this.state.round,
    };
  }
  
  // ============ Cleanup ============
  
  override dispose(): void {
    this.stopTimer();
    super.dispose();
  }
}

// Singleton instance
let instance: HotPotatoService | null = null;

export function getHotPotatoService(): HotPotatoService {
  if (!instance) {
    instance = new HotPotatoService();
  }
  return instance;
}

export function resetHotPotatoService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
