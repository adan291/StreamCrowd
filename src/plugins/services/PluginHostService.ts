// Plugin Host Service - Implementa la API expuesta a plugins
import {
  Plugin,
  PluginHostAPI,
  PluginPermission,
  PluginEvent,
  EventHandler,
  PollsAPI,
  PredictionsAPI,
  GiveawaysAPI,
  TimersAPI,
  OBSAPI,
  StorageAPI,
  EventsAPI,
  UIAPI,
  CommandsAPI,
  NotificationsAPI,
  PollData,
  PredictionData,
  GiveawayData,
  TimerData,
  OBSStatus,
  OBSScene,
  OBSSource,
  CommandConfig,
  PanelConfig,
  OverlayConfig,
  ToolbarButtonConfig,
  ToastOptions,
  ModalConfig,
  ConfirmOptions,
  NotificationConfig,
  PluginLog
} from '../../../types/plugins';
import { getPluginRegistryService } from './PluginRegistryService';

const STORAGE_PREFIX = 'plugin_storage_';

export class PluginHostService {
  private eventHandlers: Map<string, Map<PluginEvent, Set<EventHandler>>> = new Map();
  private pluginStorage: Map<string, Map<string, unknown>> = new Map();
  private registeredCommands: Map<string, Map<string, CommandConfig>> = new Map();
  private registeredPanels: Map<string, Map<string, PanelConfig>> = new Map();
  private registeredOverlays: Map<string, Map<string, OverlayConfig>> = new Map();
  private registeredToolbarButtons: Map<string, Map<string, ToolbarButtonConfig>> = new Map();

  // External service references (to be injected)
  private pollService: any = null;
  private predictionService: any = null;
  private giveawayService: any = null;
  private timerService: any = null;
  private obsService: any = null;

  constructor() {
    this.loadStorageFromPersistence();
  }

  // ============================================
  // Host API Creation
  // ============================================

  createHostAPI(plugin: Plugin): PluginHostAPI {
    const permissions = plugin.manifest.permissions;

    return {
      // Core APIs (permission-gated)
      polls: this.createPollsAPI(plugin.id, permissions),
      predictions: this.createPredictionsAPI(plugin.id, permissions),
      giveaways: this.createGiveawaysAPI(plugin.id, permissions),
      timers: this.createTimersAPI(plugin.id, permissions),
      obs: this.createOBSAPI(plugin.id, permissions),

      // Utilities
      events: this.createEventsAPI(plugin.id),
      storage: this.createStorageAPI(plugin.id, permissions),
      ui: this.createUIAPI(plugin.id, permissions),
      commands: this.createCommandsAPI(plugin.id, permissions),
      notifications: this.createNotificationsAPI(plugin.id, permissions),

      // Plugin info
      getManifest: () => plugin.manifest,
      getConfig: <T = Record<string, unknown>>() => getPluginRegistryService().getConfig(plugin.id) as T,
      setConfig: async (config) => {
        getPluginRegistryService().setConfig(plugin.id, config as Record<string, unknown>);
      },
      log: (level, message, data) => this.logFromPlugin(plugin.id, level, message, data)
    };
  }

  // ============================================
  // Polls API
  // ============================================

  private createPollsAPI(pluginId: string, permissions: PluginPermission[]): PollsAPI {
    const canRead = this.hasPermission(permissions, 'polls:read');
    const canWrite = this.hasPermission(permissions, 'polls:write');

    return {
      list: async () => {
        this.requirePermission(canRead, 'polls:read');
        return this.pollService?.list() || [];
      },
      get: async (id: string) => {
        this.requirePermission(canRead, 'polls:read');
        return this.pollService?.get(id) || null;
      },
      create: async (poll) => {
        this.requirePermission(canWrite, 'polls:write');
        return this.pollService?.create(poll);
      },
      update: async (id, updates) => {
        this.requirePermission(canWrite, 'polls:write');
        return this.pollService?.update(id, updates);
      },
      delete: async (id) => {
        this.requirePermission(canWrite, 'polls:write');
        return this.pollService?.delete(id);
      },
      start: async (id) => {
        this.requirePermission(canWrite, 'polls:write');
        return this.pollService?.start(id);
      },
      stop: async (id) => {
        this.requirePermission(canWrite, 'polls:write');
        return this.pollService?.stop(id);
      },
      getResults: async (id) => {
        this.requirePermission(canRead, 'polls:read');
        return this.pollService?.getResults(id);
      }
    };
  }

