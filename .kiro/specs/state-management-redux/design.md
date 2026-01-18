# Design Document - State Management Redux

## Overview

This design document describes the implementation of centralized state management using Redux Toolkit for StreamCrowd. The design migrates existing Context API state to Redux slices, implements persistence, and creates typed hooks for state access.

**Key Principles:**
- Single source of truth for application state
- Type-safe state access with TypeScript
- Memoized selectors for performance
- Persistence for user experience
- DevTools for debugging

---

## Architecture

### Redux Store Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      REDUX STORE                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  pollSlice  │  │giveawaySlice│  │  gamesSlice │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  authSlice  │  │   uiSlice   │  │connectionSlice│       │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     MIDDLEWARE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ serializable│  │   logger    │  │   persist   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    PERSISTENCE                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              redux-persist + localStorage            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → useAppDispatch → Action → Middleware → Reducer → State → useAppSelector → Component
```

---

## Components and Interfaces

### Store Configuration

```typescript
// src/application/state/store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import pollReducer from './slices/pollSlice';
import giveawayReducer from './slices/giveawaySlice';
import gamesReducer from './slices/gamesSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import connectionReducer from './slices/connectionSlice';

const rootReducer = combineReducers({
  poll: pollReducer,
  giveaway: giveawayReducer,
  games: gamesReducer,
  auth: authReducer,
  ui: uiReducer,
  connection: connectionReducer,
});

