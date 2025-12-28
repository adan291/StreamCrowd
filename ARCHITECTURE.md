# Arquitectura Hexagonal - TwitchVote Live

## Estado: ✅ MIGRACIÓN COMPLETADA

La migración a arquitectura hexagonal ha sido completada exitosamente. Este documento describe la estructura final del proyecto.

## Visión General

TwitchVote Live utiliza una arquitectura hexagonal (puertos y adaptadores) que proporciona:

1. **Desacoplamiento** - Lógica de negocio separada de implementaciones concretas
2. **Testabilidad** - Domain layer 100% testeable sin mocks
3. **Extensibilidad** - Fácil adición de nuevos proveedores (OBS, YouTube, etc.)
4. **Mantenibilidad** - Responsabilidades claras por capa

## Estructura de Carpetas

```
src/
├── domain/                           # 🎯 Lógica de negocio PURA
│   ├── entities/                     # Modelos de datos
│   │   ├── Poll.ts                   # Entidad de encuesta
│   │   ├── Vote.ts                   # Entidad de voto
│   │   ├── StreamEvent.ts            # Eventos de stream (subs, raids, etc.)
│   │   ├── ModerationConfig.ts       # Configuración de moderación
│   │   └── ChatMetrics.ts            # Métricas de análisis de chat
│   └── ports/                        # Interfaces (contratos)
│       ├── IChatProvider.ts          # Interfaz para chat (Twitch/YouTube)
│       ├── IOBSController.ts         # Interfaz para control de OBS
│       ├── IOverlaySync.ts           # Interfaz para sync de overlays
│       ├── IStorage.ts               # Interfaz para persistencia
│       ├── IStreamEventProvider.ts   # Interfaz para eventos de stream
│       └── IAnalyticsProvider.ts     # Interfaz para análisis con AI
│
├── application/                      # 📋 Orquestación y casos de uso
│   ├── services/                     # Servicios de aplicación
│   │   ├── PollService.ts            # Gestión de encuestas
│   │   ├── ChatService.ts            # Gestión de conexión al chat
│   │   ├── GameService.ts            # Clase base para juegos
│   │   ├── ModerationService.ts      # Validación y moderación de votos
│   │   ├── StreamEventService.ts     # Gestión de eventos de stream
│   │   ├── AnalyticsService.ts       # Análisis de chat y métricas
│   │   ├── TwitchService.ts          # Orquestación de conexión Twitch
│   │   └── OBSService.ts             # Control de OBS WebSocket
│   ├── hooks/                        # Hooks de React
│   │   ├── usePollService.ts         # Hook para PollService
│   │   ├── useChatService.ts         # Hook para ChatService
│   │   ├── useGameService.ts         # Hook genérico para juegos
│   │   ├── useModerationService.ts   # Hook para ModerationService
│   │   ├── useStreamEventService.ts  # Hook para StreamEventService
│   │   ├── useAnalyticsService.ts    # Hook para AnalyticsService
│   │   ├── useTwitchService.ts       # Hook para TwitchService
│   │   ├── useOBS.ts                 # Hook para OBSService
│   │   └── useOBSTriggers.ts         # Hook para triggers de OBS
│   └── games/                        # Servicios de juegos (14 juegos)
│       ├── HotPotatoService.ts
│       ├── TriviaBattleService.ts
│       ├── CasinoRouletteService.ts
│       ├── DuckHuntService.ts
│       ├── PiumService.ts
│       ├── AhorcadoService.ts
│       ├── BattleshipService.ts
│       ├── CarreraService.ts
│       ├── ChatFishingService.ts
│       ├── MemoriaService.ts
│       ├── PartyCoService.ts
│       ├── PPTService.ts
│       └── VeoVeoService.ts
│
├── infrastructure/                   # 🔧 Implementaciones concretas
│   ├── adapters/
│   │   ├── TwitchAdapter.ts          # Implementa IChatProvider + IStreamEventProvider
│   │   ├── OBSWebSocketAdapter.ts    # Implementa IOBSController
│   │   ├── FirebaseSyncAdapter.ts    # Implementa IOverlaySync
│   │   └── LocalStorageAdapter.ts    # Implementa IStorage
│   └── factories/
│       └── ProviderFactory.ts        # Factory + DI Container
│
└── index.ts                          # Exports principales
```

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Components  │ │   Hooks     │ │  Overlays   │               │
│  │ (React)     │ │ (React)     │ │  (React)    │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
└─────────┼───────────────┼───────────────┼───────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ PollService │ │ Moderation  │ │  Analytics  │               │
│  │             │ │  Service    │ │   Service   │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Twitch    │ │ StreamEvent │ │    OBS      │               │
│  │   Service   │ │   Service   │ │   Service   │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
└─────────┼───────────────┼───────────────┼───────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Entities  │ │    Ports    │ │   Types     │               │
│  │ Poll, Vote  │ │ IChatProv.  │ │ Moderation  │               │
│  │ StreamEvent │ │ IOBSCtrl    │ │ ChatMetrics │               │
│  │ ChatMetrics │ │ IStorage    │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Twitch    │ │    OBS      │ │  Firebase   │               │
│  │   Adapter   │ │   Adapter   │ │   Adapter   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │ LocalStorage│ │  Provider   │                               │
│  │   Adapter   │ │   Factory   │                               │
│  └─────────────┘ └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Capas y Reglas

