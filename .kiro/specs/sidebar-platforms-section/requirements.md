# Requirements Document

## Introduction

Esta feature añade una nueva sección "Plataformas" al sidebar que agrupa funcionalidades específicas de plataformas de streaming. Inicialmente contendrá herramientas de Twitch (comandos personalizados, predicciones, channel points), pero está diseñada para expandirse a otras plataformas en el futuro (YouTube, Kick, etc.).

## Glossary

- **Plataformas**: Nueva sección del sidebar que agrupa herramientas específicas de cada plataforma de streaming
- **Platform_Selector**: Vista que muestra las plataformas disponibles como cards seleccionables
- **Platform_Card**: Componente visual tipo tarjeta que representa una plataforma
- **Twitch_Tools**: Conjunto de herramientas específicas de Twitch (comandos, predicciones, channel points)
- **Tool_Selector**: Vista dentro de una plataforma que muestra las herramientas disponibles
- **Tool_Card**: Componente visual que representa una herramienta específica

## Requirements

### Requirement 1: Sección Plataformas en el Sidebar

**User Story:** Como streamer, quiero tener una sección dedicada a herramientas de plataformas, para acceder fácilmente a funcionalidades específicas de Twitch y otras plataformas.

#### Acceptance Criteria

1. THE sidebar SHALL display a "Plataformas" tab with an appropriate icon
2. WHEN the user clicks on "Plataformas" THEN the Platform_Selector SHALL be displayed
3. THE Platform_Selector SHALL display available platforms as Platform_Cards
4. THE sidebar order SHALL be: Dinámicas, Juegos, Plataformas, OBS, Galería, Datos

### Requirement 2: Selector de Plataformas

**User Story:** Como streamer, quiero ver las plataformas disponibles como tarjetas, para poder seleccionar la que uso y acceder a sus herramientas.

#### Acceptance Criteria

1. THE Platform_Selector SHALL display Twitch as the initial and only Platform_Card
2. THE Twitch Platform_Card SHALL display the Twitch logo/icon, title "Twitch", and description "Comandos, predicciones y más"
3. WHEN the user clicks on a Platform_Card THEN the system SHALL navigate to that platform's Tool_Selector
4. THE Platform_Cards SHALL be visually consistent with the Activity_Cards design from Dinámicas

### Requirement 3: Herramientas de Twitch

**User Story:** Como streamer de Twitch, quiero acceder a herramientas específicas de Twitch como comandos personalizados y predicciones, para mejorar la interacción con mi audiencia.

#### Acceptance Criteria

1. WHEN the user selects Twitch THEN the Tool_Selector SHALL display available Twitch tools as Tool_Cards
2. THE Tool_Selector SHALL initially display: Comandos Personalizados, Predicciones (futuro), Channel Points (futuro)
3. THE Comandos Tool_Card SHALL display a terminal icon, title "Comandos", and description "Comandos personalizados de chat"
4. WHEN the user clicks on a Tool_Card THEN the system SHALL navigate to that tool's panel
5. THE tools marked as "futuro" SHALL be displayed with a "Próximamente" badge and be non-interactive

### Requirement 4: Panel de Comandos Personalizados

**User Story:** Como streamer, quiero gestionar comandos personalizados de chat, para automatizar respuestas y mejorar la interacción.

#### Acceptance Criteria

1. WHEN the user selects "Comandos" THEN the system SHALL display the CommandPanel component
2. THE CommandPanel SHALL allow creating, editing, and deleting custom commands
3. THE CommandPanel SHALL display a back button to return to the Tool_Selector
4. THE system SHALL preserve command data during navigation

### Requirement 5: Navegación Jerárquica

**User Story:** Como streamer, quiero poder navegar fácilmente entre plataformas, herramientas y el selector principal, para no perderme en la interfaz.

#### Acceptance Criteria

1. WHEN the user is in a tool panel THEN the system SHALL display a breadcrumb or back button showing: Plataformas > Twitch > [Tool]
2. WHEN the user clicks back from a tool THEN the system SHALL return to the Tool_Selector of that platform
3. WHEN the user clicks back from Tool_Selector THEN the system SHALL return to the Platform_Selector
4. THE Plataformas tab SHALL remain highlighted during all sub-navigation levels

### Requirement 6: Preparación para Futuras Plataformas

**User Story:** Como desarrollador, quiero que la arquitectura soporte múltiples plataformas, para poder añadir YouTube, Kick u otras en el futuro.

#### Acceptance Criteria

1. THE Platform_Selector component SHALL accept a dynamic list of platforms
2. THE Tool_Selector component SHALL accept a dynamic list of tools per platform
3. THE navigation state SHALL support: platform selection and tool selection independently
4. THE system SHALL use a configuration-driven approach for platforms and tools

### Requirement 7: Accesibilidad

**User Story:** Como streamer con necesidades de accesibilidad, quiero poder navegar por las plataformas y herramientas usando el teclado.

#### Acceptance Criteria

1. THE Platform_Cards and Tool_Cards SHALL be focusable using keyboard navigation
2. WHEN a card has focus THEN the user SHALL be able to activate it using Enter or Space
3. THE back buttons SHALL be accessible via keyboard navigation
4. THE selectors SHALL announce their purpose to screen readers
