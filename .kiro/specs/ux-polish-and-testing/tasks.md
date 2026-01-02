# Implementation Plan: UX Polish and Testing

## Overview

Este plan se divide en dos fases: primero completar los tests pendientes de forms-ui-improvement, luego implementar las mejoras de UX. Cada fase puede entregarse independientemente.

## Tasks

- [x] 1. Tests para CollapsibleSection
  - [x] 1.1 Crear archivo de tests para CollapsibleSection
    - Crear `tests/components/CollapsibleSection.property.test.ts`
    - Configurar fast-check para property testing
    - _Requirements: 1.1_

  - [x] 1.2 Implementar Property 1: Toggle Consistency
    - Test que verifica toggle de estado expanded
    - Test que verifica visibilidad de children según estado
    - **Property 1: CollapsibleSection Toggle Consistency**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 Implementar Property 2: Badge Display
    - Test que verifica badge se muestra cuando está definido
    - Test que verifica badge se oculta cuando es undefined
    - **Property 2: Badge Display Consistency**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 1.4 Test de defaultExpanded prop
    - Test que verifica estado inicial con defaultExpanded=true
    - Test que verifica estado inicial con defaultExpanded=false
    - _Requirements: 1.5_

- [x] 2. Tests para GiveawayHub Mejorado
  - [x] 2.1 Crear archivo de tests para GiveawayHub
    - Crear `tests/components/GiveawayHub.property.test.ts`
    - Configurar mocks necesarios (localStorage, BroadcastChannel)
    - _Requirements: 2.1_

  - [x] 2.2 Implementar Property 3: Participant Badge Accuracy
    - Test con diferentes cantidades de participantes
    - **Property 3: Participant Badge Accuracy**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Implementar Property 4: Blacklist Badge Accuracy
    - Test con diferentes cantidades de usuarios en blacklist
    - **Property 4: Blacklist Badge Accuracy**
    - **Validates: Requirements 2.2**

  - [x] 2.4 Implementar Property 5: Preset Application (GiveawayHub)
    - Test que verifica aplicación completa de preset
    - **Property 5: Preset Application Completeness**
    - **Validates: Requirements 2.3**

  - [x] 2.5 Implementar Property 6: Customization Detection
    - Test que verifica detección de cambios post-preset
    - **Property 6: Customization Detection**
    - **Validates: Requirements 2.4**

- [x] 3. Tests para JudgePanel Mejorado
  - [x] 3.1 Crear archivo de tests para JudgePanel
    - Crear `tests/components/JudgePanel.property.test.ts`
    - Configurar mocks necesarios
    - _Requirements: 3.1_

  - [x] 3.2 Implementar Property 7: JudgePanel Badge Counts
    - Test para badge de criterios
    - Test para badge de concursantes
    - Test para badge de jueces
    - **Property 7: JudgePanel Badge Counts**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 3.3 Implementar Property 8: Wizard Step Navigation
    - Test de navegación Next entre pasos
    - Test de navegación Back entre pasos
    - Test de límites (no Back en paso 1, no Next en paso 4)
    - **Property 8: Wizard Step Navigation**
    - **Validates: Requirements 3.4**

  - [x] 3.4 Implementar Property 5: Preset Application (JudgePanel)
    - Test que verifica creación de criterios desde preset
    - **Property 5: Preset Application Completeness**
    - **Validates: Requirements 3.5**

- [x] 4. Tests de Persistencia de ViewMode
  - [x] 4.1 Crear archivo de tests para ViewMode
    - Crear `tests/components/ViewModePersistence.property.test.ts`
    - Configurar mock de localStorage
    - _Requirements: 4.1_

  - [x] 4.2 Implementar Property 9: View Mode Persistence
    - Test que verifica guardado en localStorage
    - Test que verifica restauración desde localStorage
    - **Property 9: View Mode Persistence**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.3 Implementar Property 10: Configuration Preservation
    - Test que verifica valores no cambian al cambiar modo
    - **Property 10: Configuration Preservation**
    - **Validates: Requirements 4.3**

- [x] 5. Checkpoint - Verificar todos los tests pasan
  - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar `npm test` para verificar suite completa

- [x] 6. Crear componente Tooltip
  - [x] 6.1 Crear estructura base del componente
    - Crear `components/ui/Tooltip.tsx`
    - Implementar props: content, children, delay, position
    - Usar portal para renderizar fuera del DOM padre
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Implementar lógica de posicionamiento
    - Calcular posición basada en elemento trigger
    - Ajustar si tooltip sale del viewport
    - _Requirements: 5.1_

  - [x] 6.3 Añadir accesibilidad
    - Soporte para keyboard focus (onFocus/onBlur)
    - Añadir role="tooltip" y aria-describedby
    - _Requirements: 5.5_

  - [x] 6.4 Añadir tooltips a GiveawayHub
    - Añadir tooltip a "Solo Subs" toggle
    - Añadir tooltip a "Usar Timer" toggle
    - Añadir tooltip a campo de keyword
    - Añadir tooltip a campo de tiempo
    - _Requirements: 5.4_

  - [x] 6.5 Añadir tooltips a JudgePanel
    - Añadir tooltip a "Peso" de criterios
    - Añadir tooltip a "Peso del voto público"
    - Añadir tooltip a "Prefijo de voto"
    - _Requirements: 5.4_

