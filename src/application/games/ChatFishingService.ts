/**
 * ChatFishingService - Juego de Pesca
 * 
 * Los mensajes del chat se convierten en peces que nadan.
 * El streamer puede pescarlos con el anzuelo.
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export type FishRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SwimmingFish {
  id: string;
  oderId: string;
  username: string;
  message: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rarity: FishRarity;
}

export interface CaughtFish {
  id: string;
  username: string;
  message: string;
  color: string;
  points: number;
  rarity: FishRarity;
  timestamp: number;
}

export interface FishingState extends BaseGameState {
  fish: SwimmingFish[];
  caughtFish: CaughtFish[];
  hookPosition: { x: number; y: number };
  hookDepth: number;
  isFishing: boolean;
  lastCatch: CaughtFish | null;
  totalPoints: number;
  isActive: boolean;
}

export const FISHING_CONSTANTS = {
  RARITY_COLORS: {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
  },
  RARITY_POINTS: { common: 10, rare: 25, epic: 50, legendary: 100 },
  MAX_FISH: 30,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 350,
};

const GAME_CONFIG: GameConfig = {
  gameId: 'chat_fishing',
  channelName: 'chat_fishing_sync',
  storageKey: 'chat_fishing_state',
  maxPlayers: FISHING_CONSTANTS.MAX_FISH,
  joinCommands: [],
  autoSync: true,
};

const INITIAL_STATE: FishingState = {
  gameState: 'playing',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  fish: [],
  caughtFish: [],
  hookPosition: { x: 300, y: 50 },
  hookDepth: 0,
  isFishing: false,
  lastCatch: null,
  totalPoints: 0,
  isActive: true,
};

export class ChatFishingService extends BaseGameService<FishingState> {
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE });
  }

  // ============ Helpers ============

  private getRarity(isSubscriber: boolean, messageLength: number): FishRarity {
    if (isSubscriber && messageLength > 50) return 'legendary';
    if (isSubscriber) return 'epic';
    if (messageLength > 30) return 'rare';
    return 'common';
  }

  // ============ Game-Specific API ============

  getFish(): SwimmingFish[] {
    return [...this.state.fish];
  }

  getCaughtFish(): CaughtFish[] {
    return [...this.state.caughtFish];
  }

  getHookPosition(): { x: number; y: number; depth: number } {
    return { ...this.state.hookPosition, depth: this.state.hookDepth };
  }

  getTotalPoints(): number {
    return this.state.totalPoints;
  }

  getLastCatch(): CaughtFish | null {
    return this.state.lastCatch;
  }

  setActive(active: boolean): void {
    this.setState({ ...this.state, isActive: active });
  }

  clearLastCatch(): void {
    this.setState({ ...this.state, lastCatch: null });
  }

  // ============ Hook Movement ============

  moveHook(direction: 'left' | 'right'): void {
    if (this.state.isFishing) return;
    
    const newX = Math.max(50, Math.min(550, 
      this.state.hookPosition.x + (direction === 'left' ? -40 : 40)
    ));
    
    this.setState({
      ...this.state,
      hookPosition: { ...this.state.hookPosition, x: newX },
    });
  }

  setHookDepth(depth: number): void {
    this.setState({ ...this.state, hookDepth: Math.max(0, depth) });
  }

  setFishing(isFishing: boolean): void {
    this.setState({ ...this.state, isFishing });
  }

  // ============ Fish Management ============

  addFish(message: ChatMessage): SwimmingFish | null {
    if (!this.state.isActive) return null;
    if (this.state.fish.length >= FISHING_CONSTANTS.MAX_FISH) return null;

    const { CANVAS_WIDTH, CANVAS_HEIGHT } = FISHING_CONSTANTS;
    const rarity = this.getRarity(message.isSubscriber || false, message.message.length);
    
    const newFish: SwimmingFish = {
      id: `${message.userId || message.username}-${Date.now()}-${Math.random()}`,
      oderId: message.userId || message.username,
      username: message.username,
      message: message.message.slice(0, 30),
      color: message.color || '#a970ff',
      x: -50,
      y: 100 + Math.random() * (CANVAS_HEIGHT - 150),
      vx: 0.8 + Math.random() * 1.2,
      vy: (Math.random() - 0.5) * 0.5,
      size: rarity === 'legendary' ? 45 : rarity === 'epic' ? 38 : rarity === 'rare' ? 32 : 28,
      rarity,
    };

    this.setState({
      ...this.state,
      fish: [...this.state.fish, newFish].slice(-FISHING_CONSTANTS.MAX_FISH),
    });

    return newFish;
  }

  updateFishPositions(updatedFish: SwimmingFish[]): void {
    this.setState({ ...this.state, fish: updatedFish });
  }

  // ============ Catching ============

  checkCatch(hookX: number, hookY: number): CaughtFish | null {
    const fishWithDistance = this.state.fish.map(fish => {
      const dx = fish.x - hookX;
      const dy = fish.y - hookY;
      return { fish, distance: Math.sqrt(dx * dx + dy * dy) };
    }).sort((a, b) => a.distance - b.distance);

    for (const { fish, distance } of fishWithDistance) {
      const catchRadius = fish.size + 25;
      
      if (distance < catchRadius) {
        const caught: CaughtFish = {
          id: fish.id,
          username: fish.username,
          message: fish.message,
          color: fish.color,
          points: FISHING_CONSTANTS.RARITY_POINTS[fish.rarity],
          rarity: fish.rarity,
          timestamp: Date.now(),
        };

        this.setState({
          ...this.state,
          fish: this.state.fish.filter(f => f.id !== fish.id),
          caughtFish: [caught, ...this.state.caughtFish].slice(0, 10),
          lastCatch: caught,
          totalPoints: this.state.totalPoints + caught.points,
        });

        return caught;
      }
    }
    return null;
  }

  // ============ Game Lifecycle ============

  override reset(): void {
    this.setState({ ...INITIAL_STATE });
  }

  // ============ Message Processing ============

  protected processGameMessage(message: ChatMessage): void {
    // Every message becomes a fish
    this.addFish(message);
  }

  // ============ Overlay Data ============

  protected getOverlayData(): Record<string, unknown> {
    return {
      fish: this.state.fish,
      hook: { ...this.state.hookPosition, depth: this.state.hookDepth },
      isFishing: this.state.isFishing,
      lastCatch: this.state.lastCatch,
      totalPoints: this.state.totalPoints,
      caughtFish: this.state.caughtFish,
    };
  }
}

// Singleton
let instance: ChatFishingService | null = null;

export function getChatFishingService(): ChatFishingService {
  if (!instance) {
    instance = new ChatFishingService();
  }
  return instance;
}

export function resetChatFishingService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
