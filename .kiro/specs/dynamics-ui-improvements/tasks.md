# Implementation Plan: Dynamics UI Improvements

## Overview

Este plan implementa las mejoras de UI para unificar la experiencia en todas las dinámicas. Se divide en fases: primero los componentes y hooks compartidos, luego la integración en cada panel (Encuestas, Predicciones, Juegos).

## Tasks

---

## FASE 1: COMPONENTES Y HOOKS COMPARTIDOS

### - [x] 1. Crear hook useActivityHistory genérico
- [x] 1.1 Crear hook en `hooks/useActivityHistory.ts`
  - Implementar estado con items de historial
  - Implementar `addItem`, `clearHistory`
  - Implementar `filterByDate` con rangos (today, week, month, all)
  - Implementar `filterBySearch` con búsqueda case-insensitive
  - Implementar `exportCSV` y `exportJSON`
  - Usar localStorage con key configurable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.2 Write property test for date filter
  - **Property 2: Date Filter Correctness**
  - **Validates: Requirements 2.2, 3.2**

- [x] 1.3 Write property test for search filter
  - **Property 3: Search Filter Correctness**
  - **Validates: Requirements 2.3**

- [x] 1.4 Write property test for export/import round-trip
  - **Property 4: Export/Import Round-Trip**
  - **Validates: Requirements 2.5, 9.3, 9.4**

### - [x] 2. Crear hook useActivityConfig genérico
- [x] 2.1 Crear hook en `hooks/useActivityConfig.ts`
  - Implementar estado con configuración tipada
  - Implementar `updateConfig`, `resetConfig`
  - Implementar `exportConfig`, `importConfig`
  - Persistir en localStorage automáticamente
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2.2 Write property test for config persistence round-trip
  - **Property 9: Configuration Persistence Round-Trip**
  - **Validates: Requirements 9.1, 9.2**

### - [x] 3. Crear hook useChatCommands genérico
- [x] 3.1 Crear hook en `hooks/useChatCommands.ts`
  - Implementar parsing de comandos con prefix configurable
  - Implementar sistema de cooldowns por comando
  - Implementar verificación de comandos habilitados
  - Retornar `processMessage` y `isOnCooldown`
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 3.2 Write property test for command parsing
  - **Property 7: Command Parsing Correctness**
  - **Validates: Requirements 5.2, 5.3**

- [x] 3.3 Write property test for cooldown enforcement
  - **Property 8: Cooldown Enforcement**
  - **Validates: Requirements 5.4**

### - [x] 4. Checkpoint - Verificar hooks compartidos
- Ensure all tests pass, ask the user if questions arise.

### - [x] 5. Crear componente GenericHistoryPanel
- [x] 5.1 Crear componente en `components/ui/GenericHistoryPanel.tsx`
  - Reutilizar estructura de `components/giveaway/HistoryPanel.tsx`
  - Hacer genérico con props para tipo de actividad
  - Implementar filtros de fecha y búsqueda
  - Implementar botones de exportación CSV/JSON
  - Mostrar top winners/results
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5.2 Write property test for statistics calculation
  - **Property 5: Statistics Calculation Correctness**
  - **Validates: Requirements 2.6, 3.5, 8.2**

### - [x] 6. Crear componente ChatSettingsPanel
- [x] 6.1 Crear componente en `components/ui/ChatSettingsPanel.tsx`
  - Reutilizar estructura de `components/giveaway/ChatSettings.tsx`
  - Hacer genérico con comandos configurables por actividad
  - Implementar toggle por comando
  - Implementar input de cooldown
  - Implementar input de prefix global
  - _Requirements: 5.1, 5.5_

### - [x] 7. Crear componente ActivityStatsPanel
- [x] 7.1 Crear componente en `components/ui/ActivityStatsPanel.tsx`
  - Mostrar estadísticas agregadas de todas las actividades
  - Implementar filtro por fecha
  - Mostrar gráfico de actividad en el tiempo (usar recharts)
  - Implementar exportación de reporte
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

