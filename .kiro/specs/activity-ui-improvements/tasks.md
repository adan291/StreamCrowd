# Implementation Plan: Activity UI Improvements

## Overview

Este plan implementa las mejoras de UI para la sección de Actividad. Las tareas están ordenadas para permitir validación incremental, comenzando con las utilidades base y luego modificando cada componente.

## Tasks

- [x] 1. Crear utilidades base
  - [x] 1.1 Crear módulo de colores unificado
    - Crear `src/application/utils/uiColors.ts`
    - Definir `UI_COLORS` con paleta de eventos, tints y estados
    - Exportar función `getEventColor(type)` 
    - Exportar función `getEventTint(type, opacity)`
    - _Requirements: 6.1, 6.2_

  - [x] 1.2 Crear utilidad de tiempo relativo
    - Crear `src/application/utils/timeFormat.ts`
    - Implementar `formatRelativeTime(timestamp)`
    - Manejar edge cases (timestamps futuros, inválidos)
    - _Requirements: 3.3_

  - [x] 1.3 Property test: Relative Time Formatting
    - **Property 1: Relative Time Formatting**
    - **Validates: Requirements 3.3**

  - [x] 1.4 Property test: Event Color Consistency
    - **Property 2: Event Color Consistency**
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Implementar modo compacto
  - [x] 2.1 Crear hook useCompactMode
    - Crear `src/application/hooks/useCompactMode.ts`
    - Implementar estado con persistencia en localStorage
    - Exportar desde `src/application/hooks/index.ts`
    - _Requirements: 7.1, 7.5_

  - [x] 2.2 Property test: Compact Mode Persistence
    - **Property 4: Compact Mode Persistence**
    - **Validates: Requirements 7.5**

- [x] 3. Checkpoint - Validar utilidades base ✅
  - All utility tests passing (177 tests in utils/hooks)
  - uiColors: 17 tests ✅
  - timeFormat: 12 tests ✅
  - useCompactMode: 8 tests ✅

- [x] 4. Rediseñar ActivityStats
  - [x] 4.1 Implementar barra compacta de estadísticas
    - Modificar `components/activity/ActivityStats.tsx`
    - Crear nuevo layout horizontal compacto
    - Mostrar solo 4 métricas principales (follows, subs, bits, raids)
    - Usar dots/iconos sutiles en lugar de fondos grandes
    - Aplicar opacidad reducida a valores cero
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Mejorar filtros del EventFeed
  - [x] 5.1 Rediseñar FilterChips
    - Modificar sección de filtros en `components/activity/EventFeed.tsx`
    - Reducir altura de chips a ~24px
    - Usar bordes sutiles en lugar de fondos llenos
    - Añadir indicador dot para filtros activos
    - Implementar toggle para mostrar/ocultar filtros
    - Colapsar a "Todos" cuando todos los filtros activos
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Mejorar EventCards
  - [x] 6.1 Implementar cards compactas
    - Modificar EventItem en `components/activity/EventFeed.tsx`
    - Usar `formatRelativeTime` para timestamps
    - Reducir tamaño de badges (max 16px altura)
    - Ajustar padding y espaciado
    - Mantener username + badge en una línea
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Checkpoint - Validar EventFeed
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Mejorar navegación de tabs
  - [x] 8.1 Rediseñar tabs
    - Modificar tabs en `components/StreamActivity.tsx`
    - Implementar estilo underline (línea 2px)
    - Reducir tamaño de badge de actividad
    - Añadir transiciones suaves (150ms)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Optimizar ViewerPanel
  - [x] 9.1 Implementar cards compactas de viewer
    - Modificar `components/activity/ViewerPanel.tsx`
    - Reducir padding de cards
    - Convertir badges a iconos sin texto
    - Implementar tooltips para info adicional
    - Integrar sort en área de búsqueda
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Checkpoint - Validar ViewerPanel
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrar modo compacto global
  - [x] 11.1 Añadir toggle de modo compacto
    - Modificar `components/StreamActivity.tsx`
    - Añadir botón toggle en header
    - Pasar prop `compact` a subcomponentes
    - Implementar comportamiento de stats en hover cuando compacto
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Mejorar animaciones
  - [x] 12.1 Implementar animaciones suaves
    - Añadir CSS para fade-slide en nuevos eventos
    - Implementar transiciones en filtros
    - Añadir animación de expand/collapse en grupos
    - Suavizar indicador de auto-scroll
    - Respetar prefers-reduced-motion
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Validar accesibilidad
  - [x] 13.1 Property test: WCAG Contrast Compliance
    - **Property 3: WCAG Contrast Compliance**
    - **Validates: Requirements 6.4**

- [x] 14. Validación final
  - [x] 14.1 Ejecutar todos los tests
    - Ejecutar tests unitarios
    - Ejecutar tests de propiedades
    - Verificar que no hay regresiones
    - _Requirements: 1.1-8.5_

  - [x] 14.2 Verificar build
    - Ejecutar `npm run build`
    - Verificar que no hay errores de compilación

- [x] 15. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que la UI se ve correctamente en modo normal y compacto.
  - Verificar que las animaciones son suaves.

## Notes

- Las mejoras son incrementales y no rompen funcionalidad existente
- Cada componente se puede probar independientemente
- El modo compacto es opcional y persiste en localStorage
- Se respeta prefers-reduced-motion para accesibilidad
- Los colores se centralizan para garantizar consistencia

