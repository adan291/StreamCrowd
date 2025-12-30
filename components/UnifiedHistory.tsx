/**
 * UnifiedHistory - Centralized history view for all activities
 * 
 * Displays a unified view of all historical data:
 * - Polls
 * - Predictions
 * - Giveaways
 * - Commands
 * - Timers
 * 
 * Features:
 * - Tab-based navigation by category
 * - Date range filtering
 * - Search functionality
 * - Statistics per item
 * - Export/Import JSON
 * 
 * @requirements 1.1, 1.3, 1.4, 1.5, 1.8
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Calendar,
  Search,
  Download,
  Upload,
  BarChart3,
  Gift,
  Trophy,
  Terminal,
  Timer,
  Users,
  Hash,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { useHistoryManager } from '../hooks/useHistoryManager';
import { useI18n } from '../i18n';
import {
  HistoryItem,
  HistoryItemType,
  HistoryFilter,
  isPollHistoryData,
  isPredictionHistoryData,
  isGiveawayHistoryData,
  isCommandHistoryData,
  isTimerHistoryData,
} from '../types/history';

// ============================================
// TYPES
// ============================================

interface UnifiedHistoryProps {
  onClose: () => void;
  initialTab?: HistoryItemType | 'all';
}

type TabType = HistoryItemType | 'all';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

function getItemTitle(item: HistoryItem): string {
  const data = item.data;
  if (isPollHistoryData(data)) return data.question;
  if (isPredictionHistoryData(data)) return data.title;
  if (isGiveawayHistoryData(data)) return data.name;
  if (isCommandHistoryData(data)) return data.commandName;
  if (isTimerHistoryData(data)) return data.timerName;
  return 'Unknown';
}

function getItemSubtitle(item: HistoryItem): string {
  const data = item.data;
  if (isPollHistoryData(data)) {
    return `${data.totalVotes} votos • ${data.options.length} opciones`;
  }
  if (isPredictionHistoryData(data)) {
    return `${data.totalUsers} participantes • ${data.status}`;
  }
  if (isGiveawayHistoryData(data)) {
    return `${data.participantCount} participantes • Ganador: ${data.winner}`;
  }
  if (isCommandHistoryData(data)) {
    return `!${data.trigger} • Por: ${data.executedBy}`;
  }
  if (isTimerHistoryData(data)) {
    return `${data.executionCount} ejecuciones • ${data.interval}s intervalo`;
  }
  return '';
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface HistoryItemCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  item,
  onDelete,
  isExpanded,
  onToggle,
}) => {
  const getTypeIcon = () => {
    switch (item.type) {
      case 'poll': return <BarChart3 size={16} className="text-purple-500" />;
      case 'prediction': return <Trophy size={16} className="text-yellow-500" />;
      case 'giveaway': return <Gift size={16} className="text-pink-500" />;
      case 'command': return <Terminal size={16} className="text-blue-500" />;
      case 'timer': return <Timer size={16} className="text-green-500" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'poll': return 'border-purple-500/30 hover:border-purple-500/50';
      case 'prediction': return 'border-yellow-500/30 hover:border-yellow-500/50';
      case 'giveaway': return 'border-pink-500/30 hover:border-pink-500/50';
      case 'command': return 'border-blue-500/30 hover:border-blue-500/50';
      case 'timer': return 'border-green-500/30 hover:border-green-500/50';
    }
  };

  return (
    <div className={`bg-zinc-50 dark:bg-zinc-950/50 border ${getTypeColor()} rounded-xl transition-all`}>
      <button
        onClick={onToggle}
        className="w-full p-3 text-left flex items-start gap-3"
      >
        <div className="shrink-0 mt-0.5">{getTypeIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-zinc-900 dark:text-white text-sm truncate">
              {getItemTitle(item)}
            </h4>
            <div className="shrink-0 text-zinc-400">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            {getItemSubtitle(item)}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDateShort(item.timestamp)}
            </span>
            <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400 capitalize">
              {item.platform}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-200 dark:border-zinc-800 pt-3 animate-fade-in">
          <HistoryItemDetails item={item} />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryItemDetails: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const data = item.data;

  if (isPollHistoryData(data)) {
    return (
      <div className="space-y-2">
        {data.options.map((opt, idx) => (
          <div key={idx} className="relative h-6 bg-white dark:bg-zinc-900 rounded overflow-hidden flex items-center px-2 border border-zinc-100 dark:border-zinc-800">
            <div
              className="absolute top-0 left-0 h-full opacity-20"
              style={{ width: `${opt.percentage}%`, backgroundColor: opt.color }}
            />
            <div className="relative z-10 flex justify-between w-full text-xs">
              <span className="text-zinc-700 dark:text-zinc-300 truncate">
                {opt.icon && <span className="mr-1">{opt.icon}</span>}
                {opt.label}
              </span>
              <span className="text-zinc-500 shrink-0">{opt.votes} ({opt.percentage.toFixed(0)}%)</span>
            </div>
          </div>
        ))}
        {data.winnerLabel && (
          <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            <Trophy size={12} />
            Ganador: {data.winnerLabel}
          </div>
        )}
      </div>
    );
  }

  if (isPredictionHistoryData(data)) {
    return (
      <div className="space-y-2">
        {data.outcomes.map((outcome, idx) => (
          <div key={idx} className={`p-2 rounded-lg ${outcome.id === data.winningOutcomeId ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{outcome.title}</span>
              <span className="text-zinc-500">{outcome.percentage.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
              <span><Users size={10} className="inline mr-0.5" />{outcome.users}</span>
              <span>{outcome.channelPoints.toLocaleString()} pts</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isGiveawayHistoryData(data)) {
    return (
      <div className="space-y-2 text-xs">
        <div className="p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" size={16} />
            <div>
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400 uppercase font-bold">Ganador</p>
              <p className="font-bold text-zinc-900 dark:text-white">{data.winner}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center gap-1">
            <Users size={12} />
            {data.participantCount} participantes
          </span>
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded capitalize">
            {data.mode}
          </span>
          {data.keyword && (
            <span className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded">
              #{data.keyword}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isCommandHistoryData(data)) {
    return (
      <div className="space-y-2 text-xs">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-mono">
          <p className="text-blue-500">!{data.trigger}</p>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">{data.response}</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <span>Ejecutado por: {data.executedBy}</span>
          <span>•</span>
          <span>Canal: {data.channel}</span>
        </div>
      </div>
    );
  }

  if (isTimerHistoryData(data)) {
    return (
      <div className="space-y-2 text-xs">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <p className="text-zinc-600 dark:text-zinc-400">{data.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
            <Clock size={12} />
            {data.interval}s intervalo
          </span>
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">
            {data.executionCount} ejecuciones
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const UnifiedHistory: React.FC<UnifiedHistoryProps> = ({
  onClose,
  initialTab = 'all',
}) => {
  const { t } = useI18n();
  const {
    items,
    getItems,
    deleteItem,
    clearHistory,
    exportToJSON,
    importFromJSON,
    getCountByType,
  } = useHistoryManager();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabConfig[] = [
    { id: 'all', label: 'Todo', icon: <Hash size={14} />, color: 'bg-zinc-500' },
    { id: 'poll', label: 'Encuestas', icon: <BarChart3 size={14} />, color: 'bg-purple-500' },
    { id: 'prediction', label: 'Predicciones', icon: <Trophy size={14} />, color: 'bg-yellow-500' },
    { id: 'giveaway', label: 'Sorteos', icon: <Gift size={14} />, color: 'bg-pink-500' },
    { id: 'command', label: 'Comandos', icon: <Terminal size={14} />, color: 'bg-blue-500' },
    { id: 'timer', label: 'Timers', icon: <Timer size={14} />, color: 'bg-green-500' },
  ];

  // Build filter from state
  const filter = useMemo((): HistoryFilter => {
    const f: HistoryFilter = {};
    
    if (activeTab !== 'all') {
      f.types = [activeTab];
    }
    
    if (searchQuery.trim()) {
      f.searchQuery = searchQuery.trim();
    }
    
    if (dateFrom) {
      f.dateFrom = new Date(dateFrom).getTime();
    }
    
    if (dateTo) {
      f.dateTo = new Date(dateTo).setHours(23, 59, 59, 999);
    }
    
    return f;
  }, [activeTab, searchQuery, dateFrom, dateTo]);

  const filteredItems = useMemo(() => getItems(filter), [getItems, filter]);

  const handleExport = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twitchvote_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importFromJSON(content);
      
      if (result.success) {
        setImportStatus({ type: 'success', message: `Importados ${result.itemsImported} items` });
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Error al importar' });
      }
      
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleClearCategory = () => {
    if (activeTab === 'all') {
      if (confirm('¿Eliminar TODO el historial?')) {
        clearHistory();
      }
    } else {
      if (confirm(`¿Eliminar historial de ${tabs.find(t => t.id === activeTab)?.label}?`)) {
        clearHistory(activeTab);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border-0 sm:border border-zinc-200 dark:border-zinc-800 w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slide-up sm:animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-twitch-brand/20 rounded-lg">
              <Calendar className="text-twitch-brand dark:text-twitch-light" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
                Historial Unificado
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs">
                {items.length} items en total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 overflow-x-auto shrink-0 border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((tab) => {
            const count = tab.id === 'all' ? items.length : getCountByType(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg`
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en historial..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-brand/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                showFilters || dateFrom || dateTo
                  ? 'bg-twitch-brand text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Filter size={14} />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-2 animate-fade-in">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 mb-1 block">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-brand/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-brand/50"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="self-end px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Import Status */}
        {importStatus && (
          <div className={`mx-3 mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
            importStatus.type === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {importStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {importStatus.message}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar flex-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10">
              <Calendar size={40} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
              <p className="text-zinc-500">No hay items en el historial</p>
              {(searchQuery || dateFrom || dateTo) && (
                <p className="text-xs text-zinc-400 mt-1">Prueba ajustando los filtros</p>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                onDelete={deleteItem}
                isExpanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="text-xs font-medium px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download size={14} />
              Exportar
            </button>
            <button
              onClick={handleImportClick}
              className="text-xs font-medium px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload size={14} />
              Importar
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            {filteredItems.length > 0 && (
              <button
                onClick={handleClearCategory}
                className="text-xs font-medium px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Limpiar
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-black dark:hover:text-white text-xs sm:text-sm font-medium px-4 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedHistory;