  // ============================================
  // Predictions API
  // ============================================

  private createPredictionsAPI(pluginId: string, permissions: PluginPermission[]): PredictionsAPI {
    const canRead = this.hasPermission(permissions, 'predictions:read');
    const canWrite = this.hasPermission(permissions, 'predictions:write');

    return {
      list: async () => {
        this.requirePermission(canRead, 'predictions:read');
        return this.predictionService?.list() || [];
      },
      get: async (id) => {
        this.requirePermission(canRead, 'predictions:read');
        return this.predictionService?.get(id) || null;
      },
      create: async (prediction) => {
        this.requirePermission(canWrite, 'predictions:write');
        return this.predictionService?.create(prediction);
      },
      lock: async (id) => {
        this.requirePermission(canWrite, 'predictions:write');
        return this.predictionService?.lock(id);
      },
      resolve: async (id, winningOutcomeId) => {
        this.requirePermission(canWrite, 'predictions:write');
        return this.predictionService?.resolve(id, winningOutcomeId);
      },
      cancel: async (id) => {
        this.requirePermission(canWrite, 'predictions:write');
        return this.predictionService?.cancel(id);
      }
    };
  }

  // ============================================
  // Giveaways API
  // ============================================

  private createGiveawaysAPI(pluginId: string, permissions: PluginPermission[]): GiveawaysAPI {
    const canRead = this.hasPermission(permissions, 'giveaways:read');
    const canWrite = this.hasPermission(permissions, 'giveaways:write');

    return {
      list: async () => {
        this.requirePermission(canRead, 'giveaways:read');
        return this.giveawayService?.list() || [];
      },
      get: async (id) => {
        this.requirePermission(canRead, 'giveaways:read');
        return this.giveawayService?.get(id) || null;
      },
      create: async (giveaway) => {
        this.requirePermission(canWrite, 'giveaways:write');
        return this.giveawayService?.create(giveaway);
      },
      start: async (id) => {
        this.requirePermission(canWrite, 'giveaways:write');
        return this.giveawayService?.start(id);
      },
      draw: async (id) => {
        this.requirePermission(canWrite, 'giveaways:write');
        return this.giveawayService?.draw(id);
      },
      getParticipants: async (id) => {
        this.requirePermission(canRead, 'giveaways:read');
        return this.giveawayService?.getParticipants(id) || [];
      }
    };
  }

  // ============================================
  // Timers API
  // ============================================

  private createTimersAPI(pluginId: string, permissions: PluginPermission[]): TimersAPI {
    const canRead = this.hasPermission(permissions, 'timers:read');
    const canWrite = this.hasPermission(permissions, 'timers:write');

    return {
      list: async () => {
        this.requirePermission(canRead, 'timers:read');
        return this.timerService?.list() || [];
      },
      get: async (id) => {
        this.requirePermission(canRead, 'timers:read');
        return this.timerService?.get(id) || null;
      },
      create: async (timer) => {
        this.requirePermission(canWrite, 'timers:write');
        return this.timerService?.create(timer);
      },
      start: async (id) => {
        this.requirePermission(canWrite, 'timers:write');
        return this.timerService?.start(id);
      },
      pause: async (id) => {
        this.requirePermission(canWrite, 'timers:write');
        return this.timerService?.pause(id);
      },
      reset: async (id) => {
        this.requirePermission(canWrite, 'timers:write');
        return this.timerService?.reset(id);
      },
      delete: async (id) => {
        this.requirePermission(canWrite, 'timers:write');
        return this.timerService?.delete(id);
      }
    };
  }

  // ============================================
  // OBS API
  // ============================================

