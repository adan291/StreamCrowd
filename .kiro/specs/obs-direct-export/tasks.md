# Implementation Tasks: Exportación Directa a OBS

## Task 1: Crear tipos y modelos
- [x] 1.1 Crear `types/obs-export.ts` con interfaces SourceType, BrowserSourceConfig, Transform
- [x] 1.2 Crear tipos para SceneInfo, SceneItem, SceneItemSettings
- [x] 1.3 Crear tipos para SceneTemplate, TemplateScene, TemplateSceneItem, TemplateVariable
- [x] 1.4 Crear tipos para OBSConfig, Backup, ConfigDiff, Conflict
- [x] 1.5 Crear tipos para OverlayType, OverlayOBSStatus, QuickAddOptions
- [x] 1.6 Crear enum OBSExportErrorCode y clase OBSExportError
- **Validates**: Requirement 1, 2, 3, 5, 6

## Task 2: Implementar OBSSourceService
- [x] 2.1 Crear `src/application/services/OBSSourceService.ts`
- [x] 2.2 Implementar `createBrowserSource(config)` usando obs-websocket
- [x] 2.3 Implementar `updateBrowserSource(name, config)` para actualizar existentes
- [x] 2.4 Implementar `deleteBrowserSource(name)` con confirmación
- [x] 2.5 Implementar `createSource(type, config)` genérico para otros tipos
- [x] 2.6 Implementar `sourceExists(name)` para detectar duplicados
- [x] 2.7 Implementar `listSources()` para obtener todas las fuentes
- [x] 2.8 Implementar `getSourceSettings/setSourceSettings`
- [x] 2.9 Implementar `setSourceTransform/getSourceTransform`
- [x] 2.10 Implementar `addFilter/removeFilter` para filtros básicos
- **Validates**: Requirement 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.4

## Task 3: Property tests para OBSSourceService
- [x] 3.1 Escribir property test para idempotencia de creación (Property 1)
- [x] 3.2 Escribir property test para preservación de transform (Property 4)
- [x] 3.3 Escribir tests para detección de duplicados
- **Validates**: Requirement 1.5, 7.1

## Task 4: Implementar OBSSceneService
- [x] 4.1 Crear `src/application/services/OBSSceneService.ts`
- [x] 4.2 Implementar `createScene(name)` para crear escenas
- [x] 4.3 Implementar `deleteScene(name)` con confirmación
- [x] 4.4 Implementar `renameScene(oldName, newName)`
- [x] 4.5 Implementar `duplicateScene(name, newName)`
- [x] 4.6 Implementar `addSourceToScene(sceneName, sourceName, settings)`
- [x] 4.7 Implementar `removeSourceFromScene(sceneName, sceneItemId)`
- [x] 4.8 Implementar `getSceneItems(sceneName)` para listar items
- [x] 4.9 Implementar `setSceneItemIndex` para reordenar
- [x] 4.10 Implementar `setSceneItemEnabled/setSceneItemLocked`
- [x] 4.11 Implementar `listScenes()` y `getCurrentScene/setCurrentScene`
- **Validates**: Requirement 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 5.5, 5.6

## Task 5: Property tests para OBSSceneService
- [x] 5.1 Escribir property test para ordenamiento de items (Property 6)
- [x] 5.2 Escribir tests para operaciones CRUD de escenas
- **Validates**: Requirement 4.1, 4.2, 4.3, 4.4

## Task 6: Implementar TemplateService
- [x] 6.1 Crear `src/application/services/TemplateService.ts`
- [x] 6.2 Implementar `getBuiltInTemplates()` con templates predefinidos
- [x] 6.3 Crear template "Gaming Setup" con 4 escenas
- [x] 6.4 Crear template "Just Chatting" con 3 escenas
- [x] 6.5 Crear template "IRL Streaming" con 3 escenas
- [x] 6.6 Crear template "Creative/Art" con 3 escenas
- [x] 6.7 Implementar `getCustomTemplates/saveCustomTemplate/deleteCustomTemplate`
- [x] 6.8 Implementar `exportTemplate(id)` a JSON
- [x] 6.9 Implementar `importTemplate(json)` con validación
- [x] 6.10 Implementar `applyTemplate(template, options)` creando escenas en OBS
- [x] 6.11 Implementar `previewTemplate(template)` para preview visual
- [x] 6.12 Implementar `customizeTemplate` para modificar variables
- **Validates**: Requirement 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

