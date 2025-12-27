# Design Document: Stream Enhancements

## Overview

Este documento describe el diseño técnico para implementar las mejoras del sistema de streaming: alertas personalizadas, comandos de chat, estadísticas avanzadas y optimización del bundle. Todas las implementaciones seguirán la arquitectura hexagonal existente.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │AlertOverlay │ │CommandPanel │ │AnalyticsDash│ │LazyLoader  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐│
│  │AlertService │ │CommandService│ │AdvancedAnalyticsService    ││
│  └─────────────┘ └─────────────┘ └─────────────────────────────┘│
│  ┌─────────────┐                                                 │
│  │useAlerts    │ ┌─────────────┐                                │
│  │useCommands  │ │useAnalytics │                                │
│  └─────────────┘ └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Domain Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │IAlertPort   │ │ICommandPort │ │IAnalyticsPort│               │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │LocalStorageAlert│ │LocalStorageCmd  │                        │
│  └─────────────────┘ └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Alert System

#### Domain Port: IAlertPort

```typescript
interface AlertConfig {
  id: string;
  eventType: 'follow' | 'sub' | 'raid' | 'bits' | 'gift';
  enabled: boolean;
  // Visual
  template: 'default' | 'minimal' | 'fancy';
  duration: number; // ms
  animation: 'fade' | 'slide' | 'bounce' | 'zoom';
  // Audio
  soundUrl?: string;
  soundVolume: number; // 0-100
  // Custom
  customMessage?: string;
  customImage?: string;
}

interface AlertEvent {
  type: AlertConfig['eventType'];
  username: string;
  amount?: number; // bits, months, viewers
  message?: string;
  tier?: string; // sub tier
}

interface IAlertPort {
  getConfigs(): AlertConfig[];
  saveConfig(config: AlertConfig): void;
  deleteConfig(id: string): void;
  getConfigByEvent(eventType: AlertConfig['eventType']): AlertConfig | null;
}
```

#### Application Service: AlertService

```typescript
class AlertService {
  private queue: AlertEvent[] = [];
  private isPlaying: boolean = false;
  private configs: Map<string, AlertConfig>;
  private listeners: Set<(event: AlertEvent) => void>;
  
  constructor(port: IAlertPort);
  
  // Queue management
  enqueue(event: AlertEvent): void;
  private processQueue(): Promise<void>;
  
  // Config management
  getConfig(eventType: string): AlertConfig | null;
  saveConfig(config: AlertConfig): void;
  deleteConfig(id: string): void;
  getAllConfigs(): AlertConfig[];
  
  // Playback
  previewAlert(config: AlertConfig): void;
  
  // Listeners
  onAlert(callback: (event: AlertEvent) => void): () => void;
}
```

### 2. Command System

#### Domain Port: ICommandPort

```typescript
interface CustomCommand {
  id: string;
  name: string; // without prefix, e.g., "hello"
  response: string; // supports variables
  cooldown: number; // seconds
  userLevel: 'everyone' | 'subscriber' | 'vip' | 'moderator' | 'broadcaster';
  enabled: boolean;
  usageCount: number;
  lastUsed?: number;
}

interface CommandContext {
  user: string;
  channel: string;
  isMod: boolean;
  isSub: boolean;
  isVip: boolean;
  isBroadcaster: boolean;
}

interface ICommandPort {
  getCommands(): CustomCommand[];
  saveCommand(command: CustomCommand): void;
  deleteCommand(id: string): void;
  getCommandByName(name: string): CustomCommand | null;
  updateUsage(id: string): void;
}
```

#### Application Service: CommandService

