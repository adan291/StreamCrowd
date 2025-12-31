// Plugin Manager Service - Orquesta el ciclo de vida de plugins
import {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginInstallResult,
  PluginUpdateResult,
  PluginLog,
  PluginEvent
} from '../../../types/plugins';
import { getPluginLoaderService, PluginLoaderService } from './PluginLoaderService';
import { getPluginRegistryService, PluginRegistryService } from './PluginRegistryService';
import { getPluginSandboxService, PluginSandboxService } from './PluginSandboxService';
import { getPluginHostService, PluginHostService } from './PluginHostService';

export class PluginManagerService {
  private loader: PluginLoaderService;
  private registry: PluginRegistryService;
  private sandbox: PluginSandboxService;
  private host: PluginHostService;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    loader?: PluginLoaderService,
    registry?: PluginRegistryService,
    sandbox?: PluginSandboxService,
    host?: PluginHostService
  ) {
    this.loader = loader || getPluginLoaderService();
    this.registry = registry || getPluginRegistryService();
    this.sandbox = sandbox || getPluginSandboxService();
    this.host = host || getPluginHostService();
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
    this.initialized = true;
  }

  private async doInitialize(): Promise<void> {
    // Load all installed plugins
    const plugins = this.registry.listPlugins();
    
    // Auto-activate plugins that were active before
    for (const plugin of plugins) {
      if (plugin.status === 'installed') {
        // Check if it should auto-activate (based on previous state or config)
        // For now, we don't auto-activate
      }
    }

    // Broadcast app ready event
    this.host.broadcastEvent('app:ready', { timestamp: Date.now() });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================
  // Installation
  // ============================================

  async installFromFile(file: File): Promise<PluginInstallResult> {
    try {
      const { manifest, code } = await this.loader.loadFromFile(file);
      return this.registry.install(manifest, code);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error instalando plugin'
      };
    }
  }

  async installFromURL(url: string): Promise<PluginInstallResult> {
    try {
      const { manifest, code } = await this.loader.loadFromURL(url);
      return this.registry.install(manifest, code);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error instalando plugin'
      };
    }
  }

  async installFromJSON(manifestJson: string, code: string): Promise<PluginInstallResult> {
    try {
      const { manifest } = this.loader.loadFromJSON(manifestJson, code);
      return this.registry.install(manifest, code);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error instalando plugin'
      };
    }
  }

  // ============================================
  // Uninstallation
  // ============================================

  async uninstallPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) return false;

    // Deactivate first if active
    if (plugin.status === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    // Clean up host resources
    this.host.cleanupPlugin(pluginId);
    this.host.clearPluginStorage(pluginId);

    // Remove from registry
    return this.registry.uninstall(pluginId);
  }

  // ============================================
  // Activation / Deactivation
  // ============================================

  async activatePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return false;
    }

    if (plugin.status === 'active') {
      return true; // Already active
    }

    try {
      // Create sandbox
      const sandbox = this.sandbox.createSandbox(plugin);
      
      // Wait for sandbox to be ready (with timeout)
      await this.waitForSandboxReady(pluginId, 5000);

      // Update status
      this.registry.setStatus(pluginId, 'active');
      this.registry.addLog(pluginId, 'info', 'Plugin activado');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error activando plugin';
      this.registry.setError(pluginId, message);
      return false;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) return false;

    if (plugin.status !== 'active') {
      return true; // Already inactive
    }

    try {
      // Destroy sandbox
      this.sandbox.destroySandbox(pluginId);

      // Clean up host resources (but keep storage)
      this.host.cleanupPlugin(pluginId);

      // Update status
      this.registry.setStatus(pluginId, 'disabled');
      this.registry.addLog(pluginId, 'info', 'Plugin desactivado');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desactivando plugin';
      this.registry.addLog(pluginId, 'error', message);
      return false;
    }
  }

  async togglePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) return false;

    if (plugin.status === 'active') {
      return this.deactivatePlugin(pluginId);
    } else {
      return this.activatePlugin(pluginId);
    }
  }

  // ============================================
  // Update
  // ============================================

  async updatePlugin(pluginId: string, file: File): Promise<PluginUpdateResult> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      return { success: false, error: 'Plugin no encontrado' };
    }

    // Must deactivate first
    if (plugin.status === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    try {
      const { manifest, code } = await this.loader.loadFromFile(file);
      
      // Verify it's the same plugin
      if (manifest.id !== pluginId) {
        return { success: false, error: 'El archivo no corresponde a este plugin' };
      }

      return this.registry.update(pluginId, manifest, code);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error actualizando plugin'
      };
    }
  }

  // ============================================
  // Configuration
  // ============================================

  getPluginConfig(pluginId: string): Record<string, unknown> {
    return this.registry.getConfig(pluginId);
  }

  setPluginConfig(pluginId: string, config: Record<string, unknown>): boolean {
    return this.registry.setConfig(pluginId, config);
  }

  resetPluginConfig(pluginId: string): boolean {
    return this.registry.resetConfig(pluginId);
  }

  // ============================================
  // Queries
  // ============================================

  getPlugin(pluginId: string): Plugin | null {
    return this.registry.getPlugin(pluginId);
  }

  listPlugins(): Plugin[] {
    return this.registry.listPlugins();
  }

  getActivePlugins(): Plugin[] {
    return this.registry.getActivePlugins();
  }

  getPluginLogs(pluginId: string, level?: PluginLog['level']): PluginLog[] {
    return this.registry.getLogs(pluginId, level);
  }

  clearPluginLogs(pluginId: string): void {
    this.registry.clearLogs(pluginId);
  }

  // ============================================
  // Events
  // ============================================

  broadcastEvent(event: PluginEvent, data: unknown): void {
    this.host.broadcastEvent(event, data);
    this.sandbox.broadcastEvent(event as string, data);
  }

  // ============================================
  // Commands
  // ============================================

  executeCommand(commandName: string, args: string[], context: any): boolean {
    return this.host.executeCommand(commandName, args, context);
  }

  getRegisteredCommands(): Array<{ name: string; description: string; pluginId: string }> {
    const commands: Array<{ name: string; description: string; pluginId: string }> = [];
    for (const [pluginId, cmds] of this.host.getRegisteredCommands()) {
      for (const [name, cmd] of cmds) {
        commands.push({ name, description: cmd.description, pluginId });
      }
    }
    return commands;
  }

  // ============================================
  // UI Components
  // ============================================

  getRegisteredPanels(): Array<{ pluginId: string; id: string; title: string }> {
    const panels: Array<{ pluginId: string; id: string; title: string }> = [];
    for (const [pluginId, pnls] of this.host.getRegisteredPanels()) {
      for (const [id, panel] of pnls) {
        panels.push({ pluginId, id, title: panel.title });
      }
    }
    return panels;
  }

  getRegisteredOverlays(): Array<{ pluginId: string; id: string }> {
    const overlays: Array<{ pluginId: string; id: string }> = [];
    for (const [pluginId, ovls] of this.host.getRegisteredOverlays()) {
      for (const [id] of ovls) {
        overlays.push({ pluginId, id });
      }
    }
    return overlays;
  }

  // ============================================
  // Service Injection
  // ============================================

  setServices(services: {
    polls?: any;
    predictions?: any;
    giveaways?: any;
    timers?: any;
    obs?: any;
  }): void {
    this.host.setServices(services);
  }

  // ============================================
  // Shutdown
  // ============================================

  async shutdown(): Promise<void> {
    // Broadcast shutdown event
    this.host.broadcastEvent('app:shutdown', { timestamp: Date.now() });

    // Deactivate all plugins
    const activePlugins = this.getActivePlugins();
    for (const plugin of activePlugins) {
      await this.deactivatePlugin(plugin.id);
    }

    // Destroy all sandboxes
    this.sandbox.destroyAllSandboxes();

    this.initialized = false;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async waitForSandboxReady(pluginId: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.sandbox.isSandboxReady(pluginId)) {
        return;
      }
      
      const status = this.sandbox.getSandboxStatus(pluginId);
      if (status === 'error') {
        throw new Error('Sandbox failed to initialize');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Timeout - consider it ready anyway (sandbox might work)
    console.warn(`Sandbox for ${pluginId} did not report ready within timeout`);
  }
}

// Singleton
let instance: PluginManagerService | null = null;

export function getPluginManagerService(): PluginManagerService {
  if (!instance) {
    instance = new PluginManagerService();
  }
  return instance;
}

export function resetPluginManagerService(): void {
  if (instance) {
    instance.shutdown();
  }
  instance = null;
}