## Task 7: Property tests para TemplateService
- [x] 7.1 Escribir property test para completitud de aplicación (Property 2)
- [x] 7.2 Escribir tests para import/export de templates
- **Validates**: Requirement 2.4, 2.5

## Task 8: Implementar ConfigSyncService
- [x] 8.1 Crear `src/application/services/ConfigSyncService.ts`
- [x] 8.2 Implementar `exportConfig(options)` para exportar config OBS
- [x] 8.3 Implementar `importConfig(config, options)` para importar
- [x] 8.4 Implementar `createBackup(description)` automático
- [x] 8.5 Implementar `listBackups()` desde IndexedDB
- [x] 8.6 Implementar `restoreBackup(backupId)` con rollback
- [x] 8.7 Implementar `deleteBackup(backupId)`
- [x] 8.8 Implementar `detectChanges()` para diff de configuración
- [x] 8.9 Implementar `detectConflicts/resolveConflict` para conflictos
- [x] 8.10 Implementar backup automático antes de cambios destructivos
- **Validates**: Requirement 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

## Task 9: Property tests para ConfigSyncService
- [x] 9.1 Escribir property test para integridad de backup (Property 3)
- [x] 9.2 Escribir property test para roundtrip export/import (Property 5)
- **Validates**: Requirement 3.3, 3.4

## Task 10: Implementar QuickExportService
- [x] 10.1 Crear `src/application/services/QuickExportService.ts`
- [x] 10.2 Implementar `addOverlayToOBS(overlayType, options)` 
- [x] 10.3 Implementar `getOverlayStatus(overlayType)` para verificar estado
- [x] 10.4 Implementar `listExportedOverlays()` 
- [x] 10.5 Implementar `updateOverlayInOBS(overlayType)` para actualizar URL
- [x] 10.6 Implementar `removeOverlayFromOBS(overlayType)`
- [x] 10.7 Implementar `getSuggestedPosition/getSuggestedDimensions`
- [x] 10.8 Persistir estado de overlays exportados en localStorage
- **Validates**: Requirement 6.1, 6.2, 6.3, 6.4, 6.5

## Task 11: Property tests para QuickExportService
- [x] 11.1 Escribir tests para sugerencias de posición/dimensiones
- [x] 11.2 Escribir tests para estado de overlays
- **Validates**: Requirement 6.2, 6.3

## Task 12: Crear hooks de React
- [x] 12.1 Crear `hooks/useOBSSources.ts` para gestión de fuentes
- [x] 12.2 Crear `hooks/useOBSScenes.ts` para gestión de escenas
- [x] 12.3 Crear `hooks/useTemplates.ts` para biblioteca de templates
- [x] 12.4 Crear `hooks/useConfigSync.ts` para sincronización
- [x] 12.5 Crear `hooks/useQuickExport.ts` para exportación rápida
- **Validates**: Requirement 1, 2, 3, 4, 5, 6

## Task 13: Crear SourceCreatorPanel
- [x] 13.1 Crear `components/obs-export/SourceCreatorPanel.tsx`
- [x] 13.2 Implementar selector de tipo de fuente
- [x] 13.3 Implementar formulario dinámico según tipo seleccionado
- [x] 13.4 Implementar preview de Browser Source
- [x] 13.5 Implementar validación de campos
- [x] 13.6 Implementar botones crear/actualizar/cancelar
- **Validates**: Requirement 1.1, 1.2, 1.6, 5.2

## Task 14: Crear TemplateLibrary
- [x] 14.1 Crear `components/obs-export/TemplateLibrary.tsx`
- [x] 14.2 Implementar grid de templates con thumbnails
- [x] 14.3 Implementar filtro por categoría
- [x] 14.4 Implementar modal de preview con personalización
- [x] 14.5 Implementar editor de variables del template
- [x] 14.6 Implementar botones aplicar/importar/exportar
- [x] 14.7 Implementar sección de templates personalizados
- **Validates**: Requirement 2.1, 2.2, 2.3, 2.5, 2.6

