# Requirements Document: Notificaciones Push / Alertas Externas

## Introduction

Este documento define los requisitos para implementar un sistema de notificaciones push y alertas externas en TwitchVote, permitiendo a los usuarios recibir alertas fuera de la aplicación a través de notificaciones del navegador, Discord y Telegram.

## Glossary

- **Push_Notification_Service**: Servicio que gestiona el envío de notificaciones push del navegador
- **Discord_Webhook_Service**: Servicio que envía alertas a canales de Discord via webhooks
- **Telegram_Bot_Service**: Servicio que envía alertas a chats de Telegram via bot API
- **Alert_Config**: Configuración de qué eventos notificar y por qué canales
- **Notification_Event**: Evento que dispara una notificación (nuevo seguidor, raid, donación, etc.)

## Requirements

### Requirement 1: Notificaciones Push del Navegador

**User Story:** Como streamer, quiero recibir notificaciones del navegador cuando ocurran eventos importantes, para no perderme nada aunque tenga la app minimizada.

#### Acceptance Criteria

1. WHEN la aplicación inicia por primera vez, THE Push_Notification_Service SHALL solicitar permiso de notificaciones al usuario
2. WHEN el usuario concede permiso, THE Push_Notification_Service SHALL registrar el Service Worker para notificaciones
3. WHEN ocurre un evento configurado como notificable, THE Push_Notification_Service SHALL mostrar una notificación del navegador
4. THE Push_Notification_Service SHALL incluir título, mensaje e icono en cada notificación
5. WHEN el usuario hace clic en una notificación, THE Push_Notification_Service SHALL enfocar la ventana de la aplicación
6. IF el usuario deniega permisos, THEN THE Push_Notification_Service SHALL mostrar instrucciones para habilitarlos manualmente
7. THE Push_Notification_Service SHALL respetar el estado de "No molestar" del sistema operativo

---

### Requirement 2: Integración con Discord Webhook

**User Story:** Como streamer, quiero recibir alertas en mi servidor de Discord, para que mi equipo de moderación esté informado de eventos importantes.

#### Acceptance Criteria

1. WHEN el usuario configura un webhook de Discord, THE Discord_Webhook_Service SHALL validar la URL del webhook
2. WHEN ocurre un evento configurado, THE Discord_Webhook_Service SHALL enviar un mensaje embed al webhook
3. THE Discord_Webhook_Service SHALL formatear los mensajes con embeds de Discord (título, descripción, color, campos)
4. IF el webhook falla, THEN THE Discord_Webhook_Service SHALL reintentar con backoff exponencial (máximo 3 intentos)
5. THE Discord_Webhook_Service SHALL respetar el rate limit de Discord (30 mensajes por minuto)
6. WHEN se envía una alerta, THE Discord_Webhook_Service SHALL incluir timestamp y tipo de evento
7. FOR ALL webhooks configurados, validating then sending SHALL producir un resultado consistente (éxito o error específico)

---

### Requirement 3: Integración con Telegram Bot

**User Story:** Como streamer, quiero recibir alertas en Telegram, para estar informado desde mi móvil sin necesidad de abrir la app.

#### Acceptance Criteria

1. WHEN el usuario configura un bot de Telegram, THE Telegram_Bot_Service SHALL validar el token del bot
2. WHEN el usuario proporciona un chat ID, THE Telegram_Bot_Service SHALL verificar que el bot puede enviar mensajes a ese chat
3. WHEN ocurre un evento configurado, THE Telegram_Bot_Service SHALL enviar un mensaje al chat configurado
4. THE Telegram_Bot_Service SHALL formatear mensajes con Markdown para mejor legibilidad
5. IF el envío falla, THEN THE Telegram_Bot_Service SHALL reintentar con backoff exponencial (máximo 3 intentos)
6. THE Telegram_Bot_Service SHALL respetar el rate limit de Telegram (30 mensajes por segundo)
7. WHEN se envía una alerta, THE Telegram_Bot_Service SHALL incluir emoji indicativo del tipo de evento

---

### Requirement 4: Configuración de Alertas

**User Story:** Como streamer, quiero personalizar qué eventos me notifican y por qué canales, para no recibir spam de notificaciones.

#### Acceptance Criteria

1. THE Alert_Config SHALL permitir habilitar/deshabilitar cada canal de notificación independientemente
2. THE Alert_Config SHALL permitir seleccionar qué tipos de eventos notificar por cada canal
3. THE Alert_Config SHALL incluir los siguientes tipos de eventos: nuevo seguidor, raid, host, donación, suscripción, bits, encuesta finalizada, predicción resuelta, sorteo ganador, comando ejecutado
4. WHEN el usuario guarda la configuración, THE Alert_Config SHALL persistirla en localStorage
5. THE Alert_Config SHALL permitir configurar un "modo silencioso" con horarios
6. WHEN el modo silencioso está activo, THE Alert_Config SHALL suprimir todas las notificaciones
7. THE Alert_Config SHALL mostrar un test de notificación para cada canal configurado
8. FOR ALL configuraciones guardadas, loading then saving SHALL producir una configuración equivalente (round-trip)

---

### Requirement 5: Cola de Notificaciones

**User Story:** Como streamer, quiero que las notificaciones se gestionen de forma ordenada, para no perder ninguna aunque lleguen muchas a la vez.

#### Acceptance Criteria

1. WHEN múltiples eventos ocurren simultáneamente, THE Notification_Queue SHALL encolarlos en orden FIFO
2. THE Notification_Queue SHALL procesar notificaciones con un delay mínimo de 1 segundo entre cada una
3. IF la cola excede 50 notificaciones pendientes, THEN THE Notification_Queue SHALL agrupar notificaciones similares
4. THE Notification_Queue SHALL persistir notificaciones pendientes en caso de cierre inesperado
5. WHEN la aplicación reinicia, THE Notification_Queue SHALL procesar notificaciones pendientes
6. FOR ALL notificaciones encoladas, THE Notification_Queue SHALL mantener el orden de inserción (FIFO)

---

### Requirement 6: UI de Configuración

**User Story:** Como streamer, quiero una interfaz clara para configurar mis notificaciones, para poder gestionarlas fácilmente.

#### Acceptance Criteria

1. THE Notification_Config_Panel SHALL mostrar el estado de cada canal (habilitado/deshabilitado/error)
2. THE Notification_Config_Panel SHALL mostrar un indicador visual cuando hay notificaciones pendientes
3. THE Notification_Config_Panel SHALL permitir ver el historial de notificaciones enviadas (últimas 50)
4. THE Notification_Config_Panel SHALL mostrar estadísticas de notificaciones (enviadas hoy, fallidas, pendientes)
5. WHEN un canal tiene error de configuración, THE Notification_Config_Panel SHALL mostrar el error específico
6. THE Notification_Config_Panel SHALL incluir botón de "Probar" para cada canal configurado