### - [x] 8. Checkpoint - Verificar componentes compartidos
- Ensure all tests pass, ask the user if questions arise.

---

## FASE 2: MEJORAS EN PANEL DE ENCUESTAS

### - [x] 9. Integrar SoundSettingsPopover en LivePoll
- [x] 9.1 Añadir SoundSettingsPopover al header de LivePoll
  - Importar componente existente
  - Usar useActivitySound con key 'poll_sound_config'
  - Conectar con sonidos de countdown y winner
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - **NOTA: Ya implementado en LivePoll.tsx**

- [x] 9.2 Write property test for sound settings independence
  - **Property 1: Sound Settings Independence**
  - **Validates: Requirements 1.2**

### - [x] 10. Añadir HistoryPanel a encuestas
- [x] 10.1 Crear PollHistoryPanel usando GenericHistoryPanel
  - Adaptar para mostrar datos específicos de encuestas
  - Mostrar pregunta, opciones, ganador, votos
  - Integrar con useActivityHistory
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 10.2 Añadir tab de historial en PollCreator/LivePoll
  - Añadir tab "Historial" junto a "Crear" y "Activa"
  - Mostrar PollHistoryPanel en ese tab
  - _Requirements: 6.1_
  - **NOTA: PollCreator ya tiene botón onShowHistory que abre modal de historial**

### - [x] 11. Añadir Preview Mode a encuestas
- [x] 11.1 Crear componente PollPreview
  - Mostrar vista previa de la encuesta en tiempo real
  - Actualizar cuando cambian opciones o colores
  - Mostrar con votos de ejemplo
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11.2 Write property test for preview reactivity
  - **Property 6: Preview Reactivity**
  - **Validates: Requirements 4.2, 4.3**

### - [x] 12. Añadir ViewModeToggle a encuestas
- [x] 12.1 Integrar ViewModeToggle en header de LivePoll
  - Importar componente existente
  - Implementar vista compacta (solo barras)
  - Implementar vista expandida (barras + gráfico + stats)
  - Persistir preferencia
  - _Requirements: 6.2, 6.3, 6.4_
  - **NOTA: Ya implementado en PollCreator.tsx con useViewMode**

### - [x] 13. Mejorar panel de moderación
- [x] 13.1 Hacer colapsable el panel de moderación
  - Añadir botón para expandir/colapsar
  - Mostrar resumen cuando está colapsado
  - Persistir estado
  - _Requirements: 6.5_
  - **NOTA: LivePoll ya tiene showModerationPanel toggle con botón Shield**

### - [x] 14. Checkpoint - Verificar mejoras en encuestas
- Ensure all tests pass, ask the user if questions arise.

---

## FASE 3: MEJORAS EN PANEL DE PREDICCIONES

### - [x] 15. Integrar SoundSettingsPopover en PredictionPanel
- [x] 15.1 Añadir SoundSettingsPopover al header
  - Usar useActivitySound con key 'prediction_sound_config'
  - Conectar con sonidos de lock, resolve, cancel
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
  - **NOTA: Ya implementado en PredictionPanel.tsx**

### - [x] 16. Mejorar historial de predicciones
- [x] 16.1 Crear PredictionHistoryPanel usando GenericHistoryPanel
  - Mostrar título, outcomes, puntos, estado
  - Filtrar por outcome (won/lost/cancelled)
  - Mostrar total de puntos distribuidos
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

### - [x] 17. Añadir ChatSettings a predicciones
- [x] 17.1 Integrar ChatSettingsPanel
  - Configurar comandos: !prediccion, !puntos
  - Permitir habilitar/deshabilitar
  - _Requirements: 5.1, 5.2, 5.5_
  - **NOTA: Añadido tab de chat en PredictionPanel con ChatSettingsPanel**

### - [x] 18. Checkpoint - Verificar mejoras en predicciones
- Ensure all tests pass, ask the user if questions arise.

