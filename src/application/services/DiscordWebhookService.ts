/**
 * DiscordWebhookService - Service for sending notifications via Discord webhooks
 * 
 * This service handles validation of Discord webhook URLs and sending messages
 * with embeds to Discord channels. Implements retry with exponential backoff.
 * 
 * @requirements 2.1 - WHEN el usuario configura un webhook de Discord, THE Discord_Webhook_Service SHALL validar la URL del webhook
 * @requirements 2.2 - WHEN ocurre un evento configurado, THE Discord_Webhook_Service SHALL enviar un mensaje embed al webhook
 * @requirements 2.3 - THE Discord_Webhook_Service SHALL formatear los mensajes con embeds de Discord
 * @requirements 2.4 - IF el webhook falla, THEN THE Discord_Webhook_Service SHALL reintentar con backoff exponencial
 * @requirements 2.5 - THE Discord_Webhook_Service SHALL respetar el rate limit de Discord
 * @requirements 2.6 - WHEN se envía una alerta, THE Discord_Webhook_Service SHALL incluir timestamp y tipo de evento
 */

import type {
  IDiscordWebhookService,
  DiscordEmbed,
  DiscordWebhookConfig,
} from '../../../types/notifications';

/**
 * Discord webhook URL validation regex patterns
 * Supports both discord.com and discordapp.com domains
 */
const DISCORD_WEBHOOK_REGEX = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

/**
 * Rate limit configuration for Discord API
 * Discord allows 30 messages per minute per webhook
 */
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 30,
  WINDOW_MS: 60000,
};

/**
 * Retry configuration with exponential backoff
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000,
};

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt),
    RETRY_CONFIG.MAX_DELAY_MS
  );
  // Add jitter (0-1000ms) to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Validate if a string is a valid Discord webhook URL
 * @param url - URL to validate
 * @returns true if valid Discord webhook URL
 */
export function isValidDiscordWebhookUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

/**
 * Discord Webhook Service implementation
 */
export class DiscordWebhookService implements IDiscordWebhookService {
  private config: DiscordWebhookConfig | null = null;
  private requestTimestamps: number[] = [];

