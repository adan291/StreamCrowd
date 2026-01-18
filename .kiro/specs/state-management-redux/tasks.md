# Implementation Plan: State Management Redux

## Overview

This implementation plan migrates StreamCrowd from Context API to Redux Toolkit. The migration is done incrementally, one feature at a time, to minimize risk and ensure existing functionality continues to work.

**Duration:** 8 days  
**Team Size:** 2 developers  
**Dependencies:** Foundation Setup (FASE 1) must be complete

---

## Tasks

### Phase 1: Redux Setup (Day 1-2)

- [x] 1. Install Redux dependencies
  - Install: `@reduxjs/toolkit`, `react-redux`, `redux-persist`
  - Verify packages in package.json
  - Run `npm install` without errors
  - _Requirements: 1.1_

- [x] 2. Create Redux store configuration
  - Create `src/application/state/store.ts`
  - Configure store with combineReducers
  - Add middleware configuration
  - Configure DevTools for development only
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 3. Create custom hooks for typed access
  - Create `src/application/state/hooks.ts`
  - Implement `useAppDispatch` hook
  - Implement `useAppSelector` hook
  - Export types for RootState and AppDispatch
  - _Requirements: 1.4, 9.1, 9.2, 9.5_

- [x] 4. Configure Redux persistence
  - Configure redux-persist in store.ts
  - Set whitelist: poll, giveaway, auth, ui
  - Set blacklist: connection
  - Test persistence with page reload
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Connect Redux to App.tsx
  - Wrap App with Redux Provider
  - Wrap with PersistGate
  - Verify app renders without errors
  - Verify DevTools connection
  - _Requirements: 1.1, 1.2_

- [x]* 5.1 Write property test for store initialization
  - **Property 1: State Immutability**
  - **Property 5: DevTools Integration**
  - Test store initializes correctly

### Phase 2: Poll Migration (Day 2-3)

- [x] 6. Create pollSlice
  - Create `src/application/state/slices/pollSlice.ts`
  - Define PollState interface
  - Implement reducers: createPoll, addVote, endPoll, clearError
  - Export actions and reducer
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Create poll selectors
  - Create memoized selectors with createSelector
  - Implement: selectActivePoll, selectPollHistory, selectPollError
  - Export selectors from pollSlice
  - _Requirements: 2.4, 2.6_

- [x] 8. Create usePoll hook
  - Create `src/application/hooks/usePoll.ts`
  - Encapsulate Redux logic for poll feature
  - Return: activePoll, history, createPoll, addVote, endPoll
  - _Requirements: 9.3, 9.4_

- [x] 9. Migrate poll components to Redux
  - Update PollCreator.tsx to use usePoll
  - Update LivePoll.tsx to use usePoll
  - Update PollOverlay.tsx to use usePoll
  - Remove prop drilling for poll data
  - _Requirements: 2.4, 10.4_

- [x] 10. Remove poll Context
  - Delete PollContext.tsx (if exists)
  - Remove PollProvider from App.tsx
  - Verify poll functionality works
  - _Requirements: 10.1, 10.3_

- [x]* 10.1 Write tests for pollSlice
  - Test all reducers
  - Test selectors
  - Test persistence

### Phase 3: Giveaway Migration (Day 3-4)

- [x] 11. Create giveawaySlice
  - Create `src/application/state/slices/giveawaySlice.ts`
  - Define GiveawayState interface
  - Implement reducers: createGiveaway, addParticipant, selectWinner, endGiveaway
  - Export actions and reducer
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 12. Create giveaway selectors
  - Create memoized selectors
  - Implement: selectActiveGiveaway, selectParticipants, selectWinner
  - Export selectors
  - _Requirements: 3.4_

- [x] 13. Create useGiveaway hook
  - Create `src/application/hooks/useGiveaway.ts`
  - Encapsulate Redux logic
  - Return: activeGiveaway, participants, winner, actions
  - _Requirements: 9.3_

- [x] 14. Migrate giveaway components to Redux
  - Update GiveawayHub.tsx
  - Update GiveawayForm.tsx
  - Update GiveawayOverlay.tsx
  - Update CloudSyncButton.tsx
  - _Requirements: 3.5, 3.6_

- [x] 15. Remove giveaway Context
  - Delete GiveawayContext.tsx (if exists)
  - Remove GiveawayProvider from App.tsx
  - Verify giveaway functionality works
  - _Requirements: 10.1_

- [x]* 15.1 Write tests for giveawaySlice
  - Test all reducers
  - Test cloud sync integration

### Phase 4: Games Migration (Day 4-5)

- [x] 16. Create gamesSlice
  - Create `src/application/state/slices/gamesSlice.ts`
  - Define GamesState interface
  - Implement reducers: startGame, updateScore, endGame
  - Export actions and reducer
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 17. Create games selectors
  - Create memoized selectors
  - Implement: selectActiveGame, selectScores, selectGameHistory
  - Export selectors
  - _Requirements: 4.4_

- [x] 18. Create useGame hook
  - Create `src/application/hooks/useGame.ts`
  - Encapsulate Redux logic
  - Return: activeGame, scores, startGame, endGame
  - _Requirements: 9.3_

- [x] 19. Migrate game components to Redux
  - Update GameSelector.tsx
  - Update VeoVeo components
  - Update Fishing components
  - Update other game components
  - _Requirements: 4.5_

