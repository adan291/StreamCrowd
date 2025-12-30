/**
 * Property-based tests for NotificationService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the notification orchestrator service.
 * 
 * Feature: push-notifications
 * @requirements 2.4, 3.5, 2.3, 2.6, 3.4, 3.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBackoff,
  createNotificationEmbed,
  createTelegramNotificationMessage,
  DEFAULT_RETRY_CONFIG,
} from '../../src/application/services/NotificationService';
import type { NotificationEvent, NotificationEventType } from '../../types/notifications';
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS } from '../../types/notifications';

// ============ ARBITRARIES ============

/**
 * Arbitrary for notification event types
 */
const eventTypeArb: fc.Arbitrary<NotificationEventType> = fc.constantFrom(
  'follower',
  'raid',
  'host',
  'donation',
  'subscription',
  'bits',
  'poll_ended',
  'prediction_resolved',
  'giveaway_winner',
  'command_executed'
);

/**
 * Arbitrary for notification priority
 */
const priorityArb = fc.constantFrom('low', 'normal', 'high') as fc.Arbitrary<'low' | 'normal' | 'high'>;

/**
 * Arbitrary for non-empty strings (for titles and messages)
 */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

/**
 * Arbitrary for notification event data
 */
const eventDataArb = fc.option(
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    fc.oneof(
      fc.string({ maxLength: 50 }),
      fc.integer(),
      fc.boolean()
    ),
    { minKeys: 0, maxKeys: 5 }
  ),
  { nil: undefined }
);

/**
 * Arbitrary for notification events
 */
const notificationEventArb: fc.Arbitrary<NotificationEvent> = fc.record({
  id: fc.uuid(),
  type: eventTypeArb,
  title: nonEmptyStringArb,
  message: nonEmptyStringArb,
  data: eventDataArb,
  timestamp: fc.integer({ min: 1609459200000, max: 1893456000000 }), // 2021-2030
  priority: priorityArb,
});

/**
 * Arbitrary for retry attempt numbers
 */
const attemptArb = fc.integer({ min: 0, max: 10 });

// ============ TESTS ============

