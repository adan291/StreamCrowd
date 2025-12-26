# TwitchVote Live - Análisis Arquitectónico Completo

## 1. ESTRUCTURA ACTUAL DEL PROYECTO

### 1.1 Organización de Carpetas

```
├── components/              # 40+ componentes React
│   ├── games/              # 13+ juegos interactivos (duplicación de patrones)
│   ├── mascot/             # Mascota AI (3 archivos)
│   └── [componentes principales]
├── hooks/                  # 11 custom hooks (lógica reutilizable)
├── services/               # 6 servicios (lógica de negocio)
├── context/                # 2 contextos (tema, i18n)
├── i18n/                   # Traducciones ES/EN
├── constants/              # Constantes y storage keys
├── electron/               # Código Electron para desktop
├── tests/                  # Tests unitarios y E2E
└── public/                 # Assets estáticos
```

### 1.2 Servicios Principales (Capa de Lógica de Negocio)

| Servicio | Responsabilidad | Líneas | Patrón |
|----------|-----------------|--------|--------|
| **twitchService.ts** | Conexión TMI.js, eventos stream, colaboraciones | 1653 | Singleton con callbacks |
| **voteModerationService.ts** | Validación votos, pesos, logs, presets | 800+ | Funciones puras + storage |
| **chatAnalysisService.ts** | Análisis sentimiento, métricas chat, IA | 600+ | Funciones puras |
| **aiAnalyticsService.ts** | Sesiones, análisis IA, dificultad usuario | 400+ | Singleton con estado |
| **firebaseSync.ts** | Sincronización Firebase para overlays | 200+ | Singleton |
| **twitchOAuth.ts** | Autenticación OAuth Twitch | 150+ | Funciones puras |

### 1.3 Hooks Personalizados (Lógica Reutilizable)

| Hook | Responsabilidad | Patrón |
|------|-----------------|--------|
| **usePoll** | Gestión estado encuestas, votos, historial | useState + useCallback |
| **useTwitchConnection** | Conexión Twitch, avatar, token, colaboraciones | useState + useEffect |
| **useModeration** | Validación votos, estadísticas, logs | useState + useCallback |
| **useStreamEvents** | Captura eventos stream, persistencia localStorage | useState + useEffect |
| **useAIAnalytics** | Sesiones, análisis IA, mascota | useState + useCallback |
| **useDemoTour** | Tour interactivo de demostración | useState + useEffect |
| **useOverlay** | Modo overlay, configuración | useState + localStorage |
| **useViewerCount** | Contador de viewers en tiempo real | useState + useEffect |
| **useLocalStorage** | Persistencia localStorage genérica | useState + useEffect |
| **useModeration** | Validación y logs de moderación | useState + useCallback |
| **useKeyboardShortcuts** | Atajos de teclado | useState + useEffect |

### 1.4 Contextos Globales

- **ThemeContext**: Tema claro/oscuro (localStorage)
- **I18nContext**: Traducciones ES/EN (localStorage)



## 2. FLUJO DE DATOS Y COMUNICACIÓN

### 2.1 Arquitectura Actual (Monolítica)

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx (1551 líneas)                │
│  - Orquestación central de TODO                             │
│  - Estado local: 20+ useState                               │
│  - Lógica de negocio mezclada con UI                        │
└─────────────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │         Hooks Personalizados               │
    │  usePoll, useTwitchConnection, etc.        │
    └────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │         Servicios (Singletons)             │
    │  twitchService, voteModerationService      │
    └────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │    Librerías Externas (TMI.js, Firebase)   │
    └────────────────────────────────────────────┘
```

### 2.2 Flujo de Votos (Ejemplo)

```
Chat Message (TMI.js)
    ↓
App.tsx: twitchService.onMessage()
    ↓
Parse vote: +1, #opcion, etc.
    ↓
useModeration.processVote()
    ↓
voteModerationService.validateVote()
    ↓
usePoll.addVote() o updateVote()
    ↓
Poll state updated → Re-render componentes
    ↓
Sync localStorage → Firebase → Overlay
```

### 2.3 Flujo de Eventos Stream

```
Twitch Event (Sub, Raid, etc.)
    ↓
twitchService.onStreamEvent()
    ↓
useStreamEvents.addEvent()
    ↓
StreamEvent stored in memory + localStorage
    ↓
