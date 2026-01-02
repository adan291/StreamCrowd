# Requirements Document

## Introduction

Este documento define los requisitos para mejorar la experiencia de usuario en los formularios de configuración de Sorteos (GiveawayHub) y Torneos (JudgePanel). El objetivo es reducir la sobrecarga visual, mejorar la organización de opciones y facilitar la configuración rápida mediante secciones colapsables, wizards y presets.

## Glossary

- **GiveawayHub**: Componente de sorteos que permite crear sorteos por viewers, keyword o subs
- **JudgePanel**: Componente de panel de jueces para torneos con criterios de evaluación y votación pública
- **CollapsibleSection**: Componente reutilizable que permite expandir/colapsar contenido
- **Wizard**: Flujo de configuración paso a paso
- **Preset**: Configuración predefinida que se puede aplicar con un clic
- **Accordion**: Patrón UI donde solo una sección puede estar expandida a la vez

## Requirements

### Requirement 1: Componente CollapsibleSection Reutilizable

**User Story:** Como desarrollador, quiero un componente CollapsibleSection reutilizable, para poder aplicar el patrón de secciones colapsables de forma consistente en toda la aplicación.

#### Acceptance Criteria

1. THE CollapsibleSection component SHALL accept a title, icon, children, and defaultExpanded prop
2. WHEN the user clicks on the section header, THE CollapsibleSection SHALL toggle between expanded and collapsed states
3. THE CollapsibleSection SHALL animate the expand/collapse transition smoothly
4. WHEN collapsed, THE CollapsibleSection SHALL hide its children content
5. THE CollapsibleSection SHALL display a chevron icon indicating the current state (up when expanded, down when collapsed)
6. WHERE a badge prop is provided, THE CollapsibleSection SHALL display the badge next to the title

### Requirement 2: Secciones Colapsables en GiveawayHub

**User Story:** Como streamer, quiero que las opciones del sorteo estén organizadas en secciones colapsables, para poder ver solo lo que necesito y reducir la sobrecarga visual.

#### Acceptance Criteria

1. THE GiveawayHub SHALL organize its configuration into collapsible sections: "Configuración Básica", "Opciones Avanzadas", "Participantes", and "Lista Negra"
2. WHEN the component loads, THE "Configuración Básica" section SHALL be expanded by default
3. WHEN the component loads, THE "Opciones Avanzadas", "Participantes", and "Lista Negra" sections SHALL be collapsed by default
4. WHEN participants exist, THE "Participantes" section header SHALL display a badge with the participant count
5. WHEN blacklisted users exist, THE "Lista Negra" section header SHALL display a badge with the blacklist count
6. THE section organization SHALL NOT affect the existing functionality of the raffle system

### Requirement 3: Secciones Colapsables en JudgePanel

**User Story:** Como streamer, quiero que la configuración del torneo esté organizada en secciones colapsables, para poder configurar el torneo de forma más ordenada.

#### Acceptance Criteria

1. THE JudgePanel SHALL organize its configuration into collapsible sections: "Configuración General", "Criterios de Evaluación", "Concursantes", "Jueces", and "Votación Pública"
2. WHEN the component loads, THE "Configuración General" section SHALL be expanded by default
3. WHEN criteria are added, THE "Criterios de Evaluación" section header SHALL display a badge with the criteria count
4. WHEN contestants are added, THE "Concursantes" section header SHALL display a badge with the contestant count
5. WHEN judges are added, THE "Jueces" section header SHALL display a badge with the judge count
6. THE section organization SHALL NOT affect the existing functionality of the judge panel system

### Requirement 4: Wizard de Configuración para JudgePanel

**User Story:** Como streamer nuevo, quiero un asistente paso a paso para configurar mi torneo, para no sentirme abrumado por todas las opciones disponibles.

#### Acceptance Criteria

1. THE JudgePanel SHALL offer a "Wizard Mode" toggle in the configuration header
2. WHEN Wizard Mode is enabled, THE JudgePanel SHALL display configuration in sequential steps: Step 1 (Basic Config), Step 2 (Criteria), Step 3 (Contestants), Step 4 (Judges)
3. WHEN on a wizard step, THE system SHALL display "Next" and "Back" navigation buttons
4. WHEN the user completes all steps, THE system SHALL show a summary and "Start Tournament" button
5. WHEN Wizard Mode is disabled, THE JudgePanel SHALL display all sections in the collapsible format
6. THE wizard progress SHALL be indicated visually with a step indicator showing current step and total steps

### Requirement 5: Presets de Configuración para GiveawayHub

**User Story:** Como streamer, quiero poder aplicar configuraciones predefinidas con un clic, para poder iniciar sorteos rápidamente sin configurar cada opción manualmente.

#### Acceptance Criteria

1. THE GiveawayHub SHALL display a preset selector at the top of the configuration area
2. THE system SHALL provide at least three presets: "Sorteo Rápido" (viewers mode, no timer), "Sorteo por Keyword" (keyword mode, 60s timer), and "Sorteo de Subs" (subs mode, no timer)
3. WHEN a preset is selected, THE system SHALL apply all preset values to the configuration fields
4. WHEN a preset is applied, THE system SHALL show a brief confirmation message
5. THE user SHALL be able to modify any value after applying a preset
6. IF the user modifies values after applying a preset, THE preset selector SHALL show "Personalizado" as the current selection

### Requirement 6: Presets de Configuración para JudgePanel

**User Story:** Como streamer, quiero poder aplicar plantillas de torneo predefinidas, para poder configurar torneos comunes rápidamente.

#### Acceptance Criteria

1. THE JudgePanel SHALL display a preset selector in the configuration header
2. THE system SHALL provide at least two presets: "Torneo Básico" (3 criteria: Creatividad, Ejecución, Originalidad) and "Torneo con Público" (same criteria plus public voting enabled at 30%)
3. WHEN a preset is selected, THE system SHALL apply all preset values including criteria, score ranges, and voting settings
4. WHEN a preset is applied, THE system SHALL show a brief confirmation message
5. THE user SHALL be able to modify any value after applying a preset
6. IF the user modifies values after applying a preset, THE preset selector SHALL show "Personalizado" as the current selection

### Requirement 7: Modo Compacto vs Expandido

**User Story:** Como streamer experimentado, quiero poder alternar entre una vista compacta y una vista expandida, para poder ver solo los controles esenciales cuando ya conozco la herramienta.

#### Acceptance Criteria

1. THE GiveawayHub and JudgePanel SHALL provide a toggle button to switch between "Compact" and "Expanded" view modes
2. WHEN in Compact mode, THE system SHALL show only essential controls (mode selector, start button, participant count)
3. WHEN in Expanded mode, THE system SHALL show all collapsible sections with full configuration options
4. THE system SHALL persist the user's view mode preference in localStorage
5. WHEN switching between modes, THE system SHALL preserve all current configuration values
