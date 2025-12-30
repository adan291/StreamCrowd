/**
 * Property-based tests for PlatformsPanel component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the PlatformsPanel hierarchical navigation behavior.
 * 
 * Feature: sidebar-platforms-section
 * Property 4: Hierarchical Back Navigation
 * @validates Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PlatformsView, PlatformsTool } from '../../types';
import { PLATFORMS, TWITCH_TOOLS } from '../../config/platforms';

// ============ TYPES ============

interface NavigationState {
  view: PlatformsView;
  tool: PlatformsTool;
}

type NavigationAction =
  | { type: 'selectPlatform'; platformId: string }
  | { type: 'selectTool'; toolId: string }
  | { type: 'back' };

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Determines the navigation level based on current state
 * Level 1: Platform Selector (view === 'selector')
 * Level 2: Tool Selector (view !== 'selector' && tool === 'none')
 * Level 3: Tool Panel (view !== 'selector' && tool !== 'none')
 */
function getNavigationLevel(state: NavigationState): 1 | 2 | 3 {
  if (state.view === 'selector') {
    return 1;
  }
  if (state.tool === 'none') {
    return 2;
  }
  return 3;
}

/**
 * Simulates back navigation based on current state
 * - From tool panel (level 3) → tool selector (level 2)
 * - From tool selector (level 2) → platform selector (level 1)
 * - From platform selector (level 1) → no change (parent handles)
 */
function simulateBackNavigation(state: NavigationState): NavigationState {
  const level = getNavigationLevel(state);
  
  if (level === 3) {
    // From tool panel, go back to tool selector
    return { view: state.view, tool: 'none' };
  }
  if (level === 2) {
    // From tool selector, go back to platform selector
    return { view: 'selector', tool: 'none' };
  }
  // Level 1: already at platform selector, no change
  return state;
}

/**
 * Simulates platform selection
 * Platform selection only works when at level 1 (platform selector)
 */
function simulatePlatformSelection(
  state: NavigationState,
  platformId: string
): NavigationState {
  // Can only select platforms when at platform selector (level 1)
  if (state.view !== 'selector') {
    return state;
  }
  
  const platform = PLATFORMS.find(p => p.id === platformId);
  if (platform && platform.enabled && !platform.comingSoon) {
    return { view: platformId as PlatformsView, tool: 'none' };
  }
  return state;
}

/**
 * Simulates tool selection
 * Tool selection only works when at level 2 (tool selector)
 */
function simulateToolSelection(
  state: NavigationState,
  toolId: string
): NavigationState {
  // Can only select tools when at tool selector (level 2)
  if (state.view === 'selector' || state.tool !== 'none') {
    return state;
  }
  
  const tool = TWITCH_TOOLS.find(t => t.id === toolId);
  if (tool && tool.enabled && !tool.comingSoon) {
    return { view: state.view, tool: toolId as PlatformsTool };
  }
  return state;
}

/**
 * Applies a navigation action to the current state
 */
function applyNavigationAction(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'selectPlatform':
      return simulatePlatformSelection(state, action.platformId);
    case 'selectTool':
      return simulateToolSelection(state, action.toolId);
    case 'back':
      return simulateBackNavigation(state);
    default:
      return state;
  }
}

/**
 * Applies a sequence of navigation actions
 */
function applyNavigationSequence(
  initialState: NavigationState,
  actions: NavigationAction[]
): NavigationState {
  return actions.reduce(applyNavigationAction, initialState);
}

/**
 * Validates that a state is valid
 */
function isValidState(state: NavigationState): boolean {
  const validViews: PlatformsView[] = ['selector', 'twitch'];
  const validTools: PlatformsTool[] = ['none', 'commands', 'predictions', 'channelpoints'];
  
  if (!validViews.includes(state.view)) return false;
  if (!validTools.includes(state.tool)) return false;
  
  // If view is selector, tool must be none
  if (state.view === 'selector' && state.tool !== 'none') return false;
  
  return true;
}

/**
 * Determines if back button should be visible
 */
function shouldShowBackButton(state: NavigationState): boolean {
  return getNavigationLevel(state) > 1;
}

// ============ ARBITRARIES ============

const platformIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...PLATFORMS.map(p => p.id)
);

const enabledPlatformIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...PLATFORMS.filter(p => p.enabled && !p.comingSoon).map(p => p.id)
);

const toolIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...TWITCH_TOOLS.map(t => t.id)
);

const enabledToolIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...TWITCH_TOOLS.filter(t => t.enabled && !t.comingSoon).map(t => t.id)
);

const platformsViewArb: fc.Arbitrary<PlatformsView> = fc.constantFrom(
  'selector',
  'twitch'
);

const platformsToolArb: fc.Arbitrary<PlatformsTool> = fc.constantFrom(
  'none',
  'commands',
  'predictions',
  'channelpoints'
);

const validNavigationStateArb: fc.Arbitrary<NavigationState> = fc.oneof(
  // Level 1: Platform selector
  fc.constant({ view: 'selector' as PlatformsView, tool: 'none' as PlatformsTool }),
  // Level 2: Tool selector (Twitch)
  fc.constant({ view: 'twitch' as PlatformsView, tool: 'none' as PlatformsTool }),
  // Level 3: Tool panel (commands only for now)
  fc.constant({ view: 'twitch' as PlatformsView, tool: 'commands' as PlatformsTool })
);

