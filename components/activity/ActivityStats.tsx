/**
 * ActivityStats - Compact horizontal stats bar for stream activity
 * 
 * Displays key metrics in a single compact row with subtle colored dots.
 * Supports compact mode for reduced vertical space.
 * 
 * @requirements 1.1 - Display stats in a single compact horizontal row
 * @requirements 1.2 - Show only 4 most relevant metrics (follows, subs, bits, raids)
 * @requirements 1.3 - Use subtle colored dots instead of large backgrounds
 * @requirements 1.4 - Display zero values with reduced opacity
 * @requirements 1.5 - Occupy no more than 40px vertical height in compact mode
 */

import React, { useMemo } from 'react';
import {
  UserPlus,
  Star,
  Coins,
  Users,
} from 'lucide-react';
import { getEventColor, getEventTint } from '../../src/application/utils/uiColors';

export interface ActivityStatsProps {
  stats: {
    follows: number;
    subs: number;
    resubs: number;
    gifts: number;
    raids: number;
    bits: number;
    votes: number;
    bans: number;
    timeouts: number;
  };
  compact?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface CompactStatItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'compact';
}

/**
 * Formats a number in compact notation (e.g., 1.2K, 3.5M)
 */
const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Compact stat item with colored dot indicator
 * Uses reduced opacity for zero values
 * @requirements 8.1 - Smooth hover transitions
 */
const CompactStatItem: React.FC<CompactStatItemProps> = ({
  label,
  value,
  icon,
  color,
  format = 'number',
}) => {
  const displayValue = format === 'compact' ? formatCompact(value) : value.toLocaleString();
  const isZero = value === 0;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md card-hover-transition hover:bg-zinc-800/50 ${
        isZero ? 'opacity-40' : 'opacity-100'
      }`}
      title={`${label}: ${value.toLocaleString()}`}
    >
      {/* Colored dot indicator */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {/* Icon */}
      <span
        className="flex-shrink-0"
        style={{ color: isZero ? '#71717a' : color }}
      >
        {icon}
      </span>
      {/* Value */}
      <span className={`text-sm font-semibold tabular-nums ${isZero ? 'text-zinc-500' : 'text-white'}`}>
        {displayValue}
      </span>
    </div>
  );
};

/**
 * ActivityStats component - displays stream activity statistics
 * in a compact horizontal bar format
 */
export const ActivityStats: React.FC<ActivityStatsProps> = ({
  stats,
  compact = false,
}) => {
  // Primary stats configuration (4 main metrics)
  const primaryStats = useMemo(() => [
    {
      label: 'Follows',
      value: stats.follows,
      icon: <UserPlus size={14} />,
      color: getEventColor('follow'),
      format: 'number' as const,
    },
    {
      label: 'Suscripciones',
      value: stats.subs + stats.resubs,
      icon: <Star size={14} />,
      color: getEventColor('sub'),
      format: 'number' as const,
    },
    {
      label: 'Bits',
      value: stats.bits,
      icon: <Coins size={14} />,
      color: getEventColor('bits'),
      format: 'compact' as const,
    },
    {
      label: 'Raids',
      value: stats.raids,
      icon: <Users size={14} />,
      color: getEventColor('raid'),
      format: 'number' as const,
    },
  ], [stats.follows, stats.subs, stats.resubs, stats.bits, stats.raids]);

  // Check if there's any activity
  const hasActivity = primaryStats.some(s => s.value > 0);

  return (
    <div
      className={`flex items-center justify-between gap-1 rounded-lg bg-zinc-800/30 border border-zinc-700/30 card-hover-transition ${
        compact ? 'h-8 px-1' : 'h-10 px-2'
      }`}
      style={{ maxHeight: compact ? '32px' : '40px' }}
    >
      {/* Stats row */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
        {primaryStats.map((stat) => (
          <CompactStatItem
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            format={stat.format}
          />
        ))}
      </div>

      {/* Empty state indicator */}
      {!hasActivity && (
        <span className="text-xs text-zinc-500 px-2">
          Sin actividad
        </span>
      )}
    </div>
  );
};

export default ActivityStats;
