/**
 * useTwitchAPI Hook
 * 
 * React hook wrapper for TwitchAPIService with loading/error state management.
 * Provides reactive API calls with automatic state handling.
 * 
 * @module src/application/hooks/useTwitchAPI
 * @requirements 1.1-1.9 - Twitch API data fetching with error handling
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  TwitchAPIService,
  TwitchAPIError,
  Follower,
  Subscriber,
  BitsLeader,
  Clip,
  Video,
  Moderator,
  VIP,
  Chatter,
  BitsPeriod,
  VideoType,
  isTwitchAPIError,
  createTwitchAPIService,
} from '../services/TwitchAPIService';

// Re-export types for convenience
export type {
  TwitchAPIError,
  Follower,
  Subscriber,
  BitsLeader,
  Clip,
  Video,
  Moderator,
  VIP,
  Chatter,
  BitsPeriod,
  VideoType,
};
export { isTwitchAPIError };

/**
 * State for an API request
 */
export interface APIRequestState<T> {
  data: T | null;
  loading: boolean;
  error: TwitchAPIError | null;
}

/**
 * Return type for the useTwitchAPI hook
 */
export interface UseTwitchAPIReturn {
  // Followers
  followers: APIRequestState<Follower[]>;
  fetchFollowers: (broadcasterId: string, limit?: number) => Promise<Follower[] | null>;
  
  // Subscribers
  subscribers: APIRequestState<Subscriber[]>;
  fetchSubscribers: (broadcasterId: string, limit?: number) => Promise<Subscriber[] | null>;
  
  // Bits Leaderboard
  bitsLeaderboard: APIRequestState<BitsLeader[]>;
  fetchBitsLeaderboard: (broadcasterId: string, period?: BitsPeriod) => Promise<BitsLeader[] | null>;
  
  // Clips
  clips: APIRequestState<Clip[]>;
  fetchClips: (broadcasterId: string, startDate?: string, endDate?: string) => Promise<Clip[] | null>;
  
  // Videos
  videos: APIRequestState<Video[]>;
  fetchVideos: (broadcasterId: string, type?: VideoType) => Promise<Video[] | null>;
  
  // Moderators
  moderators: APIRequestState<Moderator[]>;
  fetchModerators: (broadcasterId: string) => Promise<Moderator[] | null>;
  
  // VIPs
  vips: APIRequestState<VIP[]>;
  fetchVIPs: (broadcasterId: string) => Promise<VIP[] | null>;
  
  // Chatters
  chatters: APIRequestState<Chatter[]>;
  fetchChatters: (broadcasterId: string, moderatorId?: string) => Promise<Chatter[] | null>;
  
  // Utility
  clearAll: () => void;
  updateToken: (token: string) => void;
  service: TwitchAPIService;
}

/**
 * Create initial request state
 */
function createInitialState<T>(): APIRequestState<T> {
  return {
    data: null,
    loading: false,
    error: null,
  };
}

/**
 * Hook for accessing Twitch API data with loading/error state management
 * 
 * @param token - OAuth token for API authentication
 * @param clientId - Optional Twitch client ID
 * 
 * @example
 * ```tsx
 * const { followers, fetchFollowers, bitsLeaderboard, fetchBitsLeaderboard } = useTwitchAPI(token);
 * 
 * useEffect(() => {
 *   if (broadcasterId) {
 *     fetchFollowers(broadcasterId, 100);
 *     fetchBitsLeaderboard(broadcasterId, 'week');
 *   }
 * }, [broadcasterId]);
 * 
 * if (followers.loading) return <Spinner />;
 * if (followers.error) return <Error message={followers.error.message} />;
 * return <FollowerList data={followers.data} />;
 * ```
 */
