/**
 * Property-based tests for VariableResolverService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the variable resolution system.
 * 
 * Feature: macro-system, Property 5: Variable Resolution
 * 
 * For any template string containing variables, the VariableResolver SHALL replace 
 * all valid variables with their current values, and missing variables SHALL be 
 * replaced with empty strings.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { VariableResolverService } from '../../src/application/services/VariableResolverService';
import type { 
  ExecutionContext, 
  MacroVariable,
  TriggerType,
  UserRole 
} from '../../types/macros';

// ============ ARBITRARIES ============

const triggerTypeArb: fc.Arbitrary<TriggerType> = fc.constantFrom(
  'chat_command', 'chat_keyword', 'schedule', 'event', 'manual'
);

const userRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom(
  'viewer', 'subscriber', 'moderator', 'broadcaster'
);

const platformArb = fc.constantFrom('twitch', 'youtube', 'kick');

const usernameArb = fc.string({ minLength: 1, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s));

const displayNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const messageArb = fc.string({ minLength: 0, maxLength: 200 });

const executionUserArb = fc.record({
  username: usernameArb,
  displayName: displayNameArb,
  role: userRoleArb,
  platform: platformArb
});

const executionContextArb: fc.Arbitrary<ExecutionContext> = fc.record({
  triggeredBy: triggerTypeArb,
  user: fc.option(executionUserArb, { nil: undefined }),
  message: fc.option(messageArb, { nil: undefined }),
  event: fc.constant(undefined),
  variables: fc.constant(new Map<string, MacroVariable>())
});

const variableNameArb = fc.string({ minLength: 2, maxLength: 20 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
  .filter(s => !['toString', 'valueOf', 'constructor', 'prototype', '__proto__', 'hasOwnProperty'].includes(s));

const stringValueArb = fc.string({ minLength: 0, maxLength: 100 });
const numberValueArb = fc.integer({ min: -10000, max: 10000 });
const booleanValueArb = fc.boolean();

// ============ HELPER FUNCTIONS ============

function createContextWithUser(
  username: string,
  displayName: string,
  platform: string,
  message?: string
): ExecutionContext {
  return {
    triggeredBy: 'chat_command',
    user: {
      username,
      displayName,
      role: 'viewer',
      platform
    },
    message,
    variables: new Map()
  };
}

// ============ TESTS ============

describe('VariableResolverService Property Tests', () => {
  let service: VariableResolverService;

  beforeEach(() => {
    service = new VariableResolverService();
  });

  describe('Property 5: Variable Resolution', () => {
    /**
     * Feature: macro-system, Property 5: Variable Resolution
     * 
     * For any template string containing variables, the VariableResolver SHALL replace 
     * all valid variables with their current values, and missing variables SHALL be 
     * replaced with empty strings.
     * 
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**
     */

    describe('System Variables (Requirement 4.1)', () => {
      it('should resolve {username} to the actual username from context', () => {
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            (username, displayName, platform) => {
              const context = createContextWithUser(username, displayName, platform);
              const template = 'Hello {username}!';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Hello ${username}!`);
              expect(result).not.toContain('{username}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve {displayName} to the actual display name from context', () => {
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            (username, displayName, platform) => {
              const context = createContextWithUser(username, displayName, platform);
              const template = 'Welcome {displayName}!';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Welcome ${displayName}!`);
              expect(result).not.toContain('{displayName}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve {message} to the actual message from context', () => {
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            messageArb,
            (username, displayName, platform, message) => {
              const context = createContextWithUser(username, displayName, platform, message);
              const template = 'You said: {message}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`You said: ${message}`);
              expect(result).not.toContain('{message}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve {platform} to the actual platform from context', () => {
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            (username, displayName, platform) => {
              const context = createContextWithUser(username, displayName, platform);
              const template = 'From {platform}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`From ${platform}`);
              expect(result).not.toContain('{platform}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve multiple system variables in a single template', () => {
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            messageArb,
            (username, displayName, platform, message) => {
              const context = createContextWithUser(username, displayName, platform, message);
              const template = '{username} ({displayName}) from {platform}: {message}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`${username} (${displayName}) from ${platform}: ${message}`);
              expect(result).not.toContain('{username}');
              expect(result).not.toContain('{displayName}');
              expect(result).not.toContain('{platform}');
              expect(result).not.toContain('{message}');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Stream Variables (Requirement 4.2)', () => {
      it('should resolve {viewers} to the current viewer count', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100000 }),
            executionContextArb,
            (viewers, context) => {
              service.setStreamData({ viewers });
              const template = 'Current viewers: {viewers}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Current viewers: ${viewers}`);
              expect(result).not.toContain('{viewers}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve {followers} to the total follower count', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000000 }),
            executionContextArb,
            (followers, context) => {
              service.setStreamData({ followers });
              const template = 'Total followers: {followers}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Total followers: ${followers}`);
              expect(result).not.toContain('{followers}');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve {uptime} to the stream uptime', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 }),
            executionContextArb,
            (hours, minutes, seconds, context) => {
              const uptime = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
              service.setStreamData({ uptime });
              const template = 'Stream uptime: {uptime}';
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Stream uptime: ${uptime}`);
              expect(result).not.toContain('{uptime}');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('User Variables (Requirement 4.3)', () => {
      it('should resolve user-defined string variables', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            stringValueArb,
            executionContextArb,
            (varName, value, context) => {
              service.setUserVariable(varName, value);
              const template = `Value: {${varName}}`;
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Value: ${value}`);
              expect(result).not.toContain(`{${varName}}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve user-defined number variables', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            numberValueArb,
            executionContextArb,
            (varName, value, context) => {
              service.setUserVariable(varName, value);
              const template = `Count: {${varName}}`;
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Count: ${value}`);
              expect(result).not.toContain(`{${varName}}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should resolve user-defined boolean variables', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            booleanValueArb,
            executionContextArb,
            (varName, value, context) => {
              service.setUserVariable(varName, value);
              const template = `Flag: {${varName}}`;
              
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Flag: ${value}`);
              expect(result).not.toContain(`{${varName}}`);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Missing Variables (Requirement 4.6)', () => {
      it('should replace missing variables with empty string', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            executionContextArb,
            (varName, context) => {
              // Ensure the variable doesn't exist
              service.clearUserVariables();
              
              // Use a variable name that's not a system or stream variable
              const uniqueVarName = `custom_${varName}`;
              const template = `Value: {${uniqueVarName}}`;
              
              const result = service.resolve(template, context);
              
              expect(result).toBe('Value: ');
              expect(result).not.toContain(`{${uniqueVarName}}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should return empty string for system variables when user is undefined', () => {
        fc.assert(
          fc.property(
            triggerTypeArb,
            (triggeredBy) => {
              const context: ExecutionContext = {
                triggeredBy,
                user: undefined,
                message: undefined,
                variables: new Map()
              };
              
              const template = '{username} - {displayName} - {platform}';
              const result = service.resolve(template, context);
              
              expect(result).toBe(' -  - ');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Variable Resolution Completeness (Requirement 4.5)', () => {
      it('should resolve all variables in a complex template', () => {
        // Filter out values containing curly braces to avoid false positives in the unresolved variable check
        const safeStringValueArb = fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes('{') && !s.includes('}'));
        
        fc.assert(
          fc.property(
            usernameArb,
            displayNameArb,
            platformArb,
            fc.integer({ min: 0, max: 10000 }),
            variableNameArb,
            safeStringValueArb,
            (username, displayName, platform, viewers, customVarName, customValue) => {
              const context = createContextWithUser(username, displayName, platform);
              service.setStreamData({ viewers });
              service.setUserVariable(customVarName, customValue);
              
              const template = `{username} has {viewers} viewers. Custom: {${customVarName}}`;
              const result = service.resolve(template, context);
              
              // Should not contain any unresolved variables
              expect(result).not.toMatch(/\{[^}]+\}/);
              expect(result).toContain(username);
              expect(result).toContain(String(viewers));
              expect(result).toContain(customValue);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle templates with no variables', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes('{')),
            executionContextArb,
            (template, context) => {
              const result = service.resolve(template, context);
              
              // Template without variables should remain unchanged
              expect(result).toBe(template);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle empty templates', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              const result = service.resolve('', context);
              expect(result).toBe('');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Math Operations (Requirement 4.4)', () => {
      it('should evaluate basic addition in math expressions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: -1000, max: 1000 }),
            executionContextArb,
            (a, b, context) => {
              const template = `Result: {math:${a}+${b}}`;
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Result: ${a + b}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should evaluate basic subtraction in math expressions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: -1000, max: 1000 }),
            executionContextArb,
            (a, b, context) => {
              const template = `Result: {math:${a}-${b}}`;
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Result: ${a - b}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should evaluate basic multiplication in math expressions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 }),
            executionContextArb,
            (a, b, context) => {
              const template = `Result: {math:${a}*${b}}`;
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Result: ${a * b}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should evaluate basic division in math expressions', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: 1, max: 100 }), // Avoid division by zero
            executionContextArb,
            (a, b, context) => {
              const template = `Result: {math:${a}/${b}}`;
              const result = service.resolve(template, context);
              
              const expected = a / b;
              const expectedStr = Number.isInteger(expected) 
                ? String(expected) 
                : expected.toFixed(2);
              
              expect(result).toBe(`Result: ${expectedStr}`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should evaluate math expressions with variables', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 10000 }),
            fc.integer({ min: 1, max: 100 }),
            executionContextArb,
            (viewers, bonus, context) => {
              service.setStreamData({ viewers });
              const template = `Total: {math:{viewers}+${bonus}}`;
              const result = service.resolve(template, context);
              
              expect(result).toBe(`Total: ${viewers + bonus}`);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
