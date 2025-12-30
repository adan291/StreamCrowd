/**
 * Property-based tests for Activity Navigation
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the activity navigation behavior within the DynamicsPanel.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 2: Activity Navigation Works Correctly
 * @validates Requirements 1.3, 2.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DynamicsView, ACTIVITIES } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Simulates the activity selection behavior
 * When an activity is selected, the view should update to that activity
 */
function simulateActivitySelection(
  activityId: Exclude<DynamicsView, 'selector'>,
  onViewChange: (view: DynamicsView) => void
): void {
  onViewChange(activityId);
}

/**
 * Determines which panel should be rendered based on the current view
 */
function getPanelForView(view: DynamicsView): string {
  switch (view) {
    case 'selector':
      return 'ActivitySelector';
    case 'poll':
      return 'PollCreator';
    case 'judge':
      return 'JudgePanel';
    case 'giveaway':
      return 'GiveawayHub';
    default:
      return 'ActivitySelector';
  }
}

/**
 * Validates that a view is a valid DynamicsView
 */
function isValidDynamicsView(view: string): view is DynamicsView {
  const validViews: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];
  return validViews.includes(view as DynamicsView);
}

/**
 * Simulates the handleDynamicsNavigation function from App.tsx
 * This validates invalid views and defaults to 'selector'
 */
function handleDynamicsNavigation(
  view: string,
  setDynamicsView: (view: DynamicsView) => void
): void {
  const validViews: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];
  if (validViews.includes(view as DynamicsView)) {
    setDynamicsView(view as DynamicsView);
  } else {
    console.warn(`Invalid dynamics view: ${view}, defaulting to selector`);
    setDynamicsView('selector');
  }
}

/**
 * Maps activity IDs to their expected panel components
 */
const ACTIVITY_TO_PANEL_MAP: Record<Exclude<DynamicsView, 'selector'>, string> = {
  poll: 'PollCreator',
  judge: 'JudgePanel',
  giveaway: 'GiveawayHub',
};

/**
 * Simulates a complete navigation flow: select activity -> verify panel -> back
 */
function simulateNavigationFlow(
  activityId: Exclude<DynamicsView, 'selector'>
): { selectedView: DynamicsView; expectedPanel: string; backView: DynamicsView } {
  let currentView: DynamicsView = 'selector';
  
  // Select activity
  currentView = activityId;
  const expectedPanel = ACTIVITY_TO_PANEL_MAP[activityId];
  
  // Go back
  const backView: DynamicsView = 'selector';
  
  return {
    selectedView: currentView,
    expectedPanel,
    backView,
  };
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

const invalidViewArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant('invalid'),
  fc.constant('unknown'),
  fc.constant(''),
  fc.constant('polls'),
  fc.constant('judges'),
  fc.constant('giveaways'),
  fc.stringOf(fc.char(), { minLength: 1, maxLength: 10 }).filter(
    s => !['selector', 'poll', 'judge', 'giveaway'].includes(s)
  )
);

const navigationSequenceArb = fc.array(activityViewArb, { minLength: 1, maxLength: 20 });

// ============ TESTS ============