StreamActivity component re-renders
```

## 3. PROBLEMAS ARQUITECTÓNICOS IDENTIFICADOS

### 3.1 Acoplamiento Fuerte

**Problema**: App.tsx está acoplado a:
- Servicios Twitch (twitchService)
- Hooks (usePoll, useModeration, etc.)
- Componentes (40+ importaciones)
- localStorage directamente
- Firebase

**Impacto**: Difícil de testear, cambios en servicios requieren cambios en App.tsx

### 3.2 Lógica de Negocio Dispersa

| Lógica | Ubicación | Problema |
|--------|-----------|----------|
| Validación votos | voteModerationService + useModeration + App.tsx | Duplicada |
| Análisis chat | chatAnalysisService + StreamAnalytics | Acoplada a UI |
| Persistencia | Múltiples lugares (localStorage, Firebase) | Inconsistente |
| Eventos stream | twitchService + useStreamEvents + App.tsx | Dispersa |

### 3.3 Falta de Abstracción para Multistream

**Problema**: 
- twitchService está hardcodeado para TMI.js
- No hay interfaz para otros proveedores (OBS, YouTube, etc.)
- Colaboraciones son un parche, no una solución arquitectónica

**Impacto**: Imposible agregar OBS o YouTube sin refactorizar todo

### 3.4 Código Duplicado

#### En Componentes de Juegos (13 archivos)

```typescript
// Patrón repetido en: PiumGame, DuckHunt, BattleshipGame, etc.
const [gameState, setGameState] = useState(...);
const [players, setPlayers] = useState(...);
const [scores, setScores] = useState(...);

useEffect(() => {
  const handleMessage = (tags, message) => {
    // Parse comando
    // Validar usuario
    // Actualizar estado
  };
  twitchService.onMessage(handleMessage);
}, []);
```

**Solución**: Crear hook `useGameBase` reutilizable

#### En Overlays (13 archivos)

```typescript
// Patrón repetido en: PiumOverlay, DuckHuntOverlay, etc.
const { bgColor, setBgColor } = useOverlayMode();
const [gameState, setGameState] = useState(...);

useEffect(() => {
  const channel = new BroadcastChannel('game_sync');
  channel.onmessage = (e) => setGameState(e.data);
  return () => channel.close();
}, []);
```

**Solución**: Crear hook `useOverlaySync` reutilizable

#### En Componentes de Entrada (PollCreator, JudgePanel, GiveawayHub)

```typescript
// Patrón repetido: Gestión de colaboradores
const [collaborationChannels, setCollaborationChannels] = useState([]);
const handleAddCollaborator = async (channel) => { ... };
const handleRemoveCollaborator = (channel) => { ... };
```

**Solución**: Extraer a hook `useCollaboration`

### 3.5 Falta de Separación de Responsabilidades

**App.tsx hace TODO**:
- ✗ Gestión de conexión Twitch
- ✗ Procesamiento de votos
- ✗ Análisis de chat
- ✗ Gestión de eventos stream
- ✗ Orquestación de componentes
- ✗ Manejo de notificaciones
- ✗ Persistencia de datos
- ✗ Lógica de overlay

**Debería hacer SOLO**:
- ✓ Orquestación de componentes
- ✓ Enrutamiento de vistas
- ✓ Manejo de notificaciones globales

### 3.6 Problemas de Testabilidad

**Servicios no son testables**:
```typescript
// twitchService es un singleton global
export const twitchService = new TwitchService();

// No se puede mockear fácilmente en tests
// No se puede inyectar dependencias
```

**Hooks acoplados a servicios globales**:
```typescript
// usePoll depende de twitchService directamente
const { currentPoll } = usePoll();
// No se puede testear sin twitchService real
```

## 4. DEPENDENCIAS ENTRE COMPONENTES

### 4.1 Componentes Principales

```
App.tsx (orquestador)
├── ConnectionPanel (entrada)
├── PollCreator → usePoll, useModeration, twitchService
├── LivePoll → usePoll, useModeration
├── JudgePanel → useModeration, twitchService
├── GiveawayHub → twitchService, useStreamEvents
├── StreamGames → 13 juegos, twitchService
├── StreamAnalytics → chatAnalysisService, aiAnalyticsService
├── StreamActivity → useStreamEvents, twitchService
├── ChatFeed → twitchService
├── AIVisionMascot → aiAnalyticsService, chatAnalysisService
└── [Overlays] → BroadcastChannel, localStorage
```

### 4.2 Dependencias de Servicios

```
twitchService (TMI.js)
├── Usado por: App.tsx, usePoll, useStreamEvents, todos los juegos
├── Proporciona: Conexión chat, eventos stream, colaboraciones
└── Problema: Singleton global, no inyectable

voteModerationService
├── Usado por: useModeration, App.tsx
├── Proporciona: Validación votos, pesos, logs
└── Problema: Funciones puras pero sin estado

chatAnalysisService
├── Usado por: StreamAnalytics, AIVisionMascot
├── Proporciona: Análisis sentimiento, métricas
└── Problema: Funciones puras, sin persistencia

aiAnalyticsService
├── Usado por: App.tsx, StreamAnalytics, AIVisionMascot
├── Proporciona: Sesiones, análisis IA
└── Problema: Singleton con estado, no inyectable

