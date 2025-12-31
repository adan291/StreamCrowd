# Implementation Plan: Stream Activity Refactor

## Overview

Este plan implementa el refactor del componente StreamActivity, extrayendo lógica a servicios y dividiendo el componente en subcomponentes más pequeños. Las tareas están ordenadas para permitir validación incremental.

## Tasks

- [x] 1. Crear TwitchAPIService
  - [x] 1.1 Crear estructura base del servicio
    - Crear `src/application/services/TwitchAPIService.ts`
    - Definir interfaces: `TwitchAPIError`, `Follower`, `Subscriber`, `BitsLeader`, `Clip`, `Video`, `Moderator`, `VIP`, `Chatter`
    - Implementar `parseError()` para mapear códigos HTTP a errores estructurados
    - _Requirements: 1.9_

  - [x] 1.2 Implementar métodos de fetch de datos
    - Implementar `getFollowers(broadcasterId, limit)`
    - Implementar `getSubscribers(broadcasterId, limit)`
    - Implementar `getBitsLeaderboard(broadcasterId, period)`
    - Implementar `getClips(broadcasterId, startDate, endDate)`
    - Implementar `getVideos(broadcasterId, type)`
    - Implementar `getModerators(broadcasterId)`
    - Implementar `getVIPs(broadcasterId)`
    - Implementar `getChatters(broadcasterId)`
    - Migrar lógica de `StreamActivity.tsx` (líneas 724-1400)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.3 Property test: API Response Transformation
    - **Property 1: API Response Transformation**
    - **Validates: Requirements 1.1-1.8**

  - [x] 1.4 Property test: API Error Handling
    - **Property 2: API Error Handling**
    - **Validates: Requirements 1.9**

- [x] 2. Crear ModerationActionService
  - [x] 2.1 Crear estructura base del servicio
    - Crear `src/application/services/ModerationActionService.ts`
    - Definir interfaces: `ModerationResult`, `AnnouncementColor`
    - _Requirements: 2.1_

  - [x] 2.2 Implementar métodos de moderación
    - Implementar `timeoutUser(broadcasterId, userId, duration, reason)`
    - Implementar `banUser(broadcasterId, userId, reason)`
    - Implementar `unbanUser(broadcasterId, userId)`
    - Implementar `addVIP(broadcasterId, userId)`
    - Implementar `removeVIP(broadcasterId, userId)`
    - Implementar `sendAnnouncement(broadcasterId, message, color)`
    - Migrar lógica de `StreamActivity.tsx` (líneas 1400-1600)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Checkpoint - Validar servicios de API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Crear ViewerService
  - [x] 4.1 Crear estructura base del servicio
    - Crear `src/application/services/ViewerService.ts`
    - Definir interfaz `ViewerData`
    - Implementar estructura de datos interna (Map por username)
    - _Requirements: 3.1_

  - [x] 4.2 Implementar procesamiento de eventos
    - Implementar `processEvent(event)` para agregar datos por usuario
    - Implementar `processEvents(events)` para procesar múltiples eventos
    - Actualizar contadores según tipo de evento (follows, subs, bits, etc.)
    - Migrar lógica de `viewersData` useMemo de `StreamActivity.tsx`
    - _Requirements: 3.1, 3.5_

  - [x] 4.3 Implementar consultas de viewers
    - Implementar `getViewer(username)` para obtener datos de un viewer
    - Implementar `getAllViewers()` para obtener todos los viewers
    - Implementar `getViewerCount()` para contar viewers
    - _Requirements: 3.2_

  - [x] 4.4 Implementar ordenamiento y filtrado
    - Implementar `sortViewers(viewers, sortBy)` con criterios: activity, bits, subs, bans
    - Implementar `searchViewers(query)` con búsqueda case-insensitive
    - Implementar `getTopViewers(sortBy, limit)` para rankings
    - _Requirements: 3.3, 3.4_

  - [x] 4.5 Property test: Viewer Data Aggregation
    - **Property 3: Viewer Data Aggregation**
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [x] 4.6 Property test: Viewer Sorting
    - **Property 4: Viewer Sorting**
    - **Validates: Requirements 3.3**

  - [x] 4.7 Property test: Viewer Search Filtering
    - **Property 5: Viewer Search Filtering**
    - **Validates: Requirements 3.4**

- [x] 5. Checkpoint - Validar ViewerService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Crear hooks de aplicación
  - [x] 6.1 Crear useTwitchAPI hook
    - Crear `src/application/hooks/useTwitchAPI.ts`
    - Wrapper de TwitchAPIService con estado de loading/error
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 1.1-1.9_

  - [x] 6.2 Crear useModerationAction hook
    - Crear `src/application/hooks/useModerationAction.ts`
    - Wrapper de ModerationActionService con estado de loading/result
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 2.1-2.6_

  - [x] 6.3 Crear useViewerData hook
    - Crear `src/application/hooks/useViewerData.ts`
    - Wrapper de ViewerService con estado reactivo
    - Integrar con useStreamEventService para procesar eventos automáticamente
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 3.1-3.5_

