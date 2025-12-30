/**
 * CommandTester Component
 * 
 * Allows testing commands with simulated data before activating them.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Play, 
  User, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { useCommandTester } from '../../src/application/hooks/useCommandTester';
import type { CommandUserLevel } from '../../types/commandExport';

const USER_LEVELS: { value: CommandUserLevel; label: string; icon: string }[] = [
  { value: 'everyone', label: 'Viewer', icon: '👤' },
  { value: 'subscriber', label: 'Suscriptor', icon: '⭐' },
  { value: 'vip', label: 'VIP', icon: '💎' },
  { value: 'moderator', label: 'Moderador', icon: '🛡️' },
  { value: 'broadcaster', label: 'Broadcaster', icon: '👑' },
];

interface CommandTesterProps {
  /** Command response to test */
  response: string;
  /** Command trigger for display */
  trigger?: string;
  /** Callback when test is run */
  onTest?: (result: { output: string; warnings: string[] }) => void;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Command tester component
 */
export const CommandTester: React.FC<CommandTesterProps> = ({
  response,
  trigger = 'comando',
  onTest,
  compact = false,
}) => {
  const {
    context,
    setUserLevel,
    setArgs,
    setUserName,
    test,
    validate,
    reset,
    lastResult,
  } = useCommandTester();

  const [argsInput, setArgsInput] = useState('');
  const [autoTest, setAutoTest] = useState(true);

  // Auto-test when response changes
  useEffect(() => {
    if (autoTest && response) {
      test(response);
    }
  }, [response, autoTest, test]);

  const handleTest = useCallback(() => {
    const result = test(response);
    onTest?.(result);
  }, [response, test, onTest]);

  const handleArgsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setArgsInput(value);
    setArgs(value.split(' ').filter(Boolean));
  }, [setArgs]);

  const handleUserLevelChange = useCallback((level: CommandUserLevel) => {
    setUserLevel(level);
    if (autoTest) {
      setTimeout(() => test(response), 0);
    }
  }, [setUserLevel, autoTest, test, response]);

  const validation = validate(response);

  if (compact) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs flex items-center gap-1">
            <Play size={12} />
            Test
          </span>
          <button
            onClick={handleTest}
            className="text-purple-400 hover:text-purple-300 text-xs"
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <p className="text-zinc-300 text-sm">
          {lastResult?.output || <span className="text-zinc-600 italic">Sin resultado</span>}
        </p>
        {lastResult?.warnings.length ? (
          <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
            <AlertTriangle size={10} />
            {lastResult.warnings[0]}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/30 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-purple-400" />
          <span className="text-white font-medium text-sm">Probar Comando</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={autoTest}
            onChange={(e) => setAutoTest(e.target.checked)}
            className="rounded"
          />
          Auto-test
        </label>
      </div>

      {/* Configuration */}
      <div className="p-3 space-y-3">
        {/* User level selector */}
        <div>
          <label className="text-zinc-500 text-xs block mb-1">Simular como</label>
          <div className="flex flex-wrap gap-1">
            {USER_LEVELS.map(level => (
              <button
                key={level.value}
                onClick={() => handleUserLevelChange(level.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  context.user.level === level.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <span>{level.icon}</span>
                <span>{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Arguments input */}
        <div>
          <label className="text-zinc-500 text-xs block mb-1">
            Argumentos (separados por espacio)
          </label>
          <input
            type="text"
            value={argsInput}
            onChange={handleArgsChange}
            placeholder="arg1 arg2 arg3"
            className="w-full bg-zinc-700 text-white rounded px-3 py-1.5 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Test button */}
        <button
          onClick={handleTest}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
        >
          <Play size={14} />
          Ejecutar Test
        </button>
      </div>

      {/* Result */}
      <div className="p-3 border-t border-zinc-700 bg-zinc-900/50">
        {/* Simulated chat message */}
        <div className="bg-zinc-800 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <User size={16} className="text-purple-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400 font-medium text-sm">
                  {context.user.name}
                </span>
                <span className="text-zinc-600 text-xs">
                  !{trigger} {argsInput}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bot response */}
        <div className="bg-zinc-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MessageSquare size={16} className="text-cyan-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-cyan-400 font-medium text-sm">Bot</span>
              </div>
              <p className="text-zinc-300 text-sm">
                {lastResult?.output || <span className="text-zinc-600 italic">Ejecuta el test para ver el resultado</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Validation & Warnings */}
        <div className="mt-3 space-y-2">
          {/* Syntax validation */}
          {!validation.valid && (
            <div className="flex items-start gap-2 text-red-400 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                {validation.errors.map((error, i) => (
                  <p key={i}>{error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {lastResult?.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-yellow-400 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <p>{warning}</p>
            </div>
          ))}

          {/* Variables used */}
          {lastResult?.variablesUsed.length ? (
            <div className="flex items-start gap-2 text-zinc-500 text-xs">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <p>Variables: {lastResult.variablesUsed.join(', ')}</p>
            </div>
          ) : null}

          {/* Success indicator */}
          {validation.valid && lastResult && lastResult.warnings.length === 0 && (
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <CheckCircle size={14} />
              <p>Comando válido</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandTester;
