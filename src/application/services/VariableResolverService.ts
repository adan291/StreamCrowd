/**
 * VariableResolverService - Service for resolving variables in macro templates
 * 
 * This service handles variable resolution for the macro system, including:
 * - System variables (username, displayName, message, platform, timestamp)
 * - Stream variables (viewers, followers, uptime, game, title)
 * - User-defined custom variables
 * - Basic mathematical operations on numeric variables
 * 
 * @requirements 4.1 - THE Macro_Service SHALL support system variables: {username}, {displayName}, {message}, {platform}
 * @requirements 4.2 - THE Macro_Service SHALL support stream variables: {viewers}, {followers}, {uptime}
 * @requirements 4.3 - THE Macro_Service SHALL support user-defined custom variables
 * @requirements 4.4 - THE Macro_Service SHALL allow basic math operations on numeric variables (+, -, *, /)
 * @requirements 4.5 - WHEN an action is executed, THE Macro_Service SHALL replace variables with their current values
 * @requirements 4.6 - IF a variable does not exist, THEN THE Macro_Service SHALL use an empty string as default
 */

import type { 
  MacroVariable, 
  ExecutionContext, 
  VariableScope,
  VariableType 
} from '../../../types/macros';
import { evaluateArithmetic } from '../utils/mathExpression';

/**
 * Stream data interface for stream variables
 */
export interface StreamData {
  viewers: number;
  followers: number;
  uptime: string;
  game: string;
  title: string;
}

/**
 * Interface for the VariableResolver service
 */
export interface IVariableResolver {
  resolve(template: string, context: ExecutionContext): string;
  getVariable(name: string, context: ExecutionContext): MacroVariable | null;
  setUserVariable(name: string, value: string | number | boolean, type?: VariableType): void;
  deleteUserVariable(name: string): void;
  getUserVariables(): MacroVariable[];
  setStreamData(data: Partial<StreamData>): void;
}

/**
 * VariableResolverService class
 * 
 * Resolves variables in template strings using execution context and stored variables.
 */
export class VariableResolverService implements IVariableResolver {
  private userVariables: Map<string, MacroVariable> = new Map();
  private streamData: StreamData = {
    viewers: 0,
    followers: 0,
    uptime: '0:00:00',
    game: '',
    title: ''
  };

  /**
   * Resolves all variables in a template string
   * @param template - Template string containing {variable} placeholders
   * @param context - Execution context with user and event data
   * @returns Resolved string with all variables replaced
   */
  resolve(template: string, context: ExecutionContext): string {
    if (!template) {
      return '';
    }

    let result = template;

    // First, resolve math expressions like {math:5+3} or {math:{viewers}+10}
    result = this.resolveMathExpressions(result, context);

    // Then resolve all variable placeholders
    result = this.resolveVariables(result, context);

    return result;
  }

  /**
   * Gets a variable by name from the appropriate scope
   * @param name - Variable name (with or without braces)
   * @param context - Execution context
   * @returns MacroVariable or null if not found
   */
  getVariable(name: string, context: ExecutionContext): MacroVariable | null {
    // Normalize name (remove braces if present)
    const normalizedName = name.replace(/^\{|\}$/g, '');

    // Check system variables first
    const systemVar = this.getSystemVariable(normalizedName, context);
    if (systemVar !== null) {
      return systemVar;
    }

    // Check stream variables
    const streamVar = this.getStreamVariable(normalizedName);
    if (streamVar !== null) {
      return streamVar;
    }

    // Check context variables
    const contextVar = context.variables.get(normalizedName);
    if (contextVar) {
      return contextVar;
    }

    // Check user variables
    const userVar = this.userVariables.get(normalizedName);
    if (userVar) {
      return userVar;
    }

    return null;
  }

  /**
   * Sets a user-defined variable
   * @param name - Variable name
   * @param value - Variable value
   * @param type - Variable type (auto-detected if not provided)
   */
  setUserVariable(name: string, value: string | number | boolean, type?: VariableType): void {
    const detectedType = type || this.detectType(value);
    
    const variable: MacroVariable = {
      name,
      type: detectedType,
      value,
      scope: 'user',
      readonly: false
    };

    this.userVariables.set(name, variable);
  }

