/**
 * usePlatformAdapter - Unified multi-platform adapter hook
 * 
 * Manages multiple platform connections simultaneously, aggregates messages
 * from all platforms, and maintains independent state per platform.
 * 
 * @requirements 6.1 - Allow connecting to multiple platforms simultaneously
 * @requirements 6.4 - Show connection status for each platform independently
 * @requirements 6.5 - Continue operating with remaining platforms when one disconnects
 * @requirements 6.6 - Allow enabling/disabling platforms without disconnecting
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Platform,
  PlatformConnection,
  PlatformConnectionStatus,
  PlatformConnectionConfig,
  ChatMessage,
  PlatformVote,
  AggregatedVotes,
  MultiPlatformState,
  MultiPlatformOptions,
  IPlatformAdapter,
} from '../types/platform';
import { parseVoteFromMessage } from '../types/platform';
import { TwitchAdapter } from '../src/infrastructure/adapters/TwitchAdapter';
import { YouTubeAdapter } from '../src/infrastructure/adapters/YouTubeAdapter';
import { KickAdapter } from '../src/infrastructure/adapters/KickAdapter';

// Default options
const DEFAULT_OPTIONS: Required<MultiPlatformOptions> = {
  maxMessages: 500,
  maxVotes: 1000,
  enableVoteAggregation: true,
};

// Storage key for platform preferences
const PLATFORM_STORAGE_KEY = 'twitchvote_platform_preferences';

/**
 * Create adapter instance for a platform
 */
