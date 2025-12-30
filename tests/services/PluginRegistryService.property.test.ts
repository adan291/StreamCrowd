// Property Tests for PluginRegistryService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PluginRegistryService } from '../../src/plugins/services/PluginRegistryService';
import { PluginManifest, PluginPermission, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

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

describe('PluginRegistryService Property Tests', () => {
  let service: PluginRegistryService;
  let counter = 0;

  const validPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[];

  // Generate unique plugin ID
  const uniquePluginId = () => `plugin-${Date.now()}-${counter++}`;

  // Arbitrary for valid manifest
  const validManifestArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    version: fc.tuple(
      fc.integer({ min: 0, max: 99 }),
      fc.integer({ min: 0, max: 99 }),
      fc.integer({ min: 0, max: 99 })
    ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    author: fc.string({ minLength: 1, maxLength: 50 }),
    minAppVersion: fc.constant('1.0.0'),
    permissions: fc.subarray(validPermissions, { minLength: 1, maxLength: 5 }),
    main: fc.constant('index.js'),
    defaultConfig: fc.constant({ enabled: true })
  }).map(m => ({
    ...m,
    id: uniquePluginId()
  })) as fc.Arbitrary<PluginManifest>;

  beforeEach(() => {
    localStorageMock.clear();
    counter = 0;
    service = new PluginRegistryService();
  });

  describe('Property 1: Plugins install and persist correctly', () => {
    it('should install plugins successfully', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          const result = await service.install(manifest, code);
          
          expect(result.success).toBe(true);
          expect(result.plugin).toBeDefined();
          expect(result.plugin?.id).toBe(manifest.id);
          expect(result.plugin?.status).toBe('installed');
        }),
        { numRuns: 20 }
      );
    });

    it('should persist plugins across instances', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          
          // Create new instance
          const newService = new PluginRegistryService();
          const plugin = newService.getPlugin(manifest.id);
          
          expect(plugin).not.toBeNull();
          expect(plugin?.manifest.name).toBe(manifest.name);
        }),
        { numRuns: 10 }
      );
    });

    it('should reject duplicate installations', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          
          const first = await service.install(manifest, code);
          expect(first.success).toBe(true);
          
          const second = await service.install(manifest, code);
          expect(second.success).toBe(false);
          expect(second.error).toContain('ya está instalado');
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 2: Uninstallation cleans up data', () => {
    it('should remove plugin completely on uninstall', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          
          expect(service.hasPlugin(manifest.id)).toBe(true);
          
          const result = await service.uninstall(manifest.id);
          expect(result).toBe(true);
          expect(service.hasPlugin(manifest.id)).toBe(false);
          expect(service.getPlugin(manifest.id)).toBeNull();
        }),
        { numRuns: 15 }
      );
    });

    it('should return false for non-existent plugins', async () => {
      const result = await service.uninstall('non-existent-plugin');
      expect(result).toBe(false);
    });

    it('should not allow uninstalling active plugins', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          service.setStatus(manifest.id, 'active');
          
          await expect(service.uninstall(manifest.id)).rejects.toThrow('Desactiva');
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 3: Updates preserve configuration', () => {
    it('should preserve user config on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validManifestArb,
          fc.record({
            customSetting: fc.string(),
            customNumber: fc.integer()
          }),
          async (manifest, userConfig) => {
            const code = 'console.log("v1");';
            await service.install(manifest, code);
            
            // Set user config
            service.setConfig(manifest.id, userConfig);
            
            // Update plugin
            const newManifest = { ...manifest, version: '2.0.0' };
            const newCode = 'console.log("v2");';
            const result = await service.update(manifest.id, newManifest, newCode);
            
            expect(result.success).toBe(true);
            expect(result.previousVersion).toBe(manifest.version);
            
            // User config should be preserved
            const config = service.getConfig(manifest.id);
            expect(config.customSetting).toBe(userConfig.customSetting);
            expect(config.customNumber).toBe(userConfig.customNumber);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should merge new defaults with existing config', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("v1");';
          await service.install(manifest, code);
          
          // Set some user config
          service.setConfig(manifest.id, { userValue: 'test' });
          
          // Update with new defaults
          const newManifest = {
            ...manifest,
            version: '2.0.0',
            defaultConfig: { newDefault: 'value', enabled: false }
          };
          
          await service.update(manifest.id, newManifest, code);
          
          const config = service.getConfig(manifest.id);
          expect(config.userValue).toBe('test'); // Preserved
          expect(config.newDefault).toBe('value'); // New default
        }),
        { numRuns: 10 }
      );
    });

    it('should not allow updating active plugins', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          service.setStatus(manifest.id, 'active');
          
          const result = await service.update(manifest.id, manifest, code);
          expect(result.success).toBe(false);
          expect(result.error).toContain('Desactiva');
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4: Status management', () => {
    it('should track status changes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validManifestArb,
          fc.constantFrom('installed', 'active', 'disabled', 'error') as fc.Arbitrary<'installed' | 'active' | 'disabled' | 'error'>,
          async (manifest, status) => {
            const code = 'console.log("test");';
            await service.install(manifest, code);
            
            service.setStatus(manifest.id, status);
            
            const plugin = service.getPlugin(manifest.id);
            expect(plugin?.status).toBe(status);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should update lastActiveAt when activated', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          
          const before = Date.now();
          service.setStatus(manifest.id, 'active');
          const after = Date.now();
          
          const plugin = service.getPlugin(manifest.id);
          expect(plugin?.lastActiveAt).toBeGreaterThanOrEqual(before);
          expect(plugin?.lastActiveAt).toBeLessThanOrEqual(after);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 5: Logging', () => {
    it('should store logs correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validManifestArb,
          fc.constantFrom('debug', 'info', 'warn', 'error') as fc.Arbitrary<'debug' | 'info' | 'warn' | 'error'>,
          fc.string({ minLength: 1, maxLength: 100 }),
          async (manifest, level, message) => {
            const code = 'console.log("test");';
            await service.install(manifest, code);
            
            service.addLog(manifest.id, level, message);
            
            const logs = service.getLogs(manifest.id);
            expect(logs.length).toBe(1);
            expect(logs[0].level).toBe(level);
            expect(logs[0].message).toBe(message);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should filter logs by level', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          
          service.addLog(manifest.id, 'info', 'Info message');
          service.addLog(manifest.id, 'error', 'Error message');
          service.addLog(manifest.id, 'info', 'Another info');
          
          const infoLogs = service.getLogs(manifest.id, 'info');
          const errorLogs = service.getLogs(manifest.id, 'error');
          
          expect(infoLogs.length).toBe(2);
          expect(errorLogs.length).toBe(1);
        }),
        { numRuns: 10 }
      );
    });

    it('should limit log count', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          
          // Add more than max logs
          for (let i = 0; i < 150; i++) {
            service.addLog(manifest.id, 'info', `Log ${i}`);
          }
          
          const logs = service.getLogs(manifest.id);
          expect(logs.length).toBeLessThanOrEqual(100);
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 6: Query operations', () => {
    it('should list all plugins', async () => {
      const manifests: PluginManifest[] = [];
      
      // Install multiple plugins
      for (let i = 0; i < 5; i++) {
        const manifest: PluginManifest = {
          id: `test-plugin-${i}`,
          name: `Test Plugin ${i}`,
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          minAppVersion: '1.0.0',
          permissions: ['storage'],
          main: 'index.js'
        };
        manifests.push(manifest);
        await service.install(manifest, 'code');
      }
      
      const plugins = service.listPlugins();
      expect(plugins.length).toBe(5);
    });

    it('should filter by status correctly', async () => {
      // Install plugins with different statuses
      for (let i = 0; i < 6; i++) {
        const manifest: PluginManifest = {
          id: `status-plugin-${i}`,
          name: `Plugin ${i}`,
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          minAppVersion: '1.0.0',
          permissions: ['storage'],
          main: 'index.js'
        };
        await service.install(manifest, 'code');
        
        if (i < 2) service.setStatus(manifest.id, 'active');
        else if (i < 4) service.setStatus(manifest.id, 'disabled');
        // Rest stay as 'installed'
      }
      
      expect(service.getActivePlugins().length).toBe(2);
      expect(service.getPluginsByStatus('disabled').length).toBe(2);
      expect(service.getPluginsByStatus('installed').length).toBe(2);
    });
  });

  describe('Property 7: Import/Export', () => {
    it('should export and import plugins correctly', async () => {
      await fc.assert(
        fc.asyncProperty(validManifestArb, async (manifest) => {
          const code = 'console.log("test");';
          await service.install(manifest, code);
          service.setConfig(manifest.id, { custom: 'value' });
          
          const exported = service.exportPlugin(manifest.id);
          expect(exported).not.toBeNull();
          
          // Uninstall and reimport
          service.setStatus(manifest.id, 'installed');
          await service.uninstall(manifest.id);
          
          const result = await service.importPlugin(exported!);
          expect(result.success).toBe(true);
          
          const config = service.getConfig(manifest.id);
          expect(config.custom).toBe('value');
        }),
        { numRuns: 10 }
      );
    });

    it('should reject invalid import data', async () => {
      const invalidData = [
        'not json',
        '{}',
        '{"manifest": {}}',
        '{"code": "test"}'
      ];
      
      for (const data of invalidData) {
        const result = await service.importPlugin(data);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Property 8: Subscription notifications', () => {
    it('should notify listeners on changes', async () => {
      const listener = vi.fn();
      service.subscribe(listener);
      
      const manifest: PluginManifest = {
        id: 'notify-test',
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        minAppVersion: '1.0.0',
        permissions: ['storage'],
        main: 'index.js'
      };
      
      await service.install(manifest, 'code');
      expect(listener).toHaveBeenCalled();
      
      service.setStatus(manifest.id, 'active');
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should allow unsubscribing', async () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);
      
      const manifest: PluginManifest = {
        id: 'unsub-test',
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        minAppVersion: '1.0.0',
        permissions: ['storage'],
        main: 'index.js'
      };
      
      await service.install(manifest, 'code');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      service.setStatus(manifest.id, 'active');
      expect(listener).toHaveBeenCalledTimes(1); // No additional calls
    });
  });
});
