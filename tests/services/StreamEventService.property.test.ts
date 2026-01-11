/**
 * Property-based tests for StreamEventService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the stream event system.
 * 
 * @requirements 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { StreamEventService } from '../../src/application/services/StreamEventService';
import type { StreamEvent, StreamEventType, SubTier } from '../../src/domain/entities/StreamEvent';

// ============ ARBITRARIES ============

const eventTypeArb: fc.Arbitrary<StreamEventType> = fc.constantFrom(
  'sub', 'resub', 'subgift', 'submysterygift', 'primepaidupgrade',
  'giftpaidupgrade', 'raid', 'cheer', 'hosted', 'ban', 'timeout'
);

const subTierArb: fc.Arbitrary<SubTier> = fc.constantFrom('Prime', '1000', '2000', '3000');

const usernameArb = fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s));

const streamEventArb = (baseTimestamp: number): fc.Arbitrary<Omit<StreamEvent, 'id'>> => fc.record({
  type: eventTypeArb,
  username: usernameArb,
  displayName: usernameArb,
  channel: fc.constant('testchannel'),
  timestamp: fc.integer({ min: baseTimestamp, max: baseTimestamp + 3600000 }), // Within 1 hour
  tier: fc.option(subTierArb, { nil: undefined }),
  months: fc.option(fc.integer({ min: 1, max: 120 }), { nil: undefined }),
  bits: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
  giftCount: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  message: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
});

// ============ TESTS ============

describe('StreamEventService Property Tests', () => {
  let service: StreamEventService;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      writable: true,
    });
    
    service = new StreamEventService();
    service.startSession('testchannel');
  });

  afterEach(() => {
    service.endSession();
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Property 8: Event Storage - addEvent followed by getEvents contains the event', () => {
    /**
     * Adding an event should make it retrievable via getEvents.
     * 
     * @validates Requirements 2.4
     */
    it('should store and retrieve events correctly', () => {
      const baseTimestamp = Date.now();
      
      fc.assert(
        fc.property(
          streamEventArb(baseTimestamp),
          (eventData) => {
            const addedEvent = service.addEvent(eventData);
            const events = service.getEvents();
            
            expect(events.some(e => e.id === addedEvent.id)).toBe(true);
            expect(addedEvent.type).toBe(eventData.type);
            expect(addedEvent.username).toBe(eventData.username);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: Event Storage - getEventsByTimeRange filters correctly', () => {
    /**
     * getEventsByTimeRange should only return events within the specified range.
     * 
     * @validates Requirements 2.7
     */
    it('should filter events by time range correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 1700000000000 }), // Base timestamp
          fc.integer({ min: 1000, max: 100000 }), // Range size in ms
          fc.array(fc.integer({ min: 0, max: 200000 }), { minLength: 5, maxLength: 20 }), // Offsets
          (baseTime, rangeSize, offsets) => {
            // Create fresh service for this test
            const testService = new StreamEventService();
            testService.startSession('testchannel');
            
            const rangeStart = baseTime;
            const rangeEnd = baseTime + rangeSize;
            
            // Add events at various timestamps
            const addedEvents = offsets.map((offset, i) => {
              return testService.addEvent({
                type: 'cheer',
                username: `user${i}`,
                displayName: `User${i}`,
                channel: 'testchannel',
                timestamp: baseTime + offset,
                bits: 100,
              });
            });
            
            // Get events in range
            const eventsInRange = testService.getEventsByTimeRange(rangeStart, rangeEnd);
            
            // Verify all returned events are within range
            eventsInRange.forEach(event => {
              expect(event.timestamp).toBeGreaterThanOrEqual(rangeStart);
              expect(event.timestamp).toBeLessThanOrEqual(rangeEnd);
            });
            
            // Verify no events outside range are returned
            const outsideRangeEvents = addedEvents.filter(
              e => e.timestamp < rangeStart || e.timestamp > rangeEnd
            );
            outsideRangeEvents.forEach(event => {
              expect(eventsInRange.some(e => e.id === event.id)).toBe(false);
            });
            
            testService.endSession();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 10: Listener Notification - Registered listeners receive events', () => {
    /**
     * Listeners registered with on() should receive all events added after registration.
     * 
     * @validates Requirements 2.5
     */
    it('should notify registered listeners of new events', () => {
      fc.assert(
        fc.property(
          fc.array(eventTypeArb, { minLength: 1, maxLength: 10 }),
          (eventTypes) => {
            const testService = new StreamEventService();
            testService.startSession('testchannel');
            
            const receivedEvents: StreamEvent[] = [];
            const unsubscribe = testService.on('all', (event) => {
              receivedEvents.push(event);
            });
            
            // Add events
            eventTypes.forEach((type, i) => {
              testService.addEvent({
                type,
                username: `user${i}`,
                displayName: `User${i}`,
                channel: 'testchannel',
                timestamp: Date.now() + i,
              });
            });
            
            // All events should have been received
            expect(receivedEvents.length).toBe(eventTypes.length);
            
            unsubscribe();
            testService.endSession();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 11: Listener Notification - Removed listeners do not receive events', () => {
    /**
     * Listeners removed with off() should not receive subsequent events.
     * 
     * @validates Requirements 2.5
     */
    it('should not notify removed listeners', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Events before unsubscribe
          fc.integer({ min: 1, max: 5 }), // Events after unsubscribe
          (beforeCount, afterCount) => {
            const testService = new StreamEventService();
            testService.startSession('testchannel');
            
            const receivedEvents: StreamEvent[] = [];
            const listener = (event: StreamEvent) => {
              receivedEvents.push(event);
            };
            
            const unsubscribe = testService.on('all', listener);
            
            // Add events before unsubscribe
            for (let i = 0; i < beforeCount; i++) {
              testService.addEvent({
                type: 'cheer',
                username: `user${i}`,
                displayName: `User${i}`,
                channel: 'testchannel',
                timestamp: Date.now() + i,
                bits: 100,
              });
            }
            
            const countBeforeUnsubscribe = receivedEvents.length;
            expect(countBeforeUnsubscribe).toBe(beforeCount);
            
            // Unsubscribe
            unsubscribe();
            
            // Add events after unsubscribe
            for (let i = 0; i < afterCount; i++) {
              testService.addEvent({
                type: 'raid',
                username: `raider${i}`,
                displayName: `Raider${i}`,
                channel: 'testchannel',
                timestamp: Date.now() + beforeCount + i,
              });
            }
            
            // Should not have received any new events
            expect(receivedEvents.length).toBe(countBeforeUnsubscribe);
            
            testService.endSession();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 12: Tier Categorization - Prime subs are categorized as Prime', () => {
    /**
     * Subs with tier 'Prime' should be categorized as Prime.
     * 
     * @validates Requirements 2.6
     */
    it('should categorize Prime tier correctly', () => {
      expect(StreamEventService.categorizeTier('Prime')).toBe('Prime');
    });
  });

  describe('Property 13: Tier Categorization - Numeric tiers are categorized correctly', () => {
    /**
     * Subs with tier '1000'/'2000'/'3000' should be categorized correctly.
     * 
     * @validates Requirements 2.6
     */
    it('should categorize numeric tiers correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('1000', '2000', '3000', 'Prime', undefined, 'unknown'),
          (tier) => {
            const result = StreamEventService.categorizeTier(tier);
            
            if (tier === 'Prime') {
              expect(result).toBe('Prime');
            } else if (tier === '2000') {
              expect(result).toBe('2000');
            } else if (tier === '3000') {
              expect(result).toBe('3000');
            } else {
              // Default to '1000' for '1000', undefined, or unknown values
              expect(result).toBe('1000');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
