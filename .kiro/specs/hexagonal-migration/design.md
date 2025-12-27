# Design Document: Hexagonal Migration

## Overview

Este documento describe el diseño técnico para completar la migración a arquitectura hexagonal de TwitchVote Live. La migración consolida los servicios legacy (`services/`) en la estructura hexagonal existente (`src/`), eliminando duplicación y mejorando la testabilidad.

## Architecture

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

## Components and Interfaces

### Domain Layer - New Entities

#### StreamEvent Entity
```typescript
// src/domain/entities/StreamEvent.ts
export type StreamEventType = 
  | 'sub' | 'resub' | 'subgift' | 'submysterygift' 
  | 'primepaidupgrade' | 'giftpaidupgrade' 
  | 'raid' | 'cheer' | 'hosted' | 'ban' | 'timeout';

export type SubTier = 'Prime' | '1000' | '2000' | '3000';

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  username: string;
  displayName: string;
  userId?: string;
  channel: string;
  timestamp: number;
  // Sub specific
  tier?: SubTier;
  months?: number;
  cumulativeMonths?: number;
  streakMonths?: number;
  message?: string;
  // Gift specific
  recipientUsername?: string;
  giftCount?: number;
  // Raid specific
  viewerCount?: number;
  // Cheer specific
  bits?: number;
  // Ban/Timeout specific
  duration?: number;
  reason?: string;
}
```

#### ModerationConfig Entity
```typescript
// src/domain/entities/ModerationConfig.ts
export type RejectionReason =
  | 'ACCOUNT_TOO_YOUNG'
  | 'COOLDOWN_ACTIVE'
  | 'VOTE_CHANGE_DISABLED'
  | 'INVALID_OPTION'
  | 'NOT_WHITELISTED'
  | 'BLACKLISTED';

export interface ModerationConfig {
  minAccountAgeDays: number;
  voteChangeEnabled: boolean;
  voteChangeCooldownSeconds: number;
  weights: {
    subscriber: number;
    follower: number;
    regular: number;
  };
  whitelist: { enabled: boolean; usernames: string[] };
  blacklist: { enabled: boolean; usernames: string[] };
}

export interface ModerationResult {
  isValid: boolean;
  rejectionReason?: RejectionReason;
  weight: number;
  isVoteChange?: boolean;
  previousOptionId?: number;
  previousWeight?: number;
}

export interface ModerationStats {
  totalAttempts: number;
  acceptedVotes: number;
  rejectedByReason: Record<RejectionReason, number>;
  acceptanceRate: number;
}
```

#### ChatMetrics Entity
```typescript
// src/domain/entities/ChatMetrics.ts
export type ActivityLevel = 'dead' | 'low' | 'moderate' | 'high' | 'explosive';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type SpecialMood = 'love' | 'hype' | 'angry' | 'sad' | 'surprised' | null;

export interface ChatMetrics {
  totalMessages: number;
  uniqueUsers: number;
  messagesPerMinute: number;
  avgWordsPerMessage: number;
  sentiment: Sentiment;
  sentimentScore: number;
  sentimentIntensity: number;
  engagementScore: number;
  activityLevel: ActivityLevel;
  topUsers: { username: string; count: number }[];
  topWords: { word: string; count: number }[];
  topEmotes: { emote: string; count: number }[];
  isGrowing: boolean;
  peakActivity: number;
  growthRate: number;
  specialMood: SpecialMood;
  chatVelocity: number;
  userRetention: number;
  responseRate: number;
  peakHour: string | null;
  dominantLanguage: 'es' | 'en' | 'mixed';
  spamScore: number;
  diversityIndex: number;
}
```

### Domain Layer - New Ports

#### IStreamEventProvider Port
```typescript
// src/domain/ports/IStreamEventProvider.ts
import type { StreamEvent } from '../entities/StreamEvent';

export type StreamEventCallback = (event: StreamEvent) => void;

export interface IStreamEventProvider {
  onStreamEvent(callback: StreamEventCallback): () => void;
  offStreamEvent(callback: StreamEventCallback): void;
}
```

#### IAnalyticsProvider Port
```typescript
// src/domain/ports/IAnalyticsProvider.ts
import type { ChatMetrics } from '../entities/ChatMetrics';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
}

export interface IAnalyticsProvider {
  analyzeChat(messages: { message: string; username: string }[]): Promise<ChatMetrics>;
  isConfigured(): boolean;
}
```

### Application Layer - New Services

