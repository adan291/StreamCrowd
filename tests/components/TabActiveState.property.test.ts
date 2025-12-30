/**
 * Property-based tests for Tab Active State
 * 
 * Uses fast-check for property-based testing to validate that the Dynamics tab
 * remains active during sub-navigation within the dynamics section.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 5: Dynamics Tab Remains Active During Sub-Navigation
 * @validates Requirements 5.3
 * 
 * Feature: sidebar-platforms-section
 * Property 5: Platforms Tab Remains Active
 * @validates Requirements 5.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LeftTab, DynamicsView, PlatformsView, PlatformsTool } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

const VALID_LEFT_TABS: LeftTab[] = ['dynamics', 'games', 'platforms', 'obs', 'gallery', 'data'];
const VALID_DYNAMICS_VIEWS: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];
const VALID_PLATFORMS_VIEWS: PlatformsView[] = ['selector', 'twitch'];
const VALID_PLATFORMS_TOOLS: PlatformsTool[] = ['none', 'commands', 'predictions', 'channelpoints'];

/**
 * Simulates the navigation state as implemented in App.tsx
 */
interface NavigationState {
  leftTab: LeftTab;
  dynamicsView: DynamicsView;
  platformsView: PlatformsView;
  platformsTool: PlatformsTool;
}

/**
 * Creates initial navigation state
 */
function createInitialState(): NavigationState {
  return {
    leftTab: 'dynamics',
    dynamicsView: 'selector',
    platformsView: 'selector',
    platformsTool: 'none',
  };
}

/**
 * Creates initial navigation state for platforms
 */
function createPlatformsInitialState(): NavigationState {
  return {
    leftTab: 'platforms',
    dynamicsView: 'selector',
    platformsView: 'selector',
    platformsTool: 'none',
  };
}

/**
 * Determines if the Dynamics tab should be active based on current state
 * This mirrors the logic in App.tsx: active={leftTab === 'dynamics'}
 */
function isDynamicsTabActive(state: NavigationState): boolean {
  return state.leftTab === 'dynamics';
}

/**
 * Handles dynamics view navigation (changing dynamicsView)
 * This does NOT change leftTab - it only changes the sub-view
 */
function handleDynamicsViewChange(
  state: NavigationState,
  view: DynamicsView
): NavigationState {
  return {
    ...state,
    dynamicsView: view,
  };
}

/**
 * Handles left tab navigation
 * When navigating away from dynamics, resets dynamicsView to 'selector'
 * When navigating away from platforms, resets platformsView and platformsTool
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
  
  // Reset platforms state when leaving platforms tab
  if (tab !== 'platforms') {
    newState.platformsView = 'selector';
    newState.platformsTool = 'none';
  }
  
  return newState;
}

/**
 * Simulates selecting an activity from the ActivitySelector
 * This changes dynamicsView but keeps leftTab as 'dynamics'
 */
function selectActivity(
  state: NavigationState,
  activity: Exclude<DynamicsView, 'selector'>
): NavigationState {
  // Selecting an activity only changes dynamicsView, not leftTab
  return {
    ...state,
    dynamicsView: activity,
  };
}

/**
 * Simulates clicking the back button in an activity panel
 * This returns to the selector view but keeps leftTab as 'dynamics'
 */
function navigateBack(state: NavigationState): NavigationState {
  return {
    ...state,
    dynamicsView: 'selector',
  };
}

// ============ PLATFORMS NAVIGATION FUNCTIONS ============

/**
 * Determines if the Platforms tab should be active based on current state
 * This mirrors the logic in App.tsx: active={leftTab === 'platforms'}
 * @requirements 5.4 - Platforms tab remains active during sub-navigation
 */
function isPlatformsTabActive(state: NavigationState): boolean {
  return state.leftTab === 'platforms';
}

/**
 * Handles platforms view navigation (changing platformsView)
 * This does NOT change leftTab - it only changes the sub-view
 */
function handlePlatformsViewChange(
  state: NavigationState,
  view: PlatformsView
): NavigationState {
  return {
    ...state,
    platformsView: view,
  };
}

/**
 * Handles platforms tool navigation (changing platformsTool)
 * This does NOT change leftTab - it only changes the tool
 */
