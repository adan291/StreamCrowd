/**
 * Property-based tests for DiscordWebhookService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Discord webhook URL validation.
 * 
 * Feature: push-notifications
 * @requirements 2.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidDiscordWebhookUrl, calculateBackoff } from '../../src/application/services/DiscordWebhookService';

// ============ ARBITRARIES ============

/**
 * Arbitrary for valid Discord webhook IDs (snowflake format - numeric string)
 */
const webhookIdArb = fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
  minLength: 17,
  maxLength: 20,
});

/**
 * Arbitrary for valid Discord webhook tokens
 * Tokens are alphanumeric with hyphens and underscores
 */
const webhookTokenArb = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_'
  ),
  { minLength: 60, maxLength: 80 }
);

/**
 * Arbitrary for valid Discord webhook URLs
 */
const validDiscordWebhookUrlArb = fc.tuple(
  fc.constantFrom('discord.com', 'discordapp.com'),
  webhookIdArb,
  webhookTokenArb
).map(([domain, id, token]) => `https://${domain}/api/webhooks/${id}/${token}`);

/**
 * Arbitrary for invalid URLs (various malformed patterns)
 */
const invalidUrlArb = fc.oneof(
  // Empty or whitespace
  fc.constant(''),
  fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 10 }),
  // HTTP instead of HTTPS
  fc.tuple(webhookIdArb, webhookTokenArb).map(
    ([id, token]) => `http://discord.com/api/webhooks/${id}/${token}`
  ),
  // Wrong domain
  fc.tuple(webhookIdArb, webhookTokenArb).map(
    ([id, token]) => `https://notdiscord.com/api/webhooks/${id}/${token}`
  ),
  // Missing path components
  fc.constant('https://discord.com/api/webhooks/'),
  fc.constant('https://discord.com/api/webhooks'),
  fc.constant('https://discord.com/api/'),
  fc.constant('https://discord.com/'),
  // Invalid webhook ID (non-numeric)
  webhookTokenArb.map(token => `https://discord.com/api/webhooks/abc/${token}`),
  // Random strings
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('discord.com/api/webhooks')),
  // URLs with query parameters
  fc.tuple(webhookIdArb, webhookTokenArb).map(
    ([id, token]) => `https://discord.com/api/webhooks/${id}/${token}?param=value`
  ),
  // URLs with fragments
  fc.tuple(webhookIdArb, webhookTokenArb).map(
    ([id, token]) => `https://discord.com/api/webhooks/${id}/${token}#fragment`
  ),
);

// ============ TESTS ============

describe('DiscordWebhookService Property Tests', () => {
  describe('Property 1: Discord Webhook URL Validation', () => {
    /**
     * Feature: push-notifications, Property 1: Discord Webhook URL Validation
     * 
     * For any string input, validating it as a Discord webhook URL SHALL return true 
     * only if it matches the Discord webhook URL pattern 
     * (`https://discord.com/api/webhooks/{id}/{token}` or 
     * `https://discordapp.com/api/webhooks/{id}/{token}`).
     * 
     * **Validates: Requirements 2.1**
     */
    it('should return true for all valid Discord webhook URLs', () => {
      fc.assert(
        fc.property(
          validDiscordWebhookUrlArb,
          (url) => {
            const result = isValidDiscordWebhookUrl(url);
            expect(result).toBe(true);
            return result === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for all invalid URLs', () => {
      fc.assert(
        fc.property(
          invalidUrlArb,
          (url) => {
            const result = isValidDiscordWebhookUrl(url);
            expect(result).toBe(false);
            return result === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null and undefined inputs gracefully', () => {
      expect(isValidDiscordWebhookUrl(null as unknown as string)).toBe(false);
      expect(isValidDiscordWebhookUrl(undefined as unknown as string)).toBe(false);
    });

    it('should accept both discord.com and discordapp.com domains', () => {
      fc.assert(
        fc.property(
          webhookIdArb,
          webhookTokenArb,
          (id, token) => {
            const discordComUrl = `https://discord.com/api/webhooks/${id}/${token}`;
            const discordAppUrl = `https://discordapp.com/api/webhooks/${id}/${token}`;
            
            expect(isValidDiscordWebhookUrl(discordComUrl)).toBe(true);
            expect(isValidDiscordWebhookUrl(discordAppUrl)).toBe(true);
            
            return isValidDiscordWebhookUrl(discordComUrl) && isValidDiscordWebhookUrl(discordAppUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trim whitespace from URLs before validation', () => {
      fc.assert(
        fc.property(
          validDiscordWebhookUrlArb,
          fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
          fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
          (url, leadingSpaces, trailingSpaces) => {
            const urlWithSpaces = leadingSpaces + url + trailingSpaces;
            const result = isValidDiscordWebhookUrl(urlWithSpaces);
            expect(result).toBe(true);
            return result === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Retry Backoff Behavior', () => {
    /**
     * Feature: push-notifications, Property 4: Retry Backoff Behavior
     * 
     * For any failed notification attempt, the delay before the next retry 
     * SHALL be exponentially larger than the previous delay (base * 2^attempt), 
     * up to a maximum of 3 attempts.
     * 
     * **Validates: Requirements 2.4, 3.5**
     */
    it('should calculate exponentially increasing backoff delays', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          (attempt) => {
            const delay = calculateBackoff(attempt);
            const baseDelay = 1000;
            const maxDelay = 60000;
            
            // Delay should be at least base * 2^attempt (minus jitter)
            const expectedMinDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            // Delay should be at most base * 2^attempt + 1000ms jitter
            const expectedMaxDelay = expectedMinDelay + 1000;
            
            expect(delay).toBeGreaterThanOrEqual(expectedMinDelay);
            expect(delay).toBeLessThanOrEqual(expectedMaxDelay);
            
            return delay >= expectedMinDelay && delay <= expectedMaxDelay;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cap delay at maximum value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 20 }), // Large attempt numbers
          (attempt) => {
            const delay = calculateBackoff(attempt);
            const maxDelay = 60000;
            const maxWithJitter = maxDelay + 1000;
            
            expect(delay).toBeLessThanOrEqual(maxWithJitter);
            return delay <= maxWithJitter;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce increasing delays for consecutive attempts', () => {
      // Test without jitter influence by checking the base pattern
      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        // Run multiple times and take minimum to reduce jitter effect
        const samples = Array.from({ length: 10 }, () => calculateBackoff(i));
        delays.push(Math.min(...samples));
      }
      
      // Each delay should be roughly double the previous (accounting for jitter)
      for (let i = 1; i < delays.length; i++) {
        // The minimum delay at attempt i should be >= minimum delay at attempt i-1
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }
    });
  });
});