firebaseSync
├── Usado por: usePoll, overlays
├── Proporciona: Sincronización Firebase
└── Problema: Singleton global, acoplado a Firebase
```

## 5. CÓDIGO DUPLICADO ESPECÍFICO

### 5.1 Gestión de Colaboradores (3 lugares)

**PollCreator.tsx** (líneas ~200-250)
**JudgePanel.tsx** (líneas ~150-200)
**GiveawayHub.tsx** (líneas ~300-350)

```typescript
// Código idéntico en 3 archivos:
const [collaborationChannels, setCollaborationChannels] = useState([]);
const handleAddCollaborator = async (channel) => {
  const result = await addCollaborator(channel);
  if (result) setCollaborationChannels(prev => [...prev, result]);
};
const handleRemoveCollaborator = (channel) => {
  removeCollaborator(channel);
  setCollaborationChannels(prev => prev.filter(c => c.name !== channel));
};
```

**Solución**: Hook `useCollaborationUI`

### 5.2 Sincronización de Overlay (13 juegos + overlays)

**Patrón en PiumGame.tsx, DuckHunt.tsx, etc.**:
```typescript
useEffect(() => {
  const channel = new BroadcastChannel('game_sync');
  channel.postMessage({ type: 'state', data: gameState });
  return () => channel.close();
}, [gameState]);
```

**Patrón en PiumOverlay.tsx, DuckHuntOverlay.tsx, etc.**:
```typescript
useEffect(() => {
  const channel = new BroadcastChannel('game_sync');
  channel.onmessage = (e) => {
    if (e.data.type === 'state') setGameState(e.data.data);
  };
  return () => channel.close();
}, []);
```

**Solución**: Hook `useGameSync`

### 5.3 Procesamiento de Mensajes Chat (App.tsx + todos los juegos)

**En App.tsx** (líneas ~600-800):
```typescript
twitchService.onMessage((tags, message, self, sourceChannel) => {
  // Parse vote
  // Validar
  // Procesar
});
```

**En cada juego** (PiumGame, DuckHunt, etc.):
```typescript
twitchService.onMessage((tags, message) => {
  // Parse comando específico del juego
  // Validar
  // Procesar
});
```

**Solución**: Hook `useChatCommand` genérico

## 6. PATRONES DE ARQUITECTURA ACTUALES

### 6.1 Patrón Singleton (Servicios)

```typescript
// services/twitchService.ts
class TwitchService { ... }
export const twitchService = new TwitchService();

// Problema: No se puede inyectar, difícil de testear
```

### 6.2 Patrón Custom Hooks (Lógica Reutilizable)

```typescript
// hooks/usePoll.ts
export function usePoll(options) {
  const [currentPoll, setCurrentPoll] = useState(null);
  // ...
  return { currentPoll, createPoll, ... };
}

// Ventaja: Reutilizable
// Problema: Acoplado a servicios globales
```

### 6.3 Patrón Context (Estado Global)

```typescript
// context/ThemeContext.tsx
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(...);
  return <ThemeContext.Provider value={{ theme, setTheme }}>
    {children}
  </ThemeContext.Provider>;
};

// Ventaja: Acceso global
// Problema: Solo para tema e i18n, no para lógica de negocio
```

### 6.4 Patrón BroadcastChannel (Comunicación entre pestañas)

```typescript
// En componente principal
const channel = new BroadcastChannel('poll_overlay_sync');
channel.postMessage({ type: 'poll_state', state: {...} });

// En overlay
const channel = new BroadcastChannel('poll_overlay_sync');
channel.onmessage = (e) => { ... };

// Ventaja: Funciona entre pestañas/OBS
// Problema: Acoplado a BroadcastChannel, no escalable
```

## 7. CÓMO ESTÁ ORGANIZADA LA LÓGICA DE NEGOCIO

### 7.1 Lógica de Votos

```
Entrada: Mensaje chat "+1"
    ↓
App.tsx: Parse y validación básica
    ↓
useModeration.processVote()
    ↓
voteModerationService.validateVote()
    ↓
usePoll.addVote()
    ↓
Salida: Poll actualizado
```

**Problemas**:
- Lógica dispersa en 3 capas
- Difícil de testear
- Difícil de reutilizar

### 7.2 Lógica de Eventos Stream

```
Entrada: Evento Twitch (sub, raid, etc.)
    ↓
twitchService.onStreamEvent()
    ↓
useStreamEvents.addEvent()
    ↓
Persistencia: localStorage + Firebase
    ↓
Salida: StreamActivity re-renderiza
```

**Problemas**:
- Persistencia inconsistente
- No hay validación de eventos
- Difícil de agregar nuevos tipos de eventos

### 7.3 Lógica de Análisis de Chat

```
Entrada: Mensajes chat
    ↓
App.tsx: Acumula en chatMessages[]
    ↓
StreamAnalytics: Llama chatAnalysisService.analyzeChat()
    ↓
