// Plugin Sandbox Service - Ejecuta plugins en entorno aislado
import {
  Plugin,
  PluginSandbox,
  SandboxStatus,
  SandboxMessage,
  PluginHostAPI
} from '../../../types/plugins';

const SANDBOX_TIMEOUT = 5000; // 5 seconds
const SANDBOX_ORIGIN = 'null'; // iframe sandbox origin

export class PluginSandboxService {
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private pendingCalls: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private hostAPIFactory: ((plugin: Plugin) => PluginHostAPI) | null = null;

  constructor() {
    this.setupMessageListener();
  }

  // ============================================
  // Sandbox Creation
  // ============================================

  createSandbox(plugin: Plugin): PluginSandbox {
    // Check if sandbox already exists
    const existing = this.sandboxes.get(plugin.id);
    if (existing && existing.status === 'ready') {
      return existing;
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = `plugin-sandbox-${plugin.id}`;
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    // Note: No allow-same-origin for security
    
    const sandbox: PluginSandbox = {
      id: `sandbox-${plugin.id}-${Date.now()}`,
      pluginId: plugin.id,
      iframe,
      status: 'creating',
      createdAt: Date.now()
    };

    this.sandboxes.set(plugin.id, sandbox);

    // Inject plugin code
    const html = this.createSandboxHTML(plugin);
    iframe.srcdoc = html;

    // Add to DOM
    document.body.appendChild(iframe);

    return sandbox;
  }

  // ============================================
  // Sandbox Destruction
  // ============================================

  destroySandbox(pluginId: string): boolean {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) return false;

    // Remove iframe from DOM
    if (sandbox.iframe.parentNode) {
      sandbox.iframe.parentNode.removeChild(sandbox.iframe);
    }

    // Cancel pending calls
    for (const [callId, pending] of this.pendingCalls) {
      if (callId.startsWith(pluginId)) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Sandbox destroyed'));
        this.pendingCalls.delete(callId);
      }
    }

    sandbox.status = 'destroyed';
    this.sandboxes.delete(pluginId);

