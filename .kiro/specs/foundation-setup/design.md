# Design Document - Foundation Setup

## Overview

The Foundation Setup design establishes the technical infrastructure for StreamCrowd's refactoring. It implements a feature-based, hexagonal architecture with centralized state management using Redux Toolkit. This design enables scalability, testability, and maintainability for all subsequent features.

**Key Principles:**
- Separation of concerns (domain, application, infrastructure, presentation)
- Feature-based organization for easy navigation
- Type-safe state management with Redux Toolkit
- Centralized configuration and validation
- Clear dependency management

---

## Architecture

### Layered Architecture with Feature-Based Organization

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  (React Components, Hooks, Pages, Layouts)                 │
│  └─ features/poll, features/giveaway, features/games       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  (Redux Slices, Services, Custom Hooks)                    │
│  └─ state/slices, services/, hooks/                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                        │
│  (APIs, Adapters, Repositories, Logging)                   │
│  └─ adapters/, repositories/, api/, logging/               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                            │
│  (Entities, Types, Validation Schemas, Business Logic)     │
│  └─ entities/, types/, schemas/, services/                 │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Poll.ts
│   │   ├── Giveaway.ts
│   │   ├── Game.ts
│   │   └── User.ts
│   ├── services/
│   │   ├── PollDomainService.ts
│   │   ├── GiveawayDomainService.ts
│   │   └── GameDomainService.ts
│   ├── schemas/
│   │   ├── validation.ts
│   │   ├── pollSchema.ts
│   │   ├── giveawaySchema.ts
│   │   └── gameSchema.ts
│   ├── errors/
│   │   └── AppErrors.ts
│   └── types/
│       └── index.ts
│
├── application/
│   ├── state/
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── pollSlice.ts
│   │       ├── giveawaySlice.ts
│   │       ├── gamesSlice.ts
│   │       ├── authSlice.ts
│   │       └── uiSlice.ts
│   ├── services/
│   │   ├── PollService.ts
│   │   ├── GiveawayService.ts
│   │   └── GameService.ts
│   └── hooks/
│       ├── usePoll.ts
│       ├── useGiveaway.ts
│       └── useGame.ts
│
├── infrastructure/
│   ├── adapters/
│   │   ├── TwitchAdapter.ts
│   │   ├── FirebaseAdapter.ts
│   │   ├── OBSAdapter.ts
│   │   └── WebSocketAdapter.ts
│   ├── repositories/
│   │   ├── PollRepository.ts
│   │   ├── GiveawayRepository.ts
│   │   └── UserRepository.ts
│   ├── api/
│   │   ├── twitchApi.ts
│   │   ├── firebaseApi.ts
│   │   └── RequestDeduplicator.ts
│   ├── logging/
│   │   └── LogService.ts
│   └── persistence/
│       └── StorageManager.ts
│
└── presentation/
    ├── components/
    │   ├── shared/
    │   │   ├── Button.tsx
    │   │   ├── Tooltip.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   └── LoadingSpinner.tsx
    │   ├── features/
    │   │   ├── poll/
    │   │   │   ├── PollCreator.tsx
    │   │   │   ├── PollOverlay.tsx
    │   │   │   └── usePoll.ts
    │   │   ├── giveaway/
    │   │   │   ├── GiveawayHub.tsx
    │   │   │   ├── GiveawayForm.tsx
    │   │   │   └── useGiveaway.ts
    │   │   ├── games/
    │   │   │   ├── GameSelector.tsx
    │   │   │   ├── VeoVeo/
    │   │   │   ├── Fishing/
    │   │   │   └── ...
    │   │   └── ...
    │   ├── layouts/
    │   │   ├── MainLayout.tsx
    │   │   ├── OverlayLayout.tsx
    │   │   └── AdminLayout.tsx
    │   ├── pages/
    │   │   ├── HomePage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   └── OverlayPage.tsx
    │   └── providers/
    │       ├── AppProvider.tsx
    │       └── ErrorProvider.tsx
    └── hooks/
        ├── useDebounce.ts
        ├── useThrottle.ts
        └── useRetry.ts

types/
├── api.ts
├── domain.ts
└── state.ts
```

---

## Components and Interfaces

### Redux Store Configuration

```typescript
// src/application/state/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persistConfig = {
  key: 'streamcrowd',
  storage,
  whitelist: ['poll', 'giveaway', 'auth'],
  blacklist: ['ui', 'connection'],
};

