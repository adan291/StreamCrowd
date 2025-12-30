# Chat Timers System - Design

## Overview

Sistema de mensajes automáticos (timers) que envía mensajes al chat de forma periódica. Diferente del Countdown (subathon timer que añade tiempo por eventos), este sistema envía mensajes programados a intervalos regulares.

## Architecture

### Component Hierarchy

```
PlatformsPanel
└── TwitchToolSelector
    └── TimersPanel (new)
        ├── TimerForm (crear/editar timer)
        ├── TimerList (lista de timers)
        │   └── TimerCard (cada timer individual)
        ├── TimerTemplates (plantillas predefinidas)
        └── TimerGroups (gestión de grupos)
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   TimersPanel   │────▶│   useTimers      │────▶│  localStorage   │
│   (UI Layer)    │◀────│   (Hook)         │◀────│  (Persistence)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  TimerEngine     │
                        │  (Execution)     │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Chat Service    │
                        │  (tmi.js)        │
                        └──────────────────┘
```

## Type Definitions

### Timer Types

```typescript
// types/timers.ts

export interface Timer {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;      // 1-120 minutos
  minChatLines: number;         // 0-100 líneas mínimas
  enabled: boolean;
  groupId: string | null;       // null = grupo "General"
  lastExecuted: number | null;  // timestamp
  createdAt: number;
  updatedAt: number;
}

export interface TimerGroup {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

export interface TimerTemplate {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines: number;
  category: 'social' | 'rules' | 'discord' | 'donations' | 'commands';
  icon: string;
}

export interface TimerExecutionLog {
  timerId: string;
  timerName: string;
  message: string;
  executedAt: number;
  success: boolean;
}

export interface TimerEngineState {
  isRunning: boolean;
  chatLineCount: number;
  lastCheck: number;
  executionLog: TimerExecutionLog[];
}
```

## Component Specifications

### 1. TimersPanel

Panel principal que contiene todas las funcionalidades de timers.

```typescript
interface TimersPanelProps {
  // Conexión al chat para enviar mensajes
  sendMessage?: (message: string) => void;
  isConnected: boolean;
  channel?: string;
}
```

Tabs:
- **Timers**: Lista y gestión de timers
- **Plantillas**: Templates predefinidos
- **Grupos**: Gestión de grupos
- **Log**: Historial de ejecución

### 2. TimerForm

Formulario para crear/editar timers.

```typescript
interface TimerFormProps {
  timer?: Timer;                    // Si existe, modo edición
  onSave: (timer: Omit<Timer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  groups: TimerGroup[];
}
```

Campos:
- Nombre (requerido, max 50 chars)
- Mensaje (requerido, max 500 chars, con variables)
- Intervalo (1-120 minutos, slider + input)
- Líneas mínimas (0-100, slider + input)
- Grupo (selector)
- Habilitado (toggle)

### 3. TimerList

Lista de timers con acciones rápidas.

```typescript
interface TimerListProps {
  timers: Timer[];
  groups: TimerGroup[];
  engineState: TimerEngineState;
  onEdit: (timer: Timer) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onExecuteNow: (id: string) => void;
}
```

### 4. TimerTemplates

Plantillas predefinidas para configuración rápida.

```typescript
interface TimerTemplatesProps {
  templates: TimerTemplate[];
  onUseTemplate: (template: TimerTemplate) => void;
}
```

### 5. TimerGroups

Gestión de grupos de timers.

```typescript
interface TimerGroupsProps {
  groups: TimerGroup[];
  timers: Timer[];
  onCreateGroup: (group: Omit<TimerGroup, 'id'>) => void;
  onUpdateGroup: (id: string, updates: Partial<TimerGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onToggleGroup: (id: string) => void;
}
```

## Hook: useTimers

```typescript
interface UseTimersReturn {
  // State
  timers: Timer[];
  groups: TimerGroup[];
  engineState: TimerEngineState;
  
  // Timer CRUD
  addTimer: (timer: Omit<Timer, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted'>) => Timer;
  updateTimer: (id: string, updates: Partial<Timer>) => boolean;
  deleteTimer: (id: string) => boolean;
  toggleTimer: (id: string) => void;
  
  // Group CRUD
  addGroup: (group: Omit<TimerGroup, 'id'>) => TimerGroup;
  updateGroup: (id: string, updates: Partial<TimerGroup>) => boolean;
  deleteGroup: (id: string) => boolean;
  toggleGroup: (id: string) => void;
  
  // Engine control
  startEngine: () => void;
  stopEngine: () => void;
  executeTimerNow: (id: string) => void;
  incrementChatLines: () => void;
  clearLog: () => void;
}
```

