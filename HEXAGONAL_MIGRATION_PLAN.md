# Plan de Migración a Arquitectura Hexagonal

## 1. VISIÓN GENERAL

### 1.1 Objetivo

Refactorizar TwitchVote Live de una arquitectura monolítica a una arquitectura hexagonal (puertos y adaptadores) para:

1. **Agregar soporte para OBS y multistream** sin romper lo existente
2. **Mejorar testabilidad** separando lógica de negocio de UI
3. **Reducir duplicación** de código (~2000 líneas)
4. **Facilitar mantenimiento** con separación clara de responsabilidades
5. **Permitir escalabilidad** para nuevos proveedores (YouTube, Kick, etc.)

### 1.2 Beneficios Esperados

- ✓ Código 30% más pequeño (eliminación de duplicación)
- ✓ Tests 50% más rápidos (lógica sin dependencias)
- ✓ Nuevas funcionalidades 40% más rápido de implementar
- ✓ Bugs 60% más fácil de identificar y corregir
- ✓ Onboarding 50% más rápido para nuevos desarrolladores

## 2. ESTRUCTURA PROPUESTA

### 2.1 Árbol de Carpetas

```
src/
├── domain/                          # Lógica de negocio pura (sin dependencias)
│   ├── entities/                    # Modelos de datos
│   │   ├── Poll.ts
│   │   ├── Vote.ts
│   │   ├── StreamEvent.ts
│   │   ├── User.ts
│   │   ├── Game.ts
│   │   └── Collaboration.ts
│   ├── usecases/                    # Casos de uso (lógica de negocio)
│   │   ├── poll/
│   │   │   ├── CreatePollUseCase.ts
│   │   │   ├── ProcessVoteUseCase.ts
│   │   │   ├── StopPollUseCase.ts
│   │   │   └── ResetPollUseCase.ts
│   │   ├── moderation/
│   │   │   ├── ValidateVoteUseCase.ts
│   │   │   ├── CalculateWeightUseCase.ts
│   │   │   └── LogModerationUseCase.ts
│   │   ├── stream/
│   │   │   ├── CaptureStreamEventUseCase.ts
│   │   │   ├── PersistStreamEventUseCase.ts
│   │   │   └── AnalyzeStreamEventUseCase.ts
│   │   ├── chat/
│   │   │   ├── AnalyzeChatUseCase.ts
│   │   │   ├── DetectSentimentUseCase.ts
│   │   │   └── GenerateChatMetricsUseCase.ts
│   │   └── game/
│   │       ├── ProcessGameCommandUseCase.ts
│   │       ├── UpdateGameStateUseCase.ts
│   │       └── SelectGameWinnerUseCase.ts
│   └── repositories/                # Interfaces de persistencia
│       ├── PollRepository.ts
│       ├── VoteRepository.ts
│       ├── StreamEventRepository.ts
│       ├── ChatMessageRepository.ts
│       ├── GameStateRepository.ts
│       └── ModerationLogRepository.ts
├── application/                     # Orquestación de casos de uso
│   ├── services/                    # Servicios de aplicación
│   │   ├── PollApplicationService.ts
│   │   ├── ModerationApplicationService.ts
│   │   ├── StreamApplicationService.ts
│   │   ├── ChatApplicationService.ts
│   │   ├── GameApplicationService.ts
│   │   └── CollaborationApplicationService.ts
│   ├── dto/                         # Data Transfer Objects
│   │   ├── PollDTO.ts
│   │   ├── VoteDTO.ts
│   │   ├── StreamEventDTO.ts
│   │   └── ChatMetricsDTO.ts
│   └── mappers/                     # Mapeo entre entidades y DTOs
│       ├── PollMapper.ts
│       ├── VoteMapper.ts
│       └── StreamEventMapper.ts
├── infrastructure/                  # Implementaciones concretas
│   ├── adapters/                    # Adaptadores para proveedores externos
│   │   ├── chat/
│   │   │   ├── TwitchChatAdapter.ts
│   │   │   ├── OBSChatAdapter.ts
│   │   │   └── YouTubeChatAdapter.ts
│   │   ├── stream/
│   │   │   ├── TwitchStreamAdapter.ts
│   │   │   ├── OBSStreamAdapter.ts
│   │   │   └── YouTubeStreamAdapter.ts
│   │   └── auth/
│   │       ├── TwitchOAuthAdapter.ts
│   │       ├── OBSOAuthAdapter.ts
│   │       └── YouTubeOAuthAdapter.ts
│   ├── persistence/                 # Implementaciones de repositorios
│   │   ├── LocalStoragePersistence.ts
│   │   ├── FirebasePersistence.ts
│   │   ├── IndexedDBPersistence.ts
│   │   └── SupabasePersistence.ts
│   ├── external/                    # Librerías externas
│   │   ├── tmi/
│   │   ├── firebase/
│   │   └── broadcast-channel/
│   └── factories/                   # Factories para crear adaptadores
│       ├── ChatAdapterFactory.ts
│       ├── StreamAdapterFactory.ts
│       └── PersistenceFactory.ts
├── presentation/                    # UI (React)
│   ├── components/
│   │   ├── common/
│   │   ├── poll/
│   │   ├── games/
│   │   ├── overlays/
│   │   ├── moderation/
│   │   └── analytics/
│   ├── hooks/                       # Hooks que usan servicios de aplicación
│   │   ├── usePoll.ts
│   │   ├── useModeration.ts
│   │   ├── useStreamEvents.ts
│   │   ├── useChat.ts
│   │   ├── useGame.ts
│   │   └── useCollaboration.ts
│   ├── pages/
│   ├── context/                     # Context providers
│   │   ├── ThemeContext.tsx
│   │   ├── I18nContext.tsx
│   │   └── AppContext.tsx
│   ├── App.tsx
│   └── index.tsx
├── shared/                          # Código compartido
│   ├── constants/
│   ├── utils/
│   ├── types/
│   └── errors/
└── config/                          # Configuración
    ├── di.ts                        # Inyección de dependencias
    ├── adapters.ts                  # Configuración de adaptadores
    └── env.ts                       # Variables de entorno
```

