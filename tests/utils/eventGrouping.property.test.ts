/**
 * Property-based tests for Event Grouping Utility
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the event grouping functionality.
 * 
 * Feature: stream-activity-refactor, Property 6: Event Grouping
 * @validates Requirements 5.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  groupEvents,
  isGroupableType,
  getGroupDisplayText,
  mergeAdjacentGroups,
  DEFAULT_GROUPING_CONFIG,
  DEFAULT_GROUPABLE_TYPES,
  type ActivityEventType,
  type ActivityStreamEvent,
  type EventGroupingConfig,
  type EventGroup,
} from '../../src/application/utils/eventGrouping';

// ============ ARBITRARIES ============

// Generate valid event types
const eventTypeArb = fc.constantFrom(
  'vote', 'follow', 'sub', 'resub', 'gift', 'raid', 'bits', 'ban', 'timeout'
) as fc.Arbitrary<ActivityEventType>;

// Generate groupable event types only
const groupableTypeArb = fc.constantFrom('vote', 'follow') as fc.Arbitrary<ActivityEventType>;

// Generate non-groupable event types
const nonGroupableTypeArb = fc.constantFrom(
  'sub', 'resub', 'gift', 'raid', 'bits', 'ban', 'timeout'
) as fc.Arbitrary<ActivityEventType>;

// Generate valid usernames
const usernameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// Generate timestamps within a reasonable range
const timestampArb = fc.integer({
  min: Date.now() - 365 * 24 * 60 * 60 * 1000,
  max: Date.now()
});

// Generate a basic stream event
const streamEventArb: fc.Arbitrary<ActivityStreamEvent> = fc.record({
  id: fc.uuid(),
  type: eventTypeArb,
  username: usernameArb,
  timestamp: timestampArb,
});

// Generate events of a specific type
const eventOfTypeArb = (type: ActivityEventType): fc.Arbitrary<ActivityStreamEvent> => 
  fc.record({
    id: fc.uuid(),
    type: fc.constant(type),
    username: usernameArb,
    timestamp: timestampArb,
  });

// Generate an array of events
const eventsArrayArb = fc.array(streamEventArb, { minLength: 0, maxLength: 50 });

// Generate events within a time window
const eventsInWindowArb = (
  type: ActivityEventType,
  windowMs: number,
  count: number
): fc.Arbitrary<ActivityStreamEvent[]> => {
  return fc.integer({ min: Date.now() - 1000000, max: Date.now() }).chain(baseTime => {
    return fc.array(
      fc.record({
        id: fc.uuid(),
        type: fc.constant(type),
        username: usernameArb,
        timestamp: fc.integer({ min: baseTime, max: baseTime + windowMs }),
      }),
      { minLength: count, maxLength: count }
    );
  });
};

// Generate grouping config
const configArb: fc.Arbitrary<Partial<EventGroupingConfig>> = fc.record({
  windowMs: fc.integer({ min: 1000, max: 600000 }),
  minGroupSize: fc.integer({ min: 2, max: 10 }),
});

// ============ TESTS ============

describe('Event Grouping Property Tests', () => {
  describe('Property 6: Event Grouping', () => {
    /**
     * Feature: stream-activity-refactor, Property 6: Event Grouping
     * 
     * For any sequence of events of the same groupable type within the grouping window,
     * the EventFeed SHALL display them as a single grouped item showing the count.
     * 
     * @validates Requirements 5.1
     */

    it('groupable events within time window should be grouped together', () => {
      fc.assert(
        fc.property(
          groupableTypeArb,
          fc.integer({ min: 2, max: 10 }),
          (type, count) => {
            const windowMs = DEFAULT_GROUPING_CONFIG.windowMs;
            const baseTime = Date.now() - 500000;
            
            // Create events within the window
            const events: ActivityStreamEvent[] = Array.from({ length: count }, (_, i) => ({
              id: `event-${i}`,
              type,
              username: `user${i}`,
              timestamp: baseTime + (i * 1000), // 1 second apart
            }));

            const groups = groupEvents(events);

            // Should result in a single group
            expect(groups.length).toBe(1);
            expect(groups[0].isGrouped).toBe(true);
            expect(groups[0].count).toBe(count);
            expect(groups[0].type).toBe(type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('non-groupable events should never be grouped', () => {
      fc.assert(
        fc.property(
          nonGroupableTypeArb,
          fc.integer({ min: 2, max: 10 }),
          (type, count) => {
            const baseTime = Date.now() - 500000;
            
            // Create events within the window
            const events: ActivityStreamEvent[] = Array.from({ length: count }, (_, i) => ({
              id: `event-${i}`,
              type,
              username: `user${i}`,
              timestamp: baseTime + (i * 1000),
            }));

            const groups = groupEvents(events);

            // Each event should be its own group
            expect(groups.length).toBe(count);
            groups.forEach(group => {
              expect(group.isGrouped).toBe(false);
              expect(group.count).toBe(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('events outside time window should not be grouped together', () => {
      fc.assert(
        fc.property(
          groupableTypeArb,
          fc.integer({ min: 2, max: 5 }),
          (type, count) => {
            const windowMs = DEFAULT_GROUPING_CONFIG.windowMs;
            const baseTime = Date.now() - 1000000;
            
            // Create events outside the window (each separated by more than windowMs)
            const events: ActivityStreamEvent[] = Array.from({ length: count }, (_, i) => ({
              id: `event-${i}`,
              type,
              username: `user${i}`,
              timestamp: baseTime + (i * (windowMs + 10000)), // More than window apart
            }));

            const groups = groupEvents(events);

            // Each event should be its own group (not enough to form groups)
            expect(groups.length).toBe(count);
            groups.forEach(group => {
              expect(group.isGrouped).toBe(false);
              expect(group.count).toBe(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total event count should be preserved after grouping', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          
          // Sum of all group counts should equal original event count
          const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
          expect(totalCount).toBe(events.length);
        }),
        { numRuns: 100 }
      );
    });

    it('all original events should be present in groups', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          
          // Collect all event IDs from groups
          const groupedEventIds = new Set(
            groups.flatMap(g => g.events.map(e => e.id))
          );
          
          // All original event IDs should be present
          for (const event of events) {
            expect(groupedEventIds.has(event.id)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('groups should maintain chronological order', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          
          // Groups should be sorted by startTime
          for (let i = 1; i < groups.length; i++) {
            expect(groups[i - 1].startTime).toBeLessThanOrEqual(groups[i].startTime);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('group startTime should be minimum timestamp and endTime should be maximum', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          
          for (const group of groups) {
            const timestamps = group.events.map(e => e.timestamp);
            expect(group.startTime).toBe(Math.min(...timestamps));
            expect(group.endTime).toBe(Math.max(...timestamps));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('grouped events should all be of the same type', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          
          for (const group of groups) {
            const types = new Set(group.events.map(e => e.type));
            expect(types.size).toBe(1);
            expect(group.type).toBe(group.events[0].type);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('minGroupSize config should be respected', () => {
      fc.assert(
        fc.property(
          groupableTypeArb,
          fc.integer({ min: 3, max: 8 }),
          (type, minGroupSize) => {
            const baseTime = Date.now() - 500000;
            
            // Create exactly minGroupSize - 1 events (should not group)
            const events: ActivityStreamEvent[] = Array.from(
              { length: minGroupSize - 1 },
              (_, i) => ({
                id: `event-${i}`,
                type,
                username: `user${i}`,
                timestamp: baseTime + (i * 1000),
              })
            );

            const groups = groupEvents(events, { minGroupSize });

            // Should not be grouped (not enough events)
            expect(groups.length).toBe(minGroupSize - 1);
            groups.forEach(group => {
              expect(group.isGrouped).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('custom windowMs config should be respected', () => {
      fc.assert(
        fc.property(
          groupableTypeArb,
          fc.integer({ min: 5000, max: 30000 }),
          (type, windowMs) => {
            const baseTime = Date.now() - 500000;
            
            // Create 3 events: 2 within window, 1 outside
            const events: ActivityStreamEvent[] = [
              { id: 'e1', type, username: 'user1', timestamp: baseTime },
              { id: 'e2', type, username: 'user2', timestamp: baseTime + 1000 },
              { id: 'e3', type, username: 'user3', timestamp: baseTime + windowMs + 10000 },
            ];

            const groups = groupEvents(events, { windowMs });

            // First two should be grouped, third separate
            expect(groups.length).toBe(2);
            expect(groups[0].count).toBe(2);
            expect(groups[0].isGrouped).toBe(true);
            expect(groups[1].count).toBe(1);
            expect(groups[1].isGrouped).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isGroupableType', () => {
    it('should return true for groupable types', () => {
      fc.assert(
        fc.property(groupableTypeArb, (type) => {
          expect(isGroupableType(type)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should return false for non-groupable types', () => {
      fc.assert(
        fc.property(nonGroupableTypeArb, (type) => {
          expect(isGroupableType(type)).toBe(false);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('getGroupDisplayText', () => {
    it('should return empty string for single events', () => {
      fc.assert(
        fc.property(streamEventArb, (event) => {
          const group: EventGroup = {
            id: event.id,
            type: event.type,
            events: [event],
            count: 1,
            startTime: event.timestamp,
            endTime: event.timestamp,
            isGrouped: false,
          };
          
          expect(getGroupDisplayText(group)).toBe('');
        }),
        { numRuns: 50 }
      );
    });

    it('should return non-empty string for grouped events', () => {
      fc.assert(
        fc.property(
          groupableTypeArb,
          fc.integer({ min: 2, max: 20 }),
          (type, count) => {
            const baseTime = Date.now() - 60000;
            const events: ActivityStreamEvent[] = Array.from({ length: count }, (_, i) => ({
              id: `event-${i}`,
              type,
              username: `user${i}`,
              timestamp: baseTime + (i * 1000),
            }));

            const group: EventGroup = {
              id: `group-${type}`,
              type,
              events,
              count,
              startTime: events[0].timestamp,
              endTime: events[events.length - 1].timestamp,
              isGrouped: true,
            };

            const text = getGroupDisplayText(group);
            expect(text.length).toBeGreaterThan(0);
            expect(text).toContain(count.toString());
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('mergeAdjacentGroups', () => {
    it('should preserve total event count', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          const groups = groupEvents(events);
          const merged = mergeAdjacentGroups(groups);
          
          const originalCount = groups.reduce((sum, g) => sum + g.count, 0);
          const mergedCount = merged.reduce((sum, g) => sum + g.count, 0);
          
          expect(mergedCount).toBe(originalCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('empty input handling', () => {
    it('should return empty array for empty input', () => {
      const groups = groupEvents([]);
      expect(groups).toEqual([]);
    });

    it('should handle single event', () => {
      fc.assert(
        fc.property(streamEventArb, (event) => {
          const groups = groupEvents([event]);
          
          expect(groups.length).toBe(1);
          expect(groups[0].count).toBe(1);
          expect(groups[0].isGrouped).toBe(false);
          expect(groups[0].events[0].id).toBe(event.id);
        }),
        { numRuns: 50 }
      );
    });
  });
});
