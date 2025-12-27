/**
 * Property-based tests for PresetConfigModal functionality
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the preset configuration system.
 * 
 * @requirements 4.3, 4.4, 4.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  findMatchingScene,
  createInitialMappings,
  validateMappings,
  type AutomationPreset,
  type PresetSceneMapping,
} from '../../components/PresetConfigModal';
import type { AutomationTrigger } from '../../src/application/services/OBSService';

// ============ ARBITRARIES ============

const sceneNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const automationTriggerArb: fc.Arbitrary<AutomationTrigger> = fc.constantFrom(
  'game_start',
  'game_end',
  'poll_start',
  'poll_end',
  'poll_results',
  'giveaway_start',
  'giveaway_winner',
  'raid_incoming',
  'raid_outgoing',
  'brb_start',
  'brb_end',
  'stream_start',
  'stream_end',
  'custom'
);

const presetAutomationArb = fc.record({
  name: sceneNameArb,
  trigger: automationTriggerArb,
  sceneNameHint: sceneNameArb,
});

const presetArb: fc.Arbitrary<AutomationPreset> = fc.record({
  name: sceneNameArb,
  description: fc.string({ minLength: 0, maxLength: 100 }),
  icon: fc.constantFrom('🎮', '📊', '🎁', '☕', '🔴', '⚡'),
  automations: fc.array(presetAutomationArb, { minLength: 1, maxLength: 5 }),
});

const sceneArb = fc.record({
  name: sceneNameArb,
});

const scenesArrayArb = fc.array(sceneArb, { minLength: 0, maxLength: 20 });

const mappingArb: fc.Arbitrary<PresetSceneMapping> = fc.record({
  automationName: sceneNameArb,
  trigger: automationTriggerArb,
  selectedScene: fc.oneof(sceneNameArb, fc.constant('')),
});

// ============ TESTS ============

describe('PresetConfigModal Property Tests', () => {
  describe('Property 7: Preset Scene Pre-selection', () => {
    /**
     * Feature: obs-improvements, Property 7: Preset Scene Pre-selection
     * 
     * For any preset automation with a scene hint, if a scene name contains 
     * the hint (case-insensitive), it SHALL be pre-selected.
     * 
     * **Validates: Requirements 4.3**
     */
    it('should pre-select scene when hint matches (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (uniqueId) => {
            // Use a unique hint that won't appear in other scene names
            const hint = `UniqueHint${uniqueId}`;
            const matchingSceneName = `My ${hint} Scene`;
            const scenes = [
              { name: 'Scene A' },
              { name: 'Scene B' },
              { name: matchingSceneName },
              { name: 'Scene C' },
            ];
            
            const result = findMatchingScene(scenes, hint);
            
            // Property: should find the matching scene that contains the hint
            expect(result).toBe(matchingSceneName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match case-insensitively', () => {
      fc.assert(
        fc.property(
          sceneNameArb.filter(s => /[a-zA-Z]/.test(s)), // Ensure has letters
          (hint) => {
            // Create scenes with different cases
            const upperScene = { name: `SCENE ${hint.toUpperCase()}` };
            const lowerScene = { name: `scene ${hint.toLowerCase()}` };
            const scenes = [upperScene, lowerScene];
            
            // Test with lowercase hint
            const resultLower = findMatchingScene(scenes, hint.toLowerCase());
            // Test with uppercase hint
            const resultUpper = findMatchingScene(scenes, hint.toUpperCase());
            
            // Property: both should find a match (first one in array)
            expect(resultLower).not.toBe('');
            expect(resultUpper).not.toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty string when no scene matches hint', () => {
      fc.assert(
        fc.property(
          sceneNameArb,
          fc.array(sceneNameArb, { minLength: 1, maxLength: 10 }),
          (hint, sceneNames) => {
            // Ensure no scene contains the hint by prefixing all scenes
            const scenes = sceneNames.map(name => ({ 
              name: `__no_match__${name}` 
            }));
            
            // Use a hint that won't match the prefix
            const uniqueHint = `__unique_hint_${hint}__`;
            const result = findMatchingScene(scenes, uniqueHint);
            
            // Property: should return empty string when no match
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create initial mappings with pre-selected scenes', () => {
      fc.assert(
        fc.property(
          presetArb,
          (preset) => {
            // Create scenes that match all hints
            const scenes = preset.automations.map(auto => ({
              name: `Scene ${auto.sceneNameHint} Test`,
            }));
            
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: all mappings should have pre-selected scenes
            expect(mappings.length).toBe(preset.automations.length);
            for (const mapping of mappings) {
              expect(mapping.selectedScene).not.toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Preset Validation', () => {
    /**
     * Feature: obs-improvements, Property 8: Preset Validation
     * 
     * For any preset application attempt, if any automation has no scene 
     * selected, the apply action SHALL be disabled.
     * 
     * **Validates: Requirements 4.5**
     */
    it('should return false when any mapping has empty selectedScene', () => {
      fc.assert(
        fc.property(
          fc.array(mappingArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          (mappings, emptyIndex) => {
            // Ensure at least one mapping has empty selectedScene
            const actualIndex = emptyIndex % mappings.length;
            const mappingsWithEmpty = mappings.map((m, i) => 
              i === actualIndex ? { ...m, selectedScene: '' } : m
            );
            
            const isValid = validateMappings(mappingsWithEmpty);
            
            // Property: should be invalid when any scene is empty
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return true when all mappings have selectedScene', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              automationName: sceneNameArb,
              trigger: automationTriggerArb,
              selectedScene: sceneNameArb, // Always non-empty
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (mappings) => {
            const isValid = validateMappings(mappings);
            
            // Property: should be valid when all scenes are selected
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return true for empty mappings array', () => {
      const isValid = validateMappings([]);
      
      // Property: empty array is vacuously valid
      expect(isValid).toBe(true);
    });

    it('should correctly identify all-empty mappings as invalid', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              automationName: sceneNameArb,
              trigger: automationTriggerArb,
              selectedScene: fc.constant(''), // Always empty
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (mappings) => {
            const isValid = validateMappings(mappings);
            
            // Property: should be invalid when all scenes are empty
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Preset Application Completeness', () => {
    /**
     * Feature: obs-improvements, Property 9: Preset Application Completeness
     * 
     * For any confirmed preset with N automations, exactly N automations 
     * SHALL be created in the system.
     * 
     * **Validates: Requirements 4.4**
     */
    it('should create mappings for all preset automations', () => {
      fc.assert(
        fc.property(
          presetArb,
          scenesArrayArb,
          (preset, scenes) => {
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: number of mappings should equal number of automations
            expect(mappings.length).toBe(preset.automations.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve automation names in mappings', () => {
      fc.assert(
        fc.property(
          presetArb,
          scenesArrayArb,
          (preset, scenes) => {
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: each mapping should have the correct automation name
            for (let i = 0; i < preset.automations.length; i++) {
              expect(mappings[i].automationName).toBe(preset.automations[i].name);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve triggers in mappings', () => {
      fc.assert(
        fc.property(
          presetArb,
          scenesArrayArb,
          (preset, scenes) => {
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: each mapping should have the correct trigger
            for (let i = 0; i < preset.automations.length; i++) {
              expect(mappings[i].trigger).toBe(preset.automations[i].trigger);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle presets with single automation', () => {
      fc.assert(
        fc.property(
          presetAutomationArb,
          scenesArrayArb,
          (automation, scenes) => {
            const preset: AutomationPreset = {
              name: 'Single Automation Preset',
              description: 'Test',
              icon: '🎮',
              automations: [automation],
            };
            
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: should create exactly 1 mapping
            expect(mappings.length).toBe(1);
            expect(mappings[0].automationName).toBe(automation.name);
            expect(mappings[0].trigger).toBe(automation.trigger);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle presets with many automations', () => {
      fc.assert(
        fc.property(
          fc.array(presetAutomationArb, { minLength: 3, maxLength: 10 }),
          scenesArrayArb,
          (automations, scenes) => {
            const preset: AutomationPreset = {
              name: 'Multi Automation Preset',
              description: 'Test',
              icon: '📊',
              automations,
            };
            
            const mappings = createInitialMappings(preset, scenes);
            
            // Property: should create exactly N mappings for N automations
            expect(mappings.length).toBe(automations.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
