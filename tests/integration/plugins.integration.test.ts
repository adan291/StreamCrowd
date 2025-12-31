// Integration Tests for Plugin System
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManagerService, resetPluginManagerService } from '../../src/plugins/services/PluginManagerService';
import { PluginRegistryService, resetPluginRegistryService } from '../../src/plugins/services/PluginRegistryService';
import { PluginLoaderService } from '../../src/plugins/services/PluginLoaderService';
import { PluginSandboxService, resetPluginSandboxService } from '../../src/plugins/services/PluginSandboxService';
import { PluginHostService, resetPluginHostService } from '../../src/plugins/services/PluginHostService';
import { PluginManifest } from '../../types/plugins';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock DOM
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'iframe') {
    return {
      id: '',
      style: { display: '' },
      sandbox: { add: vi.fn() },
      srcdoc: '',
      contentWindow: { postMessage: vi.fn() },
      parentNode: { removeChild: vi.fn() }
    } as unknown as HTMLIFrameElement;
  }
  return originalCreateElement(tag);
});

vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);

// Mock sandbox that immediately reports ready
class MockSandboxService extends PluginSandboxService {
  private readySandboxes = new Set<string>();

  createSandbox(plugin: any) {
    const result = super.createSandbox(plugin);
    this.readySandboxes.add(plugin.id);
    return result;
  }

  isSandboxReady(pluginId: string): boolean {
    return this.readySandboxes.has(pluginId);
  }

  getSandboxStatus(pluginId: string): 'ready' | 'creating' | 'error' | 'destroyed' | null {
    if (this.readySandboxes.has(pluginId)) return 'ready';
    return super.getSandboxStatus(pluginId);
  }

  destroySandbox(pluginId: string): boolean {
    this.readySandboxes.delete(pluginId);
    return super.destroySandbox(pluginId);
  }
}

