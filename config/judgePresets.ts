/**
 * Judge Panel Presets Configuration
 * @requirements 6.2
 * 
 * Predefined presets for common tournament configurations.
 * These presets allow streamers to quickly set up tournaments
 * without manually configuring each option.
 */

import type { Preset } from '../components/ui/PresetSelector';
import type { JudgeCriterion } from '../types';

/**
 * Configuration values that can be set by a judge panel preset
 */
export interface JudgePanelPresetValues {
  criteria: Omit<JudgeCriterion, 'id'>[];
  publicVotingEnabled: boolean;
  publicVoteWeight?: number;
  defaultMinScore: number;
  defaultMaxScore: number;
}

/**
 * Generate unique ID for criteria
 */
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Create criteria with generated IDs from preset values
 */
export function createCriteriaFromPreset(
  presetCriteria: Omit<JudgeCriterion, 'id'>[]
): JudgeCriterion[] {
  return presetCriteria.map(criterion => ({
    ...criterion,
    id: generateId(),
  }));
}

/**
 * Standard criteria used in presets
 */
const STANDARD_CRITERIA: Omit<JudgeCriterion, 'id'>[] = [
  { name: 'Creatividad', minScore: 1, maxScore: 10, weight: 1 },
  { name: 'Ejecución', minScore: 1, maxScore: 10, weight: 1 },
  { name: 'Originalidad', minScore: 1, maxScore: 10, weight: 1 },
];

/**
 * Judge Panel presets for quick configuration
 * @requirements 6.2 - Provide at least two presets
 */
export const JUDGE_PRESETS: Preset<JudgePanelPresetValues>[] = [
  {
    id: 'basic',
    name: 'Torneo Básico',
    description: '3 criterios estándar',
    values: {
      criteria: STANDARD_CRITERIA,
      publicVotingEnabled: false,
      defaultMinScore: 1,
      defaultMaxScore: 10,
    }
  },
  {
    id: 'public',
    name: 'Torneo con Público',
    description: '3 criterios + votación pública 30%',
    values: {
      criteria: STANDARD_CRITERIA,
      publicVotingEnabled: true,
      publicVoteWeight: 0.3,
      defaultMinScore: 1,
      defaultMaxScore: 10,
    }
  }
];

/**
 * Check if current configuration matches any preset
 */
export function findMatchingJudgePreset(
  currentValues: {
    criteria: JudgeCriterion[];
    publicVotingEnabled: boolean;
    publicVoteWeight: number;
  }
): Preset<JudgePanelPresetValues> | null {
  return JUDGE_PRESETS.find(preset => {
    const values = preset.values;
    
    // Check if criteria match (by name, ignoring IDs)
    if (currentValues.criteria.length !== values.criteria.length) {
      return false;
    }
    
    const criteriaMatch = values.criteria.every((presetCriterion, index) => {
      const currentCriterion = currentValues.criteria[index];
      return (
        currentCriterion &&
        currentCriterion.name === presetCriterion.name &&
        currentCriterion.minScore === presetCriterion.minScore &&
        currentCriterion.maxScore === presetCriterion.maxScore &&
        currentCriterion.weight === presetCriterion.weight
      );
    });
    
    if (!criteriaMatch) return false;
    
    // Check public voting settings
    if (values.publicVotingEnabled !== currentValues.publicVotingEnabled) {
      return false;
    }
    
    if (values.publicVotingEnabled && values.publicVoteWeight !== undefined) {
      if (Math.abs(values.publicVoteWeight - currentValues.publicVoteWeight) > 0.01) {
        return false;
      }
    }
    
    return true;
  }) || null;
}

/**
 * Check if current configuration has been customized from a preset
 */
export function isJudgeConfigCustomized(
  currentValues: {
    criteria: JudgeCriterion[];
    publicVotingEnabled: boolean;
    publicVoteWeight: number;
  }
): boolean {
  return findMatchingJudgePreset(currentValues) === null;
}
