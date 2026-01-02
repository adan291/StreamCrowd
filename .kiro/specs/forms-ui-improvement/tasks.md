# Implementation Plan: Forms UI Improvement

## Overview

Este plan divide la implementación en fases incrementales, empezando por los componentes base y luego aplicándolos a cada formulario. Cada fase es independiente y puede ser completada y probada por separado.

## Tasks

- [x] 1. Crear componentes UI reutilizables
  - [x] 1.1 Crear componente CollapsibleSection
    - Crear archivo `components/ui/CollapsibleSection.tsx`
    - Implementar props: title, icon, badge, defaultExpanded, children, className
    - Añadir animación de transición con CSS/Tailwind
    - Incluir icono chevron que rota según estado
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 1.2 Escribir tests para CollapsibleSection
    - **Property 1: Toggle Consistency**
    - **Property 2: Badge Display**
    - **Validates: Requirements 1.2, 1.4, 1.6**

  - [x] 1.3 Crear componente PresetSelector
    - Crear archivo `components/ui/PresetSelector.tsx`
    - Implementar dropdown con lista de presets
    - Mostrar icono y descripción de cada preset
    - Mostrar "Personalizado" cuando isCustomized es true
    - _Requirements: 5.1, 5.2, 6.1, 6.2_

  - [x] 1.4 Crear componente ViewModeToggle
    - Crear archivo `components/ui/ViewModeToggle.tsx`
    - Implementar toggle entre 'compact' y 'expanded'
    - Persistir preferencia en localStorage
    - _Requirements: 7.1, 7.4_

  - [x] 1.5 Crear componente WizardStepper
    - Crear archivo `components/ui/WizardStepper.tsx`
    - Implementar indicador de pasos visual
    - Mostrar paso actual, completados y pendientes
    - Incluir botones Next/Back
    - _Requirements: 4.2, 4.3, 4.6_

- [x] 2. Checkpoint - Verificar componentes base
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Aplicar mejoras a GiveawayHub
  - [x] 3.1 Definir presets de GiveawayHub
    - Crear constante GIVEAWAY_PRESETS con 3 presets
    - Preset "Sorteo Rápido": viewers, sin timer
    - Preset "Sorteo por Keyword": keyword, 60s timer
    - Preset "Sorteo de Subs": subs mode
    - _Requirements: 5.2_

  - [x] 3.2 Reorganizar GiveawayHub en secciones colapsables
    - Envolver "Configuración Básica" en CollapsibleSection (expanded por defecto)
    - Envolver "Opciones Avanzadas" en CollapsibleSection (collapsed)
    - Envolver "Participantes" en CollapsibleSection con badge de count
    - Envolver "Lista Negra" en CollapsibleSection con badge de count
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Integrar PresetSelector en GiveawayHub
    - Añadir PresetSelector en el header del formulario
    - Implementar lógica de aplicación de preset
    - Detectar cuando la configuración es personalizada
    - Mostrar mensaje de confirmación al aplicar preset
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.4 Integrar ViewModeToggle en GiveawayHub
    - Añadir toggle en el header
    - Implementar vista compacta (solo modo, botón start, count)
    - Preservar valores al cambiar de modo
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 3.5 Escribir tests para GiveawayHub mejorado
    - **Property 3: Participant Count Badge Accuracy**
    - **Property 4: Blacklist Count Badge Accuracy**
    - **Property 6: Preset Application Completeness**
    - **Property 7: Preset Customization Detection**
    - **Validates: Requirements 2.4, 2.5, 5.3, 5.6**

- [x] 4. Checkpoint - Verificar GiveawayHub
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Aplicar mejoras a JudgePanel
  - [x] 5.1 Definir presets de JudgePanel
    - Crear constante JUDGE_PRESETS con 2 presets
    - Preset "Torneo Básico": 3 criterios estándar
    - Preset "Torneo con Público": criterios + votación 30%
    - _Requirements: 6.2_

  - [x] 5.2 Reorganizar JudgePanel en secciones colapsables
    - Envolver "Configuración General" en CollapsibleSection (expanded)
    - Envolver "Criterios" en CollapsibleSection con badge de count
    - Envolver "Concursantes" en CollapsibleSection con badge de count
    - Envolver "Jueces" en CollapsibleSection con badge de count
    - Envolver "Votación Pública" en CollapsibleSection (collapsed)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Integrar PresetSelector en JudgePanel
    - Añadir PresetSelector en el header de configuración
    - Implementar lógica de aplicación de preset (incluye criterios)
    - Detectar cuando la configuración es personalizada
    - Mostrar mensaje de confirmación al aplicar preset
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.4 Implementar Wizard Mode en JudgePanel
    - Añadir toggle "Modo Asistente" en el header
    - Implementar 4 pasos: Config, Criterios, Concursantes, Jueces
    - Añadir navegación Next/Back entre pasos
    - Mostrar resumen en paso final con botón "Iniciar Torneo"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.5 Integrar ViewModeToggle en JudgePanel
    - Añadir toggle en el header
    - Implementar vista compacta
    - Preservar valores al cambiar de modo
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 5.6 Escribir tests para JudgePanel mejorado
    - **Property 5: JudgePanel Badge Counts**
    - **Property 6: Preset Application Completeness**
    - **Property 10: Wizard Step Navigation**
    - **Validates: Requirements 3.3, 3.4, 3.5, 6.3, 4.3**

- [x] 6. Checkpoint - Verificar JudgePanel
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tests de integración y pulido final
  - [x] 7.1 Verificar que funcionalidad existente no se rompe
    - Probar flujo completo de sorteo en cada modo
    - Probar flujo completo de torneo
    - Verificar sincronización con overlays
    - _Requirements: 2.6, 3.6_

  - [ ]* 7.2 Escribir tests de persistencia
    - **Property 8: View Mode Persistence**
    - **Property 9: View Mode Value Preservation**
    - **Validates: Requirements 7.4, 7.5**

  - [x] 7.3 Ajustes de responsive y accesibilidad
    - Verificar que secciones funcionan en móvil
    - Añadir aria-expanded a CollapsibleSection
    - Verificar navegación por teclado en wizard
    - _Requirements: 1.1_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The implementation is divided into phases that can be delivered independently:
  - Phase 1 (Tasks 1-2): Base components
  - Phase 2 (Tasks 3-4): GiveawayHub improvements
  - Phase 3 (Tasks 5-6): JudgePanel improvements
  - Phase 4 (Tasks 7-8): Integration and polish
