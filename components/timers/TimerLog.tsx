/**
 * TimerLog Component
 * 
 * Displays execution history of timers.
 */

import React from 'react';
import { Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { TimerExecutionLog } from '../../types/timers';
import { useI18n } from '../../i18n';

interface TimerLogProps {
  log: TimerExecutionLog[];
  onClear: () => void;
}

export const TimerLog: React.FC<TimerLogProps> = ({
  log,
  onClear
}) => {
  const { t, locale } = useI18n();

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return locale === 'es' ? 'Hoy' : 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return locale === 'es' ? 'Ayer' : 'Yesterday';
    }
    
    return date.toLocaleDateString();
  };

  // Group log entries by date
  const groupedLog = React.useMemo(() => {
    const groups: Record<string, TimerExecutionLog[]> = {};
    
    log.forEach(entry => {
      const dateKey = formatDate(entry.executedAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    return groups;
  }, [log, locale]);

  // Empty state
  if (log.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Clock size={32} className="text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {t.misc.timers.noLogEntries}
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs">
          {t.misc.timers.logDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {t.misc.timers.logDescription} ({log.length})
        </p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          {t.misc.timers.clearLog}
        </button>
      </div>

      {/* Log entries grouped by date */}
      {Object.entries(groupedLog).map(([date, entries]: [string, TimerExecutionLog[]]) => (
        <div key={date}>
          <h4 className="text-xs font-medium text-zinc-500 mb-2 px-1">
            {date}
          </h4>
          <div className="space-y-2">
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`p-3 rounded-lg border ${
                  entry.success
                    ? 'bg-zinc-800/50 border-zinc-800'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {entry.success ? (
                      <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-white text-sm">
                      {entry.timerName}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatTime(entry.executedAt)}
                  </span>
                </div>
                
                <p className="text-sm text-zinc-400 ml-6 line-clamp-2">
                  {entry.message}
                </p>
                
                {entry.error && (
                  <p className="text-xs text-red-400 ml-6 mt-1">
                    {t.misc.timers.logError}: {entry.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimerLog;
