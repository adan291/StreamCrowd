# Requirements Document

## Introduction

Este documento define los requisitos para refactorizar la aplicación Twitch Vote, enfocándose en reducir la complejidad de App.tsx (~1300 líneas), centralizar constantes de localStorage, crear hooks reutilizables y mejorar el servicio de Twitch.

## Glossary

- **App Component**: Componente principal de React que actualmente contiene toda la lógica de estado y UI
- **Custom Hook**: Función de React que encapsula lógica de estado reutilizable
- **localStorage**: API del navegador para persistencia de datos en el cliente
- **TwitchService**: Servicio singleton que maneja la conexión con el chat de Twitch via TMI.js
- **Moderation State**: Estado relacionado con la moderación de votos (config, stats, logs)
- **Overlay State**: Estado relacionado con el modo overlay para OBS
- **Poll State**: Estado relacionado con las encuestas activas y su historial

## Requirements

### Requirement 1

**User Story:** As a developer, I want to extract poll-related state and logic into a custom hook, so that App.tsx is more maintainable and the poll logic is reusable.

#### Acceptance Criteria

1. WHEN the usePoll hook is called THEN the System SHALL return poll state (currentPoll, voteHistory, pastPolls) and actions (createPoll, stopPoll, resetPoll)
2. WHEN a poll is created via the hook THEN the System SHALL initialize all poll-related state correctly
3. WHEN a poll is stopped THEN the System SHALL add it to pastPolls and mark it as inactive
4. WHEN a poll is reset THEN the System SHALL clear currentPoll, voteHistory, and related moderation state

### Requirement 2

**User Story:** As a developer, I want to extract moderation-related state into a custom hook, so that moderation logic is encapsulated and testable.

#### Acceptance Criteria

1. WHEN the useModeration hook is called THEN the System SHALL return moderation state (config, stats, log, userVoteStates, userWeights) and actions
2. WHEN a vote is processed THEN the System SHALL validate it against moderation config and update stats accordingly
3. WHEN moderation is reset THEN the System SHALL restore all moderation state to default values
4. WHEN a vote is rejected THEN the System SHALL log the rejection with the appropriate reason

### Requirement 3

**User Story:** As a developer, I want to extract overlay-related state into a custom hook, so that overlay configuration is isolated from main app logic.

#### Acceptance Criteria

1. WHEN the useOverlay hook is called THEN the System SHALL return overlay state (isOverlayMode, settings) and actions
2. WHEN overlay mode is detected via URL params THEN the System SHALL initialize overlay state from URL
3. WHEN overlay settings change THEN the System SHALL persist them for the session
4. WHEN the hook initializes THEN the System SHALL check URL params for overlay=true

### Requirement 4

**User Story:** As a developer, I want a centralized constants file for localStorage keys, so that keys are not scattered as magic strings throughout the codebase.

#### Acceptance Criteria

1. WHEN localStorage is accessed THEN the System SHALL use constants from a centralized STORAGE_KEYS object
2. WHEN a new localStorage key is needed THEN the System SHALL add it to the STORAGE_KEYS constant
3. WHEN the constants file is imported THEN the System SHALL provide type-safe access to all storage keys

### Requirement 5

**User Story:** As a developer, I want a reusable useLocalStorage hook, so that localStorage persistence is consistent and type-safe across the app.

#### Acceptance Criteria

1. WHEN useLocalStorage is called with a key and initial value THEN the System SHALL return current value and setter function
2. WHEN the setter is called THEN the System SHALL persist the value to localStorage immediately
3. WHEN localStorage read fails THEN the System SHALL return the initial value and log the error
4. WHEN localStorage write fails THEN the System SHALL handle the error gracefully without crashing
5. WHEN useLocalStorage initializes THEN the System SHALL load existing value from localStorage if present

### Requirement 6

**User Story:** As a developer, I want to improve the TwitchService with better typing and reconnection handling, so that connection issues are handled gracefully.

#### Acceptance Criteria

1. WHEN TwitchService connects THEN the System SHALL use strongly typed options and callbacks
2. WHEN connection fails THEN the System SHALL attempt reconnection with exponential backoff
3. WHEN reconnection attempts exceed maximum THEN the System SHALL notify via callback with detailed error
4. WHEN TwitchService methods are called THEN the System SHALL use typed parameters and return values

### Requirement 7

**User Story:** As a developer, I want to extract AI/mascot-related state into a custom hook, so that AI analytics logic is separated from core app logic.

#### Acceptance Criteria

1. WHEN the useAIAnalytics hook is called THEN the System SHALL return AI config, session state, and mascot state
2. WHEN a stream session starts THEN the System SHALL create and track the session
3. WHEN a stream session ends THEN the System SHALL save the session data
4. WHEN user difficulty is detected THEN the System SHALL update mascot state accordingly

### Requirement 8

**User Story:** As a developer, I want to extract connection-related state into a custom hook, so that Twitch connection logic is encapsulated.

#### Acceptance Criteria

1. WHEN the useTwitchConnection hook is called THEN the System SHALL return connection state (status, error, channelName, avatar) and actions
2. WHEN connect is called THEN the System SHALL initiate connection and fetch channel avatar
3. WHEN disconnect is called THEN the System SHALL clean up connection state
4. WHEN connection status changes THEN the System SHALL update state and trigger notifications
