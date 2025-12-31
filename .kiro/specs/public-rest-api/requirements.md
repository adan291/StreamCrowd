# Requirements: API Pública REST

## Objetivo
Proporcionar una API REST pública que permita a desarrolladores externos integrar y controlar TwitchVote Live desde sus propias aplicaciones, bots, o servicios.

## Requisitos Funcionales

### 1. Autenticación y Autorización
- 1.1 Sistema de API Keys para autenticación
- 1.2 Generación de API Keys desde el panel de configuración
- 1.3 Revocación de API Keys
- 1.4 Scopes/permisos por API Key (read, write, admin)
- 1.5 Rate limiting por API Key (configurable)
- 1.6 Logging de uso de API por key

### 2. Endpoints de Encuestas (Polls)
- 2.1 GET /api/v1/polls - Listar encuestas
- 2.2 GET /api/v1/polls/:id - Obtener encuesta específica
- 2.3 POST /api/v1/polls - Crear nueva encuesta
- 2.4 PUT /api/v1/polls/:id - Actualizar encuesta
- 2.5 DELETE /api/v1/polls/:id - Eliminar encuesta
- 2.6 POST /api/v1/polls/:id/start - Iniciar encuesta
- 2.7 POST /api/v1/polls/:id/stop - Detener encuesta
- 2.8 GET /api/v1/polls/:id/results - Obtener resultados

### 3. Endpoints de Predicciones
- 3.1 GET /api/v1/predictions - Listar predicciones
- 3.2 POST /api/v1/predictions - Crear predicción
- 3.3 POST /api/v1/predictions/:id/lock - Bloquear predicción
- 3.4 POST /api/v1/predictions/:id/resolve - Resolver predicción
- 3.5 POST /api/v1/predictions/:id/cancel - Cancelar predicción

### 4. Endpoints de Sorteos (Giveaways)
- 4.1 GET /api/v1/giveaways - Listar sorteos
- 4.2 POST /api/v1/giveaways - Crear sorteo
- 4.3 POST /api/v1/giveaways/:id/start - Iniciar sorteo
- 4.4 POST /api/v1/giveaways/:id/draw - Seleccionar ganador
- 4.5 GET /api/v1/giveaways/:id/participants - Listar participantes

### 5. Endpoints de Timers
- 5.1 GET /api/v1/timers - Listar timers
- 5.2 POST /api/v1/timers - Crear timer
- 5.3 POST /api/v1/timers/:id/start - Iniciar timer
- 5.4 POST /api/v1/timers/:id/pause - Pausar timer
- 5.5 POST /api/v1/timers/:id/reset - Reiniciar timer

### 6. Endpoints de OBS
- 6.1 GET /api/v1/obs/status - Estado de conexión OBS
- 6.2 GET /api/v1/obs/scenes - Listar escenas
- 6.3 POST /api/v1/obs/scenes/switch - Cambiar escena
- 6.4 GET /api/v1/obs/sources - Listar fuentes
- 6.5 POST /api/v1/obs/sources/:name/visibility - Toggle visibilidad

### 7. Endpoints de Métricas
- 7.1 GET /api/v1/metrics/current - Métricas en tiempo real
- 7.2 GET /api/v1/metrics/session/:id - Métricas de sesión
- 7.3 GET /api/v1/metrics/history - Histórico de sesiones

### 8. WebSocket API (Real-time)
- 8.1 Conexión WebSocket para eventos en tiempo real
- 8.2 Suscripción a eventos específicos (polls, predictions, chat)
- 8.3 Broadcast de cambios de estado
- 8.4 Heartbeat/ping-pong para mantener conexión

## Requisitos No Funcionales

### 9. Documentación
- 9.1 Documentación OpenAPI/Swagger
- 9.2 Página de documentación interactiva
- 9.3 Ejemplos de código en múltiples lenguajes
- 9.4 Guía de inicio rápido

### 10. Seguridad
- 10.1 HTTPS obligatorio
- 10.2 Validación de input en todos los endpoints
- 10.3 Sanitización de datos
- 10.4 Headers de seguridad (CORS, CSP)
- 10.5 Protección contra ataques comunes (injection, XSS)

### 11. Rendimiento
- 11.1 Respuestas en menos de 200ms (p95)
- 11.2 Soporte para paginación en listados
- 11.3 Compresión gzip de respuestas
- 11.4 Caching de respuestas donde sea apropiado

## Propiedades de Correctness (Property Tests)

1. **Idempotencia**: Las operaciones GET son idempotentes
2. **Consistencia de Rate Limit**: El rate limiting se aplica consistentemente
3. **Validación de Scopes**: Los endpoints respetan los scopes de la API Key
4. **Formato de Respuesta**: Todas las respuestas siguen el mismo formato JSON
5. **Códigos HTTP**: Los códigos de estado HTTP son correctos para cada situación
6. **Paginación**: La paginación es consistente y no pierde elementos

## Dependencias
- Express.js o similar para el servidor HTTP
- Swagger/OpenAPI para documentación
- WebSocket (ws) para conexiones en tiempo real
- Servicios existentes de la aplicación
