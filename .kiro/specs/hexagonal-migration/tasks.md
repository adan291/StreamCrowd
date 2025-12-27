# Implementation Plan: Hexagonal Migration

## Overview

Este plan implementa la migración completa a arquitectura hexagonal, consolidando los servicios legacy en la estructura `src/`. Las tareas están ordenadas para minimizar breaking changes y permitir validación incremental.

## Tasks

- [x] 1. Crear entidades de dominio
  - [x] 1.1 Crear `StreamEvent` entity
    - Crear `src/domain/entities/StreamEvent.ts`
    - Definir tipos: `StreamEventType`, `SubTier`
    - Definir interfaz `StreamEvent` con todos los campos
    - Exportar desde `src/domain/entities/index.ts`
    - _Requirements: 2.1_

  - [x] 1.2 Crear `ModerationConfig` entity
    - Crear `src/domain/entities/ModerationConfig.ts`
    - Definir tipos: `RejectionReason`, `ModerationConfig`, `ModerationResult`, `ModerationStats`
    - Exportar desde `src/domain/entities/index.ts`
    - _Requirements: 1.7, 1.8_

  - [x] 1.3 Crear `ChatMetrics` entity
    - Crear `src/domain/entities/ChatMetrics.ts`
    - Definir tipos: `ActivityLevel`, `Sentiment`, `SpecialMood`, `ChatMetrics`
    - Exportar desde `src/domain/entities/index.ts`
    - _Requirements: 3.6_

- [x] 2. Crear puertos de dominio
  - [x] 2.1 Crear `IStreamEventProvider` port
    - Crear `src/domain/ports/IStreamEventProvider.ts`
    - Definir `StreamEventCallback` type
    - Definir interfaz `IStreamEventProvider`
    - Exportar desde `src/domain/ports/index.ts`
    - _Requirements: 2.2_

  - [x] 2.2 Crear `IAnalyticsProvider` port
    - Crear `src/domain/ports/IAnalyticsProvider.ts`
    - Definir `AIProvider` type y `AIProviderConfig` interfaz
    - Definir interfaz `IAnalyticsProvider`
    - Exportar desde `src/domain/ports/index.ts`
    - _Requirements: 3.7_