#### ModerationService
```typescript
// src/application/services/ModerationService.ts
import type { ModerationConfig, ModerationResult, ModerationStats, RejectionReason } from '../../domain/entities/ModerationConfig';

export interface VoteInput {
  userId: string;
  username: string;
  optionId: number;
  isSubscriber: boolean;
  isFollower: boolean;
  accountAgeDays: number;
}

export interface UserVoteState {
  optionId: number;
  timestamp: number;
  weight: number;
}

export class ModerationService {
  private config: ModerationConfig;
  private stats: ModerationStats;
  private userVotes: Map<string, UserVoteState>;
  
  constructor(config?: ModerationConfig);
  
  // Core validation
  processVote(input: VoteInput, validOptionIds: number[]): ModerationResult;
  
  // Configuration
  setConfig(config: ModerationConfig): void;
  getConfig(): ModerationConfig;
  
  // Statistics
  getStats(): ModerationStats;
  resetStats(): void;
  
  // User state
  getUserVote(userId: string): UserVoteState | undefined;
  clearUserVotes(): void;
  
  // Presets
  savePreset(name: string): string;
  loadPreset(id: string): ModerationConfig | null;
  deletePreset(id: string): boolean;
  getAllPresets(): { id: string; name: string; config: ModerationConfig }[];
}
```

#### StreamEventService
```typescript
// src/application/services/StreamEventService.ts
import type { StreamEvent, StreamEventType } from '../../domain/entities/StreamEvent';

export type StreamEventListener = (event: StreamEvent) => void;

export class StreamEventService {
  private events: StreamEvent[];
  private listeners: Map<StreamEventType | 'all', Set<StreamEventListener>>;
  private sessionId: string | null;
  
  // Session management
  startSession(channelName: string): void;
  endSession(): void;
  getSessionId(): string | null;
  
  // Event handling
  addEvent(event: Omit<StreamEvent, 'id'>): StreamEvent;
  getEvents(type?: StreamEventType): StreamEvent[];
  getEventsByTimeRange(start: number, end: number): StreamEvent[];
  
  // Listeners
  on(type: StreamEventType | 'all', listener: StreamEventListener): () => void;
  off(type: StreamEventType | 'all', listener: StreamEventListener): void;
  
  // Aggregations
  getSubCount(): number;
  getRaidCount(): number;
  getTotalBits(): number;
  getEventSummary(): Record<StreamEventType, number>;
  
  // Persistence
  saveSession(): void;
  loadSession(sessionId: string): boolean;
}
```

#### AnalyticsService
```typescript
// src/application/services/AnalyticsService.ts
import type { ChatMetrics, Sentiment, SpecialMood } from '../../domain/entities/ChatMetrics';
import type { AIProviderConfig } from '../../domain/ports/IAnalyticsProvider';

export interface StoredMessage {
  username: string;
  message: string;
  timestamp: number;
  userId?: string;
}

export interface StreamSession {
  id: string;
  channelName: string;
  startTime: number;
  endTime?: number;
  messages: StoredMessage[];
  metrics?: ChatMetrics;
}

export class AnalyticsService {
  private aiConfig: AIProviderConfig | null;
  private currentSession: StreamSession | null;
  
  // AI Configuration
  setAIConfig(config: AIProviderConfig): void;
  getAIConfig(): AIProviderConfig | null;
  isAIConfigured(): boolean;
  
  // Session management
  startSession(channelName: string): StreamSession;
  endSession(): StreamSession | null;
  getCurrentSession(): StreamSession | null;
  addMessage(message: StoredMessage): void;
  
  // Analysis
  analyzeChat(messages: StoredMessage[]): ChatMetrics;
  analyzeWithAI(messages: StoredMessage[]): Promise<ChatMetrics>;
  
  // Metrics helpers
  detectSentiment(messages: StoredMessage[]): Sentiment;
  detectSpecialMood(messages: StoredMessage[]): SpecialMood;
  calculateEngagement(messages: StoredMessage[]): number;
  generateWordCloud(messages: StoredMessage[]): { word: string; count: number }[];
  
  // Session history
  getSessions(): StreamSession[];
  getSessionsByDate(date: string): StreamSession[];
  clearOldSessions(keepDays: number): void;
}
```

