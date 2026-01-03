/**
 * MacroEditor Component
 * 
 * Main form for creating and editing macros.
 * Includes trigger configuration, action list with drag & drop, and validation.
 * 
 * @requirements 6.1 - THE Macro_Editor SHALL show a form to configure the trigger
 * @requirements 6.2 - THE Macro_Editor SHALL show an orderable list of actions (drag & drop)
 * @requirements 6.6 - THE Macro_Editor SHALL validate the macro before saving
 * @requirements 6.8 - WHEN the user saves an invalid macro, THE Macro_Editor SHALL show specific errors
 */

import React, { useState, useCallback } from 'react';
import {
  Save,
  X,
  Plus,
  AlertCircle,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Settings,
} from 'lucide-react';
import { useMacroEditor } from '../../hooks/useMacroEditor';
import { TriggerConfig } from './TriggerConfig';
import { ActionBuilder } from './ActionBuilder';
import { ConditionEditor } from './ConditionEditor';
import type { Macro, MacroAction, MacroActionFormData, ActionType } from '../../types/macros';

// ============================================
// Types
// ============================================

export interface MacroEditorProps {
  /** Macro to edit (undefined for new macro) */
  macro?: Macro;
  /** Callback when macro is saved */
  onSave: (macro: Macro | Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted' | 'executionCount' | 'lastError'>) => Promise<void>;
  /** Callback when editor is closed */
  onCancel: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
}

// ============================================
// Constants
// ============================================

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  send_chat_message: <span className="text-blue-400">💬</span>,
  change_scene: <span className="text-purple-400">🎬</span>,
  toggle_source: <span className="text-green-400">👁️</span>,
  play_sound: <span className="text-yellow-400">🔊</span>,
  start_poll: <span className="text-pink-400">📊</span>,
  start_prediction: <span className="text-orange-400">🎯</span>,
  send_notification: <span className="text-cyan-400">🔔</span>,
  set_variable: <span className="text-emerald-400">📝</span>,
  delay: <span className="text-zinc-400">⏱️</span>,
};

const ACTION_LABELS: Record<ActionType, string> = {
  send_chat_message: 'Enviar mensaje',
  change_scene: 'Cambiar escena',
  toggle_source: 'Toggle fuente',
  play_sound: 'Reproducir sonido',
  start_poll: 'Iniciar encuesta',
  start_prediction: 'Iniciar predicción',
  send_notification: 'Enviar notificación',
  set_variable: 'Establecer variable',
  delay: 'Esperar',
};

// ============================================
// Component
// ============================================

