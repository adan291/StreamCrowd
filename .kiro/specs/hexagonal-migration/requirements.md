# Requirements Document

## Introduction

Este documento define los requisitos para completar la migración a arquitectura hexagonal de TwitchVote Live. El objetivo es eliminar los servicios y hooks legacy, consolidando toda la lógica en la estructura hexagonal existente (`src/domain`, `src/application`, `src/infrastructure`).

## Glossary

- **Domain**: Capa de lógica de negocio pura sin dependencias externas
- **Application**: Capa de orquestación que coordina casos de uso y adaptadores
- **Infrastructure**: Capa de implementaciones concretas (adapters, persistencia)
- **Port**: Interfaz que define un contrato para comunicación entre capas
- **Adapter**: Implementación concreta de un puerto
- **Legacy_Service**: Servicio existente en `services/` que debe migrarse
- **Legacy_Hook**: Hook existente en `hooks/` que debe migrarse
- **ModerationService**: Servicio de aplicación para validación y moderación de votos
- **StreamEventService**: Servicio de aplicación para eventos de stream (subs, raids, etc.)
- **AnalyticsService**: Servicio de aplicación para análisis de chat y métricas
- **TwitchService**: Servicio de aplicación que orquesta la conexión a Twitch

## Requirements

### Requirement 1: Migrar Servicio de Moderación

**User Story:** As a developer, I want the vote moderation logic in the hexagonal architecture, so that it's testable and decoupled from UI.

#### Acceptance Criteria

1. THE ModerationService SHALL implement all vote validation logic from `voteModerationService.ts`
2. WHEN a vote is processed, THE ModerationService SHALL validate account age, cooldowns, whitelist/blacklist, and vote changes
3. THE ModerationService SHALL calculate vote weights based on subscriber/follower status
4. THE ModerationService SHALL maintain moderation statistics (accepted, rejected by reason)
5. THE ModerationService SHALL support moderation presets (save/load/delete)
6. WHEN validation fails, THE ModerationService SHALL return the specific rejection reason
7. THE Domain SHALL include a `ModerationConfig` entity with all configuration options
8. THE Domain SHALL include a `ModerationResult` entity with validation results

### Requirement 2: Migrar Servicio de Eventos de Stream

**User Story:** As a developer, I want stream events (subs, raids, cheers) handled through the hexagonal architecture, so that they can be processed consistently.

#### Acceptance Criteria

1. THE Domain SHALL include a `StreamEvent` entity representing subs, raids, cheers, bans, etc.
2. THE Domain SHALL include an `IStreamEventProvider` port for receiving stream events
3. THE TwitchAdapter SHALL implement `IStreamEventProvider` to emit stream events
4. THE StreamEventService SHALL aggregate and store stream events per session
5. WHEN a raid event occurs, THE StreamEventService SHALL notify registered listeners
6. WHEN a subscription event occurs, THE StreamEventService SHALL categorize by tier (Prime, 1000, 2000, 3000)
7. THE StreamEventService SHALL provide methods to query events by type and time range

### Requirement 3: Migrar Servicio de Analytics

**User Story:** As a developer, I want chat analytics in the hexagonal architecture, so that analysis logic is reusable and testable.

#### Acceptance Criteria

1. THE AnalyticsService SHALL implement chat sentiment analysis from `chatAnalysisService.ts`
2. THE AnalyticsService SHALL calculate engagement metrics (messages/min, unique users, activity level)
3. THE AnalyticsService SHALL detect special moods (hype, love, angry, sad, surprised)
4. THE AnalyticsService SHALL generate word clouds and top emotes
5. THE AnalyticsService SHALL support AI-powered analysis via configurable providers (Gemini, OpenAI, Anthropic)
6. THE Domain SHALL include a `ChatMetrics` entity with all analysis results
7. THE Domain SHALL include an `AIProvider` port for AI-powered analysis
8. WHEN AI is not configured, THE AnalyticsService SHALL fall back to local analysis

