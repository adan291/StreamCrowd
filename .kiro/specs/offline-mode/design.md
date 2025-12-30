# Design Document: Modo Offline

## Overview

Este documento describe el diseño técnico para implementar el modo offline completo de TwitchVote, incluyendo almacenamiento con IndexedDB, detección de estado de red, indicador visual y cola de sincronización.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│  useOfflineStatus    useIndexedDB    useSyncQueue           │
│       hook              hook            hook                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  NetworkService    IndexedDBService    SyncQueueService     │
│                    MigrationService                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│           IndexedDB              localStorage (fallback)     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### NetworkService

```typescript
interface NetworkStatus {
  isOnline: boolean;
  lastOnline: number | null;
  lastOffline: number | null;
}

interface INetworkService {
  getStatus(): NetworkStatus;
  subscribe(callback: (status: NetworkStatus) => void): () => void;
  checkConnection(): Promise<boolean>;
}
```

### IndexedDBService

```typescript
interface DBSchema {
  polls: Poll[];
  predictions: Prediction[];
  giveaways: Giveaway[];
  commands: Command[];
  timers: Timer[];
  settings: Record<string, unknown>;
  syncQueue: SyncOperation[];
}

interface IIndexedDBService {
  init(): Promise<void>;
  get<T>(store: keyof DBSchema, key: string): Promise<T | null>;
  getAll<T>(store: keyof DBSchema): Promise<T[]>;
  put<T>(store: keyof DBSchema, key: string, value: T): Promise<void>;
  delete(store: keyof DBSchema, key: string): Promise<void>;
  clear(store: keyof DBSchema): Promise<void>;
}
```

### SyncQueueService

```typescript
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface ISyncQueueService {
  enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): Promise<void>;
  process(): Promise<void>;
  getPending(): Promise<SyncOperation[]>;
  getCount(): number;
  clear(): Promise<void>;
}
```

## Data Models

### IndexedDB Schema

```typescript
// Database name and version
const DB_NAME = 'twitchvote_db';
const DB_VERSION = 1;

// Object stores
const STORES = {
  polls: { keyPath: 'id', indexes: ['createdAt', 'status'] },
  predictions: { keyPath: 'id', indexes: ['createdAt', 'status'] },
  giveaways: { keyPath: 'id', indexes: ['createdAt', 'status'] },
  commands: { keyPath: 'id', indexes: ['name', 'enabled'] },
  timers: { keyPath: 'id', indexes: ['name', 'enabled'] },
  settings: { keyPath: 'key' },
  syncQueue: { keyPath: 'id', indexes: ['timestamp', 'type'] },
  migrations: { keyPath: 'id' }
};
```

### SyncOperation

```typescript
interface SyncOperation {
  id: string;              // UUID único
  type: 'create' | 'update' | 'delete';
  store: string;           // Nombre del store afectado
  key: string;             // Key del item
  data: unknown;           // Datos a sincronizar
  timestamp: number;       // Cuando se creó la operación
  retries: number;         // Intentos realizados
  maxRetries: number;      // Máximo de reintentos (default: 3)
  lastError?: string;      // Último error si falló
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: IndexedDB Round-Trip Consistency

*For any* valid data object, storing it in IndexedDB and then retrieving it SHALL produce an equivalent object.

**Validates: Requirements 1.5**

### Property 2: Sync Queue FIFO Order

*For any* sequence of enqueued operations, processing SHALL execute them in the exact order they were added.

**Validates: Requirements 4.6**

### Property 3: Network Status Consistency

*For any* network state change, all subscribers SHALL receive the same status update.

**Validates: Requirements 2.4**

### Property 4: Pending Operations Count

*For any* state of the sync queue, the pending count SHALL equal the number of unprocessed operations.

**Validates: Requirements 3.3**

## Error Handling

### IndexedDB Errors

- **QuotaExceededError**: Limpiar datos antiguos y reintentar
- **VersionError**: Forzar actualización de schema
- **NotFoundError**: Crear store si no existe
- **Fallback**: Usar localStorage si IndexedDB no está disponible

### Sync Errors

- **NetworkError**: Reencolar con backoff exponencial
- **ConflictError**: Resolver con estrategia "last-write-wins"
- **MaxRetriesExceeded**: Mover a cola de errores y notificar usuario

### Backoff Strategy

```typescript
const calculateBackoff = (retries: number): number => {
  const baseDelay = 1000; // 1 segundo
  const maxDelay = 30000; // 30 segundos
  const delay = Math.min(baseDelay * Math.pow(2, retries), maxDelay);
  return delay + Math.random() * 1000; // Jitter
};
```

## Testing Strategy

### Unit Tests

- Verificar operaciones CRUD de IndexedDB
- Verificar detección de cambios de red
- Verificar encolado y procesamiento de operaciones

### Property-Based Tests

- **Property 1**: Round-trip de datos en IndexedDB
- **Property 2**: Orden FIFO de la cola de sincronización
- **Property 3**: Consistencia de notificaciones de red
- **Property 4**: Conteo de operaciones pendientes

### Integration Tests

- Flujo completo offline → online → sincronización
- Migración de localStorage a IndexedDB
- Fallback cuando IndexedDB no está disponible
