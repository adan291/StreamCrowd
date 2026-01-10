# Requirements Document

## Introduction

Este documento define los requisitos para mejorar el sistema de sorteos (GiveawayHub) de la aplicación. Las mejoras se centran en refactorización de código, mejoras de UX/UI y nuevas funcionalidades, organizadas por prioridad.

## Glossary

- **GiveawayHub**: Componente principal que gestiona todos los sorteos
- **Raffle**: Sorteo rápido que se ejecuta en tiempo real
- **Thread**: Sorteo en segundo plano que recolecta participantes continuamente
- **RaffleMode**: Tipo de sorteo (viewers, keyword, subs)
- **Participant**: Usuario que participa en un sorteo
- **Winner**: Usuario seleccionado como ganador
- **Blacklist**: Lista de usuarios excluidos de sorteos
- **SubsConfig**: Configuración de pesos para sorteos de suscriptores

---

## PRIORIDAD ALTA

### Requirement 1: Refactorización en Componentes Modulares

**User Story:** Como desarrollador, quiero que el código del sistema de sorteos esté organizado en componentes pequeños y reutilizables, para que sea más fácil de mantener y extender.

#### Acceptance Criteria

1. THE GiveawayHub SHALL be split into separate component files with a maximum of 300 lines each
2. WHEN the GiveawayHub is rendered, THE System SHALL compose the UI from modular sub-components
3. THE System SHALL create a dedicated `components/giveaway/` directory for all giveaway-related components
4. THE System SHALL extract the following into separate components:
   - ModeSelector (selector de modo de sorteo)
   - RaffleTab (pestaña de sorteo rápido)
   - ThreadsTab (pestaña de hilos activos)
   - ThreadCard (tarjeta individual de hilo)
   - ParticipantsList (lista de participantes)
   - WinnerDisplay (visualización del ganador)
   - SubsConfigModal (modal de configuración de subs)
   - BlacklistModal (modal de lista de prohibidos)
5. THE System SHALL maintain all existing functionality after refactoring
6. THE System SHALL preserve the current visual appearance and behavior

### Requirement 2: Custom Hooks para Lógica de Negocio

**User Story:** Como desarrollador, quiero que la lógica de negocio esté separada de la UI mediante custom hooks, para mejorar la testabilidad y reutilización del código.

#### Acceptance Criteria

1. THE System SHALL create a `useRaffle` hook that encapsulates raffle state and actions
2. THE System SHALL create a `useThreads` hook that manages thread state and operations
3. THE System SHALL create a `useParticipants` hook that handles participant management
4. THE System SHALL create a `useGiveawaySync` hook that manages Firebase and BroadcastChannel synchronization
5. WHEN a hook is used, THE System SHALL provide a clean API with state and action functions
6. THE hooks SHALL be located in `components/giveaway/hooks/` directory
7. THE hooks SHALL handle all localStorage persistence internally

### Requirement 3: Mejorar Animación de Selección de Ganador

**User Story:** Como streamer, quiero que la animación de selección de ganador sea más emocionante y visualmente atractiva, para aumentar el engagement de mi audiencia.

#### Acceptance Criteria

1. WHEN selecting a winner, THE System SHALL display a smooth deceleration animation lasting 3-4 seconds
2. THE animation SHALL start fast (50ms intervals) and progressively slow down (up to 500ms intervals)
3. THE System SHALL use an easing function for natural deceleration
4. WHEN the animation is near completion (>80% progress), THE System SHALL show visual "near miss" effects
5. WHEN a winner is selected, THE System SHALL trigger a celebration effect (confetti or similar)
6. THE System SHALL play a sound effect when the winner is revealed (optional, configurable)
7. THE WinnerDisplay component SHALL show the winner with a prominent, animated style
8. THE animation SHALL be skippable by clicking/tapping for users who want instant results

---

## PRIORIDAD MEDIA

### Requirement 4: Presets para Configuración de Subs

**User Story:** Como streamer, quiero poder elegir configuraciones predefinidas para sorteos de subs, para no tener que configurar manualmente cada valor.

#### Acceptance Criteria

1. THE SubsConfigModal SHALL display preset options before showing custom configuration
2. THE System SHALL provide at least 3 presets:
   - "Simple": Todos los tiers valen igual (1 entrada cada uno)
   - "Ponderado": Tier 1=1, Tier 2=2, Tier 3=5, Prime=1
   - "VIP": Incluye bits y donaciones con valores predeterminados
