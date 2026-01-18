# Implementation Plan: Hexagonal Architecture Refactoring

## Overview

This implementation plan refactors StreamCrowd's architecture to eliminate direct Firebase imports from React components, implementing proper hexagonal architecture with dependency injection. The approach is incremental, ensuring functionality is preserved while establishing clean architectural boundaries.

## Tasks

- [x] 1. Create enhanced application layer hooks
  - [x] 1.1 Create useGameSync hook in src/application/hooks/
    - Implement useGameSync hook that wraps IOverlaySync for game synchronization
    - Provide clean interface for game components: gameState, publishGameState, clearGameState, isConnected
    - Use dependency injection to access OverlaySyncService
    - _Requirements: 2.2, 2.5_

  - [x] 1.2 Create usePollSync hook in src/application/hooks/
    - Implement usePollSync hook that wraps IOverlaySync for poll synchronization
    - Provide interface: pollState, publishPollState, clearPollState, isConnected
    - Use dependency injection pattern
    - _Requirements: 2.3, 2.5_

  - [x] 1.3 Create useGiveawaySync hook in src/application/hooks/
    - Implement useGiveawaySync hook for giveaway synchronization
    - Provide interface: giveawayState, publishGiveawayState, clearGiveawayState, isConnected
    - Use dependency injection pattern
    - _Requirements: 2.4, 2.5_

  - [x] 1.4 Create useCountdownSync hook in src/application/hooks/
    - Implement useCountdownSync hook for countdown synchronization
    - Provide interface: countdownState, publishCountdownState, clearCountdownState, isConnected
    - Use dependency injection pattern
    - _Requirements: 2.1, 2.5_

  - [ ]* 1.5 Write property tests for application hooks
    - **Property 2: Application Layer Interface Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 2. Implement dependency injection infrastructure
  - [x] 2.1 Create DependencyFactory in src/infrastructure/factories/
    - Implement singleton factory for dependency injection
    - Manage IOverlaySync adapter instances
    - Provide getOverlaySyncService() method
    - Handle initialization and error recovery
    - _Requirements: 5.1, 5.4_

  - [x] 2.2 Create OverlaySyncService in src/application/services/
    - Implement service that orchestrates overlay synchronization
    - Accept IOverlaySync through constructor injection
    - Provide methods: publishGameState, subscribeToGameUpdates, publishPollState, etc.
    - _Requirements: 5.2_

  - [x] 2.3 Update existing useOverlaySync hook to use dependency injection
    - Modify hooks/useOverlaySync.ts to use DependencyFactory
    - Remove direct Firebase imports
    - Maintain existing interface for backward compatibility
    - _Requirements: 2.1, 2.5_

  - [ ]* 2.4 Write property tests for dependency injection
    - **Property 5: Dependency Injection Compliance**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 3. Checkpoint - Verify application layer setup
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor game components (Phase 1: Core games)
  - [x] 4.1 Refactor CasinoRoulette.tsx
    - Replace `import { gameSync } from '../../src/infrastructure/sync/FirebaseSync'` with `import { useGameSync } from '../../src/application/hooks/useGameSync'`
    - Update all gameSync.publish() calls to use useGameSync hook
    - Update all gameSync.subscribe() calls to use useGameSync hook
    - _Requirements: 3.1_

  - [x] 4.2 Refactor ChatFishing.tsx
    - Replace direct FirebaseSync import with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 4.3 Refactor DuckHunt.tsx
    - Replace direct FirebaseSync import with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 4.4 Refactor Battleship components (BattleshipGame.tsx, BattleshipOverlay.tsx)
    - Replace direct FirebaseSync imports with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [ ]* 4.5 Write property tests for game component refactoring
    - **Property 3: Game Components Architectural Compliance**
    - **Validates: Requirements 3.1**

- [x] 5. Refactor game components (Phase 2: Remaining games)
  - [x] 5.1 Refactor HotPotato.tsx and PotatoOverlay.tsx
    - Replace direct FirebaseSync imports with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 5.2 Refactor TriviaBattle.tsx and TriviaOverlay.tsx
    - Replace direct FirebaseSync imports with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 5.3 Refactor MemoriaIRL.tsx and MemoriaOverlay.tsx
    - Replace direct FirebaseSync imports with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 5.4 Refactor PartyCo.tsx and PartyCoOverlay.tsx
    - Replace direct FirebaseSync imports with useGameSync hook
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

  - [x] 5.5 Refactor remaining game components (PiedraPapelTijera, PiumGame, VeoVeo, Ahorcado, CarreraEmotes)
    - Replace direct FirebaseSync imports with useGameSync hook for all remaining game components
    - Update all sync operations to use hook interface
    - _Requirements: 3.1_