## Task 15: Crear SceneManagerPanel
- [x] 15.1 Crear `components/obs-export/SceneManagerPanel.tsx`
- [x] 15.2 Implementar lista de escenas con drag-and-drop
- [x] 15.3 Implementar árbol de fuentes por escena
- [x] 15.4 Implementar acciones contextuales (duplicar, eliminar, renombrar)
- [x] 15.5 Implementar mini-preview de escena seleccionada
- [x] 15.6 Implementar botón crear nueva escena
- **Validates**: Requirement 4.1, 4.2, 4.3, 4.4, 4.5

## Task 16: Crear ConfigSyncPanel
- [x] 16.1 Crear `components/obs-export/ConfigSyncPanel.tsx`
- [x] 16.2 Implementar indicador de estado de sincronización
- [x] 16.3 Implementar lista de backups con fechas
- [x] 16.4 Implementar botones exportar/importar configuración
- [x] 16.5 Implementar historial de cambios
- [x] 16.6 Implementar modal de resolución de conflictos
- [x] 16.7 Implementar botón restaurar backup
- **Validates**: Requirement 3.1, 3.2, 3.3, 3.4, 3.6

## Task 17: Crear QuickExportButton
- [x] 17.1 Crear `components/obs-export/QuickExportButton.tsx`
- [x] 17.2 Implementar indicador de estado (en OBS / no en OBS)
- [x] 17.3 Implementar dropdown con opciones (añadir, actualizar, eliminar)
- [x] 17.4 Implementar selector de escena destino
- [x] 17.5 Implementar feedback visual de operación
- **Validates**: Requirement 6.1, 6.4, 6.5

## Task 18: Crear OBSExportPanel principal
- [x] 18.1 Crear `components/obs-export/OBSExportPanel.tsx`
- [x] 18.2 Implementar tabs para cada sección (Sources, Scenes, Templates, Sync)
- [x] 18.3 Implementar indicador de conexión OBS
- [x] 18.4 Implementar log de operaciones realizadas
- [x] 18.5 Implementar modo dry-run toggle
- **Validates**: Requirement 7.1, 7.4, 7.5

## Task 19: Integrar QuickExportButton en overlays existentes
- [x] 19.1 Añadir QuickExportButton a PollOverlay (via LivePoll panel)
- [x] 19.2 Añadir QuickExportButton a PredictionPanel
- [x] 19.3 Añadir QuickExportButton a AlertOverlay
- [x] 19.4 Añadir QuickExportButton a componentes de timer
- [x] 19.5 Añadir QuickExportButton a GiveawayHub
- [x] 19.6 Añadir QuickExportButton a SpinnerWheel
- **Validates**: Requirement 6.1
- **Note**: QuickExportButton está disponible en `components/obs-export/QuickExportButton.tsx`. 
  Para integrar en cualquier componente:
  ```tsx
  import { QuickExportButton } from './obs-export/QuickExportButton';
  // En el JSX, junto al OBSOverlayUrl existente:
  <QuickExportButton
    overlayType="poll" // o "prediction", "alert", "timer", "giveaway", "wheel"
    overlayUrl={getOverlayUrl()}
    obsWebSocket={obsWebSocket}
    compact={true}
  />
  ```

## Task 20: Actualizar ROADMAP.md
- [x] 20.1 Marcar "Exportación Directa a OBS" como completada en Fase 4
- [x] 20.2 Actualizar fecha de última modificación
- **Validates**: Documentation

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 6 |
| Servicios | 5 | 42 |
| Property Tests | 5 | 11 |
| Hooks | 1 | 5 |
| UI Components | 6 | 32 |
| Integración | 1 | 6 |
| Documentación | 1 | 2 |
| **Total** | **20** | **104** |

**Estimación**: 3 semanas
**Property Tests**: 11 tests cubriendo las 6 propiedades de correctness

