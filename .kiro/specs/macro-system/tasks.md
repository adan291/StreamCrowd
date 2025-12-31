# Implementation Plan: Sistema de Macros / Comandos Personalizados

## Overview

Plan de implementación para el sistema de macros de TwitchVote, permitiendo crear secuencias de acciones automatizadas con triggers, condiciones y variables.

## Tasks

- [x] 1. Crear tipos e interfaces base
  - [x] 1.1 Crear `types/macros.ts`
    - Definir Macro, MacroTrigger, TriggerType
    - Definir MacroAction, ActionType, ActionConfig
    - Definir MacroCondition, ConditionOperator
    - Definir MacroVariable, ExecutionContext, ExecutionResult
    - _Requirements: 1.1, 2.1-2.5, 3.1-3.9, 4.1-4.3, 5.1-5.3_

- [x] 2. Implementar VariableResolver
  - [x] 2.1 Crear `src/application/services/VariableResolverService.ts`
    - Implementar getSystemVariables (username, displayName, message, platform)
    - Implementar getStreamVariables (viewers, followers, uptime)
    - Implementar getUserVariables (personalizadas)
    - Implementar resolve(template, context) para reemplazar variables
    - Implementar operaciones matemáticas básicas
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Property test: Variable resolution
    - **Property 5: Variable Resolution**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**

- [x] 3. Implementar ConditionEvaluator
  - [x] 3.1 Crear `src/application/services/ConditionEvaluatorService.ts`
    - Implementar evaluateSimple para comparaciones (equals, greater, contains, etc.)
    - Implementar evaluateGroup para lógica AND/OR
    - Implementar evaluate recursivo para condiciones anidadas
    - Integrar con VariableResolver para resolver operandos
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Property test: Condition evaluation determinism
    - **Property 6: Condition Evaluation Determinism**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

- [x] 4. Implementar ActionExecutor
  - [x] 4.1 Crear `src/application/services/ActionExecutorService.ts`
    - Implementar executeSendChatMessage
    - Implementar executeChangeScene (integrar con OBSService)
    - Implementar executeToggleSource (integrar con OBSService)
    - Implementar executePlaySound (integrar con SoundBoard)
    - Implementar executeStartPoll (integrar con PollService)
    - Implementar executeStartPrediction (integrar con PredictionService)
    - Implementar executeSendNotification (integrar con NotificationService)
    - Implementar executeSetVariable
    - Implementar executeDelay
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 4.2 Property test: Action execution order
    - **Property 4: Action Execution Order**
    - **Validates: Requirements 1.2, 3.10**

- [x] 5. Implementar TriggerService
  - [x] 5.1 Crear `src/application/services/TriggerService.ts`
    - Implementar registerTrigger y unregisterTrigger
    - Implementar checkChatCommand
    - Implementar checkChatKeyword
    - Implementar checkSchedule (con setInterval)
    - Implementar checkEvent
    - Implementar cooldown tracking
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.2 Property test: Trigger type recognition
    - **Property 3: Trigger Type Recognition**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [x] 5.3 Property test: Cooldown enforcement
    - **Property 9: Cooldown Enforcement**
    - **Validates: Requirements 2.7**

- [x] 6. Implementar MacroStorageService
  - [x] 6.1 Crear `src/application/services/MacroStorageService.ts`
    - Implementar saveMacro, getMacro, getAllMacros, deleteMacro
    - Implementar saveVariable, getVariable, getAllVariables
    - Implementar saveExecutionLog, getExecutionLog
    - Usar IndexedDB para persistencia
    - _Requirements: 1.4, 9.1, 9.2, 9.4_

  - [x] 6.2 Property test: Macro persistence round-trip
    - **Property 2: Macro Persistence Round-Trip**
    - **Validates: Requirements 1.4, 1.5**

- [x] 7. Checkpoint - Verificar servicios base
  - Asegurar que todos los tests pasan
  - Verificar que el build compila sin errores

- [x] 8. Implementar MacroService (Orchestrator)
  - [x] 8.1 Crear `src/application/services/MacroService.ts`
    - Implementar createMacro con validación
    - Implementar updateMacro
    - Implementar deleteMacro
    - Implementar executeMacro que coordina todos los servicios
    - Implementar pauseAll y resumeAll
    - Integrar con TriggerService para auto-ejecución
    - _Requirements: 1.1, 1.2, 1.3, 9.6_

  - [x] 8.2 Property test: Macro structure validity
    - **Property 1: Macro Structure Validity**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 8.3 Property test: Condition-based action skipping
    - **Property 7: Condition-Based Action Skipping**
    - **Validates: Requirements 5.5**

  - [x] 8.4 Property test: Execution log completeness
    - **Property 10: Execution Log Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.5**

- [x] 9. Implementar Import/Export
  - [x] 9.1 Añadir métodos a MacroService
    - Implementar exportMacros con metadatos
    - Implementar importMacros con validación
    - Implementar resolución de conflictos de nombre
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.2 Property test: Import/export round-trip
    - **Property 8: Import/Export Round-Trip**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6**

- [x] 10. Checkpoint - Verificar lógica completa
  - Asegurar que todos los tests pasan
  - Verificar integración entre servicios