## Timer Engine Logic

El motor de timers usa un único intervalo central (cada 10 segundos) para verificar qué timers deben ejecutarse:

```typescript
// Pseudocódigo del engine
function checkTimers() {
  const now = Date.now();
  
  for (const timer of enabledTimers) {
    // Verificar si el grupo está habilitado
    if (timer.groupId && !isGroupEnabled(timer.groupId)) continue;
    
    // Verificar intervalo
    const timeSinceLastExec = now - (timer.lastExecuted || 0);
    if (timeSinceLastExec < timer.intervalMinutes * 60 * 1000) continue;
    
    // Verificar líneas mínimas de chat
    if (chatLineCount < timer.minChatLines) continue;
    
    // Ejecutar timer
    executeTimer(timer);
    resetChatLineCount();
  }
}
```

## Variable Substitution

Variables soportadas en mensajes (reutilizando lógica de comandos):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `$(channel)` | Nombre del canal | `streamer123` |
| `$(game)` | Juego actual | `Just Chatting` |
| `$(uptime)` | Tiempo de stream | `2h 30m` |
| `$(viewers)` | Viewers actuales | `1234` |
| `$(followers)` | Total seguidores | `50000` |
| `$(date)` | Fecha actual | `29/12/2025` |
| `$(time)` | Hora actual | `15:30` |

## Predefined Templates

```typescript
const TIMER_TEMPLATES: TimerTemplate[] = [
  {
    id: 'social-twitter',
    name: 'Twitter/X',
    message: '🐦 ¡Sígueme en Twitter! twitter.com/$(channel)',
    intervalMinutes: 30,
    minChatLines: 10,
    category: 'social',
    icon: 'Twitter'
  },
  {
    id: 'social-discord',
    name: 'Discord',
    message: '💬 ¡Únete a nuestro Discord! discord.gg/TULINK',
    intervalMinutes: 45,
    minChatLines: 15,
    category: 'discord',
    icon: 'MessageCircle'
  },
  {
    id: 'rules-respect',
    name: 'Reglas - Respeto',
    message: '📋 Recuerda: Respeta a todos en el chat. ¡Mantengamos un ambiente positivo!',
    intervalMinutes: 60,
    minChatLines: 20,
    category: 'rules',
    icon: 'Shield'
  },
  {
    id: 'donations-tip',
    name: 'Donaciones',
    message: '💰 ¿Quieres apoyar el stream? ¡Las donaciones ayudan mucho! streamelements.com/$(channel)/tip',
    intervalMinutes: 45,
    minChatLines: 25,
    category: 'donations',
    icon: 'DollarSign'
  },
  {
    id: 'commands-help',
    name: 'Comandos',
    message: '❓ ¿Nuevo en el canal? Escribe !comandos para ver la lista de comandos disponibles',
    intervalMinutes: 30,
    minChatLines: 15,
    category: 'commands',
    icon: 'Terminal'
  }
];
```

## Integration Points

### 1. Platform Config (config/platforms.ts)

Añadir nuevo tool:
```typescript
{
  id: 'timers',
  icon: 'Timer',
  title: 'Timers',
  description: 'Mensajes automáticos',
  color: '#10b981',
  enabled: true,
}
```

### 2. TwitchToolSelector

Añadir icono Timer al mapping.

### 3. PlatformsPanel

Añadir case para renderizar TimersPanel.

### 4. Types (types.ts)

Añadir 'timers' a PlatformsTool type.

## Accessibility

- Todos los controles accesibles por teclado
- ARIA labels en elementos interactivos
- Focus visible en todos los elementos
- Anuncios de screen reader para cambios de estado
- Contraste de colores WCAG AA

## Persistence

localStorage keys:
- `chat_timers`: Timer[]
- `chat_timer_groups`: TimerGroup[]
- `chat_timer_engine_state`: Partial<TimerEngineState>

## Performance Considerations

- Un único setInterval central (no uno por timer)
- Cleanup de intervalos al desmontar
- Debounce en actualizaciones de localStorage
- Límite de 50 entradas en el log de ejecución
