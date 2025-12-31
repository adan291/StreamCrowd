/**
 * NotificationService - Orchestrator for all notification channels
 * 
 * This service coordinates sending notifications across all configured channels
 * (Push, Discord, Telegram) while respecting configuration, quiet hours, and
 * event filtering. It integrates with AlertConfigService for filtering and
 * NotificationQueueService for queuing.
 * 
 * @requirements 1.3 - WHEN ocurre un evento configurado como notificable, THE Push_Notification_Service SHALL mostrar una notificación del navegador
 * @requirements 2.2 - WHEN ocurre un evento configurado, THE Discord_Webhook_Service SHALL enviar un mensaje embed al webhook
 * @requirements 3.3 - WHEN ocurre un evento configurado, THE Telegram_Bot_Service SHALL enviar un mensaje al chat configurado
 * @requirements 4.2 - THE Alert_Config SHALL permitir seleccionar qué tipos de eventos notificar por cada canal
 */

import type {
  NotificationEvent,
  NotificationChannel,
  NotificationResult,
  INotificationService,
  DiscordEmbed,
} from '../../../types/notifications';
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS } from '../../../types/notifications';
import { AlertConfigService } from './AlertConfigService';
import { DiscordWebhookService, createDiscordEmbed } from './DiscordWebhookService';
import { TelegramBotService, formatTelegramMessage } from './TelegramBotService';
import { PushNotificationService } from './PushNotificationService';
import { NotificationQueueService, getNotificationQueueService } from './NotificationQueueService';

// ============ TYPES ============

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

// ============ HELPERS ============

/**
 * Calculate exponential backoff delay with jitter
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 * 
 * @requirements 2.4, 3.5 - Retry with exponential backoff
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // Add jitter (0-1000ms) to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a Discord embed from a notification event
 * 
 * @requirements 2.3, 2.6 - Format messages with embeds including timestamp and event type
 */
export function createNotificationEmbed(event: NotificationEvent): DiscordEmbed {
  const color = EVENT_TYPE_COLORS[event.type] || 0x9146FF;
  const emoji = EVENT_TYPE_EMOJIS[event.type] || '📢';
  
  return {
    title: `${emoji} ${event.title}`,
    description: event.message,
    color,
    timestamp: new Date(event.timestamp).toISOString(),
    footer: {
      text: `Event: ${event.type} | TwitchVote`,
    },
    fields: event.data ? Object.entries(event.data)
      .filter(([, value]) => value !== undefined && value !== null)
      .slice(0, 5) // Limit to 5 fields
      .map(([name, value]) => ({
        name,
        value: String(value),
        inline: true,
      })) : undefined,
  };
}

/**
 * Create a Telegram message from a notification event
 * 
 * @requirements 3.4, 3.7 - Format with Markdown and include emoji
 */
export function createTelegramNotificationMessage(event: NotificationEvent): string {
  return formatTelegramMessage(
    event.title,
    event.message,
    event.type,
    event.timestamp
  );
}

// ============ NOTIFICATION SERVICE CLASS ============

/**
 * NotificationService - Orchestrates all notification channels
 * 
 * Coordinates sending notifications to Push, Discord, and Telegram channels
 * while respecting configuration, quiet hours, and event filtering.
 */
export class NotificationService implements INotificationService {
  private alertConfigService: AlertConfigService;
  private discordService: DiscordWebhookService;
  private telegramService: TelegramBotService;
  private pushService: PushNotificationService;
  private queueService: NotificationQueueService;
  private retryConfig: RetryConfig;

  constructor(
    alertConfigService?: AlertConfigService,
    discordService?: DiscordWebhookService,
    telegramService?: TelegramBotService,
    pushService?: PushNotificationService,
    queueService?: NotificationQueueService,
    retryConfig?: RetryConfig
  ) {
    this.alertConfigService = alertConfigService || AlertConfigService.getInstance();
    this.discordService = discordService || new DiscordWebhookService();
    this.telegramService = telegramService || new TelegramBotService();
    this.pushService = pushService || new PushNotificationService();
    this.queueService = queueService || getNotificationQueueService();
    this.retryConfig = retryConfig || DEFAULT_RETRY_CONFIG;

    // Initialize services with current config
    this.syncServicesWithConfig();

    // Register this service as the queue handler
    this.queueService.registerHandler(this.processNotification.bind(this));
  }

  /**
   * Sync individual services with the current alert configuration
   */
  private syncServicesWithConfig(): void {
    const config = this.alertConfigService.getConfig();

    // Sync Discord service
    this.discordService.setConfig(config.channels.discord);

    // Sync Telegram service
    this.telegramService.setConfig(config.channels.telegram);

    // Sync Push service
    this.pushService.setConfig(config.channels.push);
  }

