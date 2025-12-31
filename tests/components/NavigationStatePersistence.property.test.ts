/**
 * Property-based tests for Navigation State Persistence
 * 
 * Uses fast-check for property-based testing to validate that navigation state
 * is properly managed during tab switches and dynamics view changes.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 4: State Persistence During Navigation
 * @validates Requirements 4.1, 4.2, 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LeftTab, DynamicsView } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

const VALID_LEFT_TABS: LeftTab[] = ['dynamics', 'games', 'platforms', 'obs', 'gallery', 'data'];
const VALID_DYNAMICS_VIEWS: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];

/**
 * Simulates the navigation state manager as implemented in App.tsx
 */
interface NavigationState {
  leftTab: LeftTab;
  dynamicsView: DynamicsView;
  // Simulated in-progress data for each activity panel
  activityData: {
    poll: { hasData: boolean; data?: unknown };
    judge: { hasData: boolean; data?: unknown };
    giveaway: { hasData: boolean; data?: unknown };
  };
}

/**
 * Creates initial navigation state
 */
function createInitialState(): NavigationState {
  return {
    leftTab: 'dynamics',
    dynamicsView: 'selector',
    activityData: {
      poll: { hasData: false },
      judge: { hasData: false },
      giveaway: { hasData: false },
    },
  };
}

/**
 * Handles dynamics navigation (changing dynamicsView)
 * Validates the view and defaults to 'selector' if invalid
 */
function handleDynamicsNavigation(
  state: NavigationState,
  view: string
): NavigationState {
  const validViews: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];
  const newView = validViews.includes(view as DynamicsView) 
    ? (view as DynamicsView) 
    : 'selector';
  
  return {
    ...state,
    dynamicsView: newView,
  };
}

/**
 * Handles left tab navigation
 * When navigating away from dynamics, resets dynamicsView to 'selector'
 * (as per requirement 4.2)
 */
function handleLeftTabNavigation(
  state: NavigationState,
  tab: LeftTab
): NavigationState {
  const newState = {
    ...state,
    leftTab: tab,
  };
  
  // Reset dynamicsView to selector when leaving dynamics tab
  if (tab !== 'dynamics') {
    newState.dynamicsView = 'selector';
  }
  
  return newState;
}

/**
 * Simulates adding in-progress data to an activity panel
 */
function addActivityData(
  state: NavigationState,
  activity: Exclude<DynamicsView, 'selector'>,
  data: unknown
): NavigationState {
  return {
    ...state,
    activityData: {
      ...state.activityData,
      [activity]: { hasData: true, data },
    },
  };
}

/**
 * Checks if activity data is preserved
 */
function isActivityDataPreserved(
  state: NavigationState,
  activity: Exclude<DynamicsView, 'selector'>
): boolean {
  return state.activityData[activity].hasData;
}

/**
 * Validates that a tab is a valid LeftTab
 */
function isValidLeftTab(tab: string): tab is LeftTab {
  return VALID_LEFT_TABS.includes(tab as LeftTab);
}

/**
 * Validates that a view is a valid DynamicsView
 */
function isValidDynamicsView(view: string): view is DynamicsView {
  return VALID_DYNAMICS_VIEWS.includes(view as DynamicsView);
}

// ============ ARBITRARIES ============

const leftTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(...VALID_LEFT_TABS);

const nonDynamicsTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(
  'games', 'obs', 'gallery', 'data'
);

const dynamicsViewArb: fc.Arbitrary<DynamicsView> = fc.constantFrom(...VALID_DYNAMICS_VIEWS);

const activityViewArb: fc.Arbitrary<Exclude<DynamicsView, 'selector'>> = fc.constantFrom(
  'poll', 'judge', 'giveaway'
);

const invalidViewArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => !VALID_DYNAMICS_VIEWS.includes(s as DynamicsView));

