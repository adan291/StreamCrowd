/**
 * Property-based tests for Platforms State Persistence
 * 
 * Uses fast-check for property-based testing to validate that platforms navigation state
 * is properly managed during tab switches and tool navigation.
 * 
 * Feature: sidebar-platforms-section
 * Property 6: State Persistence During Navigation
 * @validates Requirements 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LeftTab, PlatformsView, PlatformsTool } from '../../types';
import { PLATFORMS, TWITCH_TOOLS } from '../../config/platforms';

// ============ PURE FUNCTIONS FOR TESTING ============

const VALID_LEFT_TABS: LeftTab[] = ['dynamics', 'games', 'platforms', 'obs', 'gallery', 'data'];
const VALID_PLATFORMS_VIEWS: PlatformsView[] = ['selector', 'twitch'];
const VALID_PLATFORMS_TOOLS: PlatformsTool[] = ['none', 'commands', 'predictions', 'channelpoints'];

/**
 * Simulates the platforms navigation state manager as implemented in App.tsx
 */
interface PlatformsNavigationState {
  leftTab: LeftTab;
  platformsView: PlatformsView;
  platformsTool: PlatformsTool;
  // Simulated in-progress data for tool panels (e.g., CommandPanel data)
  toolData: {
    commands: { hasData: boolean; data?: unknown };
    predictions: { hasData: boolean; data?: unknown };
    channelpoints: { hasData: boolean; data?: unknown };
  };
}

/**
 * Creates initial platforms navigation state
 */
function createInitialState(): PlatformsNavigationState {
  return {
    leftTab: 'platforms',
    platformsView: 'selector',
    platformsTool: 'none',
    toolData: {
      commands: { hasData: false },
      predictions: { hasData: false },
      channelpoints: { hasData: false },
    },
  };
}

/**
 * Handles platform navigation - changes platformsView
 * Validates the platform and only navigates if enabled
 * @requirements 5.2, 5.3
 */
function handlePlatformNavigation(
  state: PlatformsNavigationState,
  platformId: string
): PlatformsNavigationState {
  const platform = PLATFORMS.find(p => p.id === platformId);
  if (!platform || !platform.enabled) {
    // Invalid or disabled platform - no change
    return state;
  }
  
  return {
    ...state,
    platformsView: platformId as PlatformsView,
  };
}

/**
 * Handles tool navigation - changes platformsTool
 * Validates the tool and only navigates if enabled and not coming soon
 * @requirements 5.2, 5.3
 */
function handleToolNavigation(
  state: PlatformsNavigationState,
  toolId: string
): PlatformsNavigationState {
  const tool = TWITCH_TOOLS.find(t => t.id === toolId);
  if (!tool || !tool.enabled || tool.comingSoon) {
    // Invalid, disabled, or coming soon tool - no change
    return state;
  }
  
  return {
    ...state,
    platformsTool: toolId as PlatformsTool,
  };
}

/**
 * Handles platforms back navigation
 * From tool panel → tool selector, from tool selector → platform selector
 * @requirements 5.2, 5.3
 */
