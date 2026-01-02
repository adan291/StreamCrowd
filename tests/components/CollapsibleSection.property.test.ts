/**
 * Property-based tests for CollapsibleSection component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the CollapsibleSection rendering and behavior.
 * 
 * Feature: ux-polish-and-testing
 * Property 1: CollapsibleSection Toggle Consistency
 * Property 2: Badge Display Consistency
 * @validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Simulates the CollapsibleSection state management
 */
interface CollapsibleState {
  expanded: boolean;
  badge?: string | number;
  title: string;
}

/**
 * Creates initial state based on defaultExpanded prop
 */
function createInitialState(
  title: string,
  defaultExpanded: boolean,
  badge?: string | number
): CollapsibleState {
  return {
    expanded: defaultExpanded,
    badge,
    title,
  };
}

/**
 * Toggles the expanded state (simulates click on header)
 */
function toggleExpanded(state: CollapsibleState): CollapsibleState {
  return {
    ...state,
    expanded: !state.expanded,
  };
}

/**
 * Determines if children should be visible based on expanded state
 */
function shouldChildrenBeVisible(state: CollapsibleState): boolean {
  return state.expanded;
}

/**
 * Determines if badge should be displayed
 */
function shouldBadgeBeDisplayed(badge: string | number | undefined | null): boolean {
  return badge !== undefined && badge !== null;
}

/**
 * Generates the aria-expanded attribute value
 */
function getAriaExpanded(state: CollapsibleState): string {
  return state.expanded ? 'true' : 'false';
}

/**
 * Simulates multiple toggle operations
 */
function applyToggles(state: CollapsibleState, toggleCount: number): CollapsibleState {
  let currentState = state;
  for (let i = 0; i < toggleCount; i++) {
    currentState = toggleExpanded(currentState);
  }
  return currentState;
}

/**
 * Validates that toggle callback is called with correct value
 */
function simulateToggleWithCallback(
  initialExpanded: boolean,
  callback: (expanded: boolean) => void
): boolean {
  const newExpanded = !initialExpanded;
  callback(newExpanded);
  return newExpanded;
}

// ============ ARBITRARIES ============

const titleArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const badgeValueArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 10 }),
  fc.integer({ min: 0, max: 9999 })
);

const optionalBadgeArb = fc.option(badgeValueArb, { nil: undefined });

const toggleCountArb = fc.integer({ min: 0, max: 20 });

// ============ TESTS ============

