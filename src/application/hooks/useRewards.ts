/**
 * useRewards - Hook for managing Twitch Channel Points Rewards
 * 
 * Provides reactive state and actions for creating, managing, and
 * tracking Twitch custom rewards and redemptions with real-time polling
 * and OBS integration.
 * 
 * @requirements 4.1, 4.3, 4.4, 4.5, 5.1, 5.3, 5.5, 7.2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TwitchRewardsService,
  createTwitchRewardsService,
  isTwitchRewardsError,
  type TwitchRewardsError,
} from '../services/TwitchRewardsService';
import { getOBSService } from '../services/OBSService';
import type {
  TwitchReward,
  TwitchRedemption,
  CreateRewardData,
  UpdateRewardData,
  RewardFormData,
} from '../../../types/twitch';

// ============================================
// Constants
// ============================================

/** Polling interval for pending redemptions (ms) */
const POLLING_INTERVAL_MS = 10000;

// ============================================
// Types
// ============================================

export interface UseRewardsReturn {
  /** List of custom rewards */
  rewards: TwitchReward[];
  /** List of pending redemptions */
  redemptions: TwitchRedemption[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether polling is active */
  isPolling: boolean;
  
  /** Create a new custom reward */
  createReward: (data: RewardFormData) => Promise<boolean>;
  /** Update an existing reward */
  updateReward: (rewardId: string, data: Partial<RewardFormData>) => Promise<boolean>;
  /** Delete a reward */
  deleteReward: (rewardId: string) => Promise<boolean>;
  /** Toggle reward enabled status */
  toggleReward: (rewardId: string, enabled: boolean) => Promise<boolean>;
  /** Fulfill a redemption */
  fulfillRedemption: (redemptionId: string, rewardId: string) => Promise<boolean>;
  /** Reject a redemption */
  rejectRedemption: (redemptionId: string, rewardId: string) => Promise<boolean>;
  /** Manually refresh rewards data */
  refreshRewards: () => Promise<void>;
  /** Manually refresh redemptions data */
  refreshRedemptions: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

export interface UseRewardsOptions {
  /** Whether to enable polling for pending redemptions */
  enablePolling?: boolean;
  /** Custom polling interval in milliseconds */
  pollingInterval?: number;
  /** Whether to emit OBS events on redemptions */
  emitOBSEvents?: boolean;
  /** Only fetch manageable rewards (created by this app) */
  onlyManageable?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert RewardFormData to CreateRewardData for API
 */
function formDataToCreateData(data: RewardFormData): CreateRewardData {
  const createData: CreateRewardData = {
    title: data.title,
    cost: data.cost,
  };

  if (data.prompt !== undefined) createData.prompt = data.prompt;
  if (data.isEnabled !== undefined) createData.is_enabled = data.isEnabled;
  if (data.backgroundColor !== undefined) createData.background_color = data.backgroundColor;
  if (data.isUserInputRequired !== undefined) createData.is_user_input_required = data.isUserInputRequired;
  if (data.maxPerStreamEnabled !== undefined) createData.is_max_per_stream_enabled = data.maxPerStreamEnabled;
  if (data.maxPerStream !== undefined) createData.max_per_stream = data.maxPerStream;
  if (data.maxPerUserPerStreamEnabled !== undefined) createData.is_max_per_user_per_stream_enabled = data.maxPerUserPerStreamEnabled;
  if (data.maxPerUserPerStream !== undefined) createData.max_per_user_per_stream = data.maxPerUserPerStream;
  if (data.globalCooldownEnabled !== undefined) createData.is_global_cooldown_enabled = data.globalCooldownEnabled;
  if (data.globalCooldownSeconds !== undefined) createData.global_cooldown_seconds = data.globalCooldownSeconds;
  if (data.skipRequestQueue !== undefined) createData.should_redemptions_skip_request_queue = data.skipRequestQueue;

  return createData;
}

/**
 * Convert partial RewardFormData to UpdateRewardData for API
 */
function formDataToUpdateData(data: Partial<RewardFormData>): UpdateRewardData {
  const updateData: UpdateRewardData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.cost !== undefined) updateData.cost = data.cost;
  if (data.prompt !== undefined) updateData.prompt = data.prompt;
  if (data.isEnabled !== undefined) updateData.is_enabled = data.isEnabled;
  if (data.backgroundColor !== undefined) updateData.background_color = data.backgroundColor;
  if (data.isUserInputRequired !== undefined) updateData.is_user_input_required = data.isUserInputRequired;
  if (data.maxPerStreamEnabled !== undefined) updateData.is_max_per_stream_enabled = data.maxPerStreamEnabled;
  if (data.maxPerStream !== undefined) updateData.max_per_stream = data.maxPerStream;
  if (data.maxPerUserPerStreamEnabled !== undefined) updateData.is_max_per_user_per_stream_enabled = data.maxPerUserPerStreamEnabled;
  if (data.maxPerUserPerStream !== undefined) updateData.max_per_user_per_stream = data.maxPerUserPerStream;
  if (data.globalCooldownEnabled !== undefined) updateData.is_global_cooldown_enabled = data.globalCooldownEnabled;
  if (data.globalCooldownSeconds !== undefined) updateData.global_cooldown_seconds = data.globalCooldownSeconds;
  if (data.skipRequestQueue !== undefined) updateData.should_redemptions_skip_request_queue = data.skipRequestQueue;

  return updateData;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for managing Twitch Channel Points Rewards
 * 
 * @param broadcasterId - The broadcaster's Twitch user ID
 * @param authToken - OAuth token with channel:manage:redemptions scope
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const {
 *   rewards,
 *   redemptions,
 *   isLoading,
 *   error,
 *   createReward,
 *   fulfillRedemption,
 *   rejectRedemption,
 * } = useRewards(userId, authToken);
 * 
 * // Create a reward
 * await createReward({
 *   title: 'Highlight my message',
 *   cost: 500,
 *   prompt: 'Your message will be highlighted!',
 * });
 * ```
 */
export function useRewards(
  broadcasterId: string,
  authToken: string,
  options: UseRewardsOptions = {}
): UseRewardsReturn {
  const {
    enablePolling = true,
    pollingInterval = POLLING_INTERVAL_MS,
    emitOBSEvents = true,
    onlyManageable = false,
  } = options;

  // Service reference
  const serviceRef = useRef<TwitchRewardsService | null>(null);
  const obsServiceRef = useRef(getOBSService());

  // State
  const [rewards, setRewards] = useState<TwitchReward[]>([]);
  const [redemptions, setRedemptions] = useState<TwitchRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for polling
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track current token to detect changes
  const currentTokenRef = useRef<string>(authToken);

  // Initialize or update service when token changes
  useEffect(() => {
    if (authToken) {
      // Create new service or update existing one
      if (serviceRef.current && currentTokenRef.current !== authToken) {
        // Token changed - update existing service
        serviceRef.current.setToken(authToken);
      } else if (!serviceRef.current) {
        // No service yet - create new one
        serviceRef.current = createTwitchRewardsService(authToken);
      }
      currentTokenRef.current = authToken;
    } else {
      serviceRef.current = null;
      currentTokenRef.current = '';
    }
  }, [authToken]);

  /**
   * Emit OBS trigger event for reward redemption
   * @requirements 7.2 - Emit events when a reward is redeemed
   */
  const emitOBSTrigger = useCallback((
    triggerType: 'reward_redeemed',
    redemption: TwitchRedemption
  ) => {
    if (!emitOBSEvents) return;
    
    try {
      // Use dedicated trigger type for reward redemptions
      obsServiceRef.current.executeTrigger(triggerType);
    } catch (e) {
      console.warn('Failed to emit OBS trigger:', e);
    }
  }, [emitOBSEvents]);

  /**
   * Fetch rewards from API
   * @requirements 4.1 - Display all custom rewards
   */
  const fetchRewards = useCallback(async (): Promise<TwitchReward[]> => {
    if (!serviceRef.current || !broadcasterId) return [];

    const result = await serviceRef.current.getCustomRewards(broadcasterId, onlyManageable);
    
    if (isTwitchRewardsError(result)) {
      setError(result.message);
      return [];
    }

    return result;
  }, [broadcasterId, onlyManageable]);

  /**
   * Fetch pending redemptions from API
   * @requirements 5.1, 5.5 - Display pending redemptions with real-time updates
   */
  const fetchRedemptions = useCallback(async (): Promise<TwitchRedemption[]> => {
    if (!serviceRef.current || !broadcasterId) return [];

    const result = await serviceRef.current.getAllPendingRedemptions(broadcasterId);
    
    if (isTwitchRewardsError(result)) {
      // Don't set error for redemption fetch failures during polling
      console.warn('Error fetching redemptions:', result.message);
      return [];
    }

    return result;
  }, [broadcasterId]);

  /**
   * Refresh rewards data
   */
  const refreshRewards = useCallback(async () => {
    const fetchedRewards = await fetchRewards();
    setRewards(fetchedRewards);
  }, [fetchRewards]);

  /**
   * Refresh redemptions data
   * @requirements 5.5 - Update redemptions in real-time
   */
  const refreshRedemptions = useCallback(async () => {
    const fetchedRedemptions = await fetchRedemptions();
    setRedemptions(fetchedRedemptions);
  }, [fetchRedemptions]);

  /**
   * Start polling for pending redemptions
   * @requirements 5.5 - Update redemptions in real-time via polling
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(() => {
      refreshRedemptions();
    }, pollingInterval);
  }, [refreshRedemptions, pollingInterval]);

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

  // Start/stop polling based on options and credentials
  useEffect(() => {
    if (!enablePolling || !broadcasterId || !authToken) {
      stopPolling();
      return;
    }

    startPolling();
    return () => stopPolling();
  }, [enablePolling, broadcasterId, authToken, startPolling, stopPolling]);

  // Initial fetch when credentials are available or change
  // This effect handles reconnection scenarios where the token changes
  useEffect(() => {
    if (broadcasterId && authToken) {
      // Clear any previous error when credentials change (reconnection)
      setError(null);
      
      // Small delay to ensure service is updated with new token
      // This handles the race condition between service update and fetch
      const timeoutId = setTimeout(() => {
        refreshRewards();
        refreshRedemptions();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [broadcasterId, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Create a new custom reward
   * @requirements 4.3 - Create custom reward via API
   */
  const createReward = useCallback(async (data: RewardFormData): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createData = formDataToCreateData(data);
      const result = await serviceRef.current.createCustomReward(broadcasterId, createData);

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Add new reward to state
      setRewards(prev => [...prev, result]);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear recompensa';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId]);

  /**
   * Update an existing reward
   * @requirements 4.4 - Update custom reward
   */
  const updateReward = useCallback(async (
    rewardId: string,
    data: Partial<RewardFormData>
  ): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData = formDataToUpdateData(data);
      const result = await serviceRef.current.updateCustomReward(broadcasterId, rewardId, updateData);

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Update reward in state
      setRewards(prev => prev.map(r => r.id === rewardId ? result : r));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al actualizar recompensa';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId]);

  /**
   * Delete a reward
   * @requirements 4.3 - Delete custom reward
   */
  const deleteReward = useCallback(async (rewardId: string): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.deleteCustomReward(broadcasterId, rewardId);

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Remove reward from state
      setRewards(prev => prev.filter(r => r.id !== rewardId));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al eliminar recompensa';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId]);

  /**
   * Toggle reward enabled status
   * @requirements 4.5 - Enable/disable rewards
   */
  const toggleReward = useCallback(async (
    rewardId: string,
    enabled: boolean
  ): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.toggleReward(broadcasterId, rewardId, enabled);

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Update reward in state
      setRewards(prev => prev.map(r => r.id === rewardId ? result : r));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al cambiar estado de recompensa';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId]);

  /**
   * Fulfill a redemption
   * @requirements 5.3 - Mark redemption as fulfilled
   */
  const fulfillRedemption = useCallback(async (
    redemptionId: string,
    rewardId: string
  ): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.fulfillRedemption(
        broadcasterId,
        rewardId,
        redemptionId
      );

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Remove redemption from pending list
      setRedemptions(prev => prev.filter(r => r.id !== redemptionId));
      
      // Emit OBS event
      emitOBSTrigger('reward_redeemed', result);
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al completar redención';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId, emitOBSTrigger]);

  /**
   * Reject a redemption
   * @requirements 5.3 - Mark redemption as rejected
   */
  const rejectRedemption = useCallback(async (
    redemptionId: string,
    rewardId: string
  ): Promise<boolean> => {
    if (!serviceRef.current || !broadcasterId) {
      setError('No hay conexión con Twitch');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.rejectRedemption(
        broadcasterId,
        rewardId,
        redemptionId
      );

      if (isTwitchRewardsError(result)) {
        setError(result.message);
        return false;
      }

      // Remove redemption from pending list
      setRedemptions(prev => prev.filter(r => r.id !== redemptionId));
      
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al rechazar redención';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [broadcasterId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    rewards,
    redemptions,
    isLoading,
    error,
    isPolling,
    createReward,
    updateReward,
    deleteReward,
    toggleReward,
    fulfillRedemption,
    rejectRedemption,
    refreshRewards,
    refreshRedemptions,
    clearError,
  };
}

export default useRewards;
