# Design: API Pública REST

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   Auth   │  │  Rate    │  │  CORS    │  │   Validation     │ │
│  │Middleware│  │ Limiter  │  │ Handler  │  │   Middleware     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Router Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  /polls  │  │/predict  │  │/giveaway │  │    /timers       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   /obs   │  │ /metrics │  │  /auth   │  │      /ws         │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Layer                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ PollController │  │PredictControll │  │ GiveawayController │ │
│  └────────────────┘  └────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│         (Existing Application Services)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. APIKeyService
Gestión de API Keys para autenticación.

```typescript
interface APIKey {
  id: string;
  key: string;           // Hash del key real
  name: string;          // Nombre descriptivo
  scopes: APIScope[];    // Permisos
  rateLimit: number;     // Requests por minuto
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  enabled: boolean;
}

type APIScope = 
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  | 'metrics:read'
  | 'admin';

class APIKeyService {
  generateKey(name: string, scopes: APIScope[]): Promise<{ id: string; key: string }>;
  validateKey(key: string): Promise<APIKey | null>;
  revokeKey(id: string): Promise<void>;
  listKeys(): Promise<APIKey[]>;
  updateKey(id: string, updates: Partial<APIKey>): Promise<APIKey>;
  recordUsage(id: string): Promise<void>;
}
```

### 2. RateLimiterService
Control de rate limiting por API Key.

```typescript
interface RateLimitConfig {
  windowMs: number;      // Ventana de tiempo
  maxRequests: number;   // Máximo de requests
}

interface RateLimitStatus {
  remaining: number;
  reset: number;
  limit: number;
}

class RateLimiterService {
  checkLimit(keyId: string): Promise<RateLimitStatus>;
  recordRequest(keyId: string): Promise<void>;
  getRemainingRequests(keyId: string): Promise<number>;
  resetLimit(keyId: string): Promise<void>;
}
```

### 3. APIRouter
Enrutador principal de la API.

```typescript
// Estructura de rutas
/api/v1/
├── auth/
│   ├── POST /keys          # Crear API Key
│   ├── GET /keys           # Listar API Keys
│   ├── DELETE /keys/:id    # Revocar API Key
│   └── GET /keys/:id/usage # Uso de API Key
│
├── polls/
│   ├── GET /               # Listar encuestas
│   ├── POST /              # Crear encuesta
│   ├── GET /:id            # Obtener encuesta
│   ├── PUT /:id            # Actualizar encuesta
│   ├── DELETE /:id         # Eliminar encuesta
│   ├── POST /:id/start     # Iniciar encuesta
│   ├── POST /:id/stop      # Detener encuesta
│   └── GET /:id/results    # Resultados
│
├── predictions/
│   ├── GET /               # Listar predicciones
│   ├── POST /              # Crear predicción
│   ├── POST /:id/lock      # Bloquear
│   ├── POST /:id/resolve   # Resolver
│   └── POST /:id/cancel    # Cancelar
│
├── giveaways/
│   ├── GET /               # Listar sorteos
│   ├── POST /              # Crear sorteo
│   ├── POST /:id/start     # Iniciar
│   ├── POST /:id/draw      # Sortear
│   └── GET /:id/participants
│
├── timers/
│   ├── GET /               # Listar timers
│   ├── POST /              # Crear timer
│   ├── POST /:id/start     # Iniciar
│   ├── POST /:id/pause     # Pausar
│   └── POST /:id/reset     # Reiniciar
│
├── obs/
│   ├── GET /status         # Estado conexión
│   ├── GET /scenes         # Listar escenas
│   ├── POST /scenes/switch # Cambiar escena
│   ├── GET /sources        # Listar fuentes
│   └── POST /sources/:name/visibility
│
├── metrics/
│   ├── GET /current        # Métricas actuales
│   ├── GET /session/:id    # Sesión específica
│   └── GET /history        # Histórico
│
└── ws                      # WebSocket endpoint
```

### 4. Formato de Respuesta Estándar

```typescript
// Respuesta exitosa
interface APIResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

// Respuesta de error
interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Códigos de error
type APIErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST';
```

