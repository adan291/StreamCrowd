# Diseño: Migración a Arquitectura Hexagonal

## Objetivo
Refactorizar el proyecto para usar arquitectura hexagonal, permitiendo:
- Añadir OBS WebSocket sin romper Twitch
- Añadir YouTube Live sin romper lo existente
- Añadir multistream combinando proveedores
- Mejorar testabilidad y mantenibilidad

## Estructura Creada

```
src/
├── domain/                    ✅ CREADO
│   ├── entities/
│   │   ├── Poll.ts           ✅ Lógica de encuestas
│   │   └── Vote.ts           ✅ Lógica de votos y moderación
│   └── ports/
│       ├── IChatProvider.ts  ✅ Interfaz para chat
│       ├── IOverlaySync.ts   ✅ Interfaz para sync
│       └── IStorage.ts       ✅ Interfaz para storage
│
├── infrastructure/            ✅ CREADO
│   ├── adapters/
│   │   ├── TwitchAdapter.ts      ✅ Implementa IChatProvider
│   │   ├── FirebaseSyncAdapter.ts ✅ Implementa IOverlaySync
│   │   └── LocalStorageAdapter.ts ✅ Implementa IStorage
│   └── factories/
│       └── ProviderFactory.ts    ✅ Factory + DI Container
│
├── application/               ✅ CREADO
│   └── services/
│       └── ChatService.ts    ✅ Servicio de chat
```

## Interfaces Definidas

### IChatProvider
```typescript
interface IChatProvider {
  providerId: string;
  providerName: string;
  connect(options): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(message): Promise<boolean>;
  onMessage(callback): () => void;
  onStatusChange(callback): () => void;
  onStreamEvent(callback): () => void;
  getChannelInfo(channel?): Promise<ChannelInfo | null>;
  getViewerCount(channel?): Promise<number | null>;
  dispose(): void;
}
```

### IOverlaySync
```typescript
interface IOverlaySync {
  syncId: string;
  publish<T>(type, data): Promise<void>;
  subscribe<T>(type, callback): () => void;
  clear(type): Promise<void>;
  clearAll(): Promise<void>;
  isConnected(): boolean;
  dispose(): void;
}
```

### IStorage
```typescript
interface IStorage {
  storageId: string;
  set<T>(key, value, options?): Promise<void>;
  get<T>(key): Promise<T | null>;
  remove(key): Promise<void>;
  has(key): Promise<boolean>;
  keys(prefix?): Promise<string[]>;
  clear(namespace?): Promise<void>;
}
```

## Beneficios de la Nueva Arquitectura

1. **Desacoplamiento**: La lógica de negocio no depende de Twitch/Firebase
2. **Testabilidad**: Domain es 100% testeable sin mocks
3. **Extensibilidad**: Añadir OBS = crear 1 adapter
4. **Mantenibilidad**: Cada capa tiene responsabilidad clara

## Próximos Pasos

### Fase 2: Migrar Servicios Existentes
- [ ] Migrar `twitchService.ts` a usar `TwitchAdapter`
- [ ] Migrar `firebaseSync.ts` a usar `FirebaseSyncAdapter`
- [ ] Crear `PollService` en application/services/

### Fase 3: Migrar Hooks
- [ ] Migrar `useTwitchConnection` a usar `ChatService`
- [ ] Migrar `usePoll` a usar `PollService`
- [ ] Migrar `useStreamEvents` a usar `ChatService`

### Fase 4: Añadir Nuevos Proveedores
- [ ] Crear `OBSWebSocketAdapter` (implements IOverlaySync)
- [ ] Crear `YouTubeAdapter` (implements IChatProvider)
- [ ] Crear `BroadcastChannelAdapter` (implements IOverlaySync)

### Fase 5: Multistream
- [ ] Crear `MultiProviderAdapter` que combina varios IChatProvider
- [ ] UI para seleccionar/combinar proveedores
