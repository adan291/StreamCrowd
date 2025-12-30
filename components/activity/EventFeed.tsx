/**
 * EventFeed - Subcomponente para mostrar el feed de eventos en tiempo real
 * 
 * Muestra eventos del stream con agrupación visual, filtros como chips,
 * animaciones suaves, auto-scroll con pausa, y estado vacío amigable.
 * 
 * @requirements 5.1 - Agrupar eventos similares visualmente
 * @requirements 5.2 - Animaciones de entrada suaves
 * @requirements 5.3 - Filtros como chips horizontales scrolleables
 * @requirements 5.4 - Estado vacío con ilustración
 * @requirements 5.5 - Auto-scroll con botón de pausa
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Activity,
  UserPlus,
  Star,
  Gift,
  RefreshCw,
  Vote,
  Users,
  Coins,
  Ban,
  Clock,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
  Inbox,
  Filter,
} from 'lucide-react';
import { EVENT_COLORS, getEventColor, getEventTint } from '../../src/application/utils/uiColors';
import { formatRelativeTime } from '../../src/application/utils/timeFormat';
import {
  groupEvents,
  getGroupDisplayText,
  type ActivityEventType,
  type ActivityStreamEvent,
  type EventGroup,
  type EventGroupingConfig,
} from '../../src/application/utils/eventGrouping';

/**
 * Poll option interface for vote events
 */
export interface PollOption {
  id: number;
  label: string;
  color: string;
  icon?: string;
}

/**
 * Props for the EventFeed component
 */
export interface EventFeedProps {
  /** Array of stream events to display */
  events: ActivityStreamEvent[];
  /** Poll options for vote events (optional) */
  pollOptions?: Record<number, PollOption>;
  /** Currently active filters */
  filters: Set<ActivityEventType>;
  /** Callback when filters change */
  onFilterChange: (filters: Set<ActivityEventType>) => void;
  /** Time window for grouping events in ms (default: 120000 = 2 min) */
  groupingWindowMs?: number;
  /** Minimum events to form a group (default: 2) */
  minGroupSize?: number;
  /** Compact mode - reduces card height by 30% and collapses filters to icon-only */
  compact?: boolean;
}

/**
 * Filter chip configuration
 */
interface FilterChip {
  type: ActivityEventType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * Available filter chips
 */
const FILTER_CHIPS: FilterChip[] = [
  { type: 'follow', label: 'Follows', icon: <UserPlus size={14} />, color: EVENT_COLORS.follow },
  { type: 'sub', label: 'Subs', icon: <Star size={14} />, color: EVENT_COLORS.sub },
  { type: 'resub', label: 'Resubs', icon: <RefreshCw size={14} />, color: EVENT_COLORS.resub },
  { type: 'gift', label: 'Gifts', icon: <Gift size={14} />, color: EVENT_COLORS.gift },
  { type: 'raid', label: 'Raids', icon: <Users size={14} />, color: EVENT_COLORS.raid },
  { type: 'bits', label: 'Bits', icon: <Coins size={14} />, color: EVENT_COLORS.bits },
  { type: 'vote', label: 'Votos', icon: <Vote size={14} />, color: EVENT_COLORS.vote },
  { type: 'ban', label: 'Bans', icon: <Ban size={14} />, color: EVENT_COLORS.ban },
  { type: 'timeout', label: 'Timeouts', icon: <Clock size={14} />, color: EVENT_COLORS.timeout },
];

/**
 * Get tier name from tier code
 */
const getTierName = (tier: string): string => {
  switch (tier) {
    case '1000': return 'Tier 1';
    case '2000': return 'Tier 2';
    case '3000': return 'Tier 3';
    default: return 'Tier 1';
  }
};

/**
 * Get tier color from tier code
 */
const getTierColor = (tier: string): string => {
  switch (tier) {
    case '1000': return '#a970ff';
    case '2000': return '#00f0f0';
    case '3000': return '#ffd700';
    default: return '#a970ff';
  }
};

/**
 * Render icon for event type
 */
const renderEventIcon = (type: ActivityEventType): React.ReactNode => {
  switch (type) {
    case 'follow': return <UserPlus className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.follow }} />;
    case 'sub': return <Star className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.sub }} />;
    case 'resub': return <RefreshCw className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.resub }} />;
    case 'gift': return <Gift className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.gift }} />;
    case 'raid': return <Users className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.raid }} />;
    case 'bits': return <Coins className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.bits }} />;
    case 'vote': return <Vote className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.vote }} />;
    case 'ban': return <Ban className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.ban }} />;
    case 'timeout': return <Clock className="w-3.5 h-3.5" style={{ color: EVENT_COLORS.timeout }} />;
    default: return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  }
};

