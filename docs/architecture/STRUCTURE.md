# Project Structure Documentation

This document describes the directory structure of StreamCrowd, following a **Hexagonal Architecture** (also known as Ports and Adapters) combined with **Feature-Based Organization**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  React Components, Hooks, Pages, Layouts, Providers        │
│  src/presentation/                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  Redux State, Services, Use Cases, Application Hooks       │
│  src/application/                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                        │
│  APIs, Adapters, Repositories, Firebase, Persistence       │
│  src/infrastructure/                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                            │
│  Entities, Types, Schemas, Ports, Domain Services          │
│  src/domain/                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── domain/              # Core business logic (innermost layer)
│   ├── entities/        # Business entities and models
│   ├── errors/          # Custom error types
│   ├── ports/           # Interfaces for external dependencies
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Domain services (pure business logic)
│   └── types/           # TypeScript type definitions
│
├── application/         # Application orchestration layer
│   ├── adapters/        # Adapters connecting domain to infrastructure
│   ├── games/           # Game-specific application logic
│   ├── hooks/           # Application-level React hooks
│   ├── services/        # Application services (use cases)
│   ├── state/           # Redux store, slices, and state hooks
│   └── utils/           # Application utilities
│
├── infrastructure/      # External systems integration
│   ├── adapters/        # External service adapters (Twitch, OBS)
│   ├── api/             # API clients and request handling
│   ├── auth/            # Authentication implementations
│   ├── factories/       # Factory patterns for object creation
│   ├── firebase/        # Firebase integration
│   ├── logging/         # Logging services
│   ├── persistence/     # Local storage, IndexedDB
│   ├── repositories/    # Data access implementations
│   └── sync/            # Data synchronization services
│
├── presentation/        # UI layer (outermost layer)
│   ├── components/      # React components
│   ├── hooks/           # UI-specific hooks
│   ├── layouts/         # Page layouts
│   ├── pages/           # Page components
│   └── providers/       # React context providers
│
├── integrations/        # Third-party integrations
│   ├── adapters/        # Integration adapters
│   └── services/        # Integration services
│
├── plugins/             # Plugin system
│   ├── sdk/             # Plugin SDK
│   └── services/        # Plugin services
│
├── collaboration/       # Collaboration features
│   └── services/        # Collaboration services
│
├── api/                 # REST API (if applicable)
│   ├── controllers/     # API controllers
│   ├── docs/            # API documentation
│   ├── middleware/      # API middleware
│   ├── routes/          # API routes
│   └── services/        # API services
│
├── services/            # Legacy services (being migrated)
└── styles/              # Global CSS styles
    ├── components.css   # Component styles
    ├── responsive.css   # Responsive design
    ├── tokens.css       # Design tokens
    └── utilities.css    # Utility classes
```

---

## Layer Descriptions

### Domain Layer (`src/domain/`)

The **innermost layer** containing pure business logic with no external dependencies.

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `entities/` | Business objects with behavior | `Poll.ts`, `Giveaway.ts`, `Game.ts` |
| `errors/` | Custom error classes | `ValidationError.ts`, `AuthError.ts` |
| `ports/` | Interfaces for external dependencies | `IPollRepository.ts`, `IAuthService.ts` |
| `schemas/` | Zod validation schemas | `pollSchema.ts`, `userSchema.ts` |
| `services/` | Domain services (pure logic) | `PollDomainService.ts` |
| `types/` | TypeScript type definitions | `index.ts` |

**Rules:**
- ✅ No imports from other layers
- ✅ Pure TypeScript, no React
- ✅ No external library dependencies (except Zod for validation)
- ✅ Contains business rules and validation


### Application Layer (`src/application/`)

The **orchestration layer** that coordinates domain logic and infrastructure.

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `adapters/` | Connect domain to infrastructure | `PollAdapter.ts` |
| `games/` | Game-specific application logic | `VeoVeoService.ts` |
| `hooks/` | Application-level React hooks | `usePollService.ts` |
| `services/` | Use cases and application services | `PollService.ts`, `GiveawayService.ts` |
| `state/` | Redux store and slices | `store.ts`, `pollSlice.ts` |
| `utils/` | Application utilities | `formatters.ts` |

**Rules:**
- ✅ Can import from `domain/`
- ✅ Cannot import from `presentation/`
- ✅ Orchestrates business logic
- ✅ Contains Redux state management

---

### Infrastructure Layer (`src/infrastructure/`)

The **external systems layer** handling all I/O operations.

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `adapters/` | External service adapters | `TwitchAdapter.ts`, `OBSAdapter.ts` |
| `api/` | API clients | `twitchApi.ts`, `RequestDeduplicator.ts` |
| `auth/` | Authentication implementations | `TwitchAuth.ts` |
| `factories/` | Object creation patterns | `ServiceFactory.ts` |
| `firebase/` | Firebase integration | `FirebaseService.ts` |
| `logging/` | Logging services | `LogService.ts` |
| `persistence/` | Storage implementations | `StorageManager.ts`, `IndexedDBService.ts` |
| `repositories/` | Data access implementations | `PollRepository.ts` |
| `sync/` | Data synchronization | `SyncService.ts` |

**Rules:**
- ✅ Can import from `domain/` and `application/`
- ✅ Cannot import from `presentation/`
- ✅ Implements interfaces defined in `domain/ports/`
- ✅ Handles all external I/O (APIs, storage, etc.)

---

### Presentation Layer (`src/presentation/`)

The **UI layer** containing all React components and UI logic.

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `components/` | React components | `PollCreator.tsx`, `GiveawayHub.tsx` |
| `hooks/` | UI-specific hooks | `useDebounce.ts`, `useThrottle.ts` |
| `layouts/` | Page layouts | `MainLayout.tsx`, `OverlayLayout.tsx` |
| `pages/` | Page components | `DashboardPage.tsx` |
| `providers/` | React context providers | `AppProvider.tsx` |

**Rules:**
- ✅ Can import from all other layers
- ✅ Contains only UI-related code
- ✅ Uses hooks from `application/` for business logic
- ✅ No direct API calls (use infrastructure services)

---

## Where to Place New Code

### Decision Tree

```
Is it a React component or UI-related?
├── YES → src/presentation/
│   ├── Reusable component? → components/
│   ├── Page component? → pages/
│   ├── Layout? → layouts/
│   ├── Context provider? → providers/
│   └── UI hook? → hooks/
│
└── NO → Continue...

