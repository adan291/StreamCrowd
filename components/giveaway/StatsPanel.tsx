/**
 * StatsPanel Component
 * Displays giveaway statistics with export functionality
 */

import React, { useMemo, useState } from 'react';
import { 
  Trophy, 
  Users, 
  Gift, 
  TrendingUp, 
  Download, 
  Trash2,
  BarChart3,
  Clock,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { GiveawayStorage } from './services/GiveawayStorage';
import type { GiveawayStats, RaffleMode } from './types';

// ============================================
// TYPES
// ============================================

export interface StatsPanelProps {
  stats?: GiveawayStats;
  onRefresh?: () => void;
  onClear?: () => void;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, color }) => (
  <div className={`p-4 rounded-xl bg-gradient-to-br ${color} text-white`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/20 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
        {subValue && <p className="text-xs opacity-60 mt-1">{subValue}</p>}
      </div>
    </div>
  </div>
);

// ============================================
// COMPONENT
// ============================================

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats: propStats,
  onRefresh,
  onClear,
  className = '',
}) => {
  // Force re-render after clearing
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Load stats from storage if not provided
  const stats = useMemo(() => {
    return propStats || GiveawayStorage.getStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propStats, refreshKey]);

  // Calculate derived metrics
  const derivedStats = useMemo(() => {
    const avgParticipants = stats.totalGiveaways > 0
      ? Math.round(stats.totalParticipants / stats.totalGiveaways)
      : 0;

    const maxParticipants = stats.participantCounts.length > 0
      ? Math.max(...stats.participantCounts)
      : 0;

    const minParticipants = stats.participantCounts.length > 0
      ? Math.min(...stats.participantCounts)
      : 0;

    const mostUsedMode = Object.entries(stats.byMode)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    const modeLabels: Record<RaffleMode, string> = {
      viewers: 'Viewers',
      keyword: 'Keyword',
      subs: 'Subs',
    };

    return {
      avgParticipants,
      maxParticipants,
      minParticipants,
      mostUsedMode: mostUsedMode ? modeLabels[mostUsedMode[0] as RaffleMode] : 'N/A',
      mostUsedModeCount: mostUsedMode ? mostUsedMode[1] : 0,
      uniqueWinnersCount: stats.uniqueWinners.length,
      repeatWinnerRate: stats.totalGiveaways > 0 && stats.uniqueWinners.length > 0
        ? Math.round((1 - stats.uniqueWinners.length / stats.totalGiveaways) * 100)
        : 0,
    };
  }, [stats]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportAsJSON = () => {
    const data = {
      stats,
      derivedStats,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giveaway-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Total Sorteos', stats.totalGiveaways.toString()],
      ['Total Participantes', stats.totalParticipants.toString()],
      ['Promedio Participantes', derivedStats.avgParticipants.toString()],
      ['Máximo Participantes', derivedStats.maxParticipants.toString()],
      ['Mínimo Participantes', derivedStats.minParticipants.toString()],
      ['Ganadores Únicos', derivedStats.uniqueWinnersCount.toString()],
      ['Sorteos Viewers', stats.byMode.viewers.toString()],
      ['Sorteos Keyword', stats.byMode.keyword.toString()],
      ['Sorteos Subs', stats.byMode.subs.toString()],
      ['Modo Más Usado', derivedStats.mostUsedMode],
      ['Última Actualización', new Date(stats.lastUpdated).toLocaleString()],
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giveaway-stats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('¿Estás seguro de que quieres borrar todas las estadísticas? Esta acción no se puede deshacer.')) {
      GiveawayStorage.saveStats({
        totalGiveaways: 0,
        totalParticipants: 0,
        uniqueWinners: [],
        participantCounts: [],
        byMode: { viewers: 0, keyword: 0, subs: 0 },
        lastUpdated: Date.now(),
      });
      // Force re-render
      setRefreshKey(prev => prev + 1);
      onClear?.();
      onRefresh?.();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Estadísticas de Sorteos
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportAsJSON}
            className="px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 text-xs"
            title="Exportar como JSON"
          >
            <FileJson size={14} />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            onClick={exportAsCSV}
            className="px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 text-xs"
            title="Exportar como CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                       hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Borrar todas las estadísticas"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Gift size={20} />}
          label="Total Sorteos"
          value={stats.totalGiveaways}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Total Participantes"
          value={stats.totalParticipants.toLocaleString()}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Promedio"
          value={derivedStats.avgParticipants}
          subValue="participantes/sorteo"
          color="from-green-500 to-green-600"
        />
        <StatCard
          icon={<Trophy size={20} />}
          label="Ganadores Únicos"
          value={derivedStats.uniqueWinnersCount}
          color="from-amber-500 to-amber-600"
        />
      </div>

      {/* Mode Distribution */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
          Distribución por Modo
        </h4>
        <div className="space-y-2">
          {Object.entries(stats.byMode).map(([mode, count]) => {
            const total = stats.totalGiveaways || 1;
            const countNum = count as number;
            const percentage = Math.round((countNum / total) * 100);
            const colors: Record<string, string> = {
              viewers: 'bg-blue-500',
              keyword: 'bg-purple-500',
              subs: 'bg-amber-500',
            };
            const labels: Record<string, string> = {
              viewers: 'Viewers',
              keyword: 'Keyword',
              subs: 'Subs',
            };

            return (
              <div key={mode} className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 w-16">
                  {labels[mode]}
                </span>
                <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[mode]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-12 text-right">
                  {countNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-zinc-500 dark:text-zinc-400">Máx. participantes</p>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {derivedStats.maxParticipants}
          </p>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-zinc-500 dark:text-zinc-400">Mín. participantes</p>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {derivedStats.minParticipants}
          </p>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-zinc-500 dark:text-zinc-400">Modo favorito</p>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {derivedStats.mostUsedMode}
          </p>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-zinc-500 dark:text-zinc-400">Tasa repetición</p>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {derivedStats.repeatWinnerRate}%
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <Clock size={12} />
        <span>
          Última actualización: {new Date(stats.lastUpdated).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default StatsPanel;