  /**
   * Deletes a user-defined variable
   * @param name - Variable name to delete
   */
  deleteUserVariable(name: string): void {
    this.userVariables.delete(name);
  }

  /**
   * Gets all user-defined variables
   * @returns Array of user variables
   */
  getUserVariables(): MacroVariable[] {
    return Array.from(this.userVariables.values());
  }

  /**
   * Updates stream data for stream variables
   * @param data - Partial stream data to update
   */
  setStreamData(data: Partial<StreamData>): void {
    this.streamData = { ...this.streamData, ...data };
  }

  // ==================== Private Methods ====================

  /**
   * Gets a system variable value
   */
  private getSystemVariable(name: string, context: ExecutionContext): MacroVariable | null {
    // Only check for known system variable names
    switch (name) {
      case 'username':
        return {
          name: 'username',
          type: 'string',
          value: context.user?.username || '',
          scope: 'system' as VariableScope,
          readonly: true
        };
      case 'displayName':
        return {
          name: 'displayName',
          type: 'string',
          value: context.user?.displayName || '',
          scope: 'system' as VariableScope,
          readonly: true
        };
      case 'message':
        return {
          name: 'message',
          type: 'string',
          value: context.message || '',
          scope: 'system' as VariableScope,
          readonly: true
        };
      case 'platform':
        return {
          name: 'platform',
          type: 'string',
          value: context.user?.platform || '',
          scope: 'system' as VariableScope,
          readonly: true
        };
      case 'timestamp':
        return {
          name: 'timestamp',
          type: 'number',
          value: Date.now(),
          scope: 'system' as VariableScope,
          readonly: true
        };
      default:
        return null;
    }
  }

  /**
   * Gets a stream variable value
   */
  private getStreamVariable(name: string): MacroVariable | null {
    // Only check for known stream variable names
    switch (name) {
      case 'viewers':
        return {
          name: 'viewers',
          type: 'number',
          value: this.streamData.viewers,
          scope: 'stream' as VariableScope,
          readonly: true
        };
      case 'followers':
        return {
          name: 'followers',
          type: 'number',
          value: this.streamData.followers,
          scope: 'stream' as VariableScope,
          readonly: true
        };
      case 'uptime':
        return {
          name: 'uptime',
          type: 'string',
          value: this.streamData.uptime,
          scope: 'stream' as VariableScope,
          readonly: true
        };
      case 'game':
        return {
          name: 'game',
          type: 'string',
          value: this.streamData.game,
          scope: 'stream' as VariableScope,
          readonly: true
        };
      case 'title':
        return {
          name: 'title',
          type: 'string',
          value: this.streamData.title,
          scope: 'stream' as VariableScope,
          readonly: true
        };
      default:
        return null;
    }
  }

  /**
   * Resolves all variable placeholders in a string
   */
  private resolveVariables(template: string, context: ExecutionContext): string {
    // Match {variableName} patterns
    return template.replace(/\{([^{}]+)\}/g, (match, varName) => {
      // Skip math expressions (already processed)
      if (varName.startsWith('math:')) {
        return match;
      }

      const variable = this.getVariable(varName, context);
      
      if (variable === null) {
        // Return empty string for missing variables (Requirement 4.6)
        return '';
      }

      return String(variable.value);
    });
  }

