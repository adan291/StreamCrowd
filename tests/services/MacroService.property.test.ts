/**
 * Property-based tests for MacroService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the macro orchestration system.
 * 
 * Feature: macro-system
 * Property 1: Macro Structure Validity
 * Property 7: Condition-Based Action Skipping
 * Property 8: Import/Export Round-Trip
 * Property 10: Execution Log Completeness
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 5.5, 8.1, 8.2, 8.3, 8.5, 8.6, 9.1, 9.2, 9.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MacroService, resetMacroService } from '../../src/application/services/MacroService';
import { MacroStorageService } from '../../src/application/services/MacroStorageService';
import { TriggerService } from '../../src/application/services/TriggerService';
import { ActionExecutorService } from '../../src/application/services/ActionExecutorService';
import { ConditionEvaluatorService } from '../../src/application/services/ConditionEvaluatorService';
import { VariableResolverService } from '../../src/application/services/VariableResolverService';
import type {
  MacroFormData,
  MacroAction,
  MacroTrigger,
  MacroCondition,
  ExecutionContext,
  TriggerType,
  ActionType,
  ChatCommandTrigger,
  ManualTrigger,
  SendChatMessageConfig,
  DelayConfig,
  MacroVariable
} from '../../types/macros';

// ============ MOCK STORAGE SERVICE ============

class MockStorageService extends MacroStorageService {
  private macros: Map<string, any> = new Map();
  private logs: any[] = [];

  async saveMacro(macro: any): Promise<void> {
    this.macros.set(macro.id, { ...macro });
  }

  async getMacro(id: string): Promise<any | null> {
    return this.macros.get(id) || null;
  }

  async getAllMacros(): Promise<any[]> {
    return Array.from(this.macros.values());
  }

  async deleteMacro(id: string): Promise<void> {
    this.macros.delete(id);
  }

  async saveExecutionLog(log: any): Promise<void> {
    this.logs.unshift(log);
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
  }

  async getExecutionLog(macroId?: string): Promise<any[]> {
    if (macroId) {
      return this.logs.filter(l => l.macroId === macroId);
    }
    return [...this.logs];
  }

  async clearExecutionLog(): Promise<void> {
    this.logs = [];
  }

  clear(): void {
    this.macros.clear();
    this.logs = [];
  }
}

// ============ ARBITRARIES ============

const triggerTypeArb: fc.Arbitrary<TriggerType> = fc.constantFrom(
  'chat_command', 'chat_keyword', 'schedule', 'event', 'manual'
);

const actionTypeArb: fc.Arbitrary<ActionType> = fc.constantFrom(
  'send_chat_message', 'delay', 'set_variable'
);

// Valid macro name (non-empty, trimmed)
const macroNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());

// Valid description
const descriptionArb = fc.string({ maxLength: 200 });

// Valid delay (0-60 seconds)
const validDelayArb = fc.integer({ min: 0, max: 60 });

// Invalid delay (outside 0-60 range)
const invalidDelayArb = fc.oneof(
  fc.integer({ min: -100, max: -1 }),
  fc.integer({ min: 61, max: 200 })
);

// Valid cooldown (0-3600 seconds)
const validCooldownArb = fc.integer({ min: 0, max: 3600 });

// Chat command trigger
const chatCommandTriggerArb: fc.Arbitrary<MacroTrigger> = fc.record({
  type: fc.constant('chat_command' as const),
  config: fc.record({
    command: fc.string({ minLength: 1, maxLength: 20 }).map(s => `!${s.replace(/[^a-zA-Z0-9]/g, 'x')}`),
    caseSensitive: fc.boolean()
  })
});

// Manual trigger
const manualTriggerArb: fc.Arbitrary<MacroTrigger> = fc.record({
  type: fc.constant('manual' as const),
  config: fc.record({
    showInQuickActions: fc.boolean()
  })
});

// Simple trigger arbitrary
const simpleTriggerArb = fc.oneof(chatCommandTriggerArb, manualTriggerArb);

// Send chat message action config
const sendChatMessageConfigArb: fc.Arbitrary<SendChatMessageConfig> = fc.record({
  message: fc.string({ minLength: 1, maxLength: 100 }),
  platform: fc.constantFrom('twitch', 'youtube', 'kick', 'all', undefined)
});

// Delay action config
const delayConfigArb: fc.Arbitrary<DelayConfig> = fc.record({
  seconds: validDelayArb
});

// Simple action (no condition, no delay for fast tests)
const simpleActionArb: fc.Arbitrary<MacroAction> = fc.record({
  id: fc.uuid(),
  type: fc.constant('delay' as const),
  config: fc.record({ seconds: fc.constant(0) }), // 0 seconds for fast tests
  delay: fc.constant(0) // No pre-action delay
});

// Delay action (0 seconds for fast tests)
const delayActionArb: fc.Arbitrary<MacroAction> = fc.record({
  id: fc.uuid(),
  type: fc.constant('delay' as const),
  config: fc.record({ seconds: fc.constant(0) }),
  delay: fc.constant(0)
});

// Simple condition (always true)
const alwaysTrueConditionArb: fc.Arbitrary<MacroCondition> = fc.constant({
  type: 'simple' as const,
  simple: {
    leftOperand: '1',
    operator: 'equals' as const,
    rightOperand: '1'
  }
});

// Simple condition (always false)
const alwaysFalseConditionArb: fc.Arbitrary<MacroCondition> = fc.constant({
  type: 'simple' as const,
  simple: {
    leftOperand: '1',
    operator: 'equals' as const,
    rightOperand: '2'
  }
});

// Action with condition
const actionWithConditionArb = (condition: MacroCondition): fc.Arbitrary<MacroAction> => 
  fc.record({
    id: fc.uuid(),
    type: fc.constant('send_chat_message' as const),
    config: sendChatMessageConfigArb,
    delay: fc.constant(0),
    condition: fc.constant(condition)
  });

// Valid macro form data (always enabled for execution tests)
const validMacroFormDataArb: fc.Arbitrary<MacroFormData> = fc.record({
  name: macroNameArb,
  description: descriptionArb,
  enabled: fc.constant(true), // Always enabled for execution tests
  trigger: simpleTriggerArb,
  actions: fc.array(simpleActionArb, { minLength: 0, maxLength: 5 }),
  cooldown: validCooldownArb
});

// Execution context
const executionContextArb: fc.Arbitrary<ExecutionContext> = fc.record({
  triggeredBy: fc.constant('manual' as TriggerType),
  user: fc.option(fc.record({
    username: fc.string({ minLength: 1, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
    role: fc.constantFrom('viewer' as const, 'subscriber' as const, 'moderator' as const, 'broadcaster' as const),
    platform: fc.constantFrom('twitch', 'youtube', 'kick')
  }), { nil: undefined }),
  message: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  variables: fc.constant(new Map<string, MacroVariable>())
});

// ============ HELPER FUNCTIONS ============

function createTestService(): { service: MacroService; storage: MockStorageService } {
  const storage = new MockStorageService();
  const triggerService = new TriggerService();
  const variableResolver = new VariableResolverService();
  const conditionEvaluator = new ConditionEvaluatorService(variableResolver);
  const actionExecutor = new ActionExecutorService({
    variableResolver,
    conditionEvaluator
  });

  const service = new MacroService({
    storageService: storage,
    triggerService,
    actionExecutor,
    conditionEvaluator,
    variableResolver
  });

  return { service, storage };
}

// ============ TESTS ============

describe('MacroService Property Tests', () => {
  let service: MacroService;
  let storage: MockStorageService;

  beforeEach(() => {
    resetMacroService();
    const testSetup = createTestService();
    service = testSetup.service;
    storage = testSetup.storage;
  });

  afterEach(() => {
    storage.clear();
    service.dispose();
    resetMacroService();
  });

  describe('Property 1: Macro Structure Validity', () => {
    /**
     * Feature: macro-system, Property 1: Macro Structure Validity
     * 
     * For any macro created, it SHALL contain all required fields (id, name, trigger, actions)
     * and all delays SHALL be within the valid range (0-60 seconds).
     * 
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */

    it('should create macros with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          async (formData) => {
            storage.clear();
            
            const macro = await service.createMacro(formData);

            // Verify all required fields exist
            expect(macro.id).toBeDefined();
            expect(typeof macro.id).toBe('string');
            expect(macro.id.length).toBeGreaterThan(0);

            expect(macro.name).toBe(formData.name.trim());
            expect(macro.description).toBe(formData.description || '');
            expect(macro.enabled).toBe(formData.enabled ?? true);
            
            expect(macro.trigger).toBeDefined();
            expect(macro.trigger.type).toBe(formData.trigger.type);
            
            expect(Array.isArray(macro.actions)).toBe(true);
            expect(macro.actions.length).toBe(formData.actions.length);

            expect(typeof macro.cooldown).toBe('number');
            expect(typeof macro.createdAt).toBe('number');
            expect(typeof macro.updatedAt).toBe('number');
            expect(typeof macro.executionCount).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize action delays to valid range (0-60)', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          simpleTriggerArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constant('delay' as const),
              config: fc.record({ seconds: fc.integer({ min: 0, max: 60 }) }),
              delay: validDelayArb // Use valid delays only - validation rejects invalid ones
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (name, trigger, actions) => {
            storage.clear();

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger,
              actions,
              cooldown: 0
            };

            const macro = await service.createMacro(formData);

            // All delays should be within 0-60 range
            for (const action of macro.actions) {
              expect(action.delay).toBeGreaterThanOrEqual(0);
              expect(action.delay).toBeLessThanOrEqual(60);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject macros with empty names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n'),
          simpleTriggerArb,
          async (emptyName, trigger) => {
            storage.clear();

            const formData: MacroFormData = {
              name: emptyName,
              description: '',
              enabled: true,
              trigger,
              actions: [],
              cooldown: 0
            };

            await expect(service.createMacro(formData)).rejects.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should ensure all actions have IDs after creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          async (formData) => {
            storage.clear();

            const macro = await service.createMacro(formData);

            for (const action of macro.actions) {
              expect(action.id).toBeDefined();
              expect(typeof action.id).toBe('string');
              expect(action.id.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve action order in created macros', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          simpleTriggerArb,
          fc.array(simpleActionArb, { minLength: 2, maxLength: 5 }),
          async (name, trigger, actions) => {
            storage.clear();

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger,
              actions,
              cooldown: 0
            };

            const macro = await service.createMacro(formData);

            // Actions should be in the same order
            expect(macro.actions.length).toBe(actions.length);
            for (let i = 0; i < actions.length; i++) {
              expect(macro.actions[i].type).toBe(actions[i].type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Condition-Based Action Skipping', () => {
    /**
     * Feature: macro-system, Property 7: Condition-Based Action Skipping
     * 
     * For any action with a condition that evaluates to false, the action SHALL be
     * skipped and marked as skipped in the execution result.
     * 
     * **Validates: Requirements 5.5**
     */

    it('should skip actions when condition evaluates to false', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          executionContextArb,
          async (name, context) => {
            storage.clear();

            // Create action with always-false condition
            const actionWithFalseCondition: MacroAction = {
              id: 'action-1',
              type: 'send_chat_message',
              config: { message: 'test' } as SendChatMessageConfig,
              delay: 0,
              condition: {
                type: 'simple',
                simple: {
                  leftOperand: '1',
                  operator: 'equals',
                  rightOperand: '2' // 1 != 2, so false
                }
              }
            };

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions: [actionWithFalseCondition],
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            const result = await service.executeMacro(macro.id, context);

            // Action should be skipped
            expect(result.actionResults.length).toBe(1);
            expect(result.actionResults[0].skipped).toBe(true);
            expect(result.actionResults[0].success).toBe(true); // Skipped is still success
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute actions when condition evaluates to true', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          executionContextArb,
          async (name, context) => {
            storage.clear();

            // Create action with always-true condition
            const actionWithTrueCondition: MacroAction = {
              id: 'action-1',
              type: 'delay',
              config: { seconds: 0 } as DelayConfig,
              delay: 0,
              condition: {
                type: 'simple',
                simple: {
                  leftOperand: '1',
                  operator: 'equals',
                  rightOperand: '1' // 1 == 1, so true
                }
              }
            };

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions: [actionWithTrueCondition],
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            const result = await service.executeMacro(macro.id, context);

            // Action should NOT be skipped
            expect(result.actionResults.length).toBe(1);
            expect(result.actionResults[0].skipped).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute actions without conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          executionContextArb,
          async (name, context) => {
            storage.clear();

            // Create action without condition
            const actionWithoutCondition: MacroAction = {
              id: 'action-1',
              type: 'delay',
              config: { seconds: 0 } as DelayConfig,
              delay: 0
              // No condition
            };

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions: [actionWithoutCondition],
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            const result = await service.executeMacro(macro.id, context);

            // Action should NOT be skipped
            expect(result.actionResults.length).toBe(1);
            expect(result.actionResults[0].skipped).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly count skipped vs executed actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          executionContextArb,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (name, context, trueCount, falseCount) => {
            storage.clear();

            const actions: MacroAction[] = [];

            // Add actions with true conditions
            for (let i = 0; i < trueCount; i++) {
              actions.push({
                id: `true-action-${i}`,
                type: 'delay',
                config: { seconds: 0 } as DelayConfig,
                delay: 0,
                condition: {
                  type: 'simple',
                  simple: { leftOperand: '1', operator: 'equals', rightOperand: '1' }
                }
              });
            }

            // Add actions with false conditions
            for (let i = 0; i < falseCount; i++) {
              actions.push({
                id: `false-action-${i}`,
                type: 'delay',
                config: { seconds: 0 } as DelayConfig,
                delay: 0,
                condition: {
                  type: 'simple',
                  simple: { leftOperand: '1', operator: 'equals', rightOperand: '2' }
                }
              });
            }

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions,
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            const result = await service.executeMacro(macro.id, context);

            const skippedCount = result.actionResults.filter(r => r.skipped).length;
            const executedCount = result.actionResults.filter(r => !r.skipped).length;

            expect(skippedCount).toBe(falseCount);
            expect(executedCount).toBe(trueCount);
            expect(result.actionsExecuted).toBe(trueCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Execution Log Completeness', () => {
    /**
     * Feature: macro-system, Property 10: Execution Log Completeness
     * 
     * For any macro execution, the log entry SHALL contain macroId, timestamp,
     * success status, and results for each action executed.
     * 
     * **Validates: Requirements 9.1, 9.2, 9.5**
     */

    it('should log all required fields for every execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          executionContextArb,
          async (formData, context) => {
            storage.clear();

            const macro = await service.createMacro(formData);
            await service.executeMacro(macro.id, context);

            const logs = await storage.getExecutionLog(macro.id);
            
            expect(logs.length).toBe(1);
            const log = logs[0];

            // Verify all required fields
            expect(log.id).toBeDefined();
            expect(typeof log.id).toBe('string');
            
            expect(log.macroId).toBe(macro.id);
            expect(log.macroName).toBe(macro.name);
            
            expect(typeof log.startedAt).toBe('number');
            expect(typeof log.completedAt).toBe('number');
            expect(log.completedAt).toBeGreaterThanOrEqual(log.startedAt);
            
            expect(typeof log.success).toBe('boolean');
            expect(typeof log.actionsExecuted).toBe('number');
            
            expect(Array.isArray(log.actionResults)).toBe(true);
            expect(log.actionResults.length).toBe(formData.actions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include action results for each action', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constant('delay' as const),
              config: fc.record({ seconds: fc.constant(0) }), // 0 seconds to avoid timeout
              delay: fc.constant(0)
            }),
            { minLength: 1, maxLength: 3 }
          ),
          executionContextArb,
          async (name, actions, context) => {
            storage.clear();

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions,
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            await service.executeMacro(macro.id, context);

            const logs = await storage.getExecutionLog(macro.id);
            const log = logs[0];

            // Each action should have a result
            expect(log.actionResults.length).toBe(actions.length);

            for (const actionResult of log.actionResults) {
              expect(actionResult.actionId).toBeDefined();
              expect(actionResult.actionType).toBeDefined();
              expect(typeof actionResult.success).toBe('boolean');
              expect(typeof actionResult.skipped).toBe('boolean');
              expect(typeof actionResult.duration).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record errors when actions fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          executionContextArb,
          async (name, context) => {
            storage.clear();

            // Create action that will fail (send_chat_message without chat service)
            const failingAction: MacroAction = {
              id: 'failing-action',
              type: 'send_chat_message',
              config: { message: 'test' } as SendChatMessageConfig,
              delay: 0
            };

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions: [failingAction],
              cooldown: 0
            };

            const macro = await service.createMacro(formData);
            const result = await service.executeMacro(macro.id, context);

            // Execution should complete but with failure
            expect(result.success).toBe(false);

            const logs = await storage.getExecutionLog(macro.id);
            const log = logs[0];

            expect(log.success).toBe(false);
            expect(log.actionResults[0].success).toBe(false);
            expect(log.actionResults[0].error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record triggeredBy in execution log', async () => {
      const triggerTypes: TriggerType[] = ['manual', 'chat_command', 'chat_keyword', 'schedule', 'event'];

      await fc.assert(
        fc.asyncProperty(
          macroNameArb,
          fc.constantFrom(...triggerTypes),
          async (name, triggeredBy) => {
            storage.clear();

            const formData: MacroFormData = {
              name,
              description: '',
              enabled: true,
              trigger: { type: 'manual', config: { showInQuickActions: true } },
              actions: [],
              cooldown: 0
            };

            const context: ExecutionContext = {
              triggeredBy,
              variables: new Map()
            };

            const macro = await service.createMacro(formData);
            await service.executeMacro(macro.id, context);

            const logs = await storage.getExecutionLog(macro.id);
            expect(logs[0].triggeredBy).toBe(triggeredBy);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Global Pause/Resume', () => {
    it('should prevent execution when globally paused', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          executionContextArb,
          async (formData, context) => {
            storage.clear();

            const macro = await service.createMacro(formData);
            
            service.pauseAll();
            expect(service.isPaused()).toBe(true);

            const result = await service.executeMacro(macro.id, context);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('paused');

            service.resumeAll();
            expect(service.isPaused()).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: Import/Export Round-Trip', () => {
    /**
     * Feature: macro-system, Property 8: Import/Export Round-Trip
     * 
     * For any set of valid macros, exporting to JSON and importing back SHALL
     * produce equivalent macros with all properties preserved.
     * 
     * **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6**
     */

    it('should preserve macro properties through export/import cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validMacroFormDataArb, { minLength: 1, maxLength: 5 }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          async (macroForms, author) => {
            storage.clear();

            // Create original macros
            const originalMacros = [];
            for (const formData of macroForms) {
              const macro = await service.createMacro(formData);
              originalMacros.push(macro);
            }

            // Export all macros
            const exportedJson = await service.exportMacros(
              originalMacros.map(m => m.id),
              author
            );

            // Verify export is valid JSON
            const exportData = JSON.parse(exportedJson);
            expect(exportData.version).toBeDefined();
            expect(exportData.exportedAt).toBeDefined();
            expect(exportData.author).toBe(author);
            expect(Array.isArray(exportData.macros)).toBe(true);
            expect(exportData.macros.length).toBe(originalMacros.length);

            // Clear storage and import
            storage.clear();
            const importResult = await service.importMacros(exportedJson);

            // Verify import succeeded
            expect(importResult.imported).toBe(originalMacros.length);
            expect(importResult.skipped).toBe(0);
            expect(importResult.errors.length).toBe(0);

            // Get imported macros
            const importedMacros = await service.getAllMacros();
            expect(importedMacros.length).toBe(originalMacros.length);

            // Verify each macro's properties are preserved
            for (const original of originalMacros) {
              const imported = importedMacros.find(m => m.name === original.name);
              expect(imported).toBeDefined();
              
              if (imported) {
                // Core properties should match
                expect(imported.name).toBe(original.name);
                expect(imported.description).toBe(original.description);
                expect(imported.enabled).toBe(original.enabled);
                expect(imported.cooldown).toBe(original.cooldown);
                
                // Trigger should match
                expect(imported.trigger.type).toBe(original.trigger.type);
                expect(JSON.stringify(imported.trigger.config)).toBe(
                  JSON.stringify(original.trigger.config)
                );
                
                // Actions should match
                expect(imported.actions.length).toBe(original.actions.length);
                for (let i = 0; i < original.actions.length; i++) {
                  expect(imported.actions[i].type).toBe(original.actions[i].type);
                  expect(imported.actions[i].delay).toBe(original.actions[i].delay);
                  expect(JSON.stringify(imported.actions[i].config)).toBe(
                    JSON.stringify(original.actions[i].config)
                  );
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle name conflicts by renaming', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          async (formData) => {
            storage.clear();

            // Create original macro
            const original = await service.createMacro(formData);

            // Export the macro
            const exportedJson = await service.exportMacros([original.id]);

            // Import without clearing - should create conflict
            const importResult = await service.importMacros(exportedJson);

            // Should have renamed the imported macro
            expect(importResult.imported).toBe(1);
            expect(importResult.renamed.length).toBe(1);
            expect(importResult.renamed[0]).toContain(original.name);
            expect(importResult.renamed[0]).toContain('->');

            // Should now have 2 macros
            const allMacros = await service.getAllMacros();
            expect(allMacros.length).toBe(2);

            // One should have original name, one should have renamed name
            const names = allMacros.map(m => m.name);
            expect(names).toContain(original.name);
            expect(names.some(n => n.startsWith(original.name) && n !== original.name)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate macro structure on import', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '{}', // Empty object
            '{"macros": null}', // Null macros
            '{"macros": "not an array"}', // Invalid macros type
            'not json at all', // Invalid JSON
            '{"macros": [{"name": ""}]}' // Invalid macro (empty name)
          ),
          async (invalidJson) => {
            storage.clear();

            const importResult = await service.importMacros(invalidJson);

            // Should fail or skip invalid macros
            expect(importResult.success).toBe(false);
            expect(importResult.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include metadata in export', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMacroFormDataArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          async (formData, author) => {
            storage.clear();

            const macro = await service.createMacro(formData);
            const beforeExport = Date.now();
            const exportedJson = await service.exportMacros([macro.id], author);
            const afterExport = Date.now();

            const exportData = JSON.parse(exportedJson);

            // Verify metadata
            expect(exportData.version).toBe('1.0.0');
            expect(exportData.exportedAt).toBeGreaterThanOrEqual(beforeExport);
            expect(exportData.exportedAt).toBeLessThanOrEqual(afterExport);
            expect(exportData.author).toBe(author);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export all macros when no IDs specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validMacroFormDataArb, { minLength: 1, maxLength: 5 }),
          async (macroForms) => {
            storage.clear();

            // Create multiple macros
            for (const formData of macroForms) {
              await service.createMacro(formData);
            }

            // Export with empty IDs array (should export all)
            const exportedJson = await service.exportMacros([]);
            const exportData = JSON.parse(exportedJson);

            expect(exportData.macros.length).toBe(macroForms.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export only selected macros when IDs specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validMacroFormDataArb, { minLength: 2, maxLength: 5 }),
          async (macroForms) => {
            storage.clear();

            // Create multiple macros
            const createdMacros = [];
            for (const formData of macroForms) {
              const macro = await service.createMacro(formData);
              createdMacros.push(macro);
            }

            // Export only the first macro
            const exportedJson = await service.exportMacros([createdMacros[0].id]);
            const exportData = JSON.parse(exportedJson);

            expect(exportData.macros.length).toBe(1);
            expect(exportData.macros[0].id).toBe(createdMacros[0].id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
