/**
 * UnifiedHistoryPanel Component
 * Shows history of ALL dynamics in a single unified view
 * Combines polls, predictions, games, giveaways, judge, and spinner
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  History, Search, Filter, Download, Trophy, Users, Calendar,
  ChevronDown, ChevronUp, X, FileSpreadsheet, Vote, Zap, 
  Gamepad2, Gift, Gavel, Disc3, Clock, TrendingUp
} from 'lucide-react';
import {
  filterByDateRange,
  filterBySearchTerm,
  exportToCSV,
  exportToJSON,
  type BaseHistoryItem,
  type DateRangeType,
  type ActivityType,
} from '../../hooks/useActivityHistory';

// ============================================
// TYPES
// ============================================

export interface UnifiedHistoryItem extends BaseHistoryItem {
  icon?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface UnifiedHistoryPanelProps {
  className?: string;
  maxHeight?: string;
  onItemClick?: (item: UnifiedHistoryItem) => void;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEYS: Record<string, string> = {
  poll: 'poll_history',
  prediction: 'prediction_history',
  game: 'game_history',
  giveaway: 'giveaway_history',
  judge: 'judge_history',
  spinner: 'spinner_history',
};

const ACTIVITY_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  poll: { 
    icon: <Vote size={14} />, 
    label: 'Encuesta', 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
  },
  prediction: { 
    icon: <Zap size={14} />, 
    label: 'Predicción', 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  game: { 
    icon: <Gamepad2 size={14} />, 
    label: 'Juego', 
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
  giveaway: { 
    icon: <Gift size={14} />, 
    label: 'Sorteo', 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
  },
  judge: { 
    icon: <Gavel size={14} />, 
    label: 'Jurado', 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
  },
  spinner: { 
    icon: <Disc3 size={14} />, 
    label: 'Ruleta', 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
  },
};

const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  all: 'Todo',
  custom: 'Personalizado',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadAllHistory(): UnifiedHistoryItem[] {
  const allItems: UnifiedHistoryItem[] = [];

  // Load from each storage key
  Object.entries(STORAGE_KEYS).forEach(([type, key]) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            allItems.push(normalizeHistoryItem(item, type as ActivityType));
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  });

  // Sort by finishedAt descending
  return allItems.sort((a, b) => b.finishedAt - a.finishedAt);
}

function normalizeHistoryItem(item: any, type: ActivityType): UnifiedHistoryItem {
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || item.title || item.question || item.prize || item.gameName || 'Sin nombre',
    type,
    result: item.result || item.winner || item.winningOutcome || 'Sin resultado',
    participantCount: item.participantCount || item.totalVotes || item.participants || item.totalParticipants || 0,
    createdAt: item.createdAt || item.startTime || item.startedAt || Date.now(),
    finishedAt: item.finishedAt || item.endTime || item.resolvedAt || Date.now(),
    duration: item.duration,
    metadata: item,
  };
}

// ============================================
// COMPONENT
// ============================================

export const UnifiedHistoryPanel: React.FC<UnifiedHistoryPanelProps> = ({
  className = '',
  maxHeight = '500px',
  onItemClick,
}) => {
  // State
  const [items, setItems] = useState<UnifiedHistoryItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(Object.keys(ACTIVITY_CONFIG))
  );
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  // Load history on mount
  useEffect(() => {
    setItems(loadAllHistory());
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items.filter(item => selectedTypes.has(item.type));
    result = filterByDateRange(result, dateRange);
    if (searchTerm.trim()) {
      result = filterBySearchTerm(result, searchTerm, 'name');
    }
    return result;
  }, [items, dateRange, searchTerm, selectedTypes]);

  // Statistics
  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let totalParticipants = 0;
    
    filteredItems.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalParticipants += item.participantCount;
    });

    return {
      total: filteredItems.length,
      byType,
      totalParticipants,
      avgParticipants: filteredItems.length > 0 
        ? Math.round(totalParticipants / filteredItems.length) 
        : 0,
    };
  }, [filteredItems]);

  // Toggle type filter
  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(filteredItems);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-completo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems]);

  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(filteredItems);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-completo-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setItems(loadAllHistory());
  }, []);

  // Format helpers
  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short' 
    });
  };

  const formatFullDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const hasActiveFilters = dateRange !== 'all' || searchTerm.trim() !== '' || selectedTypes.size < Object.keys(ACTIVITY_CONFIG).length;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Historial Completo
          </h3>
          <span className="px-2 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 rounded-full">
            {filteredItems.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Actualizar"
          >
            <TrendingUp size={16} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters || hasActiveFilters 
                ? 'bg-purple-500 text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
            title="Filtros"
          >
            <Filter size={16} />
          </button>
          <button 
            onClick={handleExportCSV} 
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" 
            title="Exportar CSV"
          >
            <FileSpreadsheet size={16} />
          </button>
          <button 
            onClick={handleExportJSON} 
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" 
            title="Exportar JSON"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {stats.total}
          </div>
          <div className="text-[10px] text-zinc-500">Total</div>
        </div>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {stats.totalParticipants.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500">Participaciones</div>
        </div>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.avgParticipants}
          </div>
          <div className="text-[10px] text-zinc-500">Promedio</div>
        </div>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {Object.keys(stats.byType).length}
          </div>
          <div className="text-[10px] text-zinc-500">Tipos</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3 mb-4 shrink-0">
          {/* Type filters */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-2 block">Tipo de actividad</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                    selectedTypes.has(type)
                      ? `${config.bgColor} text-white`
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                  }`}
                >
                  {config.icon}
                  {config.label}
                  {stats.byType[type] && (
                    <span className="opacity-70">({stats.byType[type]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-2 block">Período</label>
            <div className="flex gap-1">
              {(['today', 'week', 'month', 'all'] as DateRangeType[]).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {DATE_RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-7 pr-8 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar" style={{ maxHeight }}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {hasActiveFilters ? 'Sin resultados' : 'Sin historial'}
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              {hasActiveFilters
                ? 'No hay elementos que coincidan con los filtros aplicados.'
                : 'Completa tu primera actividad para ver el historial aquí.'}
            </p>
          </div>
        ) : (
          filteredItems.slice(0, visibleCount).map(item => {
            const config = ACTIVITY_CONFIG[item.type];
            const isExpanded = expandedId === item.id;
            
            return (
              <div
                key={item.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => {
                  setExpandedId(isExpanded ? null : item.id);
                  onItemClick?.(item);
                }}
              >
                {/* Main row */}
                <div className="flex items-center gap-3">
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-lg ${config.bgColor}/10 flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">
                        {item.name}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bgColor}/20 ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Trophy size={10} className="text-amber-500" />
                        {item.result}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Users size={10} />
                        {item.participantCount}
                      </span>
                      {item.duration && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock size={10} />
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Time & expand */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">{formatDate(item.finishedAt)}</span>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-zinc-400" />
                    ) : (
                      <ChevronDown size={14} className="text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} />
                      <span>Inicio: {formatFullDate(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>Fin: {formatFullDate(item.finishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={12} />
                      <span>Participantes: {item.participantCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy size={12} />
                      <span>Resultado: {item.result}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {visibleCount < filteredItems.length && (
        <button
          onClick={() => setVisibleCount(v => v + 30)}
          className="w-full py-2 mt-3 text-sm text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors shrink-0"
        >
          Cargar más ({filteredItems.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};

export default UnifiedHistoryPanel;
