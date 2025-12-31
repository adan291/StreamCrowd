/**
 * ViewerPanel - Subcomponente para gestionar y mostrar viewers/chatters
 * 
 * Muestra viewers con tabs "En vivo" / "Historial", búsqueda con debounce,
 * ordenamiento, y cards con badges visuales compactas.
 * 
 * @requirements 5.1 - Cards compactas con menos padding
 * @requirements 5.2 - Badges como iconos sin texto
 * @requirements 5.3 - Info adicional en tooltips
 * @requirements 5.4 - Búsqueda con diseño minimal
 * @requirements 5.5 - Sort integrado en área de búsqueda
 * @requirements 7.1 - Separar tabs "En vivo" y "Historial"
 * @requirements 7.3 - Badges visuales para estado del viewer
 * @requirements 7.5 - Búsqueda con debounce
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  User,
  Users,
  Search,
  ChevronRight,
  Star,
  Crown,
  Shield,
  Ban,
  Clock,
  Coins,
  Gift,
  Activity,
  RefreshCw,
  Loader2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import type { ViewerData, ViewerSortBy } from '../../src/application/services/ViewerService';
import type { Chatter } from '../../src/application/services/TwitchAPIService';

/**
 * Props for the ViewerPanel component
 */
export interface ViewerPanelProps {
  /** Aggregated viewer data from history */
  viewers: ViewerData[];
  /** Live chatters currently in the channel */
  liveChatters: Chatter[];
  /** Currently selected viewer username */
  selectedViewer: string | null;
  /** Callback when a viewer is selected */
  onSelectViewer: (username: string | null) => void;
  /** Callback when moderation action is requested */
  onModerationAction?: (action: ModerationAction) => void;
  /** OAuth token for API calls */
  authToken?: string;
  /** Whether chatters are currently loading */
  loadingChatters?: boolean;
  /** Error message for chatters loading */
  chattersError?: string | null;
  /** Callback to refresh chatters */
  onRefreshChatters?: () => void;
  /** Set of moderator usernames */
  moderators?: Set<string>;
  /** Set of VIP usernames */
  vips?: Set<string>;
  /** Compact mode - reduces card sizes */
  compact?: boolean;
}

/**
 * Moderation action types
 */
export interface ModerationAction {
  type: 'timeout' | 'ban' | 'unban' | 'vip' | 'unvip' | 'openDrawer';
  userId: string;
  username: string;
  displayName?: string;
  duration?: number;
  reason?: string;
}

/**
 * Tab type for viewer panel
 */
type ViewerTab = 'live' | 'history';

/**
 * Sort options configuration
 */
const SORT_OPTIONS: { value: ViewerSortBy; label: string; icon: React.ReactNode }[] = [
  { value: 'activity', label: 'Actividad', icon: <Activity size={12} /> },
  { value: 'bits', label: 'Bits', icon: <Coins size={12} /> },
  { value: 'subs', label: 'Subs', icon: <Star size={12} /> },
  { value: 'bans', label: 'Sanciones', icon: <Ban size={12} /> },
];

/**
 * Debounce delay for search input (ms)
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Custom hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}


/**
 * Viewer badge component - Compact icon-only design
 * @requirements 5.2 - Badges as small icons only (no text labels)
 */
interface ViewerBadgeProps {
  type: 'sub' | 'vip' | 'mod' | 'ban' | 'timeout';
  tier?: string;
  count?: number;
  showLabel?: boolean; // For tooltip display
}

const ViewerBadge: React.FC<ViewerBadgeProps> = ({ type, tier, count, showLabel = false }) => {
  const badges: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    sub: {
      icon: <Star size={10} />,
      color: tier === '3000' ? '#ffd700' : tier === '2000' ? '#00f0f0' : '#a855f7',
      bg: tier === '3000' ? 'bg-yellow-500/20' : tier === '2000' ? 'bg-cyan-500/20' : 'bg-purple-500/20',
      label: tier === '3000' ? 'Tier 3' : tier === '2000' ? 'Tier 2' : 'Sub',
    },
    vip: {
      icon: <Crown size={10} />,
      color: '#ec4899',
      bg: 'bg-pink-500/20',
      label: 'VIP',
    },
    mod: {
      icon: <Shield size={10} />,
      color: '#22c55e',
      bg: 'bg-green-500/20',
      label: 'Moderador',
    },
    ban: {
      icon: <Ban size={10} />,
      color: '#ef4444',
      bg: 'bg-red-500/20',
      label: count && count > 1 ? `${count} bans` : 'Ban',
    },
    timeout: {
      icon: <Clock size={10} />,
      color: '#f97316',
      bg: 'bg-orange-500/20',
      label: count && count > 1 ? `${count} timeouts` : 'Timeout',
    },
  };

  const badge = badges[type];
  if (!badge) return null;

  // Icon-only compact badge (default)
  if (!showLabel) {
    return (
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded ${badge.bg}`}
        style={{ color: badge.color }}
        title={badge.label}
      >
        {badge.icon}
      </span>
    );
  }

  // Full badge with label (for tooltips)
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${badge.bg}`}
      style={{ color: badge.color }}
    >
      {badge.icon}
      <span>{badge.label}</span>
    </span>
  );
};

/**
 * Viewer tooltip content component
 * @requirements 5.3 - Show additional info in tooltip on hover
 */
interface ViewerTooltipContentProps {
  displayName: string;
  username: string;
  activityData?: ViewerData | null;
  isMod?: boolean;
  isVip?: boolean;
  isOnline?: boolean;
}

const ViewerTooltipContent: React.FC<ViewerTooltipContentProps> = ({
  displayName,
  username,
  activityData,
  isMod,
  isVip,
  isOnline,
}) => (
  <div className="text-left space-y-1.5">
    <div className="font-bold text-zinc-200">{displayName || username}</div>
    {displayName && displayName !== username && (
      <div className="text-[10px] text-zinc-500">@{username}</div>
    )}
    
    {/* Status badges with labels */}
    <div className="flex flex-wrap gap-1">
      {isOnline && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/20 text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          En el chat
        </span>
      )}
      {isMod && <ViewerBadge type="mod" showLabel />}
      {isVip && <ViewerBadge type="vip" showLabel />}
      {activityData?.currentTier && <ViewerBadge type="sub" tier={activityData.currentTier} showLabel />}
    </div>
    
    {/* Activity stats */}
    {activityData && (
      <div className="pt-1 border-t border-zinc-700/50 space-y-0.5 text-[10px]">
        <div className="text-zinc-400">{activityData.totalActivity} eventos totales</div>
        {activityData.totalBits > 0 && (
          <div className="text-amber-400">{activityData.totalBits.toLocaleString()} bits</div>
        )}
        {activityData.giftsGiven > 0 && (
          <div className="text-pink-400">{activityData.giftsGiven} subs regalados</div>
        )}
        {activityData.totalSubMonths > 0 && (
          <div className="text-purple-400">{activityData.totalSubMonths} meses de sub</div>
        )}
        {(activityData.bans > 0 || activityData.timeouts > 0) && (
          <div className="text-red-400">
            {activityData.bans > 0 && `${activityData.bans} bans`}
            {activityData.bans > 0 && activityData.timeouts > 0 && ', '}
            {activityData.timeouts > 0 && `${activityData.timeouts} timeouts`}
          </div>
        )}
      </div>
    )}
  </div>
);

/**
 * Live chatter card component - Compact design
 * @requirements 5.1 - Compact card design with less padding
 * @requirements 5.2 - Badges as small icons only
 * @requirements 5.3 - Additional info in tooltip on hover
 */
interface ChatterCardProps {
  chatter: Chatter;
  activityData?: ViewerData | null;
  isMod?: boolean;
  isVip?: boolean;
  onSelect: () => void;
  onModAction?: (action: ModerationAction) => void;
  showModActions?: boolean;
}

const ChatterCard: React.FC<ChatterCardProps> = ({
  chatter,
  activityData,
  isMod,
  isVip,
  onSelect,
  onModAction,
  showModActions = false,
}) => {
  return (
    <div
      className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-zinc-800/30 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 card-hover-transition cursor-pointer group relative animate-viewer-enter"
      onClick={onSelect}
    >
      {/* Avatar - smaller */}
      <div className="w-6 h-6 rounded-full bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
        <User className="w-3 h-3 text-zinc-400" />
      </div>

      {/* Info - compact */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className="font-medium text-[11px] text-zinc-200 truncate">
          {chatter.displayName || chatter.username}
        </span>
        {/* Online indicator */}
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        {/* Compact icon-only badges */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isMod && <ViewerBadge type="mod" />}
          {isVip && <ViewerBadge type="vip" />}
          {activityData?.currentTier && <ViewerBadge type="sub" tier={activityData.currentTier} />}
          {activityData && activityData.bans > 0 && <ViewerBadge type="ban" count={activityData.bans} />}
        </div>
      </div>

      {/* Quick mod actions (visible on hover) */}
      {showModActions && onModAction && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onModAction({
                type: 'timeout',
                userId: chatter.userId,
                username: chatter.username,
                displayName: chatter.displayName,
                duration: 300,
              });
            }}
            className="p-0.5 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400"
            title="Timeout 5m"
          >
            <Clock className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onModAction({
                type: 'openDrawer',
                userId: chatter.userId,
                username: chatter.username,
                displayName: chatter.displayName,
              });
            }}
            className="p-0.5 rounded bg-zinc-600/50 hover:bg-zinc-600 text-zinc-300"
            title="Más opciones"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      )}

      <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 card-hover-transition" />

      {/* Tooltip on hover with smooth animation */}
      <div className="absolute left-full ml-2 top-0 z-50 opacity-0 group-hover:opacity-100 pointer-events-none card-hover-transition delay-300">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[160px] animate-tooltip">
          <ViewerTooltipContent
            displayName={chatter.displayName}
            username={chatter.username}
            activityData={activityData}
            isMod={isMod}
            isVip={isVip}
            isOnline={true}
          />
        </div>
      </div>
    </div>
  );
};


