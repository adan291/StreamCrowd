/**
 * useGameSync - Application layer hook for game synchronization
 * 
 * This hook provides a clean interface for React components to interact with
 * game synchronization without directly importing Firebase or infrastructure code.
 * It follows hexagonal architecture principles by using dependency injection
 * to access the OverlaySyncService.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OverlayState } from '../../domain/entities/OverlayState';
import type { OverlaySyncService } from '../../application/services/OverlaySyncService';
import { DependencyFactory } from '../../infrastructure/factories/DependencyFactory';

/**
 * Game state structure for synchronization
 */
export interface GameState {
  gameType: GameType;
  isActive: boolean;
  players: Player[];
  currentRound: number;
  settings: GameSettings;
  lastUpdate: number;
  [key: string]: unknown; // Allow additional game-specific properties
}

/**
 * Supported game types
 */
export type GameType = 
  | 'casino-roulette'
  | 'chat-fishing' 
  | 'duck-hunt'
  | 'battleship'
  | 'hot-potato'
  | 'trivia-battle'
  | 'memoria-irl'
  | 'party-co'
  | 'piedra-papel-tijera'
  | 'pium-game'
  | 'veo-veo'
  | 'ahorcado'
  | 'carrera-emotes';

/**
 * Player information for games
 */
export interface Player {
  id: string;
  username: string;
  score?: number;
  isActive: boolean;
  joinedAt: number;
  [key: string]: unknown; // Allow additional player properties
}

/**
 * Game settings structure
 */
export interface GameSettings {
  maxPlayers?: number;
  timeLimit?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  customRules?: Record<string, unknown>;
  [key: string]: unknown; // Allow additional settings
}

/**
 * Return type for useGameSync hook
 */
export interface UseGameSyncReturn {
  /** Current game state, null if no active game */
  gameState: GameState | null;
  
  /** Publish new game state to all connected clients */
  publishGameState: (state: GameState) => Promise<void>;
  
  /** Clear current game state */
  clearGameState: () => Promise<void>;
  
  /** Whether the sync connection is active */
  isConnected: boolean;
  
  /** Any error that occurred during sync operations */
  error: string | null;
  
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Hook for game synchronization using application layer services
 * 
 * @returns Object with game state and sync methods
 */
export function useGameSync(): UseGameSyncReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlaySync, setOverlaySync] = useState<OverlaySyncService | null>(null);

  // Initialize overlay sync service through dependency injection
  useEffect(() => {
    let mounted = true;
    
    DependencyFactory.getInstance().getOverlaySyncService()
      .then(service => {
        if (mounted) {
          setOverlaySync(service);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize sync service');
        }
      });
    
    return () => {
      mounted = false;
    };
  }, []);

  const publishGameState = useCallback(async (state: GameState): Promise<void> => {
    if (!overlaySync) {
      throw new Error('Sync service not initialized');
    }
    
    try {
      setError(null);
      const overlayState: OverlayState<GameState> = {
        type: 'game',
        data: state,
        updatedAt: Date.now(),
        isActive: true,
        metadata: {
          version: '1.0',
          source: 'useGameSync',
        }
      };
      
      await overlaySync.updateOverlayState(overlayState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish game state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const clearGameState = useCallback(async (): Promise<void> => {
    if (!overlaySync) {
      throw new Error('Sync service not initialized');
    }
    
    try {
      setError(null);
      await overlaySync.clearOverlay('game');
      setGameState(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear game state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const reconnect = useCallback(() => {
    setError(null);
    setIsConnected(false);
    // Trigger reconnection through overlay sync service
    if (overlaySync) {
      // Note: reconnect method would need to be added to OverlaySyncService
      // For now, we'll just reset the connection status
      setIsConnected(false);
    }
  }, [overlaySync]);

  useEffect(() => {
    if (!overlaySync) return;
    
    // Subscribe to game state changes
    const unsubscribe = overlaySync.subscribeToOverlayChanges<OverlayState<GameState>>('game', (state) => {
      if (state?.data) {
        setGameState(state.data);
        setIsConnected(true);
        setError(null);
      } else {
        setGameState(null);
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(overlaySync.getConnectionStatus() === 'connected');
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    return () => {
      unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [overlaySync]);

  return {
    gameState,
    publishGameState,
    clearGameState,
    isConnected,
    error,
    reconnect
  };
}