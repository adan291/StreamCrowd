# Requirements Document: Webhooks / Integraciones Externas

## Introduction

Este documento define los requisitos para implementar un sistema de webhooks que permita a TwitchVote conectarse con servicios externos, tanto enviando eventos (outgoing) como recibiendo comandos (incoming).

## Glossary

- **Webhook_Outgoing**: Endpoint externo al que TwitchVote envía eventos
- **Webhook_Incoming**: Endpoint interno que recibe comandos de servicios externos
- **Webhook_Service**: Servicio que gestiona el envío y recepción de webhooks
- **Webhook_Event**: Evento que se envía a webhooks configurados
- **Webhook_Signature**: Firma HMAC para verificar autenticidad de webhooks

## Requirements

### Requirement 1: Webhooks Outgoing (Envío de Eventos)

**User Story:** Como streamer, quiero enviar eventos de mi stream a servicios externos, para integrar TwitchVote con mis otras herramientas.

#### Acceptance Criteria

1. THE Webhook_Service SHALL permitir configurar múltiples webhooks outgoing
2. WHEN se configura un webhook, THE Webhook_Service SHALL validar que la URL sea HTTPS
3. THE Webhook_Service SHALL soportar los siguientes eventos: follower, raid, subscription, bits, poll_started, poll_ended, prediction_started, prediction_resolved, giveaway_winner, macro_executed
4. WHEN ocurre un evento configurado, THE Webhook_Service SHALL enviar un POST request al webhook
5. THE Webhook_Service SHALL incluir firma HMAC-SHA256 en el header X-Webhook-Signature
6. THE Webhook_Service SHALL incluir timestamp en el header X-Webhook-Timestamp
7. IF el webhook falla, THEN THE Webhook_Service SHALL reintentar con backoff exponencial (máximo 3 intentos)
8. THE Webhook_Service SHALL respetar un rate limit de 100 requests por minuto por webhook

---

### Requirement 2: Webhooks Incoming (Recepción de Comandos)

**User Story:** Como desarrollador, quiero enviar comandos a TwitchVote desde mis aplicaciones, para controlar el stream remotamente.

#### Acceptance Criteria

1. THE Webhook_Service SHALL exponer un endpoint único por instalación para recibir comandos
2. THE Webhook_Service SHALL validar la firma HMAC de requests entrantes
3. THE Webhook_Service SHALL soportar comandos: send_chat_message, change_scene, start_poll, start_prediction, execute_macro
4. WHEN se recibe un comando válido, THE Webhook_Service SHALL ejecutarlo y responder con el resultado
5. IF la firma es inválida, THEN THE Webhook_Service SHALL responder con 401 Unauthorized
6. IF el comando es inválido, THEN THE Webhook_Service SHALL responder con 400 Bad Request
7. THE Webhook_Service SHALL limitar requests entrantes a 60 por minuto por IP

---

### Requirement 3: Gestión de Secretos

**User Story:** Como streamer, quiero que mis webhooks sean seguros, para evitar que terceros envíen eventos falsos.

#### Acceptance Criteria

1. THE Webhook_Service SHALL generar un secret único por webhook outgoing
2. THE Webhook_Service SHALL generar un secret único para el endpoint incoming
3. THE Webhook_Service SHALL permitir regenerar secrets en cualquier momento
4. WHEN se regenera un secret, THE Webhook_Service SHALL invalidar el anterior inmediatamente
5. THE Webhook_Service SHALL almacenar secrets de forma segura (encriptados)
6. FOR ALL webhooks, la firma SHALL ser verificable usando el secret compartido

---

### Requirement 4: Payload de Eventos

**User Story:** Como desarrollador, quiero recibir información completa en los webhooks, para poder procesar los eventos correctamente.

#### Acceptance Criteria

1. THE Webhook_Service SHALL incluir en cada payload: event_type, event_id, timestamp, data
2. THE Webhook_Service SHALL incluir información del stream: channel_name, platform, viewers
3. THE Webhook_Service SHALL formatear el payload como JSON válido
4. THE Webhook_Service SHALL incluir versión del API en el header X-API-Version
5. FOR ALL payloads, serializing then deserializing SHALL producir datos equivalentes (round-trip)

---

### Requirement 5: Logs y Monitoreo

**User Story:** Como streamer, quiero ver el historial de webhooks enviados, para depurar problemas de integración.

#### Acceptance Criteria

1. THE Webhook_Service SHALL registrar cada intento de envío con timestamp y resultado
2. THE Webhook_Service SHALL mostrar los últimos 100 eventos por webhook
3. THE Webhook_Service SHALL mostrar estadísticas: enviados, fallidos, pendientes
4. WHEN un webhook falla repetidamente, THE Webhook_Service SHALL mostrar alerta visual
5. THE Webhook_Service SHALL permitir reenviar eventos fallidos manualmente

---

### Requirement 6: UI de Configuración

**User Story:** Como streamer, quiero una interfaz clara para configurar mis webhooks, para gestionarlos fácilmente.

#### Acceptance Criteria

1. THE Webhook_Config_Panel SHALL mostrar lista de webhooks configurados con estado
2. THE Webhook_Config_Panel SHALL permitir crear, editar y eliminar webhooks
3. THE Webhook_Config_Panel SHALL mostrar el secret de cada webhook (con opción de copiar)
4. THE Webhook_Config_Panel SHALL permitir seleccionar qué eventos enviar a cada webhook
5. THE Webhook_Config_Panel SHALL mostrar botón de "Test" para enviar evento de prueba
6. THE Webhook_Config_Panel SHALL mostrar el endpoint incoming con instrucciones de uso

---

### Requirement 7: Documentación de Integración

**User Story:** Como desarrollador, quiero documentación clara de la API de webhooks, para integrar mis aplicaciones.

#### Acceptance Criteria

1. THE Webhook_Service SHALL generar documentación OpenAPI/Swagger del endpoint incoming
2. THE Webhook_Service SHALL incluir ejemplos de payloads para cada tipo de evento
3. THE Webhook_Service SHALL incluir ejemplos de código para verificar firmas (Node.js, Python, PHP)
4. THE Webhook_Service SHALL incluir guía de integración con Zapier/IFTTT

