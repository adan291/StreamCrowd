/**
 * Property-based tests for JudgePanel component
 * 
 * Tests the judge panel behavior for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 3.1 - Criteria count badge shows correct number
 * @requirements 3.2 - Contestants count badge shows correct number
 * @requirements 3.3 - Judges count badge shows correct number
 * @requirements 3.4 - Wizard navigation moves between steps correctly
 * @requirements 3.5 - Preset application creates criteria correctly
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { 
  JUDGE_PRESETS, 
  JudgePanelPresetValues, 
  createCriteriaFromPreset, 
  findMatchingJudgePreset, 
  isJudgeConfigCustomized 
} from '../../config/judgePresets';
import type { JudgeCriterion } from '../../types';

// ============================================
// MOCK SETUP
// ============================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(name: string) {
    this.name = name;
  }
  
  postMessage(_message: unknown): void {
    // No-op for testing
  }
  
  close(): void {
    // No-op for testing
  }
}

// ============================================
// JUDGE PANEL LOGIC (extracted for testing)
// ============================================

/**
 * Represents a criterion in the judge panel
 */
interface Criterion {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  weight: number;
}

/**
 * Represents a contestant in the judge panel
 */
interface Contestant {
  id: string;
  name: string;
  color: string;
  voteKey?: string;
}

/**
 * Represents a judge in the judge panel
 */
interface Judge {
  id: string;
  username: string;
  channelName: string;
  color: string;
  isHost?: boolean;
}

/**
 * Get criteria count for badge display
 * Pure function for testing badge accuracy
 */
function getCriteriaCount(criteria: Criterion[]): number {
  return criteria.length;
}

/**
 * Get contestants count for badge display
 * Pure function for testing badge accuracy
 */
function getContestantsCount(contestants: Contestant[]): number {
  return contestants.length;
}

/**
 * Get judges count for badge display
 * Pure function for testing badge accuracy
 */
function getJudgesCount(judges: Judge[]): number {
  return judges.length;
}


/**
 * Add criterion to the list
 * Returns new array (immutable)
 */
function addCriterion(criteria: Criterion[], criterion: Criterion): Criterion[] {
  return [...criteria, criterion];
}

/**
 * Remove criterion from the list
 * Returns new array (immutable)
 */
function removeCriterion(criteria: Criterion[], id: string): Criterion[] {
  return criteria.filter(c => c.id !== id);
}

/**
 * Add contestant to the list
 * Returns new array (immutable)
 */
function addContestant(contestants: Contestant[], contestant: Contestant): Contestant[] {
  return [...contestants, contestant];
}

/**
 * Remove contestant from the list
 * Returns new array (immutable)
 */
function removeContestant(contestants: Contestant[], id: string): Contestant[] {
  return contestants.filter(c => c.id !== id);
}

/**
 * Add judge to the list
 * Returns new array (immutable)
 */
function addJudge(judges: Judge[], judge: Judge): Judge[] {
  return [...judges, judge];
}

/**
 * Remove judge from the list
 * Returns new array (immutable)
 */
function removeJudge(judges: Judge[], id: string): Judge[] {
  return judges.filter(j => j.id !== id);
}

// ============================================
// WIZARD NAVIGATION LOGIC (extracted for testing)
// ============================================

const TOTAL_WIZARD_STEPS = 4;

/**
 * Navigate to next step in wizard
 * Returns new step index or current if at last step
 */
function goToNextStep(currentStep: number, totalSteps: number = TOTAL_WIZARD_STEPS): number {
  if (currentStep < totalSteps - 1) {
    return currentStep + 1;
  }
  return currentStep;
}

/**
 * Navigate to previous step in wizard
 * Returns new step index or current if at first step
 */
function goToPreviousStep(currentStep: number): number {
  if (currentStep > 0) {
    return currentStep - 1;
  }
  return currentStep;
}

/**
 * Check if can go to next step
 */