### Domain (Núcleo)
- **NO** importa nada de otras capas
- **NO** usa dependencias externas (React, Firebase, tmi.js)
- Contiene solo lógica de negocio pura y tipos
- Es 100% testeable sin mocks

### Application (Orquestación)
- Usa `domain/` para lógica de negocio
- Usa `infrastructure/` a través de interfaces (ports)
- Contiene hooks de React y servicios de aplicación
- Orquesta casos de uso

### Infrastructure (Exterior)
- Implementa las interfaces de `domain/ports/`
- Puede usar dependencias externas (tmi.js, Firebase, obs-websocket-js)
- **NO** importa de `presentation/`

### Presentation (UI)
- Solo componentes de React (en `components/`)
- Usa hooks de `application/hooks/`
- **NO** accede directamente a `infrastructure/`

## Servicios Implementados

### ModerationService
Gestiona la validación y moderación de votos:
- Validación de edad de cuenta, cooldowns, whitelist/blacklist
- Cálculo de pesos por subscriber/follower status
- Estadísticas de moderación
- Gestión de presets

### StreamEventService
Gestiona eventos de stream:
- Suscripciones, raids, cheers, bans
- Agregaciones y estadísticas por sesión
- Sistema de listeners para notificaciones

### AnalyticsService
Análisis de chat y métricas:
- Detección de sentimiento y mood
- Generación de word clouds
- Integración con AI (Gemini, OpenAI, Anthropic)
- Historial de sesiones

### TwitchService
Orquestación de conexión a Twitch:
- Conexión/desconexión con reconexión automática
- Canales de colaboración
- Gestión de OAuth tokens

### OBSService
Control de OBS via WebSocket:
- Cambio de escenas
- Control de fuentes
- Triggers automáticos

## Cómo Añadir un Nuevo Proveedor

### Ejemplo: Añadir soporte para YouTube

1. **Crear el adapter** en `src/infrastructure/adapters/YouTubeAdapter.ts`:
```typescript
import type { IChatProvider } from '../../domain/ports/IChatProvider';

export class YouTubeAdapter implements IChatProvider {
  readonly providerId = 'youtube';
  readonly providerName = 'YouTube';
  
  async connect(options) { /* ... */ }
  async disconnect() { /* ... */ }
  // Implementar todos los métodos de IChatProvider
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

container.configure({
  chat: { type: 'youtube', options: { apiKey: '...' } }
});

const provider = container.getChatProvider();
await provider.connect({ channel: 'UCxxx' });
```

## Tests

El proyecto incluye:
- **Tests unitarios**: Para servicios y entidades
- **Tests de propiedades**: Para validar invariantes (fast-check)
- **Tests E2E**: Para flujos completos (Playwright)

Ejecutar tests:
```bash
npm run test        # Tests unitarios y de propiedades
npm run test:e2e    # Tests E2E
npm run test:all    # Todos los tests
```

## Beneficios Logrados

- ✅ **Testabilidad**: Domain es 100% testeable sin mocks
- ✅ **Flexibilidad**: Cambiar Twitch por YouTube = cambiar 1 línea
- ✅ **Mantenibilidad**: Cada capa tiene responsabilidad clara
- ✅ **Escalabilidad**: Añadir OBS/multistream sin romper nada
- ✅ **Código limpio**: Servicios legacy consolidados en arquitectura hexagonal
