# Requirements Document

## Introduction

Este documento define los requisitos para completar los tests pendientes de la mejora de formularios y añadir mejoras adicionales de UX, accesibilidad y rendimiento a la aplicación.

## Glossary

- **Property Test**: Test basado en propiedades que verifica comportamiento con múltiples inputs generados
- **Tooltip**: Mensaje emergente que aparece al pasar el cursor sobre un elemento
- **Lazy Loading**: Técnica de carga diferida de componentes para mejorar rendimiento
- **WCAG**: Web Content Accessibility Guidelines - estándares de accesibilidad web
- **Contrast Ratio**: Relación de contraste entre colores de texto y fondo

## Requirements

### Requirement 1: Tests para CollapsibleSection

**User Story:** Como desarrollador, quiero tests para CollapsibleSection, para asegurar que el componente funciona correctamente en todos los casos.

#### Acceptance Criteria

1. THE test suite SHALL verify that CollapsibleSection toggles expanded state on header click
2. THE test suite SHALL verify that children are hidden when collapsed
3. THE test suite SHALL verify that badge is displayed when provided
4. THE test suite SHALL verify that badge is hidden when not provided
5. THE test suite SHALL verify that defaultExpanded prop sets initial state correctly

### Requirement 2: Tests para GiveawayHub Mejorado

**User Story:** Como desarrollador, quiero tests para las mejoras de GiveawayHub, para asegurar que presets, badges y modo compacto funcionan correctamente.

#### Acceptance Criteria

1. THE test suite SHALL verify that participant count badge shows correct number
2. THE test suite SHALL verify that blacklist count badge shows correct number
3. THE test suite SHALL verify that preset application updates all configuration fields
4. THE test suite SHALL verify that modifying values after preset shows "Personalizado"
5. THE test suite SHALL verify that view mode toggle preserves configuration values

### Requirement 3: Tests para JudgePanel Mejorado

**User Story:** Como desarrollador, quiero tests para las mejoras de JudgePanel, para asegurar que wizard, presets y badges funcionan correctamente.

#### Acceptance Criteria

1. THE test suite SHALL verify that criteria count badge shows correct number
2. THE test suite SHALL verify that contestants count badge shows correct number
3. THE test suite SHALL verify that judges count badge shows correct number
4. THE test suite SHALL verify that wizard navigation moves between steps correctly
5. THE test suite SHALL verify that preset application creates criteria correctly

### Requirement 4: Tests de Persistencia de ViewMode

**User Story:** Como desarrollador, quiero tests de persistencia, para asegurar que las preferencias del usuario se guardan correctamente.

#### Acceptance Criteria

1. THE test suite SHALL verify that view mode is saved to localStorage on change
2. THE test suite SHALL verify that view mode is restored from localStorage on mount
3. THE test suite SHALL verify that configuration values are preserved during mode switch

### Requirement 5: Tooltips en Formularios Complejos

**User Story:** Como streamer nuevo, quiero tooltips explicativos en los formularios, para entender qué hace cada opción sin tener que buscar documentación.

#### Acceptance Criteria

1. WHEN the user hovers over a form field label, THE system SHALL display a tooltip with explanation
2. THE tooltips SHALL appear after 500ms delay to avoid accidental triggers
3. THE tooltips SHALL disappear when the user moves the cursor away
4. THE system SHALL provide tooltips for at least: timer options, subs-only toggle, keyword field, criteria weight, public vote weight
5. THE tooltips SHALL be accessible via keyboard focus

### Requirement 6: Animaciones de Feedback

**User Story:** Como streamer, quiero feedback visual cuando realizo acciones, para saber que la acción se completó correctamente.

#### Acceptance Criteria

1. WHEN a preset is applied, THE system SHALL show a brief success animation
2. WHEN configuration is saved, THE system SHALL show a brief confirmation indicator
3. WHEN a participant is added, THE system SHALL animate the new entry
4. THE animations SHALL be subtle and not disruptive (max 300ms duration)
5. WHERE the user has reduced-motion preference, THE system SHALL disable animations

### Requirement 7: Lazy Loading de Componentes Pesados

**User Story:** Como usuario, quiero que la aplicación cargue rápido, para poder empezar a usarla sin esperas.

#### Acceptance Criteria

1. THE system SHALL lazy load JudgePanel component when first accessed
2. THE system SHALL lazy load GiveawayHub component when first accessed
3. THE system SHALL show a loading skeleton while components load
4. THE lazy loading SHALL NOT affect component functionality once loaded
5. THE system SHALL preload components after initial page load is complete

### Requirement 8: Mejora de Contraste en Modo Oscuro

**User Story:** Como usuario con dificultades visuales, quiero mejor contraste en modo oscuro, para poder leer el contenido sin esfuerzo.

#### Acceptance Criteria

1. THE system SHALL ensure all text meets WCAG AA contrast ratio (4.5:1 for normal text)
2. THE system SHALL ensure interactive elements have visible focus indicators
3. THE system SHALL ensure badges and status indicators are distinguishable
4. THE system SHALL ensure form field borders are visible against background
5. THE system SHALL ensure disabled states are distinguishable from enabled states

### Requirement 9: Completar Traducciones Faltantes

**User Story:** Como usuario de habla inglesa, quiero que toda la interfaz esté traducida, para poder usar la aplicación en mi idioma.

#### Acceptance Criteria

1. THE system SHALL have English translations for all GiveawayHub text
2. THE system SHALL have English translations for all JudgePanel text
3. THE system SHALL have English translations for all tooltip text
4. THE system SHALL have English translations for all error messages
5. THE system SHALL have English translations for all preset names and descriptions