export function useTwitchAPI(token: string, clientId?: string): UseTwitchAPIReturn {
  // Service instance
  const serviceRef = useRef<TwitchAPIService | null>(null);
  
  // Initialize service lazily
  const service = useMemo(() => {
    if (!serviceRef.current) {
      serviceRef.current = createTwitchAPIService(token, clientId);
    }
    return serviceRef.current;
  }, []);

  // Update token when it changes
  const updateToken = useCallback((newToken: string) => {
    service.setToken(newToken);
  }, [service]);

  // State for each API endpoint
  const [followers, setFollowers] = useState<APIRequestState<Follower[]>>(createInitialState);
  const [subscribers, setSubscribers] = useState<APIRequestState<Subscriber[]>>(createInitialState);
  const [bitsLeaderboard, setBitsLeaderboard] = useState<APIRequestState<BitsLeader[]>>(createInitialState);
  const [clips, setClips] = useState<APIRequestState<Clip[]>>(createInitialState);
  const [videos, setVideos] = useState<APIRequestState<Video[]>>(createInitialState);
  const [moderators, setModerators] = useState<APIRequestState<Moderator[]>>(createInitialState);
  const [vips, setVIPs] = useState<APIRequestState<VIP[]>>(createInitialState);
  const [chatters, setChatters] = useState<APIRequestState<Chatter[]>>(createInitialState);

  // Fetch functions with state management
  const fetchFollowers = useCallback(async (broadcasterId: string, limit?: number): Promise<Follower[] | null> => {
    setFollowers(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getFollowers(broadcasterId, limit);
    
    if (isTwitchAPIError(result)) {
      setFollowers({ data: null, loading: false, error: result });
      return null;
    }
    
    setFollowers({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchSubscribers = useCallback(async (broadcasterId: string, limit?: number): Promise<Subscriber[] | null> => {
    setSubscribers(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getSubscribers(broadcasterId, limit);
    
    if (isTwitchAPIError(result)) {
      setSubscribers({ data: null, loading: false, error: result });
      return null;
    }
    
    setSubscribers({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchBitsLeaderboard = useCallback(async (broadcasterId: string, period?: BitsPeriod): Promise<BitsLeader[] | null> => {
    setBitsLeaderboard(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getBitsLeaderboard(broadcasterId, period);
    
    if (isTwitchAPIError(result)) {
      setBitsLeaderboard({ data: null, loading: false, error: result });
      return null;
    }
    
    setBitsLeaderboard({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchClips = useCallback(async (broadcasterId: string, startDate?: string, endDate?: string): Promise<Clip[] | null> => {
    setClips(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getClips(broadcasterId, startDate, endDate);
    
    if (isTwitchAPIError(result)) {
      setClips({ data: null, loading: false, error: result });
      return null;
    }
    
    setClips({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchVideos = useCallback(async (broadcasterId: string, type?: VideoType): Promise<Video[] | null> => {
    setVideos(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getVideos(broadcasterId, type);
    
    if (isTwitchAPIError(result)) {
      setVideos({ data: null, loading: false, error: result });
      return null;
    }
    
    setVideos({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchModerators = useCallback(async (broadcasterId: string): Promise<Moderator[] | null> => {
    setModerators(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getModerators(broadcasterId);
    
    if (isTwitchAPIError(result)) {
      setModerators({ data: null, loading: false, error: result });
      return null;
    }
    
    setModerators({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchVIPs = useCallback(async (broadcasterId: string): Promise<VIP[] | null> => {
    setVIPs(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getVIPs(broadcasterId);
    
    if (isTwitchAPIError(result)) {
      setVIPs({ data: null, loading: false, error: result });
      return null;
    }
    
    setVIPs({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  const fetchChatters = useCallback(async (broadcasterId: string, moderatorId?: string): Promise<Chatter[] | null> => {
    setChatters(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await service.getChatters(broadcasterId, moderatorId);
    
    if (isTwitchAPIError(result)) {
      setChatters({ data: null, loading: false, error: result });
      return null;
    }
    
    setChatters({ data: result, loading: false, error: null });
    return result;
  }, [service]);

  // Clear all state
  const clearAll = useCallback(() => {
    setFollowers(createInitialState());
    setSubscribers(createInitialState());
    setBitsLeaderboard(createInitialState());
    setClips(createInitialState());
    setVideos(createInitialState());
    setModerators(createInitialState());
    setVIPs(createInitialState());
    setChatters(createInitialState());
  }, []);

  return {
    followers,
    fetchFollowers,
    subscribers,
    fetchSubscribers,
    bitsLeaderboard,
    fetchBitsLeaderboard,
    clips,
    fetchClips,
    videos,
    fetchVideos,
    moderators,
    fetchModerators,
    vips,
    fetchVIPs,
    chatters,
    fetchChatters,
    clearAll,
    updateToken,
    service,
  };
}

export default useTwitchAPI;
