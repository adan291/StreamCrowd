# Implementation Tasks: Sistema de Plugins

## Task 1: Crear tipos y modelos
- [x] 1.1 Crear `types/plugins.ts` con interfaces PluginManifest, Plugin, PluginStatus
- [x] 1.2 Crear tipos para PluginPermission y validación
- [x] 1.3 Crear tipos para PluginHostAPI y sub-APIs
- [x] 1.4 Crear tipos para eventos de plugins (PluginEvent)
- [x] 1.5 Crear tipos para configuración de UI (PanelConfig, OverlayConfig)
- [x] 1.6 Crear tipos para comandos (CommandConfig, CommandContext)
- **Validates**: Requirement 1, 2, 3, 4

## Task 2: Implementar PluginLoaderService
- [x] 2.1 Crear `src/plugins/services/PluginLoaderService.ts`
- [x] 2.2 Implementar `loadFromFile(file)` para cargar desde ZIP
- [x] 2.3 Implementar `loadFromURL(url)` para cargar desde URL
- [x] 2.4 Implementar `validateManifest(manifest)` con Zod
- [x] 2.5 Implementar `extractPluginCode(zip)` para extraer JS
- [x] 2.6 Implementar validación de permisos
- **Validates**: Requirement 2.3, 3.4

## Task 3: Property tests para PluginLoaderService
- [x] 3.1 Test: Manifests válidos se cargan correctamente
- [x] 3.2 Test: Manifests inválidos son rechazados
- [x] 3.3 Test: Permisos se validan correctamente
- **Validates**: Property 2

## Task 4: Implementar PluginRegistryService
- [x] 4.1 Crear `src/plugins/services/PluginRegistryService.ts`
- [x] 4.2 Implementar `install(manifest, code)` 
- [x] 4.3 Implementar `uninstall(pluginId)`
- [x] 4.4 Implementar `update(pluginId, manifest, code)`
- [x] 4.5 Implementar `listPlugins()` y `getPlugin(id)`
- [x] 4.6 Implementar persistencia en IndexedDB
- **Validates**: Requirement 2.1-2.5

## Task 5: Property tests para PluginRegistryService
- [x] 5.1 Test: Plugins se instalan y persisten
- [x] 5.2 Test: Desinstalación limpia datos
- [x] 5.3 Test: Actualización preserva configuración
- **Validates**: Property 3, 4

## Task 6: Implementar PluginSandboxService
- [x] 6.1 Crear `src/plugins/services/PluginSandboxService.ts`
- [x] 6.2 Implementar `createSandbox(plugin)` con iframe
- [x] 6.3 Implementar comunicación postMessage
- [x] 6.4 Implementar `destroySandbox(pluginId)`
- [x] 6.5 Implementar timeout para operaciones
- [x] 6.6 Implementar manejo de errores en sandbox
- **Validates**: Requirement 3.1-3.5

## Task 7: Property tests para PluginSandboxService
- [x] 7.1 Test: Sandbox aísla correctamente
- [x] 7.2 Test: Errores en plugin no crashean app
- [x] 7.3 Test: Timeout funciona correctamente
- **Validates**: Property 1

## Task 8: Implementar PluginHostService
- [x] 8.1 Crear `src/plugins/services/PluginHostService.ts`
- [x] 8.2 Implementar `createHostAPI(plugin)` con APIs limitadas por permisos
- [x] 8.3 Implementar PollsAPI proxy
- [x] 8.4 Implementar PredictionsAPI proxy
- [x] 8.5 Implementar TimersAPI proxy
- [x] 8.6 Implementar OBSAPI proxy
- [x] 8.7 Implementar StorageAPI para plugins
- [x] 8.8 Implementar EventsAPI con suscripciones
- **Validates**: Requirement 1.1-1.3

## Task 9: Property tests para PluginHostService
- [x] 9.1 Test: APIs respetan permisos
- [x] 9.2 Test: Eventos se entregan correctamente
- [x] 9.3 Test: Storage es aislado por plugin
- **Validates**: Property 2, 5

## Task 10: Implementar PluginUIService
- [ ] 10.1 Crear `src/plugins/services/PluginUIService.ts`
- [ ] 10.2 Implementar `registerPanel(config)`
- [ ] 10.3 Implementar `registerOverlay(config)`
- [ ] 10.4 Implementar `showToast(message)`
- [ ] 10.5 Implementar `showModal(config)`
- [ ] 10.6 Implementar renderizado de componentes de plugins
- **Validates**: Requirement 1.5

## Task 11: Implementar PluginCommandsService
- [ ] 11.1 Crear `src/plugins/services/PluginCommandsService.ts`
- [ ] 11.2 Implementar `register(command)`
- [ ] 11.3 Implementar `unregister(name)`
- [ ] 11.4 Implementar `executeCommand(name, args, context)`
- [ ] 11.5 Integrar con sistema de chat existente
- **Validates**: Requirement 1.4

