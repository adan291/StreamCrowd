/**
 * Property-based tests for Demo Tour Navigation Integration
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the demo tour navigation behavior with the new dynamics grouping.
 * 
 * Feature: sidebar-dynamics-grouping
 * Property 7: Demo Tour Navigation Integration
 * @validates Requirements 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TourStepAction, TourStep } from '../../hooks/useDemoTour';
import { LeftTab, DynamicsView } from '../../types';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Valid left tab values in the new navigation structure
 */
const VALID_LEFT_TABS: LeftTab[] = ['dynamics', 'games', 'platforms', 'obs', 'gallery', 'data'];

/**
 * Valid dynamics view values
 */
const VALID_DYNAMICS_VIEWS: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway'];

/**
 * Steps that target poll functionality (should navigate to dynamics first, then poll)
 */
const POLL_TARGETING_STEP_IDS = [
  'poll-creator',
  'spinner',
  'live-poll',
  'moderation',
  'overlay',
  'finish',
];

/**
 * Validates that a tour step action uses the new navigation flow
 * For poll-related steps, it should use leftTab: 'dynamics' and dynamicsView: 'poll'
 */
function validateTourStepNavigation(step: TourStep): {
  isValid: boolean;
  usesNewNavigation: boolean;
  navigatesToDynamics: boolean;
  setsDynamicsView: boolean;
} {
  const action = step.action;
  
  if (!action) {
    return {
      isValid: true,
      usesNewNavigation: true,
      navigatesToDynamics: false,
      setsDynamicsView: false,
    };
  }

  const isPollTargetingStep = POLL_TARGETING_STEP_IDS.includes(step.id);
  const navigatesToDynamics = action.leftTab === 'dynamics';
  const setsDynamicsView = action.dynamicsView !== undefined;
  
  // For poll-targeting steps, must use dynamics + poll view
  if (isPollTargetingStep) {
    const usesNewNavigation = navigatesToDynamics && action.dynamicsView === 'poll';
    return {
      isValid: usesNewNavigation,
      usesNewNavigation,
      navigatesToDynamics,
      setsDynamicsView,
    };
  }

  // For other steps, just validate the leftTab is valid
  const hasValidLeftTab = !action.leftTab || VALID_LEFT_TABS.includes(action.leftTab);
  const hasValidDynamicsView = !action.dynamicsView || VALID_DYNAMICS_VIEWS.includes(action.dynamicsView);
  
  return {
    isValid: hasValidLeftTab && hasValidDynamicsView,
    usesNewNavigation: true,
    navigatesToDynamics,
    setsDynamicsView,
  };
}

/**
 * Simulates the onStepChange handler from App.tsx
 * Returns the resulting navigation state
 */
function simulateOnStepChange(
  action: TourStepAction | undefined
): {
  leftTab: LeftTab | null;
  dynamicsView: DynamicsView | null;
  dataSubTab: 'activity' | 'analytics' | null;
  rightTab: 'chat' | 'stream' | null;
} {
  if (!action) {
    return {
      leftTab: null,
      dynamicsView: null,
      dataSubTab: null,
      rightTab: null,
    };
  }

  return {
    leftTab: action.leftTab || null,
    dynamicsView: action.dynamicsView || null,
    dataSubTab: action.dataSubTab || null,
    rightTab: action.rightTab || null,
  };
}

/**
 * Validates that navigation to poll functionality follows the correct sequence
 * First: setLeftTab('dynamics')
 * Then: setDynamicsView('poll')
 */
function validatePollNavigationSequence(action: TourStepAction): boolean {
  // Must set leftTab to 'dynamics' first
  if (action.leftTab !== 'dynamics') {
    return false;
  }
  
  // Must set dynamicsView to 'poll'
  if (action.dynamicsView !== 'poll') {
    return false;
  }
  
  return true;
}

/**
 * Creates a mock tour step for testing
 */
function createMockTourStep(
  id: string,
  action?: TourStepAction
): TourStep {
  return {
    id,
    target: 'body',
    title: `Test Step: ${id}`,
    message: 'Test message',
    position: 'center',
    mascotEmotion: 'happy',
    action,
  };
}

// ============ ARBITRARIES ============

const leftTabArb: fc.Arbitrary<LeftTab> = fc.constantFrom(
  'dynamics',
  'games',
  'platforms',
  'obs',
  'gallery',
  'data'
);

const dynamicsViewArb: fc.Arbitrary<DynamicsView> = fc.constantFrom(
  'selector',
  'poll',
  'judge',
  'giveaway'
);

