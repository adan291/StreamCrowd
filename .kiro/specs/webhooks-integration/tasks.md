# Implementation Tasks: Webhooks / Integraciones Externas

## Task 1: Crear tipos y modelos de webhooks
- [x] 1.1 Crear `types/webhooks.ts` con interfaces WebhookConfig, WebhookPayload, WebhookDelivery
- [x] 1.2 Crear tipos para incoming webhooks: IncomingWebhookConfig, IncomingWebhookRequest, IncomingWebhookResponse
- [x] 1.3 Definir WebhookEventType y IncomingCommandType como union types
- **Validates**: Requirement 1, 2, 4

## Task 2: Implementar WebhookSignatureService
- [x] 2.1 Crear `src/application/services/WebhookSignatureService.ts`
- [x] 2.2 Implementar `sign(payload, secret, timestamp)` usando HMAC-SHA256
- [x] 2.3 Implementar `verify(payload, signature, secret, timestamp)` con tolerancia de 5 minutos
- [x] 2.4 Implementar `generateSecret()` para crear secrets criptográficamente seguros
- **Validates**: Requirement 1.5, 1.6, 2.2, 3.1, 3.2

## Task 3: Property tests para WebhookSignatureService
- [x] 3.1 Escribir property test para signature round-trip (Property 1)
- [x] 3.2 Escribir property test para secret uniqueness (Property 2)
- [x] 3.3 Escribir property test para timestamp tolerance (Property 7)
- **Validates**: Requirement 1.5, 2.2, 3.1, 3.2, 3.6

## Task 4: Implementar WebhookStorageService
- [x] 4.1 Crear `src/application/services/WebhookStorageService.ts`
- [x] 4.2 Implementar CRUD para webhooks en IndexedDB
- [x] 4.3 Implementar almacenamiento de deliveries con índices
- [x] 4.4 Implementar almacenamiento encriptado de secrets
- [x] 4.5 Implementar getDeliveries con filtros y paginación (últimos 100)
- **Validates**: Requirement 3.5, 5.1, 5.2

## Task 5: Implementar OutgoingWebhookService
- [x] 5.1 Crear `src/application/services/OutgoingWebhookService.ts`
- [x] 5.2 Implementar `send(webhook, payload)` con firma HMAC y headers
- [x] 5.3 Implementar retry con backoff exponencial (máximo 3 intentos)
- [x] 5.4 Implementar rate limiting (100 req/min por webhook)
- [x] 5.5 Implementar logging de cada intento de envío
- **Validates**: Requirement 1.4, 1.5, 1.6, 1.7, 1.8, 5.1

## Task 6: Property tests para OutgoingWebhookService
- [x] 6.1 Escribir property test para retry backoff (Property 5)
- [x] 6.2 Escribir property test para rate limiting (Property 4)
- [x] 6.3 Escribir property test para delivery logging (Property 8)
- **Validates**: Requirement 1.7, 1.8, 5.1

## Task 7: Implementar IncomingWebhookService
- [x] 7.1 Crear `src/application/services/IncomingWebhookService.ts`
- [x] 7.2 Implementar `handleRequest(request, signature)` con validación de firma
- [x] 7.3 Implementar rate limiting por IP (60 req/min)
- [x] 7.4 Implementar ejecutores para cada comando: send_chat_message, change_scene, start_poll, start_prediction, execute_macro
- [x] 7.5 Implementar logging de requests entrantes
- **Validates**: Requirement 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

## Task 8: Implementar WebhookService (orchestrator)
- [x] 8.1 Crear `src/application/services/WebhookService.ts`
- [x] 8.2 Implementar createWebhook, updateWebhook, deleteWebhook, getWebhooks
- [x] 8.3 Implementar triggerEvent que filtra webhooks por evento y envía
- [x] 8.4 Implementar testWebhook para enviar evento de prueba
- [x] 8.5 Implementar retryDelivery para reenviar eventos fallidos
- [x] 8.6 Implementar regenerateSecret y regenerateIncomingSecret
- **Validates**: Requirement 1.1, 1.2, 1.3, 3.3, 3.4, 5.5

## Task 9: Property tests para WebhookService
- [x] 9.1 Escribir property test para payload round-trip (Property 3)
- [x] 9.2 Escribir property test para event filtering (Property 6)
- **Validates**: Requirement 1.3, 4.5

## Task 10: Crear hooks de React
- [x] 10.1 Crear `hooks/useWebhooks.ts` para gestión de webhooks outgoing
- [x] 10.2 Crear `hooks/useWebhookLogs.ts` para visualización de logs
- [x] 10.3 Crear `hooks/useIncomingWebhook.ts` para configuración incoming
- **Validates**: Requirement 1, 2, 5, 6

## Task 11: Crear WebhookConfigPanel
- [x] 11.1 Crear `components/webhooks/WebhookConfigPanel.tsx`
- [x] 11.2 Implementar lista de webhooks con estado (activo/inactivo/error)
- [x] 11.3 Implementar formulario de crear/editar webhook con validación URL HTTPS
- [x] 11.4 Implementar selector de eventos por webhook
- [x] 11.5 Implementar botón de copiar secret y regenerar
- [x] 11.6 Implementar botón de test webhook
- **Validates**: Requirement 6.1, 6.2, 6.3, 6.4, 6.5

## Task 12: Crear WebhookLogViewer
- [x] 12.1 Crear `components/webhooks/WebhookLogViewer.tsx`
- [x] 12.2 Implementar lista de últimos 100 eventos por webhook
- [x] 12.3 Implementar estadísticas: enviados, fallidos, pendientes
- [x] 12.4 Implementar alerta visual para webhooks con fallos repetidos
- [x] 12.5 Implementar botón de reenviar eventos fallidos
- **Validates**: Requirement 5.2, 5.3, 5.4, 5.5

## Task 13: Crear IncomingWebhookPanel
- [x] 13.1 Crear `components/webhooks/IncomingWebhookPanel.tsx`
- [x] 13.2 Mostrar endpoint único con instrucciones de uso
- [x] 13.3 Implementar selector de comandos permitidos
- [x] 13.4 Implementar configuración de rate limit
- [x] 13.5 Mostrar secret con opción de copiar y regenerar
- **Validates**: Requirement 2.1, 6.6

## Task 14: Integrar webhooks con eventos del sistema
- [x] 14.1 Integrar con eventos de Twitch: follower, raid, subscription, bits
- [x] 14.2 Integrar con eventos de polls: poll_started, poll_ended
- [x] 14.3 Integrar con eventos de predictions: prediction_started, prediction_resolved
- [x] 14.4 Integrar con eventos de giveaway: giveaway_winner
- [x] 14.5 Integrar con eventos de macros: macro_executed
- **Validates**: Requirement 1.3, 4.1, 4.2

## Task 15: Crear documentación de integración
- [x] 15.1 Crear `components/webhooks/WebhookDocs.tsx` con documentación inline
- [x] 15.2 Incluir ejemplos de payloads para cada tipo de evento
- [x] 15.3 Incluir ejemplos de código para verificar firmas (Node.js, Python, PHP)
- [x] 15.4 Incluir guía de integración con Zapier/IFTTT
- **Validates**: Requirement 7.1, 7.2, 7.3, 7.4

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 3 |
| Servicios | 5 | 22 |
| Property Tests | 3 | 8 |
| Hooks | 1 | 3 |
| UI Components | 4 | 16 |
| Integración | 1 | 5 |
| Documentación | 1 | 4 |
| **Total** | **15** | **61** |

**Estimación**: 2-3 semanas
**Property Tests**: 8 tests cubriendo las 8 propiedades de correctness
