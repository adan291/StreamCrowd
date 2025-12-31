/**
 * Property-based tests for Scope Verification Utilities
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the scope verification system.
 * 
 * Feature: twitch-tools-implementation
 * Property 8: Permission Validation
 * 
 * @requirements 1.5, 4.2, 8.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  TWITCH_SCOPES,
  FEATURE_SCOPES,
  hasScope,
  hasAllScopes,
  hasAnyScope,
  verifyScopes,
  verifyScopesForFeature,
  canUsePredictions,
  canUseChannelPoints,
  getScopeDescription,
  registerReauthPrompt,
  createScopeChecker,
  withScopeCheck,
} from '../../src/application/utils/scopeVerification';
import { AuthService } from '../../src/application/services/AuthService';

// ============ ARBITRARIES ============

// Generate valid Twitch scope strings
const validScopeArb = fc.constantFrom(
  TWITCH_SCOPES.MANAGE_PREDICTIONS,
  TWITCH_SCOPES.READ_PREDICTIONS,
  TWITCH_SCOPES.MANAGE_REDEMPTIONS,
  TWITCH_SCOPES.READ_REDEMPTIONS,
  TWITCH_SCOPES.CHAT_READ,
  TWITCH_SCOPES.CHAT_EDIT,
  TWITCH_SCOPES.MODERATOR_MANAGE_BANNED_USERS,
  TWITCH_SCOPES.MODERATOR_MANAGE_CHAT_MESSAGES,
  TWITCH_SCOPES.MODERATION_READ,
  TWITCH_SCOPES.CHANNEL_READ_SUBSCRIPTIONS,
  TWITCH_SCOPES.CHANNEL_READ_VIPS,
  TWITCH_SCOPES.BITS_READ
);

// Generate arrays of valid scopes
const scopeArrayArb = fc.array(validScopeArb, { minLength: 0, maxLength: 10 });

// Generate unique arrays of valid scopes
const uniqueScopeArrayArb = fc.uniqueArray(validScopeArb, { minLength: 0, maxLength: 10 });

// Generate invalid scope strings
const invalidScopeArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !Object.values(TWITCH_SCOPES).includes(s as any));

// Generate feature names
const featureNameArb = fc.constantFrom(
  'predictions',
  'channelPoints',
  'rewards',
  'redemptions',
  'chat',
  'moderation'
) as fc.Arbitrary<keyof typeof FEATURE_SCOPES>;

// ============ TESTS ============

describe('Scope Verification Property Tests', () => {
  beforeEach(() => {
    // Reset auth state before each test
    AuthService.clear();
  });

  afterEach(() => {
    AuthService.clear();
    vi.clearAllMocks();
  });

  describe('Property 8: Permission Validation', () => {
    /**
     * Feature: twitch-tools-implementation, Property 8: Permission Validation
     * 
     * For any API operation requiring specific scopes, the system SHALL check for
     * the required scope before making the request and prompt for re-authentication
     * if missing.
     * 
     * **Validates: Requirements 1.5, 4.2, 8.1**
     */

    it('hasScope returns true only when scope is present in auth state', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          validScopeArb,
          async (presentScopes, scopeToCheck) => {
            // Set up auth state with specific scopes
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const result = hasScope(scopeToCheck);
            const expected = presentScopes.includes(scopeToCheck);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hasAllScopes returns true only when all required scopes are present', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          uniqueScopeArrayArb,
          async (presentScopes, requiredScopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const result = hasAllScopes(requiredScopes);
            const expected = requiredScopes.every(scope => presentScopes.includes(scope));

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hasAnyScope returns true when at least one required scope is present', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          uniqueScopeArrayArb.filter(arr => arr.length > 0),
          async (presentScopes, requiredScopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const result = hasAnyScope(requiredScopes);
            const expected = requiredScopes.some(scope => presentScopes.includes(scope));

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyScopes correctly identifies missing scopes', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          uniqueScopeArrayArb,
          async (presentScopes, requiredScopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const result = verifyScopes({ requiredScopes });

            // Verify missing scopes are correctly identified
            const expectedMissing = requiredScopes.filter(s => !presentScopes.includes(s));
            const expectedPresent = requiredScopes.filter(s => presentScopes.includes(s));

            expect(result.missingScopes.sort()).toEqual(expectedMissing.sort());
            expect(result.presentScopes.sort()).toEqual(expectedPresent.sort());
            expect(result.hasAllScopes).toBe(expectedMissing.length === 0);
            expect(result.isAuthenticated).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyScopes reports not authenticated when no auth', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb.filter(arr => arr.length > 0), // Need at least one scope to test
          async (requiredScopes) => {
            // Ensure no auth
            AuthService.clear();

            const result = verifyScopes({ requiredScopes });

            expect(result.isAuthenticated).toBe(false);
            // When not authenticated, hasAllScopes should be false (no scopes present)
            expect(result.hasAllScopes).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyScopes triggers reauth callback when scopes are missing and promptReauth is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb.filter(arr => arr.length > 0),
          async (requiredScopes) => {
            // Set up auth with NO scopes
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: [],
            });

            const mockCallback = vi.fn();
            const cleanup = registerReauthPrompt(mockCallback);

            verifyScopes({ requiredScopes, promptReauth: true });

            // Callback should be called with missing scopes
            expect(mockCallback).toHaveBeenCalledTimes(1);
            expect(mockCallback).toHaveBeenCalledWith(
              expect.arrayContaining(requiredScopes),
              expect.any(String)
            );

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyScopes does not trigger callback when all scopes are present', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          async (scopes) => {
            // Set up auth with ALL required scopes
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: scopes,
            });

            const mockCallback = vi.fn();
            const cleanup = registerReauthPrompt(mockCallback);

            verifyScopes({ requiredScopes: scopes, promptReauth: true });

            // Callback should NOT be called
            expect(mockCallback).not.toHaveBeenCalled();

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canUsePredictions returns true only with MANAGE_PREDICTIONS scope', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          async (scopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: scopes,
            });

            const result = canUsePredictions();
            const expected = scopes.includes(TWITCH_SCOPES.MANAGE_PREDICTIONS);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canUseChannelPoints returns true only with MANAGE_REDEMPTIONS scope', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          async (scopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: scopes,
            });

            const result = canUseChannelPoints();
            const expected = scopes.includes(TWITCH_SCOPES.MANAGE_REDEMPTIONS);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyScopesForFeature checks correct scopes for each feature', async () => {
      await fc.assert(
        fc.asyncProperty(
          featureNameArb,
          uniqueScopeArrayArb,
          async (feature, presentScopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const result = verifyScopesForFeature(feature);
            const requiredScopes = FEATURE_SCOPES[feature] || [];
            const expectedHasAll = requiredScopes.every(s => (presentScopes as string[]).includes(s));

            expect(result.hasAllScopes).toBe(expectedHasAll);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getScopeDescription returns non-empty string for all valid scopes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validScopeArb,
          async (scope) => {
            const description = getScopeDescription(scope);

            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createScopeChecker creates a function that correctly checks scopes', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          uniqueScopeArrayArb,
          async (presentScopes, requiredScopes) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: presentScopes,
            });

            const checker = createScopeChecker(requiredScopes);
            const result = checker();
            const expected = requiredScopes.every(s => presentScopes.includes(s));

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('withScopeCheck returns error when scopes are missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb.filter(arr => arr.length > 0),
          async (requiredScopes) => {
            // Set up auth with NO scopes
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: [],
            });

            const mockFn = vi.fn().mockResolvedValue('success');
            const wrappedFn = withScopeCheck(requiredScopes, mockFn);

            const result = await wrappedFn();

            // Should return error object, not call the function
            expect(mockFn).not.toHaveBeenCalled();
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('missingScopes');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('withScopeCheck calls function when all scopes are present', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb,
          fc.string(),
          async (scopes, expectedResult) => {
            AuthService.setOAuthAuth({
              token: 'test_token',
              userId: '12345',
              channelName: 'testchannel',
              scopes: scopes,
            });

            const mockFn = vi.fn().mockResolvedValue(expectedResult);
            const wrappedFn = withScopeCheck(scopes, mockFn);

            const result = await wrappedFn();

            // Should call the function and return its result
            expect(mockFn).toHaveBeenCalled();
            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('withScopeCheck returns auth error when not authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueScopeArrayArb.filter(arr => arr.length > 0),
          async (requiredScopes) => {
            // Ensure no auth
            AuthService.clear();

            const mockFn = vi.fn().mockResolvedValue('success');
            const wrappedFn = withScopeCheck(requiredScopes, mockFn);

            const result = await wrappedFn();

            // Should return error about not being authenticated
            expect(mockFn).not.toHaveBeenCalled();
            expect(result).toHaveProperty('error');
            expect((result as any).error).toContain('autenticado');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
