/**
 * Unit tests for OBSService
 * 
 * Tests connection, scenes, automations, and trigger execution
 * using MockOBSController for isolated testing.
 * 
 * @requirements 2.1, 2.5, 2.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OBSService, type SceneAutomation, type AutomationTrigger } from '../../src/application/services/OBSService';
import { MockOBSController } from '../mocks/MockOBSController';

describe('OBSService', () => {
  let service: OBSService;
  let mockController: MockOBSController;
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

    mockController = new MockOBSController();
    service = new OBSService(mockController);
  });

  afterEach(() => {
    service.dispose();
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('connection', () => {
    it('should connect with valid credentials', async () => {
      expect(service.getConnectionStatus()).toBe('disconnected');
      
      await service.connect('password', 'localhost', 4455);
      
      expect(service.getConnectionStatus()).toBe('connected');
      expect(service.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockController.setConnectionBehavior(true, 'Authentication failed');
      
      await expect(service.connect('wrong-password')).rejects.toThrow('Authentication failed');
      expect(service.getConnectionStatus()).toBe('error');
      expect(service.isConnected()).toBe(false);
    });

    it('should disconnect cleanly', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
      
      await service.disconnect();
      
      expect(service.getConnectionStatus()).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should save connection config on successful connect', async () => {
      await service.connect('mypassword', 'myhost', 4456);
      
      const config = service.getConnectionConfig();
      expect(config).not.toBeNull();
      expect(config?.host).toBe('myhost');
      expect(config?.port).toBe(4456);
    });

    it('should get OBS version when connected', async () => {
      await service.connect();
      
      const version = await service.getVersion();
      
      expect(version).not.toBeNull();
      expect(version?.obsVersion).toBe('30.0.0');
    });
  });

  describe('scenes', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should get scene list', async () => {
      const scenes = await service.getScenes();
      
      expect(scenes.length).toBeGreaterThan(0);
      expect(scenes[0].name).toBe('Main');
    });

    it('should get current scene', async () => {
      const currentScene = await service.getCurrentScene();
      
      expect(currentScene).toBe('Main');
    });

    it('should switch scenes', async () => {
      await service.switchScene('Game');
      
      const currentScene = await service.getCurrentScene();
      expect(currentScene).toBe('Game');
    });

    it('should throw error when switching to non-existent scene', async () => {
      await expect(service.switchScene('NonExistent')).rejects.toThrow('not found');
    });
  });

  describe('sources', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should get scene sources', async () => {
      const sources = await service.getSceneSources('Main');
      
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.name === 'Webcam')).toBe(true);
    });

    it('should set source visibility', async () => {
      await service.setSourceVisible('Main', 'Webcam', false);
      
      const sources = await service.getSceneSources('Main');
      const webcam = sources.find(s => s.name === 'Webcam');
      expect(webcam?.enabled).toBe(false);
    });

    it('should refresh browser source', async () => {
      await service.refreshBrowserSource('Chat');
      
      expect(mockController.callHistory.some(c => 
        c.method === 'refreshBrowserSource' && c.args[0] === 'Chat'
      )).toBe(true);
    });
  });

  describe('streaming', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should get stream status', async () => {
      const status = await service.getStreamStatus();
      
      expect(status.isStreaming).toBe(false);
      expect(status.isRecording).toBe(false);
    });

    it('should start and stop stream', async () => {
      await service.startStream();
      let status = await service.getStreamStatus();
      expect(status.isStreaming).toBe(true);
      
      await service.stopStream();
      status = await service.getStreamStatus();
      expect(status.isStreaming).toBe(false);
    });

    it('should toggle stream', async () => {
      await service.toggleStream();
      let status = await service.getStreamStatus();
      expect(status.isStreaming).toBe(true);
      
      await service.toggleStream();
      status = await service.getStreamStatus();
      expect(status.isStreaming).toBe(false);
    });

    it('should start and stop recording', async () => {
      await service.startRecording();
      let status = await service.getStreamStatus();
      expect(status.isRecording).toBe(true);
      
      await service.stopRecording();
      status = await service.getStreamStatus();
      expect(status.isRecording).toBe(false);
    });

    it('should toggle recording', async () => {
      await service.toggleRecording();
      let status = await service.getStreamStatus();
      expect(status.isRecording).toBe(true);
      
      await service.toggleRecording();
      status = await service.getStreamStatus();
      expect(status.isRecording).toBe(false);
    });
  });

  describe('transitions', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should get available transitions', async () => {
      const transitions = await service.getTransitions();
      
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions).toContain('Fade');
    });

    it('should set transition', async () => {
      await service.setTransition('Fade');
      
      expect(mockController.callHistory.some(c => 
        c.method === 'setTransition' && c.args[0] === 'Fade'
      )).toBe(true);
    });
  });

  describe('automations CRUD', () => {
    it('should add automation', () => {
      const automation = service.addAutomation({
        name: 'Game Start',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      });
      
      expect(automation.id).toBeDefined();
      expect(automation.name).toBe('Game Start');
      expect(automation.trigger).toBe('game_start');
    });

    it('should get all automations', () => {
      service.addAutomation({ name: 'Auto 1', trigger: 'game_start', sceneName: 'Game', enabled: true });
      service.addAutomation({ name: 'Auto 2', trigger: 'game_end', sceneName: 'Main', enabled: true });
      
      const automations = service.getAutomations();
      
      expect(automations.length).toBe(2);
    });

    it('should get automation by id', () => {
      const added = service.addAutomation({ name: 'Test', trigger: 'poll_start', sceneName: 'Main', enabled: true });
      
      const found = service.getAutomation(added.id);
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test');
    });

    it('should get automation by trigger', () => {
      service.addAutomation({ name: 'BRB Auto', trigger: 'brb_start', sceneName: 'BRB', enabled: true });
      
      const found = service.getAutomationByTrigger('brb_start');
      
      expect(found).toBeDefined();
      expect(found?.sceneName).toBe('BRB');
    });

    it('should update automation', () => {
      const automation = service.addAutomation({ name: 'Original', trigger: 'game_start', sceneName: 'Game', enabled: true });
      
      const updated = service.updateAutomation(automation.id, { name: 'Updated', sceneName: 'Main' });
      
      expect(updated).toBe(true);
      const found = service.getAutomation(automation.id);
      expect(found?.name).toBe('Updated');
      expect(found?.sceneName).toBe('Main');
    });

    it('should remove automation', () => {
      const automation = service.addAutomation({ name: 'ToRemove', trigger: 'game_start', sceneName: 'Game', enabled: true });
      
      const removed = service.removeAutomation(automation.id);
      
      expect(removed).toBe(true);
      expect(service.getAutomation(automation.id)).toBeUndefined();
    });

    it('should toggle automation enabled state', () => {
      const automation = service.addAutomation({ name: 'Toggle', trigger: 'game_start', sceneName: 'Game', enabled: true });
      
      const newState = service.toggleAutomation(automation.id);
      
      expect(newState).toBe(false);
      expect(service.getAutomation(automation.id)?.enabled).toBe(false);
    });

    it('should return false when updating non-existent automation', () => {
      const result = service.updateAutomation('non-existent', { name: 'Test' });
      expect(result).toBe(false);
    });

    it('should return false when removing non-existent automation', () => {
      const result = service.removeAutomation('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('executeTrigger', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should execute automation when trigger matches', async () => {
      service.addAutomation({
        name: 'Game Start',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      });
      
      const result = await service.executeTrigger('game_start');
      
      expect(result).toBe(true);
      const currentScene = await service.getCurrentScene();
      expect(currentScene).toBe('Game');
    });

    it('should not execute disabled automation', async () => {
      service.addAutomation({
        name: 'Disabled Auto',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: false,
      });
      
      const result = await service.executeTrigger('game_start');
      
      expect(result).toBe(false);
      const currentScene = await service.getCurrentScene();
      expect(currentScene).toBe('Main'); // Should not have changed
    });

    it('should return false when no matching automation', async () => {
      const result = await service.executeTrigger('game_start');
      
      expect(result).toBe(false);
    });

    it('should return false when not connected', async () => {
      await service.disconnect();
      service.addAutomation({
        name: 'Test',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      });
      
      const result = await service.executeTrigger('game_start');
      
      expect(result).toBe(false);
    });

    it('should execute custom trigger with matching name', async () => {
      service.addAutomation({
        name: 'Custom Auto',
        trigger: 'custom',
        customTriggerName: 'my_custom_event',
        sceneName: 'Game',
        enabled: true,
      });
      
      const result = await service.executeTrigger('custom', 'my_custom_event');
      
      expect(result).toBe(true);
    });

    it('should not execute custom trigger with non-matching name', async () => {
      service.addAutomation({
        name: 'Custom Auto',
        trigger: 'custom',
        customTriggerName: 'my_custom_event',
        sceneName: 'Game',
        enabled: true,
      });
      
      const result = await service.executeTrigger('custom', 'different_event');
      
      expect(result).toBe(false);
    });

    it('should set transition before switching scene', async () => {
      service.addAutomation({
        name: 'With Transition',
        trigger: 'game_start',
        sceneName: 'Game',
        transition: 'Fade',
        enabled: true,
      });
      
      await service.executeTrigger('game_start');
      
      const transitionCall = mockController.callHistory.find(c => c.method === 'setTransition');
      const sceneCall = mockController.callHistory.find(c => c.method === 'setScene');
      
      expect(transitionCall).toBeDefined();
      expect(transitionCall?.args[0]).toBe('Fade');
      
      // Transition should be set before scene change
      const transitionIndex = mockController.callHistory.indexOf(transitionCall!);
      const sceneIndex = mockController.callHistory.indexOf(sceneCall!);
      expect(transitionIndex).toBeLessThan(sceneIndex);
    });

    it('should show and hide sources during automation', async () => {
      service.addAutomation({
        name: 'Source Control',
        trigger: 'game_start',
        sceneName: 'Main',
        sourcesToShow: ['Webcam'],
        sourcesToHide: ['Chat'],
        enabled: true,
      });
      
      // First hide Webcam and show Chat to test the automation
      await service.setSourceVisible('Main', 'Webcam', false);
      await service.setSourceVisible('Main', 'Chat', true);
      mockController.resetCallHistory();
      
      await service.executeTrigger('game_start');
      
      // Check that sources were toggled
      const showCalls = mockController.callHistory.filter(c => 
        c.method === 'setSourceVisible' && c.args[2] === true
      );
      const hideCalls = mockController.callHistory.filter(c => 
        c.method === 'setSourceVisible' && c.args[2] === false
      );
      
      expect(showCalls.some(c => c.args[1] === 'Webcam')).toBe(true);
      expect(hideCalls.some(c => c.args[1] === 'Chat')).toBe(true);
    });
  });

  describe('executeAutomation', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should execute automation directly', async () => {
      const automation: SceneAutomation = {
        id: 'test-auto',
        name: 'Direct Execute',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      };
      
      const result = await service.executeAutomation(automation);
      
      expect(result).toBe(true);
      const currentScene = await service.getCurrentScene();
      expect(currentScene).toBe('Game');
    });

    it('should return false when not connected', async () => {
      await service.disconnect();
      
      const automation: SceneAutomation = {
        id: 'test-auto',
        name: 'Test',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      };
      
      const result = await service.executeAutomation(automation);
      
      expect(result).toBe(false);
    });

    it('should respect delay in automation', async () => {
      const automation: SceneAutomation = {
        id: 'test-auto',
        name: 'Delayed',
        trigger: 'game_start',
        sceneName: 'Game',
        delay: 50,
        enabled: true,
      };
      
      const startTime = Date.now();
      await service.executeAutomation(automation);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });

  describe('callbacks', () => {
    it('should register and receive status change callbacks', async () => {
      const statuses: string[] = [];
      const unsubscribe = service.onStatusChange((status) => {
        statuses.push(status);
      });
      
      await service.connect();
      await service.disconnect();
      
      expect(statuses).toContain('connected');
      expect(statuses).toContain('disconnected');
      
      unsubscribe();
    });

    it('should register and receive scene change callbacks', async () => {
      await service.connect();
      
      const scenes: string[] = [];
      const unsubscribe = service.onSceneChange((scene) => {
        scenes.push(scene.name);
      });
      
      await service.switchScene('Game');
      await service.switchScene('BRB');
      
      expect(scenes).toContain('Game');
      expect(scenes).toContain('BRB');
      
      unsubscribe();
    });

    it('should register and receive stream status callbacks', async () => {
      await service.connect();
      
      const statuses: boolean[] = [];
      const unsubscribe = service.onStreamStatusChange((status) => {
        statuses.push(status.isStreaming);
      });
      
      await service.startStream();
      await service.stopStream();
      
      expect(statuses).toContain(true);
      expect(statuses).toContain(false);
      
      unsubscribe();
    });
  });

  describe('persistence', () => {
    it('should persist automations to localStorage', () => {
      service.addAutomation({
        name: 'Persisted',
        trigger: 'game_start',
        sceneName: 'Game',
        enabled: true,
      });
      
      // Create new service instance to simulate reload
      const newService = new OBSService(new MockOBSController());
      const automations = newService.getAutomations();
      
      expect(automations.length).toBe(1);
      expect(automations[0].name).toBe('Persisted');
      
      newService.dispose();
    });

    it('should persist connection config (without password)', async () => {
      await service.connect('secret', 'myhost', 4456);
      
      // Check localStorage directly
      const stored = localStorage.getItem('obs_connection_config');
      expect(stored).not.toBeNull();
      
      const config = JSON.parse(stored!);
      expect(config.host).toBe('myhost');
      expect(config.port).toBe(4456);
      expect(config.password).toBeUndefined(); // Password should not be stored
    });
  });
});
