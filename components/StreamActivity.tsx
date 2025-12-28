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
  Crown,
  Ban,
  Clock,
  Search,
  User,
  X,
  MessageSquare,
  Gavel,
  Eye,
  Heart,
  Play,
  Square,
  Settings,
  Sliders,
  Megaphone
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getTwitchService } from '../src/application/services/TwitchService';
import { AuthService } from '../src/application/services/AuthService';
import { storageHelpers, generateEventId, getTodayString } from '../src/application/hooks/useStreamEventService';

// Twitch Client ID from environment
const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// Tipos de eventos del stream
export type StreamEventType = 'vote' | 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'bits' | 'ban' | 'timeout';

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
    // Ban/Timeout specific
    duration?: number; // Timeout duration in seconds (null for permanent ban)
    reason?: string; // Reason for ban/timeout
    moderator?: string; // Who issued the ban/timeout
  };
}

// Storage keys - now managed by useStreamEvents hook
const EVENTS_BY_DATE_KEY = 'stream_activity_by_date_v2';

// Scopes necesarios para cada funcionalidad
const REQUIRED_SCOPES = {
  followers: 'moderator:read:followers',
  subscribers: 'channel:read:subscriptions',
  bits: 'bits:read',
  moderation: 'moderation:read',
  vips: 'channel:read:vips',
  chatters: 'moderator:read:chatters',
  banUsers: 'moderator:manage:banned_users',
  clips: '', // Public - no scope needed
  videos: '', // Public - no scope needed
};

// Errores típicos de OAuth y sus soluciones
interface OAuthErrorInfo {
  code: string;
  message: string;
  scope?: string;
  solution: string;
  link?: string;
}

const OAUTH_ERRORS: Record<string, OAuthErrorInfo> = {
  // Errores de autenticación
  'invalid_token': {
    code: '401',
    message: 'Token inválido o expirado',
    solution: 'Genera un nuevo token OAuth en twitchtokengenerator.com',
    link: 'https://twitchtokengenerator.com/'
  },
  'token_expired': {
    code: '401',
    message: 'El token ha expirado',
    solution: 'Los tokens de Twitch expiran. Genera uno nuevo.',
    link: 'https://twitchtokengenerator.com/'
  },
  'missing_scope_followers': {
    code: '403',
    message: 'Sin permiso para ver followers',
    scope: 'moderator:read:followers',
    solution: 'Necesitas el scope moderator:read:followers para ver seguidores recientes.',
    link: 'https://twitchtokengenerator.com/'
  },
  'missing_scope_subscribers': {
    code: '403',
    message: 'Sin permiso para ver suscriptores',
    scope: 'channel:read:subscriptions',
    solution: 'Necesitas el scope channel:read:subscriptions para ver la lista de subs.',
    link: 'https://twitchtokengenerator.com/'
  },
  'missing_scope_bits': {
    code: '403',
    message: 'Sin permiso para ver bits',
    scope: 'bits:read',
    solution: 'Necesitas el scope bits:read para ver el leaderboard de bits.',
    link: 'https://twitchtokengenerator.com/'
  },
  'missing_scope_moderation': {
    code: '403',
    message: 'Sin permiso para ver moderadores',
    scope: 'moderation:read',
    solution: 'Necesitas el scope moderation:read para ver la lista de mods.',
    link: 'https://twitchtokengenerator.com/'
  },
  'missing_scope_vips': {
    code: '403',
    message: 'Sin permiso para ver VIPs',
    scope: 'channel:read:vips',
    solution: 'Necesitas el scope channel:read:vips para ver la lista de VIPs.',
    link: 'https://twitchtokengenerator.com/'
  },
  // Errores de rate limit
  'rate_limit': {
    code: '429',
    message: 'Demasiadas peticiones',
    solution: 'Has excedido el límite de peticiones. Espera unos segundos e intenta de nuevo.'
  },
  // Errores de servidor
  'server_error': {
    code: '500',
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta de nuevo en unos minutos.'
  },
  'service_unavailable': {
    code: '503',
    message: 'Servicio no disponible',
    solution: 'El servicio de Twitch no está disponible temporalmente.'
  },
  // Errores de datos
  'channel_not_found': {
    code: '404',
    message: 'Canal no encontrado',
    solution: 'Verifica que el nombre del canal sea correcto.'
  },
  'not_broadcaster': {
    code: '403',
    message: 'No eres el broadcaster',
    solution: 'Algunas APIs solo funcionan con el token del dueño del canal.'
  },
  // Error genérico
  'unknown': {
    code: '???',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado. Revisa la consola para más detalles.'
  }
};

// Función para parsear errores de la API de Twitch
const parseOAuthError = (status: number, errorBody?: string, dataType?: string): OAuthErrorInfo => {
  // Errores de autenticación
  if (status === 401) {
    if (errorBody?.includes('expired')) {
      return OAUTH_ERRORS['token_expired'];
    }
    return OAUTH_ERRORS['invalid_token'];
  }
  
  // Errores de permisos
  if (status === 403) {
    // Detectar qué scope falta basado en el tipo de datos
    if (dataType === 'followers') return OAUTH_ERRORS['missing_scope_followers'];
    if (dataType === 'subscribers') return OAUTH_ERRORS['missing_scope_subscribers'];
    if (dataType === 'bits') return OAUTH_ERRORS['missing_scope_bits'];
    if (dataType === 'moderators') return OAUTH_ERRORS['missing_scope_moderation'];
    if (dataType === 'vips') return OAUTH_ERRORS['missing_scope_vips'];
    
    // Si el error menciona broadcaster
    if (errorBody?.includes('broadcaster')) {
      return OAUTH_ERRORS['not_broadcaster'];
    }
    
    return {
      code: '403',
      message: 'Acceso denegado',
      solution: 'No tienes permisos para acceder a estos datos. Verifica los scopes de tu token.',
      link: 'https://twitchtokengenerator.com/'
    };
  }
  
  // Rate limit
  if (status === 429) {
    return OAUTH_ERRORS['rate_limit'];
  }
  
  // No encontrado
  if (status === 404) {
    return OAUTH_ERRORS['channel_not_found'];
  }
  
  // Errores de servidor
  if (status >= 500) {
    if (status === 503) return OAUTH_ERRORS['service_unavailable'];
    return OAUTH_ERRORS['server_error'];
  }
  
  return OAUTH_ERRORS['unknown'];
};

// Funciones de persistencia - delegadas al hook useStreamEvents
export const saveEvents = (events: StreamEvent[], channelName: string): void => {
  const today = getTodayString();
  storageHelpers.saveEventsForDate(channelName, today, events);
};

export const loadEventsByDate = (channelName: string, date: string): StreamEvent[] => {
  return storageHelpers.loadEventsForDate(channelName, date);
};

export const getAvailableDates = (channelName: string): string[] => {
  return storageHelpers.getAvailableDates(channelName);
};

export const clearEventsByDate = (channelName: string, date: string): void => {
  storageHelpers.clearEventsForDate(channelName, date);
};