const navigationActionArb: fc.Arbitrary<NavigationAction> = fc.oneof(
  fc.record({ type: fc.constant('back' as const) }),
  enabledPlatformIdArb.map(platformId => ({ type: 'selectPlatform' as const, platformId })),
  enabledToolIdArb.map(toolId => ({ type: 'selectTool' as const, toolId }))
);

const navigationSequenceArb = fc.array(navigationActionArb, { minLength: 1, maxLength: 20 });

// ============ TESTS ============

describe('PlatformsPanel Property Tests', () => {
  describe('Property 4: Hierarchical Back Navigation', () => {
    /**
     * Feature: sidebar-platforms-section, Property 4: Hierarchical Back Navigation
     * 
     * For any navigation depth (tool panel → tool selector → platform selector), 
     * clicking the back button SHALL return to the previous level in the hierarchy.
     * 
     * **Validates: Requirements 5.1, 5.2, 5.3**
     */

    it('should return to tool selector when back is clicked from tool panel', () => {
      fc.assert(
        fc.property(enabledToolIdArb, (toolId) => {
          // Start at level 3 (tool panel)
          const state: NavigationState = { view: 'twitch', tool: toolId as PlatformsTool };
          const newState = simulateBackNavigation(state);

          // Property: back from tool panel should go to tool selector (level 2)
          expect(getNavigationLevel(newState)).toBe(2);
          expect(newState.view).toBe('twitch');
          expect(newState.tool).toBe('none');
        }),
        { numRuns: 100 }
      );
    });

    it('should return to platform selector when back is clicked from tool selector', () => {
      // Start at level 2 (tool selector)
      const state: NavigationState = { view: 'twitch', tool: 'none' };
      const newState = simulateBackNavigation(state);

      // Property: back from tool selector should go to platform selector (level 1)
      expect(getNavigationLevel(newState)).toBe(1);
      expect(newState.view).toBe('selector');
      expect(newState.tool).toBe('none');
    });

    it('should stay at platform selector when back is clicked from platform selector', () => {
      // Start at level 1 (platform selector)
      const state: NavigationState = { view: 'selector', tool: 'none' };
      const newState = simulateBackNavigation(state);

      // Property: back from platform selector should not change state
      expect(getNavigationLevel(newState)).toBe(1);
      expect(newState.view).toBe('selector');
      expect(newState.tool).toBe('none');
    });

    it('should decrease navigation level by exactly 1 when back is clicked (except at level 1)', () => {
      fc.assert(
        fc.property(validNavigationStateArb, (state) => {
          const levelBefore = getNavigationLevel(state);
          const newState = simulateBackNavigation(state);
          const levelAfter = getNavigationLevel(newState);

          // Property: back should decrease level by 1, or stay at 1
          if (levelBefore === 1) {
            expect(levelAfter).toBe(1);
          } else {
            expect(levelAfter).toBe(levelBefore - 1);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should eventually reach platform selector after enough back clicks', () => {
      fc.assert(
        fc.property(validNavigationStateArb, (initialState) => {
          let state = initialState;
          
          // Click back up to 3 times (max depth is 3)
          for (let i = 0; i < 3; i++) {
            state = simulateBackNavigation(state);
          }

          // Property: after 3 back clicks, should be at platform selector
          expect(getNavigationLevel(state)).toBe(1);
          expect(state.view).toBe('selector');
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain valid state after any navigation sequence', () => {
      fc.assert(
        fc.property(validNavigationStateArb, navigationSequenceArb, (initialState, actions) => {
          const finalState = applyNavigationSequence(initialState, actions);

          // Property: final state should always be valid
          expect(isValidState(finalState)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should end at platform selector if last actions are multiple backs', () => {
      fc.assert(
        fc.property(
          validNavigationStateArb,
          fc.array(navigationActionArb, { minLength: 0, maxLength: 10 }),
          (initialState, actions) => {
            // Apply the random actions first, then add 3 back actions at the end
            const intermediateState = applyNavigationSequence(initialState, actions);
            
            // Now apply 3 back actions
            let finalState = intermediateState;
            finalState = simulateBackNavigation(finalState);
            finalState = simulateBackNavigation(finalState);
            finalState = simulateBackNavigation(finalState);

            // Property: after 3 backs from any state, should be at platform selector
            expect(finalState.view).toBe('selector');
            expect(finalState.tool).toBe('none');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Back Button Visibility', () => {
    /**
     * Tests that verify back button visibility based on navigation level
     */

    it('should not show back button at platform selector (level 1)', () => {
      const state: NavigationState = { view: 'selector', tool: 'none' };
      expect(shouldShowBackButton(state)).toBe(false);
    });

    it('should show back button at tool selector (level 2)', () => {
      const state: NavigationState = { view: 'twitch', tool: 'none' };
      expect(shouldShowBackButton(state)).toBe(true);
    });

    it('should show back button at tool panel (level 3)', () => {
      const state: NavigationState = { view: 'twitch', tool: 'commands' };
      expect(shouldShowBackButton(state)).toBe(true);
    });

    it('should show back button for any state above level 1', () => {
      fc.assert(
        fc.property(validNavigationStateArb, (state) => {
          const level = getNavigationLevel(state);
          const showBack = shouldShowBackButton(state);

          // Property: back button visible iff level > 1
          expect(showBack).toBe(level > 1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Navigation Level Invariants', () => {
    /**
     * Tests that verify navigation level calculation invariants
     */

    it('should correctly identify level 1 (platform selector)', () => {
      const state: NavigationState = { view: 'selector', tool: 'none' };
      expect(getNavigationLevel(state)).toBe(1);
    });

    it('should correctly identify level 2 (tool selector)', () => {
      const state: NavigationState = { view: 'twitch', tool: 'none' };
      expect(getNavigationLevel(state)).toBe(2);
    });

    it('should correctly identify level 3 (tool panel)', () => {
      const state: NavigationState = { view: 'twitch', tool: 'commands' };
      expect(getNavigationLevel(state)).toBe(3);
    });

    it('should have level between 1 and 3 for any valid state', () => {
      fc.assert(
        fc.property(validNavigationStateArb, (state) => {
          const level = getNavigationLevel(state);

          // Property: level should be 1, 2, or 3
          expect(level).toBeGreaterThanOrEqual(1);
          expect(level).toBeLessThanOrEqual(3);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Platform Selection Navigation', () => {
    /**
     * Tests that verify platform selection behavior
     */

    it('should navigate to tool selector when enabled platform is selected', () => {
      fc.assert(
        fc.property(enabledPlatformIdArb, (platformId) => {
          const state: NavigationState = { view: 'selector', tool: 'none' };
          const newState = simulatePlatformSelection(state, platformId);

          // Property: selecting enabled platform should navigate to tool selector
          expect(newState.view).toBe(platformId);
          expect(newState.tool).toBe('none');
          expect(getNavigationLevel(newState)).toBe(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should not navigate when disabled platform is selected', () => {
      const disabledPlatforms = PLATFORMS.filter(p => !p.enabled || p.comingSoon);
      
      for (const platform of disabledPlatforms) {
        const state: NavigationState = { view: 'selector', tool: 'none' };
        const newState = simulatePlatformSelection(state, platform.id);

        // Property: selecting disabled platform should not change state
        expect(newState).toEqual(state);
      }
    });
  });

  describe('Tool Selection Navigation', () => {
    /**
     * Tests that verify tool selection behavior
     */

    it('should navigate to tool panel when enabled tool is selected', () => {
      fc.assert(
        fc.property(enabledToolIdArb, (toolId) => {
          const state: NavigationState = { view: 'twitch', tool: 'none' };
          const newState = simulateToolSelection(state, toolId);

          // Property: selecting enabled tool should navigate to tool panel
          expect(newState.view).toBe('twitch');
          expect(newState.tool).toBe(toolId);
          expect(getNavigationLevel(newState)).toBe(3);
        }),
        { numRuns: 100 }
      );
    });

    it('should not navigate when coming soon tool is selected', () => {
      const comingSoonTools = TWITCH_TOOLS.filter(t => t.comingSoon);
      
      for (const tool of comingSoonTools) {
        const state: NavigationState = { view: 'twitch', tool: 'none' };
        const newState = simulateToolSelection(state, tool.id);

        // Property: selecting coming soon tool should not change state
        expect(newState).toEqual(state);
      }
    });
  });

  describe('Full Navigation Flow', () => {
    /**
     * Tests that verify complete navigation flows
     */

    it('should complete full navigation cycle: selector → platform → tool → back → back', () => {
      // Start at platform selector
      let state: NavigationState = { view: 'selector', tool: 'none' };
      expect(getNavigationLevel(state)).toBe(1);

      // Select Twitch platform
      state = simulatePlatformSelection(state, 'twitch');
      expect(getNavigationLevel(state)).toBe(2);
      expect(state.view).toBe('twitch');

      // Select Commands tool
      state = simulateToolSelection(state, 'commands');
      expect(getNavigationLevel(state)).toBe(3);
      expect(state.tool).toBe('commands');

      // Back to tool selector
      state = simulateBackNavigation(state);
      expect(getNavigationLevel(state)).toBe(2);
      expect(state.tool).toBe('none');

      // Back to platform selector
      state = simulateBackNavigation(state);
      expect(getNavigationLevel(state)).toBe(1);
      expect(state.view).toBe('selector');
    });

    it('should handle rapid navigation cycles', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (cycles) => {
            let state: NavigationState = { view: 'selector', tool: 'none' };

            for (let i = 0; i < cycles; i++) {
              // Navigate down
              state = simulatePlatformSelection(state, 'twitch');
              state = simulateToolSelection(state, 'commands');
              
              // Navigate back up
              state = simulateBackNavigation(state);
              state = simulateBackNavigation(state);
            }

            // Property: after complete cycles, should be back at selector
            expect(state.view).toBe('selector');
            expect(state.tool).toBe('none');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
