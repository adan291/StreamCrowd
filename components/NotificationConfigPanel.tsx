/**
 * NotificationConfigPanel - Configuration panel for push notifications and external alerts
 * 
 * Provides UI for configuring notification channels (Push, Discord, Telegram),
 * event filtering, quiet hours, and testing notifications.
 * 
 * @requirements 4.1, 4.2, 4.5, 4.7, 6.1, 6.5, 6.6
 */
import React, { useState, useCallback } from 'react';
import {
  Bell,
  MessageSquare,
  Send,
  Settings,
  Check,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Play,
  Moon,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNotificationConfig } from '../hooks/useNotificationConfig';
import { useNotifications } from '../hooks/useNotifications';
import type {
  NotificationChannel,
  NotificationEventType,
  PushNotificationConfig,
  DiscordWebhookConfig,
  TelegramBotConfig,
} from '../types/notifications';
import { EVENT_TYPE_EMOJIS } from '../types/notifications';

// ============================================
// TYPES
// ============================================

type TabType = 'push' | 'discord' | 'telegram' | 'events' | 'quiet';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================
// CONSTANTS
// ============================================

const TABS: TabConfig[] = [
  { id: 'push', label: 'Push', icon: <Bell size={16} />, description: 'Notificaciones del navegador' },
  { id: 'discord', label: 'Discord', icon: <MessageSquare size={16} />, description: 'Webhooks de Discord' },
  { id: 'telegram', label: 'Telegram', icon: <Send size={16} />, description: 'Bot de Telegram' },
  { id: 'events', label: 'Eventos', icon: <Settings size={16} />, description: 'Configurar eventos' },
  { id: 'quiet', label: 'Silencio', icon: <Moon size={16} />, description: 'Horario silencioso' },
];

const EVENT_TYPES: { type: NotificationEventType; label: string }[] = [
  { type: 'follower', label: 'Nuevo seguidor' },
  { type: 'raid', label: 'Raid' },
  { type: 'host', label: 'Host' },
  { type: 'donation', label: 'Donación' },
  { type: 'subscription', label: 'Suscripción' },
  { type: 'bits', label: 'Bits' },
  { type: 'poll_ended', label: 'Encuesta finalizada' },
  { type: 'prediction_resolved', label: 'Predicción resuelta' },
  { type: 'giveaway_winner', label: 'Ganador de sorteo' },
  { type: 'command_executed', label: 'Comando ejecutado' },
];

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  enabled: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ enabled, hasError, errorMessage }) => {
  if (hasError) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs" title={errorMessage}>
        <AlertCircle size={12} />
        <span>Error</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
      enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-600/50 text-zinc-400'
    }`}>
      {enabled ? <Check size={12} /> : <X size={12} />}
      <span>{enabled ? 'Activo' : 'Inactivo'}</span>
    </div>
  );
};

// ============================================
// TOGGLE SWITCH COMPONENT
// ============================================

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, disabled, label }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && <span className="text-zinc-300 text-sm">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-purple-500' : 'bg-zinc-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </label>
  );
};


// ============================================
// PUSH CONFIG PANEL
// ============================================

interface PushConfigPanelProps {
  config: PushNotificationConfig;
  onUpdate: (config: Partial<PushNotificationConfig>) => void;
  onTest: () => Promise<boolean>;
  isTesting: boolean;
}

const PushConfigPanel: React.FC<PushConfigPanelProps> = ({ config, onUpdate, onTest, isTesting }) => {
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    const success = await onTest();
    setTestResult(success ? 'success' : 'error');
    setTimeout(() => setTestResult(null), 3000);
  };

  const permissionStatus = config.permission;
  const needsPermission = permissionStatus === 'default';
  const permissionDenied = permissionStatus === 'denied';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Bell size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Notificaciones Push</h3>
            <p className="text-zinc-500 text-xs">Notificaciones del navegador</p>
          </div>
        </div>
        <StatusBadge enabled={config.enabled} hasError={permissionDenied} errorMessage="Permisos denegados" />
      </div>

      {/* Permission Status */}
      <div className="bg-zinc-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">Estado de permisos:</span>
            <span className={`text-sm font-medium ${
              permissionStatus === 'granted' ? 'text-green-400' :
              permissionStatus === 'denied' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {permissionStatus === 'granted' ? 'Concedido' :
               permissionStatus === 'denied' ? 'Denegado' : 'Pendiente'}
            </span>
          </div>
          {needsPermission && (
            <button
              onClick={() => {
                if (typeof Notification !== 'undefined') {
                  Notification.requestPermission().then(permission => {
                    onUpdate({ permission, enabled: permission === 'granted' });
                  });
                }
              }}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors"
            >
              Solicitar permiso
            </button>
          )}
        </div>
        {permissionDenied && (
          <p className="text-xs text-zinc-500 mt-2">
            Los permisos fueron denegados. Habilítalos manualmente en la configuración del navegador.
          </p>
        )}
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
        <span className="text-zinc-300 text-sm">Habilitar notificaciones push</span>
        <ToggleSwitch
          enabled={config.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
          disabled={permissionStatus !== 'granted'}
        />
      </div>

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={!config.enabled || isTesting}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          config.enabled
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {isTesting ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Play size={16} />
        )}
        {isTesting ? 'Enviando...' : 'Probar notificación'}
        {testResult === 'success' && <Check size={16} className="text-green-400" />}
        {testResult === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </button>
    </div>
  );
};


