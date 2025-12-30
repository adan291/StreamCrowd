/**
 * Property-based tests for ConditionEvaluatorService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the condition evaluation system.
 * 
 * Feature: macro-system, Property 6: Condition Evaluation Determinism
 * 
 * For any valid condition and execution context, evaluating the condition 
 * multiple times SHALL always produce the same boolean result.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ConditionEvaluatorService } from '../../src/application/services/ConditionEvaluatorService';
import { VariableResolverService } from '../../src/application/services/VariableResolverService';
import type {
  MacroCondition,
  SimpleCondition,
  ConditionGroup,
  ConditionOperator,
  LogicalOperator,
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

const executionUserArb = fc.record({
  username: usernameArb,
  displayName: displayNameArb,
  role: userRoleArb,
  platform: platformArb
});

const conditionOperatorArb: fc.Arbitrary<ConditionOperator> = fc.constantFrom(
  'equals', 'not_equals', 'greater', 'less', 'contains', 'not_contains'
);

const logicalOperatorArb: fc.Arbitrary<LogicalOperator> = fc.constantFrom('and', 'or');

// Operand can be a literal value or a variable reference
const literalOperandArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('{') && !s.includes('}')),
  fc.integer({ min: -1000, max: 1000 }).map(String),
  fc.constantFrom('true', 'false')
);

const variableNameArb = fc.string({ minLength: 2, maxLength: 15 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
  .filter(s => !['toString', 'valueOf', 'constructor', 'prototype', '__proto__', 'hasOwnProperty'].includes(s));

const variableOperandArb = variableNameArb.map(name => `{${name}}`);

const operandArb = fc.oneof(literalOperandArb, variableOperandArb);

const simpleConditionArb: fc.Arbitrary<SimpleCondition> = fc.record({
  leftOperand: operandArb,
  operator: conditionOperatorArb,
  rightOperand: operandArb
});

// Simple MacroCondition
const simpleMacroConditionArb: fc.Arbitrary<MacroCondition> = simpleConditionArb.map(simple => ({
  type: 'simple' as const,
  simple
}));

// Group MacroCondition (non-recursive for simplicity)
const groupMacroConditionArb: fc.Arbitrary<MacroCondition> = fc.record({
  operator: logicalOperatorArb,
  conditions: fc.array(simpleMacroConditionArb, { minLength: 1, maxLength: 3 })
}).map(group => ({
  type: 'group' as const,
  group
}));

// Any MacroCondition (simple or group)
const macroConditionArb: fc.Arbitrary<MacroCondition> = fc.oneof(
  simpleMacroConditionArb,
  groupMacroConditionArb
);

// Execution context with optional user variables
const executionContextArb: fc.Arbitrary<ExecutionContext> = fc.record({
  triggeredBy: triggerTypeArb,
  user: fc.option(executionUserArb, { nil: undefined }),
  message: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  event: fc.constant(undefined),
  variables: fc.constant(new Map<string, MacroVariable>())
});

// ============ HELPER FUNCTIONS ============

function createContextWithVariables(
  variables: Map<string, MacroVariable>
): ExecutionContext {
  return {
    triggeredBy: 'manual',
    user: {
      username: 'testuser',
      displayName: 'Test User',
      role: 'viewer',
      platform: 'twitch'
    },
    message: 'test message',
    variables
  };
}

function createVariable(
  name: string,
  value: string | number | boolean
): MacroVariable {
  const type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
  return {
    name,
    type,
    value,
    scope: 'user',
    readonly: false
  };
}

// ============ TESTS ============

describe('ConditionEvaluatorService Property Tests', () => {
  let service: ConditionEvaluatorService;
  let variableResolver: VariableResolverService;

  beforeEach(() => {
    variableResolver = new VariableResolverService();
    service = new ConditionEvaluatorService(variableResolver);
  });

  describe('Property 6: Condition Evaluation Determinism', () => {
    /**
     * Feature: macro-system, Property 6: Condition Evaluation Determinism
     * 
     * For any valid condition and execution context, evaluating the condition 
     * multiple times SHALL always produce the same boolean result.
     * 
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**
     */

    it('should produce the same result when evaluating the same condition multiple times', () => {
      fc.assert(
        fc.property(
          macroConditionArb,
          executionContextArb,
          (condition, context) => {
            // Evaluate the same condition multiple times
            const result1 = service.evaluate(condition, context);
            const result2 = service.evaluate(condition, context);
            const result3 = service.evaluate(condition, context);

            // All results should be identical (determinism)
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
            expect(typeof result1).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    describe('Simple Conditions (Requirement 5.1)', () => {
      it('should correctly evaluate equals operator', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 20 }),
            executionContextArb,
            (value, context) => {
              const condition: SimpleCondition = {
                leftOperand: value,
                operator: 'equals',
                rightOperand: value
              };

              const result = service.evaluateSimple(condition, context);
              
              // Same value should always equal itself
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate not_equals operator', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 20 }),
            executionContextArb,
            (value1, value2, context) => {
              const condition: SimpleCondition = {
                leftOperand: value1,
                operator: 'not_equals',
                rightOperand: value2
              };

              const result = service.evaluateSimple(condition, context);
              
              // Result should be true if values are different (case-insensitive)
              const expected = value1.toLowerCase() !== value2.toLowerCase();
              expect(result).toBe(expected);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate greater operator with numbers', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: -1000, max: 1000 }),
            executionContextArb,
            (a, b, context) => {
              const condition: SimpleCondition = {
                leftOperand: String(a),
                operator: 'greater',
                rightOperand: String(b)
              };

              const result = service.evaluateSimple(condition, context);
              
              expect(result).toBe(a > b);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate less operator with numbers', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: -1000, max: 1000 }),
            executionContextArb,
            (a, b, context) => {
              const condition: SimpleCondition = {
                leftOperand: String(a),
                operator: 'less',
                rightOperand: String(b)
              };

              const result = service.evaluateSimple(condition, context);
              
              expect(result).toBe(a < b);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate contains operator', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => isNaN(parseFloat(s))),
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => isNaN(parseFloat(s))),
            executionContextArb,
            (haystack, needle, context) => {
              const condition: SimpleCondition = {
                leftOperand: haystack,
                operator: 'contains',
                rightOperand: needle
              };

              const result = service.evaluateSimple(condition, context);
              
              // Case-insensitive contains check
              const expected = haystack.toLowerCase().includes(needle.toLowerCase());
              expect(result).toBe(expected);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate not_contains operator', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => isNaN(parseFloat(s))),
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => isNaN(parseFloat(s))),
            executionContextArb,
            (haystack, needle, context) => {
              const condition: SimpleCondition = {
                leftOperand: haystack,
                operator: 'not_contains',
                rightOperand: needle
              };

              const result = service.evaluateSimple(condition, context);
              
              // Case-insensitive not contains check
              const expected = !haystack.toLowerCase().includes(needle.toLowerCase());
              expect(result).toBe(expected);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Logical Operators (Requirement 5.2)', () => {
      it('should correctly evaluate AND groups - all true', () => {
        fc.assert(
          fc.property(
            fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
            executionContextArb,
            (values, context) => {
              // Create conditions where each value equals itself (always true)
              const conditions: MacroCondition[] = values.map(v => ({
                type: 'simple' as const,
                simple: {
                  leftOperand: v,
                  operator: 'equals' as const,
                  rightOperand: v
                }
              }));

              const group: ConditionGroup = {
                operator: 'and',
                conditions
              };

              const result = service.evaluateGroup(group, context);
              
              // All conditions are true, so AND should be true
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate AND groups - one false', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              const conditions: MacroCondition[] = [
                {
                  type: 'simple',
                  simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'a' }
                },
                {
                  type: 'simple',
                  simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'b' } // false
                },
                {
                  type: 'simple',
                  simple: { leftOperand: 'c', operator: 'equals', rightOperand: 'c' }
                }
              ];

              const group: ConditionGroup = {
                operator: 'and',
                conditions
              };

              const result = service.evaluateGroup(group, context);
              
              // One condition is false, so AND should be false
              expect(result).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate OR groups - at least one true', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              const conditions: MacroCondition[] = [
                {
                  type: 'simple',
                  simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'b' } // false
                },
                {
                  type: 'simple',
                  simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'a' } // true
                },
                {
                  type: 'simple',
                  simple: { leftOperand: 'x', operator: 'equals', rightOperand: 'y' } // false
                }
              ];

              const group: ConditionGroup = {
                operator: 'or',
                conditions
              };

              const result = service.evaluateGroup(group, context);
              
              // At least one condition is true, so OR should be true
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly evaluate OR groups - all false', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              const conditions: MacroCondition[] = [
                {
                  type: 'simple',
                  simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'b' }
                },
                {
                  type: 'simple',
                  simple: { leftOperand: 'c', operator: 'equals', rightOperand: 'd' }
                }
              ];

              const group: ConditionGroup = {
                operator: 'or',
                conditions
              };

              const result = service.evaluateGroup(group, context);
              
              // All conditions are false, so OR should be false
              expect(result).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Nested Conditions (Requirement 5.3)', () => {
      it('should correctly evaluate nested condition groups', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              // (true AND true) OR false = true
              const nestedGroup: MacroCondition = {
                type: 'group',
                group: {
                  operator: 'or',
                  conditions: [
                    {
                      type: 'group',
                      group: {
                        operator: 'and',
                        conditions: [
                          { type: 'simple', simple: { leftOperand: 'a', operator: 'equals', rightOperand: 'a' } },
                          { type: 'simple', simple: { leftOperand: 'b', operator: 'equals', rightOperand: 'b' } }
                        ]
                      }
                    },
                    { type: 'simple', simple: { leftOperand: 'x', operator: 'equals', rightOperand: 'y' } }
                  ]
                }
              };

              const result = service.evaluate(nestedGroup, context);
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Variable Resolution (Requirement 5.4)', () => {
      it('should resolve variables in condition operands', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 0, max: 1000 }),
            (varName, varValue, compareValue, ) => {
              variableResolver.setUserVariable(varName, varValue);
              
              const variables = new Map<string, MacroVariable>();
              const context = createContextWithVariables(variables);

              const condition: SimpleCondition = {
                leftOperand: `{${varName}}`,
                operator: 'greater',
                rightOperand: String(compareValue)
              };

              const result = service.evaluateSimple(condition, context);
              
              expect(result).toBe(varValue > compareValue);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle missing variables by treating them as empty string', () => {
        fc.assert(
          fc.property(
            variableNameArb,
            executionContextArb,
            (varName, context) => {
              // Ensure variable doesn't exist
              variableResolver.clearUserVariables();
              
              const uniqueVarName = `missing_${varName}`;
              const condition: SimpleCondition = {
                leftOperand: `{${uniqueVarName}}`,
                operator: 'equals',
                rightOperand: ''
              };

              const result = service.evaluateSimple(condition, context);
              
              // Missing variable should equal empty string
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Edge Cases', () => {
      it('should return true for null/undefined conditions', () => {
        fc.assert(
          fc.property(
            executionContextArb,
            (context) => {
              const result1 = service.evaluate(null as unknown as MacroCondition, context);
              const result2 = service.evaluate(undefined as unknown as MacroCondition, context);

              expect(result1).toBe(true);
              expect(result2).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should return true for empty condition groups', () => {
        fc.assert(
          fc.property(
            logicalOperatorArb,
            executionContextArb,
            (operator, context) => {
              const group: ConditionGroup = {
                operator,
                conditions: []
              };

              const result = service.evaluateGroup(group, context);
              
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle boolean string literals correctly', () => {
        fc.assert(
          fc.property(
            fc.boolean(),
            executionContextArb,
            (boolValue, context) => {
              const condition: SimpleCondition = {
                leftOperand: String(boolValue),
                operator: 'equals',
                rightOperand: String(boolValue)
              };

              const result = service.evaluateSimple(condition, context);
              
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
