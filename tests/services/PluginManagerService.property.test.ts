// Property Tests for PluginManagerService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PluginManagerService } from '../../src/plugins/services/PluginManagerService';
import { PluginRegistryService } from '../../src/plugins/services/PluginRegistryService';
import { PluginLoaderService } from '../../src/plugins/services/PluginLoaderService';
import { PluginSandboxService } from '../../src/plugins/services/PluginSandboxService';
import { PluginHostService } from '../../src/plugins/services/PluginHostService';
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

// Mock DOM for sandbox - return proper mock that simulates ready state
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

// Create a mock sandbox service that immediately reports ready
class MockPluginSandboxService extends PluginSandboxService {
  private readySandboxes = new Set<string>();

  createSandbox(plugin: any) {
    const result = super.createSandbox(plugin);
    // Immediately mark as ready for tests
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

  destroyAllSandboxes(): void {
    this.readySandboxes.clear();
    super.destroyAllSandboxes();
  }
}

describe('PluginManagerService Property Tests', () => {
  let manager: PluginManagerService;
  let registry: PluginRegistryService;
  let loader: PluginLoaderService;
  let sandbox: MockPluginSandboxService;
  let host: PluginHostService;
  let counter = 0;

  const createManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => {
    const id = `test-plugin-${Date.now()}-${counter++}`;
    return {
      id,
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'Test',
      author: 'Test',
      minAppVersion: '1.0.0',
      permissions: ['storage'],
      main: 'index.js',
      ...overrides
    };
  };

  beforeEach(() => {
    localStorageMock.clear();
    counter = 0;
    
    registry = new PluginRegistryService();
    loader = new PluginLoaderService();
    sandbox = new MockPluginSandboxService();
    host = new PluginHostService();
    
    manager = new PluginManagerService(loader, registry, sandbox, host);
  });

  describe('Property 1: Complete lifecycle works', () => {
    it('should handle install -> activate -> deactivate -> uninstall', async () => {
      const manifest = createManifest();
      const code = 'console.log("test");';
      
      // Install
      const installResult = await manager.installFromJSON(JSON.stringify(manifest), code);
      expect(installResult.success).toBe(true);
      expect(manager.getPlugin(manifest.id)).not.toBeNull();
      
      // Activate
      const activateResult = await manager.activatePlugin(manifest.id);
      expect(activateResult).toBe(true);
      expect(manager.getPlugin(manifest.id)?.status).toBe('active');
      
      // Deactivate
      const deactivateResult = await manager.deactivatePlugin(manifest.id);
      expect(deactivateResult).toBe(true);
      expect(manager.getPlugin(manifest.id)?.status).toBe('disabled');
      
      // Uninstall
      const uninstallResult = await manager.uninstallPlugin(manifest.id);
      expect(uninstallResult).toBe(true);
      expect(manager.getPlugin(manifest.id)).toBeNull();
    });

    it('should handle multiple plugins independently', async () => {
      const plugins: PluginManifest[] = [];
      
      // Install multiple plugins
      for (let i = 0; i < 3; i++) {
        const manifest = createManifest({ name: `Plugin ${i}` });
        plugins.push(manifest);
        await manager.installFromJSON(JSON.stringify(manifest), 'code');
      }
      
      expect(manager.listPlugins().length).toBe(3);
      
      // Activate first two
      await manager.activatePlugin(plugins[0].id);
      await manager.activatePlugin(plugins[1].id);
      
      expect(manager.getActivePlugins().length).toBe(2);
      
      // Uninstall middle one (must deactivate first)
      await manager.deactivatePlugin(plugins[1].id);
      await manager.uninstallPlugin(plugins[1].id);
      
      expect(manager.listPlugins().length).toBe(2);
      expect(manager.getActivePlugins().length).toBe(1);
    });
  });

  describe('Property 2: Configuration persists', () => {
    it('should persist and retrieve configuration', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            setting1: fc.string(),
            setting2: fc.integer(),
            setting3: fc.boolean()
          }),
          async (config) => {
            const manifest = createManifest();
            await manager.installFromJSON(JSON.stringify(manifest), 'code');
            
            manager.setPluginConfig(manifest.id, config);
            const retrieved = manager.getPluginConfig(manifest.id);
            
            expect(retrieved.setting1).toBe(config.setting1);
            expect(retrieved.setting2).toBe(config.setting2);
            expect(retrieved.setting3).toBe(config.setting3);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reset configuration to defaults', async () => {
      const manifest = createManifest({
        defaultConfig: { default1: 'value', default2: 42 }
      });
      
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      // Set custom config
      manager.setPluginConfig(manifest.id, { custom: 'custom' });
      expect(manager.getPluginConfig(manifest.id).custom).toBe('custom');
      
      // Reset
      manager.resetPluginConfig(manifest.id);
      
      const config = manager.getPluginConfig(manifest.id);
      expect(config.default1).toBe('value');
      expect(config.default2).toBe(42);
      expect(config.custom).toBeUndefined();
    });
  });

