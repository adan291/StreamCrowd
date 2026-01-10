/**
 * PredictionPanel - Main panel for Twitch Predictions feature
 * 
 * Integrates all prediction components:
 * - PredictionForm for creating new predictions
 * - ActivePrediction for managing current prediction
 * - PredictionHistory for viewing past predictions
 * 
 * Also handles:
 * - Partner/Affiliate status check
 * - OAuth scope verification
 * - Broadcaster token delegation for moderators
 * - Error display and notifications
 * 
 * @requirements 1.5, 1.6, 8.1 - Scope verification and Partner/Affiliate messaging
 */

import React, { useState, useCallback } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  Plus,
  History,
  Zap,
  ShieldAlert,
  ExternalLink,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { Button } from './Button';
import { PredictionForm } from './PredictionForm';
import { ActivePrediction } from './ActivePrediction';
import { PredictionHistory } from './PredictionHistory';
import { BroadcasterAuthPanel } from './BroadcasterAuthPanel';
import { usePredictions } from '../src/application/hooks/usePredictions';
import { useStreamNotifications } from '../hooks/useStreamNotifications';
import { useActivitySound } from '../hooks/useActivitySound';
import { SoundSettingsPopover } from './ui/SoundSettingsPopover';
import { ChatSettingsPanel, getDefaultChatSettings, type ChatSettingsConfig } from './ui/ChatSettingsPanel';
import { useActivityConfig } from '../hooks/useActivityConfig';
import { useI18n } from '../i18n';
import type { NotificationType } from './Notification';
import type { PredictionFormData } from '../types/twitch';

// ============================================
// Types
// ============================================

export interface PredictionPanelProps {
  channelId: string;
  channelLogin?: string;
  channelName?: string;
  authToken: string;
  userId?: string;
  userLogin?: string;
  userScopes?: string[];
  isPartnerOrAffiliate: boolean;
  hasRequiredScope?: boolean;
  /** Whether the user is viewing a moderated channel (not their own) */
  isModeratorView?: boolean;
  onNotification?: (type: NotificationType, message: string) => void;
  onReauthenticate?: () => void;
}

type TabType = 'create' | 'active' | 'history' | 'chat';

// ============================================
// Constants
// ============================================

const REQUIRED_SCOPE = 'channel:manage:predictions';