const persistConfig = {
  key: 'streamcrowd',
  storage,
  whitelist: ['poll', 'giveaway', 'auth', 'ui'],
  blacklist: ['connection'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Custom Hooks

```typescript
// src/application/state/hooks.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Poll Slice

```typescript
// src/application/state/slices/pollSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdAt: string;
  endsAt?: string;
  status: 'active' | 'ended';
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollState {
  active: Poll | null;
  history: Poll[];
  isCreating: boolean;
  error: string | null;
}

const initialState: PollState = {
  active: null,
  history: [],
  isCreating: false,
  error: null,
};

const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    createPoll: (state, action: PayloadAction<Omit<Poll, 'id' | 'createdAt' | 'status'>>) => {
      state.active = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      state.isCreating = false;
    },
    addVote: (state, action: PayloadAction<{ optionId: string }>) => {
      if (state.active) {
        const option = state.active.options.find(o => o.id === action.payload.optionId);
        if (option) option.votes += 1;
      }
    },
    endPoll: (state) => {
      if (state.active) {
        state.active.status = 'ended';
        state.history.unshift(state.active);
        state.active = null;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { createPoll, addVote, endPoll, clearError } = pollSlice.actions;
export default pollSlice.reducer;

// Selectors
export const selectActivePoll = (state: RootState) => state.poll.active;
export const selectPollHistory = (state: RootState) => state.poll.history;
export const selectPollError = (state: RootState) => state.poll.error;
```

### Giveaway Slice

```typescript
// src/application/state/slices/giveawaySlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Participant {
  id: string;
  username: string;
  platform: 'twitch' | 'youtube';
  joinedAt: string;
}

interface Giveaway {
  id: string;
  title: string;
  participants: Participant[];
  winner: Participant | null;
  createdAt: string;
  status: 'active' | 'selecting' | 'ended';
}

interface GiveawayState {
  active: Giveaway | null;
  history: Giveaway[];
  isSelecting: boolean;
  error: string | null;
}

const initialState: GiveawayState = {
  active: null,
  history: [],
  isSelecting: false,
  error: null,
};

const giveawaySlice = createSlice({
  name: 'giveaway',
  initialState,
  reducers: {
    createGiveaway: (state, action: PayloadAction<{ title: string }>) => {
      state.active = {
        id: crypto.randomUUID(),
        title: action.payload.title,
        participants: [],
        winner: null,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
    },
    addParticipant: (state, action: PayloadAction<Omit<Participant, 'id' | 'joinedAt'>>) => {
      if (state.active) {
        state.active.participants.push({
          ...action.payload,
          id: crypto.randomUUID(),
          joinedAt: new Date().toISOString(),
        });
      }
    },
    selectWinner: (state) => {
      if (state.active && state.active.participants.length > 0) {
        state.isSelecting = true;
        const randomIndex = Math.floor(Math.random() * state.active.participants.length);
        state.active.winner = state.active.participants[randomIndex];
        state.active.status = 'selecting';
      }
    },
    confirmWinner: (state) => {
      if (state.active) {
        state.active.status = 'ended';
        state.isSelecting = false;
      }
    },
    endGiveaway: (state) => {
      if (state.active) {
        state.history.unshift(state.active);
        state.active = null;
      }
    },
  },
});

export const { createGiveaway, addParticipant, selectWinner, confirmWinner, endGiveaway } = giveawaySlice.actions;
export default giveawaySlice.reducer;
```

### Auth Slice

```typescript
// src/application/state/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  platform: 'twitch' | 'youtube' | 'firebase';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
```

---

## Data Models

### State Structure

```typescript
interface RootState {
  poll: PollState;
  giveaway: GiveawayState;
  games: GamesState;
  auth: AuthState;
  ui: UIState;
  connection: ConnectionState;
}

interface UIState {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications: Notification[];
  sidebarCollapsed: boolean;
}

interface ConnectionState {
  twitch: ConnectionStatus;
  obs: ConnectionStatus;
  firebase: ConnectionStatus;
}

interface ConnectionStatus {
  connected: boolean;
  error: string | null;
  lastConnected: string | null;
}
```

---

## Correctness Properties

### Property 1: State Immutability
**For any** Redux action dispatched, the state SHALL be updated immutably (no direct mutations).
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

### Property 2: Selector Memoization
**For any** selector called with the same state, the result SHALL be cached and not recalculated.
**Validates: Requirements 2.6, 9.4**

### Property 3: Persistence Round-Trip
**For any** state change to a whitelisted slice, the state SHALL be persisted and correctly restored on reload.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 4: Type Safety
**For any** dispatch or selector call, TypeScript SHALL enforce correct types at compile time.
**Validates: Requirements 1.4, 9.1, 9.2, 9.5**

### Property 5: DevTools Integration
**For any** action dispatched in development, Redux DevTools SHALL display the action and state change.
**Validates: Requirements 1.2, 1.5**

### Property 6: Context API Removal
**For any** application state access, Context API SHALL NOT be used (only Redux).
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 7: Slice Isolation
**For any** slice reducer, the reducer SHALL only modify its own slice of state.
**Validates: Requirements 2.1, 3.1, 4.1, 5.1, 6.1, 7.1**

### Property 8: Error Handling
**For any** async action that fails, the slice SHALL store the error message and update loading state.
**Validates: Requirements 5.3, 7.4**

---

## Error Handling

### Error States in Slices

Each slice includes error handling:

```typescript
interface SliceState {
  // ... other fields
  isLoading: boolean;
  error: string | null;
}

// In reducers:
setError: (state, action: PayloadAction<string>) => {
  state.error = action.payload;
  state.isLoading = false;
},
clearError: (state) => {
  state.error = null;
},
```

### Async Error Handling

```typescript
// Using createAsyncThunk
export const fetchPollData = createAsyncThunk(
  'poll/fetchData',
  async (pollId: string, { rejectWithValue }) => {
    try {
      const response = await api.getPoll(pollId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// In slice extraReducers:
builder
  .addCase(fetchPollData.pending, (state) => {
    state.isLoading = true;
  })
  .addCase(fetchPollData.fulfilled, (state, action) => {
    state.active = action.payload;
    state.isLoading = false;
  })
  .addCase(fetchPollData.rejected, (state, action) => {
    state.error = action.payload as string;
    state.isLoading = false;
  });
```

---

## Testing Strategy

### Unit Tests for Slices

```typescript
// tests/unit/slices/pollSlice.test.ts
import { describe, it, expect } from 'vitest';
import pollReducer, { createPoll, addVote, endPoll } from './pollSlice';

describe('pollSlice', () => {
  it('should create a poll', () => {
    const initialState = { active: null, history: [], isCreating: false, error: null };
    const action = createPoll({ title: 'Test Poll', options: [] });
    const state = pollReducer(initialState, action);
    
    expect(state.active).not.toBeNull();
    expect(state.active?.title).toBe('Test Poll');
  });

  it('should add a vote', () => {
    const initialState = {
      active: {
        id: '1',
        title: 'Test',
        options: [{ id: 'opt1', text: 'Option 1', votes: 0 }],
        createdAt: '',
        status: 'active' as const,
      },
      history: [],
      isCreating: false,
      error: null,
    };
    
    const action = addVote({ optionId: 'opt1' });
    const state = pollReducer(initialState, action);
    
    expect(state.active?.options[0].votes).toBe(1);
  });
});
```

### Integration Tests

```typescript
// tests/integration/store.test.ts
import { describe, it, expect } from 'vitest';
import { store } from './store';
import { createPoll, endPoll } from './slices/pollSlice';

describe('Redux Store Integration', () => {
  it('should handle poll lifecycle', () => {
    store.dispatch(createPoll({ title: 'Test', options: [] }));
    expect(store.getState().poll.active).not.toBeNull();
    
    store.dispatch(endPoll());
    expect(store.getState().poll.active).toBeNull();
    expect(store.getState().poll.history.length).toBe(1);
  });
});
```

---

## Migration Strategy

### Phase 1: Setup (Day 1-2)
1. Install Redux Toolkit and redux-persist
2. Create store configuration
3. Create custom hooks
4. Connect store to App.tsx

### Phase 2: Poll Migration (Day 2-3)
1. Create pollSlice
2. Create poll selectors
3. Update poll components to use Redux
4. Remove poll Context

### Phase 3: Giveaway Migration (Day 3-4)
1. Create giveawaySlice
2. Create giveaway selectors
3. Update giveaway components
4. Remove giveaway Context

### Phase 4: Games Migration (Day 4-5)
1. Create gamesSlice
2. Create game selectors
3. Update game components
4. Remove games Context

### Phase 5: Auth Migration (Day 5-6)
1. Create authSlice
2. Create auth selectors
3. Update auth components
4. Remove auth Context

### Phase 6: UI & Connection (Day 6-7)
1. Create uiSlice and connectionSlice
2. Update UI components
3. Remove remaining Contexts

### Phase 7: Cleanup (Day 7-8)
1. Remove all Context files
2. Update tests
3. Verify persistence
4. Performance testing

---

**Design Status:** ✅ Complete and Ready for Implementation
