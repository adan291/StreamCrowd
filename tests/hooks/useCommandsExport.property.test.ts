/**
 * Property-based tests for useCommandsExport hook
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the command export/import functionality.
 * 
 * Feature: twitch-tools-implementation
 * Property 6: Command Export Round-Trip
 * 
 * For any set of commands, exporting and then importing SHALL produce
 * an equivalent set of commands (round-trip property).
 * 
 * **Validates: Requirements 6.1, 6.2, 6.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { CustomCommand, UserLevel } from '../../src/domain/ports/ICommandPort';
import type { 
  CommandExportFormat, 
  ExportedCommand,
  CommandUserLevel,
} from '../../types/commandExport';
import {
  toExportFormat,
  fromExportFormat,
  validateImport,
} from '../../src/application/hooks/useCommandsExport';

// ============ ARBITRARIES ============

// Generate valid command names (start with letter, alphanumeric + underscore)
const commandNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
  .map(s => s.toLowerCase());

// Generate valid response strings
const responseArb = fc.string({ minLength: 1, maxLength: 400 })
  .filter(s => s.trim().length > 0);

// Generate valid cooldown values
const cooldownArb = fc.integer({ min: 0, max: 86400 });

// Generate valid user levels
const userLevelArb = fc.constantFrom(
  'everyone', 
  'subscriber', 
  'vip', 
  'moderator', 
  'broadcaster'
) as fc.Arbitrary<UserLevel>;

// Generate a valid CustomCommand
const customCommandArb: fc.Arbitrary<CustomCommand> = fc.record({
  id: fc.uuid(),
  name: commandNameArb,
  response: responseArb,
  cooldown: cooldownArb,
  userLevel: userLevelArb,
  enabled: fc.boolean(),
  usageCount: fc.integer({ min: 0, max: 10000 }),
});

// Generate array of commands with unique names
const uniqueCommandsArb = fc.array(customCommandArb, { minLength: 0, maxLength: 20 })
  .map(commands => {
    const seen = new Set<string>();
    return commands.filter(cmd => {
      const name = cmd.name.toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  });

// Generate a valid ExportedCommand
const exportedCommandArb: fc.Arbitrary<ExportedCommand> = fc.record({
  name: commandNameArb,
  response: responseArb,
  cooldown: cooldownArb,
  userLevel: userLevelArb as fc.Arbitrary<CommandUserLevel>,
  enabled: fc.boolean(),
  aliases: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 0, maxLength: 150 }), { nil: undefined }),
});

// Generate array of exported commands with unique names
const uniqueExportedCommandsArb = fc.array(exportedCommandArb, { minLength: 0, maxLength: 20 })
  .map(commands => {
    const seen = new Set<string>();
    return commands.filter(cmd => {
      const name = cmd.name.toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  });

// Generate a valid CommandExportFormat
const exportFormatArb: fc.Arbitrary<CommandExportFormat> = fc.record({
  version: fc.constant('1.0' as const),
  exportedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  source: fc.constant('twitch-vote' as const),
  commands: uniqueExportedCommandsArb,
});

// ============ TESTS ============

describe('useCommandsExport Property Tests', () => {
  describe('Property 6: Command Export Round-Trip', () => {
    /**
     * Feature: twitch-tools-implementation, Property 6: Command Export Round-Trip
     * 
     * For any set of commands, exporting and then importing SHALL produce
     * an equivalent set of commands (round-trip property).
     * 
     * **Validates: Requirements 6.1, 6.2, 6.5**
     */

    it('toExportFormat then fromExportFormat preserves command data', () => {
      fc.assert(
        fc.property(
          uniqueCommandsArb,
          (commands) => {
            // Export commands
            const exported = toExportFormat(commands);
            
            // Import back
            const imported = fromExportFormat(exported.commands);
            
            // Verify count matches
            expect(imported.length).toBe(commands.length);
            
            // Verify each command's essential fields are preserved
            for (let i = 0; i < commands.length; i++) {
              const original = commands[i];
              const roundTripped = imported[i];
              
              expect(roundTripped.name).toBe(original.name.toLowerCase());
              expect(roundTripped.response).toBe(original.response);
              expect(roundTripped.cooldown).toBe(original.cooldown);
              expect(roundTripped.userLevel).toBe(original.userLevel);
              expect(roundTripped.enabled).toBe(original.enabled);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('export format contains all required fields', () => {
      fc.assert(
        fc.property(
          uniqueCommandsArb,
          (commands) => {
            const exported = toExportFormat(commands);
            
            // Verify format structure
            expect(exported.version).toBe('1.0');
            expect(exported.source).toBe('twitch-vote');
            expect(typeof exported.exportedAt).toBe('string');
            expect(Array.isArray(exported.commands)).toBe(true);
            
            // Verify exportedAt is valid ISO date
            expect(() => new Date(exported.exportedAt)).not.toThrow();
            
            // Verify each exported command has required fields
            for (const cmd of exported.commands) {
              expect(typeof cmd.name).toBe('string');
              expect(typeof cmd.response).toBe('string');
              expect(typeof cmd.cooldown).toBe('number');
              expect(['everyone', 'subscriber', 'vip', 'moderator', 'broadcaster']).toContain(cmd.userLevel);
              expect(typeof cmd.enabled).toBe('boolean');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validateImport accepts valid export format', () => {
      fc.assert(
        fc.property(
          exportFormatArb,
          (exportData) => {
            const result = validateImport(exportData);
            
            // Valid export format should pass validation
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.commandCount).toBe(exportData.commands.length);
            expect(result.data).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip through JSON serialization preserves data', () => {
      fc.assert(
        fc.property(
          uniqueCommandsArb,
          (commands) => {
            // Export to format
            const exported = toExportFormat(commands);
            
            // Serialize to JSON and back (simulating file save/load)
            const jsonString = JSON.stringify(exported);
            const parsed = JSON.parse(jsonString);
            
            // Validate the parsed data
            const validation = validateImport(parsed);
            expect(validation.valid).toBe(true);
            
            // Import back
            if (validation.data) {
              const imported = fromExportFormat(validation.data.commands);
              
              // Verify count matches
              expect(imported.length).toBe(commands.length);
              
              // Verify data integrity
              for (let i = 0; i < commands.length; i++) {
                expect(imported[i].name).toBe(commands[i].name.toLowerCase());
                expect(imported[i].response).toBe(commands[i].response);
                expect(imported[i].cooldown).toBe(commands[i].cooldown);
                expect(imported[i].userLevel).toBe(commands[i].userLevel);
                expect(imported[i].enabled).toBe(commands[i].enabled);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty command list round-trips correctly', () => {
      const exported = toExportFormat([]);
      const jsonString = JSON.stringify(exported);
      const parsed = JSON.parse(jsonString);
      
      const validation = validateImport(parsed);
      expect(validation.valid).toBe(true);
      expect(validation.commandCount).toBe(0);
      
      if (validation.data) {
        const imported = fromExportFormat(validation.data.commands);
        expect(imported).toHaveLength(0);
      }
    });

    it('command names are normalized to lowercase on import', () => {
      // Generate commands with mixed case names
      const mixedCaseNameArb = fc.string({ minLength: 1, maxLength: 20 })
        .filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));
      
      fc.assert(
        fc.property(
          fc.array(mixedCaseNameArb, { minLength: 1, maxLength: 5 }),
          (names) => {
            // Ensure unique names (case-insensitive)
            const uniqueNames = [...new Set(names.map(n => n.toLowerCase()))];
            const testNames = uniqueNames.slice(0, 5);
            
            const exportData: CommandExportFormat = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: testNames.map(name => ({
                name: name.toUpperCase(), // Use uppercase
                response: 'test response',
                cooldown: 5,
                userLevel: 'everyone',
                enabled: true,
              })),
            };
            
            const validation = validateImport(exportData);
            expect(validation.valid).toBe(true);
            
            if (validation.data) {
              const imported = fromExportFormat(validation.data.commands);
              
              // All names should be lowercase
              for (const cmd of imported) {
                expect(cmd.name).toBe(cmd.name.toLowerCase());
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
