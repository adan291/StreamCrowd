/**
 * Notification Types
 * 
 * Types and interfaces for the push notifications and external alerts system.
 * Supports Web Push API, Discord webhooks, and Telegram bot integration.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Types of events that can trigger notifications
 */
export type NotificationEventType =
  | 'follower'
  | 'raid'
  | 'host'
  | 'donation'
  | 'subscription'
  | 'bits'
  | 'poll_ended'
  | 'prediction_resolved'
  | 'giveaway_winner'
  | 'command_executed';

/**
 * Available notification channels
 */
export type NotificationChannel = 'push' | 'discord' | 'telegram';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'normal' | 'high';

/**
 * Notification event that triggers alerts
 */
export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  priority: NotificationPriority;
}

// ============================================================================
// Channel Configurations
// ============================================================================

/**
 * Push notification configuration
 */
export interface PushNotificationConfig {
  enabled: boolean;
  permission: NotificationPermission;
}

/**
 * Discord webhook configuration
 */
export interface DiscordWebhookConfig {
  enabled: boolean;
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

/**
 * Telegram bot configuration
 */
export interface TelegramBotConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/**
 * Event configuration for a specific event type
 */
export interface EventNotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
}

/**
 * Quiet hours configuration
 */
export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

/**
 * Complete alert configuration
 */
export interface AlertConfig {
  channels: {
    push: PushNotificationConfig;
    discord: DiscordWebhookConfig;
    telegram: TelegramBotConfig;
  };
  events: Record<NotificationEventType, EventNotificationConfig>;
  quietHours: QuietHoursConfig;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Result of a notification send attempt
 */
export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  sentAt: number;
}

/**
 * Push Notification Service interface
 */
export interface IPushNotificationService {
  requestPermission(): Promise<NotificationPermission>;
  getPermissionStatus(): NotificationPermission;
  showNotification(title: string, options: NotificationOptions): Promise<void>;
  isSupported(): boolean;
}

/**
 * Discord embed field
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord embed footer
 */
export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

/**
 * Discord embed structure
 */
export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: DiscordEmbedFooter;
}

/**
 * Discord Webhook Service interface
 */
export interface IDiscordWebhookService {
  validateWebhook(url: string): Promise<boolean>;
  sendEmbed(embed: DiscordEmbed): Promise<boolean>;
  sendMessage(content: string): Promise<boolean>;
}

/**
 * Telegram bot validation result
 */
export interface TelegramBotValidationResult {
  valid: boolean;
  botName?: string;
}

/**
 * Telegram Bot Service interface
 */
export interface ITelegramBotService {
  validateBot(token: string): Promise<TelegramBotValidationResult>;
  validateChat(token: string, chatId: string): Promise<boolean>;
  sendMessage(text: string, parseMode?: 'Markdown' | 'HTML'): Promise<boolean>;
}

/**
 * Notification Service (orchestrator) interface
 */
export interface INotificationService {
  notify(event: NotificationEvent): Promise<NotificationResult[]>;
  getEnabledChannels(): NotificationChannel[];
  testChannel(channel: NotificationChannel): Promise<boolean>;
}

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Queued notification waiting to be processed
 */
export interface QueuedNotification {
  id: string;
  event: NotificationEvent;
  channels: NotificationChannel[];
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  nextAttemptAt: number;
}

/**
 * Notification Queue Service interface
 */
export interface INotificationQueueService {
  enqueue(event: NotificationEvent, channels: NotificationChannel[]): Promise<string>;
  process(): Promise<void>;
  getPending(): Promise<QueuedNotification[]>;
  getCount(): number;
  clear(): Promise<void>;
}

// ============================================================================
// History Types
// ============================================================================

/**
 * Entry in the notification history
 */
export interface NotificationHistoryEntry {
  id: string;
  event: NotificationEvent;
  channels: NotificationChannel[];
  results: NotificationResult[];
  createdAt: number;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  sentToday: number;
  failed: number;
  pending: number;
}

/**
 * Notification History Service interface
 */
export interface INotificationHistoryService {
  addEntry(entry: NotificationHistoryEntry): Promise<void>;
  getHistory(): Promise<NotificationHistoryEntry[]>;
  getStats(): Promise<NotificationStats>;
  clear(): Promise<void>;
}

// ============================================================================
// Alert Config Service Interface
// ============================================================================

/**
 * Alert Config Service interface
 */
export interface IAlertConfigService {
  loadConfig(): AlertConfig;
  saveConfig(config: AlertConfig): void;
  isEventEnabled(eventType: NotificationEventType, channel: NotificationChannel): boolean;
  isQuietHoursActive(): boolean;
  getEnabledChannels(): NotificationChannel[];
}

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Storage keys for notification data
 */
export const NOTIFICATION_STORAGE_KEYS = {
  ALERT_CONFIG: 'twitchvote_alert_config',
  NOTIFICATION_HISTORY: 'twitchvote_notification_history',
  NOTIFICATION_QUEUE: 'twitchvote_notification_queue',
} as const;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default alert configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  channels: {
    push: {
      enabled: false,
      permission: 'default',
    },
    discord: {
      enabled: false,
      webhookUrl: '',
    },
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
    },
  },
  events: {
    follower: { enabled: true, channels: ['push'] },
    raid: { enabled: true, channels: ['push', 'discord'] },
    host: { enabled: true, channels: ['push'] },
    donation: { enabled: true, channels: ['push', 'discord', 'telegram'] },
    subscription: { enabled: true, channels: ['push', 'discord'] },
    bits: { enabled: true, channels: ['push', 'discord'] },
    poll_ended: { enabled: true, channels: ['push'] },
    prediction_resolved: { enabled: true, channels: ['push'] },
    giveaway_winner: { enabled: true, channels: ['push', 'discord'] },
    command_executed: { enabled: false, channels: [] },
  },
  quietHours: {
    enabled: false,
    start: '23:00',
    end: '08:00',
  },
};

// ============================================================================
// Event Type Metadata
// ============================================================================

/**
 * Emoji mapping for notification event types (used in Telegram)
 */
export const EVENT_TYPE_EMOJIS: Record<NotificationEventType, string> = {
  follower: '👤',
  raid: '🚀',
  host: '📺',
  donation: '💰',
  subscription: '⭐',
  bits: '💎',
  poll_ended: '📊',
  prediction_resolved: '🎯',
  giveaway_winner: '🎉',
  command_executed: '⚡',
};

/**
 * Color mapping for notification event types (used in Discord embeds)
 */
export const EVENT_TYPE_COLORS: Record<NotificationEventType, number> = {
  follower: 0x9146FF,      // Twitch purple
  raid: 0xFF6B6B,          // Red
  host: 0x4ECDC4,          // Teal
  donation: 0xFFD93D,      // Gold
  subscription: 0x6BCB77,  // Green
  bits: 0xA855F7,          // Purple
  poll_ended: 0x3B82F6,    // Blue
  prediction_resolved: 0xF59E0B, // Amber
  giveaway_winner: 0xEC4899,     // Pink
  command_executed: 0x6B7280,    // Gray
};
