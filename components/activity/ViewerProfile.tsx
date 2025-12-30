/**
 * ViewerProfile - Panel de perfil de viewer
 * 
 * Muestra el perfil completo de un viewer incluyendo historial de actividad
 * y estadísticas detalladas.
 * 
 * @requirements 7.4 - Vista de perfil con historial y estadísticas
 */

import React, { useMemo } from 'react';
import {
  X,
  User,
  Star,
  Crown,
  Shield,
  Ban,
  Clock,
  Coins,
  Gift,
  UserPlus,
  Vote,
  Users,
  Calendar,
  Activity,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { ViewerData, ViewerStreamEvent } from '../../src/application/services/ViewerService';
import { EVENT_COLORS, getEventColor } from '../../src/application/utils/uiColors';

/**
 * Props for the ViewerProfile component
 */
export interface ViewerProfileProps {
  /** Viewer data to display */
  viewer: ViewerData | null;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Channel name for external links */
  channelName?: string;
  /** Whether the viewer is currently online */
  isOnline?: boolean;
  /** Whether the viewer is a moderator */
  isMod?: boolean;
  /** Whether the viewer is a VIP */
  isVip?: boolean;
  /** Callback to open moderation drawer */
  onOpenModeration?: (userId: string, username: string) => void;
}

/**
 * Stat card component
 */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subValue }) => (
  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
    <div className="flex items-center gap-2 mb-1">
      <div 
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
    <p className="text-lg font-bold text-zinc-200">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    {subValue && (
      <p className="text-[10px] text-zinc-500">{subValue}</p>
    )}
  </div>
);


/**
 * Event item in history
 */
interface EventItemProps {
  event: ViewerStreamEvent;
}

