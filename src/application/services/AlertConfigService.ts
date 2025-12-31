/**
 * AlertConfigService
 * 
 * Service for managing notification alert configuration.
 * Handles loading/saving config, event filtering, quiet hours, and channel management.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import {
  AlertConfig,
  NotificationChannel,
  NotificationEventType,
  IAlertConfigService,
  NOTIFICATION_STORAGE_KEYS,
  DEFAULT_ALERT_CONFIG,
} from '../../../types/notifications';

/**
 * Parse time string in HH:mm format to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') {
    return 0;
  }
  
  const parts = time.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Check if a given time (in minutes since midnight) is within quiet hours range
 */
export function isTimeInQuietHours(
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  // Handle overnight quiet hours (e.g., 23:00 to 08:00)
  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Quiet hours within same day
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Validate and sanitize an AlertConfig object
 */
export function validateAlertConfig(config: unknown): AlertConfig {
  if (!config || typeof config !== 'object') {
    return { ...DEFAULT_ALERT_CONFIG };
  }

  const rawConfig = config as Partial<AlertConfig>;
  
  // Deep clone default config as base
  const validConfig: AlertConfig = JSON.parse(JSON.stringify(DEFAULT_ALERT_CONFIG));

  // Validate channels
  if (rawConfig.channels && typeof rawConfig.channels === 'object') {
    // Push config
    if (rawConfig.channels.push && typeof rawConfig.channels.push === 'object') {
      validConfig.channels.push = {
        enabled: Boolean(rawConfig.channels.push.enabled),
        permission: rawConfig.channels.push.permission || 'default',
      };
    }

    // Discord config
    if (rawConfig.channels.discord && typeof rawConfig.channels.discord === 'object') {
      validConfig.channels.discord = {
        enabled: Boolean(rawConfig.channels.discord.enabled),
        webhookUrl: String(rawConfig.channels.discord.webhookUrl || ''),
        username: rawConfig.channels.discord.username ? String(rawConfig.channels.discord.username) : undefined,
        avatarUrl: rawConfig.channels.discord.avatarUrl ? String(rawConfig.channels.discord.avatarUrl) : undefined,
      };
    }

    // Telegram config
    if (rawConfig.channels.telegram && typeof rawConfig.channels.telegram === 'object') {
      validConfig.channels.telegram = {
        enabled: Boolean(rawConfig.channels.telegram.enabled),
        botToken: String(rawConfig.channels.telegram.botToken || ''),
        chatId: String(rawConfig.channels.telegram.chatId || ''),
      };
    }
  }

  // Validate events
  if (rawConfig.events && typeof rawConfig.events === 'object') {
    const eventTypes: NotificationEventType[] = [
      'follower', 'raid', 'host', 'donation', 'subscription',
      'bits', 'poll_ended', 'prediction_resolved', 'giveaway_winner', 'command_executed'
    ];

    for (const eventType of eventTypes) {
      const eventConfig = rawConfig.events[eventType];
      if (eventConfig && typeof eventConfig === 'object') {
        validConfig.events[eventType] = {
          enabled: Boolean(eventConfig.enabled),
          channels: Array.isArray(eventConfig.channels)
            ? eventConfig.channels.filter((c): c is NotificationChannel =>
                c === 'push' || c === 'discord' || c === 'telegram'
              )
            : [],
        };
      }
    }
  }

  // Validate quiet hours
  if (rawConfig.quietHours && typeof rawConfig.quietHours === 'object') {
    validConfig.quietHours = {
      enabled: Boolean(rawConfig.quietHours.enabled),
      start: typeof rawConfig.quietHours.start === 'string' ? rawConfig.quietHours.start : '23:00',
      end: typeof rawConfig.quietHours.end === 'string' ? rawConfig.quietHours.end : '08:00',
    };
  }

  return validConfig;
}

/**
 * AlertConfigService singleton instance
 */
let alertConfigServiceInstance: AlertConfigService | null = null;

/**
 * Reset the AlertConfigService singleton (for testing)
 */
export function resetAlertConfigService(): void {
  alertConfigServiceInstance = null;
}

/**
 * AlertConfigService implementation
 * 
 * Manages notification alert configuration including:
 * - Loading and saving configuration to localStorage
 * - Event type filtering per channel
 * - Quiet hours enforcement
 * - Channel enablement status
 */
export class AlertConfigService implements IAlertConfigService {
  private config: AlertConfig;
  private storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : this.createMemoryStorage());
    this.config = this.loadConfig();
  }

  /**
   * Create an in-memory storage fallback for environments without localStorage
   */
  private createMemoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
      clear: () => data.clear(),
      get length() { return data.size; },
      key: (index: number) => Array.from(data.keys())[index] ?? null,
    };
  }

  /**
   * Get the singleton instance of AlertConfigService
   */
  static getInstance(storage?: Storage): AlertConfigService {
    if (!alertConfigServiceInstance) {
      alertConfigServiceInstance = new AlertConfigService(storage);
    }
    return alertConfigServiceInstance;
  }

  /**
   * Load configuration from storage
   * Returns default config if no saved config exists or if parsing fails
   * 
   * @requirements 4.4
   */
  loadConfig(): AlertConfig {
    try {
      const stored = this.storage.getItem(NOTIFICATION_STORAGE_KEYS.ALERT_CONFIG);
      if (!stored) {
        return { ...DEFAULT_ALERT_CONFIG };
      }

      const parsed = JSON.parse(stored);
      return validateAlertConfig(parsed);
    } catch {
      return { ...DEFAULT_ALERT_CONFIG };
    }
  }

  /**
   * Save configuration to storage
   * 
   * @requirements 4.4
   */
  saveConfig(config: AlertConfig): void {
    const validConfig = validateAlertConfig(config);
    this.config = validConfig;
    
    try {
      this.storage.setItem(
        NOTIFICATION_STORAGE_KEYS.ALERT_CONFIG,
        JSON.stringify(validConfig)
      );
    } catch (error) {
      console.error('Failed to save alert config:', error);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AlertConfig {
    return this.config;
  }

  /**
   * Check if a specific event type is enabled for a specific channel
   * 
   * @requirements 4.1, 4.2, 4.3
   */
  isEventEnabled(eventType: NotificationEventType, channel: NotificationChannel): boolean {
    // Check if the channel itself is enabled
    const channelConfig = this.config.channels[channel];
    if (!channelConfig || !channelConfig.enabled) {
      return false;
    }

    // Check if the event type is enabled and includes this channel
    const eventConfig = this.config.events[eventType];
    if (!eventConfig || !eventConfig.enabled) {
      return false;
    }

    // Check if the channel is in the event's channel list
    return eventConfig.channels.includes(channel);
  }

  /**
   * Check if quiet hours are currently active
   * 
   * @requirements 4.5, 4.6
   */
  isQuietHoursActive(currentDate?: Date): boolean {
    if (!this.config.quietHours.enabled) {
      return false;
    }

    const now = currentDate || new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const startMinutes = parseTimeToMinutes(this.config.quietHours.start);
    const endMinutes = parseTimeToMinutes(this.config.quietHours.end);

    return isTimeInQuietHours(currentMinutes, startMinutes, endMinutes);
  }

  /**
   * Get list of enabled notification channels
   * 
   * @requirements 4.1
   */
  getEnabledChannels(): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (this.config.channels.push.enabled) {
      channels.push('push');
    }
    if (this.config.channels.discord.enabled) {
      channels.push('discord');
    }
    if (this.config.channels.telegram.enabled) {
      channels.push('telegram');
    }

    return channels;
  }

  /**
   * Get channels that should receive a notification for a specific event type
   * Takes into account both channel enablement and event configuration
   * 
   * @requirements 4.1, 4.2, 4.3
   */
  getChannelsForEvent(eventType: NotificationEventType): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Check each channel
    const allChannels: NotificationChannel[] = ['push', 'discord', 'telegram'];
    for (const channel of allChannels) {
      if (this.isEventEnabled(eventType, channel)) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * Update a specific channel's configuration
   */
  updateChannelConfig<K extends NotificationChannel>(
    channel: K,
    config: Partial<AlertConfig['channels'][K]>
  ): void {
    this.config.channels[channel] = {
      ...this.config.channels[channel],
      ...config,
    } as AlertConfig['channels'][K];
    
    this.saveConfig(this.config);
  }

  /**
   * Update a specific event's configuration
   */
  updateEventConfig(
    eventType: NotificationEventType,
    config: Partial<AlertConfig['events'][NotificationEventType]>
  ): void {
    this.config.events[eventType] = {
      ...this.config.events[eventType],
      ...config,
    };
    
    this.saveConfig(this.config);
  }

  /**
   * Update quiet hours configuration
   */
  updateQuietHours(config: Partial<AlertConfig['quietHours']>): void {
    this.config.quietHours = {
      ...this.config.quietHours,
      ...config,
    };
    
    this.saveConfig(this.config);
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_ALERT_CONFIG };
    this.saveConfig(this.config);
  }
}

export default AlertConfigService;