```typescript
class CommandService {
  private commands: Map<string, CustomCommand>;
  private cooldowns: Map<string, number>; // command id -> last used timestamp
  private prefix: string = '!';
  
  constructor(port: ICommandPort);
  
  // Parsing
  parseMessage(message: string, context: CommandContext): string | null;
  private matchCommand(message: string): { command: CustomCommand; args: string[] } | null;
  
  // Execution
  private canExecute(command: CustomCommand, context: CommandContext): boolean;
  private isOnCooldown(command: CustomCommand): boolean;
  private hasPermission(command: CustomCommand, context: CommandContext): boolean;
  private interpolateResponse(response: string, context: CommandContext, args: string[]): string;
  
  // Management
  addCommand(command: Omit<CustomCommand, 'id' | 'usageCount'>): CustomCommand;
  updateCommand(id: string, updates: Partial<CustomCommand>): boolean;
  deleteCommand(id: string): boolean;
  getCommands(): CustomCommand[];
  
  // Variables supported: {user}, {channel}, {count}, {random:min:max}, {args}, {arg0}, {arg1}...
}
```

### 3. Advanced Analytics

#### Domain Port: IAdvancedAnalyticsPort

```typescript
interface StreamSession {
  id: string;
  startTime: number;
  endTime?: number;
  peakViewers: number;
  averageViewers: number;
  totalMessages: number;
  uniqueChatters: number;
  newFollowers: number;
  newSubs: number;
  bitsReceived: number;
  timeline: TimelinePoint[];
}

interface TimelinePoint {
  timestamp: number;
  viewers: number;
  messages: number;
  events: string[]; // event types that occurred
}

interface IAdvancedAnalyticsPort {
  saveSession(session: StreamSession): void;
  getSessions(limit?: number): StreamSession[];
  getSession(id: string): StreamSession | null;
  deleteSession(id: string): void;
}
```

#### Application Service: AdvancedAnalyticsService

```typescript
class AdvancedAnalyticsService {
  private currentSession: StreamSession | null = null;
  private updateInterval: number | null = null;
  
  constructor(port: IAdvancedAnalyticsPort, streamEventService: StreamEventService);
  
  // Session management
  startSession(): void;
  endSession(): void;
  getCurrentSession(): StreamSession | null;
  
  // Real-time updates
  private recordTimelinePoint(): void;
  updateViewerCount(count: number): void;
  recordMessage(username: string): void;
  recordEvent(type: string): void;
  
  // History
  getSessionHistory(limit?: number): StreamSession[];
  getSession(id: string): StreamSession | null;
  
  // Calculations
  calculateRetention(): number; // percentage
  calculateEngagementRate(): number;
  getTopChatters(): { username: string; count: number }[];
  
  // Export
  exportToCSV(sessionId: string): string;
  exportAllToCSV(): string;
}
```

### 4. Bundle Optimization

#### Lazy Loading Strategy

```typescript
// Lazy loaded components
const LazyGames = {
  Ahorcado: lazy(() => import('./games/Ahorcado')),
  Battleship: lazy(() => import('./games/Battleship')),
  Carrera: lazy(() => import('./games/Carrera')),
  // ... etc
};

// Loading component
const GameLoader: React.FC<{ game: string }> = ({ game }) => {
  const GameComponent = LazyGames[game];
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GameComponent />
    </Suspense>
  );
};
```

#### Code Splitting Configuration

```typescript
// vite.config.ts additions
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'games': [/* game imports */],
          'obs': ['obs-websocket-js'],
          'analytics': [/* analytics imports */],
        },
      },
    },
  },
});
```

## Data Models

### Alert Configuration Storage

```typescript
interface AlertStorageSchema {
  version: 1;
  configs: AlertConfig[];
}

// localStorage key: 'stream_alerts_config'
```

### Command Storage

```typescript
interface CommandStorageSchema {
  version: 1;
  prefix: string;
  commands: CustomCommand[];
}

// localStorage key: 'custom_commands'
```

### Analytics Storage