const EventItem: React.FC<EventItemProps> = ({ event }) => {
  const getEventIcon = () => {
    switch (event.type) {
      case 'follow': return <UserPlus size={12} style={{ color: EVENT_COLORS.follow }} />;
      case 'sub': return <Star size={12} style={{ color: EVENT_COLORS.sub }} />;
      case 'resub': return <RefreshCw size={12} style={{ color: EVENT_COLORS.resub }} />;
      case 'gift': return <Gift size={12} style={{ color: EVENT_COLORS.gift }} />;
      case 'raid': return <Users size={12} style={{ color: EVENT_COLORS.raid }} />;
      case 'bits': return <Coins size={12} style={{ color: EVENT_COLORS.bits }} />;
      case 'vote': return <Vote size={12} style={{ color: EVENT_COLORS.vote }} />;
      case 'ban': return <Ban size={12} style={{ color: EVENT_COLORS.ban }} />;
      case 'timeout': return <Clock size={12} style={{ color: EVENT_COLORS.timeout }} />;
      default: return <Activity size={12} className="text-zinc-400" />;
    }
  };

  const getEventLabel = () => {
    switch (event.type) {
      case 'follow': return 'Follow';
      case 'sub': return `Sub ${getTierName(event.data?.tier)}`;
      case 'resub': return `Resub x${event.data?.months || 1}`;
      case 'gift': return event.data?.recipientUsername 
        ? `Gift → ${event.data.recipientUsername}` 
        : `Gift x${event.data?.giftCount || 1}`;
      case 'raid': return `Raid (${event.data?.viewerCount || 0} viewers)`;
      case 'bits': return `${event.data?.amount || 0} bits`;
      case 'vote': return `Voto +${event.data?.optionId}`;
      case 'ban': return 'Ban';
      case 'timeout': return `Timeout ${formatDuration(event.data?.duration || 0)}`;
      default: return event.type;
    }
  };

  const getEventColor = () => {
    return EVENT_COLORS[event.type as keyof typeof EVENT_COLORS] || '#888';
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <div 
        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${getEventColor()}15` }}
      >
        {getEventIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-300">{getEventLabel()}</p>
        {event.data?.reason && (
          <p className="text-[10px] text-zinc-500 truncate">
            Razón: {event.data.reason}
          </p>
        )}
      </div>
      <span className="text-[10px] text-zinc-500 flex-shrink-0">
        {formatTimestamp(event.timestamp)}
      </span>
    </div>
  );
};

/**
 * Helper functions
 */
const getTierName = (tier?: string): string => {
  switch (tier) {
    case '1000': return 'T1';
    case '2000': return 'T2';
    case '3000': return 'T3';
    default: return '';
  }
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays}d`;
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


/**
 * ViewerProfile component - displays detailed viewer information
 */
export const ViewerProfile: React.FC<ViewerProfileProps> = ({
  viewer,
  isOpen,
  onClose,
  channelName,
  isOnline = false,
  isMod = false,
  isVip = false,
  onOpenModeration,
}) => {
  // Sort events by timestamp (most recent first)
  const sortedEvents = useMemo(() => {
    if (!viewer) return [];
    return [...viewer.events].sort((a, b) => b.timestamp - a.timestamp);
  }, [viewer]);

  // Calculate subscription value
  const subValue = useMemo(() => {
    if (!viewer) return 0;
    return viewer.totalSubMonths + viewer.subs + viewer.resubs;
  }, [viewer]);

  // Calculate sanction count
  const sanctionCount = useMemo(() => {
    if (!viewer) return 0;
    return viewer.bans + viewer.timeouts;
  }, [viewer]);

  if (!isOpen || !viewer) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-zinc-900 border-l border-zinc-700 z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-zinc-400" />
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-zinc-900" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-200">
                    {viewer.displayName || viewer.username}
                  </h3>
                  {/* Badges */}
                  {isMod && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded">
                      MOD
                    </span>
                  )}
                  {isVip && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-pink-500/20 text-pink-400 rounded">
                      VIP
                    </span>
                  )}
                  {viewer.currentTier && (
                    <span 
                      className="px-1.5 py-0.5 text-[9px] font-bold rounded"
                      style={{
                        backgroundColor: viewer.currentTier === '3000' ? '#ffd70020' : 
                                        viewer.currentTier === '2000' ? '#00f0f020' : '#a855f720',
                        color: viewer.currentTier === '3000' ? '#ffd700' : 
                               viewer.currentTier === '2000' ? '#00f0f0' : '#a855f7',
                      }}
                    >
                      {getTierName(viewer.currentTier)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">@{viewer.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* External links and actions */}
          <div className="flex items-center gap-2 mt-3">
            {channelName && (
              <a
                href={`https://www.twitch.tv/popout/${channelName}/viewercard/${viewer.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                <ExternalLink size={10} />
                Viewer Card
              </a>
            )}
            {onOpenModeration && (
              <button
                onClick={() => onOpenModeration(viewer.username, viewer.username)}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/20 transition-colors"
              >
                <Shield size={10} />
                Moderar
              </button>
            )}
          </div>

          {/* First/Last seen */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              <span>Primera vez: {formatDate(viewer.firstSeen)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={10} />
              <span>Última vez: {formatDate(viewer.lastSeen)}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-700/50">
          <h4 className="text-xs font-bold text-zinc-400 mb-3">Estadísticas</h4>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Actividad total"
              value={viewer.totalActivity}
              icon={<Activity size={12} />}
              color="#06b6d4"
            />
            <StatCard
              label="Bits totales"
              value={viewer.totalBits}
              icon={<Coins size={12} />}
              color={EVENT_COLORS.bits}
            />
            <StatCard
              label="Suscripciones"
              value={subValue}
              icon={<Star size={12} />}
              color={EVENT_COLORS.sub}
              subValue={viewer.totalSubMonths > 0 ? `${viewer.totalSubMonths} meses` : undefined}
            />
            <StatCard
              label="Gifts dados"
              value={viewer.giftsGiven}
              icon={<Gift size={12} />}
              color={EVENT_COLORS.gift}
              subValue={viewer.giftsReceived > 0 ? `${viewer.giftsReceived} recibidos` : undefined}
            />
            <StatCard
              label="Follows"
              value={viewer.follows}
              icon={<UserPlus size={12} />}
              color={EVENT_COLORS.follow}
            />
            <StatCard
              label="Votos"
              value={viewer.votes}
              icon={<Vote size={12} />}
              color={EVENT_COLORS.vote}
            />
          </div>

          {/* Moderation stats (if any) */}
          {sanctionCount > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Ban size={14} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">Historial de moderación</span>
              </div>
              <div className="flex gap-4 text-xs">
                {viewer.bans > 0 && (
                  <div>
                    <span className="text-red-400 font-bold">{viewer.bans}</span>
                    <span className="text-zinc-500 ml-1">bans</span>
                  </div>
                )}
                {viewer.timeouts > 0 && (
                  <div>
                    <span className="text-orange-400 font-bold">{viewer.timeouts}</span>
                    <span className="text-zinc-500 ml-1">timeouts</span>
                  </div>
                )}
                {viewer.totalTimeoutSeconds > 0 && (
                  <div>
                    <span className="text-zinc-400 font-bold">
                      {formatDuration(viewer.totalTimeoutSeconds)}
                    </span>
                    <span className="text-zinc-500 ml-1">total</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event history */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-700/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400">Historial de actividad</h4>
              <span className="text-[10px] text-zinc-500">{sortedEvents.length} eventos</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin actividad registrada</p>
              </div>
            ) : (
              sortedEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
};

export default ViewerProfile;
