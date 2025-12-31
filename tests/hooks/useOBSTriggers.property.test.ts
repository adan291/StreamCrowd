/**
 * Property-based tests for OBS Event Emission
 * 
 * Uses fast-check for property-based testing to validate that prediction
 * and redemption events properly trigger OBS automations.
 * 
 * Feature: twitch-tools-implementation, Property 10: OBS Event Emission
 * **Validates: Requirements 7.1, 7.2**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { OBSService, type SceneAutomation, type AutomationTrigger } from '../../src/application/services/OBSService';
import { MockOBSController } from '../mocks/MockOBSController';

// ============ ARBITRARIES ============

/** Prediction-related trigger types */
const predictionTriggerArb: fc.Arbitrary<'prediction_start' | 'prediction_lock' | 'prediction_resolve'> = fc.constantFrom(
  'prediction_start',
  'prediction_lock',
  'prediction_resolve'
);

/** Redemption trigger type */
const redemptionTriggerArb: fc.Arbitrary<'reward_redeemed'> = fc.constant('reward_redeemed');

/** All new Twitch-related triggers */
const twitchTriggerArb: fc.Arbitrary<AutomationTrigger> = fc.constantFrom(
  'prediction_start',
  'prediction_lock',
  'prediction_resolve',
  'reward_redeemed'
);

const sceneNameArb = fc.constantFrom('Main', 'Game', 'BRB', 'Starting', 'Ending');

const transitionArb = fc.constantFrom('Cut', 'Fade', 'Slide', 'Stinger');

const automationNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/** Generate automation for a specific trigger */
const automationForTriggerArb = (trigger: AutomationTrigger): fc.Arbitrary<Omit<SceneAutomation, 'id'>> => 
  fc.record({
    name: automationNameArb,
    trigger: fc.constant(trigger),
    sceneName: sceneNameArb,
    transition: fc.option(transitionArb, { nil: undefined }),
    delay: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
    enabled: fc.constant(true),
    sourcesToShow: fc.option(fc.array(fc.constantFrom('Webcam', 'Chat', 'Alerts'), { maxLength: 2 }), { nil: undefined }),
    sourcesToHide: fc.option(fc.array(fc.constantFrom('Webcam', 'Chat', 'Alerts'), { maxLength: 2 }), { nil: undefined }),
  });

// ============ TESTS ============

describe('OBS Event Emission Property Tests', () => {
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

  describe('Property 10: OBS Event Emission', () => {
    /**
     * Feature: twitch-tools-implementation, Property 10: OBS Event Emission
     * 
     * For any prediction state change or reward redemption, the system 
     * SHALL emit the corresponding OBS trigger event.
     * 
     * **Validates: Requirements 7.1, 7.2**
     */

    it('should execute prediction_start automation when trigger is fired', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationForTriggerArb('prediction_start'),
          async (automationData) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation for prediction_start
              service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger('prediction_start');
              
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

    it('should execute prediction_lock automation when trigger is fired', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationForTriggerArb('prediction_lock'),
          async (automationData) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation for prediction_lock
              service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger('prediction_lock');
              
              // Should succeed for enabled automation
              expect(result).toBe(true);
              
              // Scene should have been changed
              const currentScene = await service.getCurrentScene();
              expect(currentScene).toBe(automationData.sceneName);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute prediction_resolve automation when trigger is fired', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationForTriggerArb('prediction_resolve'),
          async (automationData) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation for prediction_resolve
              service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger('prediction_resolve');
              
              // Should succeed for enabled automation
              expect(result).toBe(true);
              
              // Scene should have been changed
              const currentScene = await service.getCurrentScene();
              expect(currentScene).toBe(automationData.sceneName);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute reward_redeemed automation when trigger is fired', async () => {
      await fc.assert(
        fc.asyncProperty(
          automationForTriggerArb('reward_redeemed'),
          async (automationData) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation for reward_redeemed
              service.addAutomation(automationData);
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger('reward_redeemed');
              
              // Should succeed for enabled automation
              expect(result).toBe(true);
              
              // Scene should have been changed
              const currentScene = await service.getCurrentScene();
              expect(currentScene).toBe(automationData.sceneName);
            } finally {
              service.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not execute Twitch triggers when automation is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          twitchTriggerArb,
          sceneNameArb,
          async (trigger, sceneName) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              const initialScene = await service.getCurrentScene();
              
              // Add disabled automation
              service.addAutomation({
                name: 'Disabled Automation',
                trigger,
                sceneName,
                enabled: false,
              });
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger(trigger);
              
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

    it('should not execute Twitch triggers when not connected to OBS', async () => {
      await fc.assert(
        fc.asyncProperty(
          twitchTriggerArb,
          sceneNameArb,
          async (trigger, sceneName) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              // Add automation without connecting
              service.addAutomation({
                name: 'Test Automation',
                trigger,
                sceneName,
                enabled: true,
              });
              
              // Execute the trigger while disconnected
              const result = await service.executeTrigger(trigger);
              
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

    it('should set transition when specified in Twitch automation', async () => {
      await fc.assert(
        fc.asyncProperty(
          twitchTriggerArb,
          sceneNameArb,
          transitionArb,
          async (trigger, sceneName, transition) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation with transition
              service.addAutomation({
                name: 'Automation with Transition',
                trigger,
                sceneName,
                transition,
                enabled: true,
              });
              mockController.resetCallHistory();
              
              // Execute the trigger
              await service.executeTrigger(trigger);
              
              // Verify transition was set
              const transitionCall = mockController.callHistory.find(c => c.method === 'setTransition');
              expect(transitionCall).toBeDefined();
              expect(transitionCall?.args[0]).toBe(transition);
              
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

    it('should handle multiple Twitch automations with same trigger (first match wins)', async () => {
      await fc.assert(
        fc.asyncProperty(
          twitchTriggerArb,
          fc.array(sceneNameArb, { minLength: 2, maxLength: 4 }),
          async (trigger, sceneNames) => {
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

    it('should handle source visibility changes in Twitch automations', async () => {
      await fc.assert(
        fc.asyncProperty(
          twitchTriggerArb,
          fc.constantFrom('Webcam', 'Chat', 'Alerts'),
          async (trigger, sourceName) => {
            localStorage.clear();
            
            const mockController = new MockOBSController();
            const service = new OBSService(mockController);
            
            try {
              await service.connect();
              
              // Add automation with source visibility changes
              service.addAutomation({
                name: 'Automation with Sources',
                trigger,
                sceneName: 'Main',
                sourcesToShow: [sourceName],
                enabled: true,
              });
              mockController.resetCallHistory();
              
              // Execute the trigger
              const result = await service.executeTrigger(trigger);
              
              expect(result).toBe(true);
              
              // Verify source visibility was set
              const sourceCall = mockController.callHistory.find(
                c => c.method === 'setSourceVisible' && c.args[1] === sourceName
              );
              expect(sourceCall).toBeDefined();
              expect(sourceCall?.args[2]).toBe(true); // visible = true
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