// ============================================
// DISCORD CONFIG PANEL
// ============================================

interface DiscordConfigPanelProps {
  config: DiscordWebhookConfig;
  onUpdate: (config: Partial<DiscordWebhookConfig>) => void;
  onTest: () => Promise<boolean>;
  isTesting: boolean;
}

const DiscordConfigPanel: React.FC<DiscordConfigPanelProps> = ({ config, onUpdate, onTest, isTesting }) => {
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTest = async () => {
    setTestResult(null);
    const success = await onTest();
    setTestResult(success ? 'success' : 'error');
    setTimeout(() => setTestResult(null), 3000);
  };

  const isValidWebhook = config.webhookUrl.includes('discord.com/api/webhooks/') || 
                         config.webhookUrl.includes('discordapp.com/api/webhooks/');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <MessageSquare size={20} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Discord Webhook</h3>
            <p className="text-zinc-500 text-xs">Envía alertas a tu servidor</p>
          </div>
        </div>
        <StatusBadge 
          enabled={config.enabled} 
          hasError={config.enabled && !isValidWebhook} 
          errorMessage="URL de webhook inválida" 
        />
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
        <span className="text-zinc-300 text-sm">Habilitar Discord</span>
        <ToggleSwitch
          enabled={config.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      {/* Webhook URL */}
      <div>
        <label className="text-zinc-400 text-xs block mb-1.5">URL del Webhook</label>
        <input
          type="url"
          value={config.webhookUrl}
          onChange={(e) => onUpdate({ webhookUrl: e.target.value })}
          placeholder="https://discord.com/api/webhooks/..."
          className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
        />
        {config.webhookUrl && !isValidWebhook && (
          <p className="text-xs text-red-400 mt-1">URL de webhook inválida</p>
        )}
      </div>

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-zinc-400 text-sm hover:text-white transition-colors"
      >
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Opciones avanzadas
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-4 border-l-2 border-zinc-700">
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Nombre del bot (opcional)</label>
            <input
              type="text"
              value={config.username || ''}
              onChange={(e) => onUpdate({ username: e.target.value || undefined })}
              placeholder="TwitchVote Bot"
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">URL del avatar (opcional)</label>
            <input
              type="url"
              value={config.avatarUrl || ''}
              onChange={(e) => onUpdate({ avatarUrl: e.target.value || undefined })}
              placeholder="https://example.com/avatar.png"
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={!config.enabled || !isValidWebhook || isTesting}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          config.enabled && isValidWebhook
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {isTesting ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Play size={16} />
        )}
        {isTesting ? 'Enviando...' : 'Probar webhook'}
        {testResult === 'success' && <Check size={16} className="text-green-400" />}
        {testResult === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </button>
    </div>
  );
};