/**
 * Format duration in seconds to human readable
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

/**
 * Render badge for a single event
 * 
 * @requirements 3.4 - Smaller, more subtle badges (max height 16px)
 */
const renderEventBadge = (
  event: ActivityStreamEvent,
  pollOptions?: Record<number, PollOption>
): React.ReactNode => {
  // Common badge styles for max 16px height
  const badgeClass = "inline-flex items-center h-4 px-1.5 rounded text-[9px] font-semibold leading-none whitespace-nowrap";
  
  switch (event.type) {
    case 'follow':
      return (
        <span 
          className={badgeClass}
          style={{ backgroundColor: `${EVENT_COLORS.follow}15`, color: EVENT_COLORS.follow }}
        >
          FOLLOW
        </span>
      );
    case 'sub':
      const subTier = event.data?.tier || '1000';
      return (
        <span 
          className={badgeClass}
          style={{ 
            backgroundColor: `${getTierColor(subTier)}15`,
            color: getTierColor(subTier)
          }}
        >
          {getTierName(subTier)}
        </span>
      );
    case 'resub':
      const resubTier = event.data?.tier || '1000';
      return (
        <span 
          className={badgeClass}
          style={{ 
            backgroundColor: `${getTierColor(resubTier)}15`,
            color: getTierColor(resubTier)
          }}
        >
          x{event.data?.months || 1}
        </span>
      );
    case 'gift':
      const giftTier = event.data?.tier || '1000';
      const isIndividualGift = !!event.data?.recipientUsername;
      return (
        <span 
          className={badgeClass}
          style={{ 
            backgroundColor: `${getTierColor(giftTier)}15`,
            color: getTierColor(giftTier)
          }}
        >
          🎁 {isIndividualGift ? event.data?.recipientUsername : `x${event.data?.giftCount || 1}`}
        </span>
      );
    case 'raid':
      return (
        <span 
          className={badgeClass}
          style={{ backgroundColor: `${EVENT_COLORS.raid}15`, color: EVENT_COLORS.raid }}
        >
          {event.data?.viewerCount ? `${event.data.viewerCount} viewers` : 'RAID'}
        </span>
      );
    case 'bits':
      const bitsAmount = event.data?.amount || event.data?.bits || 0;
      return (
        <span 
          className={badgeClass}
          style={{ backgroundColor: `${EVENT_COLORS.bits}15`, color: EVENT_COLORS.bits }}
        >
          💎 {bitsAmount}
        </span>
      );
    case 'vote':
      const option = pollOptions?.[event.data?.optionId || 0];
      return (
        <span 
          className={`${badgeClass} text-zinc-900`}
          style={{ backgroundColor: option?.color || '#eee' }}
        >
          {option?.icon} +{event.data?.optionId}
        </span>
      );
    case 'ban':
      return (
        <span 
          className={badgeClass}
          style={{ backgroundColor: `${EVENT_COLORS.ban}15`, color: EVENT_COLORS.ban }}
        >
          🚫 BAN
        </span>
      );
    case 'timeout':
      return (
        <span 
          className={badgeClass}
          style={{ backgroundColor: `${EVENT_COLORS.timeout}15`, color: EVENT_COLORS.timeout }}
        >
          ⏱️ {formatDuration(event.data?.duration || 0)}
        </span>
      );
    default:
      return null;
  }
};


/**
 * Single event item component - Compact design
 * 
 * @requirements 3.1 - More whitespace and padding between elements
 * @requirements 3.2 - Username and badge on a single line without wrapping
 * @requirements 3.3 - Relative time format ("hace 2m")
 * @requirements 3.4 - Smaller, more subtle badges (max height 16px)
 * @requirements 7.3 - Event_Card height reduces by 30% in compact mode
 * @requirements 8.1 - Fade-slide animation for new events (200ms)
 */
interface EventItemProps {
  event: ActivityStreamEvent;
  pollOptions?: Record<number, PollOption>;
  isNew?: boolean;
  compact?: boolean;
}

