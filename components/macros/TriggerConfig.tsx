/**
 * TriggerConfig Component
 * 
 * Configuration panel for macro triggers.
 * Supports different trigger types with specific configuration forms.
 * 
 * @requirements 6.1 - THE Macro_Editor SHALL show a form to configure the trigger
 */

import React, { useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Clock,
  Zap,
  Hand,
  Users,
  Info,
} from 'lucide-react';
import type {
  MacroTrigger,
  TriggerType,
  TriggerConfig as TriggerConfigType,
  ChatCommandTrigger,
  ChatKeywordTrigger,
  ScheduleTrigger,
  EventTrigger,
  ManualTrigger,
} from '../../types/macros';

// ============================================
// Types
// ============================================

export interface TriggerConfigProps {
  /** Current trigger configuration */
  trigger: MacroTrigger;
  /** Callback when trigger type changes */
  onTypeChange: (type: TriggerType) => void;
  /** Callback when trigger config changes */
  onConfigChange: (config: TriggerConfigType) => void;
}

// ============================================
// Constants
// ============================================

const TRIGGER_TYPES: { type: TriggerType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'chat_command',
    label: 'Comando',
    icon: <MessageSquare size={16} />,
    description: 'Se activa con un comando específico (ej: !raid)',
  },
  {
    type: 'chat_keyword',
    label: 'Palabra clave',
    icon: <Search size={16} />,
    description: 'Se activa cuando aparece una palabra en el chat',
  },
  {
    type: 'schedule',
    label: 'Programado',
    icon: <Clock size={16} />,
    description: 'Se ejecuta en intervalos de tiempo',
  },
  {
    type: 'event',
    label: 'Evento',
    icon: <Zap size={16} />,
    description: 'Se activa con eventos del stream (follows, raids, etc.)',
  },
  {
    type: 'manual',
    label: 'Manual',
    icon: <Hand size={16} />,
    description: 'Se ejecuta manualmente desde la interfaz',
  },
];

const EVENT_TYPES = [
  { value: 'follower', label: 'Nuevo seguidor' },
  { value: 'raid', label: 'Raid recibido' },
  { value: 'subscription', label: 'Nueva suscripción' },
  { value: 'bits', label: 'Bits recibidos' },
  { value: 'host', label: 'Host recibido' },
  { value: 'poll_ended', label: 'Encuesta finalizada' },
  { value: 'prediction_resolved', label: 'Predicción resuelta' },
];

const USER_ROLES = [
  { value: 'viewer', label: 'Cualquier usuario' },
  { value: 'subscriber', label: 'Suscriptores' },
  { value: 'moderator', label: 'Moderadores' },
  { value: 'broadcaster', label: 'Solo streamer' },
];

// ============================================
// Component
// ============================================

