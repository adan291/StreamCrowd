/**
 * Property-based tests for OBSService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the OBS integration system.
 * 
 * @requirements 2.5, 2.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { OBSService, type SceneAutomation, type AutomationTrigger } from '../../src/application/services/OBSService';
import { MockOBSController } from '../mocks/MockOBSController';

// ============ ARBITRARIES ============

const automationTriggerArb: fc.Arbitrary<AutomationTrigger> = fc.constantFrom(
  'game_start',
  'game_end',
  'poll_start',
  'poll_end',
  'poll_results',
  'giveaway_start',
  'giveaway_winner',
  'raid_incoming',
  'raid_outgoing',
  'brb_start',
  'brb_end',
  'stream_start',
  'stream_end',
  'prediction_start',
  'prediction_lock',
  'prediction_resolve',
  'reward_redeemed'
);

const sceneNameArb = fc.constantFrom('Main', 'Game', 'BRB', 'Starting', 'Ending');

const transitionArb = fc.constantFrom('Cut', 'Fade', 'Slide', 'Stinger');

const automationNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const automationArb: fc.Arbitrary<Omit<SceneAutomation, 'id'>> = fc.record({
  name: automationNameArb,
  trigger: automationTriggerArb,
  sceneName: sceneNameArb,
  transition: fc.option(transitionArb, { nil: undefined }),
  // Small delays: 100 runs x up to 100ms real sleeps exceeded the 5s test
  // timeout when the full suite ran in parallel (intermittent failure).
  delay: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
  enabled: fc.boolean(),
  sourcesToShow: fc.option(fc.array(fc.constantFrom('Webcam', 'Chat', 'Alerts'), { maxLength: 2 }), { nil: undefined }),
  sourcesToHide: fc.option(fc.array(fc.constantFrom('Webcam', 'Chat', 'Alerts'), { maxLength: 2 }), { nil: undefined }),
});

// Connection action type
type ConnectionAction = 'connect' | 'disconnect';

const connectionActionArb: fc.Arbitrary<ConnectionAction> = fc.constantFrom('connect', 'disconnect');

// ============ TESTS ============

describe('OBSService Property Tests', () => {
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

  describe('Property 6: OBS Connection State Consistency', () => {
    /**
     * Feature: pending-features, Property 6: OBS Connection State Consistency
     * 
     * For any sequence of connect/disconnect calls, the connection state 
     * SHALL accurately reflect the actual connection status.
     * 
     * **Validates: Requirements 2.7**
     */
    it('should maintain consistent connection state through any sequence of connect/disconnect', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(connectionActionArb, { minLength: 1, maxLength: 10 }),
          async (actions) => {
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              // Initial state should be disconnected
              expect(service.getConnectionStatus()).toBe('disconnected');
              expect(service.isConnected()).toBe(false);
              
              let expectedConnected = false;
              
              for (const action of actions) {
                if (action === 'connect') {
                  await service.connect();
                  expectedConnected = true;
                } else {
                  await service.disconnect();
                  expectedConnected = false;
                }
                
                // State should always match expected
                expect(service.isConnected()).toBe(expectedConnected);
                
                if (expectedConnected) {
                  expect(service.getConnectionStatus()).toBe('connected');
                } else {
                  expect(service.getConnectionStatus()).toBe('disconnected');
                }
              }
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should report error state when connection fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (errorMessage) => {
            const mockController = new MockOBSController({ 
              shouldFailConnection: true,
              connectionErrorMessage: errorMessage 
            });
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
            } catch {
              // Expected to throw
            }
            
            expect(service.getConnectionStatus()).toBe('error');
            expect(service.isConnected()).toBe(false);
            
            service.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow reconnection after disconnect', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (cycles) => {
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              for (let i = 0; i < cycles; i++) {
                await service.connect();
                expect(service.isConnected()).toBe(true);
                
                await service.disconnect();
                expect(service.isConnected()).toBe(false);
              }
              
              // Final connect should work
              await service.connect();
              expect(service.isConnected()).toBe(true);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Automation Trigger Execution', () => {
    /**
     * Feature: pending-features, Property 7: Automation Trigger Execution
     * 
     * For any enabled automation with matching trigger, executeTrigger 
     * SHALL execute the automation actions.
     * 
     * **Validates: Requirements 2.5**
     */
    it('should execute enabled automation when trigger matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationArb.filter(a => a.enabled),
          async (automationData) => {
            // Clear localStorage at the start of each iteration to prevent interference
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add the automation
              const automation = service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger(automation.trigger);
              
              // Should succeed for enabled automation
              expect(result).toBe(true);
              
              // Scene should have been changed
              const currentScene = await service.getCurrentScene();
              expect(currentScene).toBe(automationData.sceneName);
              
              // Verify setScene was called
              const sceneCall = mockController.callHistory.find(c => c.method === 'setScene');
              expect(sceneCall).toBeDefined();
              expect(sceneCall?.args[0]).toBe(automationData.sceneName);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not execute disabled automation', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationArb.map(a => ({ ...a, enabled: false })),
          async (automationData) => {
            // Clear localStorage at the start of each iteration
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              const initialScene = await service.getCurrentScene();
              
              // Add disabled automation
              const automation = service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger(automation.trigger);
              
              // Should fail for disabled automation
              expect(result).toBe(false);
              
              // Scene should NOT have changed
              const currentScene = await service.getCurrentScene();
              expect(currentScene).toBe(initialScene);
              
              // setScene should NOT have been called
              const sceneCall = mockController.callHistory.find(c => c.method === 'setScene');
              expect(sceneCall).toBeUndefined();
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set transition when specified in automation', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationArb
            .filter(a => a.enabled && a.transition !== undefined)
            .map(a => ({ ...a, transition: a.transition! })),
          async (automationData) => {
            // Clear localStorage at the start of each iteration
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation with transition
              const automation = service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              await service.executeTrigger(automation.trigger);
              
              // Verify transition was set
              const transitionCall = mockController.callHistory.find(c => c.method === 'setTransition');
              expect(transitionCall).toBeDefined();
              expect(transitionCall?.args[0]).toBe(automationData.transition);
              
              // Transition should be set BEFORE scene change
              const transitionIndex = mockController.callHistory.findIndex(c => c.method === 'setTransition');
              const sceneIndex = mockController.callHistory.findIndex(c => c.method === 'setScene');
              expect(transitionIndex).toBeLessThan(sceneIndex);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not execute when not connected', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationArb.filter(a => a.enabled),
          async (automationData) => {
            // Clear localStorage at the start of each iteration
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              // Add automation without connecting
              service.addAutomation(automationData);
              
              // Execute the trigger while disconnected
              const result = await service.executeTrigger(automationData.trigger);
              
              // Should fail when not connected
              expect(result).toBe(false);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only execute first matching enabled automation', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationTriggerArb,
          fc.array(sceneNameArb, { minLength: 2, maxLength: 4 }),
          async (trigger, sceneNames) => {
            // Clear localStorage at the start of each iteration
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add multiple automations with same trigger
              const automations = sceneNames.map((sceneName, i) => 
                service.addAutomation({
                  name: `Auto ${i}`,
                  trigger,
                  sceneName,
                  enabled: true,
                })
              );
              
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger(trigger);
              
              expect(result).toBe(true);
              
              // Only one setScene call should have been made
              const sceneCalls = mockController.callHistory.filter(c => c.method === 'setScene');
              expect(sceneCalls.length).toBe(1);
              
              // Should be the first automation's scene
              expect(sceneCalls[0].args[0]).toBe(automations[0].sceneName);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
