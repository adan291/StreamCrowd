# Requirements Document

## Introduction

This specification defines the requirements for refactoring StreamCrowd's architecture to properly implement hexagonal architecture principles by eliminating direct Firebase imports from React components. The goal is to achieve complete separation between the presentation layer and infrastructure layer, ensuring that changing from Firebase to another backend (like Supabase) would only require modifications in the infrastructure folder.

## Glossary

- **Component**: React presentation components in the components/ directory
- **FirebaseSync**: Direct imports from Firebase SDK or FirebaseSync.ts files
- **Application_Layer**: Services and hooks in src/application/ that orchestrate business logic
- **Infrastructure_Layer**: Adapters and implementations in src/infrastructure/
- **Domain_Layer**: Pure business logic entities and ports in src/domain/
- **Overlay_Sync**: The synchronization mechanism for real-time data updates
- **Dependency_Injection**: Pattern for providing dependencies through interfaces rather than direct imports

## Requirements

### Requirement 1: Eliminate Direct Firebase Imports

**User Story:** As a developer, I want to remove all direct Firebase imports from React components, so that the presentation layer is decoupled from infrastructure concerns.

#### Acceptance Criteria

1. WHEN auditing component imports, THE System SHALL contain zero direct imports of firebase/database or firebase/app in any React component
2. WHEN auditing component imports, THE System SHALL contain zero direct imports of FirebaseSync.ts files in any React component
3. WHEN a component needs data synchronization, THE System SHALL provide access only through application layer hooks or services
4. WHEN examining the components/ directory, THE System SHALL show no infrastructure layer dependencies
5. THE System SHALL maintain all existing functionality while removing direct Firebase dependencies

### Requirement 2: Implement Application Layer Hooks

**User Story:** As a React component, I want to access data synchronization through application layer hooks, so that I remain decoupled from infrastructure implementation details.

#### Acceptance Criteria

1. WHEN a component needs overlay synchronization, THE System SHALL provide useOverlaySync hook from application layer
2. WHEN a component needs game data synchronization, THE System SHALL provide useGameSync hook from application layer
3. WHEN a component needs poll synchronization, THE System SHALL provide usePollSync hook from application layer
4. WHEN a component needs giveaway synchronization, THE System SHALL provide useGiveawaySync hook from application layer
5. THE System SHALL ensure all hooks use dependency injection to access infrastructure adapters

### Requirement 3: Refactor Affected Components

**User Story:** As a maintainer, I want all 25+ affected components to use proper architectural patterns, so that the codebase follows hexagonal architecture principles.

#### Acceptance Criteria

1. WHEN examining games components, THE System SHALL show all 13+ game components using application layer hooks only
2. WHEN examining PollOverlay.tsx, THE System SHALL show it using usePollSync instead of direct Firebase imports
3. WHEN examining JudgePanel.tsx, THE System SHALL show it using application layer services instead of direct Firebase imports
4. WHEN examining Countdown.tsx, THE System SHALL show it using application layer hooks instead of direct Firebase imports
5. WHEN examining GiveawayHub.tsx, THE System SHALL show it using useGiveawaySync instead of direct Firebase imports

### Requirement 4: Maintain Functional Compatibility

**User Story:** As a user, I want all existing features to work exactly as before, so that the refactoring doesn't break any functionality.

#### Acceptance Criteria

1. WHEN using interactive polls, THE System SHALL maintain all existing poll functionality after refactoring
2. WHEN using mini-games, THE System SHALL maintain all existing game functionality after refactoring
3. WHEN using giveaways, THE System SHALL maintain all existing giveaway functionality after refactoring
4. WHEN using judge panel, THE System SHALL maintain all existing judging functionality after refactoring
5. THE System SHALL preserve all real-time synchronization behavior across all features

### Requirement 5: Implement Dependency Injection

**User Story:** As a system architect, I want proper dependency injection throughout the application, so that infrastructure dependencies can be easily swapped without affecting business logic.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL inject IOverlaySync implementation through dependency injection container
2. WHEN services need data persistence, THE System SHALL receive dependencies through constructor injection or factory patterns
3. WHEN hooks need infrastructure access, THE System SHALL use injected adapters rather than direct imports
4. THE System SHALL provide a centralized dependency injection configuration
5. THE System SHALL ensure no circular dependencies exist in the injection graph

### Requirement 6: Create Architecture Validation

**User Story:** As a developer, I want automated validation of architectural boundaries, so that future code changes cannot violate hexagonal architecture principles.

#### Acceptance Criteria

1. WHEN running architecture tests, THE System SHALL verify no components import from infrastructure layer
2. WHEN running architecture tests, THE System SHALL verify domain layer has no external dependencies
3. WHEN running architecture tests, THE System SHALL verify application layer only depends on domain layer
4. WHEN running architecture tests, THE System SHALL verify infrastructure layer implements domain ports
5. THE System SHALL fail builds if architectural boundaries are violated

### Requirement 7: Backend Agnostic Implementation

**User Story:** As a system architect, I want the ability to switch from Firebase to any other backend, so that the system is not locked into a specific infrastructure provider.

#### Acceptance Criteria

1. WHEN switching from Firebase to Supabase, THE System SHALL require changes only in the infrastructure folder
2. WHEN implementing a new backend adapter, THE System SHALL only need to implement existing domain ports
3. WHEN changing backend providers, THE System SHALL maintain all existing component interfaces
4. THE System SHALL demonstrate backend agnosticism through clear interface boundaries
5. THE System SHALL provide configuration-based backend selection