### 2.2 Capas y Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION (React)                      │
│  - Componentes UI                                            │
│  - Hooks que usan servicios de aplicación                    │
│  - Manejo de eventos de usuario                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION (Orquestación)                 │
│  - Servicios de aplicación                                   │
│  - Orquestación de casos de uso                              │
│  - DTOs y mappers                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN (Lógica de Negocio)                │
│  - Entidades                                                 │
│  - Casos de uso (lógica pura)                                │
│  - Interfaces de repositorios                                │
│  - SIN dependencias externas                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE (Implementaciones)               │
│  - Adaptadores (Twitch, OBS, YouTube, etc.)                 │
│  - Persistencia (localStorage, Firebase, Supabase, etc.)     │
│  - Librerías externas                                        │
└─────────────────────────────────────────────────────────────┘
```

## 3. PLAN DE MIGRACIÓN FASE POR FASE

### 3.1 Fase 1: Preparación (Semana 1)

**Objetivo**: Crear estructura base sin cambiar funcionalidad

**Tareas**:
1. Crear carpetas `domain/`, `application/`, `infrastructure/`
2. Crear interfaces de repositorios en `domain/repositories/`
3. Crear DTOs en `application/dto/`
4. Crear mappers en `application/mappers/`
5. Crear servicios de aplicación vacíos en `application/services/`

**Cambios en código existente**: NINGUNO
**Riesgo**: BAJO
**Tiempo estimado**: 2-3 días

### 3.2 Fase 2: Extraer Lógica de Negocio (Semana 2-3)

**Objetivo**: Mover lógica pura a `domain/usecases/`

**Tareas**:
1. Crear `domain/entities/` con modelos de datos
2. Crear `domain/usecases/poll/` con casos de uso de encuestas
3. Crear `domain/usecases/moderation/` con casos de uso de moderación
4. Crear `domain/usecases/chat/` con casos de uso de análisis
5. Crear `domain/usecases/stream/` con casos de uso de eventos
6. Crear `domain/usecases/game/` con casos de uso de juegos

**Cambios en código existente**: 
- Refactorizar `voteModerationService.ts` → `domain/usecases/moderation/`
- Refactorizar `chatAnalysisService.ts` → `domain/usecases/chat/`
- Refactorizar lógica de votos en `App.tsx` → `domain/usecases/poll/`

**Riesgo**: MEDIO (cambios en lógica crítica)
**Tiempo estimado**: 5-7 días

### 3.3 Fase 3: Crear Adaptadores (Semana 4-5)

**Objetivo**: Abstraer proveedores externos con adaptadores

**Tareas**:
1. Crear `infrastructure/adapters/chat/TwitchChatAdapter.ts`
2. Crear `infrastructure/adapters/stream/TwitchStreamAdapter.ts`
3. Crear `infrastructure/adapters/auth/TwitchOAuthAdapter.ts`
4. Crear `infrastructure/persistence/LocalStoragePersistence.ts`
5. Crear `infrastructure/persistence/FirebasePersistence.ts`
6. Crear factories para crear adaptadores

**Cambios en código existente**:
- Refactorizar `twitchService.ts` → adaptadores
- Refactorizar persistencia → `infrastructure/persistence/`

**Riesgo**: MEDIO-ALTO (cambios en servicios críticos)
**Tiempo estimado**: 7-10 días

### 3.4 Fase 4: Crear Servicios de Aplicación (Semana 6)

**Objetivo**: Orquestar casos de uso y adaptadores

**Tareas**:
1. Crear `application/services/PollApplicationService.ts`
2. Crear `application/services/ModerationApplicationService.ts`
3. Crear `application/services/StreamApplicationService.ts`
4. Crear `application/services/ChatApplicationService.ts`
5. Crear `application/services/GameApplicationService.ts`
6. Crear `application/services/CollaborationApplicationService.ts`

**Cambios en código existente**: NINGUNO (servicios nuevos)

**Riesgo**: BAJO
**Tiempo estimado**: 3-5 días

### 3.5 Fase 5: Refactorizar Hooks (Semana 7-8)

**Objetivo**: Hacer que hooks usen servicios de aplicación

**Tareas**:
1. Refactorizar `hooks/usePoll.ts` para usar `PollApplicationService`
2. Refactorizar `hooks/useModeration.ts` para usar `ModerationApplicationService`
3. Refactorizar `hooks/useStreamEvents.ts` para usar `StreamApplicationService`
4. Refactorizar `hooks/useChat.ts` para usar `ChatApplicationService`
5. Crear `hooks/useGame.ts` para usar `GameApplicationService`
6. Crear `hooks/useCollaboration.ts` para usar `CollaborationApplicationService`

**Cambios en código existente**: Refactorizar hooks (cambios internos, API igual)

**Riesgo**: BAJO (API de hooks no cambia)
**Tiempo estimado**: 5-7 días

### 3.6 Fase 6: Eliminar Código Duplicado (Semana 9-10)

**Objetivo**: Crear hooks reutilizables para eliminar duplicación

**Tareas**:
1. Crear `hooks/useGameBase.ts` para juegos
2. Crear `hooks/useOverlaySync.ts` para overlays
3. Crear `hooks/useCollaborationUI.ts` para colaboradores
4. Crear `hooks/useChatCommand.ts` para comandos de chat
5. Refactorizar 13 juegos para usar `useGameBase`
6. Refactorizar 13 overlays para usar `useOverlaySync`
7. Refactorizar 3 componentes para usar `useCollaborationUI`

**Cambios en código existente**: Refactorizar componentes de juegos y overlays

**Riesgo**: MEDIO (cambios en 26+ archivos)
**Tiempo estimado**: 7-10 días

### 3.7 Fase 7: Agregar Soporte OBS (Semana 11-12)

**Objetivo**: Agregar adaptador para OBS sin romper Twitch

**Tareas**:
1. Crear `infrastructure/adapters/chat/OBSChatAdapter.ts`
2. Crear `infrastructure/adapters/stream/OBSStreamAdapter.ts`
3. Crear `infrastructure/adapters/auth/OBSOAuthAdapter.ts`
4. Crear factory para seleccionar adaptador (Twitch vs OBS)
5. Agregar configuración para elegir proveedor
6. Testear con OBS

**Cambios en código existente**: NINGUNO (nuevos adaptadores)

**Riesgo**: BAJO
**Tiempo estimado**: 5-7 días

### 3.8 Fase 8: Agregar Soporte Multistream (Semana 13-14)

**Objetivo**: Permitir múltiples proveedores simultáneamente

**Tareas**:
1. Refactorizar servicios de aplicación para soportar múltiples adaptadores
2. Crear `infrastructure/adapters/chat/YouTubeChatAdapter.ts`
3. Crear `infrastructure/adapters/stream/YouTubeStreamAdapter.ts`
4. Crear lógica de sincronización entre proveedores
5. Testear con Twitch + OBS + YouTube

**Cambios en código existente**: Refactorizar servicios de aplicación

**Riesgo**: ALTO (cambios complejos)
**Tiempo estimado**: 7-10 días

### 3.9 Fase 9: Testing y Optimización (Semana 15-16)

**Objetivo**: Testear todo y optimizar

**Tareas**:
1. Escribir tests unitarios para `domain/usecases/`
2. Escribir tests de integración para servicios de aplicación
3. Escribir tests E2E para flujos completos
4. Optimizar performance
5. Documentar arquitectura

**Cambios en código existente**: Refactorizar si es necesario

**Riesgo**: BAJO
**Tiempo estimado**: 5-7 días

## 4. INYECCIÓN DE DEPENDENCIAS

### 4.1 Configuración Centralizada

```typescript
// config/di.ts
import { Container } from 'inversify';

