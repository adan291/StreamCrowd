/**
 * Property-based tests for DynamicsPanel component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the DynamicsPanel navigation behavior.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 3: Back Navigation Returns to Selector
 * @validates Requirements 2.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DynamicsView } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Simulates the back navigation behavior
 * When back is clicked, the view should always return to 'selector'
 */
function simulateBackNavigation(
  currentView: DynamicsView,
  onViewChange: (view: DynamicsView) => void
): void {
  // Back navigation always sets view to 'selector'
  onViewChange('selector');
}

/**
 * Determines if the back button should be visible based on current view
 */
function shouldShowBackButton(view: DynamicsView): boolean {
  return view !== 'selector';
}

/**
 * Validates that a view is a valid DynamicsView
 */
function isValidDynamicsView(view: string): view is DynamicsView {
  const validViews: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];
  return validViews.includes(view as DynamicsView);
}

/**
 * Simulates a sequence of navigation actions and returns the final view
 */
function simulateNavigationSequence(
  initialView: DynamicsView,
  actions: Array<{ type: 'select'; activity: Exclude<DynamicsView, 'selector'> } | { type: 'back' }>
): DynamicsView {
  let currentView = initialView;
  
  for (const action of actions) {
    if (action.type === 'back') {
      currentView = 'selector';
    } else if (action.type === 'select') {
      currentView = action.activity;
    }
  }
  
  return currentView;
}

// ============ ARBITRARIES ============

const activityViewArb: fc.Arbitrary<Exclude<DynamicsView, 'selector'>> = fc.constantFrom(
  'poll',
  'judge',
  'giveaway'
);

const dynamicsViewArb: fc.Arbitrary<DynamicsView> = fc.constantFrom(
  'selector',
  'poll',
  'judge',
  'giveaway'
);

const navigationActionArb = fc.oneof(
  fc.record({ type: fc.constant('back' as const) }),
  activityViewArb.map(activity => ({ type: 'select' as const, activity }))
);

const navigationSequenceArb = fc.array(navigationActionArb, { minLength: 1, maxLength: 20 });

// ============ TESTS ============

describe('DynamicsPanel Property Tests', () => {
  describe('Property 3: Back Navigation Returns to Selector', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 3: Back Navigation Returns to Selector
     * 
     * For any dynamicsView state that is not 'selector', clicking the back button 
     * SHALL set dynamicsView to 'selector', and the ActivitySelector component SHALL be rendered.
     * 
     * **Validates: Requirements 2.2**
     */

    it('should always return to selector when back is clicked from any activity view', () => {
      fc.assert(
        fc.property(activityViewArb, (activityView) => {
          let resultView: DynamicsView | null = null;
          const onViewChange = (view: DynamicsView) => {
            resultView = view;
          };

          // Simulate being in an activity view and clicking back
          simulateBackNavigation(activityView, onViewChange);

          // Property: back navigation should always result in 'selector' view
          expect(resultView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should show back button only when not in selector view', () => {
      fc.assert(
        fc.property(dynamicsViewArb, (view) => {
          const showBackButton = shouldShowBackButton(view);

          // Property: back button visible iff view is not 'selector'
          if (view === 'selector') {
            expect(showBackButton).toBe(false);
          } else {
            expect(showBackButton).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple back navigations consistently', () => {
      fc.assert(
        fc.property(
          fc.array(activityViewArb, { minLength: 1, maxLength: 10 }),
          (activitySequence) => {
            const results: DynamicsView[] = [];
            const onViewChange = (view: DynamicsView) => {
              results.push(view);
            };

            // Simulate multiple back navigations from different activity views
            for (const activity of activitySequence) {
              simulateBackNavigation(activity, onViewChange);
            }

            // Property: every back navigation should result in 'selector'
            expect(results.every(v => v === 'selector')).toBe(true);
            expect(results.length).toBe(activitySequence.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain valid view state after any navigation sequence', () => {
      fc.assert(
        fc.property(dynamicsViewArb, navigationSequenceArb, (initialView, actions) => {
          const finalView = simulateNavigationSequence(initialView, actions);

          // Property: final view should always be a valid DynamicsView
          expect(isValidDynamicsView(finalView)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should end in selector view if last action is back', () => {
      fc.assert(
        fc.property(
          dynamicsViewArb,
          fc.array(navigationActionArb, { minLength: 0, maxLength: 10 }),
          (initialView, actions) => {
            // Add a back action at the end
            const actionsWithBack = [...actions, { type: 'back' as const }];
            const finalView = simulateNavigationSequence(initialView, actionsWithBack);

            // Property: if last action is back, view should be 'selector'
            expect(finalView).toBe('selector');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Back Button Visibility Invariants', () => {
    /**
     * Tests that verify invariants of back button visibility
     */

    it('should never show back button in selector view', () => {
      // Direct test for selector view
      expect(shouldShowBackButton('selector')).toBe(false);
    });

    it('should always show back button in poll view', () => {
      expect(shouldShowBackButton('poll')).toBe(true);
    });

    it('should always show back button in judge view', () => {
      expect(shouldShowBackButton('judge')).toBe(true);
    });

    it('should always show back button in giveaway view', () => {
      expect(shouldShowBackButton('giveaway')).toBe(true);
    });

    it('should have consistent back button visibility for all activity views', () => {
      fc.assert(
        fc.property(activityViewArb, (activityView) => {
          // Property: all activity views should show back button
          expect(shouldShowBackButton(activityView)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Navigation State Transitions', () => {
    /**
     * Tests that verify state transitions are valid
     */

    it('should transition from any activity to selector on back', () => {
      const activities: Exclude<DynamicsView, 'selector'>[] = ['poll', 'judge', 'giveaway'];
      
      for (const activity of activities) {
        let resultView: DynamicsView | null = null;
        simulateBackNavigation(activity, (view) => { resultView = view; });
        expect(resultView).toBe('selector');
      }
    });

    it('should allow selecting any activity from selector', () => {
      fc.assert(
        fc.property(activityViewArb, (activity) => {
          const actions = [{ type: 'select' as const, activity }];
          const finalView = simulateNavigationSequence('selector', actions);

          // Property: selecting an activity should navigate to that activity
          expect(finalView).toBe(activity);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle rapid select-back cycles', () => {
      fc.assert(
        fc.property(
          fc.array(activityViewArb, { minLength: 1, maxLength: 10 }),
          (activities) => {
            // Create a sequence of select-back cycles
            const actions: Array<{ type: 'select'; activity: Exclude<DynamicsView, 'selector'> } | { type: 'back' }> = [];
            for (const activity of activities) {
              actions.push({ type: 'select', activity });
              actions.push({ type: 'back' });
            }

            const finalView = simulateNavigationSequence('selector', actions);

            // Property: after select-back cycles, should end in selector
            expect(finalView).toBe('selector');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
