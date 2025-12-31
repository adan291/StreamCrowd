# Design Document: Webhooks / Integraciones Externas

## Overview

Este documento describe el diseño técnico para implementar el sistema de webhooks de TwitchVote, permitiendo enviar eventos a servicios externos y recibir comandos remotos.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
├─────────────────────────────────────────────────────────────┤
│  WebhookConfigPanel    WebhookLogViewer    WebhookDocs       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer                              │
├─────────────────────────────────────────────────────────────┤
│  useWebhooks    useWebhookLogs    useIncomingWebhook         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  WebhookService (orchestrator)                               │
│  ├── OutgoingWebhookService (envía eventos)                  │
│  ├── IncomingWebhookService (recibe comandos)                │
│  ├── WebhookSignatureService (firma/verifica)                │
│  └── WebhookStorageService (persistencia)                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (webhooks, logs)    localStorage (secrets enc.)   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Webhook Models

```typescript
interface WebhookConfig {
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

type WebhookEventType = 
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

interface WebhookPayload {
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

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  responseBody?: string;
  attempts: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}
```

### Incoming Webhook Models

```typescript
interface IncomingWebhookConfig {
  enabled: boolean;
  secret: string;
  allowedCommands: IncomingCommandType[];
  rateLimitPerMinute: number;
}

type IncomingCommandType = 
  | 'send_chat_message'
  | 'change_scene'
  | 'start_poll'
  | 'start_prediction'
  | 'execute_macro';

interface IncomingWebhookRequest {
  command: IncomingCommandType;
  params: Record<string, unknown>;
  timestamp: number;
  nonce: string;
}

interface IncomingWebhookResponse {
  success: boolean;
  command: IncomingCommandType;
  result?: unknown;
  error?: string;
  timestamp: number;
}
```

### Services

```typescript
interface IWebhookService {
  // Outgoing
  createWebhook(config: Omit<WebhookConfig, 'id' | 'secret' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig>;
  updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig>;
  deleteWebhook(id: string): Promise<void>;
  getWebhooks(): Promise<WebhookConfig[]>;
  triggerEvent(eventType: WebhookEventType, data: Record<string, unknown>): Promise<void>;
  testWebhook(id: string): Promise<WebhookDelivery>;
  retryDelivery(deliveryId: string): Promise<WebhookDelivery>;
  
  // Incoming
  getIncomingConfig(): IncomingWebhookConfig;
  updateIncomingConfig(config: Partial<IncomingWebhookConfig>): void;
  handleIncomingRequest(request: IncomingWebhookRequest, signature: string): Promise<IncomingWebhookResponse>;
  
  // Secrets
  regenerateSecret(webhookId: string): Promise<string>;
  regenerateIncomingSecret(): Promise<string>;
}

interface IWebhookSignatureService {
  sign(payload: string, secret: string, timestamp: number): string;
  verify(payload: string, signature: string, secret: string, timestamp: number): boolean;
  generateSecret(): string;
}

interface IOutgoingWebhookService {
  send(webhook: WebhookConfig, payload: WebhookPayload): Promise<WebhookDelivery>;
  retry(delivery: WebhookDelivery, webhook: WebhookConfig): Promise<WebhookDelivery>;
}
```

### Signature Service

```typescript
// HMAC-SHA256 signature format
// signature = HMAC-SHA256(timestamp + '.' + payload, secret)
// Header: X-Webhook-Signature: sha256=<signature>
// Header: X-Webhook-Timestamp: <timestamp>

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

function createSignature(payload: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`;
  return crypto.subtle.sign('HMAC', secret, message);
}

function verifySignature(
  payload: string, 
  signature: string, 
  secret: string, 
  timestamp: number
): boolean {
  // Check timestamp is within tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }
  
  const expectedSignature = createSignature(payload, secret, timestamp);
  return crypto.timingSafeEqual(signature, expectedSignature);
}
```

## Data Models

### Storage Schema

```typescript
const WEBHOOK_STORES = {
  webhooks: { keyPath: 'id', indexes: ['enabled', 'url'] },
  deliveries: { keyPath: 'id', indexes: ['webhookId', 'status', 'createdAt'] },
  incomingLogs: { keyPath: 'id', indexes: ['command', 'createdAt'] },
};

const STORAGE_KEYS = {
  INCOMING_CONFIG: 'twitchvote_incoming_webhook_config',
  WEBHOOK_SECRETS: 'twitchvote_webhook_secrets', // encrypted
};
```

### API Version

```typescript
const API_VERSION = '1.0';