export const container = new Container();

// Registrar adaptadores
container.bind<ChatAdapter>('ChatAdapter').to(TwitchChatAdapter);
container.bind<StreamAdapter>('StreamAdapter').to(TwitchStreamAdapter);
container.bind<PersistenceAdapter>('PersistenceAdapter').to(LocalStoragePersistence);

// Registrar repositorios
container.bind<PollRepository>(PollRepository).to(PollRepositoryImpl);
container.bind<VoteRepository>(VoteRepository).to(VoteRepositoryImpl);

// Registrar servicios de aplicación
container.bind<PollApplicationService>(PollApplicationService).toSelf();
container.bind<ModerationApplicationService>(ModerationApplicationService).toSelf();

// Registrar casos de uso
container.bind<CreatePollUseCase>(CreatePollUseCase).toSelf();
container.bind<ProcessVoteUseCase>(ProcessVoteUseCase).toSelf();
```

### 4.2 Uso en Hooks

```typescript
// hooks/usePoll.ts
import { container } from '../config/di';

export function usePoll() {
  const pollService = container.get<PollApplicationService>(PollApplicationService);
  
  const [currentPoll, setCurrentPoll] = useState(null);
  
  const createPoll = useCallback(async (config) => {
    const poll = await pollService.createPoll(config);
    setCurrentPoll(poll);
    return poll;
  }, [pollService]);
  
  return { currentPoll, createPoll };
}
```

## 5. CAMBIOS EN COMPONENTES

### 5.1 Antes (Monolítico)

```typescript
// App.tsx
const App = () => {
  const { currentPoll, createPoll, addVote } = usePoll();
  const { config, processVote } = useModeration();
  
  useEffect(() => {
    twitchService.onMessage((tags, message) => {
      // Lógica de procesamiento de votos
      const result = processVote(...);
      if (result.isValid) {
        addVote(...);
      }
    });
  }, []);
  
  return <PollCreator onCreate={createPoll} />;
};
```

### 5.2 Después (Hexagonal)

```typescript
// presentation/App.tsx
const App = () => {
  const { currentPoll, createPoll } = usePoll();
  const { processChatMessage } = useChat();
  
  useEffect(() => {
    processChatMessage.subscribe((message) => {
      // Lógica centralizada en servicio de aplicación
    });
  }, [processChatMessage]);
  
  return <PollCreator onCreate={createPoll} />;
};
```

## 6. BENEFICIOS POR FASE

| Fase | Beneficio |
|------|-----------|
| 1 | Estructura clara |
| 2 | Lógica testeable |
| 3 | Adaptadores desacoplados |
| 4 | Orquestación centralizada |
| 5 | Hooks simplificados |
| 6 | 30% menos código |
| 7 | Soporte OBS |
| 8 | Multistream |
| 9 | Confianza en cambios |

## 7. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Regresiones en votos | MEDIA | ALTO | Tests exhaustivos en Fase 2 |
| Regresiones en eventos | MEDIA | ALTO | Tests exhaustivos en Fase 3 |
| Performance degradada | BAJA | MEDIO | Profiling en Fase 9 |
| Complejidad excesiva | MEDIA | MEDIO | Documentación clara |
| Retrasos en cronograma | MEDIA | MEDIO | Buffers en cada fase |

## 8. MÉTRICAS DE ÉXITO

- ✓ Código duplicado reducido de 2000 a <500 líneas
- ✓ Cobertura de tests >80% en `domain/`
- ✓ Tiempo de implementación de nuevas funcionalidades -40%
- ✓ Bugs reportados -50%
- ✓ Soporte para OBS y multistream sin romper Twitch
- ✓ Documentación clara de arquitectura

