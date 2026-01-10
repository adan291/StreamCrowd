/**
 * GenericHistoryPanel Component
 * Reusable history panel for all activity types (polls, predictions, games, giveaways)
 * Provides filtering, search, export, and statistics display
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  History, Search, Filter, Download, Trophy, Users, 
  ChevronDown, ChevronUp, X, FileSpreadsheet, BarChart3
} from 'lucide-react';
import {
  filterByDateRange,
  filterBySearchTerm,
  calculateStatistics,
  exportToCSV,
  exportToJSON,
  type BaseHistoryItem,
  type DateRangeType,
  type ActivityType,
} from '../../hooks/useActivityHistory';

// ============================================
// TYPES
// ============================================

export interface HistoryPanelConfig<T extends BaseHistoryItem> {
  /** Activity type for styling */
  activityType: ActivityType;
  /** Title for the panel */
  title?: string;
  /** Custom labels for activity-specific fields */
  labels?: {
    result?: string;
    participants?: string;
  };
  /** Custom render function for item details */
  renderItemDetails?: (item: T) => React.ReactNode;
  /** Custom render function for expanded content */
  renderExpandedContent?: (item: T) => React.ReactNode;
  /** Fields to include in CSV export */
  exportFields?: (keyof T)[];
  /** Custom color for the activity type */
  accentColor?: string;
}

export interface GenericHistoryPanelProps<T extends BaseHistoryItem> {
  items: T[];
  config: HistoryPanelConfig<T>;
  className?: string;
  maxHeight?: string;
  initialVisibleCount?: number;
  onItemClick?: (item: T) => void;
}

// ============================================
// CONSTANTS
// ============================================

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  poll: 'purple',
  prediction: 'blue',
  game: 'green',
  giveaway: 'amber',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  poll: 'Encuesta',
  prediction: 'Predicción',
  game: 'Juego',
  giveaway: 'Sorteo',
};

const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  all: 'Todo',
  custom: 'Personalizado',
};

// ============================================
// COMPONENT
// ============================================

export function GenericHistoryPanel<T extends BaseHistoryItem>({
  items,
  config,
  className = '',
  maxHeight = '400px',
  initialVisibleCount = 20,
  onItemClick,
}: GenericHistoryPanelProps<T>): React.ReactElement {
  const {
    activityType,
    title,
    labels = {},
    renderItemDetails,
    renderExpandedContent,
    exportFields,
    accentColor,
  } = config;

  // State
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);

  // Derived color
  const color = accentColor || ACTIVITY_COLORS[activityType];
  const colorClasses = {
    bg: `bg-${color}-500`,
    bgLight: `bg-${color}-500/10`,
    border: `border-${color}-500/20`,
    text: `text-${color}-500`,
    textDark: `text-${color}-600 dark:text-${color}-400`,
    hover: `hover:bg-${color}-500/10`,
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let result = filterByDateRange(items, dateRange);
    if (searchTerm.trim()) {
      result = filterBySearchTerm(result, searchTerm, 'result');
    }
    // Sort by finishedAt descending
    return result.sort((a, b) => b.finishedAt - a.finishedAt);
  }, [items, dateRange, searchTerm]);

  // Statistics
  const statistics = useMemo(() => calculateStatistics(filteredItems), [filteredItems]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(filteredItems, exportFields);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${activityType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems, exportFields, activityType]);

  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(filteredItems);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${activityType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems, activityType]);

  // Format date
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  // Check if filters are active
  const hasActiveFilters = dateRange !== 'all' || searchTerm.trim() !== '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className={`w-5 h-5 text-${color}-500`} />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {title || `Historial de ${ACTIVITY_LABELS[activityType]}s`} ({filteredItems.length})
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-1.5 rounded-lg transition-colors ${
              showStats ? `bg-${color}-500 text-white` : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
            title="Estadísticas"
          >
            <BarChart3 size={16} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters || hasActiveFilters ? `bg-${color}-500 text-white` : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
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

      {/* Statistics Panel */}
      {showStats && statistics.total > 0 && (
        <div className={`p-3 bg-${color}-500/10 border border-${color}-500/20 rounded-xl space-y-3`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
                {statistics.total}
              </div>
              <div className="text-xs text-zinc-500">Total</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
                {statistics.averageParticipants}
              </div>
              <div className="text-xs text-zinc-500">{labels.participants || 'Participantes'} promedio</div>
            </div>
          </div>
          
          {/* Top Results */}
          {statistics.topResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className={`text-${color}-500`} />
                <span className={`text-xs font-medium text-${color}-600 dark:text-${color}-400`}>
                  Top {labels.result || 'Resultados'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {statistics.topResults.slice(0, 5).map((item, i) => (
                  <span key={item.result} className="px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 rounded-full">
                    {i + 1}. {item.result} ({item.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3">
          {/* Date range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Período</label>
            <div className="flex flex-wrap gap-1">
              {(['today', 'week', 'month', 'all'] as DateRangeType[]).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    dateRange === range
                      ? `bg-${color}-500 text-white`
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
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Buscar {labels.result || 'resultado'}
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
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
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight }}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {hasActiveFilters ? 'Sin resultados' : 'Sin historial'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {hasActiveFilters
                ? 'No hay elementos que coincidan con los filtros.'
                : `Completa tu primera ${ACTIVITY_LABELS[activityType].toLowerCase()} para ver el historial.`}
            </p>
          </div>
        ) : (
          filteredItems.slice(0, visibleCount).map(item => (
            <div
              key={item.id}
              className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                setExpandedId(expandedId === item.id ? null : item.id);
                onItemClick?.(item);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-${color}-500`} />
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{formatDate(item.finishedAt)}</span>
                  {expandedId === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              
              {/* Item details */}
              <div className="flex items-center gap-3 mt-1">
                {renderItemDetails ? (
                  renderItemDetails(item)
                ) : (
                  <>
                    <span className={`flex items-center gap-1 text-xs text-${color}-600`}>
                      <Trophy size={12} /> {item.result}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users size={12} /> {item.participantCount}
                    </span>
                  </>
                )}
              </div>

              {/* Expanded content */}
              {expandedId === item.id && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 space-y-1">
                  {renderExpandedContent ? (
                    renderExpandedContent(item)
                  ) : (
                    <>
                      <p>Tipo: {ACTIVITY_LABELS[item.type]}</p>
                      <p>Inicio: {formatDate(item.createdAt)}</p>
                      <p>Fin: {formatDate(item.finishedAt)}</p>
                      <p>{labels.participants || 'Participantes'}: {item.participantCount}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {visibleCount < filteredItems.length && (
        <button
          onClick={() => setVisibleCount(v => v + 20)}
          className={`w-full py-2 text-sm text-${color}-500 hover:bg-${color}-500/10 rounded-lg transition-colors`}
        >
          Cargar más ({filteredItems.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}

export default GenericHistoryPanel;
