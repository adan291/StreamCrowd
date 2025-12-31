/**
 * MacroExecutionLog Component
 * 
 * Real-time log of macro executions with filters by macro and status,
 * and detailed view of each execution.
 * 
 * @requirements 9.3 - THE Macro_Service SHALL show a real-time log of executions
 */

import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  SkipForward,
  AlertCircle,
  X,
} from 'lucide-react';
import { useMacroExecution } from '../../hooks/useMacroExecution';
import { useMacros } from '../../hooks/useMacros';
import type { MacroExecutionLog as ExecutionLogEntry, ActionResult, TriggerType } from '../../types/macros';

// ============================================
// Types
// ============================================

export interface MacroExecutionLogProps {
  /** Optional macro ID to filter by */
  macroId?: string;
  /** Maximum number of entries to show */
  maxEntries?: number;
  /** Callback when close is clicked */
  onClose?: () => void;
}

type StatusFilter = 'all' | 'success' | 'failed';

// ============================================
// Constants
// ============================================

const TRIGGER_LABELS: Record<TriggerType, string> = {
  chat_command: 'Comando',
  chat_keyword: 'Palabra clave',
  schedule: 'Programada',
  event: 'Evento',
  manual: 'Manual',
};

// ============================================
// Helpers
// ============================================

/**
 * Format timestamp to readable string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format date for grouping
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  }
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================
// Sub-components
// ============================================

interface LogEntryProps {
  entry: ExecutionLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

const LogEntry: React.FC<LogEntryProps> = ({ entry, isExpanded, onToggle }) => {
  const duration = entry.completedAt - entry.startedAt;
  const successCount = entry.actionResults.filter(r => r.success && !r.skipped).length;
  const skippedCount = entry.actionResults.filter(r => r.skipped).length;
  const failedCount = entry.actionResults.filter(r => !r.success && !r.skipped).length;

  return (
    <div
      className={`bg-zinc-800/50 rounded-lg border transition-colors ${
        entry.success ? 'border-zinc-700' : 'border-red-500/30'
      }`}
    >
      {/* Entry Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-zinc-800/80 transition-colors rounded-lg"
      >
        {/* Status Icon */}
        <div className={`shrink-0 ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
          {entry.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{entry.macroName}</span>
            <span className="text-xs text-zinc-500 px-1.5 py-0.5 bg-zinc-700 rounded">
              {TRIGGER_LABELS[entry.triggeredBy]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{formatTimestamp(entry.startedAt)}</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(duration)}
            </span>
            <span className="flex items-center gap-1">
              <Zap size={10} />
              {entry.actionsExecuted} acciones
            </span>
          </div>
        </div>

        {/* Expand Icon */}
        <div className="text-zinc-500">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-700 mt-1 pt-3">
          {/* Summary */}
          <div className="flex items-center gap-4 mb-3 text-xs">
            {successCount > 0 && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle size={12} />
                {successCount} exitosas
              </span>
            )}
            {skippedCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <SkipForward size={12} />
                {skippedCount} omitidas
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle size={12} />
                {failedCount} fallidas
              </span>
            )}
          </div>

          {/* Action Results */}
          <div className="space-y-2">
            {entry.actionResults.map((result, index) => (
              <ActionResultItem key={result.actionId} result={result} index={index} />
            ))}
          </div>

          {/* Error Message */}
          {entry.error && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{entry.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ActionResultItemProps {
  result: ActionResult;
  index: number;
}

const ActionResultItem: React.FC<ActionResultItemProps> = ({ result, index }) => {
  const actionLabel = result.actionType.replace(/_/g, ' ');

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded text-xs ${
        result.skipped
          ? 'bg-yellow-500/10 text-yellow-400'
          : result.success
          ? 'bg-green-500/10 text-green-400'
          : 'bg-red-500/10 text-red-400'
      }`}
    >
      <span className="text-zinc-500 w-4">{index + 1}.</span>
      <span className="flex-1 capitalize">{actionLabel}</span>
      <span className="text-zinc-500">{formatDuration(result.duration)}</span>
      {result.skipped ? (
        <SkipForward size={12} />
      ) : result.success ? (
        <CheckCircle size={12} />
      ) : (
        <XCircle size={12} />
      )}
      {result.error && (
        <span className="text-red-400 truncate max-w-[150px]" title={result.error}>
          {result.error}
        </span>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const MacroExecutionLog: React.FC<MacroExecutionLogProps> = ({
  macroId,
  maxEntries = 100,
  onClose,
}) => {
  const { executionLog, refreshLog, clearLog, isExecuting } = useMacroExecution();
  const { macros } = useMacros();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMacroId, setSelectedMacroId] = useState<string>(macroId || 'all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Filter and limit log entries
   */
  const filteredLog = useMemo(() => {
    let result = [...executionLog];

    // Filter by macro
    if (selectedMacroId !== 'all') {
      result = result.filter(e => e.macroId === selectedMacroId);
    }

    // Filter by status
    if (statusFilter === 'success') {
      result = result.filter(e => e.success);
    } else if (statusFilter === 'failed') {
      result = result.filter(e => !e.success);
    }

    // Sort by timestamp (newest first)
    result.sort((a, b) => b.startedAt - a.startedAt);

    // Limit entries
    return result.slice(0, maxEntries);
  }, [executionLog, selectedMacroId, statusFilter, maxEntries]);

  /**
   * Group entries by date
   */
  const groupedLog = useMemo(() => {
    const groups: { date: string; entries: ExecutionLogEntry[] }[] = [];
    let currentDate = '';

    for (const entry of filteredLog) {
      const date = formatDate(entry.startedAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    }

    return groups;
  }, [filteredLog]);

  /**
   * Statistics
   */
  const stats = useMemo(() => {
    const total = filteredLog.length;
    const successful = filteredLog.filter(e => e.success).length;
    const failed = total - successful;
    return { total, successful, failed };
  }, [filteredLog]);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col max-h-[80vh] w-full max-w-lg">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log de Ejecución</h2>
              <p className="text-xs text-zinc-500">
                {stats.total} ejecuciones • {stats.successful} exitosas • {stats.failed} fallidas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={refreshLog}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={16} className={isExecuting ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={clearLog}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Limpiar log"
            >
              <Trash2 size={16} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Macro Filter */}
          <select
            value={selectedMacroId}
            onChange={(e) => setSelectedMacroId(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las macros</option>
            {macros.map((macro) => (
              <option key={macro.id} value={macro.id}>
                {macro.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              statusFilter !== 'all'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
            title="Filtrar por estado"
          >
            <Filter size={16} />
          </button>
        </div>

        {/* Status Filter Options */}
        {showFilters && (
          <div className="mt-2 flex gap-2">
            {(['all', 'success', 'failed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {status === 'all' ? 'Todas' : status === 'success' ? 'Exitosas' : 'Fallidas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredLog.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-400 mb-1">No hay ejecuciones</p>
              <p className="text-sm text-zinc-500">
                Las ejecuciones de macros aparecerán aquí
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedLog.map((group) => (
              <div key={group.date}>
                <div className="text-xs text-zinc-500 font-medium mb-2 sticky top-0 bg-zinc-900 py-1">
                  {group.date}
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <LogEntry
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedEntry === entry.id}
                      onToggle={() =>
                        setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MacroExecutionLog;
