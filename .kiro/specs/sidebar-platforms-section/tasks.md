# Implementation Plan: Sidebar Platforms Section

## Overview

Este plan implementa la nueva sección "Plataformas" en el sidebar, con navegación jerárquica de 3 niveles. Inicialmente solo incluye Twitch con el CommandPanel existente, preparado para expansión futura.

## Tasks

- [x] 1. Crear configuración de plataformas y herramientas
  - Crear archivo `config/platforms.ts`
  - Definir `PLATFORMS` array con Twitch
  - Definir `TWITCH_TOOLS` array con Comandos, Predicciones (coming soon), Channel Points (coming soon)
  - Exportar tipos `PlatformConfig` y `ToolConfig`
  - _Requirements: 2.1, 3.2, 6.1, 6.2_

- [x] 2. Extender tipos de navegación
  - Añadir `'platforms'` al tipo `LeftTab` en types.ts
  - Crear tipos `PlatformsView` y `PlatformsTool`
  - _Requirements: 1.1, 6.3_

- [x] 3. Crear componente PlatformSelector
  - [x] 3.1 Crear estructura base del componente
    - Crear archivo `components/PlatformSelector.tsx`
    - Implementar grid de cards similar a ActivitySelector
    - Añadir props `platforms` y `onSelectPlatform`
    - _Requirements: 1.3, 2.1_

  - [x] 3.2 Implementar PlatformCard con estilos
    - Crear subcomponente PlatformCard
    - Añadir icono, título, descripción y color
    - Implementar hover effects
    - Soportar estado `comingSoon` con badge
    - _Requirements: 2.2, 2.4_

  - [x] 3.3 Añadir accesibilidad
    - Añadir tabIndex y role a las cards
    - Implementar handlers para Enter y Space
    - Añadir aria-label al contenedor
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 3.4 Write property test for platform navigation
    - **Property 1: Platform Navigation Works Correctly**
    - **Validates: Requirements 1.2, 1.3, 2.3**

- [x] 4. Crear componente TwitchToolSelector
  - [x] 4.1 Crear estructura base del componente
    - Crear archivo `components/TwitchToolSelector.tsx`
    - Implementar grid de tool cards
    - Añadir props `tools`, `onSelectTool`, `onBack`
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Implementar ToolCard con estados
    - Crear subcomponente ToolCard
    - Añadir icono, título, descripción
    - Implementar estado `comingSoon` con badge "Próximamente"
    - Deshabilitar click en tools coming soon
    - _Requirements: 3.3, 3.5_

  - [x] 4.3 Implementar botón de retorno
    - Añadir botón "← Volver" en header
    - Conectar con callback `onBack`
    - _Requirements: 5.2_

  - [x] 4.4 Añadir accesibilidad
    - Cards focusables y activables con teclado
    - Back button accesible
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.5 Write property test for tool navigation
    - **Property 2: Tool Navigation Works Correctly**
    - **Validates: Requirements 3.1, 3.4, 4.1**

  - [x] 4.6 Write property test for coming soon tools
    - **Property 3: Coming Soon Tools Are Non-Interactive**
    - **Validates: Requirements 3.5**

- [x] 5. Crear componente PlatformsPanel
  - [x] 5.1 Crear wrapper principal
    - Crear archivo `components/PlatformsPanel.tsx`
    - Implementar renderizado condicional según `view` y `tool`
    - Manejar navegación entre niveles
    - _Requirements: 4.1, 5.1_

  - [x] 5.2 Integrar CommandPanel existente
    - Renderizar CommandPanel cuando `tool === 'commands'`
    - Añadir botón de retorno sobre CommandPanel
    - Pasar props necesarios
    - _Requirements: 4.2, 4.3_

  - [x] 5.3 Write property test for hierarchical navigation
    - **Property 4: Hierarchical Back Navigation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Checkpoint - Verificar componentes aislados
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar que cada componente renderiza correctamente
  - Verificar navegación entre niveles

- [x] 7. Modificar estado de navegación en App.tsx
  - [x] 7.1 Añadir estados de plataformas
    - Añadir `'platforms'` al tipo de `leftTab`
    - Crear estado `platformsView` con valor inicial `'selector'`
    - Crear estado `platformsTool` con valor inicial `'none'`
    - _Requirements: 1.1, 6.3_

  - [x] 7.2 Implementar handlers de navegación
    - Crear `handlePlatformNavigation` para cambiar platformsView
    - Crear `handleToolNavigation` para cambiar platformsTool
    - Crear `handlePlatformsBack` para navegación hacia atrás
    - _Requirements: 5.2, 5.3_

  - [x] 7.3 Write property test for state persistence
    - **Property 6: State Persistence During Navigation**
    - **Validates: Requirements 4.3, 4.4**

- [x] 8. Actualizar sidebar desktop
  - [x] 8.1 Añadir botón Plataformas
    - Añadir NavButton para 'platforms' con icono (Layers o similar)
    - Posicionar después de Juegos: Dinámicas, Juegos, Plataformas, OBS...
    - _Requirements: 1.1, 1.4_

  - [x] 8.2 Actualizar lógica de estado activo
    - Plataformas debe estar activo cuando leftTab === 'platforms'
    - Independiente de platformsView y platformsTool
    - _Requirements: 5.4_

  - [x] 8.3 Write property test for tab active state
    - **Property 5: Platforms Tab Remains Active**
    - **Validates: Requirements 5.4**

- [x] 9. Actualizar navegación móvil
  - [x] 9.1 Añadir MobileNavButton para Plataformas
    - Añadir botón en la barra inferior móvil
    - Mantener consistencia con desktop
    - _Requirements: 1.1, 1.4_

- [x] 10. Integrar PlatformsPanel en área de contenido
  - [x] 10.1 Añadir renderizado condicional
    - Añadir bloque `leftTab === 'platforms'` que renderiza PlatformsPanel
    - Pasar todos los props necesarios (view, tool, handlers, chatMessages, etc.)
    - _Requirements: 1.2, 4.1_

- [x] 11. Actualizar traducciones i18n
  - [x] 11.1 Añadir traducciones
    - Añadir `nav.platforms` en archivos de traducción
    - Añadir textos para herramientas y badges
    - _Requirements: 1.1_

- [x] 12. Añadir accesibilidad completa
  - [x] 12.1 Verificar navegación por teclado
    - Asegurar que toda la jerarquía es navegable con Tab
    - Verificar Enter/Space en todos los elementos interactivos
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 12.2 Write property test for keyboard navigation
    - **Property 7: Keyboard Navigation Accessibility**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 13. Final checkpoint - Verificar implementación completa
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar flujo completo: Plataformas → Twitch → Comandos → Volver → Volver
  - Verificar que CommandPanel funciona correctamente
  - Verificar accesibilidad con teclado
  - Verificar navegación móvil

## Notes

- All tasks including tests are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- El CommandPanel existente se integra sin modificaciones internas
- Las herramientas "Próximamente" (Predicciones, Channel Points) solo muestran UI, no funcionalidad
