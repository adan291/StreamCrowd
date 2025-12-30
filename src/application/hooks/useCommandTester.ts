/**
 * useCommandTester Hook
 * 
 * Provides functionality for testing commands with simulated data.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TestContext, TestResult } from '../../../types/commandEditor';
import type { CommandUserLevel } from '../../../types/commandExport';

/**
 * Default test contexts for different user levels
 */
const DEFAULT_CONTEXTS: Record<CommandUserLevel, TestContext> = {
  everyone: {
    user: { name: 'Viewer123', level: 'everyone' },
    args: [],
    channel: {
      name: 'MiCanal',
      game: 'Just Chatting',
      title: 'Stream de prueba',
      uptime: '2h 30m',
      viewers: 150,
      followers: 5000,
    },
  },
  subscriber: {
    user: { name: 'SubUser', level: 'subscriber' },
    args: [],
    channel: {
      name: 'MiCanal',
      game: 'Just Chatting',
      title: 'Stream de prueba',
      uptime: '2h 30m',
      viewers: 150,
      followers: 5000,
    },
  },
  vip: {
    user: { name: 'VIPMember', level: 'vip' },
    args: [],
    channel: {
      name: 'MiCanal',
      game: 'Just Chatting',
      title: 'Stream de prueba',
      uptime: '2h 30m',
      viewers: 150,
      followers: 5000,
    },
  },
  moderator: {
    user: { name: 'ModHelper', level: 'moderator' },
    args: [],
    channel: {
      name: 'MiCanal',
      game: 'Just Chatting',
      title: 'Stream de prueba',
      uptime: '2h 30m',
      viewers: 150,
      followers: 5000,
    },
  },
  broadcaster: {
    user: { name: 'Streamer', level: 'broadcaster' },
    args: [],
    channel: {
      name: 'MiCanal',
      game: 'Just Chatting',
      title: 'Stream de prueba',
      uptime: '2h 30m',
      viewers: 150,
      followers: 5000,
    },
  },
};

/**
 * Variable patterns and their replacements
 */
const VARIABLE_PATTERNS: Array<{
  pattern: RegExp;
  replace: (ctx: TestContext, match: string) => string;
  name: string;
}> = [
  { pattern: /\$\(user\)/gi, replace: (ctx) => ctx.user.name, name: '$(user)' },
  { pattern: /\$\(touser\)/gi, replace: (ctx) => ctx.args[0] || ctx.user.name, name: '$(touser)' },
  { pattern: /\$\(channel\)/gi, replace: (ctx) => ctx.channel.name, name: '$(channel)' },
  { pattern: /\$\(game\)/gi, replace: (ctx) => ctx.channel.game, name: '$(game)' },
  { pattern: /\$\(title\)/gi, replace: (ctx) => ctx.channel.title, name: '$(title)' },
  { pattern: /\$\(uptime\)/gi, replace: (ctx) => ctx.channel.uptime, name: '$(uptime)' },
  { pattern: /\$\(viewers\)/gi, replace: (ctx) => String(ctx.channel.viewers), name: '$(viewers)' },
  { pattern: /\$\(followers\)/gi, replace: (ctx) => String(ctx.channel.followers), name: '$(followers)' },
  { pattern: /\$\(time\)/gi, replace: () => new Date().toLocaleTimeString(), name: '$(time)' },
  { pattern: /\$\(date\)/gi, replace: () => new Date().toLocaleDateString(), name: '$(date)' },
  { pattern: /\$\(random\)/gi, replace: () => String(Math.floor(Math.random() * 100) + 1), name: '$(random)' },
  { pattern: /\$\(count\)/gi, replace: () => String(Math.floor(Math.random() * 100)), name: '$(count)' },
  { pattern: /\$\(args\)/gi, replace: (ctx) => ctx.args.join(' ') || '', name: '$(args)' },
  { pattern: /\$\(arg1\)/gi, replace: (ctx) => ctx.args[0] || '', name: '$(arg1)' },
  { pattern: /\$\(arg2\)/gi, replace: (ctx) => ctx.args[1] || '', name: '$(arg2)' },
  { pattern: /\$\(arg3\)/gi, replace: (ctx) => ctx.args[2] || '', name: '$(arg3)' },
  { pattern: /\$\(query\)/gi, replace: (ctx) => encodeURIComponent(ctx.args.join(' ')), name: '$(query)' },
];