```typescript
interface AnalyticsStorageSchema {
  version: 1;
  sessions: StreamSession[];
  maxSessions: number; // default 50
}

// localStorage key: 'stream_analytics'
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Alert System Properties

**Property 1: Alert Queue Ordering**
*For any* sequence of alert events, the Alert_System SHALL process them in FIFO order, with each alert completing before the next begins.
**Validates: Requirements 1.3**

**Property 2: Alert Configuration Round-Trip**
*For any* valid AlertConfig, saving it and then loading all configs SHALL return a collection containing an equivalent config.
**Validates: Requirements 1.6, 1.7**

**Property 3: Event-to-Alert Mapping**
*For any* stream event with a matching enabled config, the Alert_System SHALL enqueue exactly one alert.
**Validates: Requirements 1.1**

### Command System Properties

**Property 4: Command Prefix Detection**
*For any* message, the Command_Parser SHALL attempt to match a command if and only if the message starts with the configured prefix.
**Validates: Requirements 2.1**

**Property 5: Command Execution**
*For any* registered and enabled command, when invoked by a user with sufficient permissions and not on cooldown, the parser SHALL return the interpolated response.
**Validates: Requirements 2.2**

**Property 6: Cooldown Enforcement**
*For any* command with cooldown > 0, invoking it twice within the cooldown period SHALL result in only the first invocation executing.
**Validates: Requirements 2.4**

**Property 7: Permission Enforcement**
*For any* command with userLevel requirement, users below that level SHALL NOT trigger command execution.
**Validates: Requirements 2.5**

**Property 8: Variable Interpolation**
*For any* response containing variables {user}, {channel}, {count}, the interpolated result SHALL contain the actual values, not the variable placeholders.
**Validates: Requirements 2.8**

**Property 9: Command Configuration Round-Trip**
*For any* valid CustomCommand, saving it and then loading all commands SHALL return a collection containing an equivalent command.
**Validates: Requirements 2.6, 2.7**

### Analytics Properties

**Property 10: Session Persistence Round-Trip**
*For any* completed StreamSession, ending the session and then retrieving history SHALL include that session with equivalent data.
**Validates: Requirements 3.2, 3.3**

**Property 11: Metrics Consistency**
*For any* session, peakViewers SHALL be >= averageViewers, and uniqueChatters SHALL be <= totalMessages.
**Validates: Requirements 3.1**

**Property 12: CSV Export Completeness**
*For any* session, the exported CSV SHALL contain all required fields: id, startTime, endTime, peakViewers, averageViewers, totalMessages, uniqueChatters.
**Validates: Requirements 3.6**

**Property 13: Retention Calculation Bounds**
*For any* session with timeline data, the retention percentage SHALL be between 0 and 100 inclusive.
**Validates: Requirements 3.7**

## Error Handling

### Alert System
- Invalid sound URL: Log warning, use default sound, continue alert display
- Missing config for event: Silently ignore event (no alert)
- localStorage full: Log error, continue with in-memory only

### Command System
- Invalid command name: Reject with validation error
- Circular variable reference: Detect and return error message
- localStorage full: Log error, continue with in-memory only

### Analytics
- Session already active: End previous session before starting new
- Export with no data: Return empty CSV with headers only
- localStorage full: Prune oldest sessions, keep most recent

## Testing Strategy

### Unit Tests
- Alert queue processing order
- Command parsing edge cases (empty message, prefix only, unknown command)
- Variable interpolation with missing context
- CSV generation format validation
- Retention calculation with edge cases (empty timeline, single point)

### Property-Based Tests
Using fast-check library with minimum 100 iterations per property:

1. **Alert Queue FIFO** - Generate random sequences of events, verify order
2. **Alert Config Round-Trip** - Generate random configs, verify persistence
3. **Command Prefix Detection** - Generate random messages, verify prefix matching
4. **Cooldown Enforcement** - Generate command sequences with timestamps
5. **Permission Levels** - Generate user contexts and commands, verify access
6. **Variable Interpolation** - Generate responses with variables, verify replacement
7. **Command Round-Trip** - Generate random commands, verify persistence
8. **Session Round-Trip** - Generate random sessions, verify persistence
9. **Metrics Bounds** - Generate session data, verify invariants
10. **CSV Completeness** - Generate sessions, verify export contains all fields

### Integration Tests
- Alert system integration with StreamEventService
- Command system integration with TwitchAdapter
- Analytics integration with existing AnalyticsService