export const MacroEditor: React.FC<MacroEditorProps> = ({
  macro,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const {
    formData,
    validation,
    isValid,
    setName,
    setDescription,
    setEnabled,
    setCooldown,
    setTriggerType,
    setTriggerConfig,
    addAction,
    updateAction,
    removeAction,
    moveAction,
    setActionCondition,
    getFormData,
  } = useMacroEditor({ initialMacro: macro });

  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [showAddAction, setShowAddAction] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isEditing = !!macro;

  /**
   * Handle form submission
   * @requirements 6.6, 6.8
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) return;
    
    const data = getFormData();
    await onSave(data);
  }, [isValid, getFormData, onSave]);

  /**
   * Handle adding a new action
   * @requirements 6.2
   */
  const handleAddAction = useCallback((type: ActionType) => {
    const defaultConfigs: Record<ActionType, MacroActionFormData> = {
      send_chat_message: { type: 'send_chat_message', config: { message: '', platform: 'all' }, delay: 0 },
      change_scene: { type: 'change_scene', config: { sceneName: '' }, delay: 0 },
      toggle_source: { type: 'toggle_source', config: { sourceName: '', action: 'toggle' }, delay: 0 },
      play_sound: { type: 'play_sound', config: { soundId: '', volume: 100 }, delay: 0 },
      start_poll: { type: 'start_poll', config: { title: '', options: ['', ''], duration: 60 }, delay: 0 },
      start_prediction: { type: 'start_prediction', config: { title: '', outcomes: ['', ''], duration: 120 }, delay: 0 },
      send_notification: { type: 'send_notification', config: { channels: [], title: '', message: '' }, delay: 0 },
      set_variable: { type: 'set_variable', config: { variableName: '', value: '', operation: 'set' }, delay: 0 },
      delay: { type: 'delay', config: { seconds: 5 }, delay: 0 },
    };
    
    addAction(defaultConfigs[type]);
    setShowAddAction(false);
  }, [addAction]);

  /**
   * Handle drag start
   * @requirements 6.2
   */
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  /**
   * Handle drag over
   * @requirements 6.2
   */
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveAction(draggedIndex, index);
      setDraggedIndex(index);
    }
  }, [draggedIndex, moveAction]);

  /**
   * Handle drag end
   * @requirements 6.2
   */
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  /**
   * Toggle action expansion
   */
  const toggleActionExpanded = useCallback((actionId: string) => {
    setExpandedAction(prev => prev === actionId ? null : actionId);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? 'Editar Macro' : 'Nueva Macro'}
            </h2>
            <p className="text-xs text-zinc-500">
              {isEditing ? 'Modifica la configuración de tu macro' : 'Crea una nueva automatización'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Validation Errors */}
        {!isValid && validation.errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                {validation.errors.slice(0, 3).map((error, i) => (
                  <p key={i}>{error.message}</p>
                ))}
                {validation.errors.length > 3 && (
                  <p className="text-red-500/70">
                    +{validation.errors.length - 3} errores más
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Settings size={14} />
            Información básica
          </h3>
          
          {/* Name */}
          <div>
            <label htmlFor="macro-name" className="block text-sm font-medium text-zinc-400 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              id="macro-name"
              value={formData.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Saludo de bienvenida"
              maxLength={50}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="macro-description" className="block text-sm font-medium text-zinc-400 mb-1">
              Descripción
            </label>
            <textarea
              id="macro-description"
              value={formData.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué hace esta macro..."
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Cooldown */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <label htmlFor="macro-cooldown" className="flex items-center gap-1 text-sm text-zinc-300 mb-1">
              <Clock size={12} />
              Cooldown (segundos)
            </label>
            <input
              type="number"
              id="macro-cooldown"
              value={formData.cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              min={0}
              max={3600}
              className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Tiempo mínimo entre ejecuciones
            </p>
          </div>
        </section>

        {/* Trigger Configuration */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Zap size={14} />
            Disparador (Trigger)
          </h3>
          <TriggerConfig
            trigger={formData.trigger}
            onTypeChange={setTriggerType}
            onConfigChange={setTriggerConfig}
          />
        </section>

        {/* Actions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Zap size={14} />
              Acciones ({formData.actions.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowAddAction(!showAddAction)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
            >
              <Plus size={14} />
              Añadir
            </button>
          </div>

          {/* Add Action Panel */}
          {showAddAction && (
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2">Selecciona el tipo de acción:</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ACTION_LABELS) as ActionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddAction(type)}
                    className="flex items-center gap-2 p-2 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg text-left transition-colors"
                  >
                    <span className="text-lg">{ACTION_ICONS[type]}</span>
                    <span className="text-xs text-zinc-300 truncate">{ACTION_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action List */}
          {formData.actions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Zap size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay acciones configuradas</p>
              <p className="text-xs">Añade acciones para que tu macro haga algo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.actions.map((action, index) => (
                <div
                  key={action.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  className={`bg-zinc-800 rounded-lg border transition-all ${
                    draggedIndex === index
                      ? 'border-purple-500 opacity-50'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {/* Action Header */}
                  <div className="flex items-center gap-2 p-3">
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab text-zinc-500 hover:text-zinc-300 p-1 -m-1"
                      aria-label="Arrastrar para reordenar"
                    >
                      <GripVertical size={16} />
                    </div>
                    
                    <span className="text-lg">{ACTION_ICONS[action.type]}</span>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {ACTION_LABELS[action.type]}
                      </p>
                      {action.delay > 0 && (
                        <p className="text-xs text-zinc-500">
                          Delay: {action.delay}s
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActionExpanded(action.id)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        aria-label={expandedAction === action.id ? 'Contraer' : 'Expandir'}
                      >
                        {expandedAction === action.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        aria-label="Eliminar acción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Action Details (Expanded) */}
                  {expandedAction === action.id && (
                    <div className="px-3 pb-3 pt-0 border-t border-zinc-700 mt-2">
                      <ActionBuilder
                        action={action}
                        onChange={(updates) => updateAction(index, updates)}
                      />
                      
                      {/* Condition Editor */}
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <ConditionEditor
                          condition={action.condition}
                          onChange={(condition) => setActionCondition(index, condition)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800 bg-zinc-900/50">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!isValid || isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear macro'}
        </button>
      </div>
    </div>
  );
};

export default MacroEditor;
