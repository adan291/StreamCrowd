/**
 * RedemptionsList - Component for displaying and managing Channel Point redemptions
 * 
 * Displays pending redemptions with:
 * - User info and redemption details
 * - Fulfill and Reject buttons
 * - Filter by reward type
 * - Real-time updates
 * 
 * @requirements 5.1, 5.3, 5.4 - Display pending redemptions, fulfill/reject, filter by reward
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Check, 
  X, 
  Filter, 
  Clock, 
  User, 
  MessageSquare,
  Loader2,
  Gift,
  ChevronDown
} from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import type { TwitchRedemption, TwitchReward } from '../types/twitch';

// ============================================
// Types
// ============================================

export interface RedemptionsListProps {
  /** List of pending redemptions */
  redemptions: TwitchRedemption[];
  /** Available rewards for filtering */
  rewards?: TwitchReward[];
  /** Callback to fulfill a redemption */
  onFulfill: (redemptionId: string, rewardId: string) => Promise<void>;
  /** Callback to reject a redemption */
  onReject: (redemptionId: string, rewardId: string) => Promise<void>;
  /** Currently selected reward filter */
  filterRewardId?: string;
  /** Callback when filter changes */
  onFilterChange?: (rewardId: string | undefined) => void;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format relative time for redemption
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHour < 24) return `Hace ${diffHour}h`;
  return `Hace ${diffDay}d`;
}

// ============================================
// Redemption Card Component
// ============================================

interface RedemptionCardProps {
  redemption: TwitchRedemption;
  onFulfill: () => Promise<void>;
  onReject: () => Promise<void>;
  isProcessing: boolean;
}

const RedemptionCard: React.FC<RedemptionCardProps> = ({
  redemption,
  onFulfill,
  onReject,
  isProcessing,
}) => {
  const [actionLoading, setActionLoading] = useState<'fulfill' | 'reject' | null>(null);

  const handleFulfill = async () => {
    setActionLoading('fulfill');
    try {
      await onFulfill();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await onReject();
    } finally {
      setActionLoading(null);
    }
  };

  const isDisabled = isProcessing || actionLoading !== null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2">
      {/* Header: User and Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-twitch-brand/20 flex items-center justify-center">
            <User size={16} className="text-twitch-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {redemption.user_name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRelativeTime(redemption.redeemed_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-twitch-brand font-medium">
          <Gift size={12} />
          {redemption.reward.cost.toLocaleString()}
        </div>
      </div>

      {/* Reward Info */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {redemption.reward.title}
        </p>
        {redemption.reward.prompt && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {redemption.reward.prompt}
          </p>
        )}
      </div>

      {/* User Input (if any) */}
      {redemption.user_input && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <MessageSquare size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300 break-words">
            "{redemption.user_input}"
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReject}
          disabled={isDisabled}
          className="flex-1 text-red-500 hover:bg-red-500/10 hover:text-red-600"
        >
          {actionLoading === 'reject' ? (
            <Loader2 size={14} className="animate-spin mr-1" />
          ) : (
            <X size={14} className="mr-1" />
          )}
          Rechazar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleFulfill}
          disabled={isDisabled}
          className="flex-1"
        >
          {actionLoading === 'fulfill' ? (
            <Loader2 size={14} className="animate-spin mr-1" />
          ) : (
            <Check size={14} className="mr-1" />
          )}
          Completar
        </Button>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const RedemptionsList: React.FC<RedemptionsListProps> = ({
  redemptions,
  rewards = [],
  onFulfill,
  onReject,
  filterRewardId,
  onFilterChange,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter redemptions by reward
  const filteredRedemptions = useMemo(() => {
    if (!filterRewardId) return redemptions;
    return redemptions.filter(r => r.reward.id === filterRewardId);
  }, [redemptions, filterRewardId]);

  // Get unique rewards from redemptions for filter options
  const filterOptions = useMemo(() => {
    const rewardMap = new Map<string, { id: string; title: string; count: number }>();
    
    redemptions.forEach(r => {
      const existing = rewardMap.get(r.reward.id);
      if (existing) {
        existing.count++;
      } else {
        rewardMap.set(r.reward.id, {
          id: r.reward.id,
          title: r.reward.title,
          count: 1,
        });
      }
    });
    
    return Array.from(rewardMap.values());
  }, [redemptions]);

  // Handle fulfill with tracking
  const handleFulfill = useCallback(async (redemptionId: string, rewardId: string) => {
    setProcessingIds(prev => new Set(prev).add(redemptionId));
    try {
      await onFulfill(redemptionId, rewardId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(redemptionId);
        return next;
      });
    }
  }, [onFulfill]);

  // Handle reject with tracking
  const handleReject = useCallback(async (redemptionId: string, rewardId: string) => {
    setProcessingIds(prev => new Set(prev).add(redemptionId));
    try {
      await onReject(redemptionId, rewardId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(redemptionId);
        return next;
      });
    }
  }, [onReject]);

  // Get selected filter label
  const selectedFilterLabel = useMemo(() => {
    if (!filterRewardId) return 'Todas las recompensas';
    const option = filterOptions.find(o => o.id === filterRewardId);
    return option?.title || 'Filtro seleccionado';
  }, [filterRewardId, filterOptions]);

  return (
    <div className="space-y-3">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Redenciones pendientes
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-twitch-brand/10 text-twitch-brand rounded-full">
            {filteredRedemptions.length}
          </span>
        </div>

        {/* Filter Dropdown */}
        {filterOptions.length > 0 && onFilterChange && (
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Filter size={12} />
              {selectedFilterLabel}
              <ChevronDown size={12} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsFilterOpen(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      onFilterChange(undefined);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      !filterRewardId ? 'text-twitch-brand font-medium' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Todas las recompensas
                    <span className="float-right text-xs text-zinc-400">
                      {redemptions.length}
                    </span>
                  </button>
                  
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                  
                  {filterOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        onFilterChange(option.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                        filterRewardId === option.id ? 'text-twitch-brand font-medium' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {option.title}
                      <span className="float-right text-xs text-zinc-400">
                        {option.count}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && filteredRedemptions.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-twitch-brand" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRedemptions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Gift size={20} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {filterRewardId 
              ? 'No hay redenciones pendientes para esta recompensa'
              : 'No hay redenciones pendientes'
            }
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            Las redenciones aparecerán aquí cuando los viewers canjeen recompensas
          </p>
        </div>
      )}

      {/* Redemptions List */}
      {filteredRedemptions.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {filteredRedemptions.map(redemption => (
            <RedemptionCard
              key={redemption.id}
              redemption={redemption}
              onFulfill={() => handleFulfill(redemption.id, redemption.reward.id)}
              onReject={() => handleReject(redemption.id, redemption.reward.id)}
              isProcessing={processingIds.has(redemption.id)}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions (when multiple redemptions) */}
      {filteredRedemptions.length > 1 && (
        <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              for (const r of filteredRedemptions) {
                if (!processingIds.has(r.id)) {
                  await handleReject(r.id, r.reward.id);
                }
              }
            }}
            disabled={isLoading || processingIds.size > 0}
            className="flex-1 text-red-500 hover:bg-red-500/10"
          >
            <X size={14} className="mr-1" />
            Rechazar todas
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              for (const r of filteredRedemptions) {
                if (!processingIds.has(r.id)) {
                  await handleFulfill(r.id, r.reward.id);
                }
              }
            }}
            disabled={isLoading || processingIds.size > 0}
            className="flex-1"
          >
            <Check size={14} className="mr-1" />
            Completar todas
          </Button>
        </div>
      )}
    </div>
  );
};

export default RedemptionsList;
