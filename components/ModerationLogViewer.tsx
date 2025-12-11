import React, { useState, useMemo } from 'react';
import { Download, Filter, CheckCircle, XCircle, RefreshCcw, Clock, Shield, UserX, List } from 'lucide-react';
import { Button } from './Button';
import {
  ModerationLogEntry,
  RejectionReason,
  exportLogToCSV,
  groupLogByReason,
} from '../services/voteModerationService';

interface ModerationLogViewerProps {
  entries: ModerationLogEntry[];
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ACTION_STYLES: Record<ModerationLogEntry['action'], { label: string; icon: React.ReactNode; bgColor: string; textColor: string }> = {
  ACCEPTED: {
    label: 'Accepted',
    icon: <CheckCircle size={12} />,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle size={12} />,
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
  VOTE_CHANGED: {
    label: 'Changed',
    icon: <RefreshCcw size={12} />,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
};

const REASON_LABELS: Record<RejectionReason, string> = {
  ACCOUNT_TOO_YOUNG: 'Account Too Young',
  COOLDOWN_ACTIVE: 'Cooldown Active',
  VOTE_CHANGE_DISABLED: 'Vote Change Disabled',
  INVALID_OPTION: 'Invalid Option',
};

export const ModerationLogViewer: React.FC<ModerationLogViewerProps> = ({
  entries,
  onNotification,
}) => {
  const [filterAction, setFilterAction] = useState<ModerationLogEntry['action'] | 'ALL'>('ALL');
  const [showGrouped, setShowGrouped] = useState(false);

  const filteredEntries = useMemo(() => {
    if (filterAction === 'ALL') return entries;
    return entries.filter((e) => e.action === filterAction);
  }, [entries, filterAction]);

  const groupedByReason = useMemo(() => groupLogByReason(entries), [entries]);


  const handleExportCSV = () => {
    if (entries.length === 0) {
      onNotification?.('error', 'No entries to export');
      return;
    }
    const csv = exportLogToCSV(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moderation_log_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotification?.('success', 'Log exported to CSV');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const totalRejected = (Object.values(groupedByReason) as number[]).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-3 sm:space-y-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 sm:p-4 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 sm:gap-2 min-w-0">
          <List size={14} className="sm:w-4 sm:h-4 text-twitch-brand shrink-0" />
          <span className="truncate">Log</span>
          <span className="text-[10px] sm:text-xs font-normal text-zinc-500 shrink-0">({entries.length})</span>
        </h4>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setShowGrouped(!showGrouped)}
            className={`text-xs px-1.5 sm:px-2 py-1 ${showGrouped ? 'bg-twitch-brand/10 text-twitch-brand' : ''}`}
          >
            <Filter size={12} />
          </Button>
          <Button variant="ghost" onClick={handleExportCSV} className="text-xs px-1.5 sm:px-2 py-1">
            <Download size={12} />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Grouped View */}
      {showGrouped && totalRejected > 0 && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {(Object.entries(groupedByReason) as [RejectionReason, number][])
            .filter(([, count]) => count > 0)
            .map(([reason, count]) => (
              <div
                key={reason}
                className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded"
              >
                <span className="text-zinc-600 dark:text-zinc-400 truncate">
                  {REASON_LABELS[reason]}
                </span>
                <span className="font-bold text-red-500 ml-2">{count}</span>
              </div>
            ))}
        </div>
      )}


      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        {(['ALL', 'ACCEPTED', 'REJECTED', 'VOTE_CHANGED'] as const).map((action) => (
          <button
            key={action}
            onClick={() => setFilterAction(action)}
            className={`flex-1 min-w-[60px] text-[10px] sm:text-xs font-medium py-1.5 px-1 sm:px-2 rounded transition-colors ${
              filterAction === action
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {action === 'ALL' ? 'All' : ACTION_STYLES[action].label}
          </button>
        ))}
      </div>

      {/* Log Entries */}
      <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
            {entries.length === 0 ? 'No log entries yet' : 'No entries match filter'}
          </div>
        ) : (
          filteredEntries
            .slice(-100) // Show most recent 100
            .reverse() // Most recent first
            .map((entry, index) => {
              const style = ACTION_STYLES[entry.action];
              return (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className={`flex items-center gap-2 p-2 rounded-lg ${style.bgColor} border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors`}
                >
                  <span className={`shrink-0 ${style.textColor}`}>{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {entry.username}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${style.bgColor} ${style.textColor}`}>
                        {style.label}
                      </span>
                      {entry.reason && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          ({REASON_LABELS[entry.reason]})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Option +{entry.optionId}</span>
                      {entry.weight > 1 && (
                        <span className="text-twitch-brand">{entry.weight}x weight</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              );
            })
        )}
      </div>

      {/* Entry Count Info */}
      {entries.length > 100 && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Showing most recent 100 of {entries.length} entries
        </div>
      )}
    </div>
  );
};
