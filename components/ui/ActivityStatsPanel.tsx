/**
 * ActivityStatsPanel Component
 * Aggregated statistics panel for all activity types
 * Shows metrics, charts, and export functionality
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart3, TrendingUp, Users, Trophy, Calendar,
  Download, FileSpreadsheet, Filter
} from 'lucide-react';
import {
  filterByDateRange,
  calculateStatistics,
  exportToCSV,
  exportToJSON,
  type BaseHistoryItem,
  type DateRangeType,
  type ActivityType,
  type HistoryStatistics,
} from '../../hooks/useActivityHistory';

// ============================================
// TYPES
// ============================================

export interface ActivityStatsData {
  polls: BaseHistoryItem[];
  predictions: BaseHistoryItem[];
  games: BaseHistoryItem[];
  giveaways: BaseHistoryItem[];
}

export interface ActivityStatsPanelProps {
  data: ActivityStatsData;
  className?: string;
  showChart?: boolean;
}

interface AggregatedStats {
  total: number;
  totalParticipants: number;
  averageParticipants: number;
  byType: Record<ActivityType, number>;
  byDate: { date: string; count: number; byType: Record<ActivityType, number> }[];
  topResults: { result: string; count: number; type: ActivityType }[];
  mostActiveDay: string;
  peakParticipants: number;
}

// ============================================
// CONSTANTS
// ============================================

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  poll: '#8b5cf6',      // purple
  prediction: '#3b82f6', // blue
  game: '#22c55e',       // green
  giveaway: '#f59e0b',   // amber
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  poll: 'Encuestas',
  prediction: 'Predicciones',
  game: 'Juegos',
  giveaway: 'Sorteos',
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

export const ActivityStatsPanel: React.FC<ActivityStatsPanelProps> = ({
  data,
  className = '',
  showChart = true,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeType>('week');
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(
    new Set(['poll', 'prediction', 'game', 'giveaway'])
  );

  // Combine and filter all items
  const allItems = useMemo(() => {
    const items: BaseHistoryItem[] = [];
    
    if (selectedTypes.has('poll')) items.push(...data.polls);
    if (selectedTypes.has('prediction')) items.push(...data.predictions);
    if (selectedTypes.has('game')) items.push(...data.games);
    if (selectedTypes.has('giveaway')) items.push(...data.giveaways);
    
    return filterByDateRange(items, dateRange);
  }, [data, dateRange, selectedTypes]);

  // Calculate aggregated statistics
  const stats = useMemo((): AggregatedStats => {
    if (allItems.length === 0) {
      return {
        total: 0,
        totalParticipants: 0,
        averageParticipants: 0,
        byType: { poll: 0, prediction: 0, game: 0, giveaway: 0 },
        byDate: [],
        topResults: [],
        mostActiveDay: '-',
        peakParticipants: 0,
      };
    }

    // Count by type
    const byType: Record<ActivityType, number> = { poll: 0, prediction: 0, game: 0, giveaway: 0 };
    let totalParticipants = 0;
    let peakParticipants = 0;
    const resultCounts: Record<string, { count: number; type: ActivityType }> = {};

    allItems.forEach(item => {
      byType[item.type]++;
      totalParticipants += item.participantCount;
      peakParticipants = Math.max(peakParticipants, item.participantCount);
      
      const key = `${item.result}|${item.type}`;
      if (!resultCounts[key]) {
        resultCounts[key] = { count: 0, type: item.type };
      }
      resultCounts[key].count++;
    });

    // Top results
    const topResults = Object.entries(resultCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, data]) => ({
        result: key.split('|')[0],
        count: data.count,
        type: data.type,
      }));

    // Count by date (last 7 days)
    const dateCounts: Record<string, { count: number; byType: Record<ActivityType, number> }> = {};
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * DAY_MS);
      const dateStr = date.toISOString().split('T')[0];
      dateCounts[dateStr] = { count: 0, byType: { poll: 0, prediction: 0, game: 0, giveaway: 0 } };
    }

    allItems.forEach(item => {
      const dateStr = new Date(item.finishedAt).toISOString().split('T')[0];
      if (dateCounts[dateStr]) {
        dateCounts[dateStr].count++;
        dateCounts[dateStr].byType[item.type]++;
      }
    });

    const byDate = Object.entries(dateCounts).map(([date, data]) => ({
      date,
      count: data.count,
      byType: data.byType,
    }));

    // Most active day
    const mostActiveEntry = byDate.reduce((max, curr) => 
      curr.count > max.count ? curr : max, byDate[0]);
    const mostActiveDay = mostActiveEntry?.count > 0 
      ? new Date(mostActiveEntry.date).toLocaleDateString('es-ES', { weekday: 'long' })
      : '-';

    return {
      total: allItems.length,
      totalParticipants,
      averageParticipants: Math.round(totalParticipants / allItems.length),
      byType,
      byDate,
      topResults,
      mostActiveDay,
      peakParticipants,
    };
  }, [allItems]);

  // Toggle activity type filter
  const toggleType = useCallback((type: ActivityType) => {
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
    const csv = exportToCSV(allItems);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-actividades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allItems]);

  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(allItems);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-actividades-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allItems]);

  // Simple bar chart renderer
  const renderChart = () => {
    if (!showChart || stats.byDate.length === 0) return null;

    const maxCount = Math.max(...stats.byDate.map(d => d.count), 1);

    return (
      <div className="mt-4">
        <h4 className="text-xs font-medium text-zinc-500 mb-2">Actividad últimos 7 días</h4>
        <div className="flex items-end gap-1 h-24">
          {stats.byDate.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full rounded-t flex flex-col-reverse overflow-hidden"
                style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
              >
                {(['giveaway', 'game', 'prediction', 'poll'] as ActivityType[]).map(type => {
                  const typeCount = day.byType[type];
                  if (typeCount === 0 || !selectedTypes.has(type)) return null;
                  const height = (typeCount / day.count) * 100;
                  return (
                    <div
                      key={type}
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: ACTIVITY_COLORS[type],
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-zinc-400 mt-1">
                {new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Estadísticas de Actividad
          </h3>
        </div>
        <div className="flex gap-1">
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Date range */}
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

        {/* Type filters */}
        <div className="flex gap-1 ml-auto">
          {(['poll', 'prediction', 'game', 'giveaway'] as ActivityType[]).map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                selectedTypes.has(type)
                  ? 'text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
              }`}
              style={selectedTypes.has(type) ? { backgroundColor: ACTIVITY_COLORS[type] } : {}}
              title={ACTIVITY_LABELS[type]}
            >
              {ACTIVITY_LABELS[type].slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.total}
          </div>
          <div className="text-xs text-zinc-500">Total actividades</div>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalParticipants.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500">Participaciones</div>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.averageParticipants}
          </div>
          <div className="text-xs text-zinc-500">Promedio</div>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.peakParticipants}
          </div>
          <div className="text-xs text-zinc-500">Pico máximo</div>
        </div>
      </div>

      {/* By type breakdown */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <h4 className="text-xs font-medium text-zinc-500 mb-2">Por tipo de actividad</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['poll', 'prediction', 'game', 'giveaway'] as ActivityType[]).map(type => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[type] }}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {ACTIVITY_LABELS[type]}:
              </span>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {stats.byType[type]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Top results */}
      {stats.topResults.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Top Resultados
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topResults.slice(0, 5).map((item, i) => (
              <span 
                key={`${item.result}-${i}`} 
                className="px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 rounded-full flex items-center gap-1"
              >
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ACTIVITY_COLORS[item.type] }}
                />
                {i + 1}. {item.result} ({item.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional insights */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">Día más activo</span>
          </div>
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 capitalize">
            {stats.mostActiveDay}
          </span>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">Actividad favorita</span>
          </div>
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {(() => {
              const sorted = Object.entries(stats.byType).sort(([,a], [,b]) => (b as number) - (a as number));
              const topType = sorted[0]?.[0] as ActivityType | undefined;
              return topType ? ACTIVITY_LABELS[topType] : '-';
            })()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ActivityStatsPanel;