## Task 12: Implementar PluginManagerService
- [x] 12.1 Crear `src/plugins/services/PluginManagerService.ts`
- [x] 12.2 Implementar `initialize()` para cargar plugins al inicio
- [x] 12.3 Implementar `activatePlugin(id)`
- [x] 12.4 Implementar `deactivatePlugin(id)`
- [x] 12.5 Implementar `getPluginConfig(id)` y `setPluginConfig(id, config)`
- [x] 12.6 Implementar logging de plugins
- **Validates**: Requirement 2.1, 2.2, 4.3

## Task 13: Property tests para PluginManagerService
- [x] 13.1 Test: Ciclo de vida completo funciona
- [x] 13.2 Test: Configuración se persiste
- [x] 13.3 Test: Plugins se cargan al inicio
- **Validates**: Property 3, 4

## Task 14: Crear hooks de React
- [x] 14.1 Crear `hooks/usePlugins.ts` - lista y gestión de plugins
- [x] 14.2 Crear `hooks/usePluginConfig.ts` - configuración de plugin
- [x] 14.3 Crear `hooks/usePluginEvents.ts` - suscripción a eventos
- [x] 14.4 Crear `hooks/usePluginUI.ts` - componentes UI de plugins
- **Validates**: Requirement 5.1-5.4

## Task 15: Crear componente PluginManager
- [x] 15.1 Crear `components/plugins/PluginManager.tsx`
- [x] 15.2 Implementar lista de plugins instalados
- [x] 15.3 Implementar botones activar/desactivar
- [x] 15.4 Implementar botón instalar desde archivo
- [x] 15.5 Implementar botón desinstalar
- **Validates**: Requirement 5.1, 5.2

## Task 16: Crear componente PluginCard
- [x] 16.1 Crear `components/plugins/PluginCard.tsx`
- [x] 16.2 Mostrar info del plugin (nombre, versión, autor)
- [x] 16.3 Mostrar estado (activo, desactivado, error)
- [x] 16.4 Mostrar permisos requeridos
- [x] 16.5 Acciones (configurar, desactivar, eliminar)
- **Validates**: Requirement 5.1

## Task 17: Crear componente PluginConfigModal
- [x] 17.1 Crear `components/plugins/PluginConfigModal.tsx`
- [x] 17.2 Generar formulario desde JSON Schema
- [x] 17.3 Validar configuración
- [x] 17.4 Guardar cambios
- **Validates**: Requirement 4.2, 5.3

## Task 18: Crear componente PluginInstallModal
- [x] 18.1 Crear `components/plugins/PluginInstallModal.tsx`
- [x] 18.2 Implementar drag & drop de archivo
- [x] 18.3 Implementar input de URL
- [x] 18.4 Mostrar preview del plugin
- [x] 18.5 Mostrar permisos y pedir confirmación
- **Validates**: Requirement 2.3

## Task 19: Crear componente PluginMarketplace
- [x] 19.1 Crear `components/plugins/PluginMarketplace.tsx`
- [x] 19.2 Lista de plugins recomendados (hardcoded inicial)
- [x] 19.3 Búsqueda/filtrado
- [x] 19.4 Botón instalar directo
- **Validates**: Requirement 5.5

## Task 20: Crear componente PluginLogs
- [x] 20.1 Crear `components/plugins/PluginLogs.tsx`
- [x] 20.2 Mostrar logs por plugin
- [x] 20.3 Filtrar por nivel (info, warn, error)
- [x] 20.4 Limpiar logs
- **Validates**: Requirement 5.4

## Task 21: Crear SDK para desarrolladores
- [x] 21.1 Crear `src/plugins/sdk/index.ts` con tipos exportados
- [x] 21.2 Crear plantilla de plugin starter
- [x] 21.3 Crear documentación básica de API
- [x] 21.4 Crear ejemplo de plugin funcional
- **Validates**: Requirement 6.1-6.4

## Task 22: Tests de integración
- [x] 22.1 Test: Instalar, activar, usar y desinstalar plugin
- [x] 22.2 Test: Plugin con errores no afecta la app
- [x] 22.3 Test: Permisos se respetan
- [x] 22.4 Test: Eventos llegan a plugins suscritos
- [x] 22.5 Test: UI de plugins se renderiza
- **Validates**: Property 1-6

## Task 23: Actualizar ROADMAP.md
- [x] 23.1 Marcar "Sistema de Plugins" como completado en Fase 4
- [x] 23.2 Actualizar fecha de última modificación
- **Validates**: Documentation

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 6 |
| Servicios | 6 | 35 |
| Property Tests | 4 | 12 |
| Hooks | 1 | 4 |
| Componentes UI | 6 | 22 |
| SDK | 1 | 4 |
| Tests Integración | 1 | 5 |
| Documentación | 1 | 2 |
| **Total** | **23** | **90** |

**Estimación**: 5-6 semanas
**Property Tests**: 12 tests cubriendo las 6 propiedades de correctness