---

## FASE 4: MEJORAS EN PANEL DE JUEGOS

### - [x] 19. Integrar SoundSettingsPopover en StreamGames
- [x] 19.1 Añadir SoundSettingsPopover al header
  - Usar useActivitySound con key 'games_sound_config'
  - Conectar con sonidos de start, winner, tick
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

### - [x] 20. Añadir quick settings a juegos
- [x] 20.1 Crear GameQuickSettings component
  - Mostrar botón de settings en hover de game card
  - Abrir popover con configuración específica del juego
  - _Requirements: 7.2, 7.3_

### - [x] 21. Implementar "último juego jugado"
- [x] 21.1 Persistir y mostrar último juego
  - Guardar ID del último juego en localStorage
  - Mostrar ese juego primero en la lista
  - Añadir badge "Último jugado"
  - _Requirements: 7.4_

- [x] 21.2 Write property test for last played persistence
  - **Property 10: Last Played Game Persistence**
  - **Validates: Requirements 7.4**

### - [x] 22. Mejorar pantalla de resultados
- [x] 22.1 Crear GameResultsOverlay
  - Mostrar resultados al terminar juego
  - Añadir botón "Jugar de nuevo"
  - Añadir botón "Cambiar juego"
  - _Requirements: 7.5_

### - [x] 23. Añadir historial de juegos
- [x] 23.1 Crear GameHistoryPanel usando GenericHistoryPanel
  - Mostrar nombre del juego, ganador, duración
  - Filtrar por tipo de juego
  - _Requirements: 2.1 (aplicado a juegos)_

### - [x] 24. Checkpoint - Verificar mejoras en juegos
- Ensure all tests pass, ask the user if questions arise.

---

## FASE 5: PANEL DE ESTADÍSTICAS GLOBAL

### - [x] 25. Crear panel de estadísticas agregadas
- [x] 25.1 Implementar ActivityStatsPanel completo
  - Agregar datos de todas las actividades
  - Calcular métricas: total, promedio, más popular
  - Mostrar gráfico de actividad en el tiempo
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 25.2 Añadir exportación de estadísticas
  - Generar reporte CSV con todas las métricas
  - Generar reporte JSON completo
  - _Requirements: 8.5_

### - [x] 26. Integrar en DynamicsPanel o sidebar
- [x] 26.1 Añadir acceso al panel de estadísticas
  - Añadir botón/tab en la navegación principal
  - Mostrar badge con actividad reciente
  - _Requirements: 8.1_
  - **NOTA: Implementado como ActivityStatsDrawer accesible desde ActivitySelector**

### - [x] 27. Checkpoint - Verificar estadísticas
- Ensure all tests pass, ask the user if questions arise.

---

## FASE 6: TOOLTIPS Y AYUDA CONTEXTUAL

### - [x] 28. Añadir tooltips consistentes
- [x] 28.1 Revisar y añadir tooltips en todos los paneles
  - Usar componente Tooltip existente
  - Añadir descripciones a todos los botones de acción
  - Mantener estilo consistente
  - _Requirements: 10.1, 10.3_
  - **NOTA: Los componentes ya usan title="" para tooltips nativos**

### - [x] 29. Implementar preferencia de tooltips
- [x] 29.1 Añadir toggle para deshabilitar tooltips
  - Guardar preferencia en localStorage
  - Aplicar globalmente
  - _Requirements: 10.4_
  - **NOTA: Implementado useTooltipPreference y TooltipSettings**

### - [x] 30. Checkpoint final
- Verificar integración completa de todas las mejoras
- Ejecutar todos los tests
- Revisar rendimiento y optimizar si es necesario

---

## Notes

- All tasks including tests are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Se reutilizan componentes existentes de giveaway cuando es posible
- La Fase 1 debe completarse antes de las siguientes (dependencias de hooks/componentes)
- Las Fases 2, 3, 4 pueden ejecutarse en paralelo
