/**
 * HistoryPanel Component
 * Enhanced history view with filters and export
 */

import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Download, Calendar, Trophy, Users, 
  ChevronDown, ChevronUp, X, FileSpreadsheet
} from 'lucide-react';
import { GiveawayStorage } from './services/GiveawayStorage';
import { EmptyState } from './EmptyState';
import type { FinishedGiveaway, RaffleMode, DateRangeType, HistoryFilters } from './types';

interface HistoryPanelProps {
  className?: string;
}

const MODE_LABELS: Record<RaffleMode, string> = {
  viewers: 'Viewers',
  keyword: 'Keyword',
  subs: 'Subs',
};

const MODE_COLORS: Record<RaffleMode, string> = {
  viewers: 'bg-blue-500',
  keyword: 'bg-purple-500',
  subs: 'bg-amber-500',
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ className = '' }) => {
  const [filters, setFilters] = useState<HistoryFilters>({
    dateRange: 'all',
    mode: 'all',
    winnerSearch: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const history = useMemo(() => GiveawayStorage.getHistory(), []);

  // Apply filters
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // Date filter
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (filters.dateRange === 'today') {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      result = result.filter(h => h.finishedAt >= startOfDay);
    } else if (filters.dateRange === 'week') {
      result = result.filter(h => h.finishedAt >= now - 7 * dayMs);
    } else if (filters.dateRange === 'month') {
      result = result.filter(h => h.finishedAt >= now - 30 * dayMs);
    } else if (filters.dateRange === 'custom' && filters.customStartDate) {
      const start = new Date(filters.customStartDate).getTime();
      const end = filters.customEndDate 
        ? new Date(filters.customEndDate).getTime() + dayMs 
        : now;
      result = result.filter(h => h.finishedAt >= start && h.finishedAt <= end);
    }

    // Mode filter
    if (filters.mode && filters.mode !== 'all') {
      result = result.filter(h => h.mode === filters.mode);
    }

    // Winner search
    if (filters.winnerSearch) {
      const search = filters.winnerSearch.toLowerCase();
      result = result.filter(h => h.winner.toLowerCase().includes(search));
    }

    return result;
  }, [history, filters]);

  // Top winners
  const topWinners = useMemo(() => {
    const winnerCounts: Record<string, number> = {};
    filteredHistory.forEach(h => {
      winnerCounts[h.winner] = (winnerCounts[h.winner] || 0) + 1;
    });
    return Object.entries(winnerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [filteredHistory]);

  // Export functions
  const exportCSV = () => {
    const headers = ['Fecha', 'Nombre', 'Modo', 'Ganador', 'Participantes', 'Solo Subs'];
    const rows = filteredHistory.map(h => [
      new Date(h.finishedAt).toLocaleString(),
      h.name,
      MODE_LABELS[h.mode],
      h.winner,
      h.participantCount.toString(),
      h.subscribersOnly ? 'Sí' : 'No',
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-sorteos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { history: filteredHistory, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-sorteos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Historial ({filteredHistory.length})
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Filter size={16} />
          </button>
          <button onClick={exportCSV} className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Exportar CSV">
            <FileSpreadsheet size={16} />
          </button>
          <button onClick={exportJSON} className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Exportar JSON">
            <Download size={16} />
          </button>
        </div>
      </div>

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
                  onClick={() => setFilters(f => ({ ...f, dateRange: range }))}
                  className={`px-2 py-1 text-xs rounded-lg ${
                    filters.dateRange === range
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Todo'}
                </button>
              ))}
            </div>
          </div>

          {/* Mode filter */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Modo</label>
            <div className="flex gap-1">
              <button
                onClick={() => setFilters(f => ({ ...f, mode: 'all' }))}
                className={`px-2 py-1 text-xs rounded-lg ${
                  filters.mode === 'all' ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                Todos
              </button>
              {(['viewers', 'keyword', 'subs'] as RaffleMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilters(f => ({ ...f, mode }))}
                  className={`px-2 py-1 text-xs rounded-lg ${
                    filters.mode === mode ? 'bg-purple-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Winner search */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Buscar ganador</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={filters.winnerSearch}
                onChange={e => setFilters(f => ({ ...f, winnerSearch: e.target.value }))}
                placeholder="Nombre..."
                className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
              {filters.winnerSearch && (
                <button
                  onClick={() => setFilters(f => ({ ...f, winnerSearch: '' }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Winners */}
      {topWinners.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Top Ganadores</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topWinners.map(([winner, count], i) => (
              <span key={winner} className="px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 rounded-full">
                {i + 1}. {winner} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* History List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <EmptyState
            type="history"
            title={filters.winnerSearch || filters.mode !== 'all' || filters.dateRange !== 'all' 
              ? 'Sin resultados' 
              : 'Sin historial'}
            description={filters.winnerSearch || filters.mode !== 'all' || filters.dateRange !== 'all'
              ? 'No hay sorteos que coincidan con los filtros aplicados.'
              : 'Completa tu primer sorteo para ver el historial aquí.'}
          />
        ) : (
          filteredHistory.slice(0, visibleCount).map(item => (
            <div
              key={item.id}
              className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${MODE_COLORS[item.mode]}`} />
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{formatDate(item.finishedAt)}</span>
                  {expandedId === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Trophy size={12} /> {item.winner}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Users size={12} /> {item.participantCount}
                </span>
              </div>

              {expandedId === item.id && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 space-y-1">
                  <p>Modo: {MODE_LABELS[item.mode]}</p>
                  {item.keyword && <p>Keyword: {item.keyword}</p>}
                  <p>Solo subs: {item.subscribersOnly ? 'Sí' : 'No'}</p>
                  <p>Inicio: {formatDate(item.createdAt)}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {visibleCount < filteredHistory.length && (
        <button
          onClick={() => setVisibleCount(v => v + 20)}
          className="w-full py-2 text-sm text-purple-500 hover:bg-purple-500/10 rounded-lg"
        >
          Cargar más ({filteredHistory.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};

export default HistoryPanel;