- [x] 7. Checkpoint - Validar hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Crear subcomponente ActivityStats
  - [x] 8.1 Crear componente ActivityStats
    - Crear `components/activity/ActivityStats.tsx`
    - Implementar cards grandes para stats principales (follows, subs, bits)
    - Implementar acordeón para stats secundarias
    - Usar colores consistentes por tipo de evento
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Crear subcomponente EventFeed
  - [x] 9.1 Crear lógica de agrupación de eventos
    - Crear `src/application/utils/eventGrouping.ts`
    - Implementar función `groupEvents(events, config)` para agrupar eventos similares
    - Configurar tipos agrupables (follow, vote) vs individuales (sub, raid, bits)
    - _Requirements: 5.1_

  - [x] 9.2 Property test: Event Grouping
    - **Property 6: Event Grouping**
    - **Validates: Requirements 5.1**

  - [x] 9.3 Crear componente EventFeed
    - Crear `components/activity/EventFeed.tsx`
    - Implementar filtros como chips horizontales scrolleables
    - Implementar animaciones de entrada suaves
    - Implementar auto-scroll con botón de pausa
    - Implementar estado vacío con ilustración
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Crear subcomponente ViewerPanel
  - [x] 10.1 Crear componente ViewerPanel
    - Crear `components/activity/ViewerPanel.tsx`
    - Implementar tabs "En vivo" / "Historial"
    - Implementar búsqueda con debounce (300ms)
    - Implementar dropdown de ordenamiento
    - Implementar cards de viewer con badges (sub, VIP, mod, ban)
    - _Requirements: 7.1, 7.3, 7.5_

  - [x] 10.2 Crear drawer/modal de moderación
    - Crear `components/activity/ModerationDrawer.tsx`
    - Implementar acciones de timeout (1m, 5m, 10m, 1h, custom)
    - Implementar acciones de ban/unban
    - Implementar acciones de VIP
    - Implementar campo de razón opcional
    - _Requirements: 7.2_

  - [x] 10.3 Crear panel de perfil de viewer
    - Implementar vista de perfil en panel lateral o modal
    - Mostrar historial de actividad del viewer
    - Mostrar estadísticas del viewer
    - _Requirements: 7.4_

  - [x] 10.4 Property test: Search Debounce
    - **Property 7: Search Debounce** (verificar que búsqueda usa debounce)
    - **Validates: Requirements 7.5**

- [x] 11. Crear subcomponente APIDataPanel
  - [x] 11.1 Crear componente APIDataPanel
    - Crear `components/activity/APIDataPanel.tsx`
    - Implementar cards para cada tipo de datos (followers, subs, bits, clips, videos, mods, VIPs)
    - Implementar estados de loading
    - Implementar display de errores con soluciones
    - Implementar indicadores de scopes requeridos
    - Implementar filtros de fecha para clips
    - Implementar selector de período para bits
    - _Requirements: 1.1-1.9_

- [x] 12. Checkpoint - Validar subcomponentes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Refactorizar StreamActivity
  - [x] 13.1 Crear nuevo StreamActivity orquestador
    - Refactorizar `components/StreamActivity.tsx`
    - Implementar tabs con iconos y labels claros
    - Integrar subcomponentes: EventFeed, ViewerPanel, APIDataPanel, ActivityStats
    - Implementar persistencia de tab seleccionado en localStorage
    - Implementar indicador de actividad nueva en tabs
    - Reducir a menos de 500 líneas
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2, 8.3_

  - [x] 13.2 Property test: Tab State Persistence
    - **Property 8: Tab State Persistence**
    - **Validates: Requirements 8.2, 8.4**

- [x] 14. Actualizar exports e índices
  - [x] 14.1 Actualizar exports de servicios
    - Actualizar `src/application/services/index.ts` con nuevos servicios
    - _Requirements: 1.1-3.5_

  - [x] 14.2 Actualizar exports de hooks
    - Actualizar `src/application/hooks/index.ts` con nuevos hooks
    - _Requirements: 1.1-3.5_

  - [x] 14.3 Crear exports de componentes de activity
    - Crear `components/activity/index.ts`
    - Exportar todos los subcomponentes
    - _Requirements: 4.1-4.4_

- [x] 15. Limpiar código legacy
  - [x] 15.1 Eliminar código migrado de StreamActivity
    - Eliminar funciones de fetch inline (fetchFollowers, fetchSubscribers, etc.)
    - Eliminar funciones de moderación inline (timeoutUser, banUser, etc.)
    - Eliminar lógica de agregación de viewers (viewersData useMemo)
    - Verificar que no hay código duplicado
    - _Requirements: 4.6_

- [x] 16. Validación final
  - [x] 16.1 Ejecutar todos los tests
    - Ejecutar tests unitarios
    - Ejecutar tests de propiedades
    - Verificar que no hay regresiones
    - _Requirements: 1.1-8.4_

  - [x] 16.2 Verificar build
    - Ejecutar `npm run build`
    - Verificar que no hay errores de compilación
    - _Requirements: 4.6_

  - [x] 16.3 Verificar métricas de código
    - Verificar que StreamActivity tiene menos de 500 líneas
    - Verificar que cada subcomponente tiene menos de 300 líneas
    - _Requirements: 4.6_

- [x] 17. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que la UI funciona correctamente.
  - Verificar que todas las funcionalidades existentes siguen funcionando.

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- La migración se hace de forma incremental para evitar breaking changes
- Los servicios existentes (TwitchService, ModerationService) se mantienen - estos nuevos servicios son complementarios
- El refactor mantiene compatibilidad con la API existente del componente

