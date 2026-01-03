/**
 * ActionBuilder Component
 * 
 * Form for configuring individual macro actions.
 * Provides specific fields based on action type.
 * 
 * @requirements 6.3 - THE Macro_Editor SHALL show an action type selector with descriptive icons
 * @requirements 6.4 - THE Macro_Editor SHALL show specific fields based on selected action type
 */

import React, { useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import type {
  MacroAction,
  ActionType,
  SendChatMessageConfig,
  ChangeSceneConfig,
  ToggleSourceConfig,
  PlaySoundConfig,
  StartPollConfig,
  StartPredictionConfig,
  SendNotificationConfig,
  SetVariableConfig,
  DelayConfig,
} from '../../types/macros';

// ============================================
// Types
// ============================================

export interface ActionBuilderProps {
  /** Current action configuration */
  action: MacroAction;
  /** Callback when action changes */
  onChange: (updates: Partial<MacroAction>) => void;
}

// ============================================
// Constants
// ============================================

const PLATFORMS = [
  { value: 'all', label: 'Todas las plataformas' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
];

const TOGGLE_ACTIONS = [
  { value: 'show', label: 'Mostrar' },
  { value: 'hide', label: 'Ocultar' },
  { value: 'toggle', label: 'Alternar' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'push', label: 'Push' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
];

const VARIABLE_OPERATIONS = [
  { value: 'set', label: 'Establecer' },
  { value: 'increment', label: 'Incrementar' },
  { value: 'decrement', label: 'Decrementar' },
];

const SYSTEM_VARIABLES = [
  '{username}',
  '{displayName}',
  '{message}',
  '{platform}',
  '{timestamp}',
  '{viewers}',
  '{followers}',
  '{uptime}',
  '{game}',
  '{title}',
];

// ============================================
// Component
// ============================================

export const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  onChange,
}) => {
  /**
   * Update action config
   */
  const updateConfig = useCallback(<T extends object>(updates: Partial<T>) => {
    onChange({
      config: { ...action.config, ...updates } as MacroAction['config'],
    });
  }, [action.config, onChange]);

  /**
   * Update delay
   */
  const updateDelay = useCallback((delay: number) => {
    onChange({ delay: Math.max(0, Math.min(60, delay)) });
  }, [onChange]);

  /**
   * Insert variable into text field
   */
  const insertVariable = useCallback((
    currentValue: string,
    variable: string,
    setter: (value: string) => void
  ) => {
    setter(currentValue + variable);
  }, []);

  /**
   * Render send chat message config
   */
  const renderSendChatMessage = () => {
    const config = action.config as SendChatMessageConfig;
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="action-message" className="block text-sm font-medium text-zinc-400 mb-1">
            Mensaje *
          </label>
          <textarea
            id="action-message"
            value={config.message || ''}
            onChange={(e) => updateConfig<SendChatMessageConfig>({ message: e.target.value })}
            placeholder="Escribe el mensaje a enviar..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
          />
          <div className="flex justify-between mt-1">
            <div className="flex flex-wrap gap-1">
              {SYSTEM_VARIABLES.slice(0, 5).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(
                    config.message || '',
                    v,
                    (val) => updateConfig<SendChatMessageConfig>({ message: val })
                  )}
                  className="text-xs bg-zinc-600 text-purple-400 px-1.5 py-0.5 rounded hover:bg-zinc-500 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-500">{(config.message || '').length}/500</span>
          </div>
        </div>

        <div>
          <label htmlFor="action-platform" className="block text-sm font-medium text-zinc-400 mb-1">
            Plataforma
          </label>
          <select
            id="action-platform"
            value={config.platform || 'all'}
            onChange={(e) => updateConfig<SendChatMessageConfig>({ platform: e.target.value as SendChatMessageConfig['platform'] })}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            {PLATFORMS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  /**
   * Render change scene config
   */
  const renderChangeScene = () => {
    const config = action.config as ChangeSceneConfig;
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg text-blue-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Requiere conexión con OBS WebSocket</span>
        </div>

        <div>
          <label htmlFor="action-scene" className="block text-sm font-medium text-zinc-400 mb-1">
            Nombre de la escena *
          </label>
          <input
            type="text"
            id="action-scene"
            value={config.sceneName || ''}
            onChange={(e) => updateConfig<ChangeSceneConfig>({ sceneName: e.target.value })}
            placeholder="Ej: Gaming, Just Chatting"
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>
    );
  };

  /**
   * Render toggle source config
   */
  const renderToggleSource = () => {
    const config = action.config as ToggleSourceConfig;
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg text-blue-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Requiere conexión con OBS WebSocket</span>
        </div>

        <div>
          <label htmlFor="action-source" className="block text-sm font-medium text-zinc-400 mb-1">
            Nombre de la fuente *
          </label>
          <input
            type="text"
            id="action-source"
            value={config.sourceName || ''}
            onChange={(e) => updateConfig<ToggleSourceConfig>({ sourceName: e.target.value })}
            placeholder="Ej: Webcam, Alert Box"
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="action-toggle-action" className="block text-sm font-medium text-zinc-400 mb-1">
            Acción
          </label>
          <select
            id="action-toggle-action"
            value={config.action || 'toggle'}
            onChange={(e) => updateConfig<ToggleSourceConfig>({ action: e.target.value as ToggleSourceConfig['action'] })}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            {TOGGLE_ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  /**
   * Render play sound config
   */
  const renderPlaySound = () => {
    const config = action.config as PlaySoundConfig;
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="action-sound" className="block text-sm font-medium text-zinc-400 mb-1">
            ID del sonido *
          </label>
          <input
            type="text"
            id="action-sound"
            value={config.soundId || ''}
            onChange={(e) => updateConfig<PlaySoundConfig>({ soundId: e.target.value })}
            placeholder="ID del sonido del soundboard"
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="action-volume" className="text-sm font-medium text-zinc-400">
              Volumen
            </label>
            <span className="text-sm font-medium text-purple-400 min-w-[45px] text-right">
              {config.volume || 100}%
            </span>
          </div>
          <input
            type="range"
            id="action-volume"
            min={0}
            max={100}
            value={config.volume || 100}
            onChange={(e) => updateConfig<PlaySoundConfig>({ volume: Number(e.target.value) })}
            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
    );
  };

  /**
   * Render start poll config
   */
  const renderStartPoll = () => {
    const config = action.config as StartPollConfig;
    const options = config.options || ['', ''];

    const addOption = () => {
      if (options.length < 5) {
        updateConfig<StartPollConfig>({ options: [...options, ''] });
      }
    };

    const removeOption = (index: number) => {
      if (options.length > 2) {
        updateConfig<StartPollConfig>({ options: options.filter((_, i) => i !== index) });
      }
    };

    const updateOption = (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      updateConfig<StartPollConfig>({ options: newOptions });
    };

    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="action-poll-title" className="block text-sm font-medium text-zinc-400 mb-1">
            Título de la encuesta *
          </label>
          <input
            type="text"
            id="action-poll-title"
            value={config.title || ''}
            onChange={(e) => updateConfig<StartPollConfig>({ title: e.target.value })}
            placeholder="¿Qué juego jugamos?"
            maxLength={60}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-zinc-400">
              Opciones ({options.length}/5)
            </label>
            {options.length < 5 && (
              <button
                type="button"
                onClick={addOption}
                className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
              >
                <Plus size={12} />
                Añadir
              </button>
            )}
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Opción ${index + 1}`}
                  maxLength={25}
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="action-poll-duration" className="text-sm font-medium text-zinc-400">
              Duración
            </label>
            <span className="text-sm font-medium text-purple-400 min-w-[50px] text-right">
              {config.duration || 60}s
            </span>
          </div>
          <input
            type="range"
            id="action-poll-duration"
            min={15}
            max={300}
            step={15}
            value={config.duration || 60}
            onChange={(e) => updateConfig<StartPollConfig>({ duration: Number(e.target.value) })}
            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
    );
  };

  /**
   * Render start prediction config
   */
  const renderStartPrediction = () => {
    const config = action.config as StartPredictionConfig;
    const outcomes = config.outcomes || ['', ''];

    const addOutcome = () => {
      if (outcomes.length < 10) {
        updateConfig<StartPredictionConfig>({ outcomes: [...outcomes, ''] });
      }
    };

    const removeOutcome = (index: number) => {
      if (outcomes.length > 2) {
        updateConfig<StartPredictionConfig>({ outcomes: outcomes.filter((_, i) => i !== index) });
      }
    };

    const updateOutcome = (index: number, value: string) => {
      const newOutcomes = [...outcomes];
      newOutcomes[index] = value;
      updateConfig<StartPredictionConfig>({ outcomes: newOutcomes });
    };

    // Format duration for display
    const formatDuration = (seconds: number) => {
      if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
      }
      return `${seconds}s`;
    };

    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2 bg-purple-500/10 rounded-lg text-purple-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Requiere autenticación como streamer del canal (la API de Twitch no permite que mods creen predicciones)</span>
        </div>

        <div>
          <label htmlFor="action-prediction-title" className="block text-sm font-medium text-zinc-400 mb-1">
            Título de la predicción *
          </label>
          <input
            type="text"
            id="action-prediction-title"
            value={config.title || ''}
            onChange={(e) => updateConfig<StartPredictionConfig>({ title: e.target.value })}
            placeholder="¿Quién ganará?"
            maxLength={45}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-zinc-400">
              Resultados ({outcomes.length}/10)
            </label>
            {outcomes.length < 10 && (
              <button
                type="button"
                onClick={addOutcome}
                className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
              >
                <Plus size={12} />
                Añadir
              </button>
            )}
          </div>
          <div className="space-y-2">
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  placeholder={`Resultado ${index + 1}`}
                  maxLength={25}
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(index)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="action-prediction-duration" className="text-sm font-medium text-zinc-400">
              Duración
            </label>
            <span className="text-sm font-medium text-purple-400 min-w-[60px] text-right">
              {formatDuration(config.duration || 120)}
            </span>
          </div>
          <input
            type="range"
            id="action-prediction-duration"
            min={30}
            max={1800}
            step={30}
            value={config.duration || 120}
            onChange={(e) => updateConfig<StartPredictionConfig>({ duration: Number(e.target.value) })}
            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Mínimo 30 segundos, máximo 30 minutos (límite de Twitch)
          </p>
        </div>
      </div>
    );
  };

  /**
   * Render send notification config
   */
  const renderSendNotification = () => {
    const config = action.config as SendNotificationConfig;
    const channels = config.channels || [];

    const toggleChannel = (channel: 'push' | 'discord' | 'telegram') => {
      const newChannels = channels.includes(channel)
        ? channels.filter(c => c !== channel)
        : [...channels, channel];
      updateConfig<SendNotificationConfig>({ channels: newChannels });
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Canales *
          </label>
          <div className="flex gap-2">
            {NOTIFICATION_CHANNELS.map(ch => (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value as 'push' | 'discord' | 'telegram')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  channels.includes(ch.value as 'push' | 'discord' | 'telegram')
                    ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                    : 'bg-zinc-700 border border-zinc-600 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="action-notif-title" className="block text-sm font-medium text-zinc-400 mb-1">
            Título *
          </label>
          <input
            type="text"
            id="action-notif-title"
            value={config.title || ''}
            onChange={(e) => updateConfig<SendNotificationConfig>({ title: e.target.value })}
            placeholder="Título de la notificación"
            maxLength={100}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="action-notif-message" className="block text-sm font-medium text-zinc-400 mb-1">
            Mensaje *
          </label>
          <textarea
            id="action-notif-message"
            value={config.message || ''}
            onChange={(e) => updateConfig<SendNotificationConfig>({ message: e.target.value })}
            placeholder="Contenido de la notificación..."
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
          />
        </div>
      </div>
    );
  };

  /**
   * Render set variable config
   */
  const renderSetVariable = () => {
    const config = action.config as SetVariableConfig;
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="action-var-name" className="block text-sm font-medium text-zinc-400 mb-1">
            Nombre de la variable *
          </label>
          <input
            type="text"
            id="action-var-name"
            value={config.variableName || ''}
            onChange={(e) => updateConfig<SetVariableConfig>({ variableName: e.target.value })}
            placeholder="mi_variable"
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="action-var-operation" className="block text-sm font-medium text-zinc-400 mb-1">
            Operación
          </label>
          <select
            id="action-var-operation"
            value={config.operation || 'set'}
            onChange={(e) => updateConfig<SetVariableConfig>({ operation: e.target.value as SetVariableConfig['operation'] })}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            {VARIABLE_OPERATIONS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="action-var-value" className="block text-sm font-medium text-zinc-400 mb-1">
            Valor
          </label>
          <input
            type="text"
            id="action-var-value"
            value={String(config.value ?? '')}
            onChange={(e) => {
              const val = e.target.value;
              const numVal = Number(val);
              updateConfig<SetVariableConfig>({ 
                value: !isNaN(numVal) && val !== '' ? numVal : val 
              });
            }}
            placeholder="Valor o número"
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>
    );
  };

  /**
   * Render delay config
   */
  const renderDelay = () => {
    const config = action.config as DelayConfig;
    return (
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="action-delay-seconds" className="text-sm font-medium text-zinc-400">
              Segundos de espera
            </label>
            <span className="text-sm font-medium text-purple-400 min-w-[40px] text-right">
              {config.seconds || 5}s
            </span>
          </div>
          <input
            type="range"
            id="action-delay-seconds"
            min={1}
            max={60}
            value={config.seconds || 5}
            onChange={(e) => updateConfig<DelayConfig>({ seconds: Number(e.target.value) })}
            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
    );
  };

  /**
   * Render config based on action type
   */
  const renderConfig = () => {
    switch (action.type) {
      case 'send_chat_message':
        return renderSendChatMessage();
      case 'change_scene':
        return renderChangeScene();
      case 'toggle_source':
        return renderToggleSource();
      case 'play_sound':
        return renderPlaySound();
      case 'start_poll':
        return renderStartPoll();
      case 'start_prediction':
        return renderStartPrediction();
      case 'send_notification':
        return renderSendNotification();
      case 'set_variable':
        return renderSetVariable();
      case 'delay':
        return renderDelay();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Action-specific config */}
      {renderConfig()}

      {/* Delay before action (for non-delay actions) */}
      {action.type !== 'delay' && (
        <div className="pt-3 border-t border-zinc-600">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="action-pre-delay" className="flex items-center gap-1 text-sm font-medium text-zinc-400">
              <Clock size={12} />
              Delay antes de ejecutar
            </label>
            <span className="text-sm font-medium text-purple-400 min-w-[40px] text-right">
              {action.delay}s
            </span>
          </div>
          <input
            type="range"
            id="action-pre-delay"
            min={0}
            max={60}
            value={action.delay}
            onChange={(e) => updateDelay(Number(e.target.value))}
            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Tiempo de espera antes de ejecutar esta acción
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionBuilder;
