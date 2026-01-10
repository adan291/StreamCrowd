# Design Document: Dynamics UI Improvements

## Overview

Este diseño describe las mejoras de UI para unificar la experiencia en todas las dinámicas de la aplicación. Se reutilizarán componentes ya implementados en el sistema de sorteos (SoundSettingsPopover, HistoryPanel, ViewModeToggle) y se adaptarán para encuestas, predicciones y juegos.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Dynamics System                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │   Polls     │  │ Predictions │  │   Games     │  │Giveaways││
│  │   Panel     │  │   Panel     │  │   Panel     │  │  (done) ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────┘│
│         │                │                │                     │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │           Shared UI Components                │              │
│  │  ┌─────────────────┐  ┌─────────────────┐    │              │
│  │  │SoundSettings    │  │  HistoryPanel   │    │              │
│  │  │Popover          │  │  (generic)      │    │              │
│  │  └─────────────────┘  └─────────────────┘    │              │
│  │  ┌─────────────────┐  ┌─────────────────┐    │              │
│  │  │ViewModeToggle   │  │  ChatSettings   │    │              │
│  │  └─────────────────┘  └─────────────────┘    │              │
│  │  ┌─────────────────┐  ┌─────────────────┐    │              │
│  │  │  StatsPanel     │  │    Tooltip      │    │              │
│  │  └─────────────────┘  └─────────────────┘    │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │              Shared Hooks                      │              │
│  │  useActivitySound  │  useActivityHistory      │              │
│  │  useActivityConfig │  useChatCommands         │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │           Storage Layer                        │              │
│  │  ActivityStorage (localStorage abstraction)   │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Shared UI Components

#### SoundSettingsPopover (existing - reuse)
```typescript
interface SoundSettingsPopoverProps {
  config: ActivitySoundConfig;
  onConfigChange: (config: Partial<ActivitySoundConfig>) => void;
  onTestSound?: () => void;
  showVoteOption?: boolean;
  showMilestoneOption?: boolean;
}
```

#### GenericHistoryPanel (new - generalized from giveaway)
```typescript
interface HistoryItem {
  id: string;
  name: string;
  type: 'poll' | 'prediction' | 'game' | 'giveaway';
  result: string;
  participantCount: number;
  createdAt: number;
  finishedAt: number;
  metadata?: Record<string, unknown>;
}

interface GenericHistoryPanelProps {
  items: HistoryItem[];
  type: 'poll' | 'prediction' | 'game';
  onExportCSV: () => void;
  onExportJSON: () => void;
  renderItemDetails?: (item: HistoryItem) => React.ReactNode;
}
```

#### ViewModeToggle (existing - reuse)
```typescript
interface ViewModeToggleProps {
  mode: 'compact' | 'expanded';
  onChange: (mode: 'compact' | 'expanded') => void;
  disabled?: boolean;
}
```

#### ChatSettingsPanel (new - generalized)
```typescript
interface ChatCommand {
  name: string;
  prefix: string;
  enabled: boolean;
  cooldown: number;
  response?: string;
}

interface ChatSettingsPanelProps {
  activityType: 'poll' | 'prediction' | 'game';
  commands: ChatCommand[];
  onCommandsChange: (commands: ChatCommand[]) => void;
  globalPrefix: string;
  onPrefixChange: (prefix: string) => void;
}
```

#### ActivityStatsPanel (new)
```typescript
interface ActivityStats {
  totalActivities: number;
  totalParticipants: number;
  averageParticipation: number;
  mostPopularType: string;
  activitiesByType: Record<string, number>;
  activitiesOverTime: { date: string; count: number }[];
}

interface ActivityStatsPanelProps {
  stats: ActivityStats;
  dateRange: DateRangeType;
  onDateRangeChange: (range: DateRangeType) => void;
  onExport: () => void;
}
```

### 2. Shared Hooks

#### useActivitySound (existing - already generic)
```typescript
interface UseActivitySoundOptions {
  storageKey: string;
}

interface UseActivitySoundReturn {
  config: ActivitySoundConfig;
  setConfig: (config: Partial<ActivitySoundConfig>) => void;
  play: (sound: SoundType) => void;
  playCountdown: (seconds: number) => void;
}
```

#### useActivityHistory (new)
```typescript
interface UseActivityHistoryOptions<T> {
  storageKey: string;
  maxItems?: number;
}

interface UseActivityHistoryReturn<T> {
  items: T[];
  addItem: (item: T) => void;
  clearHistory: () => void;
  filterByDate: (range: DateRangeType) => T[];
  filterBySearch: (term: string, field: keyof T) => T[];
  exportCSV: () => string;
  exportJSON: () => string;
}
```

#### useActivityConfig (new)
```typescript
interface UseActivityConfigOptions<T> {
  storageKey: string;
  defaultConfig: T;
}

interface UseActivityConfigReturn<T> {
  config: T;
  updateConfig: (partial: Partial<T>) => void;
  resetConfig: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}
```

