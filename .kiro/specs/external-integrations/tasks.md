# Implementation Tasks: Integraciones Externas

## Task 1: Crear tipos base
- [x] 1.1 Crear `types/integrations.ts` con interfaces
- [x] 1.2 Definir tipos para Streamlabs
- [x] 1.3 Definir tipos para StreamElements
- [x] 1.4 Definir tipos para event mapping
- **Validates**: Requirement 1-6

## Task 2: Implementar StreamlabsAdapter
- [x] 2.1 Crear `src/integrations/adapters/StreamlabsAdapter.ts`
- [x] 2.2 Implementar OAuth flow
- [x] 2.3 Implementar conexión Socket.io
- [x] 2.4 Implementar handlers de eventos
- [x] 2.5 Implementar refresh de tokens
- **Validates**: Requirement 1.1-1.5

## Task 3: Property tests StreamlabsAdapter
- [x] 3.1 Test: OAuth genera URLs válidas
- [x] 3.2 Test: Eventos se parsean correctamente
- [x] 3.3 Test: Reconexión funciona
- **Validates**: Property tests


## Task 4: Implementar StreamElementsAdapter
- [x] 4.1 Crear `src/integrations/adapters/StreamElementsAdapter.ts`
- [x] 4.2 Implementar JWT auth
- [x] 4.3 Implementar conexión Socket.io
- [x] 4.4 Implementar handlers de eventos
- [x] 4.5 Implementar sistema de puntos
- **Validates**: Requirement 2.1-2.5

## Task 5: Property tests StreamElementsAdapter
- [x] 5.1 Test: JWT se valida correctamente
- [x] 5.2 Test: Eventos se parsean correctamente
- [x] 5.3 Test: Puntos se calculan correctamente
- **Validates**: Property tests

## Task 6: Implementar IntegrationService
- [x] 6.1 Crear `src/integrations/services/IntegrationService.ts`
- [x] 6.2 Implementar gestión de conexiones
- [x] 6.3 Implementar routing de eventos
- [x] 6.4 Implementar historial de eventos
- **Validates**: Requirement 3, 6

## Task 7: Implementar EventMappingService
- [x] 7.1 Crear `src/integrations/services/EventMappingService.ts`
- [x] 7.2 Implementar CRUD de mappings
- [x] 7.3 Implementar filtros de eventos
- [x] 7.4 Implementar ejecución de acciones
- **Validates**: Requirement 4

## Task 8: Implementar IntegrationStorageService
- [x] 8.1 Crear `src/integrations/services/IntegrationStorageService.ts`
- [x] 8.2 Implementar storage de tokens (encriptado)
- [x] 8.3 Implementar storage de mappings
- [x] 8.4 Implementar storage de historial (IndexedDB)
- **Validates**: Requirement 3, 6

## Task 9: Crear hooks
- [x] 9.1 Crear `hooks/useStreamlabs.ts`
- [x] 9.2 Crear `hooks/useStreamElements.ts`
- [x] 9.3 Crear `hooks/useIntegrationEvents.ts`
- [x] 9.4 Crear `hooks/useEventMappings.ts`
- **Validates**: Requirement 1-6

## Task 10: Crear IntegrationsPanel
- [x] 10.1 Crear `components/integrations/IntegrationsPanel.tsx`
- [x] 10.2 Tabs para cada integración
- [x] 10.3 Estado de conexiones
- **Validates**: Requirement 3.1

## Task 11: Crear StreamlabsConfig
- [x] 11.1 Crear `components/integrations/StreamlabsConfig.tsx`
- [x] 11.2 Botón OAuth
- [x] 11.3 Estado de conexión
- [x] 11.4 Eventos recientes
- **Validates**: Requirement 1

## Task 12: Crear StreamElementsConfig
- [x] 12.1 Crear `components/integrations/StreamElementsConfig.tsx`
- [x] 12.2 Input JWT
- [x] 12.3 Estado de conexión
- [x] 12.4 Panel de puntos
- **Validates**: Requirement 2

## Task 13: Crear EventMappingEditor
- [x] 13.1 Crear `components/integrations/EventMappingEditor.tsx`
- [x] 13.2 Selector de evento
- [x] 13.3 Editor de filtros
- [x] 13.4 Selector de acción
- **Validates**: Requirement 4

## Task 14: Crear IntegrationEventLog
- [x] 14.1 Crear `components/integrations/IntegrationEventLog.tsx`
- [x] 14.2 Lista de eventos
- [x] 14.3 Filtros
- [x] 14.4 Estadísticas
- [x] 14.5 Exportar
- **Validates**: Requirement 6

## Task 15: Tests de integración
- [x] 15.1 Test: Conexión Streamlabs
- [x] 15.2 Test: Conexión StreamElements
- [x] 15.3 Test: Event mapping funciona
- [x] 15.4 Test: Historial se guarda
- **Validates**: All requirements

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos | 1 | 4 |
| Adapters | 2 | 10 |
| Services | 3 | 12 |
| Property Tests | 2 | 6 |
| Hooks | 1 | 4 |
| Components | 5 | 17 |
| Integration Tests | 1 | 4 |
| **Total** | **15** | **57** |

**Estimación**: 3-4 semanas