/**
 * Test a command response with the given context
 */
export function testCommand(response: string, context: TestContext): TestResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const variablesUsed: string[] = [];
  
  let output = response;
  
  // Replace variables
  VARIABLE_PATTERNS.forEach(({ pattern, replace, name }) => {
    if (pattern.test(output)) {
      variablesUsed.push(name);
      output = output.replace(pattern, replace(context, name));
    }
  });
  
  // Check for API calls
  const apiPattern = /\$\(customapi\.([^)]+)\)/gi;
  const apiMatches = output.match(apiPattern);
  if (apiMatches) {
    apiMatches.forEach(match => {
      warnings.push(`API externa detectada: ${match} - No se puede probar en modo test`);
      output = output.replace(match, '[API Response]');
    });
  }
  
  // Check for unknown variables
  const unknownPattern = /\$\([^)]+\)/g;
  const unknownMatches = output.match(unknownPattern);
  if (unknownMatches) {
    unknownMatches.forEach(match => {
      if (!variablesUsed.includes(match)) {
        warnings.push(`Variable desconocida: ${match}`);
      }
    });
  }
  
  // Check for empty args when used
  if (variablesUsed.some(v => v.includes('arg')) && context.args.length === 0) {
    warnings.push('El comando usa argumentos pero no se proporcionaron');
  }
  
  // Validate response length
  if (output.length > 500) {
    warnings.push(`La respuesta es muy larga (${output.length} caracteres)`);
  }
  
  return {
    output,
    warnings,
    errors,
    variablesUsed,
  };
}

/**
 * Validate command syntax
 */
export function validateCommandSyntax(response: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for unclosed parentheses in variables
  const openParens = (response.match(/\$\(/g) || []).length;
  const closeParens = (response.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    errors.push('Hay paréntesis sin cerrar en las variables');
  }
  
  // Check for empty variables
  if (/\$\(\s*\)/.test(response)) {
    errors.push('Hay variables vacías');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface UseCommandTesterReturn {
  /** Current test context */
  context: TestContext;
  /** Set user level for testing */
  setUserLevel: (level: CommandUserLevel) => void;
  /** Set test arguments */
  setArgs: (args: string[]) => void;
  /** Set custom user name */
  setUserName: (name: string) => void;
  /** Test a command response */
  test: (response: string) => TestResult;
  /** Validate command syntax */
  validate: (response: string) => { valid: boolean; errors: string[] };
  /** Reset to default context */
  reset: () => void;
  /** Last test result */
  lastResult: TestResult | null;
}

/**
 * Hook for testing commands
 */
export function useCommandTester(): UseCommandTesterReturn {
  const [context, setContext] = useState<TestContext>(DEFAULT_CONTEXTS.everyone);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const setUserLevel = useCallback((level: CommandUserLevel) => {
    setContext(prev => ({
      ...DEFAULT_CONTEXTS[level],
      args: prev.args,
    }));
  }, []);

  const setArgs = useCallback((args: string[]) => {
    setContext(prev => ({ ...prev, args }));
  }, []);

  const setUserName = useCallback((name: string) => {
    setContext(prev => ({
      ...prev,
      user: { ...prev.user, name },
    }));
  }, []);

  const test = useCallback((response: string): TestResult => {
    const result = testCommand(response, context);
    setLastResult(result);
    return result;
  }, [context]);

  const validate = useCallback((response: string) => {
    return validateCommandSyntax(response);
  }, []);

  const reset = useCallback(() => {
    setContext(DEFAULT_CONTEXTS.everyone);
    setLastResult(null);
  }, []);

  return {
    context,
    setUserLevel,
    setArgs,
    setUserName,
    test,
    validate,
    reset,
    lastResult,
  };
}

export default useCommandTester;
