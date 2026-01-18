/**
 * useCountdownSync - Application layer hook for countdown synchronization
 * 
 * This hook provides a clean interface for React components to interact with
 * countdown synchronization without directly importing Firebase or infrastructure code.
 * It follows hexagonal architecture principles by using dependency injection
 * to access the OverlaySyncService.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OverlayState } from '../../domain/entities/OverlayState';
import { DependencyFactory } from '../../infrastructure/factories/DependencyFactory';

/**
 * Countdown configuration
 */
export interface CountdownConfig {
  /** Countdown title */
  title: string;
  
  /** Description or message */
  description?: string;
  
  /** Duration in seconds */
  duration: number;
  
  /** Whether to show milliseconds */
  showMilliseconds: boolean;
  
  /** Whether to auto-start when created */
  autoStart: boolean;
  
  /** Sound to play when countdown ends */
  endSound?: string;
  
  /** Message to show when countdown ends */
  endMessage?: string;
  
  /** Custom styling */
  style: {
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    borderColor?: string;
    borderWidth?: number;
  };
  
  /** Animation settings */
  animation: {
    enabled: boolean;
    type: 'pulse' | 'shake' | 'glow' | 'bounce';
    intensity: number;
  };
}

/**
 * Countdown state structure for synchronization
 */
export interface CountdownState {
  /** Unique countdown ID */
  id: string;
  
  /** Countdown configuration */
  config: CountdownConfig;
  
  /** Current status */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
  
  /** Remaining time in milliseconds */
  remainingTime: number;
  
  /** Original duration in milliseconds */
  originalDuration: number;
  
  /** Start time timestamp */
  startTime?: number;
  
  /** Pause time timestamp */
  pauseTime?: number;
  
  /** End time timestamp */
  endTime?: number;
  
  /** Total paused duration in milliseconds */
  totalPausedTime: number;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Formatted time display */
  display: {
    minutes: number;
    seconds: number;
    milliseconds: number;
    formatted: string;
  };
  
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Return type for useCountdownSync hook
 */
export interface UseCountdownSyncReturn {
  /** Current countdown state, null if no active countdown */
  countdownState: CountdownState | null;
  
  /** Publish new countdown state to all connected clients */
  publishCountdownState: (state: CountdownState) => Promise<void>;
  
  /** Clear current countdown state */
  clearCountdownState: () => Promise<void>;
  
  /** Create a new countdown */
  createCountdown: (config: CountdownConfig) => Promise<void>;
  
  /** Start the countdown */
  startCountdown: () => Promise<void>;
  
  /** Pause the countdown */
  pauseCountdown: () => Promise<void>;
  
  /** Resume the countdown */
  resumeCountdown: () => Promise<void>;
  
  /** Stop and reset the countdown */
  stopCountdown: () => Promise<void>;
  
  /** Add time to the countdown (in seconds) */
  addTime: (seconds: number) => Promise<void>;
  
  /** Subtract time from the countdown (in seconds) */
  subtractTime: (seconds: number) => Promise<void>;
  
  /** Whether the sync connection is active */
  isConnected: boolean;
  
  /** Any error that occurred during sync operations */
  error: string | null;
  
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Format time for display
 */
function formatTime(milliseconds: number, showMilliseconds: boolean): {
  minutes: number;
  seconds: number;
  milliseconds: number;
  formatted: string;
} {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10); // Show centiseconds
  
