# Pending Improvements - Tasks

## Task 1: Integración de Traducciones de Timers (US-1)

### Task 1.1: Extender Interface de Traducciones
- [x] Añadir sección `timers` a la interface `Translations` en `i18n/locales.ts`
- [x] Copiar estructura de tipos desde `timerLocales.ts`

### Task 1.2: Añadir Traducciones Español
- [x] Copiar traducciones españolas de `timerLocales.ts` a `locales.ts`
- [x] Verificar que todas las claves están incluidas

### Task 1.3: Añadir Traducciones Inglés
- [x] Crear traducciones en inglés para todas las claves de timers
- [x] Mantener consistencia con el estilo de traducciones existentes

### Task 1.4: Actualizar Componentes de Timers
- [x] Actualizar `TimersPanel.tsx` para usar `useI18n()`
- [x] Actualizar `TimerForm.tsx` para usar `useI18n()`
- [x] Actualizar `TimerCard.tsx` para usar `useI18n()`
- [x] Actualizar `TimerList.tsx` para usar `useI18n()`
- [x] Actualizar `TimerTemplates.tsx` para usar `useI18n()`
- [x] Actualizar `TimerGroups.tsx` para usar `useI18n()`
- [x] Actualizar `TimerLog.tsx` para usar `useI18n()`

### Task 1.5: Limpiar Archivo Temporal
- [x] Eliminar `i18n/timerLocales.ts` después de integración completa

---

## Task 2: Selector de Plataforma IA (US-2)

### Task 2.1: Crear Tipos de Configuración IA
- [x] Ya existe tipo `AIProvider` con opciones: 'gemini' | 'openai' | 'anthropic'
- [x] Ya existe interface `AIConfig` con providers y configuración

### Task 2.2: Actualizar AIConfigPanel
- [x] Ya tiene selector de proveedor con tabs
- [x] Ya muestra campos específicos según proveedor seleccionado
- [x] Ya tiene lógica de guardado en localStorage
- [x] Ya muestra indicador de estado de conexión

### Task 2.3: Añadir Traducciones
- [x] Ya existen traducciones en `aiConfig` section

**NOTA:** Task 2 ya estaba implementado en `AIConfigPanel.tsx`

---

## Task 3: Mejoras de Accesibilidad en Timers (US-3)

### Task 3.1: Añadir Aria-Live Region
- [x] Crear estado `announcement` en `TimersPanel.tsx`
- [x] Añadir div con `role="status"` y `aria-live="polite"` con clase `sr-only`
- [x] Implementar función `announce(message: string)`

### Task 3.2: Anunciar Eventos de Motor
- [x] Anunciar cuando el motor se inicia
- [x] Anunciar cuando el motor se detiene

### Task 3.3: Anunciar Ejecución de Timers
- [x] Anunciar cuando un timer se ejecuta exitosamente (via notifications)
- [x] Anunciar errores de ejecución (via notifications)

### Task 3.4: Añadir Clase CSS sr-only
- [x] Añadir clase `sr-only` en `index.css`

---

## Task 4: Notificaciones Toast para Timers (US-4)

### Task 4.1: Extender Props de TimersPanel
- [x] Añadir prop `onNotification?: (type: 'success' | 'error' | 'info', message: string) => void`
- [x] Actualizar interface `TimersPanelProps`

### Task 4.2: Integrar Notificaciones en useTimers
- [x] Pasar callback de notificación al hook
- [x] Llamar notificación en `executeTimer` exitoso
- [x] Llamar notificación en errores de ejecución

### Task 4.3: Actualizar PlatformsPanel
- [x] Pasar función de notificación a `TimersPanel`
- [x] Conectar con sistema de notificaciones existente

---

## Task 5: Validación y Migración de Datos (US-5)

### Task 5.1: Crear Sistema de Versionado
- [x] Definir interface `TimerStorageData` con version, timers
- [x] Definir interface `GroupStorageData` con version, groups
- [x] Definir constante `CURRENT_DATA_VERSION = 1`

### Task 5.2: Implementar Validación
- [x] Crear función `isValidTimer(obj: unknown): boolean`
- [x] Crear función `isValidGroup(obj: unknown): boolean`
- [x] Validar estructura de cada timer
- [x] Validar estructura de cada grupo

### Task 5.3: Implementar Migración
- [x] Crear función `migrateTimer(obj): Timer`
- [x] Crear función `migrateGroup(obj): TimerGroup`
- [x] Migrar datos sin versión a versión 1
- [x] Manejar campos faltantes con valores por defecto

### Task 5.4: Integrar en useTimers
- [x] Crear `loadTimersFromStorage` con validación
- [x] Crear `loadGroupsFromStorage` con validación
- [x] Crear `saveTimersToStorage` con versionado
- [x] Crear `saveGroupsToStorage` con versionado
- [x] Manejar datos corruptos sin perder configuración válida

---

## Summary

| Task | Descripción | Estado |
|------|-------------|--------|
| Task 1 | Integración i18n | ✅ Completado |
| Task 2 | Selector IA | ✅ Ya implementado |
| Task 3 | Accesibilidad | ✅ Completado |
| Task 4 | Notificaciones | ✅ Completado |
| Task 5 | Validación datos | ✅ Completado |

## Archivos Modificados

- `i18n/locales.ts` - Añadidas traducciones de timers (ES/EN)
- `index.css` - Añadida clase `.sr-only` para accesibilidad
- `src/application/hooks/useTimers.ts` - Validación, migración y notificaciones
- `components/timers/TimersPanel.tsx` - i18n y aria-live region
- `components/timers/TimerForm.tsx` - i18n
- `components/timers/TimerCard.tsx` - i18n
- `components/timers/TimerList.tsx` - i18n
- `components/timers/TimerTemplates.tsx` - i18n
- `components/timers/TimerGroups.tsx` - i18n
- `components/timers/TimerLog.tsx` - i18n
- `components/PlatformsPanel.tsx` - Pasar onNotification a TimersPanel
- `i18n/timerLocales.ts` - Eliminado (integrado en locales.ts)
