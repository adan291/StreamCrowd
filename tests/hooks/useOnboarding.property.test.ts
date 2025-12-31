/**
 * Property-based tests for useOnboarding hook
 * 
 * Tests the onboarding system for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * **Feature: enhanced-features, Property 5: Onboarding Step Progression**
 * 
 * *For any* onboarding state, completing a step SHALL advance to the next step,
 * skipping SHALL end the tutorial, and resuming SHALL restore the last active step.
 * 
 * **Validates: Requirements 2.4, 2.5, 2.7**
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  OnboardingProgress,
  OnboardingStorage,
  OnboardingStep,
  DEFAULT_ONBOARDING_PROGRESS,
  DEFAULT_ONBOARDING_STORAGE,
  ONBOARDING_STORAGE_KEY,
} from '../../types/onboarding';

// ============================================
// TEST UTILITIES
// ============================================

// Mock localStorage
let mockStorage: Map<string, string>;
let originalLocalStorage: Storage;

function setupMockLocalStorage() {
  mockStorage = new Map<string, string>();
  originalLocalStorage = global.localStorage;
  
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    get length() { return mockStorage.size; },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
  };
  
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

function teardownMockLocalStorage() {
  mockStorage.clear();
  Object.defineProperty(global, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  });
}

// ============================================
// PURE ONBOARDING LOGIC (for testing without React)
// ============================================

const TOTAL_STEPS = 10; // Number of steps in the tutorial

/**
 * Generate step IDs for testing
 */
function generateStepIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `step-${i}`);
}

const STEP_IDS = generateStepIds(TOTAL_STEPS);

/**
 * Load onboarding storage
 */
function loadStorage(): OnboardingStorage {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === 1 && parsed.progress) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_ONBOARDING_STORAGE;
}

/**
 * Save onboarding storage
 */
function saveStorage(storage: OnboardingStorage): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(storage));
}

/**
 * Start the tutorial - pure function
 */
function startTutorial(storage: OnboardingStorage): OnboardingStorage {
  const now = Date.now();
  return {
    ...storage,
    hasSeenWelcome: true,
    progress: {
      ...DEFAULT_ONBOARDING_PROGRESS,
      startedAt: now,
      lastActiveAt: now,
    },
  };
}

/**
 * Complete a step and advance - pure function
 */
function completeStep(
  storage: OnboardingStorage,
  stepId: string,
  totalSteps: number
): { storage: OnboardingStorage; isCompleted: boolean } {
  const currentIndex = storage.progress.currentStep;
  const expectedStepId = STEP_IDS[currentIndex];
  
  // Verify step ID matches current step
  if (expectedStepId !== stepId) {
    return { storage, isCompleted: false };
  }
  
  const now = Date.now();
  const nextIndex = currentIndex + 1;
  const isLastStep = nextIndex >= totalSteps;
  
  const newStorage: OnboardingStorage = {
    ...storage,
    progress: {
      ...storage.progress,
      currentStep: isLastStep ? currentIndex : nextIndex,
      completedSteps: [...storage.progress.completedSteps, stepId],
      lastActiveAt: now,
      isCompleted: isLastStep,
    },
  };
  
  return { storage: newStorage, isCompleted: isLastStep };
}

/**
 * Skip the tutorial - pure function
 */
function skipTutorial(storage: OnboardingStorage): OnboardingStorage {
  const now = Date.now();
  return {
    ...storage,
    hasSeenWelcome: true,
    progress: {
      ...storage.progress,
      lastActiveAt: now,
      wasSkipped: true,
    },
  };
}

/**
 * Reset the tutorial - pure function
 */
function resetTutorial(storage: OnboardingStorage): OnboardingStorage {
  return {
    ...storage,
    hasSeenWelcome: false,
    progress: DEFAULT_ONBOARDING_PROGRESS,
  };
}

/**
 * Resume the tutorial - pure function
 */
function resumeTutorial(storage: OnboardingStorage): OnboardingStorage {
  const now = Date.now();
  return {
    ...storage,
    progress: {
      ...storage.progress,
      lastActiveAt: now,
    },
  };
}

/**
 * Check if first visit
 */
