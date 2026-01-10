/**
 * Giveaway Presets Property Tests
 * Tests for preset configuration completeness
 * 
 * **Feature: giveaway-improvements**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  SUBS_PRESETS, 
  getPresetById, 
  matchesPreset,
  PRESET_SIMPLE,
  PRESET_WEIGHTED,
  PRESET_VIP,
  PRESET_MONETIZATION,
} from '../../components/giveaway/constants/presets';
import { DEFAULT_SUBS_CONFIG } from '../../components/giveaway/types';
import type { SubsGiveawayConfig } from '../../components/giveaway/types';

// ============================================
// REQUIRED CONFIG KEYS
// ============================================

const REQUIRED_CONFIG_KEYS: (keyof SubsGiveawayConfig)[] = [
  'tier1Value',
  'tier2Value',
  'tier3Value',
  'primeValue',
  'resubEnabled',
  'resubValue',
  'resubBonusPerMonth',
  'giftSubEnabled',
  'giftSubValue',
  'bitsEnabled',
  'bitsPerEntry',
  'bitsMinimum',
  'donationsEnabled',
  'donationPerEntry',
  'donationMinimum',
  'donationCurrency',
  'channelGiftsEnabled',
  'channelGiftValue',
];

// ============================================
// PROPERTY 5: Preset Configuration Completeness
// **Validates: Requirements 4.2, 4.3**
// ============================================

describe('Property 5: Preset Configuration Completeness', () => {
  it('all presets should have all required config fields', () => {
    SUBS_PRESETS.forEach(preset => {
      REQUIRED_CONFIG_KEYS.forEach(key => {
        expect(preset.config).toHaveProperty(key);
        expect(preset.config[key]).not.toBeUndefined();
      });
    });
  });

  it('all presets should have valid metadata', () => {
    SUBS_PRESETS.forEach(preset => {
      expect(preset.id).toBeTruthy();
      expect(typeof preset.id).toBe('string');
      expect(preset.name).toBeTruthy();
      expect(typeof preset.name).toBe('string');
      expect(preset.description).toBeTruthy();
      expect(typeof preset.description).toBe('string');
    });
  });

  it('preset IDs should be unique', () => {
    const ids = SUBS_PRESETS.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('getPresetById should return correct preset for all valid IDs', () => {
    SUBS_PRESETS.forEach(preset => {
      const found = getPresetById(preset.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(preset.id);
      expect(found?.config).toEqual(preset.config);
    });
  });

  it('getPresetById should return undefined for invalid IDs', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !SUBS_PRESETS.some(p => p.id === s)),
        (invalidId) => {
          const result = getPresetById(invalidId);
          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('matchesPreset should correctly identify preset configs', () => {
    // Each preset config should match itself
    SUBS_PRESETS.forEach(preset => {
      const matched = matchesPreset(preset.config);
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe(preset.id);
    });
  });

  it('modified configs should not match any preset', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUBS_PRESETS),
        fc.constantFrom(...REQUIRED_CONFIG_KEYS),
        (preset, keyToModify) => {
          // Create a modified copy
          const modified = { ...preset.config };
          
          // Modify one field
          if (typeof modified[keyToModify] === 'number') {
            (modified as Record<string, unknown>)[keyToModify] = 
              (modified[keyToModify] as number) + 999;
          } else if (typeof modified[keyToModify] === 'boolean') {
            (modified as Record<string, unknown>)[keyToModify] = 
              !(modified[keyToModify] as boolean);
          } else if (typeof modified[keyToModify] === 'string') {
            (modified as Record<string, unknown>)[keyToModify] = 
              modified[keyToModify] + '_modified';
          }

          // Should not match any preset
          const matched = matchesPreset(modified);
          expect(matched).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all numeric values in presets should be non-negative', () => {
    const numericKeys: (keyof SubsGiveawayConfig)[] = [
      'tier1Value', 'tier2Value', 'tier3Value', 'primeValue',
      'resubValue', 'resubBonusPerMonth', 'giftSubValue',
      'bitsPerEntry', 'bitsMinimum', 'donationPerEntry', 
      'donationMinimum', 'channelGiftValue',
    ];

    SUBS_PRESETS.forEach(preset => {
      numericKeys.forEach(key => {
        const value = preset.config[key];
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('preset configs should have same structure as DEFAULT_SUBS_CONFIG', () => {
    const defaultKeys = Object.keys(DEFAULT_SUBS_CONFIG).sort();
    
    SUBS_PRESETS.forEach(preset => {
      const presetKeys = Object.keys(preset.config).sort();
      expect(presetKeys).toEqual(defaultKeys);
    });
  });
});
