# Requirements Document

## Introduction

Este documento define los requisitos para las mejoras de UI en la sección de Actividad del stream. El objetivo es reducir el caos visual, mejorar la jerarquía de información, y crear una experiencia más limpia y profesional manteniendo los colores distintivos por tipo de evento.

## Glossary

- **Activity_Section**: Sección principal de la aplicación que muestra eventos del stream, estadísticas, viewers y datos de API
- **Event_Feed**: Componente que muestra el feed de eventos en tiempo real con agrupación y filtros
- **Activity_Stats**: Componente que muestra estadísticas resumidas de la actividad del stream
- **Viewer_Panel**: Panel que muestra y gestiona los viewers/chatters del canal
- **Filter_Chip**: Botón pequeño para filtrar eventos por tipo
- **Event_Card**: Tarjeta individual que representa un evento del stream
- **Stat_Card**: Tarjeta que muestra una estadística con icono y valor

## Requirements

### Requirement 1: Simplificar la barra de estadísticas

**User Story:** As a streamer, I want a cleaner stats display, so that I can quickly see key metrics without visual overload.

#### Acceptance Criteria

1. THE Activity_Stats SHALL display stats in a single compact horizontal row instead of large cards
2. WHEN the Activity_Section loads, THE Activity_Stats SHALL show only the 4 most relevant metrics (follows, subs, bits, raids)
3. THE Activity_Stats SHALL use subtle colored dots or icons instead of large colored backgrounds
4. WHEN a stat value is zero, THE Activity_Stats SHALL display it with reduced opacity
5. THE Activity_Stats SHALL occupy no more than 40px of vertical height in compact mode

### Requirement 2: Mejorar los filtros de eventos

**User Story:** As a streamer, I want cleaner filter controls, so that I can quickly toggle event types without visual clutter.

#### Acceptance Criteria

1. THE Filter_Chips SHALL use a more subtle design with thin borders instead of filled backgrounds when inactive
2. WHEN a filter is active, THE Filter_Chip SHALL show a small colored indicator dot instead of full background color
3. THE Filter_Chips SHALL be smaller (height ~24px) to reduce visual weight
4. THE Event_Feed SHALL provide a single toggle to show/hide all filters
5. WHEN all filters are active, THE Filter_Chips section SHALL collapse to a minimal "Todos" indicator

### Requirement 3: Reducir densidad del feed de eventos

**User Story:** As a streamer, I want a less cluttered event feed, so that I can follow activity without feeling overwhelmed.

#### Acceptance Criteria

1. THE Event_Card SHALL use more whitespace and padding between elements
2. THE Event_Card SHALL display username and badge on a single line without wrapping
3. WHEN displaying timestamps, THE Event_Feed SHALL use relative time format ("hace 2m") instead of absolute time
4. THE Event_Card SHALL use smaller, more subtle badges (max height 16px)
5. WHEN events are grouped, THE grouped header SHALL be visually distinct but not overpowering

### Requirement 4: Mejorar jerarquía visual de tabs

**User Story:** As a streamer, I want clearer tab navigation, so that I can easily switch between different views.

#### Acceptance Criteria

1. THE tab navigation SHALL use a cleaner underline style instead of filled backgrounds
2. WHEN a tab is active, THE tab indicator SHALL be a thin colored line (2px) below the label
3. THE tab labels SHALL use consistent sizing and spacing
4. THE activity indicator badge SHALL be smaller and positioned more subtly
5. WHEN switching tabs, THE transition SHALL be smooth (150ms ease)

### Requirement 5: Optimizar el panel de viewers

**User Story:** As a streamer, I want a cleaner viewer list, so that I can quickly scan and find specific users.

#### Acceptance Criteria

1. THE Viewer_Panel SHALL use a more compact card design with less padding
2. THE viewer badges SHALL be displayed as small icons only (no text labels) to save space
3. WHEN hovering a viewer card, THE card SHALL show additional info in a tooltip instead of inline
4. THE search input SHALL have a cleaner, more minimal design
5. THE sort dropdown SHALL be integrated into the search bar area to save vertical space

### Requirement 6: Mejorar consistencia de colores

**User Story:** As a streamer, I want consistent color usage, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE Activity_Section SHALL use a consistent color palette across all components
2. WHEN displaying event types, THE system SHALL use the same color for the same event type everywhere
3. THE background colors SHALL use subtle tints (10-15% opacity) instead of strong colors
4. THE text colors SHALL maintain WCAG AA contrast ratios against backgrounds
5. THE hover states SHALL use consistent opacity changes (hover: +10% opacity)

### Requirement 7: Añadir modo compacto global

**User Story:** As a streamer, I want a compact mode option, so that I can see more information in limited screen space.

#### Acceptance Criteria

1. THE Activity_Section SHALL provide a toggle for compact mode
2. WHEN compact mode is enabled, THE Activity_Stats SHALL hide and only show on hover
3. WHEN compact mode is enabled, THE Event_Card height SHALL reduce by 30%
4. WHEN compact mode is enabled, THE Filter_Chips SHALL collapse to icon-only mode
5. THE compact mode preference SHALL persist in localStorage

### Requirement 8: Mejorar animaciones y transiciones

**User Story:** As a streamer, I want smooth animations, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN new events arrive, THE Event_Card SHALL animate in with a subtle fade-slide (200ms)
2. WHEN toggling filters, THE Event_Feed SHALL animate the content change smoothly
3. WHEN expanding/collapsing groups, THE animation SHALL be smooth (150ms ease-out)
4. THE auto-scroll indicator SHALL fade in/out smoothly instead of appearing abruptly
5. IF animations cause performance issues, THEN THE system SHALL respect prefers-reduced-motion

