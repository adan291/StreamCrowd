/**
 * Property Test: Statistics Export Format
 * Property 12: Statistics Export Format
 * Validates: Requirements 8.4 - Statistics export should produce valid JSON and CSV
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES
// ============================================

interface GiveawayHistoryEntry {
  id: string;
  mode: 'viewers' | 'keyword' | 'subs';
  winner: string;
  participants: string[];
  participantCount: number;
  timestamp: number;
  keyword?: string;
  prize?: string;
}

// ============================================
// EXPORT FUNCTIONS (simulates StatsPanel export logic)
// ============================================

const exportToJSON = (entries: GiveawayHistoryEntry[]): string => {
  return JSON.stringify(entries, null, 2);
};

const exportToCSV = (entries: GiveawayHistoryEntry[]): string => {
  const headers = ['ID', 'Modo', 'Ganador', 'Participantes', 'Fecha', 'Keyword', 'Premio'];
  const rows = entries.map(entry => [
    entry.id,
    entry.mode,
    entry.winner,
    entry.participantCount.toString(),
    new Date(entry.timestamp).toISOString(),
    entry.keyword || '',
    entry.prize || '',
  ]);
  
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ];
  
  return csvRows.join('\n');
};

const parseCSV = (csv: string): string[][] => {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
};

// ============================================
// ARBITRARIES
// ============================================

const usernameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
  { minLength: 3, maxLength: 15 }
);

const safeStringArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
  { minLength: 0, maxLength: 30 }
);

const historyEntryArb: fc.Arbitrary<GiveawayHistoryEntry> = fc.record({
  id: fc.uuid(),
  mode: fc.constantFrom('viewers', 'keyword', 'subs') as fc.Arbitrary<'viewers' | 'keyword' | 'subs'>,
  winner: usernameArb,
  participants: fc.array(usernameArb, { minLength: 1, maxLength: 20 }),
  participantCount: fc.integer({ min: 1, max: 1000 }),
  timestamp: fc.integer({ min: 1609459200000, max: 1735689600000 }), // 2021-2025
  keyword: fc.option(safeStringArb, { nil: undefined }),
  prize: fc.option(safeStringArb, { nil: undefined }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Statistics Export Format Property Tests', () => {
  describe('Property 12: Statistics Export Format', () => {
    describe('JSON Export', () => {
      it('should produce valid JSON that can be parsed back', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 0, maxLength: 50 }),
            (entries) => {
              const json = exportToJSON(entries);
              const parsed = JSON.parse(json);
              
              expect(Array.isArray(parsed)).toBe(true);
              expect(parsed.length).toBe(entries.length);
            }
          ),
          { numRuns: 50 }
        );
      });

      it('should preserve all entry data in JSON export', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 20 }),
            (entries) => {
              const json = exportToJSON(entries);
              const parsed = JSON.parse(json) as GiveawayHistoryEntry[];
              
              entries.forEach((original, i) => {
                expect(parsed[i].id).toBe(original.id);
                expect(parsed[i].mode).toBe(original.mode);
                expect(parsed[i].winner).toBe(original.winner);
                expect(parsed[i].participantCount).toBe(original.participantCount);
                expect(parsed[i].timestamp).toBe(original.timestamp);
              });
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should produce non-empty JSON for non-empty input', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 20 }),
            (entries) => {
              const json = exportToJSON(entries);
              expect(json.length).toBeGreaterThan(2); // More than just "[]"
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should produce "[]" for empty input', () => {
        const json = exportToJSON([]);
        expect(JSON.parse(json)).toEqual([]);
      });
    });

    describe('CSV Export', () => {
      it('should have header row as first line', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 0, maxLength: 20 }),
            (entries) => {
              const csv = exportToCSV(entries);
              const lines = csv.split('\n');
              
              expect(lines[0]).toContain('ID');
              expect(lines[0]).toContain('Modo');
              expect(lines[0]).toContain('Ganador');
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should have correct number of rows (header + data)', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 0, maxLength: 20 }),
            (entries) => {
              const csv = exportToCSV(entries);
              const lines = csv.split('\n');
              
              expect(lines.length).toBe(entries.length + 1); // +1 for header
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should have consistent column count across all rows', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 20 }),
            (entries) => {
              const csv = exportToCSV(entries);
              const parsed = parseCSV(csv);
              
              const headerColumnCount = parsed[0].length;
              parsed.forEach((row, i) => {
                expect(row.length).toBe(headerColumnCount);
              });
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should preserve winner names in CSV', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 10 }),
            (entries) => {
              const csv = exportToCSV(entries);
              const parsed = parseCSV(csv);
              
              // Skip header row
              entries.forEach((entry, i) => {
                const row = parsed[i + 1];
                expect(row[2]).toBe(entry.winner); // Winner is 3rd column
              });
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should preserve mode in CSV', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 10 }),
            (entries) => {
              const csv = exportToCSV(entries);
              const parsed = parseCSV(csv);
              
              entries.forEach((entry, i) => {
                const row = parsed[i + 1];
                expect(row[1]).toBe(entry.mode); // Mode is 2nd column
              });
            }
          ),
          { numRuns: 30 }
        );
      });

      it('should handle empty entries array', () => {
        const csv = exportToCSV([]);
        const lines = csv.split('\n');
        
        expect(lines.length).toBe(1); // Just header
        expect(lines[0]).toContain('ID');
      });
    });

    describe('Round-trip consistency', () => {
      it('JSON export should be idempotent when re-exported', () => {
        fc.assert(
          fc.property(
            fc.array(historyEntryArb, { minLength: 1, maxLength: 10 }),
            (entries) => {
              const json1 = exportToJSON(entries);
              const parsed = JSON.parse(json1);
              const json2 = exportToJSON(parsed);
              
              expect(json1).toBe(json2);
            }
          ),
          { numRuns: 20 }
        );
      });
    });
  });
});
