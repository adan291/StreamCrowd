/**
 * usePredictions - Hook for managing Twitch Predictions
 * 
 * Provides reactive state and actions for creating, managing, and
 * tracking Twitch predictions with real-time polling and OBS integration.
 * 
 * @requirements 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 3.3, 7.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TwitchPredictionService,
  createTwitchPredictionService,
  isTwitchPredictionError,
  type TwitchPredictionError,
} from '../services/TwitchPredictionService';
import { getOBSService } from '../services/OBSService';
import type {
  TwitchPrediction,
  PredictionFormData,
  CreatePredictionData,
} from '../../../types/twitch';

// ============================================
// Constants
// ============================================

/** Storage key for prediction history */
const STORAGE_KEY_PREDICTION_HISTORY = 'twitch_prediction_history';

/** Polling interval for active predictions (ms) */
const POLLING_INTERVAL_MS = 5000;

/** Maximum history items to store */
const MAX_HISTORY_ITEMS = 50;

// ============================================
// Types
// ============================================

export interface UsePredictionsReturn {
  /** Current active prediction (ACTIVE or LOCKED status) */
  currentPrediction: TwitchPrediction | null;
  /** History of past predictions */
  history: TwitchPrediction[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether polling is active */
  isPolling: boolean;
  
  /** Create a new prediction */
  createPrediction: (data: PredictionFormData) => Promise<boolean>;
  /** Lock the current prediction (prevent new bets) */
  lockPrediction: () => Promise<boolean>;
  /** Resolve the current prediction with a winning outcome */
  resolvePrediction: (outcomeId: string) => Promise<boolean>;
  /** Cancel the current prediction and refund points */
  cancelPrediction: () => Promise<boolean>;
  /** Manually refresh prediction data */
  refreshPrediction: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

export interface UsePredictionsOptions {
  /** Whether to enable polling for active predictions */
  enablePolling?: boolean;
  /** Custom polling interval in milliseconds */
  pollingInterval?: number;
  /** Whether to emit OBS events on state changes */
  emitOBSEvents?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Load prediction history from localStorage
 * @requirements 3.3 - Store prediction history locally
 */
function loadHistoryFromStorage(): TwitchPrediction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREDICTION_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_HISTORY_ITEMS);
      }
    }
  } catch (e) {
    console.error('Error loading prediction history:', e);
  }
  return [];
}

/**
 * Save prediction history to localStorage
 * @requirements 3.3 - Store prediction history locally
 */
function saveHistoryToStorage(history: TwitchPrediction[]): void {
  try {
    const toSave = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY_PREDICTION_HISTORY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving prediction history:', e);
  }
}

/**
 * Check if a prediction is in an active state (can be modified)
 */
function isActivePrediction(prediction: TwitchPrediction): boolean {
  return prediction.status === 'ACTIVE' || prediction.status === 'LOCKED';
}

/**
 * Check if a prediction is in a terminal state
 */