function createAdapter(platform: Platform): IPlatformAdapter {
  switch (platform) {
    case 'twitch':
      return new TwitchAdapter() as unknown as IPlatformAdapter;
    case 'youtube':
      return new YouTubeAdapter();
    case 'kick':
      return new KickAdapter();
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export interface UsePlatformAdapterReturn {
  // State
  connections: Record<Platform, PlatformConnection | null>;
  messages: ChatMessage[];
  votes: PlatformVote[];
  aggregatedVotes: AggregatedVotes[];
  
  // Connection methods
  connect: (platform: Platform, config: PlatformConnectionConfig) => Promise<void>;
  disconnect: (platform: Platform) => Promise<void>;
  disconnectAll: () => Promise<void>;

  // Platform control
  enablePlatform: (platform: Platform) => void;
  disablePlatform: (platform: Platform) => void;
  
  // Messaging
  sendMessage: (platform: Platform, message: string) => Promise<boolean>;
  sendMessageToAll: (message: string) => Promise<Record<Platform, boolean>>;
  
  // Utilities
  clearMessages: () => void;
  clearVotes: () => void;
  getEnabledPlatforms: () => Platform[];
  getConnectedPlatforms: () => Platform[];
}

export function usePlatformAdapter(
  options: MultiPlatformOptions = {}
): UsePlatformAdapterReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Adapters ref to persist across renders
  const adaptersRef = useRef<Map<Platform, IPlatformAdapter>>(new Map());
  
  // State
  const [connections, setConnections] = useState<Record<Platform, PlatformConnection | null>>({
    twitch: null,
    youtube: null,
    kick: null,
  });
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [votes, setVotes] = useState<PlatformVote[]>([]);
  const [aggregatedVotes, setAggregatedVotes] = useState<AggregatedVotes[]>([]);
  
  /**
   * Update connection state for a platform
   */
  const updateConnection = useCallback((
    platform: Platform,
    update: Partial<PlatformConnection> | null
  ) => {
    setConnections(prev => {
      if (update === null) {
        return { ...prev, [platform]: null };
      }
      const current = prev[platform];
      if (!current) {
        return {
          ...prev,
          [platform]: {
            platform,
            status: 'disconnected',
            channel: '',
            enabled: true,
            ...update,
          } as PlatformConnection,
        };
      }
      return {
        ...prev,
        [platform]: { ...current, ...update },
      };
    });
  }, []);
  
  /**
   * Handle incoming message from any platform
   */
  const handleMessage = useCallback((message: ChatMessage) => {
    // Add message to list
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Trim to max messages
      if (newMessages.length > opts.maxMessages) {
        return newMessages.slice(-opts.maxMessages);
      }
      return newMessages;
    });
    
    // Check if message is a vote
    if (opts.enableVoteAggregation) {
      const voteValue = parseVoteFromMessage(message.message);
      if (voteValue) {
        const vote: PlatformVote = {
          id: `vote_${message.id}`,
          platform: message.platform,
          username: message.username,
          displayName: message.displayName,
          voteValue,
          timestamp: message.timestamp,
          messageId: message.id,
        };
        
        setVotes(prev => {
          const newVotes = [...prev, vote];
          if (newVotes.length > opts.maxVotes) {
            return newVotes.slice(-opts.maxVotes);
          }
          return newVotes;
        });
        
        // Update aggregated votes
        setAggregatedVotes(prev => {
          const existing = prev.find(v => v.option === voteValue);
          if (existing) {
            return prev.map(v => {
              if (v.option === voteValue) {
                return {
                  ...v,
                  total: v.total + 1,
                  byPlatform: {
                    ...v.byPlatform,
                    [message.platform]: (v.byPlatform[message.platform] || 0) + 1,
                  },
                };
              }
              return v;
            });
          }
          return [
            ...prev,
            {
              option: voteValue,
              total: 1,
              byPlatform: {
                twitch: message.platform === 'twitch' ? 1 : 0,
                youtube: message.platform === 'youtube' ? 1 : 0,
                kick: message.platform === 'kick' ? 1 : 0,
              },
            },
          ];
        });
      }
    }
  }, [opts.maxMessages, opts.maxVotes, opts.enableVoteAggregation]);
  
  /**
   * Handle status change from any platform
   */
  const handleStatusChange = useCallback((
    platform: Platform,
    status: PlatformConnectionStatus,
    error?: string
  ) => {
    updateConnection(platform, {
      status,
      lastError: error,
      ...(status === 'connected' ? { lastConnectedAt: Date.now() } : {}),
    });
  }, [updateConnection]);
  
  /**
   * Connect to a platform
   * @requirements 6.1 - Allow connecting to multiple platforms simultaneously
   */
  const connect = useCallback(async (
    platform: Platform,
    config: PlatformConnectionConfig
  ): Promise<void> => {
    // Get or create adapter
    let adapter = adaptersRef.current.get(platform);
    if (!adapter) {
      adapter = createAdapter(platform);
      adaptersRef.current.set(platform, adapter);
      
      // Set up callbacks
      adapter.onMessage(handleMessage);
      adapter.onStatusChange(handleStatusChange);
    }
    
    // Update connection state
    updateConnection(platform, {
      channel: config.channel,
      status: 'connecting',
    });
    
    // Connect
    await adapter.connect(config);
  }, [handleMessage, handleStatusChange, updateConnection]);
  
  /**
   * Disconnect from a platform
   * @requirements 6.5 - Continue operating with remaining platforms
   */
  const disconnect = useCallback(async (platform: Platform): Promise<void> => {
    const adapter = adaptersRef.current.get(platform);
    if (adapter) {
      await adapter.disconnect();
    }
    updateConnection(platform, null);
  }, [updateConnection]);
  
  /**
   * Disconnect from all platforms
   */
  const disconnectAll = useCallback(async (): Promise<void> => {
    const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
    await Promise.all(platforms.map(p => disconnect(p)));
  }, [disconnect]);
  
  /**
   * Enable a platform (allows vote processing)
   * @requirements 6.6 - Allow enabling/disabling platforms without disconnecting
   */
  const enablePlatform = useCallback((platform: Platform): void => {
    const adapter = adaptersRef.current.get(platform);
    if (adapter) {
      adapter.setEnabled(true);
    }
    updateConnection(platform, { enabled: true });
  }, [updateConnection]);
  
  /**
   * Disable a platform (stops vote processing but stays connected)
   * @requirements 6.6 - Allow enabling/disabling platforms without disconnecting
   */
  const disablePlatform = useCallback((platform: Platform): void => {
    const adapter = adaptersRef.current.get(platform);
    if (adapter) {
      adapter.setEnabled(false);
    }
    updateConnection(platform, { enabled: false });
  }, [updateConnection]);
  
  /**
   * Send message to a specific platform
   */
  const sendMessage = useCallback(async (
    platform: Platform,
    message: string
  ): Promise<boolean> => {
    const adapter = adaptersRef.current.get(platform);
    if (!adapter) {
      return false;
    }
    return adapter.sendMessage(message);
  }, []);
  
  /**
   * Send message to all connected platforms
   */
  const sendMessageToAll = useCallback(async (
    message: string
  ): Promise<Record<Platform, boolean>> => {
    const results: Record<Platform, boolean> = {
      twitch: false,
      youtube: false,
      kick: false,
    };
    
    const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
    await Promise.all(
      platforms.map(async (platform) => {
        const adapter = adaptersRef.current.get(platform);
        if (adapter && adapter.getStatus() === 'connected') {
          results[platform] = await adapter.sendMessage(message);
        }
      })
    );
    
    return results;
  }, []);
  
  /**
   * Clear all messages
   */
  const clearMessages = useCallback((): void => {
    setMessages([]);
  }, []);
  
  /**
   * Clear all votes and aggregated votes
   */
  const clearVotes = useCallback((): void => {
    setVotes([]);
    setAggregatedVotes([]);
  }, []);
  
  /**
   * Get list of enabled platforms
   */
  const getEnabledPlatforms = useCallback((): Platform[] => {
    return (Object.entries(connections) as [Platform, PlatformConnection | null][])
      .filter(([_, conn]) => conn?.enabled)
      .map(([platform]) => platform);
  }, [connections]);
  
  /**
   * Get list of connected platforms
   * @requirements 6.4 - Show connection status for each platform independently
   */
  const getConnectedPlatforms = useCallback((): Platform[] => {
    return (Object.entries(connections) as [Platform, PlatformConnection | null][])
      .filter(([_, conn]) => conn?.status === 'connected')
      .map(([platform]) => platform);
  }, [connections]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      adaptersRef.current.forEach(adapter => {
        adapter.dispose();
      });
      adaptersRef.current.clear();
    };
  }, []);
  
  return {
    connections,
    messages,
    votes,
    aggregatedVotes,
    connect,
    disconnect,
    disconnectAll,
    enablePlatform,
    disablePlatform,
    sendMessage,
    sendMessageToAll,
    clearMessages,
    clearVotes,
    getEnabledPlatforms,
    getConnectedPlatforms,
  };
}

export default usePlatformAdapter;
