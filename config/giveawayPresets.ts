/**
 * Giveaway Presets Configuration
 * @requirements 5.2
 * 
 * Predefined presets for common giveaway configurations.
 * These presets allow streamers to quickly set up giveaways
 * without manually configuring each option.
 */

import type { Preset } from '../components/ui/PresetSelector';

/**
 * Configuration values that can be set by a giveaway preset
 */
export interface GiveawayPresetValues {
  mode: 'viewers' | 'keyword' | 'subs';
  useTimer: boolean;
  timeLimit?: number;
  subsOnly: boolean;
  keyword?: string;
}

/**
 * Giveaway presets for quick configuration
 * @requirements 5.2 - Provide at least three presets
 */
export const GIVEAWAY_PRESETS: Preset<GiveawayPresetValues>[] = [
  {
    id: 'quick',
    name: 'Sorteo Rápido',
    description: 'Viewers del chat, sin timer',
    values: {
      mode: 'viewers',
      useTimer: false,
      subsOnly: false,
    }
  },
  {
    id: 'keyword',
    name: 'Sorteo por Keyword',
    description: 'Palabra clave, 60 segundos',
    values: {
      mode: 'keyword',
      useTimer: true,
      timeLimit: 60,
      subsOnly: false,
    }
  },
  {
    id: 'subs',
    name: 'Sorteo de Subs',
    description: 'Solo suscriptores',
    values: {
      mode: 'subs',
      useTimer: false,
      subsOnly: true,
    }
  }
];

/**
 * Check if current configuration matches any preset
 */
export function findMatchingPreset(
  currentValues: GiveawayPresetValues
): Preset<GiveawayPresetValues> | null {
  return GIVEAWAY_PRESETS.find(preset => {
    const values = preset.values;
    return (
      values.mode === currentValues.mode &&
      values.useTimer === currentValues.useTimer &&
      values.subsOnly === currentValues.subsOnly &&
      (values.timeLimit === undefined || values.timeLimit === currentValues.timeLimit)
    );
  }) || null;
}

/**
 * Check if current configuration has been customized from a preset
 */
export function isConfigCustomized(
  currentValues: GiveawayPresetValues
): boolean {
  return findMatchingPreset(currentValues) === null;
}
