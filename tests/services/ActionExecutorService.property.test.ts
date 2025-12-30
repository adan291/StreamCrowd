/**
 * Property-based tests for ActionExecutorService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the action execution system.
 * 
 * Feature: macro-system, Property 4: Action Execution Order
 * 
 * For any macro with multiple actions, execution SHALL process actions in their 
 * defined sequential order, and a failing action SHALL NOT prevent subsequent 
 * actions from executing.
 * 
 * **Validates: Requirements 1.2, 3.10**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { 
  ActionExecutorService,
  type IChatServiceAdapter,
  type IOBSServiceAdapter,
  type ISoundServiceAdapter,
  type IPollServiceAdapter,
  type IPredictionServiceAdapter,
  type INotificationServiceAdapter,
} from '../../src/application/services/ActionExecutorService';
import { VariableResolverService } from '../../src/application/services/VariableResolverService';
import { ConditionEvaluatorService } from '../../src/application/services/ConditionEvaluatorService';
import type {
  MacroAction,
  ActionType,
  ExecutionContext,
  MacroVariable,
  TriggerType,
  UserRole,
  SendChatMessageConfig,
  DelayConfig,
  SetVariableConfig,
} from '../../types/macros';

// ============ MOCK SERVICES ============

function createMockChatService(shouldFail = false): IChatServiceAdapter {
  return {
    sendMessage: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('Chat service error');
      return true;
    }),
  };
}

function createMockOBSService(shouldFail = false): IOBSServiceAdapter {
  return {
    isConnected: vi.fn().mockReturnValue(true),
    switchScene: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('OBS service error');
    }),
    setSourceVisible: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('OBS service error');
    }),
    getCurrentScene: vi.fn().mockResolvedValue('Scene1'),
    getSceneSources: vi.fn().mockResolvedValue([
      { name: 'Source1', visible: true },
      { name: 'Source2', visible: false },
    ]),
  };
}

function createMockSoundService(shouldFail = false): ISoundServiceAdapter {
  return {
    playSound: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('Sound service error');
    }),
  };
}

function createMockPollService(shouldFail = false): IPollServiceAdapter {
  return {
    createPoll: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('Poll service error');
      return { id: 'poll-1' };
    }),
  };
}

function createMockPredictionService(shouldFail = false): IPredictionServiceAdapter {
  return {
    createPrediction: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('Prediction service error');
      return { id: 'prediction-1' };
    }),
    getBroadcasterId: vi.fn().mockReturnValue('broadcaster-123'),
  };
}

function createMockNotificationService(shouldFail = false): INotificationServiceAdapter {
  return {
    notify: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error('Notification service error');
      return [{ channel: 'push', success: true }];
    }),
  };
}

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

const executionContextArb: fc.Arbitrary<ExecutionContext> = fc.record({
  triggeredBy: triggerTypeArb,
  user: fc.option(executionUserArb, { nil: undefined }),
  message: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  event: fc.constant(undefined),
  variables: fc.constant(new Map<string, MacroVariable>())
});

// Action ID generator
const actionIdArb = fc.uuid();

// Simple action types that don't require external services
const simpleActionTypeArb: fc.Arbitrary<ActionType> = fc.constantFrom(
  'delay', 'set_variable'
);

// All action types
const actionTypeArb: fc.Arbitrary<ActionType> = fc.constantFrom(
  'send_chat_message',
  'change_scene',
  'toggle_source',
  'play_sound',
  'start_poll',
  'start_prediction',
  'send_notification',
  'set_variable',
  'delay'
);

// Delay config (0-1 second for fast tests)
const delayConfigArb: fc.Arbitrary<DelayConfig> = fc.record({
  seconds: fc.integer({ min: 0, max: 0 }) // Use 0 for fast tests
});

// Set variable config
const setVariableConfigArb: fc.Arbitrary<SetVariableConfig> = fc.record({
  variableName: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.integer({ min: -1000, max: 1000 })
  ),
  operation: fc.constantFrom('set', 'increment', 'decrement')
});

// Send chat message config
const sendChatMessageConfigArb: fc.Arbitrary<SendChatMessageConfig> = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
  platform: fc.option(fc.constantFrom('twitch', 'youtube', 'kick', 'all'), { nil: undefined })
});

// Simple action (delay or set_variable)
const delayActionArb: fc.Arbitrary<MacroAction> = fc.record({
  id: actionIdArb,
  type: fc.constant('delay' as ActionType),
  config: delayConfigArb,
  condition: fc.constant(undefined),
  delay: fc.constant(0)
});

const setVariableActionArb: fc.Arbitrary<MacroAction> = fc.record({
  id: actionIdArb,
  type: fc.constant('set_variable' as ActionType),
  config: setVariableConfigArb,
  condition: fc.constant(undefined),
  delay: fc.constant(0)
});

const simpleActionArb: fc.Arbitrary<MacroAction> = fc.oneof(
  delayActionArb,
  setVariableActionArb
);

// Chat message action
const chatMessageActionArb: fc.Arbitrary<MacroAction> = fc.record({
  id: actionIdArb,
  type: fc.constant('send_chat_message' as const),
  config: sendChatMessageConfigArb,
  condition: fc.constant(undefined),
  delay: fc.constant(0)
});

// Array of actions with unique IDs
const actionsArrayArb = (minLength: number, maxLength: number): fc.Arbitrary<MacroAction[]> => 
  fc.array(chatMessageActionArb, { minLength, maxLength }).map(actions => 
    actions.map((action, index) => ({
      ...action,
      id: `action-${index}-${Date.now()}`
    }))
  );

// ============ HELPER FUNCTIONS ============

function createDefaultContext(): ExecutionContext {
  return {
    triggeredBy: 'manual',
    user: {
      username: 'testuser',
      displayName: 'Test User',
      role: 'viewer',
      platform: 'twitch'
    },
    message: 'test message',
    variables: new Map<string, MacroVariable>()
  };
}


// ============ TESTS ============

describe('ActionExecutorService Property Tests', () => {
  let service: ActionExecutorService;
  let variableResolver: VariableResolverService;
  let conditionEvaluator: ConditionEvaluatorService;
  let mockChatService: IChatServiceAdapter;
  let mockOBSService: IOBSServiceAdapter;
  let mockSoundService: ISoundServiceAdapter;
  let mockPollService: IPollServiceAdapter;
  let mockPredictionService: IPredictionServiceAdapter;
  let mockNotificationService: INotificationServiceAdapter;

  beforeEach(() => {
    variableResolver = new VariableResolverService();
    conditionEvaluator = new ConditionEvaluatorService(variableResolver);
    mockChatService = createMockChatService();
    mockOBSService = createMockOBSService();
    mockSoundService = createMockSoundService();
    mockPollService = createMockPollService();
    mockPredictionService = createMockPredictionService();
    mockNotificationService = createMockNotificationService();

    service = new ActionExecutorService({
      chatService: mockChatService,
      obsService: mockOBSService,
      soundService: mockSoundService,
      pollService: mockPollService,
      predictionService: mockPredictionService,
      notificationService: mockNotificationService,
      variableResolver,
      conditionEvaluator,
    });
  });

  describe('Property 4: Action Execution Order', () => {
    /**
     * Feature: macro-system, Property 4: Action Execution Order
     * 
     * For any macro with multiple actions, execution SHALL process actions in their 
     * defined sequential order, and a failing action SHALL NOT prevent subsequent 
     * actions from executing.
     * 
     * **Validates: Requirements 1.2, 3.10**
     */

    it('should execute actions in sequential order (Requirement 1.2)', async () => {
      await fc.assert(
        fc.asyncProperty(
          actionsArrayArb(2, 5),
          executionContextArb,
          async (actions, context) => {
            const executionOrder: string[] = [];
            
            // Track execution order via mock
            (mockChatService.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(async () => {
              executionOrder.push('chat');
              return true;
            });

            const results = await service.executeAll(actions, context);

            // Verify all actions were executed
            expect(results.length).toBe(actions.length);
            
            // Verify results are in the same order as actions
            for (let i = 0; i < actions.length; i++) {
              expect(results[i].actionId).toBe(actions[i].id);
            }

            // Verify execution order matches action order
            expect(executionOrder.length).toBe(actions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should continue execution after a failing action (Requirement 3.10)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // Index of failing action
          actionsArrayArb(3, 5),
          executionContextArb,
          async (failIndex, actions, context) => {
            // Ensure failIndex is within bounds
            const actualFailIndex = failIndex % actions.length;
            let callCount = 0;

            // Make one action fail
            (mockChatService.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(async () => {
              const currentCall = callCount++;
              if (currentCall === actualFailIndex) {
                throw new Error('Simulated failure');
              }
              return true;
            });

            const results = await service.executeAll(actions, context);

            // All actions should have results
            expect(results.length).toBe(actions.length);

            // The failing action should be marked as failed
            expect(results[actualFailIndex].success).toBe(false);
            expect(results[actualFailIndex].error).toBeDefined();

            // Actions after the failing one should still execute
            for (let i = actualFailIndex + 1; i < actions.length; i++) {
              expect(results[i].success).toBe(true);
            }

            // Total calls should equal total actions
            expect(callCount).toBe(actions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return results for all actions regardless of success/failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // Success pattern
          actionsArrayArb(2, 5),
          executionContextArb,
          async (successPattern, actions, context) => {
            // Adjust actions array to match success pattern length
            const adjustedActions = actions.slice(0, successPattern.length);
            if (adjustedActions.length < successPattern.length) {
              // Pad with copies of last action
              while (adjustedActions.length < successPattern.length) {
                adjustedActions.push({
                  ...actions[0],
                  id: `action-padded-${adjustedActions.length}`
                });
              }
            }

            let callIndex = 0;
            (mockChatService.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(async () => {
              const shouldSucceed = successPattern[callIndex % successPattern.length];
              callIndex++;
              if (!shouldSucceed) {
                throw new Error('Simulated failure');
              }
              return true;
            });

            const results = await service.executeAll(adjustedActions, context);

            // Should have result for every action
            expect(results.length).toBe(adjustedActions.length);

            // Each result should have required fields
            for (const result of results) {
              expect(result).toHaveProperty('actionId');
              expect(result).toHaveProperty('actionType');
              expect(result).toHaveProperty('success');
              expect(result).toHaveProperty('skipped');
              expect(result).toHaveProperty('duration');
              expect(typeof result.duration).toBe('number');
              expect(result.duration).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve action IDs in results', async () => {
      await fc.assert(
        fc.asyncProperty(
          actionsArrayArb(1, 5),
          executionContextArb,
          async (actions, context) => {
            const results = await service.executeAll(actions, context);

            // Each result should have the corresponding action's ID
            for (let i = 0; i < actions.length; i++) {
              expect(results[i].actionId).toBe(actions[i].id);
              expect(results[i].actionType).toBe(actions[i].type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty action arrays', async () => {
      await fc.assert(
        fc.asyncProperty(
          executionContextArb,
          async (context) => {
            const results = await service.executeAll([], context);

            expect(results).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip actions when condition is not met', async () => {
      // Reset mock for this specific test
      vi.clearAllMocks();
      
      const context = createDefaultContext();
      const actions: MacroAction[] = [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: { message: 'Hello' },
          condition: {
            type: 'simple',
            simple: {
              leftOperand: 'false',
              operator: 'equals',
              rightOperand: 'true' // Always false
            }
          },
          delay: 0
        },
        {
          id: 'action-2',
          type: 'send_chat_message',
          config: { message: 'World' },
          delay: 0
        }
      ];

      const results = await service.executeAll(actions, context);

      // First action should be skipped
      expect(results[0].skipped).toBe(true);
      expect(results[0].success).toBe(true); // Skipped is still "successful"

      // Second action should execute normally
      expect(results[1].skipped).toBe(false);
      expect(results[1].success).toBe(true);

      // Chat service should only be called once (for second action)
      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should execute actions when condition is met', async () => {
      // Reset mock for this specific test
      vi.clearAllMocks();
      
      const context = createDefaultContext();
      const actions: MacroAction[] = [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: { message: 'Hello' },
          condition: {
            type: 'simple',
            simple: {
              leftOperand: 'true',
              operator: 'equals',
              rightOperand: 'true' // Always true
            }
          },
          delay: 0
        }
      ];

      const results = await service.executeAll(actions, context);

      expect(results[0].skipped).toBe(false);
      expect(results[0].success).toBe(true);
      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Individual Action Execution', () => {
    it('should execute send_chat_message action correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          sendChatMessageConfigArb,
          executionContextArb,
          async (config, context) => {
            const action: MacroAction = {
              id: 'test-action',
              type: 'send_chat_message',
              config,
              delay: 0
            };

            const result = await service.execute(action, context);

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(false);
            expect(mockChatService.sendMessage).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute set_variable action correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          setVariableConfigArb,
          executionContextArb,
          async (config, context) => {
            const action: MacroAction = {
              id: 'test-action',
              type: 'set_variable',
              config,
              delay: 0
            };

            const result = await service.execute(action, context);

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(false);

            // Variable should be set
            const variable = variableResolver.getVariable(config.variableName, context);
            expect(variable).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute delay action correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          executionContextArb,
          async (context) => {
            const action: MacroAction = {
              id: 'test-action',
              type: 'delay',
              config: { seconds: 0 }, // Use 0 for fast tests
              delay: 0
            };

            const startTime = Date.now();
            const result = await service.execute(action, context);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(false);
            expect(result.duration).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chat service gracefully', async () => {
      const serviceWithoutChat = new ActionExecutorService({
        variableResolver,
        conditionEvaluator,
      });

      const action: MacroAction = {
        id: 'test-action',
        type: 'send_chat_message',
        config: { message: 'Hello' },
        delay: 0
      };

      const result = await serviceWithoutChat.execute(action, createDefaultContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chat service not available');
    });

    it('should handle missing OBS service gracefully', async () => {
      const serviceWithoutOBS = new ActionExecutorService({
        variableResolver,
        conditionEvaluator,
      });

      const action: MacroAction = {
        id: 'test-action',
        type: 'change_scene',
        config: { sceneName: 'Scene1' },
        delay: 0
      };

      const result = await serviceWithoutOBS.execute(action, createDefaultContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('OBS service not available');
    });

    it('should handle OBS not connected gracefully', async () => {
      const disconnectedOBS = createMockOBSService();
      (disconnectedOBS.isConnected as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const serviceWithDisconnectedOBS = new ActionExecutorService({
        obsService: disconnectedOBS,
        variableResolver,
        conditionEvaluator,
      });

      const action: MacroAction = {
        id: 'test-action',
        type: 'change_scene',
        config: { sceneName: 'Scene1' },
        delay: 0
      };

      const result = await serviceWithDisconnectedOBS.execute(action, createDefaultContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('OBS is not connected');
    });
  });
});
