// Webhook Types for TwitchVote

// Event types that can trigger outgoing webhooks
export type WebhookEventType =
  | 'follower'
  | 'raid'
  | 'subscription'
  | 'bits'
  | 'poll_started'
  | 'poll_ended'
  | 'prediction_started'
  | 'prediction_resolved'
  | 'giveaway_winner'
  | 'macro_executed';

// Commands that can be received via incoming webhooks
export type IncomingCommandType =
  | 'send_chat_message'
  | 'change_scene'
  | 'start_poll'
  | 'start_prediction'
  | 'execute_macro';

// Outgoing webhook configuration
export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  enabled: boolean;
  events: WebhookEventType[];
  createdAt: number;
  updatedAt: number;
  lastTriggered?: number;
  failureCount: number;
}

// Payload sent to outgoing webhooks
export interface WebhookPayload {
  event_type: WebhookEventType;
  event_id: string;
  timestamp: number;
  api_version: string;
  stream: {
    channel_name: string;
    platform: string;
    viewers: number;
  };
  data: Record<string, unknown>;
}

// Delivery status for outgoing webhooks
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

// Record of a webhook delivery attempt
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  status: WebhookDeliveryStatus;
  statusCode?: number;
  responseBody?: string;
  attempts: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

// Incoming webhook configuration
export interface IncomingWebhookConfig {
  enabled: boolean;
  secret: string;
  endpoint: string;
  allowedCommands: IncomingCommandType[];
  rateLimitPerMinute: number;
}

// Request received on incoming webhook endpoint
export interface IncomingWebhookRequest {
  command: IncomingCommandType;
  params: Record<string, unknown>;
  timestamp: number;
  nonce: string;
}

// Response sent back for incoming webhook requests
export interface IncomingWebhookResponse {
  success: boolean;
  command: IncomingCommandType;
  result?: unknown;
  error?: string;
  timestamp: number;
}

// Log entry for incoming webhook requests
export interface IncomingWebhookLog {
  id: string;
  command: IncomingCommandType;
  params: Record<string, unknown>;
  success: boolean;
  error?: string;
  ip: string;
  createdAt: number;
}

// Webhook statistics
export interface WebhookStats {
  webhookId: string;
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
  totalPending: number;
  lastSuccess?: number;
  lastFailure?: number;
}

// API version constant
export const WEBHOOK_API_VERSION = '1.0';

// Signature configuration
export const SIGNATURE_CONFIG = {
  ALGORITHM: 'SHA-256',
  HEADER_SIGNATURE: 'X-Webhook-Signature',
  HEADER_TIMESTAMP: 'X-Webhook-Timestamp',
  HEADER_API_VERSION: 'X-API-Version',
  TOLERANCE_SECONDS: 300, // 5 minutes
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  OUTGOING_PER_MINUTE: 100,
  INCOMING_PER_MINUTE: 60,
  MAX_RETRY_ATTEMPTS: 3,
  BASE_RETRY_DELAY_MS: 1000,
};

// Storage keys
export const WEBHOOK_STORAGE_KEYS = {
  WEBHOOKS: 'twitchvote_webhooks',
  INCOMING_CONFIG: 'twitchvote_incoming_webhook_config',
  WEBHOOK_SECRETS: 'twitchvote_webhook_secrets',
};