#### useChatCommands (new)
```typescript
interface UseChatCommandsOptions {
  activityType: string;
  commands: ChatCommand[];
  onResponse?: (response: string) => void;
}

interface UseChatCommandsReturn {
  processMessage: (message: ChatMessage) => CommandResult | null;
  isOnCooldown: (command: string) => boolean;
}
```

### 3. Storage Layer

#### ActivityStorage (generalized)
```typescript
class ActivityStorage {
  static getHistory<T>(key: string): T[];
  static addToHistory<T>(key: string, item: T): void;
  static getConfig<T>(key: string, defaultValue: T): T;
  static setConfig<T>(key: string, value: T): void;
  static exportAll(): string;
  static importAll(json: string): boolean;
  static getStorageUsage(): { used: number; quota: number };
}
```

## Data Models

### ActivitySoundConfig
```typescript
interface ActivitySoundConfig {
  enabled: boolean;
  volume: number;
  countdownEnabled: boolean;
  voteSound: boolean;
  milestoneSound: boolean;
}
```

### PollHistoryItem
```typescript
interface PollHistoryItem extends HistoryItem {
  type: 'poll';
  question: string;
  options: { label: string; votes: number; color: string }[];
  winningOption: string;
  totalVotes: number;
  duration?: number;
}
```

### PredictionHistoryItem
```typescript
interface PredictionHistoryItem extends HistoryItem {
  type: 'prediction';
  title: string;
  outcomes: { title: string; points: number; users: number }[];
  winningOutcome: string;
  totalPoints: number;
  status: 'resolved' | 'cancelled';
}
```

### GameHistoryItem
```typescript
interface GameHistoryItem extends HistoryItem {
  type: 'game';
  gameName: string;
  gameType: string;
  winner?: string;
  scores?: Record<string, number>;
  duration: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sound Settings Independence
*For any* two different activity types (poll, prediction, game), changing the sound configuration for one activity SHALL NOT affect the sound configuration of the other activity.
**Validates: Requirements 1.2**

### Property 2: Date Filter Correctness
*For any* history list and date range filter, all returned items SHALL have their finishedAt timestamp within the specified date range.
**Validates: Requirements 2.2, 3.2**

### Property 3: Search Filter Correctness
*For any* history list and search term, all returned items SHALL contain the search term in the specified search field (case-insensitive).
**Validates: Requirements 2.3**

### Property 4: Export/Import Round-Trip
*For any* valid history data, exporting to JSON and then importing SHALL produce data equivalent to the original.
**Validates: Requirements 2.5, 9.3, 9.4**

### Property 5: Statistics Calculation Correctness
*For any* history list, the calculated statistics (total, average, most popular) SHALL be mathematically correct based on the input data.
**Validates: Requirements 2.6, 3.5, 8.2**

### Property 6: Preview Reactivity
*For any* poll configuration change, the preview state SHALL reflect the exact same values as the input configuration within the same render cycle.
**Validates: Requirements 4.2, 4.3**

### Property 7: Command Parsing Correctness
*For any* message starting with the configured prefix followed by a valid command name, the parser SHALL correctly identify and extract the command and its arguments.
**Validates: Requirements 5.2, 5.3**

### Property 8: Cooldown Enforcement
*For any* command execution, if the time since the last execution of that command is less than the configured cooldown, the command SHALL be rejected.
**Validates: Requirements 5.4**

### Property 9: Configuration Persistence Round-Trip
*For any* valid activity configuration, saving to localStorage and then loading SHALL produce a configuration equivalent to the original.
**Validates: Requirements 9.1, 9.2**

### Property 10: Last Played Game Persistence
*For any* game that is played, the game identifier SHALL be stored and retrieved as the "last played" game on subsequent loads.
**Validates: Requirements 7.4**

## Error Handling

### Storage Errors
- **QuotaExceededError**: Show warning modal with storage usage and cleanup suggestions
- **JSON Parse Error**: Log error, return default config, show toast notification
- **Invalid Data**: Validate on load, migrate or reset if invalid

### Sound Errors
- **Audio Context Blocked**: Show tooltip explaining user interaction requirement
- **Sound File Not Found**: Silently fail, log warning

### Network Errors (for Twitch API calls)
- **Rate Limited**: Queue requests, show retry indicator
- **Auth Expired**: Prompt re-authentication

## Testing Strategy

### Unit Tests
- Test each hook in isolation with mock storage
- Test component rendering with various props
- Test filter functions with edge cases

### Property-Based Tests
- Use fast-check for generating random test data
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: dynamics-ui-improvements, Property {N}: {description}**

### Integration Tests
- Test full flow: create activity → complete → view in history
- Test config persistence across page reloads
- Test sound playback with user interaction

### Test Configuration
```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.property.test.ts'],
    coverage: {
      include: ['components/ui/**', 'hooks/useActivity*'],
    },
  },
});
```