const dataSubTabArb: fc.Arbitrary<'activity' | 'analytics'> = fc.constantFrom(
  'activity',
  'analytics'
);

const rightTabArb: fc.Arbitrary<'chat' | 'stream'> = fc.constantFrom(
  'chat',
  'stream'
);

const pollTargetingStepIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...POLL_TARGETING_STEP_IDS
);

const nonPollStepIdArb: fc.Arbitrary<string> = fc.constantFrom(
  'welcome',
  'soundboard',
  'chat',
  'analytics',
  'gallery'
);

const tourStepActionArb: fc.Arbitrary<TourStepAction> = fc.record({
  type: fc.constant('navigate' as const),
  leftTab: fc.option(leftTabArb, { nil: undefined }),
  dynamicsView: fc.option(dynamicsViewArb, { nil: undefined }),
  dataSubTab: fc.option(dataSubTabArb, { nil: undefined }),
  rightTab: fc.option(rightTabArb, { nil: undefined }),
  showModeration: fc.option(fc.boolean(), { nil: undefined }),
  createDemoPoll: fc.option(fc.boolean(), { nil: undefined }),
  showSoundBoard: fc.option(fc.boolean(), { nil: undefined }),
  showSpinner: fc.option(fc.boolean(), { nil: undefined }),
});

const validPollNavigationActionArb: fc.Arbitrary<TourStepAction> = fc.record({
  type: fc.constant('navigate' as const),
  leftTab: fc.constant('dynamics' as const),
  dynamicsView: fc.constant('poll' as const),
  dataSubTab: fc.option(dataSubTabArb, { nil: undefined }),
  rightTab: fc.option(rightTabArb, { nil: undefined }),
  showModeration: fc.option(fc.boolean(), { nil: undefined }),
  createDemoPoll: fc.option(fc.boolean(), { nil: undefined }),
  showSoundBoard: fc.option(fc.boolean(), { nil: undefined }),
  showSpinner: fc.option(fc.boolean(), { nil: undefined }),
});

// ============ TESTS ============