### 5. WebSocket Events

```typescript
// Eventos que el servidor emite
type ServerEvent =
  | { type: 'poll:created'; data: Poll }
  | { type: 'poll:updated'; data: Poll }
  | { type: 'poll:started'; data: Poll }
  | { type: 'poll:stopped'; data: Poll }
  | { type: 'poll:vote'; data: { pollId: string; optionId: number; votes: number } }
  | { type: 'prediction:created'; data: Prediction }
  | { type: 'prediction:locked'; data: Prediction }
  | { type: 'prediction:resolved'; data: Prediction }
  | { type: 'giveaway:winner'; data: { giveawayId: string; winner: string } }
  | { type: 'timer:tick'; data: { timerId: string; remaining: number } }
  | { type: 'obs:scene_changed'; data: { sceneName: string } }
  | { type: 'metrics:update'; data: MetricsSnapshot };

// Mensajes que el cliente puede enviar
type ClientMessage =
  | { type: 'subscribe'; events: string[] }
  | { type: 'unsubscribe'; events: string[] }
  | { type: 'ping' };
```

### 6. OpenAPI Documentation

```yaml
openapi: 3.0.3
info:
  title: TwitchVote Live API
  version: 1.0.0
  description: API pública para integrar con TwitchVote Live

servers:
  - url: http://localhost:3000/api/v1
    description: Local development

security:
  - ApiKeyAuth: []

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

## Flujo de Autenticación

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Gateway │────▶│  Auth    │────▶│  Service │
│          │     │          │     │Middleware│     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │  X-API-Key     │                │                │
     │───────────────▶│                │                │
     │                │  Validate Key  │                │
     │                │───────────────▶│                │
     │                │                │  Check Scopes  │
     │                │                │───────────────▶│
     │                │                │                │
     │                │◀───────────────│◀───────────────│
     │                │   Authorized   │                │
     │◀───────────────│                │                │
     │   Response     │                │                │
```

## Estructura de Archivos

```
src/
├── api/
│   ├── middleware/
│   │   ├── auth.ts           # Autenticación API Key
│   │   ├── rateLimiter.ts    # Rate limiting
│   │   ├── validation.ts     # Validación de input
│   │   ├── cors.ts           # CORS handler
│   │   └── errorHandler.ts   # Manejo de errores
│   │
│   ├── routes/
│   │   ├── index.ts          # Router principal
│   │   ├── auth.routes.ts    # Rutas de auth
│   │   ├── polls.routes.ts   # Rutas de polls
│   │   ├── predictions.routes.ts
│   │   ├── giveaways.routes.ts
│   │   ├── timers.routes.ts
│   │   ├── obs.routes.ts
│   │   └── metrics.routes.ts
│   │
│   ├── controllers/
│   │   ├── PollController.ts
│   │   ├── PredictionController.ts
│   │   ├── GiveawayController.ts
│   │   ├── TimerController.ts
│   │   ├── OBSController.ts
│   │   └── MetricsController.ts
│   │
│   ├── services/
│   │   ├── APIKeyService.ts
│   │   ├── RateLimiterService.ts
│   │   └── WebSocketService.ts
│   │
│   ├── types/
│   │   └── api.ts            # Tipos de la API
│   │
│   └── docs/
│       └── openapi.yaml      # Documentación OpenAPI
│
├── components/
│   └── api/
│       ├── APIKeyManager.tsx     # UI para gestionar keys
│       ├── APIDocsViewer.tsx     # Visor de documentación
│       └── APIUsageStats.tsx     # Estadísticas de uso
│
└── hooks/
    └── useAPIKeys.ts         # Hook para gestión de keys
```

## Consideraciones de Seguridad

1. **API Keys**: Hash con bcrypt, nunca almacenar en texto plano
2. **Rate Limiting**: Por IP y por API Key
3. **Validación**: Zod para validación de schemas
4. **CORS**: Configuración estricta por dominio
5. **Headers**: X-Content-Type-Options, X-Frame-Options, etc.
6. **Logging**: Registrar todos los accesos para auditoría
