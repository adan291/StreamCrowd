/** StreamActivity - Orchestrator component for stream activity management */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, Users, CloudDownload, Calendar, Download, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import { VoteRecord } from '../types';

// Import subcomponents
import {
  EventFeed, ViewerPanel, APIDataPanel, ActivityStats, ModerationDrawer, ViewerProfile,
  type PollOption, type ModerationAction, type ModerationUser,
} from './activity';

// Import hooks and services
import { useViewerData } from '../src/application/hooks/useViewerData';
import { useModerationAction } from '../src/application/hooks/useModerationAction';
import { useTwitchAPI } from '../src/application/hooks/useTwitchAPI';
import { useCompactMode } from '../src/application/hooks/useCompactMode';
import type { ActivityEventType, ActivityStreamEvent } from '../src/application/utils/eventGrouping';
import { storageHelpers, generateEventId, getTodayString } from '../src/application/hooks/useStreamEventService';

const TAB_STORAGE_KEY = 'stream_activity_selected_tab';
type ActivityTab = 'live' | 'history' | 'viewers' | 'api';
interface TabConfig { id: ActivityTab; label: string; icon: React.ReactNode; color: string; }

const TABS: TabConfig[] = [
  { id: 'live', label: 'LIVE', icon: <Activity size={14} />, color: '#22c55e' },
  { id: 'history', label: 'HIST', icon: <Calendar size={14} />, color: '#a855f7' },
  { id: 'viewers', label: 'USERS', icon: <Users size={14} />, color: '#06b6d4' },
  { id: 'api', label: 'API', icon: <CloudDownload size={14} />, color: '#f59e0b' },
];

// Legacy event types for backward compatibility
export type StreamEventType = 'vote' | 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'bits' | 'ban' | 'timeout';
export type SubTier = '1000' | '2000' | '3000';
export interface StreamEvent {
  id: string; type: StreamEventType; username: string; timestamp: number;
  data?: { optionId?: number; tier?: SubTier; months?: number; message?: string; giftCount?: number;
    recipientUsername?: string; viewerCount?: number; amount?: number; duration?: number; reason?: string; moderator?: string; };
}

export const voteToEvent = (vote: VoteRecord): StreamEvent => ({
  id: generateEventId('vote', vote.username, vote.timestamp, `opt${vote.optionId}`),
  type: 'vote', username: vote.username, timestamp: vote.timestamp, data: { optionId: vote.optionId }
});

const toActivityEvent = (event: StreamEvent): ActivityStreamEvent => ({
  id: event.id, type: event.type as ActivityEventType, username: event.username, timestamp: event.timestamp,
  data: event.data ? { tier: event.data.tier, months: event.data.months, giftCount: event.data.giftCount,
    recipientUsername: event.data.recipientUsername, viewerCount: event.data.viewerCount, amount: event.data.amount,
    bits: event.data.amount, duration: event.data.duration, reason: event.data.reason, optionId: event.data.optionId } : undefined,
});

interface StreamActivityProps {
  events: StreamEvent[]; votes?: VoteRecord[];
  pollOptions?: { [key: number]: { color: string; label: string; icon?: string; image?: string } };
  channelName?: string; authToken?: string; userId?: string; onEventAdded?: (event: StreamEvent) => void;
}

// Legacy storage functions for backward compatibility
// NOTE: These are exported for backward compatibility but primarily used internally
// Consider using storageHelpers from useStreamEventService directly for new code
export const saveEvents = (events: StreamEvent[], channelName: string): void => { storageHelpers.saveEventsForDate(channelName, getTodayString(), events); };
export const loadEventsByDate = (channelName: string, date: string): StreamEvent[] => storageHelpers.loadEventsForDate(channelName, date);
export const getAvailableDates = (channelName: string): string[] => storageHelpers.getAvailableDates(channelName);
export const clearEventsByDate = (channelName: string, date: string): void => { storageHelpers.clearEventsForDate(channelName, date); };

