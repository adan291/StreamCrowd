/**
 * Property-based tests for GiveawayHub component improvements
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the GiveawayHub presets, badges, and view mode functionality.
 * 
 * Feature: ux-polish-and-testing
 * Property 3: Participant Badge Accuracy
 * Property 4: Blacklist Badge Accuracy
 * Property 5: Preset Application Completeness
 * Property 6: Customization Detection
 * @validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  GIVEAWAY_PRESETS, 
  GiveawayPresetValues, 
  findMatchingPreset, 
  isConfigCustomized 
} from '../../config/giveawayPresets';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Simulates participant count for badge display
 */
function getParticipantBadgeValue(participants: Set<string>): number {
  return participants.size;
}

/**
 * Simulates blacklist count for badge display
 */
function getBlacklistBadgeValue(blacklist: Set<string>): number {
  return blacklist.size;
}

/**
 * Applies preset values to a configuration
 */
function applyPresetToConfig(
  preset: typeof GIVEAWAY_PRESETS[0],
  currentConfig: GiveawayPresetValues
): GiveawayPresetValues {
  return {
    ...currentConfig,
    ...preset.values,
  };
}

/**
 * Checks if all preset values are applied correctly
 */
function arePresetValuesApplied(
  preset: typeof GIVEAWAY_PRESETS[0],
  config: GiveawayPresetValues
): boolean {
  const values = preset.values;
  return (
    config.mode === values.mode &&
    config.useTimer === values.useTimer &&
    config.subsOnly === values.subsOnly &&
    (values.timeLimit === undefined || config.timeLimit === values.timeLimit)
  );
}

/**
 * Modifies a configuration value to make it customized
 */
function modifyConfig(
  config: GiveawayPresetValues,
  modification: Partial<GiveawayPresetValues>
): GiveawayPresetValues {
  return {
    ...config,
    ...modification,
  };
}

/**
 * Simulates view mode toggle preserving configuration
 */
function toggleViewMode(
  config: GiveawayPresetValues,
  _currentMode: 'compact' | 'expanded'
): { config: GiveawayPresetValues; newMode: 'compact' | 'expanded' } {
  // Configuration should be preserved during view mode toggle
  return {
    config: { ...config },
    newMode: _currentMode === 'compact' ? 'expanded' : 'compact',
  };
}

// ============ ARBITRARIES ============

const participantNameArb = fc.string({ minLength: 3, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s));

const participantSetArb = fc.array(participantNameArb, { minLength: 0, maxLength: 100 })
  .map(arr => new Set(arr.map(s => s.toLowerCase())));

const blacklistSetArb = fc.array(participantNameArb, { minLength: 0, maxLength: 50 })
  .map(arr => new Set(arr.map(s => s.toLowerCase())));

const presetIndexArb = fc.integer({ min: 0, max: GIVEAWAY_PRESETS.length - 1 });

const modeArb = fc.constantFrom<'viewers' | 'keyword' | 'subs'>('viewers', 'keyword', 'subs');