/**
 * History viewer card component - Compact design
 * @requirements 5.1 - Compact card design with less padding
 * @requirements 5.2 - Badges as small icons only
 * @requirements 5.3 - Additional info in tooltip on hover
 */
interface ViewerCardProps {
  viewer: ViewerData;
  isOnline?: boolean;
  isMod?: boolean;
  isVip?: boolean;
  onSelect: () => void;
}

const ViewerCard: React.FC<ViewerCardProps> = ({
  viewer,
  isOnline,
  isMod,
  isVip,
  onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-zinc-800/30 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 card-hover-transition text-left group relative animate-viewer-enter"
    >
      {/* Avatar - smaller */}
      <div className="w-6 h-6 rounded-full bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
        <User className="w-3 h-3 text-zinc-400" />
      </div>

      {/* Info - compact single line */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className="font-medium text-[11px] text-zinc-200 truncate">
          {viewer.displayName || viewer.username}
        </span>
        {/* Online indicator */}
        {isOnline && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        )}
        {/* Compact icon-only badges */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isMod && <ViewerBadge type="mod" />}
          {isVip && <ViewerBadge type="vip" />}
          {viewer.currentTier && <ViewerBadge type="sub" tier={viewer.currentTier} />}
          {viewer.bans > 0 && <ViewerBadge type="ban" count={viewer.bans} />}
          {viewer.timeouts > 0 && <ViewerBadge type="timeout" count={viewer.timeouts} />}
        </div>
      </div>

      {/* Mini stats indicators */}
      <div className="flex items-center gap-1 text-[9px] text-zinc-500 flex-shrink-0">
        {viewer.totalBits > 0 && (
          <span className="text-amber-400/70" title={`${viewer.totalBits.toLocaleString()} bits`}>
            <Coins className="w-3 h-3" />
          </span>
        )}
        {viewer.giftsGiven > 0 && (
          <span className="text-pink-400/70" title={`${viewer.giftsGiven} gifts`}>
            <Gift className="w-3 h-3" />
          </span>
        )}
      </div>

      <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 card-hover-transition" />

      {/* Tooltip on hover with smooth animation */}
      <div className="absolute left-full ml-2 top-0 z-50 opacity-0 group-hover:opacity-100 pointer-events-none card-hover-transition delay-300">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[160px] animate-tooltip">
          <ViewerTooltipContent
            displayName={viewer.displayName || viewer.username}
            username={viewer.username}
            activityData={viewer}
            isMod={isMod}
            isVip={isVip}
            isOnline={isOnline}
          />
        </div>
      </div>
    </button>
  );
};

/**
 * Empty state component
 */
interface EmptyStateProps {
  type: 'live' | 'history';
}

const EmptyState: React.FC<EmptyStateProps> = ({ type }) => (
  <div className="text-center py-8 text-zinc-500">
    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
    <p className="text-xs">
      {type === 'live' ? 'No hay usuarios en el chat' : 'No hay datos de usuarios'}
    </p>
    <p className="text-[10px] mt-1">
      {type === 'live'
        ? 'Actualiza para ver los chatters actuales'
        : 'Los usuarios aparecerán cuando haya actividad'}
    </p>
  </div>
);


/**
 * ViewerPanel component - displays and manages viewers/chatters
 */
