# Requirements Document - State Management Redux

## Introduction

The State Management Redux feature implements centralized state management using Redux Toolkit for StreamCrowd. This includes migrating existing Context API state to Redux slices, implementing persistence with redux-persist, and creating typed hooks for state access. This feature addresses the fragmented state management and prop drilling issues identified in the architecture analysis.

**Scope:** FASE 3 of the execution plan (Refactorización)  
**Duration:** 8 days  
**Team Size:** 2 developers  
**Priority:** 🔴 CRITICAL

---

## Glossary

- **Redux Toolkit:** Official, opinionated toolset for efficient Redux development
- **Slice:** A collection of Redux reducer logic and actions for a single feature
- **Reducer:** Pure function that takes current state and action, returns new state
- **Action:** Plain object describing what happened (type + payload)
- **Selector:** Function that extracts specific data from the Redux store
- **Dispatch:** Function to send actions to the Redux store
- **Middleware:** Code that intercepts actions before they reach the reducer
- **Persist:** Saving Redux state to localStorage for recovery after page reload
- **Rehydration:** Restoring persisted state when the application loads
- **Memoization:** Caching selector results to avoid unnecessary recalculations
- **Context API:** React's built-in state management (being replaced)
- **Prop Drilling:** Passing props through multiple component levels (anti-pattern)

---

## Requirements

### Requirement 1: Redux Store Configuration

**User Story:** As a developer, I want a centralized Redux store, so that all application state is managed in one place with DevTools support.

#### Acceptance Criteria

1. WHEN the application starts, THE Redux store SHALL be initialized with all feature slices

2. WHEN Redux DevTools browser extension is installed, THE DevTools SHALL display all state changes, actions, and time-travel debugging

3. WHEN the store is configured, THE middleware SHALL include serializable check and any custom middleware

4. WHEN a developer accesses the store, THE TypeScript types SHALL be correctly inferred for RootState and AppDispatch

5. WHEN the application runs in production, THE DevTools SHALL be disabled and logging minimized

---

### Requirement 2: Poll Feature Migration to Redux

**User Story:** As a developer, I want poll state managed by Redux, so that poll data is consistent across all components.

#### Acceptance Criteria

1. WHEN a poll is created, THE pollSlice SHALL store the poll data with title, options, and configuration

2. WHEN a vote is cast, THE pollSlice SHALL update the vote count for the selected option

3. WHEN a poll ends, THE pollSlice SHALL move the poll to history and clear the active poll

4. WHEN poll data changes, THE components SHALL re-render only if their selected data changed

5. WHEN the page is refreshed, THE poll state SHALL be restored from localStorage (if persisted)

6. WHEN a developer reads poll state, THE selectors SHALL be memoized to prevent unnecessary recalculations

---

### Requirement 3: Giveaway Feature Migration to Redux

**User Story:** As a developer, I want giveaway state managed by Redux, so that giveaway data is consistent across all components.

#### Acceptance Criteria

1. WHEN a giveaway is created, THE giveawaySlice SHALL store the giveaway data with title, participants, and configuration

2. WHEN participants are added, THE giveawaySlice SHALL update the participant list

3. WHEN a winner is selected, THE giveawaySlice SHALL store the winner and update the giveaway status

4. WHEN a giveaway ends, THE giveawaySlice SHALL move the giveaway to history

5. WHEN the page is refreshed, THE giveaway state SHALL be restored from localStorage

6. WHEN cloud sync is enabled, THE giveawaySlice SHALL sync with Firebase

---

### Requirement 4: Games Feature Migration to Redux

**User Story:** As a developer, I want games state managed by Redux, so that game data is consistent across all components.

#### Acceptance Criteria

1. WHEN a game is started, THE gamesSlice SHALL store the active game type and configuration

2. WHEN game scores change, THE gamesSlice SHALL update the scores for each player

3. WHEN a game ends, THE gamesSlice SHALL store the results and clear the active game

4. WHEN multiple games are available, THE gamesSlice SHALL track which game is currently active