describe('NotificationService Property Tests', () => {
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
          attemptArb,
          (attempt) => {
            const delay = calculateBackoff(attempt);
            const { baseDelayMs, maxDelayMs } = DEFAULT_RETRY_CONFIG;
            
            // Delay should be at least base * 2^attempt (minus jitter)
            const expectedMinDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
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

    it('should cap delay at maximum value regardless of attempt number', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // Large attempt numbers
          (attempt) => {
            const delay = calculateBackoff(attempt);
            const maxWithJitter = DEFAULT_RETRY_CONFIG.maxDelayMs + 1000;
            
            expect(delay).toBeLessThanOrEqual(maxWithJitter);
            return delay <= maxWithJitter;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce non-negative delays for all attempts', () => {
      fc.assert(
        fc.property(
          attemptArb,
          (attempt) => {
            const delay = calculateBackoff(attempt);
            expect(delay).toBeGreaterThanOrEqual(0);
            return delay >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect custom retry configuration', () => {
      fc.assert(
        fc.property(
          attemptArb,
          fc.integer({ min: 100, max: 5000 }),
          fc.integer({ min: 10000, max: 120000 }),
          (attempt, baseDelayMs, maxDelayMs) => {
            const customConfig = { maxAttempts: 3, baseDelayMs, maxDelayMs };
            const delay = calculateBackoff(attempt, customConfig);
            
            const expectedMinDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
            const expectedMaxDelay = expectedMinDelay + 1000;
            
            expect(delay).toBeGreaterThanOrEqual(expectedMinDelay);
            expect(delay).toBeLessThanOrEqual(expectedMaxDelay);
            
            return delay >= expectedMinDelay && delay <= expectedMaxDelay;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Notification Message Completeness', () => {
    /**
     * Feature: push-notifications, Property 7: Notification Message Completeness
     * 
     * For any notification sent to Discord, the embed SHALL contain title, 
     * description, color, timestamp, and event type. For any notification 
     * sent to Telegram, the message SHALL contain emoji, formatted text, 
     * and timestamp.
     * 
     * **Validates: Requirements 2.3, 2.6, 3.4, 3.7**
     */
    describe('Discord Embed Completeness', () => {
      it('should create Discord embeds with all required fields', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const embed = createNotificationEmbed(event);
              
              // Title must be present and contain the event title
              expect(embed.title).toBeDefined();
              expect(embed.title.length).toBeGreaterThan(0);
              expect(embed.title).toContain(event.title);
              
              // Description must be present and match the message
              expect(embed.description).toBeDefined();
              expect(embed.description).toBe(event.message);
              
              // Color must be present and be a valid number
              expect(embed.color).toBeDefined();
              expect(typeof embed.color).toBe('number');
              expect(embed.color).toBeGreaterThanOrEqual(0);
              
              // Timestamp must be present and be a valid ISO string
              expect(embed.timestamp).toBeDefined();
              expect(typeof embed.timestamp).toBe('string');
              const parsedDate = new Date(embed.timestamp!);
              expect(parsedDate.getTime()).not.toBeNaN();
              
              // Footer must contain event type
              expect(embed.footer).toBeDefined();
              expect(embed.footer!.text).toContain(event.type);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should use correct color for each event type', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const embed = createNotificationEmbed(event);
              const expectedColor = EVENT_TYPE_COLORS[event.type];
              
              expect(embed.color).toBe(expectedColor);
              return embed.color === expectedColor;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include emoji in Discord embed title', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const embed = createNotificationEmbed(event);
              const expectedEmoji = EVENT_TYPE_EMOJIS[event.type];
              
              expect(embed.title).toContain(expectedEmoji);
              return embed.title.includes(expectedEmoji);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include data fields when present', () => {
        fc.assert(
          fc.property(
            notificationEventArb.filter(e => e.data && Object.keys(e.data).length > 0),
            (event) => {
              const embed = createNotificationEmbed(event);
              
              // Fields should be present when data exists
              expect(embed.fields).toBeDefined();
              expect(Array.isArray(embed.fields)).toBe(true);
              
              // Each field should have name and value
              for (const field of embed.fields!) {
                expect(field.name).toBeDefined();
                expect(field.value).toBeDefined();
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Telegram Message Completeness', () => {
      it('should create Telegram messages with all required components', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const message = createTelegramNotificationMessage(event);
              
              // Message must be non-empty
              expect(message).toBeDefined();
              expect(message.length).toBeGreaterThan(0);
              
              // Message must be longer than just emoji + formatting
              // (emoji + bold markers + newlines + italic markers = ~10 chars minimum)
              expect(message.length).toBeGreaterThan(10);
              
              // Message structure: emoji + bold title + newlines + message + newlines + italic timestamp
              // The title and message may be escaped for Markdown, so we check structure
              const hasStructure = message.includes('*') && message.includes('_') && message.includes('\n');
              expect(hasStructure).toBe(true);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include emoji for each event type in Telegram messages', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const message = createTelegramNotificationMessage(event);
              const expectedEmoji = EVENT_TYPE_EMOJIS[event.type];
              
              expect(message).toContain(expectedEmoji);
              return message.includes(expectedEmoji);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include timestamp in Telegram messages', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const message = createTelegramNotificationMessage(event);
              
              // Message should contain time formatting (underscore for italic in Markdown)
              // The timestamp is wrapped in underscores for italic formatting
              expect(message).toContain('_');
              
              // The message should have some time-like content
              // (hours:minutes:seconds or similar)
              const hasTimePattern = /\d{1,2}:\d{2}/.test(message);
              expect(hasTimePattern).toBe(true);
              
              return hasTimePattern;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should use Markdown formatting in Telegram messages', () => {
        fc.assert(
          fc.property(
            notificationEventArb,
            (event) => {
              const message = createTelegramNotificationMessage(event);
              
              // Should contain bold formatting (asterisks) for title
              expect(message).toContain('*');
              
              // Should contain italic formatting (underscores) for timestamp
              expect(message).toContain('_');
              
              return message.includes('*') && message.includes('_');
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