  /**
   * Resolves math expressions in the format {math:expression}
   * Supports: +, -, *, / operations
   * Variables can be used in expressions: {math:{viewers}+10}
   */
  private resolveMathExpressions(template: string, context: ExecutionContext): string {
    // Match {math:expression} patterns - need to handle nested braces for variables
    // Use a more sophisticated approach to find matching braces
    let result = template;
    const mathPrefix = '{math:';
    
    let startIndex = result.indexOf(mathPrefix);
    while (startIndex !== -1) {
      // Find the matching closing brace
      let braceCount = 1;
      let endIndex = startIndex + mathPrefix.length;
      
      while (endIndex < result.length && braceCount > 0) {
        if (result[endIndex] === '{') {
          braceCount++;
        } else if (result[endIndex] === '}') {
          braceCount--;
        }
        endIndex++;
      }
      
      if (braceCount === 0) {
        // Extract the expression (without the {math: prefix and closing })
        const expression = result.substring(startIndex + mathPrefix.length, endIndex - 1);
        
        try {
          // First resolve any variables in the expression
          const resolvedExpression = this.resolveVariablesInExpression(expression, context);
          
          // Normalize the expression: handle double negatives like 0--1 -> 0-(-1)
          const normalizedExpression = this.normalizeExpression(resolvedExpression);
          
          // Evaluate the math expression
          const evalResult = this.evaluateMathExpression(normalizedExpression);
          
          let replacement: string;
          if (evalResult === null || isNaN(evalResult) || !isFinite(evalResult)) {
            replacement = '0';
          } else {
            // Return integer if whole number, otherwise 2 decimal places
            replacement = Number.isInteger(evalResult) ? String(evalResult) : evalResult.toFixed(2);
          }
          
          result = result.substring(0, startIndex) + replacement + result.substring(endIndex);
          // Continue searching from after the replacement
          startIndex = result.indexOf(mathPrefix, startIndex + replacement.length);
        } catch {
          // On error, replace with 0 and continue
          result = result.substring(0, startIndex) + '0' + result.substring(endIndex);
          startIndex = result.indexOf(mathPrefix, startIndex + 1);
        }
      } else {
        // Malformed expression, skip it
        startIndex = result.indexOf(mathPrefix, startIndex + 1);
      }
    }
    
    return result;
  }

  /**
   * Normalizes a math expression to handle edge cases
   */
  private normalizeExpression(expression: string): string {
    // Handle double negatives: -- becomes +
    let normalized = expression.replace(/--/g, '+');
    // Handle +- becomes -
    normalized = normalized.replace(/\+-/g, '-');
    // Handle -+ becomes -
    normalized = normalized.replace(/-\+/g, '-');
    return normalized;
  }

  /**
   * Resolves variables within a math expression
   */
  private resolveVariablesInExpression(expression: string, context: ExecutionContext): string {
    // Match {variableName} within the expression
    return expression.replace(/\{([^{}]+)\}/g, (match, varName) => {
      const variable = this.getVariable(varName, context);
      
      if (variable === null) {
        return '0';
      }

      const value = variable.value;
      
      // Convert to number for math operations
      if (typeof value === 'number') {
        return String(value);
      }
      
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }

      // Try to parse string as number
      const numValue = parseFloat(String(value));
      return isNaN(numValue) ? '0' : String(numValue);
    });
  }

  /**
   * Safely evaluates a math expression
   * Only supports: numbers, +, -, *, /, (, ), spaces
   */
  private evaluateMathExpression(expression: string): number | null {
    // Sanitize: only allow numbers, operators, parentheses, decimal points, and spaces
    const sanitized = expression.replace(/\s/g, '');
    
    if (!/^[\d+\-*/().]+$/.test(sanitized)) {
      return null;
    }

    // Prevent empty expressions
    if (!sanitized || sanitized.length === 0) {
      return null;
    }

    // Own parser instead of new Function: keeps 'unsafe-eval' out of the CSP
    return evaluateArithmetic(sanitized);
  }

  /**
   * Detects the type of a value
   */
  private detectType(value: string | number | boolean): VariableType {
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    return 'string';
  }

  /**
   * Clears all user variables (useful for testing)
   */
  clearUserVariables(): void {
    this.userVariables.clear();
  }

  /**
   * Resets stream data to defaults (useful for testing)
   */
  resetStreamData(): void {
    this.streamData = {
      viewers: 0,
      followers: 0,
      uptime: '0:00:00',
      game: '',
      title: ''
    };
  }
}