const EventItem: React.FC<EventItemProps> = ({ event, pollOptions, isNew = false, compact = false }) => {
  return (
    <div 
      className={`flex items-center gap-2.5 rounded-lg border card-hover-transition ${
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
      } ${
        isNew 
          ? 'animate-event-enter bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm' 
          : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
      }`}
    >
      {/* Event icon - compact size */}
      <div 
        className={`flex-shrink-0 rounded-full flex items-center justify-center ${
          compact ? 'w-5 h-5' : 'w-6 h-6'
        }`}
        style={{ backgroundColor: `${EVENT_COLORS[event.type] || '#888'}10` }}
      >
        {renderEventIcon(event.type)}
      </div>
      
      {/* Content - single line layout */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Username + Badge on same line */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`font-semibold text-zinc-800 dark:text-zinc-200 truncate ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}>
            {event.displayName || event.username}
          </span>
          {renderEventBadge(event, pollOptions)}
        </div>
        
        {/* Relative timestamp - right aligned */}
        <span className={`flex-shrink-0 text-zinc-400 dark:text-zinc-500 ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}>
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
};

/**
 * Grouped event item component - Compact design
 * 
 * @requirements 3.5 - Grouped header visually distinct but not overpowering
 * @requirements 7.3 - Event_Card height reduces by 30% in compact mode
 * @requirements 8.1 - Fade-slide animation for new events (200ms)
 * @requirements 8.3 - Smooth expand/collapse animation (150ms ease-out)
 */
interface GroupedEventItemProps {
  group: EventGroup;
  pollOptions?: Record<number, PollOption>;
  isNew?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
}

const GroupedEventItem: React.FC<GroupedEventItemProps> = ({ 
  group, 
  pollOptions, 
  isNew = false,
  expanded = false,
  onToggleExpand,
  compact = false,
}) => {
  const displayText = getGroupDisplayText(group);
  const color = EVENT_COLORS[group.type] || '#888';

  return (
    <div 
      className={`rounded-lg border card-hover-transition ${
        isNew 
          ? 'animate-event-enter bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm' 
          : 'bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-700/30'
      }`}
    >
      {/* Group header - subtle and compact */}
      <button
        onClick={onToggleExpand}
        className={`w-full flex items-center gap-2.5 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/20 rounded-lg card-hover-transition ${
          compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
        }`}
      >
        {/* Icon with subtle tint */}
        <div 
          className={`flex-shrink-0 rounded-full flex items-center justify-center ${
            compact ? 'w-5 h-5' : 'w-6 h-6'
          }`}
          style={{ backgroundColor: `${color}10` }}
        >
          {renderEventIcon(group.type)}
        </div>
        
        {/* Group info - single line */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span 
            className={`inline-flex items-center px-1.5 rounded font-semibold leading-none ${
              compact ? 'h-3.5 text-[8px]' : 'h-4 text-[9px]'
            }`}
            style={{ backgroundColor: `${color}12`, color }}
          >
            {displayText}
          </span>
          
          {/* Time range - subtle */}
          <span className={`text-zinc-400 dark:text-zinc-500 ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}>
            {formatRelativeTime(group.startTime)}
          </span>
        </div>

        <ChevronDown 
          className={`flex-shrink-0 w-3.5 h-3.5 text-zinc-400 chevron-transition ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded events with smooth animation */}
      <div 
        className={`group-content-transition ${
          expanded ? 'group-content-expanded' : 'group-content-collapsed'
        }`}
      >
        {expanded && (
          <div className="px-2 pb-2 space-y-0.5 border-t border-zinc-100 dark:border-zinc-700/30 pt-1.5 mt-0.5">
            {group.events.slice(0, 10).map((event, index) => (
              <div 
                key={event.id}
                className="animate-event-enter"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <EventItem 
                  event={event} 
                  pollOptions={pollOptions}
                  compact={compact}
                />
              </div>
            ))}
            {group.events.length > 10 && (
              <div className="text-center text-[10px] text-zinc-400 py-1">
                +{group.events.length - 10} más
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
      <Inbox className="w-8 h-8 text-zinc-400" />
    </div>
    <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">
      No hay eventos aún
    </h3>
    <p className="text-xs text-zinc-500 max-w-xs">
      Los eventos del stream aparecerán aquí en tiempo real. 
      Follows, subs, raids, bits y más.
    </p>
  </div>
);

/**
 * Filter chips component - Redesigned with subtle borders and dot indicators
 * 
 * @requirements 2.1 - Subtle design with thin borders when inactive
 * @requirements 2.2 - Small colored dot indicator when active
 * @requirements 2.3 - Smaller chips (~24px height)
 * @requirements 2.4 - Toggle to show/hide all filters
 * @requirements 2.5 - Collapse to "Todos" when all filters active
 * @requirements 7.4 - Filter_Chips collapse to icon-only mode in compact mode
 * @requirements 8.2 - Smooth filter content transitions
 */
interface FilterChipsProps {
  filters: Set<ActivityEventType>;
  onFilterChange: (filters: Set<ActivityEventType>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
}

const FilterChips: React.FC<FilterChipsProps> = ({ 
  filters, 
  onFilterChange,
  collapsed: controlledCollapsed,
  onToggleCollapse: controlledToggle,
  compact = false,
}) => {
  // Internal state for collapse if not controlled
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledToggle || (() => setInternalCollapsed(prev => !prev));

  const toggleFilter = (type: ActivityEventType) => {
    const newFilters = new Set(filters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    onFilterChange(newFilters);
  };

  const selectAll = () => {
    onFilterChange(new Set(FILTER_CHIPS.map(c => c.type)));
  };

  const clearAll = () => {
    onFilterChange(new Set());
  };

  const allSelected = filters.size === FILTER_CHIPS.length;
  const activeCount = filters.size;

  // In compact mode, always show icon-only chips
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {/* Toggle button */}
        <button
          onClick={toggleCollapse}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-[10px] card-hover-transition border border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title={isCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
        >
          <Filter size={10} />
        </button>

        {/* Collapsed: show count badge */}
        {isCollapsed ? (
          <button
            onClick={allSelected ? clearAll : selectAll}
            className={`flex-shrink-0 flex items-center gap-1 h-5 px-1.5 rounded text-[9px] font-medium card-hover-transition border animate-filter-enter ${
              allSelected
                ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {allSelected && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-badge-pulse" />}
            <span>{activeCount}/{FILTER_CHIPS.length}</span>
          </button>
        ) : (
          /* Expanded: icon-only filter chips */
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {/* Select all button */}
            <button
              onClick={selectAll}
              className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] card-hover-transition border animate-filter-enter ${
                allSelected
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                  : 'border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Todos"
            >
              ✓
            </button>

            {/* Icon-only filter chips */}
            {FILTER_CHIPS.map((chip, index) => {
              const isActive = filters.has(chip.type);
              return (
                <button
                  key={chip.type}
                  onClick={() => toggleFilter(chip.type)}
                  className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center card-hover-transition border animate-filter-enter ${
                    isActive
                      ? 'border-current bg-transparent'
                      : 'border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  style={{
                    ...(isActive ? { color: chip.color, borderColor: chip.color } : {}),
                    animationDelay: `${(index + 1) * 20}ms`,
                  }}
                  title={chip.label}
                >
                  {chip.icon}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Normal mode (non-compact)
  return (
    <div className="flex items-center gap-2">
      {/* Toggle button to show/hide filters */}
      <button
        onClick={toggleCollapse}
        className="flex-shrink-0 flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium card-hover-transition border border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title={isCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
      >
        <Filter size={12} />
        <span className={`chevron-transition ${isCollapsed ? '' : 'rotate-90'}`}>
          <ChevronRight size={12} />
        </span>
      </button>

      {/* Collapsed state: Show count badge */}
      {isCollapsed ? (
        <button
          onClick={allSelected ? clearAll : selectAll}
          className={`flex-shrink-0 flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium card-hover-transition border animate-filter-enter ${
            allSelected
              ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {allSelected && (
            <span 
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-badge-pulse"
              aria-hidden="true"
            />
          )}
          <span>{allSelected ? 'Todos' : `${activeCount}/${FILTER_CHIPS.length}`}</span>
        </button>
      ) : null}

      {/* Expanded filter chips - always show when not collapsed */}
      {!isCollapsed && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
          {/* Select all button */}
          <button
            onClick={selectAll}
            className="flex-shrink-0 h-6 px-2 rounded-md text-xs font-medium card-hover-transition border border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 animate-filter-enter"
          >
            Todos
          </button>

          {/* Filter chips */}
          {FILTER_CHIPS.map((chip, index) => {
            const isActive = filters.has(chip.type);
            return (
              <button
                key={chip.type}
                onClick={() => toggleFilter(chip.type)}
                className={`flex-shrink-0 flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium card-hover-transition border animate-filter-enter ${
                  isActive
                    ? 'border-current bg-transparent'
                    : 'border-zinc-300 dark:border-zinc-600 bg-transparent text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                style={{
                  ...(isActive ? { color: chip.color, borderColor: chip.color } : {}),
                  animationDelay: `${(index + 1) * 20}ms`,
                }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-badge-pulse"
                    style={{ backgroundColor: chip.color }}
                    aria-hidden="true"
                  />
                )}
                {chip.icon}
                <span className="hidden sm:inline">{chip.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


/**
 * EventFeed component - displays stream events with grouping and filtering
 */
export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  pollOptions,
  filters,
  onFilterChange,
  groupingWindowMs = 120000,
  minGroupSize = 2,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventsLengthRef = useRef(0);

  // Filter events based on active filters
  const filteredEvents = useMemo(() => {
    if (filters.size === 0) return [];
    return events.filter(e => filters.has(e.type));
  }, [events, filters]);

  // Group events
  const groupedEvents = useMemo(() => {
    const config: Partial<EventGroupingConfig> = {
      windowMs: groupingWindowMs,
      minGroupSize,
    };
    return groupEvents(filteredEvents, config);
  }, [filteredEvents, groupingWindowMs, minGroupSize]);

  // Track new events for animation
  useEffect(() => {
    if (events.length > prevEventsLengthRef.current) {
      const newIds = new Set<string>();
      for (let i = prevEventsLengthRef.current; i < events.length; i++) {
        newIds.add(events[i].id);
      }
      setNewEventIds(prev => new Set([...prev, ...newIds]));
      
      // Clear new status after animation
      const timer = setTimeout(() => {
        setNewEventIds(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    prevEventsLengthRef.current = events.length;
  }, [events.length]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [groupedEvents, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  }, [autoScroll]);

  // Toggle group expansion
  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const updated = new Set(prev);
      if (updated.has(groupId)) {
        updated.delete(groupId);
      } else {
        updated.add(groupId);
      }
      return updated;
    });
  }, []);

  // Scroll to bottom and enable auto-scroll
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  }, []);

  // Check if an event is new (for animation)
  const isEventNew = useCallback((eventId: string) => {
    return newEventIds.has(eventId);
  }, [newEventIds]);

  // Check if a group contains new events
  const isGroupNew = useCallback((group: EventGroup) => {
    return group.events.some(e => newEventIds.has(e.id));
  }, [newEventIds]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex-shrink-0 px-2 pt-2">
        <FilterChips filters={filters} onFilterChange={onFilterChange} compact={compact} />
      </div>

      {/* Events container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-2 space-y-1"
      >
        {groupedEvents.length === 0 ? (
          <EmptyState />
        ) : (
          groupedEvents.map((group) => (
            group.isGrouped ? (
              <GroupedEventItem
                key={group.id}
                group={group}
                pollOptions={pollOptions}
                isNew={isGroupNew(group)}
                expanded={expandedGroups.has(group.id)}
                onToggleExpand={() => toggleGroupExpand(group.id)}
                compact={compact}
              />
            ) : (
              <EventItem
                key={group.events[0].id}
                event={group.events[0]}
                pollOptions={pollOptions}
                isNew={isEventNew(group.events[0].id)}
                compact={compact}
              />
            )
          ))
        )}
      </div>

      {/* Auto-scroll toggle button - smooth fade animation */}
      {!autoScroll && groupedEvents.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-zinc-800 dark:bg-zinc-700 text-white rounded-full shadow-lg hover:bg-zinc-700 dark:hover:bg-zinc-600 card-hover-transition animate-indicator-enter"
        >
          <Play size={14} />
          <span className="text-xs font-medium">Reanudar</span>
        </button>
      )}

      {/* Pause indicator - smooth fade animation */}
      {!autoScroll && groupedEvents.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/90 text-white rounded-full text-xs font-medium shadow-sm animate-pause-indicator">
          <Pause size={12} />
          <span>Auto-scroll pausado</span>
        </div>
      )}
    </div>
  );
};

export default EventFeed;