- [x] 3. Implementar ModerationService
  - [x] 3.1 Crear `ModerationService`
    - Crear `src/application/services/ModerationService.ts`
    - Implementar constructor con config por defecto
    - Implementar `processVote()` con toda la lógica de validación
    - Implementar `setConfig()`, `getConfig()`
    - Implementar `getStats()`, `resetStats()`
    - Implementar `getUserVote()`, `clearUserVotes()`
    - Migrar lógica de `services/voteModerationService.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [ ]* 3.2 Property test: Validation Consistency
    - **Property 1: ModerationService Validation Consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6**

  - [ ]* 3.3 Property test: Statistics Accuracy
    - **Property 2: ModerationService Statistics Accuracy**
    - **Validates: Requirements 1.4**

  - [x] 3.4 Implementar gestión de presets
    - Implementar `savePreset()`, `loadPreset()`, `deletePreset()`, `getAllPresets()`
    - Usar localStorage para persistencia
    - _Requirements: 1.5_

  - [ ]* 3.5 Property test: Preset Round-Trip
    - **Property 3: ModerationService Preset Round-Trip**
    - **Validates: Requirements 1.5**

- [x] 4. Checkpoint - Validar ModerationService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar StreamEventService
  - [x] 5.1 Crear `StreamEventService`
    - Crear `src/application/services/StreamEventService.ts`
    - Implementar `startSession()`, `endSession()`, `getSessionId()`
    - Implementar `addEvent()`, `getEvents()`, `getEventsByTimeRange()`
    - Implementar sistema de listeners con `on()`, `off()`
    - _Requirements: 2.4, 2.5, 2.7_

  - [ ]* 5.2 Property test: Event Storage
    - **Property 4: StreamEventService Event Storage**
    - **Validates: Requirements 2.4, 2.7**

  - [ ]* 5.3 Property test: Listener Notification
    - **Property 5: StreamEventService Listener Notification**
    - **Validates: Requirements 2.5**

  - [x] 5.4 Implementar agregaciones y categorización
    - Implementar `getSubCount()`, `getRaidCount()`, `getTotalBits()`, `getEventSummary()`
    - Implementar categorización de tiers (Prime, 1000, 2000, 3000)
    - Implementar `saveSession()`, `loadSession()`
    - _Requirements: 2.6_

  - [ ]* 5.5 Property test: Tier Categorization
    - **Property 6: StreamEventService Tier Categorization**
    - **Validates: Requirements 2.6**

- [x] 6. Checkpoint - Validar StreamEventService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar AnalyticsService
  - [x] 7.1 Crear `AnalyticsService` base
    - Crear `src/application/services/AnalyticsService.ts`
    - Implementar `setAIConfig()`, `getAIConfig()`, `isAIConfigured()`
    - Implementar `startSession()`, `endSession()`, `getCurrentSession()`, `addMessage()`
    - Migrar lógica de `services/chatAnalysisService.ts`
    - _Requirements: 3.1, 3.2_

  - [ ]* 7.2 Property test: Metrics Calculation
    - **Property 7: AnalyticsService Metrics Calculation**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 7.3 Implementar detección de mood y sentiment
    - Implementar `detectSentiment()`, `detectSpecialMood()`
    - Migrar patrones de detección de `chatAnalysisService.ts`
    - _Requirements: 3.3_

  - [ ]* 7.4 Property test: Mood Detection
    - **Property 8: AnalyticsService Mood Detection**
    - **Validates: Requirements 3.3**

  - [x] 7.5 Implementar word cloud y emotes
    - Implementar `generateWordCloud()`, top emotes
    - Implementar `calculateEngagement()`
    - _Requirements: 3.4_

  - [ ]* 7.6 Property test: Word Cloud Generation
    - **Property 9: AnalyticsService Word Cloud Generation**
    - **Validates: Requirements 3.4**

  - [x] 7.7 Implementar análisis con AI
    - Implementar `analyzeWithAI()` con soporte para Gemini, OpenAI, Anthropic
    - Implementar fallback a análisis local
    - Migrar lógica de `services/aiAnalyticsService.ts`
    - _Requirements: 3.5, 3.8_

  - [x] 7.8 Implementar historial de sesiones
    - Implementar `getSessions()`, `getSessionsByDate()`, `clearOldSessions()`
    - Persistir en localStorage
    - _Requirements: 3.1_

- [x] 8. Checkpoint - Validar AnalyticsService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Mejorar TwitchService y TwitchAdapter
  - [x] 9.1 Extender `TwitchAdapter` con stream events
    - Modificar `src/infrastructure/adapters/TwitchAdapter.ts`
    - Implementar `IStreamEventProvider`
    - Añadir handlers para subs, raids, cheers, bans
    - Migrar lógica de eventos de `services/twitchService.ts`
    - _Requirements: 2.3, 4.1_

  - [x] 9.2 Integrar OAuth en TwitchAdapter
    - Migrar lógica de `services/twitchOAuth.ts` a TwitchAdapter
    - Implementar token management y expiration warnings
    - _Requirements: 4.6, 4.7_

  - [x] 9.3 Crear `TwitchService` mejorado
    - Crear `src/application/services/TwitchService.ts`
    - Implementar `connect()`, `disconnect()`, `getConnectionStatus()`
    - Implementar reconnection con exponential backoff
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ]* 9.4 Property test: Reconnection Backoff
    - **Property 10: TwitchService Reconnection Backoff**
    - **Validates: Requirements 4.1, 4.5**

  - [x] 9.5 Implementar collaboration channels
    - Implementar `addCollaborationChannel()`, `removeCollaborationChannel()`, `getCollaborationChannels()`
    - Migrar lógica de multi-channel de `services/twitchService.ts`
    - _Requirements: 4.2, 4.3_

  - [ ]* 9.6 Property test: Collaboration Channels
    - **Property 11: TwitchService Collaboration Channels**
    - **Validates: Requirements 4.2**

- [x] 10. Checkpoint - Validar TwitchService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Crear hooks de aplicación
  - [x] 11.1 Crear `useModerationService` hook
    - Crear `src/application/hooks/useModerationService.ts`
    - Usar ModerationService internamente
    - Mantener API compatible con `hooks/useModeration.ts`
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 5.2, 5.6_

  - [x] 11.2 Crear `useStreamEventService` hook
    - Crear `src/application/hooks/useStreamEventService.ts`
    - Usar StreamEventService internamente
    - Mantener API compatible con `hooks/useStreamEvents.ts`
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 5.3, 5.6_

  - [x] 11.3 Crear `useAnalyticsService` hook
    - Crear `src/application/hooks/useAnalyticsService.ts`
    - Usar AnalyticsService internamente
    - Mantener API compatible con `hooks/useAIAnalytics.ts`
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 5.5, 5.6_

  - [x] 11.4 Crear `useTwitchService` hook
    - Crear `src/application/hooks/useTwitchService.ts`
    - Usar TwitchService internamente
    - Mantener API compatible con `hooks/useTwitchConnection.ts`
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 5.4, 5.6_

  - [x] 11.5 Actualizar `usePollService` hook
    - Modificar `src/application/hooks/usePollService.ts`
    - Integrar con ModerationService para validación de votos
    - Mantener API compatible con `hooks/usePoll.ts`
    - _Requirements: 5.1, 5.6_

- [x] 12. Checkpoint - Validar hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Actualizar componentes para usar nuevos hooks
  - [x] 13.1 Actualizar componentes de moderación
    - Actualizar `components/ModerationConfigForm.tsx`
    - Actualizar `components/ModerationLogViewer.tsx`
    - Actualizar `components/ModerationStatsDisplay.tsx`
    - Cambiar imports de `hooks/useModeration` a `src/application/hooks`
    - _Requirements: 7.1, 7.4_

  - [x] 13.2 Actualizar componentes de analytics
    - Actualizar `components/StreamAnalytics.tsx`
    - Actualizar `components/AIConfigPanel.tsx`
    - Cambiar imports de `hooks/useAIAnalytics` a `src/application/hooks`
    - _Requirements: 7.1, 7.4_

  - [x] 13.3 Actualizar componentes de stream events
    - Actualizar `components/StreamActivity.tsx`
    - Cambiar imports de `hooks/useStreamEvents` a `src/application/hooks`
    - _Requirements: 7.1, 7.4_

  - [x] 13.4 Actualizar componentes de conexión
    - Actualizar `components/ConnectionPanel.tsx`
    - Actualizar `components/CollaborationPanel.tsx`
    - Cambiar imports de `hooks/useTwitchConnection` a `src/application/hooks`
    - _Note: These components receive props from App.tsx, no direct hook imports needed_
    - _Requirements: 7.1, 7.4_

  - [x] 13.5 Actualizar App.tsx
    - Actualizar imports en `App.tsx`
    - Usar nuevos hooks de aplicación
    - _Requirements: 7.1, 7.4_

- [x] 14. Checkpoint - Validar componentes
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que la app compila sin errores.

- [x] 15. Compatibilidad y migración de datos
  - [x] 15.1 Implementar compatibilidad con datos legacy
    - Asegurar que los nuevos servicios leen datos existentes de localStorage
    - Mantener mismos keys y formatos
    - _Requirements: 7.5_

  - [ ]* 15.2 Property test: Backward Compatibility
    - **Property 12: Backward Compatibility**
    - **Validates: Requirements 7.4, 7.5**

  - [x] 15.3 Verificar overlay sync
    - Probar sincronización entre tabs
    - Verificar que FirebaseSyncAdapter funciona correctamente
    - _Requirements: 7.6_

- [-] 16. Eliminar código legacy
  - [x] 16.1 Crear re-exports en hooks/
    - Modificar `hooks/index.ts` para re-exportar desde `src/application/hooks`
    - Mantener compatibilidad temporal
    - _Requirements: 8.7_

  - [x] 16.2 Eliminar servicios legacy
    - Eliminar `services/voteModerationService.ts`
    - Eliminar `services/chatAnalysisService.ts`
    - Eliminar `services/aiAnalyticsService.ts`
    - Eliminar `services/twitchService.ts`
    - Eliminar `services/twitchOAuth.ts`
    - Actualizar `services/firebaseSync.ts` para usar FirebaseSyncAdapter
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 16.3 Eliminar hooks legacy
    - Eliminar `hooks/usePoll.ts`
    - Eliminar `hooks/useModeration.ts`
    - Eliminar `hooks/useStreamEvents.ts`
    - Eliminar `hooks/useTwitchConnection.ts`
    - Eliminar `hooks/useAIAnalytics.ts`
    - _Requirements: 5.7_

  - [ ] 16.4 Actualizar imports restantes
    - Buscar y actualizar cualquier import de `services/` a `src/application/services/`
    - Buscar y actualizar cualquier import de `hooks/` a `src/application/hooks/`
    - _Requirements: 6.7_

- [x] 17. Actualizar exports e índices
  - [x] 17.1 Actualizar `src/domain/entities/index.ts`
    - Exportar todas las nuevas entidades
    - _Requirements: 8.1_

  - [x] 17.2 Actualizar `src/domain/ports/index.ts`
    - Exportar todos los puertos
    - _Requirements: 8.2_

  - [x] 17.3 Actualizar `src/application/services/index.ts`
    - Exportar todos los servicios
    - _Requirements: 8.3_

  - [x] 17.4 Actualizar `src/application/hooks/index.ts`
    - Exportar todos los hooks
    - _Requirements: 8.4_

  - [x] 17.5 Actualizar `src/infrastructure/adapters/index.ts`
    - Exportar todos los adapters
    - _Requirements: 8.5_

- [x] 18. Validación final
  - [x] 18.1 Ejecutar todos los tests
    - Ejecutar tests unitarios
    - Ejecutar tests de propiedades
    - Ejecutar tests E2E
    - _Requirements: 7.2_

  - [x] 18.2 Verificar build
    - Ejecutar `npm run build`
    - Verificar que no hay errores de compilación
    - _Requirements: 7.3_

  - [x] 18.3 Actualizar documentación
    - Actualizar `ARCHITECTURE.md` con nueva estructura
    - Actualizar `HEXAGONAL_MIGRATION_PLAN.md` como completado
    - _Requirements: 8.6_

- [ ] 19. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que la carpeta `services/` está vacía o eliminada.
  - Verificar que `hooks/` solo contiene re-exports.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- La migración se hace de forma incremental para evitar breaking changes
- Los hooks mantienen la misma API pública para compatibilidad