3. WHEN a preset is selected, THE System SHALL apply all its values immediately
4. THE System SHALL allow switching to "Personalizado" mode for custom configuration
5. THE System SHALL remember the last used configuration (preset or custom)
6. WHEN displaying a preset, THE System SHALL show a summary of its values

### Requirement 5: Sistema de Persistencia Mejorado

**User Story:** Como streamer, quiero que mis datos de sorteos se guarden de forma segura y eficiente, para no perder información importante.

#### Acceptance Criteria

1. THE System SHALL create a `GiveawayStorage` service class for all persistence operations
2. THE GiveawayStorage SHALL handle automatic migration of old data formats
3. THE GiveawayStorage SHALL validate data before saving
4. THE System SHALL compress large thread data before storing
5. WHEN localStorage quota is exceeded, THE System SHALL show a warning and offer to export data
6. THE System SHALL provide export/import functionality for all giveaway data
7. THE GiveawayStorage SHALL log errors without crashing the application

### Requirement 6: Mejoras en Cards de Selección de Modo

**User Story:** Como streamer, quiero que la selección de modo de sorteo sea más visual e intuitiva, para entender rápidamente las diferencias entre cada opción.

#### Acceptance Criteria

1. THE ModeSelector SHALL display each mode as a large, visually distinct card
2. WHEN a mode is selected, THE card SHALL show a prominent selected state with gradient background
3. THE cards SHALL include an icon, title, and brief description for each mode
4. THE cards SHALL use distinct color schemes:
   - Viewers: Purple gradient
   - Keyword: Cyan/Blue gradient
   - Subs: Pink/Rose gradient
5. WHEN hovering over a card, THE System SHALL show a subtle animation or highlight
6. THE ModeSelector SHALL be responsive and stack vertically on small screens

---

## PRIORIDAD BAJA

### Requirement 7: Vista de Rueda de la Fortuna

**User Story:** Como streamer, quiero poder mostrar una rueda de la fortuna visual para sorteos pequeños, para hacer la experiencia más entretenida para mi audiencia.

#### Acceptance Criteria

1. WHEN there are 20 or fewer participants, THE System SHALL offer a "Spin Wheel" visualization option
2. THE SpinWheel component SHALL display all participants in colored segments
3. WHEN the wheel spins, THE System SHALL animate a realistic spinning motion with deceleration
4. THE wheel SHALL include a pointer/indicator showing the winning segment
5. WHEN the wheel stops, THE System SHALL highlight the winning segment
6. THE SpinWheel SHALL be optional and toggleable from the raffle settings
7. THE SpinWheel SHALL work with the OBS overlay system

### Requirement 8: Panel de Estadísticas de Sorteos

**User Story:** Como streamer, quiero ver estadísticas de mis sorteos pasados, para entender mejor la participación de mi comunidad.

#### Acceptance Criteria

1. THE System SHALL track and store statistics for all completed giveaways
2. THE StatsPanel SHALL display:
   - Total number of giveaways conducted
   - Total unique participants across all giveaways
   - Number of unique winners
   - Average participants per giveaway
   - Most active participant (most entries across giveaways)
   - Breakdown by mode (viewers/keyword/subs)
3. THE StatsPanel SHALL be accessible from the giveaway header
4. THE System SHALL allow exporting statistics as CSV or JSON
5. THE statistics SHALL persist across sessions

### Requirement 9: Mejoras en Experiencia Móvil

**User Story:** Como streamer, quiero poder gestionar sorteos básicos desde mi dispositivo móvil, para tener más flexibilidad durante mis streams.

#### Acceptance Criteria

1. THE GiveawaysScreen (mobile) SHALL allow creating quick raffles with minimal configuration
2. THE mobile interface SHALL support swipe gestures:
   - Swipe left to delete a giveaway
   - Swipe right to pick a winner
3. THE mobile interface SHALL show real-time participant count updates
4. WHEN a winner is selected from mobile, THE System SHALL sync with the desktop app
5. THE mobile interface SHALL support pull-to-refresh for updating giveaway list
6. THE mobile interface SHALL show countdown timers for timed giveaways

