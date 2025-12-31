# Requirements Document: OBS Simplified Setup

## Introduction

Este documento define los requisitos para simplificar la configuración de OBS, eliminando la necesidad de que los usuarios configuren manualmente el WebSocket plugin.

## Glossary

- **Auto_Discovery**: Detección automática de instancias OBS en la red local
- **Overlay_URL**: URL que OBS puede consumir como Browser Source
- **Connection_Wizard**: Asistente paso a paso para configurar la conexión
- **Diagnostic_Tool**: Herramienta para detectar y resolver problemas de conexión

## Requirements

### Requirement 1: Auto-Descubrimiento de OBS

**User Story:** As a streamer, I want the app to automatically find my OBS instance, so that I don't have to manually enter connection details.

#### Acceptance Criteria

1. WHEN the user opens the OBS panel THEN THE System SHALL attempt to discover OBS on localhost:4455
2. WHEN OBS is found on default port THEN THE System SHALL show a "Connect" button with pre-filled settings
3. WHEN OBS is not found on default port THEN THE System SHALL scan common alternative ports (4444, 4456)
4. WHEN multiple OBS instances are found THEN THE System SHALL show a list to select from
5. THE System SHALL cache successful connection settings for future sessions

### Requirement 2: Overlay URLs para Browser Source

**User Story:** As a streamer, I want to get overlay URLs that I can add to OBS as Browser Sources, so that I can display app content without WebSocket configuration.

#### Acceptance Criteria

1. THE System SHALL generate unique overlay URLs for: polls, predictions, giveaways, games
2. WHEN copying an overlay URL THEN THE System SHALL include all necessary parameters
3. THE Overlay URLs SHALL work without requiring OBS WebSocket connection
4. THE System SHALL provide a "Copy URL" button with visual feedback
5. THE System SHALL show instructions for adding Browser Source in OBS
6. THE Overlay URLs SHALL support customization parameters (theme, size, position)

### Requirement 3: Wizard de Conexión

**User Story:** As a new user, I want a step-by-step guide to connect OBS, so that I can set it up correctly the first time.

#### Acceptance Criteria

1. WHEN first opening OBS panel THEN THE System SHALL offer to start the connection wizard
2. THE Wizard SHALL have steps: Check OBS running, Enable WebSocket, Test connection
3. WHEN OBS is not detected THEN THE System SHALL show instructions to enable WebSocket
4. THE Wizard SHALL include screenshots/GIFs showing OBS WebSocket settings location
5. WHEN connection succeeds THEN THE System SHALL save settings and close wizard
6. THE System SHALL allow skipping the wizard for experienced users

### Requirement 4: Diagnóstico de Conexión

**User Story:** As a streamer having connection issues, I want a diagnostic tool, so that I can identify and fix problems.

#### Acceptance Criteria

1. THE System SHALL provide a "Diagnose Connection" button when connection fails
2. THE Diagnostic tool SHALL check: OBS running, WebSocket enabled, port accessible, password correct
3. WHEN a problem is detected THEN THE System SHALL show specific fix instructions
4. THE System SHALL show connection status in real-time during diagnosis
5. THE Diagnostic results SHALL be copyable for support requests

### Requirement 5: Presets de Escenas Recomendadas

**User Story:** As a new streamer, I want recommended scene templates, so that I can quickly set up a professional stream layout.

#### Acceptance Criteria

1. THE System SHALL offer scene presets: Gaming, Just Chatting, IRL, Podcast
2. WHEN selecting a preset THEN THE System SHALL show recommended scenes and sources
3. THE System SHALL NOT automatically create scenes in OBS (only suggest)
4. THE Presets SHALL include overlay URL suggestions for each scene type
5. THE System SHALL allow customizing preset recommendations

