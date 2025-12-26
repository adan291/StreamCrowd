# Arquitectura Hexagonal - TwitchVote Live

## Visión General

Este proyecto está siendo migrado a una arquitectura hexagonal para:
1. **Desacoplar** la lógica de negocio de las implementaciones concretas
2. **Facilitar** la adición de nuevos proveedores (OBS, YouTube, multistream)
3. **Mejorar** la testabilidad del código
4. **Reducir** el código duplicado

## Estructura de Carpetas

```
src/
├── domain/                    # 🎯 Lógica de negocio PURA
│   ├── entities/              # Modelos de datos y lógica
│   │   ├── Poll.ts           # Entidad de encuesta
│   │   └── Vote.ts           # Entidad de voto y moderación
│   └── ports/                 # Interfaces (contratos)
│       ├── IChatProvider.ts  # Interfaz para chat (Twitch/YouTube/OBS)
│       ├── IOverlaySync.ts   # Interfaz para sync de overlays
│       └── IStorage.ts       # Interfaz para persistencia
│
├── infrastructure/            # 🔧 Implementaciones concretas
│   ├── adapters/
│   │   ├── TwitchAdapter.ts      # Implementa IChatProvider
│   │   ├── FirebaseSyncAdapter.ts # Implementa IOverlaySync
│   │   └── LocalStorageAdapter.ts # Implementa IStorage
│   └── factories/
│       └── ProviderFactory.ts    # Crea el adapter correcto + DI Container
│
├── application/               # 📋 Orquestación
│   ├── services/              # Servicios de aplicación
│   │   ├── ChatService.ts    # Gestión de conexión al chat
│   │   ├── PollService.ts    # Gestión de encuestas
│   │   └── GameService.ts    # Clase base para juegos
│   ├── hooks/                 # Hooks de React
│   │   ├── useChatService.ts # Hook para ChatService
│   │   ├── usePollService.ts # Hook para PollService
│   │   └── useGameService.ts # Hook genérico para juegos
│   └── games/                 # Servicios de juegos (13 juegos)
│       ├── HotPotatoService.ts
│       ├── TriviaBattleService.ts
│       ├── CasinoRouletteService.ts
│       └── ... (10 más)
│
└── [archivos legacy]          # Código existente (funciona en paralelo)
    ├── services/              # twitchService, firebaseSync, etc.
    ├── hooks/                 # useTwitchConnection, usePoll, etc.
    └── components/            # Componentes de React
```

## Capas y Reglas

### Domain (Núcleo)
- **NO** importa nada de otras capas
- **NO** usa dependencias externas (React, Firebase, tmi.js)
- Contiene solo lógica de negocio pura y tipos
- Es 100% testeable sin mocks

### Infrastructure (Exterior)
- Implementa las interfaces de `domain/ports/`
- Puede usar dependencias externas
- **NO** importa de `presentation/`

### Application (Orquestación)
- Usa `domain/` para lógica de negocio
- Usa `infrastructure/` a través de interfaces
- Contiene hooks de React y servicios de aplicación

### Presentation (UI)
- Solo componentes de React
- Usa hooks de `application/`
- **NO** accede directamente a `infrastructure/`

## Cómo Añadir un Nuevo Proveedor

### Ejemplo: Añadir soporte para YouTube

1. **Crear el adapter** en `src/infrastructure/adapters/YouTubeAdapter.ts`:
```typescript
import type { IChatProvider } from '../../domain/ports/IChatProvider';

export class YouTubeAdapter implements IChatProvider {
  readonly providerId = 'youtube';
  readonly providerName = 'YouTube';
  
  // Implementar todos los métodos de IChatProvider
  async connect(options) { ... }
  async disconnect() { ... }
  // etc.
}
```

2. **Registrar en la factory** en `src/infrastructure/factories/ProviderFactory.ts`:
```typescript
case 'youtube':
  return new YouTubeAdapter(options);
```

3. **Usar en la aplicación**:
```typescript
import { container } from './infrastructure/factories/ProviderFactory';

// Cambiar a YouTube
container.configure({
  chat: { type: 'youtube', options: { apiKey: '...' } }
});

// El resto del código funciona igual
const provider = container.getChatProvider();
await provider.connect({ channel: 'UCxxx' });
```

## Migración Gradual

El código legacy sigue funcionando mientras migramos:

1. **Fase 1** (Actual): Crear estructura base y adapters
2. **Fase 2**: Migrar servicios a usar adapters
3. **Fase 3**: Migrar hooks a usar servicios de aplicación
4. **Fase 4**: Migrar componentes a presentation/
5. **Fase 5**: Eliminar código legacy

## Beneficios

- ✅ **Testabilidad**: Domain es 100% testeable sin mocks
- ✅ **Flexibilidad**: Cambiar Twitch por YouTube = cambiar 1 línea
- ✅ **Mantenibilidad**: Cada capa tiene responsabilidad clara
- ✅ **Escalabilidad**: Añadir OBS/multistream sin romper nada

## Próximos Pasos

1. [x] Crear `application/services/PollService.ts` ✅
2. [x] Crear `application/services/ChatService.ts` ✅
3. [x] Crear `application/services/GameService.ts` ✅
4. [x] Crear hooks de aplicación (`useChatService`, `usePollService`, `useGameService`) ✅
5. [x] Migrar 13 juegos a servicios (`src/application/games/`) ✅
6. [ ] Crear adapter para OBS WebSocket
7. [ ] Crear adapter para YouTube Live Chat
8. [ ] Migrar componentes para usar nuevos hooks (opcional, gradual)
