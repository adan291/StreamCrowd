# Design System - TwitchVote Live

Sistema de diseño unificado para mantener consistencia visual y mejorar la experiencia de usuario.

## Índice

1. [Design Tokens](#design-tokens)
2. [Componentes Base](#componentes-base)
3. [Patrones de UI](#patrones-de-ui)
4. [Accesibilidad](#accesibilidad)
5. [Responsive Design](#responsive-design)

---

## Design Tokens

Los tokens de diseño están definidos en `src/styles/tokens.css` como variables CSS.

### Colores

#### Primarios
```css
--color-primary-50: #eef2ff;   /* Más claro */
--color-primary-500: #6366f1;  /* Base */
--color-primary-900: #312e81;  /* Más oscuro */
```

#### Semánticos
```css
--color-success-500: #22c55e;  /* Éxito */
--color-warning-500: #f59e0b;  /* Advertencia */
--color-error-500: #ef4444;    /* Error */
--color-info-500: #3b82f6;     /* Información */
```

#### Superficies (Dark Theme)
```css
--surface-primary: var(--color-gray-950);    /* Fondo principal */
--surface-secondary: var(--color-gray-900);  /* Fondo secundario */
--surface-tertiary: var(--color-gray-800);   /* Fondo terciario */
--surface-elevated: var(--color-gray-800);   /* Elementos elevados */
```

### Tipografía

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Tamaños */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

### Espaciado

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### Sombras

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-focus: 0 0 0 3px rgba(99, 102, 241, 0.4);
```

---

## Componentes Base

Todos los componentes están en `components/ui/` y se exportan desde `components/ui/index.ts`.

### Button

```tsx
import { Button } from '@/components/ui';

// Variantes
<Button variant="primary">Primario</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Peligro</Button>

// Tamaños
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>

// Estados
<Button loading>Cargando...</Button>
<Button disabled>Deshabilitado</Button>

// Con iconos
<Button leftIcon={<Icon />}>Con icono</Button>
<Button rightIcon={<Icon />}>Con icono</Button>
```

### Input

```tsx
import { Input, Textarea } from '@/components/ui';

<Input
  label="Email"
  placeholder="tu@email.com"
  error="Email inválido"
  helperText="Usaremos este email para notificaciones"
/>

<Textarea
  label="Descripción"
  rows={4}
  maxLength={500}
  showCount
/>
```

### Select

```tsx
import { Select } from '@/components/ui';

<Select
  label="País"
  options={[
    { value: 'es', label: 'España' },
    { value: 'mx', label: 'México' },
    { value: 'ar', label: 'Argentina' },
  ]}
  placeholder="Selecciona un país"
/>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido de la tarjeta
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>

// Variantes
<Card variant="default" />
<Card variant="elevated" />
<Card variant="outlined" />
```

### Badge

```tsx
import { Badge, StatusBadge, CountBadge } from '@/components/ui';

<Badge variant="primary">Nuevo</Badge>
<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="error">Error</Badge>

<StatusBadge status="online" />
<StatusBadge status="offline" />
<StatusBadge status="away" />

<CountBadge count={5} />
<CountBadge count={99} max={99} />
```

### Modal

```tsx
import { Modal, ConfirmDialog } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título del Modal"
  size="md"
>
  Contenido del modal
</Modal>

<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirm}
  title="¿Estás seguro?"
  message="Esta acción no se puede deshacer."
  confirmText="Eliminar"
  variant="danger"
/>
```

### Toast

```tsx
import { useToast, ToastContainer } from '@/components/ui';

function MyComponent() {
  const { addToast } = useToast();

  const showSuccess = () => {
    addToast({
      type: 'success',
      title: 'Guardado',
      message: 'Los cambios se han guardado correctamente',
    });
  };

  return <button onClick={showSuccess}>Guardar</button>;
}

// En el layout principal
<ToastContainer position="top-right" />
```

### Loading States

```tsx
import { Spinner, Skeleton, Progress, LoadingOverlay } from '@/components/ui';

// Spinner
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// Skeleton
<Skeleton width={200} height={20} />
<SkeletonText lines={3} />
<SkeletonAvatar size={48} />
<SkeletonCard />

// Progress
<Progress value={75} max={100} />
<CircularProgress value={75} size={60} />

// Loading Overlay
<LoadingOverlay isLoading={isLoading}>
  <Content />
</LoadingOverlay>
```

---

## Patrones de UI

### Navegación Móvil

```tsx
import { MobileDrawer, BottomNav } from '@/components/ui';

// Drawer lateral
<MobileDrawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Menú"
  position="left"
>
  <NavItems />
</MobileDrawer>

// Navegación inferior
<BottomNav
  items={[
    { id: 'home', label: 'Inicio', icon: <HomeIcon /> },
    { id: 'polls', label: 'Encuestas', icon: <PollIcon /> },
    { id: 'games', label: 'Juegos', icon: <GameIcon /> },
  ]}
  activeId={activeTab}
  onSelect={setActiveTab}
/>
```

### Sidebar Colapsable

```tsx
import { CollapsibleSidebar } from '@/components/ui';

<CollapsibleSidebar
  groups={[
    {
      id: 'main',
      label: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { id: 'polls', label: 'Encuestas', icon: <PollIcon /> },
      ],
    },
  ]}
  activeId={activeId}
  onSelect={setActiveId}
  collapsed={isCollapsed}
  onCollapsedChange={setIsCollapsed}
/>
```

### Lista Virtualizada

```tsx
import { VirtualList } from '@/components/ui';

<VirtualList
  items={messages}
  itemHeight={60}
  renderItem={(item, index, style) => (
    <div style={style}>
      <MessageItem message={item} />
    </div>
  )}
  className="h-[400px]"
/>
```

### Form Utilities

```tsx
import { FormField, FormInput, FormGroup, FormActions } from '@/components/ui';

<FormGroup direction="vertical" gap="md">
  <FormInput
    label="Nombre"
    placeholder="Tu nombre"
    required
    error={errors.name}
  />
  <FormInput
    label="Email"
    type="email"
    placeholder="tu@email.com"
  />
  <FormActions align="right">
    <Button variant="ghost">Cancelar</Button>
    <Button variant="primary">Guardar</Button>
  </FormActions>
</FormGroup>
```

### Panel Components

```tsx
import { Panel, PanelHeader, PanelSection, PanelFooter, PanelGrid } from '@/components/ui';

<Panel variant="default" padding="md">
  <PanelHeader
    title="Configuración"
    subtitle="Ajusta las opciones"
    icon={<SettingsIcon />}
    actions={<Button size="sm">Guardar</Button>}
  />
  
  <PanelSection title="General" collapsible>
    <PanelGrid columns={2}>
      <FormInput label="Nombre" />
      <FormInput label="Email" />
    </PanelGrid>
  </PanelSection>
  
  <PanelFooter>
    <Button variant="primary">Aplicar cambios</Button>
  </PanelFooter>
</Panel>
```

---

## Accesibilidad

### Principios

1. **Contraste**: Mínimo 4.5:1 para texto normal, 3:1 para texto grande
2. **Touch Targets**: Mínimo 44x44px en dispositivos táctiles
3. **Focus Visible**: Indicadores de foco claros para navegación por teclado
4. **ARIA**: Atributos apropiados para lectores de pantalla

### Clases de Utilidad

```css
/* Screen reader only */
.sr-only { ... }

/* Focus visible */
.focus-ring { ... }

/* Skip link */
.skip-link { ... }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) { ... }
```

### Ejemplo de Componente Accesible

```tsx
<button
  aria-label="Cerrar modal"
  aria-pressed={isPressed}
  className="focus-ring"
  onClick={handleClose}
>
  <XIcon aria-hidden="true" />
</button>
```

---

## Responsive Design

### Breakpoints

| Nombre | Tamaño | Uso |
|--------|--------|-----|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

### Clases de Utilidad

```css
/* Ocultar/mostrar por breakpoint */
.hide-mobile { }
.show-mobile { }
.hide-tablet { }
.show-tablet { }
.hide-desktop { }
.show-desktop { }

/* Contenedor responsive */
.container-responsive { }

/* Grid responsive */
.grid-responsive { }
.grid-auto-fit { }

/* Espaciado responsive */
.p-responsive { }
.px-responsive { }
.py-responsive { }
```

### Ejemplo de Layout Responsive

```tsx
<div className="main-layout">
  {/* Sidebar - oculto en móvil */}
  <aside className="sidebar hide-mobile">
    <Navigation />
  </aside>
  
  {/* Drawer - solo en móvil */}
  <MobileDrawer className="show-mobile">
    <Navigation />
  </MobileDrawer>
  
  {/* Contenido principal */}
  <main className="main-content">
    <Content />
  </main>
  
  {/* Bottom nav - solo en móvil */}
  <BottomNav className="show-mobile" />
</div>
```

---

## Hooks de Optimización

### useLazyComponent

```tsx
import { useLazyComponent, LazyRender } from '@/hooks/useLazyComponent';

// Hook
const { ref, isVisible, hasBeenVisible } = useLazyComponent({
  rootMargin: '100px',
  triggerOnce: true,
});

// Componente
<LazyRender placeholder={<Skeleton />}>
  <HeavyComponent />
</LazyRender>
```

### useOptimizedState

```tsx
import { 
  useDebounce, 
  useDebouncedCallback,
  useThrottle,
  useStableCallback 
} from '@/hooks/useOptimizedState';

// Debounce valor
const debouncedSearch = useDebounce(searchTerm, 300);

// Debounce callback
const handleSearch = useDebouncedCallback((term) => {
  fetchResults(term);
}, 300);

// Throttle valor
const throttledScroll = useThrottle(scrollPosition, 100);

// Callback estable
const stableCallback = useStableCallback(handleClick);
```

---

## Importación

```tsx
// Importar componentes individuales
import { Button, Input, Card } from '@/components/ui';

// Importar tipos
import type { ButtonProps, InputProps } from '@/components/ui';

// Importar hooks
import { useLazyComponent } from '@/hooks/useLazyComponent';
import { useDebounce } from '@/hooks/useOptimizedState';
```

---

## Contribuir

1. Seguir los tokens de diseño existentes
2. Asegurar accesibilidad (WCAG AA)
3. Probar en múltiples breakpoints
4. Documentar nuevos componentes
5. Añadir tests de accesibilidad