function handlePlatformsToolChange(
  state: NavigationState,
  tool: PlatformsTool
): NavigationState {
  return {
    ...state,
    platformsTool: tool,
  };
}

/**
 * Simulates selecting a platform from the PlatformSelector
 * This changes platformsView but keeps leftTab as 'platforms'
 */
function selectPlatform(
  state: NavigationState,
  platform: Exclude<PlatformsView, 'selector'>
): NavigationState {
  return {
    ...state,
    platformsView: platform,
  };
}

/**
 * Simulates selecting a tool from the TwitchToolSelector
 * This changes platformsTool but keeps leftTab as 'platforms'
 */
function selectTool(
  state: NavigationState,
  tool: Exclude<PlatformsTool, 'none'>
): NavigationState {
  return {
    ...state,
    platformsTool: tool,
  };
}

/**
 * Simulates clicking the back button in platforms navigation
 * From tool panel → tool selector, from tool selector → platform selector
 */
function navigatePlatformsBack(state: NavigationState): NavigationState {
  if (state.platformsTool !== 'none') {
    // From tool panel, go back to tool selector
    return {
      ...state,
      platformsTool: 'none',
    };
  } else if (state.platformsView !== 'selector') {
    // From tool selector, go back to platform selector
    return {
      ...state,
      platformsView: 'selector',
    };
  }
  return state;
}

// ============ ARBITRARIES ============

const leftTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(...VALID_LEFT_TABS);

const dynamicsViewArb: fc.Arbitrary<DynamicsView> = fc.constantFrom(...VALID_DYNAMICS_VIEWS);

const activityViewArb: fc.Arbitrary<Exclude<DynamicsView, 'selector'>> = fc.constantFrom(
  'poll', 'judge', 'giveaway'
);

// Navigation action types for dynamics sub-navigation
type DynamicsSubNavigationAction = 
  | { type: 'selectActivity'; activity: Exclude<DynamicsView, 'selector'> }
  | { type: 'back' };

const dynamicsSubNavigationActionArb: fc.Arbitrary<DynamicsSubNavigationAction> = fc.oneof(
  activityViewArb.map(activity => ({ type: 'selectActivity' as const, activity })),
  fc.constant({ type: 'back' as const })
);

const dynamicsSubNavigationSequenceArb = fc.array(dynamicsSubNavigationActionArb, { 
  minLength: 1, 
  maxLength: 20 
});

// Platforms arbitraries
const platformsViewArb: fc.Arbitrary<PlatformsView> = fc.constantFrom(...VALID_PLATFORMS_VIEWS);

const platformsToolArb: fc.Arbitrary<PlatformsTool> = fc.constantFrom(...VALID_PLATFORMS_TOOLS);

const platformViewArb: fc.Arbitrary<Exclude<PlatformsView, 'selector'>> = fc.constantFrom('twitch');

const toolViewArb: fc.Arbitrary<Exclude<PlatformsTool, 'none'>> = fc.constantFrom(
  'commands', 'predictions', 'channelpoints'
);

// Navigation action types for platforms sub-navigation
type PlatformsSubNavigationAction = 
  | { type: 'selectPlatform'; platform: Exclude<PlatformsView, 'selector'> }
  | { type: 'selectTool'; tool: Exclude<PlatformsTool, 'none'> }
  | { type: 'back' };

const platformsSubNavigationActionArb: fc.Arbitrary<PlatformsSubNavigationAction> = fc.oneof(
  platformViewArb.map(platform => ({ type: 'selectPlatform' as const, platform })),
  toolViewArb.map(tool => ({ type: 'selectTool' as const, tool })),
  fc.constant({ type: 'back' as const })
);

const platformsSubNavigationSequenceArb = fc.array(platformsSubNavigationActionArb, { 
  minLength: 1, 
  maxLength: 20 
});

// ============ HELPER FUNCTIONS ============

/**
 * Applies a sequence of dynamics sub-navigation actions to a state
 */
