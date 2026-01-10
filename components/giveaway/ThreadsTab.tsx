/**
 * ThreadsTab Component
 * Tab for managing active giveaway threads with cards
 */

import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { ActiveGiveawayCard } from './ActiveGiveawayCard';
import { EmptyState } from './EmptyState';
import type { GiveawayThread } from './types';

// ============================================
// TYPES
// ============================================

export interface ThreadsTabProps {
  /** List of threads */
  threads: GiveawayThread[];
  /** Callback to toggle pause state */
  onTogglePause?: (id: string) => void;
  /** Callback to delete thread */
  onDelete?: (id: string) => void;
  /** Callback to pick winner from thread */
  onPickWinner?: (id: string) => void;
  /** Callback to close winner and save to history */
  onCloseWinner?: (id: string) => void;
  /** Callback to edit thread */
  onEdit?: (id: string) => void;
  /** Get unique participant count for a thread */
  getUniqueCount?: (thread: GiveawayThread) => number;
  /** View mode: compact = list, expanded = grid */
  viewMode?: 'compact' | 'expanded';
  /** Custom class name */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback to create new thread */
  onCreateThread?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const ThreadsTab: React.FC<ThreadsTabProps> = ({
  threads,
  onTogglePause,
  onDelete,
  onPickWinner,
  onCloseWinner,
  onEdit,
  getUniqueCount,
  viewMode = 'expanded',
  className = '',
  emptyMessage = 'No hay sorteos activos',
  onCreateThread,
}) => {
  const activeCount = threads.filter(t => t.isActive && !t.isPaused).length;
  const pausedCount = threads.filter(t => t.isPaused).length;
  const totalParticipants = threads.reduce((sum, t) => {
    const count = getUniqueCount ? getUniqueCount(t) : t.participants.length;
    return sum + count;
  }, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-purple-500" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Sorteos activos
            </span>
          </div>
          
          {threads.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                  {activeCount} activos
                </span>
              )}
              {pausedCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">
                  {pausedCount} pausados
                </span>
              )}
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full">
                {totalParticipants} participantes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Threads grid */}
      {threads.length === 0 ? (
        <EmptyState
          type="threads"
          title={emptyMessage}
          description="Crea un nuevo sorteo en la pestaña 'Sorteo' para empezar a recolectar participantes."
          action={onCreateThread ? {
            label: 'Crear sorteo',
            onClick: onCreateThread,
            icon: <Plus size={16} />,
          } : undefined}
        />
      ) : (
        <div className={viewMode === 'expanded' ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col gap-3'}>
          {threads.map((thread) => (
            <ActiveGiveawayCard
              key={thread.id}
              thread={thread}
              onTogglePause={onTogglePause}
              onDelete={onDelete}
              onPickWinner={onPickWinner}
              onCloseWinner={onCloseWinner}
              onEdit={onEdit}
              getUniqueCount={getUniqueCount}
              compact={viewMode === 'compact'}
            />
          ))}
        </div>
      )}

      {/* Quick stats footer */}
      {threads.length > 0 && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {threads.length} sorteo{threads.length !== 1 ? 's' : ''} en total
            </span>
            <span>
              {activeCount > 0 
                ? `${activeCount} recolectando participantes`
                : pausedCount > 0 
                  ? `${pausedCount} en pausa`
                  : 'Ninguno activo'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadsTab;