export const TriggerConfig: React.FC<TriggerConfigProps> = ({
  trigger,
  onTypeChange,
  onConfigChange,
}) => {
  /**
   * Update chat command config
   */
  const updateChatCommand = useCallback((updates: Partial<ChatCommandTrigger>) => {
    const current = trigger.config as ChatCommandTrigger;
    onConfigChange({ ...current, ...updates });
  }, [trigger.config, onConfigChange]);

  /**
   * Update chat keyword config
   */
  const updateChatKeyword = useCallback((updates: Partial<ChatKeywordTrigger>) => {
    const current = trigger.config as ChatKeywordTrigger;
    onConfigChange({ ...current, ...updates });
  }, [trigger.config, onConfigChange]);

  /**
   * Update schedule config
   */
  const updateSchedule = useCallback((updates: Partial<ScheduleTrigger>) => {
    const current = trigger.config as ScheduleTrigger;
    onConfigChange({ ...current, ...updates });
  }, [trigger.config, onConfigChange]);

  /**
   * Update event config
   */
  const updateEvent = useCallback((updates: Partial<EventTrigger>) => {
    const current = trigger.config as EventTrigger;
    onConfigChange({ ...current, ...updates });
  }, [trigger.config, onConfigChange]);

  /**
   * Update manual config
   */
  const updateManual = useCallback((updates: Partial<ManualTrigger>) => {
    const current = trigger.config as ManualTrigger;
    onConfigChange({ ...current, ...updates });
  }, [trigger.config, onConfigChange]);

  /**
   * Handle keyword input (comma-separated)
   */
  const handleKeywordsChange = useCallback((value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    updateChatKeyword({ keywords });
  }, [updateChatKeyword]);

  /**
   * Render trigger type selector
   */
  const renderTypeSelector = () => (
    <div className="grid grid-cols-5 gap-2">
      {TRIGGER_TYPES.map(({ type, label, icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onTypeChange(type)}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
            trigger.type === type
              ? 'bg-purple-500/20 border-purple-500 text-purple-400'
              : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
          }`}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );

  /**
   * Render chat command configuration
   */
  const renderChatCommandConfig = () => {
    const config = trigger.config as ChatCommandTrigger;
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg text-blue-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>El comando debe empezar con ! (ej: !raid, !saludo)</span>
        </div>

        <div>
          <label htmlFor="trigger-command" className="block text-sm font-medium text-zinc-400 mb-1">
            Comando *
          </label>
          <input
            type="text"
            id="trigger-command"
            value={config.command || ''}
            onChange={(e) => updateChatCommand({ command: e.target.value })}
            placeholder="!comando"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <span className="text-sm text-zinc-300">Sensible a mayúsculas</span>
            <button
              type="button"
              onClick={() => updateChatCommand({ caseSensitive: !config.caseSensitive })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.caseSensitive ? 'bg-purple-500' : 'bg-zinc-600'
              }`}
              role="switch"
              aria-checked={config.caseSensitive}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.caseSensitive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="trigger-role" className="block text-sm font-medium text-zinc-400 mb-1">
              <Users size={12} className="inline mr-1" />
              Rol mínimo
            </label>
            <select
              id="trigger-role"
              value={config.requiredRole || 'viewer'}
              onChange={(e) => updateChatCommand({ requiredRole: e.target.value as ChatCommandTrigger['requiredRole'] })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {USER_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render chat keyword configuration
   */
  const renderChatKeywordConfig = () => {
    const config = trigger.config as ChatKeywordTrigger;
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg text-blue-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Separa múltiples palabras con comas</span>
        </div>

        <div>
          <label htmlFor="trigger-keywords" className="block text-sm font-medium text-zinc-400 mb-1">
            Palabras clave *
          </label>
          <input
            type="text"
            id="trigger-keywords"
            value={(config.keywords || []).join(', ')}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="hola, saludo, bienvenido"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <span className="text-sm text-zinc-300">Todas las palabras (AND)</span>
            <button
              type="button"
              onClick={() => updateChatKeyword({ matchAll: !config.matchAll })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.matchAll ? 'bg-purple-500' : 'bg-zinc-600'
              }`}
              role="switch"
              aria-checked={config.matchAll}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.matchAll ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <span className="text-sm text-zinc-300">Sensible a mayúsculas</span>
            <button
              type="button"
              onClick={() => updateChatKeyword({ caseSensitive: !config.caseSensitive })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.caseSensitive ? 'bg-purple-500' : 'bg-zinc-600'
              }`}
              role="switch"
              aria-checked={config.caseSensitive}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.caseSensitive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render schedule configuration
   */
  const renderScheduleConfig = () => {
    const config = trigger.config as ScheduleTrigger;
    return (
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Tipo de programación
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSchedule({ type: 'interval' })}
              className={`p-3 rounded-lg border text-sm transition-all ${
                config.type === 'interval'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              Intervalo
            </button>
            <button
              type="button"
              onClick={() => updateSchedule({ type: 'cron' })}
              className={`p-3 rounded-lg border text-sm transition-all ${
                config.type === 'cron'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              Cron
            </button>
          </div>
        </div>

        {config.type === 'interval' ? (
          <div>
            <label htmlFor="trigger-interval" className="block text-sm font-medium text-zinc-400 mb-1">
              Intervalo (minutos) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                id="trigger-interval"
                min={1}
                max={120}
                value={config.interval || 30}
                onChange={(e) => updateSchedule({ interval: Number(e.target.value) })}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <input
                type="number"
                min={1}
                max={120}
                value={config.interval || 30}
                onChange={(e) => updateSchedule({ interval: Math.min(120, Math.max(1, Number(e.target.value))) })}
                className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="trigger-cron" className="block text-sm font-medium text-zinc-400 mb-1">
              Expresión Cron *
            </label>
            <input
              type="text"
              id="trigger-cron"
              value={config.cron || ''}
              onChange={(e) => updateSchedule({ cron: e.target.value })}
              placeholder="*/30 * * * *"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Formato: minuto hora día mes día_semana
            </p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render event configuration
   */
  const renderEventConfig = () => {
    const config = trigger.config as EventTrigger;
    return (
      <div className="space-y-4 mt-4">
        <div>
          <label htmlFor="trigger-event-type" className="block text-sm font-medium text-zinc-400 mb-1">
            Tipo de evento *
          </label>
          <select
            id="trigger-event-type"
            value={config.eventType || 'follower'}
            onChange={(e) => updateEvent({ eventType: e.target.value as EventTrigger['eventType'] })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {EVENT_TYPES.map(event => (
              <option key={event.value} value={event.value}>{event.label}</option>
            ))}
          </select>
        </div>

        {(config.eventType === 'bits' || config.eventType === 'raid') && (
          <div>
            <label htmlFor="trigger-min-value" className="block text-sm font-medium text-zinc-400 mb-1">
              Valor mínimo (opcional)
            </label>
            <input
              type="number"
              id="trigger-min-value"
              value={config.minValue || ''}
              onChange={(e) => updateEvent({ minValue: e.target.value ? Number(e.target.value) : undefined })}
              placeholder={config.eventType === 'bits' ? 'Mínimo de bits' : 'Mínimo de viewers'}
              min={0}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
      </div>
    );
  };

  /**
   * Render manual configuration
   */
  const renderManualConfig = () => {
    const config = trigger.config as ManualTrigger;
    return (
      <div className="space-y-4 mt-4">
        <div>
          <label htmlFor="trigger-hotkey" className="block text-sm font-medium text-zinc-400 mb-1">
            Atajo de teclado (opcional)
          </label>
          <input
            type="text"
            id="trigger-hotkey"
            value={config.hotkey || ''}
            onChange={(e) => updateManual({ hotkey: e.target.value })}
            placeholder="Ctrl+Shift+M"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
          <span className="text-sm text-zinc-300">Mostrar en acciones rápidas</span>
          <button
            type="button"
            onClick={() => updateManual({ showInQuickActions: !config.showInQuickActions })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              config.showInQuickActions ? 'bg-purple-500' : 'bg-zinc-600'
            }`}
            role="switch"
            aria-checked={config.showInQuickActions}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                config.showInQuickActions ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render config based on trigger type
   */
  const renderConfig = () => {
    switch (trigger.type) {
      case 'chat_command':
        return renderChatCommandConfig();
      case 'chat_keyword':
        return renderChatKeywordConfig();
      case 'schedule':
        return renderScheduleConfig();
      case 'event':
        return renderEventConfig();
      case 'manual':
        return renderManualConfig();
      default:
        return null;
    }
  };

  // Get current trigger description
  const currentTrigger = TRIGGER_TYPES.find(t => t.type === trigger.type);

  return (
    <div className="space-y-4">
      {/* Type Selector */}
      {renderTypeSelector()}

      {/* Description */}
      {currentTrigger && (
        <p className="text-xs text-zinc-500 text-center">
          {currentTrigger.description}
        </p>
      )}

      {/* Type-specific Config */}
      {renderConfig()}
    </div>
  );
};

export default TriggerConfig;