#### TwitchService (Enhanced)
```typescript
// src/application/services/TwitchService.ts
import type { IChatProvider, ConnectionStatus } from '../../domain/ports/IChatProvider';
import type { IStreamEventProvider } from '../../domain/ports/IStreamEventProvider';

export interface TwitchConnectionOptions {
  channel: string;
  token?: string;
  onMessage?: (tags: any, message: string, self: boolean, channel?: string) => void;
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
}

export interface CollaborationChannel {
  name: string;
  color: string;
  isMain: boolean;
  connectedAt: number;
}

export class TwitchService implements IChatProvider, IStreamEventProvider {
  private adapter: TwitchAdapter;
  private collaborationChannels: Map<string, CollaborationChannel>;
  
  // Connection
  connect(options: TwitchConnectionOptions): Promise<void>;
  disconnect(): void;
  getConnectionStatus(): ConnectionStatus;
  
  // Messaging
  sendMessage(message: string): void;
  onMessage(callback: MessageCallback): () => void;
  
  // Collaboration
  addCollaborationChannel(channel: string): Promise<CollaborationChannel | null>;
  removeCollaborationChannel(channel: string): void;
  getCollaborationChannels(): CollaborationChannel[];
  
  // Stream events (implements IStreamEventProvider)
  onStreamEvent(callback: StreamEventCallback): () => void;
  offStreamEvent(callback: StreamEventCallback): void;
  
  // Utilities
  getViewerCount(channel?: string): Promise<number | null>;
  getChatters(token: string, broadcasterId: string): Promise<string[] | null>;
  getCurrentChannel(): string;
}
```

### Application Layer - Updated Hooks

#### useModerationService Hook
```typescript
// src/application/hooks/useModerationService.ts
export function useModerationService() {
  const [config, setConfig] = useState<ModerationConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<ModerationStats>(DEFAULT_STATS);
  
  const processVote = useCallback((input: VoteInput, validOptionIds: number[]) => {
    // Uses ModerationService internally
  }, []);
  
  return {
    config,
    stats,
    setConfig,
    processVote,
    resetStats,
    // Preset management
    savePreset,
    loadPreset,
    deletePreset,
    getAllPresets,
  };
}
```

#### useStreamEventService Hook
```typescript
// src/application/hooks/useStreamEventService.ts
export function useStreamEventService() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const startSession = useCallback((channelName: string) => {
    // Uses StreamEventService internally
  }, []);
  
  return {
    events,
    sessionId,
    startSession,
    endSession,
    getEventsByType,
    getEventSummary,
    // Listeners
    onRaid,
    onSub,
    onCheer,
  };
}
```

#### useAnalyticsService Hook
```typescript
// src/application/hooks/useAnalyticsService.ts
export function useAnalyticsService() {
  const [metrics, setMetrics] = useState<ChatMetrics | null>(null);
  const [session, setSession] = useState<StreamSession | null>(null);
  const [aiConfig, setAIConfig] = useState<AIProviderConfig | null>(null);
  
  const analyzeChat = useCallback((messages: StoredMessage[]) => {
    // Uses AnalyticsService internally
  }, []);
  
  return {
    metrics,
    session,
    aiConfig,
    setAIConfig,
    isAIConfigured,
    startSession,
    endSession,
    addMessage,
    analyzeChat,
    analyzeWithAI,
    getSessions,
  };
}
```

## Data Models

### Migration Mapping

| Legacy Location | New Location |
|-----------------|--------------|
| `services/voteModerationService.ts` | `src/application/services/ModerationService.ts` |
| `services/chatAnalysisService.ts` | `src/application/services/AnalyticsService.ts` |
| `services/aiAnalyticsService.ts` | `src/application/services/AnalyticsService.ts` |
| `services/twitchService.ts` | `src/application/services/TwitchService.ts` + `src/infrastructure/adapters/TwitchAdapter.ts` |
| `services/twitchOAuth.ts` | `src/infrastructure/adapters/TwitchAdapter.ts` |
| `services/firebaseSync.ts` | `src/infrastructure/adapters/FirebaseSyncAdapter.ts` |
| `hooks/usePoll.ts` | `src/application/hooks/usePollService.ts` |
| `hooks/useModeration.ts` | `src/application/hooks/useModerationService.ts` |
| `hooks/useStreamEvents.ts` | `src/application/hooks/useStreamEventService.ts` |
| `hooks/useAIAnalytics.ts` | `src/application/hooks/useAnalyticsService.ts` |
| `hooks/useTwitchConnection.ts` | `src/application/hooks/useTwitchService.ts` |

### localStorage Keys (Unchanged)

| Key | Purpose |
|-----|---------|
| `twitch_ai_config_v2` | AI provider configuration |
| `twitch_stream_sessions` | Stream session history |
| `twitch_vote_mod_presets` | Moderation presets |
| `obs_automations` | OBS automation rules |
| `obs_scene_hotkeys` | Scene hotkey bindings |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ModerationService Validation Consistency

