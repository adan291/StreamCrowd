/**
 * TimerList Component
 * 
 * Displays list of timers grouped by their groups.
 */

import React from 'react';
import { Plus, Clock } from 'lucide-react';
import type { Timer, TimerGroup } from '../../types/timers';
import { TimerCard } from './TimerCard';
import { useI18n } from '../../i18n';

interface TimerListProps {
  timers: Timer[];
  groups: TimerGroup[];
  getNextExecutionTime: (timer: Timer) => number | null;
  onToggle: (id: string) => void;
  onEdit: (timer: Timer) => void;
  onDelete: (id: string) => void;
  onExecuteNow: (id: string) => void;
  onCreateTimer: () => void;
}

export const TimerList: React.FC<TimerListProps> = ({
  timers,
  groups,
  getNextExecutionTime,
  onToggle,
  onEdit,
  onDelete,
  onExecuteNow,
  onCreateTimer
}) => {
  const { t } = useI18n();

  // Group timers
  const timersByGroup = React.useMemo(() => {
    const grouped: Record<string, Timer[]> = { '': [] };
    
    // Initialize groups
    groups.forEach(g => {
      grouped[g.id] = [];
    });

    // Assign timers to groups
    timers.forEach(timer => {
      const key = timer.groupId || '';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(timer);
    });

    return grouped;
  }, [timers, groups]);

  // Get group by id
  const getGroup = (id: string): TimerGroup | undefined => {
    return groups.find(g => g.id === id);
  };

  // Empty state
  if (timers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Clock size={32} className="text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {t.timers.noTimers}
        </h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-xs">
          {t.timers.noTimersDescription}
        </p>
        <button
          onClick={onCreateTimer}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          {t.timers.createTimer}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ungrouped timers */}
      {timersByGroup[''].length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-2 px-1">
            {t.timers.generalGroup} ({timersByGroup[''].length})
          </h4>
          <div className="space-y-2">
            {timersByGroup[''].map(timer => (
              <TimerCard
                key={timer.id}
                timer={timer}
                nextExecution={getNextExecutionTime(timer)}
                onToggle={() => onToggle(timer.id)}
                onEdit={() => onEdit(timer)}
                onDelete={() => onDelete(timer.id)}
                onExecuteNow={() => onExecuteNow(timer.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped timers */}
      {groups.map(group => {
        const groupTimers = timersByGroup[group.id] || [];
        if (groupTimers.length === 0) return null;

        return (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <h4 className="text-sm font-medium text-zinc-400">
                {group.name} ({groupTimers.length})
              </h4>
              {!group.enabled && (
                <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {t.timers.engineStopped}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {groupTimers.map(timer => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  group={group}
                  nextExecution={getNextExecutionTime(timer)}
                  onToggle={() => onToggle(timer.id)}
                  onEdit={() => onEdit(timer)}
                  onDelete={() => onDelete(timer.id)}
                  onExecuteNow={() => onExecuteNow(timer.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimerList;