Does it interact with external services (API, storage, Firebase)?
├── YES → src/infrastructure/
│   ├── API client? → api/
│   ├── Firebase? → firebase/
│   ├── Local storage? → persistence/
│   ├── External adapter? → adapters/
│   └── Data access? → repositories/
│
└── NO → Continue...

Does it orchestrate business logic or manage state?
├── YES → src/application/
│   ├── Redux slice? → state/slices/
│   ├── Use case/service? → services/
│   ├── Application hook? → hooks/
│   └── Utility? → utils/
│
└── NO → src/domain/
    ├── Business entity? → entities/
    ├── Validation schema? → schemas/
    ├── Interface/port? → ports/
    ├── Custom error? → errors/
    ├── Type definition? → types/
    └── Pure business logic? → services/
```

---

## Examples

### Example 1: Adding a New Feature (Countdown Timer)

```
src/
├── domain/
│   ├── entities/Timer.ts           # Timer entity with business rules
│   ├── schemas/timerSchema.ts      # Zod validation for timer data
│   └── ports/ITimerRepository.ts   # Interface for timer persistence
│
├── application/
│   ├── services/TimerService.ts    # Timer use cases
│   ├── state/slices/timerSlice.ts  # Redux state for timers
│   └── hooks/useTimerService.ts    # Hook to access timer service
│
├── infrastructure/
│   └── repositories/TimerRepository.ts  # Timer persistence implementation
│
└── presentation/
    └── components/
        └── timer/
            ├── TimerDisplay.tsx    # Timer UI component
            └── TimerControls.tsx   # Timer control buttons
```

### Example 2: Adding an External Integration (Discord)

```
src/
├── domain/
│   └── ports/IDiscordAdapter.ts    # Interface for Discord operations
│
├── infrastructure/
│   └── adapters/DiscordAdapter.ts  # Discord API implementation
│
├── application/
│   └── services/DiscordService.ts  # Discord use cases
│
└── presentation/
    └── components/
        └── integrations/
            └── DiscordPanel.tsx    # Discord settings UI
```

### Example 3: Adding a Validation Schema

```typescript
// src/domain/schemas/countdownSchema.ts
import { z } from 'zod';

export const CountdownSchema = z.object({
  duration: z.number().min(1).max(3600),
  title: z.string().min(1).max(100),
  autoStart: z.boolean().default(false),
});

export type Countdown = z.infer<typeof CountdownSchema>;
```

---

## Import Rules

### Allowed Imports

| From Layer | Can Import From |
|------------|-----------------|
| `domain/` | Nothing (no external imports) |
| `application/` | `domain/` |
| `infrastructure/` | `domain/`, `application/` |
| `presentation/` | All layers |

### Forbidden Imports

| From Layer | Cannot Import From |
|------------|-------------------|
| `domain/` | `application/`, `infrastructure/`, `presentation/` |
| `application/` | `infrastructure/`, `presentation/` |
| `infrastructure/` | `presentation/` |

### ESLint Enforcement

Circular imports are detected by ESLint with `eslint-plugin-import`:

```json
{
  "rules": {
    "import/no-cycle": ["error", { "maxDepth": "∞" }]
  }
}
```

Run `npm run lint` to check for violations.

---

## Legacy Code

Some code still exists outside the hexagonal structure:

| Directory | Status | Migration Plan |
|-----------|--------|----------------|
| `components/` | Legacy | Migrate to `src/presentation/components/` |
| `hooks/` | Legacy | Migrate to `src/application/hooks/` or `src/presentation/hooks/` |
| `types/` | Legacy | Migrate to `src/domain/types/` |
| `config/` | Keep | Configuration files stay at root |
| `constants/` | Keep | Constants stay at root |

---

## Quick Reference

| I want to... | Place it in... |
|--------------|----------------|
| Create a React component | `src/presentation/components/` |
| Add a Redux slice | `src/application/state/slices/` |
| Define a business entity | `src/domain/entities/` |
| Create a validation schema | `src/domain/schemas/` |
| Add an API client | `src/infrastructure/api/` |
| Implement a repository | `src/infrastructure/repositories/` |
| Add Firebase functionality | `src/infrastructure/firebase/` |
| Create a use case/service | `src/application/services/` |
| Define an interface/port | `src/domain/ports/` |
| Add a custom error type | `src/domain/errors/` |

---

## Related Documentation

- [DEPENDENCIES.md](./DEPENDENCIES.md) - Project dependencies documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level architecture overview
- [Design Document](./.kiro/specs/foundation-setup/design.md) - Foundation setup design

---

**Last Updated:** January 2026