  /**
   * Create a new DiscordWebhookService instance
   * @param config - Optional initial configuration
   */
  constructor(config?: DiscordWebhookConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Set the webhook configuration
   * @param config - Discord webhook configuration
   */
  setConfig(config: DiscordWebhookConfig): void {
    this.config = config;
  }

  /**
   * Get the current configuration
   * @returns Current configuration or null
   */
  getConfig(): DiscordWebhookConfig | null {
    return this.config;
  }

  /**
   * Validate a Discord webhook URL
   * Tests both URL format and actual webhook availability
   * 
   * @param url - Webhook URL to validate
   * @returns Promise resolving to true if valid and accessible
   * @requirements 2.1
   */
  async validateWebhook(url: string): Promise<boolean> {
    // First check URL format
    if (!isValidDiscordWebhookUrl(url)) {
      return false;
    }

    try {
      // Make a GET request to verify the webhook exists
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Discord returns 200 for valid webhooks
      return response.ok;
    } catch {
      // Network error or invalid webhook
      return false;
    }
  }

  /**
   * Check if we're within rate limits
   * @returns true if we can send a message
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    // Remove timestamps older than the rate limit window
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < RATE_LIMIT.WINDOW_MS
    );
    return this.requestTimestamps.length < RATE_LIMIT.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * Record a request timestamp for rate limiting
   */
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Wait for rate limit to clear
   * @returns Promise that resolves when rate limit window passes
   */
  private async waitForRateLimit(): Promise<void> {
    if (this.requestTimestamps.length === 0) return;
    
    const oldestTimestamp = Math.min(...this.requestTimestamps);
    const waitTime = RATE_LIMIT.WINDOW_MS - (Date.now() - oldestTimestamp);
    
    if (waitTime > 0) {
      await this.delay(waitTime);
    }
  }

  /**
   * Delay helper
   * @param ms - Milliseconds to wait
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send a message with retry logic
   * @param webhookUrl - Webhook URL
   * @param payload - Message payload
   * @returns Promise resolving to true if successful
   */
  private async sendWithRetry(
    webhookUrl: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
      try {
        // Check rate limit before sending
        if (!this.checkRateLimit()) {
          await this.waitForRateLimit();
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        this.recordRequest();

        // Handle rate limiting response from Discord
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : calculateBackoff(attempt);
          await this.delay(waitTime);
          continue;
        }

        if (response.ok || response.status === 204) {
          return true;
        }

        // Non-retryable error
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return false;
        }

        // Server error, retry with backoff
        throw new Error(`Discord API error: ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on last attempt
        if (attempt < RETRY_CONFIG.MAX_ATTEMPTS - 1) {
          const backoffDelay = calculateBackoff(attempt);
          await this.delay(backoffDelay);
        }
      }
    }

    console.error('Discord webhook failed after retries:', lastError);
    return false;
  }

  /**
   * Send an embed message to the configured webhook
   * 
   * @param embed - Discord embed object
   * @returns Promise resolving to true if successful
   * @requirements 2.2, 2.3, 2.4, 2.5, 2.6
   */
  async sendEmbed(embed: DiscordEmbed): Promise<boolean> {
    if (!this.config?.enabled || !this.config.webhookUrl) {
      return false;
    }

    if (!isValidDiscordWebhookUrl(this.config.webhookUrl)) {
      return false;
    }

    // Ensure timestamp is included
    const embedWithTimestamp: DiscordEmbed = {
      ...embed,
      timestamp: embed.timestamp || new Date().toISOString(),
    };

    const payload: Record<string, unknown> = {
      embeds: [embedWithTimestamp],
    };

    // Add optional username and avatar
    if (this.config.username) {
      payload.username = this.config.username;
    }
    if (this.config.avatarUrl) {
      payload.avatar_url = this.config.avatarUrl;
    }

    return this.sendWithRetry(this.config.webhookUrl, payload);
  }

  /**
   * Send a simple text message to the configured webhook
   * 
   * @param content - Message content
   * @returns Promise resolving to true if successful
   * @requirements 2.2, 2.4, 2.5
   */
  async sendMessage(content: string): Promise<boolean> {
    if (!this.config?.enabled || !this.config.webhookUrl) {
      return false;
    }

    if (!isValidDiscordWebhookUrl(this.config.webhookUrl)) {
      return false;
    }

    if (!content || content.trim().length === 0) {
      return false;
    }

    const payload: Record<string, unknown> = {
      content: content.trim(),
    };

    // Add optional username and avatar
    if (this.config.username) {
      payload.username = this.config.username;
    }
    if (this.config.avatarUrl) {
      payload.avatar_url = this.config.avatarUrl;
    }

    return this.sendWithRetry(this.config.webhookUrl, payload);
  }

  /**
   * Send a test message to verify webhook configuration
   * @returns Promise resolving to true if successful
   */
  async sendTestMessage(): Promise<boolean> {
    const testEmbed: DiscordEmbed = {
      title: '🔔 Test Notification',
      description: 'This is a test notification from TwitchVote. If you see this, your Discord webhook is configured correctly!',
      color: 0x9146FF, // Twitch purple
      timestamp: new Date().toISOString(),
      footer: {
        text: 'TwitchVote Notifications',
      },
    };

    return this.sendEmbed(testEmbed);
  }
}

/**
 * Create a Discord embed from a notification event
 * @param title - Embed title
 * @param description - Embed description
 * @param color - Embed color (hex number)
 * @param eventType - Type of event for footer
 * @returns Discord embed object
 */
export function createDiscordEmbed(
  title: string,
  description: string,
  color: number,
  eventType?: string
): DiscordEmbed {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: eventType ? { text: `Event: ${eventType}` } : undefined,
  };
}