// Version header in all outgoing webhooks
// X-API-Version: 1.0
```

## Correctness Properties

### Property 1: Signature Verification Consistency
- **Property**: Para cualquier payload y secret, sign(payload, secret) seguido de verify(payload, signature, secret) siempre retorna true
- **Validates**: Requirement 1.5, 2.2, 3.6

### Property 2: Secret Uniqueness
- **Property**: generateSecret() produce valores únicos en llamadas consecutivas con probabilidad > 99.99%
- **Validates**: Requirement 3.1, 3.2

### Property 3: Payload Round-Trip
- **Property**: Para cualquier WebhookPayload válido, JSON.parse(JSON.stringify(payload)) produce un objeto equivalente
- **Validates**: Requirement 4.5

### Property 4: Rate Limiting Accuracy
- **Property**: El rate limiter permite exactamente N requests en una ventana de tiempo, rechazando el N+1
- **Validates**: Requirement 1.8, 2.7

### Property 5: Retry Backoff Correctness
- **Property**: Los reintentos siguen backoff exponencial: delay(n) = baseDelay * 2^(n-1), máximo 3 intentos
- **Validates**: Requirement 1.7

### Property 6: Event Filtering Consistency
- **Property**: Un webhook solo recibe eventos que están en su lista de eventos configurados
- **Validates**: Requirement 1.3, 1.4

### Property 7: Timestamp Tolerance
- **Property**: Signatures con timestamp dentro de tolerancia (5 min) son válidas, fuera son rechazadas
- **Validates**: Requirement 2.2

### Property 8: Delivery Log Completeness
- **Property**: Cada intento de envío genera exactamente un registro en el log con timestamp y resultado
- **Validates**: Requirement 5.1

## Error Handling

### Webhook Delivery Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `WEBHOOK_URL_INVALID` | URL no es HTTPS válida | Rechazar configuración |
| `WEBHOOK_TIMEOUT` | Request excede 10s | Marcar como fallido, reintentar |
| `WEBHOOK_HTTP_ERROR` | Response 4xx/5xx | Marcar como fallido, reintentar si 5xx |
| `WEBHOOK_NETWORK_ERROR` | Sin conexión | Encolar para reintento |
| `WEBHOOK_RATE_LIMITED` | Excede 100 req/min | Encolar con delay |

### Incoming Webhook Errors

| Error | Causa | Response |
|-------|-------|----------|
| `INVALID_SIGNATURE` | Firma HMAC incorrecta | 401 Unauthorized |
| `TIMESTAMP_EXPIRED` | Timestamp fuera de tolerancia | 401 Unauthorized |
| `INVALID_COMMAND` | Comando no soportado | 400 Bad Request |
| `INVALID_PARAMS` | Parámetros inválidos | 400 Bad Request |
| `RATE_LIMITED` | Excede 60 req/min | 429 Too Many Requests |
| `COMMAND_FAILED` | Error ejecutando comando | 500 Internal Server Error |

### Secret Management Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `SECRET_GENERATION_FAILED` | Crypto API no disponible | Fallback a UUID v4 |
| `SECRET_STORAGE_FAILED` | localStorage lleno | Mostrar error, limpiar datos antiguos |
| `SECRET_DECRYPTION_FAILED` | Clave corrupta | Regenerar secret |

## Testing Strategy

### Unit Tests
- WebhookSignatureService: sign/verify con diferentes payloads
- Rate limiter: conteo correcto de requests
- Payload serialization: round-trip de todos los tipos de evento

### Property-Based Tests
1. **Signature Round-Trip**: Verificar que sign → verify siempre funciona
2. **Secret Uniqueness**: Generar N secrets y verificar unicidad
3. **Payload Serialization**: Round-trip de payloads generados aleatoriamente
4. **Rate Limiter**: Verificar límites exactos con diferentes patrones de requests
5. **Retry Backoff**: Verificar delays exponenciales correctos
6. **Event Filtering**: Verificar que solo eventos configurados se envían
7. **Timestamp Validation**: Verificar tolerancia de timestamps
8. **Delivery Logging**: Verificar completitud de logs

### Integration Tests
- Envío de webhook a endpoint mock
- Recepción de comando incoming
- Flujo completo de retry con backoff
- Regeneración de secrets

### E2E Tests
- Configurar webhook desde UI
- Enviar evento de prueba
- Ver logs de delivery
- Configurar incoming webhook

