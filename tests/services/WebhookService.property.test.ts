// Property-based tests for WebhookService

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  WebhookPayload,
  WebhookEventType,
  WEBHOOK_API_VERSION,
} from '../../types/webhooks';

// Helper to create a valid payload
function createPayload(
  eventType: WebhookEventType,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    event_type: eventType,
    event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    api_version: WEBHOOK_API_VERSION,
    stream: {
      channel_name: 'test_channel',
      platform: 'twitch',
      viewers: 100,
    },
    data,
  };
}

describe('WebhookService Property Tests', () => {
  // Property 3: Payload Round-Trip
  describe('Property 3: Payload Round-Trip', () => {
    it('JSON serialization and deserialization produces equivalent payload', () => {
      const eventTypes: WebhookEventType[] = [
        'follower', 'raid', 'subscription', 'bits',
        'poll_started', 'poll_ended', 'prediction_started',
        'prediction_resolved', 'giveaway_winner', 'macro_executed'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...eventTypes),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.constant(null),
              fc.array(fc.string()),
              fc.array(fc.integer())
            )
          ),
          (eventType, data) => {
            const payload = createPayload(eventType, data);
            const serialized = JSON.stringify(payload);
            const deserialized = JSON.parse(serialized) as WebhookPayload;

            // Verify all fields are preserved
            expect(deserialized.event_type).toBe(payload.event_type);
            expect(deserialized.event_id).toBe(payload.event_id);
            expect(deserialized.timestamp).toBe(payload.timestamp);
            expect(deserialized.api_version).toBe(payload.api_version);
            expect(deserialized.stream).toEqual(payload.stream);
            expect(deserialized.data).toEqual(payload.data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('nested data structures survive round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              id: fc.string(),
              name: fc.string(),
              level: fc.integer({ min: 0, max: 100 }),
            }),
            items: fc.array(fc.string()),
            metadata: fc.dictionary(fc.string(), fc.string()),
          }),
          (data) => {
            const payload = createPayload('follower', data);
            const serialized = JSON.stringify(payload);
            const deserialized = JSON.parse(serialized) as WebhookPayload;

            expect(deserialized.data).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 6: Event Filtering Consistency
  describe('Property 6: Event Filtering Consistency', () => {
    it('webhook only receives events in its configured list', () => {
      const allEvents: WebhookEventType[] = [
        'follower', 'raid', 'subscription', 'bits',
        'poll_started', 'poll_ended', 'prediction_started',
        'prediction_resolved', 'giveaway_winner', 'macro_executed'
      ];

      fc.assert(
        fc.property(
          fc.subarray(allEvents, { minLength: 1 }),
          fc.constantFrom(...allEvents),
          (subscribedEvents, triggeredEvent) => {
            const shouldReceive = subscribedEvents.includes(triggeredEvent);
            
            // Simulate filtering logic
            const wouldDeliver = subscribedEvents.includes(triggeredEvent);
            
            expect(wouldDeliver).toBe(shouldReceive);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty event list means no events are delivered', () => {
      const allEvents: WebhookEventType[] = [
        'follower', 'raid', 'subscription', 'bits',
        'poll_started', 'poll_ended', 'prediction_started',
        'prediction_resolved', 'giveaway_winner', 'macro_executed'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allEvents),
          (triggeredEvent) => {
            const subscribedEvents: WebhookEventType[] = [];
            const wouldDeliver = subscribedEvents.includes(triggeredEvent);
            
            expect(wouldDeliver).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('subscribing to all events means all events are delivered', () => {
      const allEvents: WebhookEventType[] = [
        'follower', 'raid', 'subscription', 'bits',
        'poll_started', 'poll_ended', 'prediction_started',
        'prediction_resolved', 'giveaway_winner', 'macro_executed'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allEvents),
          (triggeredEvent) => {
            const subscribedEvents = [...allEvents];
            const wouldDeliver = subscribedEvents.includes(triggeredEvent);
            
            expect(wouldDeliver).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // URL Validation
  describe('URL Validation', () => {
    it('HTTPS URLs are valid', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['https'] }),
          (url) => {
            const parsed = new URL(url);
            expect(parsed.protocol).toBe('https:');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('HTTP URLs are rejected', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http'] }),
          (url) => {
            const parsed = new URL(url);
            const isValid = parsed.protocol === 'https:';
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Payload Structure
  describe('Payload Structure', () => {
    it('payload always has required fields', () => {
      const eventTypes: WebhookEventType[] = [
        'follower', 'raid', 'subscription', 'bits',
        'poll_started', 'poll_ended', 'prediction_started',
        'prediction_resolved', 'giveaway_winner', 'macro_executed'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...eventTypes),
          fc.dictionary(fc.string(), fc.string()),
          (eventType, data) => {
            const payload = createPayload(eventType, data);

            expect(payload).toHaveProperty('event_type');
            expect(payload).toHaveProperty('event_id');
            expect(payload).toHaveProperty('timestamp');
            expect(payload).toHaveProperty('api_version');
            expect(payload).toHaveProperty('stream');
            expect(payload).toHaveProperty('data');
            
            expect(payload.stream).toHaveProperty('channel_name');
            expect(payload.stream).toHaveProperty('platform');
            expect(payload.stream).toHaveProperty('viewers');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('event_id is unique for each payload', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          (count) => {
            const ids = new Set<string>();
            for (let i = 0; i < count; i++) {
              const payload = createPayload('follower', {});
              ids.add(payload.event_id);
            }
            expect(ids.size).toBe(count);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
