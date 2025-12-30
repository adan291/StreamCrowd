// IncomingWebhookService - Handles incoming webhook requests

import {
  IncomingWebhookConfig,
  IncomingWebhookRequest,
  IncomingWebhookResponse,
  IncomingWebhookLog,
  IncomingCommandType,
  RATE_LIMIT_CONFIG,
} from '../../../types/webhooks';
import { webhookSignatureService } from './WebhookSignatureService';
import { webhookStorageService } from './WebhookStorageService';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Command executor type
type CommandExecutor = (params: Record<string, unknown>) => Promise<unknown>;

export class IncomingWebhookService {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private commandExecutors: Map<IncomingCommandType, CommandExecutor> = new Map();
  private config: IncomingWebhookConfig | null = null;

  constructor() {
    this.registerDefaultExecutors();
  }

  /**
   * Initialize service with config
   */
  async init(): Promise<void> {
    this.config = await webhookStorageService.getIncomingConfig();
    
    if (!this.config) {
      // Create default config
      this.config = {
        enabled: false,
        secret: webhookSignatureService.generateSecret(),
        endpoint: this.generateEndpoint(),
        allowedCommands: ['send_chat_message', 'change_scene', 'start_poll', 'start_prediction', 'execute_macro'],
        rateLimitPerMinute: RATE_LIMIT_CONFIG.INCOMING_PER_MINUTE,
      };
      await webhookStorageService.saveIncomingConfig(this.config);
    }
  }

  /**
   * Get current incoming webhook config
   */
  getConfig(): IncomingWebhookConfig | null {
    return this.config;
  }

  /**
   * Update incoming webhook config
   */
  async updateConfig(updates: Partial<IncomingWebhookConfig>): Promise<IncomingWebhookConfig> {
    if (!this.config) {
      await this.init();
    }

    this.config = {
      ...this.config!,
      ...updates,
    };

    await webhookStorageService.saveIncomingConfig(this.config);
    return this.config;
  }

  /**
   * Regenerate the incoming webhook secret
   */
  async regenerateSecret(): Promise<string> {
    const newSecret = webhookSignatureService.generateSecret();
    await this.updateConfig({ secret: newSecret });
    return newSecret;
  }

