// Visor de historial de acciones
import React, { useState, useMemo } from 'react';
import { useActionLog } from '../../hooks/useActionLog';
import { ActionCategory, ActionLogFilter } from '../../types/collaboration';

export interface ActionLogViewerProps {
  className?: string;
}

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  poll: '📊 Encuesta',
  prediction: '🎯 Predicción',
  giveaway: '🎁 Sorteo',
  timer: '⏱️ Timer',
  obs: '🎬 OBS',
  session: '👥 Sesión',
  settings: '⚙️ Config',
  other: '📝 Otro'
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  poll: 'bg-blue-600',
  prediction: 'bg-purple-600',
  giveaway: 'bg-pink-600',
  timer: 'bg-yellow-600',
  obs: 'bg-green-600',
  session: 'bg-cyan-600',
  settings: 'bg-gray-600',
  other: 'bg-gray-500'
};

export function ActionLogViewer({ className = '' }: ActionLogViewerProps) {
  const { entries: actions, exportToCSV, clearLog } = useActionLog();
  
  const [filter, setFilter] = useState<ActionLogFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Get unique users from actions
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    actions.forEach(a => users.set(a.userId, a.userName));
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [actions]);

  // Filter actions
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (filter.userId && action.userId !== filter.userId) return false;
      if (filter.category && action.category !== filter.category) return false;
      if (filter.fromDate && action.timestamp < filter.fromDate) return false;
      if (filter.toDate && action.timestamp > filter.toDate) return false;
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        if (!action.action.toLowerCase().includes(searchLower) &&
            !action.details.toLowerCase().includes(searchLower) &&
            !action.userName.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
  }, [actions, filter]);

  // Paginate
  const paginatedActions = useMemo(() => {
    const start = page * pageSize;
    return filteredActions.slice(start, start + pageSize);
  }, [filteredActions, page]);

  const totalPages = Math.ceil(filteredActions.length / pageSize);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Handle export
  const handleExport = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `action-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle clear
  const handleClear = () => {
    if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
      clearLog();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({});
    setPage(0);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with actions */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            {filteredActions.length} acciones
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                showFilters || Object.keys(filter).length > 0
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🔍 Filtros
            </button>
            <button
              onClick={handleExport}
              className="px-2 py-1 text-sm bg-gray-700 text-gray-300 
                       hover:bg-gray-600 rounded transition-colors"
            >
              📥 CSV
            </button>
            <button
              onClick={handleClear}
              className="px-2 py-1 text-sm bg-gray-700 text-gray-300 
                       hover:bg-red-600 hover:text-white rounded transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t border-gray-600">
            {/* Search */}
            <input
              type="text"
              placeholder="Buscar..."
              value={filter.search || ''}
              onChange={e => setFilter({ ...filter, search: e.target.value || undefined })}
              className="w-full bg-gray-700 text-white px-3 py-1.5 rounded text-sm
                       placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <div className="flex gap-2">
              {/* User filter */}
              <select
                value={filter.userId || ''}
                onChange={e => setFilter({ ...filter, userId: e.target.value || undefined })}
                className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm
                         focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Todos los usuarios</option>
                {uniqueUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={filter.category || ''}
                onChange={e => setFilter({ ...filter, category: (e.target.value || undefined) as ActionCategory | undefined })}
                className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm
                         focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {Object.keys(filter).length > 0 && (
              <button
                onClick={resetFilters}
                className="text-purple-400 text-xs hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions list */}
      <div className="flex-1 overflow-y-auto">
        {paginatedActions.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">
            No hay acciones registradas
          </p>
        ) : (
          <div className="divide-y divide-gray-700">
            {paginatedActions.map(action => (
              <div key={action.id} className="p-3 hover:bg-gray-700/50">
                <div className="flex items-start gap-2">
                  {/* Category badge */}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[action.category]}`}>
                    {CATEGORY_LABELS[action.category].split(' ')[0]}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Action title */}
                    <p className="text-white text-sm font-medium">
                      {action.action}
                    </p>
                    
                    {/* Details */}
                    {action.details && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate">
                        {action.details}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{action.userName}</span>
                      <span>•</span>
                      <span>{formatTime(action.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2 border-t border-gray-700 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-sm bg-gray-700 text-gray-300 
                     hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed 
                     rounded transition-colors"
          >
            ←
          </button>
          <span className="text-gray-400 text-sm">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-sm bg-gray-700 text-gray-300 
                     hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed 
                     rounded transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
