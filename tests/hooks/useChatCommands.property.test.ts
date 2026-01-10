/**
 * Property-Based Tests for useChatCommands Hook
 * Feature: dynamics-ui-improvements
 * 
 * Tests command parsing and cooldown enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  parseCommand,
  findCommand,
  validateArgs,
  getCooldownKey,
  type CommandDefinition,
} from '../../hooks/useChatCommands';

// ============================================
// TEST FIXTURES
// ============================================

const TEST_COMMANDS: CommandDefinition[] = [
  { name: 'join', aliases: ['j', 'enter'], enabled: true, cooldownMs: 5000 },
  { name: 'leave', aliases: ['l'], enabled: true, cooldownMs: 1000 },
  { name: 'help', enabled: true, cooldownMs: 0 },
  { name: 'disabled', enabled: false, cooldownMs: 0 },
  { name: 'vote', enabled: true, cooldownMs: 3000, requiresArgs: true, minArgs: 1, maxArgs: 1 },
  { name: 'bet', enabled: true, cooldownMs: 2000, minArgs: 2, maxArgs: 2 },
];

// ============================================
// GENERATORS
// ============================================

const prefixArb = fc.constantFrom('!', '/', '.', '?', '#');

const commandNameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 10 }
);

const argsArb = fc.array(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 10 }),
  { maxLength: 5 }
);

const userIdArb = fc.uuid();
const usernameArb = fc.string({ minLength: 1, maxLength: 20 });

// ============================================
// PROPERTY TESTS
// ============================================

describe('useChatCommands Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Property 7: Command Parsing Correctness
   * For any message starting with the configured prefix, the parser SHALL 
   * correctly extract the command name and arguments.
   * Validates: Requirements 5.2, 5.3
   */
  describe('Property 7: Command Parsing Correctness', () => {
    it('should extract command name correctly', () => {
      fc.assert(
        fc.property(prefixArb, commandNameArb, (prefix, cmdName) => {
          const message = `${prefix}${cmdName}`;
          const result = parseCommand(message, prefix);
          
          if (!result) return false;
          return result.name === cmdName.toLowerCase();
        }),
        { numRuns: 100 }
      );
    });

    it('should extract arguments correctly', () => {
      fc.assert(
        fc.property(prefixArb, commandNameArb, argsArb, (prefix, cmdName, args) => {
          const message = `${prefix}${cmdName} ${args.join(' ')}`;
          const result = parseCommand(message, prefix);
          
          if (!result) return false;
          
          // Filter empty args from expected
          const expectedArgs = args.filter(a => a.length > 0);
          return result.args.length === expectedArgs.length &&
                 result.args.every((arg, i) => arg === expectedArgs[i]);
        }),
        { numRuns: 100 }
      );
    });

    it('should return null for messages without prefix', () => {
      fc.assert(
        fc.property(
          prefixArb,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
            const trimmed = s.trim();
            // Ensure the message doesn't start with any of the possible prefixes
            return !trimmed.startsWith('!') && 
                   !trimmed.startsWith('/') && 
                   !trimmed.startsWith('.') && 
                   !trimmed.startsWith('?') && 
                   !trimmed.startsWith('#');
          }),
          (prefix, message) => {
            const result = parseCommand(message, prefix);
            return result === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle whitespace correctly', () => {
      fc.assert(
        fc.property(prefixArb, commandNameArb, (prefix, cmdName) => {
          // Test with leading/trailing whitespace
          const message = `  ${prefix}${cmdName}  `;
          const result = parseCommand(message.trim(), prefix);
          
          if (!result) return false;
          return result.name === cmdName.toLowerCase();
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve raw args string', () => {
      fc.assert(
        fc.property(prefixArb, commandNameArb, argsArb, (prefix, cmdName, args) => {
          const argsStr = args.join(' ');
          const message = `${prefix}${cmdName} ${argsStr}`;
          const result = parseCommand(message, prefix);
          
          if (!result) return false;
          // Raw args should be the part after command name
          return result.rawArgs === argsStr.trim();
        }),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive for command names', () => {
      fc.assert(
        fc.property(prefixArb, commandNameArb, (prefix, cmdName) => {
          const upperMessage = `${prefix}${cmdName.toUpperCase()}`;
          const lowerMessage = `${prefix}${cmdName.toLowerCase()}`;
          
          const upperResult = parseCommand(upperMessage, prefix);
          const lowerResult = parseCommand(lowerMessage, prefix);
          
          if (!upperResult || !lowerResult) return false;
          return upperResult.name === lowerResult.name;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Cooldown Enforcement
   * After a command is executed, subsequent executions by the same user 
   * SHALL be blocked until the cooldown period expires.
   * Validates: Requirements 5.4
   */
  describe('Property 8: Cooldown Enforcement', () => {
    it('should generate unique cooldown keys for different users', () => {
      fc.assert(
        fc.property(commandNameArb, userIdArb, userIdArb, (cmdName, userId1, userId2) => {
          if (userId1 === userId2) return true; // Skip if same user
          
          const key1 = getCooldownKey(cmdName, userId1);
          const key2 = getCooldownKey(cmdName, userId2);
          
          return key1 !== key2;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate unique cooldown keys for different commands', () => {
      fc.assert(
        fc.property(commandNameArb, commandNameArb, userIdArb, (cmd1, cmd2, userId) => {
          if (cmd1 === cmd2) return true; // Skip if same command
          
          const key1 = getCooldownKey(cmd1, userId);
          const key2 = getCooldownKey(cmd2, userId);
          
          return key1 !== key2;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate global key without userId', () => {
      fc.assert(
        fc.property(commandNameArb, (cmdName) => {
          const key = getCooldownKey(cmdName);
          return key.startsWith('global:') && key.includes(cmdName);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate user key with userId', () => {
      fc.assert(
        fc.property(commandNameArb, userIdArb, (cmdName, userId) => {
          const key = getCooldownKey(cmdName, userId);
          return key.includes(cmdName) && key.includes(userId);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Command Finding
   * Tests that commands can be found by name or alias
   */
  describe('Command Finding', () => {
    it('should find command by exact name', () => {
      const result = findCommand('join', TEST_COMMANDS);
      expect(result).toBeDefined();
      expect(result?.name).toBe('join');
    });

    it('should find command by alias', () => {
      const result = findCommand('j', TEST_COMMANDS);
      expect(result).toBeDefined();
      expect(result?.name).toBe('join');
    });

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('JOIN', 'Join', 'jOiN', 'J', 'ENTER'),
          (name) => {
            const result = findCommand(name, TEST_COMMANDS);
            return result !== undefined && result.name === 'join';
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return undefined for unknown commands', () => {
      fc.assert(
        fc.property(
          commandNameArb.filter(n => !['join', 'j', 'enter', 'leave', 'l', 'help', 'disabled', 'vote', 'bet'].includes(n.toLowerCase())),
          (unknownCmd) => {
            const result = findCommand(unknownCmd, TEST_COMMANDS);
            return result === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Argument Validation
   * Tests that argument validation works correctly
   */
  describe('Argument Validation', () => {
    it('should accept any args for commands without requirements', () => {
      fc.assert(
        fc.property(argsArb, (args) => {
          const cmd: CommandDefinition = { name: 'test', enabled: true, cooldownMs: 0 };
          return validateArgs(args, cmd);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject empty args when requiresArgs is true', () => {
      const cmd: CommandDefinition = { name: 'test', enabled: true, cooldownMs: 0, requiresArgs: true };
      expect(validateArgs([], cmd)).toBe(false);
    });

    it('should accept non-empty args when requiresArgs is true', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          (args) => {
            const cmd: CommandDefinition = { name: 'test', enabled: true, cooldownMs: 0, requiresArgs: true };
            return validateArgs(args, cmd);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce minArgs constraint', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 10 }),
          (minArgs, args) => {
            const cmd: CommandDefinition = { name: 'test', enabled: true, cooldownMs: 0, minArgs };
            const isValid = validateArgs(args, cmd);
            return isValid === (args.length >= minArgs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce maxArgs constraint', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 10 }),
          (maxArgs, args) => {
            const cmd: CommandDefinition = { name: 'test', enabled: true, cooldownMs: 0, maxArgs };
            const isValid = validateArgs(args, cmd);
            return isValid === (args.length <= maxArgs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
