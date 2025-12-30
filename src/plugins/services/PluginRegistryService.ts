// Plugin Registry Service - Gestiona el registro de plugins instalados
import {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginInstallResult,
  PluginUpdateResult,
  PluginLog
} from '../../../types/plugins';

const STORAGE_KEY = 'twitchvote_plugins';
const MAX_LOGS_PER_PLUGIN = 100;

export class PluginRegistryService {
  private plugins: Map<string, Plugin> = new Map();
  private listeners: Set<(plugins: Plugin[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ============================================
  // Installation
  // ============================================

  async install(manifest: PluginManifest, code: string): Promise<PluginInstallResult> {
    // Check if already installed
    if (this.plugins.has(manifest.id)) {
      return {
        success: false,
        error: `Plugin "${manifest.id}" ya está instalado`
      };
    }

    const plugin: Plugin = {
      id: manifest.id,
      manifest,
      status: 'installed',
      config: manifest.defaultConfig || {},
      code,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      logs: []
    };

    this.plugins.set(manifest.id, plugin);
    this.saveToStorage();
    this.notifyListeners();

    return { success: true, plugin };
  }

  // ============================================
  // Uninstallation
  // ============================================

  async uninstall(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Can't uninstall active plugins
    if (plugin.status === 'active') {
      throw new Error('Desactiva el plugin antes de desinstalarlo');
    }

    this.plugins.delete(pluginId);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  // ============================================
  // Update
  // ============================================

  async update(
    pluginId: string,
    manifest: PluginManifest,
    code: string
  ): Promise<PluginUpdateResult> {
    const existing = this.plugins.get(pluginId);
    if (!existing) {
      return {
        success: false,
        error: `Plugin "${pluginId}" no está instalado`
      };
    }

    // Can't update active plugins
    if (existing.status === 'active') {
      return {
        success: false,
        error: 'Desactiva el plugin antes de actualizarlo'
      };
    }

    const previousVersion = existing.manifest.version;

    // Preserve user config, merge with new defaults
    const mergedConfig = {
      ...manifest.defaultConfig,
      ...existing.config
    };

    const updatedPlugin: Plugin = {
      ...existing,
      manifest,
      code,
      config: mergedConfig,
      updatedAt: Date.now(),
      error: undefined // Clear any previous errors
    };

    this.plugins.set(pluginId, updatedPlugin);
    this.saveToStorage();
    this.notifyListeners();

    return {
      success: true,
      plugin: updatedPlugin,
      previousVersion
    };
  }

  // ============================================
  // Status Management
  // ============================================

  setStatus(pluginId: string, status: PluginStatus): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.status = status;
    if (status === 'active') {
      plugin.lastActiveAt = Date.now();
    }
    
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  setError(pluginId: string, error: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.status = 'error';
    plugin.error = {
      code: 'RUNTIME_ERROR',
      message: error,
      timestamp: Date.now()
    };

    this.addLog(pluginId, 'error', error);
    this.saveToStorage();
    this.notifyListeners();
  }

  clearError(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.error = undefined;
    if (plugin.status === 'error') {
      plugin.status = 'installed';
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  // ============================================
  // Configuration
  // ============================================

  getConfig(pluginId: string): Record<string, unknown> {
    const plugin = this.plugins.get(pluginId);
    return plugin?.config || {};
  }

  setConfig(pluginId: string, config: Record<string, unknown>): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.config = { ...plugin.config, ...config };
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  resetConfig(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.config = plugin.manifest.defaultConfig || {};
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  // ============================================
  // Queries
  // ============================================

  getPlugin(id: string): Plugin | null {
    return this.plugins.get(id) || null;
  }

  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): Plugin[] {
    return this.listPlugins().filter(p => p.status === 'active');
  }

  getInstalledPlugins(): Plugin[] {
    return this.listPlugins().filter(p => p.status !== 'error');
  }

  getPluginsByStatus(status: PluginStatus): Plugin[] {
    return this.listPlugins().filter(p => p.status === status);
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  // ============================================
  // Logging
  // ============================================

  addLog(pluginId: string, level: PluginLog['level'], message: string, data?: unknown): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const log: PluginLog = {
      level,
      message,
      data,
      timestamp: Date.now()
    };

    plugin.logs.push(log);

    // Keep only last N logs
    if (plugin.logs.length > MAX_LOGS_PER_PLUGIN) {
      plugin.logs = plugin.logs.slice(-MAX_LOGS_PER_PLUGIN);
    }

    this.saveToStorage();
  }

  getLogs(pluginId: string, level?: PluginLog['level']): PluginLog[] {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return [];

    if (level) {
      return plugin.logs.filter(l => l.level === level);
    }
    return [...plugin.logs];
  }

  clearLogs(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.logs = [];
    this.saveToStorage();
  }

  // ============================================
  // Listeners
  // ============================================

  subscribe(listener: (plugins: Plugin[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const plugins = this.listPlugins();
    this.listeners.forEach(listener => listener(plugins));
  }

  // ============================================
  // Persistence
  // ============================================

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const plugins = JSON.parse(data) as Plugin[];
        plugins.forEach(plugin => {
          // Reset active plugins to installed on load
          if (plugin.status === 'active') {
            plugin.status = 'installed';
          }
          this.plugins.set(plugin.id, plugin);
        });
      }
    } catch (error) {
      console.error('Failed to load plugins from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const plugins = this.listPlugins();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
    } catch (error) {
      console.error('Failed to save plugins to storage:', error);
    }
  }

  // ============================================
  // Import/Export
  // ============================================

  exportPlugin(pluginId: string): string | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    return JSON.stringify({
      manifest: plugin.manifest,
      code: plugin.code,
      config: plugin.config
    });
  }

  async importPlugin(data: string): Promise<PluginInstallResult> {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.manifest || !parsed.code) {
        return { success: false, error: 'Datos de plugin inválidos' };
      }

      const result = await this.install(parsed.manifest, parsed.code);
      if (result.success && parsed.config) {
        this.setConfig(parsed.manifest.id, parsed.config);
      }
      return result;
    } catch {
      return { success: false, error: 'Error parseando datos del plugin' };
    }
  }

  // ============================================
  // Utilities
  // ============================================

  clearAll(): void {
    this.plugins.clear();
    this.saveToStorage();
    this.notifyListeners();
  }
}

// Singleton
let instance: PluginRegistryService | null = null;

export function getPluginRegistryService(): PluginRegistryService {
  if (!instance) {
    instance = new PluginRegistryService();
  }
  return instance;
}

export function resetPluginRegistryService(): void {
  instance = null;
}