export const ViewerPanel: React.FC<ViewerPanelProps> = ({
  viewers,
  liveChatters,
  selectedViewer,
  onSelectViewer,
  onModerationAction,
  authToken,
  loadingChatters = false,
  chattersError,
  onRefreshChatters,
  moderators = new Set(),
  vips = new Set(),
  compact = false,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<ViewerTab>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ViewerSortBy>('activity');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Refs
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort viewers based on search and sort criteria
  const filteredViewers = useMemo(() => {
    let result = [...viewers];

    // Apply search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(v => 
        v.username.toLowerCase().includes(search) ||
        (v.displayName && v.displayName.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'bits':
        result.sort((a, b) => b.totalBits - a.totalBits);
        break;
      case 'subs':
        result.sort((a, b) => 
          (b.totalSubMonths + b.subs + b.resubs) - (a.totalSubMonths + a.subs + a.resubs)
        );
        break;
      case 'bans':
        result.sort((a, b) => (b.bans + b.timeouts) - (a.bans + a.timeouts));
        break;
      case 'activity':
      default:
        result.sort((a, b) => b.totalActivity - a.totalActivity);
        break;
    }

    return result;
  }, [viewers, debouncedSearch, sortBy]);

  // Filter chatters based on search
  const filteredChatters = useMemo(() => {
    if (!debouncedSearch) return liveChatters;
    
    const search = debouncedSearch.toLowerCase();
    return liveChatters.filter(c =>
      c.username.toLowerCase().includes(search) ||
      c.displayName.toLowerCase().includes(search)
    );
  }, [liveChatters, debouncedSearch]);

  // Get viewer data for a chatter
  const getViewerData = useCallback((username: string): ViewerData | null => {
    return viewers.find(v => v.username.toLowerCase() === username.toLowerCase()) || null;
  }, [viewers]);

  // Check if a user is online
  const isUserOnline = useCallback((username: string): boolean => {
    return liveChatters.some(c => c.username.toLowerCase() === username.toLowerCase());
  }, [liveChatters]);

  // Check if user is mod/vip
  const isMod = useCallback((username: string): boolean => {
    return moderators.has(username.toLowerCase());
  }, [moderators]);

  const isVip = useCallback((username: string): boolean => {
    return vips.has(username.toLowerCase());
  }, [vips]);

  // Handle viewer selection
  const handleSelectViewer = useCallback((username: string) => {
    onSelectViewer(username);
  }, [onSelectViewer]);

  // Current sort option
  const currentSortOption = SORT_OPTIONS.find(o => o.value === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-zinc-700/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'live'
                ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-400" />
            En vivo
            {liveChatters.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
                {liveChatters.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Activity size={14} />
            Historial
            {viewers.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
                {viewers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and sort controls - Integrated design */}
      {/* @requirements 5.4 - Cleaner, more minimal search input design */}
      {/* @requirements 5.5 - Sort dropdown integrated into search bar area */}
      <div className="flex-shrink-0 px-2 py-1.5 border-b border-zinc-700/30">
        {/* Search input with integrated sort */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              id="viewer-search"
              name="viewer-search"
              aria-label="Buscar usuarios"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-7 pr-6 py-1.5 text-[11px] bg-zinc-800/30 border border-zinc-700/50 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-800/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort dropdown - integrated (only for history tab) */}
          {activeTab === 'history' && (
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] bg-zinc-800/30 border border-zinc-700/50 rounded-md text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                title={`Ordenar por: ${currentSortOption.label}`}
              >
                {currentSortOption.icon}
                <ChevronDown size={10} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] transition-colors ${
                        sortBy === option.value
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300'
                      }`}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh button for live tab */}
          {activeTab === 'live' && onRefreshChatters && (
            <button
              onClick={onRefreshChatters}
              disabled={loadingChatters}
              className="flex items-center justify-center w-7 h-7 bg-green-500/10 border border-green-500/30 rounded-md text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
              title="Actualizar chatters"
            >
              {loadingChatters ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          )}
        </div>

        {/* Count indicator */}
        <div className="flex items-center justify-end mt-1">
          <span className="text-[9px] text-zinc-500">
            {activeTab === 'live' 
              ? `${filteredChatters.length} en el chat`
              : `${filteredViewers.length} usuarios`
            }
          </span>
        </div>
      </div>

      {/* Error message */}
      {chattersError && activeTab === 'live' && (
        <div className="flex-shrink-0 mx-2 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-[10px] text-red-400">{chattersError}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {activeTab === 'live' ? (
          // Live chatters list
          loadingChatters ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : filteredChatters.length === 0 ? (
            <EmptyState type="live" />
          ) : (
            filteredChatters.map((chatter) => (
              <ChatterCard
                key={chatter.userId}
                chatter={chatter}
                activityData={getViewerData(chatter.username)}
                isMod={isMod(chatter.username)}
                isVip={isVip(chatter.username)}
                onSelect={() => handleSelectViewer(chatter.username)}
                onModAction={onModerationAction}
                showModActions={!!authToken}
              />
            ))
          )
        ) : (
          // History viewers list
          filteredViewers.length === 0 ? (
            <EmptyState type="history" />
          ) : (
            filteredViewers.slice(0, 100).map((viewer) => (
              <ViewerCard
                key={viewer.username}
                viewer={viewer}
                isOnline={isUserOnline(viewer.username)}
                isMod={isMod(viewer.username)}
                isVip={isVip(viewer.username)}
                onSelect={() => handleSelectViewer(viewer.username)}
              />
            ))
          )
        )}

        {/* Show count if truncated */}
        {activeTab === 'history' && filteredViewers.length > 100 && (
          <p className="text-center text-[10px] text-zinc-500 py-2">
            Mostrando 100 de {filteredViewers.length} usuarios
          </p>
        )}
      </div>
    </div>
  );
};

export default ViewerPanel;
