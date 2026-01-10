# Requirements Document

## Introduction

Este documento define los requisitos para unificar y mejorar la experiencia de usuario en todas las dinámicas de la aplicación (Encuestas, Predicciones, Juegos), aplicando las mejoras ya implementadas en el sistema de Sorteos. El objetivo es crear una experiencia consistente con configuración de sonidos, historial mejorado, preview en tiempo real, y mejor organización de la UI.

## Glossary

- **Dynamics_System**: Sistema que agrupa todas las actividades interactivas (encuestas, predicciones, juegos, sorteos)
- **SoundSettingsPopover**: Componente reutilizable para configuración de sonidos por actividad
- **HistoryPanel**: Panel de historial con filtros, búsqueda y exportación
- **ActivitySoundConfig**: Configuración de sonidos específica por tipo de actividad
- **Preview_Mode**: Modo de vista previa que muestra cómo se verá la actividad en el overlay
- **Chat_Config**: Configuración de comandos de chat para cada dinámica

## Requirements

### Requirement 1: Sistema de Sonidos Unificado

**User Story:** As a streamer, I want consistent sound controls across all activities, so that I can manage audio feedback without learning different interfaces.

#### Acceptance Criteria

1. WHEN a user opens any activity panel (Poll, Prediction, Game) THEN THE Dynamics_System SHALL display a SoundSettingsPopover button in the header
2. WHEN a user configures sound settings for an activity THEN THE Dynamics_System SHALL persist those settings independently per activity type
3. WHEN a countdown reaches the last 10 seconds THEN THE Dynamics_System SHALL play countdown sounds if enabled
4. WHEN a winner/result is determined THEN THE Dynamics_System SHALL play a celebration sound if enabled
5. WHEN a user adjusts volume THEN THE Dynamics_System SHALL apply the volume to all sounds for that activity
6. THE SoundSettingsPopover SHALL include toggles for: enabled, countdown, milestone sounds, and volume slider

### Requirement 2: Historial Mejorado para Encuestas

**User Story:** As a streamer, I want to see my poll history with filters and export options, so that I can analyze engagement patterns.

#### Acceptance Criteria

1. WHEN a user opens the poll history tab THEN THE Poll_System SHALL display a HistoryPanel with all past polls
2. WHEN a user applies date filters (today, week, month, all) THEN THE Poll_System SHALL filter the history accordingly
3. WHEN a user searches by winner/option THEN THE Poll_System SHALL filter results matching the search term
4. WHEN a user clicks export CSV THEN THE Poll_System SHALL download a CSV file with poll data
5. WHEN a user clicks export JSON THEN THE Poll_System SHALL download a JSON file with poll data
6. THE HistoryPanel SHALL show top winning options and participation statistics

### Requirement 3: Historial Mejorado para Predicciones

**User Story:** As a streamer, I want to track my prediction history with outcomes and points, so that I can see engagement trends.

#### Acceptance Criteria

1. WHEN a user opens the prediction history THEN THE Prediction_System SHALL display past predictions with outcomes
2. WHEN a user filters by date range THEN THE Prediction_System SHALL show only predictions in that range
3. WHEN a user filters by outcome (won/lost/cancelled) THEN THE Prediction_System SHALL filter accordingly
4. WHEN a user exports history THEN THE Prediction_System SHALL include points wagered and distributed
5. THE HistoryPanel SHALL show total points distributed and top predictors if available

### Requirement 4: Preview Mode para Encuestas

**User Story:** As a streamer, I want to preview how my poll will look in the overlay, so that I can adjust settings before going live.

#### Acceptance Criteria

1. WHEN a user is creating a poll THEN THE Poll_System SHALL show a live preview of the poll appearance
2. WHEN a user changes poll options or colors THEN THE Preview SHALL update in real-time
3. WHEN a user toggles overlay styles THEN THE Preview SHALL reflect those changes immediately
4. THE Preview SHALL show how the poll will appear with sample votes

### Requirement 5: Configuración de Chat Unificada

**User Story:** As a streamer, I want to configure chat commands for each activity, so that viewers can interact consistently.

#### Acceptance Criteria

1. WHEN a user opens chat settings for any activity THEN THE Dynamics_System SHALL show a ChatSettings component
2. WHEN a user enables chat commands THEN THE Dynamics_System SHALL process commands like !votos, !prediccion, !juego
3. WHEN a user configures command prefix THEN THE Dynamics_System SHALL use that prefix for all commands
4. WHEN a user sets cooldown THEN THE Dynamics_System SHALL enforce cooldown between command responses
5. THE ChatSettings SHALL allow enabling/disabling specific commands per activity

### Requirement 6: Mejoras UI en Panel de Encuestas

**User Story:** As a streamer, I want a cleaner poll interface with better organization, so that I can manage polls more efficiently.

#### Acceptance Criteria

1. WHEN a user opens the poll panel THEN THE Poll_System SHALL display tabs for Create, Active, History
2. WHEN a user is in compact view mode THEN THE Poll_System SHALL show a condensed interface
3. WHEN a user is in expanded view mode THEN THE Poll_System SHALL show full details and charts
4. THE Poll_System SHALL include a ViewModeToggle button in the header
5. WHEN moderation is enabled THEN THE Poll_System SHALL show moderation stats in a collapsible panel

### Requirement 7: Mejoras UI en Panel de Juegos

**User Story:** As a streamer, I want better game organization and quick access to settings, so that I can switch games faster.

#### Acceptance Criteria

1. WHEN a user opens the games panel THEN THE Games_System SHALL display games organized by category
2. WHEN a user hovers over a game card THEN THE Games_System SHALL show a quick settings button
3. WHEN a user clicks quick settings THEN THE Games_System SHALL show game-specific configuration
4. THE Games_System SHALL remember the last played game and show it first
5. WHEN a game ends THEN THE Games_System SHALL show results with option to replay

### Requirement 8: Estadísticas de Actividad

**User Story:** As a streamer, I want to see statistics across all activities, so that I can understand viewer engagement.

#### Acceptance Criteria

1. WHEN a user opens the stats panel THEN THE Dynamics_System SHALL show aggregated statistics
2. THE Stats_Panel SHALL display: total activities, average participation, most popular activity type
3. WHEN a user filters by date THEN THE Stats_Panel SHALL update all metrics accordingly
4. THE Stats_Panel SHALL show a chart of activity over time
5. WHEN a user exports stats THEN THE Dynamics_System SHALL generate a comprehensive report

### Requirement 9: Persistencia de Configuración

**User Story:** As a streamer, I want my settings to persist across sessions, so that I don't have to reconfigure each time.

#### Acceptance Criteria

1. WHEN a user changes any activity configuration THEN THE Dynamics_System SHALL save to localStorage immediately
2. WHEN a user reopens the application THEN THE Dynamics_System SHALL restore all saved configurations
3. WHEN a user exports configuration THEN THE Dynamics_System SHALL include all activity settings
4. WHEN a user imports configuration THEN THE Dynamics_System SHALL apply settings to all activities
5. IF localStorage quota is exceeded THEN THE Dynamics_System SHALL show a warning and suggest cleanup

### Requirement 10: Tooltips y Ayuda Contextual

**User Story:** As a new user, I want helpful tooltips and guidance, so that I can learn the features quickly.

#### Acceptance Criteria

1. WHEN a user hovers over a button or control THEN THE Dynamics_System SHALL show a descriptive tooltip
2. WHEN a user first opens an activity THEN THE Dynamics_System SHALL offer a quick tour option
3. THE Tooltips SHALL be consistent in style across all activities
4. WHEN a user disables tooltips THEN THE Dynamics_System SHALL remember that preference
