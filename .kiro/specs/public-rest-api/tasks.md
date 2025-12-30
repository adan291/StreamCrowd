# Implementation Tasks: API Pública REST

## Task 1: Crear tipos y modelos
- [x] 1.1 Crear `types/api.ts` con interfaces APIKey, APIScope, APIResponse
- [x] 1.2 Crear tipos para RateLimitConfig, RateLimitStatus
- [x] 1.3 Crear tipos para APIErrorResponse, APIErrorCode
- [x] 1.4 Crear tipos para WebSocket events (ServerEvent, ClientMessage)
- [x] 1.5 Crear tipos para request/response de cada endpoint
- **Validates**: Requirement 1, 2, 3, 4, 5, 6, 7, 8

## Task 2: Implementar APIKeyService
- [x] 2.1 Crear `src/api/services/APIKeyService.ts`
- [x] 2.2 Implementar `generateKey(name, scopes)` con hash bcrypt
- [x] 2.3 Implementar `validateKey(key)` para autenticación
- [x] 2.4 Implementar `revokeKey(id)` para desactivar keys
- [x] 2.5 Implementar `listKeys()` para listar todas las keys
- [x] 2.6 Implementar `updateKey(id, updates)` para modificar
- [x] 2.7 Implementar `recordUsage(id)` para tracking
- [x] 2.8 Implementar persistencia en localStorage/IndexedDB
- **Validates**: Requirement 1.1, 1.2, 1.3, 1.4, 1.6

## Task 3: Property tests para APIKeyService
- [x] 3.1 Test: Keys generadas son únicas
- [x] 3.2 Test: Validación de key correcta/incorrecta
- [x] 3.3 Test: Revocación impide uso posterior
- [x] 3.4 Test: Scopes se respetan correctamente
- **Validates**: Property 3

## Task 4: Implementar RateLimiterService
- [x] 4.1 Crear `src/api/services/RateLimiterService.ts`
- [x] 4.2 Implementar `checkLimit(keyId)` con sliding window
- [x] 4.3 Implementar `recordRequest(keyId)` para conteo
- [x] 4.4 Implementar `getRemainingRequests(keyId)`
- [x] 4.5 Implementar `resetLimit(keyId)` para admin
- [x] 4.6 Implementar limpieza automática de ventanas expiradas
- **Validates**: Requirement 1.5

## Task 5: Property tests para RateLimiterService
- [x] 5.1 Test: Rate limit se aplica consistentemente
- [x] 5.2 Test: Ventana de tiempo se resetea correctamente
- [x] 5.3 Test: Requests dentro del límite pasan
- **Validates**: Property 2

## Task 6: Implementar Middleware de autenticación
- [x] 6.1 Crear `src/api/middleware/auth.ts`
- [x] 6.2 Implementar extracción de API Key del header
- [x] 6.3 Implementar validación de key
- [x] 6.4 Implementar verificación de scopes por ruta
- [x] 6.5 Implementar respuesta de error 401/403
- **Validates**: Requirement 1.1, 1.4, 10.1

## Task 7: Implementar Middleware de rate limiting
- [x] 7.1 Crear `src/api/middleware/rateLimiter.ts`
- [x] 7.2 Implementar integración con RateLimiterService
- [x] 7.3 Implementar headers X-RateLimit-*
- [x] 7.4 Implementar respuesta 429 Too Many Requests
- **Validates**: Requirement 1.5

## Task 8: Implementar Middleware de validación
- [x] 8.1 Crear `src/api/middleware/validation.ts`
- [x] 8.2 Implementar validación con Zod schemas
- [x] 8.3 Implementar sanitización de input
- [x] 8.4 Implementar respuesta de error de validación
- **Validates**: Requirement 10.2, 10.3

## Task 9: Implementar PollController
- [x] 9.1 Crear `src/api/controllers/PollController.ts`
- [x] 9.2 Implementar GET /polls (listar)
- [x] 9.3 Implementar GET /polls/:id (obtener)
- [x] 9.4 Implementar POST /polls (crear)
- [x] 9.5 Implementar PUT /polls/:id (actualizar)
- [x] 9.6 Implementar DELETE /polls/:id (eliminar)
- [x] 9.7 Implementar POST /polls/:id/start
- [x] 9.8 Implementar POST /polls/:id/stop
- [x] 9.9 Implementar GET /polls/:id/results
- **Validates**: Requirement 2.1-2.8

## Task 10: Implementar PredictionController
- [x] 10.1 Crear `src/api/controllers/PredictionController.ts`
- [x] 10.2 Implementar GET /predictions
- [x] 10.3 Implementar POST /predictions
- [x] 10.4 Implementar POST /predictions/:id/lock
- [x] 10.5 Implementar POST /predictions/:id/resolve
- [x] 10.6 Implementar POST /predictions/:id/cancel
- **Validates**: Requirement 3.1-3.5