- [ ] 6. Refactor core overlay components
  - [ ] 6.1 Refactor PollOverlay.tsx
    - Replace `import { pollSync } from '../src/infrastructure/sync/FirebaseSync'` with `import { usePollSync } from '../src/application/hooks/usePollSync'`
    - Update all pollSync operations to use usePollSync hook
    - _Requirements: 3.2_

  - [ ] 6.2 Refactor JudgePanel.tsx
    - Replace `import { judgePanelSync } from '../src/infrastructure/sync/FirebaseSync'` with application layer service
    - Update all judgePanelSync operations to use application layer
    - _Requirements: 3.3_

  - [ ] 6.3 Refactor Countdown.tsx
    - Replace `import { countdownSync } from '../src/infrastructure/sync/FirebaseSync'` with `import { useCountdownSync } from '../src/application/hooks/useCountdownSync'`
    - Update all countdownSync operations to use useCountdownSync hook
    - _Requirements: 3.4_

  - [ ] 6.4 Refactor RandomWinnerOverlay.tsx and SpinnerWheel.tsx
    - Replace `import { giveawaySync } from '../src/infrastructure/sync/FirebaseSync'` with `import { useGiveawaySync } from '../src/application/hooks/useGiveawaySync'`
    - Update all giveawaySync operations to use useGiveawaySync hook
    - _Requirements: 3.5_

- [ ] 7. Checkpoint - Verify component refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement architecture validation
  - [ ] 8.1 Create ArchitectureValidator in src/infrastructure/validation/
    - Implement validateComponentImports() method
    - Check for direct Firebase SDK imports (firebase/database, firebase/app)
    - Check for direct FirebaseSync imports
    - Check for infrastructure layer imports in components
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 8.2 Create architecture compliance tests
    - Write tests that validate no components import from infrastructure layer
    - Write tests that validate domain layer has no external dependencies
    - Write tests that validate application layer only depends on domain layer
    - Write tests that validate infrastructure layer implements domain ports
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.3 Write property tests for architecture validation
    - **Property 1: Architectural Import Boundaries**
    - **Property 6: Architectural Layer Compliance**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 9. Implement functional equivalence validation
  - [ ] 9.1 Create MigrationValidator in src/infrastructure/validation/
    - Implement validateFunctionalEquivalence() method
    - Create test suites for poll, game, giveaway, and judge panel functionality
    - Compare before/after behavior for all features
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 9.2 Write property tests for functional equivalence
    - **Property 4: Functional Equivalence Preservation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 10. Implement backend agnosticism demonstration
  - [ ] 10.1 Create MockSyncAdapter in src/infrastructure/adapters/
    - Implement IOverlaySync interface with in-memory storage
    - Demonstrate that only infrastructure changes are needed for backend switching
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Create configuration-based backend selection
    - Add environment variable for backend selection (VITE_SYNC_BACKEND)
    - Update DependencyFactory to select adapter based on configuration
    - Support 'firebase' and 'mock' backends
    - _Requirements: 7.5_

  - [ ]* 10.3 Write property tests for backend agnosticism
    - **Property 7: Backend Agnosticism**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 11. Final integration and cleanup
  - [ ] 11.1 Remove unused FirebaseSync imports
    - Clean up any remaining direct Firebase imports
    - Remove unused FirebaseSync.ts files if no longer needed
    - Update import statements throughout codebase
    - _Requirements: 1.1, 1.2_

  - [ ] 11.2 Update ESLint rules for architecture enforcement
    - Add ESLint rules to prevent direct Firebase imports in components
    - Add rules to enforce hexagonal architecture boundaries
    - Configure build to fail on architectural violations
    - _Requirements: 6.5_

  - [ ] 11.3 Integration testing with all components
    - Test all refactored components work together
    - Verify real-time synchronization still works across all features
    - Test error handling and fallback scenarios
    - _Requirements: 4.5_

- [ ] 12. Final checkpoint - Complete validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout the refactoring process
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The refactoring is done incrementally to maintain functionality at each step