- [x] 20. Remove games Context
  - Delete GamesContext.tsx (if exists)
  - Remove GamesProvider from App.tsx
  - Verify all games work
  - _Requirements: 10.1_

- [ ]* 20.1 Write tests for gamesSlice
  - Test all reducers
  - Test game state persistence

### Phase 5: Auth Migration (Day 5-6)

- [x] 21. Create authSlice
  - Create `src/application/state/slices/authSlice.ts`
  - Define AuthState interface
  - Implement reducers: loginStart, loginSuccess, loginFailure, logout
  - Export actions and reducer
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 22. Create auth selectors
  - Create memoized selectors
  - Implement: selectUser, selectIsAuthenticated, selectAuthLoading
  - Export selectors
  - _Requirements: 5.6_

- [x] 23. Create useAuth hook
  - Create `src/application/hooks/useAuth.ts`
  - Encapsulate Redux logic
  - Return: user, isAuthenticated, login, logout
  - _Requirements: 9.3_

- [x] 24. Migrate auth components to Redux
  - Update login components
  - Update user profile components
  - Update protected routes
  - _Requirements: 5.4, 5.5_

- [x] 25. Remove auth Context
  - Delete AuthContext.tsx (if exists)
  - Remove AuthProvider from App.tsx
  - Verify auth functionality works
  - _Requirements: 10.1_

- [ ]* 25.1 Write tests for authSlice
  - Test login/logout flow
  - Test token persistence

### Phase 6: UI & Connection Migration (Day 6-7)

- [x] 26. Create uiSlice
  - Create `src/application/state/slices/uiSlice.ts`
  - Define UIState interface
  - Implement reducers: setTheme, setLanguage, addNotification, dismissNotification
  - Export actions and reducer
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 27. Create connectionSlice
  - Create `src/application/state/slices/connectionSlice.ts`
  - Define ConnectionState interface
  - Implement reducers: setTwitchStatus, setOBSStatus, setFirebaseStatus
  - Export actions and reducer
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 28. Create useUI and useConnection hooks
  - Create `src/application/hooks/useUI.ts`
  - Create `src/application/hooks/useConnection.ts`
  - Encapsulate Redux logic
  - _Requirements: 9.3_

- [x] 29. Migrate UI components to Redux
  - Update theme toggle
  - Update language selector
  - Update notification system
  - Update connection status indicators
  - _Requirements: 6.1, 6.2, 7.5_

- [x] 30. Remove UI and connection Contexts
  - Delete UIContext.tsx (if exists)
  - Delete ConnectionContext.tsx (if exists)
  - Verify all UI functionality works
  - _Requirements: 10.1, 10.2_

- [ ]* 30.1 Write tests for uiSlice and connectionSlice
  - Test theme persistence
  - Test connection status updates

### Phase 7: Cleanup and Verification (Day 7-8)

- [x] 31. Remove all remaining Context files
  - Search for remaining Context usage
  - Delete unused Context files
  - Update imports
  - _Requirements: 10.1, 10.3_

- [x] 32. Update all tests
  - Update unit tests to use Redux
  - Update integration tests
  - Update E2E tests if needed
  - Verify all tests pass
  - _Requirements: All_

- [x] 33. Verify persistence works correctly
  - Test poll persistence
  - Test giveaway persistence
  - Test auth persistence
  - Test UI preferences persistence
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 34. Performance testing
  - Verify no unnecessary re-renders
  - Verify selector memoization works
  - Check DevTools for action frequency
  - _Requirements: 2.4, 2.6, 9.4_

- [x] 35. Final validation and documentation
  - Verify all requirements met
  - Update documentation
  - Create migration guide
  - _Requirements: All_

- [ ]* 35.1 Run full test suite
  - Run all unit tests
  - Run all integration tests
  - Verify coverage >80%
  - Generate coverage report

---

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task should be completed in a separate branch
- Code reviews should verify Redux patterns are followed
- Existing functionality must continue to work during migration
- DevTools should be used to verify state changes

## Estimated Timeline

| Phase | Tasks | Days | Assigned To |
|-------|-------|------|-------------|
| 1. Redux Setup | 1-5 | 2 | Developer 1 |
| 2. Poll Migration | 6-10 | 1.5 | Developer 1 |
| 3. Giveaway Migration | 11-15 | 1.5 | Developer 2 |
| 4. Games Migration | 16-20 | 1.5 | Developer 1 |
| 5. Auth Migration | 21-25 | 1.5 | Developer 2 |
| 6. UI & Connection | 26-30 | 1.5 | Both |
| 7. Cleanup | 31-35 | 1.5 | Both |

**Total:** 8 days (with 2 developers working in parallel)

---

## Success Criteria

- ✅ Redux store configured and connected
- ✅ All 6 slices created and working
- ✅ All Context API removed for application state
- ✅ Persistence working for whitelisted slices
- ✅ DevTools showing all state changes
- ✅ No prop drilling for state data
- ✅ All tests passing
- ✅ No performance regressions
- ✅ Documentation updated

---

## Rollback Plan

If migration fails for a feature:

1. Revert to previous commit
2. Keep Context API for that feature
3. Continue with other features
4. Retry failed feature later

---

**Implementation Plan Status:** ✅ Ready for Execution
