# Implementation Plan: OBS Simplified Setup

## Overview

Este plan implementa las mejoras para simplificar la configuración de OBS, priorizando las funcionalidades que más impacto tienen para usuarios nuevos.

## Tasks

### Task 1: Overlay URLs (Alta Prioridad)
**Objetivo**: Permitir usar overlays sin necesidad de WebSocket

- [x] 1.1 Crear rutas de overlay en la aplicación
  - Crear página `/overlay` que renderice overlays según parámetros
  - Soportar tipos: poll, prediction, giveaway, game, chat-activity
  - Implementar tema transparente por defecto
  - _Requirements: 2.1, 2.3_

- [x] 1.2 Crear componente OverlayURLGenerator
  - Selector de tipo de overlay con iconos
  - Opciones de personalización (tema, tamaño)
  - Botón de copiar URL con feedback visual
  - Preview del overlay
  - _Requirements: 2.2, 2.4, 2.6_

- [x] 1.3 Añadir instrucciones de Browser Source
  - Crear sección colapsable con pasos
  - Incluir tamaños recomendados por tipo
  - Añadir GIF/imagen mostrando el proceso en OBS
  - _Requirements: 2.5_

- [x] 1.4 Property tests: Overlay URLs (Properties 3, 4)
  - Test validez de URLs generadas
  - Test idempotencia de generación
  - **Property 3, 4: Overlay URL**
  - **Validates: Requirements 2.1, 2.2**

---

### Task 2: Auto-Descubrimiento de OBS (Alta Prioridad)
**Objetivo**: Detectar OBS automáticamente

- [x] 2.1 Crear OBSDiscoveryService
  - Implementar escaneo de puertos (4455, 4444, 4456)
  - Detectar si requiere contraseña
  - Obtener versión de OBS si es posible
  - _Requirements: 1.1, 1.3_

- [x] 2.2 Actualizar UI de conexión
  - Mostrar "Buscando OBS..." al abrir panel
  - Si encuentra OBS, mostrar botón "Conectar a OBS detectado"
  - Si no encuentra, mostrar formulario manual
  - _Requirements: 1.2_

- [x] 2.3 Manejar múltiples instancias
  - Si hay más de una instancia, mostrar lista de selección
  - Mostrar puerto y versión de cada instancia
  - _Requirements: 1.4_

- [x] 2.4 Cachear conexión exitosa
  - Guardar última conexión exitosa en localStorage
  - Intentar reconectar automáticamente al abrir
  - _Requirements: 1.5_

- [x] 2.5 Property tests: Discovery (Properties 1, 2)
  - Test escaneo de todos los puertos
  - Test consistencia de resultados
  - **Property 1, 2: Discovery**
  - **Validates: Requirements 1.1, 1.2, 1.3**

---

### Task 3: Wizard de Conexión (Media Prioridad)
**Objetivo**: Guiar usuarios nuevos paso a paso

- [x] 3.1 Crear componente ConnectionWizard
  - Diseño de pasos con indicador de progreso
  - Estados: pending, checking, success, error
  - Botones: Siguiente, Reintentar, Saltar
  - _Requirements: 3.1, 3.6_

- [x] 3.2 Implementar paso "OBS Ejecutándose"
  - Verificar si hay respuesta en puertos conocidos
  - Mostrar instrucciones si no se detecta
  - _Requirements: 3.3_

- [x] 3.3 Implementar paso "WebSocket Habilitado"
  - Verificar conexión WebSocket
  - Mostrar screenshots de configuración de OBS
  - Incluir instrucciones paso a paso
  - _Requirements: 3.3, 3.4_

- [x] 3.4 Implementar paso "Prueba de Conexión"
  - Intentar conexión completa
  - Mostrar versión de OBS si exitoso
  - Guardar configuración al completar
  - _Requirements: 3.5_

- [x] 3.5 Integrar wizard en OBSControlPanel
  - Mostrar wizard en primera visita
  - Opción de volver a ejecutar desde settings
  - _Requirements: 3.1, 3.6_

- [x] 3.6 Property tests: Wizard (Property 5)
  - Test progresión de pasos
  - **Property 5: Wizard Step Progression**
  - **Validates: Requirements 3.2**

---

### Task 4: Herramienta de Diagnóstico (Media Prioridad)
**Objetivo**: Ayudar a resolver problemas de conexión

- [x] 4.1 Crear DiagnosticService
  - Check de puerto accesible
  - Check de WebSocket responde
  - Check de autenticación
  - Check de versión compatible
  - _Requirements: 4.2_

- [x] 4.2 Crear componente DiagnosticTool
  - Lista de checks con estados visuales
  - Mostrar sugerencias de fix para cada error
  - Botón para copiar resultados
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 4.3 Integrar en flujo de error
  - Mostrar botón "Diagnosticar" cuando falla conexión
  - Mostrar resultados en tiempo real
  - _Requirements: 4.1, 4.4_

