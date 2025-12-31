/**
 * useModerationAction Hook
 * 
 * React hook wrapper for ModerationActionService with loading/result state management.
 * Provides reactive moderation actions with automatic state handling.
 * 
 * @module src/application/hooks/useModerationAction
 * @requirements 2.1-2.6 - Moderation actions with result handling
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  ModerationActionService,
  ModerationResult,
  AnnouncementColor,
  createModerationActionService,
} from '../services/ModerationActionService';

// Re-export types for convenience
export type { ModerationResult, AnnouncementColor };

/**
 * State for a moderation action
 */
export interface ModerationActionState {
  loading: boolean;
  result: ModerationResult | null;
  lastAction: string | null;
}

/**
 * Return type for the useModerationAction hook
 */
export interface UseModerationActionReturn {
  /** Current action state */
  state: ModerationActionState;
  
  /** Whether any action is currently in progress */
  isLoading: boolean;
  
  /** Last action result */
  lastResult: ModerationResult | null;
  
  /** Timeout a user */
  timeoutUser: (
    broadcasterId: string,
    userId: string,
    duration: number,
    reason?: string
  ) => Promise<ModerationResult>;
  
  /** Ban a user permanently */
  banUser: (
    broadcasterId: string,
    userId: string,
    reason?: string
  ) => Promise<ModerationResult>;
  
  /** Unban a user */
  unbanUser: (
    broadcasterId: string,
    userId: string
  ) => Promise<ModerationResult>;
  
  /** Add VIP status to a user */
  addVIP: (
    broadcasterId: string,
    userId: string
  ) => Promise<ModerationResult>;
  
  /** Remove VIP status from a user */
  removeVIP: (
    broadcasterId: string,
    userId: string
  ) => Promise<ModerationResult>;
  
  /** Send an announcement to chat */
  sendAnnouncement: (
    broadcasterId: string,
    message: string,
    color?: AnnouncementColor
  ) => Promise<ModerationResult>;
  
  /** Clear the current state */
  clearState: () => void;
  
  /** Update the OAuth token */
  updateToken: (token: string) => void;
  
  /** Service instance */
  service: ModerationActionService;
}

/**
 * Create initial action state
 */
function createInitialState(): ModerationActionState {
  return {
    loading: false,
    result: null,
    lastAction: null,
  };
}

/**
 * Hook for executing moderation actions with loading/result state management
 * 
 * @param token - OAuth token for API authentication
 * @param clientId - Optional Twitch client ID
 * 
 * @example
 * ```tsx
 * const { timeoutUser, banUser, state, isLoading } = useModerationAction(token);
 * 
 * const handleTimeout = async (userId: string) => {
 *   const result = await timeoutUser(broadcasterId, userId, 300, 'Spam');
 *   if (result.success) {
 *     showToast('Usuario silenciado');
 *   } else {
 *     showError(result.message);
 *   }
 * };
 * 
 * return (
 *   <Button onClick={() => handleTimeout(userId)} disabled={isLoading}>
 *     {isLoading ? 'Procesando...' : 'Timeout 5m'}
 *   </Button>
 * );
 * ```
 */
export function useModerationAction(token: string, clientId?: string): UseModerationActionReturn {
  // Service instance
  const serviceRef = useRef<ModerationActionService | null>(null);
  
  // Initialize service lazily
  const service = useMemo(() => {
    if (!serviceRef.current) {
      serviceRef.current = createModerationActionService(token, clientId);
    }
    return serviceRef.current;
  }, []);

  // Update token when it changes
  const updateToken = useCallback((newToken: string) => {
    service.setToken(newToken);
  }, [service]);

  // State for action status
  const [state, setState] = useState<ModerationActionState>(createInitialState);

  /**
   * Timeout a user
   * @requirements 2.1
   */
  const timeoutUser = useCallback(async (
    broadcasterId: string,
    userId: string,
    duration: number,
    reason?: string
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'timeout' });
    
    const result = await service.timeoutUser(broadcasterId, userId, duration, reason);
    
    setState({ loading: false, result, lastAction: 'timeout' });
    return result;
  }, [service]);

  /**
   * Ban a user permanently
   * @requirements 2.2
   */
  const banUser = useCallback(async (
    broadcasterId: string,
    userId: string,
    reason?: string
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'ban' });
    
    const result = await service.banUser(broadcasterId, userId, reason);
    
    setState({ loading: false, result, lastAction: 'ban' });
    return result;
  }, [service]);

  /**
   * Unban a user
   * @requirements 2.3
   */
  const unbanUser = useCallback(async (
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'unban' });
    
    const result = await service.unbanUser(broadcasterId, userId);
    
    setState({ loading: false, result, lastAction: 'unban' });
    return result;
  }, [service]);

  /**
   * Add VIP status to a user
   * @requirements 2.4
   */
  const addVIP = useCallback(async (
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'addVIP' });
    
    const result = await service.addVIP(broadcasterId, userId);
    
    setState({ loading: false, result, lastAction: 'addVIP' });
    return result;
  }, [service]);

  /**
   * Remove VIP status from a user
   * @requirements 2.5
   */
  const removeVIP = useCallback(async (
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'removeVIP' });
    
    const result = await service.removeVIP(broadcasterId, userId);
    
    setState({ loading: false, result, lastAction: 'removeVIP' });
    return result;
  }, [service]);

  /**
   * Send an announcement to chat
   * @requirements 2.6
   */
  const sendAnnouncement = useCallback(async (
    broadcasterId: string,
    message: string,
    color?: AnnouncementColor
  ): Promise<ModerationResult> => {
    setState({ loading: true, result: null, lastAction: 'announcement' });
    
    const result = await service.sendAnnouncement(broadcasterId, message, color);
    
    setState({ loading: false, result, lastAction: 'announcement' });
    return result;
  }, [service]);

  // Clear state
  const clearState = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    isLoading: state.loading,
    lastResult: state.result,
    timeoutUser,
    banUser,
    unbanUser,
    addVIP,
    removeVIP,
    sendAnnouncement,
    clearState,
    updateToken,
    service,
  };
}

export default useModerationAction;
