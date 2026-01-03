/**
 * usePredictions - Hook for managing Twitch Predictions
 * 
 * Provides reactive state and actions for creating, managing, and
 * tracking Twitch predictions with real-time polling and OBS integration.
 * 
 * IMPORTANTE: Para que los moderadores puedan crear predicciones, el broadcaster
 * debe haber autorizado la app previamente (token guardado en Firebase).
 * 
 * @requirements 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 3.3, 7.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TwitchPredictionService,
  createTwitchPredictionService,
  isTwitchPredictionError,
} from '../services/TwitchPredictionService';
import { getOBSService } from '../services/OBSService';
import { getMacroService } from '../services/MacroService';
import type { IPredictionServiceAdapter } from '../services/ActionExecutorService';
import { getTwitchApiServiceAdapter } from '../adapters/TwitchApiServiceAdapter';
import { getTwitchAdapter } from '../../infrastructure/adapters/TwitchAdapter';
import {
  BroadcasterTokenService,
  BROADCASTER_SCOPES,
} from '../services/BroadcasterTokenService';
import type {
  TwitchPrediction,
  PredictionFormData,
  CreatePredictionData,
} from '../../../types/twitch';

// ============================================
// Constants
// ============================================

const STORAGE_KEY_PREDICTION_HISTORY = 'twitch_prediction_history';
const POLLING_INTERVAL_MS = 5000;
const MAX_HISTORY_ITEMS = 50;

// ============================================
// Types
// ============================================

export interface UsePredictionsReturn {
  currentPrediction: TwitchPrediction | null;
  history: TwitchPrediction[];
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  canCreatePredictions: boolean;
  permissionMessage: string | null;
  
  createPrediction: (data: PredictionFormData) => Promise<boolean>;
  lockPrediction: () => Promise<boolean>;
  resolvePrediction: (outcomeId: string) => Promise<boolean>;
  cancelPrediction: () => Promise<boolean>;
  refreshPrediction: () => Promise<void>;
  clearError: () => void;
}

export interface UsePredictionsOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  emitOBSEvents?: boolean;
  moderatorId?: string;
}

// ============================================
// Helper Functions
// ============================================

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

function saveHistoryToStorage(history: TwitchPrediction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREDICTION_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  } catch (e) {
    console.error('Error saving prediction history:', e);
  }
}

function isActivePrediction(prediction: TwitchPrediction): boolean {
  return prediction.status === 'ACTIVE' || prediction.status === 'LOCKED';
}

function isTerminalPrediction(prediction: TwitchPrediction): boolean {
  return prediction.status === 'RESOLVED' || prediction.status === 'CANCELED';
}

// ============================================
// Hook Implementation
// ============================================

export function usePredictions(
  broadcasterId: string,
  authToken: string,
  options: UsePredictionsOptions = {}
): UsePredictionsReturn {
  const {
    enablePolling = true,
    pollingInterval = POLLING_INTERVAL_MS,
    emitOBSEvents = true,
    moderatorId,
  } = options;

  // moderatorId is the logged-in user's ID
  // isOwnChannel is true only if the logged-in user IS the broadcaster
  const loggedInUserId = moderatorId || '';
  const isOwnChannel = !!(loggedInUserId && loggedInUserId === broadcasterId);

  // Refs
  const serviceRef = useRef<TwitchPredictionService | null>(null);
  const obsServiceRef = useRef(getOBSService());
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  // State
  const [currentPrediction, setCurrentPrediction] = useState<TwitchPrediction | null>(null);
  const [history, setHistory] = useState<TwitchPrediction[]>(() => loadHistoryFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [canCreatePredictions, setCanCreatePredictions] = useState(isOwnChannel);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  // Check permissions (async because Firebase)
  useEffect(() => {
    if (!broadcasterId) {
      setCanCreatePredictions(false);
      setPermissionMessage('No hay canal seleccionado');
      return;
    }

    if (isOwnChannel) {
      setCanCreatePredictions(true);
      setPermissionMessage(null);
      return;
    }

    // Subscribe to broadcaster token changes from Firebase
    const unsubscribe = BroadcasterTokenService.subscribeToToken(
      broadcasterId,
      (token) => {
        if (token) {
          const hasScope = token.scopes.includes(BROADCASTER_SCOPES.predictions);
          setCanCreatePredictions(hasScope);
          setPermissionMessage(
            hasScope ? null : 'El streamer necesita reconectar con permisos de predicciones.'
          );
        } else {
          setCanCreatePredictions(false);
          setPermissionMessage(
            'Para crear predicciones, el streamer debe autorizar Stream Crowd.'
          );
        }
      }
    );

    return () => unsubscribe();
  }, [broadcasterId, isOwnChannel]);

  // Cached token for API calls (to avoid re-fetching on every poll)
  const cachedTokenRef = useRef<string | null>(null);

  // Get effective token for API calls
  const getEffectiveToken = useCallback(async (): Promise<{ token: string } | { error: string }> => {
    if (isOwnChannel) {
      cachedTokenRef.current = authToken;
      return { token: authToken };
    }

    // Try to get from Firebase
    const result = await BroadcasterTokenService.getTokenForAction(
      broadcasterId,
      [BROADCASTER_SCOPES.predictions]
    );
    
    if ('token' in result) {
      cachedTokenRef.current = result.token;
    }
    
    return result;
  }, [broadcasterId, authToken, isOwnChannel]);

  // Get cached token or fetch new one
  const getTokenForPolling = useCallback(async (): Promise<string | null> => {
    if (cachedTokenRef.current) {
      return cachedTokenRef.current;
    }
    const result = await getEffectiveToken();
    return 'token' in result ? result.token : null;
  }, [getEffectiveToken]);

  // Initialize service
  useEffect(() => {
    if (authToken) {
      serviceRef.current = createTwitchPredictionService(authToken);
      
      // Configure MacroService
      if (broadcasterId) {
        const predictionAdapter: IPredictionServiceAdapter = {
          createPrediction: async (data) => {
            const tokenResult = await getEffectiveToken();
            if ('error' in tokenResult) {
              return {
                code: 'no_broadcaster_token',
                status: 403,
                message: tokenResult.error,
                solution: 'El streamer debe autorizar la app.',
                retryable: false,
              };
            }
            const tempService = createTwitchPredictionService(tokenResult.token);
            return tempService.createPrediction(data);
          },
          getBroadcasterId: () => broadcasterId,
        };
        getMacroService().configureServices({ predictionService: predictionAdapter });
        
        const twitchAdapter = getTwitchAdapter();
        const twitchApiAdapter = getTwitchApiServiceAdapter(twitchAdapter);
        if (twitchApiAdapter) {
          twitchApiAdapter.setCredentials(authToken, broadcasterId, loggedInUserId);
          getMacroService().configureServices({ twitchApiService: twitchApiAdapter });
        }
      }
    } else {
      serviceRef.current = null;
    }
  }, [authToken, broadcasterId, loggedInUserId, getEffectiveToken]);

  // OBS trigger helper
  const emitOBSTrigger = useCallback((
    triggerType: 'prediction_start' | 'prediction_lock' | 'prediction_resolve',
    prediction: TwitchPrediction
  ) => {
    if (!emitOBSEvents) return;
    try {
      obsServiceRef.current.executeTrigger(triggerType);
    } catch (e) {
      console.warn('Failed to emit OBS trigger:', e);
    }
  }, [emitOBSEvents]);

  // Add to history
  const addToHistory = useCallback((prediction: TwitchPrediction) => {
    if (!isTerminalPrediction(prediction)) return;
    
    setHistory(prev => {
      const exists = prev.some(p => p.id === prediction.id);
      if (exists) {
        const updated = prev.map(p => p.id === prediction.id ? prediction : p);
        saveHistoryToStorage(updated);
        return updated;
      }
      const updated = [prediction, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveHistoryToStorage(updated);
      return updated;
    });
  }, []);

  // Fetch predictions - uses broadcaster token for moderators
  const fetchPredictions = useCallback(async (): Promise<TwitchPrediction | null> => {
    if (!broadcasterId) return null;

    // Get cached token for polling (avoid re-fetching)
    const token = await getTokenForPolling();
    if (!token) {
      return null;
    }

    const effectiveService = createTwitchPredictionService(token);
    const result = await effectiveService.getPredictions(broadcasterId);
    
    if (isTwitchPredictionError(result)) {
      // Don't set error for 403/401 on polling - moderator might not have read access
      if (result.status !== 403 && result.status !== 401) {
        setError(result.message);
      }
      return null;
    }

    const activePrediction = result.find(isActivePrediction);
    result.filter(isTerminalPrediction).forEach(addToHistory);

    return activePrediction || null;
  }, [broadcasterId, addToHistory, getTokenForPolling]);

  // Refresh
  const refreshPrediction = useCallback(async () => {
    const prediction = await fetchPredictions();
    
    if (prediction && previousStatusRef.current !== prediction.status) {
      if (prediction.status === 'LOCKED' && previousStatusRef.current === 'ACTIVE') {
        emitOBSTrigger('prediction_lock', prediction);
      }
      previousStatusRef.current = prediction.status;
    }
    
    setCurrentPrediction(prediction);
  }, [fetchPredictions, emitOBSTrigger]);

  // Polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(refreshPrediction, pollingInterval);
  }, [refreshPrediction, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

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

  // Initial fetch
  useEffect(() => {
    if (broadcasterId && authToken && enablePolling) {
      setError(null);
      const timeoutId = setTimeout(refreshPrediction, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [broadcasterId, authToken, enablePolling]); // eslint-disable-line

  // Create prediction
  const createPrediction = useCallback(async (data: PredictionFormData): Promise<boolean> => {
    if (!broadcasterId) {
      setError('No hay canal seleccionado');
      return false;
    }

    if (!canCreatePredictions) {
      setError(permissionMessage || 'No tienes permisos para crear predicciones');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenResult = await getEffectiveToken();
      
      if ('error' in tokenResult) {
        setError(tokenResult.error);
        return false;
      }

      const effectiveService = createTwitchPredictionService(tokenResult.token);

      const createData: CreatePredictionData = {
        broadcaster_id: broadcasterId,
        title: data.title,
        outcomes: data.outcomes.map(title => ({ title })),
        prediction_window: data.duration,
      };

      const result = await effectiveService.createPrediction(createData);

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      setCurrentPrediction(result);
      previousStatusRef.current = result.status;
      emitOBSTrigger('prediction_start', result);
      
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear predicción');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, canCreatePredictions, permissionMessage, getEffectiveToken, emitOBSTrigger]);

  // Lock prediction
  const lockPrediction = useCallback(async (): Promise<boolean> => {
    if (!currentPrediction || !broadcasterId) {
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
      const tokenResult = await getEffectiveToken();
      if ('error' in tokenResult) {
        setError(tokenResult.error);
        return false;
      }

      const effectiveService = createTwitchPredictionService(tokenResult.token);
      const result = await effectiveService.lockPrediction(broadcasterId, currentPrediction.id);

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      setCurrentPrediction(result);
      previousStatusRef.current = result.status;
      emitOBSTrigger('prediction_lock', result);
      
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al bloquear predicción');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, getEffectiveToken, emitOBSTrigger]);

  // Resolve prediction
  const resolvePrediction = useCallback(async (outcomeId: string): Promise<boolean> => {
    if (!currentPrediction || !broadcasterId) {
      setError('No hay predicción activa');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenResult = await getEffectiveToken();
      if ('error' in tokenResult) {
        setError(tokenResult.error);
        return false;
      }

      const effectiveService = createTwitchPredictionService(tokenResult.token);
      const result = await effectiveService.resolvePrediction(broadcasterId, currentPrediction.id, outcomeId);

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      addToHistory(result);
      setCurrentPrediction(null);
      previousStatusRef.current = null;
      emitOBSTrigger('prediction_resolve', result);
      
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al resolver predicción');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, getEffectiveToken, addToHistory, emitOBSTrigger]);

  // Cancel prediction
  const cancelPrediction = useCallback(async (): Promise<boolean> => {
    if (!currentPrediction || !broadcasterId) {
      setError('No hay predicción activa');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenResult = await getEffectiveToken();
      if ('error' in tokenResult) {
        setError(tokenResult.error);
        return false;
      }

      const effectiveService = createTwitchPredictionService(tokenResult.token);
      const result = await effectiveService.cancelPrediction(broadcasterId, currentPrediction.id);

      if (isTwitchPredictionError(result)) {
        setError(result.message);
        return false;
      }

      addToHistory(result);
      setCurrentPrediction(null);
      previousStatusRef.current = null;
      
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar predicción');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPrediction, getEffectiveToken, addToHistory]);

  const clearError = useCallback(() => setError(null), []);

  return {
    currentPrediction,
    history,
    isLoading,
    error,
    isPolling,
    canCreatePredictions,
    permissionMessage,
    createPrediction,
    lockPrediction,
    resolvePrediction,
    cancelPrediction,
    refreshPrediction,
    clearError,
  };
}

export default usePredictions;
