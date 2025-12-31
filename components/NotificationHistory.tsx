/**
 * NotificationHistory - Component for displaying notification history and statistics
 * 
 * Shows a list of sent notifications with filtering by channel and status,
 * along with statistics about notifications sent today, failed, and pending.
 * 
 * @requirements 6.2, 6.3, 6.4
 */
import React, { useState, useMemo } from 'react';
import {
  Bell,
  MessageSquare,
  Send,
  Check,
  X,
  Clock,
  AlertCircle,
  Filter,
  Trash2,
  RefreshCw,
  ChevronDown,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useNotificationHistory } from '../hooks/useNotificationHistory';
import type {
  NotificationChannel,
  NotificationHistoryEntry,
} from '../types/notifications';
import { EVENT_TYPE_EMOJIS } from '../types/notifications';

// ============================================
// TYPES
// ============================================

type FilterChannel = NotificationChannel | 'all';
type FilterStatus = 'all' | 'success' | 'failed';

// ============================================
// CONSTANTS
// ============================================

const CHANNEL_CONFIG: Record<NotificationChannel, { label: string; icon: React.ReactNode; color: string }> = {
  push: { label: 'Push', icon: <Bell size={12} />, color: 'bg-purple-500/20 text-purple-400' },
  discord: { label: 'Discord', icon: <MessageSquare size={12} />, color: 'bg-indigo-500/20 text-indigo-400' },
  telegram: { label: 'Telegram', icon: <Send size={12} />, color: 'bg-blue-500/20 text-blue-400' },
};

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl ${color}`}>
    <div className="p-2 bg-white/10 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  </div>
);

// ============================================
// FILTER DROPDOWN COMPONENT
// ============================================


interface FilterDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}

function FilterDropdown<T extends string>({ value, onChange, options, label }: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        <Filter size={14} />
        <span>{label}: {selectedOption?.label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-20 min-w-[150px]">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  value === option.value ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// HISTORY ENTRY COMPONENT
// ============================================

interface HistoryEntryProps {
  entry: NotificationHistoryEntry;
}

const HistoryEntry: React.FC<HistoryEntryProps> = ({ entry }) => {
  const emoji = EVENT_TYPE_EMOJIS[entry.event.type] || '🔔';
  const date = new Date(entry.createdAt);
  const hasSuccess = entry.results.some(r => r.success);
  const hasFailed = entry.results.some(r => !r.success);

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-medium truncate">{entry.event.title}</h4>
            <p className="text-zinc-400 text-xs truncate">{entry.event.message}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasSuccess && hasFailed ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
              <AlertCircle size={12} />
              <span>Parcial</span>
            </div>
          ) : hasSuccess ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
              <Check size={12} />
              <span>Enviado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">
              <X size={12} />
              <span>Fallido</span>
            </div>
          )}
        </div>
      </div>

      {/* Channel Results */}
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-700/50">
        {entry.results.map((result, idx) => {
          const channelConfig = CHANNEL_CONFIG[result.channel];
          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                result.success ? channelConfig.color : 'bg-red-500/10 text-red-400'
              }`}
              title={result.error || undefined}
            >
              {channelConfig.icon}
              <span>{channelConfig.label}</span>
              {result.success ? <Check size={10} /> : <X size={10} />}
            </div>
          );
        })}
        
        <span className="text-zinc-500 text-xs ml-auto">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};


// ============================================
// MAIN COMPONENT
// ============================================

export interface NotificationHistoryProps {
  onClose?: () => void;
  showHeader?: boolean;
}

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ 
  onClose,
  showHeader = true,
}) => {
  const [channelFilter, setChannelFilter] = useState<FilterChannel>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const {
    history,
    stats,
    clearHistory,
    refresh,
    isLoading,
    count,
  } = useNotificationHistory();

  // Filter history based on selected filters
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Filter by channel
    if (channelFilter !== 'all') {
      filtered = filtered.filter(entry => 
        entry.channels.includes(channelFilter)
      );
    }

    // Filter by status
    if (statusFilter === 'success') {
      filtered = filtered.filter(entry => 
        entry.results.some(r => r.success)
      );
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter(entry => 
        entry.results.every(r => !r.success)
      );
    }

    return filtered;
  }, [history, channelFilter, statusFilter]);

  const handleClearHistory = async () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
      await clearHistory();
    }
  };

  const channelOptions: { value: FilterChannel; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'push', label: 'Push' },
    { value: 'discord', label: 'Discord' },
    { value: 'telegram', label: 'Telegram' },
  ];

  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'success', label: 'Exitosos' },
    { value: 'failed', label: 'Fallidos' },
  ];

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col max-h-[600px]">
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Calendar size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Historial</h2>
              <p className="text-zinc-500 text-xs">{count} notificaciones</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="p-4 border-b border-zinc-800">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Enviadas hoy"
            value={stats.sentToday}
            icon={<TrendingUp size={16} />}
            color="bg-green-500/10 text-green-400"
          />
          <StatCard
            label="Fallidas"
            value={stats.failed}
            icon={<AlertCircle size={16} />}
            color="bg-red-500/10 text-red-400"
          />
          <StatCard
            label="Pendientes"
            value={stats.pending}
            icon={<Clock size={16} />}
            color="bg-yellow-500/10 text-yellow-400"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={channelFilter}
            onChange={setChannelFilter}
            options={channelOptions}
            label="Canal"
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            label="Estado"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleClearHistory}
            disabled={count === 0}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Limpiar historial"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && filteredHistory.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="text-zinc-500 animate-spin" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={40} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-500 text-sm">
              {count === 0 
                ? 'No hay notificaciones en el historial'
                : 'No hay notificaciones que coincidan con los filtros'
              }
            </p>
          </div>
        ) : (
          filteredHistory.map(entry => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationHistory;