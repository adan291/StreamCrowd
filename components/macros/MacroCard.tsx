/**
 * MacroCard Component
 * 
 * Individual card displaying a macro with its trigger, actions, statistics,
 * and error indicator.
 * 
 * @requirements 7.5 - THE Macro_Manager SHALL show execution statistics per macro
 * @requirements 7.7 - THE Macro_Manager SHALL show the last error if a macro failed
 */

import React from 'react';
import {
  Zap,
  Play,
  Pause,
  Edit2,
  Copy,
  Trash2,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  Radio,
  MousePointer,
  Hash,
  MoreVertical,
  ChevronRight,
  X,
  TrendingUp,
  Square,
  Loader2,
  Check,
} from 'lucide-react';
import type { Macro, TriggerType, ActionType } from '../../types/macros';

// ============================================
// Types
// ============================================

export interface MacroCardProps {
  /** The macro to display */
  macro: Macro;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when duplicate is clicked */
  onDuplicate: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when execute is clicked */
  onExecute: () => Promise<boolean>;
  /** Callback when clear error is clicked */
  onClearError?: () => void;
  /** Callback when stop/cancel prediction is clicked */
  onStopPrediction?: () => Promise<boolean>;
  /** Whether all macros are globally paused */
  isPaused?: boolean;
  /** Whether there's an active prediction (for prediction macros) */
  hasPredictionActive?: boolean;
}

// ============================================
// Constants
// ============================================

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
  chat_command: <MessageSquare size={14} />,
  chat_keyword: <Hash size={14} />,
  schedule: <Calendar size={14} />,
  event: <Radio size={14} />,
  manual: <MousePointer size={14} />,
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  chat_command: 'Comando',
  chat_keyword: 'Palabra clave',
  schedule: 'Programada',
  event: 'Evento',
  manual: 'Manual',
};

const ACTION_ICONS: Record<ActionType, string> = {
  send_chat_message: '💬',
  change_scene: '🎬',
  toggle_source: '👁️',
  play_sound: '🔊',
  start_poll: '📊',
  start_prediction: '🎯',
  send_notification: '🔔',
  set_variable: '📝',
  delay: '⏱️',
};

// ============================================
// Helpers
// ============================================

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (minutes > 0) return `hace ${minutes}m`;
  return 'ahora';
}

/**
 * Get trigger description
 */
function getTriggerDescription(macro: Macro): string {
  const { type, config } = macro.trigger;
  
  switch (type) {
    case 'chat_command':
      return `!${(config as { command: string }).command}`;
    case 'chat_keyword':
      const keywords = (config as { keywords: string[] }).keywords;
      return keywords.slice(0, 2).join(', ') + (keywords.length > 2 ? '...' : '');
    case 'schedule':
      const scheduleConfig = config as { type: string; interval?: number };
      if (scheduleConfig.type === 'interval' && scheduleConfig.interval) {
        return `Cada ${scheduleConfig.interval} min`;
      }
      return 'Programada';
    case 'event':
      return (config as { eventType: string }).eventType;
    case 'manual':
      return 'Botón/Hotkey';
    default:
      return type;
  }
}

// ============================================
// Component
// ============================================

