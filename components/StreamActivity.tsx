import React, { useEffect, useRef, useState, useMemo } from 'react';
import { VoteRecord } from '../types';
import { 
  Activity, 
  UserPlus, 
  Star, 
  Gift, 
  RefreshCw, 
  Vote, 
  Calendar,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  CloudDownload,
  Key,
  Info,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Coins,
  Zap,
  Video,
  Film,
  Shield,
  Crown
} from 'lucide-react';
import { useI18n } from '../i18n';
import { twitchService } from '../services/twitchService';

// Tipos de eventos del stream
export type StreamEventType = 'vote' | 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'bits';

export type SubTier = '1000' | '2000' | '3000'; // Tier 1, 2, 3

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  username: string;
  timestamp: number;
  data?: {
    optionId?: number;
    tier?: SubTier;
    months?: number;
    message?: string;
    giftCount?: number;
    recipientUsername?: string;
    viewerCount?: number;
    amount?: number; // For bits
  };
}

// Storage keys
const EVENTS_BY_DATE_KEY = 'stream_activity_by_date';

// Scopes necesarios para cada funcionalidad
const REQUIRED_SCOPES = {
  followers: 'moderator:read:followers',
  subscribers: 'channel:read:subscriptions',
  bits: 'bits:read',
  moderation: 'moderation:read',
  vips: 'channel:read:vips',
  clips: '', // Public - no scope needed
  videos: '', // Public - no scope needed
};

// Funciones de persistencia
export const saveEvents = (events: StreamEvent[], channelName: string): void => {
  const today = new Date().toISOString().split('T')[0];
  const key = `${EVENTS_BY_DATE_KEY}_${channelName}_${today}`;
  
  const existing = loadEventsByDate(channelName, today);
  const merged = [...existing];
  
  events.forEach(event => {
    if (!merged.find(e => e.id === event.id)) {
      merged.push(event);
    }
  });
  
  const trimmed = merged.slice(-1000);
  localStorage.setItem(key, JSON.stringify(trimmed));
  
  const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName}_dates`;
  const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]');
  if (!dates.includes(today)) {
    dates.push(today);
    const trimmedDates = dates.slice(-30);
    localStorage.setItem(datesKey, JSON.stringify(trimmedDates));
  }
};

export const loadEventsByDate = (channelName: string, date: string): StreamEvent[] => {
  const key = `${EVENTS_BY_DATE_KEY}_${channelName}_${date}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const getAvailableDates = (channelName: string): string[] => {
  const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName}_dates`;
  const stored = localStorage.getItem(datesKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const clearEventsByDate = (channelName: string, date: string): void => {
  const key = `${EVENTS_BY_DATE_KEY}_${channelName}_${date}`;
  localStorage.removeItem(key);
  
  const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName}_dates`;
  const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]');
  const filtered = dates.filter(d => d !== date);
  localStorage.setItem(datesKey, JSON.stringify(filtered));
};

// Helper para convertir votos a eventos
export const voteToEvent = (vote: VoteRecord): StreamEvent => ({
  id: `vote_${vote.optionId}_${vote.timestamp}`,
  type: 'vote',
  username: vote.username,
  timestamp: vote.timestamp,
  data: { optionId: vote.optionId }
});

const getTierName = (tier: SubTier): string => {
  switch (tier) {
    case '1000': return 'Tier 1';
    case '2000': return 'Tier 2';
    case '3000': return 'Tier 3';
    default: return 'Tier 1';
  }
};

const getTierColor = (tier: SubTier): string => {
  switch (tier) {
    case '1000': return '#a970ff';
    case '2000': return '#00f0f0';
    case '3000': return '#ffd700';
    default: return '#a970ff';
  }
};

interface StreamActivityProps {
  events: StreamEvent[];
  votes?: VoteRecord[];
  pollOptions?: { [key: number]: { color: string; label: string; icon?: string; image?: string } };
  channelName?: string;
  authToken?: string;
  onEventAdded?: (event: StreamEvent) => void;
}

