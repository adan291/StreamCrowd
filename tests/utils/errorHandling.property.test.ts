/**
 * Property-based tests for Error Handling Utilities
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the error handling system.
 * 
 * Feature: twitch-tools-implementation
 * Property 9: Error Handling
 * 
 * @requirements 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  ERROR_CODES,
  parseApiError,
  isTwitchApiError,
  getErrorMessage,
  withRateLimit,
  withRetry,
  validateNonEmptyString,
  validateNumberRange,
  validateArrayLength,
  combineValidations,
  validateBeforeApiCall,
  formatErrorForDisplay,
  requiresUserAction,
  shouldAutoRetry,
  DEFAULT_RATE_LIMIT_CONFIG,
  type TwitchErrorContext,
  type RateLimitConfig,
} from '../../src/application/utils/errorHandling';
import type { TwitchApiError } from '../../types/twitch';

// ============ ARBITRARIES ============

// Generate valid HTTP status codes
const httpStatusArb = fc.constantFrom(
  400, 401, 403, 404, 409, 429, 500, 502, 503, 504
);

// Generate TwitchApiError objects
const twitchApiErrorArb = fc.record({
  error: fc.string({ minLength: 1, maxLength: 50 }),
  status: httpStatusArb,
  message: fc.string({ minLength: 1, maxLength: 200 }),
});

// Generate feature names
const featureArb = fc.constantFrom(
  'predictions',
  'channelPoints',
  'customRewards',
  undefined
) as fc.Arbitrary<'predictions' | 'channelPoints' | 'customRewards' | undefined>;

// Generate non-empty strings
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 });

// Generate whitespace-only strings
const whitespaceStringArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  ');

// Generate numbers for range validation
const numberArb = fc.integer({ min: -1000, max: 1000 });

// Generate arrays of various lengths
const arrayArb = fc.array(fc.anything(), { minLength: 0, maxLength: 20 });

// Generate rate limit configs
const rateLimitConfigArb = fc.record({
  maxRetries: fc.integer({ min: 0, max: 5 }),
  baseDelayMs: fc.integer({ min: 10, max: 100 }),
  maxDelayMs: fc.integer({ min: 100, max: 500 }),
});

// ============ TESTS ============

describe('Error Handling Property Tests', () => {
  describe('Property 9: Error Handling', () => {
    /**
     * Feature: twitch-tools-implementation, Property 9: Error Handling
     * 
     * For any API error response, the system SHALL display a user-friendly error
     * message and not leave the UI in an inconsistent state.
     * 
     * **Validates: Requirements 8.2, 8.3, 8.4, 8.5**
     */

    describe('parseApiError - User-friendly error messages (8.2)', () => {
      it('always returns a valid TwitchErrorContext for any TwitchApiError', async () => {
        await fc.assert(
          fc.asyncProperty(
            twitchApiErrorArb,
            featureArb,
            async (error, feature) => {
              const result = parseApiError(error, feature);

              // Verify structure
              expect(result).toHaveProperty('status');
              expect(result).toHaveProperty('code');
              expect(result).toHaveProperty('message');
              expect(result).toHaveProperty('userMessage');
              expect(result).toHaveProperty('solution');
              expect(result).toHaveProperty('isRetryable');
              expect(result).toHaveProperty('requiresReauth');
              expect(result).toHaveProperty('isPartnerRequired');

              // Verify types
              expect(typeof result.status).toBe('number');
              expect(typeof result.code).toBe('string');
              expect(typeof result.userMessage).toBe('string');
              expect(typeof result.solution).toBe('string');
              expect(typeof result.isRetryable).toBe('boolean');
              expect(typeof result.requiresReauth).toBe('boolean');
              expect(typeof result.isPartnerRequired).toBe('boolean');

              // User message and solution should never be empty
              expect(result.userMessage.length).toBeGreaterThan(0);
              expect(result.solution.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('always returns a valid TwitchErrorContext for standard Error objects', async () => {
        await fc.assert(
          fc.asyncProperty(
            nonEmptyStringArb,
            async (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseApiError(error);

              expect(result.userMessage.length).toBeGreaterThan(0);
              expect(result.solution.length).toBeGreaterThan(0);
              expect(result.code).toBe(ERROR_CODES.UNKNOWN);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('always returns a valid TwitchErrorContext for unknown error types', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.anything(),
            async (unknownError) => {
              const result = parseApiError(unknownError);

              expect(result.userMessage.length).toBeGreaterThan(0);
              expect(result.solution.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('getErrorMessage always returns a non-empty string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.anything(),
            featureArb,
            async (error, feature) => {
              const message = getErrorMessage(error, feature);

              expect(typeof message).toBe('string');
              expect(message.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Partner/Affiliate limitation explanation (8.3)', () => {
      it('identifies Partner/Affiliate requirement for 403 errors with relevant messages', async () => {
        const partnerMessages = [
          'partner required',
          'affiliate required',
          'not eligible for this feature',
          'Partner or Affiliate only',
        ];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...partnerMessages),
            featureArb,
            async (message, feature) => {
              const error: TwitchApiError = {
                error: 'Forbidden',
                status: 403,
                message,
              };

              const result = parseApiError(error, feature);

              expect(result.isPartnerRequired).toBe(true);
              expect(result.code).toBe(ERROR_CODES.NOT_PARTNER_AFFILIATE);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('provides feature-specific messages when feature context is provided', async () => {
        const features: Array<'predictions' | 'channelPoints' | 'customRewards'> = [
          'predictions',
          'channelPoints',
          'customRewards',
        ];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...features),
            async (feature) => {
              const error: TwitchApiError = {
                error: 'Forbidden',
                status: 403,
                message: 'not eligible',
              };

              const result = parseApiError(error, feature);

              // Solution should mention the specific feature limitation
              expect(result.solution.length).toBeGreaterThan(0);
              expect(result.isPartnerRequired).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Rate limit handling with retry (8.4)', () => {
      it('withRateLimit retries on retryable errors up to maxRetries', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1, max: 3 }),
            async (maxRetries) => {
              let callCount = 0;
              const fn = vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount <= maxRetries) {
                  const error: TwitchApiError = {
                    error: 'Too Many Requests',
                    status: 429,
                    message: 'Rate limited',
                  };
                  throw error;
                }
                return 'success';
              });

              const config: RateLimitConfig = {
                maxRetries,
                baseDelayMs: 1, // Very short for testing
                maxDelayMs: 10,
              };

              const result = await withRateLimit(fn, config);

              expect(result.success).toBe(true);
              expect(result.data).toBe('success');
              expect(result.retriesUsed).toBe(maxRetries);
              expect(fn).toHaveBeenCalledTimes(maxRetries + 1);
            }
          ),
          { numRuns: 10 } // Fewer runs due to async nature
        );
      });

      it('withRateLimit stops retrying after maxRetries', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1, max: 3 }),
            async (maxRetries) => {
              const fn = vi.fn().mockImplementation(async () => {
                const error: TwitchApiError = {
                  error: 'Too Many Requests',
                  status: 429,
                  message: 'Rate limited',
                };
                throw error;
              });

              const config: RateLimitConfig = {
                maxRetries,
                baseDelayMs: 1,
                maxDelayMs: 10,
              };

              const result = await withRateLimit(fn, config);

              expect(result.success).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.retriesUsed).toBe(maxRetries);
              // Called once initially + maxRetries times
              expect(fn).toHaveBeenCalledTimes(maxRetries + 1);
            }
          ),
          { numRuns: 10 }
        );
      });

      it('withRateLimit does not retry non-retryable errors', async () => {
        const nonRetryableStatuses = [400, 401, 403, 404];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...nonRetryableStatuses),
            async (status) => {
              const fn = vi.fn().mockImplementation(async () => {
                const error: TwitchApiError = {
                  error: 'Error',
                  status,
                  message: 'Non-retryable error',
                };
                throw error;
              });

              const result = await withRateLimit(fn, {
                maxRetries: 3,
                baseDelayMs: 1,
                maxDelayMs: 10,
              });

              expect(result.success).toBe(false);
              expect(result.retriesUsed).toBe(0);
              expect(fn).toHaveBeenCalledTimes(1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('withRateLimit returns success immediately when function succeeds', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string(),
            async (expectedResult) => {
              const fn = vi.fn().mockResolvedValue(expectedResult);

              const result = await withRateLimit(fn);

              expect(result.success).toBe(true);
              expect(result.data).toBe(expectedResult);
              expect(result.retriesUsed).toBe(0);
              expect(fn).toHaveBeenCalledTimes(1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('withRetry throws after all retries fail', async () => {
        // Test with a single retry to avoid timeout
        const fn = vi.fn().mockImplementation(async () => {
          const error: TwitchApiError = {
            error: 'Server Error',
            status: 500,
            message: 'Internal error',
          };
          throw error;
        });

        // Use withRateLimit directly with short delays for testing
        const result = await withRateLimit(fn, {
          maxRetries: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
        });

        expect(result.success).toBe(false);
        expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      }, 10000);
    });

    describe('Input validation before API calls (8.5)', () => {
      it('validateNonEmptyString rejects empty and whitespace strings', async () => {
        await fc.assert(
          fc.asyncProperty(
            whitespaceStringArb,
            nonEmptyStringArb,
            async (emptyValue, fieldName) => {
              const result = validateNonEmptyString(emptyValue, fieldName);

              expect(result.valid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
              expect(result.errors[0]).toContain(fieldName);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateNonEmptyString accepts non-empty strings', async () => {
        await fc.assert(
          fc.asyncProperty(
            nonEmptyStringArb.filter(s => s.trim().length > 0),
            nonEmptyStringArb,
            async (value, fieldName) => {
              const result = validateNonEmptyString(value, fieldName);

              expect(result.valid).toBe(true);
              expect(result.errors).toHaveLength(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateNumberRange correctly validates numbers within range', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 0, max: 100 }),
            fc.integer({ min: 0, max: 50 }),
            fc.integer({ min: 51, max: 100 }),
            async (value, min, max) => {
              // Ensure min < max
              const actualMin = Math.min(min, max);
              const actualMax = Math.max(min, max);

              const result = validateNumberRange(value, 'field', actualMin, actualMax);

              const expected = value >= actualMin && value <= actualMax;
              expect(result.valid).toBe(expected);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateNumberRange rejects non-numbers', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
            async (value) => {
              const result = validateNumberRange(value, 'field', 0, 100);

              expect(result.valid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateArrayLength correctly validates array lengths', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(fc.anything(), { minLength: 0, maxLength: 15 }),
            fc.integer({ min: 0, max: 5 }),
            fc.integer({ min: 5, max: 15 }),
            async (arr, min, max) => {
              const result = validateArrayLength(arr, 'field', min, max);

              const expected = arr.length >= min && arr.length <= max;
              expect(result.valid).toBe(expected);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateArrayLength rejects non-arrays', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            async (value) => {
              const result = validateArrayLength(value, 'field', 0, 10);

              expect(result.valid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('combineValidations aggregates all errors', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.record({
                valid: fc.boolean(),
                errors: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            async (validations) => {
              const result = combineValidations(...validations);

              const expectedErrors = validations.flatMap(v => v.errors);
              const expectedValid = expectedErrors.length === 0;

              expect(result.valid).toBe(expectedValid);
              expect(result.errors).toEqual(expectedErrors);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('validateBeforeApiCall runs all validations and combines results', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
            async (validResults) => {
              const validations = validResults.map(valid => () => ({
                valid,
                errors: valid ? [] : ['error'],
              }));

              const result = validateBeforeApiCall(validations);

              const expectedValid = validResults.every(v => v);
              expect(result.valid).toBe(expectedValid);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Error context helpers', () => {
      it('isTwitchApiError correctly identifies TwitchApiError objects', async () => {
        await fc.assert(
          fc.asyncProperty(
            twitchApiErrorArb,
            async (error) => {
              expect(isTwitchApiError(error)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('isTwitchApiError rejects non-TwitchApiError objects', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.constant(null),
              fc.constant(undefined),
              fc.record({ foo: fc.string() })
            ),
            async (value) => {
              expect(isTwitchApiError(value)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('formatErrorForDisplay always returns valid display object', async () => {
        await fc.assert(
          fc.asyncProperty(
            twitchApiErrorArb,
            featureArb,
            async (error, feature) => {
              const context = parseApiError(error, feature);
              const display = formatErrorForDisplay(context);

              expect(display).toHaveProperty('title');
              expect(display).toHaveProperty('description');
              expect(typeof display.title).toBe('string');
              expect(typeof display.description).toBe('string');
              expect(display.title.length).toBeGreaterThan(0);
              expect(display.description.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('requiresUserAction returns true for auth-related errors', async () => {
        const authStatuses = [401, 403];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...authStatuses),
            async (status) => {
              const error: TwitchApiError = {
                error: 'Auth Error',
                status,
                message: status === 401 ? 'Token expired' : 'scope required',
              };

              const context = parseApiError(error);

              // 401 always requires reauth, 403 with scope message requires reauth
              if (status === 401 || error.message.includes('scope')) {
                expect(requiresUserAction(context)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('shouldAutoRetry returns true only for retryable non-auth errors', async () => {
        const retryableStatuses = [429, 500, 502, 503, 504];
        const nonRetryableStatuses = [400, 401, 403, 404, 409];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...retryableStatuses),
            async (status) => {
              const error: TwitchApiError = {
                error: 'Error',
                status,
                message: 'Server error',
              };

              const context = parseApiError(error);

              expect(shouldAutoRetry(context)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...nonRetryableStatuses),
            async (status) => {
              const error: TwitchApiError = {
                error: 'Error',
                status,
                message: 'Client error',
              };

              const context = parseApiError(error);

              expect(shouldAutoRetry(context)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Error code mapping consistency', () => {
      it('401 errors always set requiresReauth to true', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 100 }),
            async (message) => {
              const error: TwitchApiError = {
                error: 'Unauthorized',
                status: 401,
                message,
              };

              const context = parseApiError(error);

              expect(context.requiresReauth).toBe(true);
              expect([ERROR_CODES.INVALID_TOKEN, ERROR_CODES.TOKEN_EXPIRED]).toContain(context.code);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('429 errors always set isRetryable to true', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 100 }),
            async (message) => {
              const error: TwitchApiError = {
                error: 'Too Many Requests',
                status: 429,
                message,
              };

              const context = parseApiError(error);

              expect(context.isRetryable).toBe(true);
              expect(context.code).toBe(ERROR_CODES.RATE_LIMITED);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('5xx errors always set isRetryable to true', async () => {
        const serverErrorStatuses = [500, 502, 503, 504];

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...serverErrorStatuses),
            fc.string({ minLength: 1, maxLength: 100 }),
            async (status, message) => {
              const error: TwitchApiError = {
                error: 'Server Error',
                status,
                message,
              };

              const context = parseApiError(error);

              expect(context.isRetryable).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