// ============================================
// TELEGRAM CONFIG PANEL
// ============================================

interface TelegramConfigPanelProps {
  config: TelegramBotConfig;
  onUpdate: (config: Partial<TelegramBotConfig>) => void;
  onTest: () => Promise<boolean>;
  isTesting: boolean;
}

const TelegramConfigPanel: React.FC<TelegramConfigPanelProps> = ({ config, onUpdate, onTest, isTesting }) => {
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showToken, setShowToken] = useState(false);

  const handleTest = async () => {
    setTestResult(null);
    const success = await onTest();
    setTestResult(success ? 'success' : 'error');
    setTimeout(() => setTestResult(null), 3000);
  };

  const hasValidConfig = config.botToken.length > 0 && config.chatId.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Send size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Telegram Bot</h3>
            <p className="text-zinc-500 text-xs">Recibe alertas en Telegram</p>
          </div>
        </div>
        <StatusBadge 
          enabled={config.enabled} 
          hasError={config.enabled && !hasValidConfig} 
          errorMessage="Configuración incompleta" 
        />
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
        <span className="text-zinc-300 text-sm">Habilitar Telegram</span>
        <ToggleSwitch
          enabled={config.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      {/* Bot Token */}
      <div>
        <label className="text-zinc-400 text-xs block mb-1.5">Token del Bot</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={config.botToken}
            onChange={(e) => onUpdate({ botToken: e.target.value })}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="w-full px-3 py-2 pr-10 bg-zinc-800 text-white rounded-lg text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Obtén el token de @BotFather en Telegram
        </p>
      </div>

      {/* Chat ID */}
      <div>
        <label className="text-zinc-400 text-xs block mb-1.5">Chat ID</label>
        <input
          type="text"
          value={config.chatId}
          onChange={(e) => onUpdate({ chatId: e.target.value })}
          placeholder="-1001234567890"
          className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-500 mt-1">
          ID del chat, grupo o canal donde enviar las alertas
        </p>
      </div>

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={!config.enabled || !hasValidConfig || isTesting}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          config.enabled && hasValidConfig
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {isTesting ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Play size={16} />
        )}
        {isTesting ? 'Enviando...' : 'Probar bot'}
        {testResult === 'success' && <Check size={16} className="text-green-400" />}
        {testResult === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </button>
    </div>
  );
};


// ============================================
// EVENTS CONFIG PANEL
// ============================================

interface EventsConfigPanelProps {
  events: Record<NotificationEventType, { enabled: boolean; channels: NotificationChannel[] }>;
  enabledChannels: NotificationChannel[];
  onUpdateEvent: (eventType: NotificationEventType, config: { enabled?: boolean; channels?: NotificationChannel[] }) => void;
}

