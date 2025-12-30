/**
 * Property-based tests for useCommandsExport import validation
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the command import validation functionality.
 * 
 * Feature: twitch-tools-implementation
 * Property 7: Command Import Validation
 * 
 * For any JSON input, the import validation SHALL correctly identify valid
 * command export formats and reject invalid ones with specific error messages.
 * 
 * **Validates: Requirements 6.3, 6.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { 
  CommandExportFormat, 
  ExportedCommand,
  CommandUserLevel,
} from '../../types/commandExport';
import { validateImport } from '../../src/application/hooks/useCommandsExport';
import { EXPORT_CONSTRAINTS, VALID_USER_LEVELS } from '../../types/commandExport';

// ============ ARBITRARIES ============

// Generate valid command names (start with letter, alphanumeric + underscore)
const validCommandNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

// Generate invalid command names
const invalidCommandNameArb = fc.oneof(
  fc.constant(''), // empty
  fc.constant('123abc'), // starts with number
  fc.stringMatching(/^[0-9][a-zA-Z0-9_]*$/), // starts with digit
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /[^a-zA-Z0-9_]/.test(s) && s.length > 0), // special chars
);

// Generate valid response strings
const validResponseArb = fc.string({ minLength: 1, maxLength: 400 })
  .filter(s => s.trim().length > 0);

// Generate valid cooldown values
const validCooldownArb = fc.integer({ min: 0, max: 86400 });

// Generate invalid cooldown values
const invalidCooldownArb = fc.oneof(
  fc.integer({ min: -1000, max: -1 }), // negative
  fc.integer({ min: 86401, max: 100000 }), // too large
);

// Generate valid user levels
const validUserLevelArb = fc.constantFrom(...VALID_USER_LEVELS) as fc.Arbitrary<CommandUserLevel>;

// Generate invalid user levels
const invalidUserLevelArb = fc.oneof(
  fc.constant('admin'),
  fc.constant('owner'),
  fc.constant('guest'),
  fc.constant(''),
  fc.integer(),
);

// Generate a valid ExportedCommand
const validExportedCommandArb: fc.Arbitrary<ExportedCommand> = fc.record({
  name: validCommandNameArb,
  response: validResponseArb,
  cooldown: validCooldownArb,
  userLevel: validUserLevelArb,
  enabled: fc.boolean(),
  aliases: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 0, maxLength: 150 }), { nil: undefined }),
});

// Generate array of valid commands with unique names
const uniqueValidCommandsArb = fc.array(validExportedCommandArb, { minLength: 0, maxLength: 10 })
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
const validExportFormatArb: fc.Arbitrary<CommandExportFormat> = fc.record({
  version: fc.constant('1.0' as const),
  exportedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  source: fc.constant('twitch-vote' as const),
  commands: uniqueValidCommandsArb,
});

// ============ TESTS ============

describe('useCommandsExport Validation Property Tests', () => {
  describe('Property 7: Command Import Validation', () => {
    /**
     * Feature: twitch-tools-implementation, Property 7: Command Import Validation
     * 
     * For any JSON input, the import validation SHALL correctly identify valid
     * command export formats and reject invalid ones with specific error messages.
     * 
     * **Validates: Requirements 6.3, 6.6**
     */

    it('should accept all valid export formats', () => {
      fc.assert(
        fc.property(
          validExportFormatArb,
          (exportData) => {
            const result = validateImport(exportData);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.commandCount).toBe(exportData.commands.length);
            expect(result.data).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-object inputs', () => {
      const nonObjectArb = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.array(fc.anything()),
      );

      fc.assert(
        fc.property(
          nonObjectArb,
          (input) => {
            const result = validateImport(input);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject objects with missing version field', () => {
      fc.assert(
        fc.property(
          uniqueValidCommandsArb,
          (commands) => {
            const invalidData = {
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands,
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('version'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject objects with invalid version', () => {
      const invalidVersionArb = fc.oneof(
        fc.constant('2.0'),
        fc.constant('0.9'),
        fc.constant('1.1'),
        fc.integer(),
        fc.constant(null),
      );

      fc.assert(
        fc.property(
          invalidVersionArb,
          uniqueValidCommandsArb,
          (version, commands) => {
            const invalidData = {
              version,
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands,
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject objects with missing commands array', () => {
      fc.assert(
        fc.property(
          fc.constant(undefined),
          () => {
            const invalidData = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              // commands missing
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('commands'))).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject commands with invalid names', () => {
      fc.assert(
        fc.property(
          invalidCommandNameArb,
          (invalidName) => {
            const invalidData: CommandExportFormat = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: [{
                name: invalidName,
                response: 'test response',
                cooldown: 5,
                userLevel: 'everyone',
                enabled: true,
              }],
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject commands with invalid cooldown', () => {
      fc.assert(
        fc.property(
          invalidCooldownArb,
          (invalidCooldown) => {
            const invalidData: CommandExportFormat = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: [{
                name: 'testcmd',
                response: 'test response',
                cooldown: invalidCooldown,
                userLevel: 'everyone',
                enabled: true,
              }],
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('cooldown'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject commands with invalid userLevel', () => {
      fc.assert(
        fc.property(
          invalidUserLevelArb,
          (invalidLevel) => {
            const invalidData = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: [{
                name: 'testcmd',
                response: 'test response',
                cooldown: 5,
                userLevel: invalidLevel,
                enabled: true,
              }],
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('userlevel'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject commands with missing required fields', () => {
      const missingFieldArb = fc.constantFrom('name', 'response', 'cooldown', 'userLevel', 'enabled');

      fc.assert(
        fc.property(
          missingFieldArb,
          (missingField) => {
            const command: Record<string, unknown> = {
              name: 'testcmd',
              response: 'test response',
              cooldown: 5,
              userLevel: 'everyone',
              enabled: true,
            };
            
            delete command[missingField];
            
            const invalidData = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: [command],
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject duplicate command names', () => {
      fc.assert(
        fc.property(
          validCommandNameArb,
          (name) => {
            const invalidData: CommandExportFormat = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands: [
                {
                  name: name,
                  response: 'response 1',
                  cooldown: 5,
                  userLevel: 'everyone',
                  enabled: true,
                },
                {
                  name: name, // duplicate
                  response: 'response 2',
                  cooldown: 10,
                  userLevel: 'moderator',
                  enabled: false,
                },
              ],
            };
            
            const result = validateImport(invalidData);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide specific error messages for each validation failure', () => {
      // Test that error messages are specific and helpful
      const testCases = [
        {
          data: { version: '2.0', commands: [] },
          expectedErrorPattern: /version/i,
        },
        {
          data: { version: '1.0', commands: [{ name: '123invalid' }] },
          expectedErrorPattern: /name/i,
        },
        {
          data: { version: '1.0', commands: [{ name: 'test', cooldown: -1 }] },
          expectedErrorPattern: /cooldown/i,
        },
      ];

      for (const testCase of testCases) {
        const result = validateImport(testCase.data);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => testCase.expectedErrorPattern.test(e))).toBe(true);
      }
    });

    it('should warn about non-twitch-vote source but still accept', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'twitch-vote'),
          uniqueValidCommandsArb,
          (source, commands) => {
            const data = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source,
              commands,
            };
            
            const result = validateImport(data);
            
            // Should still be valid but with warnings
            expect(result.valid).toBe(true);
            expect(result.warnings.some(w => w.includes(source))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count commands correctly regardless of validity', () => {
      // Use valid command objects to avoid null/undefined issues
      const commandLikeArb = fc.record({
        name: fc.string(),
        response: fc.string(),
        cooldown: fc.anything(),
        userLevel: fc.anything(),
        enabled: fc.anything(),
      });

      fc.assert(
        fc.property(
          fc.array(commandLikeArb, { minLength: 0, maxLength: 20 }),
          (commands) => {
            const data = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              source: 'twitch-vote',
              commands,
            };
            
            const result = validateImport(data);
            
            expect(result.commandCount).toBe(commands.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