- [x] 7. Crear componente Skeleton y FeedbackIndicator
  - [x] 7.1 Crear componente Skeleton
    - Crear `components/ui/Skeleton.tsx`
    - Implementar variantes: text, rectangular, circular
    - Añadir animación de shimmer
    - _Requirements: 7.3_

  - [x] 7.2 Crear PanelSkeleton para lazy loading
    - Crear skeleton específico para paneles
    - Simular estructura de GiveawayHub/JudgePanel
    - _Requirements: 7.3_

  - [x] 7.3 Crear componente FeedbackIndicator
    - Crear `components/ui/FeedbackIndicator.tsx`
    - Implementar tipos: success, info
    - Añadir auto-dismiss con duration
    - _Requirements: 6.2_

  - [x] 7.4 Respetar prefers-reduced-motion
    - Detectar preferencia del usuario
    - Deshabilitar animaciones si está activa
    - _Requirements: 6.5_

- [x] 8. Implementar Lazy Loading
  - [x] 8.1 Configurar lazy loading para JudgePanel
    - Usar React.lazy() para importar JudgePanel
    - Envolver en Suspense con PanelSkeleton
    - _Requirements: 7.1_

  - [x] 8.2 Configurar lazy loading para GiveawayHub
    - Usar React.lazy() para importar GiveawayHub
    - Envolver en Suspense con PanelSkeleton
    - _Requirements: 7.2_

  - [x] 8.3 Implementar preload después de carga inicial
    - Precargar componentes después de 2 segundos
    - Usar import() dinámico para preload
    - _Requirements: 7.5_

  - [x] 8.4 Verificar funcionalidad post-lazy-load
    - Probar que sorteos funcionan correctamente
    - Probar que torneos funcionan correctamente
    - _Requirements: 7.4_

- [x] 9. Checkpoint - Verificar componentes UI
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar tooltips aparecen correctamente
  - Verificar lazy loading funciona sin errores

- [x] 10. Mejorar Contraste en Modo Oscuro
  - [x] 10.1 Auditar colores actuales
    - Revisar colores de texto en modo oscuro
    - Identificar elementos con bajo contraste
    - _Requirements: 8.1_

  - [x] 10.2 Actualizar colores de texto
    - Cambiar zinc-500 a zinc-400 donde sea necesario
    - Asegurar ratio >= 4.5:1 para texto normal
    - _Requirements: 8.1_

  - [x] 10.3 Mejorar indicadores de focus
    - Añadir ring visible en elementos focusables
    - Usar violet-400 para consistencia
    - _Requirements: 8.2_

  - [x] 10.4 Mejorar visibilidad de badges
    - Verificar contraste de badges de estado
    - Ajustar colores si es necesario
    - _Requirements: 8.3_

  - [x] 10.5 Mejorar bordes de formularios
    - Aumentar contraste de bordes en inputs
    - Verificar visibilidad en modo oscuro
    - _Requirements: 8.4_

  - [x] 10.6 Mejorar estados disabled
    - Asegurar que disabled es distinguible
    - Usar opacity o color diferente
    - _Requirements: 8.5_

- [x] 11. Completar Traducciones
  - [x] 11.1 Auditar traducciones faltantes
    - Revisar GiveawayHub para textos sin traducir
    - Revisar JudgePanel para textos sin traducir
    - _Requirements: 9.1, 9.2_

  - [x] 11.2 Añadir traducciones de tooltips
    - Crear sección `tooltips` en locales.ts
    - Añadir traducciones ES y EN
    - _Requirements: 9.3_

  - [x] 11.3 Añadir traducciones de mensajes de error
    - Revisar mensajes de error hardcodeados
    - Mover a sistema de traducciones
    - _Requirements: 9.4_

  - [x] 11.4 Añadir traducciones de presets
    - Traducir nombres de presets
    - Traducir descripciones de presets
    - _Requirements: 9.5_

  - [x] 11.5 Implementar Property 12: Translation Completeness
    - Test que verifica todas las claves tienen traducción
    - **Property 12: Translation Completeness**
    - **Validates: Requirements 9.1-9.5**

- [x] 12. Tests de Accesibilidad
  - [x] 12.1 Implementar Property 11: WCAG Contrast
    - Test automatizado de ratios de contraste
    - **Property 11: WCAG Contrast Compliance**
    - **Validates: Requirements 8.1**

  - [x] 12.2 Test de navegación por teclado
    - Verificar Tab navega correctamente
    - Verificar Enter/Space activan elementos
    - _Requirements: 8.2_

- [x] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar toda la funcionalidad existente sigue funcionando
  - Verificar mejoras de UX están aplicadas
  - Verificar accesibilidad mejorada

## Notes

- Las tareas 1-5 completan los tests pendientes de forms-ui-improvement
- Las tareas 6-13 implementan las mejoras de UX adicionales
- Cada fase puede entregarse independientemente
- Property tests usan fast-check para generación de inputs
- Los tests de contraste pueden usar herramientas como axe-core