/** StreamActivity component - orchestrates activity subcomponents */
export const StreamActivity: React.FC<StreamActivityProps> = ({ events, votes = [], pollOptions = {}, channelName = 'unknown', authToken, userId }) => {
  // Compact mode state with localStorage persistence
  const { isCompact, toggleCompact } = useCompactMode();
  const [statsHovered, setStatsHovered] = useState(false);

  // Tab state with localStorage persistence
  const [activeTab, setActiveTab] = useState<ActivityTab>(() => {
    try { const stored = localStorage.getItem(TAB_STORAGE_KEY); if (stored && TABS.some(t => t.id === stored)) return stored as ActivityTab; } catch {}
    return 'live';
  });

  const [tabActivity, setTabActivity] = useState<Record<ActivityTab, number>>({ live: 0, history: 0, viewers: 0, api: 0 });

  // History and filter state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historyEvents, setHistoryEvents] = useState<StreamEvent[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [useRangeMode, setUseRangeMode] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Set<ActivityEventType>>(new Set(['vote', 'follow', 'sub', 'resub', 'gift', 'raid', 'bits', 'ban', 'timeout']));

  // Viewer and moderation state
  const [selectedViewer, setSelectedViewer] = useState<string | null>(null);
  const [moderationUser, setModerationUser] = useState<ModerationUser | null>(null);
  const [showModerationDrawer, setShowModerationDrawer] = useState(false);
  const [showViewerProfile, setShowViewerProfile] = useState(false);
  const prevEventsLengthRef = useRef(events.length + votes.length);

  // Initialize hooks
  const viewerData = useViewerData(false);
  const moderationAction = useModerationAction(authToken || '');
  const twitchAPI = useTwitchAPI(authToken || '');
  const broadcasterId = userId || '';

  // Combine and convert events
  const allEvents = useMemo(() => {
    const combined = [...events, ...votes.map(voteToEvent)];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [events, votes]);

  const activityEvents = useMemo(() => (activeTab === 'history' ? historyEvents : allEvents).map(toActivityEvent), [allEvents, historyEvents, activeTab]);

  // Calculate stats
  const stats = useMemo(() => {
    const src = activeTab === 'history' ? historyEvents : allEvents;
    const count = (t: StreamEventType) => src.filter((e: StreamEvent) => e.type === t).length;
    const giftEvents = src.filter((e: StreamEvent) => e.type === 'gift');
    const gifts = giftEvents.filter((e: StreamEvent) => e.data?.recipientUsername).length || giftEvents.filter((e: StreamEvent) => e.data?.message?.startsWith('bulk_gift_')).reduce((acc: number, e: StreamEvent) => acc + (e.data?.giftCount || 1), 0);
    return { follows: count('follow'), subs: count('sub'), resubs: count('resub'), gifts, raids: count('raid'), votes: count('vote'), bans: count('ban'), timeouts: count('timeout'), bits: src.filter((e: StreamEvent) => e.type === 'bits').reduce((acc: number, e: StreamEvent) => acc + (e.data?.amount || 0), 0) };
  }, [allEvents, historyEvents, activeTab]);

  // Effects for data processing and persistence
  useEffect(() => { viewerData.processEvents(activityEvents); }, [activityEvents]);
  useEffect(() => { try { localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch {} }, [activeTab]);
  useEffect(() => { if (channelName) setAvailableDates(getAvailableDates(channelName)); }, [channelName]);
  useEffect(() => { if (channelName && allEvents.length > 0) saveEvents(allEvents, channelName); }, [allEvents, channelName]);
  useEffect(() => { if (selectedDate && channelName && !useRangeMode) setHistoryEvents(loadEventsByDate(channelName, selectedDate)); }, [selectedDate, channelName, useRangeMode]);

  // Track new events for activity indicator
  useEffect(() => {
    const len = events.length + votes.length;
    if (len > prevEventsLengthRef.current && activeTab !== 'live') setTabActivity(prev => ({ ...prev, live: prev.live + (len - prevEventsLengthRef.current) }));
    prevEventsLengthRef.current = len;
  }, [events.length, votes.length, activeTab]);
  useEffect(() => { setTabActivity(prev => ({ ...prev, [activeTab]: 0 })); }, [activeTab]);

  // Load events by date range
  const loadEventsByRange = useCallback(() => {
    if (!channelName || !dateFrom || !dateTo) return;
    const from = new Date(dateFrom), to = new Date(dateTo);
    if (from > to) return;
    const rangeEvents: StreamEvent[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) rangeEvents.push(...loadEventsByDate(channelName, d.toISOString().split('T')[0]));
    setHistoryEvents(rangeEvents.sort((a, b) => a.timestamp - b.timestamp));
  }, [channelName, dateFrom, dateTo]);

  // Handle moderation actions
  const handleModerationAction = useCallback(async (action: ModerationAction) => {
    if (action.type === 'openDrawer') { setModerationUser({ userId: action.userId, username: action.username, displayName: action.displayName }); setShowModerationDrawer(true); return; }
    switch (action.type) {
      case 'timeout': await moderationAction.timeoutUser(broadcasterId, action.userId, action.duration || 300, action.reason); break;
      case 'ban': await moderationAction.banUser(broadcasterId, action.userId, action.reason); break;
      case 'unban': await moderationAction.unbanUser(broadcasterId, action.userId); break;
      case 'vip': await moderationAction.addVIP(broadcasterId, action.userId); break;
      case 'unvip': await moderationAction.removeVIP(broadcasterId, action.userId); break;
    }
  }, [moderationAction, broadcasterId]);

  const handleSelectViewer = useCallback((username: string | null) => { setSelectedViewer(username); if (username) setShowViewerProfile(true); }, []);

  // Export events to CSV
  const exportEvents = useCallback(() => {
    const src = activeTab === 'history' ? historyEvents : allEvents;
    const getDetails = (e: StreamEvent) => {
      if (e.type === 'vote') return `Option ${e.data?.optionId}`; if (e.type === 'sub') return `Tier ${e.data?.tier || '1000'}`;
      if (e.type === 'resub') return `${e.data?.months} months`; if (e.type === 'gift') return `${e.data?.giftCount || 1} gifts`;
      if (e.type === 'bits') return `${e.data?.amount || 0} bits`; if (e.type === 'ban') return `Ban${e.data?.reason ? ` - ${e.data.reason}` : ''}`;
      if (e.type === 'timeout') return `${e.data?.duration || 0}s`; return '';
    };
    const csv = ['Timestamp,Type,Username,Details', ...src.map((e: StreamEvent) => [new Date(e.timestamp).toISOString(), e.type, e.username, getDetails(e)].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `stream_activity_${channelName}_${activeTab === 'history' ? selectedDate : 'live'}.csv`; a.click(); URL.revokeObjectURL(url);
  }, [allEvents, historyEvents, activeTab, channelName, selectedDate]);

  // Convert poll options for EventFeed
  const feedPollOptions = useMemo(() => {
    const options: Record<number, PollOption> = {};
    Object.entries(pollOptions).forEach(([key, val]) => { const pollOpt = val as { color: string; label: string; icon?: string }; options[parseInt(key)] = { id: parseInt(key), label: pollOpt.label, color: pollOpt.color, icon: pollOpt.icon }; });
    return options;
  }, [pollOptions]);

  const selectedViewerData = useMemo(() => selectedViewer ? viewerData.getViewer(selectedViewer) : null, [selectedViewer, viewerData]);

  return (
    <div className={`flex flex-col bg-zinc-50 dark:bg-zinc-900/50 ${activeTab === 'api' ? 'min-h-full' : 'h-full'}`}>
      {/* Header with stats and tabs */}
      <div className="flex-shrink-0 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Stats bar - hidden in compact mode unless hovered, with smooth animation */}
        <div 
          className={`mb-2 group-content-transition ${
            isCompact && !statsHovered 
              ? 'group-content-collapsed mb-0' 
              : 'group-content-expanded'
          }`}
          onMouseEnter={() => setStatsHovered(true)}
          onMouseLeave={() => setStatsHovered(false)}
        >
          <ActivityStats
            stats={stats}
            expanded={false}
            compact={isCompact}
          />
        </div>
        
        {/* Stats hover trigger area when compact */}
        {isCompact && !statsHovered && (
          <div 
            className="h-2 -mt-1 mb-1 cursor-pointer group flex items-center justify-center animate-fade-in"
            onMouseEnter={() => setStatsHovered(true)}
          >
            <div className="w-8 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600 card-hover-transition" />
          </div>
        )}
        
        {/* Tab navigation - underline style with smooth transitions */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex">
            {TABS.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 py-2 px-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 card-hover-transition"
                style={{
                  color: activeTab === tab.id ? tab.color : undefined,
                }}
              >
                {/* Tab content */}
                <span className={`flex items-center gap-1.5 card-hover-transition ${
                  activeTab === tab.id 
                    ? 'opacity-100' 
                    : 'opacity-60 hover:opacity-80'
                }`}>
                  {tab.id === 'live' && activeTab === 'live' && (
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-pulse" 
                      style={{ backgroundColor: tab.color }}
                    />
                  )}
                  {tab.icon}
                  {tab.label}
                </span>
                
                {/* Activity badge - smaller and more subtle with animation */}
                {tabActivity[tab.id] > 0 && activeTab !== tab.id && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none animate-badge-pulse">
                    {tabActivity[tab.id] > 9 ? '9+' : tabActivity[tab.id]}
                  </span>
                )}
                
                {/* Underline indicator - 2px colored line with smooth transition */}
                <span 
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full tab-underline-transition"
                  style={{
                    backgroundColor: activeTab === tab.id ? tab.color : 'transparent',
                    transform: activeTab === tab.id ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </button>
            ))}
          </div>
          
          {/* Compact mode toggle button */}
          <button 
            onClick={toggleCompact}
            className={`p-1.5 rounded card-hover-transition ${
              isCompact 
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
            title={isCompact ? 'Modo normal' : 'Modo compacto'}
          >
            {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          
          <button 
            onClick={exportEvents} 
            className="p-1.5 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 card-hover-transition" 
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* History date selector */}
        {activeTab === 'history' && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={() => { setUseRangeMode(false); setHistoryEvents([]); }}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${!useRangeMode ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                Un día
              </button>
              <button onClick={() => { setUseRangeMode(true); setHistoryEvents([]); }}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${useRangeMode ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                Rango
              </button>
            </div>
            {!useRangeMode ? (
              <div className="flex items-center gap-2">
                <select id="history-date-select" name="history-date" aria-label="Seleccionar fecha del historial" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none">
                  <option value="">Seleccionar fecha...</option>
                  {availableDates.map((date: string) => (
                    <option key={date} value={date}>{new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</option>
                  ))}
                </select>
                {selectedDate && (
                  <button onClick={() => { if (confirm('¿Eliminar datos de este día?')) { clearEventsByDate(channelName, selectedDate); setHistoryEvents([]); setAvailableDates(getAvailableDates(channelName)); setSelectedDate(''); } }}
                    className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title="Eliminar datos del día">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label htmlFor="history-date-from" className="text-[10px] text-zinc-500 block mb-0.5">Desde</label>
                    <input type="date" id="history-date-from" name="history-date-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined}
                      className="w-full py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none" />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="history-date-to" className="text-[10px] text-zinc-500 block mb-0.5">Hasta</label>
                    <input type="date" id="history-date-to" name="history-date-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined}
                      className="w-full py-1.5 px-2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs border-none outline-none" />
                  </div>
                </div>
                <button onClick={loadEventsByRange} disabled={!dateFrom || !dateTo}
                  className="w-full py-1.5 px-3 rounded bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />Cargar rango
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content area - API tab uses parent scroll, others have internal scroll */}
      <div className={`relative ${activeTab === 'api' ? '' : 'flex-1 overflow-y-auto custom-scrollbar'}`}>
        {activeTab === 'live' || activeTab === 'history' ? (
          <EventFeed
            events={activityEvents}
            pollOptions={feedPollOptions}
            filters={activeFilters}
            onFilterChange={setActiveFilters}
            compact={isCompact}
          />
        ) : activeTab === 'viewers' ? (
          <ViewerPanel
            viewers={viewerData.viewers}
            liveChatters={twitchAPI.chatters.data || []}
            selectedViewer={selectedViewer}
            onSelectViewer={handleSelectViewer}
            onModerationAction={handleModerationAction}
            authToken={authToken}
            loadingChatters={twitchAPI.chatters.loading}
            chattersError={twitchAPI.chatters.error?.message}
            onRefreshChatters={() => userId && twitchAPI.fetchChatters(userId)}
            compact={isCompact}
          />
        ) : activeTab === 'api' ? (
          <APIDataPanel
            authToken={authToken}
            broadcasterId={userId}
            channelName={channelName}
          />
        ) : null}
      </div>

      {/* Moderation Drawer */}
      <ModerationDrawer
        user={moderationUser}
        isOpen={showModerationDrawer}
        onClose={() => { setShowModerationDrawer(false); setModerationUser(null); }}
        onTimeout={(uid: string, dur: number, reason?: string) => moderationAction.timeoutUser(broadcasterId, uid, dur, reason)}
        onBan={(uid: string, reason?: string) => moderationAction.banUser(broadcasterId, uid, reason)}
        onUnban={(uid: string) => moderationAction.unbanUser(broadcasterId, uid)}
        onAddVIP={(uid: string) => moderationAction.addVIP(broadcasterId, uid)}
        onRemoveVIP={(uid: string) => moderationAction.removeVIP(broadcasterId, uid)}
        channelName={channelName}
      />

      {/* Viewer Profile */}
      <ViewerProfile
        viewer={selectedViewerData}
        isOpen={showViewerProfile}
        onClose={() => { setShowViewerProfile(false); setSelectedViewer(null); }}
        channelName={channelName}
        onOpenModeration={(uid: string, uname: string) => { setModerationUser({ userId: uid, username: uname }); setShowModerationDrawer(true); }}
      />
    </div>
  );
};

export default StreamActivity;
