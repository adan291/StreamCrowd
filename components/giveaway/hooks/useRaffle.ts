/**
 * useRaffle Hook
 * Manages raffle state and actions with reducer-based state management
 */

import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react';
import type { RaffleMode, RaffleConfig, SubsGiveawayConfig } from '../types';
import { GiveawayStorage } from '../services/GiveawayStorage';

// ============================================
// STATE TYPES
// ============================================

export type RafflePhase = 'idle' | 'running' | 'selecting' | 'winner';

export interface RaffleState {
  mode: RaffleMode;
  phase: RafflePhase;
  winner: string | null;
  timeLeft: number;
  config: RaffleConfig;
  startTime: number | null;
}

// ============================================
// ACTION TYPES
// ============================================

type RaffleAction =
  | { type: 'SET_MODE'; payload: RaffleMode }
  | { type: 'START'; payload?: { startTime: number } }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'START_SELECTING' }
  | { type: 'SET_WINNER'; payload: string }
  | { type: 'RESET' }
  | { type: 'SOFT_RESET' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<RaffleConfig> }
  | { type: 'SET_TIME_LEFT'; payload: number };

// ============================================
// INITIAL STATE
// ============================================

const getInitialConfig = (): RaffleConfig => {
  const savedConfig = GiveawayStorage.getConfig();
  return {
    title: '',
    keyword: '',
    subsOnly: false,
    useTimer: true,
    timerDuration: 60,
    startNow: true,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    prizeImages: [],
    subsConfig: savedConfig,
    soundEnabled: true,
    winnersCount: 1,
    allowRepeatWinners: false,
    prizes: [],
    timingConfig: {
      timingMode: 'instant',
      durationMode: 'fixed',
      fixedDuration: 60,
    },
  };
};

const getInitialState = (): RaffleState => ({
  mode: 'viewers',
  phase: 'idle',
  winner: null,
  timeLeft: 0,
  config: getInitialConfig(),
  startTime: null,
});

// ============================================
// REDUCER
// ============================================

