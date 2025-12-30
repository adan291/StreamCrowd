/**
 * APIDataPanel - Subcomponente para fetch y visualización de datos de API de Twitch
 * 
 * Muestra cards para cada tipo de datos (followers, subs, bits, clips, videos, mods, VIPs)
 * con estados de loading, display de errores con soluciones, e indicadores de scopes.
 * 
 * @requirements 1.1-1.9 - Twitch API data fetching with error handling
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  UserPlus,
  Star,
  Coins,
  Film,
  Video,
  Shield,
  Crown,
  Users,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  Play,
  Loader2,
  Lock,
  Download,
  PlayCircle,
} from 'lucide-react';
import {
  useTwitchAPI,
  type Follower,
  type Subscriber,
  type BitsLeader,
  type Clip,
  type Video as TwitchVideo,
  type Moderator,
  type VIP,
  type TwitchAPIError,
  type BitsPeriod,
  isTwitchAPIError,
} from '../../src/application/hooks/useTwitchAPI';

/**
 * Props for the APIDataPanel component
 */
export interface APIDataPanelProps {
  /** OAuth token for API authentication */
  authToken?: string;
  /** Broadcaster ID for API calls */
  broadcasterId?: string;
  /** Channel name for display */
  channelName?: string;
}

/**
 * Scope information for each data type
 */
const SCOPE_INFO: Record<string, { scope: string; description: string }> = {
  followers: {
    scope: 'moderator:read:followers',
    description: 'Ver seguidores recientes',
  },
  subscribers: {
    scope: 'channel:read:subscriptions',
    description: 'Ver lista de suscriptores',
  },
  bits: {
    scope: 'bits:read',
    description: 'Ver leaderboard de bits',
  },
  moderators: {
    scope: 'moderation:read',
    description: 'Ver lista de moderadores',
  },
  vips: {
    scope: 'channel:read:vips',
    description: 'Ver lista de VIPs',
  },
  chatters: {
    scope: 'moderator:read:chatters',
    description: 'Ver usuarios en el chat',
  },
};

/**
 * Period options for bits leaderboard
 */
const BITS_PERIODS: { value: BitsPeriod; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'year', label: 'Este año' },
  { value: 'all', label: 'Todo el tiempo' },
];

/**
 * Date range presets for clips
 */
const CLIP_DATE_PRESETS = [
  { label: 'Última semana', days: 7 },
  { label: 'Último mes', days: 30 },
  { label: 'Últimos 3 meses', days: 90 },
  { label: 'Todo', days: 0 },
];

/**
 * Format a date string to locale format
 */
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format duration string (e.g., "1h2m3s" to "1:02:03")
 */
const formatDuration = (duration: string | number): string => {
  if (typeof duration === 'number') {
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  // Parse duration string like "1h2m3s"
  const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) return duration;
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  const secs = parseInt(match[3] || '0');
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format view count with K/M suffix
 */
const formatViews = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

/**
 * Error display component
 */
interface ErrorDisplayProps {
  error: TwitchAPIError;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => (
  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-400">{error.message}</p>
        <p className="text-xs text-zinc-400 mt-1">{error.solution}</p>
        {error.link && (
          <a
            href={error.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
          >
            Obtener nuevo token
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors"
          title="Reintentar"
        >
          <RefreshCw className="w-4 h-4 text-zinc-300" />
        </button>
      )}
    </div>
  </div>
);

/**
 * Loading skeleton component
 */
const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <div className="w-8 h-8 rounded-full bg-zinc-700" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-zinc-700 rounded w-24" />
          <div className="h-2 bg-zinc-700/50 rounded w-16" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Scope indicator badge
 */
interface ScopeIndicatorProps {
  scope: string;
  description: string;
}

const ScopeIndicator: React.FC<ScopeIndicatorProps> = ({ scope, description }) => (
  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
    <Lock className="w-3 h-3" />
    <span title={`Scope requerido: ${scope}`}>{description}</span>
  </div>
);

/**
 * Data card wrapper component
 */
interface DataCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  error?: TwitchAPIError | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  scopeInfo?: { scope: string; description: string };
  count?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  icon,
  color,
  loading,
  error,
  onRefresh,
  onRetry,
  onDownload,
  scopeInfo,
  count,
  expanded = true,
  onToggleExpand,
  children,
  headerExtra,
}) => (
  <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between p-3 border-b border-zinc-700/50">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            {count !== undefined && (
              <span className="text-xs text-zinc-400">({count})</span>
            )}
          </div>
          {scopeInfo && (
            <ScopeIndicator scope={scopeInfo.scope} description={scopeInfo.description} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {headerExtra}
        {onDownload && count !== undefined && count > 0 && !loading && (
          <button
            onClick={onDownload}
            className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Descargar datos"
          >
            <Download className="w-4 h-4 text-zinc-400" />
          </button>
        )}
        {onRefresh && !loading && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        )}
        {loading && (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        )}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        )}
      </div>
    </div>

    {/* Content */}
    {expanded && (
      <div className="p-3">
        {error ? (
          <ErrorDisplay error={error} onRetry={onRetry} />
        ) : loading ? (
          <LoadingSkeleton />
        ) : (
          children
        )}
      </div>
    )}
  </div>
);