*For any* vote input with valid parameters, the ModerationService SHALL return a ModerationResult where:
- If the user is blacklisted, rejectionReason is 'BLACKLISTED'
- If whitelist is enabled and user is not whitelisted, rejectionReason is 'NOT_WHITELISTED'
- If account age is below minimum, rejectionReason is 'ACCOUNT_TOO_YOUNG'
- If user has voted and vote change is disabled, rejectionReason is 'VOTE_CHANGE_DISABLED'
- If user has voted and cooldown is active, rejectionReason is 'COOLDOWN_ACTIVE'
- Otherwise, isValid is true and weight is calculated correctly based on subscriber/follower status

**Validates: Requirements 1.1, 1.2, 1.3, 1.6**

### Property 2: ModerationService Statistics Accuracy

*For any* sequence of N vote attempts processed by ModerationService, the stats SHALL satisfy:
- totalAttempts equals N
- acceptedVotes + sum(rejectedByReason) equals N
- acceptanceRate equals (acceptedVotes / totalAttempts) * 100

**Validates: Requirements 1.4**

### Property 3: ModerationService Preset Round-Trip

*For any* valid ModerationConfig, saving it as a preset and then loading it SHALL return an equivalent configuration.

**Validates: Requirements 1.5**

### Property 4: StreamEventService Event Storage

*For any* sequence of stream events added to StreamEventService, querying events SHALL return all added events in order, and filtering by type SHALL return only events of that type.

**Validates: Requirements 2.4, 2.7**

### Property 5: StreamEventService Listener Notification

*For any* registered listener on StreamEventService, when an event of the matching type is added, the listener SHALL be called with that event.

**Validates: Requirements 2.5**

### Property 6: StreamEventService Tier Categorization

*For any* subscription event with a plan value, the StreamEventService SHALL categorize it as:
- 'Prime' for Prime subscriptions
- '1000' for Tier 1
- '2000' for Tier 2
- '3000' for Tier 3

**Validates: Requirements 2.6**

### Property 7: AnalyticsService Metrics Calculation

*For any* non-empty array of messages, the AnalyticsService SHALL calculate ChatMetrics where:
- totalMessages equals the array length
- uniqueUsers equals the count of distinct usernames
- messagesPerMinute is calculated based on time span
- sentimentScore is between -1 and 1
- engagementScore is between 0 and 100

**Validates: Requirements 3.1, 3.2**

### Property 8: AnalyticsService Mood Detection

*For any* array of messages containing mood-specific patterns (e.g., "❤️", "🔥", "😡"), the AnalyticsService SHALL detect the corresponding specialMood.

**Validates: Requirements 3.3**

### Property 9: AnalyticsService Word Cloud Generation

*For any* array of messages, the word cloud generated by AnalyticsService SHALL contain words sorted by frequency in descending order, excluding stop words.

**Validates: Requirements 3.4**

### Property 10: TwitchService Reconnection Backoff

*For any* sequence of connection failures, the TwitchService SHALL attempt reconnection with exponential backoff where delay = baseDelay * 2^(attempt-1), capped at maxDelay.

**Validates: Requirements 4.1, 4.5**

### Property 11: TwitchService Collaboration Channels

*For any* collaboration channel added to TwitchService, it SHALL appear in getCollaborationChannels() and removing it SHALL remove it from the list.

**Validates: Requirements 4.2**

### Property 12: Backward Compatibility

*For any* data stored in localStorage by the legacy services, the new services SHALL be able to read and use that data without errors.

**Validates: Requirements 7.4, 7.5**

## Error Handling

### Connection Errors
- TwitchService SHALL emit 'error' status with descriptive message
- Reconnection SHALL be attempted with exponential backoff
- After max attempts, SHALL emit final error and stop retrying

### Validation Errors
- ModerationService SHALL return specific RejectionReason
- Invalid option IDs SHALL return 'INVALID_OPTION'
- All errors SHALL be logged for debugging

### AI Provider Errors
- AnalyticsService SHALL fall back to local analysis on AI failure
- API errors SHALL be logged but not thrown to UI
- Rate limiting SHALL be handled gracefully

## Testing Strategy

### Unit Tests
- Test each service method in isolation
- Mock external dependencies (localStorage, fetch)
- Cover edge cases (empty arrays, null values, boundary conditions)

### Property-Based Tests
- Use fast-check for generating random inputs
- Minimum 100 iterations per property
- Focus on invariants and round-trip properties

### Integration Tests
- Test service interactions (TwitchService → StreamEventService)
- Test hook integration with services
- Test localStorage persistence

### E2E Tests
- Verify existing E2E tests pass after migration
- Test complete user flows (connect → vote → see results)
- Test overlay synchronization