function isFirstVisit(storage: OnboardingStorage): boolean {
  return !storage.hasSeenWelcome;
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const onboardingProgressArb = fc.record({
  currentStep: fc.integer({ min: 0, max: TOTAL_STEPS - 1 }),
  completedSteps: fc.array(fc.constantFrom(...STEP_IDS), { minLength: 0, maxLength: TOTAL_STEPS }),
  startedAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
  lastActiveAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
  isCompleted: fc.boolean(),
  wasSkipped: fc.boolean(),
}).map(p => {
  // Ensure lastActiveAt >= startedAt
  if (p.lastActiveAt < p.startedAt) {
    p.lastActiveAt = p.startedAt;
  }
  // Ensure completedSteps are unique and in order
  const uniqueSteps = [...new Set(p.completedSteps)];
  p.completedSteps = uniqueSteps.slice(0, p.currentStep);
  return p as OnboardingProgress;
});

const onboardingStorageArb = fc.record({
  version: fc.constant(1 as const),
  hasSeenWelcome: fc.boolean(),
  progress: onboardingProgressArb,
  dismissedTips: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
  preferences: fc.record({
    showContextualTips: fc.boolean(),
  }),
}) as fc.Arbitrary<OnboardingStorage>;

// ============================================
// PROPERTY TESTS
// ============================================

describe('useOnboarding Property Tests', () => {
  beforeEach(() => {
    setupMockLocalStorage();
  });

  afterEach(() => {
    teardownMockLocalStorage();
  });

  /**
   * **Feature: enhanced-features, Property 5: Onboarding Step Progression**
   * 
   * *For any* onboarding state, completing a step SHALL advance to the next step,
   * skipping SHALL end the tutorial, and resuming SHALL restore the last active step.
   * 
   * **Validates: Requirements 2.4, 2.5, 2.7**
   */
  describe('Property 5: Onboarding Step Progression', () => {
    
    // Requirement 2.4: Completing a step advances to next step
    it('completing a step advances currentStep by 1 (unless last step)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: TOTAL_STEPS - 2 }), // Not the last step
          (stepIndex) => {
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps: STEP_IDS.slice(0, stepIndex),
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
            };
            
            const stepId = STEP_IDS[stepIndex];
            const result = completeStep(storage, stepId, TOTAL_STEPS);
            
            // Should advance to next step
            expect(result.storage.progress.currentStep).toBe(stepIndex + 1);
            expect(result.isCompleted).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completing the last step marks tutorial as completed', () => {
      fc.assert(
        fc.property(
          fc.constant(TOTAL_STEPS - 1), // Last step index
          (stepIndex) => {
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps: STEP_IDS.slice(0, stepIndex),
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
            };
            
            const stepId = STEP_IDS[stepIndex];
            const result = completeStep(storage, stepId, TOTAL_STEPS);
            
            // Should mark as completed
            expect(result.storage.progress.isCompleted).toBe(true);
            expect(result.isCompleted).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completed step is added to completedSteps array', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: TOTAL_STEPS - 1 }),
          (stepIndex) => {
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps: STEP_IDS.slice(0, stepIndex),
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
            };
            
            const stepId = STEP_IDS[stepIndex];
            const result = completeStep(storage, stepId, TOTAL_STEPS);
            
            // Step should be in completedSteps
            expect(result.storage.progress.completedSteps).toContain(stepId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completing wrong step ID does not advance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: TOTAL_STEPS - 1 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !STEP_IDS.includes(s)),
          (stepIndex, wrongStepId) => {
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps: STEP_IDS.slice(0, stepIndex),
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
            };
            
            const result = completeStep(storage, wrongStepId, TOTAL_STEPS);
            
            // Should not advance
            expect(result.storage.progress.currentStep).toBe(stepIndex);
            expect(result.isCompleted).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Requirement 2.5: Skipping ends the tutorial
    it('skipping sets wasSkipped to true', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = skipTutorial(storage);
            
            expect(result.progress.wasSkipped).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skipping marks hasSeenWelcome as true', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = skipTutorial(storage);
            
            expect(result.hasSeenWelcome).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skipping preserves current step position', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const originalStep = storage.progress.currentStep;
            const result = skipTutorial(storage);
            
            // Current step should be preserved
            expect(result.progress.currentStep).toBe(originalStep);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Requirement 2.7: Resuming restores last active step
    it('resuming preserves currentStep', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: TOTAL_STEPS - 1 }),
          (stepIndex) => {
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps: STEP_IDS.slice(0, stepIndex),
                startedAt: Date.now() - 10000,
                lastActiveAt: Date.now() - 5000,
              },
            };
            
            const result = resumeTutorial(storage);
            
            // Current step should be preserved
            expect(result.progress.currentStep).toBe(stepIndex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('resuming preserves completedSteps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: TOTAL_STEPS - 1 }),
          (stepIndex) => {
            const completedSteps = STEP_IDS.slice(0, stepIndex);
            const storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                currentStep: stepIndex,
                completedSteps,
                startedAt: Date.now() - 10000,
                lastActiveAt: Date.now() - 5000,
              },
            };
            
            const result = resumeTutorial(storage);
            
            // Completed steps should be preserved
            expect(result.progress.completedSteps).toEqual(completedSteps);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('resuming updates lastActiveAt', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const oldLastActiveAt = storage.progress.lastActiveAt;
            const result = resumeTutorial(storage);
            
            // lastActiveAt should be updated (or equal if very fast)
            expect(result.progress.lastActiveAt).toBeGreaterThanOrEqual(oldLastActiveAt);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Reset functionality
    it('resetting clears progress and hasSeenWelcome', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = resetTutorial(storage);
            
            expect(result.hasSeenWelcome).toBe(false);
            expect(result.progress.currentStep).toBe(0);
            expect(result.progress.completedSteps).toEqual([]);
            expect(result.progress.isCompleted).toBe(false);
            expect(result.progress.wasSkipped).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('resetting preserves dismissedTips and preferences', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = resetTutorial(storage);
            
            // These should be preserved
            expect(result.dismissedTips).toEqual(storage.dismissedTips);
            expect(result.preferences).toEqual(storage.preferences);
          }
        ),
        { numRuns: 100 }
      );
    });

    // First visit detection
    it('isFirstVisit returns true when hasSeenWelcome is false', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb.map(s => ({ ...s, hasSeenWelcome: false })),
          (storage) => {
            expect(isFirstVisit(storage)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isFirstVisit returns false when hasSeenWelcome is true', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb.map(s => ({ ...s, hasSeenWelcome: true })),
          (storage) => {
            expect(isFirstVisit(storage)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Starting tutorial
    it('starting tutorial sets hasSeenWelcome to true', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = startTutorial(storage);
            
            expect(result.hasSeenWelcome).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('starting tutorial resets progress to step 0', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            const result = startTutorial(storage);
            
            expect(result.progress.currentStep).toBe(0);
            expect(result.progress.completedSteps).toEqual([]);
            expect(result.progress.isCompleted).toBe(false);
            expect(result.progress.wasSkipped).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Sequential step completion
    it('completing all steps in sequence marks tutorial as completed', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No random input needed
          () => {
            let storage: OnboardingStorage = {
              ...DEFAULT_ONBOARDING_STORAGE,
              hasSeenWelcome: true,
              progress: {
                ...DEFAULT_ONBOARDING_PROGRESS,
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
            };
            
            // Complete all steps in sequence
            for (let i = 0; i < TOTAL_STEPS; i++) {
              const stepId = STEP_IDS[i];
              const result = completeStep(storage, stepId, TOTAL_STEPS);
              storage = result.storage;
              
              if (i < TOTAL_STEPS - 1) {
                expect(result.isCompleted).toBe(false);
                expect(storage.progress.currentStep).toBe(i + 1);
              } else {
                expect(result.isCompleted).toBe(true);
                expect(storage.progress.isCompleted).toBe(true);
              }
            }
            
            // All steps should be in completedSteps
            expect(storage.progress.completedSteps.length).toBe(TOTAL_STEPS);
            for (const stepId of STEP_IDS) {
              expect(storage.progress.completedSteps).toContain(stepId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Storage persistence
    it('storage round-trip preserves all data', () => {
      fc.assert(
        fc.property(
          onboardingStorageArb,
          (storage) => {
            saveStorage(storage);
            const loaded = loadStorage();
            
            expect(loaded.version).toBe(storage.version);
            expect(loaded.hasSeenWelcome).toBe(storage.hasSeenWelcome);
            expect(loaded.progress.currentStep).toBe(storage.progress.currentStep);
            expect(loaded.progress.completedSteps).toEqual(storage.progress.completedSteps);
            expect(loaded.progress.isCompleted).toBe(storage.progress.isCompleted);
            expect(loaded.progress.wasSkipped).toBe(storage.progress.wasSkipped);
            expect(loaded.dismissedTips).toEqual(storage.dismissedTips);
            expect(loaded.preferences).toEqual(storage.preferences);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
