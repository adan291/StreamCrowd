/**
 * RewardsPanel - Main panel for Twitch Channel Points Rewards feature
 * 
 * Integrates all reward components:
 * - List of custom rewards with enable/disable toggle
 * - RewardForm for creating new rewards
 * - RedemptionsList for managing pending redemptions
 * 
 * Also handles:
 * - OAuth scope verification
 * - Error display and notifications
 * 
 * @requirements 4.1, 4.2, 4.5, 4.6 - Display rewards, scope verification, enable/disable, pending redemptions
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  Plus,
  Gift,
  Inbox,
  Settings,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { RewardForm } from './RewardForm';
import { RedemptionsList } from './RedemptionsList';
import { useRewards } from '../src/application/hooks/useRewards';
import { useI18n } from '../i18n';
import type { NotificationType } from './Notification';
import type { RewardFormData, TwitchReward } from '../types/twitch';

// ============================================
// Types
// ============================================

export interface RewardsPanelProps {
  channelId: string;
  authToken: string;
  hasRequiredScope?: boolean;
  onNotification?: (type: NotificationType, message: string) => void;
  onReauthenticate?: () => void;
}

type TabType = 'rewards' | 'redemptions' | 'create';

// ============================================
// Constants
// ============================================

const REQUIRED_SCOPE = 'channel:manage:redemptions';

// ============================================
// Reward Card Component
// ============================================

interface RewardCardProps {
  reward: TwitchReward;
  onToggle: (enabled: boolean) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isLoading: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  onToggle,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden transition-all ${
        reward.is_enabled 
          ? 'border-zinc-200 dark:border-zinc-700' 
          : 'border-zinc-200 dark:border-zinc-800 opacity-60'
      }`}
    >
      {/* Main Row */}
      <div className="p-3 flex items-center gap-3">
        {/* Color indicator */}
        <div 
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
          style={{ backgroundColor: reward.background_color }}
        >
          {reward.image ? (
            <img 
              src={reward.image.url_1x} 
              alt="" 
              className="w-6 h-6"
            />
          ) : (
            <Gift size={18} className="text-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
              {reward.title}
            </p>
            {reward.is_paused && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded">
                Pausada
              </span>
            )}
          </div>
          <p className="text-xs text-twitch-brand font-medium">
            {reward.cost.toLocaleString()} puntos
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!reward.is_enabled)}
          disabled={isLoading}
          className="text-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label={reward.is_enabled ? 'Desactivar recompensa' : 'Activar recompensa'}
        >
          {reward.is_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </button>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          {/* Description */}
          {reward.prompt && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 mb-3">
              {reward.prompt}
            </p>
          )}

          {/* Settings Summary */}
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {reward.is_user_input_required && (
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                Requiere texto
              </span>
            )}
            {reward.global_cooldown.is_enabled && (
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                Cooldown: {Math.floor(reward.global_cooldown.global_cooldown_seconds / 60)}m
              </span>
            )}
            {reward.max_per_stream.is_enabled && (
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                Máx/stream: {reward.max_per_stream.max_per_stream}
              </span>
            )}
            {reward.max_per_user_per_stream.is_enabled && (
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                Máx/usuario: {reward.max_per_user_per_stream.max_per_user_per_stream}
              </span>
            )}
            {reward.should_redemptions_skip_request_queue && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                Auto-completar
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isLoading}
              className="flex-1"
            >
              <Edit2 size={14} className="mr-1" />
              Editar
            </Button>
            
            {showDeleteConfirm ? (
              <div className="flex gap-1 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 text-red-500 hover:bg-red-500/10"
                >
                  {isDeleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="flex-1 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 size={14} className="mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const RewardsPanel: React.FC<RewardsPanelProps> = ({
  channelId,
  authToken,
  hasRequiredScope = true,
  onNotification,
  onReauthenticate,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('rewards');
  const [editingReward, setEditingReward] = useState<TwitchReward | null>(null);
  const [filterRewardId, setFilterRewardId] = useState<string | undefined>();

  // Use rewards hook
  const {
    rewards,
    redemptions,
    isLoading,
    error,
    isPolling,
    createReward,
    updateReward,
    deleteReward,
    toggleReward,
    fulfillRedemption,
    rejectRedemption,
    refreshRewards,
    refreshRedemptions,
    clearError,
  } = useRewards(channelId, authToken);

  // Handle create reward
  const handleCreateReward = useCallback(async (data: RewardFormData) => {
    const success = await createReward(data);
    if (success) {
      setActiveTab('rewards');
      onNotification?.('success', 'Recompensa creada correctamente');
    }
  }, [createReward, onNotification]);

  // Handle update reward
  const handleUpdateReward = useCallback(async (data: RewardFormData) => {
    if (!editingReward) return;
    
    const success = await updateReward(editingReward.id, data);
    if (success) {
      setEditingReward(null);
      setActiveTab('rewards');
      onNotification?.('success', 'Recompensa actualizada correctamente');
    }
  }, [editingReward, updateReward, onNotification]);

  // Handle delete reward
  const handleDeleteReward = useCallback(async (rewardId: string) => {
    const success = await deleteReward(rewardId);
    if (success) {
      onNotification?.('info', 'Recompensa eliminada');
    }
  }, [deleteReward, onNotification]);

  // Handle toggle reward
  const handleToggleReward = useCallback(async (rewardId: string, enabled: boolean) => {
    const success = await toggleReward(rewardId, enabled);
    if (success) {
      onNotification?.('info', enabled ? 'Recompensa activada' : 'Recompensa desactivada');
    }
  }, [toggleReward, onNotification]);

  // Handle fulfill redemption
  const handleFulfillRedemption = useCallback(async (redemptionId: string, rewardId: string) => {
    await fulfillRedemption(redemptionId, rewardId);
  }, [fulfillRedemption]);

  // Handle reject redemption
  const handleRejectRedemption = useCallback(async (redemptionId: string, rewardId: string) => {
    await rejectRedemption(redemptionId, rewardId);
  }, [rejectRedemption]);

  // Start editing a reward
  const startEditingReward = useCallback((reward: TwitchReward) => {
    setEditingReward(reward);
    setActiveTab('create');
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingReward(null);
    setActiveTab('rewards');
  }, []);

  // Convert TwitchReward to RewardFormData for editing
  const editingFormData = useMemo((): Partial<RewardFormData> | undefined => {
    if (!editingReward) return undefined;
    
    return {
      title: editingReward.title,
      cost: editingReward.cost,
      prompt: editingReward.prompt,
      backgroundColor: editingReward.background_color,
      isUserInputRequired: editingReward.is_user_input_required,
      isEnabled: editingReward.is_enabled,
      globalCooldownEnabled: editingReward.global_cooldown.is_enabled,
      globalCooldownSeconds: editingReward.global_cooldown.global_cooldown_seconds,
      maxPerStreamEnabled: editingReward.max_per_stream.is_enabled,
      maxPerStream: editingReward.max_per_stream.max_per_stream,
      maxPerUserPerStreamEnabled: editingReward.max_per_user_per_stream.is_enabled,
      maxPerUserPerStream: editingReward.max_per_user_per_stream.max_per_user_per_stream,
    };
  }, [editingReward]);

  // Pending redemptions count
  const pendingCount = redemptions.length;

  // Missing scope warning
  if (!hasRequiredScope) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Permisos requeridos
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
          Para gestionar Channel Points, necesitas autorizar el permiso 
          <code className="mx-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
            {REQUIRED_SCOPE}
          </code>
        </p>
        {onReauthenticate && (
          <Button variant="primary" onClick={onReauthenticate}>
            Reconectar con Twitch
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-twitch-brand/10 flex items-center justify-center">
              <Gift size={18} className="text-twitch-brand" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Channel Points
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {isPolling && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                En vivo
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refreshRewards();
                refreshRedemptions();
              }}
              disabled={isLoading}
              title="Actualizar"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => {
              setEditingReward(null);
              setActiveTab('rewards');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rewards'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Gift size={14} />
            Recompensas
            {rewards.length > 0 && (
              <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full">
                {rewards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'redemptions'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Inbox size={14} />
            Redenciones
            {pendingCount > 0 && (
              <span className="text-xs bg-twitch-brand text-white px-1.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setEditingReward(null);
              setActiveTab('create');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Plus size={14} />
            {editingReward ? 'Editar' : 'Crear'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="shrink-0 mx-4 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-500 text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Loading State */}
        {isLoading && rewards.length === 0 && activeTab === 'rewards' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-twitch-brand" />
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <>
            {rewards.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Gift size={24} className="text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Sin recompensas
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Crea tu primera recompensa de Channel Points
                </p>
                <Button variant="primary" onClick={() => setActiveTab('create')}>
                  <Plus size={16} className="mr-2" />
                  Crear Recompensa
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {rewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onToggle={(enabled) => handleToggleReward(reward.id, enabled)}
                    onEdit={() => startEditingReward(reward)}
                    onDelete={() => handleDeleteReward(reward.id)}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Redemptions Tab */}
        {activeTab === 'redemptions' && (
          <RedemptionsList
            redemptions={redemptions}
            rewards={rewards}
            onFulfill={handleFulfillRedemption}
            onReject={handleRejectRedemption}
            filterRewardId={filterRewardId}
            onFilterChange={setFilterRewardId}
            isLoading={isLoading}
          />
        )}

        {/* Create/Edit Tab */}
        {activeTab === 'create' && (
          <RewardForm
            onSubmit={editingReward ? handleUpdateReward : handleCreateReward}
            isLoading={isLoading}
            disabled={!channelId || !authToken}
            initialData={editingFormData}
            isEditing={!!editingReward}
            onCancel={editingReward ? cancelEditing : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default RewardsPanel;