// Navigation action types
type NavigationAction = 
  | { type: 'setLeftTab'; tab: LeftTab }
  | { type: 'setDynamicsView'; view: DynamicsView }
  | { type: 'addActivityData'; activity: Exclude<DynamicsView, 'selector'>; data: unknown };

const navigationActionArb: fc.Arbitrary<NavigationAction> = fc.oneof(
  leftTabArb.map(tab => ({ type: 'setLeftTab' as const, tab })),
  dynamicsViewArb.map(view => ({ type: 'setDynamicsView' as const, view })),
  fc.tuple(activityViewArb, fc.anything()).map(([activity, data]) => ({
    type: 'addActivityData' as const,
    activity,
    data,
  }))
);

const navigationSequenceArb = fc.array(navigationActionArb, { minLength: 1, maxLength: 20 });

// ============ HELPER FUNCTIONS ============

/**
 * Applies a sequence of navigation actions to a state
 */
function applyNavigationSequence(
  initialState: NavigationState,
  actions: NavigationAction[]
): NavigationState {
  let state = initialState;
  
  for (const action of actions) {
    switch (action.type) {
      case 'setLeftTab':
        state = handleLeftTabNavigation(state, action.tab);
        break;
      case 'setDynamicsView':
        state = handleDynamicsNavigation(state, action.view);
        break;
      case 'addActivityData':
        state = addActivityData(state, action.activity, action.data);
        break;
    }
  }
  
  return state;
}

// ============ TESTS ============