  /**
   * Handle an incoming webhook request
   */
  async handleRequest(
    request: IncomingWebhookRequest,
    headers: Record<string, string>,
    ip: string
  ): Promise<IncomingWebhookResponse> {
    const timestamp = Date.now();

    // Check if enabled
    if (!this.config?.enabled) {
      return this.createErrorResponse(request.command, 'Incoming webhooks are disabled');
    }

    // Check rate limit
    if (!this.checkRateLimit(ip)) {
      await this.logRequest(request, false, 'Rate limit exceeded', ip);
      return this.createErrorResponse(request.command, 'Rate limit exceeded');
    }

    // Validate signature
    const payload = JSON.stringify(request);
    const validation = await webhookSignatureService.validateIncomingRequest(
      payload,
      headers,
      this.config.secret
    );

    if (!validation.valid) {
      await this.logRequest(request, false, validation.error || 'Invalid signature', ip);
      return this.createErrorResponse(request.command, validation.error || 'Invalid signature');
    }

    // Check if command is allowed
    if (!this.config.allowedCommands.includes(request.command)) {
      await this.logRequest(request, false, 'Command not allowed', ip);
      return this.createErrorResponse(request.command, 'Command not allowed');
    }

    // Validate request structure
    const validationError = this.validateRequest(request);
    if (validationError) {
      await this.logRequest(request, false, validationError, ip);
      return this.createErrorResponse(request.command, validationError);
    }

    // Execute command
    try {
      const result = await this.executeCommand(request.command, request.params);
      await this.logRequest(request, true, undefined, ip);
      
      return {
        success: true,
        command: request.command,
        result,
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
      await this.logRequest(request, false, errorMessage, ip);
      return this.createErrorResponse(request.command, errorMessage);
    }
  }

  /**
   * Register a command executor
   */
  registerExecutor(command: IncomingCommandType, executor: CommandExecutor): void {
    this.commandExecutors.set(command, executor);
  }

  /**
   * Check rate limit for an IP
   */
  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const limit = this.config?.rateLimitPerMinute || RATE_LIMIT_CONFIG.INCOMING_PER_MINUTE;
    const entry = this.rateLimits.get(ip);

    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      this.rateLimits.set(ip, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get rate limit status for an IP
   */
  getRateLimitStatus(ip: string): { remaining: number; resetAt: number } {
    const now = Date.now();
    const limit = this.config?.rateLimitPerMinute || RATE_LIMIT_CONFIG.INCOMING_PER_MINUTE;
    const entry = this.rateLimits.get(ip);

    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      return {
        remaining: limit,
        resetAt: now + this.WINDOW_MS,
      };
    }

    return {
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.windowStart + this.WINDOW_MS,
    };
  }

  private validateRequest(request: IncomingWebhookRequest): string | null {
    if (!request.command) {
      return 'Missing command';
    }

    if (!request.timestamp || typeof request.timestamp !== 'number') {
      return 'Invalid timestamp';
    }

    if (!request.nonce || typeof request.nonce !== 'string') {
      return 'Missing nonce';
    }

    if (!request.params || typeof request.params !== 'object') {
      return 'Invalid params';
    }

    return null;
  }

  private async executeCommand(
    command: IncomingCommandType,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const executor = this.commandExecutors.get(command);
    
    if (!executor) {
      throw new Error(`No executor registered for command: ${command}`);
    }

    return executor(params);
  }

  private registerDefaultExecutors(): void {
    // send_chat_message
    this.registerExecutor('send_chat_message', async (params) => {
      const message = params.message as string;
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message parameter');
      }
      // In real implementation, this would send to chat
      console.log(`[Webhook] Send chat message: ${message}`);
      return { sent: true, message };
    });

    // change_scene
    this.registerExecutor('change_scene', async (params) => {
      const scene = params.scene as string;
      if (!scene || typeof scene !== 'string') {
        throw new Error('Invalid scene parameter');
      }
      // In real implementation, this would change OBS scene
      console.log(`[Webhook] Change scene to: ${scene}`);
      return { changed: true, scene };
    });

    // start_poll
    this.registerExecutor('start_poll', async (params) => {
      const title = params.title as string;
      const options = params.options as string[];
      if (!title || !Array.isArray(options) || options.length < 2) {
        throw new Error('Invalid poll parameters');
      }
      // In real implementation, this would start a poll
      console.log(`[Webhook] Start poll: ${title}`);
      return { started: true, title, options };
    });

    // start_prediction
    this.registerExecutor('start_prediction', async (params) => {
      const title = params.title as string;
      const outcomes = params.outcomes as string[];
      if (!title || !Array.isArray(outcomes) || outcomes.length < 2) {
        throw new Error('Invalid prediction parameters');
      }
      // In real implementation, this would start a prediction
      console.log(`[Webhook] Start prediction: ${title}`);
      return { started: true, title, outcomes };
    });

    // execute_macro
    this.registerExecutor('execute_macro', async (params) => {
      const macroId = params.macroId as string;
      if (!macroId || typeof macroId !== 'string') {
        throw new Error('Invalid macroId parameter');
      }
      // In real implementation, this would execute a macro
      console.log(`[Webhook] Execute macro: ${macroId}`);
      return { executed: true, macroId };
    });
  }

  private async logRequest(
    request: IncomingWebhookRequest,
    success: boolean,
    error: string | undefined,
    ip: string
  ): Promise<void> {
    const log: IncomingWebhookLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      command: request.command,
      params: request.params,
      success,
      error,
      ip,
      createdAt: Date.now(),
    };

    await webhookStorageService.saveIncomingLog(log);
  }

  private createErrorResponse(
    command: IncomingCommandType,
    error: string
  ): IncomingWebhookResponse {
    return {
      success: false,
      command,
      error,
      timestamp: Date.now(),
    };
  }

  private generateEndpoint(): string {
    const id = Math.random().toString(36).substring(2, 15);
    return `/api/webhook/incoming/${id}`;
  }
}

// Singleton instance
export const incomingWebhookService = new IncomingWebhookService();