  const formatted = showMilliseconds 
    ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  return {
    minutes,
    seconds,
    milliseconds: ms,
    formatted,
  };
}

/**
 * Calculate progress percentage
 */
function calculateProgress(remainingTime: number, originalDuration: number): number {
  if (originalDuration <= 0) return 100;
  const elapsed = originalDuration - remainingTime;
  return Math.min(100, Math.max(0, (elapsed / originalDuration) * 100));
}

/**
 * Hook for countdown synchronization using application layer services
 * 
 * @returns Object with countdown state and sync methods
 */
export function useCountdownSync(): UseCountdownSyncReturn {
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get overlay sync service through dependency injection
  const overlaySync = DependencyFactory.getInstance().getOverlaySyncService();

  const publishCountdownState = useCallback(async (state: CountdownState): Promise<void> => {
    try {
      setError(null);
      const overlayState: OverlayState<CountdownState> = {
        type: 'countdown',
        data: state,
        updatedAt: Date.now(),
        isActive: state.status === 'running' || state.status === 'paused',
        metadata: {
          version: '1.0',
          source: 'useCountdownSync',
        }
      };
      
      const result = await overlaySync.publish(overlayState);
      if (!result.success && result.error) {
        throw result.error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish countdown state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const clearCountdownState = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await overlaySync.clear('countdown');
      if (!result.success && result.error) {
        throw result.error;
      }
      setCountdownState(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear countdown state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const createCountdown = useCallback(async (config: CountdownConfig): Promise<void> => {
    const countdownId = `countdown_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const durationMs = config.duration * 1000;
    
    const newCountdownState: CountdownState = {
      id: countdownId,
      config,
      status: config.autoStart ? 'running' : 'idle',
      remainingTime: durationMs,
      originalDuration: durationMs,
      startTime: config.autoStart ? Date.now() : undefined,
      totalPausedTime: 0,
      progress: 0,
      display: formatTime(durationMs, config.showMilliseconds),
      lastUpdate: Date.now(),
    };
    
    await publishCountdownState(newCountdownState);
  }, [publishCountdownState]);

  const startCountdown = useCallback(async (): Promise<void> => {
    if (!countdownState || countdownState.status === 'running') return;
    
    const now = Date.now();
    const updatedState: CountdownState = {
      ...countdownState,
      status: 'running',
      startTime: countdownState.startTime || now,
      pauseTime: undefined,
      lastUpdate: now,
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const pauseCountdown = useCallback(async (): Promise<void> => {
    if (!countdownState || countdownState.status !== 'running') return;
    
    const now = Date.now();
    const updatedState: CountdownState = {
      ...countdownState,
      status: 'paused',
      pauseTime: now,
      lastUpdate: now,
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const resumeCountdown = useCallback(async (): Promise<void> => {
    if (!countdownState || countdownState.status !== 'paused') return;
    
    const now = Date.now();
    const pauseDuration = countdownState.pauseTime ? now - countdownState.pauseTime : 0;
    
    const updatedState: CountdownState = {
      ...countdownState,
      status: 'running',
      pauseTime: undefined,
      totalPausedTime: countdownState.totalPausedTime + pauseDuration,
      lastUpdate: now,
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const stopCountdown = useCallback(async (): Promise<void> => {
    if (!countdownState) return;
    
    const updatedState: CountdownState = {
      ...countdownState,
      status: 'cancelled',
      remainingTime: countdownState.originalDuration,
      progress: 0,
      display: formatTime(countdownState.originalDuration, countdownState.config.showMilliseconds),
      startTime: undefined,
      pauseTime: undefined,
      endTime: undefined,
      totalPausedTime: 0,
      lastUpdate: Date.now(),
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const addTime = useCallback(async (seconds: number): Promise<void> => {
    if (!countdownState) return;
    
    const additionalMs = seconds * 1000;
    const newRemainingTime = countdownState.remainingTime + additionalMs;
    const newOriginalDuration = countdownState.originalDuration + additionalMs;
    
    const updatedState: CountdownState = {
      ...countdownState,
      remainingTime: newRemainingTime,
      originalDuration: newOriginalDuration,
      progress: calculateProgress(newRemainingTime, newOriginalDuration),
      display: formatTime(newRemainingTime, countdownState.config.showMilliseconds),
      lastUpdate: Date.now(),
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const subtractTime = useCallback(async (seconds: number): Promise<void> => {
    if (!countdownState) return;
    
    const subtractMs = seconds * 1000;
    const newRemainingTime = Math.max(0, countdownState.remainingTime - subtractMs);
    
    const updatedState: CountdownState = {
      ...countdownState,
      remainingTime: newRemainingTime,
      progress: calculateProgress(newRemainingTime, countdownState.originalDuration),
      display: formatTime(newRemainingTime, countdownState.config.showMilliseconds),
      status: newRemainingTime <= 0 ? 'completed' : countdownState.status,
      endTime: newRemainingTime <= 0 ? Date.now() : countdownState.endTime,
      lastUpdate: Date.now(),
    };
    
    await publishCountdownState(updatedState);
  }, [countdownState, publishCountdownState]);

  const reconnect = useCallback(() => {
    setError(null);
    setIsConnected(false);
    // Trigger reconnection through overlay sync service
    overlaySync.reconnect().catch(err => {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
    });
  }, [overlaySync]);

  // Update countdown state in real-time when running
  useEffect(() => {
    if (!countdownState || countdownState.status !== 'running') return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - (countdownState.startTime || now) - countdownState.totalPausedTime;
      const newRemainingTime = Math.max(0, countdownState.originalDuration - elapsed);
      
      if (newRemainingTime <= 0) {
        // Countdown completed
        const completedState: CountdownState = {
          ...countdownState,
          status: 'completed',
          remainingTime: 0,
          progress: 100,
          display: formatTime(0, countdownState.config.showMilliseconds),
          endTime: now,
          lastUpdate: now,
        };
        
        publishCountdownState(completedState).catch(console.error);
      } else {
        // Update remaining time
        const updatedState: CountdownState = {
          ...countdownState,
          remainingTime: newRemainingTime,
          progress: calculateProgress(newRemainingTime, countdownState.originalDuration),
          display: formatTime(newRemainingTime, countdownState.config.showMilliseconds),
          lastUpdate: now,
        };
        
        setCountdownState(updatedState);
      }
    }, countdownState.config.showMilliseconds ? 10 : 100); // Update more frequently if showing milliseconds
    
    return () => clearInterval(interval);
  }, [countdownState, publishCountdownState]);

  useEffect(() => {
    // Subscribe to countdown state changes
    const subscription = overlaySync.subscribe<OverlayState<CountdownState>>('countdown', (state) => {
      if (state?.data) {
        setCountdownState(state.data);
        setIsConnected(true);
        setError(null);
      } else {
        setCountdownState(null);
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(overlaySync.isConnected());
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    return () => {
      subscription.unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [overlaySync]);

  return {
    countdownState,
    publishCountdownState,
    clearCountdownState,
    createCountdown,
    startCountdown,
    pauseCountdown,
    resumeCountdown,
    stopCountdown,
    addTime,
    subtractTime,
    isConnected,
    error,
    reconnect
  };
}