  describe('Property 3: Plugins load at startup', () => {
    it('should list installed plugins after initialization', async () => {
      // Clear localStorage to start fresh
      localStorageMock.clear();
      
      // Install plugins using the manager API
      const manifest1 = createManifest({ name: 'Plugin 1' });
      const manifest2 = createManifest({ name: 'Plugin 2' });
      
      await manager.installFromJSON(JSON.stringify(manifest1), 'code1');
      await manager.installFromJSON(JSON.stringify(manifest2), 'code2');
      
      // Create new registry and manager (should load from localStorage)
      const newRegistry = new PluginRegistryService();
      const newManager = new PluginManagerService(loader, newRegistry, sandbox, host);
      
      await newManager.initialize();
      
      // Should have exactly 2 plugins (the ones we just installed)
      const plugins = newManager.listPlugins();
      const installedPlugins = plugins.filter(p => 
        p.manifest.name === 'Plugin 1' || p.manifest.name === 'Plugin 2'
      );
      expect(installedPlugins.length).toBe(2);
    });

    it('should only initialize once', async () => {
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
      
      // Second call should be no-op
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('Property 4: Error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const result = await manager.installFromJSON('invalid json', 'code');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing plugin gracefully', async () => {
      const result = await manager.activatePlugin('non-existent');
      expect(result).toBe(false);
    });

    it('should handle double activation gracefully', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      await manager.activatePlugin(manifest.id);
      const secondActivation = await manager.activatePlugin(manifest.id);
      
      expect(secondActivation).toBe(true); // Should succeed (already active)
    });

    it('should handle double deactivation gracefully', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      const result = await manager.deactivatePlugin(manifest.id);
      expect(result).toBe(true); // Already inactive
    });
  });

  describe('Property 5: Toggle functionality', () => {
    it('should toggle plugin state correctly', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      // Initially installed (not active)
      expect(manager.getPlugin(manifest.id)?.status).toBe('installed');
      
      // Toggle on
      await manager.togglePlugin(manifest.id);
      expect(manager.getPlugin(manifest.id)?.status).toBe('active');
      
      // Toggle off
      await manager.togglePlugin(manifest.id);
      expect(manager.getPlugin(manifest.id)?.status).toBe('disabled');
      
      // Toggle on again
      await manager.togglePlugin(manifest.id);
      expect(manager.getPlugin(manifest.id)?.status).toBe('active');
    });
  });

  describe('Property 6: Logging', () => {
    it('should track plugin logs', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      // Activate generates a log
      await manager.activatePlugin(manifest.id);
      
      const logs = manager.getPluginLogs(manifest.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.message.includes('activado'))).toBe(true);
    });

    it('should clear logs', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      await manager.activatePlugin(manifest.id);
      
      expect(manager.getPluginLogs(manifest.id).length).toBeGreaterThan(0);
      
      manager.clearPluginLogs(manifest.id);
      
      expect(manager.getPluginLogs(manifest.id).length).toBe(0);
    });

    it('should filter logs by level', async () => {
      const manifest = createManifest();
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      
      // Add logs of different levels via registry
      registry.addLog(manifest.id, 'info', 'Info message');
      registry.addLog(manifest.id, 'error', 'Error message');
      registry.addLog(manifest.id, 'info', 'Another info');
      
      const infoLogs = manager.getPluginLogs(manifest.id, 'info');
      const errorLogs = manager.getPluginLogs(manifest.id, 'error');
      
      expect(infoLogs.length).toBe(2);
      expect(errorLogs.length).toBe(1);
    });
  });

  describe('Property 7: Shutdown', () => {
    it('should deactivate all plugins on shutdown', async () => {
      const manifest1 = createManifest();
      const manifest2 = createManifest();
      
      await manager.installFromJSON(JSON.stringify(manifest1), 'code');
      await manager.installFromJSON(JSON.stringify(manifest2), 'code');
      
      await manager.activatePlugin(manifest1.id);
      await manager.activatePlugin(manifest2.id);
      
      expect(manager.getActivePlugins().length).toBe(2);
      
      await manager.shutdown();
      
      expect(manager.getActivePlugins().length).toBe(0);
      expect(manager.isInitialized()).toBe(false);
    });
  });

  describe('Property 8: Commands and UI registration', () => {
    it('should track registered commands', async () => {
      const manifest = createManifest({ permissions: ['commands'] });
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      await manager.activatePlugin(manifest.id);
      
      // Commands would be registered by the plugin itself
      // For now, just verify the API exists
      const commands = manager.getRegisteredCommands();
      expect(Array.isArray(commands)).toBe(true);
    });

    it('should track registered panels', async () => {
      const manifest = createManifest({ permissions: ['ui:panel'] });
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      await manager.activatePlugin(manifest.id);
      
      const panels = manager.getRegisteredPanels();
      expect(Array.isArray(panels)).toBe(true);
    });

    it('should track registered overlays', async () => {
      const manifest = createManifest({ permissions: ['ui:overlay'] });
      await manager.installFromJSON(JSON.stringify(manifest), 'code');
      await manager.activatePlugin(manifest.id);
      
      const overlays = manager.getRegisteredOverlays();
      expect(Array.isArray(overlays)).toBe(true);
    });
  });

  describe('Property 9: Event broadcasting', () => {
    it('should broadcast events to host and sandbox', () => {
      const hostSpy = vi.spyOn(host, 'broadcastEvent');
      const sandboxSpy = vi.spyOn(sandbox, 'broadcastEvent');
      
      manager.broadcastEvent('poll:created', { id: 'test' });
      
      expect(hostSpy).toHaveBeenCalledWith('poll:created', { id: 'test' });
      expect(sandboxSpy).toHaveBeenCalledWith('poll:created', { id: 'test' });
    });
  });
});
