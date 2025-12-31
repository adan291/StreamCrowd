# Requirements Document

## Introduction

Este documento define los requisitos para corregir los problemas de accesibilidad en elementos de formulario del proyecto. Los navegadores reportan warnings sobre inputs sin `id`/`name` y sin `<label>` asociado, lo cual afecta la accesibilidad, el autofill del navegador y los estándares web.

## Glossary

- **Form_Field**: Elemento HTML de entrada de datos (`<input>`, `<select>`, `<textarea>`)
- **Label**: Elemento `<label>` que describe un campo de formulario
- **Accessibility_Validator**: Herramienta del navegador que detecta problemas de accesibilidad
- **Screen_Reader**: Software que lee el contenido de la pantalla para usuarios con discapacidad visual

## Requirements

### Requirement 1: Identificación de campos de formulario

**User Story:** Como desarrollador, quiero que todos los campos de formulario tengan un identificador único, para que el navegador pueda gestionar correctamente el autofill y la accesibilidad.

#### Acceptance Criteria

1. THE Form_Field SHALL have either an `id` attribute or a `name` attribute
2. WHEN a Form_Field has an `id` attribute, THE id SHALL be unique within the document
3. WHEN a Form_Field is used for user input, THE Form_Field SHALL have a descriptive `id` that reflects its purpose

### Requirement 2: Asociación de etiquetas con campos

**User Story:** Como usuario con discapacidad visual, quiero que todos los campos de formulario tengan etiquetas asociadas, para que mi lector de pantalla pueda describir cada campo correctamente.

#### Acceptance Criteria

1. THE Form_Field SHALL have an associated Label element
2. WHEN using explicit association, THE Label SHALL have a `for` attribute matching the Form_Field's `id`
3. WHEN using implicit association, THE Form_Field SHALL be nested inside the Label element
4. IF a Form_Field cannot have a visible label, THEN THE Form_Field SHALL have an `aria-label` attribute

### Requirement 3: Atributos de accesibilidad adicionales

**User Story:** Como usuario, quiero que los campos de formulario tengan atributos de accesibilidad apropiados, para mejorar mi experiencia de uso.

#### Acceptance Criteria

1. WHEN a Form_Field has un placeholder, THE Form_Field SHALL also have a label (placeholder no reemplaza label)
2. WHEN a Form_Field is required, THE Form_Field SHALL have the `required` attribute or `aria-required="true"`
3. WHEN a Form_Field has un error, THE Form_Field SHALL have `aria-invalid="true"` y un mensaje de error asociado

### Requirement 4: Componentes específicos a revisar

**User Story:** Como desarrollador, quiero una lista de componentes a revisar, para asegurar cobertura completa del proyecto.

#### Acceptance Criteria

1. THE System SHALL review all components in `components/` directory
2. THE System SHALL review all components in `components/activity/` directory
3. THE System SHALL review all components in `components/games/` directory
4. THE System SHALL fix inputs in ConnectionPanel, PollCreator, ModerationDrawer, and similar form-heavy components
5. THE System SHALL fix select elements in StreamActivity, APIDataPanel, and filter components