- [x] 4.4 Property tests: Diagnostic (Properties 6, 7)
  - Test completitud de checks
  - Test sugerencias de fix
  - **Property 6, 7: Diagnostic**
  - **Validates: Requirements 4.2, 4.3**

---

### Task 5: Presets de Escenas (Baja Prioridad) ✅
**Objetivo**: Sugerir configuraciones recomendadas

- [x] 5.1 Definir presets de escenas
  - Gaming: Gameplay, Just Chatting, BRB, Starting Soon
  - Just Chatting: Main, Polls & Games, Giveaway
  - IRL: Camera, Map View, Chat Focus
  - Podcast: Solo, Interview, Multi-cam
  - Creative: Work View, Hands View, Review
  - _Requirements: 5.1_
  - **Implementado**: `src/application/services/ScenePresetsService.ts`

- [x] 5.2 Crear componente ScenePresetsPanel
  - Selector de categoría de stream (5 categorías)
  - Lista de escenas recomendadas con navegación
  - Overlay URLs sugeridos para cada escena con botón copiar
  - _Requirements: 5.2, 5.4_
  - **Implementado**: `components/ScenePresetsPanel.tsx`

- [x] 5.3 Añadir documentación de presets
  - Descripción de cada preset y escena
  - Tips generales por categoría
  - Tips específicos por escena
  - _Requirements: 5.3, 5.5_
  - **Integrado**: Pestaña "Presets" en OBSControlPanel

---

### Task 6: Checkpoint Final ✅

- [x] 6.1 Verificar build
  - Ejecutar `npm run build` ✅
  - Build exitoso: 2598 módulos transformados
  - Sin errores de compilación

- [x] 6.2 Ejecutar tests
  - Ejecutar tests de nuevos servicios ✅
  - **58 tests pasando** en 4 archivos:
    - `tests/services/OverlayURLService.property.test.ts` (15 tests)
    - `tests/services/OBSDiscoveryService.property.test.ts` (12 tests)
    - `tests/components/OBSConnectionWizard.property.test.ts` (15 tests)
    - `tests/services/OBSDiagnosticService.property.test.ts` (16 tests)

- [x] 6.3 Resumen de implementación
  - **Task 1**: Overlay URLs - 18 tipos de overlay con generador de URLs
  - **Task 2**: Auto-Discovery - Escaneo de puertos 4455, 4444, 4456
  - **Task 3**: Connection Wizard - 3 pasos con indicador de progreso
  - **Task 4**: Diagnostic Tool - 4 checks con sugerencias de fix
  - **Task 5**: Scene Presets - 5 categorías con escenas recomendadas

## Archivos Creados

### Servicios
- `src/application/services/OverlayURLService.ts`
- `src/application/services/OBSDiscoveryService.ts`
- `src/application/services/OBSDiagnosticService.ts`
- `src/application/services/ScenePresetsService.ts`

### Componentes
- `components/OverlayURLGenerator.tsx`
- `components/OBSAutoDiscovery.tsx`
- `components/OBSConnectionWizard.tsx`
- `components/OBSDiagnosticTool.tsx`
- `components/ScenePresetsPanel.tsx`

### Tests
- `tests/services/OverlayURLService.property.test.ts`
- `tests/services/OBSDiscoveryService.property.test.ts`
- `tests/components/OBSConnectionWizard.property.test.ts`
- `tests/services/OBSDiagnosticService.property.test.ts`

### Integración
- `components/OBSControlPanel.tsx` - Actualizado con 6 pestañas:
  - Quick (comandos rápidos)
  - Scenes (escenas)
  - URLs (overlay URLs)
  - Presets (configuraciones recomendadas)
  - Automations (automatizaciones)
  - Stream (control de stream)

## Notes

- Las Overlay URLs son la mejora más impactante ya que funcionan sin WebSocket
- El auto-descubrimiento mejora significativamente la experiencia de primer uso
- El wizard y diagnóstico son complementarios para usuarios con problemas
- Los presets de escenas son sugerencias, no crean nada automáticamente en OBS

## Dependencies

- Task 2 (Auto-Discovery) puede usar lógica de Task 4 (Diagnostic)
- Task 3 (Wizard) depende de Task 2 (Auto-Discovery)
- Task 5 (Presets) puede usar URLs de Task 1 (Overlay URLs)

## Estimación de Tiempo

| Task | Complejidad | Tiempo Estimado |
|------|-------------|-----------------|
| Task 1: Overlay URLs | Media | 3-4 días |
| Task 2: Auto-Discovery | Media | 2-3 días |
| Task 3: Wizard | Media | 3-4 días |
| Task 4: Diagnostic | Baja | 2 días |
| Task 5: Presets | Baja | 1-2 días |
| Task 6: Checkpoint | - | 1 día |

**Total estimado: 12-16 días**