function raffleReducer(state: RaffleState, action: RaffleAction): RaffleState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        phase: 'idle',
        winner: null,
      };
      
    case 'START':
      return {
        ...state,
        phase: 'running',
        winner: null,
        startTime: action.payload?.startTime || Date.now(),
      };
      
    case 'STOP':
      return {
        ...state,
        phase: 'idle',
      };
      
    case 'TICK':
      if (state.timeLeft <= 1) {
        return {
          ...state,
          timeLeft: 0,
          phase: 'idle',
        };
      }
      return {
        ...state,
        timeLeft: state.timeLeft - 1,
      };
      
    case 'START_SELECTING':
      return {
        ...state,
        phase: 'selecting',
      };
      
    case 'SET_WINNER':
      return {
        ...state,
        phase: 'winner',
        winner: action.payload,
      };
      
    case 'RESET':
      return {
        ...getInitialState(),
        config: state.config, // Preserve config
      };
      
    case 'SOFT_RESET':
      return {
        ...state,
        phase: 'idle',
        winner: null,
        timeLeft: 0,
        startTime: null,
      };
      
    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload,
        },
      };
      
    case 'SET_TIME_LEFT':
      return {
        ...state,
        timeLeft: action.payload,
      };
      
    default:
      return state;
  }
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseRaffleReturn {
  // State
  state: RaffleState;
  mode: RaffleMode;
  phase: RafflePhase;
  isRunning: boolean;
  isSelecting: boolean;
  hasWinner: boolean;
  winner: string | null;
  timeLeft: number;
  config: RaffleConfig;
  startTime: number | null;
  
  // Actions
  setMode: (mode: RaffleMode) => void;
  start: (duration?: number) => void;
  stop: () => void;
  startSelecting: () => void;
  setWinner: (winner: string) => void;
  reset: () => void;
  softReset: () => void;
  updateConfig: (config: Partial<RaffleConfig>) => void;
  updateSubsConfig: (config: Partial<SubsGiveawayConfig>) => void;
  
  // Utilities
  calculateDuration: () => number;
  canStart: () => boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useRaffle(): UseRaffleReturn {
  const [state, dispatch] = useReducer(raffleReducer, undefined, getInitialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Timer countdown effect
  useEffect(() => {
    if (state.phase === 'running' && state.config.useTimer && state.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [state.phase, state.config.useTimer, state.timeLeft]);
  
  // Persist subs config changes
  useEffect(() => {
    GiveawayStorage.saveConfig(state.config.subsConfig);
  }, [state.config.subsConfig]);
  
  // ============================================
  // ACTIONS
  // ============================================
  
  const setMode = useCallback((mode: RaffleMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);
  
  const start = useCallback((duration?: number) => {
    if (duration !== undefined) {
      dispatch({ type: 'SET_TIME_LEFT', payload: duration });
    }
    dispatch({ type: 'START', payload: { startTime: Date.now() } });
  }, []);
  
  const stop = useCallback(() => {
    dispatch({ type: 'STOP' });
  }, []);
  
  const startSelecting = useCallback(() => {
    dispatch({ type: 'START_SELECTING' });
  }, []);
  
  const setWinner = useCallback((winner: string) => {
    dispatch({ type: 'SET_WINNER', payload: winner });
  }, []);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
  
  const softReset = useCallback(() => {
    dispatch({ type: 'SOFT_RESET' });
  }, []);
  
  const updateConfig = useCallback((config: Partial<RaffleConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: config });
  }, []);
  
  const updateSubsConfig = useCallback((subsConfig: Partial<SubsGiveawayConfig>) => {
    dispatch({
      type: 'UPDATE_CONFIG',
      payload: {
        subsConfig: {
          ...state.config.subsConfig,
          ...subsConfig,
        },
      },
    });
  }, [state.config.subsConfig]);
  
  // ============================================
  // UTILITIES
  // ============================================
  
  const calculateDuration = useCallback((): number => {
    const { useTimer, timerDuration, timingConfig, startNow, startDate, startTime, endDate, endTime } = state.config;
    
    if (!useTimer) return 0;
    
    // Use new timingConfig if available
    if (timingConfig) {
      // Fixed duration mode
      if (timingConfig.durationMode === 'fixed') {
        return timingConfig.fixedDuration || 60;
      }
      
      // Until date/time mode
      if (timingConfig.durationMode === 'until' && timingConfig.endDate && timingConfig.endTime) {
        const endDateTime = new Date(`${timingConfig.endDate}T${timingConfig.endTime}`);
        const endTimestamp = endDateTime.getTime();
        
        if (isNaN(endTimestamp)) return timingConfig.fixedDuration || 60;
        
        let startTimestamp: number;
        if (timingConfig.timingMode === 'instant') {
          startTimestamp = Date.now();
        } else if (timingConfig.scheduledStartDate && timingConfig.scheduledStartTime) {
          const startDateTime = new Date(`${timingConfig.scheduledStartDate}T${timingConfig.scheduledStartTime}`);
          startTimestamp = startDateTime.getTime();
          if (isNaN(startTimestamp)) startTimestamp = Date.now();
        } else {
          startTimestamp = Date.now();
        }
        
        const durationMs = endTimestamp - startTimestamp;
        return Math.max(0, Math.floor(durationMs / 1000));
      }
      
      return timingConfig.fixedDuration || 60;
    }
    
    // Legacy fallback: If using simple duration mode (no end date/time set)
    if (!endDate || !endTime) {
      return timerDuration || 60;
    }
    
    // Legacy: Advanced mode with scheduled end
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const endTimestamp = endDateTime.getTime();
    
    if (isNaN(endTimestamp)) return timerDuration || 60;
    
    let startTimestamp: number;
    if (startNow) {
      startTimestamp = Date.now();
    } else if (startDate && startTime) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      startTimestamp = startDateTime.getTime();
      if (isNaN(startTimestamp)) startTimestamp = Date.now();
    } else {
      startTimestamp = Date.now();
    }
    
    const durationMs = endTimestamp - startTimestamp;
    return Math.max(0, Math.floor(durationMs / 1000));
  }, [state.config]);
  
  const canStart = useCallback((): boolean => {
    const { mode, config } = state;
    
    // Keyword mode requires a keyword
    if (mode === 'keyword' && !config.keyword.trim()) {
      return false;
    }
    
    return true;
  }, [state]);
  
  // ============================================
  // DERIVED STATE
  // ============================================
  
  const derivedState = useMemo(() => ({
    isRunning: state.phase === 'running',
    isSelecting: state.phase === 'selecting',
    hasWinner: state.phase === 'winner' && state.winner !== null,
  }), [state.phase, state.winner]);
  
  return {
    // State
    state,
    mode: state.mode,
    phase: state.phase,
    isRunning: derivedState.isRunning,
    isSelecting: derivedState.isSelecting,
    hasWinner: derivedState.hasWinner,
    winner: state.winner,
    timeLeft: state.timeLeft,
    config: state.config,
    startTime: state.startTime,
    
    // Actions
    setMode,
    start,
    stop,
    startSelecting,
    setWinner,
    reset,
    softReset,
    updateConfig,
    updateSubsConfig,
    
    // Utilities
    calculateDuration,
    canStart,
  };
}

export default useRaffle;
