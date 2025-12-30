import React, { useState, useMemo } from 'react';
import { Check, X, AlertCircle, Sparkles } from 'lucide-react';
import type { AutomationTrigger } from '../src/application/services/OBSService';

// Preset automation definition
export interface PresetAutomation {
  name: string;
  trigger: AutomationTrigger;
  sceneNameHint: string;
}

// Full preset definition
export interface AutomationPreset {
  name: string;
  description: string;
  icon: string;
  automations: PresetAutomation[];
}

// Scene mapping for each automation
export interface PresetSceneMapping {
  automationName: string;
  trigger: AutomationTrigger;
  selectedScene: string;
}

// Trigger labels for display
const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  game_start: '🎮 Inicio de juego',
  game_end: '🏁 Fin de juego',
  poll_start: '📊 Inicio de encuesta',
  poll_end: '📊 Fin de encuesta',
  poll_results: '🏆 Resultados de encuesta',
  giveaway_start: '🎁 Inicio de sorteo',
  giveaway_winner: '🎉 Ganador de sorteo',
  raid_incoming: '👋 Raid entrante',
  raid_outgoing: '🚀 Raid saliente',
  brb_start: '☕ Inicio BRB',
  brb_end: '👋 Fin BRB',
  stream_start: '🔴 Inicio de stream',
  stream_end: '⏹️ Fin de stream',
  prediction_start: '🔮 Inicio de predicción',
  prediction_lock: '🔒 Predicción bloqueada',
  prediction_resolve: '✅ Predicción resuelta',
  reward_redeemed: '🎁 Recompensa canjeada',
  custom: '⚡ Personalizado',
};

interface PresetConfigModalProps {
  preset: AutomationPreset;
  scenes: { name: string }[];
  onApply: (mappings: PresetSceneMapping[]) => void;
  onClose: () => void;
}

/**
 * Finds a scene that matches the hint (case-insensitive partial match)
 */
export function findMatchingScene(
  scenes: { name: string }[],
  hint: string
): string {
  const lowerHint = hint.toLowerCase();
  const match = scenes.find(s => 
    s.name.toLowerCase().includes(lowerHint)
  );
  return match?.name || '';
}

/**
 * Creates initial mappings with pre-selected scenes based on hints
 */
export function createInitialMappings(
  preset: AutomationPreset,
  scenes: { name: string }[]
): PresetSceneMapping[] {
  return preset.automations.map(auto => ({
    automationName: auto.name,
    trigger: auto.trigger,
    selectedScene: findMatchingScene(scenes, auto.sceneNameHint),
  }));
}

/**
 * Validates that all mappings have a scene selected
 */
export function validateMappings(mappings: PresetSceneMapping[]): boolean {
  return mappings.every(m => m.selectedScene !== '');
}

export const PresetConfigModal: React.FC<PresetConfigModalProps> = ({
  preset,
  scenes,
  onApply,
  onClose,
}) => {
  // Initialize mappings with pre-selected scenes based on hints
  const [mappings, setMappings] = useState<PresetSceneMapping[]>(() =>
    createInitialMappings(preset, scenes)
  );

  // Check if all scenes are selected
  const canApply = useMemo(() => validateMappings(mappings), [mappings]);

  // Count how many are pre-selected vs total
  const preSelectedCount = useMemo(() => {
    const initial = createInitialMappings(preset, scenes);
    return initial.filter(m => m.selectedScene !== '').length;
  }, [preset, scenes]);

  const updateMapping = (index: number, sceneName: string) => {
    setMappings(prev => prev.map((m, i) => 
      i === index ? { ...m, selectedScene: sceneName } : m
    ));
  };

  const handleApply = () => {
    if (canApply) {
      onApply(mappings);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{preset.icon}</span>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">{preset.name}</h3>
                <p className="text-xs text-zinc-500">{preset.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        {preSelectedCount > 0 && (
          <div className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 border-b border-purple-200 dark:border-purple-500/30">
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <Sparkles size={12} />
              <span>
                {preSelectedCount} de {preset.automations.length} escenas pre-seleccionadas automáticamente
              </span>
            </div>
          </div>
        )}

        {/* Automation Mappings */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-3">
          {mappings.map((mapping, index) => {
            const isSelected = mapping.selectedScene !== '';
            
            return (
              <div
                key={`${mapping.trigger}-${index}`}
                className={`p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {mapping.automationName}
                  </span>
                  {!isSelected && (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-2">
                  {TRIGGER_LABELS[mapping.trigger]}
                </p>
                <select
                  value={mapping.selectedScene}
                  onChange={(e) => updateMapping(index, e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border rounded transition-colors ${
                    isSelected
                      ? 'border-zinc-200 dark:border-zinc-700'
                      : 'border-red-300 dark:border-red-500/50'
                  }`}
                >
                  <option value="">Seleccionar escena...</option>
                  {scenes.map((scene) => (
                    <option key={scene.name} value={scene.name}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Validation Warning */}
        {!canApply && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/30">
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              <span>Selecciona una escena para cada automatización</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="flex-1 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Check size={14} />
            Aplicar ({mappings.length} automatizaciones)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetConfigModal;
