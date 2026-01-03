/**
 * TwitchPollPanel - Panel for Twitch Polls (API-based)
 * 
 * Este panel permite crear y gestionar encuestas de Twitch
 * usando la API oficial (no el sistema interno de ORIENT).
 * 
 * Soporta:
 * - Creación de polls por broadcaster
 * - Creación de polls por moderadores (con token del broadcaster)
 * - Visualización de poll activo
 * - Historial de polls
 */

import React, { useState, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  History,
  BarChart3,
  ShieldAlert,
  ExternalLink,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from './Button';
import { BroadcasterAuthPanel } from './BroadcasterAuthPanel';
import { useTwitchPolls, type PollFormData } from '../src/application/hooks/useTwitchPolls';
import type { TwitchPoll } from '../src/application/services/TwitchPollService';
import type { NotificationType } from './Notification';

// ============================================
// Types
// ============================================

export interface TwitchPollPanelProps {
  channelId: string;
  channelLogin?: string;
  channelName?: string;
  authToken: string;
  userId?: string;
  userLogin?: string;
  userScopes?: string[];
  isPartnerOrAffiliate: boolean;
  hasRequiredScope?: boolean;
  isModeratorView?: boolean;
  onNotification?: (type: NotificationType, message: string) => void;
  onReauthenticate?: () => void;
}

type TabType = 'create' | 'active' | 'history';

// ============================================
// Sub-components
// ============================================

interface PollFormProps {
  onSubmit: (data: PollFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const PollForm: React.FC<PollFormProps> = ({ onSubmit, isLoading, disabled }) => {
  const [title, setTitle] = useState('');
  const [choices, setChoices] = useState(['', '']);
  const [duration, setDuration] = useState(60);

  const handleAddChoice = () => {
    if (choices.length < 5) {
      setChoices([...choices, '']);
    }
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validChoices = choices.filter(c => c.trim());
    if (!title.trim() || validChoices.length < 2) return;

    await onSubmit({
      title: title.trim(),
      choices: validChoices,
      duration,
    });

    // Reset form
    setTitle('');
    setChoices(['', '']);
    setDuration(60);
  };

  const isValid = title.trim() && choices.filter(c => c.trim()).length >= 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Pregunta
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué prefieres?"
          maxLength={60}
          className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-twitch-brand"
          disabled={disabled || isLoading}
        />
        <p className="text-xs text-zinc-500 mt-1">{title.length}/60</p>
      </div>

      {/* Choices */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Opciones (2-5)
        </label>
        <div className="space-y-2">
          {choices.map((choice, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={choice}
                onChange={(e) => handleChoiceChange(index, e.target.value)}
                placeholder={`Opción ${index + 1}`}
                maxLength={25}
                className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-twitch-brand"
                disabled={disabled || isLoading}
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveChoice(index)}
                  className="px-2 text-red-500 hover:text-red-400"
                  disabled={disabled || isLoading}
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
        {choices.length < 5 && (
          <button
            type="button"
            onClick={handleAddChoice}
            className="mt-2 text-sm text-twitch-brand hover:text-twitch-light flex items-center gap-1"
            disabled={disabled || isLoading}
          >
            <Plus size={14} />
            Añadir opción
          </button>
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Duración: {duration} segundos
        </label>
        <input
          type="range"
          min={15}
          max={1800}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-twitch-brand"
          disabled={disabled || isLoading}
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>15s</span>
          <span>30min</span>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!isValid || disabled || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Creando...
          </>
        ) : (
          <>
            <BarChart3 size={16} className="mr-2" />
            Crear Encuesta
          </>
        )}
      </Button>
    </form>
  );
};

interface ActivePollDisplayProps {
  poll: TwitchPoll;
  onTerminate: () => Promise<void>;
  onArchive: () => Promise<void>;
  isLoading: boolean;
}

const ActivePollDisplay: React.FC<ActivePollDisplayProps> = ({
  poll,
  onTerminate,
  onArchive,
  isLoading,
}) => {
  const totalVotes = poll.choices.reduce((sum, c) => sum + c.votes, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-white">
          {poll.title}
        </h3>
        <span className="flex items-center gap-1 text-xs text-green-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Activa
        </span>
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {poll.choices.map((choice) => {
          const percentage = totalVotes > 0 ? (choice.votes / totalVotes) * 100 : 0;
          
          return (
            <div key={choice.id} className="relative">
              <div className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-0 bg-twitch-brand/20"
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative z-10 font-medium text-zinc-900 dark:text-white">
                  {choice.title}
                </span>
                <span className="relative z-10 text-sm text-zinc-600 dark:text-zinc-400">
                  {choice.votes} votos ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>Total: {totalVotes} votos</span>
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {poll.duration}s
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={onTerminate}
          disabled={isLoading}
        >
          <CheckCircle size={16} className="mr-2" />
          Terminar
        </Button>
        <Button
          variant="ghost"
          onClick={onArchive}
          disabled={isLoading}
        >
          <XCircle size={16} className="mr-2" />
          Archivar
        </Button>
      </div>
    </div>
  );
};

interface PollHistoryProps {
  polls: TwitchPoll[];
}

const PollHistory: React.FC<PollHistoryProps> = ({ polls }) => {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <History size={32} className="mx-auto mb-3 text-zinc-400" />
        <p className="text-zinc-500">No hay encuestas anteriores</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {polls.map((poll) => {
        const totalVotes = poll.choices.reduce((sum, c) => sum + c.votes, 0);
        const winner = poll.choices.reduce((a, b) => a.votes > b.votes ? a : b);

        return (
          <div
            key={poll.id}
            className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-zinc-900 dark:text-white text-sm">
                {poll.title}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                poll.status === 'COMPLETED' || poll.status === 'TERMINATED'
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-zinc-500/20 text-zinc-500'
              }`}>
                {poll.status}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              <span>Ganador: {winner.title}</span>
              <span className="mx-2">•</span>
              <span>{totalVotes} votos</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const TwitchPollPanel: React.FC<TwitchPollPanelProps> = ({
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
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  const {
    currentPoll,
    history,
    isLoading,
    error,
    isPolling,
    canCreatePolls,
    permissionMessage,
    createPoll,
    terminatePoll,
    archivePoll,
    refreshPoll,
    clearError,
  } = useTwitchPolls(channelId, authToken, {
    enablePolling: !isModeratorView,
    moderatorId: userId,
  });

  const handleCreatePoll = useCallback(async (data: PollFormData) => {
    const success = await createPoll(data);
    if (success) {
      onNotification?.('success', 'Encuesta creada correctamente');
      setActiveTab('active');
    }
  }, [createPoll, onNotification]);

  const handleTerminate = useCallback(async () => {
    const success = await terminatePoll();
    if (success) {
      onNotification?.('success', 'Encuesta terminada');
      setActiveTab('history');
    }
  }, [terminatePoll, onNotification]);

  const handleArchive = useCallback(async () => {
    const success = await archivePoll();
    if (success) {
      onNotification?.('info', 'Encuesta archivada');
      setActiveTab('create');
    }
  }, [archivePoll, onNotification]);

  // Not Partner/Affiliate
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
          Las encuestas de Twitch solo están disponibles para canales Partner o Afiliado.
        </p>
        <a
          href="https://www.twitch.tv/creatorcamp/es-es/paths/getting-started-on-twitch/twitch-affiliate-program/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-twitch-brand hover:text-twitch-light flex items-center gap-1 text-sm"
        >
          Más información
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  const effectiveTab = currentPoll ? 'active' : activeTab;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-twitch-brand/10 flex items-center justify-center">
              <BarChart3 size={18} className="text-twitch-brand" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Encuestas Twitch
            </h2>
            {isModeratorView && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs font-medium rounded">
                Mod
              </span>
            )}
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
              onClick={refreshPoll}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('create')}
            disabled={!!currentPoll}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              effectiveTab === 'create'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            } disabled:opacity-50`}
          >
            <Plus size={14} />
            Crear
          </button>
          <button
            onClick={() => setActiveTab('active')}
            disabled={!currentPoll}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              effectiveTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            } disabled:opacity-50`}
          >
            <BarChart3 size={14} />
            Activa
            {currentPoll && (
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
          </button>
        </div>
      </div>

      {/* Auth Panel for Moderators */}
      {isModeratorView && !canCreatePolls && permissionMessage && (
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
          
          {showAuthPanel && (
            <div className="mt-3">
              <BroadcasterAuthPanel
                channelId={channelId}
                channelLogin={channelLogin}
                channelName={channelName}
                currentUserId={userId}
                currentUserLogin={userLogin}
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

      {/* Success indicator for mods */}
      {isModeratorView && canCreatePolls && (
        <div className="shrink-0 mx-4 mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Puedes crear encuestas en este canal
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="shrink-0 mx-4 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-500 text-xs">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {effectiveTab === 'create' && !currentPoll && (
          <PollForm
            onSubmit={handleCreatePoll}
            isLoading={isLoading}
            disabled={!canCreatePolls}
          />
        )}

        {effectiveTab === 'active' && currentPoll && (
          <ActivePollDisplay
            poll={currentPoll}
            onTerminate={handleTerminate}
            onArchive={handleArchive}
            isLoading={isLoading}
          />
        )}

        {effectiveTab === 'active' && !currentPoll && (
          <div className="text-center py-12">
            <BarChart3 size={32} className="mx-auto mb-3 text-zinc-400" />
            <p className="text-zinc-500 mb-4">No hay encuesta activa</p>
            <Button variant="primary" onClick={() => setActiveTab('create')}>
              <Plus size={16} className="mr-2" />
              Crear Encuesta
            </Button>
          </div>
        )}

        {effectiveTab === 'history' && (
          <PollHistory polls={history} />
        )}
      </div>
    </div>
  );
};

export default TwitchPollPanel;