  private createOBSAPI(pluginId: string, permissions: PluginPermission[]): OBSAPI {
    const canRead = this.hasPermission(permissions, 'obs:read');
    const canWrite = this.hasPermission(permissions, 'obs:write');

    return {
      getStatus: async () => {
        this.requirePermission(canRead, 'obs:read');
        return this.obsService?.getStatus() || { connected: false };
      },
      getScenes: async () => {
        this.requirePermission(canRead, 'obs:read');
        return this.obsService?.getScenes() || [];
      },
      getCurrentScene: async () => {
        this.requirePermission(canRead, 'obs:read');
        return this.obsService?.getCurrentScene() || '';
      },
      switchScene: async (sceneName) => {
        this.requirePermission(canWrite, 'obs:write');
        return this.obsService?.switchScene(sceneName);
      },
      getSources: async (sceneName) => {
        this.requirePermission(canRead, 'obs:read');
        return this.obsService?.getSources(sceneName) || [];
      },
      setSourceVisibility: async (sourceName, visible, sceneName) => {
        this.requirePermission(canWrite, 'obs:write');
        return this.obsService?.setSourceVisibility(sourceName, visible, sceneName);
      }
    };
  }

  // ============================================
  // Events API
  // ============================================

  private createEventsAPI(pluginId: string): EventsAPI {
    // Initialize handlers map for this plugin
    if (!this.eventHandlers.has(pluginId)) {
      this.eventHandlers.set(pluginId, new Map());
    }

    const handlers = this.eventHandlers.get(pluginId)!;

    return {
      on: (event, handler) => {
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(handler);
        return () => this.removeEventHandler(pluginId, event, handler);
      },
      off: (event, handler) => {
        this.removeEventHandler(pluginId, event, handler);
      },
      once: (event, handler) => {
        const wrapper: EventHandler = (data) => {
          this.removeEventHandler(pluginId, event, wrapper);
          handler(data);
        };
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(wrapper);
        return () => this.removeEventHandler(pluginId, event, wrapper);
      },
      emit: (event, data) => {
        // Plugin custom events are prefixed
        this.broadcastEvent(`plugin:${pluginId}:${event}` as PluginEvent, data);
      }
    };
  }

  private removeEventHandler(pluginId: string, event: PluginEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(pluginId);
    if (handlers?.has(event)) {
      handlers.get(event)!.delete(handler);
    }
  }

  // ============================================
  // Storage API
  // ============================================

  private createStorageAPI(pluginId: string, permissions: PluginPermission[]): StorageAPI {
    const hasStorage = this.hasPermission(permissions, 'storage');

    // Initialize storage for this plugin
    if (!this.pluginStorage.has(pluginId)) {
      this.pluginStorage.set(pluginId, new Map());
    }

    const storage = this.pluginStorage.get(pluginId)!;

    return {
      get: async <T>(key: string) => {
        this.requirePermission(hasStorage, 'storage');
        return (storage.get(key) as T) || null;
      },
      set: async <T>(key: string, value: T) => {
        this.requirePermission(hasStorage, 'storage');
        storage.set(key, value);
        this.saveStorageToPersistence(pluginId);
      },
      remove: async (key: string) => {
        this.requirePermission(hasStorage, 'storage');
        storage.delete(key);
        this.saveStorageToPersistence(pluginId);
      },
      clear: async () => {
        this.requirePermission(hasStorage, 'storage');
        storage.clear();
        this.saveStorageToPersistence(pluginId);
      },
      keys: async () => {
        this.requirePermission(hasStorage, 'storage');
        return Array.from(storage.keys());
      },
      size: async () => {
        this.requirePermission(hasStorage, 'storage');
        return storage.size;
      }
    };
  }

  // ============================================
  // UI API
  // ============================================

