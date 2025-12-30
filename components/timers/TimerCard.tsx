/**
 * TimerCard Component
 * 
 * Displays a single timer with quick actions.
 */

import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Play, Pencil, Trash2, MoreVertical } from 'lucide-react';
import type { Timer, TimerGroup } from '../../types/timers';
import { useI18n, interpolate } from '../../i18n';

interface TimerCardProps {
  timer: Timer;
  group?: TimerGroup;
  nextExecution: number | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExecuteNow: () => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({
  timer,
  group,
  nextExecution,
  onToggle,
  onEdit,
  onDelete,
  onExecuteNow
}) => {
  const { t } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update countdown
  useEffect(() => {
    if (!nextExecution || !timer.enabled) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = nextExecution - now;

      if (diff <= 0) {
        setCountdown(t.timers.never === 'Never' ? 'Now' : 'Ahora');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextExecution, timer.enabled, t]);

  // Truncate message
  const truncatedMessage = timer.message.length > 80 
    ? timer.message.substring(0, 80) + '...' 
    : timer.message;

  // Handle delete
  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div
      className={`relative bg-zinc-800/50 border rounded-lg p-3 transition-all ${
        timer.enabled 
          ? 'border-zinc-700 hover:border-zinc-600' 
          : 'border-zinc-800 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              timer.enabled ? 'bg-emerald-500' : 'bg-zinc-600'
            }`}
            role="switch"
            aria-checked={timer.enabled}
            aria-label={t.timers.toggleTimer}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                timer.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Name */}
          <h4 className="font-medium text-white truncate">{timer.name}</h4>

          {/* Group badge */}
          {group && (
            <span
              className="px-1.5 py-0.5 text-xs rounded flex-shrink-0"
              style={{ 
                backgroundColor: `${group.color}20`,
                color: group.color
              }}
            >
              {group.name}
            </span>
          )}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-zinc-400 hover:text-white transition-colors rounded"
            aria-label={t.timers.timerOptions}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                <button
                  onClick={() => { onExecuteNow(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Play size={14} />
                  {t.timers.executeNow}
                </button>
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Pencil size={14} />
                  {t.timers.edit}
                </button>
                <button
                  onClick={handleDelete}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                    showDeleteConfirm 
                      ? 'text-red-400 bg-red-500/10' 
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Trash2 size={14} />
                  {showDeleteConfirm ? t.timers.deleteConfirm : t.timers.delete}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
        {truncatedMessage}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {interpolate(t.timers.everyMinutes, { minutes: timer.intervalMinutes })}
          </span>
          {timer.minChatLines > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {interpolate(t.timers.minLines, { lines: timer.minChatLines })}
            </span>
          )}
        </div>

        {/* Countdown */}
        {timer.enabled && countdown && (
          <span className="text-emerald-400 font-medium">
            {countdown}
          </span>
        )}
      </div>
    </div>
  );
};

export default TimerCard;
