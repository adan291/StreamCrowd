// SessionHistory - List of past sessions with comparison

import React from 'react';
import { useSessionHistory } from '../../hooks/useSessionHistory';
import { SessionMetrics } from '../../types/metrics';

interface SessionCardProps {
  session: SessionMetrics;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isSelected,
  onSelect,
  onDeselect,
  onDelete,
  onToggleFavorite,
}) => {
  const duration = session.endTime
    ? Math.round((session.endTime - session.startTime) / 60000)
    : 0;

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
        isSelected ? 'border-purple-500' : 'border-transparent hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{session.channelName}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
              {session.platform}
            </span>
            {session.isFavorite && (
              <span className="text-yellow-400">⭐</span>
            )}
          </div>
          <div className="text-gray-400 text-sm">
            {new Date(session.startTime).toLocaleDateString()} • {duration} min
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-1 hover:bg-gray-700 rounded"
            title={session.isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
          >
            {session.isFavorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white"
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{session.summary.peakViewers}</div>
          <div className="text-xs text-gray-500">Peak</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{session.summary.totalMessages}</div>
          <div className="text-xs text-gray-500">Msgs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{session.summary.newFollowers}</div>
          <div className="text-xs text-gray-500">Follows</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-400">{session.summary.newSubscribers}</div>
          <div className="text-xs text-gray-500">Subs</div>
        </div>
      </div>

      {/* Select button */}
      <button
        onClick={isSelected ? onDeselect : onSelect}
        className={`w-full py-2 rounded text-sm ${
          isSelected
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        {isSelected ? '✓ Seleccionada' : 'Seleccionar para comparar'}
      </button>
    </div>
  );
};

export const SessionHistory: React.FC = () => {
  const {
    sessions,
    isLoading,
    error,
    selectedSessions,
    hasMore,
    loadMore,
    deleteSession,
    toggleFavorite,
    selectSession,
    deselectSession,
    clearSelection,
    compareSessions,
  } = useSessionHistory();

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📜 Historial de Sesiones</h1>
          <p className="text-gray-400 text-sm">
            {sessions.length} sesiones guardadas
          </p>
        </div>

        {selectedSessions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {selectedSessions.length}/3 seleccionadas
            </span>
            <button
              onClick={clearSelection}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Limpiar
            </button>
            <button
              onClick={compareSessions}
              disabled={selectedSessions.length < 2}
              className={`px-3 py-2 rounded text-sm ${
                selectedSessions.length >= 2
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Comparar ({selectedSessions.length})
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Sessions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isSelected={selectedSessions.includes(session.id)}
            onSelect={() => selectSession(session.id)}
            onDeselect={() => deselectSession(session.id)}
            onDelete={() => deleteSession(session.id)}
            onToggleFavorite={() => toggleFavorite(session.id)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            {isLoading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}

      {sessions.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <p>No hay sesiones guardadas</p>
          <p className="text-sm">Las sesiones se guardan automáticamente al finalizar</p>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