### Requirement 4: Migrar Conexión Twitch

**User Story:** As a developer, I want Twitch connection management in the hexagonal architecture, so that it's decoupled from React components.

#### Acceptance Criteria

1. THE TwitchAdapter SHALL handle connection, disconnection, and reconnection with exponential backoff
2. THE TwitchAdapter SHALL support collaboration channels (multi-channel chat)
3. THE TwitchAdapter SHALL emit connection status changes via callbacks
4. THE TwitchService SHALL orchestrate TwitchAdapter and provide a clean API
5. WHEN connection fails, THE TwitchService SHALL attempt reconnection up to configurable max attempts
6. THE TwitchService SHALL support OAuth token management and expiration warnings
7. THE Domain SHALL include an `IAuthProvider` port for authentication

### Requirement 5: Consolidar Hooks de Aplicación

**User Story:** As a developer, I want all React hooks to use application services, so that UI is decoupled from business logic.

#### Acceptance Criteria

1. THE `usePoll` hook SHALL use `PollService` from application layer
2. THE `useModeration` hook SHALL use `ModerationService` from application layer
3. THE `useStreamEvents` hook SHALL use `StreamEventService` from application layer
4. THE `useTwitchConnection` hook SHALL use `TwitchService` from application layer
5. THE `useAIAnalytics` hook SHALL use `AnalyticsService` from application layer
6. WHEN a legacy hook is replaced, THE new hook SHALL maintain the same public API
7. THE legacy hooks in `hooks/` SHALL be removed after migration

### Requirement 6: Eliminar Servicios Legacy

**User Story:** As a developer, I want all legacy services removed, so that there's a single source of truth for business logic.

#### Acceptance Criteria

1. WHEN migration is complete, THE `services/twitchService.ts` SHALL be removed
2. WHEN migration is complete, THE `services/voteModerationService.ts` SHALL be removed
3. WHEN migration is complete, THE `services/chatAnalysisService.ts` SHALL be removed
4. WHEN migration is complete, THE `services/aiAnalyticsService.ts` SHALL be removed
5. WHEN migration is complete, THE `services/twitchOAuth.ts` SHALL be integrated into TwitchAdapter
6. WHEN migration is complete, THE `services/firebaseSync.ts` SHALL use existing `FirebaseSyncAdapter`
7. ALL imports from `services/` SHALL be updated to use `src/application/services/`

### Requirement 7: Mantener Compatibilidad

**User Story:** As a user, I want the app to work exactly the same after migration, so that my workflow is not disrupted.

#### Acceptance Criteria

1. THE app SHALL maintain all existing functionality after migration
2. THE app SHALL pass all existing tests after migration
3. THE app SHALL build without errors after migration
4. WHEN a component uses a migrated service, THE behavior SHALL be identical to before
5. THE localStorage keys and data formats SHALL remain compatible
6. THE overlay sync functionality SHALL continue working across browser tabs

### Requirement 8: Estructura de Carpetas Final

**User Story:** As a developer, I want a clean folder structure, so that the codebase is easy to navigate.

#### Acceptance Criteria

1. THE `src/domain/entities/` SHALL contain: Poll, Vote, StreamEvent, ModerationConfig, ChatMetrics, User
2. THE `src/domain/ports/` SHALL contain: IChatProvider, IOBSController, IOverlaySync, IStorage, IStreamEventProvider, IAuthProvider, IAIProvider
3. THE `src/application/services/` SHALL contain: PollService, ChatService, GameService, OBSService, ModerationService, StreamEventService, AnalyticsService, TwitchService
4. THE `src/application/hooks/` SHALL contain all React hooks that use application services
5. THE `src/infrastructure/adapters/` SHALL contain: TwitchAdapter, OBSWebSocketAdapter, LocalStorageAdapter, FirebaseSyncAdapter
6. WHEN migration is complete, THE `services/` folder SHALL be empty or removed
7. WHEN migration is complete, THE `hooks/` folder SHALL only contain re-exports from `src/application/hooks/`