// ============================================
// Component
// ============================================

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  channelId,
  channelLogin = '',
  channelName = '',
  authToken,
  userId = '',
  userLogin = '',
  userScopes = [],
  isPartnerOrAffiliate,
  hasRequiredScope = true,
  isModeratorView = false,
  onNotification,
  onReauthenticate,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [modCreatedPrediction, setModCreatedPrediction] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  
  // Stream notifications hook for push notifications
  const { notifyPredictionResolved } = useStreamNotifications();
  
  // Sound effects
  const sound = useActivitySound({ storageKey: 'prediction_sound_config' });
  
  // Chat settings - version 2 forces update to !tv commands
  const chatConfig = useActivityConfig<ChatSettingsConfig>({
    storageKey: 'prediction_chat_config',
    defaultConfig: getDefaultChatSettings('prediction'),
    version: 2,
  });

  // Use predictions hook - disable polling for moderators (API doesn't allow reading other's predictions)
  const {
    currentPrediction,
    history,
    isLoading,
    error,
    isPolling,
    canCreatePredictions,
    permissionMessage,
    createPrediction,
    lockPrediction,
    resolvePrediction,
    cancelPrediction,
    refreshPrediction,
    clearError,
  } = usePredictions(channelId, authToken, {
    enablePolling: true, // Enable for all - will use broadcaster token from Firebase for mods
    moderatorId: userId,
  });

  // Auto-switch to active tab when prediction is created
  const handleCreatePrediction = useCallback(async (data: PredictionFormData) => {
    const success = await createPrediction(data);
    if (success) {
      sound.play('start');
      if (isModeratorView) {
        setModCreatedPrediction(true);
        onNotification?.('success', 'Predicción creada correctamente. Gestiona desde Twitch.');
      } else {
        setActiveTab('active');
        onNotification?.('success', 'Predicción creada correctamente');
      }
    }
  }, [createPrediction, onNotification, isModeratorView, sound]);

  // Handle lock
  const handleLock = useCallback(async () => {
    const success = await lockPrediction();
    if (success) {
      sound.play('alert');
      onNotification?.('info', 'Predicción bloqueada - No se aceptan más votos');
    }
  }, [lockPrediction, onNotification, sound]);

  // Handle resolve
  const handleResolve = useCallback(async (outcomeId: string) => {
    const success = await resolvePrediction(outcomeId);
    if (success) {
      sound.play('winner');
      setActiveTab('history');
      onNotification?.('success', 'Predicción resuelta correctamente');
      
      // Send push notification for prediction resolved
      // @requirements 4.3 - Emit notifications for prediction resolved
      if (currentPrediction) {
        const winningOutcome = currentPrediction.outcomes.find(o => o.id === outcomeId);
        const totalPoints = currentPrediction.outcomes.reduce((sum, o) => sum + (o.channel_points || 0), 0);
        if (winningOutcome) {
          notifyPredictionResolved(
            currentPrediction.title,
            winningOutcome.title,
            totalPoints
          );
        }
      }
    }
  }, [resolvePrediction, onNotification, currentPrediction, notifyPredictionResolved, sound]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    const success = await cancelPrediction();
    if (success) {
      sound.play('end');
      setActiveTab('create');
      onNotification?.('info', 'Predicción cancelada - Puntos reembolsados');
    }
  }, [cancelPrediction, onNotification, sound]);

  // Determine which tab to show based on state
  const effectiveTab = currentPrediction ? 'active' : activeTab;

  // Not Partner/Affiliate warning
  if (!isPartnerOrAffiliate) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <ShieldAlert size={40} className="text-yellow-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Función exclusiva
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
          Las predicciones de Twitch solo están disponibles para canales 
          <span className="font-medium text-twitch-brand"> Partner </span> 
          o 
          <span className="font-medium text-twitch-brand"> Afiliado</span>.
        </p>
        <a 
          href="https://www.twitch.tv/creatorcamp/es-es/paths/getting-started-on-twitch/twitch-affiliate-program/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-twitch-brand hover:text-twitch-light flex items-center gap-1 text-sm"
        >
          Más información sobre el programa de Afiliados
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  // Moderator view - now with full control when broadcaster has authorized
  if (isModeratorView) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-twitch-brand/10 flex items-center justify-center">
                <Zap size={18} className="text-twitch-brand" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Predicciones
              </h2>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs font-medium rounded">
                Moderador
              </span>
            </div>
            {canCreatePredictions && (
              <div className="flex items-center gap-2">
                {isPolling && (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    En vivo
                  </span>
                )}
                <SoundSettingsPopover
                  config={sound.config}
                  onConfigChange={sound.setConfig}
                  onTestSound={() => sound.play('winner')}
                  showMilestoneOption={false}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshPrediction}
                  disabled={isLoading}
                  title="Actualizar"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Broadcaster Auth Status */}
        {!canCreatePredictions && permissionMessage && (
          <div className="shrink-0 mx-4 mt-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    Autorización requerida
                  </p>
                  <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                    {permissionMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowAuthPanel(!showAuthPanel)}
                  className="text-xs text-yellow-500 hover:text-yellow-400 underline"
                >
                  {showAuthPanel ? 'Ocultar' : 'Más info'}
                </button>
              </div>
            </div>
            
            {/* Expandable Auth Panel */}
            {showAuthPanel && (
              <div className="mt-3">
                <BroadcasterAuthPanel
                  channelId={channelId}
                  channelLogin={channelLogin}
                  channelName={channelName}
                  currentUserId={userId}
                  currentUserToken={authToken}
                  currentUserScopes={userScopes}
                  onAuthSuccess={() => {
                    setShowAuthPanel(false);
                    onNotification?.('success', '¡Autorización completada!');
                  }}
                  onNotification={(msg, type) => onNotification?.(type, msg)}
                />
              </div>
            )}
          </div>
        )}

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

        {/* Content - Show active prediction or create form */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {currentPrediction ? (
            // Show active prediction with controls
            <ActivePrediction
              prediction={currentPrediction}
              onLock={handleLock}
              onResolve={handleResolve}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          ) : (
            // Show create form
            <PredictionForm
              onSubmit={handleCreatePrediction}
              isLoading={isLoading}
              disabled={!channelId || !authToken || !canCreatePredictions}
            />
          )}
        </div>
      </div>
    );
  }

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
          Para usar predicciones, necesitas autorizar el permiso 
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
              <Zap size={18} className="text-twitch-brand" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Predicciones
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {isPolling && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                En vivo
              </span>
            )}
            <SoundSettingsPopover
              config={sound.config}
              onConfigChange={sound.setConfig}
              onTestSound={() => sound.play('winner')}
              showMilestoneOption={false}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPrediction}
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
            onClick={() => setActiveTab('create')}
            disabled={!!currentPrediction}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              effectiveTab === 'create'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Plus size={14} />
            Crear
          </button>
          <button
            onClick={() => setActiveTab('active')}
            disabled={!currentPrediction}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              effectiveTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Zap size={14} />
            Activa
            {currentPrediction && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              effectiveTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <History size={14} />
            Historial
            {history.length > 0 && (
              <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Configuración de comandos de chat"
          >
            <MessageSquare size={14} />
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
        {isLoading && !currentPrediction && effectiveTab !== 'history' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-twitch-brand" />
          </div>
        )}

        {/* Create Tab */}
        {effectiveTab === 'create' && !currentPrediction && !isLoading && (
          <PredictionForm
            onSubmit={handleCreatePrediction}
            isLoading={isLoading}
            disabled={!channelId || !authToken}
          />
        )}

        {/* Active Tab */}
        {effectiveTab === 'active' && currentPrediction && (
          <ActivePrediction
            prediction={currentPrediction}
            onLock={handleLock}
            onResolve={handleResolve}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        )}

        {/* Active Tab - No Prediction */}
        {effectiveTab === 'active' && !currentPrediction && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Zap size={24} className="text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Sin predicción activa
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Crea una nueva predicción para empezar
            </p>
            <Button variant="primary" onClick={() => setActiveTab('create')}>
              <Plus size={16} className="mr-2" />
              Crear Predicción
            </Button>
          </div>
        )}

        {/* History Tab */}
        {effectiveTab === 'history' && (
          <PredictionHistory predictions={history} />
        )}

        {/* Chat Settings Tab */}
        {activeTab === 'chat' && (
          <ChatSettingsPanel
            config={chatConfig.config}
            onConfigChange={chatConfig.updateConfig}
            activityType="prediction"
          />
        )}
      </div>
    </div>
  );
};

export default PredictionPanel;