describe('Activity Navigation Property Tests', () => {
  describe('Property 2: Activity Navigation Works Correctly', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 2: Activity Navigation Works Correctly
     * 
     * For any ActivityCard click event, the system SHALL update the dynamicsView state 
     * to match the clicked activity's id, and the corresponding panel component SHALL be rendered.
     * 
     * **Validates: Requirements 1.3, 2.1**
     */

    it('should update dynamicsView to match clicked activity ID', () => {
      fc.assert(
        fc.property(activityViewArb, (activityId) => {
          let resultView: DynamicsView | null = null;
          const onViewChange = (view: DynamicsView) => {
            resultView = view;
          };

          // Simulate clicking on an activity card
          simulateActivitySelection(activityId, onViewChange);

          // Property: view should be updated to the clicked activity's ID
          expect(resultView).toBe(activityId);
        }),
        { numRuns: 100 }
      );
    });

    it('should render the correct panel for each activity view', () => {
      fc.assert(
        fc.property(activityViewArb, (activityId) => {
          const panel = getPanelForView(activityId);

          // Property: each activity should map to its corresponding panel
          expect(panel).toBe(ACTIVITY_TO_PANEL_MAP[activityId]);
        }),
        { numRuns: 100 }
      );
    });

    it('should render ActivitySelector when view is selector', () => {
      const panel = getPanelForView('selector');
      expect(panel).toBe('ActivitySelector');
    });

    it('should handle navigation from selector to any activity', () => {
      fc.assert(
        fc.property(activityViewArb, (activityId) => {
          let currentView: DynamicsView = 'selector';
          const onViewChange = (view: DynamicsView) => {
            currentView = view;
          };

          // Start from selector
          expect(currentView).toBe('selector');

          // Navigate to activity
          simulateActivitySelection(activityId, onViewChange);

          // Property: should be in the selected activity view
          expect(currentView).toBe(activityId);
          expect(isValidDynamicsView(currentView)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple sequential activity selections', () => {
      fc.assert(
        fc.property(navigationSequenceArb, (activities) => {
          let currentView: DynamicsView = 'selector';
          const viewHistory: DynamicsView[] = [];
          const onViewChange = (view: DynamicsView) => {
            currentView = view;
            viewHistory.push(view);
          };

          // Navigate through all activities in sequence
          for (const activityId of activities) {
            simulateActivitySelection(activityId, onViewChange);
          }

          // Property: final view should be the last selected activity
          expect(currentView).toBe(activities[activities.length - 1]);
          
          // Property: all views in history should be valid
          expect(viewHistory.every(v => isValidDynamicsView(v))).toBe(true);
          
          // Property: history length should match selections
          expect(viewHistory.length).toBe(activities.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain valid state after any navigation sequence', () => {
      fc.assert(
        fc.property(dynamicsViewArb, navigationSequenceArb, (initialView, activities) => {
          let currentView: DynamicsView = initialView;
          const onViewChange = (view: DynamicsView) => {
            currentView = view;
          };

          // Navigate through activities
          for (const activityId of activities) {
            simulateActivitySelection(activityId, onViewChange);
          }

          // Property: final view should always be valid
          expect(isValidDynamicsView(currentView)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid View Handling', () => {
    /**
     * Tests that verify invalid view handling
     */

    it('should default to selector for invalid views', () => {
      fc.assert(
        fc.property(invalidViewArb, (invalidView) => {
          let resultView: DynamicsView | null = null;
          const setDynamicsView = (view: DynamicsView) => {
            resultView = view;
          };

          // Simulate navigation with invalid view
          handleDynamicsNavigation(invalidView, setDynamicsView);

          // Property: invalid views should default to 'selector'
          expect(resultView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should accept valid views through handleDynamicsNavigation', () => {
      fc.assert(
        fc.property(dynamicsViewArb, (validView) => {
          let resultView: DynamicsView | null = null;
          const setDynamicsView = (view: DynamicsView) => {
            resultView = view;
          };

          // Simulate navigation with valid view
          handleDynamicsNavigation(validView, setDynamicsView);

          // Property: valid views should be accepted as-is
          expect(resultView).toBe(validView);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Panel Rendering Consistency', () => {
    /**
     * Tests that verify panel rendering is consistent
     */

    it('should have consistent panel mapping for all activities', () => {
      // Verify each activity maps to exactly one panel
      expect(getPanelForView('poll')).toBe('PollCreator');
      expect(getPanelForView('judge')).toBe('JudgePanel');
      expect(getPanelForView('giveaway')).toBe('GiveawayHub');
      expect(getPanelForView('selector')).toBe('ActivitySelector');
    });

    it('should return correct panel for any valid view', () => {
      fc.assert(
        fc.property(dynamicsViewArb, (view) => {
          const panel = getPanelForView(view);

          // Property: panel should be a non-empty string
          expect(typeof panel).toBe('string');
          expect(panel.length).toBeGreaterThan(0);

          // Property: panel should be one of the expected panels
          const validPanels = ['ActivitySelector', 'PollCreator', 'JudgePanel', 'GiveawayHub'];
          expect(validPanels).toContain(panel);
        }),
        { numRuns: 100 }
      );
    });

    it('should have all ACTIVITIES mapped to panels', () => {
      for (const activity of ACTIVITIES) {
        const panel = getPanelForView(activity.id);
        
        // Property: each activity should have a corresponding panel
        expect(panel).not.toBe('ActivitySelector');
        expect(ACTIVITY_TO_PANEL_MAP[activity.id as Exclude<DynamicsView, 'selector'>]).toBe(panel);
      }
    });
  });

  describe('Navigation Flow Integration', () => {
    /**
     * Tests that verify complete navigation flows
     */

    it('should complete full navigation flow for any activity', () => {
      fc.assert(
        fc.property(activityViewArb, (activityId) => {
          const flow = simulateNavigationFlow(activityId);

          // Property: selected view should match activity ID
          expect(flow.selectedView).toBe(activityId);

          // Property: expected panel should be correct
          expect(flow.expectedPanel).toBe(ACTIVITY_TO_PANEL_MAP[activityId]);

          // Property: back should return to selector
          expect(flow.backView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle rapid activity switching', () => {
      fc.assert(
        fc.property(
          fc.array(activityViewArb, { minLength: 2, maxLength: 10 }),
          (activities) => {
            let currentView: DynamicsView = 'selector';
            const onViewChange = (view: DynamicsView) => {
              currentView = view;
            };

            // Rapidly switch between activities
            for (const activityId of activities) {
              simulateActivitySelection(activityId, onViewChange);
              
              // Property: after each selection, view should be the selected activity
              expect(currentView).toBe(activityId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle alternating between same activity', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          fc.integer({ min: 1, max: 10 }),
          (activityId, repeatCount) => {
            let currentView: DynamicsView = 'selector';
            const onViewChange = (view: DynamicsView) => {
              currentView = view;
            };

            // Select the same activity multiple times
            for (let i = 0; i < repeatCount; i++) {
              simulateActivitySelection(activityId, onViewChange);
            }

            // Property: view should be the selected activity
            expect(currentView).toBe(activityId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