export const StreamActivity: React.FC<StreamActivityProps> = ({ 
  events, 
  votes = [], 
  pollOptions = {},
  channelName = 'unknown',
  authToken,
  onEventAdded
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevEventsLength = useRef(events.length + votes.length);
  
  // Estados
  const [activeFilters, setActiveFilters] = useState<Set<StreamEventType>>(new Set(['vote', 'follow', 'sub', 'resub', 'gift', 'raid', 'bits']));
  const [viewMode, setViewMode] = useState<'live' | 'history' | 'fetch'>('live');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historyEvents, setHistoryEvents] = useState<StreamEvent[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Estados para rango de fechas
  const [useRangeMode, setUseRangeMode] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Estados para fetch de API
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [showScopesInfo, setShowScopesInfo] = useState(false);
  const [fetchedData, setFetchedData] = useState<{
    followers?: { username: string; followedAt?: string }[];
    subscribers?: { username: string; tier: string; isGift: boolean }[];
    bitsLeaderboard?: { rank: number; username: string; bits: number }[];
    clips?: { id: string; title: string; url: string; viewCount: number; creatorName: string }[];
    videos?: { id: string; title: string; url: string; viewCount: number; type: string }[];
    moderators?: { username: string; displayName: string }[];
    vips?: { username: string; displayName: string }[];
  }>({});

  // Verificar scopes del token
  useEffect(() => {
    if (authToken) {
      twitchService.validateToken(authToken).then(result => {
        if (result?.scopes) {
          setAvailableScopes(result.scopes);
        }
      });
    }
  }, [authToken]);

  const hasScope = (scope: string) => availableScopes.includes(scope);

  // Combinar eventos
  const allEvents = useMemo(() => {
    const voteEvents = votes.map(voteToEvent);
    const combined = [...events, ...voteEvents];
    combined.sort((a, b) => a.timestamp - b.timestamp);
    return combined;
  }, [events, votes]);

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    const eventsToFilter = viewMode === 'live' ? allEvents : historyEvents;
    return eventsToFilter.filter(e => activeFilters.has(e.type));
  }, [allEvents, historyEvents, activeFilters, viewMode]);

  // Estadísticas
  const stats = useMemo(() => {
    const eventsToCount = viewMode === 'live' ? allEvents : historyEvents;
    return {
      follows: eventsToCount.filter(e => e.type === 'follow').length,
      subs: eventsToCount.filter(e => e.type === 'sub').length,
      resubs: eventsToCount.filter(e => e.type === 'resub').length,
      gifts: eventsToCount.filter(e => e.type === 'gift').reduce((acc, e) => acc + (e.data?.giftCount || 1), 0),
      raids: eventsToCount.filter(e => e.type === 'raid').length,
      bits: eventsToCount.filter(e => e.type === 'bits').reduce((acc, e) => acc + (e.data?.amount || 0), 0),
      votes: eventsToCount.filter(e => e.type === 'vote').length,
    };
  }, [allEvents, historyEvents, viewMode]);

  // Cargar fechas disponibles
  useEffect(() => {
    if (channelName) {
      setAvailableDates(getAvailableDates(channelName));
    }
  }, [channelName]);

  // Auto scroll
  useEffect(() => {
    if (containerRef.current && viewMode === 'live') {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevEventsLength.current = allEvents.length;
  }, [allEvents.length, viewMode]);

  // Guardar eventos
  useEffect(() => {
    if (channelName && allEvents.length > 0) {
      saveEvents(allEvents, channelName);
    }
  }, [allEvents, channelName]);

  // Cargar historial
  useEffect(() => {
    if (selectedDate && channelName && !useRangeMode) {
      const loaded = loadEventsByDate(channelName, selectedDate);
      setHistoryEvents(loaded);
    }
  }, [selectedDate, channelName, useRangeMode]);

  // Cargar eventos por rango de fechas
  const loadEventsByRange = () => {
    if (!channelName || !dateFrom || !dateTo) return;
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (fromDate > toDate) {
      return; // Fecha inicio mayor que fin
    }
    
    const allRangeEvents: StreamEvent[] = [];
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayEvents = loadEventsByDate(channelName, dateStr);
      allRangeEvents.push(...dayEvents);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Ordenar por timestamp
    allRangeEvents.sort((a, b) => a.timestamp - b.timestamp);
    setHistoryEvents(allRangeEvents);
  };

  // Fetch followers desde API
  const fetchFollowers = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('followers');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      // Usar la API de Helix para obtener followers
      const cleanToken = authToken.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': 'gp762nuuoqcoxypju8c569th9wz7q5',
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          setFetchError('Token sin permisos. Necesitas el scope: moderator:read:followers');
        } else {
          setFetchError(`Error ${response.status}: ${response.statusText}`);
        }
        return;
      }
      
      const data = await response.json();
      const followers = data.data?.map((f: any) => ({
        username: f.user_name || f.user_login,
        followedAt: f.followed_at,
      })) || [];
      
      setFetchedData(prev => ({ ...prev, followers }));
      
      // Convertir a eventos y añadir
      followers.forEach((f: { username: string; followedAt?: string }) => {
        const event: StreamEvent = {
          id: `follow_api_${f.username}_${Date.now()}`,
          type: 'follow',
          username: f.username,
          timestamp: f.followedAt ? new Date(f.followedAt).getTime() : Date.now(),
        };
        onEventAdded?.(event);
      });
      
    } catch (err) {
      setFetchError('Error al obtener followers');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch subscribers desde API
  const fetchSubscribers = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('subscribers');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const subs = await twitchService.getSubscribers(authToken, userId);
      if (!subs) {
        setFetchError('Token sin permisos. Necesitas el scope: channel:read:subscriptions');
        return;
      }
      
      // Obtener detalles de subs
      const cleanToken = authToken.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${userId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': 'gp762nuuoqcoxypju8c569th9wz7q5',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const subscribers = data.data?.map((s: any) => ({
          username: s.user_name || s.user_login,
          tier: s.tier,
          isGift: s.is_gift,
        })) || [];
        
        setFetchedData(prev => ({ ...prev, subscribers }));
        
        // Convertir a eventos
        subscribers.forEach((s: { username: string; tier: string; isGift: boolean }) => {
          const event: StreamEvent = {
            id: `sub_api_${s.username}_${Date.now()}`,
            type: s.isGift ? 'gift' : 'sub',
            username: s.username,
            timestamp: Date.now(),
            data: {
              tier: s.tier as SubTier,
            },
          };
          onEventAdded?.(event);
        });
      }
      
    } catch (err) {
      setFetchError('Error al obtener suscriptores');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch bits leaderboard desde API
  const fetchBitsLeaderboard = async (period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all') => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('bits');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const leaderboard = await twitchService.getBitsLeaderboard(authToken, userId, period);
      if (!leaderboard) {
        setFetchError('Token sin permisos. Necesitas el scope: bits:read');
        return;
      }
      
      setFetchedData(prev => ({ ...prev, bitsLeaderboard: leaderboard }));
      
      // Convertir a eventos de bits
      leaderboard.forEach((entry) => {
        const event: StreamEvent = {
          id: `bits_api_${entry.username}_${Date.now()}_${entry.rank}`,
          type: 'bits',
          username: entry.username,
          timestamp: Date.now(),
          data: {
            amount: entry.bits,
          },
        };
        onEventAdded?.(event);
      });
      
    } catch (err) {
      setFetchError('Error al obtener bits leaderboard');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch clips desde API
  const fetchClips = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('clips');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const clips = await twitchService.getClips(authToken, userId, 50);
      if (!clips) {
        setFetchError('Error al obtener clips');
        return;
      }
      
      setFetchedData(prev => ({ ...prev, clips }));
      
    } catch (err) {
      setFetchError('Error al obtener clips');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch VODs/videos desde API
  const fetchVideos = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('videos');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const videos = await twitchService.getVideos(authToken, userId, 'all', 50);
      if (!videos) {
        setFetchError('Error al obtener videos');
        return;
      }
      
      setFetchedData(prev => ({ ...prev, videos }));
      
    } catch (err) {
      setFetchError('Error al obtener videos');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch moderators desde API
  const fetchModerators = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('moderators');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const mods = await twitchService.getModerators(authToken, userId);
      if (!mods) {
        setFetchError('Token sin permisos. Necesitas el scope: moderation:read');
        return;
      }
      
      setFetchedData(prev => ({ ...prev, moderators: mods }));
      
    } catch (err) {
      setFetchError('Error al obtener moderadores');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch VIPs desde API
  const fetchVIPs = async () => {
    if (!authToken || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('vips');
    setFetchError(null);
    
    try {
      const userId = await twitchService.getUserId(authToken, channelName);
      if (!userId) {
        setFetchError('No se pudo obtener el ID del canal');
        return;
      }
      
      const vips = await twitchService.getVIPs(authToken, userId);
      if (!vips) {
        setFetchError('Token sin permisos. Necesitas el scope: channel:read:vips');
        return;
      }
      
      setFetchedData(prev => ({ ...prev, vips }));
      
    } catch (err) {
      setFetchError('Error al obtener VIPs');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  const toggleFilter = (type: StreamEventType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setActiveFilters(newFilters);
  };

  const exportEvents = () => {
    const eventsToExport = viewMode === 'live' ? allEvents : historyEvents;
    const csv = [
      ['Timestamp', 'Type', 'Username', 'Details'].join(','),
      ...eventsToExport.map(e => {
        let details = '';
        if (e.type === 'vote') details = `Option ${e.data?.optionId}`;
        if (e.type === 'sub') details = `${getTierName(e.data?.tier || '1000')}`;
        if (e.type === 'resub') details = `${e.data?.months} months - ${getTierName(e.data?.tier || '1000')}`;
        if (e.type === 'gift') details = `${e.data?.giftCount || 1} gifts`;
        return [
          new Date(e.timestamp).toISOString(),
          e.type,
          e.username,
          details
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream_activity_${channelName}_${viewMode === 'live' ? 'live' : selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderEventIcon = (type: StreamEventType) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-3.5 h-3.5 text-green-400" />;
      case 'sub': return <Star className="w-3.5 h-3.5 text-purple-400" />;
      case 'resub': return <RefreshCw className="w-3.5 h-3.5 text-blue-400" />;
      case 'gift': return <Gift className="w-3.5 h-3.5 text-pink-400" />;
      case 'raid': return <Users className="w-3.5 h-3.5 text-red-400" />;
      case 'bits': return <Coins className="w-3.5 h-3.5 text-amber-400" />;
      case 'vote': return <Vote className="w-3.5 h-3.5 text-orange-400" />;
      default: return <Activity className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const renderEvent = (event: StreamEvent, index: number) => {
    const isNew = index >= prevEventsLength.current && viewMode === 'live';
    
    return (
      <div 
        key={event.id} 
        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
          isNew 
            ? 'animate-slide-in-right bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm' 
            : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
        }`}
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {renderEventIcon(event.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">
              {event.username}
            </span>
            {renderEventBadge(event)}
          </div>
          <span className="text-[10px] text-zinc-500">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    );
  };

  const renderEventBadge = (event: StreamEvent) => {
    switch (event.type) {
      case 'follow':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400">
            FOLLOW
          </span>
        );
      case 'sub':
        return (
          <span 
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ 
              backgroundColor: `${getTierColor(event.data?.tier || '1000')}20`,
              color: getTierColor(event.data?.tier || '1000')
            }}
          >
            SUB {getTierName(event.data?.tier || '1000')}
          </span>
        );
      case 'resub':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
            RESUB x{event.data?.months || 1}
          </span>
        );
      case 'gift':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-500/20 text-pink-400">
            🎁 x{event.data?.giftCount || 1}
          </span>
        );
      case 'raid':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">
            RAID {event.data?.viewerCount ? `(${event.data.viewerCount})` : ''}
          </span>
        );
      case 'bits':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
            💎 {event.data?.amount || 0} bits
          </span>
        );
      case 'vote':
        const option = pollOptions[event.data?.optionId || 0];
        return (
          <span 
            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-900"
            style={{ backgroundColor: option?.color || '#eee' }}
          >
            {option?.icon} +{event.data?.optionId}
          </span>
        );
      default:
        return null;
    }
  };

  // Panel de recuperación de datos
  const renderFetchPanel = () => (
    <div className="p-3 space-y-3">
      {/* Aviso de OAuth */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-2">
          <Key className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-400">Permisos OAuth necesarios</p>
            <p className="text-[10px] text-amber-300/80 mt-1">
              Para recuperar datos de Twitch necesitas un token OAuth con los scopes correctos.
            </p>
            <button
              onClick={() => setShowScopesInfo(!showScopesInfo)}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 mt-1"
            >
              {showScopesInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showScopesInfo ? 'Ocultar detalles' : 'Ver scopes necesarios'}
            </button>
            
            {showScopesInfo && (
              <div className="mt-2 p-2 rounded bg-black/20 text-[10px] space-y-1">
                <div className="flex items-center gap-2">
                  <span className={hasScope(REQUIRED_SCOPES.followers) ? 'text-green-400' : 'text-red-400'}>
                    {hasScope(REQUIRED_SCOPES.followers) ? '✓' : '✗'}
                  </span>
                  <code className="text-amber-200">{REQUIRED_SCOPES.followers}</code>
                  <span className="text-zinc-400">- Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasScope(REQUIRED_SCOPES.subscribers) ? 'text-green-400' : 'text-red-400'}>
                    {hasScope(REQUIRED_SCOPES.subscribers) ? '✓' : '✗'}
                  </span>
                  <code className="text-amber-200">{REQUIRED_SCOPES.subscribers}</code>
                  <span className="text-zinc-400">- Suscriptores</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasScope(REQUIRED_SCOPES.bits) ? 'text-green-400' : 'text-red-400'}>
                    {hasScope(REQUIRED_SCOPES.bits) ? '✓' : '✗'}
                  </span>
                  <code className="text-amber-200">{REQUIRED_SCOPES.bits}</code>
                  <span className="text-zinc-400">- Bits Leaderboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasScope(REQUIRED_SCOPES.moderation) ? 'text-green-400' : 'text-red-400'}>
                    {hasScope(REQUIRED_SCOPES.moderation) ? '✓' : '✗'}
                  </span>
                  <code className="text-amber-200">{REQUIRED_SCOPES.moderation}</code>
                  <span className="text-zinc-400">- Moderadores</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasScope(REQUIRED_SCOPES.vips) ? 'text-green-400' : 'text-red-400'}>
                    {hasScope(REQUIRED_SCOPES.vips) ? '✓' : '✗'}
                  </span>
                  <code className="text-amber-200">{REQUIRED_SCOPES.vips}</code>
                  <span className="text-zinc-400">- VIPs</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-700">
                  <span className="text-green-400">✓</span>
                  <span className="text-zinc-400">Clips y VODs - Sin scope (público)</span>
                </div>
                <a 
                  href="https://twitchtokengenerator.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Generar token con scopes
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado del token */}
      {authToken ? (
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-green-400">Token OAuth conectado</span>
          </div>
          {availableScopes.length > 0 && (
            <p className="text-[10px] text-green-300/70 mt-1">
              {availableScopes.length} scopes disponibles
            </p>
          )}
        </div>
      ) : (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400">Sin token OAuth</span>
          </div>
          <p className="text-[10px] text-red-300/70 mt-1">
            Conecta con un token en el panel de conexión para recuperar datos.
          </p>
        </div>
      )}

      {/* Botones de recuperación */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-400">Recuperar datos de Twitch</p>
        
        {/* Followers */}
        <button
          onClick={fetchFollowers}
          disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.followers)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasScope(REQUIRED_SCOPES.followers)
              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
              : 'bg-zinc-800/50 border-zinc-700 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-green-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">Followers recientes</p>
              <p className="text-[10px] text-zinc-500">Últimos 100 seguidores</p>
            </div>
          </div>
          {isLoading && loadingType === 'followers' ? (
            <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-green-400" />
          )}
        </button>

        {/* Subscribers */}
        <button
          onClick={fetchSubscribers}
          disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.subscribers)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasScope(REQUIRED_SCOPES.subscribers)
              ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
              : 'bg-zinc-800/50 border-zinc-700 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">Suscriptores actuales</p>
              <p className="text-[10px] text-zinc-500">Lista de subs activos</p>
            </div>
          </div>
          {isLoading && loadingType === 'subscribers' ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-purple-400" />
          )}
        </button>

        {/* Bits Leaderboard */}
        <button
          onClick={() => fetchBitsLeaderboard('all')}
          disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.bits)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasScope(REQUIRED_SCOPES.bits)
              ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-zinc-800/50 border-zinc-700 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">Bits Leaderboard</p>
              <p className="text-[10px] text-zinc-500">Top 100 cheerers (histórico)</p>
            </div>
          </div>
          {isLoading && loadingType === 'bits' ? (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Clips */}
        <button
          onClick={fetchClips}
          disabled={isLoading || !authToken}
          className="w-full flex items-center justify-between p-3 rounded-lg border transition-all bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
        >
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">Clips del canal</p>
              <p className="text-[10px] text-zinc-500">Últimos 50 clips (público)</p>
            </div>
          </div>
          {isLoading && loadingType === 'clips' ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* VODs */}
        <button
          onClick={fetchVideos}
          disabled={isLoading || !authToken}
          className="w-full flex items-center justify-between p-3 rounded-lg border transition-all bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
        >
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">VODs y Videos</p>
              <p className="text-[10px] text-zinc-500">Últimos 50 videos (público)</p>
            </div>
          </div>
          {isLoading && loadingType === 'videos' ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Moderators */}
        <button
          onClick={fetchModerators}
          disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.moderation)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasScope(REQUIRED_SCOPES.moderation)
              ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
              : 'bg-zinc-800/50 border-zinc-700 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">Moderadores</p>
              <p className="text-[10px] text-zinc-500">Lista de mods del canal</p>
            </div>
          </div>
          {isLoading && loadingType === 'moderators' ? (
            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-red-400" />
          )}
        </button>

        {/* VIPs */}
        <button
          onClick={fetchVIPs}
          disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.vips)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasScope(REQUIRED_SCOPES.vips)
              ? 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20'
              : 'bg-zinc-800/50 border-zinc-700 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-pink-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-zinc-200">VIPs</p>
              <p className="text-[10px] text-zinc-500">Lista de VIPs del canal</p>
            </div>
          </div>
          {isLoading && loadingType === 'vips' ? (
            <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 text-pink-400" />
          )}
        </button>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400">{fetchError}</span>
          </div>
        </div>
      )}

      {/* Datos recuperados */}
      {(fetchedData.followers || fetchedData.subscribers || fetchedData.bitsLeaderboard || fetchedData.clips || fetchedData.videos || fetchedData.moderators || fetchedData.vips) && (
        <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs font-bold text-zinc-400 mb-2">Datos recuperados</p>
          {fetchedData.followers && (
            <p className="text-[10px] text-green-400">
              ✓ {fetchedData.followers.length} followers cargados
            </p>
          )}
          {fetchedData.subscribers && (
            <p className="text-[10px] text-purple-400">
              ✓ {fetchedData.subscribers.length} suscriptores cargados
            </p>
          )}
          {fetchedData.bitsLeaderboard && (
            <p className="text-[10px] text-amber-400">
              ✓ {fetchedData.bitsLeaderboard.length} cheerers en leaderboard ({fetchedData.bitsLeaderboard.reduce((acc, e) => acc + e.bits, 0).toLocaleString()} bits total)
            </p>
          )}
          {fetchedData.clips && (
            <p className="text-[10px] text-cyan-400">
              ✓ {fetchedData.clips.length} clips cargados
            </p>
          )}
          {fetchedData.videos && (
            <p className="text-[10px] text-indigo-400">
              ✓ {fetchedData.videos.length} videos/VODs cargados
            </p>
          )}
          {fetchedData.moderators && (
            <p className="text-[10px] text-red-400">
              ✓ {fetchedData.moderators.length} moderadores
            </p>
          )}
          {fetchedData.vips && (
            <p className="text-[10px] text-pink-400">
              ✓ {fetchedData.vips.length} VIPs
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Estado vacío
  if (filteredEvents.length === 0 && viewMode === 'live') {
    return (
      <div className="h-full flex flex-col">
        {/* Stats bar */}
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="grid grid-cols-7 gap-1 text-center">
            <div className="p-1.5 rounded bg-green-500/10">
              <div className="text-sm font-bold text-green-400">{stats.follows}</div>
              <div className="text-[8px] text-zinc-500">Follows</div>
            </div>
            <div className="p-1.5 rounded bg-purple-500/10">
              <div className="text-sm font-bold text-purple-400">{stats.subs}</div>
              <div className="text-[8px] text-zinc-500">Subs</div>
            </div>
            <div className="p-1.5 rounded bg-blue-500/10">
              <div className="text-sm font-bold text-blue-400">{stats.resubs}</div>
              <div className="text-[8px] text-zinc-500">ReSubs</div>
            </div>
            <div className="p-1.5 rounded bg-pink-500/10">
              <div className="text-sm font-bold text-pink-400">{stats.gifts}</div>
              <div className="text-[8px] text-zinc-500">Gifts</div>
            </div>
            <div className="p-1.5 rounded bg-red-500/10">
              <div className="text-sm font-bold text-red-400">{stats.raids}</div>
              <div className="text-[8px] text-zinc-500">Raids</div>
            </div>
            <div className="p-1.5 rounded bg-amber-500/10">
              <div className="text-sm font-bold text-amber-400">{stats.bits}</div>
              <div className="text-[8px] text-zinc-500">Bits</div>
            </div>
            <div className="p-1.5 rounded bg-orange-500/10">
              <div className="text-sm font-bold text-orange-400">{stats.votes}</div>
              <div className="text-[8px] text-zinc-500">Votos</div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('live')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'live' ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <span className="flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${viewMode === 'live' ? 'bg-white animate-pulse' : 'bg-zinc-400'}`} />
                EN VIVO
              </span>
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'history' ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              HISTORIAL
            </button>
            <button
              onClick={() => setViewMode('fetch')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'fetch' ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <CloudDownload className="w-3 h-3 inline mr-1" />
              RECUPERAR
            </button>
          </div>
        </div>
        
        {viewMode === 'fetch' ? renderFetchPanel() : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Activity size={48} className="opacity-20 mb-2" />
            <p className="text-xs">Esperando actividad...</p>
            <p className="text-[10px] mt-1 text-zinc-500">Follows, subs y votos aparecerán aquí</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
      {/* Header con stats */}
      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Stats row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('follow') ? 'bg-green-500/20 ring-1 ring-green-500/50' : 'bg-green-500/10 opacity-50'}`}
            onClick={() => toggleFilter('follow')}
          >
            <div className="text-sm font-bold text-green-400">{stats.follows}</div>
            <div className="text-[8px] text-zinc-500">Follows</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('sub') ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : 'bg-purple-500/10 opacity-50'}`}
            onClick={() => toggleFilter('sub')}
          >
            <div className="text-sm font-bold text-purple-400">{stats.subs}</div>
            <div className="text-[8px] text-zinc-500">Subs</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('resub') ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'bg-blue-500/10 opacity-50'}`}
            onClick={() => toggleFilter('resub')}
          >
            <div className="text-sm font-bold text-blue-400">{stats.resubs}</div>
            <div className="text-[8px] text-zinc-500">ReSubs</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('gift') ? 'bg-pink-500/20 ring-1 ring-pink-500/50' : 'bg-pink-500/10 opacity-50'}`}
            onClick={() => toggleFilter('gift')}
          >
            <div className="text-sm font-bold text-pink-400">{stats.gifts}</div>
            <div className="text-[8px] text-zinc-500">Gifts</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('raid') ? 'bg-red-500/20 ring-1 ring-red-500/50' : 'bg-red-500/10 opacity-50'}`}
            onClick={() => toggleFilter('raid')}
          >
            <div className="text-sm font-bold text-red-400">{stats.raids}</div>
            <div className="text-[8px] text-zinc-500">Raids</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('bits') ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : 'bg-amber-500/10 opacity-50'}`}
            onClick={() => toggleFilter('bits')}
          >
            <div className="text-sm font-bold text-amber-400">{stats.bits}</div>
            <div className="text-[8px] text-zinc-500">Bits</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('vote') ? 'bg-orange-500/20 ring-1 ring-orange-500/50' : 'bg-orange-500/10 opacity-50'}`}
            onClick={() => toggleFilter('vote')}
          >
            <div className="text-sm font-bold text-orange-400">{stats.votes}</div>
            <div className="text-[8px] text-zinc-500">Votos</div>
          </div>
        </div>
        
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1">
            <button
              onClick={() => setViewMode('live')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${viewMode === 'live' ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <span className="flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${viewMode === 'live' ? 'bg-white animate-pulse' : 'bg-zinc-400'}`} />
                EN VIVO
              </span>
            </button>
            <button
              onClick={() => {
                setViewMode('history');
                if (!selectedDate && availableDates.length > 0) {
                  setSelectedDate(availableDates[availableDates.length - 1]);
                }
              }}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${viewMode === 'history' ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              HISTORIAL
            </button>
            <button
              onClick={() => setViewMode('fetch')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${viewMode === 'fetch' ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <CloudDownload className="w-3 h-3 inline mr-1" />
              RECUPERAR
            </button>
          </div>
          
          <button
            onClick={exportEvents}
            className="p-1.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selector de fecha para historial */}
        {viewMode === 'history' && (
          <div className="mt-2 space-y-2">
            {/* Toggle modo rango */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setUseRangeMode(false);
                  setHistoryEvents([]);
                }}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${
                  !useRangeMode ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                Un día
              </button>
              <button
                onClick={() => {
                  setUseRangeMode(true);
                  setHistoryEvents([]);
                }}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${
                  useRangeMode ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                Rango de fechas
              </button>
            </div>
            
            {/* Selector de un día */}
            {!useRangeMode && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none"
                >
                  <option value="">Seleccionar fecha...</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
                {selectedDate && (
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar datos de este día?')) {
                        clearEventsByDate(channelName, selectedDate);
                        setHistoryEvents([]);
                        setAvailableDates(getAvailableDates(channelName));
                        setSelectedDate('');
                      }
                    }}
                    className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    title="Eliminar datos del día"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            
            {/* Selector de rango */}
            {useRangeMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Desde</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      max={dateTo || undefined}
                      className="w-full py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Hasta</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      className="w-full py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={loadEventsByRange}
                  disabled={!dateFrom || !dateTo}
                  className="w-full py-1.5 px-3 rounded bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  Cargar rango
                </button>
                {historyEvents.length > 0 && (
                  <p className="text-[10px] text-zinc-500 text-center">
                    {historyEvents.length} eventos encontrados
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Contenido según modo */}
      {viewMode === 'fetch' ? (
        renderFetchPanel()
      ) : (
        <div 
          ref={containerRef} 
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-2 space-y-1 pb-20 md:pb-2"
        >
          {filteredEvents.map((event, i) => renderEvent(event, i))}
          
          {viewMode === 'history' && filteredEvents.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No hay datos para esta fecha</p>
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};
