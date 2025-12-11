import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, BarChart3, Users, Clock, Shield, UserX } from 'lucide-react';
import {
  ModerationStats,
  RejectionReason,
  shouldShowWarning,
} from '../services/voteModerationService';

interface ModerationStatsDisplayProps {
  stats: ModerationStats;
}

const REJECTION_LABELS: Record<RejectionReason, { label: string; icon: React.ReactNode; color: string }> = {
  ACCOUNT_TOO_YOUNG: {
    label: 'Account Too Young',
    icon: <UserX size={14} />,
    color: 'text-orange-500',
  },
  COOLDOWN_ACTIVE: {
    label: 'Cooldown Active',
    icon: <Clock size={14} />,
    color: 'text-blue-500',
  },
  VOTE_CHANGE_DISABLED: {
    label: 'Vote Change Disabled',
    icon: <Shield size={14} />,
    color: 'text-purple-500',
  },
  INVALID_OPTION: {
    label: 'Invalid Option',
    icon: <XCircle size={14} />,
    color: 'text-red-500',
  },
};

export const ModerationStatsDisplay: React.FC<ModerationStatsDisplayProps> = ({ stats }) => {
  const showWarning = shouldShowWarning(stats.acceptanceRate);
  const totalRejected = (Object.values(stats.rejectedByReason) as number[]).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-3 sm:space-y-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 sm:p-4 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 sm:gap-2">
          <BarChart3 size={14} className="sm:w-4 sm:h-4 text-twitch-brand" />
          <span className="truncate">Moderation Stats</span>
        </h4>
        {showWarning && (
          <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-500 bg-amber-500/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded animate-pulse shrink-0">
            <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">Low Acceptance</span>
            <span className="xs:hidden">!</span>
          </span>
        )}
      </div>


      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {/* Total Attempts */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-2 sm:p-3 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <Users size={10} className="sm:w-3 sm:h-3" />
            <span className="truncate">Total</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
            {stats.totalAttempts}
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-2 sm:p-3 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-green-600 dark:text-green-400 mb-1">
            <CheckCircle size={10} className="sm:w-3 sm:h-3" />
            <span className="truncate">OK</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400">
            {stats.acceptedVotes}
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-2 sm:p-3 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-red-500 mb-1">
            <XCircle size={10} className="sm:w-3 sm:h-3" />
            <span className="truncate">No</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-red-500">
            {totalRejected}
          </div>
        </div>
      </div>

      {/* Acceptance Rate */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Acceptance Rate</span>
          <span
            className={`font-bold ${
              showWarning
                ? 'text-amber-500'
                : stats.acceptanceRate >= 80
                ? 'text-green-500'
                : 'text-zinc-600 dark:text-zinc-300'
            }`}
          >
            {stats.acceptanceRate.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
              showWarning
                ? 'bg-amber-500'
                : stats.acceptanceRate >= 80
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, stats.acceptanceRate)}%` }}
          />
          {/* 50% threshold marker */}
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-zinc-400 dark:bg-zinc-500" />
        </div>
        {showWarning && (
          <p className="text-xs text-amber-500 flex items-center gap-1">
            <AlertTriangle size={10} />
            Acceptance rate is below 50%. Consider adjusting moderation settings.
          </p>
        )}
      </div>


      {/* Rejection Breakdown */}
      {totalRejected > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
            Rejected by Category
          </div>
          <div className="space-y-1">
            {(Object.entries(stats.rejectedByReason) as [RejectionReason, number][])
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([reason, count]) => {
                const { label, icon, color } = REJECTION_LABELS[reason];
                const percentage = totalRejected > 0 ? (count / totalRejected) * 100 : 0;

                return (
                  <div key={reason} className="flex items-center gap-2">
                    <div className={`shrink-0 ${color}`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-zinc-600 dark:text-zinc-400 truncate">{label}</span>
                        <span className="font-medium text-zinc-900 dark:text-white ml-2">
                          {count}
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalAttempts === 0 && (
        <div className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-sm">
          No vote attempts yet
        </div>
      )}
    </div>
  );
};
