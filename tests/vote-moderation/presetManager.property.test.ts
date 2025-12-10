/**
 * Property-based tests for Preset Manager
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  savePreset,
  loadPreset,
  deletePreset,
  getAllPresets,
  formatPresetSummary,
  clearAllPresets,
  ModerationConfig,
} from '../../services/voteModerationService';

// Generator for valid weight values (1-5)
const validWeightArb = fc.integer({ min: 1, max: 5 });

// Generator for valid ModerationConfig
const moderationConfigArb = fc.record({
  minAccountAgeDays: fc.integer({ min: 0, max: 365 }),
  voteChangeEnabled: fc.boolean(),
  voteChangeCooldownSeconds: fc.integer({ min: 0, max: 3600 }),
  weights: fc.record({
    subscriber: validWeightArb,
    follower: validWeightArb,
    regular: fc.constant(1), // Regular is always 1
  }),
});

// Generator for valid preset names (non-empty strings)
const presetNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

describe('PresetManager Property Tests', () => {
  // Clear presets before each test to ensure isolation
  beforeEach(() => {
    clearAllPresets();
  });

  /**
   * **Feature: vote-moderation, Property 14: Preset round-trip consistency**
   *
   * *For any* valid ModerationConfig, saving it as a preset and then loading
   * that preset produces an equivalent configuration.
   *
   * **Validates: Requirements 6.1, 6.2**
   */
  describe('Property 14: Preset round-trip consistency', () => {
    it('should return equivalent config when saving and loading a preset', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save the preset
            const savedPreset = savePreset(name, config);

            // Load the preset by ID
            const loadedPreset = loadPreset(savedPreset.id);

            // Verify the loaded preset exists
            expect(loadedPreset).not.toBeNull();

            // Verify the config is equivalent
            expect(loadedPreset!.config.minAccountAgeDays).toBe(config.minAccountAgeDays);
            expect(loadedPreset!.config.voteChangeEnabled).toBe(config.voteChangeEnabled);
            expect(loadedPreset!.config.voteChangeCooldownSeconds).toBe(config.voteChangeCooldownSeconds);
            expect(loadedPreset!.config.weights.subscriber).toBe(config.weights.subscriber);
            expect(loadedPreset!.config.weights.follower).toBe(config.weights.follower);
            expect(loadedPreset!.config.weights.regular).toBe(config.weights.regular);

            // Verify the name is preserved
            expect(loadedPreset!.name).toBe(name);

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve preset in getAllPresets after saving', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save the preset
            const savedPreset = savePreset(name, config);

            // Get all presets
            const allPresets = getAllPresets();

            // Verify the saved preset is in the list
            const foundPreset = allPresets.find(p => p.id === savedPreset.id);
            expect(foundPreset).toBeDefined();
            expect(foundPreset!.name).toBe(name);
            expect(foundPreset!.config.minAccountAgeDays).toBe(config.minAccountAgeDays);

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


  /**
   * **Feature: vote-moderation, Property 15: Preset deletion completeness**
   *
   * *For any* preset that is deleted, subsequent attempts to load that preset
   * return null or throw a not-found error.
   *
   * **Validates: Requirements 6.3**
   */
  describe('Property 15: Preset deletion completeness', () => {
    it('should return null when loading a deleted preset', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);
            const presetId = savedPreset.id;

            // Verify it exists
            expect(loadPreset(presetId)).not.toBeNull();

            // Delete the preset
            const deleteResult = deletePreset(presetId);
            expect(deleteResult).toBe(true);

            // Verify loading returns null
            expect(loadPreset(presetId)).toBeNull();

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove preset from getAllPresets after deletion', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);
            const presetId = savedPreset.id;

            // Verify it's in the list
            expect(getAllPresets().some(p => p.id === presetId)).toBe(true);

            // Delete the preset
            deletePreset(presetId);

            // Verify it's no longer in the list
            expect(getAllPresets().some(p => p.id === presetId)).toBe(false);

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when deleting a non-existent preset', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          (fakeId) => {
            // Attempt to delete a preset that doesn't exist
            const deleteResult = deletePreset(`nonexistent_${fakeId}`);
            expect(deleteResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: vote-moderation, Property 16: Preset display completeness**
   *
   * *For any* saved preset, the display output contains the preset name and
   * includes values for minAccountAgeDays, voteChangeEnabled, and weight configuration.
   *
   * **Validates: Requirements 6.4**
   */
  describe('Property 16: Preset display completeness', () => {
    it('should include preset name in the formatted summary', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);

            // Format the summary
            const summary = formatPresetSummary(savedPreset);

            // Verify the name is included
            expect(summary).toContain(name);

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include minAccountAgeDays information in the formatted summary', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);

            // Format the summary
            const summary = formatPresetSummary(savedPreset);

            // Verify account age info is included
            if (config.minAccountAgeDays > 0) {
              expect(summary).toContain(`${config.minAccountAgeDays}`);
              expect(summary.toLowerCase()).toContain('age');
            } else {
              // When minAccountAgeDays is 0, should indicate no filter
              expect(summary.toLowerCase()).toMatch(/age.*none|no.*age|age.*0/i);
            }

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include voteChangeEnabled information in the formatted summary', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);

            // Format the summary
            const summary = formatPresetSummary(savedPreset);

            // Verify vote change info is included
            if (config.voteChangeEnabled) {
              expect(summary.toLowerCase()).toContain('enabled');
            } else {
              expect(summary.toLowerCase()).toContain('disabled');
            }

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include weight configuration in the formatted summary', () => {
      fc.assert(
        fc.property(
          presetNameArb,
          moderationConfigArb,
          (name, config) => {
            // Save a preset
            const savedPreset = savePreset(name, config);

            // Format the summary
            const summary = formatPresetSummary(savedPreset);

            // Verify weight info is included (subscriber and follower weights)
            expect(summary).toContain(`${config.weights.subscriber}`);
            expect(summary).toContain(`${config.weights.follower}`);

            // Clean up
            clearAllPresets();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
