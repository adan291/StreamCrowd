# Design Document: Form Accessibility Fixes

## Overview

Este diseño describe el enfoque para corregir los problemas de accesibilidad en elementos de formulario del proyecto. Se revisarán todos los componentes que contienen inputs, selects y textareas para asegurar que cumplan con los estándares de accesibilidad WCAG.

## Architecture

El proyecto usa React con componentes funcionales. Los formularios están distribuidos en múltiples componentes:

```
components/
├── ConnectionPanel.tsx      # Login, channel input
├── PollCreator.tsx          # Poll creation form
├── ModerationConfigForm.tsx # Moderation settings
├── Countdown.tsx            # Timer inputs
├── SpinnerWheel.tsx         # Wheel configuration
├── Tools.tsx                # Various tool inputs
├── activity/
│   ├── APIDataPanel.tsx     # Period/date selectors
│   ├── ModerationDrawer.tsx # Timeout/ban inputs
│   ├── ViewerPanel.tsx      # Search input
│   └── EventFeed.tsx        # Filter controls
├── games/                   # Game configuration inputs
└── ...
```

## Components and Interfaces

### Patrón de corrección para inputs

```tsx
// ❌ ANTES - Sin accesibilidad
<input 
  type="text" 
  placeholder="Buscar..." 
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>

// ✅ DESPUÉS - Con accesibilidad (label visible)
<div>
  <label htmlFor="search-input" className="sr-only">Buscar</label>
  <input 
    id="search-input"
    name="search"
    type="text" 
    placeholder="Buscar..." 
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

// ✅ DESPUÉS - Con accesibilidad (aria-label)
<input 
  id="search-input"
  name="search"
  type="text" 
  placeholder="Buscar..." 
  aria-label="Buscar"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
```

### Patrón para selects

```tsx
// ❌ ANTES
<select value={period} onChange={(e) => setPeriod(e.target.value)}>
  <option value="day">Hoy</option>
</select>

// ✅ DESPUÉS
<select 
  id="period-selector"
  name="period"
  aria-label="Seleccionar período"
  value={period} 
  onChange={(e) => setPeriod(e.target.value)}
>
  <option value="day">Hoy</option>
</select>
```

### Clase CSS para labels ocultos visualmente

```css
/* Ya existe en el proyecto como sr-only de Tailwind */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Data Models

No aplica - este es un refactor de UI sin cambios en modelos de datos.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Form fields have identification

*For any* form field element (`input`, `select`, `textarea`) in the rendered DOM, the element should have either an `id` attribute or a `name` attribute (or both).

**Validates: Requirements 1.1**

### Property 2: IDs are unique

*For any* two form field elements with `id` attributes in the same document, their `id` values should be different.

**Validates: Requirements 1.2**

### Property 3: Form fields have label association

*For any* form field element in the rendered DOM, the element should have at least one of:
- A `<label>` element with `for` attribute matching the field's `id`
- Be nested inside a `<label>` element
- Have an `aria-label` attribute
- Have an `aria-labelledby` attribute referencing an existing element

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Placeholder does not replace label

*For any* form field element with a `placeholder` attribute, the element should also have a label association (as defined in Property 3).

**Validates: Requirements 3.1**

## Error Handling

No aplica - este refactor no introduce nueva lógica de errores.

## Testing Strategy

### Unit Tests
- Verificar que componentes específicos rendericen inputs con los atributos correctos
- Usar React Testing Library para queries de accesibilidad (`getByLabelText`, `getByRole`)

### Property Tests
- No se requieren property tests para este refactor ya que las propiedades son verificables mediante inspección del DOM en tiempo de desarrollo
- Los warnings del navegador sirven como validación automática

### Manual Verification
- Abrir DevTools > Issues y verificar que no hay warnings de accesibilidad de formularios
- Usar extensión axe DevTools para auditoría completa
