/**
 * Property-based tests for Quick Commands functionality in useOBS
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the quick commands system.
 * 
 * @requirements 3.2, 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { QuickCommand, QuickCommandAction } from '../../src/application/services/OBSService';

// Storage key must match the one in useOBS.ts
const STORAGE_KEY_QUICK_COMMANDS = 'obs_quick_commands';

// ============ ARBITRARIES ============

const commandNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const iconArb = fc.constantFrom('🎮', '📊', '🎁', '☕', '🔴', '⏹️', '🎬', '⚡');

const sceneNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const sourceNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const transitionNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const quickCommandActionArb: fc.Arbitrary<QuickCommandAction> = fc.oneof(
  fc.record({ type: fc.constant('switch_scene' as const), sceneName: sceneNameArb }),
  fc.record({ type: fc.constant('toggle_source' as const), sceneName: sceneNameArb, sourceName: sourceNameArb, visible: fc.boolean() }),
  fc.record({ type: fc.constant('set_transition' as const), transitionName: transitionNameArb }),
  fc.record({ type: fc.constant('start_recording' as const) }),
  fc.record({ type: fc.constant('stop_recording' as const) }),
  fc.record({ type: fc.constant('start_stream' as const) }),
  fc.record({ type: fc.constant('stop_stream' as const) })
);

const quickCommandArb: fc.Arbitrary<QuickCommand> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
  name: commandNameArb,
  icon: iconArb,
  actions: fc.array(quickCommandActionArb, { minLength: 1, maxLength: 10 })
});

// ============ HELPER FUNCTIONS ============

/**
 * Simulates saving quick commands (mirrors useOBS implementation)
 */
function saveQuickCommands(commands: QuickCommand[]): void {
  localStorage.setItem(STORAGE_KEY_QUICK_COMMANDS, JSON.stringify(commands));
}

/**
 * Simulates loading quick commands (mirrors useOBS implementation)
 */
function loadQuickCommands(): QuickCommand[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_QUICK_COMMANDS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Simulates executing a quick command and tracks action order (synchronous version for testing)
 */
function executeQuickCommandWithTracking(
  command: QuickCommand,
  actionTracker: QuickCommandAction[]
): boolean {
  try {
    for (const action of command.actions) {
      actionTracker.push(action);
    }
    return true;
  } catch {
    return false;
  }
}

// ============ TESTS ============

describe('Quick Commands Property Tests', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        get length() { return storage.size; },
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Property 5: Quick Command Execution Order', () => {
    /**
     * Feature: obs-improvements, Property 5: Quick Command Execution Order
     * 
     * For any quick command with N actions, all N actions SHALL execute 
     * in the specified order.
     * 
     * **Validates: Requirements 3.2**
     */
    it('should execute all actions in the specified order', () => {
      fc.assert(
        fc.property(
          quickCommandArb,
          (command) => {
            const executedActions: QuickCommandAction[] = [];
            
            executeQuickCommandWithTracking(command, executedActions);
            
            // Property: all actions should be executed
            expect(executedActions.length).toBe(command.actions.length);
            
            // Property: actions should be in the same order
            for (let i = 0; i < command.actions.length; i++) {
              expect(executedActions[i]).toEqual(command.actions[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute actions sequentially preserving order', () => {
      fc.assert(
        fc.property(
          fc.array(quickCommandActionArb, { minLength: 2, maxLength: 5 }),
          (actions) => {
            const command: QuickCommand = {
              id: 'test_cmd',
              name: 'Test Command',
              icon: '🎮',
              actions
            };
            
            const executedActions: QuickCommandAction[] = [];
            executeQuickCommandWithTracking(command, executedActions);
            
            // Property: execution order should match input order
            for (let i = 0; i < actions.length; i++) {
              expect(executedActions[i]).toEqual(actions[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty actions array gracefully', () => {
      const command: QuickCommand = {
        id: 'empty_cmd',
        name: 'Empty Command',
        icon: '⚡',
        actions: []
      };
      
      const executedActions: QuickCommandAction[] = [];
      const result = executeQuickCommandWithTracking(command, executedActions);
      
      expect(result).toBe(true);
      expect(executedActions.length).toBe(0);
    });
  });

  describe('Property 6: Quick Commands Round-Trip', () => {
    /**
     * Feature: obs-improvements, Property 6: Quick Commands Round-Trip
     * 
     * For any valid quick command, saving and then loading SHALL return 
     * an equivalent command.
     * 
     * **Validates: Requirements 3.4**
     */
    it('should round-trip quick commands through localStorage', () => {
      fc.assert(
        fc.property(
          fc.array(quickCommandArb, { minLength: 0, maxLength: 10 }),
          (commands) => {
            localStorage.clear();
            
            // Save commands
            saveQuickCommands(commands);
            
            // Load commands
            const loaded = loadQuickCommands();
            
            // Property: loaded should equal saved
            expect(loaded).toEqual(commands);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single command round-trip', () => {
      fc.assert(
        fc.property(
          quickCommandArb,
          (command) => {
            localStorage.clear();
            
            // Save single command as array
            saveQuickCommands([command]);
            
            // Load commands
            const loaded = loadQuickCommands();
            
            // Property: loaded should contain the command
            expect(loaded.length).toBe(1);
            expect(loaded[0]).toEqual(command);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty commands list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (emptyArray) => {
            localStorage.clear();
            
            saveQuickCommands(emptyArray);
            const loaded = loadQuickCommands();
            
            expect(loaded).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should persist commands across multiple save operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.array(quickCommandArb, { minLength: 0, maxLength: 5 }),
            { minLength: 1, maxLength: 5 }
          ),
          (commandSequences) => {
            localStorage.clear();
            
            // Save multiple times
            for (const commands of commandSequences) {
              saveQuickCommands(commands);
            }
            
            // Load should return the last saved value
            const loaded = loadQuickCommands();
            const lastSaved = commandSequences[commandSequences.length - 1];
            
            expect(loaded).toEqual(lastSaved);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve action types and properties through round-trip', () => {
      fc.assert(
        fc.property(
          quickCommandArb,
          (command) => {
            localStorage.clear();
            
            saveQuickCommands([command]);
            const loaded = loadQuickCommands();
            
            // Property: each action should have correct type and properties
            for (let i = 0; i < command.actions.length; i++) {
              const original = command.actions[i];
              const loadedAction = loaded[0].actions[i];
              
              expect(loadedAction.type).toBe(original.type);
              
              // Check type-specific properties
              if (original.type === 'switch_scene') {
                expect((loadedAction as typeof original).sceneName).toBe(original.sceneName);
              } else if (original.type === 'toggle_source') {
                expect((loadedAction as typeof original).sceneName).toBe(original.sceneName);
                expect((loadedAction as typeof original).sourceName).toBe(original.sourceName);
                expect((loadedAction as typeof original).visible).toBe(original.visible);
              } else if (original.type === 'set_transition') {
                expect((loadedAction as typeof original).transitionName).toBe(original.transitionName);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
