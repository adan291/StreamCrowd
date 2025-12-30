// WebhookService - Main orchestrator for webhook functionality

import {
  WebhookConfig,
  WebhookPayload,
  WebhookDelivery,
  WebhookEventType,
  WebhookStats,
  IncomingWebhookConfig,
  WEBHOOK_API_VERSION,
} from '../../../types/webhooks';
import { webhookSignatureService } from './WebhookSignatureService';
import { webhookStorageService } from './WebhookStorageService';
import { outgoingWebhookService } from './OutgoingWebhookService';
import { incomingWebhookService } from './IncomingWebhookService';

export interface StreamContext {
  channelName: string;
  platform: string;
  viewers: number;
}

export class WebhookService {
  private streamContext: StreamContext = {
    channelName: '',
    platform: '',
    viewers: 0,
  };

  /**
   * Initialize the webhook service
   */
  async init(): Promise<void> {
    await webhookStorageService.init();
    await incomingWebhookService.init();
  }

  /**
   * Set current stream context for payloads
   */
  setStreamContext(context: StreamContext): void {
    this.streamContext = context;
  }

  // ============ Outgoing Webhooks ============

  /**
   * Create a new webhook
   */
  async createWebhook(
    config: Omit<WebhookConfig, 'id' | 'secret' | 'createdAt' | 'updatedAt' | 'failureCount'>
  ): Promise<WebhookConfig> {
    // Validate URL is HTTPS
    if (!this.isValidWebhookUrl(config.url)) {
      throw new Error('Webhook URL must be HTTPS');
    }

    const webhook: WebhookConfig = {
      ...config,
      id: this.generateId('wh'),
      secret: webhookSignatureService.generateSecret(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      failureCount: 0,
    };

    return webhookStorageService.createWebhook(webhook);
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    // Validate URL if being updated
    if (updates.url && !this.isValidWebhookUrl(updates.url)) {
      throw new Error('Webhook URL must be HTTPS');
    }

    return webhookStorageService.updateWebhook(id, updates);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    return webhookStorageService.deleteWebhook(id);
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<WebhookConfig[]> {
    return webhookStorageService.getAllWebhooks();
  }

  /**
   * Get a single webhook
   */
  async getWebhook(id: string): Promise<WebhookConfig | null> {
    return webhookStorageService.getWebhook(id);
  }

  /**
   * Trigger an event to all subscribed webhooks
   */
  async triggerEvent(
    eventType: WebhookEventType,
    data: Record<string, unknown>
  ): Promise<WebhookDelivery[]> {
    const webhooks = await webhookStorageService.getEnabledWebhooks();
    const deliveries: WebhookDelivery[] = [];

    for (const webhook of webhooks) {
      // Check if webhook is subscribed to this event
      if (!webhook.events.includes(eventType)) {
        continue;
      }

      const payload = this.createPayload(eventType, data);
      const delivery = await outgoingWebhookService.send(webhook, payload);
      deliveries.push(delivery);

      // Update webhook stats
      if (delivery.status === 'failed') {
        await webhookStorageService.updateWebhook(webhook.id, {
          failureCount: webhook.failureCount + 1,
        });
      } else if (delivery.status === 'success') {
        await webhookStorageService.updateWebhook(webhook.id, {
          lastTriggered: Date.now(),
          failureCount: 0, // Reset on success
        });
      }
    }

    return deliveries;
  }

  /**
   * Send a test event to a specific webhook
   */
  async testWebhook(id: string): Promise<WebhookDelivery> {
    const webhook = await webhookStorageService.getWebhook(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const payload = this.createPayload('poll_started', {
      test: true,
      message: 'This is a test webhook delivery',
      poll_id: 'test_poll_123',
      title: 'Test Poll',
      options: ['Option A', 'Option B'],
    });

    return outgoingWebhookService.send(webhook, payload);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await webhookStorageService.getDelivery(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const webhook = await webhookStorageService.getWebhook(delivery.webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Reset delivery for retry
    delivery.status = 'pending';
    delivery.attempts = 0;
    delivery.error = undefined;
    delivery.completedAt = undefined;

    return outgoingWebhookService.retry(delivery, webhook);
  }

  /**
   * Get deliveries for a webhook
   */
  async getDeliveries(webhookId: string, limit?: number): Promise<WebhookDelivery[]> {
    return webhookStorageService.getDeliveriesByWebhook(webhookId, limit);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<WebhookStats> {
    return webhookStorageService.getWebhookStats(webhookId);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: string): Promise<string> {
    const newSecret = webhookSignatureService.generateSecret();
    await webhookStorageService.updateWebhook(webhookId, { secret: newSecret });
    return newSecret;
  }

  // ============ Incoming Webhooks ============

  /**
   * Get incoming webhook config
   */
  getIncomingConfig(): IncomingWebhookConfig | null {
    return incomingWebhookService.getConfig();
  }

  /**
   * Update incoming webhook config
   */
  async updateIncomingConfig(updates: Partial<IncomingWebhookConfig>): Promise<IncomingWebhookConfig> {
    return incomingWebhookService.updateConfig(updates);
  }

  /**
   * Regenerate incoming webhook secret
   */
  async regenerateIncomingSecret(): Promise<string> {
    return incomingWebhookService.regenerateSecret();
  }

  /**
   * Get incoming webhook logs
   */
  async getIncomingLogs(limit?: number): Promise<unknown[]> {
    return webhookStorageService.getIncomingLogs(limit);
  }

  // ============ Helpers ============

  private createPayload(
    eventType: WebhookEventType,
    data: Record<string, unknown>
  ): WebhookPayload {
    return {
      event_type: eventType,
      event_id: this.generateId('evt'),
      timestamp: Date.now(),
      api_version: WEBHOOK_API_VERSION,
      stream: {
        channel_name: this.streamContext.channelName,
        platform: this.streamContext.platform,
        viewers: this.streamContext.viewers,
      },
      data,
    };
  }

  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Process pending deliveries (call periodically)
   */
  async processPendingDeliveries(): Promise<void> {
    return outgoingWebhookService.processPendingDeliveries();
  }

  /**
   * Cleanup old deliveries
   */
  async cleanup(maxAge?: number): Promise<number> {
    return webhookStorageService.cleanupOldDeliveries(maxAge);
  }
}

// Singleton instance
export const webhookService = new WebhookService();