function handlePlatformsBack(state: PlatformsNavigationState): PlatformsNavigationState {
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

/**
 * Handles left tab navigation
 * When navigating away from platforms, resets platformsView and platformsTool
 */
function handleLeftTabNavigation(
  state: PlatformsNavigationState,
  tab: LeftTab
): PlatformsNavigationState {
  const newState = {
    ...state,
    leftTab: tab,
  };
  
  // Reset platforms state when leaving platforms tab
  if (tab !== 'platforms') {
    newState.platformsView = 'selector';
    newState.platformsTool = 'none';
  }
  
  return newState;
}

/**
 * Combined handler for PlatformsPanel navigation
 */
function handlePlatformsPanelNavigate(
  state: PlatformsNavigationState,
  view: PlatformsView,
  tool?: PlatformsTool
): PlatformsNavigationState {
  return {
    ...state,
    platformsView: view,
    platformsTool: tool || 'none',
  };
}

/**
 * Simulates adding in-progress data to a tool panel
 */
function addToolData(
  state: PlatformsNavigationState,
  tool: Exclude<PlatformsTool, 'none'>,
  data: unknown
): PlatformsNavigationState {
  return {
    ...state,
    toolData: {
      ...state.toolData,
      [tool]: { hasData: true, data },
    },
  };
}

/**
 * Checks if tool data is preserved
 */
function isToolDataPreserved(
  state: PlatformsNavigationState,
  tool: Exclude<PlatformsTool, 'none'>
): boolean {
  return state.toolData[tool].hasData;
}

// ============ ARBITRARIES ============

const leftTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(...VALID_LEFT_TABS);

const nonPlatformsTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(
  'dynamics', 'games', 'obs', 'gallery', 'data'
);

const platformsViewArb: fc.Arbitrary<PlatformsView> = fc.constantFrom(...VALID_PLATFORMS_VIEWS);

const platformsToolArb: fc.Arbitrary<PlatformsTool> = fc.constantFrom(...VALID_PLATFORMS_TOOLS);

const enabledToolArb: fc.Arbitrary<Exclude<PlatformsTool, 'none'>> = fc.constantFrom('commands');

const toolWithDataArb: fc.Arbitrary<Exclude<PlatformsTool, 'none'>> = fc.constantFrom(
  'commands', 'predictions', 'channelpoints'
);

// Navigation action types
type PlatformsNavigationAction = 
  | { type: 'setLeftTab'; tab: LeftTab }
  | { type: 'setPlatformsView'; view: PlatformsView }
  | { type: 'setPlatformsTool'; tool: PlatformsTool }
  | { type: 'navigateBack' }
  | { type: 'addToolData'; tool: Exclude<PlatformsTool, 'none'>; data: unknown };

const navigationActionArb: fc.Arbitrary<PlatformsNavigationAction> = fc.oneof(
  leftTabArb.map(tab => ({ type: 'setLeftTab' as const, tab })),
  platformsViewArb.map(view => ({ type: 'setPlatformsView' as const, view })),
  platformsToolArb.map(tool => ({ type: 'setPlatformsTool' as const, tool })),
  fc.constant({ type: 'navigateBack' as const }),
  fc.tuple(toolWithDataArb, fc.anything()).map(([tool, data]) => ({
    type: 'addToolData' as const,
    tool,
    data,
  }))
);

const navigationSequenceArb = fc.array(navigationActionArb, { minLength: 1, maxLength: 20 });

// ============ HELPER FUNCTIONS ============

/**
 * Applies a sequence of navigation actions to a state
 */
function applyNavigationSequence(
  initialState: PlatformsNavigationState,
  actions: PlatformsNavigationAction[]
): PlatformsNavigationState {
  let state = initialState;
  
  for (const action of actions) {
    switch (action.type) {
      case 'setLeftTab':
        state = handleLeftTabNavigation(state, action.tab);
        break;
      case 'setPlatformsView':
        state = handlePlatformsPanelNavigate(state, action.view, state.platformsTool);
        break;
      case 'setPlatformsTool':
        state = handlePlatformsPanelNavigate(state, state.platformsView, action.tool);
        break;
      case 'navigateBack':
        state = handlePlatformsBack(state);
        break;
      case 'addToolData':
        state = addToolData(state, action.tool, action.data);
        break;
    }
  }
  
  return state;
}

// ============ TESTS ============

describe('Platforms State Persistence Property Tests', () => {
  describe('Property 6: State Persistence During Navigation', () => {
    /**
     * Feature: sidebar-platforms-section, Property 6: State Persistence During Navigation
     * 
     * For any sequence of navigation within Plataformas, the data in CommandPanel 
     * (or other tool panels) SHALL be preserved when navigating away and back.
     * 
     * **Validates: Requirements 4.3, 4.4**
     */

    it('should preserve tool data when navigating to another tab and back', () => {
      fc.assert(
        fc.property(
          toolWithDataArb,
          nonPlatformsTabArb,
          fc.anything(),
          (tool, otherTab, testData) => {
            let state = createInitialState();
            
            // Navigate to a tool and add data
            state = handlePlatformsPanelNavigate(state, 'twitch', tool);
            state = addToolData(state, tool, testData);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Navigate back to platforms
            state = handleLeftTabNavigation(state, 'platforms');
            
            // Property: tool data should be preserved
            expect(isToolDataPreserved(state, tool)).toBe(true);
            expect(state.toolData[tool].data).toEqual(testData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset platformsView and platformsTool when returning to platforms tab', () => {
      fc.assert(
        fc.property(
          enabledToolArb,
          nonPlatformsTabArb,
          (tool, otherTab) => {
            let state = createInitialState();
            
            // Navigate to a tool
            state = handlePlatformsPanelNavigate(state, 'twitch', tool);
            expect(state.platformsView).toBe('twitch');
            expect(state.platformsTool).toBe(tool);
            
            // Navigate to another tab
            state = handleLeftTabNavigation(state, otherTab);
            
            // Navigate back to platforms
            state = handleLeftTabNavigation(state, 'platforms');
            
            // Property: platformsView and platformsTool should be reset
            expect(state.platformsView).toBe('selector');
            expect(state.platformsTool).toBe('none');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data for all tools independently', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.anything(),
          fc.anything(),
          (commandsData, predictionsData, channelpointsData) => {
            let state = createInitialState();
            
            // Add data to all tools
            state = addToolData(state, 'commands', commandsData);
            state = addToolData(state, 'predictions', predictionsData);
            state = addToolData(state, 'channelpoints', channelpointsData);
            
            // Navigate away and back multiple times
            state = handleLeftTabNavigation(state, 'games');
            state = handleLeftTabNavigation(state, 'platforms');
            state = handleLeftTabNavigation(state, 'obs');
            state = handleLeftTabNavigation(state, 'platforms');
            
            // Property: all tool data should be preserved
            expect(state.toolData.commands.data).toEqual(commandsData);
            expect(state.toolData.predictions.data).toEqual(predictionsData);
            expect(state.toolData.channelpoints.data).toEqual(channelpointsData);
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
          expect(VALID_LEFT_TABS).toContain(finalState.leftTab);
          expect(VALID_PLATFORMS_VIEWS).toContain(finalState.platformsView);
          expect(VALID_PLATFORMS_TOOLS).toContain(finalState.platformsTool);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Hierarchical Back Navigation', () => {
    /**
     * Tests for Property 4: Hierarchical Back Navigation
     * From tool panel → tool selector, from tool selector → platform selector
     */

    it('should navigate back from tool panel to tool selector', () => {
      fc.assert(
        fc.property(enabledToolArb, (tool) => {
          let state = createInitialState();
          
          // Navigate to a tool
          state = handlePlatformsPanelNavigate(state, 'twitch', tool);
          expect(state.platformsView).toBe('twitch');
          expect(state.platformsTool).toBe(tool);
          
          // Navigate back
          state = handlePlatformsBack(state);
          
          // Property: should be at tool selector (platformsTool = 'none')
          expect(state.platformsView).toBe('twitch');
          expect(state.platformsTool).toBe('none');
        }),
        { numRuns: 100 }
      );
    });

    it('should navigate back from tool selector to platform selector', () => {
      let state = createInitialState();
      
      // Navigate to Twitch tool selector
      state = handlePlatformsPanelNavigate(state, 'twitch', 'none');
      expect(state.platformsView).toBe('twitch');
      expect(state.platformsTool).toBe('none');
      
      // Navigate back
      state = handlePlatformsBack(state);
      
      // Property: should be at platform selector
      expect(state.platformsView).toBe('selector');
      expect(state.platformsTool).toBe('none');
    });

    it('should not change state when at platform selector and navigating back', () => {
      let state = createInitialState();
      
      // Already at platform selector
      expect(state.platformsView).toBe('selector');
      expect(state.platformsTool).toBe('none');
      
      // Navigate back (should have no effect)
      const newState = handlePlatformsBack(state);
      
      // Property: state should remain unchanged
      expect(newState.platformsView).toBe('selector');
      expect(newState.platformsTool).toBe('none');
    });
  });

  describe('Platform Navigation Validation', () => {
    /**
     * Tests that platform navigation validates platform availability
     */

    it('should only navigate to enabled platforms', () => {
      let state = createInitialState();
      
      // Navigate to Twitch (enabled)
      state = handlePlatformNavigation(state, 'twitch');
      expect(state.platformsView).toBe('twitch');
      
      // Try to navigate to non-existent platform
      const stateAfterInvalid = handlePlatformNavigation(state, 'nonexistent');
      expect(stateAfterInvalid.platformsView).toBe('twitch'); // Should not change
    });

    it('should not navigate to disabled platforms', () => {
      let state = createInitialState();
      
      // Try to navigate to a disabled platform (if any exist in config)
      const disabledPlatform = PLATFORMS.find(p => !p.enabled);
      if (disabledPlatform) {
        state = handlePlatformNavigation(state, disabledPlatform.id);
        expect(state.platformsView).toBe('selector'); // Should not change
      }
    });
  });

  describe('Tool Navigation Validation', () => {
    /**
     * Tests that tool navigation validates tool availability
     */

    it('should only navigate to enabled tools', () => {
      let state = createInitialState();
      state = handlePlatformsPanelNavigate(state, 'twitch', 'none');
      
      // Navigate to commands (enabled)
      state = handleToolNavigation(state, 'commands');
      expect(state.platformsTool).toBe('commands');
    });

    it('should navigate to predictions tool (now implemented)', () => {
      let state = createInitialState();
      state = handlePlatformsPanelNavigate(state, 'twitch', 'none');
      
      // Navigate to predictions (now implemented)
      const stateAfterPredictions = handleToolNavigation(state, 'predictions');
      expect(stateAfterPredictions.platformsTool).toBe('predictions'); // Should navigate successfully
    });

    it('should not navigate to non-existent tools', () => {
      let state = createInitialState();
      state = handlePlatformsPanelNavigate(state, 'twitch', 'none');
      
      // Try to navigate to non-existent tool
      const stateAfterInvalid = handleToolNavigation(state, 'nonexistent');
      expect(stateAfterInvalid.platformsTool).toBe('none'); // Should not change
    });
  });

  describe('Tool Data Persistence Invariants', () => {
    /**
     * Tests that verify tool data is properly preserved
     */

    it('should preserve tool data through multiple tab switches', () => {
      fc.assert(
        fc.property(
          toolWithDataArb,
          fc.array(leftTabArb, { minLength: 1, maxLength: 10 }),
          fc.anything(),
          (tool, tabSequence, testData) => {
            let state = createInitialState();
            
            // Add data to tool
            state = addToolData(state, tool, testData);
            
            // Navigate through multiple tabs
            for (const tab of tabSequence) {
              state = handleLeftTabNavigation(state, tab);
            }
            
            // Property: tool data should still be preserved
            expect(isToolDataPreserved(state, tool)).toBe(true);
            expect(state.toolData[tool].data).toEqual(testData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other tools when adding data to one', () => {
      fc.assert(
        fc.property(toolWithDataArb, fc.anything(), (tool, testData) => {
          let state = createInitialState();
          
          // Add data to one tool
          state = addToolData(state, tool, testData);
          
          // Property: other tools should not be affected
          const otherTools = (['commands', 'predictions', 'channelpoints'] as const)
            .filter(t => t !== tool);
          
          for (const other of otherTools) {
            expect(state.toolData[other].hasData).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
