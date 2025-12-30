# Pending Improvements - Design

## Overview

Este documento describe el diseño técnico para las mejoras pendientes identificadas en el sistema.

## US-1: Integración de Traducciones de Timers

### Diseño Actual
- `i18n/locales.ts` contiene el sistema principal de traducciones con interface `Translations`
- `i18n/timerLocales.ts` contiene traducciones separadas para el sistema de timers
- Los componentes de timers actualmente usan strings hardcodeados

### Solución Propuesta
1. Extender la interface `Translations` en `locales.ts` para incluir la sección `timers`
2. Copiar las traducciones de `timerLocales.ts` al objeto `translations` en `locales.ts`
3. Añadir traducciones en inglés (actualmente solo existe español)
4. Actualizar componentes de timers para usar `useI18n()` hook

### Cambios de Archivos
- `i18n/locales.ts`: Añadir interface y traducciones de timers
- `components/timers/*.tsx`: Usar `useI18n()` en lugar de strings hardcodeados

---

## US-2: Selector de Plataforma IA

### Diseño Actual
- `components/AIConfigPanel.tsx` permite configurar API key de OpenAI
- No hay selector de proveedor de IA

### Solución Propuesta
1. Añadir selector de proveedor en `AIConfigPanel.tsx`
2. Opciones: OpenAI, Anthropic, Local (Ollama), Ninguno
3. Guardar selección en localStorage junto con API key
4. Mostrar indicador de estado de conexión

### Cambios de Archivos
- `components/AIConfigPanel.tsx`: Añadir selector de proveedor
- Posiblemente crear `types/aiConfig.ts` para tipos

---

## US-3: Mejoras de Accesibilidad en Timers

### Diseño Actual
- `TimersPanel.tsx` tiene ARIA labels básicos
- No hay anuncios para screen readers en cambios de estado

### Solución Propuesta
1. Añadir `aria-live` region en `TimersPanel.tsx`
2. Anunciar eventos: timer ejecutado, motor iniciado/detenido
3. Usar `role="status"` para actualizaciones no críticas

### Implementación
```tsx
// Añadir en TimersPanel.tsx
<div 
  role="status" 
  aria-live="polite" 
  className="sr-only"
>
  {announcement}
</div>
```

### Cambios de Archivos
- `components/timers/TimersPanel.tsx`: Añadir aria-live region

---

## US-4: Notificaciones Toast para Timers

### Diseño Actual
- `components/Notification.tsx` proporciona sistema de toast notifications
- Usa `NotificationContainer` y `NotificationItem` types
- Auto-dismiss después de 3 segundos

### Solución Propuesta
1. Pasar función `addNotification` a `TimersPanel` como prop
2. Mostrar toast cuando timer se ejecuta exitosamente
3. Mostrar toast de error si falla el envío

### Integración
- El componente padre (`PlatformsPanel` o `App`) debe proveer la función de notificación
- Usar tipo `success` para ejecución exitosa, `error` para fallos

### Cambios de Archivos
- `components/timers/TimersPanel.tsx`: Añadir prop y llamadas a notificación
- `components/PlatformsPanel.tsx`: Pasar función de notificación

---

## US-5: Validación y Migración de Datos de Timers

### Diseño Actual
- `useTimers.ts` carga datos de localStorage sin validación
- No hay manejo de versiones de datos

### Solución Propuesta
1. Añadir versión a datos guardados en localStorage
2. Validar estructura al cargar
3. Migrar datos antiguos si es necesario
4. Manejar datos corruptos sin perder todo

### Implementación
```typescript
interface TimerStorageData {
  version: number;
  timers: Timer[];
  groups: TimerGroup[];
}

const CURRENT_VERSION = 1;

function validateAndMigrate(data: unknown): TimerStorageData {
  // Validar estructura
  // Migrar si versión antigua
  // Retornar datos válidos o defaults
}
```

### Cambios de Archivos
- `src/application/hooks/useTimers.ts`: Añadir validación y migración

---

## Diagrama de Dependencias

```
US-1 (i18n) ─────────────────────────────────────────┐
                                                      │
US-2 (AI Selector) ──────────────────────────────────┤
                                                      ├──> Mejoras Completas
US-3 (Accessibility) ────────────────────────────────┤
                                                      │
US-4 (Notifications) ─── depende de ─── US-3 ────────┤
                                                      │
US-5 (Data Validation) ──────────────────────────────┘
```

## Consideraciones Técnicas

### Compatibilidad
- Mantener compatibilidad con datos existentes en localStorage
- No romper funcionalidad actual de timers

### Rendimiento
- Validación de datos debe ser rápida (< 10ms)
- Notificaciones no deben bloquear UI

### Testing
- Probar migración con datos de versiones anteriores
- Verificar accesibilidad con screen reader
