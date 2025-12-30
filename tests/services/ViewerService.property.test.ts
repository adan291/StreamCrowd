/**
 * Property-based tests for ViewerService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the viewer data aggregation service.
 * 
 * Feature: stream-activity-refactor
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  ViewerService,
  createViewerService,
  type ViewerStreamEvent,
  type ViewerStreamEventType,
  type ViewerSubTier,
  type ViewerData,
  type ViewerSortBy,
} from '../../src/application/services/ViewerService';

// ============ ARBITRARIES ============

// Generate valid Twitch usernames (3-25 chars, alphanumeric + underscore)
const usernameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// Generate event types
const eventTypeArb = fc.constantFrom(
  'vote', 'follow', 'sub', 'resub', 'gift', 'raid', 'bits', 'ban', 'timeout'
) as fc.Arbitrary<ViewerStreamEventType>;

// Generate subscription tiers
const tierArb = fc.constantFrom('1000', '2000', '3000') as fc.Arbitrary<ViewerSubTier>;

// Generate timestamps (within last year)
const timestampArb = fc.integer({
  min: Date.now() - 365 * 24 * 60 * 60 * 1000,
  max: Date.now()
});

// Generate sort criteria
const sortByArb = fc.constantFrom('activity', 'bits', 'subs', 'bans') as fc.Arbitrary<ViewerSortBy>;

// Generate a basic stream event
const basicEventArb = fc.record({
  id: fc.uuid(),
  type: eventTypeArb,
  username: usernameArb,
  timestamp: timestampArb,
});

// Generate event data based on type
const eventDataArb = (type: ViewerStreamEventType) => {
  switch (type) {
    case 'sub':
      return fc.record({
        tier: tierArb,
      });
    case 'resub':
      return fc.record({
        tier: tierArb,
        months: fc.integer({ min: 1, max: 120 }),
      });
    case 'gift':
      return fc.oneof(
        // Single gift with recipient
        fc.record({
          recipientUsername: usernameArb,
          tier: tierArb,
        }),
        // Mystery gift with count
        fc.record({
          giftCount: fc.integer({ min: 1, max: 100 }),
          tier: tierArb,
        })
      );
    case 'bits':
      return fc.record({
        amount: fc.integer({ min: 1, max: 100000 }),
      });
    case 'timeout':
      return fc.record({
        duration: fc.integer({ min: 1, max: 86400 }),
        reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      });
    case 'ban':
      return fc.record({
        reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      });
    case 'raid':
      return fc.record({
        viewerCount: fc.integer({ min: 1, max: 100000 }),
      });
    case 'vote':
      return fc.record({
        optionId: fc.integer({ min: 0, max: 10 }),
      });
    default:
      return fc.constant({});
  }
};

// Generate a complete stream event with appropriate data
const streamEventArb: fc.Arbitrary<ViewerStreamEvent> = basicEventArb.chain(base => 
  eventDataArb(base.type).map(data => ({
    ...base,
    data: Object.keys(data).length > 0 ? data : undefined,
  }))
);

// Generate an array of events
const eventsArrayArb = fc.array(streamEventArb, { minLength: 0, maxLength: 50 });

// Generate events for a specific user
const eventsForUserArb = (username: string) => 
  fc.array(
    streamEventArb.map(e => ({ ...e, username })),
    { minLength: 1, maxLength: 20 }
  );

// ============ TESTS ============

describe('ViewerService Property Tests', () => {
  let service: ViewerService;

  beforeEach(() => {
    service = createViewerService();
  });

  describe('Property 3: Viewer Data Aggregation', () => {
    /**
     * Feature: stream-activity-refactor, Property 3: Viewer Data Aggregation
     * 
     * For any sequence of StreamEvents, the ViewerService SHALL correctly aggregate
     * data per username, such that:
     * - totalActivity equals the count of events for that user
     * - Each event type counter equals the count of events of that type
     * - firstSeen is the minimum timestamp and lastSeen is the maximum timestamp
     * 
     * @validates Requirements 3.1, 3.2, 3.5
     */

    it('totalActivity should equal the count of events for each user', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Count events per user manually
          const eventCounts = new Map<string, number>();
          for (const event of events) {
            const key = event.username.toLowerCase();
            eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
            
            // Gift events also add activity to recipients
            if (event.type === 'gift' && event.data?.recipientUsername) {
              const recipientKey = event.data.recipientUsername.toLowerCase();
              eventCounts.set(recipientKey, (eventCounts.get(recipientKey) || 0) + 1);
            }
          }

          // Verify each viewer's totalActivity
          for (const [username, expectedCount] of eventCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.totalActivity).toBe(expectedCount);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('follow counter should equal the count of follow events for each user', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Count follow events per user
          const followCounts = new Map<string, number>();
          for (const event of events) {
            if (event.type === 'follow') {
              const key = event.username.toLowerCase();
              followCounts.set(key, (followCounts.get(key) || 0) + 1);
            }
          }

          // Verify each viewer's follows count
          for (const [username, expectedCount] of followCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.follows).toBe(expectedCount);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('bits counter should equal the sum of bits amounts for each user', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Sum bits per user
          const bitsSums = new Map<string, number>();
          for (const event of events) {
            if (event.type === 'bits' && event.data?.amount) {
              const key = event.username.toLowerCase();
              bitsSums.set(key, (bitsSums.get(key) || 0) + event.data.amount);
            }
          }

          // Verify each viewer's totalBits
          for (const [username, expectedBits] of bitsSums) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.totalBits).toBe(expectedBits);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('firstSeen should be minimum timestamp and lastSeen should be maximum timestamp', () => {
      fc.assert(
        fc.property(
          usernameArb,
          fc.array(timestampArb, { minLength: 1, maxLength: 20 }),
          (username, timestamps) => {
            service.clear();
            
            // Create events with the given timestamps
            const events: ViewerStreamEvent[] = timestamps.map((ts, i) => ({
              id: `event-${i}`,
              type: 'follow' as ViewerStreamEventType,
              username,
              timestamp: ts,
            }));
            
            service.processEvents(events);
            
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.firstSeen).toBe(Math.min(...timestamps));
            expect(viewer!.lastSeen).toBe(Math.max(...timestamps));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ban and timeout counters should be correct', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Count bans and timeouts per user
          const banCounts = new Map<string, number>();
          const timeoutCounts = new Map<string, number>();
          const timeoutSeconds = new Map<string, number>();
          
          for (const event of events) {
            const key = event.username.toLowerCase();
            if (event.type === 'ban') {
              banCounts.set(key, (banCounts.get(key) || 0) + 1);
            }
            if (event.type === 'timeout') {
              timeoutCounts.set(key, (timeoutCounts.get(key) || 0) + 1);
              timeoutSeconds.set(key, (timeoutSeconds.get(key) || 0) + (event.data?.duration || 0));
            }
          }

          // Verify counts
          for (const [username, expectedBans] of banCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.bans).toBe(expectedBans);
          }
          
          for (const [username, expectedTimeouts] of timeoutCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.timeouts).toBe(expectedTimeouts);
            expect(viewer!.totalTimeoutSeconds).toBe(timeoutSeconds.get(username) || 0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('sub and resub counters should be correct', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Count subs and resubs per user
          const subCounts = new Map<string, number>();
          const resubCounts = new Map<string, number>();
          
          for (const event of events) {
            const key = event.username.toLowerCase();
            if (event.type === 'sub') {
              subCounts.set(key, (subCounts.get(key) || 0) + 1);
            }
            if (event.type === 'resub') {
              resubCounts.set(key, (resubCounts.get(key) || 0) + 1);
            }
          }

          // Verify counts
          for (const [username, expectedSubs] of subCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.subs).toBe(expectedSubs);
          }
          
          for (const [username, expectedResubs] of resubCounts) {
            const viewer = service.getViewer(username);
            expect(viewer).not.toBeNull();
            expect(viewer!.resubs).toBe(expectedResubs);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('getViewerCount should return the number of unique viewers', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Count unique usernames (including gift recipients)
          const uniqueUsers = new Set<string>();
          for (const event of events) {
            uniqueUsers.add(event.username.toLowerCase());
            if (event.type === 'gift' && event.data?.recipientUsername) {
              uniqueUsers.add(event.data.recipientUsername.toLowerCase());
            }
          }

          expect(service.getViewerCount()).toBe(uniqueUsers.size);
        }),
        { numRuns: 100 }
      );
    });

    it('getAllViewers should return all viewers', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const allViewers = service.getAllViewers();
          expect(allViewers.length).toBe(service.getViewerCount());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Viewer Sorting', () => {
    /**
     * Feature: stream-activity-refactor, Property 4: Viewer Sorting
     * 
     * For any list of ViewerData and sort criteria, the ViewerService.sortViewers
     * SHALL return viewers in descending order by the specified metric.
     * 
     * @validates Requirements 3.3
     */

    it('sorting by activity should order by totalActivity descending', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const viewers = service.getAllViewers();
          const sorted = service.sortViewers(viewers, 'activity');

          // Verify descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].totalActivity).toBeGreaterThanOrEqual(sorted[i].totalActivity);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('sorting by bits should order by totalBits descending', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const viewers = service.getAllViewers();
          const sorted = service.sortViewers(viewers, 'bits');

          // Verify descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].totalBits).toBeGreaterThanOrEqual(sorted[i].totalBits);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('sorting by subs should order by (totalSubMonths + subs + resubs) descending', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const viewers = service.getAllViewers();
          const sorted = service.sortViewers(viewers, 'subs');

          // Calculate sub value for comparison
          const getSubValue = (v: ViewerData) => v.totalSubMonths + v.subs + v.resubs;

          // Verify descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(getSubValue(sorted[i - 1])).toBeGreaterThanOrEqual(getSubValue(sorted[i]));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('sorting by bans should order by (bans + timeouts) descending', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const viewers = service.getAllViewers();
          const sorted = service.sortViewers(viewers, 'bans');

          // Calculate ban value for comparison
          const getBanValue = (v: ViewerData) => v.bans + v.timeouts;

          // Verify descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(getBanValue(sorted[i - 1])).toBeGreaterThanOrEqual(getBanValue(sorted[i]));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('sortViewers should not modify the original array', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const viewers = service.getAllViewers();
          const originalOrder = viewers.map(v => v.username);
          
          service.sortViewers(viewers, 'bits');
          
          // Original array should be unchanged
          const currentOrder = viewers.map(v => v.username);
          expect(currentOrder).toEqual(originalOrder);
        }),
        { numRuns: 100 }
      );
    });

    it('getTopViewers should return correct number of top viewers', () => {
      fc.assert(
        fc.property(
          eventsArrayArb,
          sortByArb,
          fc.integer({ min: 1, max: 20 }),
          (events, sortBy, limit) => {
            service.clear();
            service.processEvents(events);

            const topViewers = service.getTopViewers(sortBy, limit);
            const allViewers = service.getAllViewers();
            
            // Should return at most 'limit' viewers
            expect(topViewers.length).toBeLessThanOrEqual(limit);
            // Should return at most all viewers
            expect(topViewers.length).toBeLessThanOrEqual(allViewers.length);
            // Should return exactly min(limit, total) viewers
            expect(topViewers.length).toBe(Math.min(limit, allViewers.length));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Viewer Search Filtering', () => {
    /**
     * Feature: stream-activity-refactor, Property 5: Viewer Search Filtering
     * 
     * For any search query string, the ViewerService.searchViewers SHALL return
     * only viewers whose username contains the query (case-insensitive).
     * 
     * @validates Requirements 3.4
     */

    it('search results should only contain usernames matching the query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          eventsArrayArb,
          fc.string({ minLength: 1, maxLength: 10 }),
          (events, query) => {
            service.clear();
            service.processEvents(events);

            const results = service.searchViewers(query);
            const searchTerm = query.toLowerCase().trim();

            // All results should contain the search term
            for (const viewer of results) {
              expect(viewer.username.toLowerCase()).toContain(searchTerm);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search should be case-insensitive', () => {
      fc.assert(
        fc.property(
          usernameArb,
          fc.array(streamEventArb, { minLength: 1, maxLength: 10 }),
          (targetUsername, otherEvents) => {
            service.clear();
            
            // Add an event for the target user
            const targetEvent: ViewerStreamEvent = {
              id: 'target-event',
              type: 'follow',
              username: targetUsername,
              timestamp: Date.now(),
            };
            service.processEvent(targetEvent);
            service.processEvents(otherEvents);

            // Search with different cases
            const lowerResults = service.searchViewers(targetUsername.toLowerCase());
            const upperResults = service.searchViewers(targetUsername.toUpperCase());
            const mixedResults = service.searchViewers(
              targetUsername.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('')
            );

            // All searches should find the target user
            const findTarget = (results: ViewerData[]) => 
              results.some(v => v.username.toLowerCase() === targetUsername.toLowerCase());

            expect(findTarget(lowerResults)).toBe(true);
            expect(findTarget(upperResults)).toBe(true);
            expect(findTarget(mixedResults)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty search should return all viewers', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          const emptyResults = service.searchViewers('');
          const whitespaceResults = service.searchViewers('   ');
          const allViewers = service.getAllViewers();

          expect(emptyResults.length).toBe(allViewers.length);
          expect(whitespaceResults.length).toBe(allViewers.length);
        }),
        { numRuns: 100 }
      );
    });

    it('search should find partial matches', () => {
      fc.assert(
        fc.property(
          usernameArb.filter(u => u.length >= 5),
          (username) => {
            service.clear();
            
            // Add an event for the user
            const event: ViewerStreamEvent = {
              id: 'test-event',
              type: 'follow',
              username,
              timestamp: Date.now(),
            };
            service.processEvent(event);

            // Search with partial username (first 3 chars)
            const partial = username.substring(0, 3);
            const results = service.searchViewers(partial);

            // Should find the user
            expect(results.some(v => v.username.toLowerCase() === username.toLowerCase())).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search results should not include non-matching viewers', () => {
      fc.assert(
        fc.property(eventsArrayArb, (events) => {
          service.clear();
          service.processEvents(events);

          // Use a very specific search term unlikely to match randomly
          const uniqueSearch = 'zzz_unique_search_term_zzz';
          const results = service.searchViewers(uniqueSearch);

          // All viewers in results must contain the search term
          for (const viewer of results) {
            expect(viewer.username.toLowerCase()).toContain(uniqueSearch.toLowerCase());
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