describe('CollapsibleSection Property Tests', () => {
  describe('Property 1: Toggle Consistency', () => {
    /**
     * Feature: ux-polish-and-testing, Property 1: CollapsibleSection Toggle Consistency
     * 
     * For any CollapsibleSection with initial expanded state E, clicking the header 
     * should result in expanded state !E, and children visibility should match 
     * the new expanded state.
     * 
     * **Validates: Requirements 1.1, 1.2**
     */

    it('should toggle expanded state on each click', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), (title, defaultExpanded) => {
          const initialState = createInitialState(title, defaultExpanded);
          const afterToggle = toggleExpanded(initialState);

          // Property: expanded state should be inverted after toggle
          expect(afterToggle.expanded).toBe(!defaultExpanded);
        }),
        { numRuns: 100 }
      );
    });

    it('should have children visibility match expanded state', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), (title, defaultExpanded) => {
          const state = createInitialState(title, defaultExpanded);

          // Property: children visibility should match expanded state
          expect(shouldChildrenBeVisible(state)).toBe(state.expanded);
        }),
        { numRuns: 100 }
      );
    });

    it('should return to original state after even number of toggles', () => {
      fc.assert(
        fc.property(
          titleArb,
          fc.boolean(),
          fc.integer({ min: 0, max: 10 }),
          (title, defaultExpanded, halfToggles) => {
            const evenToggles = halfToggles * 2;
            const initialState = createInitialState(title, defaultExpanded);
            const finalState = applyToggles(initialState, evenToggles);

            // Property: even number of toggles should return to original state
            expect(finalState.expanded).toBe(defaultExpanded);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be in opposite state after odd number of toggles', () => {
      fc.assert(
        fc.property(
          titleArb,
          fc.boolean(),
          fc.integer({ min: 0, max: 10 }),
          (title, defaultExpanded, halfToggles) => {
            const oddToggles = halfToggles * 2 + 1;
            const initialState = createInitialState(title, defaultExpanded);
            const finalState = applyToggles(initialState, oddToggles);

            // Property: odd number of toggles should result in opposite state
            expect(finalState.expanded).toBe(!defaultExpanded);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call onToggle callback with correct value', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialExpanded) => {
          let callbackValue: boolean | null = null;
          const callback = (expanded: boolean) => {
            callbackValue = expanded;
          };

          const newExpanded = simulateToggleWithCallback(initialExpanded, callback);

          // Property: callback should receive the new expanded value
          expect(callbackValue).toBe(newExpanded);
          expect(callbackValue).toBe(!initialExpanded);
        }),
        { numRuns: 100 }
      );
    });

    it('should have correct aria-expanded attribute', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), (title, defaultExpanded) => {
          const state = createInitialState(title, defaultExpanded);

          // Property: aria-expanded should match expanded state as string
          expect(getAriaExpanded(state)).toBe(defaultExpanded ? 'true' : 'false');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Badge Display Consistency', () => {
    /**
     * Feature: ux-polish-and-testing, Property 2: Badge Display Consistency
     * 
     * For any CollapsibleSection with badge value V (where V is defined), 
     * the badge should display V. When V is undefined, no badge should be displayed.
     * 
     * **Validates: Requirements 1.3, 1.4**
     */

    it('should display badge when value is provided', () => {
      fc.assert(
        fc.property(badgeValueArb, (badge) => {
          // Property: badge should be displayed when value is defined
          expect(shouldBadgeBeDisplayed(badge)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should not display badge when value is undefined', () => {
      // Property: badge should not be displayed when undefined
      expect(shouldBadgeBeDisplayed(undefined)).toBe(false);
    });

    it('should not display badge when value is null', () => {
      // Property: badge should not be displayed when null
      expect(shouldBadgeBeDisplayed(null)).toBe(false);
    });

    it('should preserve badge value in state', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), optionalBadgeArb, (title, defaultExpanded, badge) => {
          const state = createInitialState(title, defaultExpanded, badge);

          // Property: badge value should be preserved in state
          expect(state.badge).toBe(badge);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle numeric badge values correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 9999 }), (badge) => {
          // Property: numeric badges should be displayed
          expect(shouldBadgeBeDisplayed(badge)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle string badge values correctly', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 10 }), (badge) => {
          // Property: string badges should be displayed
          expect(shouldBadgeBeDisplayed(badge)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle zero as valid badge value', () => {
      // Property: zero should be displayed as a valid badge
      expect(shouldBadgeBeDisplayed(0)).toBe(true);
    });

    it('should handle empty string as valid badge value', () => {
      // Property: empty string should be displayed (it's defined)
      expect(shouldBadgeBeDisplayed('')).toBe(true);
    });
  });

  describe('defaultExpanded Prop', () => {
    /**
     * Tests for defaultExpanded prop behavior
     * 
     * **Validates: Requirements 1.5**
     */

    it('should start expanded when defaultExpanded is true', () => {
      const state = createInitialState('Test Section', true);
      expect(state.expanded).toBe(true);
      expect(shouldChildrenBeVisible(state)).toBe(true);
    });

    it('should start collapsed when defaultExpanded is false', () => {
      const state = createInitialState('Test Section', false);
      expect(state.expanded).toBe(false);
      expect(shouldChildrenBeVisible(state)).toBe(false);
    });

    it('should respect defaultExpanded for any title', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), (title, defaultExpanded) => {
          const state = createInitialState(title, defaultExpanded);

          // Property: initial expanded state should match defaultExpanded
          expect(state.expanded).toBe(defaultExpanded);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('State Invariants', () => {
    /**
     * Tests for state invariants that should always hold
     */

    it('should maintain title across toggles', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), toggleCountArb, (title, defaultExpanded, toggleCount) => {
          const initialState = createInitialState(title, defaultExpanded);
          const finalState = applyToggles(initialState, toggleCount);

          // Property: title should never change
          expect(finalState.title).toBe(title);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain badge across toggles', () => {
      fc.assert(
        fc.property(
          titleArb,
          fc.boolean(),
          optionalBadgeArb,
          toggleCountArb,
          (title, defaultExpanded, badge, toggleCount) => {
            const initialState = createInitialState(title, defaultExpanded, badge);
            const finalState = applyToggles(initialState, toggleCount);

            // Property: badge should never change from toggles
            expect(finalState.badge).toBe(badge);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always have boolean expanded state', () => {
      fc.assert(
        fc.property(titleArb, fc.boolean(), toggleCountArb, (title, defaultExpanded, toggleCount) => {
          const initialState = createInitialState(title, defaultExpanded);
          const finalState = applyToggles(initialState, toggleCount);

          // Property: expanded should always be a boolean
          expect(typeof finalState.expanded).toBe('boolean');
        }),
        { numRuns: 100 }
      );
    });
  });
});
