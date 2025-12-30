# Implementation Plan: Sidebar Dynamics Grouping

## Overview

Este plan implementa la reorganización del sidebar agrupando Encuesta, Jurado y Sorteos bajo "Dinámicas". Se crearán nuevos componentes y se modificará la lógica de navegación en App.tsx.

## Tasks

- [x] 1. Crear tipos y configuración de navegación
  - Añadir tipos `LeftTab` y `DynamicsView` en types.ts
  - Crear constante `ACTIVITIES` con configuración de cada actividad
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_

- [x] 2. Crear componente ActivitySelector
  - [x] 2.1 Crear estructura base del componente ActivitySelector
    - Crear archivo `components/ActivitySelector.tsx`
    - Implementar grid de 3 cards con diseño responsive
    - Añadir props `onSelectActivity`
    - _Requirements: 1.1, 1.2, 3.5_

  - [x] 2.2 Implementar ActivityCard con estilos y hover
    - Crear subcomponente ActivityCard
    - Añadir icono, título y descripción
    - Implementar hover effects con Tailwind
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 Añadir accesibilidad a ActivitySelector
    - Añadir tabIndex y role a las cards
    - Implementar handlers para Enter y Space
    - Añadir aria-label al contenedor
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.4 Write property test for ActivitySelector rendering
    - **Property 1: Activity Selector Renders Correctly**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Crear componente DynamicsPanel
  - [x] 3.1 Crear wrapper DynamicsPanel
    - Crear archivo `components/DynamicsPanel.tsx`
    - Implementar lógica de renderizado condicional según `view`
    - Pasar props necesarios a cada panel hijo
    - _Requirements: 1.3, 2.1_

  - [x] 3.2 Implementar botón de retorno
    - Añadir botón "← Volver" cuando view !== 'selector'
    - Estilizar consistente con el diseño existente
    - Conectar con callback `onBack`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Añadir accesibilidad al botón de retorno
    - Asegurar que el botón es focusable
    - Añadir aria-label descriptivo
    - _Requirements: 7.4_

  - [x] 3.4 Write property test for back navigation
    - **Property 3: Back Navigation Returns to Selector**
    - **Validates: Requirements 2.2**

- [x] 4. Modificar estado de navegación en App.tsx
  - [x] 4.1 Actualizar tipos de leftTab
    - Cambiar tipo de `leftTab` a `'dynamics' | 'games' | 'obs' | 'gallery' | 'data'`
    - Añadir nuevo estado `dynamicsView`
    - Actualizar valor inicial a `'dynamics'`
    - _Requirements: 1.4, 5.1_

  - [x] 4.2 Implementar handlers de navegación
    - Crear `handleDynamicsNavigation` para cambiar dynamicsView
    - Manejar reset de dynamicsView cuando se cambia de tab (opcional)
    - _Requirements: 4.1, 4.2_

  - [x] 4.3 Write property test for state persistence
    - **Property 4: State Persistence During Navigation**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 5. Actualizar sidebar desktop
  - [x] 5.1 Reemplazar botones individuales por Dinámicas
    - Eliminar NavButtons de poll, judge, giveaway
    - Añadir NavButton para 'dynamics' con icono Sparkles o Zap
    - Mantener orden: Dinámicas, Juegos, OBS, Galería, Datos
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Actualizar lógica de estado activo
    - Dinámicas debe estar activo cuando leftTab === 'dynamics'
    - Independiente del valor de dynamicsView
    - _Requirements: 5.3_

  - [x] 5.3 Write property test for tab active state
    - **Property 5: Dynamics Tab Remains Active During Sub-Navigation**
    - **Validates: Requirements 5.3**

- [x] 6. Actualizar navegación móvil
  - [x] 6.1 Actualizar MobileNavButtons
    - Reemplazar botones individuales por Dinámicas
    - Mantener consistencia con desktop
    - _Requirements: 5.1, 5.4_

- [x] 7. Integrar DynamicsPanel en el área de contenido
  - [x] 7.1 Reemplazar renderizado condicional
    - Eliminar bloques `leftTab === 'poll'`, `leftTab === 'judge'`, `leftTab === 'giveaway'`
    - Añadir bloque `leftTab === 'dynamics'` que renderiza DynamicsPanel
    - Pasar todos los props necesarios
    - _Requirements: 1.3, 4.3_

  - [x] 7.2 Write property test for activity navigation
    - **Property 2: Activity Navigation Works Correctly**
    - **Validates: Requirements 1.3, 2.1**

- [x] 8. Checkpoint - Verificar navegación básica
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que se puede navegar entre todas las actividades
  - Verificar que el botón volver funciona correctamente

- [x] 9. Actualizar Demo Tour
  - [x] 9.1 Modificar pasos del tour que navegan a poll/judge/giveaway
    - Actualizar `onStepChange` para usar nueva navegación
    - Primero setLeftTab('dynamics'), luego setDynamicsView('poll')
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 Actualizar referencias en tour steps
    - Revisar y actualizar cualquier referencia a la navegación antigua
    - _Requirements: 6.3_

  - [x] 9.3 Write property test for demo tour navigation
    - **Property 7: Demo Tour Navigation Integration**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 10. Actualizar traducciones i18n
  - [x] 10.1 Añadir traducciones para Dinámicas
    - Añadir `nav.dynamics` en archivos de traducción
    - Añadir descripciones de cada actividad si es necesario
    - _Requirements: 5.2_

- [x] 11. Actualizar keyboard shortcuts
  - [x] 11.1 Revisar shortcuts existentes
    - Actualizar `navPanel` para navegar a dynamics
    - Considerar añadir shortcuts para actividades específicas
    - _Requirements: 7.1, 7.2_

  - [x] 11.2 Write property test for keyboard navigation
    - **Property 6: Keyboard Navigation Accessibility**
    - **Validates: Requirements 7.1, 7.2, 7.4**

- [x] 12. Final checkpoint - Verificar implementación completa
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar navegación completa desktop y móvil
  - Verificar demo tour funciona correctamente
  - Verificar accesibilidad con teclado

## Notes

- All tasks including tests are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Los componentes existentes (PollCreator, JudgePanel, GiveawayHub) no requieren modificaciones internas
