# Implementation Plan: Modo Offline

## Overview

Plan de implementación para el modo offline completo de TwitchVote, incluyendo IndexedDB, detección de red, indicador visual y cola de sincronización.

## Tasks

- [x] 1. Implementar IndexedDBService
  - [x] 1.1 Crear `src/application/services/IndexedDBService.ts`
    - Implementar inicialización de base de datos con schema
    - Implementar operaciones CRUD (get, getAll, put, delete, clear)
    - Implementar fallback a localStorage si IndexedDB no está disponible
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Escribir property test para IndexedDB round-trip

    - **Property 1: IndexedDB Round-Trip Consistency**
    - **Validates: Requirements 1.5**

- [x] 2. Implementar NetworkService
  - [x] 2.1 Crear `src/application/services/NetworkService.ts`
    - Implementar detección de estado online/offline usando navigator.onLine
    - Implementar sistema de suscripción para notificar cambios
    - Implementar método checkConnection para verificación activa
    - _Requirements: 2.1, 2.2, 2.3, 2.4_



  - [x] 2.2 Escribir property test para consistencia de notificaciones

    - **Property 3: Network Status Consistency**
    - **Validates: Requirements 2.4**

- [x] 3. Implementar SyncQueueService
  - [x] 3.1 Crear `src/application/services/SyncQueueService.ts`
    - Implementar encolado de operaciones con persistencia en IndexedDB
    - Implementar procesamiento FIFO con backoff exponencial
    - Implementar conteo de operaciones pendientes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Escribir property test para orden FIFO

    - **Property 2: Sync Queue FIFO Order**
    - **Validates: Requirements 4.6**


  - [x] 3.3 Escribir property test para conteo de operaciones

    - **Property 4: Pending Operations Count**
    - **Validates: Requirements 3.3**

- [x] 4. Implementar MigrationService
  - [x] 4.1 Crear `src/application/services/MigrationService.ts`
    - Implementar detección de datos existentes en localStorage
    - Implementar migración de datos a IndexedDB
    - Implementar marcado de migración completada
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Implementar Hooks de React
  - [x] 5.1 Crear `hooks/useOfflineStatus.ts`
    - Hook para acceder al estado de red desde componentes
    - Suscripción automática a cambios de NetworkService
    - _Requirements: 2.3_

  - [x] 5.2 Crear `hooks/useIndexedDB.ts`
    - Hook para operaciones CRUD desde componentes
    - Manejo de estados de carga y error
    - _Requirements: 1.2, 1.3_

  - [x] 5.3 Crear `hooks/useSyncQueue.ts`
    - Hook para acceder a la cola de sincronización
    - Exponer conteo de operaciones pendientes
    - _Requirements: 4.1, 3.3_

- [x] 6. Implementar Componente OfflineIndicator
  - [x] 6.1 Crear `components/OfflineIndicator.tsx`
    - Banner visible cuando está offline
    - Mensaje de reconexión cuando vuelve online
    - Mostrar número de operaciones pendientes
    - Icono de sincronización cuando hay operaciones pendientes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Agregar traducciones a `i18n/locales.ts`
    - Textos para estado offline/online
    - Textos para operaciones pendientes
    - _Requirements: 3.1, 3.2_

- [x] 7. Integrar en la Aplicación
  - [x] 7.1 Actualizar `App.tsx`
    - Inicializar servicios al arrancar
    - Ejecutar migración si es necesario
    - Agregar OfflineIndicator al layout
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Checkpoint - Verificar implementación
  - Asegurar que todos los tests pasan
  - Verificar que el build compila sin errores
  - Preguntar al usuario si hay dudas

## Notes

- Las tareas marcadas con `*` son opcionales (tests de propiedades)
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud
- Los unit tests validan ejemplos específicos y casos edge
