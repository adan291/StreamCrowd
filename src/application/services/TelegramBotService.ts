/**
 * TelegramBotService - Service for sending notifications via Telegram Bot API
 * 
 * This service handles validation of Telegram bot tokens and chat IDs,
 * and sending messages with Markdown formatting. Implements retry with exponential backoff.
 * 
 * @requirements 3.1 - WHEN el usuario configura un bot de Telegram, THE Telegram_Bot_Service SHALL validar el token del bot
 * @requirements 3.2 - WHEN el usuario proporciona un chat ID, THE Telegram_Bot_Service SHALL verificar que el bot puede enviar mensajes a ese chat
 * @requirements 3.3 - WHEN ocurre un evento configurado, THE Telegram_Bot_Service SHALL enviar un mensaje al chat configurado
 * @requirements 3.4 - THE Telegram_Bot_Service SHALL formatear mensajes con Markdown para mejor legibilidad
 * @requirements 3.5 - IF el envío falla, THEN THE Telegram_Bot_Service SHALL reintentar con backoff exponencial
 * @requirements 3.6 - THE Telegram_Bot_Service SHALL respetar el rate limit de Telegram
 * @requirements 3.7 - WHEN se envía una alerta, THE Telegram_Bot_Service SHALL incluir emoji indicativo del tipo de evento
 */

import type {
  ITelegramBotService,
  TelegramBotConfig,
  TelegramBotValidationResult,
  NotificationEventType,
} from '../../../types/notifications';
import { EVENT_TYPE_EMOJIS } from '../../../types/notifications';

/**
 * Telegram Bot API base URL
 */
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Rate limit configuration for Telegram API
 * Telegram allows 30 messages per second to different chats
 * and 1 message per second to the same chat
 */
const RATE_LIMIT = {
  MAX_REQUESTS_PER_SECOND: 30,
  WINDOW_MS: 1000,
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
 * Validate if a string looks like a valid Telegram bot token
 * Format: {bot_id}:{alphanumeric_string}
 * @param token - Token to validate
 * @returns true if format is valid
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // Telegram bot tokens have format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
  return tokenRegex.test(token.trim());
}

/**
 * Validate if a string is a valid Telegram chat ID
 * Can be a numeric ID (positive for users/groups, negative for channels/supergroups)
 * or a username starting with @
 * @param chatId - Chat ID to validate
 * @returns true if format is valid
 */
