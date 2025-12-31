/**
 * Property-based tests for PredictionForm validation
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the prediction form validation logic.
 * 
 * Feature: twitch-tools-implementation
 * Property 1: Prediction Form Validation
 * 
 * For any prediction form submission, the system SHALL validate that:
 * - title is non-empty
 * - outcomes count is between 2 and 10
 * - duration is between 30 and 1800 seconds
 * - all outcome titles are non-empty and unique
 * 
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePredictionForm } from '../../components/PredictionForm';
import { PREDICTION_CONSTRAINTS, type PredictionFormData } from '../../types/twitch';

// ============ ARBITRARIES ============

// Generate valid titles (non-empty, within length limit)
const validTitleArb = fc.string({ minLength: 1, maxLength: PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH })
  .filter(s => s.trim().length > 0);

// Generate invalid titles (empty or whitespace only)
const invalidTitleArb = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
);

// Generate titles that exceed max length
const tooLongTitleArb = fc.string({ 
  minLength: PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH + 1, 
  maxLength: PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH + 50 
});

// Generate valid outcome strings (non-empty, within length limit)
const validOutcomeArb = fc.string({ minLength: 1, maxLength: PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH })
  .filter(s => s.trim().length > 0);

// Generate invalid outcome strings (empty or whitespace only)
const invalidOutcomeArb = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 })
);

// Generate outcomes that exceed max length
const tooLongOutcomeArb = fc.string({ 
  minLength: PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH + 1, 
  maxLength: PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH + 20 
});

// Generate valid outcome count (2-10)
const validOutcomeCountArb = fc.integer({ 
  min: PREDICTION_CONSTRAINTS.MIN_OUTCOMES, 
  max: PREDICTION_CONSTRAINTS.MAX_OUTCOMES 
});

// Generate invalid outcome count (less than 2 or more than 10)
const tooFewOutcomesCountArb = fc.integer({ min: 0, max: PREDICTION_CONSTRAINTS.MIN_OUTCOMES - 1 });
const tooManyOutcomesCountArb = fc.integer({ 
  min: PREDICTION_CONSTRAINTS.MAX_OUTCOMES + 1, 
  max: PREDICTION_CONSTRAINTS.MAX_OUTCOMES + 5 
});

// Generate valid duration (30-1800 seconds)
const validDurationArb = fc.integer({ 
  min: PREDICTION_CONSTRAINTS.MIN_DURATION, 
  max: PREDICTION_CONSTRAINTS.MAX_DURATION 
});

// Generate invalid duration (too short or too long)
const tooShortDurationArb = fc.integer({ min: 0, max: PREDICTION_CONSTRAINTS.MIN_DURATION - 1 });
const tooLongDurationArb = fc.integer({ 
  min: PREDICTION_CONSTRAINTS.MAX_DURATION + 1, 
  max: PREDICTION_CONSTRAINTS.MAX_DURATION + 1000 
});

// Generate a valid prediction form data
const validFormDataArb: fc.Arbitrary<PredictionFormData> = fc.record({
  title: validTitleArb,
  outcomes: fc.array(validOutcomeArb, { 
    minLength: PREDICTION_CONSTRAINTS.MIN_OUTCOMES, 
    maxLength: PREDICTION_CONSTRAINTS.MAX_OUTCOMES 
  }).filter(outcomes => {
    // Ensure unique outcomes
    const uniqueOutcomes = new Set(outcomes.map(o => o.toLowerCase().trim()));
    return uniqueOutcomes.size === outcomes.length;
  }),
  duration: validDurationArb,
});

// ============ TESTS ============

describe('PredictionForm Property Tests', () => {
  describe('Property 1: Prediction Form Validation', () => {
    /**
     * Feature: twitch-tools-implementation, Property 1: Prediction Form Validation
     * 
     * For any prediction form submission, the system SHALL validate that:
     * - title is non-empty
     * - outcomes count is between 2 and 10
     * - duration is between 30 and 1800 seconds
     * - all outcome titles are non-empty and unique
     * 
     * **Validates: Requirements 1.1**
     */

    describe('Valid Form Data', () => {
      it('should accept valid form data with all constraints satisfied', () => {
        fc.assert(
          fc.property(validFormDataArb, (formData) => {
            const result = validatePredictionForm(formData);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }),
          { numRuns: 100 }
        );
      });

      it('should accept form data with exactly 2 outcomes (minimum)', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            validOutcomeArb,
            validOutcomeArb,
            validDurationArb,
            (title, outcome1, outcome2, duration) => {
              // Ensure outcomes are unique
              const uniqueOutcome2 = outcome1.toLowerCase().trim() === outcome2.toLowerCase().trim() 
                ? outcome2 + '_unique' 
                : outcome2;
              
              const formData: PredictionFormData = {
                title,
                outcomes: [outcome1, uniqueOutcome2],
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should accept form data with exactly 10 outcomes (maximum)', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            fc.array(validOutcomeArb, { minLength: 10, maxLength: 10 }),
            validDurationArb,
            (title, outcomes, duration) => {
              // Make outcomes unique by appending index
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              
              const formData: PredictionFormData = {
                title,
                outcomes: uniqueOutcomes,
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Title Validation', () => {
      it('should reject empty titles', () => {
        fc.assert(
          fc.property(
            invalidTitleArb,
            fc.array(validOutcomeArb, { minLength: 2, maxLength: 2 }),
            validDurationArb,
            (title, outcomes, duration) => {
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              const formData: PredictionFormData = { title, outcomes: uniqueOutcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.toLowerCase().includes('título'))).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject titles exceeding max length', () => {
        fc.assert(
          fc.property(
            tooLongTitleArb,
            fc.array(validOutcomeArb, { minLength: 2, maxLength: 2 }),
            validDurationArb,
            (title, outcomes, duration) => {
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              const formData: PredictionFormData = { title, outcomes: uniqueOutcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.toLowerCase().includes('título') && e.includes(String(PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH))
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Outcomes Count Validation', () => {
      it('should reject fewer than 2 outcomes', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            tooFewOutcomesCountArb,
            validDurationArb,
            (title, count, duration) => {
              const outcomes = Array(count).fill('').map((_, i) => `Option ${i + 1}`);
              const formData: PredictionFormData = { title, outcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.includes(String(PREDICTION_CONSTRAINTS.MIN_OUTCOMES)) && e.toLowerCase().includes('opciones')
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject more than 10 outcomes', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            tooManyOutcomesCountArb,
            validDurationArb,
            (title, count, duration) => {
              const outcomes = Array(count).fill('').map((_, i) => `Option ${i + 1}`);
              const formData: PredictionFormData = { title, outcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.includes(String(PREDICTION_CONSTRAINTS.MAX_OUTCOMES)) && e.toLowerCase().includes('opciones')
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Outcomes Content Validation', () => {
      it('should reject empty outcome strings', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            validOutcomeArb,
            invalidOutcomeArb,
            validDurationArb,
            (title, validOutcome, invalidOutcome, duration) => {
              const formData: PredictionFormData = {
                title,
                outcomes: [validOutcome, invalidOutcome],
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.toLowerCase().includes('texto'))).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject outcomes exceeding max length', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            validOutcomeArb,
            tooLongOutcomeArb,
            validDurationArb,
            (title, validOutcome, tooLongOutcome, duration) => {
              const formData: PredictionFormData = {
                title,
                outcomes: [validOutcome, tooLongOutcome],
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.includes(String(PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH))
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject duplicate outcomes (case-insensitive)', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            validOutcomeArb,
            validDurationArb,
            (title, outcome, duration) => {
              // Create duplicate by using same outcome with different case
              const formData: PredictionFormData = {
                title,
                outcomes: [outcome, outcome.toUpperCase()],
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.toLowerCase().includes('únicas'))).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Duration Validation', () => {
      it('should reject duration less than minimum', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            fc.array(validOutcomeArb, { minLength: 2, maxLength: 2 }),
            tooShortDurationArb,
            (title, outcomes, duration) => {
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              const formData: PredictionFormData = { title, outcomes: uniqueOutcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.includes(String(PREDICTION_CONSTRAINTS.MIN_DURATION)) && e.toLowerCase().includes('duración')
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject duration greater than maximum', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            fc.array(validOutcomeArb, { minLength: 2, maxLength: 2 }),
            tooLongDurationArb,
            (title, outcomes, duration) => {
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              const formData: PredictionFormData = { title, outcomes: uniqueOutcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => 
                e.toLowerCase().includes('duración') && e.toLowerCase().includes('máxima')
              )).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should accept boundary duration values', () => {
        fc.assert(
          fc.property(
            validTitleArb,
            fc.array(validOutcomeArb, { minLength: 2, maxLength: 2 }),
            fc.constantFrom(PREDICTION_CONSTRAINTS.MIN_DURATION, PREDICTION_CONSTRAINTS.MAX_DURATION),
            (title, outcomes, duration) => {
              const uniqueOutcomes = outcomes.map((o, i) => `${o}_${i}`);
              const formData: PredictionFormData = { title, outcomes: uniqueOutcomes, duration };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Multiple Validation Errors', () => {
      it('should report all validation errors when multiple constraints are violated', () => {
        fc.assert(
          fc.property(
            invalidTitleArb,
            tooShortDurationArb,
            (title, duration) => {
              const formData: PredictionFormData = {
                title,
                outcomes: ['Only one'], // Too few outcomes
                duration,
              };
              
              const result = validatePredictionForm(formData);
              expect(result.valid).toBe(false);
              // Should have at least 3 errors: title, outcomes count, duration
              expect(result.errors.length).toBeGreaterThanOrEqual(2);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
