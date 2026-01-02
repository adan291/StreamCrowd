# Design Document: UX Polish and Testing

## Overview

Este diseño cubre dos áreas principales: completar los tests pendientes de forms-ui-improvement y añadir mejoras de UX/accesibilidad. Los tests aseguran la calidad del código existente, mientras que las mejoras de UX elevan la experiencia del usuario.

## Architecture

```mermaid
graph TD
    subgraph "Testing Layer"
        T1[CollapsibleSection.test]
        T2[GiveawayHub.test]
        T3[JudgePanel.test]
        T4[ViewMode.test]
    end
    
    subgraph "New Components"
        TT[Tooltip Component]
        SK[Skeleton Component]
        FB[FeedbackIndicator]
    end
    
    subgraph "Lazy Loading"
        LL[React.lazy]
        SU[Suspense]
        PL[Preloader]
    end
    
    subgraph "Existing Components"
        CS[CollapsibleSection]
        GH[GiveawayHub]
        JP[JudgePanel]
        VM[ViewModeToggle]
    end
    
    T1 --> CS
    T2 --> GH
    T3 --> JP
    T4 --> VM
    
    TT --> GH
    TT --> JP
    SK --> LL
    LL --> GH
    LL --> JP


## Components and Interfaces

### Tooltip Component

```typescript
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number; // default 500ms
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Usage
<Tooltip content="Solo usuarios suscritos pueden participar">
  <label>Solo Subs</label>
</Tooltip>
```

### Skeleton Component

```typescript
interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

// Panel skeleton for lazy loading
const PanelSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    <Skeleton variant="rectangular" height={48} />
    <Skeleton variant="rectangular" height={200} />
    <Skeleton variant="rectangular" height={48} />
  </div>
);
```

### FeedbackIndicator Component

```typescript
interface FeedbackIndicatorProps {
  show: boolean;
  type: 'success' | 'info';
  message?: string;
  duration?: number; // default 2000ms
}
```

### Lazy Loading Setup

```typescript
// In App.tsx or DynamicsPanel.tsx
const LazyJudgePanel = React.lazy(() => import('./JudgePanel'));
const LazyGiveawayHub = React.lazy(() => import('./GiveawayHub'));

// Usage with Suspense
<Suspense fallback={<PanelSkeleton />}>
  <LazyJudgePanel {...props} />
</Suspense>
```

## Data Models

### Tooltip Configuration

```typescript
const FORM_TOOLTIPS = {
  giveaway: {
    subsOnly: 'Solo usuarios suscritos al canal pueden participar en el sorteo',
    useTimer: 'Limita el tiempo de participación. Sin timer, el sorteo permanece abierto indefinidamente',
    keyword: 'Los usuarios deben escribir esta palabra en el chat para participar',
    timeLimit: 'Duración en segundos del período de participación',
  },
  judge: {
    criteriaWeight: 'Multiplicador de importancia. Mayor peso = más impacto en puntuación final',
    publicVoteWeight: 'Porcentaje del voto público en la puntuación final (0-100%)',
    votePrefix: 'Carácter que los usuarios escriben antes de su voto (ej: +1, #1)',
  }
};
```

### Contrast Colors (Dark Mode)

```typescript
const DARK_MODE_COLORS = {
  text: {
    primary: '#FFFFFF',      // contrast 15.8:1
    secondary: '#A1A1AA',    // contrast 5.3:1 (zinc-400)
    muted: '#71717A',        // contrast 4.5:1 (zinc-500) - minimum AA
  },
  border: {
    default: '#3F3F46',      // zinc-700
    focus: '#A78BFA',        // violet-400
  },
  badge: {
    success: '#4ADE80',      // green-400
    warning: '#FBBF24',      // amber-400
    error: '#F87171',        // red-400
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: CollapsibleSection Toggle Consistency
*For any* CollapsibleSection with initial expanded state E, clicking the header should result in expanded state !E, and children visibility should match the new expanded state.
**Validates: Requirements 1.1, 1.2**

### Property 2: Badge Display Consistency
*For any* CollapsibleSection with badge value V (where V is defined), the badge should display V. When V is undefined, no badge should be displayed.
**Validates: Requirements 1.3, 1.4**

### Property 3: Participant Badge Accuracy
*For any* GiveawayHub state with N participants, the Participantes section badge should display exactly N.
**Validates: Requirements 2.1**

### Property 4: Blacklist Badge Accuracy
*For any* GiveawayHub state with N blacklisted users, the Lista Negra section badge should display exactly N.
**Validates: Requirements 2.2**

### Property 5: Preset Application Completeness
*For any* preset P with values V, applying P should result in all fields in V being set to their corresponding values.
**Validates: Requirements 2.3, 3.5**

### Property 6: Customization Detection
*For any* configuration that differs from the last applied preset, the preset selector should show "Personalizado".
**Validates: Requirements 2.4**

### Property 7: JudgePanel Badge Counts
*For any* JudgePanel state with C criteria, N contestants, and J judges, the respective badges should display C, N, and J.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 8: Wizard Step Navigation
*For any* wizard at step S (1 <= S <= 4), clicking "Next" should move to step S+1 (if S < 4), and clicking "Back" should move to step S-1 (if S > 1).
**Validates: Requirements 3.4**

### Property 9: View Mode Persistence
*For any* view mode change to M, localStorage should contain M, and on component remount, the view mode should be M.
**Validates: Requirements 4.1, 4.2**

### Property 10: Configuration Preservation
*For any* configuration C and view mode switch, the configuration after switch should equal C.
**Validates: Requirements 2.5, 4.3**

### Property 11: WCAG Contrast Compliance
*For any* text element in dark mode, the contrast ratio between text color and background should be >= 4.5:1.
**Validates: Requirements 8.1**

### Property 12: Translation Completeness
*For any* UI text key K, both Spanish and English translations should exist and be non-empty.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

## Error Handling

1. **Lazy Load Failure**: Show error boundary with retry button
2. **localStorage Unavailable**: Fall back to in-memory state
3. **Missing Translation**: Fall back to Spanish (default language)
4. **Tooltip Overflow**: Reposition to stay within viewport

## Testing Strategy

### Property-Based Tests (fast-check)
- Properties 1-10: Component behavior verification
- Property 11: Contrast ratio verification
- Property 12: Translation key verification

### Unit Tests
- Tooltip show/hide behavior
- Skeleton rendering
- FeedbackIndicator timing
- Lazy loading with Suspense

### Integration Tests
- Full form flow with tooltips
- Preset application end-to-end
- View mode persistence across sessions

### Accessibility Tests
- Focus management in tooltips
- Keyboard navigation
- Screen reader announcements
- Reduced motion preference