export const MacroCard: React.FC<MacroCardProps> = ({
  macro,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onExecute,
  onClearError,
  onStopPrediction,
  isPaused = false,
  hasPredictionActive = false,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [lastExecutionSuccess, setLastExecutionSuccess] = React.useState<boolean | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Check if this is a prediction macro
  const isPredictionMacro = macro.actions.some(a => a.type === 'start_prediction');
  
  // Reset success indicator after 2 seconds
  React.useEffect(() => {
    if (lastExecutionSuccess !== null) {
      const timer = setTimeout(() => setLastExecutionSuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastExecutionSuccess]);

  // Handle execute with feedback
  const handleExecute = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLastExecutionSuccess(null);
    
    try {
      const success = await onExecute();
      setLastExecutionSuccess(success);
    } catch {
      setLastExecutionSuccess(false);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle stop prediction
  const handleStopPrediction = async () => {
    if (isExecuting || !onStopPrediction) return;
    setIsExecuting(true);
    
    try {
      await onStopPrediction();
    } finally {
      setIsExecuting(false);
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const isDisabled = !macro.enabled || isPaused;
  const hasError = !!macro.lastError;

  return (
    <div
      className={`bg-zinc-800 rounded-lg border transition-all ${
        hasError
          ? 'border-red-500/50'
          : macro.enabled
          ? 'border-zinc-700 hover:border-purple-500/50'
          : 'border-zinc-700/50 opacity-75'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
              macro.enabled ? 'bg-purple-500' : 'bg-zinc-600'
            }`}
            role="switch"
            aria-checked={macro.enabled}
            aria-label={macro.enabled ? 'Deshabilitar macro' : 'Habilitar macro'}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                macro.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium truncate">{macro.name}</h3>
              {/* Prediction active indicator */}
              {hasPredictionActive && macro.actions.some(a => a.type === 'start_prediction') && (
                <span 
                  className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-medium rounded"
                  title="Ya hay una predicción activa"
                >
                  <TrendingUp size={10} />
                  Activa
                </span>
              )}
              {hasError && (
                <span className="shrink-0" title="Error en última ejecución">
                  <AlertCircle size={14} className="text-red-400" />
                </span>
              )}
            </div>
            {macro.description && (
              <p className="text-sm text-zinc-500 truncate mt-0.5">
                {macro.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Execute/Stop Button */}
            {isPredictionMacro && hasPredictionActive ? (
              // Stop button for active prediction
              <button
                onClick={handleStopPrediction}
                disabled={isExecuting || !onStopPrediction}
                className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancelar predicción activa"
              >
                {isExecuting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Square size={16} />
                )}
              </button>
            ) : (
              // Execute button
              <button
                onClick={handleExecute}
                disabled={isDisabled || isExecuting}
                className={`p-2 rounded-lg transition-all ${
                  isExecuting
                    ? 'text-yellow-400 bg-yellow-500/10'
                    : lastExecutionSuccess === true
                    ? 'text-green-400 bg-green-500/20'
                    : lastExecutionSuccess === false
                    ? 'text-red-400 bg-red-500/20'
                    : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isExecuting ? 'Ejecutando...' : 'Ejecutar macro'}
              >
                {isExecuting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : lastExecutionSuccess === true ? (
                  <Check size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={onEdit}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              title="Editar macro"
            >
              <Edit2 size={16} />
            </button>

            {/* More Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                title="Más opciones"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 py-1">
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Copy size={14} />
                    Duplicar
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trigger & Actions Info */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          {/* Trigger */}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="text-purple-400">
              {TRIGGER_ICONS[macro.trigger.type]}
            </span>
            <span>{TRIGGER_LABELS[macro.trigger.type]}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">{getTriggerDescription(macro)}</span>
          </div>

          {/* Actions Preview */}
          <div className="flex items-center gap-1">
            {macro.actions.slice(0, 4).map((action, index) => (
              <span
                key={action.id}
                className="text-sm"
                title={action.type.replace(/_/g, ' ')}
              >
                {ACTION_ICONS[action.type]}
              </span>
            ))}
            {macro.actions.length > 4 && (
              <span className="text-zinc-500 text-xs">
                +{macro.actions.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
          {/* Execution Count */}
          <div className="flex items-center gap-1" title="Ejecuciones totales">
            <Zap size={12} />
            <span>{macro.executionCount} ejecuciones</span>
          </div>

          {/* Last Executed */}
          {macro.lastExecuted && (
            <div className="flex items-center gap-1" title="Última ejecución">
              <Clock size={12} />
              <span>{formatRelativeTime(macro.lastExecuted)}</span>
            </div>
          )}

          {/* Cooldown */}
          {macro.cooldown > 0 && (
            <div className="flex items-center gap-1" title="Cooldown">
              <Clock size={12} className="text-yellow-500" />
              <span>{macro.cooldown}s cooldown</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 flex-1">
                {macro.lastError}
              </p>
              {onClearError && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearError();
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Descartar error"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MacroCard;