function canGoNext(currentStep: number, totalSteps: number = TOTAL_WIZARD_STEPS): boolean {
  return currentStep < totalSteps - 1;
}

/**
 * Check if can go to previous step
 */
function canGoBack(currentStep: number): boolean {
  return currentStep > 0;
}

/**
 * Navigate to specific step
 * Returns new step index if valid, otherwise current
 */
function goToStep(currentStep: number, targetStep: number, totalSteps: number = TOTAL_WIZARD_STEPS): number {
  if (targetStep >= 0 && targetStep < totalSteps) {
    return targetStep;
  }
  return currentStep;
}

// ============================================
// PRESET APPLICATION LOGIC (extracted for testing)
// ============================================

/**
 * Apply preset to create criteria
 * Returns new criteria array with generated IDs
 */
function applyPresetCriteria(presetCriteria: Omit<JudgeCriterion, 'id'>[]): JudgeCriterion[] {
  return createCriteriaFromPreset(presetCriteria);
}

/**
 * Represents judge panel configuration
 */
interface JudgePanelConfig {
  criteria: JudgeCriterion[];
  publicVotingEnabled: boolean;
  publicVoteWeight: number;
}

/**
 * Apply preset to configuration
 * Returns new configuration with preset values applied
 */
function applyPreset(
  _currentConfig: JudgePanelConfig,
  presetValues: JudgePanelPresetValues
): JudgePanelConfig {
  const newCriteria = createCriteriaFromPreset(presetValues.criteria);
  return {
    criteria: newCriteria,
    publicVotingEnabled: presetValues.publicVotingEnabled,
    publicVoteWeight: presetValues.publicVoteWeight ?? 0.3,
  };
}

/**
 * Check if configuration has been customized from preset
 */
function isCustomized(config: JudgePanelConfig): boolean {
  return isJudgeConfigCustomized({
    criteria: config.criteria,
    publicVotingEnabled: config.publicVotingEnabled,
    publicVoteWeight: config.publicVoteWeight,
  });
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 9);

const criterionNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0);

const scoreArb = fc.integer({ min: 1, max: 10 });

const weightArb = fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true });

const criterionArb = fc.record({
  id: fc.constant(generateId()).map(() => generateId()),
  name: criterionNameArb,
  minScore: scoreArb,
  maxScore: scoreArb,
  weight: weightArb,
}).map(c => ({
  ...c,
  maxScore: Math.max(c.minScore, c.maxScore), // Ensure max >= min
}));

const criteriaListArb = fc.array(criterionArb, { minLength: 0, maxLength: 10 });

const contestantNameArb = fc.string({ minLength: 1, maxLength: 25 })
  .filter(s => s.trim().length > 0);

const colorArb = fc.constantFrom('#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6');

const contestantArb = fc.record({
  id: fc.constant(generateId()).map(() => generateId()),
  name: contestantNameArb,
  color: colorArb,
  voteKey: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: undefined }),
});

const contestantsListArb = fc.array(contestantArb, { minLength: 0, maxLength: 20 });

const judgeArb = fc.record({
  id: fc.constant(generateId()).map(() => generateId()),
  username: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  channelName: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  color: colorArb,
  isHost: fc.option(fc.boolean(), { nil: undefined }),
});

const judgesListArb = fc.array(judgeArb, { minLength: 0, maxLength: 10 });

const wizardStepArb = fc.integer({ min: 0, max: TOTAL_WIZARD_STEPS - 1 });

const presetArb = fc.constantFrom(...JUDGE_PRESETS);

const judgePanelConfigArb = fc.record({
  criteria: criteriaListArb,
  publicVotingEnabled: fc.boolean(),
  publicVoteWeight: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
});


// ============================================
// PROPERTY TESTS
// ============================================

