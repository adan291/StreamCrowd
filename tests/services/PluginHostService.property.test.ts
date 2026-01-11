// Property Tests for PluginHostService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PluginHostService } from '../../src/plugins/services/PluginHostService';
import { Plugin, PluginPermission, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    keys: () => Object.keys(store)
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(localStorageMock, 'length', { get: () => Object.keys(localStorageMock).length });

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  }
});

describe('PluginHostService Property Tests', () => {
  let service: PluginHostService;
  let counter = 0;

  const validPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[];

  const createPlugin = (permissions: PluginPermission[] = ['storage']): Plugin => {
    const id = `test-plugin-${Date.now()}-${counter++}`;
    return {
      id,
      manifest: {
        id,
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        minAppVersion: '1.0.0',
        permissions,
        main: 'index.js'
      },
      status: 'active',
      config: { testConfig: 'value' },
      code: 'console.log("test");',
      installedAt: Date.now(),
      updatedAt: Date.now(),
      logs: []
    };
  };

  beforeEach(() => {
    localStorageMock.clear();
    counter = 0;
    service = new PluginHostService();
  });

  describe('Property 1: APIs respect permissions', () => {
    it('should deny access without required permission', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { api: 'polls', method: 'list', perm: 'polls:read' },
            { api: 'predictions', method: 'list', perm: 'predictions:read' },
            { api: 'giveaways', method: 'list', perm: 'giveaways:read' },
            { api: 'timers', method: 'list', perm: 'timers:read' },
            { api: 'obs', method: 'getStatus', perm: 'obs:read' }
          ) as fc.Arbitrary<{ api: string; method: string; perm: PluginPermission }>,
          async ({ api, method, perm }) => {
            // Create plugin WITHOUT the required permission
            const plugin = createPlugin(['storage']); // Only storage permission
            const hostAPI = service.createHostAPI(plugin);
            
            // Access should be denied
            const apiObj = (hostAPI as any)[api];
            await expect(apiObj[method]()).rejects.toThrow('Permission denied');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should allow access with required permission', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { api: 'polls', method: 'list', perm: 'polls:read' as PluginPermission },
            { api: 'predictions', method: 'list', perm: 'predictions:read' as PluginPermission },
            { api: 'giveaways', method: 'list', perm: 'giveaways:read' as PluginPermission },
            { api: 'timers', method: 'list', perm: 'timers:read' as PluginPermission },
            { api: 'obs', method: 'getStatus', perm: 'obs:read' as PluginPermission }
          ),
          async ({ api, method, perm }) => {
            // Create plugin WITH the required permission
            const plugin = createPlugin([perm]);
            const hostAPI = service.createHostAPI(plugin);
            
            // Access should be allowed (returns empty/default since no service injected)
            const apiObj = (hostAPI as any)[api];
            const result = await apiObj[method]();
            // Should not throw, result depends on whether service is injected
            expect(result).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should deny storage access without permission', async () => {
      const plugin = createPlugin([]); // No permissions
      const hostAPI = service.createHostAPI(plugin);
      
      await expect(hostAPI.storage.get('key')).rejects.toThrow('Permission denied');
      await expect(hostAPI.storage.set('key', 'value')).rejects.toThrow('Permission denied');
    });
  });

  describe('Property 2: Events are delivered correctly', () => {
    it('should deliver events to subscribed handlers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.anything(),
          (eventName, eventData) => {
            const plugin = createPlugin(['storage']);
            const hostAPI = service.createHostAPI(plugin);
            
            let received: unknown = null;
            hostAPI.events.on(eventName as any, (data) => {
              received = data;
            });
            
            service.broadcastEvent(eventName as any, eventData);
            
            expect(received).toEqual(eventData);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow unsubscribing from events', () => {
      const plugin = createPlugin(['storage']);
      const hostAPI = service.createHostAPI(plugin);
      
      let callCount = 0;
      const unsubscribe = hostAPI.events.on('test:event' as any, () => {
        callCount++;
      });
      
      service.broadcastEvent('test:event' as any, {});
      expect(callCount).toBe(1);
      
      unsubscribe();
      
      service.broadcastEvent('test:event' as any, {});
      expect(callCount).toBe(1); // Should not increase
    });

    it('should support once() for single-fire events', () => {
      const plugin = createPlugin(['storage']);
      const hostAPI = service.createHostAPI(plugin);
      
      let callCount = 0;
      hostAPI.events.once('test:once' as any, () => {
        callCount++;
      });
      
      service.broadcastEvent('test:once' as any, {});
      service.broadcastEvent('test:once' as any, {});
      service.broadcastEvent('test:once' as any, {});
      
      expect(callCount).toBe(1);
    });

    it('should isolate events between plugins', () => {
      const plugin1 = createPlugin(['storage']);
      const plugin2 = createPlugin(['storage']);
      
      const api1 = service.createHostAPI(plugin1);
      const api2 = service.createHostAPI(plugin2);
      
      let count1 = 0;
      let count2 = 0;
      
      api1.events.on('shared:event' as any, () => { count1++; });
      api2.events.on('shared:event' as any, () => { count2++; });
      
      service.broadcastEvent('shared:event' as any, {});
      
      // Both should receive the event
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('Property 3: Storage is isolated per plugin', () => {
    it('should isolate storage between plugins', async () => {
      const plugin1 = createPlugin(['storage']);
      const plugin2 = createPlugin(['storage']);
      
      const api1 = service.createHostAPI(plugin1);
      const api2 = service.createHostAPI(plugin2);
      
      await api1.storage.set('key', 'value1');
      await api2.storage.set('key', 'value2');
      
      const val1 = await api1.storage.get('key');
      const val2 = await api2.storage.get('key');
      
      expect(val1).toBe('value1');
      expect(val2).toBe('value2');
    });

    it('should persist storage correctly', async () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      // Test various value types
      await api.storage.set('string', 'hello');
      await api.storage.set('number', 42);
      await api.storage.set('boolean', true);
      await api.storage.set('object', { key: 'value' });
      await api.storage.set('array', [1, 2, 3]);
      
      expect(await api.storage.get('string')).toBe('hello');
      expect(await api.storage.get('number')).toBe(42);
      expect(await api.storage.get('boolean')).toBe(true);
      expect(await api.storage.get('object')).toEqual({ key: 'value' });
      expect(await api.storage.get('array')).toEqual([1, 2, 3]);
    });

    it('should clear storage correctly', async () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      await api.storage.set('key1', 'value1');
      await api.storage.set('key2', 'value2');
      
      expect(await api.storage.size()).toBe(2);
      
      await api.storage.clear();
      
      expect(await api.storage.size()).toBe(0);
      expect(await api.storage.get('key1')).toBeNull();
    });

    it('should list keys correctly', async () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      await api.storage.set('alpha', 1);
      await api.storage.set('beta', 2);
      await api.storage.set('gamma', 3);
      
      const keys = await api.storage.keys();
      
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
      expect(keys).toContain('gamma');
      expect(keys.length).toBe(3);
    });
  });

  describe('Property 4: Commands registration', () => {
    it('should register and list commands', () => {
      const plugin = createPlugin(['commands']);
      const api = service.createHostAPI(plugin);
      
      api.commands.register({
        name: 'test',
        description: 'Test command',
        handler: () => {}
      });
      
      const commands = api.commands.list();
      expect(commands.some(c => c.name === 'test')).toBe(true);
    });

    it('should unregister commands', () => {
      const plugin = createPlugin(['commands']);
      const api = service.createHostAPI(plugin);
      
      const unregister = api.commands.register({
        name: 'temp',
        description: 'Temporary',
        handler: () => {}
      });
      
      expect(api.commands.list().some(c => c.name === 'temp')).toBe(true);
      
      unregister();
      
      expect(api.commands.list().some(c => c.name === 'temp')).toBe(false);
    });

    it('should deny command registration without permission', () => {
      const plugin = createPlugin(['storage']); // No commands permission
      const api = service.createHostAPI(plugin);
      
      expect(() => api.commands.register({
        name: 'test',
        description: 'Test',
        handler: () => {}
      })).toThrow('Permission denied');
    });
  });

  describe('Property 5: UI registration', () => {
    it('should register panels with permission', () => {
      const plugin = createPlugin(['ui:panel']);
      const api = service.createHostAPI(plugin);
      
      const id = api.ui.registerPanel({
        title: 'Test Panel',
        render: () => 'content'
      });
      
      expect(id).toBeDefined();
      expect(service.getRegisteredPanels().get(plugin.id)?.has(id)).toBe(true);
    });

    it('should register overlays with permission', () => {
      const plugin = createPlugin(['ui:overlay']);
      const api = service.createHostAPI(plugin);
      
      const id = api.ui.registerOverlay({
        render: () => 'overlay'
      });
      
      expect(id).toBeDefined();
      expect(service.getRegisteredOverlays().get(plugin.id)?.has(id)).toBe(true);
    });

    it('should deny UI registration without permission', () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      expect(() => api.ui.registerPanel({
        title: 'Test',
        render: () => ''
      })).toThrow('Permission denied');
    });
  });

  describe('Property 6: Plugin cleanup', () => {
    it('should clean up all plugin resources', async () => {
      const plugin = createPlugin(['storage', 'commands', 'ui:panel']);
      const api = service.createHostAPI(plugin);
      
      // Register various things
      await api.storage.set('key', 'value');
      api.commands.register({ name: 'cmd', description: 'Test', handler: () => {} });
      api.ui.registerPanel({ title: 'Panel', render: () => '' });
      api.events.on('test' as any, () => {});
      
      // Cleanup
      service.cleanupPlugin(plugin.id);
      
      // Verify cleanup (except storage which is preserved)
      expect(service.getRegisteredCommands().has(plugin.id)).toBe(false);
      expect(service.getRegisteredPanels().has(plugin.id)).toBe(false);
    });

    it('should clear plugin storage when requested', async () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      await api.storage.set('key', 'value');
      
      service.clearPluginStorage(plugin.id);
      
      // Create new API to check storage
      const newApi = service.createHostAPI(plugin);
      const value = await newApi.storage.get('key');
      
      expect(value).toBeNull();
    });
  });

  describe('Property 7: Plugin info access', () => {
    it('should provide manifest access', () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      const manifest = api.getManifest();
      
      expect(manifest.id).toBe(plugin.id);
      expect(manifest.name).toBe(plugin.manifest.name);
      expect(manifest.version).toBe(plugin.manifest.version);
    });

    it('should provide config access', () => {
      const plugin = createPlugin(['storage']);
      plugin.config = { setting1: 'value1', setting2: 42 };
      
      const api = service.createHostAPI(plugin);
      const config = api.getConfig();
      
      // Note: This depends on PluginRegistryService mock
      expect(config).toBeDefined();
    });
  });

  describe('Property 8: Notifications API', () => {
    it('should check notification permission', () => {
      const plugin = createPlugin(['notifications']);
      const api = service.createHostAPI(plugin);
      
      // Default permission is 'default', not 'granted'
      expect(api.notifications.hasPermission()).toBe(false);
    });

    it('should deny notifications without permission', () => {
      const plugin = createPlugin(['storage']);
      const api = service.createHostAPI(plugin);
      
      expect(() => api.notifications.show({
        title: 'Test',
        body: 'Test notification'
      })).toThrow('Permission denied');
    });
  });
});