  private createUIAPI(pluginId: string, permissions: PluginPermission[]): UIAPI {
    const canPanel = this.hasPermission(permissions, 'ui:panel');
    const canOverlay = this.hasPermission(permissions, 'ui:overlay');
    const canToolbar = this.hasPermission(permissions, 'ui:toolbar');

    // Initialize UI registries
    if (!this.registeredPanels.has(pluginId)) {
      this.registeredPanels.set(pluginId, new Map());
    }
    if (!this.registeredOverlays.has(pluginId)) {
      this.registeredOverlays.set(pluginId, new Map());
    }
    if (!this.registeredToolbarButtons.has(pluginId)) {
      this.registeredToolbarButtons.set(pluginId, new Map());
    }

    return {
      registerPanel: (config) => {
        this.requirePermission(canPanel, 'ui:panel');
        const id = config.id || `panel-${Date.now()}`;
        this.registeredPanels.get(pluginId)!.set(id, { ...config, id });
        return id;
      },
      unregisterPanel: (id) => {
        this.registeredPanels.get(pluginId)?.delete(id);
      },
      registerOverlay: (config) => {
        this.requirePermission(canOverlay, 'ui:overlay');
        const id = config.id || `overlay-${Date.now()}`;
        this.registeredOverlays.get(pluginId)!.set(id, { ...config, id });
        return id;
      },
      unregisterOverlay: (id) => {
        this.registeredOverlays.get(pluginId)?.delete(id);
      },
      registerToolbarButton: (config) => {
        this.requirePermission(canToolbar, 'ui:toolbar');
        const id = config.id || `toolbar-${Date.now()}`;
        this.registeredToolbarButtons.get(pluginId)!.set(id, { ...config, id });
        return id;
      },
      unregisterToolbarButton: (id) => {
        this.registeredToolbarButtons.get(pluginId)?.delete(id);
      },
      showToast: (message, options) => {
        // Emit toast event for UI to handle
        this.broadcastEvent('ui:toast' as PluginEvent, { message, ...options, pluginId });
      },
      showModal: async (config) => {
        // This would need to be handled by the UI layer
        return new Promise((resolve) => {
          this.broadcastEvent('ui:modal' as PluginEvent, { 
            ...config, 
            pluginId,
            onClose: resolve 
          });
        });
      },
      showConfirm: async (message, options) => {
        return new Promise((resolve) => {
          this.broadcastEvent('ui:confirm' as PluginEvent, {
            message,
            ...options,
            pluginId,
            onResult: resolve
          });
        });
      }
    };
  }

  // ============================================
  // Commands API
  // ============================================

  private createCommandsAPI(pluginId: string, permissions: PluginPermission[]): CommandsAPI {
    const canCommands = this.hasPermission(permissions, 'commands');

    if (!this.registeredCommands.has(pluginId)) {
      this.registeredCommands.set(pluginId, new Map());
    }

    return {
      register: (command) => {
        this.requirePermission(canCommands, 'commands');
        this.registeredCommands.get(pluginId)!.set(command.name, command);
        return () => this.registeredCommands.get(pluginId)?.delete(command.name);
      },
      unregister: (name) => {
        this.registeredCommands.get(pluginId)?.delete(name);
      },
      list: () => {
        const commands: Array<{ name: string; description: string; usage?: string; pluginId: string }> = [];
        for (const [pId, cmds] of this.registeredCommands) {
          for (const [name, cmd] of cmds) {
            commands.push({
              name,
              description: cmd.description,
              usage: cmd.usage,
              pluginId: pId
            });
          }
        }
        return commands;
      }
    };
  }

  // ============================================
  // Notifications API
  // ============================================

  private createNotificationsAPI(pluginId: string, permissions: PluginPermission[]): NotificationsAPI {
    const canNotify = this.hasPermission(permissions, 'notifications');

    return {
      show: (notification) => {
        this.requirePermission(canNotify, 'notifications');
        this.broadcastEvent('notification:show' as PluginEvent, { ...notification, pluginId });
      },
      requestPermission: async () => {
        if ('Notification' in window) {
          const result = await Notification.requestPermission();
          return result === 'granted';
        }
        return false;
      },
      hasPermission: () => {
        if ('Notification' in window) {
          return Notification.permission === 'granted';
        }
        return false;
      }
    };
  }