function isTerminalPrediction(prediction: TwitchPrediction): boolean {
  return prediction.status === 'RESOLVED' || prediction.status === 'CANCELED';
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for managing Twitch Predictions
 * 
 * @param broadcasterId - The broadcaster's Twitch user ID
 * @param authToken - OAuth token with channel:manage:predictions scope
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const {
 *   currentPrediction,
 *   history,
 *   isLoading,
 *   error,
 *   createPrediction,
 *   lockPrediction,
 *   resolvePrediction,
 *   cancelPrediction,
 * } = usePredictions(userId, authToken);
 * 
 * // Create a prediction
 * await createPrediction({
 *   title: '¿Quién ganará?',
 *   outcomes: ['Equipo A', 'Equipo B'],
 *   duration: 120,
 * });
 * ```
 */
export function usePredictions(
  broadcasterId: string,
  authToken: string,
  options: UsePredictionsOptions = {}
): UsePredictionsReturn {
  const {
    enablePolling = true,
    pollingInterval = POLLING_INTERVAL_MS,
    emitOBSEvents = true,
  } = options;

  // Service reference
  const serviceRef = useRef<TwitchPredictionService | null>(null);
  const obsServiceRef = useRef(getOBSService());

  // State
  const [currentPrediction, setCurrentPrediction] = useState<TwitchPrediction | null>(null);
  const [history, setHistory] = useState<TwitchPrediction[]>(() => loadHistoryFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for polling
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  // Initialize service when token changes
  useEffect(() => {
    if (authToken) {
      serviceRef.current = createTwitchPredictionService(authToken);
    } else {
      serviceRef.current = null;
    }
  }, [authToken]);

  /**
   * Emit OBS trigger event for prediction state changes
   * @requirements 7.1 - Emit events when prediction starts, locks, or resolves
   */
  const emitOBSTrigger = useCallback((
    triggerType: 'prediction_start' | 'prediction_lock' | 'prediction_resolve',
    prediction: TwitchPrediction
  ) => {
    if (!emitOBSEvents) return;
    
    try {
      // Use dedicated trigger type for predictions
      obsServiceRef.current.executeTrigger(triggerType);
    } catch (e) {
      console.warn('Failed to emit OBS trigger:', e);
    }
  }, [emitOBSEvents]);

  /**
   * Add a prediction to history
   */
  const addToHistory = useCallback((prediction: TwitchPrediction) => {
    if (!isTerminalPrediction(prediction)) return;
    
    setHistory(prev => {
      // Check if already in history
      const exists = prev.some(p => p.id === prediction.id);
      if (exists) {
        // Update existing entry
        const updated = prev.map(p => p.id === prediction.id ? prediction : p);
        saveHistoryToStorage(updated);
        return updated;
      }
      // Add new entry at the beginning
      const updated = [prediction, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveHistoryToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * Fetch current predictions from API
   * @requirements 1.3, 2.2 - Display current prediction with real-time updates
   */
  const fetchPredictions = useCallback(async (): Promise<TwitchPrediction | null> => {
    if (!serviceRef.current || !broadcasterId) return null;

    const result = await serviceRef.current.getPredictions(broadcasterId);
    
    if (isTwitchPredictionError(result)) {
      setError(result.message);
      return null;
    }

    // Find active or locked prediction
    const activePrediction = result.find(isActivePrediction);
    
    // Add any terminal predictions to history
    result.filter(isTerminalPrediction).forEach(addToHistory);

    return activePrediction || null;
  }, [broadcasterId, addToHistory]);

  /**
   * Refresh prediction data
   * @requirements 2.2 - Update prediction data every 5 seconds
   */
  const refreshPrediction = useCallback(async () => {
    const prediction = await fetchPredictions();
    
    // Check for status change and emit OBS events
    if (prediction && previousStatusRef.current !== prediction.status) {
      if (prediction.status === 'LOCKED' && previousStatusRef.current === 'ACTIVE') {
        emitOBSTrigger('prediction_lock', prediction);
      }
      previousStatusRef.current = prediction.status;
    }
    
    setCurrentPrediction(prediction);
  }, [fetchPredictions, emitOBSTrigger]);

  /**
   * Start polling for active prediction updates
   * @requirements 2.2 - Update prediction data every 5 seconds
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(() => {
      refreshPrediction();
    }, pollingInterval);
  }, [refreshPrediction, pollingInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start/stop polling based on current prediction state
  useEffect(() => {
    if (!enablePolling || !broadcasterId || !authToken) {
      stopPolling();
      return;
    }

    if (currentPrediction && isActivePrediction(currentPrediction)) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [currentPrediction, enablePolling, broadcasterId, authToken, startPolling, stopPolling]);

  // Initial fetch when credentials are available
  useEffect(() => {
    if (broadcasterId && authToken) {
      refreshPrediction();
    }
  }, [broadcasterId, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Create a new prediction
   * @requirements 1.2 - Create prediction via Twitch API
   */
  const createPrediction = useCallback(async (data: PredictionFormData): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createData: CreatePredictionData = {
        broadcaster_id: broadcasterId,
        title: data.title,
        outcomes: data.outcomes.map(title => ({ title })),
        prediction_window: data.duration,
      };

      const result = await serviceRef.current.createPrediction(createData);

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      setCurrentPrediction(result);
      previousStatusRef.current = result.status;
      
      // Emit OBS event for prediction start
      emitOBSTrigger('prediction_start', result);
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear predicción';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, emitOBSTrigger]);

  /**
   * Lock the current prediction
   * @requirements 2.3 - Lock prediction preventing new bets
   */
  const lockPrediction = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current || !currentPrediction || !broadcasterId) {
      setError('No hay predicción activa');
      return false;
    }

    if (currentPrediction.status !== 'ACTIVE') {
      setError('La predicción no está activa');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.lockPrediction(
        broadcasterId,
        currentPrediction.id
      );

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      setCurrentPrediction(result);
      previousStatusRef.current = result.status;
      
      // Emit OBS event for prediction lock
      emitOBSTrigger('prediction_lock', result);
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al bloquear predicción';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, emitOBSTrigger]);

  /**
   * Resolve the current prediction with a winning outcome
   * @requirements 2.4 - Resolve prediction via API
   */
  const resolvePrediction = useCallback(async (outcomeId: string): Promise<boolean> => {
    if (!serviceRef.current || !currentPrediction || !broadcasterId) {
      setError('No hay predicción activa');
      return false;
    }

    if (currentPrediction.status === 'RESOLVED' || currentPrediction.status === 'CANCELED') {
      setError('La predicción ya ha terminado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.resolvePrediction(
        broadcasterId,
        currentPrediction.id,
        outcomeId
      );

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      // Add to history and clear current
      addToHistory(result);
      setCurrentPrediction(null);
      previousStatusRef.current = null;
      
      // Emit OBS event for prediction resolve
      emitOBSTrigger('prediction_resolve', result);
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al resolver predicción';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, addToHistory, emitOBSTrigger]);

  /**
   * Cancel the current prediction and refund points
   * @requirements 2.5 - Cancel and refund via API
   */
  const cancelPrediction = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current || !currentPrediction || !broadcasterId) {
      setError('No hay predicción activa');
      return false;
    }

    if (currentPrediction.status === 'RESOLVED' || currentPrediction.status === 'CANCELED') {
      setError('La predicción ya ha terminado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.cancelPrediction(
        broadcasterId,
        currentPrediction.id
      );

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      // Add to history and clear current
      addToHistory(result);
      setCurrentPrediction(null);
      previousStatusRef.current = null;
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al cancelar predicción';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, addToHistory]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentPrediction,
    history,
    isLoading,
    error,
    isPolling,
    createPrediction,
    lockPrediction,
    resolvePrediction,
    cancelPrediction,
    refreshPrediction,
    clearError,
  };
}

export default usePredictions;