// Helper para convertir votos a eventos
export const voteToEvent = (vote: VoteRecord): StreamEvent => ({
  id: generateEventId('vote', vote.username, vote.timestamp, `opt${vote.optionId}`),
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
  userId?: string;
  onEventAdded?: (event: StreamEvent) => void;
}

export const StreamActivity: React.FC<StreamActivityProps> = ({ 
  events, 
  votes = [], 
  pollOptions = {},
  channelName = 'unknown',
  authToken,
  userId,
  onEventAdded
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevEventsLength = useRef(events.length + votes.length);
  
  // Estados
  const [activeFilters, setActiveFilters] = useState<Set<StreamEventType>>(new Set(['vote', 'follow', 'sub', 'resub', 'gift', 'raid', 'bits', 'ban', 'timeout']));
  const [viewMode, setViewMode] = useState<'live' | 'history' | 'fetch' | 'viewers'>('live');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historyEvents, setHistoryEvents] = useState<StreamEvent[]>([]);
  
  // Estados para el panel de viewers
  const [viewerSearch, setViewerSearch] = useState('');
  const [selectedViewer, setSelectedViewer] = useState<string | null>(null);
  const [viewerSortBy, setViewerSortBy] = useState<'activity' | 'bits' | 'subs' | 'bans'>('activity');
  const [viewerTab, setViewerTab] = useState<'activity' | 'live'>('activity');
  
  // Estado para chatters en tiempo real
  const [liveChatters, setLiveChatters] = useState<{ userId: string; username: string; displayName: string }[]>([]);
  const [loadingChatters, setLoadingChatters] = useState(false);
  const [chattersError, setChattersError] = useState<string | null>(null);
  const [lastChattersUpdate, setLastChattersUpdate] = useState<number | null>(null);
  
  // Estado para modal de moderación expandido
  const [quickModUser, setQuickModUser] = useState<{ userId: string; username: string; displayName: string } | null>(null);
  const [customTimeoutDuration, setCustomTimeoutDuration] = useState<number>(300); // 5 minutos por defecto
  const [customTimeoutUnit, setCustomTimeoutUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('minutes');
  const [moderationReason, setModerationReason] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementColor, setAnnouncementColor] = useState<'blue' | 'green' | 'orange' | 'purple' | 'primary'>('primary');
  
  // Estado para polling automático de chatters
  const [chattersPollingActive, setChattersPollingActive] = useState(false);
  const [chattersPollingInterval, setChattersPollingInterval] = useState(30); // segundos
  const chattersPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Configuración de peso de votos por tier de suscripción
  const [subWeightConfig, setSubWeightConfig] = useState({
    enabled: true,
    tier1Weight: 1,
    tier2Weight: 2,
    tier3Weight: 3,
    followerWeight: 1,
    regularWeight: 1,
  });
  const [showSubWeightConfig, setShowSubWeightConfig] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Estados para rango de fechas
  const [useRangeMode, setUseRangeMode] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Estados para fetch de API
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string>('');
  const [fetchError, setFetchError] = useState<OAuthErrorInfo | null>(null);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [showScopesInfo, setShowScopesInfo] = useState(false);
  const [fetchedData, setFetchedData] = useState<{
    followers?: { username: string; followedAt?: string }[];
    subscribers?: { username: string; tier: string; isGift: boolean }[];
    bitsLeaderboard?: { rank: number; username: string; bits: number }[];
    clips?: { id: string; title: string; url: string; viewCount: number; creatorName: string; createdAt?: string }[];
    videos?: { id: string; title: string; url: string; viewCount: number; type: string; createdAt?: string }[];
    moderators?: { username: string; displayName: string }[];
    vips?: { username: string; displayName: string }[];
  }>({});
  
  // Estados para filtros de fetch
  const [clipDateFrom, setClipDateFrom] = useState<string>('');
  const [clipDateTo, setClipDateTo] = useState<string>('');
  const [bitsPeriod, setBitsPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
  const [showModerationLog, setShowModerationLog] = useState(false);

  // Verificar scopes del token
  useEffect(() => {
    if (authToken) {
      getTwitchService().validateToken(authToken).then(result => {
        if (result?.scopes) {
          setAvailableScopes(result.scopes);
        }
      });
    }
  }, [authToken]);

  // Helper to get broadcaster ID - uses prop if available, otherwise fetches
  const getBroadcasterId = async (): Promise<string | null> => {
    if (userId) return userId;
    if (!authToken || !channelName) return null;
    return await getTwitchService().getUserId(authToken, channelName);
  };

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

  // Calcular registro de moderación (usuarios baneados/timeouteados)
  const moderationLog = useMemo(() => {
    const eventsToAnalyze = viewMode === 'live' ? allEvents : historyEvents;
    const userMap = new Map<string, {
      username: string;
      bans: number;
      timeouts: number;
      totalTimeoutSeconds: number;
      lastAction: { type: 'ban' | 'timeout'; timestamp: number; duration?: number; reason?: string };
      history: { type: 'ban' | 'timeout'; timestamp: number; duration?: number; reason?: string }[];
    }>();

    eventsToAnalyze
      .filter(e => e.type === 'ban' || e.type === 'timeout')
      .forEach(e => {
        const existing = userMap.get(e.username.toLowerCase()) || {
          username: e.username,
          bans: 0,
          timeouts: 0,
          totalTimeoutSeconds: 0,
          lastAction: { type: e.type as 'ban' | 'timeout', timestamp: e.timestamp, duration: e.data?.duration, reason: e.data?.reason },
          history: []
        };

        if (e.type === 'ban') {
          existing.bans++;
        } else {
          existing.timeouts++;
          existing.totalTimeoutSeconds += e.data?.duration || 0;
        }

        existing.history.push({
          type: e.type as 'ban' | 'timeout',
          timestamp: e.timestamp,
          duration: e.data?.duration,
          reason: e.data?.reason
        });

        if (e.timestamp > existing.lastAction.timestamp) {
          existing.lastAction = { type: e.type as 'ban' | 'timeout', timestamp: e.timestamp, duration: e.data?.duration, reason: e.data?.reason };
        }

        userMap.set(e.username.toLowerCase(), existing);
      });

    return Array.from(userMap.values()).sort((a, b) => 
      (b.bans + b.timeouts) - (a.bans + a.timeouts)
    );
  }, [allEvents, historyEvents, viewMode]);

  // Estadísticas
  // IMPORTANT: For gifts, we avoid double-counting by preferring individual gifts over bulk announcements
  const stats = useMemo(() => {
    const eventsToCount = viewMode === 'live' ? allEvents : historyEvents;
    
    // Handle gift counting to avoid duplicates
    const giftEvents = eventsToCount.filter(e => e.type === 'gift');
    const individualGifts = giftEvents.filter(e => e.data?.recipientUsername);
    const bulkGifts = giftEvents.filter(e => e.data?.message?.startsWith('bulk_gift_'));
    
    // Use individual gifts for counting if available, otherwise use bulk
    const giftsToCount = individualGifts.length > 0 ? individualGifts : bulkGifts;
    
    // Total gift count
    let totalGifts: number;
    if (individualGifts.length > 0) {
      totalGifts = individualGifts.length;
    } else {
      totalGifts = bulkGifts.reduce((acc, e) => acc + (e.data?.giftCount || 1), 0);
    }
    
    // Gift tier counts
    const countGiftsByTier = (tier: string): number => {
      if (individualGifts.length > 0) {
        return individualGifts.filter(e => e.data?.tier === tier).length;
      } else {
        return bulkGifts
          .filter(e => e.data?.tier === tier)
          .reduce((acc, e) => acc + (e.data?.giftCount || 1), 0);
      }
    };
    
    return {
      follows: eventsToCount.filter(e => e.type === 'follow').length,
      subs: eventsToCount.filter(e => e.type === 'sub').length,
      resubs: eventsToCount.filter(e => e.type === 'resub').length,
      gifts: totalGifts,
      giftsTier1: countGiftsByTier('1000'),
      giftsTier2: countGiftsByTier('2000'),
      giftsTier3: countGiftsByTier('3000'),
      raids: eventsToCount.filter(e => e.type === 'raid').length,
      bits: eventsToCount.filter(e => e.type === 'bits').reduce((acc, e) => acc + (e.data?.amount || 0), 0),
      votes: eventsToCount.filter(e => e.type === 'vote').length,
      bans: eventsToCount.filter(e => e.type === 'ban').length,
      timeouts: eventsToCount.filter(e => e.type === 'timeout').length,
    };
  }, [allEvents, historyEvents, viewMode]);

  // Datos de todos los viewers con su historial completo
  interface ViewerData {
    username: string;
    totalActivity: number;
    follows: number;
    firstSeen: number;
    lastSeen: number;
    // Suscripciones
    subs: number;
    resubs: number;
    totalSubMonths: number;
    currentTier?: SubTier;
    // Regalos dados
    giftsGiven: number;
    giftsReceived: number;
    // Bits
    totalBits: number;
    // Moderación
    bans: number;
    timeouts: number;
    totalTimeoutSeconds: number;
    // Votos
    votes: number;
    // Historial de eventos
    events: StreamEvent[];
  }

  const viewersData = useMemo(() => {
    const eventsToAnalyze = viewMode === 'live' ? allEvents : historyEvents;
    const userMap = new Map<string, ViewerData>();

    eventsToAnalyze.forEach(e => {
      const key = e.username.toLowerCase();
      const existing = userMap.get(key) || {
        username: e.username,
        totalActivity: 0,
        follows: 0,
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
        subs: 0,
        resubs: 0,
        totalSubMonths: 0,
        currentTier: undefined as SubTier | undefined,
        giftsGiven: 0,
        giftsReceived: 0,
        totalBits: 0,
        bans: 0,
        timeouts: 0,
        totalTimeoutSeconds: 0,
        votes: 0,
        events: [] as StreamEvent[]
      };

      existing.totalActivity++;
      existing.events.push(e);
      
      if (e.timestamp < existing.firstSeen) existing.firstSeen = e.timestamp;
      if (e.timestamp > existing.lastSeen) existing.lastSeen = e.timestamp;

      switch (e.type) {
        case 'follow':
          existing.follows++;
          break;
        case 'sub':
          existing.subs++;
          existing.currentTier = e.data?.tier;
          break;
        case 'resub':
          existing.resubs++;
          existing.totalSubMonths = Math.max(existing.totalSubMonths, e.data?.months || 0);
          existing.currentTier = e.data?.tier;
          break;
        case 'gift':
          if (e.data?.recipientUsername) {
            // Es un regalo dado
            existing.giftsGiven += 1;
            // También registrar al receptor
            const recipientKey = e.data.recipientUsername.toLowerCase();
            const recipient = userMap.get(recipientKey) || {
              username: e.data.recipientUsername,
              totalActivity: 0,
              follows: 0,
              firstSeen: e.timestamp,
              lastSeen: e.timestamp,
              subs: 0,
              resubs: 0,
              totalSubMonths: 0,
              currentTier: undefined as SubTier | undefined,
              giftsGiven: 0,
              giftsReceived: 0,
              totalBits: 0,
              bans: 0,
              timeouts: 0,
              totalTimeoutSeconds: 0,
              votes: 0,
              events: [] as StreamEvent[]
            };
            recipient.giftsReceived++;
            recipient.totalActivity++;
            if (e.timestamp < recipient.firstSeen) recipient.firstSeen = e.timestamp;
            if (e.timestamp > recipient.lastSeen) recipient.lastSeen = e.timestamp;
            userMap.set(recipientKey, recipient);
          } else if (e.data?.giftCount) {
            existing.giftsGiven += e.data.giftCount;
          }
          break;
        case 'bits':
          existing.totalBits += e.data?.amount || 0;
          break;
        case 'ban':
          existing.bans++;
          break;
        case 'timeout':
          existing.timeouts++;
          existing.totalTimeoutSeconds += e.data?.duration || 0;
          break;
        case 'vote':
          existing.votes++;
          break;
      }

      userMap.set(key, existing);
    });

    // Convertir a array y ordenar
    let viewers = Array.from(userMap.values());
    
    // Aplicar filtro de búsqueda
    if (viewerSearch) {
      const search = viewerSearch.toLowerCase();
      viewers = viewers.filter(v => v.username.toLowerCase().includes(search));
    }

    // Ordenar según criterio seleccionado
    switch (viewerSortBy) {
      case 'bits':
        viewers.sort((a, b) => b.totalBits - a.totalBits);
        break;
      case 'subs':
        viewers.sort((a, b) => (b.totalSubMonths + b.subs + b.resubs) - (a.totalSubMonths + a.subs + a.resubs));
        break;
      case 'bans':
        viewers.sort((a, b) => (b.bans + b.timeouts) - (a.bans + a.timeouts));
        break;
      case 'activity':
      default:
        viewers.sort((a, b) => b.totalActivity - a.totalActivity);
        break;
    }

    return viewers;
  }, [allEvents, historyEvents, viewMode, viewerSearch, viewerSortBy]);

  // Obtener datos del viewer seleccionado
  const selectedViewerData = useMemo(() => {
    if (!selectedViewer) return null;
    return viewersData.find(v => v.username.toLowerCase() === selectedViewer.toLowerCase()) || null;
  }, [selectedViewer, viewersData]);

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
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      // Usar la API de Helix para obtener followers
      const cleanToken = authToken.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        setFetchError(parseOAuthError(response.status, errorBody, 'followers'));
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
        const timestamp = f.followedAt ? new Date(f.followedAt).getTime() : Date.now();
        const event: StreamEvent = {
          id: generateEventId('follow_api', f.username, timestamp),
          type: 'follow',
          username: f.username,
          timestamp,
        };
        onEventAdded?.(event);
      });
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
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
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      // Obtener detalles de subs
      const cleanToken = authToken.replace('oauth:', '');
      const response = await fetch(
        `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          }
        }
      );
      
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        setFetchError(parseOAuthError(response.status, errorBody, 'subscribers'));
        return;
      }
      
      const data = await response.json();
      const subscribers = data.data?.map((s: any) => ({
        username: s.user_name || s.user_login,
        tier: s.tier,
        isGift: s.is_gift,
      })) || [];
      
      setFetchedData(prev => ({ ...prev, subscribers }));
      
      // Convertir a eventos
      const now = Date.now();
      subscribers.forEach((s: { username: string; tier: string; isGift: boolean }, index: number) => {
        const event: StreamEvent = {
          id: generateEventId('sub_api', s.username, now, `idx${index}`),
          type: s.isGift ? 'gift' : 'sub',
          username: s.username,
          timestamp: now,
          data: {
            tier: s.tier as SubTier,
          },
        };
        onEventAdded?.(event);
      });
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
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
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      const leaderboard = await getTwitchService().getBitsLeaderboard(authToken, broadcasterId, period);
      if (!leaderboard) {
        setFetchError(OAUTH_ERRORS['missing_scope_bits']);
        return;
      }
      
      setFetchedData(prev => ({ ...prev, bitsLeaderboard: leaderboard }));
      
      // Convertir a eventos de bits
      const now = Date.now();
      leaderboard.forEach((entry) => {
        const event: StreamEvent = {
          id: generateEventId('bits_api', entry.username, now, `rank${entry.rank}`),
          type: 'bits',
          username: entry.username,
          timestamp: now,
          data: {
            amount: entry.bits,
          },
        };
        onEventAdded?.(event);
      });
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
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
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      // Convert dates to ISO format if provided
      const startedAt = clipDateFrom ? new Date(clipDateFrom).toISOString() : undefined;
      const endedAt = clipDateTo ? new Date(clipDateTo + 'T23:59:59').toISOString() : undefined;
      
      const clips = await getTwitchService().getClips(authToken, broadcasterId, 100, startedAt, endedAt);
      if (!clips) {
        setFetchError(OAUTH_ERRORS['server_error']);
        return;
      }
      
      setFetchedData(prev => ({ ...prev, clips }));
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
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
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      const videos = await getTwitchService().getVideos(authToken, broadcasterId, 'all', 50);
      if (!videos) {
        setFetchError(OAUTH_ERRORS['server_error']);
        return;
      }
      
      setFetchedData(prev => ({ ...prev, videos }));
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch moderators desde API
  const fetchModerators = async () => {
    // Check capability first
    if (!AuthService.hasCapability('canModerate')) {
      setFetchError('Necesitas conectarte con OAuth y permisos de moderación');
      return;
    }
    
    const token = AuthService.getToken();
    if (!token || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('moderators');
    setFetchError(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      const mods = await getTwitchService().getModerators(token, broadcasterId);
      if (!mods) {
        setFetchError(OAUTH_ERRORS['missing_scope_moderation']);
        return;
      }
      
      setFetchedData(prev => ({ ...prev, moderators: mods }));
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // Fetch VIPs desde API
  const fetchVIPs = async () => {
    // Check capability first
    if (!AuthService.hasCapability('canReadVIPs')) {
      setFetchError('Necesitas conectarte con OAuth y el permiso channel:read:vips');
      return;
    }
    
    const token = AuthService.getToken();
    if (!token || !channelName) return;
    
    setIsLoading(true);
    setLoadingType('vips');
    setFetchError(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setFetchError(OAUTH_ERRORS['channel_not_found']);
        return;
      }
      
      const vips = await getTwitchService().getVIPs(token, broadcasterId);
      if (!vips) {
        setFetchError(OAUTH_ERRORS['missing_scope_vips']);
        return;
      }
      
      setFetchedData(prev => ({ ...prev, vips }));
      
    } catch (err) {
      setFetchError(OAUTH_ERRORS['unknown']);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  };

  // ============================================
  // FUNCIONES DE MODERACIÓN
  // ============================================
  
  const [moderationAction, setModerationAction] = useState<{
    type: 'ban' | 'timeout' | 'unban' | null;
    username: string;
    duration?: number;
    reason?: string;
  }>({ type: null, username: '' });
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Banear usuario
  const banUser = async (username: string, reason?: string) => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      // Obtener el ID del usuario a banear
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      const success = await getTwitchService().banUser(authToken, broadcasterId, targetUserId, reason);
      
      if (success) {
        setModerationResult({ success: true, message: `${username} ha sido baneado permanentemente` });
        // Agregar evento local
        const event: StreamEvent = {
          id: generateEventId('ban', username, Date.now()),
          type: 'ban',
          username,
          timestamp: Date.now(),
          data: { reason }
        };
        onEventAdded?.(event);
      } else {
        setModerationResult({ success: false, message: 'Error al banear usuario. Verifica los permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al banear usuario' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Timeout usuario
  const timeoutUser = async (username: string, duration: number, reason?: string) => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      const success = await getTwitchService().timeoutUser(authToken, broadcasterId, targetUserId, duration, reason);
      
      if (success) {
        const formatDuration = (s: number) => {
          if (s < 60) return `${s}s`;
          if (s < 3600) return `${Math.floor(s / 60)}m`;
          return `${Math.floor(s / 3600)}h`;
        };
        setModerationResult({ success: true, message: `${username} ha sido silenciado por ${formatDuration(duration)}` });
        // Agregar evento local
        const event: StreamEvent = {
          id: generateEventId('timeout', username, Date.now()),
          type: 'timeout',
          username,
          timestamp: Date.now(),
          data: { duration, reason }
        };
        onEventAdded?.(event);
      } else {
        setModerationResult({ success: false, message: 'Error al silenciar usuario. Verifica los permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al silenciar usuario' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Desbanear usuario
  const unbanUser = async (username: string) => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      const success = await getTwitchService().unbanUser(authToken, broadcasterId, targetUserId);
      
      if (success) {
        setModerationResult({ success: true, message: `${username} ha sido desbaneado` });
      } else {
        setModerationResult({ success: false, message: 'Error al desbanear usuario. Verifica los permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al desbanear usuario' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Añadir VIP
  const addVIP = async (username: string) => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      const success = await getTwitchService().addVIP(authToken, broadcasterId, targetUserId);
      
      if (success) {
        setModerationResult({ success: true, message: `${username} ahora es VIP` });
      } else {
        setModerationResult({ success: false, message: 'Error al añadir VIP. Verifica los permisos (channel:manage:vips)' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al añadir VIP' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Quitar VIP
  const removeVIP = async (username: string) => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      const success = await getTwitchService().removeVIP(authToken, broadcasterId, targetUserId);
      
      if (success) {
        setModerationResult({ success: true, message: `${username} ya no es VIP` });
      } else {
        setModerationResult({ success: false, message: 'Error al quitar VIP. Verifica los permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al quitar VIP' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Enviar anuncio al chat
  const sendAnnouncement = async (message: string, color: 'blue' | 'green' | 'orange' | 'purple' | 'primary' = 'primary') => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const success = await getTwitchService().sendAnnouncement(authToken, broadcasterId, broadcasterId, message, color);
      
      if (success) {
        setModerationResult({ success: true, message: 'Anuncio enviado' });
      } else {
        setModerationResult({ success: false, message: 'Error al enviar anuncio. Verifica los permisos (moderator:manage:announcements)' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al enviar anuncio' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Limpiar chat
  const clearChat = async () => {
    if (!authToken || !channelName) return;
    
    setModerationLoading(true);
    setModerationResult(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      
      const success = await getTwitchService().clearChat(authToken, broadcasterId, broadcasterId);
      
      if (success) {
        setModerationResult({ success: true, message: 'Chat limpiado' });
      } else {
        setModerationResult({ success: false, message: 'Error al limpiar chat. Verifica los permisos (moderator:manage:chat_messages)' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al limpiar chat' });
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  // Helper para convertir duración a segundos
  const getTimeoutSeconds = (duration: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
      case 'seconds': return duration;
      case 'minutes': return duration * 60;
      case 'hours': return duration * 3600;
      case 'days': return duration * 86400;
      default: return duration;
    }
  };

  // Timeout personalizado con razón
  const applyCustomTimeout = async () => {
    if (!quickModUser || !authToken) return;
    const seconds = getTimeoutSeconds(customTimeoutDuration, customTimeoutUnit);
    await timeoutUser(quickModUser.username, seconds, moderationReason || undefined);
    setQuickModUser(null);
    setModerationReason('');
  };

  // Ban con razón
  const applyBanWithReason = async () => {
    if (!quickModUser || !authToken) return;
    await banUser(quickModUser.username, moderationReason || undefined);
    setQuickModUser(null);
    setModerationReason('');
  };

  // Cargar chatters en tiempo real
  const fetchLiveChatters = async () => {
    if (!authToken || !channelName) {
      setChattersError('Se requiere conexión con token OAuth');
      return;
    }
    
    setLoadingChatters(true);
    setChattersError(null);
    
    try {
      const broadcasterId = await getBroadcasterId();
      if (!broadcasterId) {
        setChattersError('No se pudo obtener el ID del canal');
        return;
      }
      
      const chatters = await getTwitchService().getChattersDetailed(authToken, broadcasterId, broadcasterId);
      
      if (chatters) {
        // Mapear los datos de la API al formato esperado
        const mappedChatters = chatters.map(c => ({
          userId: c.userId,
          username: c.userLogin,
          displayName: c.userName
        }));
        setLiveChatters(mappedChatters);
        setLastChattersUpdate(Date.now());
        setChattersError(null);
      } else {
        setChattersError('Error al obtener chatters. Verifica el scope moderator:read:chatters');
      }
    } catch (err) {
      setChattersError('Error al cargar chatters');
      console.error(err);
    } finally {
      setLoadingChatters(false);
    }
  };

  // Iniciar polling automático de chatters
  const startChattersPolling = () => {
    if (chattersPollingRef.current) {
      clearInterval(chattersPollingRef.current);
    }
    
    setChattersPollingActive(true);
    fetchLiveChatters(); // Cargar inmediatamente
    
    chattersPollingRef.current = setInterval(() => {
      fetchLiveChatters();
    }, chattersPollingInterval * 1000);
  };

  // Detener polling automático de chatters
  const stopChattersPolling = () => {
    if (chattersPollingRef.current) {
      clearInterval(chattersPollingRef.current);
      chattersPollingRef.current = null;
    }
    setChattersPollingActive(false);
  };

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      if (chattersPollingRef.current) {
        clearInterval(chattersPollingRef.current);
      }
    };
  }, []);

  // Actualizar intervalo de polling si cambia mientras está activo
  useEffect(() => {
    if (chattersPollingActive && chattersPollingRef.current) {
      clearInterval(chattersPollingRef.current);
      chattersPollingRef.current = setInterval(() => {
        fetchLiveChatters();
      }, chattersPollingInterval * 1000);
    }
  }, [chattersPollingInterval]);

  // Filtrar chatters por búsqueda
  const filteredChatters = useMemo(() => {
    if (!viewerSearch) return liveChatters;
    const search = viewerSearch.toLowerCase();
    return liveChatters.filter(c => 
      c.username.toLowerCase().includes(search) || 
      c.displayName.toLowerCase().includes(search)
    );
  }, [liveChatters, viewerSearch]);

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
        if (e.type === 'ban') details = `Permanent ban${e.data?.reason ? ` - ${e.data.reason}` : ''}`;
        if (e.type === 'timeout') details = `${e.data?.duration || 0}s timeout${e.data?.reason ? ` - ${e.data.reason}` : ''}`;
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
      case 'ban': return <Ban className="w-3.5 h-3.5 text-red-500" />;
      case 'timeout': return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
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
        const resubTier = event.data?.tier || '1000';
        return (
          <span 
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ 
              backgroundColor: `${getTierColor(resubTier)}20`,
              color: getTierColor(resubTier)
            }}
          >
            RESUB x{event.data?.months || 1} {getTierName(resubTier)}
          </span>
        );
      case 'gift':
        const giftTier = event.data?.tier || '1000';
        const isIndividualGift = !!event.data?.recipientUsername;
        return (
          <span 
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ 
              backgroundColor: `${getTierColor(giftTier)}20`,
              color: getTierColor(giftTier)
            }}
          >
            🎁 {isIndividualGift ? `→ ${event.data?.recipientUsername}` : `x${event.data?.giftCount || 1}`} {getTierName(giftTier)}
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
      case 'ban':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/20 text-red-500">
            🚫 BAN {event.data?.reason ? `- ${event.data.reason}` : ''}
          </span>
        );
      case 'timeout':
        const formatDuration = (seconds: number) => {
          if (seconds < 60) return `${seconds}s`;
          if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
          if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
          return `${Math.floor(seconds / 86400)}d`;
        };
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-500">
            ⏱️ TIMEOUT {event.data?.duration ? formatDuration(event.data.duration) : ''}
          </span>
        );
      default:
        return null;
    }
  };

  // Panel de recuperación de datos
  
  // Helper para exportar datos a CSV
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h.toLowerCase().replace(/ /g, '')] ?? row[h] ?? '';
        // Escape commas and quotes
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportFollowers = () => {
    if (!fetchedData.followers) return;
    const data = fetchedData.followers.map(f => ({
      username: f.username,
      followedAt: f.followedAt || 'N/A'
    }));
    exportToCSV(data, 'followers', ['username', 'followedAt']);
  };

  const exportSubscribers = () => {
    if (!fetchedData.subscribers) return;
    const data = fetchedData.subscribers.map(s => ({
      username: s.username,
      tier: s.tier === '1000' ? 'Tier 1' : s.tier === '2000' ? 'Tier 2' : s.tier === '3000' ? 'Tier 3' : s.tier,
      isGift: s.isGift ? 'Sí' : 'No'
    }));
    exportToCSV(data, 'subscribers', ['username', 'tier', 'isGift']);
  };

  const exportBitsLeaderboard = () => {
    if (!fetchedData.bitsLeaderboard) return;
    const data = fetchedData.bitsLeaderboard.map(b => ({
      rank: b.rank,
      username: b.username,
      bits: b.bits
    }));
    exportToCSV(data, 'bits_leaderboard', ['rank', 'username', 'bits']);
  };

  const exportClips = () => {
    if (!fetchedData.clips) return;
    const data = fetchedData.clips.map(c => ({
      title: c.title,
      creator: c.creatorName,
      views: c.viewCount,
      url: c.url,
      createdAt: c.createdAt || 'N/A'
    }));
    exportToCSV(data, 'clips', ['title', 'creator', 'views', 'url', 'createdAt']);
  };

  const exportVideos = () => {
    if (!fetchedData.videos) return;
    const data = fetchedData.videos.map(v => ({
      title: v.title,
      type: v.type,
      views: v.viewCount,
      url: v.url,
      createdAt: v.createdAt || 'N/A'
    }));
    exportToCSV(data, 'videos', ['title', 'type', 'views', 'url', 'createdAt']);
  };

  const exportModerators = () => {
    if (!fetchedData.moderators) return;
    const data = fetchedData.moderators.map(m => ({
      username: m.username,
      displayName: m.displayName
    }));
    exportToCSV(data, 'moderators', ['username', 'displayName']);
  };

  const exportVIPs = () => {
    if (!fetchedData.vips) return;
    const data = fetchedData.vips.map(v => ({
      username: v.username,
      displayName: v.displayName
    }));
    exportToCSV(data, 'vips', ['username', 'displayName']);
  };

  // Exportar registro de moderación
  const exportModerationLog = () => {
    if (moderationLog.length === 0) return;
    
    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      return `${Math.floor(seconds / 86400)}d`;
    };
    
    const data = moderationLog.map(u => ({
      username: u.username,
      bans: u.bans,
      timeouts: u.timeouts,
      totalTimeoutTime: formatDuration(u.totalTimeoutSeconds),
      lastAction: u.lastAction.type === 'ban' ? 'BAN' : `TIMEOUT ${formatDuration(u.lastAction.duration || 0)}`,
      lastActionDate: new Date(u.lastAction.timestamp).toLocaleString('es-ES'),
      lastReason: u.lastAction.reason || 'N/A'
    }));
    exportToCSV(data, 'moderation_log', ['username', 'bans', 'timeouts', 'totalTimeoutTime', 'lastAction', 'lastActionDate', 'lastReason']);
  };

  // Exportar TODO en un archivo Excel con múltiples hojas
  const exportAllData = async () => {
    // Dynamic import of xlsx for code splitting
    const XLSX = await import('xlsx');
    
    const workbook = XLSX.utils.book_new();
    const date = new Date().toISOString().split('T')[0];
    
    // Hoja de Resumen
    const summaryData: any[][] = [
      ['REPORTE DE DATOS - ' + channelName.toUpperCase()],
      ['Fecha de exportación:', new Date().toLocaleString('es-ES')],
      [''],
      ['RESUMEN'],
      ['Tipo', 'Cantidad', 'Detalles'],
    ];
    
    if (fetchedData.followers) {
      summaryData.push(['Followers', fetchedData.followers.length, '']);
    }
    if (fetchedData.subscribers) {
      const own = fetchedData.subscribers.filter(s => !s.isGift).length;
      const gifted = fetchedData.subscribers.filter(s => s.isGift).length;
      summaryData.push(['Suscriptores', fetchedData.subscribers.length, `${own} propios, ${gifted} regalados`]);
    }
    if (fetchedData.bitsLeaderboard) {
      const totalBits = fetchedData.bitsLeaderboard.reduce((acc, e) => acc + e.bits, 0);
      summaryData.push(['Cheerers', fetchedData.bitsLeaderboard.length, `${totalBits.toLocaleString()} bits total`]);
    }
    if (fetchedData.clips) {
      const totalViews = fetchedData.clips.reduce((acc, c) => acc + c.viewCount, 0);
      summaryData.push(['Clips', fetchedData.clips.length, `${totalViews.toLocaleString()} views total`]);
    }
    if (fetchedData.videos) {
      summaryData.push(['Videos/VODs', fetchedData.videos.length, '']);
    }
    if (fetchedData.moderators) {
      summaryData.push(['Moderadores', fetchedData.moderators.length, '']);
    }
    if (fetchedData.vips) {
      summaryData.push(['VIPs', fetchedData.vips.length, '']);
    }
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    
    // Hoja de Followers
    if (fetchedData.followers && fetchedData.followers.length > 0) {
      const followersData = [
        ['Username', 'Fecha de Follow'],
        ...fetchedData.followers.map(f => [
          f.username,
          f.followedAt ? new Date(f.followedAt).toLocaleString('es-ES') : 'N/A'
        ])
      ];
      const followersSheet = XLSX.utils.aoa_to_sheet(followersData);
      followersSheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, followersSheet, 'Followers');
    }
    
    // Hoja de Suscriptores
    if (fetchedData.subscribers && fetchedData.subscribers.length > 0) {
      const subsData = [
        ['Username', 'Tier', 'Tipo', 'Es Regalada'],
        ...fetchedData.subscribers.map(s => [
          s.username,
          s.tier === '1000' ? 'Tier 1' : s.tier === '2000' ? 'Tier 2' : s.tier === '3000' ? 'Tier 3' : s.tier,
          s.isGift ? 'Regalada' : 'Propia',
          s.isGift ? 'Sí' : 'No'
        ])
      ];
      const subsSheet = XLSX.utils.aoa_to_sheet(subsData);
      subsSheet['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, subsSheet, 'Suscriptores');
    }
    
    // Hoja de Bits Leaderboard
    if (fetchedData.bitsLeaderboard && fetchedData.bitsLeaderboard.length > 0) {
      const bitsData = [
        ['Rank', 'Username', 'Bits'],
        ...fetchedData.bitsLeaderboard.map(b => [
          b.rank,
          b.username,
          b.bits
        ])
      ];
      const bitsSheet = XLSX.utils.aoa_to_sheet(bitsData);
      bitsSheet['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, bitsSheet, 'Bits');
    }
    
    // Hoja de Clips
    if (fetchedData.clips && fetchedData.clips.length > 0) {
      const clipsData = [
        ['Título', 'Creador', 'Views', 'Fecha', 'URL'],
        ...fetchedData.clips.map(c => [
          c.title,
          c.creatorName,
          c.viewCount,
          c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES') : 'N/A',
          c.url
        ])
      ];
      const clipsSheet = XLSX.utils.aoa_to_sheet(clipsData);
      clipsSheet['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, clipsSheet, 'Clips');
    }
    
    // Hoja de Videos
    if (fetchedData.videos && fetchedData.videos.length > 0) {
      const videosData = [
        ['Título', 'Tipo', 'Views', 'Fecha', 'URL'],
        ...fetchedData.videos.map(v => [
          v.title,
          v.type,
          v.viewCount,
          v.createdAt ? new Date(v.createdAt).toLocaleDateString('es-ES') : 'N/A',
          v.url
        ])
      ];
      const videosSheet = XLSX.utils.aoa_to_sheet(videosData);
      videosSheet['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, videosSheet, 'Videos');
    }
    
    // Hoja de Moderadores
    if (fetchedData.moderators && fetchedData.moderators.length > 0) {
      const modsData = [
        ['Username', 'Display Name'],
        ...fetchedData.moderators.map(m => [
          m.username,
          m.displayName
        ])
      ];
      const modsSheet = XLSX.utils.aoa_to_sheet(modsData);
      modsSheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, modsSheet, 'Moderadores');
    }
    
    // Hoja de VIPs
    if (fetchedData.vips && fetchedData.vips.length > 0) {
      const vipsData = [
        ['Username', 'Display Name'],
        ...fetchedData.vips.map(v => [
          v.username,
          v.displayName
        ])
      ];
      const vipsSheet = XLSX.utils.aoa_to_sheet(vipsData);
      vipsSheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, vipsSheet, 'VIPs');
    }
    
    // Descargar el archivo
    XLSX.writeFile(workbook, `${channelName}_reporte_${date}.xlsx`);
  };

  // Verificar si hay datos para exportar
  const hasAnyFetchedData = fetchedData.followers || fetchedData.subscribers || 
    fetchedData.bitsLeaderboard || fetchedData.clips || fetchedData.videos || 
    fetchedData.moderators || fetchedData.vips;

  // Helper para formatear duración
  const formatDurationHelper = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Panel de Viewers/Comunidad
  const renderViewersPanel = () => (
    <div className="flex flex-col h-full">
      {/* Tabs: Actividad vs En Vivo */}
      <div className="p-2 border-b border-zinc-700">
        <div className="flex gap-1">
          <button
            onClick={() => setViewerTab('activity')}
            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              viewerTab === 'activity'
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Activity className="w-3 h-3" />
            Historial ({viewersData.length})
          </button>
          <button
            onClick={() => {
              setViewerTab('live');
              if (liveChatters.length === 0 && !loadingChatters) {
                fetchLiveChatters();
              }
            }}
            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
              viewerTab === 'live'
                ? 'bg-green-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Eye className="w-3 h-3" />
            En Vivo ({liveChatters.length})
          </button>
        </div>
      </div>

      {/* Header con búsqueda */}
      <div className="p-3 border-b border-zinc-700 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={viewerSearch}
              onChange={(e) => setViewerSearch(e.target.value)}
              placeholder="Buscar usuario..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            {viewerSearch && (
              <button
                onClick={() => setViewerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {viewerTab === 'live' && (
            <>
              {/* Botón de polling automático */}
              <button
                onClick={chattersPollingActive ? stopChattersPolling : startChattersPolling}
                className={`p-1.5 rounded transition-all ${
                  chattersPollingActive 
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
                title={chattersPollingActive ? 'Detener actualización automática' : 'Iniciar actualización automática'}
              >
                {chattersPollingActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              {/* Botón de actualizar manual */}
              <button
                onClick={fetchLiveChatters}
                disabled={loadingChatters}
                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
                title="Actualizar ahora"
              >
                <RefreshCw className={`w-4 h-4 ${loadingChatters ? 'animate-spin' : ''}`} />
              </button>
              {/* Botón de limpiar chat */}
              {authToken && (
                <button
                  onClick={clearChat}
                  disabled={moderationLoading}
                  className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 disabled:opacity-50"
                  title="Limpiar chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          {/* Botón de configuración */}
          <button
            onClick={() => setShowSubWeightConfig(!showSubWeightConfig)}
            className={`p-1.5 rounded transition-all ${
              showSubWeightConfig 
                ? 'bg-purple-500/30 text-purple-400' 
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
            }`}
            title="Configuración de pesos"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
        
        {/* Panel de configuración de pesos de suscriptores */}
        {showSubWeightConfig && (
          <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-purple-400" />
                Peso de votos por tipo de usuario
              </p>
              <label className="flex items-center gap-2 text-[10px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={subWeightConfig.enabled}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-3 h-3 rounded"
                />
                Activar
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500">Regular</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={subWeightConfig.regularWeight}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, regularWeight: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500">Follower</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={subWeightConfig.followerWeight}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, followerWeight: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-purple-400">Sub Tier 1</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={subWeightConfig.tier1Weight}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, tier1Weight: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-xs bg-zinc-900 border border-purple-500/30 rounded text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-cyan-400">Sub Tier 2</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={subWeightConfig.tier2Weight}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, tier2Weight: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-xs bg-zinc-900 border border-cyan-500/30 rounded text-zinc-200"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-amber-400">Sub Tier 3</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={subWeightConfig.tier3Weight}
                  onChange={(e) => setSubWeightConfig(prev => ({ ...prev, tier3Weight: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-xs bg-zinc-900 border border-amber-500/30 rounded text-zinc-200"
                />
              </div>
            </div>
            
            <p className="text-[9px] text-zinc-500">
              Ejemplo: Si Tier 3 = 3, un voto de sub Tier 3 cuenta como 3 votos
            </p>
          </div>
        )}
        
        {/* Panel de anuncios (solo en tab live con auth) */}
        {viewerTab === 'live' && authToken && (
          <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 space-y-2">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-zinc-300">Enviar anuncio</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Mensaje del anuncio..."
                className="flex-1 px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={announcementColor}
                onChange={(e) => setAnnouncementColor(e.target.value as any)}
                className="px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              >
                <option value="primary">Normal</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="orange">Naranja</option>
                <option value="purple">Morado</option>
              </select>
              <button
                onClick={() => {
                  if (announcementMessage.trim()) {
                    sendAnnouncement(announcementMessage, announcementColor);
                    setAnnouncementMessage('');
                  }
                }}
                disabled={moderationLoading || !announcementMessage.trim()}
                className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Enviar
              </button>
            </div>
            {moderationResult && (
              <p className={`text-[10px] ${moderationResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {moderationResult.message}
              </p>
            )}
          </div>
        )}
        
        {/* Controles de polling (solo en tab live) */}
        {viewerTab === 'live' && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${
              chattersPollingActive 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-zinc-800 text-zinc-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${chattersPollingActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
              {chattersPollingActive ? 'Auto-actualización activa' : 'Auto-actualización pausada'}
            </div>
            
            {chattersPollingActive && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-500">cada</span>
                <select
                  value={chattersPollingInterval}
                  onChange={(e) => setChattersPollingInterval(parseInt(e.target.value))}
                  className="px-1 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-300"
                >
                  <option value="10">10s</option>
                  <option value="30">30s</option>
                  <option value="60">1m</option>
                  <option value="120">2m</option>
                  <option value="300">5m</option>
                </select>
              </div>
            )}
          </div>
        )}
        
        {/* Ordenar por (solo en tab de actividad) */}
        {viewerTab === 'activity' && (
          <div className="flex gap-1">
            {[
              { key: 'activity', label: 'Actividad', icon: Activity },
              { key: 'bits', label: 'Bits', icon: Coins },
              { key: 'subs', label: 'Subs', icon: Star },
              { key: 'bans', label: 'Sanciones', icon: Ban },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewerSortBy(key as any)}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                  viewerSortBy === key
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}
        
        {/* Info de última actualización (solo en tab live) */}
        {viewerTab === 'live' && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-500">
              {filteredChatters.length} usuarios en el chat
            </p>
            {lastChattersUpdate && (
              <p className="text-[10px] text-zinc-600">
                Actualizado: {new Date(lastChattersUpdate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
        )}
        
        {viewerTab === 'activity' && (
          <p className="text-[10px] text-zinc-500">
            {viewersData.length} usuarios con actividad
          </p>
        )}
      </div>

      {/* Lista de viewers o detalle de viewer seleccionado */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {selectedViewer && selectedViewerData ? (
          // Detalle del viewer seleccionado
          <div className="p-3 space-y-3">
            {/* Header con botón de volver */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedViewer(null)}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              >
                <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              </button>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-zinc-200">{selectedViewerData.username}</h3>
                <p className="text-[10px] text-zinc-500">
                  Visto por primera vez: {new Date(selectedViewerData.firstSeen).toLocaleDateString('es-ES')}
                </p>
              </div>
              <a
                href={`https://twitch.tv/${selectedViewerData.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Stats del usuario */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-green-500/10 text-center">
                <div className="text-lg font-bold text-green-400">{selectedViewerData.follows}</div>
                <div className="text-[9px] text-zinc-500">Follows</div>
              </div>
              <div className="p-2 rounded bg-purple-500/10 text-center">
                <div className="text-lg font-bold text-purple-400">{selectedViewerData.subs + selectedViewerData.resubs}</div>
                <div className="text-[9px] text-zinc-500">Subs</div>
              </div>
              <div className="p-2 rounded bg-amber-500/10 text-center">
                <div className="text-lg font-bold text-amber-400">{selectedViewerData.totalBits.toLocaleString()}</div>
                <div className="text-[9px] text-zinc-500">Bits</div>
              </div>
              <div className="p-2 rounded bg-pink-500/10 text-center">
                <div className="text-lg font-bold text-pink-400">{selectedViewerData.giftsGiven}</div>
                <div className="text-[9px] text-zinc-500">Gifts dados</div>
              </div>
              <div className="p-2 rounded bg-red-600/10 text-center">
                <div className="text-lg font-bold text-red-500">{selectedViewerData.bans}</div>
                <div className="text-[9px] text-zinc-500">Bans</div>
              </div>
              <div className="p-2 rounded bg-yellow-500/10 text-center">
                <div className="text-lg font-bold text-yellow-500">{selectedViewerData.timeouts}</div>
                <div className="text-[9px] text-zinc-500">Timeouts</div>
              </div>
            </div>

            {/* Info adicional */}
            {selectedViewerData.totalSubMonths > 0 && (
              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs font-bold text-purple-400">
                      {selectedViewerData.totalSubMonths} meses de suscripción
                    </p>
                    {selectedViewerData.currentTier && (
                      <p className="text-[10px] text-purple-300/70">
                        Tier actual: {selectedViewerData.currentTier === '1000' ? '1' : selectedViewerData.currentTier === '2000' ? '2' : '3'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedViewerData.totalTimeoutSeconds > 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <p className="text-xs text-yellow-400">
                    Tiempo total en timeout: {formatDurationHelper(selectedViewerData.totalTimeoutSeconds)}
                  </p>
                </div>
              </div>
            )}

            {/* Acciones de moderación */}
            {authToken && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-2">
                <p className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                  <Gavel className="w-3.5 h-3.5" /> Acciones de moderación
                </p>
                
                {moderationResult && (
                  <div className={`p-2 rounded text-xs ${moderationResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {moderationResult.message}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={() => timeoutUser(selectedViewerData.username, 60)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" /> 1m
                  </button>
                  <button
                    onClick={() => timeoutUser(selectedViewerData.username, 600)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" /> 10m
                  </button>
                  <button
                    onClick={() => timeoutUser(selectedViewerData.username, 3600)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" /> 1h
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => banUser(selectedViewerData.username)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-500 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Ban className="w-3 h-3" /> Ban permanente
                  </button>
                  <button
                    onClick={() => unbanUser(selectedViewerData.username)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Heart className="w-3 h-3" /> Desbanear
                  </button>
                </div>
                
                {/* VIP Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => addVIP(selectedViewerData.username)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Crown className="w-3 h-3" /> Dar VIP
                  </button>
                  <button
                    onClick={() => removeVIP(selectedViewerData.username)}
                    disabled={moderationLoading}
                    className="flex-1 py-1.5 px-2 rounded bg-zinc-600/20 hover:bg-zinc-600/30 text-zinc-400 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Crown className="w-3 h-3" /> Quitar VIP
                  </button>
                </div>
              </div>
            )}

            {/* Historial de eventos */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400">Historial de actividad</p>
              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                {selectedViewerData.events.slice().reverse().slice(0, 50).map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-zinc-900/50 text-[10px]">
                    {renderEventIcon(event.type)}
                    <span className="text-zinc-400">
                      {event.type === 'sub' && 'Suscripción'}
                      {event.type === 'resub' && `Resub (${event.data?.months}m)`}
                      {event.type === 'gift' && `Gift x${event.data?.giftCount || 1}`}
                      {event.type === 'bits' && `${event.data?.amount} bits`}
                      {event.type === 'follow' && 'Follow'}
                      {event.type === 'vote' && 'Voto'}
                      {event.type === 'ban' && 'BAN'}
                      {event.type === 'timeout' && `Timeout ${formatDurationHelper(event.data?.duration || 0)}`}
                      {event.type === 'raid' && `Raid (${event.data?.viewerCount})`}
                    </span>
                    <span className="ml-auto text-zinc-600">
                      {new Date(event.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : viewerTab === 'live' ? (
          // Lista de chatters en vivo
          <div className="p-2 space-y-1">
            {chattersError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs text-red-400">{chattersError}</p>
                    <p className="text-[10px] text-red-300/70 mt-1">
                      Necesitas el scope: moderator:read:chatters
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {loadingChatters ? (
              <div className="text-center py-8 text-zinc-500">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-xs">Cargando chatters...</p>
              </div>
            ) : filteredChatters.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No hay chatters</p>
                <p className="text-[10px] mt-1">Pulsa el botón de actualizar para cargar</p>
                <button
                  onClick={fetchLiveChatters}
                  className="mt-3 px-4 py-2 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-bold flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cargar chatters
                </button>
              </div>
            ) : (
              filteredChatters.map((chatter, idx) => {
                // Buscar si tenemos datos de actividad de este usuario
                const activityData = viewersData.find(v => v.username.toLowerCase() === chatter.username.toLowerCase());
                
                return (
                  <div
                    key={idx}
                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-zinc-200 truncate">{chatter.displayName}</span>
                        {activityData?.totalSubMonths && activityData.totalSubMonths > 0 && (
                          <Star className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        )}
                        {activityData?.bans && activityData.bans > 0 && (
                          <Ban className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="En el chat" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>@{chatter.username}</span>
                        {activityData && (
                          <>
                            {activityData.totalBits > 0 && (
                              <span className="text-amber-400">{activityData.totalBits.toLocaleString()} bits</span>
                            )}
                            {activityData.giftsGiven > 0 && (
                              <span className="text-pink-400">{activityData.giftsGiven} gifts</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Acciones rápidas de moderación */}
                    {authToken && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            timeoutUser(chatter.username, 60);
                          }}
                          disabled={moderationLoading}
                          className="p-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 disabled:opacity-50"
                          title="Timeout 1m"
                        >
                          <Clock className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            banUser(chatter.username);
                          }}
                          disabled={moderationLoading}
                          className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 disabled:opacity-50"
                          title="Ban"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addVIP(chatter.username);
                          }}
                          disabled={moderationLoading}
                          className="p-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 disabled:opacity-50"
                          title="Dar VIP"
                        >
                          <Crown className="w-3 h-3" />
                        </button>
                        {/* Botón para abrir panel de moderación expandido */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickModUser(chatter);
                          }}
                          className="p-1 rounded bg-zinc-600/50 hover:bg-zinc-600 text-zinc-300"
                          title="Más opciones"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        {activityData && (
                          <button
                            onClick={() => setSelectedViewer(chatter.username)}
                            className="p-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                            title="Ver perfil"
                          >
                            <User className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {filteredChatters.length > 0 && (
              <p className="text-center text-[10px] text-zinc-500 py-2">
                {filteredChatters.length} usuarios en el chat
              </p>
            )}
          </div>
        ) : (
          // Lista de viewers (historial de actividad)
          <div className="p-2 space-y-1">
            {viewersData.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No hay datos de usuarios</p>
                <p className="text-[10px] mt-1">Los usuarios aparecerán cuando haya actividad</p>
              </div>
            ) : (
              viewersData.slice(0, 100).map((viewer, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedViewer(viewer.username)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-zinc-200 truncate">{viewer.username}</span>
                      {viewer.totalSubMonths > 0 && (
                        <Star className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      )}
                      {viewer.bans > 0 && (
                        <Ban className="w-3 h-3 text-red-500 flex-shrink-0" />
                      )}
                      {/* Indicador si está en el chat ahora */}
                      {liveChatters.some(c => c.username.toLowerCase() === viewer.username.toLowerCase()) && (
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="En el chat" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{viewer.totalActivity} eventos</span>
                      {viewer.totalBits > 0 && (
                        <span className="text-amber-400">{viewer.totalBits.toLocaleString()} bits</span>
                      )}
                      {viewer.giftsGiven > 0 && (
                        <span className="text-pink-400">{viewer.giftsGiven} gifts</span>
                      )}
                    </div>
                  </div>
                  <ChevronUp className="w-4 h-4 text-zinc-600 rotate-90" />
                </button>
              ))
            )}
            {viewersData.length > 100 && (
              <p className="text-center text-[10px] text-zinc-500 py-2">
                Mostrando 100 de {viewersData.length} usuarios
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

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
        <div className={`rounded-lg border transition-all ${
          hasScope(REQUIRED_SCOPES.bits)
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-zinc-800/50 border-zinc-700 opacity-50'
        }`}>
          <button
            onClick={() => fetchBitsLeaderboard(bitsPeriod)}
            disabled={isLoading || !authToken || !hasScope(REQUIRED_SCOPES.bits)}
            className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10 transition-all rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-zinc-200">Bits Leaderboard</p>
                <p className="text-[10px] text-zinc-500">Top 100 cheerers</p>
              </div>
            </div>
            {isLoading && loadingType === 'bits' ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <CloudDownload className="w-4 h-4 text-amber-400" />
            )}
          </button>
          {/* Period selector */}
          <div className="px-3 pb-2 flex gap-1 flex-wrap">
            {(['day', 'week', 'month', 'year', 'all'] as const).map(period => (
              <button
                key={period}
                onClick={() => setBitsPeriod(period)}
                className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                  bitsPeriod === period
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
              >
                {period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : period === 'year' ? 'Año' : 'Todo'}
              </button>
            ))}
          </div>
        </div>

        {/* Clips */}
        <div className="rounded-lg border transition-all bg-cyan-500/10 border-cyan-500/30">
          <button
            onClick={fetchClips}
            disabled={isLoading || !authToken}
            className="w-full flex items-center justify-between p-3 hover:bg-cyan-500/10 transition-all rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-zinc-200">Clips del canal</p>
                <p className="text-[10px] text-zinc-500">
                  {clipDateFrom || clipDateTo ? 'Filtrado por fecha' : 'Últimos 100 clips'}
                </p>
              </div>
            </div>
            {isLoading && loadingType === 'clips' ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : (
              <CloudDownload className="w-4 h-4 text-cyan-400" />
            )}
          </button>
          {/* Date range selector */}
          <div className="px-3 pb-2 space-y-1">
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label className="text-[9px] text-zinc-500 block mb-0.5">Desde</label>
                <input
                  type="date"
                  value={clipDateFrom}
                  onChange={(e) => setClipDateFrom(e.target.value)}
                  className="w-full px-2 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-300"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-zinc-500 block mb-0.5">Hasta</label>
                <input
                  type="date"
                  value={clipDateTo}
                  onChange={(e) => setClipDateTo(e.target.value)}
                  className="w-full px-2 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-300"
                />
              </div>
              {(clipDateFrom || clipDateTo) && (
                <button
                  onClick={() => { setClipDateFrom(''); setClipDateTo(''); }}
                  className="mt-3 px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

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

      {/* Error detallado */}
      {fetchError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-400">{fetchError.message}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                  Error {fetchError.code}
                </span>
              </div>
              <p className="text-[10px] text-red-300/80 mt-1">
                {fetchError.solution}
              </p>
              {fetchError.scope && (
                <div className="mt-2 p-2 rounded bg-black/20">
                  <p className="text-[10px] text-zinc-400">Scope necesario:</p>
                  <code className="text-[10px] text-amber-300 font-mono">{fetchError.scope}</code>
                </div>
              )}
              {fetchError.link && (
                <a 
                  href={fetchError.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Generar nuevo token con permisos
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setFetchError(null)}
            className="w-full py-1 text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Datos recuperados */}
      {hasAnyFetchedData && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400">Datos recuperados</p>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAllData}
                className="px-2 py-1 text-[9px] bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded flex items-center gap-1 font-bold"
                title="Descargar todo en Excel"
              >
                <Download className="w-3 h-3" /> EXCEL
              </button>
              <button
                onClick={() => setFetchedData({})}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                Limpiar
              </button>
            </div>
          </div>
          
          {fetchedData.followers && (
            <div className="flex items-center justify-between p-2 rounded bg-green-500/10">
              <div>
                <p className="text-[10px] text-green-400 font-bold">
                  ✓ {fetchedData.followers.length} followers
                </p>
              </div>
              <button
                onClick={exportFollowers}
                className="px-2 py-1 text-[9px] bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.subscribers && (
            <div className="flex items-center justify-between p-2 rounded bg-purple-500/10">
              <div>
                <p className="text-[10px] text-purple-400 font-bold">
                  ✓ {fetchedData.subscribers.length} suscriptores
                </p>
                <p className="text-[9px] text-purple-300/70">
                  {fetchedData.subscribers.filter(s => !s.isGift).length} propios · {fetchedData.subscribers.filter(s => s.isGift).length} regalados
                </p>
              </div>
              <button
                onClick={exportSubscribers}
                className="px-2 py-1 text-[9px] bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.bitsLeaderboard && (
            <div className="flex items-center justify-between p-2 rounded bg-amber-500/10">
              <div>
                <p className="text-[10px] text-amber-400 font-bold">
                  ✓ {fetchedData.bitsLeaderboard.length} cheerers
                </p>
                <p className="text-[9px] text-amber-300/70">
                  {fetchedData.bitsLeaderboard.reduce((acc, e) => acc + e.bits, 0).toLocaleString()} bits total
                </p>
              </div>
              <button
                onClick={exportBitsLeaderboard}
                className="px-2 py-1 text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.clips && (
            <div className="flex items-center justify-between p-2 rounded bg-cyan-500/10">
              <div>
                <p className="text-[10px] text-cyan-400 font-bold">
                  ✓ {fetchedData.clips.length} clips
                </p>
                <p className="text-[9px] text-cyan-300/70">
                  {fetchedData.clips.reduce((acc, c) => acc + c.viewCount, 0).toLocaleString()} views total
                </p>
              </div>
              <button
                onClick={exportClips}
                className="px-2 py-1 text-[9px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.videos && (
            <div className="flex items-center justify-between p-2 rounded bg-indigo-500/10">
              <div>
                <p className="text-[10px] text-indigo-400 font-bold">
                  ✓ {fetchedData.videos.length} videos/VODs
                </p>
              </div>
              <button
                onClick={exportVideos}
                className="px-2 py-1 text-[9px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.moderators && (
            <div className="flex items-center justify-between p-2 rounded bg-red-500/10">
              <div>
                <p className="text-[10px] text-red-400 font-bold">
                  ✓ {fetchedData.moderators.length} moderadores
                </p>
              </div>
              <button
                onClick={exportModerators}
                className="px-2 py-1 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
          
          {fetchedData.vips && (
            <div className="flex items-center justify-between p-2 rounded bg-pink-500/10">
              <div>
                <p className="text-[10px] text-pink-400 font-bold">
                  ✓ {fetchedData.vips.length} VIPs
                </p>
              </div>
              <button
                onClick={exportVIPs}
                className="px-2 py-1 text-[9px] bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panel de Registro de Moderación */}
      {(stats.bans > 0 || stats.timeouts > 0) && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              <p className="text-xs font-bold text-zinc-300">Registro de Moderación</p>
              <span className="px-1.5 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded">
                {moderationLog.length} usuarios
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportModerationLog}
                className="px-2 py-1 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={() => setShowModerationLog(!showModerationLog)}
                className="text-[10px] text-zinc-400 hover:text-zinc-300"
              >
                {showModerationLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Resumen rápido */}
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded bg-red-600/10 text-center">
              <div className="text-lg font-bold text-red-500">{stats.bans}</div>
              <div className="text-[9px] text-zinc-500">Bans</div>
            </div>
            <div className="flex-1 p-2 rounded bg-yellow-500/10 text-center">
              <div className="text-lg font-bold text-yellow-500">{stats.timeouts}</div>
              <div className="text-[9px] text-zinc-500">Timeouts</div>
            </div>
          </div>
          
          {showModerationLog && moderationLog.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              {moderationLog.map((user, idx) => {
                const formatDuration = (seconds: number) => {
                  if (seconds < 60) return `${seconds}s`;
                  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
                  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
                  return `${Math.floor(seconds / 86400)}d`;
                };
                
                return (
                  <div key={idx} className="p-2 rounded bg-zinc-900/50 border border-zinc-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-200">{user.username}</span>
                        {user.bans > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-red-600/20 text-red-500 rounded font-bold">
                            🚫 {user.bans} ban{user.bans > 1 ? 's' : ''}
                          </span>
                        )}
                        {user.timeouts > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-yellow-500/20 text-yellow-500 rounded font-bold">
                            ⏱️ {user.timeouts} timeout{user.timeouts > 1 ? 's' : ''} ({formatDuration(user.totalTimeoutSeconds)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      Última acción: {user.lastAction.type === 'ban' ? '🚫 BAN' : `⏱️ TIMEOUT ${formatDuration(user.lastAction.duration || 0)}`}
                      {' · '}
                      {new Date(user.lastAction.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {user.lastAction.reason && (
                        <span className="text-zinc-400"> · "{user.lastAction.reason}"</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
          <div className="grid grid-cols-9 gap-1 text-center">
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
            <div className="p-1.5 rounded bg-red-600/10">
              <div className="text-sm font-bold text-red-500">{stats.bans}</div>
              <div className="text-[8px] text-zinc-500">Bans</div>
            </div>
            <div className="p-1.5 rounded bg-yellow-500/10">
              <div className="text-sm font-bold text-yellow-500">{stats.timeouts}</div>
              <div className="text-[8px] text-zinc-500">Timeouts</div>
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
                LIVE
              </span>
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'history' ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              HIST
            </button>
            <button
              onClick={() => setViewMode('viewers')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'viewers' ? 'bg-cyan-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              USERS
            </button>
            <button
              onClick={() => setViewMode('fetch')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold ${viewMode === 'fetch' ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <CloudDownload className="w-3 h-3 inline mr-1" />
              API
            </button>
          </div>
        </div>
        
        {viewMode === 'fetch' ? renderFetchPanel() : viewMode === 'viewers' ? renderViewersPanel() : (
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
        <div className="grid grid-cols-9 gap-1 text-center mb-2">
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
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('ban') ? 'bg-red-600/20 ring-1 ring-red-600/50' : 'bg-red-600/10 opacity-50'}`}
            onClick={() => toggleFilter('ban')}
          >
            <div className="text-sm font-bold text-red-500">{stats.bans}</div>
            <div className="text-[8px] text-zinc-500">Bans</div>
          </div>
          <div 
            className={`p-1.5 rounded cursor-pointer transition-all ${activeFilters.has('timeout') ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50' : 'bg-yellow-500/10 opacity-50'}`}
            onClick={() => toggleFilter('timeout')}
          >
            <div className="text-sm font-bold text-yellow-500">{stats.timeouts}</div>
            <div className="text-[8px] text-zinc-500">Timeouts</div>
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
                LIVE
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
              HIST
            </button>
            <button
              onClick={() => setViewMode('viewers')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${viewMode === 'viewers' ? 'bg-cyan-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              USERS
            </button>
            <button
              onClick={() => setViewMode('fetch')}
              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${viewMode === 'fetch' ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <CloudDownload className="w-3 h-3 inline mr-1" />
              API
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
      ) : viewMode === 'viewers' ? (
        renderViewersPanel()
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
      
      {/* Modal de moderación expandido */}
      {quickModUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{quickModUser.displayName}</h3>
                  <p className="text-xs text-zinc-500">@{quickModUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setQuickModUser(null);
                  setModerationReason('');
                }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Resultado de moderación */}
              {moderationResult && (
                <div className={`p-3 rounded-lg text-sm ${moderationResult.success ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {moderationResult.message}
                </div>
              )}
              
              {/* Razón (opcional) */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Razón (opcional)</label>
                <input
                  type="text"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Motivo del timeout/ban..."
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              {/* Timeouts rápidos */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Timeout rápido</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '1m', seconds: 60 },
                    { label: '5m', seconds: 300 },
                    { label: '10m', seconds: 600 },
                    { label: '1h', seconds: 3600 },
                    { label: '24h', seconds: 86400 },
                  ].map(({ label, seconds }) => (
                    <button
                      key={label}
                      onClick={() => timeoutUser(quickModUser.username, seconds, moderationReason || undefined)}
                      disabled={moderationLoading}
                      className="py-2 px-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Timeout personalizado */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Timeout personalizado</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customTimeoutDuration}
                    onChange={(e) => setCustomTimeoutDuration(parseInt(e.target.value) || 1)}
                    className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                  <select
                    value={customTimeoutUnit}
                    onChange={(e) => setCustomTimeoutUnit(e.target.value as any)}
                    className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="seconds">Segundos</option>
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Días</option>
                  </select>
                  <button
                    onClick={applyCustomTimeout}
                    disabled={moderationLoading}
                    className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Acciones principales */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={applyBanWithReason}
                  disabled={moderationLoading}
                  className="py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Ban permanente
                </button>
                <button
                  onClick={() => {
                    unbanUser(quickModUser.username);
                  }}
                  disabled={moderationLoading}
                  className="py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4" /> Desbanear
                </button>
              </div>
              
              {/* VIP */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addVIP(quickModUser.username)}
                  disabled={moderationLoading}
                  className="py-2 px-4 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" /> Dar VIP
                </button>
                <button
                  onClick={() => removeVIP(quickModUser.username)}
                  disabled={moderationLoading}
                  className="py-2 px-4 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" /> Quitar VIP
                </button>
              </div>
              
              {/* Links externos */}
              <div className="pt-2 border-t border-zinc-700 flex gap-2">
                <a
                  href={`https://twitch.tv/${quickModUser.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Canal
                </a>
                <a
                  href={`https://www.twitch.tv/popout/${channelName}/viewercard/${quickModUser.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <User className="w-3 h-3" /> Viewer Card
                </a>
              </div>
            </div>
          </div>
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

export default StreamActivity;