5. WHEN the page is refreshed, THE game state SHALL be restored (if game was in progress)

---

### Requirement 5: Auth Feature Migration to Redux

**User Story:** As a developer, I want authentication state managed by Redux, so that auth data is accessible from any component.

#### Acceptance Criteria

1. WHEN a user logs in, THE authSlice SHALL store the user data and authentication status

2. WHEN a user logs out, THE authSlice SHALL clear all user data and reset to initial state

3. WHEN the token expires, THE authSlice SHALL update the authentication status

4. WHEN the page is refreshed, THE auth state SHALL be restored (user remains logged in)

5. WHEN auth state changes, THE components SHALL react to login/logout events

6. WHEN checking authentication, THE selectors SHALL provide isAuthenticated, user, and loading states

---

### Requirement 6: UI State Management

**User Story:** As a developer, I want UI state managed by Redux, so that theme, language, and notifications are consistent.

#### Acceptance Criteria

1. WHEN the user changes theme, THE uiSlice SHALL update the theme and persist the preference

2. WHEN the user changes language, THE uiSlice SHALL update the language and persist the preference

3. WHEN a notification is shown, THE uiSlice SHALL add it to the notifications array

4. WHEN a notification is dismissed, THE uiSlice SHALL remove it from the array

5. WHEN the page is refreshed, THE UI preferences SHALL be restored from localStorage

---

### Requirement 7: Connection State Management

**User Story:** As a developer, I want connection states (Twitch, OBS, Firebase) managed by Redux, so that connection status is visible across the app.

#### Acceptance Criteria

1. WHEN Twitch connects, THE connectionSlice SHALL update the Twitch connection status

2. WHEN OBS connects, THE connectionSlice SHALL update the OBS connection status

3. WHEN Firebase connects, THE connectionSlice SHALL update the Firebase connection status

4. WHEN a connection fails, THE connectionSlice SHALL store the error message

5. WHEN checking connections, THE selectors SHALL provide status for each service

---

### Requirement 8: Redux Persistence Configuration

**User Story:** As a user, I want my application state persisted, so that I don't lose data when I refresh the page.

#### Acceptance Criteria

1. WHEN the application loads, THE persisted state SHALL be rehydrated from localStorage

2. WHEN state changes, THE persistence layer SHALL save to localStorage (debounced)

3. WHEN configuring persistence, THE whitelist SHALL include: poll, giveaway, auth, ui

4. WHEN configuring persistence, THE blacklist SHALL include: connection (transient state)

5. IF localStorage is full, THEN THE system SHALL handle the error gracefully

6. WHEN sensitive data is persisted, THE data SHALL be encrypted before storage

---

### Requirement 9: Custom Hooks for Redux Access

**User Story:** As a developer, I want typed custom hooks for Redux, so that I can access state with full TypeScript support.

#### Acceptance Criteria

1. WHEN using useAppDispatch, THE hook SHALL return a typed dispatch function

2. WHEN using useAppSelector, THE hook SHALL accept a typed selector function

3. WHEN creating feature hooks (usePoll, useGiveaway, etc.), THE hooks SHALL encapsulate Redux logic

4. WHEN a component uses a hook, THE component SHALL only re-render when selected data changes

5. WHEN a developer reads the hooks, THE TypeScript types SHALL be correctly inferred

---

### Requirement 10: Context API Removal

**User Story:** As a developer, I want Context API removed for application state, so that there's only one source of truth.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Context API SHALL NOT be used for application state

2. WHEN Context API is still needed, THE usage SHALL be limited to: theme provider, i18n provider

3. WHEN a developer searches for Context usage, THE only contexts SHALL be for non-state concerns

4. WHEN the migration is complete, THE prop drilling SHALL be eliminated for state data

---

## Notes

- This feature depends on FASE 1 (Foundation Setup) being complete
- Migration should be done incrementally, one feature at a time
- Existing tests should continue to pass during migration
- Performance should be monitored during migration
- DevTools should be used to verify state changes
