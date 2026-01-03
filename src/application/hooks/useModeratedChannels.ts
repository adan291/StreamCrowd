/**
 * useModeratedChannels - Hook for managing channel context
 * 
 * Provides functionality to:
 * - Fetch channels where user is moderator
 * - Switch between own channel and moderated channels
 * - Track current channel context
 * 
 * @module src/application/hooks/useModeratedChannels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ModeratedChannelsService,
  createModeratedChannelsService,
  isModeratedChannelsError,
  type ChannelContext,
  type ModeratedChannelsError,
} from '../services/ModeratedChannelsService';

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEY_SELECTED_CHANNEL = 'twitch_selected_channel_context';

// ============================================
// Types
// ============================================

export interface UseModeratedChannelsReturn {
  /** List of available channel contexts (own + moderated) */
  channels: ChannelContext[];
  /** Currently selected channel context */
  selectedChannel: ChannelContext | null;
  /** Whether channels are being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Select a different channel context */
  selectChannel: (channelId: string) => void;
  /** Refresh the list of moderated channels */
  refresh: () => Promise<void>;
  /** Whether user has moderated channels available */
  hasModeratedChannels: boolean;
  /** Whether currently viewing a moderated channel (not own) */
  isViewingModeratedChannel: boolean;
}

export interface UseModeratedChannelsOptions {
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
  /** Whether to persist selected channel */
  persistSelection?: boolean;
  /** The channel name currently connected to (for auto-selection) */
  connectedChannelName?: string;
}

// ============================================
// Helper Functions
// ============================================

function loadSavedSelection(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_SELECTED_CHANNEL);
  } catch {
    return null;
  }
}

function saveSelection(channelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_CHANNEL, channelId);
  } catch {
    // Ignore storage errors
  }
}

function clearSelection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SELECTED_CHANNEL);
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for managing channel context with moderator support
 * 
 * @param userId - Authenticated user's Twitch ID
 * @param userLogin - Authenticated user's login name
 * @param userName - Authenticated user's display name
 * @param authToken - OAuth token
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const {
 *   channels,
 *   selectedChannel,
 *   selectChannel,
 *   hasModeratedChannels,
 * } = useModeratedChannels(userId, userLogin, userName, authToken);
 * 
 * // Render channel selector
 * <select onChange={(e) => selectChannel(e.target.value)}>
 *   {channels.map(ch => (
 *     <option key={ch.channelId} value={ch.channelId}>
 *       {ch.channelName} {ch.isOwnChannel ? '(Tu canal)' : '(Mod)'}
 *     </option>
 *   ))}
 * </select>
 * ```
 */
export function useModeratedChannels(
  userId: string,
  userLogin: string,
  userName: string,
  authToken: string,
  options: UseModeratedChannelsOptions = {}
): UseModeratedChannelsReturn {
  const {
    autoFetch = true,
    persistSelection = true,
    connectedChannelName,
  } = options;

  // Service ref
  const serviceRef = useRef<ModeratedChannelsService | null>(null);

  // State
  const [channels, setChannels] = useState<ChannelContext[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service when token changes
  useEffect(() => {
    if (authToken) {
      serviceRef.current = createModeratedChannelsService(authToken);
    } else {
      serviceRef.current = null;
    }
  }, [authToken]);

  /**
   * Fetch channel contexts
   */
  const fetchChannels = useCallback(async () => {
    if (!serviceRef.current || !userId || !userLogin || !userName) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.getChannelContextOptions(
        userId,
        userLogin,
        userName
      );

      if (isModeratedChannelsError(result)) {
        setError(result.message);
        // Still set own channel as fallback
        const ownChannel: ChannelContext = {
          channelId: userId,
          channelLogin: userLogin,
          channelName: userName,
          isOwnChannel: true,
          isModerator: true,
          isBroadcaster: true,
        };
        setChannels([ownChannel]);
        setSelectedChannel(ownChannel);
        return;
      }

      setChannels(result);

      // Priority for initial selection:
      // 1. If connected to a specific channel, select that one
      // 2. Otherwise, restore saved selection
      // 3. Default to own channel
      
      let channelToSelect: ChannelContext | null = null;
      
      // Check if we're connected to a specific channel (not own)
      if (connectedChannelName && connectedChannelName.toLowerCase() !== userLogin.toLowerCase()) {
        channelToSelect = result.find(
          ch => ch.channelLogin.toLowerCase() === connectedChannelName.toLowerCase()
        ) || null;
      }
      
      // If no connected channel match, try saved selection
      if (!channelToSelect && persistSelection) {
        const savedChannelId = loadSavedSelection();
        if (savedChannelId) {
          channelToSelect = result.find(ch => ch.channelId === savedChannelId) || null;
        }
      }
      
      // Default to own channel
      if (!channelToSelect) {
        channelToSelect = result.find(ch => ch.isOwnChannel) || result[0] || null;
      }
      
      setSelectedChannel(channelToSelect);
      
      // Save the selection
      if (channelToSelect && persistSelection) {
        saveSelection(channelToSelect.channelId);
      }
    } catch (err) {
      console.error('Error fetching moderated channels:', err);
      setError('Error al cargar canales');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userLogin, userName, persistSelection, connectedChannelName]);

  /**
   * Select a channel by ID
   */
  const selectChannel = useCallback((channelId: string) => {
    const channel = channels.find(ch => ch.channelId === channelId);
    if (channel) {
      setSelectedChannel(channel);
      if (persistSelection) {
        saveSelection(channelId);
      }
    }
  }, [channels, persistSelection]);

  /**
   * Refresh channels list
   */
  const refresh = useCallback(async () => {
    await fetchChannels();
  }, [fetchChannels]);

  // Auto-fetch on mount when credentials are available
  useEffect(() => {
    if (autoFetch && userId && userLogin && userName && authToken) {
      fetchChannels();
    }
  }, [autoFetch, userId, userLogin, userName, authToken, fetchChannels]);

  // Clear selection when user changes
  useEffect(() => {
    if (!userId) {
      setChannels([]);
      setSelectedChannel(null);
      clearSelection();
    }
  }, [userId]);

  // Computed values
  const hasModeratedChannels = channels.filter(ch => !ch.isOwnChannel).length > 0;
  const isViewingModeratedChannel = selectedChannel ? !selectedChannel.isOwnChannel : false;

  return {
    channels,
    selectedChannel,
    isLoading,
    error,
    selectChannel,
    refresh,
    hasModeratedChannels,
    isViewingModeratedChannel,
  };
}

export default useModeratedChannels;
