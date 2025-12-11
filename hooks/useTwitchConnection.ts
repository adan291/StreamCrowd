/**
 * useTwitchConnection Hook
 * 
 * Encapsulates Twitch connection state and actions.
 * Handles connection lifecycle, avatar fetching, and status management.
 * 
 * @module hooks/useTwitchConnection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ConnectionStatus } from '../types';
import { twitchService } from '../services/twitchService';

/**
 * Return type for the useTwitchConnection hook
 */
export interface UseTwitchConnectionReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Error message if connection failed */
  error: string | null;
  /** Connected channel name */
  channelName: string;
  /** Channel avatar URL */
  channelAvatar: string | null;
  /** OAuth token for authenticated connections */
  authToken: string;
  /** Connect to a Twitch channel */
  connect: (channel: string, token?: string) => void;
  /** Disconnect from current channel */
  disconnect: () => void;
}

/**
 * Options for the useTwitchConnection hook
 */
export interface UseTwitchConnectionOptions {
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
  /** Whether to skip actual connection (for overlay mode or testing) */
  skipConnection?: boolean;
  /** Whether to skip avatar fetching (for testing) */
  skipAvatarFetch?: boolean;
}

/**
 * Fetches the avatar URL for a Twitch channel
 * @param channel - The channel name
 * @returns Promise resolving to avatar URL or null
 */
async function fetchChannelAvatar(channel: string): Promise<string | null> {
  try {
    const response = await fetch(`https://decapi.me/twitch/avatar/${channel}`);
    const url = await response.text();
    if (url && !url.includes('not found')) {
      return url;
    }
    return null;
  } catch (err) {
    console.error('Error fetching avatar', err);
    return null;
  }
}

/**
 * Hook for managing Twitch connection state
 * 
 * Extracts connection-related state from App.tsx including:
 * - Connection status (disconnected, connecting, connected, error)
 * - Error messages
 * - Channel name and avatar
 * - Auth token
 * 
 * @param options - Configuration options
 * @returns Connection state and actions
 * 
 * @example
 * ```tsx
 * const { status, channelName, connect, disconnect } = useTwitchConnection();
 * 
 * // Connect to a channel
 * connect('streamer_name', 'oauth:token');
 * 
 * // Disconnect
 * disconnect();
 * ```
 */
export function useTwitchConnection(
  options: UseTwitchConnectionOptions = {}
): UseTwitchConnectionReturn {
  const { onStatusChange, skipConnection = false, skipAvatarFetch = false } = options;

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [channelAvatar, setChannelAvatar] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Store callback ref to avoid stale closures
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Store setters in refs so the callback always has fresh references
  const setStatusRef = useRef(setStatus);
  const setErrorRef = useRef(setError);
  setStatusRef.current = setStatus;
  setErrorRef.current = setError;

  // Set up status change listener - must be done synchronously before any connect call
  // Using a ref to track setup and useEffect for cleanup
  const listenerSetupRef = useRef(false);
  
  if (!listenerSetupRef.current) {
    listenerSetupRef.current = true;
    twitchService.onStatusChange((newStatus, errorMsg) => {
      setStatusRef.current(newStatus);
      if (errorMsg) {
        setErrorRef.current(errorMsg);
      } else if (newStatus === ConnectionStatus.CONNECTED) {
        setErrorRef.current(null);
      }
      onStatusChangeRef.current?.(newStatus, errorMsg);
    });
  }

  /**
   * Connect to a Twitch channel
   */
  const connect = useCallback(async (channel: string, token?: string) => {
    if (!channel.trim()) return;

    setChannelName(channel);
    if (token) {
      setAuthToken(token);
    }
    setStatus(ConnectionStatus.CONNECTING);
    setError(null);

    // Fetch avatar (unless skipped for testing)
    setChannelAvatar(null);
    if (!skipAvatarFetch) {
      fetchChannelAvatar(channel).then(avatar => {
        setChannelAvatar(avatar);
      });
    }

    // Connect to Twitch (unless skipped for overlay mode)
    if (!skipConnection) {
      twitchService.connect(channel, token);
    }
  }, [skipConnection]);

  /**
   * Disconnect from current channel
   * Cleans up all connection state
   */
  const disconnect = useCallback(() => {
    twitchService.disconnect();
    setStatus(ConnectionStatus.DISCONNECTED);
    setChannelName('');
    setChannelAvatar(null);
    setAuthToken('');
    setError(null);
  }, []);

  return {
    status,
    error,
    channelName,
    channelAvatar,
    authToken,
    connect,
    disconnect,
  };
}
