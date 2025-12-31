/**
 * Property-based tests for MacroStorageService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the macro storage system.
 * 
 * Feature: macro-system, Property 2: Macro Persistence Round-Trip
 * 
 * For any valid macro, saving to storage and loading back SHALL produce 
 * an equivalent macro with all fields preserved.
 * 
 * **Validates: Requirements 1.4, 1.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  MacroStorageService, 
  resetMacroStorageService 
} from '../../src/application/services/MacroStorageService';
import type { 
  Macro, 
  MacroVariable, 
  MacroExecutionLog,
  TriggerType,
  ActionType,
  VariableScope,
  VariableType,
  ActionResult
} from '../../types/macros';

// ============ MOCK LOCALSTORAGE ============

function createMockLocalStorage(): Storage {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() { return storage.size; },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
  };
}

// ============ ARBITRARIES ============

const idArb = fc.uuid();

const nameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const descriptionArb = fc.string({ minLength: 0, maxLength: 200 });

const triggerTypeArb: fc.Arbitrary<TriggerType> = fc.constantFrom(
  'chat_command', 'chat_keyword', 'schedule', 'event', 'manual'
);

const actionTypeArb: fc.Arbitrary<ActionType> = fc.constantFrom(
  'send_chat_message', 'change_scene', 'toggle_source', 'play_sound',
  'start_poll', 'start_prediction', 'send_notification', 'set_variable', 'delay'
);

const chatCommandTriggerArb = fc.record({
  command: fc.string({ minLength: 1, maxLength: 20 }).map(s => `!${s}`),
  caseSensitive: fc.boolean(),
  requiredRole: fc.option(
    fc.constantFrom('viewer', 'subscriber', 'moderator', 'broadcaster') as fc.Arbitrary<'viewer' | 'subscriber' | 'moderator' | 'broadcaster'>,
    { nil: undefined }
  )
});

const manualTriggerArb = fc.record({
  hotkey: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  showInQuickActions: fc.boolean()
});

const macroTriggerArb = fc.oneof(
  fc.record({
    type: fc.constant('chat_command' as TriggerType),
    config: chatCommandTriggerArb
  }),
  fc.record({
    type: fc.constant('manual' as TriggerType),
    config: manualTriggerArb
  })
);

const sendChatMessageConfigArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
  platform: fc.option(
    fc.constantFrom('twitch', 'youtube', 'kick', 'all') as fc.Arbitrary<'twitch' | 'youtube' | 'kick' | 'all'>,
    { nil: undefined }
  )
});

const delayConfigArb = fc.record({
  seconds: fc.integer({ min: 0, max: 60 })
});

const macroActionArb = fc.oneof(
  fc.record({
    id: idArb,
    type: fc.constant('send_chat_message' as ActionType),
    config: sendChatMessageConfigArb,
    condition: fc.constant(undefined),
    delay: fc.integer({ min: 0, max: 60 })
  }),
  fc.record({
    id: idArb,
    type: fc.constant('delay' as ActionType),
    config: delayConfigArb,
    condition: fc.constant(undefined),
    delay: fc.integer({ min: 0, max: 60 })
  })
);

const macroArb: fc.Arbitrary<Macro> = fc.record({
  id: idArb,
  name: nameArb,
  description: descriptionArb,
  enabled: fc.boolean(),
  trigger: macroTriggerArb,
  actions: fc.array(macroActionArb, { minLength: 0, maxLength: 5 }),
  cooldown: fc.integer({ min: 0, max: 3600 }),
  lastExecuted: fc.option(fc.integer({ min: 0, max: Date.now() }), { nil: undefined }),
  createdAt: fc.integer({ min: 0, max: Date.now() }),
  updatedAt: fc.integer({ min: 0, max: Date.now() }),
  executionCount: fc.integer({ min: 0, max: 10000 }),
  lastError: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
});

const variableScopeArb: fc.Arbitrary<VariableScope> = fc.constantFrom('system', 'stream', 'user');
const variableTypeArb: fc.Arbitrary<VariableType> = fc.constantFrom('string', 'number', 'boolean');

const variableValueArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 100 }),
  fc.integer({ min: -10000, max: 10000 }),
  fc.boolean()
);

const macroVariableArb: fc.Arbitrary<MacroVariable> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
  type: variableTypeArb,
  value: variableValueArb,
  scope: variableScopeArb,
  readonly: fc.boolean()
});

const actionResultArb: fc.Arbitrary<ActionResult> = fc.record({
  actionId: idArb,
  actionType: actionTypeArb,
  success: fc.boolean(),
  skipped: fc.boolean(),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  duration: fc.integer({ min: 0, max: 60000 })
});

const executionLogArb: fc.Arbitrary<MacroExecutionLog> = fc.record({
  id: idArb,
  macroId: idArb,
  macroName: nameArb,
  triggeredBy: triggerTypeArb,
  startedAt: fc.integer({ min: 0, max: Date.now() }),
  completedAt: fc.integer({ min: 0, max: Date.now() }),
  success: fc.boolean(),
  actionsExecuted: fc.integer({ min: 0, max: 10 }),
  actionResults: fc.array(actionResultArb, { minLength: 0, maxLength: 5 }),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
});

// ============ TESTS ============

describe('MacroStorageService Property Tests', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Storage;
  let service: MacroStorageService;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = createMockLocalStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
    
    resetMacroStorageService();
    service = new MacroStorageService();
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    mockStorage.clear();
    resetMacroStorageService();
  });

  describe('Property 2: Macro Persistence Round-Trip', () => {
    /**
     * Feature: macro-system, Property 2: Macro Persistence Round-Trip
     * 
     * For any valid macro, saving to storage and loading back SHALL produce 
     * an equivalent macro with all fields preserved.
     * 
     * **Validates: Requirements 1.4, 1.5**
     */

    it('should preserve macro data through save/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroArb,
          async (macro) => {
            // Save the macro
            await service.saveMacro(macro);
            
            // Retrieve the macro
            const retrieved = await service.getMacro(macro.id);
            
            // Verify round-trip consistency
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(macro.id);
            expect(retrieved!.name).toBe(macro.name);
            expect(retrieved!.description).toBe(macro.description);
            expect(retrieved!.enabled).toBe(macro.enabled);
            expect(retrieved!.cooldown).toBe(macro.cooldown);
            expect(retrieved!.createdAt).toBe(macro.createdAt);
            expect(retrieved!.updatedAt).toBe(macro.updatedAt);
            expect(retrieved!.executionCount).toBe(macro.executionCount);
            expect(retrieved!.lastError).toBe(macro.lastError);
            expect(retrieved!.lastExecuted).toBe(macro.lastExecuted);
            
            // Verify trigger
            expect(retrieved!.trigger.type).toBe(macro.trigger.type);
            expect(retrieved!.trigger.config).toEqual(macro.trigger.config);
            
            // Verify actions
            expect(retrieved!.actions.length).toBe(macro.actions.length);
            for (let i = 0; i < macro.actions.length; i++) {
              expect(retrieved!.actions[i].id).toBe(macro.actions[i].id);
              expect(retrieved!.actions[i].type).toBe(macro.actions[i].type);
              expect(retrieved!.actions[i].delay).toBe(macro.actions[i].delay);
              expect(retrieved!.actions[i].config).toEqual(macro.actions[i].config);
            }
            
            // Clean up
            await service.deleteMacro(macro.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all macros through getAllMacros after multiple saves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(macroArb, { minLength: 1, maxLength: 5 })
            .map(macros => {
              // Ensure unique IDs
              const seen = new Set<string>();
              return macros.filter(m => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
              });
            })
            .filter(macros => macros.length > 0),
          async (macros) => {
            // Clear storage first
            await service.clearAll();
            
            // Save all macros
            for (const macro of macros) {
              await service.saveMacro(macro);
            }
            
            // Retrieve all
            const retrieved = await service.getAllMacros();
            
            // Should have same count
            expect(retrieved.length).toBe(macros.length);
            
            // Each original macro should be in retrieved
            for (const original of macros) {
              const found = retrieved.find(r => r.id === original.id);
              expect(found).toBeDefined();
              expect(found!.name).toBe(original.name);
              expect(found!.enabled).toBe(original.enabled);
            }
            
            // Clean up
            await service.clearAll();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update existing macro when saving with same ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroArb,
          nameArb,
          fc.boolean(),
          async (macro, newName, newEnabled) => {
            // Save original macro
            await service.saveMacro(macro);
            
            // Update the macro
            const updatedMacro = { ...macro, name: newName, enabled: newEnabled };
            await service.saveMacro(updatedMacro);
            
            // Retrieve and verify update
            const retrieved = await service.getMacro(macro.id);
            
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(newName);
            expect(retrieved!.enabled).toBe(newEnabled);
            
            // Should only have one macro with this ID
            const allMacros = await service.getAllMacros();
            const matchingMacros = allMacros.filter(m => m.id === macro.id);
            expect(matchingMacros.length).toBe(1);
            
            // Clean up
            await service.deleteMacro(macro.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent macro ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          async (id) => {
            // Ensure macro doesn't exist
            await service.deleteMacro(id);
            
            // Get should return null
            const retrieved = await service.getMacro(id);
            expect(retrieved).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove macro after delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroArb,
          async (macro) => {
            // Save the macro
            await service.saveMacro(macro);
            
            // Verify it exists
            const beforeDelete = await service.getMacro(macro.id);
            expect(beforeDelete).not.toBeNull();
            
            // Delete the macro
            await service.deleteMacro(macro.id);
            
            // Verify it's gone
            const afterDelete = await service.getMacro(macro.id);
            expect(afterDelete).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Variable Persistence', () => {
    it('should preserve variable data through save/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroVariableArb,
          async (variable) => {
            // Save the variable
            await service.saveVariable(variable);
            
            // Retrieve the variable
            const retrieved = await service.getVariable(variable.name);
            
            // Verify round-trip consistency
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(variable.name);
            expect(retrieved!.type).toBe(variable.type);
            expect(retrieved!.value).toBe(variable.value);
            expect(retrieved!.scope).toBe(variable.scope);
            expect(retrieved!.readonly).toBe(variable.readonly);
            
            // Clean up
            await service.deleteVariable(variable.name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all variables through getAllVariables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(macroVariableArb, { minLength: 1, maxLength: 5 })
            .map(variables => {
              // Ensure unique names
              const seen = new Set<string>();
              return variables.filter(v => {
                if (seen.has(v.name)) return false;
                seen.add(v.name);
                return true;
              });
            })
            .filter(variables => variables.length > 0),
          async (variables) => {
            // Clear storage first
            await service.clearAll();
            
            // Save all variables
            for (const variable of variables) {
              await service.saveVariable(variable);
            }
            
            // Retrieve all
            const retrieved = await service.getAllVariables();
            
            // Should have same count
            expect(retrieved.length).toBe(variables.length);
            
            // Each original variable should be in retrieved
            for (const original of variables) {
              const found = retrieved.find(r => r.name === original.name);
              expect(found).toBeDefined();
              expect(found!.value).toBe(original.value);
            }
            
            // Clean up
            await service.clearAll();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Execution Log Persistence', () => {
    it('should preserve execution log data through save/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          executionLogArb,
          async (log) => {
            // Clear logs first
            await service.clearExecutionLog();
            
            // Save the log
            await service.saveExecutionLog(log);
            
            // Retrieve logs
            const retrieved = await service.getExecutionLog();
            
            // Should contain our log
            expect(retrieved.length).toBeGreaterThanOrEqual(1);
            const found = retrieved.find(r => r.id === log.id);
            
            expect(found).toBeDefined();
            expect(found!.macroId).toBe(log.macroId);
            expect(found!.macroName).toBe(log.macroName);
            expect(found!.triggeredBy).toBe(log.triggeredBy);
            expect(found!.success).toBe(log.success);
            expect(found!.actionsExecuted).toBe(log.actionsExecuted);
            expect(found!.error).toBe(log.error);
            
            // Clean up
            await service.clearExecutionLog();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter execution logs by macroId', async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          fc.array(executionLogArb, { minLength: 2, maxLength: 5 }),
          async (targetMacroId, logs) => {
            // Clear logs first
            await service.clearExecutionLog();
            
            // Modify some logs to have the target macroId
            const modifiedLogs = logs.map((log, index) => ({
              ...log,
              macroId: index % 2 === 0 ? targetMacroId : log.macroId
            }));
            
            // Save all logs
            for (const log of modifiedLogs) {
              await service.saveExecutionLog(log);
            }
            
            // Retrieve filtered logs
            const filtered = await service.getExecutionLog(targetMacroId);
            
            // All filtered logs should have the target macroId
            for (const log of filtered) {
              expect(log.macroId).toBe(targetMacroId);
            }
            
            // Clean up
            await service.clearExecutionLog();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should limit execution log to 100 entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(executionLogArb, { minLength: 105, maxLength: 110 }),
          async (logs) => {
            // Clear logs first
            await service.clearExecutionLog();
            
            // Save all logs
            for (const log of logs) {
              await service.saveExecutionLog(log);
            }
            
            // Retrieve all logs
            const retrieved = await service.getExecutionLog();
            
            // Should be limited to 100
            expect(retrieved.length).toBeLessThanOrEqual(100);
            
            // Clean up
            await service.clearExecutionLog();
          }
        ),
        { numRuns: 10 } // Fewer runs due to large array size
      );
    });
  });
});