describe('Plugin System Integration Tests', () => {
  let manager: PluginManagerService;
  let registry: PluginRegistryService;
  let loader: PluginLoaderService;
  let sandbox: MockSandboxService;
  let host: PluginHostService;

  const createTestManifest = (id: string, overrides: Partial<PluginManifest> = {}): PluginManifest => ({
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    description: 'Test plugin for integration tests',
    author: 'Test',
    minAppVersion: '1.0.0',
    permissions: ['storage'],
    main: 'index.js',
    ...overrides
  });

  const testPluginCode = `
    pluginAPI.log('info', 'Plugin initialized');
    pluginAPI.events.on('test:event', (data) => {
      pluginAPI.log('info', 'Received event', data);
    });
  `;

  beforeEach(() => {
    localStorageMock.clear();
    resetPluginManagerService();
    resetPluginRegistryService();
    resetPluginSandboxService();
    resetPluginHostService();

    registry = new PluginRegistryService();
    loader = new PluginLoaderService();
    sandbox = new MockSandboxService();
    host = new PluginHostService();
    manager = new PluginManagerService(loader, registry, sandbox, host);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('Test 22.1: Install, activate, use and uninstall plugin', () => {
    it('should complete full plugin lifecycle', async () => {
      const manifest = createTestManifest('lifecycle-test');

      // 1. Install
      const installResult = await manager.installFromJSON(
        JSON.stringify(manifest),
        testPluginCode
      );
      expect(installResult.success).toBe(true);
      expect(manager.getPlugin(manifest.id)).not.toBeNull();
      expect(manager.listPlugins().length).toBe(1);

      // 2. Activate
      const activateResult = await manager.activatePlugin(manifest.id);
      expect(activateResult).toBe(true);
      expect(manager.getPlugin(manifest.id)?.status).toBe('active');
      expect(manager.getActivePlugins().length).toBe(1);

      // 3. Use (set/get config)
      manager.setPluginConfig(manifest.id, { testKey: 'testValue' });
      const config = manager.getPluginConfig(manifest.id);
      expect(config.testKey).toBe('testValue');

      // 4. Deactivate
      const deactivateResult = await manager.deactivatePlugin(manifest.id);
      expect(deactivateResult).toBe(true);
      expect(manager.getPlugin(manifest.id)?.status).toBe('disabled');

      // 5. Uninstall
      const uninstallResult = await manager.uninstallPlugin(manifest.id);
      expect(uninstallResult).toBe(true);
      expect(manager.getPlugin(manifest.id)).toBeNull();
      expect(manager.listPlugins().length).toBe(0);
    });
  });

  describe('Test 22.2: Plugin with errors does not affect app', () => {
    it('should handle plugin errors gracefully', async () => {
      const manifest = createTestManifest('error-test');
      const errorCode = `throw new Error('Intentional error');`;

      // Install plugin with error code
      const installResult = await manager.installFromJSON(
        JSON.stringify(manifest),
        errorCode
      );
      expect(installResult.success).toBe(true);

      // Activate should not crash the app
      const activateResult = await manager.activatePlugin(manifest.id);
      // May succeed or fail depending on sandbox behavior, but should not throw
      expect(typeof activateResult).toBe('boolean');

      // Manager should still be functional
      expect(manager.listPlugins().length).toBe(1);

      // Can still install other plugins
      const manifest2 = createTestManifest('working-plugin');
      const installResult2 = await manager.installFromJSON(
        JSON.stringify(manifest2),
        testPluginCode
      );
      expect(installResult2.success).toBe(true);
    });

    it('should handle invalid manifest gracefully', async () => {
      const result = await manager.installFromJSON('invalid json', 'code');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Test 22.3: Permissions are respected', () => {
    it('should create host API with correct permissions', () => {
      const manifest = createTestManifest('permission-test', {
        permissions: ['polls:read', 'storage']
      });

      const plugin = {
        id: manifest.id,
        manifest,
        status: 'installed' as const,
        config: {},
        code: testPluginCode,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        logs: []
      };

      const api = host.createHostAPI(plugin);

      // Should have access to polls.list (polls:read)
      expect(api.polls.list).toBeDefined();

      // Should have access to storage
      expect(api.storage.get).toBeDefined();
      expect(api.storage.set).toBeDefined();

      // Should have events (always available)
      expect(api.events.on).toBeDefined();
    });

    it('should deny access to unpermitted APIs', async () => {
      const manifest = createTestManifest('no-permission-test', {
        permissions: ['storage'] // Only storage, no polls
      });

      const plugin = {
        id: manifest.id,
        manifest,
        status: 'installed' as const,
        config: {},
        code: testPluginCode,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        logs: []
      };

      const api = host.createHostAPI(plugin);

      // Calling polls.list should throw permission error
      await expect(api.polls.list()).rejects.toThrow('Permission denied');
    });
  });

  describe('Test 22.4: Events reach subscribed plugins', () => {
    it('should broadcast events to host', async () => {
      const manifest = createTestManifest('event-test');
      await manager.installFromJSON(JSON.stringify(manifest), testPluginCode);
      await manager.activatePlugin(manifest.id);

      const receivedEvents: Array<{ event: string; data: unknown }> = [];
      
      // Subscribe to events via host
      host.onEvent((event, data) => {
        receivedEvents.push({ event, data });
      });

      // Broadcast event
      manager.broadcastEvent('poll:created', { id: 'test-poll', title: 'Test' });

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].event).toBe('poll:created');
      expect(receivedEvents[0].data).toEqual({ id: 'test-poll', title: 'Test' });
    });

    it('should allow plugins to subscribe to events', () => {
      const manifest = createTestManifest('event-sub-test');
      const plugin = {
        id: manifest.id,
        manifest,
        status: 'active' as const,
        config: {},
        code: testPluginCode,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        logs: []
      };

      const api = host.createHostAPI(plugin);
      const receivedData: unknown[] = [];

      // Subscribe via plugin API
      api.events.on('poll:created', (data) => {
        receivedData.push(data);
      });

      // Broadcast event
      host.broadcastEvent('poll:created', { id: 'test' });

      expect(receivedData.length).toBe(1);
      expect(receivedData[0]).toEqual({ id: 'test' });
    });
  });

  describe('Test 22.5: Plugin UI renders', () => {
    it('should register and track panels', async () => {
      const manifest = createTestManifest('ui-test', {
        permissions: ['ui:panel']
      });

      const plugin = {
        id: manifest.id,
        manifest,
        status: 'active' as const,
        config: {},
        code: testPluginCode,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        logs: []
      };

      const api = host.createHostAPI(plugin);

      // Register panel
      const panelId = api.ui.registerPanel({
        id: 'test-panel',
        title: 'Test Panel',
        render: () => {}
      });

      expect(panelId).toBe('test-panel');

      // Check registered panels
      const panels = host.getRegisteredPanels();
      expect(panels.has(manifest.id)).toBe(true);
      expect(panels.get(manifest.id)?.has('test-panel')).toBe(true);

      // Unregister
      api.ui.unregisterPanel('test-panel');
      expect(panels.get(manifest.id)?.has('test-panel')).toBe(false);
    });

    it('should register and track overlays', async () => {
      const manifest = createTestManifest('overlay-test', {
        permissions: ['ui:overlay']
      });

      const plugin = {
        id: manifest.id,
        manifest,
        status: 'active' as const,
        config: {},
        code: testPluginCode,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        logs: []
      };

      const api = host.createHostAPI(plugin);

      // Register overlay
      const overlayId = api.ui.registerOverlay({
        id: 'test-overlay',
        render: () => {}
      });

      expect(overlayId).toBe('test-overlay');

      // Check registered overlays
      const overlays = host.getRegisteredOverlays();
      expect(overlays.has(manifest.id)).toBe(true);
    });
  });

  describe('Additional Integration Tests', () => {
    it('should persist plugins across manager restarts', async () => {
      // Install plugin
      const manifest = createTestManifest('persist-test');
      await manager.installFromJSON(JSON.stringify(manifest), testPluginCode);

      // Create new manager (simulates restart)
      const newRegistry = new PluginRegistryService();
      const newManager = new PluginManagerService(loader, newRegistry, sandbox, host);
      await newManager.initialize();

      // Plugin should still be there
      expect(newManager.listPlugins().length).toBe(1);
      expect(newManager.getPlugin(manifest.id)).not.toBeNull();
    });

    it('should handle multiple plugins independently', async () => {
      const manifest1 = createTestManifest('multi-1');
      const manifest2 = createTestManifest('multi-2');
      const manifest3 = createTestManifest('multi-3');

      // Install all
      await manager.installFromJSON(JSON.stringify(manifest1), testPluginCode);
      await manager.installFromJSON(JSON.stringify(manifest2), testPluginCode);
      await manager.installFromJSON(JSON.stringify(manifest3), testPluginCode);

      expect(manager.listPlugins().length).toBe(3);

      // Activate some
      await manager.activatePlugin(manifest1.id);
      await manager.activatePlugin(manifest3.id);

      expect(manager.getActivePlugins().length).toBe(2);

      // Uninstall one (must deactivate first)
      await manager.deactivatePlugin(manifest1.id);
      await manager.uninstallPlugin(manifest1.id);

      expect(manager.listPlugins().length).toBe(2);
      expect(manager.getActivePlugins().length).toBe(1);
    });

    it('should clean up resources on shutdown', async () => {
      const manifest = createTestManifest('cleanup-test');
      await manager.installFromJSON(JSON.stringify(manifest), testPluginCode);
      await manager.activatePlugin(manifest.id);

      expect(manager.getActivePlugins().length).toBe(1);

      // Shutdown
      await manager.shutdown();

      expect(manager.getActivePlugins().length).toBe(0);
      expect(manager.isInitialized()).toBe(false);
    });
  });
});
