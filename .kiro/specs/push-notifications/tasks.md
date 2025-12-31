# Implementation Plan: Notificaciones Push / Alertas Externas

## Overview

Plan de implementación para el sistema de notificaciones push y alertas externas de TwitchVote, incluyendo Web Push API, Discord webhooks, Telegram bot y cola de notificaciones.

## Tasks

- [x] 1. Crear tipos e interfaces base
  - [x] 1.1 Crear `types/notifications.ts`
    - Definir NotificationEvent, NotificationEventType
    - Definir AlertConfig, NotificationChannel
    - Definir interfaces para cada servicio
    - Definir NotificationHistoryEntry, QueuedNotification
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Implementar DiscordWebhookService
  - [x] 2.1 Crear `src/application/services/DiscordWebhookService.ts`
    - Implementar validateWebhook con regex de URL
    - Implementar sendEmbed con formato de Discord
    - Implementar sendMessage básico
    - Implementar retry con backoff exponencial
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Property test: Discord webhook URL validation
    - **Property 1: Discord Webhook URL Validation**
    - **Validates: Requirements 2.1**

- [x] 3. Implementar TelegramBotService
  - [x] 3.1 Crear `src/application/services/TelegramBotService.ts`
    - Implementar validateBot con llamada a getMe
    - Implementar validateChat con llamada a getChat
    - Implementar sendMessage con Markdown
    - Implementar mapeo de emojis por tipo de evento
    - Implementar retry con backoff exponencial
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Implementar PushNotificationService
  - [x] 4.1 Crear `src/application/services/PushNotificationService.ts`
    - Implementar requestPermission
    - Implementar getPermissionStatus
    - Implementar showNotification con Notification API
    - Implementar isSupported check
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 5. Implementar NotificationQueueService
  - [x] 5.1 Crear `src/application/services/NotificationQueueService.ts`
    - Implementar enqueue con persistencia en IndexedDB
    - Implementar process con delay de 1 segundo
    - Implementar agrupación cuando excede 50 items
    - Implementar getPending y getCount
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.2 Property test: Notification queue FIFO order
    - **Property 2: Notification Queue FIFO Order**
    - **Validates: Requirements 5.1, 5.6**

- [x] 6. Implementar AlertConfigService
  - [x] 6.1 Crear `src/application/services/AlertConfigService.ts`
    - Implementar loadConfig y saveConfig
    - Implementar isEventEnabled para filtrado
    - Implementar isQuietHoursActive
    - Implementar getEnabledChannels
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Property test: Alert config round-trip
    - **Property 3: Alert Config Round-Trip**
    - **Validates: Requirements 4.4, 4.8**

  - [x] 6.3 Property test: Quiet hours enforcement
    - **Property 5: Quiet Hours Enforcement**
    - **Validates: Requirements 4.5, 4.6**

  - [x] 6.4 Property test: Event type filtering
    - **Property 6: Event Type Filtering**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 7. Implementar NotificationService (Orchestrator)
  - [x] 7.1 Crear `src/application/services/NotificationService.ts`
    - Implementar notify que coordina todos los canales
    - Implementar testChannel para cada canal
    - Integrar con AlertConfigService para filtrado
    - Integrar con NotificationQueueService
    - _Requirements: 1.3, 2.2, 3.3, 4.2_

  - [x] 7.2 Property test: Retry backoff behavior
    - **Property 4: Retry Backoff Behavior**
    - **Validates: Requirements 2.4, 3.5**

  - [x] 7.3 Property test: Notification message completeness
    - **Property 7: Notification Message Completeness**
    - **Validates: Requirements 2.3, 2.6, 3.4, 3.7**

- [x] 8. Checkpoint - Verificar servicios
  - Asegurar que todos los tests pasan
  - Verificar que el build compila sin errores

- [x] 9. Implementar NotificationHistoryService
  - [x] 9.1 Crear `src/application/services/NotificationHistoryService.ts`
    - Implementar addEntry con límite de 50
    - Implementar getHistory
    - Implementar getStats (enviadas hoy, fallidas, pendientes)
    - Persistir en IndexedDB
    - _Requirements: 6.3, 6.4_

  - [x] 9.2 Property test: History limit enforcement
    - **Property 8: History Limit Enforcement**
    - **Validates: Requirements 6.3**

- [x] 10. Implementar Hooks de React
  - [x] 10.1 Crear `hooks/useNotifications.ts`
    - Hook para enviar notificaciones desde componentes
    - Exponer notify, testChannel
    - _Requirements: 1.3, 2.2, 3.3_

  - [x] 10.2 Crear `hooks/useNotificationConfig.ts`
    - Hook para gestionar configuración de alertas
    - Exponer config, updateConfig, resetConfig
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 10.3 Crear `hooks/useNotificationHistory.ts`
    - Hook para acceder al historial
    - Exponer history, stats, clearHistory
    - _Requirements: 6.3, 6.4_

- [x] 11. Implementar Componentes UI
  - [x] 11.1 Crear `components/NotificationConfigPanel.tsx`
    - Tabs para cada canal (Push, Discord, Telegram)
    - Formularios de configuración por canal
    - Selector de eventos por canal
    - Configuración de quiet hours
    - Botones de test por canal
    - _Requirements: 4.1, 4.2, 4.5, 4.7, 6.1, 6.5, 6.6_

  - [x] 11.2 Crear `components/NotificationHistory.tsx`
    - Lista de notificaciones enviadas
    - Filtros por canal y estado
    - Estadísticas de notificaciones
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 12. Integrar en la Aplicación
  - [x] 12.1 Añadir traducciones a `i18n/locales.ts`
    - Textos para configuración de notificaciones
    - Textos para cada canal
    - Textos para tipos de eventos
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 12.2 Integrar NotificationConfigPanel en Settings
    - Añadir sección de notificaciones en configuración
    - _Requirements: 6.1_

  - [x] 12.3 Conectar eventos de la app con NotificationService
    - Emitir notificaciones en eventos de stream
    - Emitir notificaciones en fin de encuestas/predicciones
    - Emitir notificaciones en sorteos
    - _Requirements: 4.3_

- [x] 13. Checkpoint Final
  - Asegurar que todos los tests pasan
  - Verificar que el build compila sin errores
  - Probar flujo completo de notificaciones

## Notes

- Todas las tareas son obligatorias incluyendo property tests
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud

## Dependencies

- Task 2, 3, 4 son independientes y pueden hacerse en paralelo
- Task 5 depende de IndexedDB (ya implementado en offline-mode)
- Task 6 depende de Task 2, 3, 4 para validación de canales
- Task 7 depende de Task 2, 3, 4, 5, 6
- Task 9 depende de Task 7
- Task 10, 11 dependen de Task 7, 9

## Estimación de Tiempo

| Task | Complejidad | Tiempo Estimado |
|------|-------------|-----------------|
| Task 1: Tipos | Baja | 0.5 días |
| Task 2: Discord | Media | 1 día |
| Task 3: Telegram | Media | 1 día |
| Task 4: Push | Baja | 0.5 días |
| Task 5: Queue | Media | 1 día |
| Task 6: Config | Media | 1 día |
| Task 7: Orchestrator | Media | 1 día |
| Task 8: Checkpoint | - | 0.5 días |
| Task 9: History | Baja | 0.5 días |
| Task 10: Hooks | Baja | 0.5 días |
| Task 11: UI | Media | 1.5 días |
| Task 12: Integration | Baja | 1 día |
| Task 13: Checkpoint | - | 0.5 días |

**Total estimado: 10-12 días**

