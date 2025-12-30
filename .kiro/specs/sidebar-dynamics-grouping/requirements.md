# Requirements Document

## Introduction

Esta feature reorganiza el sidebar izquierdo de la aplicación agrupando las funcionalidades de Encuesta, Jurado y Sorteos bajo una nueva sección llamada "Dinámicas". El objetivo es simplificar la UI, reducir la cantidad de elementos en el sidebar y crear espacio para futuras funcionalidades como comandos personalizados de Twitch y predicciones.

## Glossary

- **Sidebar**: Panel de navegación lateral izquierdo de la aplicación
- **Dinámicas**: Nueva sección que agrupa actividades interactivas del stream (Encuesta, Jurado, Sorteos)
- **Activity_Card**: Componente visual tipo tarjeta que representa una actividad dentro de Dinámicas
- **Activity_Selector**: Vista que muestra las Activity_Cards disponibles para seleccionar
- **Left_Tab**: Estado que controla qué panel se muestra en el área principal izquierda

## Requirements

### Requirement 1: Agrupación de Actividades en Dinámicas

**User Story:** Como streamer, quiero tener las actividades interactivas (Encuesta, Jurado, Sorteos) agrupadas en una sola sección, para que el sidebar sea más limpio y fácil de navegar.

#### Acceptance Criteria

1. WHEN the user clicks on "Dinámicas" in the sidebar THEN the Activity_Selector SHALL display three Activity_Cards for Encuesta, Jurado, and Sorteos
2. THE Activity_Selector SHALL display each Activity_Card with an icon, title, and brief description
3. WHEN the user clicks on an Activity_Card THEN the system SHALL navigate to the corresponding panel (PollCreator, JudgePanel, or GiveawayHub)
4. THE sidebar SHALL reduce from 7 tabs to 5 tabs by consolidating poll, judge, and giveaway into dynamics

### Requirement 2: Navegación con Retorno

**User Story:** Como streamer, quiero poder volver fácilmente al selector de actividades después de entrar en una actividad específica, para poder cambiar rápidamente entre diferentes dinámicas.

#### Acceptance Criteria

1. WHEN the user is inside a specific activity panel (Encuesta, Jurado, or Sorteos) THEN the system SHALL display a back button to return to the Activity_Selector
2. WHEN the user clicks the back button THEN the system SHALL return to the Activity_Selector view
3. THE back button SHALL be visually consistent with the application design and clearly indicate its purpose

### Requirement 3: Diseño Visual de Activity Cards

**User Story:** Como streamer, quiero que las tarjetas de actividades sean visualmente atractivas y fáciles de distinguir, para poder identificar rápidamente la actividad que necesito.

#### Acceptance Criteria

1. THE Activity_Card for Encuesta SHALL display a poll icon, the title "Encuesta", and a description like "Crea votaciones interactivas"
2. THE Activity_Card for Jurado SHALL display a judge/scale icon, the title "Jurado", and a description like "Panel de puntuación en vivo"
3. THE Activity_Card for Sorteos SHALL display a gift icon, the title "Sorteos", and a description like "Sorteos y giveaways"
4. WHEN the user hovers over an Activity_Card THEN the system SHALL provide visual feedback (hover effect)
5. THE Activity_Cards SHALL be responsive and adapt to different screen sizes

### Requirement 4: Persistencia del Estado de Navegación

**User Story:** Como streamer, quiero que la aplicación recuerde en qué actividad estaba trabajando, para no perder mi contexto si cambio de sección temporalmente.

#### Acceptance Criteria

1. WHEN the user selects an activity and then navigates to another sidebar tab THEN the system SHALL remember the last selected activity
2. WHEN the user returns to Dinámicas THEN the system SHALL show the Activity_Selector (not the last activity panel)
3. THE system SHALL preserve any in-progress data within each activity panel during navigation

### Requirement 5: Actualización del Sidebar

**User Story:** Como streamer, quiero que el nuevo sidebar sea claro y organizado, para poder acceder rápidamente a todas las funcionalidades.

#### Acceptance Criteria

1. THE sidebar SHALL display tabs in the following order: Dinámicas, Juegos, OBS, Galería, Datos
2. THE Dinámicas tab SHALL use an appropriate icon that represents interactive activities
3. WHEN the user is inside a specific activity THEN the Dinámicas tab SHALL remain highlighted in the sidebar
4. THE sidebar icons and labels SHALL be consistent with the existing design system

### Requirement 6: Compatibilidad con Demo Tour

**User Story:** Como nuevo usuario, quiero que el tour de demostración funcione correctamente con la nueva estructura, para poder aprender a usar las dinámicas.

#### Acceptance Criteria

1. WHEN the demo tour navigates to poll functionality THEN the system SHALL first navigate to Dinámicas and then to Encuesta
2. WHEN the demo tour references activities THEN the system SHALL use the new navigation flow
3. THE demo tour steps SHALL be updated to reflect the new UI structure

### Requirement 7: Accesibilidad

**User Story:** Como streamer con necesidades de accesibilidad, quiero poder navegar por las dinámicas usando el teclado, para poder usar la aplicación sin depender del ratón.

#### Acceptance Criteria

1. THE Activity_Cards SHALL be focusable using keyboard navigation (Tab key)
2. WHEN an Activity_Card has focus THEN the user SHALL be able to activate it using Enter or Space
3. THE Activity_Selector SHALL announce its purpose to screen readers
4. THE back button SHALL be accessible via keyboard navigation