export const store = configureStore({
  reducer: {
    poll: pollReducer,
    giveaway: giveawayReducer,
    games: gamesReducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Custom Hooks for Type-Safe Redux Access

```typescript
// src/application/state/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T) =>
  useSelector(selector);
```

### ESLint Configuration for Circular Imports

```json
// .eslintrc.json
{
  "plugins": ["import"],
  "rules": {
    "import/no-cycle": ["error", { "maxDepth": "∞" }],
    "import/no-self-import": "error"
  }
}
```

### Validation Schema Example

```typescript
// src/domain/schemas/validation.ts
import { z } from 'zod';

export const MessageSchema = z.object({
  username: z.string().min(1).max(25),
  message: z.string().min(1).max(500),
  timestamp: z.date(),
});

export const PollSchema = z.object({
  title: z.string().min(1).max(100),
  options: z.array(z.string()).min(2).max(5),
  duration: z.number().min(10).max(3600),
});

export type Message = z.infer<typeof MessageSchema>;
export type Poll = z.infer<typeof PollSchema>;
```

---

## Data Models

### Redux State Structure

```typescript
interface PollState {
  active: Poll | null;
  history: Poll[];
  isCreating: boolean;
  error: string | null;
}

interface GiveawayState {
  active: Giveaway | null;
  history: Giveaway[];
  isSelecting: boolean;
  error: string | null;
}

interface GamesState {
  active: Game | null;
  scores: Record<string, number>;
  error: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UIState {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  notifications: Notification[];
}

interface RootState {
  poll: PollState;
  giveaway: GiveawayState;
  games: GamesState;
  auth: AuthState;
  ui: UIState;
}
```

---

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Redux Store Initialization
**For any** application startup, the Redux store SHALL be initialized with default state and DevTools middleware SHALL be available in development mode.
**Validates: Requirements 2.1, 2.2**

### Property 2: State Persistence Round-Trip
**For any** Redux state change, persisting to localStorage and reloading the page SHALL restore the exact same state.
**Validates: Requirements 2.3**

### Property 3: Custom Hooks Type Safety
**For any** component using `useAppDispatch` and `useAppSelector`, the TypeScript compiler SHALL enforce correct types for dispatch and selector functions.
**Validates: Requirements 2.4**

### Property 4: Circular Import Prevention
**For any** import statement in the codebase, ESLint with `import/no-cycle` rule SHALL detect and report circular dependencies.
**Validates: Requirements 3.2**

### Property 5: Validation Schema Correctness
**For any** data validated with Zod schemas, invalid data SHALL be rejected and valid data SHALL pass validation.
**Validates: Requirements 4.2**

### Property 6: Directory Structure Compliance
**For any** new file added to the project, the file SHALL be placed in the correct layer directory (domain, application, infrastructure, or presentation).
**Validates: Requirements 1.1, 1.2**

### Property 7: Dependency Documentation Completeness
**For any** package in package.json, the DEPENDENCIES.md file SHALL contain an entry documenting its purpose.
**Validates: Requirements 5.2**

### Property 8: Build Success
**For any** code committed to the repository, `npm run build` SHALL complete successfully without errors.
**Validates: Requirements 6.3**

---

## Error Handling

### Error Types

```typescript
// src/domain/errors/AppErrors.ts
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### Error Handling Strategy

1. **Validation Errors:** Caught at input validation layer, user receives clear feedback
2. **Authentication Errors:** Caught at auth layer, user redirected to login
3. **Network Errors:** Caught at API layer, retry logic applied
4. **Unexpected Errors:** Caught by Error Boundaries, logged for debugging

---

## Testing Strategy

### Unit Testing

- Test Redux slices with various actions
- Test validation schemas with valid/invalid data
- Test custom hooks in isolation
- Test utility functions

**Framework:** Vitest  
**Coverage Target:** >80%

### Integration Testing

- Test Redux store with multiple slices
- Test component integration with Redux
- Test API calls with mock data

**Framework:** Vitest + React Testing Library

### End-to-End Testing

- Test complete user flows
- Test persistence and reload
- Test error scenarios

**Framework:** Playwright

### Property-Based Testing

Each correctness property SHALL have a corresponding property-based test:

```typescript
// tests/properties/redux.property.ts
import { test, expect } from 'vitest';
import fc from 'fast-check';

test('Property 2: State Persistence Round-Trip', () => {
  fc.assert(
    fc.property(fc.object(), (state) => {
      // Simulate persistence
      const serialized = JSON.stringify(state);
      const deserialized = JSON.parse(serialized);
      
      // Verify round-trip
      expect(deserialized).toEqual(state);
    })
  );
});
```

---

## Implementation Notes

### Phase 1 Deliverables

1. ✅ Directory structure created
2. ✅ Redux store configured with persistence
3. ✅ ESLint configured for circular imports
4. ✅ Security libraries installed
5. ✅ Validation schemas created
6. ✅ DEPENDENCIES.md documented
7. ✅ STRUCTURE.md documented
8. ✅ All tests passing

### Dependencies

- Requires Node.js 18+
- Requires npm 9+
- No external API dependencies for this phase

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Developers unfamiliar with new structure | Provide clear documentation and examples |
| Circular imports in existing code | Run ESLint early and fix incrementally |
| Redux learning curve | Provide Redux Toolkit templates and examples |
| State persistence issues | Test thoroughly with different browsers |

---

## Design Decisions

### Why Hexagonal Architecture?

- **Separation of Concerns:** Each layer has clear responsibilities
- **Testability:** Domain logic can be tested without UI or external services
- **Flexibility:** Easy to swap implementations (e.g., different APIs)
- **Scalability:** New features can be added without affecting existing code

### Why Redux Toolkit?

- **Developer Experience:** Less boilerplate than vanilla Redux
- **DevTools:** Built-in debugging capabilities
- **Middleware:** Easy to add cross-cutting concerns
- **Persistence:** Works well with redux-persist

### Why Feature-Based Organization?

- **Discoverability:** All code for a feature is in one place
- **Modularity:** Features can be developed independently
- **Scalability:** Easy to add new features
- **Maintenance:** Changes to a feature don't affect other features

---

**Design Status:** ✅ Complete and Ready for Implementation
