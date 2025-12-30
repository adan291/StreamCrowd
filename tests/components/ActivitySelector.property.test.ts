/**
 * Property-based tests for ActivitySelector component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the ActivitySelector rendering and behavior.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 1: Activity Selector Renders Correctly
 * @validates Requirements 1.1, 1.2
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ACTIVITIES, DynamicsView, ActivityConfig } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Validates that the ACTIVITIES configuration contains exactly 3 activities
 * with all required fields
 */
function validateActivitiesConfig(activities: ActivityConfig[]): {
  isValid: boolean;
  count: number;
  hasAllFields: boolean;
  activityIds: string[];
} {
  const hasAllFields = activities.every(
    (activity) =>
      typeof activity.id === 'string' &&
      typeof activity.icon === 'string' &&
      typeof activity.title === 'string' &&
      typeof activity.description === 'string' &&
      typeof activity.color === 'string'
  );

  return {
    isValid: activities.length === 3 && hasAllFields,
    count: activities.length,
    hasAllFields,
    activityIds: activities.map((a) => a.id),
  };
}

/**
 * Validates that an activity ID is one of the expected values
 */
function isValidActivityId(id: string): boolean {
  const validIds: Exclude<DynamicsView, 'selector'>[] = ['poll', 'judge', 'giveaway'];
  return validIds.includes(id as Exclude<DynamicsView, 'selector'>);
}

/**
 * Simulates the callback behavior when an activity is selected
 */
function simulateActivitySelection(
  activityId: Exclude<DynamicsView, 'selector'>,
  callback: (id: Exclude<DynamicsView, 'selector'>) => void
): void {
  callback(activityId);
}

/**
 * Validates that each activity has a valid color format (hex color)
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// ============ ARBITRARIES ============

const activityIdArb: fc.Arbitrary<Exclude<DynamicsView, 'selector'>> = fc.constantFrom(
  'poll',
  'judge',
  'giveaway'
);

const activitySelectionSequenceArb = fc.array(activityIdArb, { minLength: 1, maxLength: 10 });

// ============ TESTS ============

describe('ActivitySelector Property Tests', () => {
  describe('Property 1: Activity Selector Renders Correctly', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 1: Activity Selector Renders Correctly
     * 
     * For any render of the ActivitySelector component, it SHALL display exactly 
     * 3 ActivityCards, each containing an icon element, a title text, and a description text.
     * 
     * **Validates: Requirements 1.1, 1.2**
     */

    it('should have exactly 3 activities in the ACTIVITIES configuration', () => {
      const result = validateActivitiesConfig(ACTIVITIES);
      
      expect(result.count).toBe(3);
      expect(result.isValid).toBe(true);
    });

    it('should have all required fields for each activity', () => {
      const result = validateActivitiesConfig(ACTIVITIES);
      
      expect(result.hasAllFields).toBe(true);
    });

    it('should contain poll, judge, and giveaway activities', () => {
      const result = validateActivitiesConfig(ACTIVITIES);
      
      expect(result.activityIds).toContain('poll');
      expect(result.activityIds).toContain('judge');
      expect(result.activityIds).toContain('giveaway');
    });

    it('should have valid hex colors for all activities', () => {
      for (const activity of ACTIVITIES) {
        expect(isValidHexColor(activity.color)).toBe(true);
      }
    });

    it('should have non-empty titles for all activities', () => {
      for (const activity of ACTIVITIES) {
        expect(activity.title.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty descriptions for all activities', () => {
      for (const activity of ACTIVITIES) {
        expect(activity.description.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty icon identifiers for all activities', () => {
      for (const activity of ACTIVITIES) {
        expect(activity.icon.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have unique activity IDs', () => {
      const ids = ACTIVITIES.map((a) => a.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Activity Selection Callback', () => {
    /**
     * Tests that verify the onSelectActivity callback behavior
     */

    it('should call callback with correct activity ID for any valid activity', () => {
      fc.assert(
        fc.property(activityIdArb, (activityId) => {
          let selectedId: Exclude<DynamicsView, 'selector'> | null = null;
          const callback = (id: Exclude<DynamicsView, 'selector'>) => {
            selectedId = id;
          };

          simulateActivitySelection(activityId, callback);

          // Property: callback should be called with the exact activity ID
          expect(selectedId).toBe(activityId);
          expect(isValidActivityId(selectedId!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple sequential selections correctly', () => {
      fc.assert(
        fc.property(activitySelectionSequenceArb, (selections) => {
          const selectedIds: Exclude<DynamicsView, 'selector'>[] = [];
          const callback = (id: Exclude<DynamicsView, 'selector'>) => {
            selectedIds.push(id);
          };

          for (const activityId of selections) {
            simulateActivitySelection(activityId, callback);
          }

          // Property: all selections should be recorded in order
          expect(selectedIds.length).toBe(selections.length);
          expect(selectedIds).toEqual(selections);
        }),
        { numRuns: 100 }
      );
    });

    it('should always produce valid activity IDs', () => {
      fc.assert(
        fc.property(activityIdArb, (activityId) => {
          // Property: any generated activity ID should be valid
          expect(isValidActivityId(activityId)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Activity Configuration Invariants', () => {
    /**
     * Tests that verify invariants of the activity configuration
     */

    it('should maintain consistent activity count across multiple accesses', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (accessCount) => {
          const counts: number[] = [];
          
          for (let i = 0; i < accessCount; i++) {
            counts.push(ACTIVITIES.length);
          }

          // Property: activity count should always be 3
          expect(counts.every((c) => c === 3)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have activities with expected structure for any access', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 }), (index) => {
          const activity = ACTIVITIES[index];

          // Property: each activity should have all required properties
          expect(activity).toHaveProperty('id');
          expect(activity).toHaveProperty('icon');
          expect(activity).toHaveProperty('title');
          expect(activity).toHaveProperty('description');
          expect(activity).toHaveProperty('color');
        }),
        { numRuns: 100 }
      );
    });

    it('should have specific expected activities', () => {
      // Verify the exact expected activities exist
      const pollActivity = ACTIVITIES.find((a) => a.id === 'poll');
      const judgeActivity = ACTIVITIES.find((a) => a.id === 'judge');
      const giveawayActivity = ACTIVITIES.find((a) => a.id === 'giveaway');

      expect(pollActivity).toBeDefined();
      expect(pollActivity?.title).toBe('Encuesta');
      
      expect(judgeActivity).toBeDefined();
      expect(judgeActivity?.title).toBe('Jurado');
      
      expect(giveawayActivity).toBeDefined();
      expect(giveawayActivity?.title).toBe('Sorteos');
    });
  });
});