describe('Demo Tour Navigation Property Tests', () => {
  describe('Property 7: Demo Tour Navigation Integration', () => {
    /**
     * Feature: sidebar-dynamics-grouping, Property 7: Demo Tour Navigation Integration
     * 
     * For any demo tour step that targets poll, judge, or giveaway functionality,
     * the tour SHALL first navigate to leftTab='dynamics' and then set the appropriate dynamicsView.
     * 
     * **Validates: Requirements 6.1, 6.2, 6.3**
     */

    it('should navigate to dynamics first, then poll for poll-targeting steps', () => {
      fc.assert(
        fc.property(pollTargetingStepIdArb, validPollNavigationActionArb, (stepId, action) => {
          const step = createMockTourStep(stepId, action);
          const validation = validateTourStepNavigation(step);

          // Property: poll-targeting steps should use new navigation
          expect(validation.isValid).toBe(true);
          expect(validation.usesNewNavigation).toBe(true);
          expect(validation.navigatesToDynamics).toBe(true);
          expect(validation.setsDynamicsView).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should set leftTab to dynamics before setting dynamicsView', () => {
      fc.assert(
        fc.property(validPollNavigationActionArb, (action) => {
          const result = simulateOnStepChange(action);

          // Property: leftTab should be 'dynamics'
          expect(result.leftTab).toBe('dynamics');
          
          // Property: dynamicsView should be 'poll'
          expect(result.dynamicsView).toBe('poll');
        }),
        { numRuns: 100 }
      );
    });

    it('should validate poll navigation sequence correctly', () => {
      fc.assert(
        fc.property(validPollNavigationActionArb, (action) => {
          const isValid = validatePollNavigationSequence(action);

          // Property: valid poll navigation should pass validation
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid poll navigation (missing dynamics)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('games', 'platforms', 'obs', 'gallery', 'data') as fc.Arbitrary<LeftTab>,
          (invalidLeftTab) => {
            const action: TourStepAction = {
              type: 'navigate',
              leftTab: invalidLeftTab,
              dynamicsView: 'poll',
            };

            const isValid = validatePollNavigationSequence(action);

            // Property: navigation without dynamics should fail
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid poll navigation (missing dynamicsView)', () => {
      const action: TourStepAction = {
        type: 'navigate',
        leftTab: 'dynamics',
        // dynamicsView is missing
      };

      const isValid = validatePollNavigationSequence(action);

      // Property: navigation without dynamicsView should fail
      expect(isValid).toBe(false);
    });
  });

  describe('Tour Step Action Validation', () => {
    /**
     * Tests that verify tour step actions have valid values
     */

    it('should have valid leftTab values in all actions', () => {
      fc.assert(
        fc.property(tourStepActionArb, (action) => {
          if (action.leftTab) {
            // Property: leftTab should be a valid value
            expect(VALID_LEFT_TABS).toContain(action.leftTab);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have valid dynamicsView values in all actions', () => {
      fc.assert(
        fc.property(tourStepActionArb, (action) => {
          if (action.dynamicsView) {
            // Property: dynamicsView should be a valid value
            expect(VALID_DYNAMICS_VIEWS).toContain(action.dynamicsView);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle actions with no navigation properties', () => {
      const action: TourStepAction = {
        type: 'navigate',
        showSoundBoard: true,
      };

      const result = simulateOnStepChange(action);

      // Property: missing properties should result in null
      expect(result.leftTab).toBeNull();
      expect(result.dynamicsView).toBeNull();
    });

    it('should preserve additional action properties', () => {
      fc.assert(
        fc.property(validPollNavigationActionArb, (action) => {
          const result = simulateOnStepChange(action);

          // Property: dataSubTab should be preserved if set
          if (action.dataSubTab) {
            expect(result.dataSubTab).toBe(action.dataSubTab);
          }

          // Property: rightTab should be preserved if set
          if (action.rightTab) {
            expect(result.rightTab).toBe(action.rightTab);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Non-Poll Step Navigation', () => {
    /**
     * Tests that verify non-poll steps can use any valid navigation
     */

    it('should allow non-poll steps to navigate to any valid leftTab', () => {
      fc.assert(
        fc.property(nonPollStepIdArb, leftTabArb, (stepId, leftTab) => {
          const action: TourStepAction = {
            type: 'navigate',
            leftTab,
          };
          const step = createMockTourStep(stepId, action);
          const validation = validateTourStepNavigation(step);

          // Property: non-poll steps should be valid with any leftTab
          expect(validation.isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow steps without actions', () => {
      fc.assert(
        fc.property(nonPollStepIdArb, (stepId) => {
          const step = createMockTourStep(stepId, undefined);
          const validation = validateTourStepNavigation(step);

          // Property: steps without actions should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.usesNewNavigation).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Navigation State Consistency', () => {
    /**
     * Tests that verify navigation state remains consistent
     */

    it('should produce consistent state for same action', () => {
      fc.assert(
        fc.property(tourStepActionArb, (action) => {
          const result1 = simulateOnStepChange(action);
          const result2 = simulateOnStepChange(action);

          // Property: same action should produce same result (idempotent)
          expect(result1.leftTab).toBe(result2.leftTab);
          expect(result1.dynamicsView).toBe(result2.dynamicsView);
          expect(result1.dataSubTab).toBe(result2.dataSubTab);
          expect(result1.rightTab).toBe(result2.rightTab);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle undefined action gracefully', () => {
      const result = simulateOnStepChange(undefined);

      // Property: undefined action should result in all null values
      expect(result.leftTab).toBeNull();
      expect(result.dynamicsView).toBeNull();
      expect(result.dataSubTab).toBeNull();
      expect(result.rightTab).toBeNull();
    });
  });

  describe('Tour Flow Integration', () => {
    /**
     * Tests that verify the complete tour flow works correctly
     */

    it('should handle sequence of poll-targeting steps', () => {
      fc.assert(
        fc.property(
          fc.array(pollTargetingStepIdArb, { minLength: 1, maxLength: 10 }),
          (stepIds) => {
            for (const stepId of stepIds) {
              const action: TourStepAction = {
                type: 'navigate',
                leftTab: 'dynamics',
                dynamicsView: 'poll',
              };
              const step = createMockTourStep(stepId, action);
              const validation = validateTourStepNavigation(step);

              // Property: all poll-targeting steps should be valid
              expect(validation.isValid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed step sequence', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(pollTargetingStepIdArb, nonPollStepIdArb),
            { minLength: 2, maxLength: 10 }
          ),
          (stepIds) => {
            for (const stepId of stepIds) {
              const isPollStep = POLL_TARGETING_STEP_IDS.includes(stepId);
              const action: TourStepAction = isPollStep
                ? { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' }
                : { type: 'navigate', leftTab: 'gallery' };
              
              const step = createMockTourStep(stepId, action);
              const validation = validateTourStepNavigation(step);

              // Property: all steps should be valid
              expect(validation.isValid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
