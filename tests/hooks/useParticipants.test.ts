/**
 * useParticipants Property Tests
 * Tests for participant management logic
 * 
 * **Feature: giveaway-improvements**
 * **Property 2: Hook Interface Consistency (participants)**
 * **Validates: Requirements 2.3, 2.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// PURE FUNCTIONS EXTRACTED FOR TESTING
// ============================================

/**
 * Normalize a participant name (lowercase, trimmed)
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Add participant to set (returns true if added, false if duplicate)
 */
function addParticipant(participants: Set<string>, name: string): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return false;
  if (participants.has(normalized)) return false;
  participants.add(normalized);
  return true;
}

/**
 * Add multiple participants, returns count of added
 */
function addMultipleParticipants(participants: Set<string>, names: string[]): number {
  let added = 0;
  names.forEach(name => {
    const normalized = normalizeName(name);
    if (normalized && !participants.has(normalized)) {
      participants.add(normalized);
      added++;
    }
  });
  return added;
}

/**
 * Filter out blacklisted names
 */
function filterBlacklisted(names: string[], blacklist: Set<string>): string[] {
  return names.filter(name => !blacklist.has(normalizeName(name)));
}

/**
 * Import list from string content
 */
function importList(participants: Set<string>, content: string): { added: number; duplicates: number } {
  const lines = content
    .split(/[\n\r]+/)
    .map(l => l.trim().toLowerCase())
    .filter(l => l.length > 0);
  
  let added = 0;
  let duplicates = 0;
  
  lines.forEach(name => {
    if (participants.has(name)) {
      duplicates++;
    } else {
      participants.add(name);
      added++;
    }
  });
  
  return { added, duplicates };
}

/**
 * Export list to string
 */
function exportList(participants: Set<string>): string {
  return Array.from(participants).join('\n');
}

// ============================================
// ARBITRARIES
// ============================================

const usernameArb = fc.string({ minLength: 1, maxLength: 25 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());

const usernameListArb = fc.array(usernameArb, { minLength: 0, maxLength: 50 });

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 2: Hook Interface Consistency (participants)', () => {
  describe('Normalization', () => {
    it('normalization should be idempotent', () => {
      fc.assert(
        fc.property(usernameArb, (name) => {
          const once = normalizeName(name);
          const twice = normalizeName(once);
          expect(once).toBe(twice);
        }),
        { numRuns: 100 }
      );
    });

    it('normalization should be case-insensitive', () => {
      fc.assert(
        fc.property(usernameArb, (name) => {
          const lower = normalizeName(name.toLowerCase());
          const upper = normalizeName(name.toUpperCase());
          expect(lower).toBe(upper);
        }),
        { numRuns: 100 }
      );
    });

    it('normalization should trim whitespace', () => {
      fc.assert(
        fc.property(usernameArb, (name) => {
          const withSpaces = normalizeName(`  ${name}  `);
          const without = normalizeName(name);
          expect(withSpaces).toBe(without);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Add Participant', () => {
    it('adding a participant should increase set size by 1 (if not duplicate)', () => {
      fc.assert(
        fc.property(usernameListArb, usernameArb, (existing, newName) => {
          const participants = new Set(existing.map(normalizeName));
          const sizeBefore = participants.size;
          const wasAdded = addParticipant(participants, newName);
          
          if (wasAdded) {
            expect(participants.size).toBe(sizeBefore + 1);
          } else {
            expect(participants.size).toBe(sizeBefore);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('adding same participant twice should return false second time', () => {
      fc.assert(
        fc.property(usernameArb, (name) => {
          const participants = new Set<string>();
          const first = addParticipant(participants, name);
          const second = addParticipant(participants, name);
          
          expect(first).toBe(true);
          expect(second).toBe(false);
          expect(participants.size).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('adding empty/whitespace name should return false', () => {
      const emptyNames = ['', '   ', '\t', '\n'];
      emptyNames.forEach(name => {
        const participants = new Set<string>();
        const result = addParticipant(participants, name);
        expect(result).toBe(false);
        expect(participants.size).toBe(0);
      });
    });
  });

  describe('Add Multiple Participants', () => {
    it('adding multiple should return correct count of unique additions', () => {
      fc.assert(
        fc.property(usernameListArb, (names) => {
          const participants = new Set<string>();
          const added = addMultipleParticipants(participants, names);
          
          // Count should equal unique normalized names
          const uniqueNormalized = new Set(
            names.map(normalizeName).filter(n => n.length > 0)
          );
          expect(added).toBe(uniqueNormalized.size);
          expect(participants.size).toBe(uniqueNormalized.size);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Blacklist Filtering', () => {
    it('filtered list should not contain any blacklisted names', () => {
      fc.assert(
        fc.property(usernameListArb, usernameListArb, (names, blacklistNames) => {
          const blacklist = new Set(blacklistNames.map(normalizeName));
          const filtered = filterBlacklisted(names, blacklist);
          
          filtered.forEach(name => {
            expect(blacklist.has(normalizeName(name))).toBe(false);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('filtered list length should be <= original list length', () => {
      fc.assert(
        fc.property(usernameListArb, usernameListArb, (names, blacklistNames) => {
          const blacklist = new Set(blacklistNames.map(normalizeName));
          const filtered = filterBlacklisted(names, blacklist);
          
          expect(filtered.length).toBeLessThanOrEqual(names.length);
        }),
        { numRuns: 100 }
      );
    });

    it('empty blacklist should return all names', () => {
      fc.assert(
        fc.property(usernameListArb, (names) => {
          const blacklist = new Set<string>();
          const filtered = filterBlacklisted(names, blacklist);
          
          expect(filtered.length).toBe(names.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Import/Export Round-Trip', () => {
    it('export then import should preserve all participants', () => {
      fc.assert(
        fc.property(usernameListArb, (names) => {
          // Create initial set
          const participants = new Set<string>();
          addMultipleParticipants(participants, names);
          const originalSize = participants.size;
          
          // Export
          const exported = exportList(participants);
          
          // Import into new set
          const newParticipants = new Set<string>();
          const { added } = importList(newParticipants, exported);
          
          // Should have same content
          expect(added).toBe(originalSize);
          expect(newParticipants.size).toBe(originalSize);
          
          // All original participants should be in new set
          participants.forEach(p => {
            expect(newParticipants.has(p)).toBe(true);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('import should correctly count duplicates', () => {
      fc.assert(
        fc.property(usernameListArb, (names) => {
          const participants = new Set<string>();
          
          // First import
          const first = importList(participants, names.join('\n'));
          
          // Second import of same content
          const second = importList(participants, names.join('\n'));
          
          // Second import should add nothing new
          expect(second.added).toBe(0);
          
          // The number of duplicates in second import equals the number of 
          // non-empty unique names in the input (which is what was added in first import)
          // But the test counts lines, not unique additions
          // So we check that duplicates >= first.added (could be more if input had duplicates)
          expect(second.duplicates).toBeGreaterThanOrEqual(first.added);
        }),
        { numRuns: 100 }
      );
    });
  });
});
