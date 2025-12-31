# Design: Mejoras UX/UI

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Design System                             │
├─────────────────────────────────────────────────────────────┤
│  Tokens          │  Components      │  Patterns             │
│  ├─ Colors       │  ├─ Button       │  ├─ Forms             │
│  ├─ Typography   │  ├─ Input        │  ├─ Modals            │
│  ├─ Spacing      │  ├─ Card         │  ├─ Navigation        │
│  ├─ Shadows      │  ├─ Badge        │  ├─ Feedback          │
│  └─ Breakpoints  │  └─ Tooltip      │  └─ Loading States    │
└─────────────────────────────────────────────────────────────┘
```

## Design Tokens

### Colors
```css
:root {
  /* Primary */
  --color-primary-50: #f0f9ff;
  --color-primary-500: #6366f1;
  --color-primary-900: #312e81;
  
  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
  
  /* Surface */
  --surface-primary: var(--color-gray-900);
  --surface-secondary: var(--color-gray-800);
  --surface-elevated: var(--color-gray-700);
}
```

### Typography
```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
}
```

### Spacing
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
}
```

## Component Improvements

### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

### Input Component
```typescript
interface InputProps {
  variant: 'default' | 'filled' | 'flushed';
  size: 'sm' | 'md' | 'lg';
  error?: string;
  helper?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}
```

### Card Component
```typescript
interface CardProps {
  variant: 'default' | 'elevated' | 'outlined';
  padding: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}
```

## Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};
```

## Layout Improvements

### Sidebar Reorganization
```
┌─────────────────────────────────────┐
│ Logo                          [≡]   │
├─────────────────────────────────────┤
│ 📊 Dashboard                        │
├─────────────────────────────────────┤
│ 🎮 Actividades                      │
│   ├─ Polls                          │
│   ├─ Predictions                    │
│   ├─ Giveaways                      │
│   └─ Timers                         │
├─────────────────────────────────────┤
│ 🔧 Herramientas                     │
│   ├─ Macros                         │
│   ├─ Comandos                       │
│   └─ Soundboard                     │
├─────────────────────────────────────┤
│ 📡 Integraciones                    │
│   ├─ OBS                            │
│   ├─ Webhooks                       │
│   └─ API                            │
├─────────────────────────────────────┤
│ 👥 Colaboración                     │
├─────────────────────────────────────┤
│ ⚙️ Configuración                    │
└─────────────────────────────────────┘
```

## Loading States

### Skeleton Components
```typescript
// Skeleton para cards
<Skeleton variant="card" />

// Skeleton para listas
<Skeleton variant="list" count={5} />

// Skeleton para texto
<Skeleton variant="text" lines={3} />
```

### Loading Indicators
```typescript
// Spinner inline
<Spinner size="sm" />

// Progress bar
<Progress value={75} />

// Overlay loading
<LoadingOverlay message="Guardando..." />
```

## Animation Guidelines

```css
/* Transiciones estándar */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

## Accessibility Checklist

- [ ] Contraste mínimo 4.5:1 para texto normal
- [ ] Contraste mínimo 3:1 para texto grande
- [ ] Focus visible en todos los elementos interactivos
- [ ] Aria-labels en iconos sin texto
- [ ] Role attributes en elementos custom
- [ ] Skip links para navegación
- [ ] Anuncios de cambios dinámicos (aria-live)

## Files to Create/Modify

### New Files
- `src/styles/tokens.css` - Design tokens
- `src/styles/utilities.css` - Utility classes
- `components/ui/Skeleton.tsx` - Loading skeletons
- `components/ui/Progress.tsx` - Progress indicators
- `components/ui/LoadingOverlay.tsx` - Full overlay

### Files to Modify
- `components/Button.tsx` - Unificar variantes
- `index.css` - Aplicar tokens globales
- `App.tsx` - Reorganizar layout
- Todos los componentes - Aplicar nuevos estilos
