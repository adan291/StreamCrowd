# Requirements Document

## Introduction

Esta feature implementa las herramientas de Twitch dentro de la sección "Plataformas": Predicciones nativas de Twitch, gestión de Channel Points (recompensas personalizadas), y mejoras al sistema de Comandos existente incluyendo import/export desde archivo JSON.

## Glossary

- **Prediction**: Funcionalidad nativa de Twitch que permite a los viewers apostar Channel Points en outcomes
- **Channel_Points**: Sistema de puntos de Twitch que los viewers acumulan viendo el stream
- **Custom_Reward**: Recompensa personalizada que los viewers pueden canjear con Channel Points
- **Prediction_Panel**: Panel para crear y gestionar predicciones
- **Rewards_Panel**: Panel para gestionar recompensas de Channel Points
- **Command_Export**: Funcionalidad para exportar comandos a archivo JSON
- **Command_Import**: Funcionalidad para importar comandos desde archivo JSON

## Requirements

### Requirement 1: Panel de Predicciones

**User Story:** Como streamer, quiero crear y gestionar predicciones de Twitch desde la aplicación, para involucrar a mi audiencia sin salir de la herramienta.

#### Acceptance Criteria

1. THE Prediction_Panel SHALL display a form to create new predictions with title and 2-10 outcomes
2. WHEN the user creates a prediction THEN the system SHALL call the Twitch API to create the prediction
3. THE Prediction_Panel SHALL display the current active prediction with real-time vote counts
4. WHEN a prediction is active THEN the system SHALL display options to lock, resolve, or cancel it
5. THE system SHALL require the scope `channel:manage:predictions` for prediction operations
6. IF the user is not a Partner or Affiliate THEN the system SHALL display an informative message

### Requirement 2: Gestión de Predicciones Activas

**User Story:** Como streamer, quiero ver el estado de mi predicción en tiempo real y poder resolverla fácilmente, para mantener el flujo del stream.

#### Acceptance Criteria

1. WHEN a prediction is active THEN the system SHALL display each outcome with: title, number of voters, total points bet
2. THE system SHALL update prediction data every 5 seconds while active
3. WHEN the user clicks "Lock" THEN the system SHALL lock the prediction preventing new bets
4. WHEN the user selects a winning outcome THEN the system SHALL resolve the prediction via API
5. WHEN the user clicks "Cancel" THEN the system SHALL cancel and refund all points via API
6. THE system SHALL display the top predictors for each outcome

### Requirement 3: Historial de Predicciones

**User Story:** Como streamer, quiero ver el historial de predicciones pasadas, para analizar la participación de mi audiencia.

#### Acceptance Criteria

1. THE Prediction_Panel SHALL display a history section with past predictions
2. THE history SHALL show: title, winning outcome, total participants, total points
3. THE system SHALL store prediction history locally for offline access
4. WHEN the user clicks on a past prediction THEN the system SHALL display detailed results

### Requirement 4: Panel de Channel Points (Recompensas)

**User Story:** Como streamer, quiero gestionar las recompensas de Channel Points desde la aplicación, para crear experiencias interactivas.

#### Acceptance Criteria

1. THE Rewards_Panel SHALL display all custom rewards configured in the channel
2. THE system SHALL require the scope `channel:manage:redemptions` for reward operations
3. WHEN the user creates a reward THEN the system SHALL call the Twitch API to create it
4. THE reward form SHALL include: title, cost, description, cooldown, max per stream, max per user
5. THE system SHALL allow enabling/disabling rewards without deleting them
6. THE system SHALL display pending redemptions that need to be fulfilled or rejected

### Requirement 5: Gestión de Redenciones

**User Story:** Como streamer, quiero ver y gestionar las redenciones de recompensas pendientes, para cumplir con mi audiencia.

#### Acceptance Criteria

1. THE Rewards_Panel SHALL display a list of pending redemptions
2. WHEN a viewer redeems a reward THEN the system SHALL show a notification
3. THE system SHALL allow marking redemptions as fulfilled or rejected
4. THE system SHALL filter redemptions by reward type
5. THE system SHALL update redemptions in real-time via EventSub or polling

### Requirement 6: Import/Export de Comandos

**User Story:** Como streamer, quiero poder exportar e importar mis comandos, para hacer backup o migrar entre dispositivos.

#### Acceptance Criteria

1. THE CommandPanel SHALL display an "Export" button that downloads commands as JSON
2. THE CommandPanel SHALL display an "Import" button that allows uploading a JSON file
3. WHEN importing THEN the system SHALL validate the JSON structure before importing
4. WHEN importing THEN the system SHALL ask whether to merge or replace existing commands
5. THE export format SHALL be compatible with common bot formats where possible
6. IF import validation fails THEN the system SHALL display specific error messages

### Requirement 7: Integración con OBS

**User Story:** Como streamer, quiero que las predicciones y redenciones puedan triggear acciones en OBS, para automatizar mi stream.

#### Acceptance Criteria

1. THE system SHALL emit events when a prediction starts, locks, or resolves
2. THE system SHALL emit events when a reward is redeemed
3. THE OBS automation system SHALL be able to listen to these events
4. THE user SHALL be able to configure OBS actions for prediction/redemption events

### Requirement 8: Manejo de Errores y Permisos

**User Story:** Como streamer, quiero recibir mensajes claros cuando algo falla o no tengo permisos, para entender qué hacer.

#### Acceptance Criteria

1. IF the OAuth token lacks required scopes THEN the system SHALL prompt to re-authenticate
2. IF the API call fails THEN the system SHALL display a user-friendly error message
3. IF the user is not Partner/Affiliate THEN the system SHALL explain the limitation
4. THE system SHALL handle rate limits gracefully with retry logic
5. THE system SHALL validate all inputs before making API calls