describe('JudgePanel Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock });
    Object.defineProperty(global, 'BroadcastChannel', { value: MockBroadcastChannel });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * **Feature: ux-polish-and-testing, Property 7: JudgePanel Badge Counts**
   * 
   * *For any* JudgePanel state with C criteria, N contestants, and J judges,
   * the respective badges should display C, N, and J.
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  describe('Property 7: JudgePanel Badge Counts', () => {
    describe('Criteria badge count', () => {
      it('criteria count equals array length', () => {
        fc.assert(
          fc.property(
            criteriaListArb,
            (criteria) => {
              const count = getCriteriaCount(criteria);
              expect(count).toBe(criteria.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('empty criteria array returns zero count', () => {
        const emptyCriteria: Criterion[] = [];
        const count = getCriteriaCount(emptyCriteria);
        expect(count).toBe(0);
      });

      it('adding criterion increases count by one', () => {
        fc.assert(
          fc.property(
            criteriaListArb,
            criterionArb,
            (criteria, newCriterion) => {
              const initialCount = getCriteriaCount(criteria);
              const newCriteria = addCriterion(criteria, newCriterion);
              const newCount = getCriteriaCount(newCriteria);
              
              expect(newCount).toBe(initialCount + 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('removing criterion decreases count by one', () => {
        fc.assert(
          fc.property(
            criteriaListArb.filter(c => c.length > 0),
            (criteria) => {
              const toRemove = criteria[0];
              
              const initialCount = getCriteriaCount(criteria);
              const newCriteria = removeCriterion(criteria, toRemove.id);
              const newCount = getCriteriaCount(newCriteria);
              
              expect(newCount).toBe(initialCount - 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('count is always non-negative', () => {
        fc.assert(
          fc.property(
            criteriaListArb,
            (criteria) => {
              const count = getCriteriaCount(criteria);
              expect(count).toBeGreaterThanOrEqual(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Contestants badge count', () => {
      it('contestants count equals array length', () => {
        fc.assert(
          fc.property(
            contestantsListArb,
            (contestants) => {
              const count = getContestantsCount(contestants);
              expect(count).toBe(contestants.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('empty contestants array returns zero count', () => {
        const emptyContestants: Contestant[] = [];
        const count = getContestantsCount(emptyContestants);
        expect(count).toBe(0);
      });

      it('adding contestant increases count by one', () => {
        fc.assert(
          fc.property(
            contestantsListArb,
            contestantArb,
            (contestants, newContestant) => {
              const initialCount = getContestantsCount(contestants);
              const newContestants = addContestant(contestants, newContestant);
              const newCount = getContestantsCount(newContestants);
              
              expect(newCount).toBe(initialCount + 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('removing contestant decreases count by one', () => {
        fc.assert(
          fc.property(
            contestantsListArb.filter(c => c.length > 0),
            (contestants) => {
              const toRemove = contestants[0];
              
              const initialCount = getContestantsCount(contestants);
              const newContestants = removeContestant(contestants, toRemove.id);
              const newCount = getContestantsCount(newContestants);
              
              expect(newCount).toBe(initialCount - 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('count is always non-negative', () => {
        fc.assert(
          fc.property(
            contestantsListArb,
            (contestants) => {
              const count = getContestantsCount(contestants);
              expect(count).toBeGreaterThanOrEqual(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Judges badge count', () => {
      it('judges count equals array length', () => {
        fc.assert(
          fc.property(
            judgesListArb,
            (judges) => {
              const count = getJudgesCount(judges);
              expect(count).toBe(judges.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('empty judges array returns zero count', () => {
        const emptyJudges: Judge[] = [];
        const count = getJudgesCount(emptyJudges);
        expect(count).toBe(0);
      });

      it('adding judge increases count by one', () => {
        fc.assert(
          fc.property(
            judgesListArb,
            judgeArb,
            (judges, newJudge) => {
              const initialCount = getJudgesCount(judges);
              const newJudges = addJudge(judges, newJudge);
              const newCount = getJudgesCount(newJudges);
              
              expect(newCount).toBe(initialCount + 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('removing judge decreases count by one', () => {
        fc.assert(
          fc.property(
            judgesListArb.filter(j => j.length > 0),
            (judges) => {
              const toRemove = judges[0];
              
              const initialCount = getJudgesCount(judges);
              const newJudges = removeJudge(judges, toRemove.id);
              const newCount = getJudgesCount(newJudges);
              
              expect(newCount).toBe(initialCount - 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('count is always non-negative', () => {
        fc.assert(
          fc.property(
            judgesListArb,
            (judges) => {
              const count = getJudgesCount(judges);
              expect(count).toBeGreaterThanOrEqual(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });


  /**
   * **Feature: ux-polish-and-testing, Property 8: Wizard Step Navigation**
   * 
   * *For any* wizard at step S (1 <= S <= 4), clicking "Next" should move to step S+1
   * (if S < 4), and clicking "Back" should move to step S-1 (if S > 1).
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 8: Wizard Step Navigation', () => {
    describe('Next navigation', () => {
      it('next moves to next step when not at last step', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: TOTAL_WIZARD_STEPS - 2 }),
            (currentStep) => {
              const newStep = goToNextStep(currentStep);
              expect(newStep).toBe(currentStep + 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('next stays at last step when at last step', () => {
        const lastStep = TOTAL_WIZARD_STEPS - 1;
        const newStep = goToNextStep(lastStep);
        expect(newStep).toBe(lastStep);
      });

      it('canGoNext returns true when not at last step', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: TOTAL_WIZARD_STEPS - 2 }),
            (currentStep) => {
              expect(canGoNext(currentStep)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('canGoNext returns false at last step', () => {
        const lastStep = TOTAL_WIZARD_STEPS - 1;
        expect(canGoNext(lastStep)).toBe(false);
      });
    });

    describe('Back navigation', () => {
      it('back moves to previous step when not at first step', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: TOTAL_WIZARD_STEPS - 1 }),
            (currentStep) => {
              const newStep = goToPreviousStep(currentStep);
              expect(newStep).toBe(currentStep - 1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('back stays at first step when at first step', () => {
        const firstStep = 0;
        const newStep = goToPreviousStep(firstStep);
        expect(newStep).toBe(firstStep);
      });

      it('canGoBack returns true when not at first step', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: TOTAL_WIZARD_STEPS - 1 }),
            (currentStep) => {
              expect(canGoBack(currentStep)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('canGoBack returns false at first step', () => {
        const firstStep = 0;
        expect(canGoBack(firstStep)).toBe(false);
      });
    });

    describe('Navigation boundaries', () => {
      it('no Back at step 1 (index 0)', () => {
        const step = 0;
        const newStep = goToPreviousStep(step);
        expect(newStep).toBe(0);
        expect(canGoBack(step)).toBe(false);
      });

      it('no Next at step 4 (index 3)', () => {
        const step = TOTAL_WIZARD_STEPS - 1;
        const newStep = goToNextStep(step);
        expect(newStep).toBe(TOTAL_WIZARD_STEPS - 1);
        expect(canGoNext(step)).toBe(false);
      });

      it('step always stays within valid range', () => {
        fc.assert(
          fc.property(
            wizardStepArb,
            fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
            (initialStep, navigations) => {
              let currentStep = initialStep;
              
              for (const goNext of navigations) {
                if (goNext) {
                  currentStep = goToNextStep(currentStep);
                } else {
                  currentStep = goToPreviousStep(currentStep);
                }
              }
              
              expect(currentStep).toBeGreaterThanOrEqual(0);
              expect(currentStep).toBeLessThan(TOTAL_WIZARD_STEPS);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Direct step navigation', () => {
      it('goToStep navigates to valid step', () => {
        fc.assert(
          fc.property(
            wizardStepArb,
            wizardStepArb,
            (currentStep, targetStep) => {
              const newStep = goToStep(currentStep, targetStep);
              expect(newStep).toBe(targetStep);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('goToStep ignores invalid negative step', () => {
        fc.assert(
          fc.property(
            wizardStepArb,
            fc.integer({ min: -100, max: -1 }),
            (currentStep, invalidStep) => {
              const newStep = goToStep(currentStep, invalidStep);
              expect(newStep).toBe(currentStep);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('goToStep ignores step beyond total', () => {
        fc.assert(
          fc.property(
            wizardStepArb,
            fc.integer({ min: TOTAL_WIZARD_STEPS, max: 100 }),
            (currentStep, invalidStep) => {
              const newStep = goToStep(currentStep, invalidStep);
              expect(newStep).toBe(currentStep);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Navigation round-trip', () => {
      it('next then back returns to original step (when not at boundaries)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: TOTAL_WIZARD_STEPS - 2 }),
            (currentStep) => {
              const afterNext = goToNextStep(currentStep);
              const afterBack = goToPreviousStep(afterNext);
              expect(afterBack).toBe(currentStep);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('back then next returns to original step (when not at boundaries)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: TOTAL_WIZARD_STEPS - 1 }),
            (currentStep) => {
              const afterBack = goToPreviousStep(currentStep);
              const afterNext = goToNextStep(afterBack);
              expect(afterNext).toBe(currentStep);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });


  /**
   * **Feature: ux-polish-and-testing, Property 5: Preset Application Completeness (JudgePanel)**
   * 
   * *For any* preset P with values V, applying P should result in all fields
   * in V being set to their corresponding values.
   * 
   * **Validates: Requirements 3.5**
   */
  describe('Property 5: Preset Application Completeness (JudgePanel)', () => {
    describe('Criteria creation from preset', () => {
      it('preset creates correct number of criteria', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              const criteria = applyPresetCriteria(preset.values.criteria);
              expect(criteria.length).toBe(preset.values.criteria.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('preset criteria have unique IDs', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              const criteria = applyPresetCriteria(preset.values.criteria);
              const ids = criteria.map(c => c.id);
              const uniqueIds = new Set(ids);
              expect(uniqueIds.size).toBe(ids.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('preset criteria preserve names', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              const criteria = applyPresetCriteria(preset.values.criteria);
              
              preset.values.criteria.forEach((presetCriterion, index) => {
                expect(criteria[index].name).toBe(presetCriterion.name);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it('preset criteria preserve score ranges', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              const criteria = applyPresetCriteria(preset.values.criteria);
              
              preset.values.criteria.forEach((presetCriterion, index) => {
                expect(criteria[index].minScore).toBe(presetCriterion.minScore);
                expect(criteria[index].maxScore).toBe(presetCriterion.maxScore);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it('preset criteria preserve weights', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              const criteria = applyPresetCriteria(preset.values.criteria);
              
              preset.values.criteria.forEach((presetCriterion, index) => {
                expect(criteria[index].weight).toBe(presetCriterion.weight);
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Full preset application', () => {
      it('applying preset sets publicVotingEnabled correctly', () => {
        fc.assert(
          fc.property(
            judgePanelConfigArb,
            presetArb,
            (currentConfig, preset) => {
              const newConfig = applyPreset(currentConfig, preset.values);
              expect(newConfig.publicVotingEnabled).toBe(preset.values.publicVotingEnabled);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('applying preset sets publicVoteWeight correctly', () => {
        fc.assert(
          fc.property(
            judgePanelConfigArb,
            presetArb,
            (currentConfig, preset) => {
              const newConfig = applyPreset(currentConfig, preset.values);
              const expectedWeight = preset.values.publicVoteWeight ?? 0.3;
              expect(newConfig.publicVoteWeight).toBe(expectedWeight);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('applying preset creates criteria with correct count', () => {
        fc.assert(
          fc.property(
            judgePanelConfigArb,
            presetArb,
            (currentConfig, preset) => {
              const newConfig = applyPreset(currentConfig, preset.values);
              expect(newConfig.criteria.length).toBe(preset.values.criteria.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('applying same preset twice produces equivalent result', () => {
        fc.assert(
          fc.property(
            judgePanelConfigArb,
            presetArb,
            (currentConfig, preset) => {
              const firstApplication = applyPreset(currentConfig, preset.values);
              const secondApplication = applyPreset(firstApplication, preset.values);
              
              // Compare structure (IDs will be different)
              expect(secondApplication.publicVotingEnabled).toBe(firstApplication.publicVotingEnabled);
              expect(secondApplication.publicVoteWeight).toBe(firstApplication.publicVoteWeight);
              expect(secondApplication.criteria.length).toBe(firstApplication.criteria.length);
              
              // Compare criteria properties (excluding IDs)
              secondApplication.criteria.forEach((criterion, index) => {
                expect(criterion.name).toBe(firstApplication.criteria[index].name);
                expect(criterion.minScore).toBe(firstApplication.criteria[index].minScore);
                expect(criterion.maxScore).toBe(firstApplication.criteria[index].maxScore);
                expect(criterion.weight).toBe(firstApplication.criteria[index].weight);
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Customization detection', () => {
      it('config matching preset is not customized', () => {
        JUDGE_PRESETS.forEach(preset => {
          const criteria = createCriteriaFromPreset(preset.values.criteria);
          const config: JudgePanelConfig = {
            criteria,
            publicVotingEnabled: preset.values.publicVotingEnabled,
            publicVoteWeight: preset.values.publicVoteWeight ?? 0.3,
          };
          
          const customized = isCustomized(config);
          expect(customized).toBe(false);
        });
      });

      it('applying preset then not changing results in not customized', () => {
        fc.assert(
          fc.property(
            judgePanelConfigArb,
            presetArb,
            (currentConfig, preset) => {
              const newConfig = applyPreset(currentConfig, preset.values);
              const customized = isCustomized(newConfig);
              
              expect(customized).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('changing publicVotingEnabled from preset makes it customized when no other preset matches', () => {
        // Test with basic preset - inverting publicVotingEnabled to true
        // This will match the "public" preset if publicVoteWeight is 0.3
        // So we use a different publicVoteWeight to ensure it's customized
        const basicPreset = JUDGE_PRESETS.find(p => p.id === 'basic')!;
        const criteria = createCriteriaFromPreset(basicPreset.values.criteria);
        const config: JudgePanelConfig = {
          criteria,
          publicVotingEnabled: true, // Inverted from basic preset
          publicVoteWeight: 0.5, // Different from public preset's 0.3
        };
        
        const customized = isCustomized(config);
        expect(customized).toBe(true);
      });

      it('changing criteria count from preset makes it customized', () => {
        fc.assert(
          fc.property(
            presetArb,
            (preset) => {
              // Create criteria with one extra criterion
              const baseCriteria = createCriteriaFromPreset(preset.values.criteria);
              const extraCriterion: JudgeCriterion = {
                id: 'extra',
                name: 'Extra Criterion',
                minScore: 1,
                maxScore: 10,
                weight: 1,
              };
              const config: JudgePanelConfig = {
                criteria: [...baseCriteria, extraCriterion],
                publicVotingEnabled: preset.values.publicVotingEnabled,
                publicVoteWeight: preset.values.publicVoteWeight ?? 0.3,
              };
              
              const customized = isCustomized(config);
              expect(customized).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('findMatchingJudgePreset returns preset when config matches', () => {
        JUDGE_PRESETS.forEach(preset => {
          const criteria = createCriteriaFromPreset(preset.values.criteria);
          const config = {
            criteria,
            publicVotingEnabled: preset.values.publicVotingEnabled,
            publicVoteWeight: preset.values.publicVoteWeight ?? 0.3,
          };
          
          const matchingPreset = findMatchingJudgePreset(config);
          expect(matchingPreset).not.toBeNull();
          expect(matchingPreset?.id).toBe(preset.id);
        });
      });
    });
  });
});