## Task 11: Implementar GiveawayController
- [x] 11.1 Crear `src/api/controllers/GiveawayController.ts`
- [x] 11.2 Implementar GET /giveaways
- [x] 11.3 Implementar POST /giveaways
- [x] 11.4 Implementar POST /giveaways/:id/start
- [x] 11.5 Implementar POST /giveaways/:id/draw
- [x] 11.6 Implementar GET /giveaways/:id/participants
- **Validates**: Requirement 4.1-4.5

## Task 12: Implementar TimerController
- [x] 12.1 Crear `src/api/controllers/TimerController.ts`
- [x] 12.2 Implementar GET /timers
- [x] 12.3 Implementar POST /timers
- [x] 12.4 Implementar POST /timers/:id/start
- [x] 12.5 Implementar POST /timers/:id/pause
- [x] 12.6 Implementar POST /timers/:id/reset
- **Validates**: Requirement 5.1-5.5

## Task 13: Implementar OBSController
- [x] 13.1 Crear `src/api/controllers/OBSController.ts`
- [x] 13.2 Implementar GET /obs/status
- [x] 13.3 Implementar GET /obs/scenes
- [x] 13.4 Implementar POST /obs/scenes/switch
- [x] 13.5 Implementar GET /obs/sources
- [x] 13.6 Implementar POST /obs/sources/:name/visibility
- **Validates**: Requirement 6.1-6.5

## Task 14: Implementar MetricsController
- [x] 14.1 Crear `src/api/controllers/MetricsController.ts`
- [x] 14.2 Implementar GET /metrics/current
- [x] 14.3 Implementar GET /metrics/session/:id
- [x] 14.4 Implementar GET /metrics/history
- **Validates**: Requirement 7.1-7.3

## Task 15: Implementar WebSocketService
- [x] 15.1 Crear `src/api/services/WebSocketService.ts`
- [x] 15.2 Implementar conexión WebSocket con autenticación
- [x] 15.3 Implementar suscripción a eventos
- [x] 15.4 Implementar broadcast de eventos
- [x] 15.5 Implementar heartbeat/ping-pong
- [x] 15.6 Implementar reconexión automática
- **Validates**: Requirement 8.1-8.4

## Task 16: Implementar Router principal
- [x] 16.1 Crear `src/api/routes/index.ts`
- [x] 16.2 Configurar rutas de auth
- [x] 16.3 Configurar rutas de polls
- [x] 16.4 Configurar rutas de predictions
- [x] 16.5 Configurar rutas de giveaways
- [x] 16.6 Configurar rutas de timers
- [x] 16.7 Configurar rutas de obs
- [x] 16.8 Configurar rutas de metrics
- [x] 16.9 Configurar endpoint WebSocket
- **Validates**: Requirement 2-8

## Task 17: Crear documentación OpenAPI
- [x] 17.1 Crear `src/api/docs/openapi.yaml`
- [x] 17.2 Documentar endpoints de auth
- [x] 17.3 Documentar endpoints de polls
- [x] 17.4 Documentar endpoints de predictions
- [x] 17.5 Documentar endpoints de giveaways
- [x] 17.6 Documentar endpoints de timers
- [x] 17.7 Documentar endpoints de obs
- [x] 17.8 Documentar endpoints de metrics
- [x] 17.9 Documentar WebSocket events
- **Validates**: Requirement 9.1

## Task 18: Crear componentes UI
- [x] 18.1 Crear `components/api/APIKeyManager.tsx`
- [x] 18.2 Implementar lista de API Keys
- [x] 18.3 Implementar formulario crear/editar key
- [x] 18.4 Implementar botón revocar key
- [x] 18.5 Implementar copia de key al portapapeles
- [x] 18.6 Crear `components/api/APIDocsViewer.tsx`
- [x] 18.7 Crear `components/api/APIUsageStats.tsx`
- **Validates**: Requirement 9.2

## Task 19: Crear hook useAPIKeys
- [x] 19.1 Crear `hooks/useAPIKeys.ts`
- [x] 19.2 Implementar CRUD de API Keys
- [x] 19.3 Implementar estado de carga/error
- [x] 19.4 Implementar refresh automático
- **Validates**: Requirement 1.1-1.6

## Task 20: Tests de integración
- [x] 20.1 Test: Flujo completo de autenticación
- [x] 20.2 Test: CRUD de polls via API
- [x] 20.3 Test: Rate limiting funciona
- [x] 20.4 Test: WebSocket recibe eventos
- [x] 20.5 Test: Errores devuelven formato correcto
- **Validates**: Property 1, 4, 5, 6

## Task 21: Actualizar ROADMAP.md
- [x] 21.1 Marcar "API Pública REST" como completada en Fase 4
- [x] 21.2 Actualizar fecha de última modificación
- **Validates**: Documentation

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 5 |
| Servicios | 4 | 22 |
| Middleware | 3 | 12 |
| Controllers | 6 | 30 |
| WebSocket | 1 | 6 |
| Router | 1 | 9 |
| Documentación | 1 | 9 |
| UI Components | 1 | 7 |
| Hooks | 1 | 4 |
| Tests | 2 | 12 |
| Documentación | 1 | 2 |
| **Total** | **21** | **118** |

**Estimación**: 3-4 semanas
**Property Tests**: 12 tests cubriendo las 6 propiedades de correctness