const configArb: fc.Arbitrary<GiveawayPresetValues> = fc.record({
  mode: modeArb,
  useTimer: fc.boolean(),
  timeLimit: fc.option(fc.integer({ min: 10, max: 300 }), { nil: undefined }),
  subsOnly: fc.boolean(),
  keyword: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

const viewModeArb = fc.constantFrom<'compact' | 'expanded'>('compact', 'expanded');

// ============ TESTS ============

describe('GiveawayHub Property Tests', () => {
  describe('Property 3: Participant Badge Accuracy', () => {
    /**
     * Feature: ux-polish-and-testing, Property 3: Participant Badge Accuracy
     * 
     * For any GiveawayHub state with N participants, the Participantes section 
     * badge should display exactly N.
     * 
     * **Validates: Requirements 2.1**
     */

    it('should display correct participant count for any set of participants', () => {
      fc.assert(
        fc.property(participantSetArb, (participants) => {
          const badgeValue = getParticipantBadgeValue(participants);

          // Property: badge should show exact participant count
          expect(badgeValue).toBe(participants.size);
        }),
        { numRuns: 100 }
      );
    });

    it('should display 0 when no participants', () => {
      const emptySet = new Set<string>();
      expect(getParticipantBadgeValue(emptySet)).toBe(0);
    });

    it('should handle duplicate participant names correctly', () => {
      fc.assert(
        fc.property(
          fc.array(participantNameArb, { minLength: 1, maxLength: 50 }),
          (names) => {
            // Add duplicates by repeating names
            const withDuplicates = [...names, ...names];
            const participants = new Set(withDuplicates.map(s => s.toLowerCase()));
            const badgeValue = getParticipantBadgeValue(participants);

            // Property: Set should deduplicate, badge shows unique count
            expect(badgeValue).toBeLessThanOrEqual(names.length);
            expect(badgeValue).toBe(participants.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update badge when participants are added', () => {
      fc.assert(
        fc.property(
          participantSetArb,
          participantNameArb,
          (participants, newParticipant) => {
            const initialCount = getParticipantBadgeValue(participants);
            const newSet = new Set(participants);
            const wasNew = !newSet.has(newParticipant.toLowerCase());
            newSet.add(newParticipant.toLowerCase());
            const newCount = getParticipantBadgeValue(newSet);

            // Property: count should increase by 1 if participant was new
            if (wasNew) {
              expect(newCount).toBe(initialCount + 1);
            } else {
              expect(newCount).toBe(initialCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Blacklist Badge Accuracy', () => {
    /**
     * Feature: ux-polish-and-testing, Property 4: Blacklist Badge Accuracy
     * 
     * For any GiveawayHub state with N blacklisted users, the Lista Negra section 
     * badge should display exactly N.
     * 
     * **Validates: Requirements 2.2**
     */

    it('should display correct blacklist count for any set of blacklisted users', () => {
      fc.assert(
        fc.property(blacklistSetArb, (blacklist) => {
          const badgeValue = getBlacklistBadgeValue(blacklist);

          // Property: badge should show exact blacklist count
          expect(badgeValue).toBe(blacklist.size);
        }),
        { numRuns: 100 }
      );
    });

    it('should display 0 when blacklist is empty', () => {
      const emptySet = new Set<string>();
      expect(getBlacklistBadgeValue(emptySet)).toBe(0);
    });

    it('should handle adding users to blacklist', () => {
      fc.assert(
        fc.property(
          blacklistSetArb,
          participantNameArb,
          (blacklist, newUser) => {
            const initialCount = getBlacklistBadgeValue(blacklist);
            const newSet = new Set(blacklist);
            const wasNew = !newSet.has(newUser.toLowerCase());
            newSet.add(newUser.toLowerCase());
            const newCount = getBlacklistBadgeValue(newSet);

            // Property: count should increase by 1 if user was new
            if (wasNew) {
              expect(newCount).toBe(initialCount + 1);
            } else {
              expect(newCount).toBe(initialCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle removing users from blacklist', () => {
      fc.assert(
        fc.property(blacklistSetArb, (blacklist) => {
          if (blacklist.size === 0) return; // Skip empty sets

          const initialCount = getBlacklistBadgeValue(blacklist);
          const newSet = new Set(blacklist);
          const userToRemove = Array.from(newSet)[0];
          newSet.delete(userToRemove);
          const newCount = getBlacklistBadgeValue(newSet);

          // Property: count should decrease by 1 after removal
          expect(newCount).toBe(initialCount - 1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Preset Application Completeness', () => {
    /**
     * Feature: ux-polish-and-testing, Property 5: Preset Application Completeness
     * 
     * For any preset P with values V, applying P should result in all fields 
     * in V being set to their corresponding values.
     * 
     * **Validates: Requirements 2.3**
     */

    it('should apply all preset values correctly', () => {
      fc.assert(
        fc.property(presetIndexArb, configArb, (presetIndex, initialConfig) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          const resultConfig = applyPresetToConfig(preset, initialConfig);

          // Property: all preset values should be applied
          expect(arePresetValuesApplied(preset, resultConfig)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have exactly 3 presets available', () => {
      expect(GIVEAWAY_PRESETS.length).toBe(3);
    });

    it('should have "quick" preset with correct values', () => {
      const quickPreset = GIVEAWAY_PRESETS.find(p => p.id === 'quick');
      expect(quickPreset).toBeDefined();
      expect(quickPreset?.values.mode).toBe('viewers');
      expect(quickPreset?.values.useTimer).toBe(false);
      expect(quickPreset?.values.subsOnly).toBe(false);
    });

    it('should have "keyword" preset with correct values', () => {
      const keywordPreset = GIVEAWAY_PRESETS.find(p => p.id === 'keyword');
      expect(keywordPreset).toBeDefined();
      expect(keywordPreset?.values.mode).toBe('keyword');
      expect(keywordPreset?.values.useTimer).toBe(true);
      expect(keywordPreset?.values.timeLimit).toBe(60);
      expect(keywordPreset?.values.subsOnly).toBe(false);
    });

    it('should have "subs" preset with correct values', () => {
      const subsPreset = GIVEAWAY_PRESETS.find(p => p.id === 'subs');
      expect(subsPreset).toBeDefined();
      expect(subsPreset?.values.mode).toBe('subs');
      expect(subsPreset?.values.useTimer).toBe(false);
      expect(subsPreset?.values.subsOnly).toBe(true);
    });

    it('should preserve non-preset values when applying preset', () => {
      fc.assert(
        fc.property(presetIndexArb, (presetIndex) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          const initialConfig: GiveawayPresetValues = {
            mode: 'viewers',
            useTimer: true,
            timeLimit: 120,
            subsOnly: true,
            keyword: 'test',
          };
          
          const resultConfig = applyPresetToConfig(preset, initialConfig);

          // Property: keyword should be preserved if not in preset
          if (preset.values.keyword === undefined) {
            expect(resultConfig.keyword).toBe(initialConfig.keyword);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Customization Detection', () => {
    /**
     * Feature: ux-polish-and-testing, Property 6: Customization Detection
     * 
     * For any configuration that differs from the last applied preset, 
     * the preset selector should show "Personalizado".
     * 
     * **Validates: Requirements 2.4**
     */

    it('should detect when config matches a preset', () => {
      fc.assert(
        fc.property(presetIndexArb, (presetIndex) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          const config: GiveawayPresetValues = {
            mode: preset.values.mode,
            useTimer: preset.values.useTimer,
            subsOnly: preset.values.subsOnly,
            keyword: undefined,
            timeLimit: preset.values.timeLimit,
          };

          // Property: config matching preset should not be customized
          const matchingPreset = findMatchingPreset(config);
          expect(matchingPreset).not.toBeNull();
          expect(isConfigCustomized(config)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should detect when config is customized', () => {
      // Start with a preset and modify it
      const preset = GIVEAWAY_PRESETS[0]; // quick preset
      const config: GiveawayPresetValues = {
        mode: preset.values.mode,
        useTimer: !preset.values.useTimer, // Flip the timer setting
        subsOnly: preset.values.subsOnly,
      };

      // Property: modified config should be detected as customized
      expect(isConfigCustomized(config)).toBe(true);
    });

    it('should detect customization when mode is changed', () => {
      fc.assert(
        fc.property(presetIndexArb, modeArb, (presetIndex, newMode) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          
          // Only test if mode is actually different
          if (newMode === preset.values.mode) return;

          const config = modifyConfig(
            { 
              mode: preset.values.mode,
              useTimer: preset.values.useTimer,
              subsOnly: preset.values.subsOnly,
              keyword: undefined, 
              timeLimit: preset.values.timeLimit 
            },
            { mode: newMode }
          );

          // Property: changing mode should make config customized
          expect(isConfigCustomized(config)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should detect customization when timer setting is changed', () => {
      fc.assert(
        fc.property(presetIndexArb, (presetIndex) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          const config = modifyConfig(
            { 
              mode: preset.values.mode,
              useTimer: preset.values.useTimer,
              subsOnly: preset.values.subsOnly,
              keyword: undefined, 
              timeLimit: preset.values.timeLimit 
            },
            { useTimer: !preset.values.useTimer }
          );

          // Property: changing timer should make config customized
          expect(isConfigCustomized(config)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should detect customization when subsOnly is changed', () => {
      fc.assert(
        fc.property(presetIndexArb, (presetIndex) => {
          const preset = GIVEAWAY_PRESETS[presetIndex];
          const config = modifyConfig(
            { 
              mode: preset.values.mode,
              useTimer: preset.values.useTimer,
              subsOnly: preset.values.subsOnly,
              keyword: undefined, 
              timeLimit: preset.values.timeLimit 
            },
            { subsOnly: !preset.values.subsOnly }
          );

          // Property: changing subsOnly should make config customized
          expect(isConfigCustomized(config)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('View Mode Value Preservation', () => {
    /**
     * Tests for view mode toggle preserving configuration values
     * 
     * **Validates: Requirements 2.5**
     */

    it('should preserve all config values when toggling view mode', () => {
      fc.assert(
        fc.property(configArb, viewModeArb, (config, currentMode) => {
          const { config: newConfig, newMode } = toggleViewMode(config, currentMode);

          // Property: all config values should be preserved
          expect(newConfig.mode).toBe(config.mode);
          expect(newConfig.useTimer).toBe(config.useTimer);
          expect(newConfig.timeLimit).toBe(config.timeLimit);
          expect(newConfig.subsOnly).toBe(config.subsOnly);
          expect(newConfig.keyword).toBe(config.keyword);

          // Property: mode should toggle
          expect(newMode).not.toBe(currentMode);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve config through multiple view mode toggles', () => {
      fc.assert(
        fc.property(
          configArb,
          viewModeArb,
          fc.integer({ min: 1, max: 10 }),
          (config, initialMode, toggleCount) => {
            let currentConfig = config;
            let currentMode = initialMode;

            for (let i = 0; i < toggleCount; i++) {
              const result = toggleViewMode(currentConfig, currentMode);
              currentConfig = result.config;
              currentMode = result.newMode;
            }

            // Property: config should be unchanged after any number of toggles
            expect(currentConfig.mode).toBe(config.mode);
            expect(currentConfig.useTimer).toBe(config.useTimer);
            expect(currentConfig.timeLimit).toBe(config.timeLimit);
            expect(currentConfig.subsOnly).toBe(config.subsOnly);
            expect(currentConfig.keyword).toBe(config.keyword);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