- [x] 11. Implementar Hooks de React
  - [x] 11.1 Crear `hooks/useMacros.ts`
    - Hook para CRUD de macros
    - Exponer macros, createMacro, updateMacro, deleteMacro
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.2 Crear `hooks/useMacroEditor.ts`
    - Hook para el editor de macros
    - Gestionar estado del formulario
    - Validación en tiempo real
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.3 Crear `hooks/useMacroExecution.ts`
    - Hook para ejecutar macros manualmente
    - Exponer execute, executionLog, isPaused
    - _Requirements: 9.3, 9.6_

  - [x] 11.4 Crear `hooks/useVariables.ts`
    - Hook para gestionar variables personalizadas
    - Exponer variables, setVariable, deleteVariable
    - _Requirements: 4.3_

- [x] 12. Implementar Componentes UI - Editor
  - [x] 12.1 Crear `components/macros/MacroEditor.tsx`
    - Formulario principal de macro (nombre, descripción)
    - Selector de trigger con configuración específica
    - Lista de acciones con drag & drop
    - Botón de guardar con validación
    - _Requirements: 6.1, 6.2, 6.6, 6.8_

  - [x] 12.2 Crear `components/macros/TriggerConfig.tsx`
    - Selector de tipo de trigger
    - Formularios específicos por tipo
    - Configuración de cooldown
    - _Requirements: 6.1_

  - [x] 12.3 Crear `components/macros/ActionBuilder.tsx`
    - Selector de tipo de acción con iconos
    - Formularios específicos por tipo de acción
    - Editor de delay
    - _Requirements: 6.3, 6.4_

  - [x] 12.4 Crear `components/macros/ConditionEditor.tsx`
    - Editor visual de condiciones
    - Selector de operador
    - Soporte para grupos AND/OR
    - Preview de variables disponibles
    - _Requirements: 6.5, 6.7_

- [x] 13. Implementar Componentes UI - Manager
  - [x] 13.1 Crear `components/macros/MacroManager.tsx`
    - Lista de macros con estado
    - Toggle de habilitado/deshabilitado
    - Botones de editar, duplicar, eliminar
    - Búsqueda y filtros
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 13.2 Crear `components/macros/MacroCard.tsx`
    - Card individual de macro
    - Mostrar trigger, acciones, estadísticas
    - Indicador de último error
    - _Requirements: 7.5, 7.7_

  - [x] 13.3 Crear `components/macros/MacroExecutionLog.tsx`
    - Log en tiempo real de ejecuciones
    - Filtros por macro y estado
    - Detalles de cada ejecución
    - _Requirements: 9.3_

  - [x] 13.4 Crear `components/macros/MacroImportExport.tsx`
    - Botones de importar/exportar
    - Selector de macros para exportar
    - Preview de importación
    - _Requirements: 8.1, 8.2_

- [-] 14. Integrar en la Aplicación
  - [x] 14.1 Añadir traducciones a `i18n/locales.ts`
    - Textos para editor de macros
    - Textos para tipos de trigger y acción
    - Textos para condiciones y variables
    - _Requirements: 6.1, 7.1_

  - [x] 14.2 Crear página/panel de Macros
    - Integrar MacroManager como vista principal
    - Modal para MacroEditor
    - Panel lateral para log de ejecución
    - _Requirements: 6.1, 7.1, 9.3_

  - [ ] 14.3 Conectar TriggerService con eventos de la app
    - Escuchar eventos de chat
    - Escuchar eventos de stream (follows, raids, etc.)
    - Inicializar triggers de schedule
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 15. Checkpoint Final
  - Asegurar que todos los tests pasan
  - Verificar que el build compila sin errores
  - Probar flujo completo de creación y ejecución de macros

## Notes

- Todas las tareas son obligatorias incluyendo property tests
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud

## Dependencies

- Task 2, 3 son independientes
- Task 4 depende de Task 2 (VariableResolver)
- Task 5 depende de Task 3 (ConditionEvaluator)
- Task 6 depende de IndexedDB (ya implementado)
- Task 8 depende de Task 2, 3, 4, 5, 6
- Task 9 depende de Task 8
- Task 11, 12, 13 dependen de Task 8, 9

## Estimación de Tiempo

| Task | Complejidad | Tiempo Estimado |
|------|-------------|-----------------|
| Task 1: Tipos | Baja | 0.5 días |
| Task 2: Variables | Media | 1 día |
| Task 3: Conditions | Media | 1 día |
| Task 4: Actions | Alta | 2 días |
| Task 5: Triggers | Alta | 1.5 días |
| Task 6: Storage | Media | 1 día |
| Task 7: Checkpoint | - | 0.5 días |
| Task 8: Orchestrator | Alta | 2 días |
| Task 9: Import/Export | Media | 1 día |
| Task 10: Checkpoint | - | 0.5 días |
| Task 11: Hooks | Media | 1 día |
| Task 12: UI Editor | Alta | 3 días |
| Task 13: UI Manager | Media | 2 días |
| Task 14: Integration | Media | 1.5 días |
| Task 15: Checkpoint | - | 0.5 días |

**Total estimado: 18-20 días**

