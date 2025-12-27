# Requirements Document

## Introduction

Este documento define los requisitos para mejorar el panel de control OBS: toggle de visibilidad de fuentes, escenas favoritas editables, comandos rápidos personalizados, y mejora de presets.

## Glossary

- **Source_Toggle**: Control para mostrar/ocultar fuentes en OBS
- **Favorite_Scenes**: Lista personalizable de escenas de acceso rápido
- **Quick_Command**: Acción rápida configurable para ejecutar múltiples operaciones OBS
- **Preset_System**: Sistema de configuraciones predefinidas para automatizaciones

## Requirements

### Requirement 1: Toggle de Visibilidad de Fuentes

**User Story:** As a streamer, I want to toggle source visibility with visual feedback, so that I can quickly show/hide overlays during stream.

#### Acceptance Criteria

1. WHEN clicking a source toggle THEN THE System SHALL change the source visibility in OBS
2. WHEN a source is visible THEN THE System SHALL show an "eye open" icon with green color
3. WHEN a source is hidden THEN THE System SHALL show an "eye closed" icon with gray color
4. WHEN toggling visibility THEN THE System SHALL show a brief animation feedback
5. WHEN the toggle fails THEN THE System SHALL display an error notification

### Requirement 2: Escenas Favoritas Editables

**User Story:** As a streamer, I want to customize my favorite scenes, so that I can have quick access to the scenes I use most.

#### Acceptance Criteria

1. THE System SHALL allow selecting up to 6 favorite scenes
2. WHEN editing favorites THEN THE System SHALL show a selection modal with all available scenes
3. WHEN saving favorites THEN THE System SHALL persist the selection to localStorage
4. WHEN loading the app THEN THE System SHALL restore saved favorite scenes
5. THE System SHALL show favorite scenes in the Quick Actions tab
6. WHEN a favorite scene doesn't exist in OBS THEN THE System SHALL remove it from favorites

### Requirement 3: Comandos Rápidos Personalizados

**User Story:** As a streamer, I want to create quick commands that execute multiple OBS actions, so that I can streamline my workflow.

#### Acceptance Criteria

1. THE System SHALL allow creating quick commands with: name, icon, and list of actions
2. WHEN executing a quick command THEN THE System SHALL run all actions in sequence
3. THE Quick_Command actions SHALL support: switch scene, toggle source, set transition, start/stop recording
4. WHEN saving quick commands THEN THE System SHALL persist to localStorage
5. THE System SHALL display quick commands as buttons in the Quick Actions tab
6. THE System SHALL allow editing and deleting quick commands

### Requirement 4: Mejora del Sistema de Presets

**User Story:** As a streamer, I want presets that work reliably, so that I can quickly set up common automation configurations.

#### Acceptance Criteria

1. WHEN applying a preset THEN THE System SHALL show a configuration modal to map scenes
2. THE Preset modal SHALL show each automation with a scene selector dropdown
3. WHEN a scene name hint matches THEN THE System SHALL pre-select that scene
4. WHEN confirming preset THEN THE System SHALL create all automations with selected scenes
5. THE System SHALL validate that all required scenes are selected before applying
6. WHEN preset is applied THEN THE System SHALL show success notification with count of automations created

### Requirement 5: Fix Meta Tag Deprecation

**User Story:** As a developer, I want to fix deprecated meta tags, so that the app follows current web standards.

#### Acceptance Criteria

1. THE System SHALL replace `apple-mobile-web-app-capable` with `mobile-web-app-capable`

