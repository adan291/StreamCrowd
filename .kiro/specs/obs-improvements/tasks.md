# Implementation Plan: OBS Panel Improvements

## Overview

Este plan implementa las mejoras del panel OBS en orden de complejidad: primero el fix del meta tag, luego mejoras de UI, y finalmente las nuevas funcionalidades.

## Tasks

- [x] 1. Fix Meta Tag Deprecation
  - [x] 1.1 Actualizar meta tag en index.html
    - Cambiar `apple-mobile-web-app-capable` por `mobile-web-app-capable`
    - _Requirements: 5.1_

- [x] 2. Mejorar Toggle de Fuentes
  - [x] 2.1 Actualizar SourceToggle en OBSControlPanel
    - Agregar estado de loading durante toggle
    - Mejorar colores: verde para visible, gris para oculto
    - Agregar animación de escala al hacer click
    - Manejar errores con notificación
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Escenas Favoritas Editables
  - [x] 3.1 Agregar estado de favoritos en useOBS
    - Crear estado favoriteScenes con localStorage
    - Crear función saveFavoriteScenes
    - Validar escenas existentes al cargar
    - _Requirements: 2.3, 2.4, 2.6_

  - [x] 3.2 Property test: Favorite Scenes (Properties 2, 3, 4)
    - Test límite de 6 favoritos
    - Test round-trip de persistencia
    - Test limpieza de favoritos inválidos
    - **Property 2, 3, 4: Favorite Scenes**
    - **Validates: Requirements 2.1, 2.3, 2.4, 2.6**

  - [x] 3.3 Crear modal de selección de favoritos
    - Mostrar todas las escenas disponibles
    - Permitir seleccionar/deseleccionar
    - Mostrar contador (X/6)
    - Botón guardar y cancelar
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Actualizar Quick Actions tab
    - Mostrar favoritos en lugar de primeras 4 escenas
    - Agregar botón de editar favoritos
    - _Requirements: 2.5_

- [x] 4. Comandos Rápidos
  - [x] 4.1 Definir tipos QuickCommand en OBSService
    - Crear interface QuickCommand
    - Crear type QuickCommandAction
    - _Requirements: 3.1, 3.3_

  - [x] 4.2 Agregar gestión de comandos en useOBS
    - Estado quickCommands con localStorage
    - Funciones addQuickCommand, updateQuickCommand, removeQuickCommand
    - Función executeQuickCommand con ejecución secuencial
    - _Requirements: 3.1, 3.2, 3.4, 3.6_

  - [x] 4.3 Property test: Quick Commands (Properties 5, 6)
    - Test ejecución en orden
    - Test round-trip de persistencia
    - **Property 5, 6: Quick Commands**
    - **Validates: Requirements 3.2, 3.4**

  - [x] 4.4 Crear UI para comandos rápidos
    - Mostrar comandos como botones en Quick Actions
    - Modal para crear/editar comando
    - Selector de acciones con drag & drop o lista
    - _Requirements: 3.1, 3.5, 3.6_

- [x] 5. Mejora del Sistema de Presets
  - [x] 5.1 Crear PresetConfigModal component
    - Mostrar nombre y descripción del preset
    - Lista de automatizaciones con dropdown de escenas
    - Pre-seleccionar escenas que coincidan con hint
    - Validar que todas las escenas estén seleccionadas
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 5.2 Property test: Presets (Properties 7, 8, 9)
    - Test pre-selección por hint
    - Test validación de selección completa
    - Test creación de todas las automatizaciones
    - **Property 7, 8, 9: Presets**
    - **Validates: Requirements 4.3, 4.4, 4.5**

  - [x] 5.3 Integrar PresetConfigModal en OBSControlPanel
    - Reemplazar applyPreset directo por modal
    - Mostrar notificación de éxito con conteo
    - _Requirements: 4.4, 4.6_

- [x] 6. Checkpoint Final
  - Ejecutar `npm run build` y verificar éxito
  - Ejecutar `npm test` y verificar tests pasan
  - Probar manualmente cada funcionalidad

## Notes

- El fix del meta tag es independiente y se hace primero
- Las escenas favoritas y comandos rápidos comparten el tab Quick Actions
- Los presets ahora requieren confirmación del usuario antes de aplicar

