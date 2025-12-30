/**
 * Property-based tests for TriggerService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the trigger detection and cooldown system.
 * 
 * Feature: macro-system
 * Property 3: Trigger Type Recognition
 * Property 9: Cooldown Enforcement
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TriggerService } from '../../src/application/services/TriggerService';
import type {
  Macro,
  MacroTrigger,
  TriggerType,
  TriggerEvent,
  ChatCommandTrigger,
  ChatKeywordTrigger,
  ScheduleTrigger,
  EventTrigger,
  ManualTrigger,
  ExecutionUser,
  UserRole,
  MacroAction
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

const executionUserArb: fc.Arbitrary<ExecutionUser> = fc.record({
  username: usernameArb,
  displayName: displayNameArb,
  role: userRoleArb,
  platform: platformArb
});

// Command arbitrary (alphanumeric, starts with letter)
const commandArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s));

// Keyword arbitrary (simple words)
const keywordArb = fc.string({ minLength: 2, maxLength: 15 })
  .filter(s => /^[a-zA-Z]+$/.test(s));

// Event type arbitrary
type EventType = 'follower' | 'raid' | 'subscription' | 'bits' | 'host' | 'poll_ended' | 'prediction_resolved';
const eventTypeArb: fc.Arbitrary<EventType> = fc.constantFrom(
  'follower' as const, 'raid' as const, 'subscription' as const, 'bits' as const, 
  'host' as const, 'poll_ended' as const, 'prediction_resolved' as const
);

// Chat command trigger config
const chatCommandTriggerArb: fc.Arbitrary<ChatCommandTrigger> = fc.record({
  command: commandArb.map(c => `!${c}`),
  caseSensitive: fc.boolean(),
  requiredRole: fc.option(userRoleArb, { nil: undefined })
});

// Chat keyword trigger config
const chatKeywordTriggerArb: fc.Arbitrary<ChatKeywordTrigger> = fc.record({
  keywords: fc.array(keywordArb, { minLength: 1, maxLength: 3 }),
  matchAll: fc.boolean(),
  caseSensitive: fc.boolean()
});

// Schedule trigger config
const scheduleTriggerArb: fc.Arbitrary<ScheduleTrigger> = fc.record({
  type: fc.constant('interval' as const),
  interval: fc.integer({ min: 1, max: 60 })
});

// Event trigger config
const eventTriggerArb: fc.Arbitrary<EventTrigger> = fc.record({
  eventType: eventTypeArb,
  minValue: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined })
});

// Manual trigger config
const manualTriggerArb: fc.Arbitrary<ManualTrigger> = fc.record({
  hotkey: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  showInQuickActions: fc.boolean()
});

// Macro trigger arbitrary based on type
function createMacroTrigger(type: TriggerType): fc.Arbitrary<MacroTrigger> {
  switch (type) {
    case 'chat_command':
      return chatCommandTriggerArb.map(config => ({ type, config }));
    case 'chat_keyword':
      return chatKeywordTriggerArb.map(config => ({ type, config }));
    case 'schedule':
      return scheduleTriggerArb.map(config => ({ type, config }));
    case 'event':
      return eventTriggerArb.map(config => ({ type, config }));
    case 'manual':
      return manualTriggerArb.map(config => ({ type, config }));
  }
}

// Macro arbitrary
const macroIdArb = fc.uuid();
const macroNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

function createMacroArb(triggerType: TriggerType): fc.Arbitrary<Macro> {
  return fc.record({
    id: macroIdArb,
    name: macroNameArb,
    description: fc.string({ maxLength: 100 }),
    enabled: fc.constant(true),
    trigger: createMacroTrigger(triggerType),
    actions: fc.constant([] as MacroAction[]),
    cooldown: fc.integer({ min: 0, max: 60 }),
    createdAt: fc.constant(Date.now()),
    updatedAt: fc.constant(Date.now()),
    executionCount: fc.constant(0)
  });
}

// Any macro arbitrary
const anyMacroArb: fc.Arbitrary<Macro> = triggerTypeArb.chain(type => createMacroArb(type));

// ============ HELPER FUNCTIONS ============

function createTestMacro(
  id: string,
  triggerType: TriggerType,
  triggerConfig: ChatCommandTrigger | ChatKeywordTrigger | ScheduleTrigger | EventTrigger | ManualTrigger,
  options: Partial<Macro> = {}
): Macro {
  return {
    id,
    name: `Test Macro ${id}`,
    description: 'Test macro',
    enabled: true,
    trigger: { type: triggerType, config: triggerConfig },
    actions: [],
    cooldown: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executionCount: 0,
    ...options
  };
}

// Helper to reset service for property tests
function resetService(currentService: TriggerService): TriggerService {
  currentService.dispose();
  return new TriggerService();
}

// ============ TESTS ============

describe('TriggerService Property Tests', () => {
  let service: TriggerService;

  beforeEach(() => {
    service = new TriggerService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Property 3: Trigger Type Recognition', () => {
    /**
     * Feature: macro-system, Property 3: Trigger Type Recognition
     * 
     * For any trigger configuration, the TriggerService SHALL correctly identify
     * and process all supported trigger types (chat_command, chat_keyword, 
     * schedule, event, manual).
     * 
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
     */

    describe('Chat Command Triggers (Requirement 2.1)', () => {
      it('should recognize and match chat command triggers', () => {
        fc.assert(
          fc.property(
            commandArb,
            fc.boolean(),
            (command, caseSensitive) => {
              service = resetService(service);
              
              const config: ChatCommandTrigger = {
                command: `!${command}`,
                caseSensitive,
                requiredRole: undefined
              };
              
              const macro = createTestMacro('test-1', 'chat_command', config);
              service.registerTrigger(macro);

              // Test with exact command
              const exactMatch = service.checkChatCommand(`!${command}`);
              expect(exactMatch.length).toBe(1);
              expect(exactMatch[0].id).toBe('test-1');

              // Test with different case
              if (!caseSensitive) {
                const caseMatch = service.checkChatCommand(`!${command.toUpperCase()}`);
                expect(caseMatch.length).toBe(1);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should not match different commands', () => {
        fc.assert(
          fc.property(
            commandArb,
            commandArb.filter(c => c.length > 1),
            (command1, command2) => {
              service = resetService(service);
              
              // Ensure commands are different
              fc.pre(command1.toLowerCase() !== command2.toLowerCase());

              const config: ChatCommandTrigger = {
                command: `!${command1}`,
                caseSensitive: false,
                requiredRole: undefined
              };
              
              const macro = createTestMacro('test-1', 'chat_command', config);
              service.registerTrigger(macro);

              const noMatch = service.checkChatCommand(`!${command2}`);
              expect(noMatch.length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Chat Keyword Triggers (Requirement 2.2)', () => {
      it('should recognize and match chat keyword triggers with OR logic', () => {
        fc.assert(
          fc.property(
            fc.array(keywordArb, { minLength: 1, maxLength: 3 }),
            fc.integer({ min: 0, max: 2 }),
            (keywords, keywordIndex) => {
              service = resetService(service);
              
              fc.pre(keywords.length > 0);
              const selectedIndex = keywordIndex % keywords.length;
              
              const config: ChatKeywordTrigger = {
                keywords,
                matchAll: false, // OR logic
                caseSensitive: false
              };
              
              const macro = createTestMacro('test-1', 'chat_keyword', config);
              service.registerTrigger(macro);

              // Message containing one keyword should match
              const message = `Hello ${keywords[selectedIndex]} world`;
              const matches = service.checkChatKeyword(message);
              expect(matches.length).toBe(1);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should recognize and match chat keyword triggers with AND logic', () => {
        fc.assert(
          fc.property(
            fc.array(keywordArb, { minLength: 1, maxLength: 3 }),
            (keywords) => {
              service = resetService(service);
              
              fc.pre(keywords.length > 0);
              
              // Ensure keywords don't contain each other as substrings
              const lowerKeywords = keywords.map(k => k.toLowerCase());
              for (let i = 0; i < lowerKeywords.length; i++) {
                for (let j = 0; j < lowerKeywords.length; j++) {
                  if (i !== j && lowerKeywords[i].includes(lowerKeywords[j])) {
                    fc.pre(false); // Skip this test case
                  }
                }
              }
              
              const config: ChatKeywordTrigger = {
                keywords,
                matchAll: true, // AND logic
                caseSensitive: false
              };
              
              const macro = createTestMacro('test-1', 'chat_keyword', config);
              service.registerTrigger(macro);

              // Message containing all keywords should match
              const message = keywords.join(' ');
              const matches = service.checkChatKeyword(message);
              expect(matches.length).toBe(1);

              // Message missing one keyword should not match (if multiple keywords)
              if (keywords.length > 1) {
                const partialMessage = keywords.slice(0, -1).join(' ');
                const noMatch = service.checkChatKeyword(partialMessage);
                expect(noMatch.length).toBe(0);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Schedule Triggers (Requirement 2.3)', () => {
      it('should recognize schedule triggers', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 60 }),
            (interval) => {
              service = resetService(service);
              
              const config: ScheduleTrigger = {
                type: 'interval',
                interval
              };
              
              const macro = createTestMacro('test-1', 'schedule', config);
              service.registerTrigger(macro);

              // Schedule triggers should be in the registered list
              const registered = service.getRegisteredMacros();
              expect(registered.length).toBe(1);
              expect(registered[0].trigger.type).toBe('schedule');
              
              // checkSchedule should return the macro
              const scheduleMatches = service.checkSchedule();
              expect(scheduleMatches.length).toBe(1);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Event Triggers (Requirement 2.4)', () => {
      it('should recognize and match event triggers without minValue', () => {
        fc.assert(
          fc.property(
            eventTypeArb,
            (eventType) => {
              service = resetService(service);
              
              const config: EventTrigger = {
                eventType,
                minValue: undefined
              };
              
              const macro = createTestMacro('test-1', 'event', config);
              service.registerTrigger(macro);

              // Event with matching type should match (no minValue requirement)
              const matches = service.checkEvent(eventType);
              expect(matches.length).toBe(1);
              expect(matches[0].trigger.type).toBe('event');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should recognize and match event triggers with minValue for value-based events', () => {
        // Only test minValue with event types that have numeric values
        const valueEventTypeArb = fc.constantFrom('bits' as const, 'raid' as const, 'subscription' as const);
        
        fc.assert(
          fc.property(
            valueEventTypeArb,
            fc.integer({ min: 1, max: 100 }),
            (eventType, minValue) => {
              service = resetService(service);
              
              const config: EventTrigger = {
                eventType,
                minValue
              };
              
              const macro = createTestMacro('test-1', 'event', config);
              service.registerTrigger(macro);

              // Event with value >= minValue should match
              const eventValue = minValue + 10;
              const eventData = { bits: eventValue, viewers: eventValue, months: eventValue };
              
              const matches = service.checkEvent(eventType, eventData);
              expect(matches.length).toBe(1);
              expect(matches[0].trigger.type).toBe('event');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should not match events with insufficient value', () => {
        // Only test minValue with event types that have numeric values
        const valueEventTypeArb = fc.constantFrom('bits' as const, 'raid' as const, 'subscription' as const);
        
        fc.assert(
          fc.property(
            valueEventTypeArb,
            fc.integer({ min: 10, max: 100 }),
            (eventType, minValue) => {
              service = resetService(service);
              
              const config: EventTrigger = {
                eventType,
                minValue
              };
              
              const macro = createTestMacro('test-1', 'event', config);
              service.registerTrigger(macro);

              // Event with value below minimum should not match
              const lowValue = minValue - 5;
              const eventData = { bits: lowValue, viewers: lowValue, months: lowValue };
              
              const noMatch = service.checkEvent(eventType, eventData);
              expect(noMatch.length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should not match different event types', () => {
        fc.assert(
          fc.property(
            eventTypeArb,
            eventTypeArb,
            (eventType1, eventType2) => {
              service = resetService(service);
              
              fc.pre(eventType1 !== eventType2);
              
              const config: EventTrigger = {
                eventType: eventType1,
                minValue: undefined
              };
              
              const macro = createTestMacro('test-1', 'event', config);
              service.registerTrigger(macro);

              const noMatch = service.checkEvent(eventType2);
              expect(noMatch.length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Manual Triggers (Requirement 2.5)', () => {
      it('should recognize manual triggers', () => {
        fc.assert(
          fc.property(
            macroIdArb,
            fc.boolean(),
            (macroId, showInQuickActions) => {
              service = resetService(service);
              
              const config: ManualTrigger = {
                hotkey: undefined,
                showInQuickActions
              };
              
              const macro = createTestMacro(macroId, 'manual', config);
              service.registerTrigger(macro);

              // Manual trigger should be checkable by ID
              const match = service.checkManual(macroId);
              expect(match).not.toBeNull();
              expect(match?.id).toBe(macroId);
              expect(match?.trigger.type).toBe('manual');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should not find unregistered manual triggers', () => {
        fc.assert(
          fc.property(
            macroIdArb,
            macroIdArb,
            (registeredId, queriedId) => {
              service = resetService(service);
              
              fc.pre(registeredId !== queriedId);
              
              const config: ManualTrigger = {
                hotkey: undefined,
                showInQuickActions: true
              };
              
              const macro = createTestMacro(registeredId, 'manual', config);
              service.registerTrigger(macro);

              const noMatch = service.checkManual(queriedId);
              expect(noMatch).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Trigger Type Dispatch', () => {
      it('should correctly dispatch trigger events to appropriate handlers', () => {
        fc.assert(
          fc.property(
            triggerTypeArb,
            (triggerType) => {
              service = resetService(service);
              
              // Create a macro for each trigger type
              let config: ChatCommandTrigger | ChatKeywordTrigger | ScheduleTrigger | EventTrigger | ManualTrigger;
              let event: TriggerEvent;

              switch (triggerType) {
                case 'chat_command':
                  config = { command: '!test', caseSensitive: false };
                  event = { type: 'chat_command', command: '!test' };
                  break;
                case 'chat_keyword':
                  config = { keywords: ['hello'], matchAll: false, caseSensitive: false };
                  event = { type: 'chat_keyword', message: 'hello world' };
                  break;
                case 'schedule':
                  config = { type: 'interval', interval: 5 };
                  event = { type: 'schedule' };
                  break;
                case 'event':
                  config = { eventType: 'follower' };
                  event = { type: 'event', eventType: 'follower' };
                  break;
                case 'manual':
                  config = { showInQuickActions: true };
                  event = { type: 'manual' };
                  break;
              }

              const macro = createTestMacro('test-1', triggerType, config);
              service.registerTrigger(macro);

              // checkTrigger should dispatch to the correct handler
              const matches = service.checkTrigger(event);
              
              // Manual triggers are not checked via checkTrigger
              if (triggerType === 'manual') {
                expect(matches.length).toBe(0);
              } else {
                expect(matches.length).toBe(1);
                expect(matches[0].trigger.type).toBe(triggerType);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });

  describe('Property 9: Cooldown Enforcement', () => {
    /**
     * Feature: macro-system, Property 9: Cooldown Enforcement
     * 
     * For any macro with a cooldown configured, triggering the macro within
     * the cooldown period SHALL NOT execute the macro.
     * 
     * **Validates: Requirements 2.7**
     */

    it('should enforce cooldown and prevent execution within cooldown period', () => {
      fc.assert(
        fc.property(
          commandArb,
          fc.integer({ min: 1, max: 10 }), // cooldown in seconds
          (command, cooldown) => {
            // Reset service for each property run
            service.dispose();
            service = new TriggerService();
            
            const config: ChatCommandTrigger = {
              command: `!${command}`,
              caseSensitive: false
            };
            
            const macro = createTestMacro('test-1', 'chat_command', config, { cooldown });
            service.registerTrigger(macro);

            // First trigger should match
            const firstMatch = service.checkChatCommand(`!${command}`);
            expect(firstMatch.length).toBe(1);

            // Record execution
            service.recordExecution('test-1');

            // Immediate second trigger should not match (on cooldown)
            const secondMatch = service.checkChatCommand(`!${command}`);
            expect(secondMatch.length).toBe(0);

            // Should be on cooldown
            expect(service.isOnCooldown('test-1')).toBe(true);
            expect(service.getRemainingCooldown('test-1')).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow execution after cooldown expires', () => {
      fc.assert(
        fc.property(
          commandArb,
          (command) => {
            service = resetService(service);
            
            const config: ChatCommandTrigger = {
              command: `!${command}`,
              caseSensitive: false
            };
            
            // Use 0 cooldown for instant expiry
            const macro = createTestMacro('test-1', 'chat_command', config, { cooldown: 0 });
            service.registerTrigger(macro);

            // First trigger
            service.recordExecution('test-1');

            // With 0 cooldown, should not be on cooldown
            expect(service.isOnCooldown('test-1')).toBe(false);

            // Should match again
            const match = service.checkChatCommand(`!${command}`);
            expect(match.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track cooldowns independently per macro', () => {
      fc.assert(
        fc.property(
          commandArb,
          commandArb,
          fc.integer({ min: 1, max: 10 }),
          (command1, command2, cooldown) => {
            service = resetService(service);
            
            fc.pre(command1.toLowerCase() !== command2.toLowerCase());

            const config1: ChatCommandTrigger = {
              command: `!${command1}`,
              caseSensitive: false
            };
            const config2: ChatCommandTrigger = {
              command: `!${command2}`,
              caseSensitive: false
            };
            
            const macro1 = createTestMacro('macro-1', 'chat_command', config1, { cooldown });
            const macro2 = createTestMacro('macro-2', 'chat_command', config2, { cooldown });
            
            service.registerTrigger(macro1);
            service.registerTrigger(macro2);

            // Execute macro1
            service.recordExecution('macro-1');

            // macro1 should be on cooldown
            expect(service.isOnCooldown('macro-1')).toBe(true);
            
            // macro2 should NOT be on cooldown
            expect(service.isOnCooldown('macro-2')).toBe(false);

            // macro2 should still match
            const match2 = service.checkChatCommand(`!${command2}`);
            expect(match2.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all cooldowns when requested', () => {
      fc.assert(
        fc.property(
          fc.array(commandArb, { minLength: 1, maxLength: 5 }),
          (commands) => {
            service = resetService(service);
            
            // Register multiple macros with cooldowns
            const uniqueCommands = [...new Set(commands.map(c => c.toLowerCase()))];
            
            uniqueCommands.forEach((cmd, i) => {
              const config: ChatCommandTrigger = {
                command: `!${cmd}`,
                caseSensitive: false
              };
              const macro = createTestMacro(`macro-${i}`, 'chat_command', config, { cooldown: 60 });
              service.registerTrigger(macro);
              service.recordExecution(`macro-${i}`);
            });

            // All should be on cooldown
            uniqueCommands.forEach((_, i) => {
              expect(service.isOnCooldown(`macro-${i}`)).toBe(true);
            });

            // Clear all cooldowns
            service.clearCooldowns();

            // None should be on cooldown
            uniqueCommands.forEach((_, i) => {
              expect(service.isOnCooldown(`macro-${i}`)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Registration and Unregistration', () => {
    it('should register and unregister macros correctly', () => {
      fc.assert(
        fc.property(
          anyMacroArb,
          (macro) => {
            service = resetService(service);
            
            // Register
            service.registerTrigger(macro);
            expect(service.getRegisteredMacros().length).toBe(1);
            expect(service.getRegisteredMacros()[0].id).toBe(macro.id);

            // Unregister
            service.unregisterTrigger(macro.id);
            expect(service.getRegisteredMacros().length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should replace existing registration when re-registering', () => {
      fc.assert(
        fc.property(
          macroIdArb,
          commandArb,
          commandArb,
          (macroId, command1, command2) => {
            service = resetService(service);
            
            const config1: ChatCommandTrigger = {
              command: `!${command1}`,
              caseSensitive: false
            };
            const config2: ChatCommandTrigger = {
              command: `!${command2}`,
              caseSensitive: false
            };
            
            const macro1 = createTestMacro(macroId, 'chat_command', config1);
            const macro2 = createTestMacro(macroId, 'chat_command', config2);

            service.registerTrigger(macro1);
            service.registerTrigger(macro2);

            // Should only have one registration
            expect(service.getRegisteredMacros().length).toBe(1);
            
            // Should use the new config
            const registered = service.getRegisteredMacros()[0];
            const registeredConfig = registered.trigger.config as ChatCommandTrigger;
            expect(registeredConfig.command).toBe(`!${command2}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Disabled Macros', () => {
    it('should not match disabled macros', () => {
      fc.assert(
        fc.property(
          commandArb,
          (command) => {
            service = resetService(service);
            
            const config: ChatCommandTrigger = {
              command: `!${command}`,
              caseSensitive: false
            };
            
            const macro = createTestMacro('test-1', 'chat_command', config, { enabled: false });
            service.registerTrigger(macro);

            const noMatch = service.checkChatCommand(`!${command}`);
            expect(noMatch.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Role Requirements', () => {
    it('should enforce role requirements for chat commands', () => {
      fc.assert(
        fc.property(
          commandArb,
          userRoleArb,
          executionUserArb,
          (command, requiredRole, user) => {
            service = resetService(service);
            
            const config: ChatCommandTrigger = {
              command: `!${command}`,
              caseSensitive: false,
              requiredRole
            };
            
            const macro = createTestMacro('test-1', 'chat_command', config);
            service.registerTrigger(macro);

            const matches = service.checkChatCommand(`!${command}`, user);

            // Role hierarchy: broadcaster > moderator > subscriber > viewer
            const roleHierarchy: Record<UserRole, number> = {
              'viewer': 0,
              'subscriber': 1,
              'moderator': 2,
              'broadcaster': 3
            };

            const userLevel = roleHierarchy[user.role];
            const requiredLevel = roleHierarchy[requiredRole];

            if (userLevel >= requiredLevel) {
              expect(matches.length).toBe(1);
            } else {
              expect(matches.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
