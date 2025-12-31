// Property Tests for PluginSandboxService
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PluginSandboxService } from '../../src/plugins/services/PluginSandboxService';
import { Plugin, PluginManifest, PluginPermission, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

// Mock DOM APIs
const mockIframes: HTMLIFrameElement[] = [];

const createMockIframe = () => {
  const iframe = {
    id: '',
    style: { display: '' },
    sandbox: {
      add: vi.fn()
    },
    srcdoc: '',
    contentWindow: {
      postMessage: vi.fn()
    },
    parentNode: {
      removeChild: vi.fn()
    }
  } as unknown as HTMLIFrameElement;
  mockIframes.push(iframe);
  return iframe;
};

vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'iframe') {
    return createMockIframe();
  }
  return document.createElement(tag);
});

vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);

describe('PluginSandboxService Property Tests', () => {
  let service: PluginSandboxService;
  let counter = 0;

  const validPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[];

  // Generate unique plugin
  const createPlugin = (overrides: Partial<Plugin> = {}): Plugin => {
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
        permissions: ['storage'],
        main: 'index.js'
      },
      status: 'installed',
      config: {},
      code: 'console.log("test");',
      installedAt: Date.now(),
      updatedAt: Date.now(),
      logs: [],
      ...overrides
    };
  };

  beforeEach(() => {
    mockIframes.length = 0;
    counter = 0;
    service = new PluginSandboxService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Property 1: Sandbox isolation', () => {
    it('should create isolated sandboxes for each plugin', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (count) => {
            const plugins: Plugin[] = [];
            
            for (let i = 0; i < count; i++) {
              const plugin = createPlugin();
              plugins.push(plugin);
              service.createSandbox(plugin);
            }
            
            // Each plugin should have its own sandbox
            for (const plugin of plugins) {
              const sandbox = service.getSandbox(plugin.id);
              expect(sandbox).not.toBeNull();
              expect(sandbox?.pluginId).toBe(plugin.id);
            }
            
            expect(service.getActiveSandboxCount()).toBeLessThanOrEqual(count);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not reuse sandboxes between different plugins', () => {
      const plugin1 = createPlugin();
      const plugin2 = createPlugin();
      
      const sandbox1 = service.createSandbox(plugin1);
      const sandbox2 = service.createSandbox(plugin2);
      
      expect(sandbox1.id).not.toBe(sandbox2.id);
      expect(sandbox1.pluginId).not.toBe(sandbox2.pluginId);
    });

    it('should reuse existing sandbox for same plugin', () => {
      const plugin = createPlugin();
      
      const sandbox1 = service.createSandbox(plugin);
      // Simulate ready state
      (sandbox1 as any).status = 'ready';
      
      const sandbox2 = service.createSandbox(plugin);
      
      expect(sandbox1.id).toBe(sandbox2.id);
    });
  });

  describe('Property 2: Errors in plugin do not crash app', () => {
    it('should handle sandbox creation errors gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (badCode) => {
            const plugin = createPlugin({ code: badCode });
            
            // Should not throw
            expect(() => service.createSandbox(plugin)).not.toThrow();
            
            const sandbox = service.getSandbox(plugin.id);
            expect(sandbox).not.toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle missing sandbox gracefully', async () => {
      await expect(
        service.callPluginMethod('non-existent', 'test', [])
      ).rejects.toThrow('not ready');
    });

    it('should handle sandbox destruction gracefully', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      // First destruction should succeed
      expect(service.destroySandbox(plugin.id)).toBe(true);
      
      // Second destruction should return false
      expect(service.destroySandbox(plugin.id)).toBe(false);
      
      // Non-existent should return false
      expect(service.destroySandbox('non-existent')).toBe(false);
    });
  });

  describe('Property 3: Timeout works correctly', () => {
    it('should timeout pending calls when sandbox is destroyed', async () => {
      const plugin = createPlugin();
      const sandbox = service.createSandbox(plugin);
      (sandbox as any).status = 'ready';
      
      // Start a call that won't be answered
      const callPromise = service.callPluginMethod(plugin.id, 'test', []);
      
      // Destroy sandbox immediately
      service.destroySandbox(plugin.id);
      
      // Call should be rejected
      await expect(callPromise).rejects.toThrow('destroyed');
    });
  });

  describe('Property 4: Sandbox status tracking', () => {
    it('should track sandbox status correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('creating', 'ready', 'error', 'destroyed') as fc.Arbitrary<'creating' | 'ready' | 'error' | 'destroyed'>,
          (status) => {
            const plugin = createPlugin();
            const sandbox = service.createSandbox(plugin);
            
            // Initial status should be 'creating'
            expect(sandbox.status).toBe('creating');
            
            // Manually set status for testing
            (sandbox as any).status = status;
            
            expect(service.getSandboxStatus(plugin.id)).toBe(status);
            expect(service.isSandboxReady(plugin.id)).toBe(status === 'ready');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return null for non-existent sandbox status', () => {
      expect(service.getSandboxStatus('non-existent')).toBeNull();
      expect(service.isSandboxReady('non-existent')).toBe(false);
    });
  });

  describe('Property 5: Event broadcasting', () => {
    it('should broadcast events to all ready sandboxes', () => {
      const plugins: Plugin[] = [];
      
      for (let i = 0; i < 3; i++) {
        const plugin = createPlugin();
        plugins.push(plugin);
        const sandbox = service.createSandbox(plugin);
        (sandbox as any).status = 'ready';
      }
      
      // Broadcast event
      service.broadcastEvent('test:event', { data: 'test' });
      
      // All sandboxes should receive the event
      for (const plugin of plugins) {
        const sandbox = service.getSandbox(plugin.id);
        expect(sandbox?.iframe.contentWindow?.postMessage).toHaveBeenCalled();
      }
    });

    it('should not send events to non-ready sandboxes', () => {
      const plugin = createPlugin();
      const sandbox = service.createSandbox(plugin);
      // Status is 'creating', not 'ready'
      
      service.sendEvent(plugin.id, 'test:event', { data: 'test' });
      
      // Should not have been called since sandbox is not ready
      expect(sandbox.iframe.contentWindow?.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Property 6: Sandbox HTML generation', () => {
    it('should include plugin code in sandbox HTML', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (code) => {
            const plugin = createPlugin({ code });
            service.createSandbox(plugin);
            
            // Find the iframe that was created
            const iframe = mockIframes[mockIframes.length - 1];
            expect(iframe.srcdoc).toContain(code);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should include plugin manifest in sandbox HTML', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      const iframe = mockIframes[mockIframes.length - 1];
      expect(iframe.srcdoc).toContain(plugin.manifest.name);
      expect(iframe.srcdoc).toContain(plugin.id);
    });

    it('should include CSP header in sandbox HTML', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      const iframe = mockIframes[mockIframes.length - 1];
      expect(iframe.srcdoc).toContain('Content-Security-Policy');
    });
  });

  describe('Property 7: Cleanup', () => {
    it('should destroy all sandboxes on dispose', () => {
      const plugins: Plugin[] = [];
      
      for (let i = 0; i < 5; i++) {
        const plugin = createPlugin();
        plugins.push(plugin);
        service.createSandbox(plugin);
      }
      
      expect(service.getActiveSandboxCount()).toBeLessThanOrEqual(5);
      
      service.dispose();
      
      // All sandboxes should be gone
      for (const plugin of plugins) {
        expect(service.getSandbox(plugin.id)).toBeNull();
      }
    });

    it('should handle multiple dispose calls gracefully', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      expect(() => {
        service.dispose();
        service.dispose();
        service.dispose();
      }).not.toThrow();
    });
  });

  describe('Property 8: Sandbox security', () => {
    it('should add sandbox attribute to iframe', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      const iframe = mockIframes[mockIframes.length - 1];
      expect(iframe.sandbox.add).toHaveBeenCalledWith('allow-scripts');
    });

    it('should hide iframe from view', () => {
      const plugin = createPlugin();
      service.createSandbox(plugin);
      
      const iframe = mockIframes[mockIframes.length - 1];
      expect(iframe.style.display).toBe('none');
    });
  });
});
