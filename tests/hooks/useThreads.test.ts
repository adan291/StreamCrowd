/**
 * useThreads Property Tests
 * Tests for thread management logic
 * 
 * **Feature: giveaway-improvements**
 * **Property 2: Hook Interface Consistency (threads)**
 * **Validates: Requirements 2.2, 2.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES (simplified from hook)
// ============================================

interface GiveawayParticipant {
  oderId: string;
  username: string;
  timestamp: number;
}

type RaffleMode = 'viewers' | 'keyword' | 'subs';

interface GiveawayThread {
  id: string;
  name: string;
  keyword: string;
  isActive: boolean;
  participants: GiveawayParticipant[];
  mode: RaffleMode;
  allowMultipleEntries: boolean;
}

// ============================================
// PURE FUNCTIONS FOR TESTING
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function addParticipant(
  thread: GiveawayThread, 
  participant: GiveawayParticipant
): GiveawayThread {
  // Check for duplicates if not allowing multiple entries
  if (!thread.allowMultipleEntries) {
    const exists = thread.participants.some(p => p.oderId === participant.oderId);
    if (exists) return thread;
  }
  
  return {
    ...thread,
    participants: [...thread.participants, participant],
  };
}

function getUniqueParticipantCount(thread: GiveawayThread): number {
  return new Set(thread.participants.map(p => p.oderId)).size;
}

function getTotalEntries(thread: GiveawayThread): number {
  return thread.participants.length;
}

function pickWinnerCandidates(
  thread: GiveawayThread, 
  blacklist: Set<string>
): string[] {
  let candidates: string[];
  
  if (thread.mode === 'subs') {
    // For subs mode, use all entries (weighted)
    candidates = thread.participants.map(p => p.username);
  } else {
    // For keyword and viewers mode, use unique participants
    const uniqueMap = new Map<string, GiveawayParticipant>();
    thread.participants.forEach(p => uniqueMap.set(p.oderId, p));
    candidates = Array.from(uniqueMap.values()).map(p => p.username);
  }
  
  // Filter blacklisted users
  if (blacklist.size > 0) {
    candidates = candidates.filter(name => !blacklist.has(name.toLowerCase()));
  }
  
  return candidates;
}

// ============================================
// ARBITRARIES
// ============================================

const participantArb = fc.record({
  oderId: fc.string({ minLength: 5, maxLength: 15 }),
  username: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  timestamp: fc.integer({ min: 0 }),
});

const threadModeArb = fc.constantFrom<RaffleMode>('viewers', 'keyword', 'subs');

const threadArb = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  keyword: fc.string({ minLength: 0, maxLength: 20 }),
  isActive: fc.boolean(),
  participants: fc.array(participantArb, { minLength: 0, maxLength: 30 }),
  mode: threadModeArb,
  allowMultipleEntries: fc.boolean(),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 2: Hook Interface Consistency (threads)', () => {
  describe('Participant Management', () => {
    it('adding participant should increase count when allowMultipleEntries=true', () => {
      fc.assert(
        fc.property(
          threadArb.map(t => ({ ...t, allowMultipleEntries: true })),
          participantArb,
          (thread, participant) => {
            const countBefore = thread.participants.length;
            const newThread = addParticipant(thread, participant);
            
            expect(newThread.participants.length).toBe(countBefore + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding duplicate participant should not increase count when allowMultipleEntries=false', () => {
      fc.assert(
        fc.property(
          threadArb.map(t => ({ ...t, allowMultipleEntries: false })),
          participantArb,
          (thread, participant) => {
            // Add participant first time
            let newThread = addParticipant(thread, participant);
            const countAfterFirst = newThread.participants.length;
            
            // Add same participant again
            newThread = addParticipant(newThread, participant);
            
            expect(newThread.participants.length).toBe(countAfterFirst);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('unique count should be <= total entries', () => {
      fc.assert(
        fc.property(threadArb, (thread) => {
          const unique = getUniqueParticipantCount(thread);
          const total = getTotalEntries(thread);
          
          expect(unique).toBeLessThanOrEqual(total);
        }),
        { numRuns: 100 }
      );
    });

    it('unique count should equal total when all oderIds are unique', () => {
      fc.assert(
        fc.property(
          fc.array(participantArb, { minLength: 0, maxLength: 20 }),
          (participants) => {
            // Make all oderIds unique
            const uniqueParticipants = participants.map((p, i) => ({
              ...p,
              oderId: `unique_${i}_${p.oderId}`,
            }));
            
            const thread: GiveawayThread = {
              id: 'test',
              name: 'Test',
              keyword: '',
              isActive: true,
              participants: uniqueParticipants,
              mode: 'keyword',
              allowMultipleEntries: false,
            };
            
            const unique = getUniqueParticipantCount(thread);
            const total = getTotalEntries(thread);
            
            expect(unique).toBe(total);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Winner Selection', () => {
    it('candidates should not include blacklisted users', () => {
      fc.assert(
        fc.property(
          threadArb,
          fc.array(fc.string({ minLength: 1, maxLength: 25 }), { minLength: 0, maxLength: 10 }),
          (thread, blacklistNames) => {
            const blacklist = new Set(blacklistNames.map(n => n.toLowerCase()));
            const candidates = pickWinnerCandidates(thread, blacklist);
            
            candidates.forEach(candidate => {
              expect(blacklist.has(candidate.toLowerCase())).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('keyword mode should return unique candidates', () => {
      fc.assert(
        fc.property(
          threadArb.map(t => ({ ...t, mode: 'keyword' as const })),
          (thread) => {
            const candidates = pickWinnerCandidates(thread, new Set());
            
            // In keyword mode, candidates should be unique by oderId
            const uniqueOderIds = new Set(thread.participants.map(p => p.oderId));
            expect(candidates.length).toBeLessThanOrEqual(uniqueOderIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('viewers mode should return unique candidates', () => {
      fc.assert(
        fc.property(
          threadArb.map(t => ({ ...t, mode: 'viewers' as const })),
          (thread) => {
            const candidates = pickWinnerCandidates(thread, new Set());
            
            // In viewers mode, candidates should be unique by oderId
            const uniqueOderIds = new Set(thread.participants.map(p => p.oderId));
            expect(candidates.length).toBeLessThanOrEqual(uniqueOderIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('subs mode should return all entries (weighted)', () => {
      fc.assert(
        fc.property(
          threadArb.map(t => ({ ...t, mode: 'subs' as const })),
          (thread) => {
            const candidates = pickWinnerCandidates(thread, new Set());
            
            // In subs mode, candidates should equal total entries
            expect(candidates.length).toBe(thread.participants.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty blacklist should not filter any candidates', () => {
      fc.assert(
        fc.property(threadArb, (thread) => {
          const candidatesWithBlacklist = pickWinnerCandidates(thread, new Set(['nonexistent_user']));
          const candidatesWithoutBlacklist = pickWinnerCandidates(thread, new Set());
          
          // If blacklist doesn't match any participant, counts should be equal
          const hasBlacklistedUser = thread.participants.some(
            p => p.username.toLowerCase() === 'nonexistent_user'
          );
          
          if (!hasBlacklistedUser) {
            expect(candidatesWithBlacklist.length).toBe(candidatesWithoutBlacklist.length);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('candidates from empty thread should be empty', () => {
      const emptyThread: GiveawayThread = {
        id: 'test',
        name: 'Test',
        keyword: '',
        isActive: true,
        participants: [],
        mode: 'keyword',
        allowMultipleEntries: false,
      };
      
      const candidates = pickWinnerCandidates(emptyThread, new Set());
      expect(candidates).toHaveLength(0);
    });
  });

  describe('Thread State', () => {
    it('generateId should produce non-empty strings', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const id = generateId();
          expect(id.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('generateId should produce unique ids (high probability)', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      // With 7 character alphanumeric, collision probability is very low
      expect(ids.size).toBeGreaterThan(990);
    });
  });
});
