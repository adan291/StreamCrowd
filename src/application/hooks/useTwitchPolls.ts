/**
 * useTwitchPolls - Hook for managing Twitch Polls via API
 * 
 * Provides reactive state and actions for creating and managing
 * Twitch polls with broadcaster token delegation support.
 * 
 * Los tokens se almacenan en Firebase para que sean accesibles
 * desde cualquier dispositivo/navegador.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TwitchPollService,
  createTwitchPollService,
  isTwitchPollError,
  type TwitchPoll,
  type CreatePollData,
} from '../services/TwitchPollService';
import {
  BroadcasterTokenService,
  BROADCASTER_SCOPES,
} from '../services/BroadcasterTokenService';

// ============================================
// Types
// ============================================

export interface PollFormData {
  title: string;
  choices: string[];
  duration: number;
  channelPointsVotingEnabled?: boolean;
  channelPointsPerVote?: number;
}

export interface UseTwitchPollsReturn {
  currentPoll: TwitchPoll | null;
  history: TwitchPoll[];
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  canCreatePolls: boolean;
  permissionMessage: string | null;
  
  createPoll: (data: PollFormData) => Promise<boolean>;
  terminatePoll: () => Promise<boolean>;
  archivePoll: () => Promise<boolean>;
  refreshPoll: () => Promise<void>;
  clearError: () => void;
}

export interface UseTwitchPollsOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  moderatorId?: string;
}

// ============================================
// Constants
// ============================================

const POLLING_INTERVAL_MS = 5000;
const STORAGE_KEY_POLL_HISTORY = 'twitch_poll_history';
const MAX_HISTORY_ITEMS = 50;

// ============================================
// Helper Functions
// ============================================

function loadHistoryFromStorage(): TwitchPoll[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_POLL_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Deduplicate by ID to prevent duplicate key warnings
        const seen = new Set<string>();
        const deduplicated = parsed.filter((poll: TwitchPoll) => {
          if (seen.has(poll.id)) return false;
          seen.add(poll.id);
          return true;
        });
        return deduplicated.slice(0, MAX_HISTORY_ITEMS);
      }
    }
  } catch (e) {
    console.error('Error loading poll history:', e);
  }
  return [];
}

function saveHistoryToStorage(history: TwitchPoll[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_POLL_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  } catch (e) {
    console.error('Error saving poll history:', e);
  }
}

function isActivePoll(poll: TwitchPoll): boolean {
  return poll.status === 'ACTIVE';
}

function isTerminalPoll(poll: TwitchPoll): boolean {
  return ['COMPLETED', 'TERMINATED', 'ARCHIVED', 'MODERATED', 'INVALID'].includes(poll.status);
}

// ============================================
// Hook Implementation
// ============================================

export function useTwitchPolls(
  broadcasterId: string,
  authToken: string,
  options: UseTwitchPollsOptions = {}
): UseTwitchPollsReturn {
  const {
    enablePolling = true,
    pollingInterval = POLLING_INTERVAL_MS,
    moderatorId,
  } = options;

  const effectiveModeratorId = moderatorId || broadcasterId;
  const isOwnChannel = effectiveModeratorId === broadcasterId;

  // State
  const [currentPoll, setCurrentPoll] = useState<TwitchPoll | null>(null);
  const [history, setHistory] = useState<TwitchPoll[]>(() => loadHistoryFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [canCreatePolls, setCanCreatePolls] = useState(isOwnChannel);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  // Refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check permissions (subscribe to Firebase)
  useEffect(() => {
    if (!broadcasterId) {
      setCanCreatePolls(false);
      setPermissionMessage('No hay canal seleccionado');
      return;
    }

    if (isOwnChannel) {
      setCanCreatePolls(true);
      setPermissionMessage(null);
      return;
    }

    // Subscribe to broadcaster token changes from Firebase
    const unsubscribe = BroadcasterTokenService.subscribeToToken(
      broadcasterId,
      (token) => {
        if (token) {
          const hasScope = token.scopes.includes(BROADCASTER_SCOPES.polls);
          setCanCreatePolls(hasScope);
          setPermissionMessage(
            hasScope ? null : 'El streamer necesita reconectar con permisos de encuestas.'
          );
        } else {
          setCanCreatePolls(false);
          setPermissionMessage(
            'Para crear encuestas, el streamer debe autorizar Stream Crowd.'
          );
        }
      }
    );

    return () => unsubscribe();
  }, [broadcasterId, isOwnChannel]);

  // Get effective token
  const getEffectiveToken = useCallback(async (): Promise<{ token: string } | { error: string }> => {
    if (isOwnChannel) {
      return { token: authToken };
    }

    return BroadcasterTokenService.getTokenForAction(
      broadcasterId,
      [BROADCASTER_SCOPES.polls]
    );
  }, [broadcasterId, authToken, isOwnChannel]);

  // Add to history
  const addToHistory = useCallback((poll: TwitchPoll) => {
    if (!isTerminalPoll(poll)) return;
    
    setHistory(prev => {
      const exists = prev.some(p => p.id === poll.id);
      if (exists) {
        const updated = prev.map(p => p.id === poll.id ? poll : p);
        saveHistoryToStorage(updated);
        return updated;
      }
      const updated = [poll, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveHistoryToStorage(updated);
      return updated;
    });
  }, []);

  // Fetch polls
  const fetchPolls = useCallback(async (): Promise<TwitchPoll | null> => {
    if (!broadcasterId) return null;

    const tokenResult = await getEffectiveToken();
    if ('error' in tokenResult) {
      return null;
    }

    const service = createTwitchPollService(tokenResult.token);
    const result = await service.getPolls(broadcasterId);
    
    if (isTwitchPollError(result)) {
      return null;
    }

    const activePoll = result.find(isActivePoll);
    result.filter(isTerminalPoll).forEach(addToHistory);

    return activePoll || null;
  }, [broadcasterId, getEffectiveToken, addToHistory]);

  // Refresh
  const refreshPoll = useCallback(async () => {
    const poll = await fetchPolls();
    setCurrentPoll(poll);
  }, [fetchPolls]);

  // Polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(refreshPoll, pollingInterval);
  }, [refreshPoll, pollingInterval]);

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

    if (currentPoll && isActivePoll(currentPoll)) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [currentPoll, enablePolling, broadcasterId, authToken, startPolling, stopPolling]);

  // Initial fetch
  useEffect(() => {
    if (broadcasterId && authToken && enablePolling) {
      setError(null);
      const timeoutId = setTimeout(refreshPoll, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [broadcasterId, authToken, enablePolling]); // eslint-disable-line

  // Create poll
  const createPoll = useCallback(async (data: PollFormData): Promise<boolean> => {
    if (!broadcasterId) {
      setError('No hay canal seleccionado');
      return false;
    }

    if (!canCreatePolls) {
      setError(permissionMessage || 'No tienes permisos para crear encuestas');
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

      const service = createTwitchPollService(tokenResult.token);

      const createData: CreatePollData = {
        broadcaster_id: broadcasterId,
        title: data.title,
        choices: data.choices.map(title => ({ title })),
        duration: data.duration,
        channel_points_voting_enabled: data.channelPointsVotingEnabled,
        channel_points_per_vote: data.channelPointsPerVote,
      };

      const result = await service.createPoll(createData);

      if (isTwitchPollError(result)) {
        setError(result.message);
        return false;
      }

      setCurrentPoll(result);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear encuesta');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, canCreatePolls, permissionMessage, getEffectiveToken]);

  // Terminate poll
  const terminatePoll = useCallback(async (): Promise<boolean> => {
    if (!currentPoll || !broadcasterId) {
      setError('No hay encuesta activa');
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

      const service = createTwitchPollService(tokenResult.token);
      const result = await service.terminatePoll(broadcasterId, currentPoll.id);

      if (isTwitchPollError(result)) {
        setError(result.message);
        return false;
      }

      addToHistory(result);
      setCurrentPoll(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al terminar encuesta');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPoll, getEffectiveToken, addToHistory]);

  // Archive poll
  const archivePoll = useCallback(async (): Promise<boolean> => {
    if (!currentPoll || !broadcasterId) {
      setError('No hay encuesta activa');
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

      const service = createTwitchPollService(tokenResult.token);
      const result = await service.archivePoll(broadcasterId, currentPoll.id);

      if (isTwitchPollError(result)) {
        setError(result.message);
        return false;
      }

      addToHistory(result);
      setCurrentPoll(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al archivar encuesta');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, currentPoll, getEffectiveToken, addToHistory]);

  const clearError = useCallback(() => setError(null), []);

  return {
    currentPoll,
    history,
    isLoading,
    error,
    isPolling,
    canCreatePolls,
    permissionMessage,
    createPoll,
    terminatePoll,
    archivePoll,
    refreshPoll,
    clearError,
  };
}

export default useTwitchPolls;
