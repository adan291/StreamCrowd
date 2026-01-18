/**
 * RandomWinnerOverlay - Overlay para OBS de sorteos
 * Muestra sorteos activos como tarjetas compactas con ganador integrado
 * Migrated to use Redux state management
 * 
 * @requirements 3.5, 3.6 - Display giveaway state from Redux
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Settings, Users, Clock, CalendarClock, Gift, Sparkles, Crown } from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n, useTranslationModule } from '../i18n';
import { useOverlayMode, OVERLAY_BG_COLORS } from '../hooks/useOverlayMode';
import { giveawaySync } from '../src/infrastructure/sync/FirebaseSync';
import { useGiveaway } from '../src/application/hooks/useGiveaway';

interface RandomWinnerOverlayProps {
  chatMessages: TwitchMessage[];
  onClose: () => void;
}

const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const GIVEAWAY_SYNC_CHANNEL = 'giveaway_sync';

interface ThreadSyncData {
  id: string;
  name: string;
  keyword: string;
  mode: string;
  participantCount: number;
  endsAt?: number;
  isPaused?: boolean;
  winner?: string;
  prizeImages?: string[];
}

interface ScheduledThreadSyncData {
  id: string;
  name: string;
  startsAt: number;
}

interface GiveawaySyncState {
  winner: string | null;
  isSpinning: boolean;
  displayName: string;
  participants: string[];
  activeThreads?: ThreadSyncData[];
  scheduledThreads?: ScheduledThreadSyncData[];
}

export const RandomWinnerOverlay: React.FC<RandomWinnerOverlayProps> = ({ 
  chatMessages, 
  onClose,
}) => {
  useOverlayMode(true);
  const [overlayBgColor, setOverlayBgColor] = useState('transparent');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const { t } = useI18n();
  
  // Load giveaway module for lazy loading
  useTranslationModule('giveaway');
  
  // Use Redux state for giveaway data
  const giveaway = useGiveaway();
  
  // Sync state (for backward compatibility with BroadcastChannel)
  const [globalWinner, setGlobalWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [activeThreads, setActiveThreads] = useState<ThreadSyncData[]>([]);
  const [scheduledThreads, setScheduledThreads] = useState<ScheduledThreadSyncData[]>([]);
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync Redux state to local state for display
  useEffect(() => {
    if (giveaway.activeGiveaway) {
      // Update display from Redux state
      if (giveaway.winner) {
        setGlobalWinner(giveaway.winner.username);
        setDisplayName(giveaway.winner.username);
        setIsSpinning(false);
      } else if (giveaway.isSelecting) {
        setIsSpinning(true);
        setGlobalWinner(null);
      } else {
        setGlobalWinner(null);
        setIsSpinning(false);
        setDisplayName('');
      }
    } else {
      setGlobalWinner(null);
      setIsSpinning(false);
      setDisplayName('');
    }
  }, [giveaway.activeGiveaway, giveaway.winner, giveaway.isSelecting]);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(GIVEAWAY_SYNC_CHANNEL);
      channelRef.current.onmessage = (event: MessageEvent<GiveawaySyncState>) => {
        if (!event.data) return;
        handleSyncData(event.data);
      };
    } catch (error) {
      console.warn('[RandomWinnerOverlay] BroadcastChannel not supported');
    }
    return () => { channelRef.current?.close(); };
  }, []);

  // Subscribe to Firebase
  useEffect(() => {
    const unsubscribe = giveawaySync.subscribe((data) => {
      if (data) handleSyncData(data as GiveawaySyncState);
    });
    return () => { unsubscribe(); };
  }, []);

  const handleSyncData = (data: GiveawaySyncState) => {
    // Only update if values actually changed to prevent unnecessary re-renders
    if (data.winner !== globalWinner) setGlobalWinner(data.winner);
    if (data.isSpinning !== isSpinning) setIsSpinning(data.isSpinning);
    if (data.displayName !== displayName) setDisplayName(data.displayName || data.winner || '');
    
    // Only update threads if they changed (compare by JSON to avoid reference issues)
    const newActiveThreads = data.activeThreads || [];
    const newScheduledThreads = data.scheduledThreads || [];
    
    if (JSON.stringify(newActiveThreads) !== JSON.stringify(activeThreads)) {
      setActiveThreads(newActiveThreads);
    }
    if (JSON.stringify(newScheduledThreads) !== JSON.stringify(scheduledThreads)) {
      setScheduledThreads(newScheduledThreads);
    }
  };

  // Timer countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeLeft = (endsAt: number) => {
    const diff = Math.max(0, endsAt - now);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStartsIn = (startsAt: number) => {
    const diff = Math.max(0, startsAt - now);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Check content
  const hasActiveContent = activeThreads.length > 0 || scheduledThreads.length > 0;
  const hasGlobalWinner = globalWinner && !isSpinning;
  // Only show global spinning when there are NO active threads (legacy mode)
  const isGlobalSpinning = isSpinning && activeThreads.length === 0;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 gap-3" style={{ backgroundColor: overlayBgColor }}>
      {/* Settings button */}
      <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
        <Settings size={18} />
      </button>
      
      {/* Settings panel */}
      {showOverlaySettings && (
        <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-64">
          <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.chromaKey}</p>
          <div className="flex gap-1 mb-3">
            {OVERLAY_BG_COLORS.map((color) => (
              <button 
                key={color} 
                onClick={() => setOverlayBgColor(color)} 
                className={`w-7 h-7 rounded border-2 ${overlayBgColor === color ? 'border-white scale-110' : 'border-transparent'} ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`} 
                style={{ backgroundColor: color === 'transparent' ? undefined : color }} 
              />
            ))}
          </div>
          <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.textColor}</p>
          <div className="flex gap-1">
            {OVERLAY_TEXT_COLORS.map((color) => (
              <button 
                key={color} 
                onClick={() => setOverlayTextColor(color)} 
                className={`w-7 h-7 rounded border-2 ${overlayTextColor === color ? 'border-white scale-110' : 'border-zinc-600'}`} 
                style={{ backgroundColor: color }} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Global spinning animation - ONLY when no active threads (legacy mode) */}
      {isGlobalSpinning && (
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-8 py-6 text-center animate-pulse">
          <Gift className="mx-auto text-purple-400 mb-2 animate-spin" size={32} />
          <p className="text-purple-300 text-sm mb-1">Seleccionando...</p>
          <p className="text-2xl font-bold text-white">{displayName || '...'}</p>
        </div>
      )}

      {/* Global winner - ONLY when no active threads (legacy mode) */}
      {hasGlobalWinner && activeThreads.length === 0 && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl px-10 py-6 text-center animate-bounce">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Crown className="text-white" size={28} />
            <span className="text-white font-bold text-lg">¡GANADOR!</span>
            <Crown className="text-white" size={28} />
          </div>
          <p className="text-3xl font-bold text-white">{globalWinner}</p>
        </div>
      )}

      {/* Active threads as compact cards */}
      {activeThreads.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
          {activeThreads.map((thread) => (
            <ThreadCard 
              key={thread.id} 
              thread={thread} 
              now={now}
              formatTimeLeft={formatTimeLeft}
              isSpinning={isSpinning && displayName !== thread.winner}
              spinningName={isSpinning ? displayName : undefined}
              textColor={overlayTextColor}
            />
          ))}
        </div>
      )}

      {/* Scheduled threads */}
      {scheduledThreads.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {scheduledThreads.map((thread) => (
            <div 
              key={thread.id}
              className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-500/50"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="text-blue-400" size={14} />
                <span className="text-white font-medium text-xs">{thread.name}</span>
                <span className="text-blue-300 text-[10px]">en {formatStartsIn(thread.startsAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasActiveContent && !hasGlobalWinner && !isGlobalSpinning && (
        <div className="text-center bg-black/50 rounded-2xl px-8 py-6">
          <Trophy className="text-yellow-400 mx-auto mb-2" size={48} />
          <p className="text-white/70 text-lg">{t.randomWinner.waitingRaffle}</p>
        </div>
      )}
    </div>
  );
};

// Compact thread card component - memoized to prevent unnecessary re-renders
interface ThreadCardProps {
  thread: ThreadSyncData;
  now: number;
  formatTimeLeft: (endsAt: number) => string;
  isSpinning?: boolean;
  spinningName?: string;
  textColor: string;
}

const ThreadCard: React.FC<ThreadCardProps> = React.memo(({ 
  thread, 
  now, 
  formatTimeLeft, 
  isSpinning,
  spinningName,
  textColor 
}) => {
  const hasWinner = !!thread.winner;
  const isExpired = thread.endsAt ? thread.endsAt < now : false;
  const hasPrizeImages = thread.prizeImages && thread.prizeImages.length > 0;
  
  // Determine card state
  const cardBg = hasWinner 
    ? 'bg-gradient-to-br from-yellow-500/90 to-orange-500/90' 
    : isSpinning 
      ? 'bg-purple-600/80' 
      : thread.isPaused 
        ? 'bg-zinc-700/80' 
        : 'bg-black/70';
  
  const borderColor = hasWinner 
    ? 'border-yellow-400' 
    : isSpinning 
      ? 'border-purple-400' 
      : thread.isPaused 
        ? 'border-zinc-500' 
        : 'border-green-500/50';

  return (
    <div className={`${cardBg} backdrop-blur-sm rounded-xl overflow-hidden min-w-[200px] max-w-[260px] border-2 ${borderColor} ${hasWinner ? 'animate-pulse' : ''}`}>
      {/* Prize images header */}
      {hasPrizeImages && (
        <div className="relative h-20 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
          <div className="w-full h-full flex">
            {thread.prizeImages!.slice(0, 3).map((img, idx) => (
              <div 
                key={idx} 
                className="flex-1 h-full overflow-hidden"
                style={{ 
                  borderRight: idx < thread.prizeImages!.length - 1 && idx < 2 ? '2px solid rgba(255,255,255,0.2)' : 'none' 
                }}
              >
                <img
                  src={img}
                  alt={`Premio ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Name on image */}
          <div className="absolute bottom-1 left-2 right-2">
            <div className="flex items-center gap-1.5">
              {hasWinner ? (
                <Trophy className="text-yellow-400" size={14} />
              ) : (
                <Gift className={`${isSpinning ? 'text-white animate-spin' : 'text-purple-300'}`} size={14} />
              )}
              <span className="text-white font-medium text-xs truncate drop-shadow-lg">{thread.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Header (only if no images) */}
        {!hasPrizeImages && (
          <div className="flex items-center gap-1.5 mb-2">
            {hasWinner ? (
              <Trophy className="text-white" size={14} />
            ) : (
              <Gift className={`${isSpinning ? 'text-white animate-spin' : 'text-purple-300'}`} size={14} />
            )}
            <span className="text-white font-medium text-xs truncate flex-1">{thread.name}</span>
          </div>
        )}

        {/* Winner display */}
        {hasWinner && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="text-white" size={14} />
              <Crown className="text-white" size={18} />
              <Sparkles className="text-white" size={14} />
            </div>
            <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider mb-1">¡Ganador!</p>
            <p className="text-xl font-bold text-white truncate drop-shadow-lg" style={{ color: textColor }}>
              {thread.winner}
            </p>
            <p className="text-white/60 text-[10px] mt-1">
              de {thread.participantCount} participantes
            </p>
          </div>
        )}

        {/* Spinning display */}
        {isSpinning && !hasWinner && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Gift className="text-purple-300 animate-bounce" size={16} />
            </div>
            <p className="text-white/70 text-[10px] mb-1">Seleccionando...</p>
            <p className="text-lg font-bold text-white animate-pulse truncate">
              {spinningName || '...'}
            </p>
          </div>
        )}

        {/* Normal state */}
        {!hasWinner && !isSpinning && (
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-green-400">
              <Users size={12} />
              <span className="font-bold">{thread.participantCount}</span>
            </div>
            
            {thread.keyword && (
              <span className="text-purple-300 font-mono bg-purple-500/20 px-1.5 py-0.5 rounded text-[9px]">
                {thread.keyword}
              </span>
            )}
            
            {thread.endsAt && !thread.isPaused && (
              <div className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-orange-400'}`}>
                <Clock size={12} />
                <span className="font-mono font-bold">{formatTimeLeft(thread.endsAt)}</span>
              </div>
            )}
            
            {thread.isPaused && (
              <span className="text-zinc-400">⏸</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Display name for React DevTools
ThreadCard.displayName = 'ThreadCard';

export default RandomWinnerOverlay;