  // ============================================
  // Event Broadcasting
  // ============================================

  broadcastEvent(event: PluginEvent, data: unknown): void {
    // Notify internal listeners
    this.notifyEventListeners(event, data);
    
    // Notify plugin handlers
    for (const [pluginId, handlers] of this.eventHandlers) {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in plugin ${pluginId} event handler:`, error);
          }
        }
      }
    }
  }

  // Internal event listeners (for app components)
  private internalEventListeners: Set<(event: PluginEvent, data: unknown) => void> = new Set();

  onEvent(listener: (event: PluginEvent, data: unknown) => void): () => void {
    this.internalEventListeners.add(listener);
    return () => {
      this.internalEventListeners.delete(listener);
    };
  }

  private notifyEventListeners(event: PluginEvent, data: unknown): void {
    for (const listener of this.internalEventListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  // ============================================
  // Command Execution
  // ============================================

  executeCommand(commandName: string, args: string[], context: any): boolean {
    for (const [pluginId, commands] of this.registeredCommands) {
      const command = commands.get(commandName);
      if (command) {
        try {
          command.handler(context);
          return true;
        } catch (error) {
          console.error(`Error executing command ${commandName} from plugin ${pluginId}:`, error);
          return false;
        }
      }
    }
    return false;
  }

  getRegisteredCommands(): Map<string, Map<string, CommandConfig>> {
    return this.registeredCommands;
  }

  // ============================================
  // UI Registry Access
  // ============================================

  getRegisteredPanels(): Map<string, Map<string, PanelConfig>> {
    return this.registeredPanels;
  }

  getRegisteredOverlays(): Map<string, Map<string, OverlayConfig>> {
    return this.registeredOverlays;
  }

  getRegisteredToolbarButtons(): Map<string, Map<string, ToolbarButtonConfig>> {
    return this.registeredToolbarButtons;
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
    if (services.polls) this.pollService = services.polls;
    if (services.predictions) this.predictionService = services.predictions;
    if (services.giveaways) this.giveawayService = services.giveaways;
    if (services.timers) this.timerService = services.timers;
    if (services.obs) this.obsService = services.obs;
  }

  // ============================================
  // Plugin Cleanup
  // ============================================

  cleanupPlugin(pluginId: string): void {
    this.eventHandlers.delete(pluginId);
    this.registeredCommands.delete(pluginId);
    this.registeredPanels.delete(pluginId);
    this.registeredOverlays.delete(pluginId);
    this.registeredToolbarButtons.delete(pluginId);
    // Note: Storage is preserved for reinstallation
  }

  clearPluginStorage(pluginId: string): void {
    this.pluginStorage.delete(pluginId);
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${pluginId}`);
    } catch (e) {
      console.error('Failed to clear plugin storage:', e);
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private hasPermission(permissions: PluginPermission[], required: PluginPermission): boolean {
    return permissions.includes(required);
  }

  private requirePermission(hasPermission: boolean, permission: PluginPermission): void {
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  private logFromPlugin(pluginId: string, level: PluginLog['level'], message: string, data?: unknown): void {
    getPluginRegistryService().addLog(pluginId, level, message, data);
  }

  private loadStorageFromPersistence(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      for (const key of keys) {
        const pluginId = key.replace(STORAGE_PREFIX, '');
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          this.pluginStorage.set(pluginId, new Map(Object.entries(parsed)));
        }
      }
    } catch (e) {
      console.error('Failed to load plugin storage:', e);
    }
  }

  private saveStorageToPersistence(pluginId: string): void {
    try {
      const storage = this.pluginStorage.get(pluginId);
      if (storage) {
        const obj = Object.fromEntries(storage);
        localStorage.setItem(`${STORAGE_PREFIX}${pluginId}`, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Failed to save plugin storage:', e);
    }
  }
}

// Singleton
let instance: PluginHostService | null = null;

export function getPluginHostService(): PluginHostService {
  if (!instance) {
    instance = new PluginHostService();
  }
  return instance;
}

export function resetPluginHostService(): void {
  instance = null;
}