/**
 * Followers list component
 */
interface FollowersListProps {
  followers: Follower[];
}

const FollowersList: React.FC<FollowersListProps> = ({ followers }) => {
  if (followers.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay seguidores recientes
      </p>
    );
  }

  return (
    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
      {followers.map((follower, index) => (
        <div
          key={`${follower.username}-${index}`}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {follower.displayName}
            </p>
            <p className="text-xs text-zinc-500">
              {formatDate(follower.followedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Subscribers list component
 */
interface SubscribersListProps {
  subscribers: Subscriber[];
}

const SubscribersList: React.FC<SubscribersListProps> = ({ subscribers }) => {
  if (subscribers.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay suscriptores
      </p>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case '3000': return '#ffd700';
      case '2000': return '#00f0f0';
      case 'Prime': return '#9147ff';
      default: return '#a970ff';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case '3000': return 'T3';
      case '2000': return 'T2';
      case 'Prime': return 'Prime';
      default: return 'T1';
    }
  };

  return (
    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
      {subscribers.map((sub, index) => (
        <div
          key={`${sub.username}-${index}`}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {sub.displayName}
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${getTierColor(sub.tier)}20`,
                  color: getTierColor(sub.tier),
                }}
              >
                {getTierLabel(sub.tier)}
              </span>
              {sub.isGift && (
                <span className="text-[10px] text-pink-400">🎁 Gift</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Bits leaderboard component
 */
interface BitsLeaderboardProps {
  leaders: BitsLeader[];
}

const BitsLeaderboard: React.FC<BitsLeaderboardProps> = ({ leaders }) => {
  if (leaders.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay datos de bits
      </p>
    );
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700';
      case 2: return '#c0c0c0';
      case 3: return '#cd7f32';
      default: return '#71717a';
    }
  };

  return (
    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
      {leaders.map((leader) => (
        <div
          key={leader.rank}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              backgroundColor: `${getRankColor(leader.rank)}20`,
              color: getRankColor(leader.rank),
            }}
          >
            #{leader.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {leader.displayName}
            </p>
            <p className="text-xs text-amber-400 font-medium">
              💎 {leader.bits.toLocaleString()} bits
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Clips list component
 */
interface ClipsListProps {
  clips: Clip[];
}

const ClipsList: React.FC<ClipsListProps> = ({ clips }) => {
  if (clips.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay clips
      </p>
    );
  }

  return (
    <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-2">
      {clips.map((clip) => (
        <a
          key={clip.id}
          href={clip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors group"
        >
          <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
            {clip.thumbnailUrl && (
              <img
                src={clip.thumbnailUrl}
                alt={clip.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 text-white" />
            </div>
            <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded">
              {formatDuration(clip.duration)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
              {clip.title}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              por {clip.creatorName}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViews(clip.viewCount)}
              </span>
              <span>{formatDate(clip.createdAt)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

/**
 * Videos list component
 */
interface VideosListProps {
  videos: TwitchVideo[];
}

const VideosList: React.FC<VideosListProps> = ({ videos }) => {
  if (videos.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay videos
      </p>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'archive': return 'VOD';
      case 'highlight': return 'Highlight';
      case 'upload': return 'Upload';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'archive': return '#9147ff';
      case 'highlight': return '#f59e0b';
      case 'upload': return '#22c55e';
      default: return '#71717a';
    }
  };

  return (
    <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-2">
      {videos.map((video) => (
        <a
          key={video.id}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors group"
        >
          <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl.replace('%{width}', '320').replace('%{height}', '180')}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 text-white" />
            </div>
            <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded">
              {formatDuration(video.duration)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
              {video.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${getTypeColor(video.type)}20`,
                  color: getTypeColor(video.type),
                }}
              >
                {getTypeLabel(video.type)}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViews(video.viewCount)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {formatDate(video.createdAt)}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
};

/**
 * User list component (for mods, VIPs)
 */
interface UserListProps {
  users: Array<{ userId: string; username: string; displayName: string }>;
  icon: React.ReactNode;
  iconColor: string;
  emptyMessage: string;
}

const UserList: React.FC<UserListProps> = ({ users, icon, iconColor, emptyMessage }) => {
  if (users.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
      {users.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700/30 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <div style={{ color: iconColor }}>{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-zinc-500">@{user.username}</p>
          </div>
        </div>
      ))}
    </div>
  );
};



/**
 * Period selector component for bits
 */
interface PeriodSelectorProps {
  value: BitsPeriod;
  onChange: (period: BitsPeriod) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange }) => (
  <select
    id="bits-period-selector"
    name="bits-period"
    aria-label="Seleccionar período de bits"
    value={value}
    onChange={(e) => onChange(e.target.value as BitsPeriod)}
    className="text-xs bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
  >
    {BITS_PERIODS.map((period) => (
      <option key={period.value} value={period.value}>
        {period.label}
      </option>
    ))}
  </select>
);

/**
 * Date range selector component for clips
 */
interface DateRangeSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ selectedDays, onChange }) => (
  <div className="flex items-center gap-1">
    {CLIP_DATE_PRESETS.map((preset) => (
      <button
        key={preset.days}
        onClick={() => onChange(preset.days)}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          selectedDays === preset.days
            ? 'bg-blue-500 text-white'
            : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
        }`}
      >
        {preset.label}
      </button>
    ))}
  </div>
);

/**
 * No auth state component
 */
const NoAuthState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-zinc-500" />
    </div>
    <h3 className="text-sm font-medium text-zinc-300 mb-1">
      Autenticación requerida
    </h3>
    <p className="text-xs text-zinc-500 max-w-xs">
      Conecta tu cuenta de Twitch para acceder a los datos de la API.
      Necesitarás un token OAuth con los scopes apropiados.
    </p>
    <a
      href="https://twitchtokengenerator.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
    >
      Obtener token OAuth
      <ExternalLink className="w-4 h-4" />
    </a>
  </div>
);

/**
 * APIDataPanel component - displays Twitch API data in organized cards
 */
export const APIDataPanel: React.FC<APIDataPanelProps> = ({
  authToken,
  broadcasterId,
  channelName,
}) => {
  // State for expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(
    new Set(['followers', 'subscribers', 'bits'])
  );
  
  // State for bits period
  const [bitsPeriod, setBitsPeriod] = useState<BitsPeriod>('all');
  
  // State for clips date range (days)
  const [clipsDays, setClipsDays] = useState<number>(7);

  // Initialize API hook
  const api = useTwitchAPI(authToken || '');

  // Toggle card expansion
  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Fetch functions
  const fetchFollowers = useCallback(() => {
    if (broadcasterId) {
      api.fetchFollowers(broadcasterId, 100);
    }
  }, [api, broadcasterId]);

  const fetchSubscribers = useCallback(() => {
    if (broadcasterId) {
      api.fetchSubscribers(broadcasterId, 100);
    }
  }, [api, broadcasterId]);

  const fetchBits = useCallback(() => {
    if (broadcasterId) {
      api.fetchBitsLeaderboard(broadcasterId, bitsPeriod);
    }
  }, [api, broadcasterId, bitsPeriod]);

  const fetchClips = useCallback(() => {
    if (broadcasterId) {
      let startDate: string | undefined;
      if (clipsDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() - clipsDays);
        startDate = date.toISOString();
      }
      api.fetchClips(broadcasterId, startDate);
    }
  }, [api, broadcasterId, clipsDays]);

  const fetchVideos = useCallback(() => {
    if (broadcasterId) {
      api.fetchVideos(broadcasterId);
    }
  }, [api, broadcasterId]);

  const fetchModerators = useCallback(() => {
    if (broadcasterId) {
      api.fetchModerators(broadcasterId);
    }
  }, [api, broadcasterId]);

  const fetchVIPs = useCallback(() => {
    if (broadcasterId) {
      api.fetchVIPs(broadcasterId);
    }
  }, [api, broadcasterId]);

  // Fetch all data at once
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  
  const fetchAll = useCallback(async () => {
    if (!broadcasterId) return;
    setIsFetchingAll(true);
    
    // Execute all fetches in parallel
    await Promise.allSettled([
      fetchFollowers(),
      fetchSubscribers(),
      fetchBits(),
      fetchClips(),
      fetchVideos(),
      fetchModerators(),
      fetchVIPs(),
    ]);
    
    setIsFetchingAll(false);
  }, [fetchFollowers, fetchSubscribers, fetchBits, fetchClips, fetchVideos, fetchModerators, fetchVIPs, broadcasterId]);

  // Export functions
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportToJSON = useCallback((data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  }, [downloadBlob]);

  const exportAllToJSON = useCallback(() => {
    const allData = {
      followers: api.followers.data || [],
      subscribers: api.subscribers.data || [],
      bitsLeaderboard: api.bitsLeaderboard.data || [],
      clips: api.clips.data || [],
      videos: api.videos.data || [],
      moderators: api.moderators.data || [],
      vips: api.vips.data || [],
      exportedAt: new Date().toISOString(),
      channel: channelName,
    };
    exportToJSON(allData, `twitch-data-${channelName || 'export'}`);
  }, [api, channelName, exportToJSON]);

  // Individual download handlers
  const downloadFollowers = useCallback(() => {
    if (api.followers.data) exportToJSON(api.followers.data, `followers-${channelName || 'export'}`);
  }, [api.followers.data, channelName, exportToJSON]);

  const downloadSubscribers = useCallback(() => {
    if (api.subscribers.data) exportToJSON(api.subscribers.data, `subscribers-${channelName || 'export'}`);
  }, [api.subscribers.data, channelName, exportToJSON]);

  const downloadBits = useCallback(() => {
    if (api.bitsLeaderboard.data) exportToJSON(api.bitsLeaderboard.data, `bits-${channelName || 'export'}`);
  }, [api.bitsLeaderboard.data, channelName, exportToJSON]);

  const downloadClips = useCallback(() => {
    if (api.clips.data) exportToJSON(api.clips.data, `clips-${channelName || 'export'}`);
  }, [api.clips.data, channelName, exportToJSON]);

  const downloadVideos = useCallback(() => {
    if (api.videos.data) exportToJSON(api.videos.data, `videos-${channelName || 'export'}`);
  }, [api.videos.data, channelName, exportToJSON]);

  const downloadModerators = useCallback(() => {
    if (api.moderators.data) exportToJSON(api.moderators.data, `moderators-${channelName || 'export'}`);
  }, [api.moderators.data, channelName, exportToJSON]);

  const downloadVIPs = useCallback(() => {
    if (api.vips.data) exportToJSON(api.vips.data, `vips-${channelName || 'export'}`);
  }, [api.vips.data, channelName, exportToJSON]);

  // Refetch bits when period changes
  useEffect(() => {
    if (broadcasterId && authToken) {
      fetchBits();
    }
  }, [bitsPeriod]);

  // Refetch clips when date range changes
  useEffect(() => {
    if (broadcasterId && authToken) {
      fetchClips();
    }
  }, [clipsDays]);

  // Show no auth state if no token
  if (!authToken) {
    return <NoAuthState />;
  }

  // Show message if no broadcaster ID
  if (!broadcasterId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">
          Canal no configurado
        </h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Conecta a un canal de Twitch para ver los datos de la API.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with actions - sticky */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-3 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700/50">
        {/* Channel name */}
        {channelName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Canal:</span>
            <span className="text-sm font-medium text-white">{channelName}</span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Fetch all button */}
          <button
            onClick={fetchAll}
            disabled={isFetchingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            title="Cargar todos los datos"
          >
            {isFetchingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
            <span>{isFetchingAll ? 'Cargando...' : 'Cargar todos'}</span>
          </button>
          
          {/* Export all button */}
          <button
            onClick={exportAllToJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
            title="Exportar todos los datos como JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Content area - no internal scroll, flows with parent */}
      <div className="p-3 pb-6">
        {/* Grid of data cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-min">
        {/* Followers */}
        <DataCard
          title="Seguidores recientes"
          icon={<UserPlus className="w-4 h-4" />}
          color="#22c55e"
          loading={api.followers.loading}
          error={api.followers.error}
          onRefresh={fetchFollowers}
          onRetry={fetchFollowers}
          onDownload={downloadFollowers}
          scopeInfo={SCOPE_INFO.followers}
          count={api.followers.data?.length}
          expanded={expandedCards.has('followers')}
          onToggleExpand={() => toggleCard('followers')}
        >
          <FollowersList followers={api.followers.data || []} />
        </DataCard>

        {/* Subscribers */}
        <DataCard
          title="Suscriptores"
          icon={<Star className="w-4 h-4" />}
          color="#a855f7"
          loading={api.subscribers.loading}
          error={api.subscribers.error}
          onRefresh={fetchSubscribers}
          onRetry={fetchSubscribers}
          onDownload={downloadSubscribers}
          scopeInfo={SCOPE_INFO.subscribers}
          count={api.subscribers.data?.length}
          expanded={expandedCards.has('subscribers')}
          onToggleExpand={() => toggleCard('subscribers')}
        >
          <SubscribersList subscribers={api.subscribers.data || []} />
        </DataCard>

        {/* Bits Leaderboard */}
        <DataCard
          title="Leaderboard de Bits"
          icon={<Coins className="w-4 h-4" />}
          color="#f59e0b"
          loading={api.bitsLeaderboard.loading}
          error={api.bitsLeaderboard.error}
          onRefresh={fetchBits}
          onRetry={fetchBits}
          onDownload={downloadBits}
          scopeInfo={SCOPE_INFO.bits}
          count={api.bitsLeaderboard.data?.length}
          expanded={expandedCards.has('bits')}
          onToggleExpand={() => toggleCard('bits')}
          headerExtra={
            <PeriodSelector value={bitsPeriod} onChange={setBitsPeriod} />
          }
        >
          <BitsLeaderboard leaders={api.bitsLeaderboard.data || []} />
        </DataCard>

        {/* Clips */}
        <DataCard
          title="Clips"
          icon={<Film className="w-4 h-4" />}
          color="#3b82f6"
          loading={api.clips.loading}
          error={api.clips.error}
          onRefresh={fetchClips}
          onRetry={fetchClips}
          onDownload={downloadClips}
          count={api.clips.data?.length}
          expanded={expandedCards.has('clips')}
          onToggleExpand={() => toggleCard('clips')}
        >
          <div className="space-y-3">
            <DateRangeSelector selectedDays={clipsDays} onChange={setClipsDays} />
            <ClipsList clips={api.clips.data || []} />
          </div>
        </DataCard>

        {/* Videos */}
        <DataCard
          title="Videos / VODs"
          icon={<Video className="w-4 h-4" />}
          color="#9147ff"
          loading={api.videos.loading}
          error={api.videos.error}
          onRefresh={fetchVideos}
          onRetry={fetchVideos}
          onDownload={downloadVideos}
          count={api.videos.data?.length}
          expanded={expandedCards.has('videos')}
          onToggleExpand={() => toggleCard('videos')}
        >
          <VideosList videos={api.videos.data || []} />
        </DataCard>

        {/* Moderators */}
        <DataCard
          title="Moderadores"
          icon={<Shield className="w-4 h-4" />}
          color="#22c55e"
          loading={api.moderators.loading}
          error={api.moderators.error}
          onRefresh={fetchModerators}
          onRetry={fetchModerators}
          onDownload={downloadModerators}
          scopeInfo={SCOPE_INFO.moderators}
          count={api.moderators.data?.length}
          expanded={expandedCards.has('moderators')}
          onToggleExpand={() => toggleCard('moderators')}
        >
          <UserList
            users={api.moderators.data || []}
            icon={<Shield className="w-4 h-4" />}
            iconColor="#22c55e"
            emptyMessage="No hay moderadores"
          />
        </DataCard>

        {/* VIPs */}
        <DataCard
          title="VIPs"
          icon={<Crown className="w-4 h-4" />}
          color="#ec4899"
          loading={api.vips.loading}
          error={api.vips.error}
          onRefresh={fetchVIPs}
          onRetry={fetchVIPs}
          onDownload={downloadVIPs}
          scopeInfo={SCOPE_INFO.vips}
          count={api.vips.data?.length}
          expanded={expandedCards.has('vips')}
          onToggleExpand={() => toggleCard('vips')}
        >
          <UserList
            users={api.vips.data || []}
            icon={<Crown className="w-4 h-4" />}
            iconColor="#ec4899"
            emptyMessage="No hay VIPs"
          />
        </DataCard>
        </div>
      </div>
    </div>
  );
};

export default APIDataPanel;