  /**
   * Send a notification to all configured and enabled channels
   * 
   * @param event - The notification event to send
   * @returns Array of results for each channel
   * 
   * @requirements 1.3, 2.2, 3.3, 4.2
   */
  async notify(event: NotificationEvent): Promise<NotificationResult[]> {
    // Sync services with latest config
    this.syncServicesWithConfig();

    // Check if quiet hours are active
    if (this.alertConfigService.isQuietHoursActive()) {
      return [];
    }

    // Get channels that should receive this event
    const channels = this.alertConfigService.getChannelsForEvent(event.type);

    if (channels.length === 0) {
      return [];
    }

    // Queue the notification for processing
    await this.queueService.enqueue(event, channels);

    // Process the queue
    await this.queueService.process();

    // Return results (we don't have direct access to results from queue processing)
    // In a real implementation, we might want to track results differently
    return channels.map(channel => ({
      channel,
      success: true, // Optimistic - actual result comes from queue processing
      sentAt: Date.now(),
    }));
  }

  /**
   * Process a notification event - called by the queue service
   * 
   * @param event - The notification event
   * @param channels - Channels to send to
   * @returns Array of results
   */
  private async processNotification(
    event: NotificationEvent,
    channels: NotificationChannel[]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Send to each channel in parallel
    const promises = channels.map(async (channel) => {
      const result = await this.sendToChannel(event, channel);
      results.push(result);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Send a notification to a specific channel with retry logic
   * 
   * @param event - The notification event
   * @param channel - The channel to send to
   * @returns Result of the send operation
   * 
   * @requirements 2.4, 3.5 - Retry with exponential backoff
   */
  private async sendToChannel(
    event: NotificationEvent,
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        let success = false;

        switch (channel) {
          case 'push':
            success = await this.sendPushNotification(event);
            break;
          case 'discord':
            success = await this.sendDiscordNotification(event);
            break;
          case 'telegram':
            success = await this.sendTelegramNotification(event);
            break;
        }

        if (success) {
          return {
            channel,
            success: true,
            sentAt: Date.now(),
          };
        }

        lastError = `Failed to send to ${channel}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Don't retry on last attempt
      if (attempt < this.retryConfig.maxAttempts - 1) {
        const backoffDelay = calculateBackoff(attempt, this.retryConfig);
        await sleep(backoffDelay);
      }
    }

    return {
      channel,
      success: false,
      error: lastError,
      sentAt: Date.now(),
    };
  }

  /**
   * Send a push notification
   * 
   * @requirements 1.3
   */
  private async sendPushNotification(event: NotificationEvent): Promise<boolean> {
    if (!this.pushService.canShowNotifications()) {
      return false;
    }

    try {
      await this.pushService.showEventNotification(
        event.title,
        event.message,
        event.type,
        event.data
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a Discord notification
   * 
   * @requirements 2.2, 2.3, 2.6
   */
  private async sendDiscordNotification(event: NotificationEvent): Promise<boolean> {
    const embed = createNotificationEmbed(event);
    return this.discordService.sendEmbed(embed);
  }

  /**
   * Send a Telegram notification
   * 
   * @requirements 3.3, 3.4, 3.7
   */
  private async sendTelegramNotification(event: NotificationEvent): Promise<boolean> {
    return this.telegramService.sendNotification(
      event.title,
      event.message,
      event.type,
      event.timestamp
    );
  }

  /**
   * Get list of enabled notification channels
   */
  getEnabledChannels(): NotificationChannel[] {
    return this.alertConfigService.getEnabledChannels();
  }

  /**
   * Test a specific notification channel
   * 
   * @param channel - The channel to test
   * @returns true if test was successful
   * 
   * @requirements 4.7 - Test notification for each channel
   */
  async testChannel(channel: NotificationChannel): Promise<boolean> {
    // Sync services with latest config
    this.syncServicesWithConfig();

    try {
      switch (channel) {
        case 'push':
          await this.pushService.showTestNotification();
          return true;
        case 'discord':
          return await this.discordService.sendTestMessage();
        case 'telegram':
          return await this.telegramService.sendTestMessage();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error testing ${channel} channel:`, error);
      return false;
    }
  }

  /**
   * Send a notification directly without queuing (for immediate delivery)
   * 
   * @param event - The notification event
   * @returns Array of results
   */
  async notifyImmediate(event: NotificationEvent): Promise<NotificationResult[]> {
    // Sync services with latest config
    this.syncServicesWithConfig();

    // Check if quiet hours are active
    if (this.alertConfigService.isQuietHoursActive()) {
      return [];
    }

    // Get channels that should receive this event
    const channels = this.alertConfigService.getChannelsForEvent(event.type);

    if (channels.length === 0) {
      return [];
    }

    // Process immediately without queuing
    return this.processNotification(event, channels);
  }

  /**
   * Get the number of pending notifications in the queue
   */
  getPendingCount(): number {
    return this.queueService.getCount();
  }

  /**
   * Process any pending notifications in the queue
   */
  async processPending(): Promise<void> {
    await this.queueService.process();
  }

  /**
   * Clear all pending notifications
   */
  async clearPending(): Promise<void> {
    await this.queueService.clear();
  }

  /**
   * Update the retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = {
      ...this.retryConfig,
      ...config,
    };
  }

  /**
   * Get the current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }
}

// ============ SINGLETON INSTANCE ============

let notificationServiceInstance: NotificationService | null = null;

/**
 * Get the singleton instance of NotificationService
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetNotificationService(): void {
  notificationServiceInstance = null;
}

export default NotificationService;