export function isValidChatIdFormat(chatId: string): boolean {
  if (!chatId || typeof chatId !== 'string') {
    return false;
  }
  const trimmed = chatId.trim();
  // Numeric chat ID (can be negative for groups/channels)
  if (/^-?\d+$/.test(trimmed)) {
    return true;
  }
  // Username format (@username)
  if (/^@[A-Za-z][A-Za-z0-9_]{4,}$/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Get emoji for a notification event type
 * @param eventType - Type of notification event
 * @returns Emoji string
 */
export function getEventEmoji(eventType: NotificationEventType): string {
  return EVENT_TYPE_EMOJIS[eventType] || '📢';
}

/**
 * Format a message with Markdown for Telegram
 * @param title - Message title
 * @param message - Message body
 * @param eventType - Optional event type for emoji
 * @param timestamp - Optional timestamp
 * @returns Formatted Markdown string
 */
export function formatTelegramMessage(
  title: string,
  message: string,
  eventType?: NotificationEventType,
  timestamp?: number
): string {
  const emoji = eventType ? getEventEmoji(eventType) : '📢';
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  
  // Escape special Markdown characters in user content
  const escapedTitle = escapeMarkdown(title);
  const escapedMessage = escapeMarkdown(message);
  
  return `${emoji} *${escapedTitle}*\n\n${escapedMessage}\n\n_${time}_`;
}

/**
 * Escape special Markdown characters for Telegram
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  // Escape Markdown special characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

/**
 * Telegram Bot Service implementation
 */
export class TelegramBotService implements ITelegramBotService {
  private config: TelegramBotConfig | null = null;
  private requestTimestamps: number[] = [];

  /**
   * Create a new TelegramBotService instance
   * @param config - Optional initial configuration
   */
  constructor(config?: TelegramBotConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Set the bot configuration
   * @param config - Telegram bot configuration
   */
  setConfig(config: TelegramBotConfig): void {
    this.config = config;
  }

  /**
   * Get the current configuration
   * @returns Current configuration or null
   */
  getConfig(): TelegramBotConfig | null {
    return this.config;
  }

  /**
   * Validate a Telegram bot token by calling getMe API
   * 
   * @param token - Bot token to validate
   * @returns Promise resolving to validation result with bot name if valid
   * @requirements 3.1
   */
  async validateBot(token: string): Promise<TelegramBotValidationResult> {
    // First check token format
    if (!isValidTokenFormat(token)) {
      return { valid: false };
    }

    try {
      const response = await fetch(`${TELEGRAM_API_BASE}${token.trim()}/getMe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();
      
      if (data.ok && data.result) {
        return {
          valid: true,
          botName: data.result.username || data.result.first_name,
        };
      }

      return { valid: false };
    } catch {
      // Network error or invalid token
      return { valid: false };
    }
  }

  /**
   * Validate that the bot can send messages to a specific chat
   * Uses getChat API to verify access
   * 
   * @param token - Bot token
   * @param chatId - Chat ID to validate
   * @returns Promise resolving to true if bot can access the chat
   * @requirements 3.2
   */
  async validateChat(token: string, chatId: string): Promise<boolean> {
    // Check formats first
    if (!isValidTokenFormat(token) || !isValidChatIdFormat(chatId)) {
      return false;
    }

    try {
      const response = await fetch(
        `${TELEGRAM_API_BASE}${token.trim()}/getChat?chat_id=${encodeURIComponent(chatId.trim())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.ok === true;
    } catch {
      // Network error or invalid chat
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
    return this.requestTimestamps.length < RATE_LIMIT.MAX_REQUESTS_PER_SECOND;
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
   * @param token - Bot token
   * @param chatId - Chat ID
   * @param text - Message text
   * @param parseMode - Parse mode (Markdown or HTML)
   * @returns Promise resolving to true if successful
   */
  private async sendWithRetry(
    token: string,
    chatId: string,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
      try {
        // Check rate limit before sending
        if (!this.checkRateLimit()) {
          await this.waitForRateLimit();
        }

        const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: parseMode,
          }),
        });

        this.recordRequest();

        // Handle rate limiting response from Telegram
        if (response.status === 429) {
          const data = await response.json();
          const retryAfter = data.parameters?.retry_after || Math.ceil(calculateBackoff(attempt) / 1000);
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          return data.ok === true;
        }

        // Non-retryable client errors (except rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return false;
        }

        // Server error, retry with backoff
        throw new Error(`Telegram API error: ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on last attempt
        if (attempt < RETRY_CONFIG.MAX_ATTEMPTS - 1) {
          const backoffDelay = calculateBackoff(attempt);
          await this.delay(backoffDelay);
        }
      }
    }

    console.error('Telegram message failed after retries:', lastError);
    return false;
  }

  /**
   * Send a message to the configured chat
   * 
   * @param text - Message text (can include Markdown)
   * @param parseMode - Parse mode (Markdown or HTML), defaults to Markdown
   * @returns Promise resolving to true if successful
   * @requirements 3.3, 3.4, 3.5, 3.6
   */
  async sendMessage(text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<boolean> {
    if (!this.config?.enabled || !this.config.botToken || !this.config.chatId) {
      return false;
    }

    if (!isValidTokenFormat(this.config.botToken) || !isValidChatIdFormat(this.config.chatId)) {
      return false;
    }

    if (!text || text.trim().length === 0) {
      return false;
    }

    return this.sendWithRetry(
      this.config.botToken.trim(),
      this.config.chatId.trim(),
      text,
      parseMode
    );
  }

  /**
   * Send a formatted notification message with emoji
   * 
   * @param title - Notification title
   * @param message - Notification message
   * @param eventType - Type of event for emoji selection
   * @param timestamp - Optional timestamp
   * @returns Promise resolving to true if successful
   * @requirements 3.3, 3.4, 3.7
   */
  async sendNotification(
    title: string,
    message: string,
    eventType?: NotificationEventType,
    timestamp?: number
  ): Promise<boolean> {
    const formattedMessage = formatTelegramMessage(title, message, eventType, timestamp);
    return this.sendMessage(formattedMessage, 'Markdown');
  }

  /**
   * Send a test message to verify bot configuration
   * @returns Promise resolving to true if successful
   */
  async sendTestMessage(): Promise<boolean> {
    const testMessage = formatTelegramMessage(
      'Test Notification',
      'This is a test notification from TwitchVote. If you see this, your Telegram bot is configured correctly!',
      undefined,
      Date.now()
    );

    return this.sendMessage(testMessage, 'Markdown');
  }
}

/**
 * Create a TelegramBotService instance with configuration
 * @param config - Telegram bot configuration
 * @returns Configured TelegramBotService instance
 */
export function createTelegramBotService(config?: TelegramBotConfig): TelegramBotService {
  return new TelegramBotService(config);
}
