/**
 * useGameService Hook
 * 
 * Hook genérico de React para usar cualquier servicio de juego
 * que extienda BaseGameService.
 * 
 * @module src/application/hooks/useGameService
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BaseGameService, BaseGameState, GamePlayer, GameState } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

export interface UseGameServiceReturn<TState extends BaseGameState> {
  /** Estado actual del juego */
  state: TState;
  /** Estado del juego (idle, waiting, playing, etc.) */
  gameState: GameState;
  /** Lista de jugadores */
  players: GamePlayer[];
  /** Jugadores activos */
  activePlayers: GamePlayer[];
  /** Si el juego está en curso */
  isPlaying: boolean;
  /** Iniciar el juego */
  start: () => void;
  /** Pausar el juego */
  pause: () => void;
  /** Reanudar el juego */
  resume: () => void;
  /** Detener el juego */
  stop: () => void;
  /** Resetear el juego */
  reset: () => void;
  /** Procesar un mensaje del chat */
  processMessage: (message: ChatMessage) => void;
  /** Añadir un jugador */
  addPlayer: (oderId: string, username: string, color: string) => GamePlayer | null;
  /** Eliminar un jugador */
  removePlayer: (oderId: string) => void;
  /** Servicio subyacente */
  service: BaseGameService<TState>;
}

export interface UseGameServiceOptions<TState extends BaseGameState> {
  /** Callback cuando cambia el estado */
  onStateChange?: (state: TState) => void;
  /** Callback cuando un jugador se une */
  onPlayerJoin?: (player: GamePlayer) => void;
  /** Callback cuando el juego termina */
  onGameEnd?: (state: TState) => void;
}

/**
 * Hook genérico para usar cualquier servicio de juego
 * 
 * @example
 * ```tsx
 * import { getHotPotatoService } from '../games/HotPotatoService';
 * 
 * const { state, isPlaying, start, processMessage } = useGameService(
 *   getHotPotatoService()
 * );
 * 
 * // Procesar mensajes del chat
 * chatMessages.forEach(msg => processMessage(msg));
 * ```
 */
export function useGameService<TState extends BaseGameState>(
  service: BaseGameService<TState>,
  options: UseGameServiceOptions<TState> = {}
): UseGameServiceReturn<TState> {
  const { onStateChange, onPlayerJoin, onGameEnd } = options;
  
  const [state, setState] = useState<TState>(service.getState());
  const previousGameStateRef = useRef<GameState>(state.gameState);
  const previousPlayersRef = useRef<number>(state.players.length);
  
  // Suscribirse a cambios de estado
  useEffect(() => {
    const unsubscribe = service.onStateChange((newState) => {
      setState(newState);
      onStateChange?.(newState);
      
      // Detectar fin de juego
      if (previousGameStateRef.current === 'playing' && newState.gameState === 'finished') {
        onGameEnd?.(newState);
      }
      
      // Detectar nuevo jugador
      if (newState.players.length > previousPlayersRef.current) {
        const newPlayer = newState.players[newState.players.length - 1];
        onPlayerJoin?.(newPlayer);
      }
      
      previousGameStateRef.current = newState.gameState;
      previousPlayersRef.current = newState.players.length;
    });
    
    return unsubscribe;
  }, [service, onStateChange, onPlayerJoin, onGameEnd]);
  
  const start = useCallback(() => {
    service.start();
  }, [service]);
  
  const pause = useCallback(() => {
    service.pause();
  }, [service]);
  
  const resume = useCallback(() => {
    service.resume();
  }, [service]);
  
  const stop = useCallback(() => {
    service.stop();
  }, [service]);
  
  const reset = useCallback(() => {
    service.reset();
  }, [service]);
  
  const processMessage = useCallback((message: ChatMessage) => {
    service.processMessage(message);
  }, [service]);
  
  const addPlayer = useCallback((oderId: string, username: string, color: string) => {
    return service.addPlayer(oderId, username, color);
  }, [service]);
  
  const removePlayer = useCallback((oderId: string) => {
    service.removePlayer(oderId);
  }, [service]);
  
  return {
    state,
    gameState: state.gameState,
    players: state.players,
    activePlayers: service.getActivePlayers(),
    isPlaying: service.isPlaying(),
    start,
    pause,
    resume,
    stop,
    reset,
    processMessage,
    addPlayer,
    removePlayer,
    service,
  };
}

export default useGameService;
