/**
 * TwitchVote Plugin SDK
 * 
 * Este SDK proporciona tipos y utilidades para desarrollar plugins para TwitchVote.
 * 
 * @example
 * ```typescript
 * import { PluginManifest, PluginHostAPI } from '@twitchvote/plugin-sdk';
 * 
 * // Tu código de plugin
 * declare const api: PluginHostAPI;
 * 
 * api.events.on('poll:created', (poll) => {
 *   api.log('info', `Nueva encuesta: ${poll.title}`);
 * });
 * ```
 */

// Re-export all plugin types
export type {
  // Core types
  PluginManifest,
  Plugin,
  PluginStatus,
  PluginPermission,
  PluginError,
  PluginLog,
  
  // Host API
  PluginHostAPI,
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
  
  // Events
  PluginEvent,
  EventHandler,
  
  // UI
  PanelConfig,
  OverlayConfig,
  ToolbarButtonConfig,
  ToastOptions,
  ModalConfig,
  ConfirmOptions,
  
  // Commands
  CommandConfig,
  CommandContext,
  
  // Data types
  PollData,
  PredictionData,
  GiveawayData,
  TimerData,
  OBSStatus,
  OBSScene,
  OBSSource,
  
  // Notifications
  NotificationConfig,
  
  // Results
  PluginInstallResult,
  PluginUpdateResult
} from '../../../types/plugins';

// Export permission descriptions for documentation
export { PERMISSION_DESCRIPTIONS } from '../../../types/plugins';

/**
 * Versión del SDK
 */
export const SDK_VERSION = '1.0.0';

/**
 * Versión mínima de la app requerida
 */
export const MIN_APP_VERSION = '1.0.0';

/**
 * Helper para crear un manifest válido
 */
export function createManifest(config: {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions?: string[];
  configSchema?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: config.id,
    name: config.name,
    version: config.version,
    description: config.description,
    author: config.author,
    minAppVersion: MIN_APP_VERSION,
    permissions: config.permissions || ['storage'],
    main: 'index.js',
    configSchema: config.configSchema,
    defaultConfig: config.defaultConfig
  };
}

/**
 * Helper para validar permisos
 */
export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  return permissions.includes(required);
}

/**
 * Helper para crear un comando
 */
export function createCommand(config: {
  name: string;
  description: string;
  usage?: string;
  handler: (context: { user: string; args: string[]; message: string }) => void;
}): Record<string, unknown> {
  return {
    name: config.name,
    description: config.description,
    usage: config.usage,
    handler: config.handler
  };
}