describe('Navigation State Persistence Property Tests', () => {
  describe('Property 4: State Persistence During Navigation', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 4: State Persistence During Navigation
     * 
     * For any sequence of navigation actions (selecting an activity, navigating to another tab,
     * returning to dynamics), the in-progress data within each activity panel SHALL be preserved.
     * 
     * **Validates: Requirements 4.1, 4.2, 4.3**
     */

    it('should preserve activity data when navigating to another tab and back', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          nonDynamicsTabArb,
          fc.anything(),
          (activity, otherTab, testData) => {
            let state = createInitialState();
            
            // Navigate to an activity and add data
            state = handleDynamicsNavigation(state, activity);
            state = addActivityData(state, activity, testData);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Navigate back to dynamics
            state = handleLeftTabNavigation(state, 'dynamics');
            
            // Property: activity data should be preserved
            expect(isActivityDataPreserved(state, activity)).toBe(true);
            expect(state.activityData[activity].data).toEqual(testData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset dynamicsView to selector when returning to dynamics tab', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          nonDynamicsTabArb,
          (activity, otherTab) => {
            let state = createInitialState();
            
            // Navigate to an activity
            state = handleDynamicsNavigation(state, activity);
            expect(state.dynamicsView).toBe(activity);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Navigate back to dynamics
            state = handleLeftTabNavigation(state, 'dynamics');
            
            // Property: dynamicsView should be reset to 'selector' (per requirement 4.2)
            expect(state.dynamicsView).toBe('selector');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data for all activities independently', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.anything(),
          fc.anything(),
          (pollData, judgeData, giveawayData) => {
            let state = createInitialState();
            
            // Add data to all activities
            state = addActivityData(state, 'poll', pollData);
            state = addActivityData(state, 'judge', judgeData);
            state = addActivityData(state, 'giveaway', giveawayData);
            
            // Navigate away and back multiple times
            state = handleLeftTabNavigation(state, 'games');
            state = handleLeftTabNavigation(state, 'dynamics');
            state = handleLeftTabNavigation(state, 'obs');
            state = handleLeftTabNavigation(state, 'dynamics');
            
            // Property: all activity data should be preserved
            expect(state.activityData.poll.data).toEqual(pollData);
            expect(state.activityData.judge.data).toEqual(judgeData);
            expect(state.activityData.giveaway.data).toEqual(giveawayData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain valid state after any navigation sequence', () => {
      fc.assert(
        fc.property(navigationSequenceArb, (actions) => {
          const initialState = createInitialState();
          const finalState = applyNavigationSequence(initialState, actions);
          
          // Property: state should always be valid
          expect(isValidLeftTab(finalState.leftTab)).toBe(true);
          expect(isValidDynamicsView(finalState.dynamicsView)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle invalid dynamics view by defaulting to selector', () => {
      fc.assert(
        fc.property(invalidViewArb, (invalidView) => {
          let state = createInitialState();
          
          // Try to navigate to invalid view
          state = handleDynamicsNavigation(state, invalidView);
          
          // Property: should default to 'selector'
          expect(state.dynamicsView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Left Tab Navigation Invariants', () => {
    /**
     * Tests that verify invariants of left tab navigation
     */

    it('should always have a valid leftTab after navigation', () => {
      fc.assert(
        fc.property(leftTabArb, (tab) => {
          let state = createInitialState();
          state = handleLeftTabNavigation(state, tab);
          
          expect(VALID_LEFT_TABS).toContain(state.leftTab);
          expect(state.leftTab).toBe(tab);
        }),
        { numRuns: 100 }
      );
    });

    it('should reset dynamicsView when navigating away from dynamics', () => {
      fc.assert(
        fc.property(activityViewArb, nonDynamicsTabArb, (activity, otherTab) => {
          let state = createInitialState();
          
          // Set a non-selector dynamics view
          state = handleDynamicsNavigation(state, activity);
          expect(state.dynamicsView).toBe(activity);
          
          // Navigate away from dynamics
          state = handleLeftTabNavigation(state, otherTab);
          
          // Property: dynamicsView should be reset to 'selector'
          expect(state.dynamicsView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should not reset dynamicsView when staying in dynamics tab', () => {
      fc.assert(
        fc.property(activityViewArb, (activity) => {
          let state = createInitialState();
          
          // Set a non-selector dynamics view
          state = handleDynamicsNavigation(state, activity);
          
          // Navigate to dynamics again (should not reset)
          state = handleLeftTabNavigation(state, 'dynamics');
          
          // Property: dynamicsView should remain unchanged
          expect(state.dynamicsView).toBe(activity);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Dynamics View Navigation Invariants', () => {
    /**
     * Tests that verify invariants of dynamics view navigation
     */

    it('should always have a valid dynamicsView after navigation', () => {
      fc.assert(
        fc.property(dynamicsViewArb, (view) => {
          let state = createInitialState();
          state = handleDynamicsNavigation(state, view);
          
          expect(VALID_DYNAMICS_VIEWS).toContain(state.dynamicsView);
          expect(state.dynamicsView).toBe(view);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow navigation to any valid dynamics view', () => {
      for (const view of VALID_DYNAMICS_VIEWS) {
        let state = createInitialState();
        state = handleDynamicsNavigation(state, view);
        expect(state.dynamicsView).toBe(view);
      }
    });
  });

  describe('Activity Data Persistence Invariants', () => {
    /**
     * Tests that verify activity data is properly preserved
     */

    it('should preserve activity data through multiple tab switches', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          fc.array(leftTabArb, { minLength: 1, maxLength: 10 }),
          fc.anything(),
          (activity, tabSequence, testData) => {
            let state = createInitialState();
            
            // Add data to activity
            state = addActivityData(state, activity, testData);
            
            // Navigate through multiple tabs
            for (const tab of tabSequence) {
              state = handleLeftTabNavigation(state, tab);
            }
            
            // Property: activity data should still be preserved
            expect(isActivityDataPreserved(state, activity)).toBe(true);
            expect(state.activityData[activity].data).toEqual(testData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other activities when adding data to one', () => {
      fc.assert(
        fc.property(activityViewArb, fc.anything(), (activity, testData) => {
          let state = createInitialState();
          
          // Add data to one activity
          state = addActivityData(state, activity, testData);
          
          // Property: other activities should not be affected
          const otherActivities = (['poll', 'judge', 'giveaway'] as const)
            .filter(a => a !== activity);
          
          for (const other of otherActivities) {
            expect(state.activityData[other].hasData).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
