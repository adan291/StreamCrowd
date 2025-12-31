# Requirements Document: Modo Offline

## Introduction

Este documento define los requisitos para implementar el modo offline completo de TwitchVote, permitiendo que la aplicación funcione sin conexión a internet y sincronice datos cuando la conexión se restablezca.

## Glossary

- **IndexedDB**: Base de datos NoSQL del navegador para almacenamiento persistente de grandes cantidades de datos
- **Sync_Queue**: Cola de operaciones pendientes que se ejecutarán cuando vuelva la conexión
- **Network_Status**: Estado actual de la conexión a internet (online/offline)
- **Offline_Indicator**: Componente visual que muestra el estado de conexión

## Requirements

### Requirement 1: Almacenamiento con IndexedDB

**User Story:** Como usuario, quiero que mis datos se almacenen de forma persistente, para que no pierda información aunque cierre el navegador.

#### Acceptance Criteria

1. WHEN la aplicación inicia, THE IndexedDB_Service SHALL crear las tablas necesarias (polls, predictions, giveaways, commands, timers, settings)
2. WHEN se guarda un dato, THE IndexedDB_Service SHALL almacenarlo en la tabla correspondiente con timestamp
3. WHEN se lee un dato, THE IndexedDB_Service SHALL recuperarlo de IndexedDB si existe
4. IF IndexedDB no está disponible, THEN THE IndexedDB_Service SHALL usar localStorage como fallback
5. FOR ALL datos almacenados, serializing then deserializing SHALL produce un objeto equivalente (round-trip)

---

### Requirement 2: Detección de Estado de Red

**User Story:** Como usuario, quiero saber si estoy offline, para entender por qué algunas funciones no están disponibles.

#### Acceptance Criteria

1. WHEN la conexión a internet se pierde, THE Network_Service SHALL detectarlo en menos de 5 segundos
2. WHEN la conexión se restablece, THE Network_Service SHALL detectarlo y notificar a los suscriptores
3. THE Network_Service SHALL exponer el estado actual de conexión (online/offline)
4. WHEN el estado de red cambia, THE Network_Service SHALL emitir un evento a todos los listeners

---

### Requirement 3: Indicador Visual de Estado Offline

**User Story:** Como usuario, quiero ver claramente cuando estoy offline, para saber que algunas funciones están limitadas.

#### Acceptance Criteria

1. WHEN el usuario está offline, THE Offline_Indicator SHALL mostrar un banner visible en la parte superior
2. WHEN el usuario vuelve online, THE Offline_Indicator SHALL mostrar brevemente un mensaje de reconexión
3. THE Offline_Indicator SHALL mostrar el número de operaciones pendientes de sincronizar
4. WHEN hay operaciones pendientes, THE Offline_Indicator SHALL mostrar un icono de sincronización

---

### Requirement 4: Cola de Sincronización

**User Story:** Como usuario, quiero que mis acciones se guarden aunque esté offline, para que se sincronicen cuando vuelva la conexión.

#### Acceptance Criteria

1. WHEN se realiza una operación que requiere red estando offline, THE Sync_Queue SHALL encolarla
2. WHEN la conexión se restablece, THE Sync_Queue SHALL procesar las operaciones pendientes en orden FIFO
3. IF una operación falla durante la sincronización, THEN THE Sync_Queue SHALL reintentar con backoff exponencial
4. THE Sync_Queue SHALL persistir las operaciones pendientes en IndexedDB
5. WHEN una operación se sincroniza exitosamente, THE Sync_Queue SHALL eliminarla de la cola
6. FOR ALL operaciones encoladas, THE Sync_Queue SHALL mantener el orden de inserción (FIFO)

---

### Requirement 5: Funcionalidad Offline

**User Story:** Como usuario, quiero poder usar las funciones básicas sin internet, para no depender de la conexión.

#### Acceptance Criteria

1. WHILE offline, THE Application SHALL permitir crear y gestionar encuestas localmente
2. WHILE offline, THE Application SHALL permitir ver el historial de encuestas anteriores
3. WHILE offline, THE Application SHALL permitir configurar comandos y timers
4. WHILE offline, THE Application SHALL mostrar un indicador en funciones que requieren conexión
5. WHEN se intenta usar una función que requiere conexión estando offline, THE Application SHALL mostrar un mensaje explicativo

---

### Requirement 6: Migración de Datos

**User Story:** Como usuario existente, quiero que mis datos de localStorage se migren a IndexedDB, para no perder mi configuración.

#### Acceptance Criteria

1. WHEN la aplicación detecta datos en localStorage, THE Migration_Service SHALL migrarlos a IndexedDB
2. WHEN la migración completa exitosamente, THE Migration_Service SHALL marcar los datos como migrados
3. IF la migración falla, THEN THE Migration_Service SHALL mantener los datos en localStorage
4. THE Migration_Service SHALL ejecutarse solo una vez por instalación