    return true;
  }

  destroyAllSandboxes(): void {
    for (const pluginId of this.sandboxes.keys()) {
      this.destroySandbox(pluginId);
    }
  }

  // ============================================
  // Sandbox Communication
  // ============================================

  async callPluginMethod(
    pluginId: string,
    method: string,
    args: unknown[] = []
  ): Promise<unknown> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox || sandbox.status !== 'ready') {
      throw new Error(`Sandbox for plugin "${pluginId}" is not ready`);
    }

    const callId = `${pluginId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`Plugin call timed out: ${method}`));
      }, SANDBOX_TIMEOUT);

      this.pendingCalls.set(callId, { resolve, reject, timeout });

      const message: SandboxMessage = {
        type: 'plugin-call',
        pluginId,
        callId,
        method,
        args
      };

      sandbox.iframe.contentWindow?.postMessage(message, '*');
    });
  }

  sendEvent(pluginId: string, event: string, data: unknown): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox || sandbox.status !== 'ready') return;

    const message: SandboxMessage = {
      type: 'plugin-event',
      pluginId,
      method: event,
      args: [data]
    };

    sandbox.iframe.contentWindow?.postMessage(message, '*');
  }

  broadcastEvent(event: string, data: unknown): void {
    for (const [pluginId, sandbox] of this.sandboxes) {
      if (sandbox.status === 'ready') {
        this.sendEvent(pluginId, event, data);
      }
    }
  }

  // ============================================
  // Host API Factory
  // ============================================

  setHostAPIFactory(factory: (plugin: Plugin) => PluginHostAPI): void {
    this.hostAPIFactory = factory;
  }

  // ============================================
  // Status
  // ============================================

  getSandbox(pluginId: string): PluginSandbox | null {
    return this.sandboxes.get(pluginId) || null;
  }

  getSandboxStatus(pluginId: string): SandboxStatus | null {
    return this.sandboxes.get(pluginId)?.status || null;
  }

  isSandboxReady(pluginId: string): boolean {
    return this.sandboxes.get(pluginId)?.status === 'ready';
  }

  getActiveSandboxCount(): number {
    let count = 0;
    for (const sandbox of this.sandboxes.values()) {
      if (sandbox.status === 'ready') count++;
    }
    return count;
  }

  // ============================================
  // Private Methods
  // ============================================

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Only accept messages from sandbox iframes
      if (!event.data || typeof event.data !== 'object') return;
      
      const message = event.data as SandboxMessage;
      if (!message.type || !message.pluginId) return;

      this.handleSandboxMessage(message, event.source as Window);
    };

    window.addEventListener('message', this.messageHandler);
  }

  private handleSandboxMessage(message: SandboxMessage, source: Window): void {
    switch (message.type) {
      case 'plugin-ready':
        this.handlePluginReady(message.pluginId);
        break;

      case 'plugin-call':
        this.handlePluginCall(message, source);
        break;

      case 'plugin-response':
        this.handlePluginResponse(message);
        break;

      case 'plugin-log':
        this.handlePluginLog(message);
        break;

      case 'plugin-error':
        this.handlePluginError(message);
        break;
    }
  }

  private handlePluginReady(pluginId: string): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.status = 'ready';
    }
  }

  private handlePluginCall(message: SandboxMessage, source: Window): void {
    const { pluginId, callId, method, args } = message;
    
    // This would be handled by PluginHostService
    // For now, just send back an error
    const response: SandboxMessage = {
      type: 'plugin-response',
      pluginId,
      callId,
      error: 'Host API not configured'
    };

    source.postMessage(response, '*');
  }

  private handlePluginResponse(message: SandboxMessage): void {
    const { callId, result, error } = message;
    if (!callId) return;

    const pending = this.pendingCalls.get(callId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(callId);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  private handlePluginLog(message: SandboxMessage): void {
    const { pluginId, args } = message;
    if (!args || args.length < 2) return;

    const [level, logMessage] = args as [string, string];
    console.log(`[Plugin ${pluginId}] [${level}]`, logMessage);
  }

  private handlePluginError(message: SandboxMessage): void {
    const { pluginId, error } = message;
    console.error(`[Plugin ${pluginId}] Error:`, error);

    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.status = 'error';
    }
  }

  private createSandboxHTML(plugin: Plugin): string {
    const { id, code, manifest } = plugin;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline';">
</head>
<body>
<script>
(function() {
  'use strict';
  
  const PLUGIN_ID = ${JSON.stringify(id)};
  const MANIFEST = ${JSON.stringify(manifest)};
  let config = ${JSON.stringify(plugin.config)};
  
  // Pending API calls
  const pendingCalls = new Map();
  let callCounter = 0;
  
  // Create API proxy
  function createAPIProxy(namespace) {
    return new Proxy({}, {
      get(target, prop) {
        return function(...args) {
          return callHostAPI(namespace + '.' + prop, args);
        };
      }
    });
  }
  
  function callHostAPI(method, args) {
    return new Promise((resolve, reject) => {
      const callId = PLUGIN_ID + '-' + (++callCounter) + '-' + Date.now();
      
      const timeout = setTimeout(() => {
        pendingCalls.delete(callId);
        reject(new Error('API call timed out: ' + method));
      }, 5000);
      
      pendingCalls.set(callId, { resolve, reject, timeout });
      
      window.parent.postMessage({
        type: 'plugin-call',
        pluginId: PLUGIN_ID,
        callId: callId,
        method: method,
        args: args
      }, '*');
    });
  }
  
  // Plugin API
  const pluginAPI = {
    // Core APIs
    polls: createAPIProxy('polls'),
    predictions: createAPIProxy('predictions'),
    giveaways: createAPIProxy('giveaways'),
    timers: createAPIProxy('timers'),
    obs: createAPIProxy('obs'),
    
    // Utilities
    events: {
      _handlers: new Map(),
      on: function(event, handler) {
        if (!this._handlers.has(event)) {
          this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);
        return () => this.off(event, handler);
      },
      off: function(event, handler) {
        const handlers = this._handlers.get(event);
        if (handlers) handlers.delete(handler);
      },
      once: function(event, handler) {
        const wrapper = (data) => {
          this.off(event, wrapper);
          handler(data);
        };
        return this.on(event, wrapper);
      },
      emit: function(event, data) {
        window.parent.postMessage({
          type: 'plugin-event',
          pluginId: PLUGIN_ID,
          method: event,
          args: [data]
        }, '*');
      },
      _trigger: function(event, data) {
        const handlers = this._handlers.get(event);
        if (handlers) {
          handlers.forEach(h => {
            try { h(data); } catch(e) { console.error(e); }
          });
        }
      }
    },
    
    storage: createAPIProxy('storage'),
    ui: createAPIProxy('ui'),
    commands: createAPIProxy('commands'),
    notifications: createAPIProxy('notifications'),
    
    // Plugin info
    getManifest: function() { return MANIFEST; },
    getConfig: function() { return config; },
    setConfig: function(newConfig) {
      config = { ...config, ...newConfig };
      return callHostAPI('plugin.setConfig', [newConfig]);
    },
    log: function(level, message, data) {
      window.parent.postMessage({
        type: 'plugin-log',
        pluginId: PLUGIN_ID,
        args: [level, message, data]
      }, '*');
    }
  };
  
  // Handle messages from host
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (!msg || !msg.type) return;
    
    if (msg.type === 'plugin-response' && msg.callId) {
      const pending = pendingCalls.get(msg.callId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(msg.callId);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
    
    if (msg.type === 'plugin-event' && msg.method) {
      pluginAPI.events._trigger(msg.method, msg.args ? msg.args[0] : undefined);
    }
  });
  
  // Execute plugin code
  try {
    ${code}
    
    // Notify host that plugin is ready
    window.parent.postMessage({
      type: 'plugin-ready',
      pluginId: PLUGIN_ID
    }, '*');
  } catch (error) {
    window.parent.postMessage({
      type: 'plugin-error',
      pluginId: PLUGIN_ID,
      error: error.message
    }, '*');
  }
})();
</script>
</body>
</html>
`;
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    this.destroyAllSandboxes();
    
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}

// Singleton
let instance: PluginSandboxService | null = null;

export function getPluginSandboxService(): PluginSandboxService {
  if (!instance) {
    instance = new PluginSandboxService();
  }
  return instance;
}

export function resetPluginSandboxService(): void {
  if (instance) {
    instance.dispose();
  }
  instance = null;
}
