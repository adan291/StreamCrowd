# Button Component

Componente base de botón reutilizable para StreamCrowd con múltiples variantes y estados.

## Props

| Prop | Tipo | Valor por defecto | Descripción |
|------|------|------------------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'outline'` | `'primary'` | Estilo visual del botón |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamaño del botón |
| `fullWidth` | `boolean` | `false` | Si el botón ocupa todo el ancho disponible |
| `loading` | `boolean` | `false` | Muestra spinner de carga |
| `leftIcon` | `React.ReactNode` | - | Icono a la izquierda del texto |
| `rightIcon` | `React.ReactNode` | - | Icono a la derecha del texto |

## Ejemplo de Uso

```tsx
import { Button } from './Button';

// Botón básico
<Button>Haz click</Button>

// Botón con variantes
<Button variant="danger">Eliminar</Button>
<Button variant="outline">Cancelar</Button>

// Botón con icono
<Button leftIcon={<PlusIcon />}>Agregar</Button>

// Botón de carga
<Button loading>Cargando...</Button>
```

---
*Documentación generada automáticamente por Kiro Hook*