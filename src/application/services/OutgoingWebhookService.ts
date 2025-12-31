// OutgoingWebhookService - Sends webhooks to external endpoints

import {
  WebhookConfig,
  WebhookPayload,
  WebhookDelivery,
  RATE_LIMIT_CONFIG,
} from '../../../types/webhooks';
import { webhookSignatureService } from './WebhookSignatureService';
import { webhookStorageService } from './WebhookStorageService';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class OutgoingWebhookService {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  /**
   * Send a webhook payload to the configured endpoint
   */
  async send(webhook: WebhookConfig, payload: WebhookPayload): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: this.generateId(),
      webhookId: webhook.id,
      eventType: payload.event_type,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    };

    // Check rate limit
    if (!this.checkRateLimit(webhook.id)) {
      delivery.status = 'failed';
      delivery.error = 'Rate limit exceeded';
      delivery.completedAt = Date.now();
      await webhookStorageService.saveDelivery(delivery);
      return delivery;
    }

    // Attempt delivery
    return this.attemptDelivery(delivery, webhook);
  }

  /**
   * Retry a failed delivery
   */
  async retry(delivery: WebhookDelivery, webhook: WebhookConfig): Promise<WebhookDelivery> {
    if (delivery.attempts >= RATE_LIMIT_CONFIG.MAX_RETRY_ATTEMPTS) {
      delivery.status = 'failed';
      delivery.error = 'Max retry attempts exceeded';
      delivery.completedAt = Date.now();
      await webhookStorageService.saveDelivery(delivery);
      return delivery;
    }

    // Check rate limit
    if (!this.checkRateLimit(webhook.id)) {
      delivery.error = 'Rate limit exceeded, will retry later';
      await webhookStorageService.saveDelivery(delivery);
      return delivery;
    }

    return this.attemptDelivery(delivery, webhook);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number): number {
    return RATE_LIMIT_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  }

  /**
   * Check if webhook is within rate limit
   */
  checkRateLimit(webhookId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(webhookId);

    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      // New window
      this.rateLimits.set(webhookId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get current rate limit status for a webhook
   */
  getRateLimitStatus(webhookId: string): { remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(webhookId);

    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      return {
        remaining: RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE,
        resetAt: now + this.WINDOW_MS,
      };
    }

    return {
      remaining: Math.max(0, RATE_LIMIT_CONFIG.OUTGOING_PER_MINUTE - entry.count),
      resetAt: entry.windowStart + this.WINDOW_MS,
    };
  }

  private async attemptDelivery(
    delivery: WebhookDelivery,
    webhook: WebhookConfig
  ): Promise<WebhookDelivery> {
    delivery.attempts++;

    try {
      const payloadStr = JSON.stringify(delivery.payload);
      const headers = await webhookSignatureService.createHeaders(payloadStr, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadStr,
      });

      delivery.statusCode = response.status;

      // Try to get response body
      try {
        delivery.responseBody = await response.text();
      } catch {
        delivery.responseBody = '';
      }

      if (response.ok) {
        delivery.status = 'success';
        delivery.completedAt = Date.now();
      } else {
        // 4xx errors are not retryable, 5xx are
        if (response.status >= 400 && response.status < 500) {
          delivery.status = 'failed';
          delivery.error = `HTTP ${response.status}: ${response.statusText}`;
          delivery.completedAt = Date.now();
        } else if (delivery.attempts >= RATE_LIMIT_CONFIG.MAX_RETRY_ATTEMPTS) {
          delivery.status = 'failed';
          delivery.error = `HTTP ${response.status} after ${delivery.attempts} attempts`;
          delivery.completedAt = Date.now();
        } else {
          // Will retry
          delivery.error = `HTTP ${response.status}, will retry`;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (delivery.attempts >= RATE_LIMIT_CONFIG.MAX_RETRY_ATTEMPTS) {
        delivery.status = 'failed';
        delivery.error = `Network error after ${delivery.attempts} attempts: ${errorMessage}`;
        delivery.completedAt = Date.now();
      } else {
        delivery.error = `Network error, will retry: ${errorMessage}`;
      }
    }

    // Save delivery state
    await webhookStorageService.saveDelivery(delivery);

    return delivery;
  }

  private generateId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Process pending deliveries with retry
   */
  async processPendingDeliveries(): Promise<void> {
    const pending = await webhookStorageService.getPendingDeliveries();
    const webhooks = await webhookStorageService.getAllWebhooks();
    const webhookMap = new Map(webhooks.map(w => [w.id, w]));

    for (const delivery of pending) {
      const webhook = webhookMap.get(delivery.webhookId);
      if (!webhook || !webhook.enabled) {
        delivery.status = 'failed';
        delivery.error = 'Webhook disabled or deleted';
        delivery.completedAt = Date.now();
        await webhookStorageService.saveDelivery(delivery);
        continue;
      }

      // Check if enough time has passed for retry
      const delay = this.calculateRetryDelay(delivery.attempts);
      const timeSinceCreated = Date.now() - delivery.createdAt;
      
      if (timeSinceCreated >= delay) {
        await this.retry(delivery, webhook);
      }
    }
  }
}

// Singleton instance
export const outgoingWebhookService = new OutgoingWebhookService();
