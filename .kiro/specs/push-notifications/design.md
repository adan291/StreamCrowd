# Design Document: Notificaciones Push / Alertas Externas

## Overview

Este documento describe el diseño técnico para implementar el sistema de notificaciones push y alertas externas en TwitchVote, incluyendo Web Push API, integración con Discord y Telegram, y un sistema de cola de notificaciones.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
├─────────────────────────────────────────────────────────────┤
│  NotificationConfigPanel    NotificationHistory              │
│  ChannelStatusIndicator     TestNotificationButton           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer                              │
├─────────────────────────────────────────────────────────────┤
│  useNotifications    useNotificationConfig                   │
│  useNotificationHistory                                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  NotificationService (orchestrator)                          │
│  ├── PushNotificationService (Web Push API)                  │
│  ├── DiscordWebhookService                                   │
│  ├── TelegramBotService                                      │
│  └── NotificationQueueService                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  localStorage (config)    IndexedDB (history, queue)         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### NotificationService (Orchestrator)

```typescript
interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
}

type NotificationEventType = 
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

interface INotificationService {
  notify(event: NotificationEvent): Promise<NotificationResult[]>;
  getEnabledChannels(): NotificationChannel[];
  testChannel(channel: NotificationChannel): Promise<boolean>;
}
```

### PushNotificationService

```typescript
interface PushNotificationConfig {
  enabled: boolean;
  permission: 'granted' | 'denied' | 'default';
}

interface IPushNotificationService {
  requestPermission(): Promise<NotificationPermission>;
  getPermissionStatus(): NotificationPermission;
  showNotification(title: string, options: NotificationOptions): Promise<void>;
  isSupported(): boolean;
}
```

### DiscordWebhookService

```typescript
interface DiscordWebhookConfig {
  enabled: boolean;
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

interface IDiscordWebhookService {
  validateWebhook(url: string): Promise<boolean>;
  sendEmbed(embed: DiscordEmbed): Promise<boolean>;
  sendMessage(content: string): Promise<boolean>;
}
```

### TelegramBotService

```typescript
interface TelegramBotConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

interface ITelegramBotService {
  validateBot(token: string): Promise<{ valid: boolean; botName?: string }>;
  validateChat(token: string, chatId: string): Promise<boolean>;
  sendMessage(text: string, parseMode?: 'Markdown' | 'HTML'): Promise<boolean>;
}
```

### NotificationQueueService

```typescript
interface QueuedNotification {
  id: string;
  event: NotificationEvent;
  channels: NotificationChannel[];
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  nextAttemptAt: number;
}

interface INotificationQueueService {
  enqueue(event: NotificationEvent, channels: NotificationChannel[]): Promise<string>;
  process(): Promise<void>;
  getPending(): Promise<QueuedNotification[]>;
  getCount(): number;
  clear(): Promise<void>;
}
```

### AlertConfig

```typescript
interface AlertConfig {
  channels: {
    push: PushNotificationConfig;
    discord: DiscordWebhookConfig;
    telegram: TelegramBotConfig;
  };
  events: Record<NotificationEventType, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

type NotificationChannel = 'push' | 'discord' | 'telegram';
```

## Data Models

### Notification History Entry

```typescript
interface NotificationHistoryEntry {
  id: string;
  event: NotificationEvent;
  channels: NotificationChannel[];
  results: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
    sentAt: number;
  }[];
  createdAt: number;
}
```

### Storage Keys

```typescript
const STORAGE_KEYS = {
  ALERT_CONFIG: 'twitchvote_alert_config',
  NOTIFICATION_HISTORY: 'twitchvote_notification_history',
  NOTIFICATION_QUEUE: 'twitchvote_notification_queue',
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Discord Webhook URL Validation

*For any* string input, validating it as a Discord webhook URL SHALL return true only if it matches the Discord webhook URL pattern (`https://discord.com/api/webhooks/{id}/{token}` or `https://discordapp.com/api/webhooks/{id}/{token}`).

**Validates: Requirements 2.1**

### Property 2: Notification Queue FIFO Order

*For any* sequence of enqueued notifications, processing SHALL execute them in the exact order they were added, and the order SHALL be preserved across all operations.

**Validates: Requirements 5.1, 5.6**

### Property 3: Alert Config Round-Trip

*For any* valid AlertConfig object, saving to storage and loading back SHALL produce an equivalent configuration with all channels, events, and quiet hours settings preserved.

**Validates: Requirements 4.4, 4.8**

### Property 4: Retry Backoff Behavior

*For any* failed notification attempt, the delay before the next retry SHALL be exponentially larger than the previous delay (base * 2^attempt), up to a maximum of 3 attempts.

**Validates: Requirements 2.4, 3.5**

### Property 5: Quiet Hours Enforcement

*For any* notification event that occurs during configured quiet hours, the service SHALL suppress all notifications regardless of channel or event type.

**Validates: Requirements 4.5, 4.6**

### Property 6: Event Type Filtering

*For any* notification event, only channels that are both enabled AND configured for that specific event type SHALL receive the notification.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 7: Notification Message Completeness

*For any* notification sent to Discord, the embed SHALL contain title, description, color, timestamp, and event type. *For any* notification sent to Telegram, the message SHALL contain emoji, formatted text, and timestamp.

**Validates: Requirements 2.3, 2.6, 3.4, 3.7**

### Property 8: History Limit Enforcement

*For any* state of the notification history, the number of entries SHALL not exceed 50, with oldest entries being removed first when the limit is reached.

**Validates: Requirements 6.3**

## Error Handling

### Network Errors

- **Timeout**: Reintentar con backoff exponencial
- **Rate Limited**: Esperar tiempo indicado en respuesta
- **Invalid Response**: Marcar canal como error, notificar usuario

### Permission Errors

- **Push Denied**: Mostrar instrucciones para habilitar manualmente
- **Discord 401**: Webhook inválido, solicitar reconfiguración
- **Telegram 401**: Token inválido, solicitar reconfiguración

### Backoff Strategy

```typescript
const calculateBackoff = (attempt: number): number => {
  const baseDelay = 1000; // 1 segundo
  const maxDelay = 60000; // 1 minuto
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Jitter
};
```

## Testing Strategy

### Unit Tests

- Validación de URLs de webhook
- Formateo de mensajes para cada canal
- Lógica de quiet hours
- Filtrado de eventos por configuración

### Property-Based Tests

- **Property 1**: Validación de webhook URLs de Discord
- **Property 2**: Orden FIFO de cola de notificaciones
- **Property 3**: Round-trip de configuración de alertas
- **Property 4**: Comportamiento de retry con backoff exponencial
- **Property 5**: Enforcement de quiet hours
- **Property 6**: Filtrado de tipos de evento por canal
- **Property 7**: Completitud de mensajes de notificación
- **Property 8**: Límite de historial de notificaciones

### Integration Tests

- Flujo completo de notificación
- Reconexión tras errores
- Persistencia de cola entre reinicios

