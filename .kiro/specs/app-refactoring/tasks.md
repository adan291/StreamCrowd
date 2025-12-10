# Implementation Plan

- [x] 1. Set up project structure and constants





  - [x] 1.1 Create hooks directory structure


    - Create `hooks/` folder with index.ts for exports
    - _Requirements: 1.1, 2.1, 3.1, 7.1, 8.1_
  - [x] 1.2 Create centralized storage keys constants


    - Create `constants/storageKeys.ts` with STORAGE_KEYS object
    - Move existing color constants to `constants/colors.ts`
    - Create `constants/index.ts` for exports
    - _Requirements: 4.1, 4.2, 4.3_


- [x] 2. Implement useLocalStorage hook




  - [x] 2.1 Create useLocalStorage hook with type-safe interface


    - Implement generic hook with serializer/deserializer options
    - Handle localStorage read/write with error handling
    - Support functional updates like useState
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 2.2 Write property test for localStorage round-trip


    - **Property 1: useLocalStorage Round-Trip Consistency**
    - **Validates: Requirements 5.2, 5.5**
  - [x] 2.3 Write property test for graceful degradation


    - **Property 2: useLocalStorage Graceful Degradation**
    - **Validates: Requirements 5.3**

- [x] 3. Implement usePoll hook





  - [x] 3.1 Create usePoll hook extracting poll state from App.tsx


    - Extract currentPoll, voteHistory, pastPolls, votedUserIds state
    - Implement createPoll, stopPoll, resetPoll actions
    - Implement addVote, updateVote for vote management
    - Use useLocalStorage for poll sync persistence
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.2 Write property test for poll initialization


    - **Property 3: usePoll State Initialization**
    - **Validates: Requirements 1.2**
  - [x] 3.3 Write property test for poll stop

    - **Property 4: usePoll Stop Preserves History**
    - **Validates: Requirements 1.3**
  - [x] 3.4 Write property test for poll reset

    - **Property 5: usePoll Reset Clears State**
    - **Validates: Requirements 1.4**

- [x] 4. Implement useModeration hook





  - [x] 4.1 Create useModeration hook extracting moderation state from App.tsx


    - Extract config, stats, log, userVoteStates, userWeights state
    - Implement processVote with validation logic
    - Implement reset and logEntry actions
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 4.2 Write property test for vote processing stats


    - **Property 6: useModeration Vote Processing Updates Stats**
    - **Validates: Requirements 2.2**
  - [x] 4.3 Write property test for rejection logging

    - **Property 7: useModeration Rejection Logging**
    - **Validates: Requirements 2.4**
  - [x] 4.4 Write property test for moderation reset

    - **Property 8: useModeration Reset Restores Defaults**
    - **Validates: Requirements 2.3**

- [x] 5. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. Implement useOverlay hook




  - [x] 6.1 Create useOverlay hook extracting overlay state from App.tsx


    - Extract isOverlayMode, overlay settings state
    - Implement URL parameter detection on mount
    - Implement setSettings and toggleSettings actions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.2 Write property test for URL detection


    - **Property 9: useOverlay URL Detection**
    - **Validates: Requirements 3.2, 3.4**

- [x] 7. Implement useTwitchConnection hook






  - [x] 7.1 Create useTwitchConnection hook extracting connection state from App.tsx

    - Extract status, error, channelName, channelAvatar, authToken state
    - Implement connect and disconnect actions
    - Handle avatar fetching on connect
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 7.2 Write property test for disconnect cleanup


    - **Property 10: useTwitchConnection Disconnect Cleanup**
    - **Validates: Requirements 8.3**


- [x] 8. Enhance TwitchService




  - [x] 8.1 Add strong typing to TwitchService


    - Define TwitchServiceConfig, TwitchConnectionOptions interfaces
    - Add typed callbacks for messages and status changes
    - _Requirements: 6.1, 6.4_

  - [x] 8.2 Implement exponential backoff reconnection
    - Add reconnection logic with configurable max attempts
    - Implement exponential delay calculation
    - Add onReconnectAttempt callback
    - _Requirements: 6.2, 6.3_

  - [x] 8.3 Write unit tests for TwitchService reconnection

    - Test reconnection attempts and backoff timing
    - Test max attempts exceeded behavior
    - _Requirements: 6.2, 6.3_

- [x] 9. Implement useAIAnalytics hook








  - [x] 9.1 Create useAIAnalytics hook extracting AI/mascot state from App.tsx

    - Extract aiConfig, currentSession, showConfig state
    - Extract showMascot, userDifficulty, connectionAttempts state
    - Implement session lifecycle management
    - Use useLocalStorage for AI config persistence
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Write property test for session lifecycle

    - **Property 11: useAIAnalytics Session Lifecycle**
    - **Validates: Requirements 7.3**


- [x] 10. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Refactor App.tsx to use new hooks






  - [x] 11.1 Replace inline state with hook calls

    - Import and use all custom hooks
    - Remove extracted useState calls
    - Remove extracted useEffect logic
    - _Requirements: 1.1, 2.1, 3.1, 7.1, 8.1_

  - [x] 11.2 Update component props and callbacks

    - Update child component props to use hook values
    - Update event handlers to use hook actions
    - _Requirements: 1.1, 2.1, 3.1, 7.1, 8.1_

  - [x] 11.3 Update localStorage usage to use STORAGE_KEYS

    - Replace all hardcoded localStorage keys with constants
    - _Requirements: 4.1_


- [x] 12. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