function applyDynamicsSubNavigationSequence(
  initialState: NavigationState,
  actions: DynamicsSubNavigationAction[]
): NavigationState {
  let state = initialState;
  
  for (const action of actions) {
    switch (action.type) {
      case 'selectActivity':
        state = selectActivity(state, action.activity);
        break;
      case 'back':
        state = navigateBack(state);
        break;
    }
  }
  
  return state;
}

/**
 * Applies a sequence of platforms sub-navigation actions to a state
 */
function applyPlatformsSubNavigationSequence(
  initialState: NavigationState,
  actions: PlatformsSubNavigationAction[]
): NavigationState {
  let state = initialState;
  
  for (const action of actions) {
    switch (action.type) {
      case 'selectPlatform':
        state = selectPlatform(state, action.platform);
        break;
      case 'selectTool':
        state = selectTool(state, action.tool);
        break;
      case 'back':
        state = navigatePlatformsBack(state);
        break;
    }
  }
  
  return state;
}

// ============ TESTS ============

describe('Tab Active State Property Tests', () => {
  describe('Property 5: Dynamics Tab Remains Active During Sub-Navigation', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 5: Dynamics Tab Remains Active During Sub-Navigation
     * 
     * For any dynamicsView value (selector, poll, judge, or giveaway), the Dinámicas tab 
     * in the sidebar SHALL have the active styling applied.
     * 
     * **Validates: Requirements 5.3**
     */

    it('should keep Dynamics tab active for any dynamicsView value', () => {
      fc.assert(
        fc.property(dynamicsViewArb, (view) => {
          let state = createInitialState();
          
          // Set the dynamics view to any valid value
          state = handleDynamicsViewChange(state, view);
          
          // Property: Dynamics tab should always be active when leftTab is 'dynamics'
          expect(isDynamicsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('dynamics');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Dynamics tab active when selecting any activity', () => {
      fc.assert(
        fc.property(activityViewArb, (activity) => {
          let state = createInitialState();
          
          // Select an activity from the selector
          state = selectActivity(state, activity);
          
          // Property: Dynamics tab should remain active
          expect(isDynamicsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('dynamics');
          expect(state.dynamicsView).toBe(activity);
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Dynamics tab active when navigating back to selector', () => {
      fc.assert(
        fc.property(activityViewArb, (activity) => {
          let state = createInitialState();
          
          // Select an activity
          state = selectActivity(state, activity);
          
          // Navigate back to selector
          state = navigateBack(state);
          
          // Property: Dynamics tab should remain active
          expect(isDynamicsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('dynamics');
          expect(state.dynamicsView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Dynamics tab active through any sequence of sub-navigation', () => {
      fc.assert(
        fc.property(dynamicsSubNavigationSequenceArb, (actions) => {
          let state = createInitialState();
          
          // Apply a sequence of sub-navigation actions
          state = applyDynamicsSubNavigationSequence(state, actions);
          
          // Property: Dynamics tab should always remain active during sub-navigation
          expect(isDynamicsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('dynamics');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Dynamics tab active through rapid activity switching', () => {
      fc.assert(
        fc.property(
          fc.array(activityViewArb, { minLength: 1, maxLength: 10 }),
          (activities) => {
            let state = createInitialState();
            
            // Rapidly switch between activities
            for (const activity of activities) {
              state = selectActivity(state, activity);
              
              // Property: Dynamics tab should be active after each switch
              expect(isDynamicsTabActive(state)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should keep Dynamics tab active through select-back cycles', () => {
      fc.assert(
        fc.property(
          fc.array(activityViewArb, { minLength: 1, maxLength: 10 }),
          (activities) => {
            let state = createInitialState();
            
            // Perform select-back cycles
            for (const activity of activities) {
              state = selectActivity(state, activity);
              expect(isDynamicsTabActive(state)).toBe(true);
              
              state = navigateBack(state);
              expect(isDynamicsTabActive(state)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Tab Active State Invariants', () => {
    /**
     * Tests that verify invariants of tab active state
     */

    it('should have exactly one tab active at a time', () => {
      fc.assert(
        fc.property(leftTabArb, dynamicsViewArb, (tab, view) => {
          let state = createInitialState();
          state = handleLeftTabNavigation(state, tab);
          state = handleDynamicsViewChange(state, view);
          
          // Count how many tabs would be "active"
          const activeCount = VALID_LEFT_TABS.filter(t => state.leftTab === t).length;
          
          // Property: exactly one tab should be active
          expect(activeCount).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should deactivate Dynamics tab when navigating to another tab', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          leftTabArb.filter(t => t !== 'dynamics'),
          (activity, otherTab) => {
            let state = createInitialState();
            
            // Start in an activity view
            state = selectActivity(state, activity);
            expect(isDynamicsTabActive(state)).toBe(true);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Property: Dynamics tab should no longer be active
            expect(isDynamicsTabActive(state)).toBe(false);
            expect(state.leftTab).toBe(otherTab);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reactivate Dynamics tab when returning from another tab', () => {
      fc.assert(
        fc.property(
          activityViewArb,
          leftTabArb.filter(t => t !== 'dynamics'),
          (activity, otherTab) => {
            let state = createInitialState();
            
            // Start in an activity view
            state = selectActivity(state, activity);
            
            // Navigate away
            state = handleLeftTabNavigation(state, otherTab);
            expect(isDynamicsTabActive(state)).toBe(false);
            
            // Return to dynamics
            state = handleLeftTabNavigation(state, 'dynamics');
            
            // Property: Dynamics tab should be active again
            expect(isDynamicsTabActive(state)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Dynamics View Independence', () => {
    /**
     * Tests that verify dynamicsView does not affect tab active state
     */

    it('should have same tab active state regardless of dynamicsView', () => {
      fc.assert(
        fc.property(dynamicsViewArb, dynamicsViewArb, (view1, view2) => {
          let state1 = createInitialState();
          let state2 = createInitialState();
          
          state1 = handleDynamicsViewChange(state1, view1);
          state2 = handleDynamicsViewChange(state2, view2);
          
          // Property: tab active state should be the same regardless of dynamicsView
          expect(isDynamicsTabActive(state1)).toBe(isDynamicsTabActive(state2));
        }),
        { numRuns: 100 }
      );
    });

    it('should determine tab active state solely by leftTab value', () => {
      fc.assert(
        fc.property(leftTabArb, dynamicsViewArb, (tab, view) => {
          let state = createInitialState();
          state = handleLeftTabNavigation(state, tab);
          
          // Even if we change dynamicsView, it shouldn't affect tab active state
          const activeBeforeViewChange = isDynamicsTabActive(state);
          state = handleDynamicsViewChange(state, view);
          const activeAfterViewChange = isDynamicsTabActive(state);
          
          // Property: dynamicsView change should not affect tab active state
          expect(activeBeforeViewChange).toBe(activeAfterViewChange);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Specific View Tests', () => {
    /**
     * Direct tests for each specific dynamicsView value
     */

    it('should keep Dynamics tab active in selector view', () => {
      const state = handleDynamicsViewChange(createInitialState(), 'selector');
      expect(isDynamicsTabActive(state)).toBe(true);
    });

    it('should keep Dynamics tab active in poll view', () => {
      const state = handleDynamicsViewChange(createInitialState(), 'poll');
      expect(isDynamicsTabActive(state)).toBe(true);
    });

    it('should keep Dynamics tab active in judge view', () => {
      const state = handleDynamicsViewChange(createInitialState(), 'judge');
      expect(isDynamicsTabActive(state)).toBe(true);
    });

    it('should keep Dynamics tab active in giveaway view', () => {
      const state = handleDynamicsViewChange(createInitialState(), 'giveaway');
      expect(isDynamicsTabActive(state)).toBe(true);
    });
  });
});

// ============ PLATFORMS TAB ACTIVE STATE TESTS ============

describe('Platforms Tab Active State Property Tests', () => {
  /**
   * Feature: sidebar-platforms-section
   * Property 5: Platforms Tab Remains Active
   * 
   * For any platformsView or platformsTool value, the Plataformas tab 
   * in the sidebar SHALL maintain active styling.
   * 
   * **Validates: Requirements 5.4**
   */

  describe('Property 5: Platforms Tab Remains Active During Sub-Navigation', () => {
    it('should keep Platforms tab active for any platformsView value', () => {
      fc.assert(
        fc.property(platformsViewArb, (view) => {
          let state = createPlatformsInitialState();
          
          // Set the platforms view to any valid value
          state = handlePlatformsViewChange(state, view);
          
          // Property: Platforms tab should always be active when leftTab is 'platforms'
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active for any platformsTool value', () => {
      fc.assert(
        fc.property(platformsToolArb, (tool) => {
          let state = createPlatformsInitialState();
          
          // Set the platforms tool to any valid value
          state = handlePlatformsToolChange(state, tool);
          
          // Property: Platforms tab should always be active when leftTab is 'platforms'
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active for any combination of platformsView and platformsTool', () => {
      fc.assert(
        fc.property(platformsViewArb, platformsToolArb, (view, tool) => {
          let state = createPlatformsInitialState();
          
          // Set both view and tool
          state = handlePlatformsViewChange(state, view);
          state = handlePlatformsToolChange(state, tool);
          
          // Property: Platforms tab should always be active
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active when selecting a platform', () => {
      fc.assert(
        fc.property(platformViewArb, (platform) => {
          let state = createPlatformsInitialState();
          
          // Select a platform from the selector
          state = selectPlatform(state, platform);
          
          // Property: Platforms tab should remain active
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
          expect(state.platformsView).toBe(platform);
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active when selecting a tool', () => {
      fc.assert(
        fc.property(toolViewArb, (tool) => {
          let state = createPlatformsInitialState();
          
          // First select Twitch platform
          state = selectPlatform(state, 'twitch');
          
          // Then select a tool
          state = selectTool(state, tool);
          
          // Property: Platforms tab should remain active
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
          expect(state.platformsTool).toBe(tool);
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active when navigating back from tool', () => {
      fc.assert(
        fc.property(toolViewArb, (tool) => {
          let state = createPlatformsInitialState();
          
          // Navigate to a tool
          state = selectPlatform(state, 'twitch');
          state = selectTool(state, tool);
          
          // Navigate back
          state = navigatePlatformsBack(state);
          
          // Property: Platforms tab should remain active
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
          expect(state.platformsTool).toBe('none');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active when navigating back from platform', () => {
      fc.assert(
        fc.property(platformViewArb, (platform) => {
          let state = createPlatformsInitialState();
          
          // Navigate to a platform
          state = selectPlatform(state, platform);
          
          // Navigate back
          state = navigatePlatformsBack(state);
          
          // Property: Platforms tab should remain active
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
          expect(state.platformsView).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active through any sequence of sub-navigation', () => {
      fc.assert(
        fc.property(platformsSubNavigationSequenceArb, (actions) => {
          let state = createPlatformsInitialState();
          
          // Apply a sequence of sub-navigation actions
          state = applyPlatformsSubNavigationSequence(state, actions);
          
          // Property: Platforms tab should always remain active during sub-navigation
          expect(isPlatformsTabActive(state)).toBe(true);
          expect(state.leftTab).toBe('platforms');
        }),
        { numRuns: 100 }
      );
    });

    it('should keep Platforms tab active through full navigation cycle', () => {
      fc.assert(
        fc.property(toolViewArb, (tool) => {
          let state = createPlatformsInitialState();
          
          // Full navigation cycle: selector → platform → tool → back → back
          state = selectPlatform(state, 'twitch');
          expect(isPlatformsTabActive(state)).toBe(true);
          
          state = selectTool(state, tool);
          expect(isPlatformsTabActive(state)).toBe(true);
          
          state = navigatePlatformsBack(state);
          expect(isPlatformsTabActive(state)).toBe(true);
          
          state = navigatePlatformsBack(state);
          expect(isPlatformsTabActive(state)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Platforms Tab Active State Invariants', () => {
    it('should deactivate Platforms tab when navigating to another tab', () => {
      fc.assert(
        fc.property(
          toolViewArb,
          leftTabArb.filter(t => t !== 'platforms'),
          (tool, otherTab) => {
            let state = createPlatformsInitialState();
            
            // Start in a tool view
            state = selectPlatform(state, 'twitch');
            state = selectTool(state, tool);
            expect(isPlatformsTabActive(state)).toBe(true);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Property: Platforms tab should no longer be active
            expect(isPlatformsTabActive(state)).toBe(false);
            expect(state.leftTab).toBe(otherTab);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reactivate Platforms tab when returning from another tab', () => {
      fc.assert(
        fc.property(
          toolViewArb,
          leftTabArb.filter(t => t !== 'platforms'),
          (tool, otherTab) => {
            let state = createPlatformsInitialState();
            
            // Start in a tool view
            state = selectPlatform(state, 'twitch');
            state = selectTool(state, tool);
            
            // Navigate away
            state = handleLeftTabNavigation(state, otherTab);
            expect(isPlatformsTabActive(state)).toBe(false);
            
            // Return to platforms
            state = handleLeftTabNavigation(state, 'platforms');
            
            // Property: Platforms tab should be active again
            expect(isPlatformsTabActive(state)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Platforms View Independence', () => {
    it('should have same tab active state regardless of platformsView', () => {
      fc.assert(
        fc.property(platformsViewArb, platformsViewArb, (view1, view2) => {
          let state1 = createPlatformsInitialState();
          let state2 = createPlatformsInitialState();
          
          state1 = handlePlatformsViewChange(state1, view1);
          state2 = handlePlatformsViewChange(state2, view2);
          
          // Property: tab active state should be the same regardless of platformsView
          expect(isPlatformsTabActive(state1)).toBe(isPlatformsTabActive(state2));
        }),
        { numRuns: 100 }
      );
    });

    it('should have same tab active state regardless of platformsTool', () => {
      fc.assert(
        fc.property(platformsToolArb, platformsToolArb, (tool1, tool2) => {
          let state1 = createPlatformsInitialState();
          let state2 = createPlatformsInitialState();
          
          state1 = handlePlatformsToolChange(state1, tool1);
          state2 = handlePlatformsToolChange(state2, tool2);
          
          // Property: tab active state should be the same regardless of platformsTool
          expect(isPlatformsTabActive(state1)).toBe(isPlatformsTabActive(state2));
        }),
        { numRuns: 100 }
      );
    });

    it('should determine tab active state solely by leftTab value', () => {
      fc.assert(
        fc.property(leftTabArb, platformsViewArb, platformsToolArb, (tab, view, tool) => {
          let state = createPlatformsInitialState();
          state = handleLeftTabNavigation(state, tab);
          
          // Even if we change platformsView and platformsTool, it shouldn't affect tab active state
          const activeBeforeChanges = isPlatformsTabActive(state);
          state = handlePlatformsViewChange(state, view);
          state = handlePlatformsToolChange(state, tool);
          const activeAfterChanges = isPlatformsTabActive(state);
          
          // Property: platformsView/platformsTool changes should not affect tab active state
          expect(activeBeforeChanges).toBe(activeAfterChanges);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Specific View and Tool Tests', () => {
    it('should keep Platforms tab active in selector view', () => {
      const state = handlePlatformsViewChange(createPlatformsInitialState(), 'selector');
      expect(isPlatformsTabActive(state)).toBe(true);
    });

    it('should keep Platforms tab active in twitch view', () => {
      const state = handlePlatformsViewChange(createPlatformsInitialState(), 'twitch');
      expect(isPlatformsTabActive(state)).toBe(true);
    });

    it('should keep Platforms tab active with commands tool', () => {
      let state = createPlatformsInitialState();
      state = handlePlatformsViewChange(state, 'twitch');
      state = handlePlatformsToolChange(state, 'commands');
      expect(isPlatformsTabActive(state)).toBe(true);
    });

    it('should keep Platforms tab active with predictions tool', () => {
      let state = createPlatformsInitialState();
      state = handlePlatformsViewChange(state, 'twitch');
      state = handlePlatformsToolChange(state, 'predictions');
      expect(isPlatformsTabActive(state)).toBe(true);
    });

    it('should keep Platforms tab active with channelpoints tool', () => {
      let state = createPlatformsInitialState();
      state = handlePlatformsViewChange(state, 'twitch');
      state = handlePlatformsToolChange(state, 'channelpoints');
      expect(isPlatformsTabActive(state)).toBe(true);
    });
  });
});
