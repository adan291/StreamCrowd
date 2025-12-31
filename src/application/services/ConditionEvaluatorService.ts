/**
 * ConditionEvaluatorService - Service for evaluating macro conditions
 * 
 * This service handles condition evaluation for the macro system, including:
 * - Simple conditions with comparison operators (equals, not_equals, greater, less, contains, not_contains)
 * - Condition groups with logical operators (AND, OR)
 * - Nested conditions (recursive evaluation)
 * - Integration with VariableResolver for operand resolution
 * 
 * @requirements 5.1 - THE Macro_Service SHALL support comparison conditions: equal, different, greater, less, contains
 * @requirements 5.2 - THE Macro_Service SHALL support logical conditions: AND, OR, NOT
 * @requirements 5.3 - THE Macro_Service SHALL allow nested conditions (groups)
 * @requirements 5.4 - THE Macro_Service SHALL evaluate conditions using context variables
 * @requirements 5.5 - WHEN a condition is not met, THE Macro_Service SHALL skip the associated action
 * @requirements 5.6 - FOR ALL valid conditions, evaluating with the same context SHALL produce the same result (determinism)
 */

import type {
  MacroCondition,
  SimpleCondition,
  ConditionGroup,
  ConditionOperator,
  LogicalOperator,
  ExecutionContext,
  MacroVariable
} from '../../../types/macros';
import { VariableResolverService, type IVariableResolver } from './VariableResolverService';

/**
 * Interface for the ConditionEvaluator service
 */
export interface IConditionEvaluator {
  evaluate(condition: MacroCondition, context: ExecutionContext): boolean;
  evaluateSimple(condition: SimpleCondition, context: ExecutionContext): boolean;
  evaluateGroup(group: ConditionGroup, context: ExecutionContext): boolean;
}

/**
 * ConditionEvaluatorService class
 * 
 * Evaluates macro conditions using execution context and variable resolution.
 * Supports simple comparisons, logical operators, and nested condition groups.
 */
export class ConditionEvaluatorService implements IConditionEvaluator {
  private variableResolver: IVariableResolver;

  constructor(variableResolver?: IVariableResolver) {
    this.variableResolver = variableResolver || new VariableResolverService();
  }

  /**
   * Evaluates a macro condition (simple or group)
   * @param condition - The condition to evaluate
   * @param context - Execution context with variables
   * @returns Boolean result of the condition evaluation
   */
  evaluate(condition: MacroCondition, context: ExecutionContext): boolean {
    if (!condition) {
      return true; // No condition means always pass
    }

    if (condition.type === 'simple' && condition.simple) {
      return this.evaluateSimple(condition.simple, context);
    }

    if (condition.type === 'group' && condition.group) {
      return this.evaluateGroup(condition.group, context);
    }

    // Invalid condition structure - default to true (permissive)
    return true;
  }

  /**
   * Evaluates a simple condition with comparison operators
   * @param condition - Simple condition with left operand, operator, and right operand
   * @param context - Execution context with variables
   * @returns Boolean result of the comparison
   */
  evaluateSimple(condition: SimpleCondition, context: ExecutionContext): boolean {
    const leftValue = this.resolveOperand(condition.leftOperand, context);
    const rightValue = this.resolveOperand(condition.rightOperand, context);

    return this.compare(leftValue, condition.operator, rightValue);
  }

  /**
   * Evaluates a condition group with logical operators (AND/OR)
   * @param group - Condition group with operator and nested conditions
   * @param context - Execution context with variables
   * @returns Boolean result of the logical operation
   */
  evaluateGroup(group: ConditionGroup, context: ExecutionContext): boolean {
    if (!group.conditions || group.conditions.length === 0) {
      return true; // Empty group passes
    }

    if (group.operator === 'and') {
      // AND: All conditions must be true
      return group.conditions.every(condition => this.evaluate(condition, context));
    }

    if (group.operator === 'or') {
      // OR: At least one condition must be true
      return group.conditions.some(condition => this.evaluate(condition, context));
    }

    // Unknown operator - default to true
    return true;
  }

  // ==================== Private Methods ====================

  /**
   * Resolves an operand to its actual value
   * Operands can be:
   * - Variable references: {variableName} or just variableName
   * - Literal values: strings, numbers
   */
  private resolveOperand(operand: string, context: ExecutionContext): string | number | boolean {
    if (!operand) {
      return '';
    }

    // Check if it's a variable reference (with or without braces)
    const varName = operand.replace(/^\{|\}$/g, '');
    
    // Try to get the variable
    const variable = this.variableResolver.getVariable(varName, context);
    
    if (variable !== null) {
      return variable.value;
    }

    // Check if operand is wrapped in braces but variable not found
    if (operand.startsWith('{') && operand.endsWith('}')) {
      // Variable not found - return empty string per requirement 4.6
      return '';
    }

    // Try to parse as number
    const numValue = parseFloat(operand);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }

    // Try to parse as boolean
    if (operand.toLowerCase() === 'true') {
      return true;
    }
    if (operand.toLowerCase() === 'false') {
      return false;
    }

    // Return as string literal
    return operand;
  }

  /**
   * Compares two values using the specified operator
   */
  private compare(
    left: string | number | boolean,
    operator: ConditionOperator,
    right: string | number | boolean
  ): boolean {
    switch (operator) {
      case 'equals':
        return this.compareEquals(left, right);
      
      case 'not_equals':
        return !this.compareEquals(left, right);
      
      case 'greater':
        return this.compareGreater(left, right);
      
      case 'less':
        return this.compareLess(left, right);
      
      case 'contains':
        return this.compareContains(left, right);
      
      case 'not_contains':
        return !this.compareContains(left, right);
      
      default:
        // Unknown operator - default to false
        return false;
    }
  }

  /**
   * Compares two values for equality
   * Handles type coercion for numeric comparisons
   */
  private compareEquals(left: string | number | boolean, right: string | number | boolean): boolean {
    // If both are numbers, compare numerically
    if (typeof left === 'number' && typeof right === 'number') {
      return left === right;
    }

    // If both are booleans, compare directly
    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return left === right;
    }

    // Try numeric comparison if both can be parsed as numbers
    const leftNum = this.tryParseNumber(left);
    const rightNum = this.tryParseNumber(right);
    
    if (leftNum !== null && rightNum !== null) {
      return leftNum === rightNum;
    }

    // String comparison (case-insensitive)
    return String(left).toLowerCase() === String(right).toLowerCase();
  }

  /**
   * Compares if left is greater than right
   */
  private compareGreater(left: string | number | boolean, right: string | number | boolean): boolean {
    const leftNum = this.tryParseNumber(left);
    const rightNum = this.tryParseNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum > rightNum;
    }

    // String comparison for non-numeric values
    return String(left).toLowerCase() > String(right).toLowerCase();
  }

  /**
   * Compares if left is less than right
   */
  private compareLess(left: string | number | boolean, right: string | number | boolean): boolean {
    const leftNum = this.tryParseNumber(left);
    const rightNum = this.tryParseNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum < rightNum;
    }

    // String comparison for non-numeric values
    return String(left).toLowerCase() < String(right).toLowerCase();
  }

  /**
   * Checks if left contains right (substring match)
   */
  private compareContains(left: string | number | boolean, right: string | number | boolean): boolean {
    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    
    return leftStr.includes(rightStr);
  }

  /**
   * Tries to parse a value as a number
   * Returns null if not a valid number
   */
  private tryParseNumber(value: string | number | boolean): number | null {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }

    return null;
  }
}