const EventsConfigPanel: React.FC<EventsConfigPanelProps> = ({ events, enabledChannels, onUpdateEvent }) => {
  const toggleChannel = (eventType: NotificationEventType, channel: NotificationChannel) => {
    const currentChannels = events[eventType]?.channels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    onUpdateEvent(eventType, { channels: newChannels });
  };

  const channelLabels: Record<NotificationChannel, { label: string; color: string }> = {
    push: { label: 'Push', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    discord: { label: 'Discord', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    telegram: { label: 'Telegram', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-zinc-700 rounded-lg">
          <Settings size={20} className="text-zinc-400" />
        </div>
        <div>
          <h3 className="text-white font-medium">Configuración de Eventos</h3>
          <p className="text-zinc-500 text-xs">Selecciona qué eventos notificar por cada canal</p>
        </div>
      </div>

      {enabledChannels.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">
            No hay canales habilitados. Activa al menos un canal para configurar eventos.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {EVENT_TYPES.map(({ type, label }) => {
          const eventConfig = events[type] || { enabled: true, channels: [] };
          const emoji = EVENT_TYPE_EMOJIS[type];

          return (
            <div key={type} className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-white text-sm">{label}</span>
                </div>
                <ToggleSwitch
                  enabled={eventConfig.enabled}
                  onChange={(enabled) => onUpdateEvent(type, { enabled })}
                />
              </div>
              
              {eventConfig.enabled && enabledChannels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-zinc-700">
                  {enabledChannels.map(channel => {
                    const isActive = eventConfig.channels.includes(channel);
                    const { label: channelLabel, color } = channelLabels[channel];
                    
                    return (
                      <button
                        key={channel}
                        onClick={() => toggleChannel(type, channel)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                          isActive ? color : 'bg-zinc-700/50 text-zinc-500 border-zinc-600'
                        }`}
                      >
                        {channelLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ============================================
// QUIET HOURS CONFIG PANEL
// ============================================

interface QuietHoursConfigPanelProps {
  quietHours: { enabled: boolean; start: string; end: string };
  onUpdate: (config: Partial<{ enabled: boolean; start: string; end: string }>) => void;
  isActive: boolean;
}

const QuietHoursConfigPanel: React.FC<QuietHoursConfigPanelProps> = ({ quietHours, onUpdate, isActive }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Moon size={20} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Modo Silencioso</h3>
            <p className="text-zinc-500 text-xs">Suprime notificaciones en horarios específicos</p>
          </div>
        </div>
        {isActive && quietHours.enabled && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
            <Moon size={12} />
            <span>Activo ahora</span>
          </div>
        )}
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
        <span className="text-zinc-300 text-sm">Habilitar modo silencioso</span>
        <ToggleSwitch
          enabled={quietHours.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      {/* Time Range */}
      {quietHours.enabled && (
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Clock size={14} />
            <span>Horario silencioso</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-xs block mb-1.5">Inicio</label>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => onUpdate({ start: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-lg text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1.5">Fin</label>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => onUpdate({ end: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-lg text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Durante este horario, todas las notificaciones serán suprimidas.
            {quietHours.start > quietHours.end && ' El horario cruza la medianoche.'}
          </p>
        </div>
      )}
    </div>
  );
};


// ============================================
// MAIN COMPONENT
// ============================================

export const NotificationConfigPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('push');
  
  const {
    config,
    updateChannelConfig,
    updateEventConfig,
    updateQuietHours,
    isQuietHoursActive,
    getEnabledChannels,
  } = useNotificationConfig();

  const { testChannel, isTesting } = useNotifications();

  const handleTestChannel = useCallback(async (channel: NotificationChannel): Promise<boolean> => {
    return await testChannel(channel);
  }, [testChannel]);

  const enabledChannels = getEnabledChannels();
  const quietHoursActive = isQuietHoursActive();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'push':
        return (
          <PushConfigPanel
            config={config.channels.push}
            onUpdate={(update) => updateChannelConfig('push', update)}
            onTest={() => handleTestChannel('push')}
            isTesting={isTesting}
          />
        );
      case 'discord':
        return (
          <DiscordConfigPanel
            config={config.channels.discord}
            onUpdate={(update) => updateChannelConfig('discord', update)}
            onTest={() => handleTestChannel('discord')}
            isTesting={isTesting}
          />
        );
      case 'telegram':
        return (
          <TelegramConfigPanel
            config={config.channels.telegram}
            onUpdate={(update) => updateChannelConfig('telegram', update)}
            onTest={() => handleTestChannel('telegram')}
            isTesting={isTesting}
          />
        );
      case 'events':
        return (
          <EventsConfigPanel
            events={config.events}
            enabledChannels={enabledChannels}
            onUpdateEvent={updateEventConfig}
          />
        );
      case 'quiet':
        return (
          <QuietHoursConfigPanel
            quietHours={config.quietHours}
            onUpdate={updateQuietHours}
            isActive={quietHoursActive}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Bell size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-white text-lg font-bold">Notificaciones</h2>
            <p className="text-zinc-500 text-xs">
              {enabledChannels.length} canal{enabledChannels.length !== 1 ? 'es' : ''} activo{enabledChannels.length !== 1 ? 's' : ''}
              {quietHoursActive && ' • Modo silencioso activo'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                  : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'
              }`}
              title={tab.description}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default NotificationConfigPanel;