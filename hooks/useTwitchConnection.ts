/**
 * useTwitchConnection Hook
 * 
 * Encapsulates Twitch connection state and actions.
 * Handles connection lifecycle, avatar fetching, and status management.
 * Supports multi-channel collaboration for streamer collabs.
 * 
 * @module hooks/useTwitchConnection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ConnectionStatus, CollaborationChannel } from '../types';
import { twitchService } from '../services/twitchService';

// LocalStorage keys
const STORAGE_KEY_CHANNEL = 'twitch_channel';
const STORAGE_KEY_TOKEN = 'twitch_token';
const STORAGE_KEY_TOKEN_EXPIRES = 'twitch_token_expires';
const STORAGE_KEY_USER_ID = 'twitch_user_id';

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
  /** User ID (broadcaster ID) for API calls */
  userId: string;
  /** Connect to a Twitch channel */
  connect: (channel: string, token?: string, userId?: string) => void;
  /** Disconnect from current channel */
  disconnect: () => void;
  /** Collaboration channels */
  collaborationChannels: CollaborationChannel[];
  /** Add a collaboration channel */
  addCollaborator: (channel: string) => Promise<CollaborationChannel | null>;
  /** Remove a collaboration channel */
  removeCollaborator: (channel: string) => void;
  /** Check if collaboration mode is active */
  isCollaborationActive: boolean;
  /** Token expiration time in seconds (null if no token or unknown) */
  tokenExpiresIn: number | null;
  /** Whether token is expiring soon (< 10 minutes) */
  tokenExpiringSoon: boolean;
  /** Saved credentials from localStorage */
  savedCredentials: { channel: string; token: string; userId?: string } | null;
  /** Clear saved credentials */
  clearSavedCredentials: () => void;
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
  const [userId, setUserId] = useState<string>('');
  
  // Token expiration state
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const [tokenExpiringSoon, setTokenExpiringSoon] = useState(false);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Collaboration state
  const [collaborationChannels, setCollaborationChannels] = useState<CollaborationChannel[]>([]);

  // Store callback ref to avoid stale closures
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Store setters in refs so the callback always has fresh references
  const setStatusRef = useRef(setStatus);
  const setErrorRef = useRef(setError);
  setStatusRef.current = setStatus;
  setErrorRef.current = setError;

  // Load saved credentials on mount
  const [savedCredentials, setSavedCredentials] = useState<{ channel: string; token: string; userId?: string } | null>(() => {
    try {
      const channel = localStorage.getItem(STORAGE_KEY_CHANNEL);
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      const expires = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRES);
      const savedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
      
      if (channel && token) {
        // Check if token might still be valid (stored expiration time)
        if (expires) {
          const expiresAt = parseInt(expires, 10);
          if (Date.now() > expiresAt) {
            // Token expired, clear storage
            localStorage.removeItem(STORAGE_KEY_CHANNEL);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
            localStorage.removeItem(STORAGE_KEY_USER_ID);
            return null;
          }
        }
        return { channel, token, userId: savedUserId || undefined };
      }
      return null;
    } catch {
      return null;
    }
  });

  // Clear saved credentials
  const clearSavedCredentials = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_CHANNEL);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
    localStorage.removeItem(STORAGE_KEY_USER_ID);
    setSavedCredentials(null);
  }, []);

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

  // Token expiration countdown
  useEffect(() => {
    if (tokenExpiresIn === null || tokenExpiresIn <= 0) {
      setTokenExpiringSoon(false);
      return;
    }

    // Check if expiring soon (< 10 minutes = 600 seconds)
    setTokenExpiringSoon(tokenExpiresIn < 600);

    // Set up countdown timer
    expirationTimerRef.current = setInterval(() => {
      setTokenExpiresIn(prev => {
        if (prev === null || prev <= 0) {
          if (expirationTimerRef.current) {
            clearInterval(expirationTimerRef.current);
          }
          return 0;
        }
        const newValue = prev - 1;
        setTokenExpiringSoon(newValue < 600);
        return newValue;
      });
    }, 1000);

    return () => {
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current);
      }
    };
  }, [tokenExpiresIn !== null && tokenExpiresIn > 0]);

  /**
   * Connect to a Twitch channel
   */
  const connect = useCallback(async (channel: string, token?: string, passedUserId?: string) => {
    if (!channel.trim()) return;

    setChannelName(channel);
    setStatus(ConnectionStatus.CONNECTING);
    setError(null);
    
    if (passedUserId) {
      setUserId(passedUserId);
    }
    
    if (token) {
      setAuthToken(token);
      
      // Validate token and get expiration (non-blocking)
      twitchService.validateToken(token).then(validation => {
        if (validation && validation.valid) {
          // If we got userId from validation and don't have one yet, use it
          if (validation.userId && !passedUserId) {
            setUserId(validation.userId);
          }
          
          const finalUserId = passedUserId || validation.userId || '';
          
          if (validation.expiresIn > 0) {
            // Token has expiration info - track it
            setTokenExpiresIn(validation.expiresIn);
          } else {
            // Token valid but no expiration (Implicit Grant tokens)
            // These tokens don't expire based on time, only when revoked
            console.log('Token valid (Implicit Grant - no expiration tracking)');
            setTokenExpiresIn(null); // No expiration to track
          }
          
          // Save to localStorage
          try {
            localStorage.setItem(STORAGE_KEY_CHANNEL, channel);
            localStorage.setItem(STORAGE_KEY_TOKEN, token);
            if (finalUserId) {
              localStorage.setItem(STORAGE_KEY_USER_ID, finalUserId);
            }
            if (validation.expiresIn > 0) {
              const expiresAt = Date.now() + (validation.expiresIn * 1000);
              localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRES, expiresAt.toString());
            } else {
              // No expiration - remove any old expiration data
              localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
            }
            setSavedCredentials({ channel, token, userId: finalUserId || undefined });
          } catch (e) {
            console.error('Error saving credentials to localStorage:', e);
          }
        } else {
          // Token validation failed
          console.warn('Token validation failed, continuing without expiration tracking');
        }
      }).catch(err => {
        console.warn('Token validation error:', err);
      });
    }
    
    // Clear collaboration channels on new connection
    setCollaborationChannels([]);

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
  }, [skipConnection, skipAvatarFetch]);

  /**
   * Disconnect from current channel
   * Cleans up all connection state including collaborations
   */
  const disconnect = useCallback(() => {
    twitchService.disconnect();
    setStatus(ConnectionStatus.DISCONNECTED);
    setChannelName('');
    setChannelAvatar(null);
    setAuthToken('');
    setUserId('');
    setError(null);
    setCollaborationChannels([]);
    setTokenExpiresIn(null);
    setTokenExpiringSoon(false);
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current);
    }
  }, []);

  /**
   * Add a collaboration channel
   */
  const addCollaborator = useCallback(async (channel: string): Promise<CollaborationChannel | null> => {
    if (!channel.trim() || status !== ConnectionStatus.CONNECTED) return null;
    
    const result = await twitchService.addCollaborationChannel(channel, (ch, connStatus, err) => {
      if (connStatus === 'error') {
        console.error(`Collaboration channel ${ch} error:`, err);
      }
      // Update state when collaboration channel status changes
      setCollaborationChannels(twitchService.getCollaborationChannels());
    });
    
    if (result) {
      setCollaborationChannels(prev => [...prev, result]);
    }
    
    return result;
  }, [status]);

  /**
   * Remove a collaboration channel
   */
  const removeCollaborator = useCallback((channel: string) => {
    twitchService.removeCollaborationChannel(channel);
    setCollaborationChannels(prev => prev.filter(c => c.name.toLowerCase() !== channel.toLowerCase()));
  }, []);

  const isCollaborationActive = collaborationChannels.length > 0;

  return {
    status,
    error,
    channelName,
    channelAvatar,
    authToken,
    userId,
    connect,
    disconnect,
    collaborationChannels,
    addCollaborator,
    removeCollaborator,
    isCollaborationActive,
    tokenExpiresIn,
    tokenExpiringSoon,
    savedCredentials,
    clearSavedCredentials,
  };
}