chatAnalysisService: Análisis puro (sin estado)
    ↓
Salida: Métricas mostradas en UI
```

**Problemas**:
- Análisis sin persistencia
- No hay historial de sesiones
- Difícil de agregar análisis IA

## 8. SERVICIOS RELACIONADOS CON TWITCH

### 8.1 twitchService.ts (1653 líneas)

**Responsabilidades**:
- Conexión TMI.js
- Manejo de mensajes chat
- Eventos stream (subs, raids, bits, etc.)
- Colaboraciones multi-canal
- Reconexión automática
- Envío de mensajes

**Métodos principales**:
```typescript
connect(channel, token)
disconnect()
sendMessage(message)
onMessage(callback)
onStreamEvent(callback)
addCollaborationChannel(channel)
removeCollaborationChannel(channel)
getCollaborationChannels()
getViewerCount(channel)
getChatters(token, broadcasterId, moderatorId)
```

**Problemas**:
- Hardcodeado para TMI.js
- No hay interfaz para otros proveedores
- Colaboraciones son un parche
- Difícil de testear

### 8.2 twitchOAuth.ts (150+ líneas)

**Responsabilidades**:
- Autenticación OAuth
- Validación de tokens
- Refresh de tokens

**Métodos principales**:
```typescript
getAuthUrl()
exchangeCodeForToken(code)
validateToken(token)
refreshToken(token)
```

**Problemas**:
- No integrado con useTwitchConnection
- Validación de token es asincrónica pero no se espera

## 9. CÓMO SE COMUNICAN LOS COMPONENTES CON SERVICIOS

### 9.1 Patrón Actual

```
Componente
    ↓
Hook (usePoll, useModeration, etc.)
    ↓
Servicio (twitchService, voteModerationService, etc.)
    ↓
Librería externa (TMI.js, Firebase, etc.)
```

### 9.2 Flujo de Datos

```
Componente A → Hook → Servicio → Librería
                ↓
            Estado local
                ↓
            Re-render
                ↓
Componente B (si comparte hook)
```

**Problema**: No hay comunicación entre componentes que no comparten hooks

### 9.3 Sincronización entre Pestañas

```
Pestaña Principal (App.tsx)
    ↓
localStorage + Firebase
    ↓
Overlay (PollOverlay.tsx)
    ↓
BroadcastChannel
    ↓
Pestaña Principal (recibe cambios)
```

**Problema**: Múltiples canales de sincronización, inconsistente

## 10. EXPORTACIONES SIN IMPORTAR (CÓDIGO MUERTO)

### 10.1 En services/

- `firebaseSync.ts`: Métodos no usados en algunos casos
- `twitchOAuth.ts`: `refreshToken()` nunca se llama

### 10.2 En components/

- `StreamActivity.tsx`: Funciones exportadas pero no usadas
  - `saveEvents()`
  - `loadEventsByDate()`
  - `getAvailableDates()`
  - `clearEventsByDate()`
  - `voteToEvent()`

### 10.3 En hooks/

- `useLocalStorage.ts`: Hook genérico pero poco usado
- `useOverlay.ts`: Métodos no usados en todos los overlays

## 11. RECOMENDACIONES PARA ARQUITECTURA HEXAGONAL

### 11.1 Estructura Propuesta

```
src/
├── domain/                    # Lógica de negocio pura
│   ├── entities/             # Modelos de datos
│   ├── usecases/             # Casos de uso
│   └── repositories/         # Interfaces de persistencia
├── application/              # Orquestación
│   ├── services/             # Servicios de aplicación
│   └── dto/                  # Data Transfer Objects
├── infrastructure/           # Implementaciones
│   ├── adapters/             # Adaptadores (Twitch, Firebase, etc.)
│   ├── persistence/          # Persistencia (localStorage, Firebase)
│   └── external/             # Librerías externas
├── presentation/             # UI (React)
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── context/
└── shared/                   # Código compartido
    ├── constants/
    ├── utils/
    └── types/
```

### 11.2 Beneficios

- ✓ Separación clara de responsabilidades
- ✓ Fácil de testear (lógica de negocio sin dependencias)
- ✓ Fácil de agregar nuevos proveedores (OBS, YouTube)
- ✓ Fácil de cambiar implementaciones (Firebase → Supabase)
- ✓ Código reutilizable
- ✓ Menos duplicación

### 11.3 Pasos de Migración

1. **Fase 1**: Extraer lógica de negocio a `domain/`
2. **Fase 2**: Crear interfaces de adaptadores
3. **Fase 3**: Implementar adaptadores para Twitch, Firebase, etc.
4. **Fase 4**: Refactorizar hooks para usar servicios de aplicación
5. **Fase 5**: Agregar soporte para OBS y multistream
6. **Fase 6**: Eliminar código duplicado

